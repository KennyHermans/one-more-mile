-- Add missing foreign key constraint between trip_reviews and trips
ALTER TABLE public.trip_reviews 
ADD CONSTRAINT trip_reviews_trip_id_fkey 
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;