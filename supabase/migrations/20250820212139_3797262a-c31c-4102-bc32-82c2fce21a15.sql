-- Final fix for applications table RLS
-- Ensure the applications table has proper RLS enabled and policies are active

-- First ensure RLS is enabled
ALTER TABLE IF EXISTS public.applications ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view applications" ON public.applications;
    DROP POLICY IF EXISTS "Admins can manage all applications" ON public.applications;  
    DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;
    DROP POLICY IF EXISTS "Users can update their own applications" ON public.applications;
    DROP POLICY IF EXISTS "Users can create their own applications" ON public.applications;
EXCEPTION
    WHEN undefined_table THEN
        -- Table doesn't exist, so no policies to drop
        NULL;
END $$;

-- Only proceed with policy creation if table exists
DO $$ BEGIN
    -- Check if table exists first
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications' AND table_schema = 'public') THEN
        -- Create secure policies
        EXECUTE 'CREATE POLICY "Admins can manage all applications" ON public.applications FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
        EXECUTE 'CREATE POLICY "Users can view their own applications" ON public.applications FOR SELECT USING (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can create their own applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id)';
        EXECUTE 'CREATE POLICY "Users can update their own applications" ON public.applications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
    END IF;
END $$;