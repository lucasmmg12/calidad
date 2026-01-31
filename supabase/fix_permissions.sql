-- 1. Update Reports Table (Columns)
-- Using IF NOT EXISTS to be safe
alter table public.reports 
  add column if not exists evidence_urls text[],
  add column if not exists resolution_notes text,
  add column if not exists resolution_evidence_urls text[],
  add column if not exists resolved_at timestamp with time zone,
  add column if not exists assigned_to text;

-- 2. ENABLE UPDATE POLICY
-- This is the critical missing piece for the Dashboard to work
create policy "Enable update for all users" on public.reports 
  for update using (true);
