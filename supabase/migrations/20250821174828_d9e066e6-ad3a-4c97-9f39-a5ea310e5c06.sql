-- Add warranty percentage setting and update warranty charges table
-- Insert warranty percentage setting (10%)
INSERT INTO payment_settings (setting_name, setting_value, description)
VALUES (
  'warranty_percentage',
  '{"percentage": 10}',
  'Percentage of trip revenue used for warranty charges'
) ON CONFLICT (setting_name) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();

-- Update warranty disclosure text with new content
INSERT INTO payment_settings (setting_name, setting_value, description)
VALUES (
  'warranty_disclosure_text',
  '{"text": "At One More Mile, we want to keep things safe and fair for everyone — travelers, the platform, and you as a Sensei. That''s why we use a warranty system. The warranty is not an upfront payment. You don''t lose any money unless something goes seriously wrong (like a no-show, fraud or theft). The warranty is a percentage (10%) of the total trip revenue, so it scales fairly. This ensures: Security for the platform, No upfront cost for Senseis, Trust for travelers → trips are always safeguarded"}',
  'Updated warranty disclosure text explaining the percentage-based system'
) ON CONFLICT (setting_name) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();

-- Add trip_id column to sensei_warranty_charges to link charges to specific trips
ALTER TABLE sensei_warranty_charges 
ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES trips(id);

-- Add index for better performance on trip_id queries
CREATE INDEX IF NOT EXISTS idx_sensei_warranty_charges_trip_id 
ON sensei_warranty_charges(trip_id);

-- Update the get_warranty_settings function to include percentage
CREATE OR REPLACE FUNCTION public.get_warranty_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  max_amount_setting jsonb;
  disclosure_setting jsonb;
  percentage_setting jsonb;
BEGIN
  SELECT setting_value INTO max_amount_setting 
  FROM payment_settings 
  WHERE setting_name = 'warranty_max_amount';
  
  SELECT setting_value INTO disclosure_setting 
  FROM payment_settings 
  WHERE setting_name = 'warranty_disclosure_text';
  
  SELECT setting_value INTO percentage_setting 
  FROM payment_settings 
  WHERE setting_name = 'warranty_percentage';
  
  RETURN jsonb_build_object(
    'max_amount', COALESCE(max_amount_setting, '{"amount": 50000, "currency": "eur"}'::jsonb),
    'disclosure_text', COALESCE(disclosure_setting, '{"text": "At One More Mile, we want to keep things safe and fair for everyone — travelers, the platform, and you as a Sensei. That''s why we use a warranty system. The warranty is not an upfront payment. You don''t lose any money unless something goes seriously wrong (like a no-show, fraud or theft). The warranty is a percentage (10%) of the total trip revenue, so it scales fairly. This ensures: Security for the platform, No upfront cost for Senseis, Trust for travelers → trips are always safeguarded"}'::jsonb),
    'warranty_percentage', COALESCE(percentage_setting, '{"percentage": 10}'::jsonb)
  );
END;
$function$;