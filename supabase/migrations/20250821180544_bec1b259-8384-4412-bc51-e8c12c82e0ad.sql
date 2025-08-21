
-- 1) Trips: minimum booking threshold per trip
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS min_participants integer NOT NULL DEFAULT 0;

-- 2) Sensei profiles: Stripe Connect linkage
ALTER TABLE public.sensei_profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_connect_status text NOT NULL DEFAULT 'not_onboarded';

-- 3) Sensei payouts: enrich for trip-based flow and breakdown
-- Note: Table exists and is already used by the app and functions.
ALTER TABLE public.sensei_payouts
  ADD COLUMN IF NOT EXISTS trip_id uuid,
  ADD COLUMN IF NOT EXISTS payout_type text DEFAULT 'final',
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS commission_percent numeric,
  ADD COLUMN IF NOT EXISTS advance_percent numeric,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Optional helpful indexes
CREATE INDEX IF NOT EXISTS idx_sensei_payouts_sensei_status ON public.sensei_payouts (sensei_id, status);
CREATE INDEX IF NOT EXISTS idx_sensei_payouts_scheduled_for ON public.sensei_payouts (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sensei_payouts_trip ON public.sensei_payouts (trip_id);

-- 4) Seed payment settings (new records; existing code reads latest setting by name)
INSERT INTO public.payment_settings (setting_name, setting_value, description)
VALUES
  ('sensei_commission_percents',
   '{"apprentice": 80, "journey_guide": 80, "master_sensei": 90}'::jsonb,
   'Commission percent by sensei level; platform keeps (100 - value)%'),
  ('advance_payout_percents',
   '{"apprentice": 0, "journey_guide": 10, "master_sensei": 10}'::jsonb,
   'Advance payout percent by level, unlocked when trip reaches min_participants'),
  ('payout_delay_days',
   '{"min": 7, "max": 14}'::jsonb,
   'Wait window after trip end before triggering final payout');
