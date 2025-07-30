-- Fix the admin policies for trips table to avoid auth.users access issues

-- Drop the existing problematic policies
DROP POLICY IF EXISTS "Admin can delete trips" ON public.trips;
DROP POLICY IF EXISTS "Admin can insert trips" ON public.trips;
DROP POLICY IF EXISTS "Admin can update trips" ON public.trips;

-- Create new admin policies using auth.email() instead of querying auth.users
CREATE POLICY "Admin can delete trips" 
ON public.trips 
FOR DELETE 
TO authenticated
USING (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Admin can insert trips" 
ON public.trips 
FOR INSERT 
TO authenticated
WITH CHECK (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Admin can update trips" 
ON public.trips 
FOR UPDATE 
TO authenticated
USING (auth.email() = 'kenny_hermans93@hotmail.com');