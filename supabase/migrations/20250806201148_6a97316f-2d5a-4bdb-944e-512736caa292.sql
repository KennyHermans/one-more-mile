-- Re-enable triggers one by one to isolate the problematic trigger
-- Start with the simple updated_at trigger
ALTER TABLE public.sensei_profiles ENABLE TRIGGER update_sensei_profiles_updated_at;