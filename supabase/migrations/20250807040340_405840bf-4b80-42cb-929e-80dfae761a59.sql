-- Phase 1: Database Function Recovery - Critical Issues Fix

-- 1. Fix admin_update_sensei_level function (if corrupted)
CREATE OR REPLACE FUNCTION public.admin_update_sensei_level(
  p_sensei_id uuid,
  p_new_level text,
  p_admin_user_id uuid DEFAULT auth.uid(),
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  current_level TEXT;
  result JSONB;
  valid_levels TEXT[] := ARRAY['apprentice', 'journey_guide', 'master_sensei'];
BEGIN
  -- Validate input parameters
  IF p_sensei_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Sensei ID is required');
  END IF;

  IF p_new_level IS NULL OR NOT (p_new_level = ANY(valid_levels)) THEN
    RETURN jsonb_build_object('error', 'Invalid sensei level. Must be: apprentice, journey_guide, or master_sensei');
  END IF;

  -- Check if admin has permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = p_admin_user_id 
    AND is_active = true
    AND role IN ('admin', 'sensei_scout')
  ) THEN
    RETURN jsonb_build_object('error', 'Insufficient permissions');
  END IF;

  -- Get current level
  SELECT sensei_level INTO current_level
  FROM public.sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- Check if level is already the same
  IF current_level = p_new_level THEN
    RETURN jsonb_build_object('error', 'Sensei is already at this level');
  END IF;

  -- Update sensei level
  UPDATE public.sensei_profiles
  SET 
    sensei_level = p_new_level,
    level_achieved_at = now(),
    updated_at = now()
  WHERE id = p_sensei_id;

  -- Record level history
  INSERT INTO public.sensei_level_history (
    sensei_id,
    previous_level,
    new_level,
    changed_by,
    change_reason,
    requirements_met
  ) VALUES (
    p_sensei_id,
    current_level,
    p_new_level,
    p_admin_user_id,
    COALESCE(p_reason, 'Manual admin update'),
    jsonb_build_object(
      'manual_upgrade', true,
      'upgraded_by_admin', p_admin_user_id,
      'timestamp', now()
    )
  );

  -- Log admin action
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    p_admin_user_id,
    'update_sensei_level',
    'sensei_profiles',
    p_sensei_id,
    jsonb_build_object('sensei_level', current_level),
    jsonb_build_object('sensei_level', p_new_level, 'reason', p_reason)
  );

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'previous_level', current_level,
    'new_level', p_new_level,
    'sensei_id', p_sensei_id,
    'updated_at', now()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'Database error occurred',
      'details', SQLERRM
    );
END;
$$;

-- 2. Create comprehensive get_sensei_permissions function
CREATE OR REPLACE FUNCTION public.get_sensei_permissions(p_sensei_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sensei_level TEXT;
  level_permissions RECORD;
  field_permissions JSONB := '{}'::jsonb;
  trip_edit_fields TEXT[] := '{}';
  result JSONB;
BEGIN
  -- Get sensei level
  SELECT sp.sensei_level INTO sensei_level
  FROM public.sensei_profiles sp
  WHERE sp.id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- Get level-based permissions
  SELECT * INTO level_permissions
  FROM public.sensei_level_permissions slp
  WHERE slp.sensei_level = get_sensei_permissions.sensei_level;

  -- Get field permissions for trip editing
  SELECT ARRAY_AGG(sfpc.field_name) INTO trip_edit_fields
  FROM public.sensei_field_permissions_config sfpc
  WHERE sfpc.sensei_level = get_sensei_permissions.sensei_level
  AND sfpc.can_edit = true;

  -- Build comprehensive permissions object
  result := jsonb_build_object(
    'sensei_id', p_sensei_id,
    'sensei_level', sensei_level,
    'can_view_trips', COALESCE(level_permissions.can_view_trips, true),
    'can_apply_backup', COALESCE(level_permissions.can_apply_backup, true),
    'can_edit_profile', COALESCE(level_permissions.can_edit_profile, true),
    'can_edit_trips', COALESCE(level_permissions.can_edit_trips, false),
    'can_create_trips', COALESCE(level_permissions.can_create_trips, false),
    'can_use_ai_builder', COALESCE(level_permissions.can_use_ai_builder, false),
    'can_publish_trips', COALESCE(level_permissions.can_publish_trips, false),
    'can_modify_pricing', COALESCE(level_permissions.can_modify_pricing, false),
    'trip_edit_fields', COALESCE(trip_edit_fields, '{}'),
    'last_updated', now()
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'Failed to fetch permissions',
      'details', SQLERRM
    );
END;
$$;

-- 3. Create get_sensei_field_permissions function for granular field access
CREATE OR REPLACE FUNCTION public.get_sensei_field_permissions(
  p_sensei_id uuid,
  p_field_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sensei_level TEXT;
  field_perms JSONB := '{}'::jsonb;
  single_field RECORD;
BEGIN
  -- Get sensei level
  SELECT sp.sensei_level INTO sensei_level
  FROM public.sensei_profiles sp
  WHERE sp.id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- If specific field requested
  IF p_field_name IS NOT NULL THEN
    SELECT * INTO single_field
    FROM public.sensei_field_permissions_config sfpc
    WHERE sfpc.sensei_level = get_sensei_field_permissions.sensei_level
    AND sfpc.field_name = p_field_name;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'field_name', single_field.field_name,
        'can_view', single_field.can_view,
        'can_edit', single_field.can_edit,
        'field_category', single_field.field_category,
        'sensei_level', sensei_level
      );
    ELSE
      RETURN jsonb_build_object(
        'field_name', p_field_name,
        'can_view', false,
        'can_edit', false,
        'error', 'Field permission not configured'
      );
    END IF;
  END IF;

  -- Return all field permissions for this level
  SELECT jsonb_object_agg(
    sfpc.field_name,
    jsonb_build_object(
      'can_view', sfpc.can_view,
      'can_edit', sfpc.can_edit,
      'field_category', sfpc.field_category
    )
  ) INTO field_perms
  FROM public.sensei_field_permissions_config sfpc
  WHERE sfpc.sensei_level = get_sensei_field_permissions.sensei_level;

  RETURN jsonb_build_object(
    'sensei_level', sensei_level,
    'field_permissions', COALESCE(field_perms, '{}'::jsonb),
    'last_updated', now()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'Failed to fetch field permissions',
      'details', SQLERRM
    );
END;
$$;

-- 4. Create comprehensive trip permissions function
CREATE OR REPLACE FUNCTION public.get_trip_edit_permissions(
  p_sensei_id uuid,
  p_trip_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sensei_level TEXT;
  is_trip_owner BOOLEAN := false;
  base_permissions JSONB;
  field_permissions JSONB;
  result JSONB;
BEGIN
  -- Get sensei level
  SELECT sp.sensei_level INTO sensei_level
  FROM public.sensei_profiles sp
  WHERE sp.id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- Check if sensei owns the trip (if trip_id provided)
  IF p_trip_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = p_trip_id 
      AND t.sensei_id = p_sensei_id
    ) INTO is_trip_owner;
  END IF;

  -- Get base permissions from level
  SELECT public.get_sensei_permissions(p_sensei_id) INTO base_permissions;

  -- Get field-specific permissions
  SELECT public.get_sensei_field_permissions(p_sensei_id) INTO field_permissions;

  -- Build comprehensive trip permissions
  result := jsonb_build_object(
    'sensei_id', p_sensei_id,
    'trip_id', p_trip_id,
    'sensei_level', sensei_level,
    'is_trip_owner', is_trip_owner,
    'can_create_trips', (base_permissions->>'can_create_trips')::boolean,
    'can_edit_trips', (base_permissions->>'can_edit_trips')::boolean OR is_trip_owner,
    'can_publish_trips', (base_permissions->>'can_publish_trips')::boolean,
    'can_modify_pricing', (base_permissions->>'can_modify_pricing')::boolean,
    'can_use_ai_builder', (base_permissions->>'can_use_ai_builder')::boolean,
    'editable_fields', base_permissions->'trip_edit_fields',
    'field_permissions', field_permissions->'field_permissions',
    'last_updated', now()
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'Failed to fetch trip permissions',
      'details', SQLERRM
    );
END;
$$;