-- Fix the trigger function to work with current trips table structure
CREATE OR REPLACE FUNCTION public.flag_high_value_trips_for_backup()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  trip_value NUMERIC;
  max_group_size INTEGER;
BEGIN
  -- Extract numeric value from price string (e.g., "€4,240" -> 4240)
  trip_value := CASE 
    WHEN NEW.price ~ '\d+' THEN 
      regexp_replace(regexp_replace(NEW.price, '[^0-9.]', '', 'g'), '\.(?=.*\.)', '', 'g')::NUMERIC
    ELSE 0
  END;
  
  -- Extract max group size from group_size string (e.g., "6-12 riders" -> 12)
  max_group_size := CASE 
    WHEN NEW.group_size ~ '\d+' THEN 
      (regexp_matches(NEW.group_size, '\d+', 'g'))[array_length(regexp_matches(NEW.group_size, '\d+', 'g'), 1)]::INTEGER
    ELSE COALESCE(NEW.max_participants, 0)
  END;
  
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