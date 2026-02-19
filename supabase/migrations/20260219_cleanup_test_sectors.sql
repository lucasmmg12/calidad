-- ============================================================
-- 🧹 CLEANUP: Remove test sector data
-- Date: 2026-02-19
-- Description: Removes reports created with test sectors
--              "Limpieza", "Guardia", "Quirofano"
--              These were never official sectors in the system.
-- ============================================================

-- Delete follow-ups linked to test reports first (FK constraint)
DELETE FROM public.follow_ups
WHERE report_id IN (
    SELECT id FROM public.reports
    WHERE sector IN ('Limpieza', 'Guardia', 'Quirofano')
       OR origin_sector IN ('Limpieza', 'Guardia', 'Quirofano')
);

-- Delete the test reports themselves
DELETE FROM public.reports
WHERE sector IN ('Limpieza', 'Guardia', 'Quirofano')
   OR origin_sector IN ('Limpieza', 'Guardia', 'Quirofano');

-- ============================================================
-- ✅ DONE! Test sector data cleaned up.
-- ============================================================
