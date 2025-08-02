-- Add trip creation permission to sensei profiles
ALTER TABLE public.sensei_profiles 
ADD COLUMN can_create_trips boolean NOT NULL DEFAULT false,
ADD COLUMN trip_creation_requested boolean NOT NULL DEFAULT false,
ADD COLUMN trip_creation_request_date timestamp with time zone;

-- Update RLS policy for trip creation to check permission
DROP POLICY IF EXISTS "Senseis can create trip proposals" ON public.trips;
CREATE POLICY "Senseis can create trip proposals" 
ON public.trips 
FOR INSERT 
WITH CHECK (
  created_by_sensei = true 
  AND auth.uid() = created_by_user_id
  AND trip_status IN ('draft', 'pending_approval')
  AND sensei_id IN (
    SELECT id FROM sensei_profiles 
    WHERE user_id = auth.uid() AND can_create_trips = true
  )
);