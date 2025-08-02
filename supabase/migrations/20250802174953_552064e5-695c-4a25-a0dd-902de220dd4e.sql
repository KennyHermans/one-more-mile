-- Create announcements table for sensei news feed
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID NOT NULL,
  trip_id UUID NULL, -- NULL means general announcement, otherwise trip-specific
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create policies for announcements
CREATE POLICY "Senseis can create announcements for their trips"
ON public.announcements
FOR INSERT
WITH CHECK (
  sensei_id IN (
    SELECT id FROM sensei_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Senseis can update their own announcements"
ON public.announcements
FOR UPDATE
USING (
  sensei_id IN (
    SELECT id FROM sensei_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Senseis can view their own announcements"
ON public.announcements
FOR SELECT
USING (
  sensei_id IN (
    SELECT id FROM sensei_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admin can manage all announcements"
ON public.announcements
FOR ALL
USING (auth.email() = 'kenny_hermans93@hotmail.com')
WITH CHECK (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Participants can view announcements for their trips"
ON public.announcements
FOR SELECT
USING (
  is_active = true 
  AND (
    -- General announcements (trip_id is NULL)
    trip_id IS NULL
    OR 
    -- Trip-specific announcements for trips they're booked on
    trip_id IN (
      SELECT trip_id FROM trip_bookings 
      WHERE user_id = auth.uid() 
      AND payment_status = 'paid'
    )
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_announcements_trip_id ON public.announcements(trip_id);
CREATE INDEX idx_announcements_sensei_id ON public.announcements(sensei_id);
CREATE INDEX idx_announcements_created_at ON public.announcements(created_at DESC);