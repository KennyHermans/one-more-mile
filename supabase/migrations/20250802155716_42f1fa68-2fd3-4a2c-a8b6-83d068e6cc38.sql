-- Create missing sensei profile for Joost Narraina
INSERT INTO public.sensei_profiles (
  user_id,
  name,
  specialty,
  bio,
  experience,
  location,
  specialties,
  certifications,
  is_active,
  rating,
  trips_led
) VALUES (
  'f6aeb9be-ce31-49b6-af20-62075eaca6cf',
  'Joost Narraina',
  'Marine Wildlife Conservation',
  'Co-Founder of Maui Travel and ocean storyteller with a unique background spanning London''s investment banking world to marine conservation. After years leading international sales teams, Joost found his true calling beneath the surface. He founded Majortale, a content creation agency documenting marine life encounters globally, before creating Maui - an intimate wildlife expedition company. His approach focuses on creating meaningful connections between humans and marine life, fostering deeper understanding of magnificent sea creatures and their environment. Joost leads small groups to witness sperm whales in Mauritius, humpbacks in Tonga, and whale sharks in the Maldives.',
  '15 years',
  'Belgium',
  ARRAY['Marine Wildlife Conservation', 'Ocean Storytelling', 'Content Creation', 'Underwater Photography', 'Whale and Dolphin Research', 'Business Leadership', 'Environmental Education'],
  ARRAY['Marine Biology', 'Diving Instructor', 'Marine Conservation'],
  true,
  0.0,
  0
);