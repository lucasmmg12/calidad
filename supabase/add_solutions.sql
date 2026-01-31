-- Add ai_solutions column
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS ai_solutions TEXT;
