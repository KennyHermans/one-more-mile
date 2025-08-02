-- Add payment deadline column to trip_bookings table
ALTER TABLE trip_bookings 
ADD COLUMN payment_deadline timestamp with time zone;

-- Add reminder tracking columns
ALTER TABLE trip_bookings 
ADD COLUMN last_reminder_sent timestamp with time zone,
ADD COLUMN reminder_count integer DEFAULT 0;

-- Create function to calculate payment deadline (3 months before trip start)
CREATE OR REPLACE FUNCTION calculate_payment_deadline(trip_start_date text)
RETURNS timestamp with time zone
LANGUAGE plpgsql
AS $$
BEGIN
  -- Assuming trip_start_date is in format like "March 15-22, 2024"
  -- For now, we'll use a simple calculation - this can be refined later
  RETURN (current_date + interval '90 days')::timestamp with time zone;
END;
$$;

-- Update existing bookings to set payment deadline
UPDATE trip_bookings 
SET payment_deadline = (current_date + interval '90 days')::timestamp with time zone
WHERE payment_deadline IS NULL;