-- Update stale sensei_name data in trips table to match current sensei profiles
UPDATE trips 
SET sensei_name = sp.name,
    updated_at = now()
FROM sensei_profiles sp 
WHERE trips.sensei_id = sp.id 
AND (trips.sensei_name != sp.name OR trips.sensei_name IS NULL OR trips.sensei_name = '');