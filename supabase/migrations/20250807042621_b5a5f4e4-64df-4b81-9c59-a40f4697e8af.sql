-- Drop existing conflicting functions
DROP FUNCTION IF EXISTS public.admin_update_sensei_level(uuid, text, uuid, text);
DROP FUNCTION IF EXISTS public.admin_update_sensei_level(uuid, text, text, boolean);

-- Create a single, unified admin_update_sensei_level function
CREATE OR REPLACE FUNCTION public.admin_update_sensei_level(
  p_sensei_id uuid,
  p_new_level text,
  p_reason text DEFAULT 'Admin manual update',
  p_admin_user_id uuid DEFAULT auth.uid(),
  p_admin_override boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  old_level text;
  sensei_record RECORD;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Get current sensei data
  SELECT sensei_level, name INTO sensei_record
  FROM public.sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sensei not found');
  END IF;

  old_level := sensei_record.sensei_level;

  -- Don't update if it's the same level
  IF old_level = p_new_level THEN
    RETURN jsonb_build_object('success', true, 'message', 'Level unchanged');
  END IF;

  -- Validate the new level exists
  IF NOT EXISTS (SELECT 1 FROM public.sensei_level_requirements WHERE level_name = p_new_level AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid sensei level');
  END IF;

  -- Update sensei level
  UPDATE public.sensei_profiles
  SET 
    sensei_level = p_new_level,
    level_achieved_at = now(),
    updated_at = now()
  WHERE id = p_sensei_id;

  -- Record level change in history
  INSERT INTO public.sensei_level_history (
    sensei_id,
    previous_level,
    new_level,
    change_reason,
    changed_by
  ) VALUES (
    p_sensei_id,
    old_level,
    p_new_level,
    p_reason,
    p_admin_user_id
  );

  -- Create admin audit log entry
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    p_admin_user_id,
    'UPDATE_SENSEI_LEVEL',
    'sensei_profiles',
    p_sensei_id,
    jsonb_build_object('sensei_level', old_level),
    jsonb_build_object('sensei_level', p_new_level, 'reason', p_reason)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Successfully updated %s from %s to %s', sensei_record.name, old_level, p_new_level),
    'old_level', old_level,
    'new_level', p_new_level
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;