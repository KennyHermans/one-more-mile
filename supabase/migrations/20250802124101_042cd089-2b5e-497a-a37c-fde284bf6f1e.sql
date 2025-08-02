-- Create settings table for payment configuration
CREATE TABLE public.payment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_name text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Only admin can manage settings
CREATE POLICY "Admin can manage payment settings" 
ON public.payment_settings 
FOR ALL 
USING (auth.email() = 'kenny_hermans93@hotmail.com')
WITH CHECK (auth.email() = 'kenny_hermans93@hotmail.com');

-- Insert default settings
INSERT INTO public.payment_settings (setting_name, setting_value, description) VALUES
('payment_deadline_months', '3', 'Months before trip start when payment is due'),
('reminder_intervals_days', '[7, 3, 1]', 'Days before deadline to send reminders'),
('reminder_frequency_hours', '24', 'Minimum hours between reminder emails'),
('grace_period_hours', '24', 'Hours after deadline before auto-cancellation');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payment_settings_updated_at
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();