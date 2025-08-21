-- Create warranty charges table for tracking all warranty-related charges
CREATE TABLE IF NOT EXISTS public.sensei_warranty_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- Amount in cents
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_charge_id TEXT,
  trip_id UUID,
  charged_by_admin_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create warranty notifications table
CREATE TABLE IF NOT EXISTS public.sensei_warranty_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'setup_required', 'charge_processed', 'setup_complete', 'charge_failed'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on both tables
ALTER TABLE public.sensei_warranty_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensei_warranty_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for warranty charges
CREATE POLICY "Admin can manage all warranty charges" 
ON public.sensei_warranty_charges 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Senseis can view their own warranty charges" 
ON public.sensei_warranty_charges 
FOR SELECT 
USING (
  sensei_id IN (
    SELECT id FROM sensei_profiles 
    WHERE user_id = auth.uid()
  )
);

-- RLS Policies for warranty notifications
CREATE POLICY "Admin can manage all warranty notifications" 
ON public.sensei_warranty_notifications 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

CREATE POLICY "Senseis can view their own warranty notifications" 
ON public.sensei_warranty_notifications 
FOR SELECT 
USING (
  sensei_id IN (
    SELECT id FROM sensei_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Senseis can mark their notifications as read" 
ON public.sensei_warranty_notifications 
FOR UPDATE 
USING (
  sensei_id IN (
    SELECT id FROM sensei_profiles 
    WHERE user_id = auth.uid()
  )
) 
WITH CHECK (
  sensei_id IN (
    SELECT id FROM sensei_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Create function to get warranty analytics
CREATE OR REPLACE FUNCTION public.get_warranty_analytics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  result JSONB;
  total_active INTEGER;
  charges_this_month NUMERIC;
  avg_charge NUMERIC;
BEGIN
  -- Get total active warranty methods
  SELECT COUNT(*) INTO total_active
  FROM sensei_warranty_methods 
  WHERE is_active = true;

  -- Get charges this month
  SELECT COALESCE(SUM(amount), 0) / 100.0 INTO charges_this_month
  FROM sensei_warranty_charges 
  WHERE status = 'succeeded' 
    AND created_at >= date_trunc('month', now());

  -- Get average charge amount
  SELECT COALESCE(AVG(amount), 0) / 100.0 INTO avg_charge
  FROM sensei_warranty_charges 
  WHERE status = 'succeeded';

  result := jsonb_build_object(
    'totalActiveWarranties', total_active,
    'totalChargesThisMonth', ROUND(charges_this_month, 2),
    'averageChargeAmount', ROUND(avg_charge, 2),
    'senseisCovered', total_active
  );

  RETURN result;
END;
$$;

-- Create triggers for updated_at
CREATE OR REPLACE TRIGGER update_warranty_charges_updated_at
BEFORE UPDATE ON public.sensei_warranty_charges
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_warranty_charges_sensei_id ON public.sensei_warranty_charges(sensei_id);
CREATE INDEX IF NOT EXISTS idx_warranty_charges_status ON public.sensei_warranty_charges(status);
CREATE INDEX IF NOT EXISTS idx_warranty_charges_created_at ON public.sensei_warranty_charges(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_warranty_notifications_sensei_id ON public.sensei_warranty_notifications(sensei_id);
CREATE INDEX IF NOT EXISTS idx_warranty_notifications_is_read ON public.sensei_warranty_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_warranty_notifications_created_at ON public.sensei_warranty_notifications(created_at DESC);