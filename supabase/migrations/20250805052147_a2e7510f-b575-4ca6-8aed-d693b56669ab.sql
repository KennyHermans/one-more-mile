-- Remove backup sensei functionality

-- Drop backup sensei related tables
DROP TABLE IF EXISTS public.backup_sensei_requests CASCADE;
DROP TABLE IF EXISTS public.backup_sensei_applications CASCADE;

-- Drop backup sensei related functions
DROP FUNCTION IF EXISTS public.request_backup_senseis(uuid, integer);
DROP FUNCTION IF EXISTS public.suggest_senseis_for_trip_enhanced(text, text[], uuid);

-- Remove backup sensei related columns from trips table
ALTER TABLE public.trips 
DROP COLUMN IF EXISTS backup_sensei_id,
DROP COLUMN IF EXISTS requires_backup_sensei,
DROP COLUMN IF EXISTS backup_assignment_deadline;

-- Remove backup sensei related triggers
DROP TRIGGER IF EXISTS create_backup_alert_trigger ON public.trips;
DROP TRIGGER IF EXISTS set_backup_deadline_trigger ON public.trips;

-- Drop backup sensei related functions for triggers
DROP FUNCTION IF EXISTS public.create_backup_alert();
DROP FUNCTION IF EXISTS public.set_backup_assignment_deadline();