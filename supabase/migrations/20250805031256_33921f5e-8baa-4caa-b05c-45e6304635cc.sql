-- Update get_sensei_trip_status function to include enhanced data
CREATE OR REPLACE FUNCTION public.get_sensei_trip_status()
 RETURNS TABLE(
   sensei_id uuid, 
   sensei_name text, 
   sensei_level sensei_level,
   level_achieved_at timestamp with time zone,
   trips_led integer,
   is_linked_to_trip boolean, 
   current_trip_count bigint, 
   is_available boolean, 
   specialties text[], 
   certifications text[], 
   location text, 
   rating numeric,
   verified_skills_count bigint,
   pending_certificates_count bigint,
   last_activity timestamp with time zone
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id as sensei_id,
    sp.name as sensei_name,
    sp.sensei_level,
    sp.level_achieved_at,
    sp.trips_led,
    CASE 
      WHEN trip_count.count > 0 THEN true 
      ELSE false 
    END as is_linked_to_trip,
    COALESCE(trip_count.count, 0) as current_trip_count,
    (sp.is_active = true AND COALESCE(sp.is_offline, false) = false) as is_available,
    sp.specialties,
    COALESCE(sp.certifications, '{}') as certifications,
    sp.location,
    sp.rating,
    COALESCE(skills_count.verified_count, 0) as verified_skills_count,
    COALESCE(cert_count.pending_count, 0) as pending_certificates_count,
    GREATEST(sp.updated_at, COALESCE(trip_count.last_trip_update, sp.updated_at)) as last_activity
  FROM sensei_profiles sp
  LEFT JOIN (
    SELECT 
      t.sensei_id, 
      COUNT(*) as count,
      MAX(t.updated_at) as last_trip_update
    FROM trips t
    WHERE t.is_active = true 
    AND t.trip_status = 'approved'
    GROUP BY t.sensei_id
  ) trip_count ON sp.id = trip_count.sensei_id
  LEFT JOIN (
    SELECT 
      ss.sensei_id,
      COUNT(*) FILTER (WHERE ss.is_verified = true) as verified_count
    FROM sensei_skills ss
    WHERE ss.is_active = true
    GROUP BY ss.sensei_id
  ) skills_count ON sp.id = skills_count.sensei_id
  LEFT JOIN (
    SELECT 
      sc.sensei_id,
      COUNT(*) FILTER (WHERE sc.verification_status = 'pending') as pending_count
    FROM sensei_certificates sc
    WHERE sc.is_active = true
    GROUP BY sc.sensei_id
  ) cert_count ON sp.id = cert_count.sensei_id
  WHERE sp.is_active = true
  ORDER BY sp.name;
END;
$function$