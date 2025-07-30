-- Create trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT NOT NULL,
  dates TEXT NOT NULL,
  group_size TEXT NOT NULL,
  sensei_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  theme TEXT NOT NULL,
  rating NUMERIC DEFAULT 0.0,
  duration_days INTEGER NOT NULL,
  difficulty_level TEXT NOT NULL DEFAULT 'Moderate',
  included_amenities TEXT[] DEFAULT '{}',
  excluded_items TEXT[] DEFAULT '{}',
  requirements TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  max_participants INTEGER NOT NULL DEFAULT 12,
  current_participants INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Create policies for trips
CREATE POLICY "Trips are viewable by everyone" 
ON public.trips 
FOR SELECT 
USING (is_active = true);

-- Admin can manage all trips (using your admin email)
CREATE POLICY "Admin can insert trips" 
ON public.trips 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.uid() = id 
    AND email = 'kenny_hermans93@hotmail.com'
  )
);

CREATE POLICY "Admin can update trips" 
ON public.trips 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.uid() = id 
    AND email = 'kenny_hermans93@hotmail.com'
  )
);

CREATE POLICY "Admin can delete trips" 
ON public.trips 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.uid() = id 
    AND email = 'kenny_hermans93@hotmail.com'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_trips_updated_at
BEFORE UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample trips
INSERT INTO public.trips (title, destination, description, price, dates, group_size, sensei_name, image_url, theme, rating, duration_days, difficulty_level, max_participants, current_participants) VALUES
('Himalayan Trekking & Mindfulness Retreat', 'Nepal', 'A transformative 14-day journey combining high-altitude trekking with daily meditation and mindfulness practices.', '$3,299', 'Apr 15-28, 2024', '8-12 people', 'Maya Chen', 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop', 'Wellness', 4.9, 14, 'Challenging', 12, 0),
('Italian Culinary Masterclass Tour', 'Tuscany, Italy', 'Learn authentic Italian cooking from Michelin-starred chefs while exploring vineyards and local markets.', '$2,799', 'May 10-17, 2024', '6-10 people', 'Giuseppe Romano', 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=800&h=600&fit=crop', 'Culinary', 4.8, 8, 'Easy', 10, 0),
('South African Safari & Conservation', 'Kruger National Park, South Africa', 'Experience wildlife conservation firsthand while enjoying luxury safari accommodations and cultural exchanges.', '$4,599', 'Jun 2-12, 2024', '10-16 people', 'Thabo Mokoena', 'https://images.unsplash.com/photo-1469041797191-50ace28483c3?w=800&h=600&fit=crop', 'Cultural', 4.9, 11, 'Moderate', 16, 0),
('Alpine Skiing & Fitness Retreat', 'Swiss Alps', 'Combine world-class skiing with comprehensive fitness training in the breathtaking Swiss Alps.', '$3,899', 'Feb 5-12, 2024', '8-14 people', 'Klaus Weber', 'https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=800&h=600&fit=crop', 'Sports', 4.7, 8, 'Challenging', 14, 0);