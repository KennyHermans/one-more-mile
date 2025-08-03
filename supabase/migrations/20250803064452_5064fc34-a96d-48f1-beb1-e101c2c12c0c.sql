-- Fix update_goal_progress function to work with trip_bookings table
CREATE OR REPLACE FUNCTION public.update_goal_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_sensei_id UUID;
BEGIN
  -- Determine which sensei to update based on the table that triggered this
  IF TG_TABLE_NAME = 'trip_bookings' THEN
    -- For trip_bookings, get the sensei_id from the associated trip
    SELECT t.sensei_id INTO affected_sensei_id
    FROM public.trips t 
    WHERE t.id = COALESCE(NEW.trip_id, OLD.trip_id);
  ELSIF TG_TABLE_NAME = 'sensei_profiles' THEN
    -- For sensei_profiles, use the sensei_id directly
    affected_sensei_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'trip_reviews' THEN
    -- For trip_reviews, use the sensei_id directly
    affected_sensei_id := COALESCE(NEW.sensei_id, OLD.sensei_id);
  ELSE
    -- For other tables, skip processing
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Only update if we have a valid sensei_id
  IF affected_sensei_id IS NOT NULL THEN
    -- Update goals based on real data
    UPDATE public.sensei_goals 
    SET current_value = CASE 
      WHEN category = 'trips' THEN (
        SELECT COALESCE(trips_led, 0) 
        FROM public.sensei_profiles 
        WHERE id = affected_sensei_id
      )
      WHEN category = 'rating' THEN (
        SELECT COALESCE(rating, 0) 
        FROM public.sensei_profiles 
        WHERE id = affected_sensei_id
      )
      WHEN category = 'revenue' THEN (
        SELECT COALESCE(SUM(tb.total_amount), 0)
        FROM public.trip_bookings tb
        JOIN public.trips t ON t.id = tb.trip_id
        WHERE t.sensei_id = affected_sensei_id
        AND tb.payment_status = 'paid'
      )
      ELSE current_value
    END,
    status = CASE 
      WHEN current_value >= target THEN 'completed'
      ELSE status
    END
    WHERE sensei_id = affected_sensei_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;