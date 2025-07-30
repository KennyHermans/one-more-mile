-- Create Sensei profiles table
CREATE TABLE public.sensei_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  bio TEXT NOT NULL,
  image_url TEXT,
  rating DECIMAL(2,1) DEFAULT 0.0,
  trips_led INTEGER DEFAULT 0,
  experience TEXT NOT NULL,
  location TEXT NOT NULL,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sensei_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for sensei_profiles
CREATE POLICY "Sensei profiles are viewable by everyone" 
  ON public.sensei_profiles 
  FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Senseis can update their own profile" 
  ON public.sensei_profiles 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Senseis can insert their own profile" 
  ON public.sensei_profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sensei_profiles_updated_at
  BEFORE UPDATE ON public.sensei_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();