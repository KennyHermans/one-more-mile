-- Step 3: Test that the core update works without triggers
-- Let's test a quick update and then revert it
DO $$
DECLARE
    test_sensei_id UUID := '73b08295-9535-4d7e-9829-b1f418274576'; -- Joost's ID
    original_level TEXT;
    test_result JSONB;
BEGIN
    -- Get original level
    SELECT sensei_level INTO original_level FROM public.sensei_profiles WHERE id = test_sensei_id;
    
    -- Test update to journey_guide
    UPDATE public.sensei_profiles 
    SET sensei_level = 'journey_guide', level_achieved_at = now()
    WHERE id = test_sensei_id;
    
    -- Test permissions function
    SELECT public.get_sensei_permissions(test_sensei_id) INTO test_result;
    
    -- Revert to original level
    UPDATE public.sensei_profiles 
    SET sensei_level = original_level
    WHERE id = test_sensei_id;
    
    -- Log success
    RAISE NOTICE 'Test successful - permissions: %', test_result;
END $$;

-- Step 4: Re-enable the trigger with the fixed function
CREATE OR REPLACE FUNCTION public.handle_sensei_level_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  old_permissions JSONB;
  new_permissions JSONB;
BEGIN
  -- Only process if sensei_level actually changed
  IF (TG_OP = 'UPDATE' AND OLD.sensei_level = NEW.sensei_level) THEN
    RETURN NEW;
  END IF;

  -- Record level change in history
  IF TG_OP = 'UPDATE' AND OLD.sensei_level != NEW.sensei_level THEN
    INSERT INTO public.sensei_level_history (
      sensei_id,
      previous_level,
      new_level,
      change_reason,
      requirements_met
    ) VALUES (
      NEW.id,
      OLD.sensei_level,
      NEW.sensei_level,
      'Level change detected - permissions updated',
      jsonb_build_object(
        'trips_led', NEW.trips_led,
        'rating', NEW.rating,
        'timestamp', now()::text
      )
    );
  END IF;

  -- Refresh sensei insights when level changes
  PERFORM public.calculate_sensei_insights(NEW.id);

  -- Update goal progress to reflect new capabilities
  UPDATE public.sensei_goals 
  SET current_value = CASE 
    WHEN category = 'trips' THEN NEW.trips_led
    WHEN category = 'rating' THEN COALESCE(NEW.rating, 0)
    ELSE current_value
  END,
  status = CASE 
    WHEN current_value >= target THEN 'completed'
    ELSE status
  END
  WHERE sensei_id = NEW.id;

  -- Record admin audit log entry
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    'sensei_level_change',
    'sensei_profiles',
    NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('sensei_level', OLD.sensei_level) ELSE NULL END,
    jsonb_build_object('sensei_level', NEW.sensei_level)
  );

  RETURN NEW;
END;
$function$;

-- Re-enable the trigger
CREATE TRIGGER handle_sensei_level_change_trigger
  BEFORE UPDATE OF sensei_level ON public.sensei_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sensei_level_change();