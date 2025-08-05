-- Add admin RLS policy for sensei_profiles UPDATE operations
CREATE POLICY "Admins can update any sensei profile" ON public.sensei_profiles
FOR UPDATE 
USING (is_admin())
WITH CHECK (is_admin());