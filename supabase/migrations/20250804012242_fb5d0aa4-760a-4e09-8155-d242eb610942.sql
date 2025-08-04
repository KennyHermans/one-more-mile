-- Add reservation deadline setting to payment_settings
INSERT INTO public.payment_settings (
  setting_name,
  setting_value,
  description
) VALUES (
  'reservation_deadline_days',
  '7',
  'Number of days customers have to complete payment after making a reservation'
) ON CONFLICT (setting_name) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- Add booking_type to trip_bookings to distinguish between reservations and full bookings
ALTER TABLE public.trip_bookings 
ADD COLUMN IF NOT EXISTS booking_type text DEFAULT 'full_payment';

-- Add reservation_deadline to trip_bookings
ALTER TABLE public.trip_bookings 
ADD COLUMN IF NOT EXISTS reservation_deadline timestamp with time zone;

-- Update existing bookings to have booking_type
UPDATE public.trip_bookings 
SET booking_type = CASE 
  WHEN payment_status = 'pending' AND total_amount IS NULL THEN 'reservation'
  ELSE 'full_payment'
END
WHERE booking_type IS NULL;