-- Fix function search path security warnings
-- Update all functions to have secure search_path

CREATE OR REPLACE FUNCTION public.calculate_sensei_match_score_enhanced(p_sensei_id uuid, p_trip_theme text, p_trip_months text[] DEFAULT '{}'::text[], p_trip_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(match_score integer, weighted_score numeric, specialty_matches text[], certificate_matches text[], skill_matches text[], missing_requirements text[], requirements_met_percentage numeric, proficiency_bonus numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    base_score INTEGER := 0;
    weight_score NUMERIC := 0;
    req_count INTEGER := 0;
    met_requirements INTEGER := 0;
BEGIN
    -- Get trip requirements count
    IF p_trip_id IS NOT NULL THEN
        SELECT COUNT(*) INTO req_count
        FROM trip_requirements tr
        WHERE tr.trip_id = p_trip_id AND tr.is_mandatory = TRUE;
    END IF;

    RETURN QUERY
    SELECT 
        -- Base scoring (existing logic)
        (
            (SELECT COUNT(*) FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(p_trip_theme) || '%') * 3 +
            (SELECT COUNT(*) FROM unnest(sp.certifications) c WHERE LOWER(c) LIKE '%' || LOWER(p_trip_theme) || '%') * 2 +
            (SELECT COUNT(*) FROM sensei_certificates sc 
             WHERE sc.sensei_id = sp.id AND sc.verification_status = 'verified' 
             AND sc.is_active = TRUE AND LOWER(sc.certificate_name) LIKE '%' || LOWER(p_trip_theme) || '%') * 5 +
            (SELECT COUNT(*) FROM sensei_skills ss 
             WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
             AND LOWER(ss.skill_name) LIKE '%' || LOWER(p_trip_theme) || '%') * 3 +
            CASE WHEN sp.rating >= 4.5 THEN 5 WHEN sp.rating >= 4.0 THEN 3 WHEN sp.rating >= 3.5 THEN 1 ELSE 0 END
        )::INTEGER as match_score,
        
        -- Enhanced weighted scoring with proficiency levels
        (
            -- Specialty weight
            (SELECT COUNT(*) FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(p_trip_theme) || '%') * 3.0 +
            
            -- Certificate weight (higher for verified)
            (SELECT COALESCE(SUM(
                CASE 
                    WHEN sc.verification_status = 'verified' THEN 6.0
                    WHEN sc.verification_status = 'pending' THEN 2.0
                    ELSE 1.0
                END
            ), 0) FROM sensei_certificates sc 
             WHERE sc.sensei_id = sp.id AND sc.is_active = TRUE 
             AND LOWER(sc.certificate_name) LIKE '%' || LOWER(p_trip_theme) || '%') +
            
            -- Skill weight with proficiency multiplier
            (SELECT COALESCE(SUM(
                CASE ss.proficiency_level
                    WHEN 'expert' THEN 4.0
                    WHEN 'advanced' THEN 3.0
                    WHEN 'intermediate' THEN 2.0
                    WHEN 'beginner' THEN 1.0
                    ELSE 2.0
                END *
                CASE 
                    WHEN ss.is_verified = TRUE THEN 1.5
                    ELSE 1.0
                END
            ), 0) FROM sensei_skills ss 
             WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
             AND LOWER(ss.skill_name) LIKE '%' || LOWER(p_trip_theme) || '%') +
            
            -- Rating bonus
            CASE WHEN sp.rating >= 4.5 THEN 8.0 WHEN sp.rating >= 4.0 THEN 5.0 WHEN sp.rating >= 3.5 THEN 2.0 ELSE 0 END +
            
            -- Experience bonus (trips led)
            LEAST(sp.trips_led * 0.5, 10.0)
            
        ) as weighted_score,
        
        -- Matching arrays
        ARRAY(SELECT s FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(p_trip_theme) || '%') as specialty_matches,
        
        ARRAY(SELECT DISTINCT sc.certificate_name FROM sensei_certificates sc 
              WHERE sc.sensei_id = sp.id AND sc.verification_status = 'verified' 
              AND sc.is_active = TRUE AND LOWER(sc.certificate_name) LIKE '%' || LOWER(p_trip_theme) || '%') as certificate_matches,
        
        ARRAY(SELECT DISTINCT ss.skill_name FROM sensei_skills ss 
              WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
              AND LOWER(ss.skill_name) LIKE '%' || LOWER(p_trip_theme) || '%') as skill_matches,
        
        -- Missing requirements
        CASE WHEN p_trip_id IS NOT NULL THEN
            ARRAY(SELECT tr.requirement_name FROM trip_requirements tr
                  WHERE tr.trip_id = p_trip_id AND tr.is_mandatory = TRUE
                  AND NOT EXISTS (
                      SELECT 1 FROM sensei_certificates sc 
                      WHERE sc.sensei_id = sp.id 
                      AND LOWER(sc.certificate_name) LIKE '%' || LOWER(tr.requirement_name) || '%'
                      AND sc.verification_status = 'verified' AND sc.is_active = TRUE
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM sensei_skills ss 
                      WHERE ss.sensei_id = sp.id 
                      AND LOWER(ss.skill_name) LIKE '%' || LOWER(tr.requirement_name) || '%'
                      AND ss.is_active = TRUE
                  ))
        ELSE '{}'::TEXT[]
        END as missing_requirements,
        
        -- Requirements met percentage
        CASE WHEN p_trip_id IS NOT NULL AND req_count > 0 THEN
            (SELECT COUNT(*) FROM trip_requirements tr
             WHERE tr.trip_id = p_trip_id AND tr.is_mandatory = TRUE
             AND (
                 EXISTS (SELECT 1 FROM sensei_certificates sc 
                        WHERE sc.sensei_id = sp.id 
                        AND LOWER(sc.certificate_name) LIKE '%' || LOWER(tr.requirement_name) || '%'
                        AND sc.verification_status = 'verified' AND sc.is_active = TRUE) OR
                 EXISTS (SELECT 1 FROM sensei_skills ss 
                        WHERE ss.sensei_id = sp.id 
                        AND LOWER(ss.skill_name) LIKE '%' || LOWER(tr.requirement_name) || '%'
                        AND ss.is_active = TRUE)
             ))::NUMERIC / req_count * 100
        ELSE 100
        END as requirements_met_percentage,
        
        -- Proficiency bonus calculation
        (SELECT COALESCE(AVG(
            CASE ss.proficiency_level
                WHEN 'expert' THEN 4.0
                WHEN 'advanced' THEN 3.0
                WHEN 'intermediate' THEN 2.0
                WHEN 'beginner' THEN 1.0
                ELSE 2.0
            END
        ), 0) FROM sensei_skills ss 
         WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE) as proficiency_bonus
        
    FROM sensei_profiles sp
    WHERE sp.id = p_sensei_id AND sp.is_active = TRUE;
END;
$function$;

-- Update other functions with secure search_path
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