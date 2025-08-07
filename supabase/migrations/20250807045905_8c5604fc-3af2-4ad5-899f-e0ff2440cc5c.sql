-- Enable real-time updates for sensei_profiles table
ALTER TABLE public.sensei_profiles REPLICA IDENTITY FULL;

-- Add sensei_profiles to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensei_profiles;