-- Add admin policy to view all applications
CREATE POLICY "Admin can view all applications" 
ON public.applications 
FOR SELECT 
TO authenticated
USING (auth.email() = 'kenny_hermans93@hotmail.com');

-- Add admin policy to update applications (for approving/rejecting)
CREATE POLICY "Admin can update all applications" 
ON public.applications 
FOR UPDATE 
TO authenticated
USING (auth.email() = 'kenny_hermans93@hotmail.com');