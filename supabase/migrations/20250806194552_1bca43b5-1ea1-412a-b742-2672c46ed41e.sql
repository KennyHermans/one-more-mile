-- TEMP TEST - Remove requirements_met from INSERT
CREATE OR REPLACE FUNCTION public.admin_update_sensei_level(
  p_sensei_id UUID,
  p_new_level TEXT,
  p_reason TEXT,
  p_admin_override BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  original_level TEXT;
BEGIN
  -- Get the original level FIRST
  SELECT sensei_level INTO original_level
  FROM public.sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sensei not found'
    );
  END IF;

  -- Update profile
  UPDATE public.sensei_profiles
  SET 
    sensei_level = p_new_level,
    level_achieved_at = now(),
    updated_at = now()
  WHERE id = p_sensei_id;

  -- TEMP TEST: Insert without requirements_met field
  INSERT INTO public.sensei_level_history (
    sensei_id,
    previous_level,
    new_level,
    change_reason
  ) VALUES (
    p_sensei_id,
    original_level,
    p_new_level,
    trim(p_reason)
  );

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Level updated successfully'
  );
END;
$$;