-- Phase 1: Create missing database infrastructure for enhanced permission system

-- Add required columns to trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS required_permission_level TEXT DEFAULT 'apprentice',
ADD COLUMN IF NOT EXISTS created_by_sensei_level TEXT DEFAULT 'apprentice';

-- Create trip_specific_permissions table
CREATE TABLE IF NOT EXISTS public.trip_specific_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  sensei_id UUID NOT NULL REFERENCES public.sensei_profiles(id) ON DELETE CASCADE,
  elevated_level TEXT NOT NULL,
  granted_reason TEXT,
  granted_by UUID REFERENCES public.sensei_profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(trip_id, sensei_id)
);

-- Enable RLS on trip_specific_permissions
ALTER TABLE public.trip_specific_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for trip_specific_permissions
CREATE POLICY "Admin can manage trip specific permissions" 
ON public.trip_specific_permissions 
FOR ALL 
USING (is_admin());

CREATE POLICY "Senseis can view their own trip permissions" 
ON public.trip_specific_permissions 
FOR SELECT 
USING (sensei_id IN (
  SELECT id FROM public.sensei_profiles WHERE user_id = auth.uid()
));

-- Update existing trips with sensei levels
UPDATE public.trips 
SET created_by_sensei_level = (
  SELECT sensei_level 
  FROM public.sensei_profiles 
  WHERE id = trips.sensei_id
),
required_permission_level = COALESCE(
  (SELECT sensei_level FROM public.sensei_profiles WHERE id = trips.sensei_id),
  'apprentice'
)
WHERE sensei_id IS NOT NULL;

-- Create function to automatically update trip permission requirements
CREATE OR REPLACE FUNCTION public.update_trip_permission_requirements()
RETURNS TRIGGER AS $$
BEGIN
  -- When a trip is created, set the required permission level based on creator
  IF TG_OP = 'INSERT' AND NEW.sensei_id IS NOT NULL THEN
    NEW.created_by_sensei_level := (
      SELECT sensei_level FROM public.sensei_profiles WHERE id = NEW.sensei_id
    );
    NEW.required_permission_level := NEW.created_by_sensei_level;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new trips
CREATE TRIGGER update_trip_requirements_trigger
  BEFORE INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trip_permission_requirements();

-- Create function to grant elevated permissions
CREATE OR REPLACE FUNCTION public.grant_trip_specific_permission(
  p_trip_id UUID,
  p_sensei_id UUID,
  p_elevated_level TEXT,
  p_reason TEXT DEFAULT 'System-granted for sensei replacement'
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Insert or update the elevated permission
  INSERT INTO public.trip_specific_permissions (
    trip_id,
    sensei_id,
    elevated_level,
    granted_reason,
    is_active
  ) VALUES (
    p_trip_id,
    p_sensei_id,
    p_elevated_level,
    p_reason,
    true
  )
  ON CONFLICT (trip_id, sensei_id) 
  DO UPDATE SET
    elevated_level = EXCLUDED.elevated_level,
    granted_reason = EXCLUDED.granted_reason,
    is_active = true,
    updated_at = now();
  
  result := jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'sensei_id', p_sensei_id,
    'elevated_level', p_elevated_level
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to revoke elevated permissions
CREATE OR REPLACE FUNCTION public.revoke_trip_specific_permission(
  p_trip_id UUID,
  p_sensei_id UUID
)
RETURNS JSONB AS $$
BEGIN
  UPDATE public.trip_specific_permissions
  SET is_active = false, updated_at = now()
  WHERE trip_id = p_trip_id AND sensei_id = p_sensei_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'revoked', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;