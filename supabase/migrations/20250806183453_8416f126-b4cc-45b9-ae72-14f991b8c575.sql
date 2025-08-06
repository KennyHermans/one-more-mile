-- Drop the existing function and recreate it properly
DROP FUNCTION IF EXISTS public.admin_update_sensei_level(uuid,text,text,boolean);

-- Create the admin_update_sensei_level function
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
AS $function$
DECLARE
  current_level_record RECORD;
  level_exists BOOLEAN;
BEGIN
  -- Check if the user calling this function is an admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Admin access required');
  END IF;

  -- Check if sensei exists and get current level
  SELECT sensei_level INTO current_level_record
  FROM public.sensei_profiles 
  WHERE id = p_sensei_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- Validate that the new level exists in sensei_level_requirements
  SELECT EXISTS(
    SELECT 1 FROM public.sensei_level_requirements 
    WHERE level_name = p_new_level AND is_active = true
  ) INTO level_exists;
  
  IF NOT level_exists THEN
    RETURN jsonb_build_object('error', 'Invalid sensei level: ' || p_new_level);
  END IF;

  -- Update the sensei level
  UPDATE public.sensei_profiles 
  SET 
    sensei_level = p_new_level,
    level_achieved_at = now(),
    updated_at = now()
  WHERE id = p_sensei_id;

  -- Insert into level history
  INSERT INTO public.sensei_level_history (
    sensei_id,
    previous_level,
    new_level,
    change_reason,
    changed_by,
    requirements_met
  ) VALUES (
    p_sensei_id,
    current_level_record.sensei_level,
    p_new_level,
    CASE 
      WHEN p_admin_override THEN p_reason || ' (Admin Override)'
      ELSE p_reason
    END,
    auth.uid(),
    jsonb_build_object(
      'timestamp', now(),
      'updated_by', 'admin',
      'admin_override', p_admin_override,
      'previous_level', current_level_record.sensei_level,
      'new_level', p_new_level
    )
  );

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Sensei level updated successfully',
    'previous_level', current_level_record.sensei_level,
    'new_level', p_new_level
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'Failed to update sensei level: ' || SQLERRM
    );
END;
$function$;