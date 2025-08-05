-- Check constraints on sensei_skills table and fix any potential conflicts

-- First, let's see the current table structure
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_catalog.pg_get_constraintdef(oid, true) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.sensei_skills'::regclass;

-- Check if there are any triggers on sensei_skills
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'sensei_skills';

-- Add a unique constraint on sensei_id + skill_name to prevent duplicates
-- This will allow proper upsert operations if needed in the future
ALTER TABLE public.sensei_skills 
ADD CONSTRAINT sensei_skills_sensei_id_skill_name_key 
UNIQUE (sensei_id, skill_name);