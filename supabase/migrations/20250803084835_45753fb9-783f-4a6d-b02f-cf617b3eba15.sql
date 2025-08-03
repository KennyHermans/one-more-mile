-- Update trip permissions for Joost's Marine Wildlife trip to allow full editing
UPDATE trip_permissions 
SET permissions = '{
  "title": true,
  "destination": true, 
  "description": true,
  "price": true,
  "dates": true,
  "group_size": true,
  "program": true,
  "included_amenities": true,
  "excluded_items": true,
  "requirements": true,
  "theme": true
}'::jsonb
WHERE trip_id = '9e2b5c07-1038-4523-b93f-85f29bd3294e';