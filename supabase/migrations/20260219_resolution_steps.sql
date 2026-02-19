-- ============================================================
-- Migration: Two-Step Resolution with Draft Support
-- Description: Adds columns to support the 2-step resolution
--   workflow: Step 1 (immediate action), Step 2 (RCA + plan).
--   Includes draft persistence and auto-save support.
-- ============================================================

SET search_path TO public;

-- 1. Add resolution_step to track which step the assignee is on
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolution_step TEXT DEFAULT 'step1_pending'
  CHECK (resolution_step IN (
    'step1_pending',     -- Awaiting immediate action
    'step1_completed',   -- Immediate action submitted, RCA pending
    'step2_draft',       -- RCA in progress (has draft data)
    'step2_submitted'    -- Full resolution submitted to Quality
  ));

-- 2. Add draft_data JSONB to persist form data for auto-save
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS draft_data JSONB;

-- 3. Add draft_updated_at for showing "last saved" timestamp
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS draft_updated_at TIMESTAMPTZ;

-- 4. Add step1_evidence_urls for images attached during step 1
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS step1_evidence_urls TEXT[];

-- 5. Add step2_evidence_urls for images attached during step 2 (RCA)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS step2_evidence_urls TEXT[];

-- Comment documentation
COMMENT ON COLUMN public.reports.resolution_step IS 'Tracks which step of the 2-step resolution the assignee is on';
COMMENT ON COLUMN public.reports.draft_data IS 'JSONB blob storing draft form data for auto-save (step 2)';
COMMENT ON COLUMN public.reports.draft_updated_at IS 'Timestamp of last auto-save';
COMMENT ON COLUMN public.reports.step1_evidence_urls IS 'Evidence images uploaded during Step 1 (immediate action)';
COMMENT ON COLUMN public.reports.step2_evidence_urls IS 'Evidence images uploaded during Step 2 (RCA + plan)';
