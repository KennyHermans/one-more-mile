-- First drop the default constraint and update the column type properly
ALTER TABLE public.admin_roles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.admin_roles DROP CONSTRAINT IF EXISTS admin_roles_role_check;

-- Create enum for platform roles (drop first if exists)
DROP TYPE IF EXISTS public.platform_role;
CREATE TYPE public.platform_role AS ENUM (
  'admin',
  'journey_curator', 
  'sensei_scout',
  'traveler_support'
);

-- Update admin_roles table to use the new enum
ALTER TABLE public.admin_roles ALTER COLUMN role TYPE platform_role USING role::text::platform_role;

-- Add new columns for role management
ALTER TABLE public.admin_roles 
ADD COLUMN IF NOT EXISTS role_description text,
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS assigned_by uuid;

-- Set the default value back to admin after the type change
ALTER TABLE public.admin_roles ALTER COLUMN role SET DEFAULT 'admin';

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