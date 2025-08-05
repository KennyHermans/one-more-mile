-- Create trip creation requests table
CREATE TABLE public.trip_creation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID NOT NULL,
  user_id UUID NOT NULL,
  request_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trip_creation_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for trip creation requests
CREATE POLICY "Admin can manage all trip creation requests"
  ON public.trip_creation_requests
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Senseis can create their own requests"
  ON public.trip_creation_requests
  FOR INSERT
  WITH CHECK (
    sensei_id IN (
      SELECT id FROM sensei_profiles 
      WHERE user_id = auth.uid()
    )
    AND auth.uid() = user_id
  );

CREATE POLICY "Senseis can view their own requests"
  ON public.trip_creation_requests
  FOR SELECT
  USING (
    sensei_id IN (
      SELECT id FROM sensei_profiles 
      WHERE user_id = auth.uid()
    )
    OR auth.uid() = user_id
  );

-- Create function to handle trip creation request
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
    SELECT 1 FROM sensei_profiles 
    WHERE id = p_sensei_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Sensei profile not found or access denied';
  END IF;

  -- Check if there's already a pending request
  SELECT id INTO v_existing_request
  FROM trip_creation_requests
  WHERE sensei_id = p_sensei_id 
  AND status = 'pending'
  LIMIT 1;

  IF v_existing_request IS NOT NULL THEN
    RAISE EXCEPTION 'A trip creation request is already pending for this sensei';
  END IF;

  -- Create the request
  INSERT INTO trip_creation_requests (
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
  UPDATE sensei_profiles
  SET 
    trip_creation_requested = TRUE,
    trip_creation_request_date = NOW()
  WHERE id = p_sensei_id;

  RETURN TRUE;
END;
$$;

-- Create function to approve/reject trip creation request
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
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can review trip creation requests';
  END IF;

  v_admin_id := auth.uid();

  -- Validate status
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Status must be either approved or rejected';
  END IF;

  -- Get sensei_id from request
  SELECT sensei_id INTO v_sensei_id
  FROM trip_creation_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_sensei_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Update the request
  UPDATE trip_creation_requests
  SET 
    status = p_status,
    reviewed_by = v_admin_id,
    reviewed_at = NOW(),
    review_notes = p_review_notes,
    updated_at = NOW()
  WHERE id = p_request_id;

  -- If approved, give sensei trip creation permission
  IF p_status = 'approved' THEN
    UPDATE sensei_profiles
    SET 
      can_create_trips = TRUE,
      trip_creation_requested = FALSE
    WHERE id = v_sensei_id;
  ELSE
    -- If rejected, reset request status
    UPDATE sensei_profiles
    SET 
      trip_creation_requested = FALSE,
      trip_creation_request_date = NULL
    WHERE id = v_sensei_id;
  END IF;

  RETURN TRUE;
END;
$$;