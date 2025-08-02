-- Add trip status and creator tracking to trips table
ALTER TABLE public.trips 
ADD COLUMN trip_status text NOT NULL DEFAULT 'approved',
ADD COLUMN created_by_sensei boolean NOT NULL DEFAULT false,
ADD COLUMN created_by_user_id uuid;

-- Add check constraint for valid trip statuses
ALTER TABLE public.trips 
ADD CONSTRAINT valid_trip_status 
CHECK (trip_status IN ('draft', 'pending_approval', 'approved', 'rejected'));

-- Update existing trips to be marked as admin-created and approved
UPDATE public.trips 
SET trip_status = 'approved', 
    created_by_sensei = false 
WHERE trip_status = 'approved';

-- Create policy for senseis to create their own trip proposals
CREATE POLICY "Senseis can create trip proposals" 
ON public.trips 
FOR INSERT 
WITH CHECK (
  created_by_sensei = true 
  AND auth.uid() = created_by_user_id
  AND trip_status IN ('draft', 'pending_approval')
  AND sensei_id IN (
    SELECT id FROM sensei_profiles WHERE user_id = auth.uid()
  )
);

-- Create policy for senseis to view and edit their own trip proposals
CREATE POLICY "Senseis can view their own trip proposals" 
ON public.trips 
FOR SELECT 
USING (
  (is_active = true AND trip_status = 'approved') -- Public approved trips
  OR (created_by_sensei = true AND created_by_user_id = auth.uid()) -- Own proposals
);

CREATE POLICY "Senseis can update their own trip proposals" 
ON public.trips 
FOR UPDATE 
USING (
  created_by_sensei = true 
  AND created_by_user_id = auth.uid() 
  AND trip_status IN ('draft', 'pending_approval')
)
WITH CHECK (
  created_by_sensei = true 
  AND created_by_user_id = auth.uid()
  AND trip_status IN ('draft', 'pending_approval')
);

-- Update admin policies to handle all trip statuses
DROP POLICY IF EXISTS "Admin can update trips" ON public.trips;
CREATE POLICY "Admin can update all trips" 
ON public.trips 
FOR UPDATE 
USING (auth.email() = 'kenny_hermans93@hotmail.com');

DROP POLICY IF EXISTS "Trips are viewable by everyone" ON public.trips;
CREATE POLICY "Public can view approved active trips" 
ON public.trips 
FOR SELECT 
USING (is_active = true AND trip_status = 'approved');

-- Admin can view all trips including proposals
CREATE POLICY "Admin can view all trips" 
ON public.trips 
FOR SELECT 
USING (auth.email() = 'kenny_hermans93@hotmail.com');