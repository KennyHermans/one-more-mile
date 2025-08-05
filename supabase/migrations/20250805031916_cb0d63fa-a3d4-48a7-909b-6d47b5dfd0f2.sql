-- Function to assign admin role
CREATE OR REPLACE FUNCTION public.assign_admin_role(
  p_user_email text, 
  p_role platform_role,
  p_assigned_by uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_existing_role_id uuid;
  v_new_role_id uuid;
BEGIN
  -- Only admins can assign roles
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Insufficient permissions to assign roles';
  END IF;

  -- Find user by email
  SELECT au.id INTO v_user_id
  FROM auth.users au
  WHERE au.email = p_user_email
  AND au.email_confirmed_at IS NOT NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found or email not confirmed: %', p_user_email;
  END IF;

  -- Check if user already has this role
  SELECT id INTO v_existing_role_id
  FROM admin_roles ar
  WHERE ar.user_id = v_user_id
  AND ar.role = p_role
  AND ar.is_active = true;

  IF v_existing_role_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already has the role: %', p_role;
  END IF;

  -- Assign new role
  INSERT INTO admin_roles (
    user_id,
    role,
    granted_by,
    granted_at,
    role_description
  ) VALUES (
    v_user_id,
    p_role,
    p_assigned_by,
    NOW(),
    CASE p_role
      WHEN 'admin' THEN 'Full administrative access to all platform features'
      WHEN 'journey_curator' THEN 'Can manage trips and travel content'
      WHEN 'sensei_scout' THEN 'Can manage sensei applications and profiles'
      WHEN 'traveler_support' THEN 'Can view customer data and provide support'
      ELSE 'Custom administrative role'
    END
  ) RETURNING id INTO v_new_role_id;

  -- Log the action in audit trail
  INSERT INTO admin_audit_log (
    admin_user_id,
    action,
    table_name,
    record_id,
    new_values
  ) VALUES (
    p_assigned_by,
    'ASSIGN_ROLE',
    'admin_roles',
    v_new_role_id,
    jsonb_build_object(
      'user_email', p_user_email,
      'role', p_role,
      'user_id', v_user_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'role_id', v_new_role_id,
    'user_id', v_user_id,
    'role', p_role
  );
END;
$$;