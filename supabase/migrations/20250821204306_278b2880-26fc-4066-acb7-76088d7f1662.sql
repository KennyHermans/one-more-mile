-- Fix security linter issues: Set search_path for functions that don't have it
-- This addresses the "Function Search Path Mutable" warnings

-- Update functions that are missing SET search_path
ALTER FUNCTION public.send_welcome_message_to_sensei(uuid) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.handle_new_sensei_profile() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION public.handle_approved_application() SET search_path TO 'public', 'pg_temp';

-- Create idempotent payout processing function
CREATE OR REPLACE FUNCTION public.process_payout_idempotent(
  p_sensei_id UUID,
  p_trip_id UUID,
  p_payout_type TEXT,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  existing_payout_id UUID;
  result JSONB;
BEGIN
  -- Check for existing payout with same parameters (idempotency)
  SELECT id INTO existing_payout_id
  FROM sensei_payouts
  WHERE sensei_id = p_sensei_id
    AND (trip_id = p_trip_id OR (trip_id IS NULL AND p_trip_id IS NULL))
    AND payout_type = p_payout_type
    AND (p_idempotency_key IS NULL OR metadata->>'idempotency_key' = p_idempotency_key)
    AND status IN ('pending', 'processing', 'paid');

  IF existing_payout_id IS NOT NULL THEN
    -- Return existing payout
    SELECT jsonb_build_object(
      'success', true,
      'payout_id', existing_payout_id,
      'status', 'duplicate_prevented',
      'message', 'Payout already exists'
    ) INTO result;
    
    RETURN result;
  END IF;

  -- Proceed with normal payout processing
  SELECT jsonb_build_object(
    'success', true,
    'status', 'ready_to_process',
    'message', 'Payout can proceed'
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create payout automation status table
CREATE TABLE IF NOT EXISTS public.payout_automation_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL,
  sensei_id UUID NOT NULL,
  payout_type TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT payout_automation_status_unique UNIQUE (trip_id, sensei_id, payout_type)
);

-- Enable RLS on payout automation status
ALTER TABLE public.payout_automation_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admin can manage payout automation"
ON public.payout_automation_status
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Create function to schedule automatic payouts
CREATE OR REPLACE FUNCTION public.schedule_automatic_payouts(p_trip_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  trip_record RECORD;
  advance_date TIMESTAMP WITH TIME ZONE;
  day1_date TIMESTAMP WITH TIME ZONE;
  final_date TIMESTAMP WITH TIME ZONE;
  result JSONB;
BEGIN
  -- Get trip details
  SELECT * INTO trip_record
  FROM trips
  WHERE id = p_trip_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Trip not found');
  END IF;

  -- Calculate payout dates
  advance_date := now() + INTERVAL '1 day'; -- Example: 1 day after booking confirmation
  day1_date := trip_record.start_date; -- Day 1 of trip
  final_date := trip_record.end_date + INTERVAL '3 days'; -- 3 days after trip ends

  -- Schedule advance payout
  INSERT INTO public.payout_automation_status (
    trip_id, sensei_id, payout_type, scheduled_for
  ) VALUES (
    p_trip_id, trip_record.sensei_id, 'advance', advance_date
  ) ON CONFLICT (trip_id, sensei_id, payout_type) DO NOTHING;

  -- Schedule day1 payout
  INSERT INTO public.payout_automation_status (
    trip_id, sensei_id, payout_type, scheduled_for
  ) VALUES (
    p_trip_id, trip_record.sensei_id, 'day1', day1_date
  ) ON CONFLICT (trip_id, sensei_id, payout_type) DO NOTHING;

  -- Schedule final payout
  INSERT INTO public.payout_automation_status (
    trip_id, sensei_id, payout_type, scheduled_for
  ) VALUES (
    p_trip_id, trip_record.sensei_id, 'final', final_date
  ) ON CONFLICT (trip_id, sensei_id, payout_type) DO NOTHING;

  result := jsonb_build_object(
    'success', true,
    'scheduled_payouts', 3,
    'advance_date', advance_date,
    'day1_date', day1_date,
    'final_date', final_date
  );

  RETURN result;
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_payout_automation_status_updated_at
  BEFORE UPDATE ON public.payout_automation_status
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Create real-time notifications table
CREATE TABLE IF NOT EXISTS public.realtime_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.realtime_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their notifications"
ON public.realtime_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
ON public.realtime_notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all notifications"
ON public.realtime_notifications
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());