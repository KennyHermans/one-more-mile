-- Fix security warnings by setting search_path for functions

-- Fix function search path for request_trip_creation_permission
CREATE OR REPLACE FUNCTION public.request_trip_creation_permission(
  p_sensei_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_request UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Check if sensei belongs to user
  IF NOT EXISTS (
    SELECT 1 FROM public.sensei_profiles 
    WHERE id = p_sensei_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Sensei profile not found or access denied';
  END IF;

  -- Check if there's already a pending request
  SELECT id INTO v_existing_request
  FROM public.trip_creation_requests
  WHERE sensei_id = p_sensei_id 
  AND status = 'pending'
  LIMIT 1;

  IF v_existing_request IS NOT NULL THEN
    RAISE EXCEPTION 'A trip creation request is already pending for this sensei';
  END IF;

  -- Create the request
  INSERT INTO public.trip_creation_requests (
    sensei_id,
    user_id,
    request_reason,
    status
  ) VALUES (
    p_sensei_id,
    v_user_id,
    p_reason,
    'pending'
  );

  -- Update sensei profile to mark request as submitted
  UPDATE public.sensei_profiles
  SET 
    trip_creation_requested = TRUE,
    trip_creation_request_date = NOW()
  WHERE id = p_sensei_id;

  RETURN TRUE;
END;
$$;

-- Fix function search path for review_trip_creation_request
CREATE OR REPLACE FUNCTION public.review_trip_creation_request(
  p_request_id UUID,
  p_status TEXT,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sensei_id UUID;
  v_admin_id UUID;
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can review trip creation requests';
  END IF;

  v_admin_id := auth.uid();

  -- Validate status
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Status must be either approved or rejected';
  END IF;

  -- Get sensei_id from request
  SELECT sensei_id INTO v_sensei_id
  FROM public.trip_creation_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_sensei_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Update the request
  UPDATE public.trip_creation_requests
  SET 
    status = p_status,
    reviewed_by = v_admin_id,
    reviewed_at = NOW(),
    review_notes = p_review_notes,
    updated_at = NOW()
  WHERE id = p_request_id;

  -- If approved, give sensei trip creation permission
  IF p_status = 'approved' THEN
    UPDATE public.sensei_profiles
    SET 
      can_create_trips = TRUE,
      trip_creation_requested = FALSE
    WHERE id = v_sensei_id;
  ELSE
    -- If rejected, reset request status
    UPDATE public.sensei_profiles
    SET 
      trip_creation_requested = FALSE,
      trip_creation_request_date = NULL
    WHERE id = v_sensei_id;
  END IF;

  RETURN TRUE;
END;
$$;