-- Fix the RLS policy for backup_sensei_requests to allow senseis to respond to their requests
DROP POLICY IF EXISTS "Senseis can respond to their backup requests" ON backup_sensei_requests;

CREATE POLICY "Senseis can respond to their backup requests" ON backup_sensei_requests
FOR UPDATE 
USING (
  sensei_id IN (
    SELECT sp.id 
    FROM sensei_profiles sp 
    WHERE sp.user_id = auth.uid()
  ) 
  AND status = 'pending'
)
WITH CHECK (
  sensei_id IN (
    SELECT sp.id 
    FROM sensei_profiles sp 
    WHERE sp.user_id = auth.uid()
  )
);