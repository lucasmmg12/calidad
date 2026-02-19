-- ============================================================
-- Migration: Multi-Sector Assignment System
-- Description: Creates the sector_assignments table to support
--              multi-sector resolution workflows where a single
--              report can be assigned to multiple sectors/responsables
--              simultaneously, with support for partial solutions.
-- ============================================================

-- Ensure we're working in the public schema
SET search_path TO public;

-- 1. Create the sector_assignments table
CREATE TABLE IF NOT EXISTS public.sector_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    sector TEXT NOT NULL,
    assigned_phone TEXT,
    assigned_user_id UUID,
    management_type TEXT NOT NULL DEFAULT 'simple' CHECK (management_type IN ('simple', 'desvio', 'adverse')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'partial', 'rejected', 'quality_validation')),
    resolution_notes TEXT,
    root_cause TEXT,
    corrective_plan TEXT,
    immediate_action TEXT,
    implementation_date DATE,
    resolution_evidence_urls JSONB DEFAULT '[]'::JSONB,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sector_assignments_report_id ON public.sector_assignments(report_id);
CREATE INDEX IF NOT EXISTS idx_sector_assignments_status ON public.sector_assignments(status);

-- 3. Update reports status constraint to include new multi-sector statuses
-- (Dropping and recreating to be safe)
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check CHECK (
    status IN (
        'pending',
        'analyzed',
        'pending_resolution',
        'in_progress',
        'quality_validation',
        'resolved',
        'cancelled',
        'discarded',
        'assignment_rejected',
        'multi_sector_pending'
    )
);

-- 4. Enable RLS
ALTER TABLE public.sector_assignments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (permissive for now, can be tightened later)
CREATE POLICY "Allow all access to sector_assignments"
    ON public.sector_assignments
    FOR ALL
    USING (true)
    WITH CHECK (true);
