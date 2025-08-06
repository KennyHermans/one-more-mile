-- Fix critical sensei levels system issues

-- 1. Create missing admin_update_sensei_level function
CREATE OR REPLACE FUNCTION public.admin_update_sensei_level(
  p_sensei_id uuid,
  p_new_level text,
  p_reason text DEFAULT 'Admin manual update',
  p_admin_override boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  current_sensei_record RECORD;
  previous_level text;
  admin_user_id uuid;
  result jsonb;
BEGIN
  -- Get current admin user
  admin_user_id := auth.uid();
  
  -- Validate admin access
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied: Admin privileges required'
    );
  END IF;
  
  -- Get current sensei data
  SELECT sensei_level, name INTO current_sensei_record
  FROM public.sensei_profiles 
  WHERE id = p_sensei_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Sensei not found or inactive'
    );
  END IF;
  
  previous_level := current_sensei_record.sensei_level;
  
  -- Validate new level
  IF p_new_level NOT IN ('apprentice', 'journey_guide', 'master_sensei') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid sensei level'
    );
  END IF;
  
  -- Check if level is actually changing
  IF previous_level = p_new_level THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Level unchanged - sensei already at this level',
      'previous_level', previous_level,
      'new_level', p_new_level
    );
  END IF;
  
  -- Update sensei level
  UPDATE public.sensei_profiles 
  SET 
    sensei_level = p_new_level,
    level_achieved_at = now(),
    updated_at = now()
  WHERE id = p_sensei_id;
  
  -- Record in level history
  INSERT INTO public.sensei_level_history (
    sensei_id,
    previous_level,
    new_level,
    change_reason,
    changed_by,
    requirements_met
  ) VALUES (
    p_sensei_id,
    previous_level,
    p_new_level,
    p_reason,
    admin_user_id,
    jsonb_build_object(
      'admin_override', p_admin_override,
      'timestamp', now(),
      'admin_user', admin_user_id
    )
  );
  
  -- Create audit log entry
  INSERT INTO public.admin_audit_log (
    admin_user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    admin_user_id,
    'sensei_level_update',
    'sensei_profiles',
    p_sensei_id,
    jsonb_build_object('sensei_level', previous_level),
    jsonb_build_object('sensei_level', p_new_level, 'reason', p_reason)
  );
  
  result := jsonb_build_object(
    'success', true,
    'message', format('Level successfully changed from %s to %s', previous_level, p_new_level),
    'previous_level', previous_level,
    'new_level', p_new_level,
    'sensei_name', current_sensei_record.name
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'debug_info', jsonb_build_object(
      'sqlstate', SQLSTATE,
      'context', 'admin_update_sensei_level function'
    )
  );
END;
$$;

-- 2. Fix enhanced_auto_upgrade_sensei_levels to be read-only compatible
CREATE OR REPLACE FUNCTION public.enhanced_auto_upgrade_sensei_levels()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sensei_record RECORD;
  upgrade_count INTEGER := 0;
  total_checked INTEGER := 0;
  eligibility_data JSONB;
  result JSONB;
BEGIN
  -- Loop through all active senseis
  FOR sensei_record IN 
    SELECT id, sensei_level, name, trips_led, rating
    FROM public.sensei_profiles 
    WHERE is_active = true
  LOOP
    total_checked := total_checked + 1;
    
    -- Check eligibility using existing function
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
        change_reason,
        requirements_met
      ) VALUES (
        sensei_record.id,
        sensei_record.sensei_level,
        eligibility_data ->> 'eligible_level',
        'Automatic upgrade based on performance criteria',
        jsonb_build_object(
          'trips_led', sensei_record.trips_led,
          'rating', sensei_record.rating,
          'timestamp', now(),
          'auto_upgrade', true
        )
      );
      
      upgrade_count := upgrade_count + 1;
    END IF;
  END LOOP;
  
  -- Return comprehensive result
  result := jsonb_build_object(
    'success', true,
    'upgrades_performed', upgrade_count,
    'total_senseis_checked', total_checked,
    'timestamp', now()
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'upgrades_performed', upgrade_count,
    'total_senseis_checked', total_checked,
    'timestamp', now()
  );
END;
$$;

-- 3. Create proper sensei level change trigger that doesn't cause recursion
CREATE OR REPLACE FUNCTION public.handle_sensei_level_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Only process actual level changes
  IF TG_OP = 'UPDATE' AND OLD.sensei_level != NEW.sensei_level THEN
    -- Update goal progress for this sensei
    UPDATE public.sensei_goals 
    SET current_value = CASE 
      WHEN category = 'trips' THEN NEW.trips_led
      WHEN category = 'rating' THEN NEW.rating
      ELSE current_value
    END,
    status = CASE 
      WHEN current_value >= target THEN 'completed'
      ELSE status
    END
    WHERE sensei_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop any existing conflicting triggers
DROP TRIGGER IF EXISTS trigger_level_check ON public.sensei_profiles;
DROP TRIGGER IF EXISTS enhanced_sensei_level_change_handler ON public.sensei_profiles;

-- Create the proper trigger
CREATE TRIGGER handle_sensei_level_change_trigger
  AFTER UPDATE ON public.sensei_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_sensei_level_change();

-- 4. Ensure get_sensei_permissions function exists and works correctly
CREATE OR REPLACE FUNCTION public.get_sensei_permissions(p_sensei_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  sensei_level text;
  permissions jsonb;
  field_permissions text[];
BEGIN
  -- Get sensei level
  SELECT sp.sensei_level INTO sensei_level
  FROM public.sensei_profiles sp
  WHERE sp.id = p_sensei_id AND sp.is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Sensei not found');
  END IF;
  
  -- Get level-based permissions
  SELECT jsonb_build_object(
    'can_view_trips', slp.can_view_trips,
    'can_apply_backup', slp.can_apply_backup,
    'can_edit_profile', slp.can_edit_profile,
    'can_edit_trips', slp.can_edit_trips,
    'can_create_trips', slp.can_create_trips,
    'can_use_ai_builder', slp.can_use_ai_builder,
    'can_publish_trips', slp.can_publish_trips,
    'can_modify_pricing', slp.can_modify_pricing
  ) INTO permissions
  FROM public.sensei_level_permissions slp
  WHERE slp.sensei_level = get_sensei_permissions.sensei_level;
  
  -- Get field permissions
  SELECT ARRAY_AGG(field_name) INTO field_permissions
  FROM public.sensei_level_field_permissions slfp
  WHERE slfp.sensei_level = get_sensei_permissions.sensei_level
  AND slfp.can_edit = true;
  
  -- Add field permissions to result
  permissions := permissions || jsonb_build_object(
    'trip_edit_fields', COALESCE(field_permissions, ARRAY[]::text[])
  );
  
  RETURN permissions;
END;
$$;

-- 5. Create cron job for automated upgrades (daily at 2 AM)
SELECT cron.schedule(
  'sensei-auto-upgrade',
  '0 2 * * *', -- Daily at 2 AM
  $$
  SELECT net.http_post(
    url := 'https://qvirgcrbnwcyhbqdazjy.supabase.co/functions/v1/auto-upgrade-senseis',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aXJnY3JibndjeWhicWRhemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTAzNTEsImV4cCI6MjA2OTQyNjM1MX0.WM4XueoIBsue-EmoQI-dIwmNrc3lBd35MR3PhevhI20"}'::jsonb,
    body := '{"automated": true}'::jsonb
  ) as request_id;
  $$
);

-- 6. Ensure proper default field permissions exist
INSERT INTO public.sensei_level_field_permissions (sensei_level, field_name, can_edit)
VALUES 
  ('apprentice', 'description', true),
  ('apprentice', 'included_amenities', true),
  ('apprentice', 'excluded_items', true),
  ('apprentice', 'requirements', false),
  ('apprentice', 'program', false),
  ('journey_guide', 'description', true),
  ('journey_guide', 'included_amenities', true),
  ('journey_guide', 'excluded_items', true),
  ('journey_guide', 'requirements', true),
  ('journey_guide', 'program', true),
  ('journey_guide', 'pricing', false),
  ('master_sensei', 'description', true),
  ('master_sensei', 'included_amenities', true),
  ('master_sensei', 'excluded_items', true),
  ('master_sensei', 'requirements', true),
  ('master_sensei', 'program', true),
  ('master_sensei', 'pricing', true),
  ('master_sensei', 'dates', true)
ON CONFLICT (sensei_level, field_name) DO UPDATE SET
  can_edit = EXCLUDED.can_edit;