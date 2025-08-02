-- Create messages table for trip communication
CREATE TABLE public.trip_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('customer', 'sensei')),
  message_text text NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  file_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone,
  is_deleted boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.trip_messages ENABLE ROW LEVEL SECURITY;

-- Index for performance
CREATE INDEX idx_trip_messages_trip_id ON public.trip_messages(trip_id);
CREATE INDEX idx_trip_messages_created_at ON public.trip_messages(created_at DESC);

-- Customers can only message if they have a PAID booking for this trip
CREATE POLICY "Paid customers can send messages for their trips" 
ON public.trip_messages 
FOR INSERT 
WITH CHECK (
  sender_type = 'customer' 
  AND EXISTS (
    SELECT 1 FROM trip_bookings 
    WHERE trip_id = trip_messages.trip_id 
    AND user_id = auth.uid() 
    AND payment_status = 'paid'
  )
);

-- Customers can view messages for trips they have paid for
CREATE POLICY "Paid customers can view messages for their trips" 
ON public.trip_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM trip_bookings 
    WHERE trip_id = trip_messages.trip_id 
    AND user_id = auth.uid() 
    AND payment_status = 'paid'
  )
);

-- Senseis can send and view messages for their assigned trips
CREATE POLICY "Senseis can manage messages for their trips" 
ON public.trip_messages 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM trips t
    JOIN sensei_profiles sp ON sp.id = t.sensei_id
    WHERE t.id = trip_messages.trip_id 
    AND sp.user_id = auth.uid()
  )
)
WITH CHECK (
  sender_type = 'sensei' 
  AND EXISTS (
    SELECT 1 FROM trips t
    JOIN sensei_profiles sp ON sp.id = t.sensei_id
    WHERE t.id = trip_messages.trip_id 
    AND sp.user_id = auth.uid()
  )
);

-- Admin can view all messages
CREATE POLICY "Admin can view all messages" 
ON public.trip_messages 
FOR SELECT 
USING (auth.email() = 'kenny_hermans93@hotmail.com');

-- Enable realtime
ALTER TABLE public.trip_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_messages;