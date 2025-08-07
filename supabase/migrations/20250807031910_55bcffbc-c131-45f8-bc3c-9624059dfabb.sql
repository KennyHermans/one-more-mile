-- Enhanced Admin Trip Builder Schema Updates (Fixed Version)
-- Phase 1: Core Enhancement Tables

-- 1. Trip Templates System
CREATE TABLE IF NOT EXISTS trip_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('destination', 'theme', 'duration', 'custom')),
  destination TEXT,
  theme TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Enhanced Trip Media Management
CREATE TABLE IF NOT EXISTS trip_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', '360_photo')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  alt_text TEXT,
  ai_tags TEXT[],
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Activity Library for Smart Suggestions
CREATE TABLE IF NOT EXISTS activity_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_name TEXT NOT NULL,
  category TEXT NOT NULL,
  destination_type TEXT[],
  themes TEXT[],
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'moderate', 'challenging', 'extreme')),
  duration_hours NUMERIC,
  estimated_cost_range JSONB,
  description TEXT,
  requirements TEXT[],
  best_season TEXT[],
  equipment_needed TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Trip Workflow and Collaboration
CREATE TABLE IF NOT EXISTS trip_workflow_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  change_reason TEXT,
  approval_level INTEGER DEFAULT 1,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Collaboration Comments System
CREATE TABLE IF NOT EXISTS trip_collaboration_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID,
  comment_text TEXT NOT NULL,
  comment_type TEXT DEFAULT 'general' CHECK (comment_type IN ('general', 'approval', 'suggestion', 'issue')),
  field_reference TEXT,
  is_resolved BOOLEAN DEFAULT false,
  parent_comment_id UUID REFERENCES trip_collaboration_comments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Enhanced Trip Analytics
CREATE TABLE IF NOT EXISTS trip_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metric_data JSONB,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE
);

-- 7. Sensei Availability Calendar (Fixed GIST constraint)
CREATE TABLE IF NOT EXISTS sensei_availability_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID REFERENCES sensei_profiles(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  availability_type TEXT CHECK (availability_type IN ('available', 'unavailable', 'conditional')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add unique constraint to prevent overlapping dates (alternative to GIST)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sensei_availability_no_overlap 
ON sensei_availability_calendar (sensei_id, date_from, date_to);

-- Add enhanced columns to existing trips table
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS trip_status_workflow TEXT DEFAULT 'draft' 
  CHECK (trip_status_workflow IN ('draft', 'review', 'approved', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS auto_save_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_auto_save TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_by_admin UUID,
ADD COLUMN IF NOT EXISTS pricing_intelligence JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_generated_content JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES trip_templates(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_templates_category ON trip_templates(category);
CREATE INDEX IF NOT EXISTS idx_trip_templates_created_by ON trip_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_trip_media_trip_id ON trip_media(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_media_type ON trip_media(media_type);
CREATE INDEX IF NOT EXISTS idx_activity_library_category ON activity_library(category);
CREATE INDEX IF NOT EXISTS idx_activity_library_themes ON activity_library USING GIN(themes);
CREATE INDEX IF NOT EXISTS idx_trip_workflow_trip_id ON trip_workflow_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_comments_trip_id ON trip_collaboration_comments(trip_id);
CREATE INDEX IF NOT EXISTS idx_sensei_availability_sensei_id ON sensei_availability_calendar(sensei_id);
CREATE INDEX IF NOT EXISTS idx_sensei_availability_dates ON sensei_availability_calendar(date_from, date_to);

-- RLS Policies

-- Trip Templates
ALTER TABLE trip_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all templates" ON trip_templates
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view public templates" ON trip_templates
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can manage their own templates" ON trip_templates
  FOR ALL USING (created_by = auth.uid());

-- Trip Media
ALTER TABLE trip_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all media" ON trip_media
  FOR ALL USING (is_admin());

CREATE POLICY "Senseis can manage media for their trips" ON trip_media
  FOR ALL USING (
    trip_id IN (
      SELECT t.id FROM trips t 
      JOIN sensei_profiles sp ON sp.id = t.sensei_id 
      WHERE sp.user_id = auth.uid()
    )
  );

-- Activity Library
ALTER TABLE activity_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage activity library" ON activity_library
  FOR ALL USING (is_admin());

CREATE POLICY "Everyone can view activity library" ON activity_library
  FOR SELECT USING (true);

-- Trip Workflow History
ALTER TABLE trip_workflow_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all workflow history" ON trip_workflow_history
  FOR ALL USING (is_admin());

-- Collaboration Comments
ALTER TABLE trip_collaboration_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all comments" ON trip_collaboration_comments
  FOR ALL USING (is_admin());

CREATE POLICY "Users can manage their own comments" ON trip_collaboration_comments
  FOR ALL USING (user_id = auth.uid());

-- Sensei Availability Calendar
ALTER TABLE sensei_availability_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all availability" ON sensei_availability_calendar
  FOR ALL USING (is_admin());

CREATE POLICY "Senseis can manage their own availability" ON sensei_availability_calendar
  FOR ALL USING (
    sensei_id IN (SELECT id FROM sensei_profiles WHERE user_id = auth.uid())
  );

-- Trip Analytics
ALTER TABLE trip_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage all analytics" ON trip_analytics
  FOR ALL USING (is_admin());

-- Create update triggers
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS set_timestamp_trip_templates
  BEFORE UPDATE ON trip_templates
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER IF NOT EXISTS set_timestamp_activity_library
  BEFORE UPDATE ON activity_library
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER IF NOT EXISTS set_timestamp_collaboration_comments
  BEFORE UPDATE ON trip_collaboration_comments
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER IF NOT EXISTS set_timestamp_sensei_availability
  BEFORE UPDATE ON sensei_availability_calendar
  FOR EACH ROW
  EXECUTE PROCEDURE trigger_set_timestamp();

-- Auto-save trigger for trips
CREATE OR REPLACE FUNCTION update_trip_auto_save()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_auto_save = NOW();
  NEW.version_number = COALESCE(OLD.version_number, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trip_auto_save_trigger ON trips;
CREATE TRIGGER trip_auto_save_trigger
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE PROCEDURE update_trip_auto_save();