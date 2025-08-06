-- Create or replace the admin_update_sensei_level function with proper JSON handling
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
  result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object('error', 'Insufficient permissions');
  END IF;

  -- Get current sensei data
  SELECT * INTO sensei_record
  FROM sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- Update sensei level
  UPDATE sensei_profiles
  SET 
    sensei_level = p_new_level,
    level_achieved_at = now(),
    updated_at = now()
  WHERE id = p_sensei_id;

  -- Insert level history with proper JSON
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
    CASE WHEN p_admin_override THEN p_reason || ' (Admin Override)' ELSE p_reason END,
    auth.uid(),
    jsonb_build_object(
      'timestamp', now(),
      'updated_by', 'admin',
      'admin_override', p_admin_override,
      'trips_led', sensei_record.trips_led,
      'rating', sensei_record.rating
    )
  );

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'previous_level', sensei_record.sensei_level,
    'new_level', p_new_level,
    'message', 'Sensei level updated successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'Database error: ' || SQLERRM
    );
END;
$$;