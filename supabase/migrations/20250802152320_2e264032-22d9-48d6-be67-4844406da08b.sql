-- Insert a new trip based on Joost Narraina's marine wildlife expertise
INSERT INTO public.trips (
  title,
  destination,
  description,
  duration_days,
  price,
  theme,
  difficulty_level,
  dates,
  group_size,
  sensei_name,
  image_url,
  included_amenities,
  excluded_items,
  requirements,
  max_participants,
  program,
  trip_status,
  is_active
) VALUES (
  'Marine Wildlife Expedition - Whale & Dolphin Encounters',
  'Mauritius',
  'Experience the magic of the ocean through intimate encounters with sperm whales, dolphins, and other magnificent marine life. Led by ocean storyteller Joost Narraina, this transformative expedition combines wildlife observation with conservation education, creating meaningful connections between humans and marine life.',
  7,
  '$2,950',
  'Cultural',
  'Moderate',
  'May 15-21, 2024',
  '6-8 people',
  'Joost Narraina',
  'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop',
  ARRAY[
    'Professional marine biologist guide',
    'Underwater photography equipment',
    'All boat transfers and marine excursions',
    'Snorkeling gear and safety equipment',
    'Educational materials and marine life identification guides',
    'Daily breakfast and lunch during excursions',
    'Accommodation for 6 nights',
    'Airport transfers'
  ],
  ARRAY[
    'International flights',
    'Travel insurance',
    'Dinner meals',
    'Personal diving certification (if diving)',
    'Gratuities',
    'Alcoholic beverages'
  ],
  ARRAY[
    'Basic swimming ability required',
    'Comfortable with boat travel',
    'Respect for marine wildlife and conservation principles',
    'Physical fitness for water activities',
    'Valid passport with 6+ months validity'
  ],
  8,
  '[
    {
      "day": 1,
      "title": "Arrival & Ocean Orientation",
      "activities": [
        "Airport transfer and accommodation check-in",
        "Welcome briefing with Joost - Marine conservation overview", 
        "Equipment fitting and safety orientation",
        "Sunset coastal walk and marine ecosystem introduction"
      ]
    },
    {
      "day": 2,
      "title": "First Marine Encounter",
      "activities": [
        "Early morning boat departure",
        "Sperm whale observation and behavior study",
        "Underwater photography workshop",
        "Marine life identification session"
      ]
    },
    {
      "day": 3,
      "title": "Dolphin Research Day",
      "activities": [
        "Dolphin pod tracking and observation",
        "Snorkeling with tropical fish species",
        "Data collection for marine research",
        "Storytelling session - Ocean conservation stories"
      ]
    },
    {
      "day": 4,
      "title": "Deep Ocean Exploration",
      "activities": [
        "Deep water whale watching expedition",
        "Underwater filming techniques workshop",
        "Marine ecosystem education",
        "Evening: Content creation and reflection"
      ]
    },
    {
      "day": 5,
      "title": "Conservation in Action",
      "activities": [
        "Visit local marine conservation center",
        "Participate in coral restoration project",
        "Meet local marine biologists",
        "Sustainable tourism discussion"
      ]
    },
    {
      "day": 6,
      "title": "Final Ocean Adventure",
      "activities": [
        "Ultimate whale watching experience",
        "Group photography and filming session",
        "Reflection on marine conservation impact",
        "Farewell dinner with local specialties"
      ]
    },
    {
      "day": 7,
      "title": "Departure",
      "activities": [
        "Final breakfast and checkout",
        "Ocean advocacy commitment ceremony",
        "Airport transfer",
        "Departure with lifetime memories and conservation mission"
      ]
    }
  ]'::jsonb,
  'approved',
  true
);