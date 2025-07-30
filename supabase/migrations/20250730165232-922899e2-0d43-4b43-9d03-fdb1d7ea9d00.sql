-- Add program field to trips table for day-by-day itinerary
ALTER TABLE public.trips 
ADD COLUMN program JSONB DEFAULT '[]'::jsonb;