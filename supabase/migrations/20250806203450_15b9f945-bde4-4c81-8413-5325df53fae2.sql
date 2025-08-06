-- Set up the cron job for daily auto-upgrades at 2 AM
SELECT cron.schedule(
  'daily-sensei-auto-upgrade',
  '0 2 * * *', -- Every day at 2:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://qvirgcrbnwcyhbqdazjy.supabase.co/functions/v1/auto-upgrade-senseis',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aXJnY3JibndjeWhicWRhemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTAzNTEsImV4cCI6MjA2OTQyNjM1MX0.WM4XueoIBsue-EmoQI-dIwmNrc3lBd35MR3PhevhI20"}'::jsonb,
        body:=concat('{"scheduled_run": true, "timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Also set up milestone checking for existing senseis (runs every 6 hours)
SELECT cron.schedule(
  'milestone-achievement-check',
  '0 */6 * * *', -- Every 6 hours
  $$
  DO $milestone_check$
  DECLARE
    sensei_record RECORD;
  BEGIN
    FOR sensei_record IN 
      SELECT id FROM public.sensei_profiles WHERE is_active = true
    LOOP
      PERFORM public.check_and_award_milestones(sensei_record.id);
    END LOOP;
  END $milestone_check$;
  $$
);

-- Update triggers to include milestone checking
CREATE OR REPLACE FUNCTION public.enhanced_sensei_level_change_handler()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- Check and award milestones
  PERFORM public.check_and_award_milestones(NEW.id);

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

-- Update the trigger to use the enhanced handler
DROP TRIGGER IF EXISTS handle_sensei_level_change_trigger ON public.sensei_profiles;
CREATE TRIGGER enhanced_sensei_level_change_trigger
  BEFORE UPDATE OF sensei_level ON public.sensei_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_sensei_level_change_handler();