-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create configurable level requirements table
CREATE TABLE public.configurable_level_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_name TEXT NOT NULL UNIQUE,
  trips_required INTEGER NOT NULL DEFAULT 0,
  rating_required NUMERIC NOT NULL DEFAULT 0.0,
  additional_criteria JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create milestone achievements table
CREATE TABLE public.milestone_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID NOT NULL,
  milestone_type TEXT NOT NULL, -- 'progress_50', 'progress_75', 'progress_90', 'level_up'
  target_level TEXT NOT NULL,
  progress_percentage INTEGER NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(sensei_id, milestone_type, target_level)
);

-- Create field-level permissions configuration
CREATE TABLE public.sensei_field_permissions_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_level TEXT NOT NULL,
  field_category TEXT NOT NULL, -- 'profile', 'trip', 'settings'
  field_name TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sensei_level, field_category, field_name)
);

-- Enable RLS
ALTER TABLE public.configurable_level_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensei_field_permissions_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage configurable requirements" ON public.configurable_level_requirements
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admin can manage milestone achievements" ON public.milestone_achievements
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Senseis can view their milestones" ON public.milestone_achievements
FOR SELECT USING (sensei_id IN (SELECT id FROM sensei_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admin can manage field permissions" ON public.sensei_field_permissions_config
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Senseis can view field permissions" ON public.sensei_field_permissions_config
FOR SELECT USING (true);

-- Insert default configurable requirements (copy from existing static ones)
INSERT INTO public.configurable_level_requirements (level_name, trips_required, rating_required, additional_criteria) VALUES
('apprentice', 0, 0.0, '{"description": "Starting level for new senseis"}'),
('journey_guide', 5, 4.0, '{"description": "Mid-level with editing capabilities"}'),
('master_sensei', 15, 4.5, '{"description": "Expert level with full access"}');

-- Insert default field permissions
INSERT INTO public.sensei_field_permissions_config (sensei_level, field_category, field_name, can_view, can_edit) VALUES
-- Apprentice permissions
('apprentice', 'profile', 'name', true, true),
('apprentice', 'profile', 'bio', true, true),
('apprentice', 'profile', 'location', true, true),
('apprentice', 'profile', 'specialties', true, true),
('apprentice', 'trip', 'basic_details', true, false),
('apprentice', 'trip', 'pricing', true, false),

-- Journey Guide permissions  
('journey_guide', 'profile', 'name', true, true),
('journey_guide', 'profile', 'bio', true, true),
('journey_guide', 'profile', 'location', true, true),
('journey_guide', 'profile', 'specialties', true, true),
('journey_guide', 'trip', 'basic_details', true, true),
('journey_guide', 'trip', 'itinerary', true, true),
('journey_guide', 'trip', 'requirements', true, true),
('journey_guide', 'trip', 'pricing', true, false),

-- Master Sensei permissions
('master_sensei', 'profile', 'name', true, true),
('master_sensei', 'profile', 'bio', true, true),
('master_sensei', 'profile', 'location', true, true),
('master_sensei', 'profile', 'specialties', true, true),
('master_sensei', 'trip', 'basic_details', true, true),
('master_sensei', 'trip', 'itinerary', true, true),
('master_sensei', 'trip', 'requirements', true, true),
('master_sensei', 'trip', 'pricing', true, true),
('master_sensei', 'trip', 'advanced_features', true, true);