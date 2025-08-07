-- Fix missing columns in trips table if they don't exist
DO $$ 
BEGIN 
  -- Add trip_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'trip_status'
  ) THEN
    ALTER TABLE trips ADD COLUMN trip_status TEXT DEFAULT 'draft';
  END IF;

  -- Add backup_assignment_deadline if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'backup_assignment_deadline'
  ) THEN
    ALTER TABLE trips ADD COLUMN backup_assignment_deadline TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add workflow_metadata if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' AND column_name = 'workflow_metadata'
  ) THEN
    ALTER TABLE trips ADD COLUMN workflow_metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;