-- Fix handle_new_trip_booking function to properly handle INSERT vs UPDATE operations
CREATE OR REPLACE FUNCTION public.handle_new_trip_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Send welcome message when booking status changes to confirmed/paid
  -- For INSERT: Check if NEW.payment_status = 'paid'
  -- For UPDATE: Check if payment status changed from non-paid to paid
  IF (TG_OP = 'INSERT' AND NEW.payment_status = 'paid') OR 
     (TG_OP = 'UPDATE' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') AND NEW.payment_status = 'paid') THEN
    -- Send welcome message to the participant
    PERFORM public.send_welcome_message_to_participant(
      NEW.id,
      NEW.user_id,
      NEW.trip_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;