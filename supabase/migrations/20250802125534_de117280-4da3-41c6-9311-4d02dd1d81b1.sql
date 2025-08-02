-- Add message_context to distinguish between private and group messages
ALTER TABLE public.trip_messages 
ADD COLUMN message_context text NOT NULL DEFAULT 'group' CHECK (message_context IN ('private', 'group'));

-- Add recipient_id for private messages (null for group messages)
ALTER TABLE public.trip_messages 
ADD COLUMN recipient_id uuid;

-- Add index for private message queries
CREATE INDEX idx_trip_messages_private ON public.trip_messages(trip_id, sender_id, recipient_id) 
WHERE message_context = 'private';

-- Update RLS policies to handle private messages
-- Drop existing policies first
DROP POLICY "Paid customers can send messages for their trips" ON public.trip_messages;
DROP POLICY "Paid customers can view messages for their trips" ON public.trip_messages;
DROP POLICY "Senseis can manage messages for their trips" ON public.trip_messages;

-- New comprehensive policies for both private and group messages
-- Customers can send group messages or private messages to sensei
CREATE POLICY "Paid customers can send messages" 
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
  AND (
    -- Group message (no recipient)
    (message_context = 'group' AND recipient_id IS NULL)
    OR 
    -- Private message to sensei
    (message_context = 'private' AND recipient_id IN (
      SELECT sp.user_id FROM trips t 
      JOIN sensei_profiles sp ON sp.id = t.sensei_id 
      WHERE t.id = trip_messages.trip_id
    ))
  )
);

-- Customers can view group messages and private messages they're involved in
CREATE POLICY "Paid customers can view messages" 
ON public.trip_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM trip_bookings 
    WHERE trip_id = trip_messages.trip_id 
    AND user_id = auth.uid() 
    AND payment_status = 'paid'
  )
  AND (
    -- Group messages - everyone can see
    message_context = 'group'
    OR 
    -- Private messages - only sender or recipient can see
    (message_context = 'private' AND (
      sender_id = auth.uid() OR recipient_id = auth.uid()
    ))
  )
);

-- Senseis can send both group and private messages
CREATE POLICY "Senseis can send messages" 
ON public.trip_messages 
FOR INSERT 
WITH CHECK (
  sender_type = 'sensei' 
  AND EXISTS (
    SELECT 1 FROM trips t
    JOIN sensei_profiles sp ON sp.id = t.sensei_id
    WHERE t.id = trip_messages.trip_id 
    AND sp.user_id = auth.uid()
  )
  AND (
    -- Group message
    (message_context = 'group' AND recipient_id IS NULL)
    OR 
    -- Private message to paid participant
    (message_context = 'private' AND recipient_id IN (
      SELECT tb.user_id FROM trip_bookings tb 
      WHERE tb.trip_id = trip_messages.trip_id 
      AND tb.payment_status = 'paid'
    ))
  )
);

-- Senseis can view all messages for their trips
CREATE POLICY "Senseis can view messages" 
ON public.trip_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM trips t
    JOIN sensei_profiles sp ON sp.id = t.sensei_id
    WHERE t.id = trip_messages.trip_id 
    AND sp.user_id = auth.uid()
  )
);