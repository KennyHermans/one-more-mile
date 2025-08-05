-- Update the get_sensei_permissions function to use the new level-based tables
CREATE OR REPLACE FUNCTION public.get_sensei_permissions(p_sensei_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sensei_level_val TEXT;
  permissions JSONB := '{}';
  editable_fields TEXT[];
BEGIN
  -- Get sensei level
  SELECT sensei_level INTO sensei_level_val
  FROM public.sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN '{"error": "Sensei not found"}'::JSONB;
  END IF;

  -- Get permissions from level permissions table
  SELECT jsonb_build_object(
    'can_view_trips', slp.can_view_trips,
    'can_apply_backup', slp.can_apply_backup,
    'can_edit_profile', slp.can_edit_profile,
    'can_edit_trips', slp.can_edit_trips,
    'can_create_trips', slp.can_create_trips,
    'can_use_ai_builder', slp.can_use_ai_builder,
    'can_publish_trips', slp.can_publish_trips,
    'can_modify_pricing', slp.can_modify_pricing
  ) INTO permissions
  FROM public.sensei_level_permissions slp
  WHERE slp.sensei_level = sensei_level_val;

  -- Get editable fields from field permissions table
  SELECT ARRAY_AGG(field_name) INTO editable_fields
  FROM public.sensei_level_field_permissions slfp
  WHERE slfp.sensei_level = sensei_level_val AND slfp.can_edit = TRUE;

  -- Add trip_edit_fields to permissions
  permissions := permissions || jsonb_build_object('trip_edit_fields', COALESCE(editable_fields, ARRAY[]::TEXT[]));

  RETURN permissions;
END;
$$;