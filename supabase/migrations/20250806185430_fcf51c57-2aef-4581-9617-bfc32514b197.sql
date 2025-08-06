-- Simplified admin_update_sensei_level function to isolate JSON issue
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
    RETURN '{"success": false, "error": "Insufficient permissions - admin access required"}'::jsonb;
  END IF;

  -- Validate input parameters
  IF p_sensei_id IS NULL THEN
    RETURN '{"success": false, "error": "Sensei ID is required"}'::jsonb;
  END IF;

  -- Validate level
  IF p_new_level IS NULL OR p_new_level NOT IN ('apprentice', 'journey_guide', 'master_sensei') THEN
    RETURN '{"success": false, "error": "Invalid sensei level provided"}'::jsonb;
  END IF;

  -- Clean and validate reason
  clean_reason := TRIM(COALESCE(p_reason, ''));
  IF LENGTH(clean_reason) < 3 THEN
    RETURN '{"success": false, "error": "Reason must be at least 3 characters long"}'::jsonb;
  END IF;

  -- Remove potentially problematic characters for JSON
  clean_reason := REGEXP_REPLACE(clean_reason, '[^\x20-\x7E\s]', '', 'g');

  -- Get current sensei data
  SELECT * INTO sensei_record
  FROM sensei_profiles
  WHERE id = p_sensei_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN '{"success": false, "error": "Sensei not found or inactive"}'::jsonb;
  END IF;

  -- Check if level is actually changing
  IF sensei_record.sensei_level = p_new_level THEN
    RETURN '{"success": false, "error": "Sensei is already at this level"}'::jsonb;
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
    RETURN '{"success": false, "error": "Failed to update sensei profile - no rows affected"}'::jsonb;
  END IF;

  -- Insert level history with minimal JSONB data to avoid JSON parsing issues
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
    '{"updated_by": "admin"}'::jsonb  -- Minimal JSON to avoid parsing issues
  );

  -- Return success with simple JSON
  RETURN format('{"success": true, "previous_level": "%s", "new_level": "%s", "message": "Sensei level updated successfully"}', 
                sensei_record.sensei_level, p_new_level)::jsonb;

EXCEPTION
  WHEN OTHERS THEN
    -- Return detailed error information for debugging
    RETURN format('{"success": false, "error": "Database error: %s", "sqlstate": "%s"}', 
                  SQLERRM, SQLSTATE)::jsonb;
END;
$$;