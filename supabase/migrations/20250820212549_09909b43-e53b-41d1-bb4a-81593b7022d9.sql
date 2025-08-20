
-- 1) Types for payout methods and statuses
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_method_type') THEN
    CREATE TYPE public.payout_method_type AS ENUM ('bank_transfer');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE public.payout_status AS ENUM ('pending','processing','paid','failed','cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_method_status') THEN
    CREATE TYPE public.payout_method_status AS ENUM ('unverified','verified','rejected');
  END IF;
END
$$;

-- 2) Payout methods table (masked IBAN only)
CREATE TABLE IF NOT EXISTS public.sensei_payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensei_id uuid NOT NULL REFERENCES public.sensei_profiles(id) ON DELETE CASCADE,
  method_type public.payout_method_type NOT NULL DEFAULT 'bank_transfer',
  display_name text,
  account_holder_name text NOT NULL,
  masked_iban text NOT NULL,     -- e.g. "NL** **** **** **12"
  iban_last4 text NOT NULL,      -- last 4 for display
  country text,
  currency text DEFAULT 'EUR',
  is_default boolean NOT NULL DEFAULT false,
  status public.payout_method_status NOT NULL DEFAULT 'unverified',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensei_payout_methods_sensei_id ON public.sensei_payout_methods(sensei_id);
CREATE INDEX IF NOT EXISTS idx_sensei_payout_methods_default ON public.sensei_payout_methods(sensei_id, is_default);

-- 3) Payouts table (admin-managed; sensei can view)
CREATE TABLE IF NOT EXISTS public.sensei_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensei_id uuid NOT NULL REFERENCES public.sensei_profiles(id) ON DELETE CASCADE,
  method_id uuid REFERENCES public.sensei_payout_methods(id),
  trip_id uuid REFERENCES public.trips(id),
  booking_id uuid REFERENCES public.trip_bookings(id),
  gross_amount numeric(12,2) NOT NULL,     -- booking revenue attributable to sensei for this payout line
  platform_fee numeric(12,2) DEFAULT 0,
  net_amount numeric(12,2) NOT NULL,       -- amount paid to sensei
  currency text DEFAULT 'EUR',
  status public.payout_status NOT NULL DEFAULT 'pending',
  period_start timestamptz,
  period_end timestamptz,
  notes text,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensei_payouts_sensei_id ON public.sensei_payouts(sensei_id);
CREATE INDEX IF NOT EXISTS idx_sensei_payouts_status ON public.sensei_payouts(status);

-- 4) Timestamps triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_updated_at_payout_methods ON public.sensei_payout_methods;
CREATE TRIGGER trg_set_updated_at_payout_methods
BEFORE UPDATE ON public.sensei_payout_methods
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_set_updated_at_payouts ON public.sensei_payouts;
CREATE TRIGGER trg_set_updated_at_payouts
BEFORE UPDATE ON public.sensei_payouts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 5) Enforce a single default payout method per sensei
CREATE OR REPLACE FUNCTION public.enforce_single_default_payout_method()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default IS TRUE THEN
    UPDATE public.sensei_payout_methods
    SET is_default = FALSE, updated_at = now()
    WHERE sensei_id = NEW.sensei_id
      AND id <> NEW.id
      AND is_default IS TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_default ON public.sensei_payout_methods;
CREATE TRIGGER trg_enforce_single_default
BEFORE INSERT OR UPDATE OF is_default ON public.sensei_payout_methods
FOR EACH ROW
EXECUTE FUNCTION public.enforce_single_default_payout_method();

-- 6) Row Level Security
ALTER TABLE public.sensei_payout_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensei_payouts ENABLE ROW LEVEL SECURITY;

-- Admin can manage everything
DROP POLICY IF EXISTS "Admin manage payout methods" ON public.sensei_payout_methods;
CREATE POLICY "Admin manage payout methods"
ON public.sensei_payout_methods
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manage payouts" ON public.sensei_payouts;
CREATE POLICY "Admin manage payouts"
ON public.sensei_payouts
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Senseis can fully manage their own payout methods
DROP POLICY IF EXISTS "Sensei manage own payout methods" ON public.sensei_payout_methods;
CREATE POLICY "Sensei manage own payout methods"
ON public.sensei_payout_methods
FOR ALL
USING (
  sensei_id IN (
    SELECT sp.id FROM public.sensei_profiles sp
    WHERE sp.user_id = auth.uid()
  )
)
WITH CHECK (
  sensei_id IN (
    SELECT sp.id FROM public.sensei_profiles sp
    WHERE sp.user_id = auth.uid()
  )
);

-- Senseis can view their own payouts (but not insert/update)
DROP POLICY IF EXISTS "Sensei view own payouts" ON public.sensei_payouts;
CREATE POLICY "Sensei view own payouts"
ON public.sensei_payouts
FOR SELECT
USING (
  sensei_id IN (
    SELECT sp.id FROM public.sensei_profiles sp
    WHERE sp.user_id = auth.uid()
  )
);

-- 7) Earnings summary function
CREATE OR REPLACE FUNCTION public.get_sensei_earnings_summary(p_sensei_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_sensei_id uuid;
  commission_percent numeric := 80; -- default fallback
  total_gross numeric := 0;
  total_earnings numeric := 0;
  total_paid numeric := 0;
BEGIN
  -- Determine target sensei
  IF p_sensei_id IS NULL THEN
    SELECT sp.id INTO v_sensei_id
    FROM public.sensei_profiles sp
    WHERE sp.user_id = auth.uid()
    LIMIT 1;
  ELSE
    v_sensei_id := p_sensei_id;
  END IF;

  -- Authorization: non-admins can only query their own sensei_id
  IF NOT public.is_admin() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sensei_profiles sp
      WHERE sp.id = v_sensei_id AND sp.user_id = auth.uid()
    ) THEN
      RETURN jsonb_build_object('error', 'not_authorized');
    END IF;
  END IF;

  -- Commission percent from payment_settings if available (e.g. {"percent": 80})
  SELECT COALESCE((ps.setting_value->>'percent')::numeric, commission_percent)
  INTO commission_percent
  FROM public.payment_settings ps
  WHERE ps.setting_name = 'sensei_commission_percent'
  ORDER BY ps.created_at DESC
  LIMIT 1;

  -- Total gross paid bookings for this sensei
  SELECT COALESCE(SUM(tb.total_amount), 0) INTO total_gross
  FROM public.trip_bookings tb
  JOIN public.trips t ON t.id = tb.trip_id
  WHERE t.sensei_id = v_sensei_id
    AND tb.payment_status = 'paid';

  -- Total already paid out to sensei
  SELECT COALESCE(SUM(spo.net_amount), 0) INTO total_paid
  FROM public.sensei_payouts spo
  WHERE spo.sensei_id = v_sensei_id
    AND spo.status = 'paid';

  total_earnings := ROUND((total_gross * commission_percent / 100.0)::numeric, 2);

  RETURN jsonb_build_object(
    'sensei_id', v_sensei_id,
    'commission_percent', commission_percent,
    'total_gross', total_gross,
    'total_earnings', total_earnings,
    'total_paid', total_paid,
    'balance_due', GREATEST(total_earnings - total_paid, 0)
  );
END;
$$;

-- 8) Seed a default commission setting if missing
INSERT INTO public.payment_settings (setting_name, setting_value, description)
SELECT 'sensei_commission_percent', '{"percent":80}'::jsonb, 'Default percent of booking revenue paid to senseis'
WHERE NOT EXISTS (
  SELECT 1 FROM public.payment_settings WHERE setting_name = 'sensei_commission_percent'
);
