-- Remove sensei levels system (fixed dependencies)

-- Drop triggers first
DROP TRIGGER IF EXISTS sensei_level_progression_trigger ON public.trips;

-- Drop functions that depend on sensei_level type
DROP FUNCTION IF EXISTS public.get_sensei_trip_status();
DROP FUNCTION IF EXISTS public.update_sensei_level_permissions(sensei_level, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.calculate_sensei_level_eligibility(uuid);
DROP FUNCTION IF EXISTS public.upgrade_sensei_level(uuid, sensei_level, uuid, text, boolean);
DROP FUNCTION IF EXISTS public.upgrade_sensei_level(uuid, sensei_level, uuid, text);
DROP FUNCTION IF EXISTS public.check_sensei_level_progression();

-- Drop level-related tables
DROP TABLE IF EXISTS public.sensei_level_history CASCADE;
DROP TABLE IF EXISTS public.sensei_level_permissions CASCADE;
DROP TABLE IF EXISTS public.sensei_level_field_permissions CASCADE;
DROP TABLE IF EXISTS public.level_requirements CASCADE;

-- Remove level-related columns from sensei_profiles
ALTER TABLE public.sensei_profiles 
DROP COLUMN IF EXISTS sensei_level,
DROP COLUMN IF EXISTS level_achieved_at,
DROP COLUMN IF EXISTS level_requirements_met;

-- Drop the sensei_level enum type
DROP TYPE IF EXISTS sensei_level CASCADE;