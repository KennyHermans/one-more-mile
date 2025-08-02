-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the payment reminders function to run daily at 9 AM
SELECT cron.schedule(
  'payment-reminders-daily',
  '0 9 * * *', -- Daily at 9 AM
  $$
  SELECT
    net.http_post(
        url:='https://qvirgcrbnwcyhbqdazjy.supabase.co/functions/v1/payment-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2aXJnY3JibndjeWhicWRhemp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTAzNTEsImV4cCI6MjA2OTQyNjM1MX0.WM4XueoIBsue-EmoQI-dIwmNrc3lBd35MR3PhevhI20"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);