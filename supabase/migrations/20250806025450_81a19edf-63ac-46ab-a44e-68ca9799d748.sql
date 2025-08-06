-- Fix security warnings by updating functions with proper search_path
CREATE OR REPLACE FUNCTION check_backup_requirements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trip_record RECORD;
BEGIN
  -- Check for trips that need backup senseis
  FOR trip_record IN 
    SELECT t.id, t.title, t.sensei_id, t.requires_backup_sensei, t.backup_assignment_deadline, t.destination, t.dates
    FROM trips t
    WHERE t.trip_status IN ('approved', 'active')
      AND t.requires_backup_sensei = true
      AND t.backup_sensei_id IS NULL
      AND t.backup_assignment_deadline <= now()
  LOOP
    -- Create admin alert for trips that need backup
    INSERT INTO admin_alerts (
      alert_type,
      title,
      message,
      priority,
      trip_id,
      metadata
    ) VALUES (
      'backup_needed',
      'Backup Sensei Required',
      format('Trip "%s" requires a backup sensei. Deadline passed.', trip_record.title),
      'high',
      trip_record.id,
      jsonb_build_object(
        'trip_title', trip_record.title,
        'destination', trip_record.destination,
        'dates', trip_record.dates,
        'deadline_passed', true
      )
    );
  END LOOP;
  
  -- Mark expired backup requests
  UPDATE backup_sensei_requests
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' 
    AND response_deadline < now();
    
  -- Create admin alerts for trips with all backup requests expired
  INSERT INTO admin_alerts (
    alert_type,
    title,
    message,
    priority,
    trip_id,
    metadata
  )
  SELECT DISTINCT
    'backup_failed',
    'All Backup Requests Expired',
    format('All backup requests for trip "%s" have expired. Manual intervention needed.', t.title),
    'critical',
    t.id,
    jsonb_build_object(
      'trip_title', t.title,
      'expired_requests', (
        SELECT count(*) 
        FROM backup_sensei_requests bsr 
        WHERE bsr.trip_id = t.id AND bsr.status = 'expired'
      )
    )
  FROM trips t
  WHERE t.requires_backup_sensei = true
    AND t.backup_sensei_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM backup_sensei_requests bsr
      WHERE bsr.trip_id = t.id AND bsr.status = 'pending'
    )
    AND EXISTS (
      SELECT 1 FROM backup_sensei_requests bsr
      WHERE bsr.trip_id = t.id AND bsr.status = 'expired'
    )
    AND NOT EXISTS (
      SELECT 1 FROM admin_alerts aa
      WHERE aa.trip_id = t.id 
        AND aa.alert_type = 'backup_failed'
        AND aa.created_at > now() - interval '1 hour'
    );
END;
$$;

-- Fix flag_high_value_trips_for_backup function search_path
CREATE OR REPLACE FUNCTION flag_high_value_trips_for_backup()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Flag trips over $5000 or with more than 8 participants for backup
  IF (NEW.price_per_person * NEW.group_size > 5000 OR NEW.group_size > 8) AND NEW.requires_backup_sensei = false THEN
    NEW.requires_backup_sensei = true;
    NEW.backup_assignment_deadline = NEW.start_date - interval '14 days';
    
    -- Create admin alert
    INSERT INTO admin_alerts (
      alert_type,
      title,
      message,
      priority,
      trip_id,
      metadata
    ) VALUES (
      'backup_flagged',
      'Trip Flagged for Backup Sensei',
      format('Trip "%s" has been automatically flagged for backup sensei requirement.', NEW.title),
      'medium',
      NEW.id,
      jsonb_build_object(
        'trip_value', NEW.price_per_person * NEW.group_size,
        'group_size', NEW.group_size,
        'auto_flagged', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER trigger_flag_backup_trips
  BEFORE INSERT OR UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION flag_high_value_trips_for_backup();