-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION public.set_backup_assignment_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Set deadline to 48 hours after trip approval if backup sensei required
  IF NEW.trip_status = 'approved' AND NEW.requires_backup_sensei = true AND NEW.backup_assignment_deadline IS NULL THEN
    NEW.backup_assignment_deadline = now() + interval '48 hours';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.create_backup_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create alert if trip is approved and requires backup but has none assigned
  IF NEW.trip_status = 'approved' AND NEW.requires_backup_sensei = true AND NEW.backup_sensei_id IS NULL THEN
    INSERT INTO public.admin_alerts (
      alert_type,
      priority,
      title,
      message,
      trip_id
    ) VALUES (
      'missing_backup',
      'high',
      'Trip Missing Backup Sensei: ' || NEW.title,
      'Trip "' || NEW.title || '" has been approved but no backup sensei is assigned. Please assign a backup sensei within 48 hours.',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE OR REPLACE FUNCTION public.request_backup_senseis(p_trip_id UUID, p_max_requests INTEGER DEFAULT 3)
RETURNS TABLE(request_id UUID, sensei_id UUID, sensei_name TEXT, match_score INTEGER) AS $$
DECLARE
  trip_record RECORD;
  sensei_record RECORD;
  request_count INTEGER := 0;
  new_request_id UUID;
BEGIN
  -- Get trip details
  SELECT * INTO trip_record FROM public.trips WHERE id = p_trip_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found: %', p_trip_id;
  END IF;
  
  -- Get top matching senseis who haven't been requested yet
  FOR sensei_record IN 
    SELECT s.sensei_id, s.sensei_name, s.match_score, s.is_available
    FROM public.suggest_senseis_for_trip_enhanced(
      trip_record.theme, 
      string_to_array(trip_record.dates, ','), 
      p_trip_id
    ) s
    WHERE s.is_available = true 
    AND s.sensei_id != COALESCE(trip_record.sensei_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND s.sensei_id NOT IN (
      SELECT bsr.sensei_id 
      FROM public.backup_sensei_requests bsr 
      WHERE bsr.trip_id = p_trip_id 
      AND bsr.status IN ('pending', 'accepted')
    )
    ORDER BY s.match_score DESC, s.rating DESC
    LIMIT p_max_requests
  LOOP
    -- Create backup request
    INSERT INTO public.backup_sensei_requests (
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
    INSERT INTO public.admin_alerts (
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';