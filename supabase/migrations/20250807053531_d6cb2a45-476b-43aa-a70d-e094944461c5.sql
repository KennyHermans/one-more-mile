-- Drop existing functions that need parameter changes
DROP FUNCTION IF EXISTS public.get_trip_edit_permissions(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_sensei_field_permissions(uuid, text);

-- Create or update the get_sensei_permissions function
CREATE OR REPLACE FUNCTION public.get_sensei_permissions(p_sensei_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  sensei_level_var TEXT;
  level_permissions RECORD;
  result JSONB;
BEGIN
  -- Get sensei level
  SELECT sp.sensei_level INTO sensei_level_var
  FROM public.sensei_profiles sp
  WHERE sp.id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- Get level-based permissions
  SELECT * INTO level_permissions
  FROM public.sensei_level_permissions slp
  WHERE slp.sensei_level = sensei_level_var;

  IF NOT FOUND THEN
    -- Return default permissions for apprentice level
    RETURN jsonb_build_object(
      'sensei_level', sensei_level_var,
      'can_view_trips', true,
      'can_edit_profile', true,
      'can_apply_backup', true,
      'can_edit_trips', false,
      'can_create_trips', false,
      'can_publish_trips', false,
      'can_use_ai_builder', false,
      'can_modify_pricing', false
    );
  END IF;

  -- Build comprehensive permissions object
  result := jsonb_build_object(
    'sensei_level', sensei_level_var,
    'can_view_trips', level_permissions.can_view_trips,
    'can_edit_profile', level_permissions.can_edit_profile,
    'can_apply_backup', level_permissions.can_apply_backup,
    'can_edit_trips', level_permissions.can_edit_trips,
    'can_create_trips', level_permissions.can_create_trips,
    'can_publish_trips', level_permissions.can_publish_trips,
    'can_use_ai_builder', level_permissions.can_use_ai_builder,
    'can_modify_pricing', level_permissions.can_modify_pricing
  );

  RETURN result;
END;
$function$;

-- Create the get_sensei_field_permissions function
CREATE OR REPLACE FUNCTION public.get_sensei_field_permissions(p_sensei_id uuid, p_field_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  sensei_level_var TEXT;
  result JSONB := '{}';
  field_config RECORD;
BEGIN
  -- Get sensei level
  SELECT sp.sensei_level INTO sensei_level_var
  FROM public.sensei_profiles sp
  WHERE sp.id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- If specific field requested, get its permissions
  IF p_field_name IS NOT NULL THEN
    SELECT * INTO field_config
    FROM public.sensei_field_permissions_config sfpc
    WHERE sfpc.sensei_level = sensei_level_var
    AND sfpc.field_name = p_field_name;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'can_view', field_config.can_view,
        'can_edit', field_config.can_edit,
        'required_level', sensei_level_var
      );
    ELSE
      -- Default permissions for non-configured fields
      RETURN jsonb_build_object(
        'can_view', true,
        'can_edit', true,
        'required_level', 'apprentice'
      );
    END IF;
  ELSE
    -- Return all field permissions for this level
    FOR field_config IN
      SELECT field_name, can_view, can_edit, field_category
      FROM public.sensei_field_permissions_config
      WHERE sensei_level = sensei_level_var
    LOOP
      result := result || jsonb_build_object(
        field_config.field_name, jsonb_build_object(
          'can_view', field_config.can_view,
          'can_edit', field_config.can_edit,
          'category', field_config.field_category,
          'required_level', sensei_level_var
        )
      );
    END LOOP;

    RETURN jsonb_build_object('field_permissions', result);
  END IF;
END;
$function$;

-- Create the get_trip_edit_permissions function 
CREATE OR REPLACE FUNCTION public.get_trip_edit_permissions(p_sensei_id uuid, p_trip_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  sensei_level_var TEXT;
  is_assigned BOOLEAN := false;
  result JSONB;
BEGIN
  -- Get sensei level
  SELECT sp.sensei_level INTO sensei_level_var
  FROM public.sensei_profiles sp
  WHERE sp.id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- Check if sensei is assigned to this trip
  SELECT EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = p_trip_id 
    AND (t.sensei_id = p_sensei_id OR t.backup_sensei_id = p_sensei_id)
  ) INTO is_assigned;

  -- Build result with assignment check
  result := jsonb_build_object(
    'sensei_level', sensei_level_var,
    'is_assigned_to_trip', is_assigned,
    'can_edit_trip', is_assigned
  );

  RETURN result;
END;
$function$;