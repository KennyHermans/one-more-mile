-- Fix the trigger function with simpler logic
CREATE OR REPLACE FUNCTION public.flag_high_value_trips_for_backup()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  trip_value NUMERIC := 0;
  max_group_size INTEGER := 0;
  numbers TEXT[];
BEGIN
  -- Extract numeric value from price string (e.g., "€4,240" -> 4240)
  IF NEW.price ~ '\d+' THEN
    trip_value := regexp_replace(NEW.price, '[^0-9]', '', 'g')::NUMERIC;
  END IF;
  
  -- Extract max group size from group_size string or use max_participants
  IF NEW.group_size ~ '\d+' THEN
    numbers := regexp_split_to_array(NEW.group_size, '[^0-9]+');
    -- Get the highest number found
    FOR i IN 1..array_length(numbers, 1) LOOP
      IF numbers[i] ~ '^\d+$' THEN
        max_group_size := GREATEST(max_group_size, numbers[i]::INTEGER);
      END IF;
    END LOOP;
  ELSE
    max_group_size := COALESCE(NEW.max_participants, 0);
  END IF;
  
  -- Flag trips over €5000 or with more than 8 participants for backup
  IF (trip_value > 5000 OR max_group_size > 8) AND COALESCE(NEW.requires_backup_sensei, false) = false THEN
    NEW.requires_backup_sensei = true;
    NEW.backup_assignment_deadline = CASE 
      WHEN NEW.start_date IS NOT NULL THEN NEW.start_date - interval '14 days'
      ELSE now() + interval '30 days'
    END;
    
    -- Create admin alert
    INSERT INTO admin_alerts (
      alert_type,
      title,
      message,
      priority,
      trip_id,
      metadata
    ) VALUES (
      'backup_flagged',
      'Trip Flagged for Backup Sensei',
      format('Trip "%s" has been automatically flagged for backup sensei requirement.', NEW.title),
      'medium',
      NEW.id,
      jsonb_build_object(
        'trip_value', trip_value,
        'max_group_size', max_group_size,
        'auto_flagged', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;