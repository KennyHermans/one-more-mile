-- Temporarily disable all triggers on sensei_profiles to isolate the JSON issue
ALTER TABLE public.sensei_profiles DISABLE TRIGGER auto_upgrade_sensei_level;
ALTER TABLE public.sensei_profiles DISABLE TRIGGER handle_sensei_level_change_trigger;
ALTER TABLE public.sensei_profiles DISABLE TRIGGER trigger_new_sensei_welcome;
ALTER TABLE public.sensei_profiles DISABLE TRIGGER update_goal_progress_on_sensei_change;
ALTER TABLE public.sensei_profiles DISABLE TRIGGER update_sensei_profiles_updated_at;