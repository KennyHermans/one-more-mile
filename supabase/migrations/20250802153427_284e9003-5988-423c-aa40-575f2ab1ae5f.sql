-- Add missing foreign key constraints to fix the relationship errors

-- Add foreign key constraint between trip_cancellations and trips
ALTER TABLE public.trip_cancellations 
ADD CONSTRAINT fk_trip_cancellations_trip_id 
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- Add foreign key constraint between sensei_feedback and trips  
ALTER TABLE public.sensei_feedback 
ADD CONSTRAINT fk_sensei_feedback_trip_id 
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- Add foreign key constraint between trip_cancellations and sensei_profiles (cancelled_by_sensei_id)
ALTER TABLE public.trip_cancellations 
ADD CONSTRAINT fk_trip_cancellations_cancelled_by_sensei_id 
FOREIGN KEY (cancelled_by_sensei_id) REFERENCES public.sensei_profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint between trip_cancellations and sensei_profiles (replacement_sensei_id)
ALTER TABLE public.trip_cancellations 
ADD CONSTRAINT fk_trip_cancellations_replacement_sensei_id 
FOREIGN KEY (replacement_sensei_id) REFERENCES public.sensei_profiles(id) ON DELETE SET NULL;

-- Add foreign key constraint between sensei_feedback and sensei_profiles
ALTER TABLE public.sensei_feedback 
ADD CONSTRAINT fk_sensei_feedback_sensei_id 
FOREIGN KEY (sensei_id) REFERENCES public.sensei_profiles(id) ON DELETE CASCADE;