-- Remove trip creation request functionality

-- Drop the function
DROP FUNCTION IF EXISTS public.request_trip_creation_permission(uuid, text);

-- Drop the review function
DROP FUNCTION IF EXISTS public.review_trip_creation_request(uuid, text, text);

-- Drop the table
DROP TABLE IF EXISTS public.trip_creation_requests;

-- Remove related columns from sensei_profiles
ALTER TABLE public.sensei_profiles 
DROP COLUMN IF EXISTS trip_creation_requested,
DROP COLUMN IF EXISTS trip_creation_request_date;