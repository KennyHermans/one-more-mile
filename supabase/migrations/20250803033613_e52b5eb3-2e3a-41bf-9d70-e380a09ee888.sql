-- First, let's update Joost's sensei profile with more realistic stats
UPDATE sensei_profiles 
SET 
  trips_led = 3,
  rating = 4.8
WHERE user_id = 'f6aeb9be-ce31-49b6-af20-62075eaca6cf';

-- Update the current trip to have some participants
UPDATE trips 
SET current_participants = 5
WHERE id = '9e2b5c07-1038-4523-b93f-85f29bd3294e';

-- Create some sample customer profiles for the bookings
INSERT INTO customer_profiles (id, user_id, full_name, phone, emergency_contact_name, emergency_contact_phone) VALUES
  (gen_random_uuid(), gen_random_uuid(), 'Sarah Johnson', '+32 456 789 012', 'Mark Johnson', '+32 456 789 013'),
  (gen_random_uuid(), gen_random_uuid(), 'David Smith', '+44 20 7946 0958', 'Emma Smith', '+44 20 7946 0959'),
  (gen_random_uuid(), gen_random_uuid(), 'Maria Garcia', '+34 91 123 4567', 'Carlos Garcia', '+34 91 123 4568'),
  (gen_random_uuid(), gen_random_uuid(), 'Thomas Mueller', '+49 30 12345678', 'Anna Mueller', '+49 30 12345679'),
  (gen_random_uuid(), gen_random_uuid(), 'Emma Wilson', '+1 555 123 4567', 'James Wilson', '+1 555 123 4568');

-- Create sample trip bookings for the current trip (using the customer profile user_ids)
WITH customer_data AS (
  SELECT user_id, full_name FROM customer_profiles 
  WHERE full_name IN ('Sarah Johnson', 'David Smith', 'Maria Garcia', 'Thomas Mueller', 'Emma Wilson')
)
INSERT INTO trip_bookings (id, trip_id, user_id, booking_status, payment_status, total_amount, booking_date)
SELECT 
  gen_random_uuid(),
  '9e2b5c07-1038-4523-b93f-85f29bd3294e',
  user_id,
  'confirmed',
  'paid',
  2950.00,
  NOW() - INTERVAL '2 weeks'
FROM customer_data;

-- Add some trip reviews to boost his rating
WITH customer_data AS (
  SELECT user_id FROM customer_profiles 
  WHERE full_name IN ('Sarah Johnson', 'David Smith', 'Maria Garcia')
)
INSERT INTO trip_reviews (id, trip_id, user_id, sensei_id, rating, review_text, created_at)
SELECT 
  gen_random_uuid(),
  '9e2b5c07-1038-4523-b93f-85f29bd3294e',
  user_id,
  '73b08295-9535-4d7e-9829-b1f418274576',
  CASE 
    WHEN ROW_NUMBER() OVER () = 1 THEN 5
    WHEN ROW_NUMBER() OVER () = 2 THEN 5
    ELSE 4
  END,
  CASE 
    WHEN ROW_NUMBER() OVER () = 1 THEN 'Absolutely incredible experience! Joost''s knowledge of marine life is unmatched. The whale encounters were life-changing.'
    WHEN ROW_NUMBER() OVER () = 2 THEN 'Amazing trip! Joost made sure everyone felt safe while getting us up close with the most magnificent sea creatures. Highly recommended!'
    ELSE 'Great conservation-focused expedition. Learned so much about ocean protection while having an adventure of a lifetime.'
  END,
  NOW() - INTERVAL '1 month'
FROM customer_data;

-- Create a completed trip from the past to show more experience
INSERT INTO trips (
  id, title, destination, description, price, dates, group_size, sensei_name, 
  image_url, theme, duration_days, difficulty_level, included_amenities, 
  excluded_items, requirements, is_active, max_participants, current_participants,
  sensei_id, program, trip_status, created_by_sensei, cancelled_by_sensei
) VALUES (
  gen_random_uuid(),
  'Humpback Whale Migration - Tonga Adventure',
  'Tonga',
  'Witness the incredible humpback whale migration in the pristine waters of Tonga. This expedition focuses on respectful whale watching and understanding migration patterns while supporting local conservation efforts.',
  '$3,250',
  'August 15-22, 2024',
  '6-8 people',
  'Joost Narraina',
  'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop',
  'Adventure',
  8,
  'Moderate',
  ARRAY['Professional marine guide', 'Underwater equipment', 'Boat transfers', 'Accommodation', 'Local transfers'],
  ARRAY['International flights', 'Travel insurance', 'Personal expenses'],
  ARRAY['Swimming ability', 'Physical fitness', 'Respect for wildlife'],
  false, -- Not active (completed)
  8,
  6, -- Was full
  '73b08295-9535-4d7e-9829-b1f418274576',
  '[
    {"day": 1, "location": "Tonga", "activities": ["Arrival and briefing", "Equipment check"]},
    {"day": 2, "location": "Tonga", "activities": ["First whale encounter", "Migration education"]},
    {"day": 3, "location": "Tonga", "activities": ["Deep water expedition", "Photography workshop"]}
  ]'::jsonb,
  'approved',
  false,
  false
);

-- Update the current trip dates to be upcoming
UPDATE trips 
SET dates = 'March 15-21, 2025'
WHERE id = '9e2b5c07-1038-4523-b93f-85f29bd3294e';