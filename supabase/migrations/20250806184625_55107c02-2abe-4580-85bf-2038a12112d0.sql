-- Check RLS policies for sensei_profiles and sensei_level_history tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('sensei_profiles', 'sensei_level_history')
ORDER BY tablename, policyname;