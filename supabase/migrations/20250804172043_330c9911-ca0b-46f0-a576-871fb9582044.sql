-- Fix all remaining database functions to include SET search_path TO 'public'

-- 5. Fix request_backup_senseis function
CREATE OR REPLACE FUNCTION public.request_backup_senseis(p_trip_id uuid, p_max_requests integer DEFAULT 3)
 RETURNS TABLE(request_id uuid, sensei_id uuid, sensei_name text, match_score integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trip_record RECORD;
  sensei_record RECORD;
  request_count INTEGER := 0;
  new_request_id UUID;
BEGIN
  -- Get trip details
  SELECT * INTO trip_record FROM trips WHERE id = p_trip_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found: %', p_trip_id;
  END IF;
  
  -- Get top matching senseis who haven't been requested yet
  FOR sensei_record IN 
    SELECT s.sensei_id, s.sensei_name, s.match_score, s.is_available
    FROM suggest_senseis_for_trip_enhanced(
      trip_record.theme, 
      string_to_array(trip_record.dates, ','), 
      p_trip_id
    ) s
    WHERE s.is_available = true 
    AND s.sensei_id != COALESCE(trip_record.sensei_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND s.sensei_id NOT IN (
      SELECT bsr.sensei_id 
      FROM backup_sensei_requests bsr 
      WHERE bsr.trip_id = p_trip_id 
      AND bsr.status IN ('pending', 'accepted')
    )
    ORDER BY s.match_score DESC, s.rating DESC
    LIMIT p_max_requests
  LOOP
    -- Create backup request
    INSERT INTO backup_sensei_requests (
      trip_id,
      sensei_id,
      request_type,
      match_score,
      response_deadline
    ) VALUES (
      p_trip_id,
      sensei_record.sensei_id,
      'automatic',
      sensei_record.match_score,
      now() + interval '3 days'
    ) RETURNING id INTO new_request_id;
    
    -- Return the request details
    request_id := new_request_id;
    sensei_id := sensei_record.sensei_id;
    sensei_name := sensei_record.sensei_name;
    match_score := sensei_record.match_score;
    
    RETURN NEXT;
    
    request_count := request_count + 1;
    EXIT WHEN request_count >= p_max_requests;
  END LOOP;
  
  -- Create alert if no requests could be made
  IF request_count = 0 THEN
    INSERT INTO admin_alerts (
      alert_type,
      priority,
      title,
      message,
      trip_id
    ) VALUES (
      'backup_timeout',
      'critical',
      'No Available Backup Senseis: ' || trip_record.title,
      'Unable to find available backup senseis for trip "' || trip_record.title || '". Manual intervention required.',
      p_trip_id
    );
  END IF;
END;
$function$;

-- 6. Fix calculate_payment_deadline function
CREATE OR REPLACE FUNCTION public.calculate_payment_deadline(trip_start_date text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Assuming trip_start_date is in format like "March 15-22, 2024"
  -- For now, we'll use a simple calculation - this can be refined later
  RETURN (current_date + interval '90 days')::timestamp with time zone;
END;
$function$;

-- 7. Fix get_sensei_trip_status function
CREATE OR REPLACE FUNCTION public.get_sensei_trip_status()
 RETURNS TABLE(sensei_id uuid, sensei_name text, is_linked_to_trip boolean, current_trip_count bigint, is_available boolean, specialties text[], certifications text[], location text, rating numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  FROM sensei_profiles sp
  LEFT JOIN (
    SELECT 
      t.sensei_id, 
      COUNT(*) as count
    FROM trips t
    WHERE t.is_active = true 
    AND t.trip_status = 'approved'
    GROUP BY t.sensei_id
  ) trip_count ON sp.id = trip_count.sensei_id
  WHERE sp.is_active = true
  ORDER BY sp.name;
END;
$function$;