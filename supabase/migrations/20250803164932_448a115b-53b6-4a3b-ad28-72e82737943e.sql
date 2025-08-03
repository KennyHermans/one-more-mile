-- Update Joost's trip permissions to only allow editing the program field
UPDATE trip_permissions 
SET permissions = '{
  "title": false,
  "description": false,
  "destination": false,
  "theme": false,
  "dates": false,
  "price": false,
  "group_size": false,
  "included_amenities": false,
  "excluded_items": false,
  "requirements": false,
  "program": true
}'::jsonb,
updated_at = now()
WHERE sensei_id = '73b08295-9535-4d7e-9829-b1f418274576' 
AND trip_id = '9e2b5c07-1038-4523-b93f-85f29bd3294e';