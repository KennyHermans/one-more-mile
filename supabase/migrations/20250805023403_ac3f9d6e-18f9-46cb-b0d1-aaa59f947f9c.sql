-- Clean up duplicate backup timeout alerts (fix for UUID)
WITH oldest_alerts AS (
  SELECT DISTINCT ON (alert_type, title, message) id
  FROM admin_alerts 
  WHERE alert_type = 'backup_timeout' 
  AND title = 'No Available Backup Senseis: Himalayan Trekking & Mindfulness Retreat'
  AND is_resolved = false
  ORDER BY alert_type, title, message, created_at ASC
)
DELETE FROM admin_alerts 
WHERE alert_type = 'backup_timeout' 
AND title = 'No Available Backup Senseis: Himalayan Trekking & Mindfulness Retreat'
AND is_resolved = false
AND id NOT IN (SELECT id FROM oldest_alerts);

-- Create function to prevent duplicate admin alerts
CREATE OR REPLACE FUNCTION prevent_duplicate_admin_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if similar alert already exists for the same trip
  IF EXISTS (
    SELECT 1 FROM admin_alerts 
    WHERE alert_type = NEW.alert_type 
    AND trip_id = NEW.trip_id 
    AND is_resolved = false
    AND created_at > NOW() - INTERVAL '1 hour'
  ) THEN
    -- Don't insert duplicate alert
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to prevent duplicates
DROP TRIGGER IF EXISTS prevent_duplicate_alerts ON admin_alerts;
CREATE TRIGGER prevent_duplicate_alerts
  BEFORE INSERT ON admin_alerts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_admin_alerts();