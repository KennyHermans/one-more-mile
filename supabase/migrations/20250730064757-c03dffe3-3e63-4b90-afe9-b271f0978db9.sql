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

-- Insert sample data from existing hardcoded senseis
INSERT INTO public.sensei_profiles (
  user_id, name, specialty, bio, image_url, rating, trips_led, experience, location, specialties
) VALUES 
  (gen_random_uuid(), 'Maya Chen', 'Wellness & Mindfulness', 'Former Buddhist monk with 15 years of meditation practice. Maya guides transformative wellness journeys that combine ancient wisdom with modern adventure.', 'https://images.unsplash.com/photo-1494790108755-2616b612b385?w=400&h=400&fit=crop&crop=face', 4.9, 85, '15 years', 'Based in Nepal', ARRAY['Meditation', 'Trekking', 'Mindfulness', 'Yoga']),
  (gen_random_uuid(), 'Giuseppe Romano', 'Culinary Arts', 'Michelin-starred chef and third-generation cook from Tuscany. Giuseppe shares the secrets of authentic Italian cuisine and wine culture.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face', 4.8, 120, '20 years', 'Based in Italy', ARRAY['Italian Cuisine', 'Wine Pairing', 'Farm-to-Table', 'Cooking Classes']),
  (gen_random_uuid(), 'Thabo Mokoena', 'Wildlife Conservation', 'Wildlife conservationist and cultural ambassador from South Africa. Thabo creates meaningful connections between travelers and African heritage.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face', 4.9, 95, '12 years', 'Based in South Africa', ARRAY['Wildlife', 'Conservation', 'Cultural Heritage', 'Photography']),
  (gen_random_uuid(), 'Klaus Weber', 'Alpine Sports & Fitness', 'Former Olympic ski coach and certified fitness trainer. Klaus combines high-performance training with the beauty of Alpine environments.', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face', 4.7, 78, '18 years', 'Based in Switzerland', ARRAY['Alpine Skiing', 'Fitness Training', 'Mountain Safety', 'Nutrition']),
  (gen_random_uuid(), 'Akiko Tanaka', 'Cultural Immersion', 'Cultural anthropologist and tea ceremony master. Akiko creates deep cultural exchanges that honor traditional practices and modern innovation.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face', 4.8, 67, '10 years', 'Based in Japan', ARRAY['Tea Ceremony', 'Cultural Studies', 'Language', 'Traditional Arts']),
  (gen_random_uuid(), 'Carlos Mendoza', 'Adventure Sports', 'Professional surfer and adventure guide. Carlos brings the thrill of ocean sports and coastal exploration to life-changing adventures.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face', 4.6, 103, '14 years', 'Based in Costa Rica', ARRAY['Surfing', 'Ocean Sports', 'Marine Conservation', 'Adventure Training']);