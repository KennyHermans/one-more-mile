-- Create configurable sensei level permissions system

-- Table to store configurable permissions for each sensei level
CREATE TABLE IF NOT EXISTS public.sensei_level_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_level public.sensei_level NOT NULL,
  can_view_trips BOOLEAN NOT NULL DEFAULT TRUE,
  can_apply_backup BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit_profile BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit_trips BOOLEAN NOT NULL DEFAULT FALSE,
  can_create_trips BOOLEAN NOT NULL DEFAULT FALSE,
  can_use_ai_builder BOOLEAN NOT NULL DEFAULT FALSE,
  can_publish_trips BOOLEAN NOT NULL DEFAULT FALSE,
  can_modify_pricing BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sensei_level)
);

-- Table to store field-level permissions for trip editing
CREATE TABLE IF NOT EXISTS public.sensei_level_field_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_level public.sensei_level NOT NULL,
  field_name TEXT NOT NULL,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sensei_level, field_name)
);

-- Insert default permissions for existing levels
INSERT INTO public.sensei_level_permissions (
  sensei_level, can_view_trips, can_apply_backup, can_edit_profile, 
  can_edit_trips, can_create_trips, can_use_ai_builder, 
  can_publish_trips, can_modify_pricing
) VALUES 
  ('apprentice', TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('journey_guide', TRUE, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE),
  ('master_sensei', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (sensei_level) DO NOTHING;

-- Insert default field permissions
INSERT INTO public.sensei_level_field_permissions (sensei_level, field_name, can_edit) VALUES
  -- Journey Guide permissions
  ('journey_guide', 'description', TRUE),
  ('journey_guide', 'program', TRUE),
  ('journey_guide', 'included_amenities', TRUE),
  ('journey_guide', 'excluded_items', TRUE),
  ('journey_guide', 'requirements', TRUE),
  
  -- Master Sensei permissions (all fields)
  ('master_sensei', 'title', TRUE),
  ('master_sensei', 'description', TRUE),
  ('master_sensei', 'destination', TRUE),
  ('master_sensei', 'theme', TRUE),
  ('master_sensei', 'dates', TRUE),
  ('master_sensei', 'price', TRUE),
  ('master_sensei', 'group_size', TRUE),
  ('master_sensei', 'included_amenities', TRUE),
  ('master_sensei', 'excluded_items', TRUE),
  ('master_sensei', 'requirements', TRUE),
  ('master_sensei', 'program', TRUE)
ON CONFLICT (sensei_level, field_name) DO NOTHING;

-- Enable RLS on the new tables
ALTER TABLE public.sensei_level_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensei_level_field_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sensei_level_permissions
CREATE POLICY "Admin can manage level permissions" ON public.sensei_level_permissions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Everyone can view level permissions" ON public.sensei_level_permissions
  FOR SELECT USING (TRUE);

-- RLS Policies for sensei_level_field_permissions  
CREATE POLICY "Admin can manage field permissions" ON public.sensei_level_field_permissions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Everyone can view field permissions" ON public.sensei_level_field_permissions
  FOR SELECT USING (TRUE);

-- Update the get_sensei_permissions function to use configurable permissions
CREATE OR REPLACE FUNCTION public.get_sensei_permissions(p_sensei_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sensei_level_val public.sensei_level;
  permissions JSONB := '{}';
  editable_fields TEXT[];
BEGIN
  -- Get sensei level
  SELECT sensei_level INTO sensei_level_val
  FROM public.sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN '{"error": "Sensei not found"}'::JSONB;
  END IF;

  -- Get permissions from configurable table
  SELECT jsonb_build_object(
    'can_view_trips', slp.can_view_trips,
    'can_apply_backup', slp.can_apply_backup,
    'can_edit_profile', slp.can_edit_profile,
    'can_edit_trips', slp.can_edit_trips,
    'can_create_trips', slp.can_create_trips,
    'can_use_ai_builder', slp.can_use_ai_builder,
    'can_publish_trips', slp.can_publish_trips,
    'can_modify_pricing', slp.can_modify_pricing
  ) INTO permissions
  FROM public.sensei_level_permissions slp
  WHERE slp.sensei_level = sensei_level_val;

  -- Get editable fields from configurable table
  SELECT ARRAY_AGG(field_name) INTO editable_fields
  FROM public.sensei_level_field_permissions slfp
  WHERE slfp.sensei_level = sensei_level_val AND slfp.can_edit = TRUE;

  -- Add trip_edit_fields to permissions
  permissions := permissions || jsonb_build_object('trip_edit_fields', COALESCE(editable_fields, ARRAY[]::TEXT[]));

  RETURN permissions;
END;
$function$;

-- Function to update sensei level permissions (admin only)
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

-- Trigger to update sensei permissions when level permissions change
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

-- Create triggers for permission changes
CREATE TRIGGER refresh_permissions_on_level_change
  AFTER UPDATE ON public.sensei_level_permissions
  FOR EACH ROW EXECUTE FUNCTION public.refresh_sensei_permissions_cache();

CREATE TRIGGER refresh_permissions_on_field_change
  AFTER UPDATE ON public.sensei_level_field_permissions
  FOR EACH ROW EXECUTE FUNCTION public.refresh_sensei_permissions_cache();