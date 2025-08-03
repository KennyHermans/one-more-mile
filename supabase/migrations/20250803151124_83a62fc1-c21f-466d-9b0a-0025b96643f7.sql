-- Update the upgrade_sensei_level function to support admin override
CREATE OR REPLACE FUNCTION upgrade_sensei_level(
  p_sensei_id uuid,
  p_new_level sensei_level,
  p_changed_by uuid DEFAULT null,
  p_reason text DEFAULT null,
  p_admin_override boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_level sensei_level;
  v_changed_by uuid;
  v_requirements_met jsonb;
  v_result json;
BEGIN
  -- Get current user ID if not provided
  IF p_changed_by IS NULL THEN
    v_changed_by := auth.uid();
  ELSE
    v_changed_by := p_changed_by;
  END IF;

  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Insufficient permissions to change sensei levels';
  END IF;

  -- Get current level
  SELECT sensei_level INTO v_current_level
  FROM sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sensei not found';
  END IF;

  -- If not admin override, check level requirements
  IF NOT p_admin_override THEN
    -- Check if sensei meets requirements for the new level (only for upgrades)
    IF p_new_level = 'journey_guide' AND v_current_level = 'apprentice' THEN
      -- Check journey guide requirements
      IF NOT EXISTS (
        SELECT 1 FROM sensei_profiles sp
        WHERE sp.id = p_sensei_id
        AND sp.trips_led >= 5
        AND sp.rating >= 4.0
      ) THEN
        RAISE EXCEPTION 'Sensei does not meet requirements for level: %', p_new_level;
      END IF;
    ELSIF p_new_level = 'master_sensei' AND v_current_level IN ('apprentice', 'journey_guide') THEN
      -- Check master sensei requirements
      IF NOT EXISTS (
        SELECT 1 FROM sensei_profiles sp
        WHERE sp.id = p_sensei_id
        AND sp.trips_led >= 20
        AND sp.rating >= 4.5
      ) THEN
        RAISE EXCEPTION 'Sensei does not meet requirements for level: %', p_new_level;
      END IF;
    END IF;
  END IF;

  -- Get current requirements status for history
  SELECT jsonb_build_object(
    'trips_led', sp.trips_led,
    'rating', sp.rating,
    'admin_override', p_admin_override
  ) INTO v_requirements_met
  FROM sensei_profiles sp
  WHERE sp.id = p_sensei_id;

  -- Update sensei level
  UPDATE sensei_profiles
  SET 
    sensei_level = p_new_level,
    level_achieved_at = CURRENT_TIMESTAMP,
    level_requirements_met = v_requirements_met,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_sensei_id;

  -- Insert level history record
  INSERT INTO sensei_level_history (
    sensei_id,
    previous_level,
    new_level,
    changed_by,
    change_reason,
    requirements_met
  ) VALUES (
    p_sensei_id,
    v_current_level,
    p_new_level,
    v_changed_by,
    COALESCE(p_reason, 'Level changed by admin'),
    v_requirements_met
  );

  -- Return success result
  v_result := json_build_object(
    'success', true,
    'previous_level', v_current_level,
    'new_level', p_new_level,
    'admin_override', p_admin_override
  );

  RETURN v_result;
END;
$$;