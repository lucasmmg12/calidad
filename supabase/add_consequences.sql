-- Add column for AI Consequences
alter table public.reports 
  add column if not exists ai_consequences text;
