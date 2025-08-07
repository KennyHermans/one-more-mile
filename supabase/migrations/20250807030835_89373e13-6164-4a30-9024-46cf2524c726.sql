-- Check and drop all triggers on trips table that might be causing issues
DROP TRIGGER IF EXISTS flag_high_value_trips_trigger ON trips;
DROP TRIGGER IF EXISTS backup_sensei_trigger ON trips;
DROP TRIGGER IF EXISTS trip_backup_trigger ON trips;

-- Insert the trip without any triggers
INSERT INTO trips (
  title,
  description,
  destination,
  dates,
  price,
  group_size,
  max_participants,
  theme,
  program,
  included_amenities,
  excluded_items,
  requirements,
  difficulty_level,
  duration_days,
  is_active,
  trip_status,
  sensei_name,
  image_url
) VALUES (
  'The White Lake Tour',
  'Our most magical tour to see the most beautiful waterspots of Mongolia without going all the way to Khuvsgul lake. A combination of prime spots from the Orkhon tour and Khuvsgul lake tour. You will ride through endless steppes, mountains, sand dunes, rivers, visit nomadic families and the overwhelming Erdenee Zuu monastery. This tour includes one day of pure sand dune riding in Elsen Tasarkhai and camping next to the White Lake. This tour is 85% off-road covering approximately 1500km through Mongolia.',
  'Mongolia',
  'Available year-round (specific dates TBD)',
  '€4,240',
  '6-12 riders',
  12,
  'Adventure',
  '[
    {"day": 1, "title": "Welcome Day", "location": "Ulaanbaatar", "activities": ["Airport pickup and check-in at UB Grand Hotel", "Afternoon team meeting and safety briefing", "Welcome dinner at Hutong restaurant, Shangri-La hotel"]},
    {"day": 2, "title": "Sand Dunes Adventure", "location": "Elsen Tasarkhai", "distance": "350km", "activities": ["Early morning departure", "Experience enduro riding in Mongolian steppe", "Ride to Elsen Tasarkhai sand dunes", "Camping with bonfire and BBQ dinner"]},
    {"day": 3, "title": "Orkhon River Valley", "location": "Uurtiin Tokhoi", "distance": "160km", "activities": ["Morning sand dune riding", "Visit Kharkhorin, ancient Mongol empire capital", "Ride through stunning Orkhon valley landscape", "Stay at Talibun ger camp next to scenic canyon", "Optional fly fishing/spinning at Orkhon river"]},
    {"day": 4, "title": "Orkhon Waterfall & Hot Springs", "location": "Tsenkher Hot Spring", "distance": "240km", "activities": ["Ride to Orkhon Waterfall", "Lunch next to the waterfall", "Continue to Tsenkher hot spring", "Relax in hot spa and open air swimming pool at Khangai resort"]},
    {"day": 5, "title": "White Lake Paradise", "location": "Terkhiin Tsagaan Lake", "distance": "202km", "activities": ["Pass by enormous Chuluut river canyon", "Visit ancient Khorgo volcano", "Arrive at beautiful Terkh (White Lake)", "Stay at Maikhan Tolgoi tour camp", "Swimming in the lake"]},
    {"day": 6, "title": "Endless Steppe to Ugii", "location": "Ugii Lake", "distance": "250-300km", "activities": ["Cross seemingly endless steppe", "Arrive at freshwater Ugii lake", "Fishing and birdlife observation", "Swimming and relaxation", "BBQ dinner under starry sky", "Tent camping"]},
    {"day": 7, "title": "Przewalski Horse Sanctuary", "location": "Khustai National Park", "distance": "280km", "activities": ["Ride to Khustai National Park", "Observe Przewalski horse reintroduction program", "Wildlife viewing and park exploration"]},
    {"day": 8, "title": "Return to Capital", "location": "Ulaanbaatar", "distance": "90km", "activities": ["Return ride to Ulaanbaatar", "Shower and rest break", "Optional cashmere shopping", "Farewell dinner at best hot pot restaurant", "Optional nightlife exploration"]},
    {"day": 9, "title": "Departure", "location": "Ulaanbaatar", "activities": ["Airport transfer", "Departure preparations", "Safe travels home"]}
  ]'::jsonb,
  ARRAY[
    'Airport pickup and drop-off service',
    'All meals in Mongolia including bottled water and soft drinks',
    '2 hotel nights in Ulaanbaatar',
    'Ger camp accommodation costs',
    'National park entrance fees',
    'All camping equipment needed',
    '2 support vehicles',
    'Professional team: 1 Guide/tour leader, 1 mechanic/roadmaster, 2 assistants, 1 private chef',
    'Husqvarna FE450 or 701 Enduro motorcycle',
    'Fuel/gas for entire tour'
  ],
  ARRAY[
    'International flight costs',
    'Visa costs',
    'Health insurance',
    'Protective gear (available for rent at €25 per day per person)'
  ],
  ARRAY[
    'Valid motorcycle license',
    'Enduro/off-road riding experience',
    'Good physical fitness',
    'Travel insurance',
    'Valid passport (visa may be required)'
  ],
  'Advanced',
  9,
  true,
  'approved',
  'Adventure Guide',
  'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&h=600&fit=crop'
);