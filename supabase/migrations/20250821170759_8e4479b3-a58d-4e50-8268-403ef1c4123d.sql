-- Create warranty payment methods table
CREATE TABLE public.sensei_warranty_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID NOT NULL,
  stripe_setup_intent_id TEXT NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sensei_id, is_active) -- Only one active warranty method per sensei
);

-- Create warranty charges table
CREATE TABLE public.sensei_warranty_charges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sensei_id UUID NOT NULL,
  warranty_method_id UUID NOT NULL REFERENCES sensei_warranty_methods(id),
  stripe_payment_intent_id TEXT NOT NULL,
  amount_charged INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'eur',
  charge_reason TEXT NOT NULL,
  charged_by_admin UUID,
  charge_status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sensei_warranty_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensei_warranty_charges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sensei_warranty_methods
CREATE POLICY "Senseis can view their own warranty methods" 
ON public.sensei_warranty_methods 
FOR SELECT 
USING (sensei_id IN (SELECT id FROM sensei_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Senseis can update their own warranty methods" 
ON public.sensei_warranty_methods 
FOR UPDATE 
USING (sensei_id IN (SELECT id FROM sensei_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Edge functions can manage warranty methods" 
ON public.sensei_warranty_methods 
FOR ALL 
USING (true);

CREATE POLICY "Admins can manage all warranty methods" 
ON public.sensei_warranty_methods 
FOR ALL 
USING (is_admin());

-- RLS Policies for sensei_warranty_charges  
CREATE POLICY "Senseis can view their own warranty charges" 
ON public.sensei_warranty_charges 
FOR SELECT 
USING (sensei_id IN (SELECT id FROM sensei_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Edge functions can manage warranty charges" 
ON public.sensei_warranty_charges 
FOR ALL 
USING (true);

CREATE POLICY "Admins can manage all warranty charges" 
ON public.sensei_warranty_charges 
FOR ALL 
USING (is_admin());

-- Add warranty settings to payment_settings table
INSERT INTO public.payment_settings (setting_name, setting_value, description) VALUES 
('warranty_max_amount', '{"amount": 50000, "currency": "eur"}', 'Maximum warranty amount in cents (€500)'),
('warranty_disclosure_text', '{"text": "This card will not be charged now. It serves as a warranty in case of cancellations, damages, or breaches of the Sensei Agreement."}', 'Warranty disclosure text shown to senseis')
ON CONFLICT (setting_name) DO NOTHING;

-- Create function to get warranty settings
CREATE OR REPLACE FUNCTION public.get_warranty_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  max_amount_setting jsonb;
  disclosure_setting jsonb;
BEGIN
  SELECT setting_value INTO max_amount_setting 
  FROM payment_settings 
  WHERE setting_name = 'warranty_max_amount';
  
  SELECT setting_value INTO disclosure_setting 
  FROM payment_settings 
  WHERE setting_name = 'warranty_disclosure_text';
  
  RETURN jsonb_build_object(
    'max_amount', COALESCE(max_amount_setting, '{"amount": 50000, "currency": "eur"}'::jsonb),
    'disclosure_text', COALESCE(disclosure_setting, '{"text": "This card will not be charged now. It serves as a warranty in case of cancellations, damages, or breaches of the Sensei Agreement."}'::jsonb)
  );
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_sensei_warranty_methods_updated_at
BEFORE UPDATE ON public.sensei_warranty_methods
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_sensei_warranty_charges_updated_at
BEFORE UPDATE ON public.sensei_warranty_charges
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();