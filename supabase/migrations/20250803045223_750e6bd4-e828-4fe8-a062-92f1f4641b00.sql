-- Fix the search path warning by setting it explicitly
CREATE OR REPLACE FUNCTION public.get_customer_travel_stats(_user_id UUID)
RETURNS TABLE (
  trips_completed BIGINT,
  trips_pending BIGINT,
  total_spent NUMERIC,
  trips_wishlisted BIGINT,
  avg_rating_given NUMERIC,
  reviews_written BIGINT,
  preferred_themes TEXT[]
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(COUNT(DISTINCT tb.id) FILTER (WHERE tb.payment_status = 'paid'), 0) AS trips_completed,
    COALESCE(COUNT(DISTINCT tb.id) FILTER (WHERE tb.payment_status = 'pending'), 0) AS trips_pending,
    COALESCE(SUM(tb.total_amount) FILTER (WHERE tb.payment_status = 'paid'), 0) AS total_spent,
    COALESCE(COUNT(DISTINCT cw.id), 0) AS trips_wishlisted,
    COALESCE(AVG(tr.rating), 0) AS avg_rating_given,
    COALESCE(COUNT(DISTINCT tr.id), 0) AS reviews_written,
    ARRAY_AGG(DISTINCT t.theme) FILTER (WHERE t.theme IS NOT NULL) AS preferred_themes
  FROM public.customer_profiles cp
  LEFT JOIN public.trip_bookings tb ON tb.user_id = cp.user_id AND tb.user_id = _user_id
  LEFT JOIN public.trips t ON t.id = tb.trip_id
  LEFT JOIN public.customer_wishlists cw ON cw.user_id = cp.user_id AND cw.user_id = _user_id
  LEFT JOIN public.trip_reviews tr ON tr.user_id = cp.user_id AND tr.user_id = _user_id
  WHERE cp.user_id = _user_id
  GROUP BY cp.user_id;
END;
$$;