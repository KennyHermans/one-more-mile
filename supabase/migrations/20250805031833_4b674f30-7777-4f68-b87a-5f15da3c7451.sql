-- Create proper database functions for role management

-- Function to search users by email
CREATE OR REPLACE FUNCTION public.search_users_by_email(email_pattern text)
RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$

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
AS $function$
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
$function$

-- Enhanced function to revoke admin role with audit
CREATE OR REPLACE FUNCTION public.revoke_admin_role(
  p_role_id uuid,
  p_revoked_by uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role_record admin_roles;
  v_user_email text;
BEGIN
  -- Only admins can revoke roles
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Insufficient permissions to revoke roles';
  END IF;

  -- Get role details
  SELECT * INTO v_role_record
  FROM admin_roles ar
  WHERE ar.id = p_role_id AND ar.is_active = true;

  IF v_role_record.id IS NULL THEN
    RAISE EXCEPTION 'Role not found or already inactive';
  END IF;

  -- Get user email for audit
  SELECT au.email INTO v_user_email
  FROM auth.users au
  WHERE au.id = v_role_record.user_id;

  -- Revoke the role
  UPDATE admin_roles
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE id = p_role_id;

  -- Log the action in audit trail
  INSERT INTO admin_audit_log (
    admin_user_id,
    action,
    table_name,
    record_id,
    old_values
  ) VALUES (
    p_revoked_by,
    'REVOKE_ROLE',
    'admin_roles',
    p_role_id,
    jsonb_build_object(
      'user_email', v_user_email,
      'role', v_role_record.role,
      'user_id', v_role_record.user_id,
      'granted_by', v_role_record.granted_by,
      'granted_at', v_role_record.granted_at
    )
  );

  RETURN json_build_object(
    'success', true,
    'revoked_role_id', p_role_id
  );
END;
$function$

-- Function to check if user can manage roles
CREATE OR REPLACE FUNCTION public.can_manage_roles(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE admin_roles.user_id = can_manage_roles.user_id 
    AND admin_roles.is_active = true
    AND admin_roles.role = 'admin'
  );
$function$