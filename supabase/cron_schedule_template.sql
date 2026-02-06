-- 1. Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Schedule the Daily Alert Job
-- This job runs every day at 9:00 AM UTC to check for overdue/upcoming deadlines.
-- Triggers alerts at 5 days left, 2 days left, and on the deadline day.

SELECT cron.schedule(
    'check-quality-alerts',   -- Job name
    '0 9 * * *',              -- Cron schedule (09:00 AM daily)
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

-- To unschedule:
-- select cron.unschedule('check-quality-alerts');
