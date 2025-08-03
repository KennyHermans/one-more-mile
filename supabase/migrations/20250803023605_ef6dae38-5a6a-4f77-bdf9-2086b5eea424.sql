-- Create payment plans table for installment tracking
CREATE TABLE public.payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.trip_bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  total_amount INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL,
  installment_amount INTEGER NOT NULL,
  installment_count INTEGER NOT NULL,
  payments_completed INTEGER DEFAULT 1,
  plan_type TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  next_payment_date TIMESTAMPTZ,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payment reminders table
CREATE TABLE public.payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.trip_bookings(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  message TEXT NOT NULL,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payment failures table for tracking failed attempts
CREATE TABLE public.payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id UUID REFERENCES public.payment_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  failure_reason TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_failures ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_plans
CREATE POLICY "Users can view their own payment plans" 
ON public.payment_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all payment plans" 
ON public.payment_plans 
FOR ALL 
USING (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Edge functions can manage payment plans" 
ON public.payment_plans 
FOR ALL 
USING (true);

-- Create policies for payment_reminders
CREATE POLICY "Users can view their own payment reminders" 
ON public.payment_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all payment reminders" 
ON public.payment_reminders 
FOR ALL 
USING (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Edge functions can manage payment reminders" 
ON public.payment_reminders 
FOR ALL 
USING (true);

-- Create policies for payment_failures
CREATE POLICY "Users can view their own payment failures" 
ON public.payment_failures 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can manage all payment failures" 
ON public.payment_failures 
FOR ALL 
USING (auth.email() = 'kenny_hermans93@hotmail.com');

CREATE POLICY "Edge functions can manage payment failures" 
ON public.payment_failures 
FOR ALL 
USING (true);

-- Create trigger for updating updated_at column on payment_plans
CREATE TRIGGER update_payment_plans_updated_at
BEFORE UPDATE ON public.payment_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();