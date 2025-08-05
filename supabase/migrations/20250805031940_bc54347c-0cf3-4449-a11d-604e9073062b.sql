-- Enhanced function to revoke admin role with audit
CREATE OR REPLACE FUNCTION public.revoke_admin_role(
  p_role_id uuid,
  p_revoked_by uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Function to check if user can manage roles
CREATE OR REPLACE FUNCTION public.can_manage_roles(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE admin_roles.user_id = can_manage_roles.user_id 
    AND admin_roles.is_active = true
    AND admin_roles.role = 'admin'
  );
$$;