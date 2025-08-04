-- Fix security issues by updating database functions to include proper search_path
-- Update all functions that don't have SET search_path TO 'public'

-- 1. Fix calculate_sensei_match_score_enhanced function
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

-- 2. Fix calculate_sensei_insights function
CREATE OR REPLACE FUNCTION public.calculate_sensei_insights(p_sensei_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    total_trips INT := 0;
    high_match INT := 0;
    medium_match INT := 0;
    low_match INT := 0;
    missing_skills_array TEXT[];
    recommended_certs_array TEXT[];
    trip_record RECORD;
    match_result RECORD;
BEGIN
    -- Count total available trips
    SELECT COUNT(*) INTO total_trips
    FROM trips t
    WHERE t.is_active = TRUE 
    AND t.trip_status = 'approved'
    AND (t.sensei_id IS NULL OR t.backup_sensei_id IS NULL);
    
    -- Calculate match scores for each trip
    FOR trip_record IN 
        SELECT id, theme, dates FROM trips t
        WHERE t.is_active = TRUE 
        AND t.trip_status = 'approved'
        AND (t.sensei_id IS NULL OR t.backup_sensei_id IS NULL)
    LOOP
        SELECT * INTO match_result
        FROM calculate_sensei_match_score_enhanced(
            p_sensei_id, 
            trip_record.theme, 
            '{}', 
            trip_record.id
        );
        
        -- Categorize based on weighted score
        IF match_result.weighted_score >= 15 THEN
            high_match := high_match + 1;
        ELSIF match_result.weighted_score >= 8 THEN
            medium_match := medium_match + 1;
        ELSE
            low_match := low_match + 1;
        END IF;
        
        -- Collect missing skills and recommended certifications
        missing_skills_array := array_cat(missing_skills_array, match_result.missing_requirements);
    END LOOP;
    
    -- Remove duplicates and limit array size
    missing_skills_array := (SELECT ARRAY_AGG(DISTINCT skill) FROM unnest(missing_skills_array) skill LIMIT 10);
    
    -- Generate recommended certifications based on popular trip themes
    SELECT ARRAY_AGG(DISTINCT theme) INTO recommended_certs_array
    FROM (
        SELECT theme, COUNT(*) as theme_count
        FROM trips t
        WHERE t.is_active = TRUE AND t.trip_status = 'approved'
        AND NOT EXISTS (
            SELECT 1 FROM sensei_certificates sc
            WHERE sc.sensei_id = p_sensei_id
            AND LOWER(sc.certificate_name) LIKE '%' || LOWER(t.theme) || '%'
            AND sc.verification_status = 'verified'
        )
        GROUP BY theme
        ORDER BY theme_count DESC
        LIMIT 5
    ) popular_themes;
    
    -- Insert or update insights
    INSERT INTO sensei_matching_insights (
        sensei_id,
        total_trips_available,
        high_match_trips,
        medium_match_trips,
        low_match_trips,
        missing_skills,
        recommended_certifications,
        last_calculated
    ) VALUES (
        p_sensei_id,
        total_trips,
        high_match,
        medium_match,
        low_match,
        COALESCE(missing_skills_array, '{}'),
        COALESCE(recommended_certs_array, '{}'),
        NOW()
    )
    ON CONFLICT (sensei_id) 
    DO UPDATE SET
        total_trips_available = EXCLUDED.total_trips_available,
        high_match_trips = EXCLUDED.high_match_trips,
        medium_match_trips = EXCLUDED.medium_match_trips,
        low_match_trips = EXCLUDED.low_match_trips,
        missing_skills = EXCLUDED.missing_skills,
        recommended_certifications = EXCLUDED.recommended_certifications,
        last_calculated = EXCLUDED.last_calculated,
        updated_at = NOW();
END;
$function$;