-- Add 'partner' value to platform_role enum if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_role') THEN
    BEGIN
      ALTER TYPE public.platform_role ADD VALUE IF NOT EXISTS 'partner';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;