-- Fix the function search path security warning
CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update goals based on real data
  UPDATE public.sensei_goals 
  SET current_value = CASE 
    WHEN category = 'trips' THEN (
      SELECT COALESCE(trips_led, 0) 
      FROM public.sensei_profiles 
      WHERE id = sensei_goals.sensei_id
    )
    WHEN category = 'rating' THEN (
      SELECT COALESCE(rating, 0) 
      FROM public.sensei_profiles 
      WHERE id = sensei_goals.sensei_id
    )
    WHEN category = 'revenue' THEN (
      SELECT COALESCE(SUM(tb.total_amount), 0)
      FROM public.trip_bookings tb
      JOIN public.trips t ON t.id = tb.trip_id
      WHERE t.sensei_id = sensei_goals.sensei_id
      AND tb.payment_status = 'paid'
    )
    ELSE current_value
  END,
  status = CASE 
    WHEN current_value >= target THEN 'completed'
    ELSE status
  END
  WHERE sensei_id = COALESCE(NEW.sensei_id, OLD.sensei_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;