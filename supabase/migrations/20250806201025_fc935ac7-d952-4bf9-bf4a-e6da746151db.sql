-- Temporarily disable all triggers on sensei_profiles to isolate the JSON issue
-- This will help us identify which specific trigger is causing the problem

-- List and disable triggers one by one
ALTER TABLE public.sensei_profiles DISABLE TRIGGER auto_upgrade_sensei_level;
ALTER TABLE public.sensei_profiles DISABLE TRIGGER handle_sensei_level_change_trigger;
ALTER TABLE public.sensei_profiles DISABLE TRIGGER trigger_new_sensei_welcome;
ALTER TABLE public.sensei_profiles DISABLE TRIGGER update_goal_progress_trigger;