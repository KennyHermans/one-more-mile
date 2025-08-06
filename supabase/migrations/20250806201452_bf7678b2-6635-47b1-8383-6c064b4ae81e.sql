-- Enable the final trigger - the one we already fixed
ALTER TABLE public.sensei_profiles ENABLE TRIGGER handle_sensei_level_change_trigger;