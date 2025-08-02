-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION calculate_payment_deadline(trip_start_date text)
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