-- Fix remaining database functions to include SET search_path TO 'public'

-- 3. Fix suggest_senseis_for_trip function
CREATE OR REPLACE FUNCTION public.suggest_senseis_for_trip(trip_theme text, trip_months text[] DEFAULT '{}'::text[])
 RETURNS TABLE(sensei_id uuid, sensei_name text, match_score integer, matching_specialties text[], matching_certifications text[], location text, rating numeric, is_available boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id as sensei_id,
    sp.name as sensei_name,
    (
      -- Score based on specialty matches
      (SELECT COUNT(*) FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(trip_theme) || '%') * 3 +
      -- Score based on certification matches  
      (SELECT COUNT(*) FROM unnest(sp.certifications) c WHERE LOWER(c) LIKE '%' || LOWER(trip_theme) || '%') * 2 +
      -- Bonus for high rating
      CASE WHEN sp.rating >= 4.5 THEN 2 WHEN sp.rating >= 4.0 THEN 1 ELSE 0 END
    )::integer as match_score,
    -- Get matching specialties
    ARRAY(SELECT s FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(trip_theme) || '%') as matching_specialties,
    -- Get matching certifications
    ARRAY(SELECT c FROM unnest(sp.certifications) c WHERE LOWER(c) LIKE '%' || LOWER(trip_theme) || '%') as matching_certifications,
    sp.location,
    sp.rating,
    (
      sp.is_active = true 
      AND sp.is_offline = false 
      AND (
        array_length(trip_months, 1) IS NULL 
        OR NOT EXISTS (
          SELECT 1 FROM unnest(trip_months) tm 
          WHERE tm = ANY(sp.unavailable_months)
        )
      )
    ) as is_available
  FROM sensei_profiles sp
  WHERE sp.is_active = true
  AND (
    -- Has matching specialties or certifications
    EXISTS (SELECT 1 FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(trip_theme) || '%')
    OR EXISTS (SELECT 1 FROM unnest(sp.certifications) c WHERE LOWER(c) LIKE '%' || LOWER(trip_theme) || '%')
  )
  ORDER BY match_score DESC, sp.rating DESC;
END;
$function$;

-- 4. Fix suggest_senseis_for_trip_enhanced function
CREATE OR REPLACE FUNCTION public.suggest_senseis_for_trip_enhanced(trip_theme text, trip_months text[] DEFAULT '{}'::text[], trip_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(sensei_id uuid, sensei_name text, match_score integer, matching_specialties text[], matching_certifications text[], matching_skills text[], verified_certificates text[], missing_requirements text[], location text, rating numeric, is_available boolean, requirements_met_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  req_count INTEGER := 0;
BEGIN
  -- Get the number of mandatory requirements if trip_id is provided
  IF trip_id IS NOT NULL THEN
    SELECT COUNT(*) INTO req_count
    FROM trip_requirements tr
    WHERE tr.trip_id = suggest_senseis_for_trip_enhanced.trip_id 
    AND tr.is_mandatory = TRUE;
  END IF;

  RETURN QUERY
  SELECT 
    sp.id as sensei_id,
    sp.name as sensei_name,
    (
      -- Score based on specialty matches
      (SELECT COUNT(*) FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(trip_theme) || '%') * 3 +
      -- Score based on certification matches  
      (SELECT COUNT(*) FROM unnest(sp.certifications) c WHERE LOWER(c) LIKE '%' || LOWER(trip_theme) || '%') * 2 +
      -- Score based on verified certificates
      (SELECT COUNT(*) FROM sensei_certificates sc 
       WHERE sc.sensei_id = sp.id AND sc.verification_status = 'verified' AND sc.is_active = TRUE) * 4 +
      -- Score based on skills matches
      (SELECT COUNT(*) FROM sensei_skills ss 
       WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
       AND LOWER(ss.skill_name) LIKE '%' || LOWER(trip_theme) || '%') * 2 +
      -- Bonus for high rating
      CASE WHEN sp.rating >= 4.5 THEN 3 WHEN sp.rating >= 4.0 THEN 2 WHEN sp.rating >= 3.5 THEN 1 ELSE 0 END +
      -- Bonus for meeting trip requirements
      CASE WHEN trip_id IS NOT NULL AND req_count > 0 THEN
        (SELECT COUNT(*) FROM trip_requirements tr
         WHERE tr.trip_id = suggest_senseis_for_trip_enhanced.trip_id 
         AND tr.is_mandatory = TRUE
         AND (
           (tr.requirement_type = 'certificate' AND EXISTS (
             SELECT 1 FROM sensei_certificates sc 
             WHERE sc.sensei_id = sp.id 
             AND LOWER(sc.certificate_type) LIKE '%' || LOWER(tr.requirement_name) || '%'
             AND sc.verification_status = 'verified' 
             AND sc.is_active = TRUE
             AND (sc.expiry_date IS NULL OR sc.expiry_date > CURRENT_DATE)
           )) OR
           (tr.requirement_type = 'skill' AND EXISTS (
             SELECT 1 FROM sensei_skills ss 
             WHERE ss.sensei_id = sp.id 
             AND LOWER(ss.skill_name) LIKE '%' || LOWER(tr.requirement_name) || '%'
             AND ss.is_active = TRUE
           ))
         )) * 5
      ELSE 0 END
    )::INTEGER as match_score,
    
    -- Get matching specialties
    ARRAY(SELECT s FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(trip_theme) || '%') as matching_specialties,
    
    -- Get matching certifications
    ARRAY(SELECT c FROM unnest(sp.certifications) c WHERE LOWER(c) LIKE '%' || LOWER(trip_theme) || '%') as matching_certifications,
    
    -- Get matching skills
    ARRAY(SELECT DISTINCT ss.skill_name FROM sensei_skills ss 
          WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
          AND LOWER(ss.skill_name) LIKE '%' || LOWER(trip_theme) || '%') as matching_skills,
    
    -- Get verified certificates
    ARRAY(SELECT DISTINCT sc.certificate_name FROM sensei_certificates sc 
          WHERE sc.sensei_id = sp.id AND sc.verification_status = 'verified' 
          AND sc.is_active = TRUE AND (sc.expiry_date IS NULL OR sc.expiry_date > CURRENT_DATE)) as verified_certificates,
    
    -- Get missing requirements
    CASE WHEN trip_id IS NOT NULL THEN
      ARRAY(SELECT tr.requirement_name FROM trip_requirements tr
            WHERE tr.trip_id = suggest_senseis_for_trip_enhanced.trip_id 
            AND tr.is_mandatory = TRUE
            AND NOT (
              (tr.requirement_type = 'certificate' AND EXISTS (
                SELECT 1 FROM sensei_certificates sc 
                WHERE sc.sensei_id = sp.id 
                AND LOWER(sc.certificate_type) LIKE '%' || LOWER(tr.requirement_name) || '%'
                AND sc.verification_status = 'verified' 
                AND sc.is_active = TRUE
                AND (sc.expiry_date IS NULL OR sc.expiry_date > CURRENT_DATE)
              )) OR
              (tr.requirement_type = 'skill' AND EXISTS (
                SELECT 1 FROM sensei_skills ss 
                WHERE ss.sensei_id = sp.id 
                AND LOWER(ss.skill_name) LIKE '%' || LOWER(tr.requirement_name) || '%'
                AND ss.is_active = TRUE
              ))
            ))
    ELSE '{}'::TEXT[]
    END as missing_requirements,
    
    sp.location,
    sp.rating,
    (
      sp.is_active = TRUE 
      AND sp.is_offline = FALSE 
      AND (
        array_length(trip_months, 1) IS NULL 
        OR NOT EXISTS (
          SELECT 1 FROM unnest(trip_months) tm 
          WHERE tm = ANY(sp.unavailable_months)
        )
      )
    ) as is_available,
    
    -- Calculate requirements met percentage
    CASE WHEN trip_id IS NOT NULL AND req_count > 0 THEN
      (SELECT COUNT(*) FROM trip_requirements tr
       WHERE tr.trip_id = suggest_senseis_for_trip_enhanced.trip_id 
       AND tr.is_mandatory = TRUE
       AND (
         (tr.requirement_type = 'certificate' AND EXISTS (
           SELECT 1 FROM sensei_certificates sc 
           WHERE sc.sensei_id = sp.id 
           AND LOWER(sc.certificate_type) LIKE '%' || LOWER(tr.requirement_name) || '%'
           AND sc.verification_status = 'verified' 
           AND sc.is_active = TRUE
           AND (sc.expiry_date IS NULL OR sc.expiry_date > CURRENT_DATE)
         )) OR
         (tr.requirement_type = 'skill' AND EXISTS (
           SELECT 1 FROM sensei_skills ss 
           WHERE ss.sensei_id = sp.id 
           AND LOWER(ss.skill_name) LIKE '%' || LOWER(tr.requirement_name) || '%'
           AND ss.is_active = TRUE
         ))
       ))::NUMERIC / req_count * 100
    ELSE 100
    END as requirements_met_percentage
    
  FROM sensei_profiles sp
  WHERE sp.is_active = TRUE
  AND (
    -- Has matching specialties or certifications
    EXISTS (SELECT 1 FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(trip_theme) || '%')
    OR EXISTS (SELECT 1 FROM unnest(sp.certifications) c WHERE LOWER(c) LIKE '%' || LOWER(trip_theme) || '%')
    OR EXISTS (SELECT 1 FROM sensei_certificates sc 
               WHERE sc.sensei_id = sp.id AND sc.verification_status = 'verified' AND sc.is_active = TRUE)
    OR EXISTS (SELECT 1 FROM sensei_skills ss 
               WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE)
  )
  ORDER BY match_score DESC, requirements_met_percentage DESC, sp.rating DESC;
END;
$function$;