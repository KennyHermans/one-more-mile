-- Let's test the function directly to see what it returns
SELECT public.admin_update_sensei_level(
  '00000000-0000-0000-0000-000000000000'::uuid,  -- dummy sensei id for testing
  'journey_guide',
  'Test reason',
  false
);