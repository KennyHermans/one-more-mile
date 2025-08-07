-- Improve the auto assignment function to handle broader matching
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
    SELECT id, title, theme, destination, dates
    FROM public.trips
    WHERE trip_status = 'approved'
    AND sensei_id IS NULL
    AND is_active = true
  LOOP
    -- Find best available sensei for this trip (improved matching)
    SELECT sp.id INTO best_sensei_id
    FROM public.sensei_profiles sp
    WHERE sp.is_active = true
    AND (
      -- Direct specialty match
      EXISTS (SELECT 1 FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(trip_record.theme) || '%') OR
      -- Adventure theme can be led by any sensei if no exact match
      (trip_record.theme ILIKE '%adventure%' AND sp.sensei_level IN ('journey_guide', 'master_sensei')) OR
      -- Default to highest level sensei if no specific match
      sp.sensei_level = 'master_sensei'
    )
    ORDER BY 
      -- Prioritize exact specialty matches
      CASE WHEN EXISTS (SELECT 1 FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(trip_record.theme) || '%') THEN 1 ELSE 2 END,
      -- Then by level (master > journey > apprentice)
      CASE sp.sensei_level 
        WHEN 'master_sensei' THEN 1 
        WHEN 'journey_guide' THEN 2 
        WHEN 'apprentice' THEN 3 
        ELSE 4 
      END,
      -- Then by rating
      sp.rating DESC
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
        format('Trip "%s" has been automatically assigned to sensei', trip_record.title),
        'medium',
        trip_record.id,
        jsonb_build_object(
          'sensei_id', best_sensei_id,
          'assignment_type', 'automatic',
          'trip_theme', trip_record.theme
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

-- Run the improved auto assignment
SELECT auto_assign_unassigned_trips();