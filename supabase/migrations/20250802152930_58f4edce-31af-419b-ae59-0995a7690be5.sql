-- Update the application to link to the real user account
-- Find the user by email and update the application

UPDATE public.applications 
SET user_id = (
  SELECT auth.users.id 
  FROM auth.users 
  WHERE auth.users.email = 'kenny@omexco.com'
)
WHERE email = 'kenny@omexco.com' 
  AND full_name = 'Joost Narraina';