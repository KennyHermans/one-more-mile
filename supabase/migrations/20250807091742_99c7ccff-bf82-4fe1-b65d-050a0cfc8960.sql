-- Fix RLS policy for trip_specific_permissions to use is_admin() function
DROP POLICY IF EXISTS "Admin can manage all trip specific permissions" ON public.trip_specific_permissions;

CREATE POLICY "Admin can manage all trip specific permissions"
ON public.trip_specific_permissions
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());