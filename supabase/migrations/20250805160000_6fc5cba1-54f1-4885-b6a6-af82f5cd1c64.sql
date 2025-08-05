-- Fix security warning: Set search_path for existing functions
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