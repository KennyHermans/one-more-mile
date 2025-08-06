-- Fix the get_comprehensive_system_status function that has SQL errors
DROP FUNCTION IF EXISTS public.get_comprehensive_system_status();

CREATE OR REPLACE FUNCTION public.get_comprehensive_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  result jsonb;
  db_health jsonb;
  auth_health jsonb;
  storage_health jsonb;
  functions_health jsonb;
  table_stats jsonb;
BEGIN
  -- Database health check
  BEGIN
    SELECT jsonb_build_object(
      'status', 'healthy',
      'connections', (SELECT count(*) FROM pg_stat_activity),
      'database_size', pg_size_pretty(pg_database_size(current_database())),
      'active_queries', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active')
    ) INTO db_health;
  EXCEPTION WHEN OTHERS THEN
    db_health := jsonb_build_object('status', 'error', 'error', SQLERRM);
  END;

  -- Table statistics (fixed column reference)
  BEGIN
    SELECT jsonb_build_object(
      'total_tables', (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'),
      'table_sizes', (
        SELECT jsonb_object_agg(
          schemaname || '.' || tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
        )
        FROM pg_tables 
        WHERE schemaname = 'public'
        LIMIT 10
      )
    ) INTO table_stats;
  EXCEPTION WHEN OTHERS THEN
    table_stats := jsonb_build_object('status', 'error', 'error', SQLERRM);
  END;

  -- Auth health check (basic check)
  BEGIN
    SELECT jsonb_build_object(
      'status', 'healthy',
      'total_users', (SELECT count(*) FROM auth.users),
      'active_sessions', (SELECT count(*) FROM auth.sessions WHERE expires_at > now())
    ) INTO auth_health;
  EXCEPTION WHEN OTHERS THEN
    auth_health := jsonb_build_object('status', 'error', 'error', SQLERRM);
  END;

  -- Storage health check (basic check)
  BEGIN
    SELECT jsonb_build_object(
      'status', 'healthy',
      'total_objects', COALESCE((SELECT count(*) FROM storage.objects), 0),
      'total_buckets', COALESCE((SELECT count(*) FROM storage.buckets), 0)
    ) INTO storage_health;
  EXCEPTION WHEN OTHERS THEN
    storage_health := jsonb_build_object('status', 'error', 'error', SQLERRM);
  END;

  -- Functions health (basic check)
  BEGIN
    SELECT jsonb_build_object(
      'status', 'healthy',
      'total_functions', (
        SELECT count(*) 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_type = 'FUNCTION'
      )
    ) INTO functions_health;
  EXCEPTION WHEN OTHERS THEN
    functions_health := jsonb_build_object('status', 'error', 'error', SQLERRM);
  END;

  -- Combine all health checks
  result := jsonb_build_object(
    'timestamp', now(),
    'overall_status', CASE 
      WHEN (db_health->>'status' = 'healthy' AND 
            auth_health->>'status' = 'healthy' AND 
            storage_health->>'status' = 'healthy' AND 
            functions_health->>'status' = 'healthy') 
      THEN 'healthy'
      ELSE 'degraded'
    END,
    'components', jsonb_build_object(
      'database', db_health,
      'authentication', auth_health,
      'storage', storage_health,
      'functions', functions_health
    ),
    'statistics', table_stats,
    'metrics', jsonb_build_object(
      'uptime', extract(epoch from (now() - pg_postmaster_start_time())),
      'memory_usage', 'N/A',
      'cpu_usage', 'N/A'
    )
  );

  RETURN result;
END;
$$;

-- Create a simpler health check function for basic monitoring
CREATE OR REPLACE FUNCTION public.get_basic_health_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  RETURN jsonb_build_object(
    'status', 'healthy',
    'timestamp', now(),
    'database', 'connected',
    'version', version()
  );
END;
$$;