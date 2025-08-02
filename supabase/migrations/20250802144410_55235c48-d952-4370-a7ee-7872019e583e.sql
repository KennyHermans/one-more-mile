-- Add trip cancellation functionality
ALTER TABLE public.trips 
ADD COLUMN cancelled_by_sensei boolean DEFAULT false,
ADD COLUMN cancellation_reason text,
ADD COLUMN cancelled_at timestamp with time zone,
ADD COLUMN replacement_needed boolean DEFAULT false;

-- Create table for tracking trip cancellations and replacements
CREATE TABLE public.trip_cancellations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL,
  cancelled_by_sensei_id uuid NOT NULL,
  cancellation_reason text NOT NULL,
  cancelled_at timestamp with time zone NOT NULL DEFAULT now(),
  replacement_sensei_id uuid,
  replacement_assigned_at timestamp with time zone,
  admin_notified boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_cancellations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can view all cancellations" 
ON public.trip_cancellations 
FOR SELECT 
USING (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Admin can manage cancellations" 
ON public.trip_cancellations 
FOR ALL 
USING (auth.email() = 'kenny_hermans93@hotmail.com')
WITH CHECK (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Senseis can create cancellations for their trips" 
ON public.trip_cancellations 
FOR INSERT 
WITH CHECK (cancelled_by_sensei_id IN (
  SELECT sensei_profiles.id 
  FROM sensei_profiles 
  WHERE sensei_profiles.user_id = auth.uid()
));

-- Create trigger for timestamps
CREATE TRIGGER update_trip_cancellations_updated_at
BEFORE UPDATE ON public.trip_cancellations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();