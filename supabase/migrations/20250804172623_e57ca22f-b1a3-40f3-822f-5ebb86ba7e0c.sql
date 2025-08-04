-- Fix all remaining database functions that lack SET search_path TO 'public'

-- 8. Fix calculate_sensei_level_eligibility function
CREATE OR REPLACE FUNCTION public.calculate_sensei_level_eligibility(p_sensei_id uuid)
 RETURNS TABLE(eligible_level sensei_level, requirements_met jsonb, next_level_requirements jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sensei_record RECORD;
  level_req RECORD;
  current_requirements JSONB := '{}';
  next_requirements JSONB := '{}';
  eligible_lvl sensei_level := 'apprentice';
BEGIN
  -- Get sensei details
  SELECT sp.*, COALESCE(sp.rating, 0) as avg_rating, COALESCE(sp.trips_led, 0) as completed_trips
  INTO sensei_record
  FROM sensei_profiles sp
  WHERE sp.id = p_sensei_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sensei not found: %', p_sensei_id;
  END IF;

  -- Check each level requirement
  FOR level_req IN 
    SELECT * FROM level_requirements 
    ORDER BY 
      CASE level 
        WHEN 'apprentice' THEN 1 
        WHEN 'journey_guide' THEN 2 
        WHEN 'master_sensei' THEN 3 
      END
  LOOP
    -- Check if sensei meets this level's requirements
    IF sensei_record.completed_trips >= level_req.min_trips_completed 
       AND sensei_record.avg_rating >= level_req.min_average_rating THEN
      
      eligible_lvl := level_req.level;
      current_requirements := jsonb_build_object(
        'trips_completed', sensei_record.completed_trips,
        'average_rating', sensei_record.avg_rating,
        'requirements_met', true,
        'level', level_req.level
      );
    ELSE
      -- This is the next level they're working towards
      next_requirements := jsonb_build_object(
        'required_trips', level_req.min_trips_completed,
        'required_rating', level_req.min_average_rating,
        'current_trips', sensei_record.completed_trips,
        'current_rating', sensei_record.avg_rating,
        'level', level_req.level
      );
      EXIT; -- Stop checking higher levels
    END IF;
  END LOOP;

  RETURN QUERY SELECT eligible_lvl, current_requirements, next_requirements;
END;
$function$;

-- 9. Fix upgrade_sensei_level function (original one)
CREATE OR REPLACE FUNCTION public.upgrade_sensei_level(p_sensei_id uuid, p_new_level sensei_level, p_changed_by uuid DEFAULT NULL::uuid, p_reason text DEFAULT 'Automatic level progression'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_level sensei_level;
  requirements_check RECORD;
BEGIN
  -- Get current level
  SELECT sensei_level INTO current_level
  FROM sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sensei not found: %', p_sensei_id;
  END IF;

  -- If admin override, allow any level change
  IF p_changed_by IS NOT NULL AND is_admin() THEN
    -- Admin can set any level
  ELSE
    -- Check if sensei meets requirements for new level
    SELECT * INTO requirements_check
    FROM calculate_sensei_level_eligibility(p_sensei_id);
    
    IF requirements_check.eligible_level::TEXT < p_new_level::TEXT THEN
      RAISE EXCEPTION 'Sensei does not meet requirements for level: %', p_new_level;
    END IF;
  END IF;

  -- Update sensei level
  UPDATE sensei_profiles
  SET 
    sensei_level = p_new_level,
    level_achieved_at = now(),
    level_requirements_met = COALESCE(requirements_check.requirements_met, '{}')
  WHERE id = p_sensei_id;

  -- Record level change history
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
    p_changed_by,
    p_reason,
    COALESCE(requirements_check.requirements_met, '{}')
  );

  -- Create achievement record for level up
  IF current_level != p_new_level THEN
    INSERT INTO sensei_achievements (
      sensei_id,
      achievement_type,
      achievement_name,
      achievement_description,
      metadata
    ) VALUES (
      p_sensei_id,
      'level_progression',
      'Level Up: ' || REPLACE(INITCAP(p_new_level::TEXT), '_', ' '),
      'Congratulations! You have advanced to ' || REPLACE(INITCAP(p_new_level::TEXT), '_', ' ') || ' level.',
      jsonb_build_object('previous_level', current_level, 'new_level', p_new_level)
    );
  END IF;

  RETURN TRUE;
END;
$function$;