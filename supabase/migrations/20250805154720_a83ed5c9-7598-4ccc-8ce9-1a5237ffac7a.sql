-- Create sensei level requirements table for configurable progression criteria
CREATE TABLE public.sensei_level_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  level_order INTEGER NOT NULL UNIQUE,
  trips_required INTEGER NOT NULL DEFAULT 0,
  rating_required NUMERIC NOT NULL DEFAULT 0.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sensei_level_requirements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage level requirements" 
ON public.sensei_level_requirements 
FOR ALL 
USING (is_admin());

CREATE POLICY "Senseis can view level requirements" 
ON public.sensei_level_requirements 
FOR SELECT 
USING (is_active = true);

-- Insert default level requirements
INSERT INTO public.sensei_level_requirements (level_name, display_name, level_order, trips_required, rating_required) VALUES
('apprentice', 'Apprentice Sensei', 1, 0, 0.0),
('journey_guide', 'Journey Guide', 2, 5, 4.0),
('master_sensei', 'Master Sensei', 3, 15, 4.5);

-- Create function to check sensei level eligibility
CREATE OR REPLACE FUNCTION public.check_sensei_level_eligibility(p_sensei_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sensei_data RECORD;
  eligible_level TEXT;
  next_level_req RECORD;
  result JSONB;
BEGIN
  -- Get sensei stats
  SELECT 
    sp.trips_led,
    sp.rating,
    sp.sensei_level
  INTO sensei_data
  FROM public.sensei_profiles sp
  WHERE sp.id = p_sensei_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;

  -- Find highest level they're eligible for
  SELECT level_name INTO eligible_level
  FROM public.sensei_level_requirements
  WHERE trips_required <= sensei_data.trips_led 
  AND rating_required <= COALESCE(sensei_data.rating, 0)
  AND is_active = true
  ORDER BY level_order DESC
  LIMIT 1;

  -- Get next level requirements
  SELECT * INTO next_level_req
  FROM public.sensei_level_requirements
  WHERE level_order > (
    SELECT level_order FROM public.sensei_level_requirements 
    WHERE level_name = sensei_data.sensei_level
  )
  AND is_active = true
  ORDER BY level_order ASC
  LIMIT 1;

  -- Build result
  result := jsonb_build_object(
    'current_level', sensei_data.sensei_level,
    'eligible_level', COALESCE(eligible_level, 'apprentice'),
    'can_auto_upgrade', (eligible_level IS NOT NULL AND eligible_level != sensei_data.sensei_level),
    'current_trips', sensei_data.trips_led,
    'current_rating', COALESCE(sensei_data.rating, 0)
  );

  -- Add next level info if exists
  IF next_level_req.id IS NOT NULL THEN
    result := result || jsonb_build_object(
      'next_level', jsonb_build_object(
        'level_name', next_level_req.level_name,
        'display_name', next_level_req.display_name,
        'trips_required', next_level_req.trips_required,
        'rating_required', next_level_req.rating_required,
        'trips_progress', jsonb_build_object(
          'current', sensei_data.trips_led,
          'required', next_level_req.trips_required,
          'percentage', CASE 
            WHEN next_level_req.trips_required > 0 THEN 
              LEAST(100, (sensei_data.trips_led::numeric / next_level_req.trips_required * 100))
            ELSE 100 
          END
        ),
        'rating_progress', jsonb_build_object(
          'current', COALESCE(sensei_data.rating, 0),
          'required', next_level_req.rating_required,
          'percentage', CASE 
            WHEN next_level_req.rating_required > 0 THEN 
              LEAST(100, (COALESCE(sensei_data.rating, 0) / next_level_req.rating_required * 100))
            ELSE 100 
          END
        )
      )
    );
  ELSE
    result := result || jsonb_build_object('next_level', null);
  END IF;

  RETURN result;
END;
$function$;

-- Create function to auto-upgrade eligible senseis
CREATE OR REPLACE FUNCTION public.auto_upgrade_sensei_levels()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sensei_record RECORD;
  upgrade_count INTEGER := 0;
  eligibility_data JSONB;
BEGIN
  -- Loop through all active senseis
  FOR sensei_record IN 
    SELECT id, sensei_level, name 
    FROM public.sensei_profiles 
    WHERE is_active = true
  LOOP
    -- Check eligibility
    SELECT public.check_sensei_level_eligibility(sensei_record.id) INTO eligibility_data;
    
    -- If eligible for upgrade, upgrade them
    IF (eligibility_data ->> 'can_auto_upgrade')::boolean = true THEN
      UPDATE public.sensei_profiles
      SET 
        sensei_level = eligibility_data ->> 'eligible_level',
        level_achieved_at = now(),
        updated_at = now()
      WHERE id = sensei_record.id;
      
      -- Record in level history
      INSERT INTO public.sensei_level_history (
        sensei_id,
        previous_level,
        new_level,
        change_reason
      ) VALUES (
        sensei_record.id,
        sensei_record.sensei_level,
        eligibility_data ->> 'eligible_level',
        'Automatic upgrade based on performance criteria'
      );
      
      upgrade_count := upgrade_count + 1;
    END IF;
  END LOOP;
  
  RETURN upgrade_count;
END;
$function$;

-- Create trigger to check for auto-upgrades when sensei stats change
CREATE OR REPLACE FUNCTION public.trigger_level_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  eligibility_data JSONB;
BEGIN
  -- Only check if trips_led or rating changed
  IF (TG_OP = 'UPDATE' AND (OLD.trips_led != NEW.trips_led OR OLD.rating != NEW.rating)) OR TG_OP = 'INSERT' THEN
    SELECT public.check_sensei_level_eligibility(NEW.id) INTO eligibility_data;
    
    -- Auto-upgrade if eligible
    IF (eligibility_data ->> 'can_auto_upgrade')::boolean = true THEN
      NEW.sensei_level := eligibility_data ->> 'eligible_level';
      NEW.level_achieved_at := now();
      
      -- Record in level history (will be inserted after this trigger)
      INSERT INTO public.sensei_level_history (
        sensei_id,
        previous_level,
        new_level,
        change_reason
      ) VALUES (
        NEW.id,
        COALESCE(OLD.sensei_level, 'apprentice'),
        NEW.sensei_level,
        'Automatic upgrade based on performance criteria'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on sensei_profiles for auto-upgrades
DROP TRIGGER IF EXISTS auto_upgrade_sensei_level ON public.sensei_profiles;
CREATE TRIGGER auto_upgrade_sensei_level
  BEFORE INSERT OR UPDATE ON public.sensei_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_level_check();