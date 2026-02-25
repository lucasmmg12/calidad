-- ============================================================
-- Migration: Fix resolution_step CHECK constraint
-- Allow NULL values for reopened/reset tickets
-- ============================================================

SET search_path TO public;

-- Drop the old CHECK constraint and recreate allowing NULL
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_resolution_step_check;

ALTER TABLE public.reports ADD CONSTRAINT reports_resolution_step_check
  CHECK (resolution_step IS NULL OR resolution_step IN (
    'step1_pending',
    'step1_completed',
    'step2_draft',
    'step2_submitted'
  ));

-- Also ensure sector_assignments has immediate_action column  
ALTER TABLE public.sector_assignments ADD COLUMN IF NOT EXISTS immediate_action TEXT;
ALTER TABLE public.sector_assignments ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE public.sector_assignments ADD COLUMN IF NOT EXISTS corrective_plan TEXT;
ALTER TABLE public.sector_assignments ADD COLUMN IF NOT EXISTS implementation_date DATE;
