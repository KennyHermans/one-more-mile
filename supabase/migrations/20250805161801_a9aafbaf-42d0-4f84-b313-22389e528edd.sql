-- Fix the upgrade_sensei_level function to handle jsonb properly
CREATE OR REPLACE FUNCTION public.upgrade_sensei_level(p_sensei_id uuid, p_new_level text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_level TEXT;
  result JSONB;
BEGIN
  -- Get current level
  SELECT sensei_level INTO current_level
  FROM sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- Update sensei level
  UPDATE sensei_profiles
  SET sensei_level = p_new_level,
      level_achieved_at = now(),
      updated_at = now()
  WHERE id = p_sensei_id;

  -- Record level history with proper jsonb handling
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
    COALESCE(p_reason, 'Manual level update by admin'),
    jsonb_build_object(
      'timestamp', now(),
      'updated_by', 'admin',
      'admin_override', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_level', current_level,
    'new_level', p_new_level
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'Failed to update sensei level: ' || SQLERRM
    );
END;
$function$