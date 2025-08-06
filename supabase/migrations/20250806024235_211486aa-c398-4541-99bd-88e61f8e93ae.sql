-- Phase 1: Enhanced backup requirements and automation settings

-- Update the check_backup_requirements trigger to be more comprehensive
CREATE OR REPLACE FUNCTION public.check_backup_requirements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Automatically set requires_backup_sensei for high-value or high-risk trips
    IF NEW.trip_status = 'approved' AND NEW.requires_backup_sensei IS NULL THEN
        DECLARE
            price_numeric numeric;
        BEGIN
            -- Parse price to determine if it's a high-value trip (>$2000)
            price_numeric := CAST(REPLACE(REPLACE(NEW.price, '$', ''), ',', '') AS numeric);
            
            -- Set backup requirement for high-value trips, international destinations, or challenging difficulty
            IF price_numeric > 2000 OR 
               NEW.difficulty_level IN ('Challenging', 'Expert') OR 
               NEW.destination ILIKE ANY(ARRAY['%japan%', '%nepal%', '%tibet%', '%patagonia%', '%antarctica%', '%everest%']) THEN
                NEW.requires_backup_sensei := true;
                -- Set backup assignment deadline to 14 days before trip start
                NEW.backup_assignment_deadline := (
                    CASE 
                        WHEN NEW.dates ~ '^\w+ \d+-\d+, \d{4}$' THEN
                            to_date(substring(NEW.dates from '(\w+ \d+), \d{4}'), 'Month DD, YYYY') - interval '14 days'
                        ELSE
                            (current_date + interval '30 days')::timestamp with time zone
                    END
                );
            ELSE
                NEW.requires_backup_sensei := false;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- If price parsing fails, use conservative approach
                NEW.requires_backup_sensei := (NEW.difficulty_level IN ('Challenging', 'Expert'));
                NEW.backup_assignment_deadline := (current_date + interval '30 days')::timestamp with time zone;
        END;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Phase 2: Insert automation settings for backup management
INSERT INTO public.payment_settings (setting_name, setting_value, description) VALUES
('backup_automation_enabled', 'true', 'Enable automated backup sensei assignment')
ON CONFLICT (setting_name) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO public.payment_settings (setting_name, setting_value, description) VALUES
('backup_request_timeout_hours', '48', 'Hours to wait for backup sensei response before timeout')
ON CONFLICT (setting_name) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO public.payment_settings (setting_name, setting_value, description) VALUES
('backup_max_retry_attempts', '3', 'Maximum retry attempts for backup sensei requests')
ON CONFLICT (setting_name) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO public.payment_settings (setting_name, setting_value, description) VALUES
('backup_escalation_enabled', 'true', 'Enable admin escalation when backup assignment fails')
ON CONFLICT (setting_name) DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = now();

-- Enhanced RPC function for requesting backup senseis with better matching
CREATE OR REPLACE FUNCTION public.request_backup_senseis(p_trip_id uuid, p_max_requests integer DEFAULT 3)
RETURNS TABLE(
    request_id uuid,
    sensei_id uuid,
    sensei_name text,
    match_score integer,
    weighted_score numeric,
    specialty_matches text[],
    missing_requirements text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    trip_record RECORD;
    sensei_record RECORD;
    match_result RECORD;
    request_count INTEGER := 0;
    automation_settings RECORD;
BEGIN
    -- Get automation settings
    SELECT 
        (setting_value->>'backup_automation_enabled')::boolean as enabled,
        (setting_value->>'backup_request_timeout_hours')::integer as timeout_hours,
        (setting_value->>'backup_max_retry_attempts')::integer as max_retries
    INTO automation_settings
    FROM payment_settings 
    WHERE setting_name = 'backup_automation_enabled';
    
    -- Check if automation is enabled
    IF NOT COALESCE(automation_settings.enabled, true) THEN
        RETURN;
    END IF;
    
    -- Get trip details
    SELECT id, theme, destination, dates, sensei_id 
    INTO trip_record
    FROM trips
    WHERE id = p_trip_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip not found or inactive';
    END IF;

    -- Find suitable backup senseis using enhanced matching
    FOR sensei_record IN
        SELECT 
            sp.id,
            sp.name,
            sp.user_id,
            cms.match_score,
            cms.weighted_score,
            cms.specialty_matches,
            cms.missing_requirements
        FROM sensei_profiles sp
        CROSS JOIN LATERAL calculate_sensei_match_score_enhanced(
            sp.id, 
            trip_record.theme, 
            '{}', 
            trip_record.id
        ) cms
        WHERE sp.is_active = true 
        AND sp.is_offline = false
        AND sp.id != trip_record.sensei_id  -- Exclude primary sensei
        AND NOT EXISTS (
            -- Exclude senseis who already have pending/recent requests for this trip
            SELECT 1 FROM backup_sensei_requests bsr
            WHERE bsr.trip_id = p_trip_id 
            AND bsr.sensei_id = sp.id
            AND bsr.status IN ('pending', 'accepted')
            AND bsr.requested_at > now() - interval '7 days'
        )
        AND cms.weighted_score >= 8.0  -- Minimum match threshold
        ORDER BY cms.weighted_score DESC, sp.rating DESC
        LIMIT p_max_requests
    LOOP
        -- Insert backup request
        INSERT INTO backup_sensei_requests (
            trip_id,
            sensei_id,
            response_deadline,
            match_score,
            status,
            request_type
        ) VALUES (
            p_trip_id,
            sensei_record.id,
            now() + interval '1 hour' * COALESCE(automation_settings.timeout_hours, 48),
            sensei_record.match_score,
            'pending',
            'automatic'
        ) RETURNING id INTO request_id;
        
        -- Return the request details
        sensei_id := sensei_record.id;
        sensei_name := sensei_record.name;
        match_score := sensei_record.match_score;
        weighted_score := sensei_record.weighted_score;
        specialty_matches := sensei_record.specialty_matches;
        missing_requirements := sensei_record.missing_requirements;
        
        RETURN NEXT;
        request_count := request_count + 1;
    END LOOP;
    
    -- Create admin alert if no suitable senseis found
    IF request_count = 0 THEN
        INSERT INTO admin_alerts (
            alert_type,
            title,
            message,
            priority,
            trip_id,
            metadata
        ) VALUES (
            'backup_assignment_failed',
            'No Backup Senseis Available',
            'Unable to find suitable backup senseis for trip: ' || trip_record.theme,
            'high',
            p_trip_id,
            jsonb_build_object(
                'trip_theme', trip_record.theme,
                'trip_destination', trip_record.destination,
                'search_timestamp', now()
            )
        );
    END IF;
END;
$function$;

-- Phase 3: Set up cron jobs for automated backup management
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule check-backup-requirements to run daily at 9 AM
SELECT cron.schedule(
    'check-backup-requirements-daily',
    '0 9 * * *', -- 9 AM daily
    $$
    SELECT net.http_post(
        url := 'https://qvirgcrbnwcyhbqdazjy.supabase.co/functions/v1/check-backup-requirements',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aXJnY3JibndjeWhicWRhemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTAzNTEsImV4cCI6MjA2OTQyNjM1MX0.WM4XueoIBsue-EmoQI-dIwmNrc3lBd35MR3PhevhI20"}'::jsonb,
        body := '{"scheduled": true}'::jsonb
    );
    $$
);

-- Schedule automated-backup-assignment to run every 6 hours
SELECT cron.schedule(
    'automated-backup-assignment-6h',
    '0 */6 * * *', -- Every 6 hours
    $$
    SELECT net.http_post(
        url := 'https://qvirgcrbnwcyhbqdazjy.supabase.co/functions/v1/automated-backup-assignment',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aXJnY3JibndjeWhicWRhemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTAzNTEsImV4cCI6MjA2OTQyNjM1MX0.WM4XueoIBsue-EmoQI-dIwmNrc3lBd35MR3PhevhI20"}'::jsonb,
        body := '{"scheduled": true}'::jsonb
    );
    $$
);

-- Schedule handle-backup-timeout to run twice daily
SELECT cron.schedule(
    'handle-backup-timeout-12h',
    '0 8,20 * * *', -- 8 AM and 8 PM daily
    $$
    SELECT net.http_post(
        url := 'https://qvirgcrbnwcyhbqdazjy.supabase.co/functions/v1/handle-backup-timeout',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aXJnY3JibndjeWhicWRhemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTAzNTEsImV4cCI6MjA2OTQyNjM1MX0.WM4XueoIBsue-EmoQI-dIwmNrc3lBd35MR3PhevhI20"}'::jsonb,
        body := '{"scheduled": true}'::jsonb
    );
    $$
);

-- Create test trip data that requires backup sensei (Phase 4)
INSERT INTO trips (
    title,
    description,
    theme,
    destination,
    dates,
    price,
    difficulty_level,
    max_participants,
    current_participants,
    trip_status,
    sensei_id,
    requires_backup_sensei,
    backup_assignment_deadline,
    is_active
) VALUES (
    'Advanced Everest Base Camp Trek',
    'A challenging 21-day trek to Everest Base Camp with technical climbing sections and high-altitude training. This premium expedition requires experienced backup support due to the technical nature and high-altitude risks.',
    'Mountain Climbing',
    'Everest Base Camp, Nepal',
    'March 15-April 5, 2024',
    '$3,500',
    'Expert',
    8,
    3,
    'approved',
    (SELECT id FROM sensei_profiles WHERE is_active = true LIMIT 1),
    true,
    '2024-03-01 00:00:00+00',
    true
) ON CONFLICT DO NOTHING;

-- Create another test trip that should automatically require backup
INSERT INTO trips (
    title,
    description,
    theme,
    destination,
    dates,
    price,
    difficulty_level,
    max_participants,
    current_participants,
    trip_status,
    sensei_id,
    is_active
) VALUES (
    'Patagonia Ice Climbing Expedition',
    'Technical ice climbing in Torres del Paine with glacier navigation and advanced rescue techniques.',
    'Ice Climbing',
    'Torres del Paine, Patagonia',
    'April 10-25, 2024',
    '$4,200',
    'Challenging',
    6,
    2,
    'approved',
    (SELECT id FROM sensei_profiles WHERE is_active = true LIMIT 1),
    true
) ON CONFLICT DO NOTHING;