-- Fix critical RLS security vulnerabilities

-- 1. Fix applications table - restrict to admins and application owners only
DROP POLICY IF EXISTS "Public can view applications" ON public.applications;

CREATE POLICY "Admins can manage all applications" 
ON public.applications 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view their own applications" 
ON public.applications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications" 
ON public.applications 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Fix customer_profiles - restrict to profile owner and admins only
DROP POLICY IF EXISTS "Public can view customer profiles" ON public.customer_profiles;

CREATE POLICY "Admins can manage all customer profiles" 
ON public.customer_profiles 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can manage their own profile" 
ON public.customer_profiles 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Fix payment_plans - restrict to plan owner and admins only
CREATE POLICY "Admins can manage all payment plans" 
ON public.payment_plans 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view their own payment plans" 
ON public.payment_plans 
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Fix trip_messages - already has proper policies, but let's ensure they're secure
-- The existing policies look correct - only participants can see messages

-- 5. Fix admin_audit_log - should only be viewable by admins
-- Already has correct policy "Admins can view audit logs"

-- 6. Create missing tables that were referenced but don't exist
CREATE TABLE IF NOT EXISTS public.applications (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    application_data jsonb DEFAULT '{}',
    submitted_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on applications table
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.payment_plans (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    trip_id uuid,
    total_amount numeric NOT NULL,
    paid_amount numeric DEFAULT 0,
    payment_schedule jsonb DEFAULT '[]',
    stripe_customer_id text,
    status text NOT NULL DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on payment_plans table
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

-- 7. Fix function search paths for security
-- Update existing functions to have secure search paths
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE admin_roles.user_id = is_admin.user_id 
    AND admin_roles.is_active = true
    AND admin_roles.role = 'admin'::platform_role
  );
$function$;

-- 8. Create a function to check if user can manage finances
CREATE OR REPLACE FUNCTION public.can_manage_finances(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER  
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE admin_roles.user_id = can_manage_finances.user_id 
    AND admin_roles.is_active = true
    AND admin_roles.role = 'admin'::platform_role
  );
$function$;