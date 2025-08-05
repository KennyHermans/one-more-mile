-- Recreate the function with the correct column name
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

  -- Create the request record first (using correct column name)
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

-- Handle Joost's specific case - create his missing request record
DO $$
DECLARE
  joost_sensei_id UUID;
  joost_user_id UUID;
BEGIN
  -- Find Joost's sensei profile (or any sensei with orphaned request)
  SELECT id, user_id INTO joost_sensei_id, joost_user_id
  FROM public.sensei_profiles 
  WHERE trip_creation_requested = true 
  AND NOT EXISTS (
    SELECT 1 FROM public.trip_creation_requests tcr 
    WHERE tcr.sensei_id = sensei_profiles.id
  )
  LIMIT 1;

  -- If found, create the missing request record
  IF joost_sensei_id IS NOT NULL THEN
    INSERT INTO public.trip_creation_requests (
      sensei_id,
      user_id,
      request_reason,
      status,
      created_at
    ) VALUES (
      joost_sensei_id,
      joost_user_id,
      'Request to create trips - retroactively created by system',
      'pending',
      NOW()
    );
    
    RAISE NOTICE 'Created missing trip creation request for sensei %', joost_sensei_id;
  END IF;
END;
$$;

-- Create a function to find and fix orphaned requests
CREATE OR REPLACE FUNCTION public.fix_orphaned_trip_creation_requests()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed_count INTEGER := 0;
  v_sensei_record RECORD;
BEGIN
  -- Only allow admins to run this function
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Find senseis with trip_creation_requested = true but no request record
  FOR v_sensei_record IN 
    SELECT sp.id, sp.user_id, sp.name
    FROM public.sensei_profiles sp
    WHERE sp.trip_creation_requested = true 
    AND NOT EXISTS (
      SELECT 1 FROM public.trip_creation_requests tcr 
      WHERE tcr.sensei_id = sp.id
    )
  LOOP
    -- Create missing request record
    INSERT INTO public.trip_creation_requests (
      sensei_id,
      user_id,
      request_reason,
      status,
      created_at
    ) VALUES (
      v_sensei_record.id,
      v_sensei_record.user_id,
      'Request retroactively created by admin - missing from original submission',
      'pending',
      NOW()
    );
    
    v_fixed_count := v_fixed_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'fixed_count', v_fixed_count,
    'message', 'Fixed ' || v_fixed_count || ' orphaned trip creation requests'
  );
END;
$$;