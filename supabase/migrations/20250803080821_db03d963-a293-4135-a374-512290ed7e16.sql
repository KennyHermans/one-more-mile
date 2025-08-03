-- Enhanced matching and verification features

-- Add skill verification workflow table
CREATE TABLE IF NOT EXISTS public.skill_verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensei_id UUID NOT NULL,
    skill_id UUID NOT NULL,
    verification_type TEXT NOT NULL DEFAULT 'admin', -- 'admin', 'peer', 'portfolio'
    evidence_url TEXT,
    evidence_description TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skill_verification_requests ENABLE ROW LEVEL SECURITY;

-- Add policies for skill verification
CREATE POLICY "Senseis can create verification requests for their skills"
ON public.skill_verification_requests
FOR INSERT
WITH CHECK (
    sensei_id IN (
        SELECT id FROM public.sensei_profiles 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Senseis can view their own verification requests"
ON public.skill_verification_requests
FOR SELECT
USING (
    sensei_id IN (
        SELECT id FROM public.sensei_profiles 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admin can manage all verification requests"
ON public.skill_verification_requests
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Add matching insights table for senseis
CREATE TABLE IF NOT EXISTS public.sensei_matching_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensei_id UUID NOT NULL,
    total_trips_available INTEGER DEFAULT 0,
    high_match_trips INTEGER DEFAULT 0,
    medium_match_trips INTEGER DEFAULT 0,
    low_match_trips INTEGER DEFAULT 0,
    missing_skills TEXT[],
    recommended_certifications TEXT[],
    last_calculated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sensei_matching_insights ENABLE ROW LEVEL SECURITY;

-- Add policies for matching insights
CREATE POLICY "Senseis can view their own matching insights"
ON public.sensei_matching_insights
FOR SELECT
USING (
    sensei_id IN (
        SELECT id FROM public.sensei_profiles 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admin can manage all matching insights"
ON public.sensei_matching_insights
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Create enhanced matching function with weighted scoring
CREATE OR REPLACE FUNCTION public.calculate_sensei_match_score_enhanced(
    p_sensei_id UUID,
    p_trip_theme TEXT,
    p_trip_months TEXT[] DEFAULT '{}',
    p_trip_id UUID DEFAULT NULL
)
RETURNS TABLE(
    match_score INTEGER,
    weighted_score NUMERIC,
    specialty_matches TEXT[],
    certificate_matches TEXT[],
    skill_matches TEXT[],
    missing_requirements TEXT[],
    requirements_met_percentage NUMERIC,
    proficiency_bonus NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    base_score INTEGER := 0;
    weight_score NUMERIC := 0;
    req_count INTEGER := 0;
    met_requirements INTEGER := 0;
BEGIN
    -- Get trip requirements count
    IF p_trip_id IS NOT NULL THEN
        SELECT COUNT(*) INTO req_count
        FROM public.trip_requirements tr
        WHERE tr.trip_id = p_trip_id AND tr.is_mandatory = TRUE;
    END IF;

    RETURN QUERY
    SELECT 
        -- Base scoring (existing logic)
        (
            (SELECT COUNT(*) FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(p_trip_theme) || '%') * 3 +
            (SELECT COUNT(*) FROM unnest(sp.certifications) c WHERE LOWER(c) LIKE '%' || LOWER(p_trip_theme) || '%') * 2 +
            (SELECT COUNT(*) FROM public.sensei_certificates sc 
             WHERE sc.sensei_id = sp.id AND sc.verification_status = 'verified' 
             AND sc.is_active = TRUE AND LOWER(sc.certificate_name) LIKE '%' || LOWER(p_trip_theme) || '%') * 5 +
            (SELECT COUNT(*) FROM public.sensei_skills ss 
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
            ), 0) FROM public.sensei_certificates sc 
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
            ), 0) FROM public.sensei_skills ss 
             WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
             AND LOWER(ss.skill_name) LIKE '%' || LOWER(p_trip_theme) || '%') +
            
            -- Rating bonus
            CASE WHEN sp.rating >= 4.5 THEN 8.0 WHEN sp.rating >= 4.0 THEN 5.0 WHEN sp.rating >= 3.5 THEN 2.0 ELSE 0 END +
            
            -- Experience bonus (trips led)
            LEAST(sp.trips_led * 0.5, 10.0)
            
        ) as weighted_score,
        
        -- Matching arrays
        ARRAY(SELECT s FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(p_trip_theme) || '%') as specialty_matches,
        
        ARRAY(SELECT DISTINCT sc.certificate_name FROM public.sensei_certificates sc 
              WHERE sc.sensei_id = sp.id AND sc.verification_status = 'verified' 
              AND sc.is_active = TRUE AND LOWER(sc.certificate_name) LIKE '%' || LOWER(p_trip_theme) || '%') as certificate_matches,
        
        ARRAY(SELECT DISTINCT ss.skill_name FROM public.sensei_skills ss 
              WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
              AND LOWER(ss.skill_name) LIKE '%' || LOWER(p_trip_theme) || '%') as skill_matches,
        
        -- Missing requirements
        CASE WHEN p_trip_id IS NOT NULL THEN
            ARRAY(SELECT tr.requirement_name FROM public.trip_requirements tr
                  WHERE tr.trip_id = p_trip_id AND tr.is_mandatory = TRUE
                  AND NOT EXISTS (
                      SELECT 1 FROM public.sensei_certificates sc 
                      WHERE sc.sensei_id = sp.id 
                      AND LOWER(sc.certificate_name) LIKE '%' || LOWER(tr.requirement_name) || '%'
                      AND sc.verification_status = 'verified' AND sc.is_active = TRUE
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM public.sensei_skills ss 
                      WHERE ss.sensei_id = sp.id 
                      AND LOWER(ss.skill_name) LIKE '%' || LOWER(tr.requirement_name) || '%'
                      AND ss.is_active = TRUE
                  ))
        ELSE '{}'::TEXT[]
        END as missing_requirements,
        
        -- Requirements met percentage
        CASE WHEN p_trip_id IS NOT NULL AND req_count > 0 THEN
            (SELECT COUNT(*) FROM public.trip_requirements tr
             WHERE tr.trip_id = p_trip_id AND tr.is_mandatory = TRUE
             AND (
                 EXISTS (SELECT 1 FROM public.sensei_certificates sc 
                        WHERE sc.sensei_id = sp.id 
                        AND LOWER(sc.certificate_name) LIKE '%' || LOWER(tr.requirement_name) || '%'
                        AND sc.verification_status = 'verified' AND sc.is_active = TRUE) OR
                 EXISTS (SELECT 1 FROM public.sensei_skills ss 
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
        ), 0) FROM public.sensei_skills ss 
         WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE) as proficiency_bonus
        
    FROM public.sensei_profiles sp
    WHERE sp.id = p_sensei_id AND sp.is_active = TRUE;
END;
$$;

-- Function to calculate matching insights for a sensei
CREATE OR REPLACE FUNCTION public.calculate_sensei_insights(p_sensei_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    FROM public.trips t
    WHERE t.is_active = TRUE 
    AND t.trip_status = 'approved'
    AND (t.sensei_id IS NULL OR t.backup_sensei_id IS NULL);
    
    -- Calculate match scores for each trip
    FOR trip_record IN 
        SELECT id, theme, dates FROM public.trips t
        WHERE t.is_active = TRUE 
        AND t.trip_status = 'approved'
        AND (t.sensei_id IS NULL OR t.backup_sensei_id IS NULL)
    LOOP
        SELECT * INTO match_result
        FROM public.calculate_sensei_match_score_enhanced(
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
        FROM public.trips t
        WHERE t.is_active = TRUE AND t.trip_status = 'approved'
        AND NOT EXISTS (
            SELECT 1 FROM public.sensei_certificates sc
            WHERE sc.sensei_id = p_sensei_id
            AND LOWER(sc.certificate_name) LIKE '%' || LOWER(t.theme) || '%'
            AND sc.verification_status = 'verified'
        )
        GROUP BY theme
        ORDER BY theme_count DESC
        LIMIT 5
    ) popular_themes;
    
    -- Insert or update insights
    INSERT INTO public.sensei_matching_insights (
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
$$;

-- Trigger to update insights when skills/certificates change
CREATE OR REPLACE FUNCTION public.update_sensei_insights_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Update insights for the affected sensei
    PERFORM public.calculate_sensei_insights(
        COALESCE(NEW.sensei_id, OLD.sensei_id)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS update_insights_on_certificate_change ON public.sensei_certificates;
CREATE TRIGGER update_insights_on_certificate_change
    AFTER INSERT OR UPDATE OR DELETE ON public.sensei_certificates
    FOR EACH ROW EXECUTE FUNCTION public.update_sensei_insights_trigger();

DROP TRIGGER IF EXISTS update_insights_on_skill_change ON public.sensei_skills;
CREATE TRIGGER update_insights_on_skill_change
    AFTER INSERT OR UPDATE OR DELETE ON public.sensei_skills
    FOR EACH ROW EXECUTE FUNCTION public.update_sensei_insights_trigger();

-- Update timestamp triggers
DROP TRIGGER IF EXISTS update_skill_verification_requests_updated_at ON public.skill_verification_requests;
CREATE TRIGGER update_skill_verification_requests_updated_at
    BEFORE UPDATE ON public.skill_verification_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sensei_matching_insights_updated_at ON public.sensei_matching_insights;
CREATE TRIGGER update_sensei_matching_insights_updated_at
    BEFORE UPDATE ON public.sensei_matching_insights
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();