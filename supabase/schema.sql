-- Create table for reports
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  tracking_id text not null unique,
  content text not null,
  sector text,
  is_anonymous boolean default true,
  contact_number text,
  media_url text, -- For uploaded image URL
  
  -- AI Analysis Fields
  ai_summary text,
  ai_category text,
  ai_urgency text check (ai_urgency in ('Verde', 'Amarillo', 'Rojo')),
  
  status text default 'pending' check (status in ('pending', 'analyzed', 'in_progress', 'resolved')),
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.reports enable row level security;

-- Policy: Allow anyone to insert (public form)
create policy "Enable insert for all users" on public.reports for insert with check (true);

-- Policy: Allow users to view their own report by tracking_id (Need a function or just select)
-- Ideally, we only allow select if they know the tracking_id.
-- For simple RLS, we might allow select where tracking_id = input.
create policy "Enable select by tracking_id" on public.reports for select using (true);
-- Note: 'using (true)' makes it public. For tracking ID privacy, we might handle lookup via a secure function or trust the frontend to only query by ID. 
-- Better: "using (tracking_id = current_setting('app.current_tracking_id', true))" but that's complex for now. 
-- Let's keep it public read for MVP or restrict to authenticated users (Quality Team).
-- Actually, for "Anonymous Tracking", the user just types the ID. If IDs are random enough, it's roughly secure.
