-- Update sensei profiles to use level-based permissions for trip creation
UPDATE sensei_profiles 
SET can_create_trips = CASE 
  WHEN sensei_level IN ('journey_guide', 'master_sensei') THEN true 
  ELSE false 
END
WHERE sensei_level IS NOT NULL;