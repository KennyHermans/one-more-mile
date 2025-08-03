-- Create some test backup requests for Joost to test the system
INSERT INTO backup_sensei_requests (trip_id, sensei_id, request_type, match_score, response_deadline)
VALUES 
  ('b6e7dfa1-f939-43c1-bc9b-39bf612b8946', '73b08295-9535-4d7e-9829-b1f418274576', 'manual_test', 45, now() + interval '3 days'),
  ('b6e7dfa1-f939-43c1-bc9b-39bf612b8946', '283366eb-c233-42ed-ab3c-8dd27b717726', 'manual_test', 60, now() + interval '3 days');

-- Update the existing alert to make sure it's properly configured
UPDATE admin_alerts 
SET metadata = jsonb_build_object('backup_deadline_passed', true, 'trip_needs_backup', true)
WHERE trip_id = 'b6e7dfa1-f939-43c1-bc9b-39bf612b8946';