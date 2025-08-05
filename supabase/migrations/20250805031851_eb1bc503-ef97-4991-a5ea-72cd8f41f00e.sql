-- Function to search users by email
CREATE OR REPLACE FUNCTION public.search_users_by_email(email_pattern text)
RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can search users
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    au.created_at
  FROM auth.users au
  WHERE au.email ILIKE '%' || email_pattern || '%'
  AND au.email_confirmed_at IS NOT NULL
  ORDER BY au.email
  LIMIT 20;
END;
$$;