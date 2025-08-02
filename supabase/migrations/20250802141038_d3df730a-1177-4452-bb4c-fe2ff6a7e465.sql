-- Fix function search path security issue
-- Update the existing function to have proper security settings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update sensei rating function with proper security settings
CREATE OR REPLACE FUNCTION public.update_sensei_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update the sensei's average rating
  UPDATE public.sensei_profiles 
  SET rating = (
    SELECT COALESCE(AVG(rating::numeric), 0)
    FROM public.trip_reviews 
    WHERE sensei_id = COALESCE(NEW.sensei_id, OLD.sensei_id)
  )
  WHERE id = COALESCE(NEW.sensei_id, OLD.sensei_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update payment deadline function with proper security settings
CREATE OR REPLACE FUNCTION public.calculate_payment_deadline(trip_start_date text)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Assuming trip_start_date is in format like "March 15-22, 2024"
  -- For now, we'll use a simple calculation - this can be refined later
  RETURN (current_date + interval '90 days')::timestamp with time zone;
END;
$$;