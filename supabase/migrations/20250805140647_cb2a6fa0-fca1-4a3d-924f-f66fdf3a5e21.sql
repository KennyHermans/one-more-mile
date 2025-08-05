-- Add backup sensei functionality to trips table
ALTER TABLE public.trips 
ADD COLUMN backup_sensei_id uuid REFERENCES public.sensei_profiles(id),
ADD COLUMN requires_backup_sensei boolean DEFAULT false;

-- Create backup_sensei_requests table
CREATE TABLE public.backup_sensei_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    sensei_id uuid NOT NULL REFERENCES public.sensei_profiles(id) ON DELETE CASCADE,
    request_type text NOT NULL DEFAULT 'automatic',
    match_score integer DEFAULT 0,
    status text NOT NULL DEFAULT 'pending',
    requested_at timestamp with time zone NOT NULL DEFAULT now(),
    response_deadline timestamp with time zone NOT NULL,
    responded_at timestamp with time zone,
    response_reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create backup_sensei_applications table
CREATE TABLE public.backup_sensei_applications (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    sensei_id uuid NOT NULL REFERENCES public.sensei_profiles(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    applied_at timestamp with time zone NOT NULL DEFAULT now(),
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.backup_sensei_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_sensei_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for backup_sensei_requests
CREATE POLICY "Admin can manage all backup requests" 
ON public.backup_sensei_requests 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Senseis can view requests for their trips" 
ON public.backup_sensei_requests 
FOR SELECT 
USING (
    trip_id IN (
        SELECT t.id FROM public.trips t 
        JOIN public.sensei_profiles sp ON sp.id = t.sensei_id 
        WHERE sp.user_id = auth.uid()
    )
);

CREATE POLICY "Senseis can respond to backup requests" 
ON public.backup_sensei_requests 
FOR UPDATE 
USING (
    sensei_id IN (
        SELECT id FROM public.sensei_profiles 
        WHERE user_id = auth.uid()
    )
);

-- Create RLS policies for backup_sensei_applications
CREATE POLICY "Admin can manage all backup applications" 
ON public.backup_sensei_applications 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Senseis can create backup applications" 
ON public.backup_sensei_applications 
FOR INSERT 
WITH CHECK (
    user_id = auth.uid() AND
    sensei_id IN (
        SELECT id FROM public.sensei_profiles 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Senseis can view their own applications" 
ON public.backup_sensei_applications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Primary senseis can view applications for their trips" 
ON public.backup_sensei_applications 
FOR SELECT 
USING (
    trip_id IN (
        SELECT t.id FROM public.trips t 
        JOIN public.sensei_profiles sp ON sp.id = t.sensei_id 
        WHERE sp.user_id = auth.uid()
    )
);

-- Create indexes for performance
CREATE INDEX idx_trips_backup_sensei_id ON public.trips(backup_sensei_id);
CREATE INDEX idx_trips_requires_backup_sensei ON public.trips(requires_backup_sensei);
CREATE INDEX idx_backup_sensei_requests_trip_id ON public.backup_sensei_requests(trip_id);
CREATE INDEX idx_backup_sensei_requests_sensei_id ON public.backup_sensei_requests(sensei_id);
CREATE INDEX idx_backup_sensei_requests_status ON public.backup_sensei_requests(status);
CREATE INDEX idx_backup_sensei_applications_trip_id ON public.backup_sensei_applications(trip_id);
CREATE INDEX idx_backup_sensei_applications_sensei_id ON public.backup_sensei_applications(sensei_id);
CREATE INDEX idx_backup_sensei_applications_user_id ON public.backup_sensei_applications(user_id);
CREATE INDEX idx_backup_sensei_applications_status ON public.backup_sensei_applications(status);

-- Create trigger for updated_at columns
CREATE TRIGGER update_backup_sensei_requests_updated_at
    BEFORE UPDATE ON public.backup_sensei_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_backup_sensei_applications_updated_at
    BEFORE UPDATE ON public.backup_sensei_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically assign backup sensei requirements based on trip criteria
CREATE OR REPLACE FUNCTION public.check_backup_requirements()
RETURNS trigger AS $$
BEGIN
    -- Automatically set requires_backup_sensei for high-value or high-risk trips
    IF NEW.trip_status = 'approved' AND NEW.requires_backup_sensei IS NULL THEN
        -- Parse price to determine if it's a high-value trip (>$2000)
        DECLARE
            price_numeric numeric;
        BEGIN
            price_numeric := CAST(REPLACE(REPLACE(NEW.price, '$', ''), ',', '') AS numeric);
            
            -- Set backup requirement for high-value trips or international destinations
            IF price_numeric > 2000 OR NEW.difficulty_level IN ('Challenging', 'Expert') THEN
                NEW.requires_backup_sensei := true;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- If price parsing fails, default to false
                NEW.requires_backup_sensei := COALESCE(NEW.requires_backup_sensei, false);
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically check backup requirements
CREATE TRIGGER check_trip_backup_requirements
    BEFORE INSERT OR UPDATE ON public.trips
    FOR EACH ROW
    EXECUTE FUNCTION public.check_backup_requirements();