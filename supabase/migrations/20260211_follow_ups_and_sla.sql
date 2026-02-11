-- ============================================================
-- Follow-ups table for PDCA verification cycle
-- ============================================================

CREATE TABLE IF NOT EXISTS public.follow_ups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    checkpoint_type TEXT NOT NULL CHECK (checkpoint_type IN ('30d', '60d', '90d')),
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue', 'skipped')),
    verification_result TEXT CHECK (verification_result IN ('effective', 'partial', 'ineffective')),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_follow_ups_report_id ON public.follow_ups(report_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON public.follow_ups(due_date);

-- RLS
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read follow_ups"
    ON public.follow_ups FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert follow_ups"
    ON public.follow_ups FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update follow_ups"
    ON public.follow_ups FOR UPDATE
    TO authenticated
    USING (true);

-- ============================================================
-- Add SLA tracking columns to reports (if not exists)
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'sla_deadline') THEN
        ALTER TABLE public.reports ADD COLUMN sla_deadline TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'sla_status') THEN
        ALTER TABLE public.reports ADD COLUMN sla_status TEXT DEFAULT 'on_time' CHECK (sla_status IN ('on_time', 'at_risk', 'overdue'));
    END IF;
END $$;

-- ============================================================
-- Function: Auto-create follow-ups when a report is resolved
-- ============================================================
CREATE OR REPLACE FUNCTION create_follow_ups_on_resolve()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'resolved' AND (OLD.status IS NULL OR OLD.status != 'resolved') THEN
        INSERT INTO public.follow_ups (report_id, checkpoint_type, due_date) VALUES
            (NEW.id, '30d', NOW() + INTERVAL '30 days'),
            (NEW.id, '60d', NOW() + INTERVAL '60 days'),
            (NEW.id, '90d', NOW() + INTERVAL '90 days');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_create_follow_ups ON public.reports;

-- Create trigger
CREATE TRIGGER trigger_create_follow_ups
    AFTER UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION create_follow_ups_on_resolve();
