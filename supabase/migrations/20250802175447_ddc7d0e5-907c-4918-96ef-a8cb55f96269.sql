-- Create admin_announcements table for admin to sensei communication
CREATE TABLE public.admin_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  target_audience TEXT NOT NULL DEFAULT 'all_senseis' CHECK (target_audience IN ('all_senseis', 'active_senseis', 'specific_senseis')),
  specific_sensei_ids UUID[] DEFAULT NULL, -- For targeted messages to specific senseis
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_admin BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_announcements
CREATE POLICY "Admin can manage all admin announcements"
ON public.admin_announcements
FOR ALL
USING (auth.email() = 'kenny_hermans93@hotmail.com')
WITH CHECK (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Senseis can view active admin announcements"
ON public.admin_announcements
FOR SELECT
USING (
  is_active = true 
  AND (
    -- All senseis can see general announcements
    target_audience = 'all_senseis'
    OR 
    -- Active senseis can see active-sensei-only announcements
    (target_audience = 'active_senseis' AND EXISTS (
      SELECT 1 FROM sensei_profiles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    ))
    OR 
    -- Specific senseis can see targeted announcements
    (target_audience = 'specific_senseis' AND EXISTS (
      SELECT 1 FROM sensei_profiles 
      WHERE user_id = auth.uid() 
      AND id = ANY(specific_sensei_ids)
    ))
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_admin_announcements_updated_at
BEFORE UPDATE ON public.admin_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_admin_announcements_target_audience ON public.admin_announcements(target_audience);
CREATE INDEX idx_admin_announcements_created_at ON public.admin_announcements(created_at DESC);
CREATE INDEX idx_admin_announcements_specific_sensei_ids ON public.admin_announcements USING GIN(specific_sensei_ids);