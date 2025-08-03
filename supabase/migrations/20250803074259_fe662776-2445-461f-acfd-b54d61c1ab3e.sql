-- Update all trip prices to use Euro currency
UPDATE trips 
SET price = CASE 
  WHEN price LIKE '$%' THEN '€' || REPLACE(price, '$', '')
  WHEN price ~ '^[0-9]+(\.[0-9]+)?$' THEN '€' || price
  ELSE '€' || REGEXP_REPLACE(price, '[^0-9.,]', '', 'g')
END
WHERE price IS NOT NULL;

-- Update any currency-related settings to EUR
UPDATE payment_settings 
SET setting_value = jsonb_set(setting_value, '{currency}', '"eur"')
WHERE setting_name LIKE '%currency%' OR setting_value ? 'currency';