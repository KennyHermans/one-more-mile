-- Create customer wishlist table for saved trips
CREATE TABLE public.customer_wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trip_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(user_id, trip_id)
);

-- Enable RLS
ALTER TABLE public.customer_wishlists ENABLE ROW LEVEL SECURITY;

-- Create policies for customer wishlists
CREATE POLICY "Users can manage their own wishlist items" 
ON public.customer_wishlists 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Create travel stats view for dashboard
CREATE OR REPLACE VIEW public.customer_travel_stats AS
SELECT 
  cp.user_id,
  COALESCE(COUNT(DISTINCT tb.id) FILTER (WHERE tb.payment_status = 'paid'), 0) AS trips_completed,
  COALESCE(COUNT(DISTINCT tb.id) FILTER (WHERE tb.payment_status = 'pending'), 0) AS trips_pending,
  COALESCE(SUM(tb.total_amount) FILTER (WHERE tb.payment_status = 'paid'), 0) AS total_spent,
  COALESCE(COUNT(DISTINCT cw.id), 0) AS trips_wishlisted,
  COALESCE(AVG(tr.rating), 0) AS avg_rating_given,
  COALESCE(COUNT(DISTINCT tr.id), 0) AS reviews_written,
  ARRAY_AGG(DISTINCT t.theme) FILTER (WHERE t.theme IS NOT NULL) AS preferred_themes
FROM public.customer_profiles cp
LEFT JOIN public.trip_bookings tb ON tb.user_id = cp.user_id
LEFT JOIN public.trips t ON t.id = tb.trip_id
LEFT JOIN public.customer_wishlists cw ON cw.user_id = cp.user_id
LEFT JOIN public.trip_reviews tr ON tr.user_id = cp.user_id
GROUP BY cp.user_id;

-- Create notifications table for price alerts and updates
CREATE TABLE public.customer_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'general', -- 'price_alert', 'wishlist_update', 'trip_reminder', 'general'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_trip_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.customer_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.customer_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Admin can manage all notifications
CREATE POLICY "Admin can manage all notifications" 
ON public.customer_notifications 
FOR ALL 
USING (auth.email() = 'kenny_hermans93@hotmail.com') 
WITH CHECK (auth.email() = 'kenny_hermans93@hotmail.com');

-- Create trigger for updated_at timestamps
CREATE TRIGGER update_customer_wishlists_updated_at
BEFORE UPDATE ON public.customer_wishlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_notifications_updated_at
BEFORE UPDATE ON public.customer_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();