-- Fix the admin_update_sensei_level function to correct the SQL syntax error
CREATE OR REPLACE FUNCTION public.admin_update_sensei_level(p_sensei_id uuid, p_new_level text, p_reason text DEFAULT NULL::text, p_admin_override boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_level TEXT;
  eligibility_data JSONB;
  result JSONB;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized - admin access required');
  END IF;

  -- Get current level
  SELECT sensei_level INTO current_level
  FROM sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- If not admin override, check eligibility
  IF NOT p_admin_override THEN
    SELECT check_sensei_level_eligibility(p_sensei_id) INTO eligibility_data;
    
    -- Check if the requested level is eligible
    IF p_new_level = 'journey_guide' AND NOT (eligibility_data ->> 'eligible_for_journey_guide')::boolean THEN
      RETURN jsonb_build_object('error', 'Sensei not eligible for Journey Guide level');
    END IF;
    
    IF p_new_level = 'master_sensei' AND NOT (eligibility_data ->> 'eligible_for_master_sensei')::boolean THEN
      RETURN jsonb_build_object('error', 'Sensei not eligible for Master Sensei level');
    END IF;
  END IF;

  -- Update sensei level - FIX: Correct the SQL syntax
  UPDATE sensei_profiles
  SET sensei_level = p_new_level,
      level_achieved_at = now(),
      updated_at = now()
  WHERE id = p_sensei_id;

  -- Record level history
  INSERT INTO sensei_level_history (
    sensei_id,
    previous_level,
    new_level,
    changed_by,
    change_reason,
    requirements_met
  ) VALUES (
    p_sensei_id,
    current_level,
    p_new_level,
    auth.uid(),
    COALESCE(p_reason, 'Admin level update'),
    jsonb_build_object(
      'timestamp', now(),
      'updated_by', 'admin',
      'admin_override', p_admin_override
    )
  );

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'previous_level', current_level,
    'new_level', p_new_level,
    'admin_override', p_admin_override
  );
END;
$function$;