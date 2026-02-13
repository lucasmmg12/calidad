-- ============================================================
-- Migration: Add quality_observations & finding_type to reports
-- Date: 2026-02-13
-- Purpose: Allow quality admins to write observations and classify finding type
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reports' AND column_name = 'quality_observations'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN quality_observations TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reports' AND column_name = 'finding_type'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN finding_type TEXT;
    END IF;
END $$;

-- ============================================================
-- ✅ DONE! quality_observations & finding_type columns added.
-- ============================================================
