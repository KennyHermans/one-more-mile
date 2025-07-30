-- Drop the problematic view and recreate without security definer issues
DROP VIEW IF EXISTS public.available_senseis;

-- Create a simpler approach - just query sensei_profiles directly
-- and check application status in the application code instead

-- Update the sensei_profiles RLS policy to be more specific
DROP POLICY IF EXISTS "Everyone can view active sensei profiles for trips" ON public.sensei_profiles;

CREATE POLICY "Public can view active sensei profiles" 
ON public.sensei_profiles 
FOR SELECT 
USING (is_active = true);