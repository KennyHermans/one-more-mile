-- Create sensei_goals table
CREATE TABLE public.sensei_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('trips', 'revenue', 'rating', 'skills')),
  target NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  deadline DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sensei_milestones table
CREATE TABLE public.sensei_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.sensei_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sensei_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensei_milestones ENABLE ROW LEVEL SECURITY;

-- Create policies for sensei_goals
CREATE POLICY "Senseis can manage their own goals" 
ON public.sensei_goals 
FOR ALL 
USING (sensei_id IN (
  SELECT id FROM public.sensei_profiles 
  WHERE user_id = auth.uid()
))
WITH CHECK (sensei_id IN (
  SELECT id FROM public.sensei_profiles 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Admin can manage all goals" 
ON public.sensei_goals 
FOR ALL 
USING (auth.email() = 'kenny_hermans93@hotmail.com')
WITH CHECK (auth.email() = 'kenny_hermans93@hotmail.com');

-- Create policies for sensei_milestones
CREATE POLICY "Senseis can manage milestones for their goals" 
ON public.sensei_milestones 
FOR ALL 
USING (goal_id IN (
  SELECT sg.id FROM public.sensei_goals sg
  JOIN public.sensei_profiles sp ON sp.id = sg.sensei_id
  WHERE sp.user_id = auth.uid()
))
WITH CHECK (goal_id IN (
  SELECT sg.id FROM public.sensei_goals sg
  JOIN public.sensei_profiles sp ON sp.id = sg.sensei_id
  WHERE sp.user_id = auth.uid()
));

CREATE POLICY "Admin can manage all milestones" 
ON public.sensei_milestones 
FOR ALL 
USING (auth.email() = 'kenny_hermans93@hotmail.com')
WITH CHECK (auth.email() = 'kenny_hermans93@hotmail.com');

-- Create triggers for updated_at columns
CREATE TRIGGER update_sensei_goals_updated_at
BEFORE UPDATE ON public.sensei_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sensei_milestones_updated_at
BEFORE UPDATE ON public.sensei_milestones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically update goal progress
CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update goals based on real data
  UPDATE public.sensei_goals 
  SET current_value = CASE 
    WHEN category = 'trips' THEN (
      SELECT COALESCE(trips_led, 0) 
      FROM public.sensei_profiles 
      WHERE id = sensei_goals.sensei_id
    )
    WHEN category = 'rating' THEN (
      SELECT COALESCE(rating, 0) 
      FROM public.sensei_profiles 
      WHERE id = sensei_goals.sensei_id
    )
    WHEN category = 'revenue' THEN (
      SELECT COALESCE(SUM(tb.total_amount), 0)
      FROM public.trip_bookings tb
      JOIN public.trips t ON t.id = tb.trip_id
      WHERE t.sensei_id = sensei_goals.sensei_id
      AND tb.payment_status = 'paid'
    )
    ELSE current_value
  END,
  status = CASE 
    WHEN current_value >= target THEN 'completed'
    ELSE status
  END
  WHERE sensei_id = COALESCE(NEW.sensei_id, OLD.sensei_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update goal progress when relevant data changes
CREATE TRIGGER update_goal_progress_on_sensei_change
AFTER UPDATE ON public.sensei_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_goal_progress();

CREATE TRIGGER update_goal_progress_on_booking_change
AFTER INSERT OR UPDATE OR DELETE ON public.trip_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_goal_progress();