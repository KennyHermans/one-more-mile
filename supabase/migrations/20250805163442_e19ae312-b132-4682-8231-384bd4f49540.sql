-- Create a secure function to update sensei levels with proper permissions
CREATE OR REPLACE FUNCTION public.admin_update_sensei_level(
  p_sensei_id UUID,
  p_new_level TEXT,
  p_reason TEXT,
  p_admin_override BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_level TEXT;
  admin_user_id UUID;
  result JSONB;
BEGIN
  -- Get the current admin user
  admin_user_id := auth.uid();
  
  -- Verify admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE user_id = admin_user_id 
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

  -- Update sensei level
  UPDATE public.sensei_profiles
  SET 
    sensei_level = p_new_level,
    level_achieved_at = now(),
    updated_at = now()
  WHERE id = p_sensei_id;

  -- Record in level history
  INSERT INTO public.sensei_level_history (
    sensei_id,
    previous_level,
    new_level,
    changed_by,
    change_reason,
    requirements_met,
    admin_override
  ) VALUES (
    p_sensei_id,
    current_level,
    p_new_level,
    admin_user_id,
    p_reason,
    jsonb_build_object(
      'timestamp', now(),
      'updated_by', 'admin',
      'admin_override', p_admin_override
    ),
    p_admin_override
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_level', current_level,
    'new_level', p_new_level,
    'updated_by', admin_user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'Failed to update sensei level: ' || SQLERRM,
      'code', SQLSTATE
    );
END;
$$;