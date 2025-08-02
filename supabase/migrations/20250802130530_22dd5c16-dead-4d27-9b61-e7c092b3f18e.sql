-- Create trip reviews table for public reviews
CREATE TABLE public.trip_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL,
  user_id UUID NOT NULL,
  sensei_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, user_id) -- One review per user per trip
);

-- Create sensei feedback table for private admin feedback
CREATE TABLE public.sensei_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL,
  user_id UUID NOT NULL,
  sensei_id UUID NOT NULL,
  feedback_text TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, user_id) -- One feedback per user per trip
);

-- Enable RLS
ALTER TABLE public.trip_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensei_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_reviews
CREATE POLICY "Users can view all public reviews" 
ON public.trip_reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create reviews for completed trips they attended" 
ON public.trip_reviews 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM trip_bookings 
    WHERE trip_bookings.trip_id = trip_reviews.trip_id 
    AND trip_bookings.user_id = auth.uid() 
    AND trip_bookings.payment_status = 'paid'
  )
);

CREATE POLICY "Users can update their own reviews" 
ON public.trip_reviews 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for sensei_feedback  
CREATE POLICY "Only admins can view sensei feedback" 
ON public.sensei_feedback 
FOR SELECT 
USING (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Users can create feedback for completed trips they attended" 
ON public.sensei_feedback 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM trip_bookings 
    WHERE trip_bookings.trip_id = sensei_feedback.trip_id 
    AND trip_bookings.user_id = auth.uid() 
    AND trip_bookings.payment_status = 'paid'
  )
);

CREATE POLICY "Users can update their own feedback" 
ON public.sensei_feedback 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_trip_reviews_updated_at
BEFORE UPDATE ON public.trip_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sensei_feedback_updated_at
BEFORE UPDATE ON public.sensei_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update sensei rating based on reviews
CREATE OR REPLACE FUNCTION public.update_sensei_rating()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update sensei rating when reviews change
CREATE TRIGGER update_sensei_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.trip_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_sensei_rating();