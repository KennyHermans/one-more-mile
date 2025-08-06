-- Security Fix: Set proper search path for all functions to prevent potential security issues
-- This addresses the search path security warning from the linter

-- Update all existing functions to use explicit search path
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Loop through all functions in the public schema and set explicit search path
    FOR func_record IN 
        SELECT schemaname, functionname, arguments 
        FROM pg_functions 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp', 
                          func_record.schemaname, 
                          func_record.functionname, 
                          func_record.arguments);
        EXCEPTION WHEN OTHERS THEN
            -- Log any errors but continue processing
            RAISE NOTICE 'Could not update function %: %', func_record.functionname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Ensure future functions also have proper search path by creating a template
-- This will be applied to new functions automatically
CREATE OR REPLACE FUNCTION public.ensure_secure_search_path()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    obj record;
BEGIN
    -- Only process function creation events
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE FUNCTION'
    LOOP
        -- Set secure search path for newly created functions
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', obj.object_identity);
    END LOOP;
END;
$$;

-- Create event trigger to automatically secure new functions
DROP EVENT TRIGGER IF EXISTS secure_function_search_path_trigger;
CREATE EVENT TRIGGER secure_function_search_path_trigger
ON ddl_command_end
WHEN TAG IN ('CREATE FUNCTION')
EXECUTE FUNCTION public.ensure_secure_search_path();

-- Create a comprehensive system health check function for production monitoring
CREATE OR REPLACE FUNCTION public.get_comprehensive_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    result jsonb;
    db_size bigint;
    active_connections int;
    table_stats jsonb;
BEGIN
    -- Get database size
    SELECT pg_database_size(current_database()) INTO db_size;
    
    -- Get active connections
    SELECT count(*) FROM pg_stat_activity WHERE state = 'active' INTO active_connections;
    
    -- Get table statistics
    SELECT jsonb_object_agg(schemaname || '.' || tablename, 
           jsonb_build_object(
               'row_count', n_tup_ins - n_tup_del,
               'size_bytes', pg_total_relation_size(schemaname||'.'||tablename)
           )
    ) INTO table_stats
    FROM pg_stat_user_tables
    WHERE schemaname = 'public';
    
    -- Build comprehensive status
    result := jsonb_build_object(
        'timestamp', now(),
        'database', jsonb_build_object(
            'size_bytes', db_size,
            'size_mb', round(db_size / 1024.0 / 1024.0, 2),
            'active_connections', active_connections,
            'max_connections', current_setting('max_connections')::int
        ),
        'tables', table_stats,
        'performance', jsonb_build_object(
            'avg_query_time_ms', (SELECT avg(mean_exec_time) FROM pg_stat_statements LIMIT 1),
            'cache_hit_ratio', (
                SELECT round(
                    100.0 * sum(heap_blks_hit) / nullif(sum(heap_blks_hit + heap_blks_read), 0), 
                    2
                ) 
                FROM pg_statio_user_tables
            )
        ),
        'security', jsonb_build_object(
            'rls_enabled_tables', (
                SELECT count(*) FROM pg_tables 
                WHERE schemaname = 'public' AND rowsecurity = true
            ),
            'total_tables', (
                SELECT count(*) FROM pg_tables WHERE schemaname = 'public'
            )
        )
    );
    
    RETURN result;
END;
$$;

-- Create production monitoring alerts table for tracking system issues
CREATE TABLE IF NOT EXISTS public.production_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title text NOT NULL,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}',
    is_resolved boolean DEFAULT false,
    resolved_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on production alerts (admin only access)
ALTER TABLE public.production_alerts ENABLE ROW LEVEL SECURITY;

-- Policy for admin users to manage production alerts
CREATE POLICY "Admins can manage production alerts"
ON public.production_alerts
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.admin_roles ar
        WHERE ar.user_id = auth.uid()
        AND ar.is_active = true
        AND ar.role = 'admin'
    )
);

-- Create function to log production alerts
CREATE OR REPLACE FUNCTION public.log_production_alert(
    p_alert_type text,
    p_severity text,
    p_title text,
    p_message text,
    p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    alert_id uuid;
BEGIN
    -- Insert new alert
    INSERT INTO public.production_alerts (
        alert_type,
        severity,
        title,
        message,
        metadata
    ) VALUES (
        p_alert_type,
        p_severity,
        p_title,
        p_message,
        p_metadata
    ) RETURNING id INTO alert_id;
    
    -- If critical, also create admin alert for immediate attention
    IF p_severity = 'critical' THEN
        INSERT INTO public.admin_alerts (
            alert_type,
            title,
            message,
            priority,
            metadata
        ) VALUES (
            'production_critical',
            'CRITICAL: ' || p_title,
            p_message,
            'critical',
            p_metadata || jsonb_build_object('production_alert_id', alert_id)
        );
    END IF;
    
    RETURN alert_id;
END;
$$;

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_production_alerts_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_production_alerts_timestamp
    BEFORE UPDATE ON public.production_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_production_alerts_timestamp();