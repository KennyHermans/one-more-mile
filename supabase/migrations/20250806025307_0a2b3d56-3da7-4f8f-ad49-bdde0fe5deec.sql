-- Enable required extensions for automation
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Insert backup automation settings if not exists
INSERT INTO payment_settings (setting_name, setting_value, description)
VALUES (
  'backup_automation',
  '{
    "enabled": true,
    "max_requests_per_trip": 3,
    "response_timeout_hours": 24,
    "retry_interval_hours": 6,
    "escalation_enabled": true,
    "auto_assignment_enabled": true,
    "notification_enabled": true
  }'::jsonb,
  'Automated backup sensei assignment configuration'
)
ON CONFLICT (setting_name) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = now();

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

-- Create trigger to automatically flag high-value trips for backup
CREATE OR REPLACE FUNCTION flag_high_value_trips_for_backup()
RETURNS TRIGGER
LANGUAGE plpgsql
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

-- Create trigger on trips table
DROP TRIGGER IF EXISTS trigger_flag_backup_trips ON trips;
CREATE TRIGGER trigger_flag_backup_trips
  BEFORE INSERT OR UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION flag_high_value_trips_for_backup();

-- Set up cron jobs for automated backup management
SELECT cron.schedule(
  'backup-timeout-check',
  '0 */2 * * *', -- Every 2 hours
  $$
  SELECT net.http_post(
    url := 'https://qvirgcrbnwcyhbqdazjy.supabase.co/functions/v1/handle-backup-timeout',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aXJnY3JibndjeWhicWRhemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTAzNTEsImV4cCI6MjA2OTQyNjM1MX0.WM4XueoIBsue-EmoQI-dIwmNrc3lBd35MR3PhevhI20"}'::jsonb,
    body := '{"trigger": "automated"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'backup-requirements-check',
  '0 */4 * * *', -- Every 4 hours
  $$
  SELECT net.http_post(
    url := 'https://qvirgcrbnwcyhbqdazjy.supabase.co/functions/v1/check-backup-requirements',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aXJnY3JibndjeWhicWRhemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTAzNTEsImV4cCI6MjA2OTQyNjM1MX0.WM4XueoIBsue-EmoQI-dIwmNrc3lBd35MR3PhevhI20"}'::jsonb,
    body := '{"trigger": "automated"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'automated-backup-assignment',
  '0 8,12,16,20 * * *', -- Four times daily at 8am, 12pm, 4pm, 8pm
  $$
  SELECT net.http_post(
    url := 'https://qvirgcrbnwcyhbqdazjy.supabase.co/functions/v1/automated-backup-assignment',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aXJnY3JibndjeWhicWRhemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTAzNTEsImV4cCI6MjA2OTQyNjM1MX0.WM4XueoIBsue-EmoQI-dIwmNrc3lBd35MR3PhevhI20"}'::jsonb,
    body := '{"trigger": "automated"}'::jsonb
  );
  $$
);

-- Test the function
SELECT check_backup_requirements();