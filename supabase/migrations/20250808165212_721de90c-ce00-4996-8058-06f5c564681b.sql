-- Create public bucket for trip cover images
insert into storage.buckets (id, name, public)
values ('trip-covers', 'trip-covers', true)
on conflict (id) do nothing;

-- Policies for trip-covers bucket
-- Allow public read
create policy "Public read for trip-covers"
  on storage.objects
  for select
  using (bucket_id = 'trip-covers');

-- Allow authenticated users to upload to their own folder (userId as first path segment)
create policy "Authenticated upload to trip-covers"
  on storage.objects
  for insert
  with check (
    bucket_id = 'trip-covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own objects
create policy "Authenticated update trip-covers"
  on storage.objects
  for update
  using (
    bucket_id = 'trip-covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'trip-covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own objects
create policy "Authenticated delete trip-covers"
  on storage.objects
  for delete
  using (
    bucket_id = 'trip-covers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );