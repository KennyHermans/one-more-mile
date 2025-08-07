-- Fix the get_sensei_permissions function variable reference issue
CREATE OR REPLACE FUNCTION public.get_sensei_permissions(p_sensei_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sensei_level_var TEXT;
  level_permissions RECORD;
  field_permissions JSONB := '{}'::jsonb;
  trip_edit_fields TEXT[] := '{}';
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

  -- Get field permissions for trip editing
  SELECT ARRAY_AGG(sfpc.field_name) INTO trip_edit_fields
  FROM public.sensei_field_permissions_config sfpc
  WHERE sfpc.sensei_level = sensei_level_var
  AND sfpc.can_edit = true;

  -- Build comprehensive permissions object
  result := jsonb_build_object(
    'sensei_id', p_sensei_id,
    'sensei_level', sensei_level_var,
    'can_view_trips', COALESCE(level_permissions.can_view_trips, true),
    'can_apply_backup', COALESCE(level_permissions.can_apply_backup, true),
    'can_edit_profile', COALESCE(level_permissions.can_edit_profile, true),
    'can_edit_trips', COALESCE(level_permissions.can_edit_trips, false),
    'can_create_trips', COALESCE(level_permissions.can_create_trips, false),
    'can_use_ai_builder', COALESCE(level_permissions.can_use_ai_builder, false),
    'can_publish_trips', COALESCE(level_permissions.can_publish_trips, false),
    'can_modify_pricing', COALESCE(level_permissions.can_modify_pricing, false),
    'trip_edit_fields', COALESCE(trip_edit_fields, '{}')
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'Database error: ' || SQLERRM,
      'details', 'Failed to fetch permissions'
    );
END;
$$;