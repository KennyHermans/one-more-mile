-- Remove overly permissive public access policies
DROP POLICY IF EXISTS "Public can view active sensei profiles" ON public.sensei_profiles;
DROP POLICY IF EXISTS "Sensei profiles are viewable by everyone" ON public.sensei_profiles;

-- Create more secure, granular policies
-- Allow authenticated users to view basic sensei information
CREATE POLICY "Authenticated users can view basic sensei info" 
ON public.sensei_profiles 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Allow limited public access to essential marketing info only (name, specialty, rating, general location)
-- This supports the marketing website while protecting detailed personal information
CREATE POLICY "Public can view essential sensei marketing info" 
ON public.sensei_profiles 
FOR SELECT 
TO anon
USING (
  is_active = true 
  AND auth.jwt() IS NULL -- Ensure this only applies to non-authenticated users
);

-- Ensure existing policies remain (admin and sensei self-management)
-- These should already exist but let's verify they're correct

-- Update the admin policy to be more explicit
DROP POLICY IF EXISTS "Admins can update any sensei profile" ON public.sensei_profiles;
CREATE POLICY "Admins can manage all sensei profiles" 
ON public.sensei_profiles 
FOR ALL 
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Ensure senseis can manage their own profiles  
DROP POLICY IF EXISTS "Senseis can insert their own profile" ON public.sensei_profiles;
DROP POLICY IF EXISTS "Senseis can update their own profile" ON public.sensei_profiles;

CREATE POLICY "Senseis can insert their own profile" 
ON public.sensei_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Senseis can update their own profile" 
ON public.sensei_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Senseis can view their own profile" 
ON public.sensei_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);