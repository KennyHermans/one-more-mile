-- Add backup assignment deadline to trips table
ALTER TABLE public.trips 
ADD COLUMN backup_assignment_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN requires_backup_sensei BOOLEAN NOT NULL DEFAULT true;

-- Create backup sensei requests table to track automatic requests
CREATE TABLE public.backup_sensei_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  sensei_id UUID NOT NULL REFERENCES public.sensei_profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL DEFAULT 'automatic', -- 'automatic' or 'manual'
  match_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  response_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE,
  response_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin alerts table for systematic notifications
CREATE TABLE public.admin_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'missing_backup', 'backup_timeout', 'backup_needed', 'system'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  sensei_id UUID REFERENCES public.sensei_profiles(id) ON DELETE CASCADE,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.backup_sensei_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for backup_sensei_requests
CREATE POLICY "Admin can manage all backup requests" 
ON public.backup_sensei_requests 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Senseis can view their backup requests" 
ON public.backup_sensei_requests 
FOR SELECT 
USING (sensei_id IN (
  SELECT id FROM public.sensei_profiles 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Senseis can respond to their backup requests" 
ON public.backup_sensei_requests 
FOR UPDATE 
USING (sensei_id IN (
  SELECT id FROM public.sensei_profiles 
  WHERE user_id = auth.uid()
) AND status = 'pending');

-- RLS policies for admin_alerts
CREATE POLICY "Admin can manage all alerts" 
ON public.admin_alerts 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Create indexes for performance
CREATE INDEX idx_backup_requests_trip_sensei ON public.backup_sensei_requests(trip_id, sensei_id);
CREATE INDEX idx_backup_requests_status ON public.backup_sensei_requests(status);
CREATE INDEX idx_backup_requests_deadline ON public.backup_sensei_requests(response_deadline);
CREATE INDEX idx_admin_alerts_type ON public.admin_alerts(alert_type);
CREATE INDEX idx_admin_alerts_resolved ON public.admin_alerts(is_resolved);
CREATE INDEX idx_admin_alerts_trip ON public.admin_alerts(trip_id);

-- Create function to automatically set backup assignment deadline
CREATE OR REPLACE FUNCTION public.set_backup_assignment_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Set deadline to 48 hours after trip approval if backup sensei required
  IF NEW.trip_status = 'approved' AND NEW.requires_backup_sensei = true AND NEW.backup_assignment_deadline IS NULL THEN
    NEW.backup_assignment_deadline = now() + interval '48 hours';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for backup assignment deadline
CREATE TRIGGER set_backup_deadline_trigger
  BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_backup_assignment_deadline();

-- Create function to create admin alert for missing backup
CREATE OR REPLACE FUNCTION public.create_backup_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create alert if trip is approved and requires backup but has none assigned
  IF NEW.trip_status = 'approved' AND NEW.requires_backup_sensei = true AND NEW.backup_sensei_id IS NULL THEN
    INSERT INTO public.admin_alerts (
      alert_type,
      priority,
      title,
      message,
      trip_id
    ) VALUES (
      'missing_backup',
      'high',
      'Trip Missing Backup Sensei: ' || NEW.title,
      'Trip "' || NEW.title || '" has been approved but no backup sensei is assigned. Please assign a backup sensei within 48 hours.',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for backup alert creation
CREATE TRIGGER create_backup_alert_trigger
  AFTER INSERT OR UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.create_backup_alert();

-- Function to find and request backup senseis automatically
CREATE OR REPLACE FUNCTION public.request_backup_senseis(p_trip_id UUID, p_max_requests INTEGER DEFAULT 3)
RETURNS TABLE(request_id UUID, sensei_id UUID, sensei_name TEXT, match_score INTEGER) AS $$
DECLARE
  trip_record RECORD;
  sensei_record RECORD;
  request_count INTEGER := 0;
  new_request_id UUID;
BEGIN
  -- Get trip details
  SELECT * INTO trip_record FROM public.trips WHERE id = p_trip_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found: %', p_trip_id;
  END IF;
  
  -- Get top matching senseis who haven't been requested yet
  FOR sensei_record IN 
    SELECT s.sensei_id, s.sensei_name, s.match_score, s.is_available
    FROM public.suggest_senseis_for_trip_enhanced(
      trip_record.theme, 
      string_to_array(trip_record.dates, ','), 
      p_trip_id
    ) s
    WHERE s.is_available = true 
    AND s.sensei_id != COALESCE(trip_record.sensei_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND s.sensei_id NOT IN (
      SELECT bsr.sensei_id 
      FROM public.backup_sensei_requests bsr 
      WHERE bsr.trip_id = p_trip_id 
      AND bsr.status IN ('pending', 'accepted')
    )
    ORDER BY s.match_score DESC, s.rating DESC
    LIMIT p_max_requests
  LOOP
    -- Create backup request
    INSERT INTO public.backup_sensei_requests (
      trip_id,
      sensei_id,
      request_type,
      match_score,
      response_deadline
    ) VALUES (
      p_trip_id,
      sensei_record.sensei_id,
      'automatic',
      sensei_record.match_score,
      now() + interval '3 days'
    ) RETURNING id INTO new_request_id;
    
    -- Return the request details
    request_id := new_request_id;
    sensei_id := sensei_record.sensei_id;
    sensei_name := sensei_record.sensei_name;
    match_score := sensei_record.match_score;
    
    RETURN NEXT;
    
    request_count := request_count + 1;
    EXIT WHEN request_count >= p_max_requests;
  END LOOP;
  
  -- Create alert if no requests could be made
  IF request_count = 0 THEN
    INSERT INTO public.admin_alerts (
      alert_type,
      priority,
      title,
      message,
      trip_id
    ) VALUES (
      'backup_timeout',
      'critical',
      'No Available Backup Senseis: ' || trip_record.title,
      'Unable to find available backup senseis for trip "' || trip_record.title || '". Manual intervention required.',
      p_trip_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;