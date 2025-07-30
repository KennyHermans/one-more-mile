-- Insert example South Africa sport and nutrition trip
INSERT INTO public.trips (
  title,
  destination,
  description,
  price,
  dates,
  group_size,
  sensei_name,
  image_url,
  theme,
  duration_days,
  difficulty_level,
  program,
  included_amenities,
  excluded_items,
  requirements,
  max_participants,
  current_participants,
  rating,
  is_active
) VALUES (
  'Cape Town Athletic Performance & Nutrition Bootcamp',
  'Cape Town, South Africa',
  'Transform your athletic performance through elite sports training and cutting-edge nutrition science in the stunning backdrop of Cape Town. This intensive program combines high-altitude training, sports nutrition workshops, and recovery techniques used by professional athletes.',
  '$2,499',
  'March 15-22, 2024',
  '8-12 participants',
  'Dr. Sarah Martinez',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop',
  'Sport & Nutrition',
  8,
  'Challenging',
  '[
    {
      "day": 1,
      "location": "Cape Town International Airport",
      "activities": "Arrival and welcome dinner at V&A Waterfront. Initial fitness assessment and nutrition consultation."
    },
    {
      "day": 2,
      "location": "Table Mountain",
      "activities": "High-altitude hiking training session. Introduction to altitude adaptation and its effects on performance. Evening nutrition workshop on pre-exercise fueling."
    },
    {
      "day": 3,
      "location": "Camps Bay Beach",
      "activities": "Beach training bootcamp including sand sprints, resistance training, and ocean swimming. Hydration and electrolyte balance workshop."
    },
    {
      "day": 4,
      "location": "University of Cape Town Sports Science Lab",
      "activities": "VO2 max testing, body composition analysis, and metabolic assessment. Personalized nutrition plan development."
    },
    {
      "day": 5,
      "location": "Lion''s Head Peak",
      "activities": "Sunrise summit hike and meditation session. Recovery nutrition workshop focusing on post-exercise meal timing."
    },
    {
      "day": 6,
      "location": "Stellenbosch Wine Region",
      "activities": "Cycling tour through wine country. Farm-to-table nutrition experience and antioxidant education with local organic produce."
    },
    {
      "day": 7,
      "location": "Muizenberg Beach",
      "activities": "Surfing lessons and water sports. Sports psychology session on mental performance and nutrition''s role in cognitive function."
    },
    {
      "day": 8,
      "location": "Cape Town City Center",
      "activities": "Final fitness testing, program review, and personalized take-home nutrition and training plans. Farewell dinner."
    }
  ]'::jsonb,
  ARRAY[
    'Airport transfers',
    'Luxury accommodation at Camps Bay',
    'All meals with sports nutrition focus',
    'Professional fitness assessments',
    'Sports science lab testing',
    'Certified nutrition counselor',
    'Training equipment and gear',
    'Recovery massage sessions'
  ],
  ARRAY[
    'International flights',
    'Travel insurance',
    'Personal shopping',
    'Alcohol (except wine tasting)',
    'Medical consultations'
  ],
  ARRAY[
    'Intermediate to advanced fitness level',
    'Medical clearance for high-intensity exercise',
    'Swimming ability required',
    'No serious food allergies',
    'Commitment to 6-month follow-up program'
  ],
  12,
  3,
  4.8,
  true
);