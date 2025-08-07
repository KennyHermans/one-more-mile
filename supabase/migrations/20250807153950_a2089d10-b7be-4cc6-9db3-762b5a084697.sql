-- Check current trip status constraint and update to allow proper values
-- First, let's see what values are being used and what constraint exists

-- Drop the existing constraint if it's too restrictive
ALTER TABLE trips DROP CONSTRAINT IF EXISTS valid_trip_status;

-- Add a new constraint that allows the status values we actually use
ALTER TABLE trips ADD CONSTRAINT valid_trip_status 
  CHECK (trip_status IN ('draft', 'review', 'approved', 'published', 'archived', 'cancelled'));