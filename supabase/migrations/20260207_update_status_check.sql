-- Update status constraint to include 'quality_validation' and 'discarded'
DO $$
BEGIN
    ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
    ALTER TABLE public.reports ADD CONSTRAINT reports_status_check 
    CHECK (status IN ('pending', 'analyzed', 'pending_resolution', 'in_progress', 'resolved', 'quality_validation', 'discarded'));
EXCEPTION
    WHEN others THEN NULL;
END $$;
