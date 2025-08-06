-- Fix the get_sensei_permissions function
CREATE OR REPLACE FUNCTION public.get_sensei_permissions(p_sensei_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sensei_level_var text;
  permissions jsonb;
  field_permissions text[];
BEGIN
  -- Get sensei level
  SELECT sp.sensei_level INTO sensei_level_var
  FROM public.sensei_profiles sp
  WHERE sp.id = p_sensei_id AND sp.is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;
  
  -- Get level-based permissions
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
  WHERE slp.sensei_level = sensei_level_var;
  
  -- Get field permissions
  SELECT ARRAY_AGG(field_name) INTO field_permissions
  FROM public.sensei_level_field_permissions slfp
  WHERE slfp.sensei_level = sensei_level_var
  AND slfp.can_edit = true;
  
  -- Add field permissions to result
  permissions := permissions || jsonb_build_object(
    'trip_edit_fields', COALESCE(field_permissions, ARRAY[]::text[])
  );
  
  RETURN permissions;
END;
$$;