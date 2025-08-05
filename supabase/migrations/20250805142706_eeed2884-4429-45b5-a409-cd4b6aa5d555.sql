-- Fix the search path for the refresh function
CREATE OR REPLACE FUNCTION public.refresh_sensei_permissions_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function can be used to trigger real-time updates when permissions change
  -- For now, it just returns the trigger object
  RETURN COALESCE(NEW, OLD);
END;
$$;