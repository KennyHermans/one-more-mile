-- Fix security warnings by setting search_path for functions

-- Update functions to include search_path
ALTER FUNCTION public.upgrade_sensei_level(UUID, TEXT, TEXT) SET search_path TO 'public';
ALTER FUNCTION public.calculate_sensei_level_eligibility(UUID) SET search_path TO 'public';
ALTER FUNCTION public.get_sensei_trip_status(UUID) SET search_path TO 'public';
ALTER FUNCTION public.request_backup_senseis(UUID) SET search_path TO 'public';