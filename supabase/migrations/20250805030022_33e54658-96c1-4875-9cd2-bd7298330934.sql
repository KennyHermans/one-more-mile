-- Fix the missing unique constraint on sensei_matching_insights table

-- Check if the unique constraint exists on sensei_matching_insights
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_catalog.pg_get_constraintdef(oid, true) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.sensei_matching_insights'::regclass;

-- Add unique constraint on sensei_id for sensei_matching_insights table
-- This is required for the ON CONFLICT clause in calculate_sensei_insights function
ALTER TABLE public.sensei_matching_insights 
ADD CONSTRAINT sensei_matching_insights_sensei_id_key 
UNIQUE (sensei_id);