-- Add backup sensei support to trips table
ALTER TABLE public.trips ADD COLUMN backup_sensei_id uuid REFERENCES public.sensei_profiles(id);

-- Create backup sensei applications table
CREATE TABLE public.backup_sensei_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  sensei_id uuid NOT NULL REFERENCES public.sensei_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(trip_id, sensei_id)
);

-- Enable RLS on backup sensei applications
ALTER TABLE public.backup_sensei_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for backup sensei applications
CREATE POLICY "Admin can manage all backup applications" 
ON public.backup_sensei_applications 
FOR ALL 
USING (auth.email() = 'kenny_hermans93@hotmail.com')
WITH CHECK (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Senseis can create backup applications" 
ON public.backup_sensei_applications 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND sensei_id IN (
    SELECT id FROM public.sensei_profiles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Senseis can view their own backup applications" 
ON public.backup_sensei_applications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_backup_sensei_applications_updated_at
BEFORE UPDATE ON public.backup_sensei_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();