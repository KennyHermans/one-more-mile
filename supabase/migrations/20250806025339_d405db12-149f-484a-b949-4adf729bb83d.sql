-- Drop the existing function first
DROP FUNCTION IF EXISTS check_backup_requirements();

-- Create or replace function to check backup requirements
CREATE OR REPLACE FUNCTION check_backup_requirements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trip_record RECORD;
  backup_deadline TIMESTAMP WITH TIME ZONE;
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
    
    -- Log for debugging
    RAISE NOTICE 'Created backup alert for trip: %', trip_record.title;
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