-- Enable real-time for key tables
ALTER TABLE public.sensei_payouts REPLICA IDENTITY FULL;
ALTER TABLE public.payout_automation_status REPLICA IDENTITY FULL;
ALTER TABLE public.realtime_notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensei_payouts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_automation_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_notifications;