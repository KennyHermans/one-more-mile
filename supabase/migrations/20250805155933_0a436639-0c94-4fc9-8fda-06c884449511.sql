-- Enhanced function to handle all sensei level changes
CREATE OR REPLACE FUNCTION public.handle_sensei_level_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  old_permissions JSONB;
  new_permissions JSONB;
BEGIN
  -- Only process if sensei_level actually changed
  IF (TG_OP = 'UPDATE' AND OLD.sensei_level = NEW.sensei_level) THEN
    RETURN NEW;
  END IF;

  -- Get old and new permissions for comparison
  IF TG_OP = 'UPDATE' THEN
    SELECT public.get_sensei_permissions(NEW.id) INTO new_permissions;
  END IF;

  -- Record level change in history
  IF TG_OP = 'UPDATE' AND OLD.sensei_level != NEW.sensei_level THEN
    INSERT INTO public.sensei_level_history (
      sensei_id,
      previous_level,
      new_level,
      change_reason,
      requirements_met
    ) VALUES (
      NEW.id,
      OLD.sensei_level,
      NEW.sensei_level,
      'Level change detected - permissions updated',
      jsonb_build_object(
        'trips_led', NEW.trips_led,
        'rating', NEW.rating,
        'timestamp', now()
      )
    );
  END IF;

  -- Refresh sensei insights when level changes
  PERFORM public.calculate_sensei_insights(NEW.id);

  -- Update goal progress to reflect new capabilities
  UPDATE public.sensei_goals 
  SET current_value = CASE 
    WHEN category = 'trips' THEN NEW.trips_led
    WHEN category = 'rating' THEN COALESCE(NEW.rating, 0)
    ELSE current_value
  END,
  status = CASE 
    WHEN current_value >= target THEN 'completed'
    ELSE status
  END
  WHERE sensei_id = NEW.id;

  -- Log the level change for admin audit
  PERFORM public.log_admin_action(
    'sensei_level_change',
    'sensei_profiles',
    NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('sensei_level', OLD.sensei_level) ELSE NULL END,
    jsonb_build_object('sensei_level', NEW.sensei_level)
  );

  RETURN NEW;
END;
$function$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS handle_sensei_level_change_trigger ON public.sensei_profiles;

CREATE TRIGGER handle_sensei_level_change_trigger
  AFTER INSERT OR UPDATE ON public.sensei_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sensei_level_change();

-- Function to get real-time sensei permissions
CREATE OR REPLACE FUNCTION public.get_sensei_permissions(p_sensei_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sensei_level_val TEXT;
  permissions_result JSONB := '{}';
  level_perms RECORD;
  field_perms RECORD;
BEGIN
  -- Get sensei level
  SELECT sensei_level INTO sensei_level_val
  FROM public.sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN '{}';
  END IF;

  -- Get level-based permissions
  SELECT * INTO level_perms
  FROM public.sensei_level_permissions
  WHERE sensei_level = sensei_level_val;

  IF FOUND THEN
    permissions_result := jsonb_build_object(
      'can_view_trips', level_perms.can_view_trips,
      'can_apply_backup', level_perms.can_apply_backup,
      'can_edit_profile', level_perms.can_edit_profile,
      'can_edit_trips', level_perms.can_edit_trips,
      'can_create_trips', level_perms.can_create_trips,
      'can_use_ai_builder', level_perms.can_use_ai_builder,
      'can_publish_trips', level_perms.can_publish_trips,
      'can_modify_pricing', level_perms.can_modify_pricing
    );
  END IF;

  -- Get field-level permissions
  SELECT ARRAY_AGG(field_name) INTO permissions_result
  FROM public.sensei_level_field_permissions
  WHERE sensei_level = sensei_level_val AND can_edit = true;

  permissions_result := permissions_result || jsonb_build_object(
    'trip_edit_fields', COALESCE(
      (SELECT ARRAY_AGG(field_name) 
       FROM public.sensei_level_field_permissions 
       WHERE sensei_level = sensei_level_val AND can_edit = true), 
      '{}'::TEXT[]
    )
  );

  RETURN permissions_result;
END;
$function$;

-- Enable realtime for sensei_profiles table
ALTER TABLE public.sensei_profiles REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.sensei_profiles;