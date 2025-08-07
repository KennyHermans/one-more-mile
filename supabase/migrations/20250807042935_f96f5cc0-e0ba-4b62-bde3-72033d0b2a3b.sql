-- Check if trips table has RLS enabled and create proper policies
-- First ensure RLS is enabled
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admin can manage all trips" ON public.trips;
DROP POLICY IF EXISTS "Admin can view all trips" ON public.trips;
DROP POLICY IF EXISTS "Admin can update all trips" ON public.trips;
DROP POLICY IF EXISTS "Admin can insert trips" ON public.trips;
DROP POLICY IF EXISTS "Admin can delete trips" ON public.trips;
DROP POLICY IF EXISTS "Public can view published trips" ON public.trips;
DROP POLICY IF EXISTS "Senseis can view their trips" ON public.trips;
DROP POLICY IF EXISTS "Senseis can update their trips" ON public.trips;

-- Create comprehensive RLS policies for trips table
-- Admin policies (full access)
CREATE POLICY "Admin can view all trips" ON public.trips
  FOR SELECT USING (is_admin());

CREATE POLICY "Admin can insert trips" ON public.trips
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admin can update all trips" ON public.trips
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admin can delete trips" ON public.trips
  FOR DELETE USING (is_admin());

-- Public viewing for published trips
CREATE POLICY "Public can view published trips" ON public.trips
  FOR SELECT USING (
    is_active = true 
    AND trip_status IN ('approved', 'published', 'active')
  );

-- Sensei policies for their own trips
CREATE POLICY "Senseis can view their trips" ON public.trips
  FOR SELECT USING (
    sensei_id IN (
      SELECT id FROM public.sensei_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Senseis can update their trips" ON public.trips
  FOR UPDATE USING (
    sensei_id IN (
      SELECT id FROM public.sensei_profiles 
      WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    sensei_id IN (
      SELECT id FROM public.sensei_profiles 
      WHERE user_id = auth.uid()
    )
  );