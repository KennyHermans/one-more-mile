-- Fix the ambiguous column reference in send_welcome_message_to_participant function
CREATE OR REPLACE FUNCTION public.send_welcome_message_to_participant(trip_booking_id uuid, user_id uuid, trip_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trip_title TEXT;
  trip_sensei_id UUID;
BEGIN
  -- Get trip details using table alias to avoid ambiguity
  SELECT t.title, t.sensei_id INTO trip_title, trip_sensei_id
  FROM public.trips t 
  WHERE t.id = trip_id;
  
  -- Insert welcome announcement for the specific participant
  -- We'll use the announcements table but with a special flag or different approach
  -- Since announcements are from sensei to participants, we need to use the trip's sensei
  IF trip_sensei_id IS NOT NULL THEN
    INSERT INTO public.announcements (
      sensei_id,
      trip_id,
      title,
      content,
      priority,
      is_active
    ) VALUES (
      trip_sensei_id,
      trip_id,
      'Welcome to ' || COALESCE(trip_title, 'Your Adventure') || '!',
      'Hi Traveller, thanks for booking! We hope you''re ready for an unforgettable adventure. Your journey with us is about to begin, and we can''t wait to share this amazing experience with you!',
      'high',
      true
    );
  END IF;
END;
$function$