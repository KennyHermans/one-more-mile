-- Clean up duplicate admin_update_sensei_level functions and ensure we have only one correct version
DROP FUNCTION IF EXISTS public.admin_update_sensei_level(uuid, text, text, boolean);
DROP FUNCTION IF EXISTS public.admin_update_sensei_level(uuid, text, text);
DROP FUNCTION IF EXISTS public.admin_update_sensei_level(uuid, text);

-- Create the definitive admin_update_sensei_level function
CREATE OR REPLACE FUNCTION public.admin_update_sensei_level(
  p_sensei_id uuid,
  p_new_level text,
  p_reason text DEFAULT NULL,
  p_admin_override boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  current_level text;
  eligibility_data jsonb;
  result jsonb;
BEGIN
  -- Get current sensei level
  SELECT sensei_level INTO current_level
  FROM public.sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sensei not found');
  END IF;

  -- Check if level is actually changing
  IF current_level = p_new_level THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sensei is already at this level');
  END IF;

  -- Validate new level
  IF p_new_level NOT IN ('apprentice', 'journey_guide', 'master_sensei') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid sensei level');
  END IF;

  -- Check eligibility unless admin override is used
  IF NOT p_admin_override THEN
    SELECT public.check_sensei_level_eligibility(p_sensei_id) INTO eligibility_data;
    
    IF eligibility_data->>'eligible_level' != p_new_level THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Sensei does not meet requirements for this level',
        'eligibility', eligibility_data
      );
    END IF;
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
    change_reason,
    changed_by
  ) VALUES (
    p_sensei_id,
    current_level,
    p_new_level,
    COALESCE(p_reason, 'Admin level update'),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_level', current_level,
    'new_level', p_new_level,
    'admin_override', p_admin_override
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'admin_update_sensei_level error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create automated trip assignment function
CREATE OR REPLACE FUNCTION public.auto_assign_unassigned_trips()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  trip_record RECORD;
  best_sensei_id uuid;
  assignment_count integer := 0;
  result jsonb;
BEGIN
  -- Loop through unassigned approved trips
  FOR trip_record IN 
    SELECT id, theme, destination, dates
    FROM public.trips
    WHERE trip_status = 'approved'
    AND sensei_id IS NULL
    AND is_active = true
  LOOP
    -- Find best available sensei for this trip
    SELECT sensei_id INTO best_sensei_id
    FROM public.suggest_senseis_for_trip(trip_record.theme)
    WHERE is_available = true
    ORDER BY match_score DESC
    LIMIT 1;

    -- Assign if we found a suitable sensei
    IF best_sensei_id IS NOT NULL THEN
      UPDATE public.trips
      SET 
        sensei_id = best_sensei_id,
        updated_at = now()
      WHERE id = trip_record.id;

      -- Create assignment notification
      INSERT INTO public.admin_alerts (
        alert_type,
        title,
        message,
        priority,
        trip_id,
        metadata
      ) VALUES (
        'auto_assignment',
        'Sensei Auto-Assigned',
        format('Trip "%s" has been automatically assigned a sensei', 
               (SELECT title FROM public.trips WHERE id = trip_record.id)),
        'medium',
        trip_record.id,
        jsonb_build_object(
          'sensei_id', best_sensei_id,
          'assignment_type', 'automatic'
        )
      );

      assignment_count := assignment_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'assignments_made', assignment_count,
    'message', format('Successfully assigned %s trips', assignment_count)
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'auto_assign_unassigned_trips error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create backup sensei assignment function
CREATE OR REPLACE FUNCTION public.auto_assign_backup_senseis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  trip_record RECORD;
  backup_sensei_id uuid;
  assignment_count integer := 0;
BEGIN
  -- Loop through trips without backup senseis
  FOR trip_record IN 
    SELECT id, theme, destination, sensei_id
    FROM public.trips
    WHERE trip_status = 'approved'
    AND backup_sensei_id IS NULL
    AND sensei_id IS NOT NULL
    AND is_active = true
  LOOP
    -- Find best available backup sensei (excluding primary sensei)
    SELECT sensei_id INTO backup_sensei_id
    FROM public.suggest_senseis_for_trip(trip_record.theme)
    WHERE is_available = true
    AND sensei_id != trip_record.sensei_id
    ORDER BY match_score DESC
    LIMIT 1;

    -- Assign backup if found
    IF backup_sensei_id IS NOT NULL THEN
      UPDATE public.trips
      SET 
        backup_sensei_id = backup_sensei_id,
        updated_at = now()
      WHERE id = trip_record.id;

      assignment_count := assignment_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'backup_assignments_made', assignment_count,
    'message', format('Successfully assigned %s backup senseis', assignment_count)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;