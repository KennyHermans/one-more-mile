-- Fix the admin_update_sensei_level function to properly cast JSON values
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
BEGIN
  -- Simple level update without any JSON operations that could fail
  UPDATE public.sensei_profiles
  SET 
    sensei_level = p_new_level,
    level_achieved_at = now(),
    updated_at = now()
  WHERE id = p_sensei_id;

  -- Insert into level history with EXPLICIT ::jsonb casting
  INSERT INTO public.sensei_level_history (
    sensei_id,
    previous_level,
    new_level,
    change_reason,
    requirements_met  -- This is likely the problematic field
  ) VALUES (
    p_sensei_id,
    (SELECT sensei_level FROM public.sensei_profiles WHERE id = p_sensei_id),
    p_new_level,
    p_reason,
    '{}'::jsonb  -- ✅ EXPLICIT CAST to avoid 22P02 error
  );

  -- Return simple success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Level updated successfully'
  );
END;
$$;