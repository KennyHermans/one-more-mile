-- Enhanced milestone tracking function
CREATE OR REPLACE FUNCTION public.check_and_award_milestones(p_sensei_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  eligibility_data JSONB;
  current_level TEXT;
  next_level_data RECORD;
  progress_percentage NUMERIC;
BEGIN
  -- Get current eligibility data
  SELECT public.check_sensei_level_eligibility(p_sensei_id) INTO eligibility_data;
  
  IF eligibility_data IS NULL THEN
    RETURN;
  END IF;
  
  current_level := eligibility_data ->> 'current_level';
  
  -- Check if there's a next level to progress toward
  IF eligibility_data -> 'next_level' IS NOT NULL THEN
    -- Calculate overall progress percentage
    progress_percentage := (
      COALESCE((eligibility_data -> 'next_level' -> 'trips_progress' ->> 'percentage')::NUMERIC, 0) +
      COALESCE((eligibility_data -> 'next_level' -> 'rating_progress' ->> 'percentage')::NUMERIC, 0)
    ) / 2;
    
    -- Award milestone achievements
    IF progress_percentage >= 50 THEN
      INSERT INTO public.milestone_achievements (sensei_id, milestone_type, target_level, progress_percentage, metadata)
      VALUES (p_sensei_id, 'progress_50', eligibility_data -> 'next_level' ->> 'level_name', 50, 
              jsonb_build_object('current_progress', progress_percentage, 'achieved_at', now()))
      ON CONFLICT (sensei_id, milestone_type, target_level) DO NOTHING;
    END IF;
    
    IF progress_percentage >= 75 THEN
      INSERT INTO public.milestone_achievements (sensei_id, milestone_type, target_level, progress_percentage, metadata)
      VALUES (p_sensei_id, 'progress_75', eligibility_data -> 'next_level' ->> 'level_name', 75,
              jsonb_build_object('current_progress', progress_percentage, 'achieved_at', now()))
      ON CONFLICT (sensei_id, milestone_type, target_level) DO NOTHING;
    END IF;
    
    IF progress_percentage >= 90 THEN
      INSERT INTO public.milestone_achievements (sensei_id, milestone_type, target_level, progress_percentage, metadata)
      VALUES (p_sensei_id, 'progress_90', eligibility_data -> 'next_level' ->> 'level_name', 90,
              jsonb_build_object('current_progress', progress_percentage, 'achieved_at', now()))
      ON CONFLICT (sensei_id, milestone_type, target_level) DO NOTHING;
    END IF;
  END IF;
  
  -- Award level-up achievement if eligible for auto-upgrade
  IF (eligibility_data ->> 'can_auto_upgrade')::boolean = true THEN
    INSERT INTO public.milestone_achievements (sensei_id, milestone_type, target_level, progress_percentage, metadata)
    VALUES (p_sensei_id, 'level_up', eligibility_data ->> 'eligible_level', 100,
            jsonb_build_object('auto_eligible', true, 'achieved_at', now()))
    ON CONFLICT (sensei_id, milestone_type, target_level) DO NOTHING;
  END IF;
END;
$function$;

-- Enhanced auto-upgrade function using configurable requirements
CREATE OR REPLACE FUNCTION public.enhanced_auto_upgrade_sensei_levels()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  sensei_record RECORD;
  upgrade_count INTEGER := 0;
  eligibility_data JSONB;
  config_req RECORD;
BEGIN
  -- Loop through all active senseis
  FOR sensei_record IN 
    SELECT id, sensei_level, name, trips_led, rating
    FROM public.sensei_profiles 
    WHERE is_active = true
  LOOP
    -- Check eligibility using configurable requirements
    SELECT * INTO config_req
    FROM public.configurable_level_requirements
    WHERE is_active = true
    AND trips_required <= sensei_record.trips_led
    AND rating_required <= COALESCE(sensei_record.rating, 0)
    AND level_name != sensei_record.sensei_level
    ORDER BY trips_required DESC, rating_required DESC
    LIMIT 1;
    
    -- If eligible for upgrade
    IF config_req.level_name IS NOT NULL AND config_req.level_name != sensei_record.sensei_level THEN
      -- Check milestone achievements first
      PERFORM public.check_and_award_milestones(sensei_record.id);
      
      -- Perform the upgrade
      UPDATE public.sensei_profiles
      SET 
        sensei_level = config_req.level_name,
        level_achieved_at = now(),
        updated_at = now()
      WHERE id = sensei_record.id;
      
      -- Record in level history
      INSERT INTO public.sensei_level_history (
        sensei_id,
        previous_level,
        new_level,
        change_reason,
        requirements_met
      ) VALUES (
        sensei_record.id,
        sensei_record.sensei_level,
        config_req.level_name,
        'Automatic upgrade based on configurable criteria',
        jsonb_build_object(
          'trips_led', sensei_record.trips_led,
          'rating', sensei_record.rating,
          'config_used', config_req.level_name,
          'timestamp', now()::text
        )
      );
      
      -- Award level-up milestone
      INSERT INTO public.milestone_achievements (sensei_id, milestone_type, target_level, progress_percentage, metadata)
      VALUES (sensei_record.id, 'level_up', config_req.level_name, 100,
              jsonb_build_object('auto_upgrade', true, 'achieved_at', now()))
      ON CONFLICT (sensei_id, milestone_type, target_level) DO NOTHING;
      
      upgrade_count := upgrade_count + 1;
    ELSE
      -- Still check for milestone achievements even if not upgrading
      PERFORM public.check_and_award_milestones(sensei_record.id);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'upgrades_performed', upgrade_count,
    'timestamp', now(),
    'total_senseis_checked', (SELECT COUNT(*) FROM public.sensei_profiles WHERE is_active = true)
  );
END;
$function$;

-- Function to get configurable requirements
CREATE OR REPLACE FUNCTION public.get_configurable_requirements()
RETURNS TABLE(
  level_name TEXT,
  trips_required INTEGER,
  rating_required NUMERIC,
  additional_criteria JSONB,
  is_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT 
    clr.level_name,
    clr.trips_required,
    clr.rating_required,
    clr.additional_criteria,
    clr.is_active
  FROM public.configurable_level_requirements clr
  WHERE clr.is_active = true
  ORDER BY clr.trips_required ASC, clr.rating_required ASC;
$function$;

-- Function to get field permissions for a sensei
CREATE OR REPLACE FUNCTION public.get_sensei_field_permissions(p_sensei_id uuid)
RETURNS TABLE(
  field_category TEXT,
  field_name TEXT,
  can_view BOOLEAN,
  can_edit BOOLEAN,
  conditions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  sensei_level TEXT;
BEGIN
  -- Get sensei level
  SELECT sp.sensei_level INTO sensei_level
  FROM public.sensei_profiles sp
  WHERE sp.id = p_sensei_id;
  
  IF sensei_level IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    sfpc.field_category,
    sfpc.field_name,
    sfpc.can_view,
    sfpc.can_edit,
    sfpc.conditions
  FROM public.sensei_field_permissions_config sfpc
  WHERE sfpc.sensei_level = get_sensei_field_permissions.sensei_level;
END;
$function$;