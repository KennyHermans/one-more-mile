-- Check the current structure of sensei_level_history table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sensei_level_history' 
AND table_schema = 'public';