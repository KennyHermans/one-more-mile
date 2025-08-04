-- Add proper date columns to trips table for better date handling
ALTER TABLE public.trips 
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE;

-- Update existing trips to populate date fields where possible
-- This attempts to parse the existing dates text field to extract start/end dates
-- For now, we'll leave them NULL and let users update them manually
UPDATE public.trips 
SET duration_days = CASE 
  WHEN duration_days IS NULL OR duration_days = 0 THEN 7 
  ELSE duration_days 
END
WHERE duration_days IS NULL OR duration_days = 0;