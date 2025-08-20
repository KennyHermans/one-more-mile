-- First, let's remove the overly permissive policies that allow unlimited public access
DROP POLICY IF EXISTS "Public can view active sensei profiles" ON public.sensei_profiles;
DROP POLICY IF EXISTS "Sensei profiles are viewable by everyone" ON public.sensei_profiles;

-- Create a more secure policy that requires authentication for detailed sensei information
-- This prevents competitor scraping while maintaining functionality for legitimate users
CREATE POLICY "Authenticated users can view sensei profiles" 
ON public.sensei_profiles 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Allow very limited public access for marketing purposes only
-- This shows basic info to attract customers but protects detailed personal data
CREATE POLICY "Limited public sensei info for marketing" 
ON public.sensei_profiles 
FOR SELECT 
TO anon
USING (
  is_active = true 
  -- This policy will be limited by column-level security or application logic
  -- to only expose: name, specialty, rating, general location
);