-- First, let's completely drop all versions of the function
DROP FUNCTION IF EXISTS public.request_trip_creation_permission(uuid, text) CASCADE;

-- Now recreate with JSON return type
CREATE OR REPLACE FUNCTION public.request_trip_creation_permission(
  p_sensei_id UUID,
  p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_request UUID;
  v_sensei_profile RECORD;
  v_request_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Validate sensei profile exists and belongs to user
  SELECT * INTO v_sensei_profile
  FROM public.sensei_profiles 
  WHERE id = p_sensei_id AND user_id = v_user_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid sensei profile');
  END IF;

  -- Check if sensei already has permission
  IF v_sensei_profile.can_create_trips = true THEN
    RETURN json_build_object('success', false, 'error', 'Already has trip creation permission');
  END IF;

  -- Check for existing pending request
  SELECT id INTO v_existing_request
  FROM public.trip_creation_requests
  WHERE sensei_id = p_sensei_id AND status = 'pending';
  
  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Request already pending');
  END IF;

  -- Create the request record first
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
  ) RETURNING id INTO v_request_id;

  -- Update sensei profile to mark request as submitted
  UPDATE public.sensei_profiles 
  SET 
    trip_creation_requested = true,
    trip_creation_request_date = NOW(),
    updated_at = NOW()
  WHERE id = p_sensei_id;

  RETURN json_build_object(
    'success', true, 
    'request_id', v_request_id,
    'message', 'Trip creation request submitted successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Database error: ' || SQLERRM
    );
END;
$$;