-- Add missing columns to sensei_profiles table
ALTER TABLE public.sensei_profiles 
ADD COLUMN IF NOT EXISTS sensei_level TEXT DEFAULT 'apprentice',
ADD COLUMN IF NOT EXISTS trip_creation_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trip_creation_request_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS level_achieved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS level_requirements_met JSONB DEFAULT '{}';

-- Add missing column to trips table  
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS backup_assignment_deadline TIMESTAMP WITH TIME ZONE;

-- Create sensei_level_history table
CREATE TABLE IF NOT EXISTS public.sensei_level_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID NOT NULL,
  previous_level TEXT,
  new_level TEXT NOT NULL,
  changed_by UUID,
  change_reason TEXT,
  requirements_met JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sensei_level_history
ALTER TABLE public.sensei_level_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sensei_level_history
CREATE POLICY "Admin can manage all level history" 
ON public.sensei_level_history 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Senseis can view their own level history" 
ON public.sensei_level_history 
FOR SELECT 
USING (sensei_id IN (
  SELECT id FROM sensei_profiles WHERE user_id = auth.uid()
));

-- Create missing RPC functions
CREATE OR REPLACE FUNCTION public.upgrade_sensei_level(
  p_sensei_id UUID,
  p_new_level TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_level TEXT;
  result JSONB;
BEGIN
  -- Get current level
  SELECT sensei_level INTO current_level
  FROM sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- Update sensei level
  UPDATE sensei_profiles
  SET sensei_level = p_new_level,
      level_achieved_at = now(),
      updated_at = now()
  WHERE id = p_sensei_id;

  -- Record level history
  INSERT INTO sensei_level_history (
    sensei_id,
    previous_level,
    new_level,
    changed_by,
    change_reason
  ) VALUES (
    p_sensei_id,
    current_level,
    p_new_level,
    auth.uid(),
    p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'previous_level', current_level,
    'new_level', p_new_level
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_sensei_level_eligibility(
  p_sensei_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sensei_data RECORD;
  result JSONB;
BEGIN
  SELECT 
    trips_led,
    rating,
    sensei_level
  INTO sensei_data
  FROM sensei_profiles
  WHERE id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- Calculate eligibility for next level
  result := jsonb_build_object(
    'current_level', sensei_data.sensei_level,
    'trips_led', sensei_data.trips_led,
    'rating', sensei_data.rating,
    'eligible_for_journey_guide', (sensei_data.trips_led >= 5 AND sensei_data.rating >= 4.0),
    'eligible_for_master_sensei', (sensei_data.trips_led >= 15 AND sensei_data.rating >= 4.5)
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sensei_trip_status(
  p_sensei_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'trip_id', t.id,
      'title', t.title,
      'status', t.trip_status,
      'participants', t.current_participants,
      'max_participants', t.max_participants
    )
  ) INTO result
  FROM trips t
  WHERE t.sensei_id = p_sensei_id
  AND t.is_active = true;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_backup_senseis(
  p_trip_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trip_data RECORD;
  sensei_record RECORD;
  request_count INTEGER := 0;
BEGIN
  -- Get trip details
  SELECT theme, destination INTO trip_data
  FROM trips
  WHERE id = p_trip_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Trip not found');
  END IF;

  -- Find suitable backup senseis and send requests
  FOR sensei_record IN
    SELECT sensei_id, match_score
    FROM suggest_senseis_for_trip(trip_data.theme)
    WHERE is_available = true
    ORDER BY match_score DESC
    LIMIT 5
  LOOP
    INSERT INTO backup_sensei_requests (
      trip_id,
      sensei_id,
      response_deadline,
      match_score
    ) VALUES (
      p_trip_id,
      sensei_record.sensei_id,
      now() + interval '48 hours',
      sensei_record.match_score
    );
    
    request_count := request_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'requests_sent', request_count
  );
END;
$$;