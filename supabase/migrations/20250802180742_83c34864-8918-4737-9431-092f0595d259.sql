-- Create certificates table for file uploads and detailed certificate management
CREATE TABLE public.sensei_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID NOT NULL,
  certificate_name TEXT NOT NULL,
  certificate_type TEXT NOT NULL, -- e.g., 'diving', 'first_aid', 'climbing', 'rescue', etc.
  issuing_organization TEXT,
  certificate_file_url TEXT, -- URL to uploaded certificate file
  issue_date DATE,
  expiry_date DATE,
  certificate_number TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'expired', 'rejected'
  verified_by_admin BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Add foreign key constraint to sensei_profiles
  CONSTRAINT fk_sensei_certificates_sensei 
    FOREIGN KEY (sensei_id) 
    REFERENCES public.sensei_profiles(id) 
    ON DELETE CASCADE
);

-- Enable RLS on sensei_certificates
ALTER TABLE public.sensei_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sensei_certificates
CREATE POLICY "Senseis can manage their own certificates" 
ON public.sensei_certificates 
FOR ALL 
USING (
  sensei_id IN (
    SELECT id FROM public.sensei_profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  sensei_id IN (
    SELECT id FROM public.sensei_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin can manage all certificates" 
ON public.sensei_certificates 
FOR ALL 
USING (auth.email() = 'kenny_hermans93@hotmail.com')
WITH CHECK (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Public can view verified active certificates" 
ON public.sensei_certificates 
FOR SELECT 
USING (is_active = TRUE AND verification_status = 'verified');

-- Create skills table for additional skills/knowledge
CREATE TABLE public.sensei_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  skill_category TEXT NOT NULL, -- e.g., 'language', 'technical', 'safety', 'outdoor', etc.
  proficiency_level TEXT NOT NULL DEFAULT 'intermediate', -- 'beginner', 'intermediate', 'advanced', 'expert'
  description TEXT,
  years_experience INTEGER,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by_admin BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Add foreign key constraint to sensei_profiles
  CONSTRAINT fk_sensei_skills_sensei 
    FOREIGN KEY (sensei_id) 
    REFERENCES public.sensei_profiles(id) 
    ON DELETE CASCADE
);

-- Enable RLS on sensei_skills
ALTER TABLE public.sensei_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sensei_skills
CREATE POLICY "Senseis can manage their own skills" 
ON public.sensei_skills 
FOR ALL 
USING (
  sensei_id IN (
    SELECT id FROM public.sensei_profiles 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  sensei_id IN (
    SELECT id FROM public.sensei_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin can manage all skills" 
ON public.sensei_skills 
FOR ALL 
USING (auth.email() = 'kenny_hermans93@hotmail.com')
WITH CHECK (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Public can view verified active skills" 
ON public.sensei_skills 
FOR SELECT 
USING (is_active = TRUE);

-- Create trip requirements table for detailed requirements
CREATE TABLE public.trip_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL,
  requirement_type TEXT NOT NULL, -- 'certificate', 'skill', 'experience', 'physical'
  requirement_name TEXT NOT NULL,
  requirement_description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
  minimum_level TEXT, -- For skills: 'beginner', 'intermediate', 'advanced', 'expert'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Add foreign key constraint to trips
  CONSTRAINT fk_trip_requirements_trip 
    FOREIGN KEY (trip_id) 
    REFERENCES public.trips(id) 
    ON DELETE CASCADE
);

-- Enable RLS on trip_requirements
ALTER TABLE public.trip_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_requirements
CREATE POLICY "Public can view requirements for active trips" 
ON public.trip_requirements 
FOR SELECT 
USING (
  trip_id IN (
    SELECT id FROM public.trips 
    WHERE is_active = TRUE AND trip_status = 'approved'
  )
);

CREATE POLICY "Admin can manage all trip requirements" 
ON public.trip_requirements 
FOR ALL 
USING (auth.email() = 'kenny_hermans93@hotmail.com')
WITH CHECK (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Senseis can manage requirements for their trips" 
ON public.trip_requirements 
FOR ALL 
USING (
  trip_id IN (
    SELECT id FROM public.trips 
    WHERE sensei_id IN (
      SELECT id FROM public.sensei_profiles 
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  trip_id IN (
    SELECT id FROM public.trips 
    WHERE sensei_id IN (
      SELECT id FROM public.sensei_profiles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Create indexes for performance
CREATE INDEX idx_sensei_certificates_sensei_id ON public.sensei_certificates(sensei_id);
CREATE INDEX idx_sensei_certificates_type ON public.sensei_certificates(certificate_type);
CREATE INDEX idx_sensei_certificates_verification ON public.sensei_certificates(verification_status);
CREATE INDEX idx_sensei_certificates_expiry ON public.sensei_certificates(expiry_date);

CREATE INDEX idx_sensei_skills_sensei_id ON public.sensei_skills(sensei_id);
CREATE INDEX idx_sensei_skills_category ON public.sensei_skills(skill_category);
CREATE INDEX idx_sensei_skills_verification ON public.sensei_skills(is_verified);

CREATE INDEX idx_trip_requirements_trip_id ON public.trip_requirements(trip_id);
CREATE INDEX idx_trip_requirements_type ON public.trip_requirements(requirement_type);

-- Create triggers for updated_at columns
CREATE TRIGGER update_sensei_certificates_updated_at
  BEFORE UPDATE ON public.sensei_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sensei_skills_updated_at
  BEFORE UPDATE ON public.sensei_skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_requirements_updated_at
  BEFORE UPDATE ON public.trip_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enhanced function to suggest senseis based on trip requirements
CREATE OR REPLACE FUNCTION public.suggest_senseis_for_trip_enhanced(
  trip_theme TEXT, 
  trip_months TEXT[] DEFAULT '{}'::TEXT[],
  trip_id UUID DEFAULT NULL
)
RETURNS TABLE(
  sensei_id UUID, 
  sensei_name TEXT, 
  match_score INTEGER, 
  matching_specialties TEXT[], 
  matching_certifications TEXT[], 
  matching_skills TEXT[],
  verified_certificates TEXT[],
  missing_requirements TEXT[],
  location TEXT, 
  rating NUMERIC, 
  is_available BOOLEAN,
  requirements_met_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  req_count INTEGER := 0;
BEGIN
  -- Get the number of mandatory requirements if trip_id is provided
  IF trip_id IS NOT NULL THEN
    SELECT COUNT(*) INTO req_count
    FROM public.trip_requirements tr
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
      (SELECT COUNT(*) FROM public.sensei_certificates sc 
       WHERE sc.sensei_id = sp.id AND sc.verification_status = 'verified' AND sc.is_active = TRUE) * 4 +
      -- Score based on skills matches
      (SELECT COUNT(*) FROM public.sensei_skills ss 
       WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
       AND LOWER(ss.skill_name) LIKE '%' || LOWER(trip_theme) || '%') * 2 +
      -- Bonus for high rating
      CASE WHEN sp.rating >= 4.5 THEN 3 WHEN sp.rating >= 4.0 THEN 2 WHEN sp.rating >= 3.5 THEN 1 ELSE 0 END +
      -- Bonus for meeting trip requirements
      CASE WHEN trip_id IS NOT NULL AND req_count > 0 THEN
        (SELECT COUNT(*) FROM public.trip_requirements tr
         WHERE tr.trip_id = suggest_senseis_for_trip_enhanced.trip_id 
         AND tr.is_mandatory = TRUE
         AND (
           (tr.requirement_type = 'certificate' AND EXISTS (
             SELECT 1 FROM public.sensei_certificates sc 
             WHERE sc.sensei_id = sp.id 
             AND LOWER(sc.certificate_type) LIKE '%' || LOWER(tr.requirement_name) || '%'
             AND sc.verification_status = 'verified' 
             AND sc.is_active = TRUE
             AND (sc.expiry_date IS NULL OR sc.expiry_date > CURRENT_DATE)
           )) OR
           (tr.requirement_type = 'skill' AND EXISTS (
             SELECT 1 FROM public.sensei_skills ss 
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
    ARRAY(SELECT DISTINCT ss.skill_name FROM public.sensei_skills ss 
          WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE 
          AND LOWER(ss.skill_name) LIKE '%' || LOWER(trip_theme) || '%') as matching_skills,
    
    -- Get verified certificates
    ARRAY(SELECT DISTINCT sc.certificate_name FROM public.sensei_certificates sc 
          WHERE sc.sensei_id = sp.id AND sc.verification_status = 'verified' 
          AND sc.is_active = TRUE AND (sc.expiry_date IS NULL OR sc.expiry_date > CURRENT_DATE)) as verified_certificates,
    
    -- Get missing requirements
    CASE WHEN trip_id IS NOT NULL THEN
      ARRAY(SELECT tr.requirement_name FROM public.trip_requirements tr
            WHERE tr.trip_id = suggest_senseis_for_trip_enhanced.trip_id 
            AND tr.is_mandatory = TRUE
            AND NOT (
              (tr.requirement_type = 'certificate' AND EXISTS (
                SELECT 1 FROM public.sensei_certificates sc 
                WHERE sc.sensei_id = sp.id 
                AND LOWER(sc.certificate_type) LIKE '%' || LOWER(tr.requirement_name) || '%'
                AND sc.verification_status = 'verified' 
                AND sc.is_active = TRUE
                AND (sc.expiry_date IS NULL OR sc.expiry_date > CURRENT_DATE)
              )) OR
              (tr.requirement_type = 'skill' AND EXISTS (
                SELECT 1 FROM public.sensei_skills ss 
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
      (SELECT COUNT(*) FROM public.trip_requirements tr
       WHERE tr.trip_id = suggest_senseis_for_trip_enhanced.trip_id 
       AND tr.is_mandatory = TRUE
       AND (
         (tr.requirement_type = 'certificate' AND EXISTS (
           SELECT 1 FROM public.sensei_certificates sc 
           WHERE sc.sensei_id = sp.id 
           AND LOWER(sc.certificate_type) LIKE '%' || LOWER(tr.requirement_name) || '%'
           AND sc.verification_status = 'verified' 
           AND sc.is_active = TRUE
           AND (sc.expiry_date IS NULL OR sc.expiry_date > CURRENT_DATE)
         )) OR
         (tr.requirement_type = 'skill' AND EXISTS (
           SELECT 1 FROM public.sensei_skills ss 
           WHERE ss.sensei_id = sp.id 
           AND LOWER(ss.skill_name) LIKE '%' || LOWER(tr.requirement_name) || '%'
           AND ss.is_active = TRUE
         ))
       ))::NUMERIC / req_count * 100
    ELSE 100
    END as requirements_met_percentage
    
  FROM public.sensei_profiles sp
  WHERE sp.is_active = TRUE
  AND (
    -- Has matching specialties or certifications
    EXISTS (SELECT 1 FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(trip_theme) || '%')
    OR EXISTS (SELECT 1 FROM unnest(sp.certifications) c WHERE LOWER(c) LIKE '%' || LOWER(trip_theme) || '%')
    OR EXISTS (SELECT 1 FROM public.sensei_certificates sc 
               WHERE sc.sensei_id = sp.id AND sc.verification_status = 'verified' AND sc.is_active = TRUE)
    OR EXISTS (SELECT 1 FROM public.sensei_skills ss 
               WHERE ss.sensei_id = sp.id AND ss.is_active = TRUE)
  )
  ORDER BY match_score DESC, requirements_met_percentage DESC, sp.rating DESC;
END;
$$;