-- Create function to get sensei permissions considering trip-specific elevations
CREATE OR REPLACE FUNCTION public.get_sensei_permissions_for_trip(p_sensei_id uuid, p_trip_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sensei_level TEXT;
  effective_level TEXT;
  permissions JSONB;
BEGIN
  -- Get sensei's base level
  SELECT sp.sensei_level INTO sensei_level
  FROM sensei_profiles sp
  WHERE sp.id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- Check for trip-specific elevated permissions
  effective_level := sensei_level;
  
  IF p_trip_id IS NOT NULL THEN
    SELECT tsp.elevated_level INTO effective_level
    FROM trip_specific_permissions tsp
    WHERE tsp.sensei_id = p_sensei_id 
    AND tsp.trip_id = p_trip_id 
    AND tsp.is_active = true;
    
    -- If no specific elevation found, use the base level
    IF effective_level IS NULL THEN
      effective_level := sensei_level;
    END IF;
  END IF;

  -- Get permissions for the effective level
  SELECT jsonb_build_object(
    'can_view_trips', slp.can_view_trips,
    'can_apply_backup', slp.can_apply_backup,
    'can_edit_profile', slp.can_edit_profile,
    'can_edit_trips', slp.can_edit_trips,
    'can_create_trips', slp.can_create_trips,
    'can_use_ai_builder', slp.can_use_ai_builder,
    'can_publish_trips', slp.can_publish_trips,
    'can_modify_pricing', slp.can_modify_pricing,
    'trip_edit_fields', COALESCE(
      ARRAY_AGG(slfp.field_name) FILTER (WHERE slfp.can_edit = true),
      ARRAY[]::text[]
    ),
    'effective_level', effective_level,
    'base_level', sensei_level,
    'is_elevated', (effective_level != sensei_level)
  ) INTO permissions
  FROM sensei_level_permissions slp
  LEFT JOIN sensei_level_field_permissions slfp ON slfp.sensei_level = slp.sensei_level
  WHERE slp.sensei_level = effective_level
  GROUP BY slp.can_view_trips, slp.can_apply_backup, slp.can_edit_profile, 
           slp.can_edit_trips, slp.can_create_trips, slp.can_use_ai_builder, 
           slp.can_publish_trips, slp.can_modify_pricing;

  RETURN COALESCE(permissions, jsonb_build_object(
    'can_view_trips', false,
    'can_apply_backup', false,
    'can_edit_profile', false,
    'can_edit_trips', false,
    'can_create_trips', false,
    'can_use_ai_builder', false,
    'can_publish_trips', false,
    'can_modify_pricing', false,
    'trip_edit_fields', ARRAY[]::text[],
    'effective_level', effective_level,
    'base_level', sensei_level,
    'is_elevated', false
  ));
END;
$$;

-- Create function to automatically grant elevated permissions when needed
CREATE OR REPLACE FUNCTION public.auto_grant_elevated_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  required_level TEXT;
  new_sensei_level TEXT;
  level_hierarchy JSONB;
BEGIN
  -- Only process when sensei_id changes
  IF TG_OP = 'UPDATE' AND OLD.sensei_id = NEW.sensei_id THEN
    RETURN NEW;
  END IF;
  
  -- Get the required permission level for this trip
  required_level := COALESCE(NEW.required_permission_level, NEW.created_by_sensei_level, 'apprentice');
  
  -- Get the new sensei's level
  SELECT sensei_level INTO new_sensei_level
  FROM sensei_profiles
  WHERE id = NEW.sensei_id;
  
  -- Define level hierarchy
  level_hierarchy := jsonb_build_object(
    'apprentice', 1,
    'journey_guide', 2,
    'master_sensei', 3
  );
  
  -- Check if elevation is needed
  IF (level_hierarchy ->> new_sensei_level)::int < (level_hierarchy ->> required_level)::int THEN
    -- Grant elevated permissions
    INSERT INTO trip_specific_permissions (
      trip_id,
      sensei_id,
      elevated_level,
      granted_reason,
      is_active
    ) VALUES (
      NEW.id,
      NEW.sensei_id,
      required_level,
      format('Auto-granted for replacement. Original level: %s, Required: %s', new_sensei_level, required_level),
      true
    )
    ON CONFLICT (trip_id, sensei_id) 
    DO UPDATE SET
      elevated_level = EXCLUDED.elevated_level,
      granted_reason = EXCLUDED.granted_reason,
      is_active = true,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic permission elevation
DROP TRIGGER IF EXISTS auto_grant_elevated_permissions_trigger ON trips;
CREATE TRIGGER auto_grant_elevated_permissions_trigger
  AFTER UPDATE OF sensei_id ON trips
  FOR EACH ROW
  EXECUTE FUNCTION auto_grant_elevated_permissions();