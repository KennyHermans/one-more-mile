-- Enhanced Trip Matching System with Destination Intelligence
-- This migration creates improved matching logic that considers skills, language, and destination context

-- Create destination mappings table for intelligent matching
CREATE TABLE IF NOT EXISTS public.destination_skill_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destination TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT,
  primary_languages TEXT[] DEFAULT '{}',
  cultural_contexts TEXT[] DEFAULT '{}',
  activity_types TEXT[] DEFAULT '{}',
  skill_weights JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.destination_skill_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies for destination mappings
CREATE POLICY "Everyone can view destination mappings" 
ON public.destination_skill_mappings 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage destination mappings" 
ON public.destination_skill_mappings 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- Insert common destination mappings
INSERT INTO public.destination_skill_mappings (destination, country, region, primary_languages, cultural_contexts, activity_types, skill_weights) VALUES
('Madrid', 'Spain', 'Europe', '{"Spanish"}', '{"European", "Mediterranean", "Historic"}', '{"Cultural", "Urban", "Culinary"}', '{"Spanish language": 3.0, "European culture": 2.0, "Culinary arts": 2.0}'),
('Barcelona', 'Spain', 'Europe', '{"Spanish", "Catalan"}', '{"European", "Mediterranean", "Artistic"}', '{"Cultural", "Urban", "Art", "Architecture"}', '{"Spanish language": 3.0, "Catalan language": 2.5, "Art history": 2.5}'),
('Brussels', 'Belgium', 'Europe', '{"French", "Dutch", "German"}', '{"European", "Historic", "Political"}', '{"Cultural", "Urban", "Culinary"}', '{"French language": 2.5, "Dutch language": 2.5, "German language": 2.0, "European culture": 2.0}'),
('Tokyo', 'Japan', 'Asia', '{"Japanese"}', '{"Asian", "Traditional", "Modern"}', '{"Cultural", "Urban", "Technology", "Traditional arts"}', '{"Japanese language": 3.5, "Asian culture": 3.0, "Traditional arts": 2.5}'),
('Paris', 'France', 'Europe', '{"French"}', '{"European", "Romantic", "Artistic"}', '{"Cultural", "Urban", "Art", "Culinary"}', '{"French language": 3.0, "Art history": 2.5, "Culinary arts": 2.5}'),
('Berlin', 'Germany', 'Europe', '{"German"}', '{"European", "Historic", "Modern"}', '{"Cultural", "Urban", "Historic"}', '{"German language": 3.0, "European history": 2.5, "Modern culture": 2.0}'),
('Alps', 'Various', 'Europe', '{"German", "French", "Italian"}', '{"European", "Mountain", "Adventure"}', '{"Adventure", "Outdoor", "Sports"}', '{"German language": 2.0, "French language": 2.0, "Mountain sports": 3.5, "Outdoor skills": 3.0}'),
('Tuscany', 'Italy', 'Europe', '{"Italian"}', '{"European", "Mediterranean", "Historic"}', '{"Cultural", "Culinary", "Wine"}', '{"Italian language": 3.0, "Wine knowledge": 3.0, "Culinary arts": 2.5}');

-- Enhanced function for calculating sensei match scores with destination intelligence
CREATE OR REPLACE FUNCTION public.calculate_enhanced_sensei_match_score(
  p_sensei_id UUID, 
  p_trip_theme TEXT, 
  p_destination TEXT DEFAULT NULL,
  p_trip_months TEXT[] DEFAULT '{}',
  p_trip_id UUID DEFAULT NULL
)
RETURNS TABLE(
  match_score INTEGER,
  weighted_score NUMERIC,
  specialty_matches TEXT[],
  certificate_matches TEXT[],
  skill_matches TEXT[],
  language_matches TEXT[],
  destination_context_score NUMERIC,
  missing_requirements TEXT[],
  contextual_recommendations TEXT[],
  requirements_met_percentage NUMERIC,
  language_bonus NUMERIC,
  cultural_bonus NUMERIC,
  activity_bonus NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_score INTEGER := 0;
  dest_mapping RECORD;
  language_score NUMERIC := 0;
  cultural_score NUMERIC := 0;
  activity_score NUMERIC := 0;
  dest_context_score NUMERIC := 0;
  req_count INTEGER := 0;
BEGIN
  -- Get destination mapping for context
  IF p_destination IS NOT NULL THEN
    SELECT * INTO dest_mapping 
    FROM destination_skill_mappings dsm
    WHERE LOWER(dsm.destination) = LOWER(p_destination)
    OR LOWER(dsm.country) = LOWER(p_destination)
    LIMIT 1;
  END IF;

  -- Get trip requirements count
  IF p_trip_id IS NOT NULL THEN
    SELECT COUNT(*) INTO req_count
    FROM trip_requirements tr
    WHERE tr.trip_id = p_trip_id AND tr.is_mandatory = TRUE;
  END IF;

  RETURN QUERY
  SELECT 
    -- Base scoring (existing logic enhanced)
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
    
    -- Enhanced weighted scoring with destination context
    (
      -- Base specialty and certification weights
      (SELECT COUNT(*) FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(p_trip_theme) || '%') * 3.0 +
      
      (SELECT COALESCE(SUM(
        CASE 
          WHEN sc.verification_status = 'verified' THEN 6.0
          WHEN sc.verification_status = 'pending' THEN 2.0
          ELSE 1.0
        END
      ), 0) FROM sensei_certificates sc 
       WHERE sc.sensei_id = sp.id AND sc.is_active = TRUE 
       AND LOWER(sc.certificate_name) LIKE '%' || LOWER(p_trip_theme) || '%') +
      
      -- Enhanced skill scoring with destination context
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
        END *
        -- Destination-specific skill weighting
        CASE 
          WHEN dest_mapping.id IS NOT NULL AND dest_mapping.skill_weights ? ss.skill_name THEN
            (dest_mapping.skill_weights ->> ss.skill_name)::NUMERIC
          ELSE 1.0
        END
      ), 0) FROM sensei_skills ss 
       WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE) +
      
      -- Language matching bonus
      CASE WHEN dest_mapping.id IS NOT NULL THEN
        (SELECT COALESCE(SUM(
          CASE ss.proficiency_level
            WHEN 'expert' THEN 5.0
            WHEN 'advanced' THEN 4.0
            WHEN 'intermediate' THEN 3.0
            WHEN 'beginner' THEN 2.0
            ELSE 3.0
          END
        ), 0) FROM sensei_skills ss 
         WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
         AND ss.skill_category = 'language'
         AND EXISTS (SELECT 1 FROM unnest(dest_mapping.primary_languages) lang 
                    WHERE LOWER(ss.skill_name) LIKE '%' || LOWER(lang) || '%'))
      ELSE 0
      END +
      
      -- Cultural context bonus
      CASE WHEN dest_mapping.id IS NOT NULL THEN
        (SELECT COALESCE(SUM(2.0), 0) FROM sensei_skills ss 
         WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
         AND EXISTS (SELECT 1 FROM unnest(dest_mapping.cultural_contexts) ctx 
                    WHERE LOWER(ss.skill_name) LIKE '%' || LOWER(ctx) || '%'
                    OR LOWER(ss.description) LIKE '%' || LOWER(ctx) || '%'))
      ELSE 0
      END +
      
      -- Rating and experience bonus
      CASE WHEN sp.rating >= 4.5 THEN 8.0 WHEN sp.rating >= 4.0 THEN 5.0 WHEN sp.rating >= 3.5 THEN 2.0 ELSE 0 END +
      LEAST(sp.trips_led * 0.5, 10.0)
      
    ) as weighted_score,
    
    -- Existing match arrays
    ARRAY(SELECT s FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(p_trip_theme) || '%') as specialty_matches,
    
    ARRAY(SELECT DISTINCT sc.certificate_name FROM sensei_certificates sc 
          WHERE sc.sensei_id = sp.id AND sc.verification_status = 'verified' 
          AND sc.is_active = TRUE AND LOWER(sc.certificate_name) LIKE '%' || LOWER(p_trip_theme) || '%') as certificate_matches,
    
    ARRAY(SELECT DISTINCT ss.skill_name FROM sensei_skills ss 
          WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
          AND LOWER(ss.skill_name) LIKE '%' || LOWER(p_trip_theme) || '%') as skill_matches,
    
    -- New language matches array
    CASE WHEN dest_mapping.id IS NOT NULL THEN
      ARRAY(SELECT DISTINCT ss.skill_name FROM sensei_skills ss 
            WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
            AND ss.skill_category = 'language'
            AND EXISTS (SELECT 1 FROM unnest(dest_mapping.primary_languages) lang 
                       WHERE LOWER(ss.skill_name) LIKE '%' || LOWER(lang) || '%'))
    ELSE '{}'::TEXT[]
    END as language_matches,
    
    -- Destination context score
    dest_context_score as destination_context_score,
    
    -- Missing requirements (enhanced)
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
    
    -- Contextual recommendations
    CASE WHEN dest_mapping.id IS NOT NULL THEN
      ARRAY(SELECT DISTINCT lang || ' language skills would boost your match for ' || dest_mapping.destination || ' trips'
            FROM unnest(dest_mapping.primary_languages) lang 
            WHERE NOT EXISTS (
              SELECT 1 FROM sensei_skills ss 
              WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
              AND ss.skill_category = 'language'
              AND LOWER(ss.skill_name) LIKE '%' || LOWER(lang) || '%'
            )
            LIMIT 3)
    ELSE '{}'::TEXT[]
    END as contextual_recommendations,
    
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
    
    -- Individual bonus scores for insights
    language_score as language_bonus,
    cultural_score as cultural_bonus,
    activity_score as activity_bonus
        
  FROM sensei_profiles sp
  WHERE sp.id = p_sensei_id AND sp.is_active = TRUE;
END;
$$;

-- Update the sensei insights calculation to use enhanced matching
CREATE OR REPLACE FUNCTION public.calculate_enhanced_sensei_insights(p_sensei_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    total_trips INT := 0;
    high_match INT := 0;
    medium_match INT := 0;
    low_match INT := 0;
    contextual_recs TEXT[];
    language_opportunities TEXT[];
    destination_gaps TEXT[];
    trip_record RECORD;
    match_result RECORD;
    insights JSONB;
BEGIN
    -- Count total available trips
    SELECT COUNT(*) INTO total_trips
    FROM trips t
    WHERE t.is_active = TRUE 
    AND t.trip_status = 'approved'
    AND (t.sensei_id IS NULL OR t.backup_sensei_id IS NULL);
    
    -- Calculate enhanced match scores for each trip
    FOR trip_record IN 
        SELECT id, theme, destination, dates FROM trips t
        WHERE t.is_active = TRUE 
        AND t.trip_status = 'approved'
        AND (t.sensei_id IS NULL OR t.backup_sensei_id IS NULL)
    LOOP
        SELECT * INTO match_result
        FROM calculate_enhanced_sensei_match_score(
            p_sensei_id, 
            trip_record.theme, 
            trip_record.destination,
            '{}', 
            trip_record.id
        );
        
        -- Categorize based on enhanced weighted score
        IF match_result.weighted_score >= 20 THEN
            high_match := high_match + 1;
        ELSIF match_result.weighted_score >= 10 THEN
            medium_match := medium_match + 1;
        ELSE
            low_match := low_match + 1;
        END IF;
        
        -- Collect contextual recommendations
        contextual_recs := array_cat(contextual_recs, match_result.contextual_recommendations);
    END LOOP;
    
    -- Remove duplicates and get top recommendations
    contextual_recs := (SELECT ARRAY_AGG(DISTINCT rec) FROM unnest(contextual_recs) rec LIMIT 5);
    
    -- Build comprehensive insights
    insights := jsonb_build_object(
        'total_trips_available', total_trips,
        'high_match_trips', high_match,
        'medium_match_trips', medium_match,
        'low_match_trips', low_match,
        'match_distribution', jsonb_build_object(
            'excellent_fit_percentage', CASE WHEN total_trips > 0 THEN (high_match::NUMERIC / total_trips * 100) ELSE 0 END,
            'good_fit_percentage', CASE WHEN total_trips > 0 THEN (medium_match::NUMERIC / total_trips * 100) ELSE 0 END,
            'needs_improvement_percentage', CASE WHEN total_trips > 0 THEN (low_match::NUMERIC / total_trips * 100) ELSE 0 END
        ),
        'contextual_recommendations', COALESCE(contextual_recs, '{}'),
        'last_calculated', now()
    );
    
    -- Update the insights table
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
        '{}', -- Will be populated by existing logic
        '{}', -- Will be populated by existing logic
        NOW()
    )
    ON CONFLICT (sensei_id) 
    DO UPDATE SET
        total_trips_available = EXCLUDED.total_trips_available,
        high_match_trips = EXCLUDED.high_match_trips,
        medium_match_trips = EXCLUDED.medium_match_trips,
        low_match_trips = EXCLUDED.low_match_trips,
        last_calculated = EXCLUDED.last_calculated,
        updated_at = NOW();
    
    RETURN insights;
END;
$$;