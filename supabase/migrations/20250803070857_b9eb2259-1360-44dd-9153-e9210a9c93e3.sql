-- Create admin roles table for proper role-based access control
CREATE TABLE public.admin_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles 
    WHERE admin_roles.user_id = is_admin.user_id 
    AND admin_roles.is_active = true
  );
$$;

-- Create policies for admin_roles table
CREATE POLICY "Admins can view all admin roles" 
ON public.admin_roles 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Admins can manage admin roles" 
ON public.admin_roles 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Insert the current hardcoded admin as the first admin
-- This ensures continuity during the migration
INSERT INTO public.admin_roles (user_id, role, granted_by, is_active)
SELECT u.id, 'admin', u.id, true
FROM auth.users u
WHERE u.email = 'kenny_hermans93@hotmail.com';

-- Create trigger for updated_at
CREATE TRIGGER update_admin_roles_updated_at
BEFORE UPDATE ON public.admin_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update all existing RLS policies to use the new is_admin function
-- Applications table
DROP POLICY IF EXISTS "Admin can update all applications" ON public.applications;
DROP POLICY IF EXISTS "Admin can view all applications" ON public.applications;

CREATE POLICY "Admin can update all applications" 
ON public.applications 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admin can view all applications" 
ON public.applications 
FOR SELECT 
USING (public.is_admin());

-- Admin announcements table
DROP POLICY IF EXISTS "Admin can manage all admin announcements" ON public.admin_announcements;

CREATE POLICY "Admin can manage all admin announcements" 
ON public.admin_announcements 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Announcements table  
DROP POLICY IF EXISTS "Admin can manage all announcements" ON public.announcements;

CREATE POLICY "Admin can manage all announcements" 
ON public.announcements 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Backup sensei applications table
DROP POLICY IF EXISTS "Admin can manage all backup applications" ON public.backup_sensei_applications;

CREATE POLICY "Admin can manage all backup applications" 
ON public.backup_sensei_applications 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Customer documents table
DROP POLICY IF EXISTS "Admin can view all documents" ON public.customer_documents;

CREATE POLICY "Admin can view all documents" 
ON public.customer_documents 
FOR SELECT 
USING (public.is_admin());

-- Customer notifications table
DROP POLICY IF EXISTS "Admin can manage all notifications" ON public.customer_notifications;

CREATE POLICY "Admin can manage all notifications" 
ON public.customer_notifications 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Customer profiles table
DROP POLICY IF EXISTS "Admin can view all customer profiles" ON public.customer_profiles;

CREATE POLICY "Admin can view all customer profiles" 
ON public.customer_profiles 
FOR SELECT 
USING (public.is_admin());

-- Customer todos table
DROP POLICY IF EXISTS "Admin can manage all todos" ON public.customer_todos;

CREATE POLICY "Admin can manage all todos" 
ON public.customer_todos 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Payment failures table
DROP POLICY IF EXISTS "Admin can manage all payment failures" ON public.payment_failures;

CREATE POLICY "Admin can manage all payment failures" 
ON public.payment_failures 
FOR ALL 
USING (public.is_admin());

-- Payment plans table
DROP POLICY IF EXISTS "Admin can manage all payment plans" ON public.payment_plans;

CREATE POLICY "Admin can manage all payment plans" 
ON public.payment_plans 
FOR ALL 
USING (public.is_admin());

-- Payment reminders table
DROP POLICY IF EXISTS "Admin can manage all payment reminders" ON public.payment_reminders;

CREATE POLICY "Admin can manage all payment reminders" 
ON public.payment_reminders 
FOR ALL 
USING (public.is_admin());

-- Payment settings table
DROP POLICY IF EXISTS "Admin can manage payment settings" ON public.payment_settings;

CREATE POLICY "Admin can manage payment settings" 
ON public.payment_settings 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Sensei certificates table
DROP POLICY IF EXISTS "Admin can manage all certificates" ON public.sensei_certificates;

CREATE POLICY "Admin can manage all certificates" 
ON public.sensei_certificates 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Sensei feedback table
DROP POLICY IF EXISTS "Only admins can view sensei feedback" ON public.sensei_feedback;

CREATE POLICY "Only admins can view sensei feedback" 
ON public.sensei_feedback 
FOR SELECT 
USING (public.is_admin());

-- Sensei goals table
DROP POLICY IF EXISTS "Admin can manage all goals" ON public.sensei_goals;

CREATE POLICY "Admin can manage all goals" 
ON public.sensei_goals 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Sensei milestones table
DROP POLICY IF EXISTS "Admin can manage all milestones" ON public.sensei_milestones;

CREATE POLICY "Admin can manage all milestones" 
ON public.sensei_milestones 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Sensei skills table
DROP POLICY IF EXISTS "Admin can manage all skills" ON public.sensei_skills;

CREATE POLICY "Admin can manage all skills" 
ON public.sensei_skills 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Trip bookings table
DROP POLICY IF EXISTS "Admin can update all bookings" ON public.trip_bookings;
DROP POLICY IF EXISTS "Admin can view all bookings" ON public.trip_bookings;

CREATE POLICY "Admin can update all bookings" 
ON public.trip_bookings 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admin can view all bookings" 
ON public.trip_bookings 
FOR SELECT 
USING (public.is_admin());

-- Trip cancellations table
DROP POLICY IF EXISTS "Admin can manage cancellations" ON public.trip_cancellations;
DROP POLICY IF EXISTS "Admin can view all cancellations" ON public.trip_cancellations;

CREATE POLICY "Admin can manage cancellations" 
ON public.trip_cancellations 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Trip messages table
DROP POLICY IF EXISTS "Admin can view all messages" ON public.trip_messages;

CREATE POLICY "Admin can view all messages" 
ON public.trip_messages 
FOR SELECT 
USING (public.is_admin());

-- Trip permissions table
DROP POLICY IF EXISTS "Admin can manage all trip permissions" ON public.trip_permissions;

CREATE POLICY "Admin can manage all trip permissions" 
ON public.trip_permissions 
FOR ALL 
USING (public.is_admin());

-- Trip requirements table
DROP POLICY IF EXISTS "Admin can manage all trip requirements" ON public.trip_requirements;

CREATE POLICY "Admin can manage all trip requirements" 
ON public.trip_requirements 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Trips table
DROP POLICY IF EXISTS "Admin can delete trips" ON public.trips;
DROP POLICY IF EXISTS "Admin can insert trips" ON public.trips;
DROP POLICY IF EXISTS "Admin can update all trips" ON public.trips;
DROP POLICY IF EXISTS "Admin can view all trips" ON public.trips;

CREATE POLICY "Admin can delete trips" 
ON public.trips 
FOR DELETE 
USING (public.is_admin());

CREATE POLICY "Admin can insert trips" 
ON public.trips 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update all trips" 
ON public.trips 
FOR UPDATE 
USING (public.is_admin());

CREATE POLICY "Admin can view all trips" 
ON public.trips 
FOR SELECT 
USING (public.is_admin());

-- Create audit log table for admin actions
CREATE TABLE public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" 
ON public.admin_audit_log 
FOR SELECT 
USING (public.is_admin());

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  action_type TEXT,
  table_name TEXT DEFAULT NULL,
  record_id UUID DEFAULT NULL,
  old_values JSONB DEFAULT NULL,
  new_values JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    action_type,
    table_name,
    record_id,
    old_values,
    new_values
  );
END;
$$;