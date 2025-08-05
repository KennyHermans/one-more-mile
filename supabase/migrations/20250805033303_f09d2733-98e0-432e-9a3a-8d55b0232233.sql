-- Fix security warnings by setting search_path for functions

-- Fix function search path for refresh_sensei_permissions_cache
CREATE OR REPLACE FUNCTION public.refresh_sensei_permissions_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- This function can be used to trigger real-time updates when permissions change
  -- For now, it just returns the trigger object
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix function search path for update_sensei_level_permissions 
CREATE OR REPLACE FUNCTION public.update_sensei_level_permissions(
  p_sensei_level public.sensei_level,
  p_permissions jsonb,
  p_field_permissions jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  field_name TEXT;
  can_edit_value BOOLEAN;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Insufficient permissions to update level permissions';
  END IF;

  -- Update level permissions
  UPDATE public.sensei_level_permissions
  SET 
    can_view_trips = COALESCE((p_permissions->>'can_view_trips')::boolean, can_view_trips),
    can_apply_backup = COALESCE((p_permissions->>'can_apply_backup')::boolean, can_apply_backup),
    can_edit_profile = COALESCE((p_permissions->>'can_edit_profile')::boolean, can_edit_profile),
    can_edit_trips = COALESCE((p_permissions->>'can_edit_trips')::boolean, can_edit_trips),
    can_create_trips = COALESCE((p_permissions->>'can_create_trips')::boolean, can_create_trips),
    can_use_ai_builder = COALESCE((p_permissions->>'can_use_ai_builder')::boolean, can_use_ai_builder),
    can_publish_trips = COALESCE((p_permissions->>'can_publish_trips')::boolean, can_publish_trips),
    can_modify_pricing = COALESCE((p_permissions->>'can_modify_pricing')::boolean, can_modify_pricing),
    updated_at = now()
  WHERE sensei_level = p_sensei_level;

  -- Update field permissions if provided
  IF p_field_permissions != '{}'::jsonb THEN
    FOR field_name, can_edit_value IN SELECT * FROM jsonb_each_text(p_field_permissions)
    LOOP
      INSERT INTO public.sensei_level_field_permissions (sensei_level, field_name, can_edit)
      VALUES (p_sensei_level, field_name, can_edit_value::boolean)
      ON CONFLICT (sensei_level, field_name) 
      DO UPDATE SET can_edit = can_edit_value::boolean, updated_at = now();
    END LOOP;
  END IF;

  RETURN TRUE;
END;
$function$;