-- Create sensei level enum
CREATE TYPE public.sensei_level AS ENUM ('apprentice', 'journey_guide', 'master_sensei');

-- Add gamification columns to sensei_profiles
ALTER TABLE public.sensei_profiles 
ADD COLUMN sensei_level public.sensei_level DEFAULT 'apprentice',
ADD COLUMN level_achieved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN level_requirements_met JSONB DEFAULT '{}',
ADD COLUMN trip_edit_permissions JSONB DEFAULT '{}';

-- Create sensei level history table
CREATE TABLE public.sensei_level_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID NOT NULL,
  previous_level public.sensei_level,
  new_level public.sensei_level NOT NULL,
  changed_by UUID, -- admin who made the change, null for automatic
  change_reason TEXT,
  requirements_met JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create level requirements table for configuration
CREATE TABLE public.level_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level public.sensei_level NOT NULL UNIQUE,
  min_trips_completed INTEGER NOT NULL DEFAULT 0,
  min_average_rating NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  additional_requirements JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default level requirements
INSERT INTO public.level_requirements (level, min_trips_completed, min_average_rating, additional_requirements) VALUES
('apprentice', 0, 0.0, '{"profile_complete": true, "application_approved": true}'),
('journey_guide', 1, 4.0, '{"no_major_incidents": true, "profile_verification": true}'),
('master_sensei', 3, 4.5, '{"community_standing": "good", "advanced_training": false}');

-- Create sensei achievements table
CREATE TABLE public.sensei_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on new tables
ALTER TABLE public.sensei_level_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensei_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for sensei_level_history
CREATE POLICY "Admin can manage all level history" 
ON public.sensei_level_history 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Senseis can view their own level history" 
ON public.sensei_level_history 
FOR SELECT 
USING (sensei_id IN (
  SELECT id FROM public.sensei_profiles 
  WHERE user_id = auth.uid()
));

-- RLS policies for level_requirements
CREATE POLICY "Everyone can view level requirements" 
ON public.level_requirements 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage level requirements" 
ON public.level_requirements 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- RLS policies for sensei_achievements
CREATE POLICY "Admin can manage all achievements" 
ON public.sensei_achievements 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Senseis can view their own achievements" 
ON public.sensei_achievements 
FOR SELECT 
USING (sensei_id IN (
  SELECT id FROM public.sensei_profiles 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Senseis can create their own achievements" 
ON public.sensei_achievements 
FOR INSERT 
WITH CHECK (sensei_id IN (
  SELECT id FROM public.sensei_profiles 
  WHERE user_id = auth.uid()
));

-- Function to calculate sensei level eligibility
CREATE OR REPLACE FUNCTION public.calculate_sensei_level_eligibility(p_sensei_id UUID)
RETURNS TABLE(
  eligible_level public.sensei_level,
  requirements_met JSONB,
  next_level_requirements JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sensei_record RECORD;
  level_req RECORD;
  current_requirements JSONB := '{}';
  next_requirements JSONB := '{}';
  eligible_lvl public.sensei_level := 'apprentice';
BEGIN
  -- Get sensei details
  SELECT sp.*, COALESCE(sp.rating, 0) as avg_rating, COALESCE(sp.trips_led, 0) as completed_trips
  INTO sensei_record
  FROM public.sensei_profiles sp
  WHERE sp.id = p_sensei_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sensei not found: %', p_sensei_id;
  END IF;

  -- Check each level requirement
  FOR level_req IN 
    SELECT * FROM public.level_requirements 
    ORDER BY 
      CASE level 
        WHEN 'apprentice' THEN 1 
        WHEN 'journey_guide' THEN 2 
        WHEN 'master_sensei' THEN 3 
      END
  LOOP
    -- Check if sensei meets this level's requirements
    IF sensei_record.completed_trips >= level_req.min_trips_completed 
       AND sensei_record.avg_rating >= level_req.min_average_rating THEN
      
      eligible_lvl := level_req.level;
      current_requirements := jsonb_build_object(
        'trips_completed', sensei_record.completed_trips,
        'average_rating', sensei_record.avg_rating,
        'requirements_met', true,
        'level', level_req.level
      );
    ELSE
      -- This is the next level they're working towards
      next_requirements := jsonb_build_object(
        'required_trips', level_req.min_trips_completed,
        'required_rating', level_req.min_average_rating,
        'current_trips', sensei_record.completed_trips,
        'current_rating', sensei_record.avg_rating,
        'level', level_req.level
      );
      EXIT; -- Stop checking higher levels
    END IF;
  END LOOP;

  RETURN QUERY SELECT eligible_lvl, current_requirements, next_requirements;
END;
$$;

-- Function to upgrade sensei level
CREATE OR REPLACE FUNCTION public.upgrade_sensei_level(
  p_sensei_id UUID, 
  p_new_level public.sensei_level,
  p_changed_by UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Automatic level progression'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_level public.sensei_level;
  requirements_check RECORD;
BEGIN
  -- Get current level
  SELECT sensei_level INTO current_level
  FROM public.sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sensei not found: %', p_sensei_id;
  END IF;

  -- If admin override, allow any level change
  IF p_changed_by IS NOT NULL AND is_admin() THEN
    -- Admin can set any level
  ELSE
    -- Check if sensei meets requirements for new level
    SELECT * INTO requirements_check
    FROM public.calculate_sensei_level_eligibility(p_sensei_id);
    
    IF requirements_check.eligible_level::TEXT < p_new_level::TEXT THEN
      RAISE EXCEPTION 'Sensei does not meet requirements for level: %', p_new_level;
    END IF;
  END IF;

  -- Update sensei level
  UPDATE public.sensei_profiles
  SET 
    sensei_level = p_new_level,
    level_achieved_at = now(),
    level_requirements_met = COALESCE(requirements_check.requirements_met, '{}')
  WHERE id = p_sensei_id;

  -- Record level change history
  INSERT INTO public.sensei_level_history (
    sensei_id,
    previous_level,
    new_level,
    changed_by,
    change_reason,
    requirements_met
  ) VALUES (
    p_sensei_id,
    current_level,
    p_new_level,
    p_changed_by,
    p_reason,
    COALESCE(requirements_check.requirements_met, '{}')
  );

  -- Create achievement record for level up
  IF current_level != p_new_level THEN
    INSERT INTO public.sensei_achievements (
      sensei_id,
      achievement_type,
      achievement_name,
      achievement_description,
      metadata
    ) VALUES (
      p_sensei_id,
      'level_progression',
      'Level Up: ' || REPLACE(INITCAP(p_new_level::TEXT), '_', ' '),
      'Congratulations! You have advanced to ' || REPLACE(INITCAP(p_new_level::TEXT), '_', ' ') || ' level.',
      jsonb_build_object('previous_level', current_level, 'new_level', p_new_level)
    );
  END IF;

  RETURN TRUE;
END;
$$;

-- Function to get sensei permissions based on level
CREATE OR REPLACE FUNCTION public.get_sensei_permissions(p_sensei_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sensei_level_val public.sensei_level;
  permissions JSONB := '{}';
BEGIN
  -- Get sensei level
  SELECT sensei_level INTO sensei_level_val
  FROM public.sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN '{"error": "Sensei not found"}'::JSONB;
  END IF;

  -- Set permissions based on level
  CASE sensei_level_val
    WHEN 'apprentice' THEN
      permissions := '{
        "can_view_trips": true,
        "can_apply_backup": true,
        "can_edit_profile": true,
        "can_edit_trips": false,
        "can_create_trips": false,
        "can_use_ai_builder": false,
        "can_publish_trips": false,
        "can_modify_pricing": false,
        "trip_edit_fields": []
      }'::JSONB;
    
    WHEN 'journey_guide' THEN
      permissions := '{
        "can_view_trips": true,
        "can_apply_backup": true,
        "can_edit_profile": true,
        "can_edit_trips": true,
        "can_create_trips": false,
        "can_use_ai_builder": false,
        "can_publish_trips": false,
        "can_modify_pricing": false,
        "trip_edit_fields": ["description", "itinerary", "included_items", "excluded_items", "requirements", "difficulty_level"]
      }'::JSONB;
    
    WHEN 'master_sensei' THEN
      permissions := '{
        "can_view_trips": true,
        "can_apply_backup": true,
        "can_edit_profile": true,
        "can_edit_trips": true,
        "can_create_trips": true,
        "can_use_ai_builder": true,
        "can_publish_trips": true,
        "can_modify_pricing": true,
        "trip_edit_fields": ["title", "description", "itinerary", "included_items", "excluded_items", "requirements", "difficulty_level", "price", "dates", "group_size"]
      }'::JSONB;
  END CASE;

  RETURN permissions;
END;
$$;

-- Function to validate if sensei can perform action
CREATE OR REPLACE FUNCTION public.validate_sensei_action(p_sensei_id UUID, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  permissions JSONB;
  can_perform BOOLEAN := false;
BEGIN
  -- Get sensei permissions
  SELECT public.get_sensei_permissions(p_sensei_id) INTO permissions;

  -- Check if permission exists and is true
  IF permissions ? p_action THEN
    can_perform := (permissions ->> p_action)::BOOLEAN;
  END IF;

  RETURN can_perform;
END;
$$;

-- Trigger to auto-upgrade sensei levels when trip is completed
CREATE OR REPLACE FUNCTION public.check_sensei_level_progression()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sensei_record RECORD;
  level_check RECORD;
BEGIN
  -- Only process if trip status changed to completed or if rating was updated
  IF TG_TABLE_NAME = 'trips' AND (OLD.trip_status != 'completed' AND NEW.trip_status = 'completed') THEN
    -- Update sensei trips_led count
    UPDATE public.sensei_profiles 
    SET trips_led = trips_led + 1
    WHERE id = NEW.sensei_id;
    
    -- Check for level progression
    SELECT * INTO level_check
    FROM public.calculate_sensei_level_eligibility(NEW.sensei_id);
    
    -- Get current sensei level
    SELECT sensei_level INTO sensei_record
    FROM public.sensei_profiles
    WHERE id = NEW.sensei_id;
    
    -- Upgrade if eligible for higher level
    IF level_check.eligible_level != sensei_record.sensei_level THEN
      PERFORM public.upgrade_sensei_level(
        NEW.sensei_id, 
        level_check.eligible_level,
        NULL,
        'Automatic progression after trip completion'
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for trip completion
CREATE TRIGGER sensei_level_progression_trigger
  AFTER UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.check_sensei_level_progression();

-- Update existing sensei profiles to have default level data
UPDATE public.sensei_profiles 
SET 
  sensei_level = 'apprentice',
  level_achieved_at = created_at,
  level_requirements_met = '{"initial_setup": true}'
WHERE sensei_level IS NULL;