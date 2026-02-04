-- Add 'quality_validation' to the allowed status values
-- This SQL command updates the check constraint on the 'reports' table.

-- WARNING: This assumes the constraint name is 'reports_status_check'.
-- If the name is different, you'll need to check your table definition first.

DO $$
BEGIN
    -- 1. Drop the old constraint
    ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;

    -- 2. Add the new constraint with 'quality_validation' included
    ALTER TABLE reports 
    ADD CONSTRAINT reports_status_check 
    CHECK (status IN (
        'pending', 
        'analyzed', 
        'pending_resolution', 
        'in_progress', -- keeping for backward compatibility if used
        'resolved', 
        'quality_validation', 
        'cancelled'
    ));
END $$;
