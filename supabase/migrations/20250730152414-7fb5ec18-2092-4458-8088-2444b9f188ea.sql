-- Add sensei_id column to trips table to link with sensei_profiles
ALTER TABLE public.trips 
ADD COLUMN sensei_id UUID REFERENCES public.sensei_profiles(id);

-- Update existing trips to link them with sensei profiles if they exist
-- We'll do this manually through the admin interface since we need to match by name

-- Create an index for better performance
CREATE INDEX trips_sensei_id_idx ON public.trips(sensei_id);

-- Update RLS policies to allow reading sensei profiles for trip display
CREATE POLICY "Everyone can view active sensei profiles for trips" 
ON public.sensei_profiles 
FOR SELECT 
USING (is_active = true);

-- Create a view for easier sensei selection in admin interface
CREATE OR REPLACE VIEW public.available_senseis AS
SELECT 
  sp.id,
  sp.name,
  sp.specialty,
  sp.experience,
  sp.location,
  sp.bio,
  sp.image_url,
  sp.rating,
  sp.trips_led,
  a.status as application_status
FROM public.sensei_profiles sp
LEFT JOIN public.applications a ON sp.user_id = a.user_id
WHERE sp.is_active = true 
  AND (a.status = 'approved' OR a.status IS NULL);

-- Grant access to the view
GRANT SELECT ON public.available_senseis TO authenticated;