-- Add availability and status fields to sensei_profiles table
ALTER TABLE public.sensei_profiles 
ADD COLUMN certifications text[] DEFAULT '{}',
ADD COLUMN availability_periods jsonb DEFAULT '[]',
ADD COLUMN is_offline boolean DEFAULT false,
ADD COLUMN unavailable_months text[] DEFAULT '{}';

-- Update existing sensei profile with marine certifications for suggestions
UPDATE public.sensei_profiles 
SET certifications = ARRAY['Marine Biology', 'Diving Instructor', 'Marine Conservation']
WHERE name = 'Joost Narraina';

-- Create function to get sensei trip assignment status
CREATE OR REPLACE FUNCTION public.get_sensei_trip_status()
RETURNS TABLE (
  sensei_id uuid,
  sensei_name text,
  is_linked_to_trip boolean,
  current_trip_count bigint,
  is_available boolean,
  specialties text[],
  certifications text[],
  location text,
  rating numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id as sensei_id,
    sp.name as sensei_name,
    CASE 
      WHEN trip_count.count > 0 THEN true 
      ELSE false 
    END as is_linked_to_trip,
    COALESCE(trip_count.count, 0) as current_trip_count,
    (sp.is_active = true AND sp.is_offline = false) as is_available,
    sp.specialties,
    sp.certifications,
    sp.location,
    sp.rating
  FROM public.sensei_profiles sp
  LEFT JOIN (
    SELECT 
      sensei_id, 
      COUNT(*) as count
    FROM public.trips 
    WHERE is_active = true 
    AND trip_status = 'approved'
    GROUP BY sensei_id
  ) trip_count ON sp.id = trip_count.sensei_id
  WHERE sp.is_active = true
  ORDER BY sp.name;
END;
$$;

-- Create function to suggest senseis for trips based on specialties and certifications
CREATE OR REPLACE FUNCTION public.suggest_senseis_for_trip(trip_theme text, trip_months text[] DEFAULT '{}')
RETURNS TABLE (
  sensei_id uuid,
  sensei_name text,
  match_score integer,
  matching_specialties text[],
  matching_certifications text[],
  location text,
  rating numeric,
  is_available boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  FROM public.sensei_profiles sp
  WHERE sp.is_active = true
  AND (
    -- Has matching specialties or certifications
    EXISTS (SELECT 1 FROM unnest(sp.specialties) s WHERE LOWER(s) LIKE '%' || LOWER(trip_theme) || '%')
    OR EXISTS (SELECT 1 FROM unnest(sp.certifications) c WHERE LOWER(c) LIKE '%' || LOWER(trip_theme) || '%')
  )
  ORDER BY match_score DESC, sp.rating DESC;
END;
$$;