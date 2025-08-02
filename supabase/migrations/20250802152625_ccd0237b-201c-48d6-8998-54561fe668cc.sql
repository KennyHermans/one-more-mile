-- Create application for Joost Narraina to become a Sensei
-- Note: This will need manual user_id assignment once the user account is created

INSERT INTO public.applications (
  email,
  full_name,
  location,
  expertise_areas,
  years_experience,
  languages,
  bio,
  why_sensei,
  availability,
  phone,
  portfolio_url,
  reference_text,
  user_id,
  status
) VALUES (
  'kenny@omexco.com',
  'Joost Narraina',
  'Belgium',
  ARRAY[
    'Marine Wildlife Conservation',
    'Ocean Storytelling',
    'Content Creation',
    'Underwater Photography',
    'Whale and Dolphin Research',
    'Business Leadership',
    'Environmental Education'
  ],
  15, -- Estimated years of experience (investment banking + marine work)
  ARRAY['English', 'Dutch'], -- Common languages for Belgium
  'Co-Founder of Maui Travel and ocean storyteller with a unique background spanning London''s investment banking world to marine conservation. After years leading international sales teams, Joost found his true calling beneath the surface. He founded Majortale, a content creation agency documenting marine life encounters globally, before creating Maui - an intimate wildlife expedition company. His approach focuses on creating meaningful connections between humans and marine life, fostering deeper understanding of magnificent sea creatures and their environment. Joost leads small groups to witness sperm whales in Mauritius, humpbacks in Tonga, and whale sharks in the Maldives.',
  'I want to become a Sensei to share my passion for ocean conservation and transform how people connect with marine life. Through Maui, I''ve learned that every expedition is an opportunity to turn observers into ocean advocates. My unique combination of business acumen and marine expertise allows me to craft transformative experiences that go beyond ordinary tourism. I believe in creating meaningful connections that inspire lasting change and deeper respect for our marine environment.',
  'Available for 1-3 week marine expeditions, flexible scheduling around whale migration seasons and optimal marine wildlife viewing periods',
  null, -- Phone not provided
  'https://www.mauitravel.io/team-member/joost-narraina',
  'Co-Founder of Maui Travel - specialized marine wildlife expedition company. Previously founded Majortale content creation agency. Extensive experience in investment banking and international sales leadership. Expert in sperm whale, humpback whale, and whale shark encounters across Mauritius, Tonga, and Maldives.',
  gen_random_uuid(), -- Temporary user_id, will need to be updated when user account is created
  'pending'
);