-- Enhanced admin_update_sensei_level function with detailed error reporting
CREATE OR REPLACE FUNCTION public.admin_update_sensei_level(
  p_sensei_id uuid,
  p_new_level text,
  p_reason text,
  p_admin_override boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sensei_record RECORD;
  clean_reason text;
  admin_user_id uuid;
  is_user_admin boolean;
BEGIN
  -- Get the current user ID
  admin_user_id := auth.uid();
  
  -- Debug: Check if user is admin
  SELECT is_admin(admin_user_id) INTO is_user_admin;
  
  IF NOT is_user_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions - admin access required',
      'debug_info', jsonb_build_object(
        'user_id', admin_user_id,
        'is_admin', is_user_admin
      )
    );
  END IF;

  -- Validate input parameters
  IF p_sensei_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sensei ID is required'
    );
  END IF;

  -- Validate level
  IF p_new_level IS NULL OR p_new_level NOT IN ('apprentice', 'journey_guide', 'master_sensei') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid sensei level provided',
      'debug_info', jsonb_build_object('provided_level', p_new_level)
    );
  END IF;

  -- Clean and validate reason
  clean_reason := TRIM(COALESCE(p_reason, ''));
  IF LENGTH(clean_reason) < 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Reason must be at least 3 characters long'
    );
  END IF;

  -- Remove potentially problematic characters for JSON
  clean_reason := REGEXP_REPLACE(clean_reason, '[^\x20-\x7E\s]', '', 'g');

  -- Get current sensei data
  SELECT * INTO sensei_record
  FROM sensei_profiles
  WHERE id = p_sensei_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sensei not found or inactive',
      'debug_info', jsonb_build_object('sensei_id', p_sensei_id)
    );
  END IF;

  -- Check if level is actually changing
  IF sensei_record.sensei_level = p_new_level THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sensei is already at this level',
      'debug_info', jsonb_build_object(
        'current_level', sensei_record.sensei_level,
        'requested_level', p_new_level
      )
    );
  END IF;

  -- Update sensei level
  UPDATE sensei_profiles
  SET 
    sensei_level = p_new_level,
    level_achieved_at = now(),
    updated_at = now()
  WHERE id = p_sensei_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to update sensei profile - no rows affected'
    );
  END IF;

  -- Insert level history with properly constructed JSONB using only primitive types
  INSERT INTO sensei_level_history (
    sensei_id,
    previous_level,
    new_level,
    change_reason,
    changed_by,
    requirements_met
  ) VALUES (
    p_sensei_id,
    sensei_record.sensei_level,
    p_new_level,
    CASE 
      WHEN p_admin_override THEN clean_reason || ' (Admin Override)' 
      ELSE clean_reason 
    END,
    admin_user_id,
    jsonb_build_object(
      'timestamp', EXTRACT(EPOCH FROM now())::bigint,
      'updated_by', 'admin',
      'admin_override', p_admin_override,
      'trips_led', COALESCE(sensei_record.trips_led, 0),
      'rating', COALESCE(sensei_record.rating, 0.0)::numeric,
      'admin_user_id', admin_user_id::text
    )
  );

  -- Return success with clean primitive data only
  RETURN jsonb_build_object(
    'success', true,
    'previous_level', sensei_record.sensei_level,
    'new_level', p_new_level,
    'message', 'Sensei level updated successfully',
    'updated_at', EXTRACT(EPOCH FROM now())::bigint
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return detailed error information for debugging
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Database error occurred during level update',
      'details', jsonb_build_object(
        'sqlstate', SQLSTATE,
        'sqlerrm', SQLERRM,
        'context', 'admin_update_sensei_level function'
      )
    );
END;
$$;