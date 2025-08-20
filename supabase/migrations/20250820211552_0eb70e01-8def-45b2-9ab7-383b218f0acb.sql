-- Fix critical RLS security vulnerabilities (safe version)

-- 1. Create missing tables if they don't exist
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

-- 2. Enable RLS on these tables
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

-- 3. Drop and recreate policies for applications table
DROP POLICY IF EXISTS "Public can view applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can manage all applications" ON public.applications;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update their own applications" ON public.applications;

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

-- 4. Drop and recreate policies for customer_profiles table  
DROP POLICY IF EXISTS "Public can view customer profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Admins can manage all customer profiles" ON public.customer_profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.customer_profiles;

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

-- 5. Create policies for payment_plans table
DROP POLICY IF EXISTS "Admins can manage all payment plans" ON public.payment_plans;
DROP POLICY IF EXISTS "Users can view their own payment plans" ON public.payment_plans;

CREATE POLICY "Admins can manage all payment plans" 
ON public.payment_plans 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can view their own payment plans" 
ON public.payment_plans 
FOR SELECT 
USING (auth.uid() = user_id);

-- 6. Secure the admin audit log better (it should only be accessible to admins)
-- The existing policy should be fine, just ensure no public access

-- 7. Update function search paths for security (fix existing functions)
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