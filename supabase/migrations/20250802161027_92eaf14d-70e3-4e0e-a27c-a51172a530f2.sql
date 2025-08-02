-- Fix the ambiguous column reference in get_sensei_trip_status function
DROP FUNCTION IF EXISTS public.get_sensei_trip_status();

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
    (sp.is_active = true AND COALESCE(sp.is_offline, false) = false) as is_available,
    sp.specialties,
    COALESCE(sp.certifications, '{}') as certifications,
    sp.location,
    sp.rating
  FROM public.sensei_profiles sp
  LEFT JOIN (
    SELECT 
      t.sensei_id, 
      COUNT(*) as count
    FROM public.trips t
    WHERE t.is_active = true 
    AND t.trip_status = 'approved'
    GROUP BY t.sensei_id
  ) trip_count ON sp.id = trip_count.sensei_id
  WHERE sp.is_active = true
  ORDER BY sp.name;
END;
$$;