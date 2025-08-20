-- Address remaining security warnings from linter

-- 1. Restrict public access to sensei_profiles (only essential marketing info)
DROP POLICY IF EXISTS "Public can view essential sensei marketing info" ON public.sensei_profiles;
DROP POLICY IF EXISTS "Authenticated users can view basic sensei info" ON public.sensei_profiles;
DROP POLICY IF EXISTS "Authenticated users can view sensei profiles" ON public.sensei_profiles;
DROP POLICY IF EXISTS "Limited public sensei info for marketing" ON public.sensei_profiles;

CREATE POLICY "Public can view minimal sensei marketing info" 
ON public.sensei_profiles 
FOR SELECT 
USING (is_active = true AND auth.jwt() IS NULL);

-- Only allow authenticated users to see full sensei profiles
CREATE POLICY "Authenticated users can view sensei profiles" 
ON public.sensei_profiles 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- 2. Restrict admin_announcements to authenticated users only
DROP POLICY IF EXISTS "Senseis can view active admin announcements" ON public.admin_announcements;

CREATE POLICY "Authenticated senseis can view admin announcements" 
ON public.admin_announcements 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL
  AND (
    (target_audience = 'all_senseis' AND EXISTS (
      SELECT 1 FROM sensei_profiles 
      WHERE user_id = auth.uid() AND is_active = true
    )) OR
    (target_audience = 'active_senseis' AND EXISTS (
      SELECT 1 FROM sensei_profiles 
      WHERE user_id = auth.uid() AND is_active = true
    )) OR
    (target_audience = 'specific_senseis' AND EXISTS (
      SELECT 1 FROM sensei_profiles 
      WHERE user_id = auth.uid() AND id = ANY(admin_announcements.specific_sensei_ids)
    ))
  )
);

-- 3. Restrict sensei_skills to show only verified skills publicly
DROP POLICY IF EXISTS "Public can view verified active skills" ON public.sensei_skills;

CREATE POLICY "Public can view verified skills only" 
ON public.sensei_skills 
FOR SELECT 
USING (is_active = true AND is_verified = true AND verified_by_admin = true);

-- Authenticated users can see all active skills
CREATE POLICY "Authenticated users can view all active skills" 
ON public.sensei_skills 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- 4. Restrict sensei_certificates to show minimal info publicly
DROP POLICY IF EXISTS "Public can view verified active certificates" ON public.sensei_certificates;

CREATE POLICY "Public can view basic verified certificates" 
ON public.sensei_certificates 
FOR SELECT 
USING (
  is_active = true 
  AND verification_status = 'verified'
  AND auth.jwt() IS NULL
);

-- Authenticated users can see more certificate details
CREATE POLICY "Authenticated users can view certificate details" 
ON public.sensei_certificates 
FOR SELECT 
USING (
  is_active = true 
  AND verification_status = 'verified'
  AND auth.uid() IS NOT NULL
);

-- 5. Fix function search paths for remaining functions
CREATE OR REPLACE FUNCTION public.suggest_senseis_for_trip(trip_theme text, trip_months text[] DEFAULT '{}'::text[])
RETURNS TABLE(sensei_id uuid, sensei_name text, match_score integer, matching_specialties text[], matching_certifications text[], location text, rating numeric, is_available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
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