-- Create trip permissions table
CREATE TABLE public.trip_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  sensei_id uuid NOT NULL REFERENCES public.sensei_profiles(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, sensei_id)
);

-- Enable RLS
ALTER TABLE public.trip_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for trip_permissions
CREATE POLICY "Admin can manage all trip permissions" 
ON public.trip_permissions 
FOR ALL 
USING (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Senseis can view their own trip permissions" 
ON public.trip_permissions 
FOR SELECT 
USING (
  sensei_id IN (
    SELECT id FROM public.sensei_profiles WHERE user_id = auth.uid()
  )
);

-- Update trips table RLS to allow senseis to edit their assigned trips
CREATE POLICY "Senseis can update their assigned trips" 
ON public.trips 
FOR UPDATE 
USING (
  sensei_id IN (
    SELECT id FROM public.sensei_profiles WHERE user_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates on trip_permissions
CREATE TRIGGER update_trip_permissions_updated_at
BEFORE UPDATE ON public.trip_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();