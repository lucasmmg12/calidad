-- Enable DELETE policy
create policy "Enable delete for all users" on public.reports 
  for delete using (true);
