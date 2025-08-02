-- Create function to send welcome message to new participants
CREATE OR REPLACE FUNCTION public.send_welcome_message_to_participant(
  trip_booking_id UUID,
  user_id UUID,
  trip_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trip_title TEXT;
  sensei_id UUID;
BEGIN
  -- Get trip details
  SELECT title, sensei_id INTO trip_title, sensei_id
  FROM public.trips 
  WHERE id = trip_id;
  
  -- Insert welcome announcement for the specific participant
  -- We'll use the announcements table but with a special flag or different approach
  -- Since announcements are from sensei to participants, we need to use the trip's sensei
  IF sensei_id IS NOT NULL THEN
    INSERT INTO public.announcements (
      sensei_id,
      trip_id,
      title,
      content,
      priority,
      is_active
    ) VALUES (
      sensei_id,
      trip_id,
      'Welcome to ' || COALESCE(trip_title, 'Your Adventure') || '!',
      'Hi Traveller, thanks for booking! We hope you''re ready for an unforgettable adventure. Your journey with us is about to begin, and we can''t wait to share this amazing experience with you!',
      'high',
      true
    );
  END IF;
END;
$$;

-- Create trigger function for new paid bookings
CREATE OR REPLACE FUNCTION public.handle_new_trip_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Send welcome message when booking status changes to confirmed/paid
  IF (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') 
     AND NEW.payment_status = 'paid' THEN
    -- Send welcome message to the participant
    PERFORM public.send_welcome_message_to_participant(
      NEW.id,
      NEW.user_id,
      NEW.trip_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for trip bookings
CREATE TRIGGER trigger_new_trip_booking_welcome
  AFTER INSERT ON public.trip_bookings
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION public.handle_new_trip_booking();

CREATE TRIGGER trigger_updated_trip_booking_welcome
  AFTER UPDATE ON public.trip_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_trip_booking();

-- Create a function to manually send welcome messages to existing paid participants
CREATE OR REPLACE FUNCTION public.send_welcome_to_existing_participants()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  booking_record RECORD;
  welcome_count INTEGER := 0;
BEGIN
  -- Loop through all paid bookings that don't have a welcome message yet
  FOR booking_record IN 
    SELECT tb.id, tb.user_id, tb.trip_id, t.title, t.sensei_id
    FROM public.trip_bookings tb
    JOIN public.trips t ON t.id = tb.trip_id
    WHERE tb.payment_status = 'paid'
    AND t.sensei_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.trip_id = tb.trip_id
      AND a.sensei_id = t.sensei_id
      AND a.title LIKE 'Welcome to %'
      -- We can't easily filter by specific user, so this will prevent duplicates per trip
      -- In practice, each trip should only get one welcome message anyway
    )
  LOOP
    PERFORM public.send_welcome_message_to_participant(
      booking_record.id,
      booking_record.user_id,
      booking_record.trip_id
    );
    welcome_count := welcome_count + 1;
  END LOOP;
  
  RETURN welcome_count;
END;
$$;