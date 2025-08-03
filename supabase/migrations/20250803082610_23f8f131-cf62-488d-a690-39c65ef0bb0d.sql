-- Expand admin roles to support multiple platform roles
-- First, update the admin_roles table to support different role types
ALTER TABLE public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_role_check;
ALTER TABLE public.admin_roles ALTER COLUMN role TYPE text;

-- Create enum for platform roles
CREATE TYPE public.platform_role AS ENUM (
  'admin',
  'journey_curator', 
  'sensei_scout',
  'traveler_support'
);

-- Update admin_roles table to use the new enum
ALTER TABLE public.admin_roles ALTER COLUMN role TYPE platform_role USING role::platform_role;

-- Add role descriptions and permissions
ALTER TABLE public.admin_roles 
ADD COLUMN IF NOT EXISTS role_description text,
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id);

-- Create role permissions function
CREATE OR REPLACE FUNCTION public.get_user_platform_role(user_id uuid DEFAULT auth.uid())
RETURNS platform_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT role FROM public.admin_roles 
  WHERE admin_roles.user_id = get_user_platform_role.user_id 
  AND is_active = true 
  LIMIT 1;
$$;

-- Enhanced admin check function with role support
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE admin_roles.user_id = is_admin.user_id 
    AND admin_roles.is_active = true
    AND admin_roles.role = 'admin'
  );
$$;

-- Permission check functions for different roles
CREATE OR REPLACE FUNCTION public.can_manage_trips(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE admin_roles.user_id = can_manage_trips.user_id 
    AND admin_roles.is_active = true
    AND admin_roles.role IN ('admin', 'journey_curator')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_senseis(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE admin_roles.user_id = can_manage_senseis.user_id 
    AND admin_roles.is_active = true
    AND admin_roles.role IN ('admin', 'sensei_scout')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_customers(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE admin_roles.user_id = can_view_customers.user_id 
    AND admin_roles.is_active = true
    AND admin_roles.role IN ('admin', 'traveler_support')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_finances(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE admin_roles.user_id = can_manage_finances.user_id 
    AND admin_roles.is_active = true
    AND admin_roles.role = 'admin'
  );
$$;

-- Insert the main admin role for kenny
INSERT INTO public.admin_roles (user_id, role, role_description, permissions, is_active, granted_at)
SELECT 
  auth.users.id,
  'admin'::platform_role,
  'Platform Administrator - Full control over all platform features',
  '{"manage_users": true, "manage_trips": true, "manage_payments": true, "manage_settings": true, "manage_content": true, "manage_permissions": true}'::jsonb,
  true,
  now()
FROM auth.users 
WHERE auth.users.email = 'kenny_hermans93@hotmail.com'
ON CONFLICT (user_id, role) DO UPDATE SET
  role_description = EXCLUDED.role_description,
  permissions = EXCLUDED.permissions,
  is_active = EXCLUDED.is_active,
  updated_at = now();