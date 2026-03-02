-- ============================================================
-- Migration: Supplementary Information Requests
-- Description: Creates table for responsables to request
--   additional information from reporters when data is
--   insufficient to resolve a ticket. Supports the full
--   cycle: request → reporter completes form → notify back.
-- ============================================================

SET search_path TO public;

-- 1. Create supplementary_requests table
CREATE TABLE IF NOT EXISTS public.supplementary_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.sector_assignments(id) ON DELETE SET NULL,

    -- Who requests and from whom
    requested_by_sector TEXT NOT NULL,
    reporter_phone TEXT,

    -- What the responsable needs
    request_message TEXT NOT NULL,

    -- Reporter's response
    response_text TEXT,
    response_evidence_urls TEXT[],
    responded_at TIMESTAMPTZ,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'completed', 'expired')),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_supplementary_requests_report_id
    ON public.supplementary_requests(report_id);
CREATE INDEX IF NOT EXISTS idx_supplementary_requests_status
    ON public.supplementary_requests(status);

-- 3. Enable RLS
ALTER TABLE public.supplementary_requests ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy (permissive — public form needs to write)
CREATE POLICY "Allow all access to supplementary_requests"
    ON public.supplementary_requests
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Update resolution_step constraint to allow 'awaiting_info'
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_resolution_step_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_resolution_step_check
  CHECK (resolution_step IS NULL OR resolution_step IN (
    'step1_pending',
    'step1_completed',
    'step2_draft',
    'step2_submitted',
    'awaiting_info'
  ));

-- Comments
COMMENT ON TABLE public.supplementary_requests IS 'Tracks requests for additional info from reporters by sector responsables';
COMMENT ON COLUMN public.supplementary_requests.request_message IS 'What information the responsable needs from the reporter';
COMMENT ON COLUMN public.supplementary_requests.response_text IS 'Additional text provided by the reporter';
COMMENT ON COLUMN public.supplementary_requests.response_evidence_urls IS 'Additional photos/evidence from reporter';
