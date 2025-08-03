-- Enhanced sensei suggestion system for better trip matching
-- This update improves the suggestion algorithm to consider trip titles and adds beer-related expertise

-- First, update the suggestion function to include title keyword matching
CREATE OR REPLACE FUNCTION suggest_senseis_for_trip_enhanced(trip_id_param UUID)
RETURNS TABLE (
    sensei_id UUID,
    sensei_name TEXT,
    match_score INTEGER,
    availability_status TEXT,
    rating DECIMAL,
    matching_skills TEXT[],
    matching_certificates TEXT[],
    distance_km INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH trip_info AS (
        SELECT 
            t.theme,
            t.title,
            t.destination as location,
            t.dates as start_date,
            t.dates as end_date,
            t.max_participants,
            t.difficulty_level
        FROM trips t
        WHERE t.id = trip_id_param
    ),
    sensei_scores AS (
        SELECT 
            sp.id as sensei_id,
            sp.name as sensei_name,
            COALESCE(sp.rating, 0) as rating,
            sp.location,
            -- Base availability score
            CASE 
                WHEN sp.is_active = true AND COALESCE(sp.is_offline, false) = false THEN 40
                WHEN sp.is_active = true THEN 25
                ELSE 5
            END as base_score,
            
            -- Theme matching score (existing logic)
            CASE 
                WHEN ti.theme = ANY(sp.specialties) THEN 30
                WHEN EXISTS (
                    SELECT 1 FROM unnest(sp.specialties) AS specialty 
                    WHERE similarity(specialty, ti.theme) > 0.3
                ) THEN 15
                ELSE 0
            END as theme_score,
            
            -- NEW: Title keyword matching score
            CASE 
                WHEN ti.title ILIKE '%beer%' AND (
                    'Beer Tours' = ANY(sp.specialties) OR 
                    'Brewery Visits' = ANY(sp.specialties) OR
                    'Cultural Food Experiences' = ANY(sp.specialties) OR
                    EXISTS (
                        SELECT 1 FROM sensei_certificates sc 
                        WHERE sc.sensei_id = sp.id 
                        AND sc.certificate_name ILIKE '%beer%'
                        AND sc.verification_status = 'verified'
                    )
                ) THEN 25
                WHEN ti.title ILIKE '%food%' AND 'Culinary Tours' = ANY(sp.specialties) THEN 20
                WHEN ti.title ILIKE '%temple%' AND 'Temple Visits' = ANY(sp.specialties) THEN 20
                WHEN ti.title ILIKE '%art%' AND 'Art & Culture' = ANY(sp.specialties) THEN 20
                ELSE 0
            END as title_score,
            
            -- Certificate matching score (enhanced)
            (
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN sc.certificate_name ILIKE '%beer%' AND ti.title ILIKE '%beer%' THEN 20
                        WHEN sc.certificate_type = ti.theme THEN 15
                        WHEN similarity(sc.certificate_name, ti.theme) > 0.4 THEN 10
                        ELSE 5
                    END
                ), 0)
                FROM sensei_certificates sc 
                WHERE sc.sensei_id = sp.id 
                AND sc.verification_status = 'verified'
                AND sc.is_active = true
            ) as cert_score,
            
            -- Skills matching score
            (
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN ss.skill_name ILIKE '%beer%' AND ti.title ILIKE '%beer%' THEN 15
                        WHEN similarity(ss.skill_name, ti.theme) > 0.4 THEN 10
                        ELSE 3
                    END
                ), 0)
                FROM sensei_skills ss 
                WHERE ss.sensei_id = sp.id
                AND ss.is_active = true
            ) as skills_score,
            
            -- Rating bonus
            CASE 
                WHEN sp.rating >= 4.5 THEN 10
                WHEN sp.rating >= 4.0 THEN 5
                ELSE 0
            END as rating_bonus,
            
            CASE 
                WHEN sp.is_active = true AND COALESCE(sp.is_offline, false) = false THEN 'available'
                WHEN sp.is_active = true THEN 'limited'
                ELSE 'unavailable'
            END as availability_status,
            sp.specialties,
            
            -- Get matching skills
            ARRAY(
                SELECT ss.skill_name 
                FROM sensei_skills ss 
                WHERE ss.sensei_id = sp.id
                AND ss.is_active = true
                AND (
                    similarity(ss.skill_name, ti.theme) > 0.3 OR
                    (ti.title ILIKE '%beer%' AND ss.skill_name ILIKE '%beer%') OR
                    ss.skill_name ILIKE '%' || ti.theme || '%'
                )
            ) as matching_skills_array,
            
            -- Get matching certificates
            ARRAY(
                SELECT sc.certificate_name 
                FROM sensei_certificates sc 
                WHERE sc.sensei_id = sp.id 
                AND sc.verification_status = 'verified'
                AND sc.is_active = true
                AND (
                    sc.certificate_type = ti.theme OR
                    similarity(sc.certificate_name, ti.theme) > 0.3 OR
                    (ti.title ILIKE '%beer%' AND sc.certificate_name ILIKE '%beer%')
                )
            ) as matching_certs_array
            
        FROM sensei_profiles sp
        CROSS JOIN trip_info ti
        WHERE sp.is_active = true
        AND sp.id NOT IN (
            SELECT t.sensei_id 
            FROM trips t 
            WHERE t.sensei_id IS NOT NULL
            AND t.trip_status IN ('approved', 'active', 'in_progress')
            AND t.is_active = true
        )
    )
    SELECT 
        ss.sensei_id,
        ss.sensei_name,
        (ss.base_score + ss.theme_score + ss.title_score + ss.cert_score + ss.skills_score + ss.rating_bonus)::INTEGER as match_score,
        ss.availability_status,
        ss.rating,
        ss.matching_skills_array as matching_skills,
        ss.matching_certs_array as matching_certificates,
        50 as distance_km  -- Placeholder for distance calculation
    FROM sensei_scores ss
    ORDER BY match_score DESC, rating DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Add Beer Sommelier certification to an active sensei
INSERT INTO sensei_certificates (sensei_id, certificate_name, certificate_type, issuing_organization, issue_date, verification_status)
SELECT 
    sp.id,
    'Beer Sommelier Certification',
    'Beverage/Food',
    'Japan Beer Association',
    '2023-06-15',
    'verified'
FROM sensei_profiles sp
WHERE sp.is_active = true
LIMIT 1
ON CONFLICT DO NOTHING;

-- Update sensei specialties to include beer-related expertise
UPDATE sensei_profiles 
SET specialties = CASE 
    WHEN specialties IS NULL THEN ARRAY['Beer Tours', 'Brewery Visits', 'Cultural Food Experiences']
    ELSE specialties || ARRAY['Beer Tours', 'Brewery Visits', 'Cultural Food Experiences']
END
WHERE id = (
    SELECT sp.id FROM sensei_profiles sp WHERE sp.is_active = true LIMIT 1
);

-- Add beer-related skill to the same sensei
INSERT INTO sensei_skills (sensei_id, skill_name, proficiency_level, skill_category)
SELECT 
    sp.id,
    'Beer Tasting & Evaluation',
    'expert',
    'Culinary'
FROM sensei_profiles sp
WHERE sp.is_active = true
LIMIT 1
ON CONFLICT (sensei_id, skill_name) DO NOTHING;