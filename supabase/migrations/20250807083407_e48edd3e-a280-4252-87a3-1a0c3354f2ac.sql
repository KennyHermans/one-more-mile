-- Fix security warnings by setting proper search_path for functions

-- Update the trip permission requirements function
CREATE OR REPLACE FUNCTION public.update_trip_permission_requirements()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- When a trip is created, set the required permission level based on creator
  IF TG_OP = 'INSERT' AND NEW.sensei_id IS NOT NULL THEN
    NEW.created_by_sensei_level := (
      SELECT sensei_level FROM public.sensei_profiles WHERE id = NEW.sensei_id
    );
    NEW.required_permission_level := NEW.created_by_sensei_level;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the grant permission function
CREATE OR REPLACE FUNCTION public.grant_trip_specific_permission(
  p_trip_id UUID,
  p_sensei_id UUID,
  p_elevated_level TEXT,
  p_reason TEXT DEFAULT 'System-granted for sensei replacement'
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Insert or update the elevated permission
  INSERT INTO public.trip_specific_permissions (
    trip_id,
    sensei_id,
    elevated_level,
    granted_reason,
    is_active
  ) VALUES (
    p_trip_id,
    p_sensei_id,
    p_elevated_level,
    p_reason,
    true
  )
  ON CONFLICT (trip_id, sensei_id) 
  DO UPDATE SET
    elevated_level = EXCLUDED.elevated_level,
    granted_reason = EXCLUDED.granted_reason,
    is_active = true,
    updated_at = now();
  
  result := jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'sensei_id', p_sensei_id,
    'elevated_level', p_elevated_level
  );
  
  RETURN result;
END;
$$;

-- Update the revoke permission function
CREATE OR REPLACE FUNCTION public.revoke_trip_specific_permission(
  p_trip_id UUID,
  p_sensei_id UUID
)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  UPDATE public.trip_specific_permissions
  SET is_active = false, updated_at = now()
  WHERE trip_id = p_trip_id AND sensei_id = p_sensei_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'revoked', true
  );
END;
$$;