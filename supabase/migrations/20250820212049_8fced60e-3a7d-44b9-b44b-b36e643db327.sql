-- Final security cleanup - fix remaining function search paths

-- Fix all remaining functions that don't have secure search paths
CREATE OR REPLACE FUNCTION public.get_sensei_permissions(p_sensei_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  permissions JSONB;
BEGIN
  SELECT jsonb_build_object(
    'can_view_trips', slp.can_view_trips,
    'can_apply_backup', slp.can_apply_backup,
    'can_edit_profile', slp.can_edit_profile,
    'can_edit_trips', slp.can_edit_trips,
    'can_create_trips', slp.can_create_trips,
    'can_use_ai_builder', slp.can_use_ai_builder,
    'can_publish_trips', slp.can_publish_trips,
    'can_modify_pricing', slp.can_modify_pricing,
    'trip_edit_fields', COALESCE(
      ARRAY_AGG(slfp.field_name) FILTER (WHERE slfp.can_edit = true),
      ARRAY[]::text[]
    )
  ) INTO permissions
  FROM sensei_profiles sp
  JOIN sensei_level_permissions slp ON slp.sensei_level = sp.sensei_level
  LEFT JOIN sensei_level_field_permissions slfp ON slfp.sensei_level = sp.sensei_level
  WHERE sp.id = p_sensei_id
  GROUP BY slp.can_view_trips, slp.can_apply_backup, slp.can_edit_profile, 
           slp.can_edit_trips, slp.can_create_trips, slp.can_use_ai_builder, 
           slp.can_publish_trips, slp.can_modify_pricing;

  RETURN COALESCE(permissions, jsonb_build_object(
    'can_view_trips', false,
    'can_apply_backup', false,
    'can_edit_profile', false,
    'can_edit_trips', false,
    'can_create_trips', false,
    'can_use_ai_builder', false,
    'can_publish_trips', false,
    'can_modify_pricing', false,
    'trip_edit_fields', ARRAY[]::text[]
  ));
END;
$function$;

-- Create a security audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_user_id uuid DEFAULT auth.uid(),
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO admin_audit_log (
    admin_user_id,
    action,
    ip_address,
    user_agent,
    new_values,
    created_at
  ) VALUES (
    COALESCE(p_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    p_event_type,
    p_ip_address,
    p_user_agent,
    p_details,
    now()
  );
END;
$function$;

-- Create a secure function to validate sensitive operations
CREATE OR REPLACE FUNCTION public.validate_sensitive_operation(
  p_operation text,
  p_table_name text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  is_authorized boolean := false;
BEGIN
  -- Check if user is admin
  IF is_admin() THEN
    is_authorized := true;
  END IF;
  
  -- Log the attempt
  PERFORM log_security_event(
    'sensitive_operation_attempt',
    auth.uid(),
    NULL,
    NULL,
    jsonb_build_object(
      'operation', p_operation,
      'table_name', p_table_name,
      'record_id', p_record_id,
      'authorized', is_authorized
    )
  );
  
  RETURN is_authorized;
END;
$function$;