-- 1. Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. First, unschedule any existing job with the old schedule
-- (Run this FIRST to remove the 6am daily schedule)
select cron.unschedule('check-quality-alerts');

-- 3. Schedule the Weekday Alert Job (Mon-Fri at 09:00 Argentina time)
-- Argentina is UTC-3, so 09:00 ART = 12:00 UTC
-- Cron day-of-week: 1-5 = Monday to Friday
-- This job checks for overdue/upcoming deadlines.
-- Triggers alerts at 5 days left, 2 days left, and on the deadline day.

SELECT cron.schedule(
    'check-quality-alerts',   -- Job name
    '0 12 * * 1-5',           -- Cron schedule: 12:00 UTC (09:00 ART), Mon-Fri only
    $$
    SELECT
      net.http_post(
          -- URL with Project Ref
          url:='https://tqvmqdydoiukszmymuef.supabase.co/functions/v1/check-alerts',
          
          -- Service Role Key
          headers:=jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxdm1xZHlkb2l1a3N6bXltdWVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE4ODQ3NSwiZXhwIjoyMDgyNzY0NDc1fQ.ch1DcttBcGrV4x2mJ8UK7rJKfnStFp2jDkzcXJdZ2DA'
          )
      ) as request_id;
    $$
);

-- To check if it's running:
-- select * from cron.job_run_details order by start_time desc;

-- To verify the schedule:
-- select * from cron.job;

-- To unschedule:
-- select cron.unschedule('check-quality-alerts');
