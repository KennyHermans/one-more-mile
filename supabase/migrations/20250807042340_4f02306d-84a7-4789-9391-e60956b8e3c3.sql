-- Fix the backup sensei assignment function
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
    SELECT t.id, t.theme, t.destination, t.sensei_id
    FROM public.trips t
    WHERE t.trip_status = 'approved'
    AND t.backup_sensei_id IS NULL
    AND t.sensei_id IS NOT NULL
    AND t.is_active = true
  LOOP
    -- Find best available backup sensei (excluding primary sensei)
    SELECT sp.id INTO backup_sensei_id
    FROM public.sensei_profiles sp
    WHERE sp.is_active = true
    AND sp.id != trip_record.sensei_id
    AND (
      -- Try specialty match first
      EXISTS (SELECT 1 FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(trip_record.theme) || '%') OR
      -- Adventure theme backup
      (trip_record.theme ILIKE '%adventure%' AND sp.sensei_level IN ('journey_guide', 'master_sensei')) OR
      -- Any active sensei as fallback
      sp.is_active = true
    )
    ORDER BY 
      -- Prioritize exact specialty matches
      CASE WHEN EXISTS (SELECT 1 FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(trip_record.theme) || '%') THEN 1 ELSE 2 END,
      -- Then by level
      CASE sp.sensei_level 
        WHEN 'master_sensei' THEN 1 
        WHEN 'journey_guide' THEN 2 
        WHEN 'apprentice' THEN 3 
        ELSE 4 
      END,
      sp.rating DESC
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

-- Run the backup assignment
SELECT auto_assign_backup_senseis();