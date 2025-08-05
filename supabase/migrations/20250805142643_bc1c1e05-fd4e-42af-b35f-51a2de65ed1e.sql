-- Create table for sensei level permissions (general capabilities)
CREATE TABLE public.sensei_level_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_level TEXT NOT NULL,
  can_view_trips BOOLEAN NOT NULL DEFAULT true,
  can_apply_backup BOOLEAN NOT NULL DEFAULT true,
  can_edit_profile BOOLEAN NOT NULL DEFAULT true,
  can_edit_trips BOOLEAN NOT NULL DEFAULT false,
  can_create_trips BOOLEAN NOT NULL DEFAULT false,
  can_use_ai_builder BOOLEAN NOT NULL DEFAULT false,
  can_publish_trips BOOLEAN NOT NULL DEFAULT false,
  can_modify_pricing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sensei_level)
);

-- Create table for specific field permissions per sensei level
CREATE TABLE public.sensei_level_field_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_level TEXT NOT NULL,
  field_name TEXT NOT NULL,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sensei_level, field_name)
);

-- Enable RLS
ALTER TABLE public.sensei_level_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensei_level_field_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage level permissions" 
ON public.sensei_level_permissions 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Senseis can view level permissions" 
ON public.sensei_level_permissions 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage field permissions" 
ON public.sensei_level_field_permissions 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Senseis can view field permissions" 
ON public.sensei_level_field_permissions 
FOR SELECT 
USING (true);

-- Insert default permissions for each sensei level
INSERT INTO public.sensei_level_permissions (
  sensei_level, can_view_trips, can_apply_backup, can_edit_profile, 
  can_edit_trips, can_create_trips, can_use_ai_builder, 
  can_publish_trips, can_modify_pricing
) VALUES
  ('apprentice', true, true, true, false, false, false, false, false),
  ('journey_guide', true, true, true, true, false, true, false, false),
  ('master_sensei', true, true, true, true, true, true, true, true);

-- Insert default field permissions
INSERT INTO public.sensei_level_field_permissions (sensei_level, field_name, can_edit) VALUES
  -- Apprentice level - can only edit basic details
  ('apprentice', 'title', false),
  ('apprentice', 'description', true),
  ('apprentice', 'destination', false),
  ('apprentice', 'theme', false),
  ('apprentice', 'dates', false),
  ('apprentice', 'price', false),
  ('apprentice', 'group_size', false),
  ('apprentice', 'included_amenities', true),
  ('apprentice', 'excluded_items', true),
  ('apprentice', 'requirements', true),
  ('apprentice', 'program', true),
  
  -- Journey Guide level - can edit most fields except pricing
  ('journey_guide', 'title', true),
  ('journey_guide', 'description', true),
  ('journey_guide', 'destination', true),
  ('journey_guide', 'theme', true),
  ('journey_guide', 'dates', true),
  ('journey_guide', 'price', false),
  ('journey_guide', 'group_size', true),
  ('journey_guide', 'included_amenities', true),
  ('journey_guide', 'excluded_items', true),
  ('journey_guide', 'requirements', true),
  ('journey_guide', 'program', true),
  
  -- Master Sensei level - can edit everything
  ('master_sensei', 'title', true),
  ('master_sensei', 'description', true),
  ('master_sensei', 'destination', true),
  ('master_sensei', 'theme', true),
  ('master_sensei', 'dates', true),
  ('master_sensei', 'price', true),
  ('master_sensei', 'group_size', true),
  ('master_sensei', 'included_amenities', true),
  ('master_sensei', 'excluded_items', true),
  ('master_sensei', 'requirements', true),
  ('master_sensei', 'program', true);

-- Create function to refresh permissions cache when level permissions change
CREATE OR REPLACE FUNCTION public.refresh_sensei_permissions_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be used to trigger real-time updates when permissions change
  -- For now, it just returns the trigger object
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create triggers to refresh cache when permissions change
CREATE TRIGGER refresh_permissions_on_level_change
  AFTER INSERT OR UPDATE OR DELETE ON public.sensei_level_permissions
  FOR EACH ROW EXECUTE FUNCTION public.refresh_sensei_permissions_cache();

CREATE TRIGGER refresh_permissions_on_field_change
  AFTER INSERT OR UPDATE OR DELETE ON public.sensei_level_field_permissions
  FOR EACH ROW EXECUTE FUNCTION public.refresh_sensei_permissions_cache();