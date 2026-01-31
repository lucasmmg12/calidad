-- 1. Create Storage Bucket for Evidence
insert into storage.buckets (id, name, public) 
values ('evidence', 'evidence', true)
on conflict (id) do nothing;

-- 2. Storage Policies (Allow public upload for form, read for dashboard)
create policy "Public Access Evidence" on storage.objects 
  for select using ( bucket_id = 'evidence' );

create policy "Public Upload Evidence" on storage.objects 
  for insert with check ( bucket_id = 'evidence' );

-- 3. Update Reports Table for Multiple Images & Resolution
alter table public.reports 
  add column if not exists evidence_urls text[],
  add column if not exists resolution_notes text,
  add column if not exists resolution_evidence_urls text[],
  add column if not exists resolved_at timestamp with time zone,
  add column if not exists assigned_to text;

-- 4. ENABLE UPDATE POLICY (Fix for Dashboard Resolution)
create policy "Enable update for all users" on public.reports 
  for update using (true);
