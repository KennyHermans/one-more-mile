
-- Seed new payout-related settings (latest wins via created_at ordering; we intentionally insert rather than update)
insert into payment_settings (setting_name, setting_value, description)
values
  ('day1_payout_percents', jsonb_build_object(
    'apprentice', 40,
    'journey_guide', 40,
    'master_sensei', 40
  ), 'Percent of Sensei commission paid on Day 1 (start of trip), by level'),
  ('platform_commission_percents', jsonb_build_object(
    'apprentice', 20,
    'journey_guide', 20,
    'master_sensei', 10
  ), 'Platform commission percent by level; should equal 100 - sensei_commission_percents');

-- Helper to fetch latest payout settings as a single JSON blob
create or replace function public.get_payout_settings()
returns jsonb
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $$
  select jsonb_build_object(
    'sensei_commission_percents', (
      select setting_value from payment_settings 
      where setting_name = 'sensei_commission_percents'
      order by created_at desc limit 1
    ),
    'advance_payout_percents', (
      select setting_value from payment_settings 
      where setting_name = 'advance_payout_percents'
      order by created_at desc limit 1
    ),
    'day1_payout_percents', (
      select setting_value from payment_settings 
      where setting_name = 'day1_payout_percents'
      order by created_at desc limit 1
    ),
    'platform_commission_percents', (
      select setting_value from payment_settings 
      where setting_name = 'platform_commission_percents'
      order by created_at desc limit 1
    ),
    'payout_delay_days', (
      select setting_value from payment_settings 
      where setting_name = 'payout_delay_days'
      order by created_at desc limit 1
    )
  );
$$;
