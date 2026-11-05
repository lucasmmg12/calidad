import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    BarChart3,
    PieChart,
    TrendingUp,
    Clock,
    CheckCircle2,
    Zap,
    FileDown,
    BrainCircuit,
    Loader2,
    Tag,
    ClipboardCheck,
    Send,
    X,
    Search,
    FileSpreadsheet,
    Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Chart, registerables } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { AdvancedAnalytics } from './AdvancedAnalytics';
import { SlaAlertBanner } from './SlaAlerts';
import { PdcaPanel } from './PdcaPanel';
import { MetricsFilters, type MetricsFilterState } from './MetricsFilters';
import { SECTOR_OPTIONS } from '../constants/sectors';
import {
    generateIntelligenceMagazinePDF,
    computeTimeSeries,
} from '../utils/intelligenceMagazinePdf';
import {
    exportCasesToPDF,
    exportCasesToExcel,
    type ExportCaseRow,
} from '../utils/institutionalExport';
import { generateValidationPDF } from '../utils/validationPdfExport';

Chart.register(...registerables);

export const MetricsDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        totalReceived: 0,
        totalEmitted: 0,
        resolved: 0,
        pending: 0,
        urgentCount: 0,
        avgResolutionTimeDays: 0,
        bySector: [] as { sector: string; count: number; percentage: number }[],
        byReporterSector: [] as { sector: string; count: number; percentage: number }[],
        byUrgency: { Verdes: 0, Amarillos: 0, Rojos: 0 },
        byStatus: { resolved: 0, pending: 0, waiting: 0, cancelled: 0 },
        byClassification: [] as { category: string; count: number; percentage: number }[],
        byFindingType: [] as { type: string; count: number; percentage: number }[],
        byAnonymity: { anonymous: 0, identified: 0 },
        felicitaciones: 0,
        nonConforming: 0
    });
    const [isExporting, setIsExporting] = useState(false);
    const [rawReports, setRawReports] = useState<any[]>([]);
    const [roleFilteredReports, setRoleFilteredReports] = useState<any[]>([]);
    const [filters, setFilters] = useState<MetricsFilterState>({ sectors: [], dateFrom: '', dateTo: '' });

    const { role, sectors, profile, session } = useAuth();

    const canViewAll = role === 'admin' || role === 'directivo';

    // ─── Popup Modal State for Inspecting & Exporting Cases (Verde / Amarillo / Rojo / etc.) ───
    const [caseModalFilter, setCaseModalFilter] = useState<{
        urgency?: string;
        category?: string;
        sector?: string;
        reporter_sector?: string;
        finding_type?: string;
    } | null>(null);
    const [modalSearch, setModalSearch] = useState('');
    const [modalStatusFilter, setModalStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
    const [isExportingModalPdf, setIsExportingModalPdf] = useState(false);
    const [isExportingModalExcel, setIsExportingModalExcel] = useState(false);

    const handleMetricClick = (nextFilter: {
        urgency?: string;
        category?: string;
        sector?: string;
        reporter_sector?: string;
        finding_type?: string;
    }) => {
        setModalSearch('');
        setModalStatusFilter('all');
        setCaseModalFilter(nextFilter);
    };

    const modalCases = useMemo(() => {
        if (!caseModalFilter) return [];
        return rawReports
            .filter(r => {
                if (caseModalFilter.urgency) {
                    if (r.ai_urgency !== caseModalFilter.urgency) return false;
                }
                if (caseModalFilter.category) {
                    const isFelic =
                        r.finding_type?.startsWith('Felicitaci') ||
                        r.ai_category?.startsWith('Felicitaci');
                    if (caseModalFilter.category === 'Felicitación') {
                        if (!isFelic) return false;
                    } else if (r.ai_category !== caseModalFilter.category) {
                        return false;
                    }
                }
                if (caseModalFilter.sector && (r.sector || 'Otros') !== caseModalFilter.sector) {
                    return false;
                }
                if (
                    caseModalFilter.reporter_sector &&
                    (r.reporter_sector || r.origin_sector || 'Sin asignar') !== caseModalFilter.reporter_sector
                ) {
                    return false;
                }
                if (caseModalFilter.finding_type) {
                    let ft = r.finding_type || 'Sin clasificar';
                    if (ft.startsWith('Felicitaci')) ft = 'Felicitación';
                    if (ft !== caseModalFilter.finding_type) return false;
                }
                if (modalStatusFilter === 'resolved' && r.status !== 'resolved') return false;
                if (modalStatusFilter === 'pending' && r.status === 'resolved') return false;
                if (modalSearch.trim()) {
                    const q = modalSearch.toLowerCase();
                    const matchId = (r.tracking_id || '').toLowerCase().includes(q);
                    const matchSector = (r.sector || '').toLowerCase().includes(q);
                    const matchSummary = (r.ai_summary || '').toLowerCase().includes(q);
                    const matchContent = (r.content || '').toLowerCase().includes(q);
                    if (!matchId && !matchSector && !matchSummary && !matchContent) return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [rawReports, caseModalFilter, modalStatusFilter, modalSearch]);

    const getModalTitleInfo = () => {
        if (!caseModalFilter) return { title: 'Casos Filtrados', badge: 'Listado', tone: 'blue' };
        if (caseModalFilter.urgency === 'Rojo') {
            return {
                title: 'Casos Críticos (Rojo)',
                subtitle: 'Eventos con riesgo asistencial directo o impacto alto en seguridad del paciente',
                badge: 'Riesgo Crítico · Rojo',
                tone: 'red',
            };
        }
        if (caseModalFilter.urgency === 'Amarillo') {
            return {
                title: 'Casos Moderados (Amarillo)',
                subtitle: 'Desvíos operativos o demoras que requieren análisis y acción correctiva',
                badge: 'Riesgo Medio · Amarillo',
                tone: 'amber',
            };
        }
        if (caseModalFilter.urgency === 'Verde') {
            return {
                title: 'Casos Leves (Verde)',
                subtitle: 'Observaciones menores u oportunidades de mejora preventiva',
                badge: 'Riesgo Leve · Verde',
                tone: 'green',
            };
        }
        if (caseModalFilter.category === 'Felicitación') {
            return {
                title: 'Felicitaciones y Reconocimientos',
                subtitle: 'Destacos positivos hacia el trato humano y profesionalismo del equipo',
                badge: 'Felicitaciones',
                tone: 'teal',
            };
        }
        if (caseModalFilter.sector) {
            return {
                title: `Casos del Sector: ${caseModalFilter.sector}`,
                subtitle: 'Hallazgos recibidos como sector destino de resolución',
                badge: 'Filtro por Sector',
                tone: 'blue',
            };
        }
        if (caseModalFilter.reporter_sector) {
            return {
                title: `Emitidos por: ${caseModalFilter.reporter_sector}`,
                subtitle: 'Hallazgos reportados por este sector como origen',
                badge: 'Sector Origen',
                tone: 'blue',
            };
        }
        if (caseModalFilter.finding_type) {
            return {
                title: `Tipo de Hallazgo: ${caseModalFilter.finding_type}`,
                subtitle: 'Casos clasificados bajo esta tipología operativa',
                badge: caseModalFilter.finding_type,
                tone: 'blue',
            };
        }
        return { title: 'Detalle de Casos', subtitle: 'Auditoría nominal de reportes', badge: 'Calidad', tone: 'blue' };
    };

    const buildModalExportRows = (): ExportCaseRow[] => {
        return modalCases.map(r => ({
            trackingId: r.tracking_id || 'S/N',
            date: r.created_at ? new Date(r.created_at).toLocaleDateString('es-AR') : '-',
            sector: r.sector || 'Sin asignar',
            originSector: r.reporter_sector || r.origin_sector || '-',
            managementType: r.finding_type || r.ai_category || 'Hallazgo',
            urgency: r.ai_urgency || 'S/C',
            status:
                r.status === 'resolved'
                    ? 'Resuelto'
                    : r.status === 'quality_validation'
                        ? 'En Validación'
                        : 'Pendiente',
            category: r.ai_category || r.finding_type || 'General',
            summary: r.ai_summary || r.content || 'Sin descripción',
            immediateAction: r.immediate_action || r.solution_notes || '',
            qualityObservations: r.quality_observations || r.root_cause || '',
            resolvedAt: r.resolved_at ? new Date(r.resolved_at).toLocaleDateString('es-AR') : '-',
        }));
    };

    const handleDownloadModalPDF = async () => {
        if (modalCases.length === 0) return;
        setIsExportingModalPdf(true);
        try {
            const info = getModalTitleInfo();
            const rows = buildModalExportRows();
            const resolvedCount = modalCases.filter(c => c.status === 'resolved').length;
            const felicCount = modalCases.filter(
                c => c.finding_type?.startsWith('Felicitaci') || c.ai_category?.startsWith('Felicitaci')
            ).length;
            await exportCasesToPDF({
                title: `Auditoría de Calidad — ${info.title}`,
                subtitle: `${info.subtitle || ''} · Total: ${modalCases.length} casos`,
                fileNamePrefix: `Casos_${info.title.replace(/[^a-zA-Z0-9]/g, '_')}`,
                rows,
                kpis: {
                    total: modalCases.length,
                    pending: modalCases.length - resolvedCount,
                    resolved: resolvedCount,
                    felicitaciones: felicCount,
                },
            });
        } finally {
            setIsExportingModalPdf(false);
        }
    };

    const handleDownloadModalExcel = async () => {
        if (modalCases.length === 0) return;
        setIsExportingModalExcel(true);
        try {
            const info = getModalTitleInfo();
            const rows = buildModalExportRows();
            const resolvedCount = modalCases.filter(c => c.status === 'resolved').length;
            const felicCount = modalCases.filter(
                c => c.finding_type?.startsWith('Felicitaci') || c.ai_category?.startsWith('Felicitaci')
            ).length;
            await exportCasesToExcel({
                title: `Auditoría de Calidad — ${info.title}`,
                subtitle: `${info.subtitle || ''} · Total: ${modalCases.length} casos`,
                sheetName: info.badge.slice(0, 28),
                fileNamePrefix: `Casos_${info.title.replace(/[^a-zA-Z0-9]/g, '_')}`,
                rows,
                kpis: {
                    total: modalCases.length,
                    pending: modalCases.length - resolvedCount,
                    resolved: resolvedCount,
                    felicitaciones: felicCount,
                },
            });
        } finally {
            setIsExportingModalExcel(false);
        }
    };

    // ─── Apply user filters (sectors[], dateFrom, dateTo) on top of role-filtered reports ───
    const applyUserFilters = useCallback((reports: any[]) => {
        let result = reports;

        // Multi-sector filter (assigned sector)
        if (filters.sectors.length > 0) {
            result = result.filter(r => 
                filters.sectors.includes(r.sector) ||
                (r.reporter_sector && filters.sectors.includes(r.reporter_sector)) ||
                (r.origin_sector && filters.sectors.includes(r.origin_sector))
            );
        }

        // Date range: from
        if (filters.dateFrom) {
            const from = new Date(filters.dateFrom);
            from.setHours(0, 0, 0, 0);
            result = result.filter(r => {
                const d = new Date(r.created_at);
                return d >= from;
            });
        }

        // Date range: to
        if (filters.dateTo) {
            const to = new Date(filters.dateTo);
            to.setHours(23, 59, 59, 999);
            result = result.filter(r => {
                const d = new Date(r.created_at);
                return d <= to;
            });
        }

        return result;
    }, [filters]);

    // ─── Collect all report dates for the year picker ───
    const allReportDates = useMemo(() => {
        return roleFilteredReports.map(r => r.created_at);
    }, [roleFilteredReports]);

    useEffect(() => {
        fetchAndFilterByRole();
    }, [role, sectors]);

    // Re-compute stats when user filters change
    useEffect(() => {
        if (roleFilteredReports.length > 0) {
            computeStats(applyUserFilters(roleFilteredReports));
        } else if (!loading) {
            // No reports after role filter — reset stats
            computeStats([]);
        }
    }, [filters, roleFilteredReports]);

    // ─── Step 1: Fetch all reports and apply ROLE-BASED filter ───
    const fetchAndFilterByRole = async () => {
        setLoading(true);
        const { data: reports, error } = await supabase
            .from('reports')
            .select('*');

        if (error || !reports) {
            console.error('Error fetching metrics', error);
            setLoading(false);
            return;
        }

        // Admin & Directivo: View All
        // Responsable: View ONLY cases assigned to sector (via reports.sector OR sector_assignments)
        // Outbound reports created BY the sector (reporter_sector) are excluded per business requirements.
        let roleFiltered = reports;

        if (role === 'responsable' && sectors && sectors.length > 0) {
            const { data: assignments } = await supabase
                .from('sector_assignments')
                .select('report_id, sector')
                .in('sector', sectors);

            const assignedReportIds = new Set((assignments || []).map(a => a.report_id));

            roleFiltered = reports.filter(r =>
                (r.sector && sectors.includes(r.sector)) ||
                (r.reporter_sector && sectors.includes(r.reporter_sector)) ||
                (r.origin_sector && sectors.includes(r.origin_sector)) ||
                assignedReportIds.has(r.id)
            );
        } else if (role === 'responsable') {
            roleFiltered = [];
        }

        setRoleFilteredReports(roleFiltered);

        // Apply any active user-filters on top
        const finalFiltered = applyUserFilters(roleFiltered);
        computeStats(finalFiltered);
    };

    // ─── Step 2: Compute all statistics from the given reports ───
    const computeStats = (allReportsUnfiltered: any[]) => {
        // Exclude discarded and rejected reports from all metrics
        const filteredReports = allReportsUnfiltered.filter(
            r => r.status !== 'discarded' && r.status !== 'assignment_rejected'
        );
        setRawReports(filteredReports);

        const total = filteredReports.length;

        const activeSectors = filters.sectors.length > 0 ? filters.sectors : (!canViewAll ? sectors : []);
        let totalReceived = 0;
        let totalEmitted = 0;

        if (activeSectors.length > 0) {
            filteredReports.forEach(r => {
                if (r.sector && activeSectors.includes(r.sector)) {
                    totalReceived++;
                }
                if ((r.reporter_sector && activeSectors.includes(r.reporter_sector)) || 
                    (r.origin_sector && activeSectors.includes(r.origin_sector))) {
                    totalEmitted++;
                }
            });
        } else {
            totalReceived = total;
            totalEmitted = total;
        }
        const felicitaciones = filteredReports.filter(r => r.finding_type?.startsWith('Felicitaci') || r.ai_category?.startsWith('Felicitaci')).length;
        const nonFelicitaciones = filteredReports.filter(r => !r.finding_type?.startsWith('Felicitaci') && !r.ai_category?.startsWith('Felicitaci'));
        const resolved = nonFelicitaciones.filter(r => r.status === 'resolved');
        const pending = nonFelicitaciones.filter(r => r.status !== 'resolved');
        const urgent = nonFelicitaciones.filter(r => r.ai_urgency === 'Rojo');

        // Avg Resolution Time
        let totalTimeMs = 0;
        let resolvedCountWithDates = 0;
        resolved.forEach(r => {
            if (r.resolved_at && r.created_at) {
                const start = new Date(r.created_at).getTime();
                const end = new Date(r.resolved_at).getTime();
                totalTimeMs += (end - start);
                resolvedCountWithDates++;
            }
        });
        const avgDays = resolvedCountWithDates > 0
            ? (totalTimeMs / resolvedCountWithDates / (1000 * 60 * 60 * 24)).toFixed(1)
            : 0;

        // By Sector
        const sectorMap: Record<string, number> = {};
        filteredReports.forEach(r => {
            const s = r.sector || 'Otros';
            if (canViewAll || sectors.includes(s)) {
                sectorMap[s] = (sectorMap[s] || 0) + 1;
            }
        });
        const bySectorTotal = Object.values(sectorMap).reduce((acc, val) => acc + val, 0);
        const bySector = Object.entries(sectorMap)
            .map(([sector, count]) => ({ sector, count, percentage: bySectorTotal > 0 ? (count / bySectorTotal) * 100 : 0 }))
            .sort((a, b) => b.count - a.count);

        // By Reporter Sector (Origin)
        const reporterSectorMap: Record<string, number> = {};
        filteredReports.forEach(r => {
            const s = r.reporter_sector || r.origin_sector || 'Sin asignar';
            if (canViewAll || sectors.includes(s)) {
                reporterSectorMap[s] = (reporterSectorMap[s] || 0) + 1;
            }
        });
        const byReporterTotal = Object.values(reporterSectorMap).reduce((acc, val) => acc + val, 0);
        const byReporterSector = Object.entries(reporterSectorMap)
            .map(([sector, count]) => ({ sector, count, percentage: byReporterTotal > 0 ? (count / byReporterTotal) * 100 : 0 }))
            .sort((a, b) => b.count - a.count);

        // By Urgency
        const byUrgency = {
            Verdes: filteredReports.filter(r => r.ai_urgency === 'Verde').length,
            Amarillos: filteredReports.filter(r => r.ai_urgency === 'Amarillo').length,
            Rojos: filteredReports.filter(r => r.ai_urgency === 'Rojo').length
        };

        // By Status (Detailed)
        const byStatus = {
            resolved: filteredReports.filter(r => r.status === 'resolved').length,
            pending: filteredReports.filter(r => ['pending', 'analyzed'].includes(r.status)).length,
            waiting: filteredReports.filter(r => ['pending_resolution', 'in_progress', 'quality_validation'].includes(r.status)).length,
            cancelled: filteredReports.filter(r => r.status === 'cancelled').length
        };

        // By Classification (ai_category)
        const classificationMap: Record<string, number> = {};
        filteredReports.forEach(r => {
            let cat = r.ai_category || 'Sin clasificar';
            if (cat.startsWith('Felicitaci')) cat = 'Felicitación';
            if (cat !== 'Sin clasificar') {
                classificationMap[cat] = (classificationMap[cat] || 0) + 1;
            }
        });
        const byClassification = Object.entries(classificationMap)
            .map(([category, count]) => ({ category, count, percentage: total > 0 ? (count / total) * 100 : 0 }))
            .sort((a, b) => b.count - a.count);

        // By Finding Type
        const findingTypeMap: Record<string, number> = {};
        filteredReports.forEach(r => {
            let type = r.finding_type || 'Sin clasificar';
            if (type.startsWith('Felicitaci')) type = 'Felicitación';
            if (type !== 'Sin clasificar' && type !== 'Sin asignar') {
                findingTypeMap[type] = (findingTypeMap[type] || 0) + 1;
            }
        });
        const byFindingType = Object.entries(findingTypeMap)
            .map(([type, count]) => ({ type, count, percentage: total > 0 ? (count / total) * 100 : 0 }))
            .sort((a, b) => b.count - a.count);

        // By Anonymity
        const anonymousCount = filteredReports.filter(r => r.is_anonymous === true).length;
        const identifiedCount = total - anonymousCount;
        const byAnonymity = { anonymous: anonymousCount, identified: identifiedCount };

        // Claimant Feedback
        const nonConforming = filteredReports.filter(r => r.claimant_feedback === 'no_conforme').length;

        setStats({
            total,
            totalReceived,
            totalEmitted,
            resolved: resolved.length,
            pending: pending.length,
            urgentCount: urgent.length,
            avgResolutionTimeDays: Number(avgDays),
            bySector,
            byReporterSector,
            byUrgency,
            byStatus,
            byClassification,
            byFindingType,
            byAnonymity,
            felicitaciones,
            nonConforming
        });
        setLoading(false);
    };

    const timeSeries = useMemo(() => computeTimeSeries(rawReports), [rawReports]);

    const handleExportIntelligenceReport = async () => {
        if (rawReports.length === 0) return;
        setIsExporting(true);

        try {
            const userName = profile?.display_name || session?.user?.email || 'Usuario';
            const userRole = role || 'responsable';
            const userSectors = sectors || [];

            const roleContextMap: Record<string, string> = {
                admin: 'Genera un informe completo institucional con visión global de todos los sectores. Incluye análisis profundo de causas raíz, correlaciones entre sectores y recomendaciones operativas detalladas.',
                responsable: `Genera un informe de gestión sectorial enfocado EXCLUSIVAMENTE en los sectores: ${userSectors.join(', ')}. El tono debe ser operativo y práctico, con pasos concretos de mejora para estos sectores específicos.`,
                directivo: 'Genera un executive brief estratégico. El tono debe ser conciso, ejecutivo, orientado a KPIs y decisiones de alto nivel. Usa bullet points. Evita detalles operativos, enfócate en tendencias, riesgos institucionales y recomendaciones estratégicas.'
            };

            const topSector = stats.bySector.length > 0 ? stats.bySector[0].sector : 'General';
            const topCat = stats.byClassification.length > 0 ? stats.byClassification[0].category : 'Procesos Asistenciales';
            const resPct = stats.total - stats.felicitaciones > 0
                ? Math.round((stats.resolved / (stats.total - stats.felicitaciones)) * 100)
                : 100;

            let aiAnalysisData: any = null;
            try {
                const { data, error } = await supabase.functions.invoke('generate-intelligence-report', {
                    body: {
                        reports: rawReports,
                        startDate: new Date(Math.min(...rawReports.map(r => new Date(r.created_at).getTime()))).toLocaleDateString(),
                        endDate: new Date().toLocaleDateString(),
                        roleContext: roleContextMap[userRole] || roleContextMap.admin
                    }
                });
                if (!error && data) {
                    aiAnalysisData = data;
                }
            } catch (invokeErr) {
                console.warn('[IntelligenceReport] AI edge function fallback activated:', invokeErr);
            }

            if (!aiAnalysisData) {
                aiAnalysisData = {
                    descriptive: `Durante el período evaluado se registraron ${stats.total} casos totales en el sistema (${stats.total - stats.felicitaciones} hallazgos operativos y ${stats.felicitaciones} felicitaciones al equipo). Se alcanzó una tasa de resolución validada del ${resPct}% (${stats.resolved} casos cerrados y ${stats.pending} en curso), con un tiempo promedio de respuesta de ${stats.avgResolutionTimeDays} días.`,
                    diagnostic: `La mayor demanda operativa se concentró en el sector ${topSector} y en la categoría "${topCat}". Se contabilizaron ${stats.urgentCount} eventos de prioridad crítica (Rojo), ${stats.byUrgency.Amarillos} de riesgo moderado (Amarillo) y ${stats.byUrgency.Verdes} de nivel leve (Verde).`,
                    predictive: `De mantenerse el ritmo actual de resolución (${stats.avgResolutionTimeDays} días promedio), los sectores con mayor carga acumulada podrían experimentar saturación si no se priorizan los ${stats.pending} casos pendientes en bandeja.`,
                    prescriptive: `1. Priorizar el cierre de los ${stats.urgentCount} hallazgos críticos activos.\n2. Reforzar el seguimiento en ${topSector} para estandarizar las barreras de prevención sobre "${topCat}".\n3. Socializar las ${stats.felicitaciones} felicitaciones recibidas para fortalecer el clima laboral y el reconocimiento positivo.`,
                };
            }

            await generateIntelligenceMagazinePDF({
                rawReports,
                stats,
                aiAnalysis: aiAnalysisData,
                userName,
                userRole,
                userSectors,
            });

            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00548B', '#00A99D', '#FFFFFF']
            });
        } catch (err) {
            console.error('Error exporting PDF:', err);
            alert('Error al generar el informe inteligente. Intente nuevamente.');
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) {
        return <div className="p-10 flex justify-center"><div className="w-8 h-8 border-4 border-sanatorio-primary border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="w-full py-2 sm:py-4 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sanatorio-primary/10 text-sanatorio-primary text-[11px] font-black uppercase tracking-widest">
                        <BrainCircuit className="w-3.5 h-3.5" />
                        Observatorio Clínico & Gestión de Calidad
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-display font-black text-sanatorio-primary tracking-tight">
                        Inteligencia de Calidad
                    </h1>
                    <p className="text-slate-500 text-sm sm:text-base font-medium max-w-2xl">
                        Lectura explicativa de indicadores hospitalarios, curvas de evolución temporal y diagnóstico asistido por IA.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <button
                        onClick={handleExportIntelligenceReport}
                        disabled={isExporting}
                        className="btn-primary w-full sm:w-auto px-6 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Maquetando Revista Institucional...</span>
                            </>
                        ) : (
                            <>
                                <FileDown className="w-5 h-5" />
                                <BrainCircuit className="w-5 h-5 text-[#00D1FF]" />
                                <div className="text-left">
                                    <span className="block text-xs font-black uppercase tracking-wider leading-none">
                                        {role === 'admin' ? 'Revista Institucional PDF' : role === 'directivo' ? 'Executive Brief PDF' : 'Revista Sectorial PDF'}
                                    </span>
                                    <span className="block text-[10px] text-sky-100 font-normal mt-0.5">
                                        Edición explicativa con gráficos de línea, barras e IA
                                    </span>
                                </div>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ─── Filter Bar ─── */}
            <MetricsFilters
                filters={filters}
                onChange={setFilters}
                allowedSectors={sectors}
                canViewAll={canViewAll}
                reportDates={allReportDates}
            />

            {/* Active filter summary */}
            {(filters.sectors.length > 0 || filters.dateFrom || filters.dateTo) && (
                <div className="bg-sanatorio-primary/5 border border-sanatorio-primary/10 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <span className="text-xs font-bold text-sanatorio-primary">📊 Mostrando {stats.total} reportes filtrados</span>
                    <span className="text-xs text-gray-400">de {roleFilteredReports.length} totales en tu vista</span>
                </div>
            )}

            {/* KPI Grid — Con Explicación Pedagógica de cada Métrica */}
            <div>
                <div className="flex items-center justify-between mb-3 px-1">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-sanatorio-primary">
                            Glosario de Indicadores Clave (KPIs)
                        </h2>
                        <p className="text-xs text-slate-500">
                            Cada tarjeta explica qué mide el indicador y cuál es el estándar institucional esperado.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* KPI 1: Recibidos */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 border-t-4 border-t-sanatorio-primary relative overflow-hidden group flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-slate-500 text-[11px] font-black uppercase tracking-wider">Reportes Recibidos</p>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-sanatorio-primary">Demanda</span>
                            </div>
                            <p className="text-3xl font-black text-slate-800 mt-2">{stats.totalReceived}</p>
                            <p className="text-[11px] font-semibold text-sanatorio-primary mt-1">Como Sector Destino</p>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 leading-relaxed">
                            <strong className="text-slate-700">¿Qué mide?</strong> Total de desvíos, eventos y sugerencias asignados al sector para su análisis y resolución.
                        </p>
                    </div>

                    {/* KPI 2: Tasa de Resolución */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 border-t-4 border-t-emerald-600 relative overflow-hidden group flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-slate-500 text-[11px] font-black uppercase tracking-wider">Tasa de Resolución</p>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">Meta ≥ 80%</span>
                            </div>
                            <p className="text-3xl font-black text-slate-800 mt-2">
                                {stats.total - stats.felicitaciones > 0
                                    ? Math.round((stats.resolved / (stats.total - stats.felicitaciones)) * 100)
                                    : 100}%
                            </p>
                            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5">
                                <div
                                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000"
                                    style={{
                                        width: `${stats.total - stats.felicitaciones > 0
                                            ? Math.min(100, Math.round((stats.resolved / (stats.total - stats.felicitaciones)) * 100))
                                            : 100}%`
                                    }}
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 leading-relaxed">
                            <strong className="text-slate-700">¿Qué mide?</strong> Porcentaje de casos gestionables que ya cuentan con análisis de causa raíz y cierre validado.
                        </p>
                    </div>

                    {/* KPI 3: Hallazgos Críticos */}
                    <div
                        onClick={() => handleMetricClick({ urgency: 'Rojo' })}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 border-t-4 border-t-red-600 relative overflow-hidden group cursor-pointer hover:border-red-300 transition-all flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-slate-500 text-[11px] font-black uppercase tracking-wider">Riesgo Crítico (Rojo)</p>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700">Meta: 0</span>
                            </div>
                            <p className="text-3xl font-black text-red-600 mt-2">{stats.urgentCount}</p>
                            <p className="text-[11px] text-red-600 mt-1 font-semibold">Click para filtrar casos urgentes →</p>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 leading-relaxed">
                            <strong className="text-slate-700">¿Qué mide?</strong> Eventos clasificados por Triage IA con alto impacto asistencial o seguridad del paciente.
                        </p>
                    </div>

                    {/* KPI 4: Tiempo Promedio */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 border-t-4 border-t-purple-600 relative overflow-hidden group flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-slate-500 text-[11px] font-black uppercase tracking-wider">Tiempo de Respuesta</p>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700">SLA ≤ 7d</span>
                            </div>
                            <p className="text-3xl font-black text-slate-800 mt-2">{stats.avgResolutionTimeDays}d</p>
                            <p className="text-[11px] text-purple-600 mt-1 font-semibold">Promedio desde ingreso a cierre</p>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 leading-relaxed">
                            <strong className="text-slate-700">¿Qué mide?</strong> Velocidad media de resolución en días corridos. Menos de 5 días refleja alta agilidad operativa.
                        </p>
                    </div>

                    {/* KPI 5: Felicitaciones */}
                    <div
                        onClick={() => handleMetricClick({ category: 'Felicitación' })}
                        className="bg-gradient-to-br from-amber-50/70 to-yellow-50/40 p-5 rounded-2xl shadow-sm border border-amber-200/80 border-t-4 border-t-amber-500 relative overflow-hidden group cursor-pointer hover:border-amber-300 transition-all flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-amber-700 text-[11px] font-black uppercase tracking-wider">Felicitaciones</p>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Humanización</span>
                            </div>
                            <p className="text-3xl font-black text-amber-600 mt-2">{stats.felicitaciones}</p>
                            <p className="text-[11px] text-amber-700 mt-1 font-semibold">Reconocimientos positivos 🎉</p>
                        </div>
                        <p className="text-[11px] text-amber-900/70 mt-3 pt-2.5 border-t border-amber-200/60 leading-relaxed">
                            <strong className="text-amber-900">¿Qué mide?</strong> Destacos de pacientes y colegas hacia el trato humano y excelencia del equipo de salud.
                        </p>
                    </div>

                    {/* KPI 6: Emitidos */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 border-t-4 border-t-teal-600 relative overflow-hidden group flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-slate-500 text-[11px] font-black uppercase tracking-wider">Reportes Emitidos</p>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700">Proactividad</span>
                            </div>
                            <p className="text-3xl font-black text-slate-800 mt-2">{stats.totalEmitted}</p>
                            <p className="text-[11px] text-teal-600 mt-1 font-semibold">Como Sector Origen</p>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 leading-relaxed">
                            <strong className="text-slate-700">¿Qué mide?</strong> Cultura de reporte activo: cantidad de hallazgos detectados y notificados por el sector.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── GRÁFICO DE LÍNEA EXPLICATIVO: Evolución Temporal (Ingresos vs. Resueltos) ── */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-sanatorio-primary">
                            Tendencia Histórica · Gráfico de Línea Comparativo
                        </span>
                        <h3 className="text-xl font-black text-slate-800 mt-0.5 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-sanatorio-primary" />
                            Evolución Temporal: Casos Ingresados vs. Casos Resueltos
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Compara el flujo de entrada de reportes con la capacidad real de cierre en cada período.
                        </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-sanatorio-primary">
                            <span className="w-3 h-3 rounded-full bg-[#00548B] inline-block"></span>
                            Casos Ingresados ({stats.total})
                        </span>
                        <span className="flex items-center gap-1.5 text-emerald-600">
                            <span className="w-3 h-3 rounded-full bg-[#16A34A] inline-block"></span>
                            Casos Resueltos ({stats.resolved})
                        </span>
                        <span className="flex items-center gap-1.5 text-red-600">
                            <span className="w-3 h-3 rounded-full bg-[#DC2626] inline-block"></span>
                            Riesgo Crítico ({stats.urgentCount})
                        </span>
                    </div>
                </div>

                <div className="h-[320px] w-full">
                    <Line
                        data={{
                            labels: timeSeries.labels,
                            datasets: [
                                {
                                    label: 'Casos Ingresados',
                                    data: timeSeries.totalSeries,
                                    borderColor: '#00548B',
                                    backgroundColor: 'rgba(0, 84, 139, 0.10)',
                                    fill: true,
                                    tension: 0.35,
                                    borderWidth: 3,
                                    pointRadius: 5,
                                    pointHoverRadius: 7,
                                    pointBackgroundColor: '#FFFFFF',
                                    pointBorderColor: '#00548B',
                                    pointBorderWidth: 2.5,
                                },
                                {
                                    label: 'Casos Resueltos',
                                    data: timeSeries.resolvedSeries,
                                    borderColor: '#16A34A',
                                    backgroundColor: 'rgba(22, 163, 74, 0.08)',
                                    fill: true,
                                    tension: 0.35,
                                    borderWidth: 3,
                                    pointRadius: 5,
                                    pointHoverRadius: 7,
                                    pointBackgroundColor: '#FFFFFF',
                                    pointBorderColor: '#16A34A',
                                    pointBorderWidth: 2.5,
                                },
                                {
                                    label: 'Críticos (Rojo)',
                                    data: timeSeries.criticalSeries,
                                    borderColor: '#DC2626',
                                    backgroundColor: 'rgba(220, 38, 38, 0.04)',
                                    borderDash: [5, 4],
                                    fill: false,
                                    tension: 0.3,
                                    borderWidth: 2,
                                    pointRadius: 4,
                                    pointHoverRadius: 6,
                                    pointBackgroundColor: '#DC2626',
                                    pointBorderColor: '#FFFFFF',
                                    pointBorderWidth: 1.5,
                                }
                            ]
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: { mode: 'index', intersect: false },
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    titleColor: '#F8FAFC',
                                    bodyColor: '#E2E8F0',
                                    padding: 12,
                                    cornerRadius: 10,
                                }
                            },
                            scales: {
                                x: {
                                    grid: { color: '#F1F5F9' },
                                    ticks: { font: { family: "'Inter', sans-serif", weight: 'bold', size: 11 }, color: '#475569' }
                                },
                                y: {
                                    beginAtZero: true,
                                    grid: { color: '#F1F5F9' },
                                    ticks: { precision: 0, font: { family: "'Inter', sans-serif", size: 11 }, color: '#64748B' }
                                }
                            }
                        }}
                    />
                </div>

                <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                    <div className="w-1.5 self-stretch rounded-full bg-sanatorio-primary shrink-0" />
                    <p className="text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-800">Cómo interpretar este gráfico de línea:</strong> La curva azul muestra la demanda de reportes recibidos y la curva verde los cierres efectivos. Cuando ambas curvas se mantienen próximas, el sanatorio absorbe la demanda sin acumular pasivo pendiente; si la brecha se amplía, indica acumulación de casos abiertos en ese período.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sector Breakdown Horizontal Bar Chart */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                    <div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-sanatorio-primary">
                            Demanda por Servicio · Gráfico de Barras
                        </span>
                        <h3 className="text-lg font-black text-slate-800 mt-0.5 mb-1 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-sanatorio-primary" />
                            Hallazgos Recibidos por Sector (Destino)
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Identifica qué áreas concentran mayor carga de reportes asignados. Hacé click en una barra para auditar sus casos.
                        </p>
                        <div className="space-y-2">
                            {stats.bySector.length > 0 ? (
                                <div className="h-[360px] w-full mt-2">
                                    <Bar
                                        data={{
                                            labels: stats.bySector.map(c => c.sector),
                                            datasets: [{
                                                label: 'Reportes Recibidos',
                                                data: stats.bySector.map(c => c.count),
                                                backgroundColor: '#00548B',
                                                hoverBackgroundColor: '#003C66',
                                                borderRadius: 6,
                                                borderSkipped: false,
                                                barThickness: 'flex',
                                                maxBarThickness: 28,
                                            }]
                                        }}
                                        options={{
                                            indexAxis: 'y',
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            onClick: (_event, elements, chart) => {
                                                if (elements.length > 0) {
                                                    const index = elements[0].index;
                                                    const label = chart.data.labels![index] as string;
                                                    handleMetricClick({ sector: label });
                                                }
                                            },
                                            layout: { padding: { right: 24 } },
                                            plugins: {
                                                legend: { display: false },
                                                tooltip: {
                                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                                    titleColor: '#F8FAFC',
                                                    bodyColor: '#E2E8F0',
                                                    padding: 12,
                                                    callbacks: {
                                                        label: (context: any) => {
                                                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                                            const percentage = total > 0 ? Math.round((context.raw / total) * 100) : 0;
                                                            return ` ${context.raw} Reportes (${percentage}% del total)`;
                                                        }
                                                    }
                                                }
                                            },
                                            scales: {
                                                x: {
                                                    beginAtZero: true,
                                                    grid: { display: true, color: '#F1F5F9' },
                                                    ticks: { precision: 0, font: { family: "'Inter', sans-serif" }, color: '#64748B' }
                                                },
                                                y: {
                                                    grid: { display: false },
                                                    ticks: { font: { family: "'Inter', sans-serif", weight: 'bold', size: 11 }, color: '#334155' }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400">
                                    <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No hay sectores registrados.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <p className="text-xs text-slate-600 leading-relaxed">
                            <strong className="text-slate-800">Lectura del indicador:</strong> Un volumen alto en un servicio no implica necesariamente menor calidad; suele reflejar mayor complejidad asistencial o mayor flujo de pacientes. Debe evaluarse junto con su tasa de resolución.
                        </p>
                    </div>
                </div>

                {/* Urgency / Triage Explanatory Bar Chart (replaces old Donut) */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                    <div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-sanatorio-primary">
                            Matriz de Riesgo Clínico · Gráfico de Barras Explicativo
                        </span>
                        <h3 className="text-lg font-black text-slate-800 mt-0.5 mb-1 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Estratificación por Gravedad (Triage IA) y Felicitaciones
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Seleccioná una barra o tarjeta para abrir la ventana emergente con el detalle de casos y descargarlos en PDF.
                        </p>

                        <div className="h-[230px] w-full">
                            <Bar
                                data={{
                                    labels: ['Crítico (Rojo)', 'Moderado (Amarillo)', 'Leve (Verde)', 'Felicitaciones'],
                                    datasets: [{
                                        label: 'Cantidad de Casos',
                                        data: [
                                            stats.byUrgency.Rojos,
                                            stats.byUrgency.Amarillos,
                                            stats.byUrgency.Verdes,
                                            stats.felicitaciones,
                                        ],
                                        backgroundColor: ['#DC2626', '#D97706', '#16A34A', '#00A99D'],
                                        borderRadius: 8,
                                        maxBarThickness: 54,
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    onClick: (_event, elements) => {
                                        if (elements.length > 0) {
                                            const idx = elements[0].index;
                                            if (idx === 0) handleMetricClick({ urgency: 'Rojo' });
                                            else if (idx === 1) handleMetricClick({ urgency: 'Amarillo' });
                                            else if (idx === 2) handleMetricClick({ urgency: 'Verde' });
                                            else if (idx === 3) handleMetricClick({ category: 'Felicitación' });
                                        }
                                    },
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                            padding: 12,
                                            callbacks: {
                                                label: (context: any) => {
                                                    const pct = stats.total > 0 ? Math.round((context.raw / stats.total) * 100) : 0;
                                                    return ` ${context.raw} casos (${pct}% del volumen total) — Click para ver listado`;
                                                }
                                            }
                                        }
                                    },
                                    scales: {
                                        x: {
                                            grid: { display: false },
                                            ticks: { font: { family: "'Inter', sans-serif", weight: 'bold', size: 11 }, color: '#334155' }
                                        },
                                        y: {
                                            beginAtZero: true,
                                            grid: { color: '#F1F5F9' },
                                            ticks: { precision: 0, font: { family: "'Inter', sans-serif", size: 11 }, color: '#64748B' }
                                        }
                                    }
                                }}
                            />
                        </div>

                        {/* Explanatory Severity Legend Cards */}
                        <div className="grid grid-cols-2 gap-2.5 mt-4">
                            <div
                                onClick={() => handleMetricClick({ urgency: 'Rojo' })}
                                className="p-3 rounded-xl bg-red-50/70 border border-red-200/80 cursor-pointer hover:bg-red-100/70 hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-red-700">🔴 Crítico (Rojo)</span>
                                    <span className="text-sm font-black text-red-700">{stats.byUrgency.Rojos}</span>
                                </div>
                                <p className="text-[11px] text-red-800/80 mt-1 leading-snug">
                                    Riesgo asistencial directo. Requiere contención en &lt; 24-48 hs.
                                </p>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 mt-1.5 group-hover:underline">
                                    <Eye className="w-3 h-3" /> Ver casos y descargar PDF
                                </span>
                            </div>

                            <div
                                onClick={() => handleMetricClick({ urgency: 'Amarillo' })}
                                className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 cursor-pointer hover:bg-amber-100/70 hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-amber-700">🟡 Moderado (Amarillo)</span>
                                    <span className="text-sm font-black text-amber-700">{stats.byUrgency.Amarillos}</span>
                                </div>
                                <p className="text-[11px] text-amber-800/80 mt-1 leading-snug">
                                    Desvío operativo o demora que afecta la calidad percibida.
                                </p>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 mt-1.5 group-hover:underline">
                                    <Eye className="w-3 h-3" /> Ver casos y descargar PDF
                                </span>
                            </div>

                            <div
                                onClick={() => handleMetricClick({ urgency: 'Verde' })}
                                className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 cursor-pointer hover:bg-emerald-100/70 hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-emerald-700">🟢 Leve (Verde)</span>
                                    <span className="text-sm font-black text-emerald-700">{stats.byUrgency.Verdes}</span>
                                </div>
                                <p className="text-[11px] text-emerald-800/80 mt-1 leading-snug">
                                    Observación menor u oportunidad de mejora preventiva.
                                </p>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 mt-1.5 group-hover:underline">
                                    <Eye className="w-3 h-3" /> Ver casos y descargar PDF
                                </span>
                            </div>

                            <div
                                onClick={() => handleMetricClick({ category: 'Felicitación' })}
                                className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/80 cursor-pointer hover:bg-teal-100/70 hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-teal-700">🌟 Felicitaciones</span>
                                    <span className="text-sm font-black text-teal-700">{stats.felicitaciones}</span>
                                </div>
                                <p className="text-[11px] text-teal-800/80 mt-1 leading-snug">
                                    Reconocimientos positivos al equipo que fortalecen el clima laboral.
                                </p>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 mt-1.5 group-hover:underline">
                                    <Eye className="w-3 h-3" /> Ver casos y descargar PDF
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Hallazgos Emitidos por Sector (Origen) ── */}
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-500" />
                    Hallazgos Emitidos por Sector
                </h3>
                <p className="text-xs text-gray-400 mb-6">Cuántos hallazgos generó cada sector como emisor del reporte.</p>

                {stats.byReporterSector.length > 0 ? (
                    <div className="h-[400px] w-full mt-4">
                        <Bar 
                            data={{
                                labels: stats.byReporterSector.map(s => {
                                    const option = SECTOR_OPTIONS.find(opt => opt.value === s.sector);
                                    return option ? option.label : s.sector;
                                }),
                                datasets: [{
                                    label: 'Reportes Emitidos',
                                    data: stats.byReporterSector.map(s => s.count),
                                    backgroundColor: (context: any) => {
                                        const chart = context.chart;
                                        const { ctx, chartArea } = chart;
                                        if (!chartArea || !chartArea.right || !isFinite(chartArea.right)) return 'rgba(59, 130, 246, 0.8)';
                                        const gradient = ctx.createLinearGradient(0, 0, chartArea.right, 0);
                                        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)'); // Blue
                                        gradient.addColorStop(1, 'rgba(14, 165, 233, 0.9)'); // Sky
                                        return gradient;
                                    },
                                    hoverBackgroundColor: (context: any) => {
                                        const chart = context.chart;
                                        const { ctx, chartArea } = chart;
                                        if (!chartArea || !chartArea.right || !isFinite(chartArea.right)) return 'rgba(37, 99, 235, 1)';
                                        const gradient = ctx.createLinearGradient(0, 0, chartArea.right, 0);
                                        gradient.addColorStop(0, 'rgba(37, 99, 235, 1)');
                                        gradient.addColorStop(1, 'rgba(2, 132, 199, 1)');
                                        return gradient;
                                    },
                                    borderRadius: 6,
                                    borderSkipped: false,
                                    barThickness: 'flex',
                                    maxBarThickness: 32,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.2)',
                                }]
                            }}
                            options={{
                                indexAxis: 'y',
                                responsive: true,
                                maintainAspectRatio: false,
                                onClick: (_event, elements) => {
                                    if (elements.length > 0) {
                                        const index = elements[0].index;
                                        const rawLabel = stats.byReporterSector[index].sector;
                                        handleMetricClick({ reporter_sector: rawLabel });
                                    }
                                },
                                animation: { duration: 1500, easing: 'easeOutQuart' },
                                layout: { padding: { right: 30 } },
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        titleColor: '#1f2937',
                                        bodyColor: '#4b5563',
                                        borderColor: '#e5e7eb',
                                        borderWidth: 1,
                                        padding: 12,
                                        boxPadding: 6,
                                        usePointStyle: true,
                                        callbacks: {
                                            label: (context: any) => {
                                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                                const percentage = Math.round((context.raw / total) * 100);
                                                return ` ${context.raw} Reportes Emitidos (${percentage}%)`;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        grid: { display: true, color: '#f3f4f6', drawTicks: false },
                                        border: { display: false },
                                        ticks: { font: { family: "'Inter', sans-serif" }, color: '#9ca3af', padding: 10 }
                                    },
                                    y: {
                                        grid: { display: false },
                                        border: { display: false },
                                        ticks: { font: { family: "'Inter', sans-serif", weight: 'bold', size: 12 }, color: '#4b5563', padding: 10 }
                                    }
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-400">
                        <Send className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No hay datos de sector emisor disponibles.</p>
                    </div>
                )}
            </div>

            {/* Status Breakdown Chart */}
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-gray-600" />
                    Estado de Tickets
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Resueltos */}
                    <div className="p-4 rounded-2xl bg-green-50/50 border border-green-100 flex flex-col items-center justify-center gap-2 group hover:bg-green-50 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <span className="text-3xl font-black text-gray-800">{stats.byStatus.resolved}</span>
                        <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Resueltos</span>
                    </div>

                    {/* Pendientes */}
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex flex-col items-center justify-center gap-2 group hover:bg-blue-50 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                            <Clock className="w-6 h-6" />
                        </div>
                        <span className="text-3xl font-black text-gray-800">{stats.byStatus.pending}</span>
                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Pendientes</span>
                    </div>

                    {/* Esperando Solución */}
                    <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100 flex flex-col items-center justify-center gap-2 group hover:bg-orange-50 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <span className="text-3xl font-black text-gray-800">{stats.byStatus.waiting}</span>
                        <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Esperando Solución</span>
                    </div>

                    {/* Cancelados */}
                    <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-200 flex flex-col items-center justify-center gap-2 group hover:bg-gray-100 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                            <FileDown className="w-6 h-6" />
                        </div>
                        <span className="text-3xl font-black text-gray-800">{stats.byStatus.cancelled}</span>
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Cancelados</span>
                    </div>
                </div>

                {/* Visual Bar Representation */}
                <div className="mt-8">
                    <div className="flex w-full h-4 rounded-full overflow-hidden">
                        <div style={{ width: `${stats.total > 0 ? (stats.byStatus.resolved / stats.total) * 100 : 0}%` }} className="h-full bg-green-500 hover:opacity-90 transition-all tooltip" title="Resueltos"></div>
                        <div style={{ width: `${stats.total > 0 ? (stats.byStatus.pending / stats.total) * 100 : 0}%` }} className="h-full bg-blue-500 hover:opacity-90 transition-all tooltip" title="Pendientes"></div>
                        <div style={{ width: `${stats.total > 0 ? (stats.byStatus.waiting / stats.total) * 100 : 0}%` }} className="h-full bg-orange-500 hover:opacity-90 transition-all tooltip" title="Esperando Solución"></div>
                        <div style={{ width: `${stats.total > 0 ? (stats.byStatus.cancelled / stats.total) * 100 : 0}%` }} className="h-full bg-gray-400 hover:opacity-90 transition-all tooltip" title="Cancelados"></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Resueltos</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Pendientes</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> En Proceso</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-400"></div> Cancelados</span>
                    </div>
                </div>
            </div>

            {/* Classification Breakdown Chart */}
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-indigo-500" />
                    Distribución por Clasificación
                </h3>
                <p className="text-xs text-gray-400 mb-6">Categorías operativas asignadas a cada reporte.</p>

                {stats.byClassification.length > 0 ? (
                    <div className="h-[400px] w-full mt-4">
                        <Bar 
                            data={{
                                labels: stats.byClassification.map(c => c.category),
                                datasets: [{
                                    label: 'Reportes',
                                    data: stats.byClassification.map(c => c.count),
                                    backgroundColor: (context: any) => {
                                        const chart = context.chart;
                                        const { ctx, chartArea } = chart;
                                        if (!chartArea || !chartArea.right || !isFinite(chartArea.right)) return 'rgba(99, 102, 241, 0.8)';
                                        const gradient = ctx.createLinearGradient(0, 0, chartArea.right, 0);
                                        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)'); // Indigo
                                        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.9)'); // Purple
                                        return gradient;
                                    },
                                    hoverBackgroundColor: (context: any) => {
                                        const chart = context.chart;
                                        const { ctx, chartArea } = chart;
                                        if (!chartArea || !chartArea.right || !isFinite(chartArea.right)) return 'rgba(79, 70, 229, 1)';
                                        const gradient = ctx.createLinearGradient(0, 0, chartArea.right, 0);
                                        gradient.addColorStop(0, 'rgba(79, 70, 229, 1)'); // Indigo Darker
                                        gradient.addColorStop(1, 'rgba(147, 51, 234, 1)'); // Purple Darker
                                        return gradient;
                                    },
                                    borderRadius: 6,
                                    borderSkipped: false,
                                    barThickness: 'flex',
                                    maxBarThickness: 32,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.2)',
                                }]
                            }}
                            options={{
                                indexAxis: 'y',
                                responsive: true,
                                maintainAspectRatio: false,
                                animation: {
                                    duration: 1500,
                                    easing: 'easeOutQuart',
                                },
                                layout: {
                                    padding: { right: 30 }
                                },
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        titleColor: '#1f2937',
                                        bodyColor: '#4b5563',
                                        borderColor: '#e5e7eb',
                                        borderWidth: 1,
                                        padding: 12,
                                        boxPadding: 6,
                                        usePointStyle: true,
                                        callbacks: {
                                            label: (context: any) => {
                                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                                const percentage = Math.round((context.raw / total) * 100);
                                                return ` ${context.raw} Reportes (${percentage}%)`;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        grid: { display: true, color: '#f3f4f6', drawTicks: false },
                                        border: { display: false },
                                        ticks: { font: { family: "'Inter', sans-serif" }, color: '#9ca3af', padding: 10 }
                                    },
                                    y: {
                                        grid: { display: false },
                                        border: { display: false },
                                        ticks: { 
                                            font: { family: "'Inter', sans-serif", weight: 'bold', size: 12 }, 
                                            color: '#4b5563',
                                            padding: 10,
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-400">
                        <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No hay datos de clasificación disponibles.</p>
                    </div>
                )}
            </div>

            {/* ── Distribución por Tipo de Hallazgo ── */}
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-500" />
                    Distribución por Tipo de Hallazgo
                </h3>
                <p className="text-xs text-gray-400 mb-6">Categorías asignadas según el tipo de hallazgo.</p>

                {stats.byFindingType.length > 0 ? (
                    <div className="h-[400px] w-full mt-4">
                        <Bar 
                            data={{
                                labels: stats.byFindingType.map(s => s.type),
                                datasets: [{
                                    label: 'Reportes',
                                    data: stats.byFindingType.map(s => s.count),
                                    backgroundColor: (context: any) => {
                                        const typeColors: Record<string, string[]> = {
                                            'Observación': ['rgba(168, 85, 247, 0.8)', 'rgba(147, 51, 234, 0.9)'],
                                            'Oportunidad de Mejora': ['rgba(59, 130, 246, 0.8)', 'rgba(37, 99, 235, 0.9)'],
                                            'Evento Adverso': ['rgba(239, 68, 68, 0.8)', 'rgba(220, 38, 38, 0.9)'],
                                            'Evento Cuasi Adverso': ['rgba(249, 115, 22, 0.8)', 'rgba(234, 88, 12, 0.9)'],
                                            'Desvío': ['rgba(234, 179, 8, 0.8)', 'rgba(202, 138, 4, 0.9)'],
                                            'Felicitación': ['rgba(34, 197, 94, 0.8)', 'rgba(22, 163, 74, 0.9)']
                                        };
                                        const label = context.chart.data.labels[context.dataIndex] as string;
                                        const colors = typeColors[label] || ['rgba(156, 163, 175, 0.8)', 'rgba(107, 114, 128, 0.9)'];
                                        
                                        const chart = context.chart;
                                        const { ctx, chartArea } = chart;
                                        if (!chartArea || !chartArea.right || !isFinite(chartArea.right)) return colors[0];
                                        const gradient = ctx.createLinearGradient(0, 0, chartArea.right, 0);
                                        gradient.addColorStop(0, colors[0]);
                                        gradient.addColorStop(1, colors[1]);
                                        return gradient;
                                    },
                                    borderRadius: 6,
                                    borderSkipped: false,
                                    barThickness: 'flex',
                                    maxBarThickness: 32,
                                    borderWidth: 1,
                                    borderColor: 'rgba(255,255,255,0.2)',
                                }]
                            }}
                            options={{
                                indexAxis: 'y',
                                responsive: true,
                                maintainAspectRatio: false,
                                onClick: (_event, elements, chart) => {
                                    if (elements.length > 0) {
                                        const index = elements[0].index;
                                        const label = chart.data.labels![index] as string;
                                        handleMetricClick({ finding_type: label });
                                    }
                                },
                                animation: { duration: 1500, easing: 'easeOutQuart' },
                                layout: { padding: { right: 30 } },
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        titleColor: '#1f2937',
                                        bodyColor: '#4b5563',
                                        borderColor: '#e5e7eb',
                                        borderWidth: 1,
                                        padding: 12,
                                        boxPadding: 6,
                                        usePointStyle: true,
                                        callbacks: {
                                            label: (context: any) => {
                                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                                const percentage = Math.round((context.raw / total) * 100);
                                                return ` ${context.raw} Reportes (${percentage}%)`;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        grid: { display: true, color: '#f3f4f6', drawTicks: false },
                                        border: { display: false },
                                        ticks: { font: { family: "'Inter', sans-serif" }, color: '#9ca3af', padding: 10 }
                                    },
                                    y: {
                                        grid: { display: false },
                                        border: { display: false },
                                        ticks: { font: { family: "'Inter', sans-serif", weight: 'bold', size: 12 }, color: '#4b5563', padding: 10 }
                                    }
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-400">
                        <PieChart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No hay datos de tipo de hallazgo disponibles.</p>
                    </div>
                )}
            </div>

            {/* ── Anónimos vs Identificados ── */}
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Anónimos vs Identificados
                </h3>
                <p className="text-xs text-gray-400 mb-6">Proporción de reportes con identidad declarada vs anónimos.</p>

                {stats.total > 0 ? (
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Visual Donut */}
                        <div className="relative w-40 h-40 shrink-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                {/* Background */}
                                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                                {/* Identified arc */}
                                <circle
                                    cx="18" cy="18" r="15.9155"
                                    fill="none"
                                    stroke="#14b8a6"
                                    strokeWidth="3"
                                    strokeDasharray={`${stats.total > 0 ? (stats.byAnonymity.identified / stats.total) * 100 : 0} ${100 - (stats.total > 0 ? (stats.byAnonymity.identified / stats.total) * 100 : 0)}`}
                                    strokeLinecap="round"
                                    className="transition-all duration-700"
                                />
                                {/* Anonymous arc */}
                                <circle
                                    cx="18" cy="18" r="15.9155"
                                    fill="none"
                                    stroke="#a78bfa"
                                    strokeWidth="3"
                                    strokeDasharray={`${stats.total > 0 ? (stats.byAnonymity.anonymous / stats.total) * 100 : 0} ${100 - (stats.total > 0 ? (stats.byAnonymity.anonymous / stats.total) * 100 : 0)}`}
                                    strokeDashoffset={`-${stats.total > 0 ? (stats.byAnonymity.identified / stats.total) * 100 : 0}`}
                                    strokeLinecap="round"
                                    className="transition-all duration-700"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-gray-800">{stats.total}</span>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total</span>
                            </div>
                        </div>

                        {/* Legend & Bars */}
                        <div className="flex-1 space-y-4 w-full">
                            {/* Identified */}
                            <div className="group">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-teal-500"></div>
                                        <span className="text-sm font-bold text-gray-700">👤 Identificados</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-black text-teal-600">{stats.byAnonymity.identified}</span>
                                        <span className="text-xs text-gray-400">({stats.total > 0 ? Math.round((stats.byAnonymity.identified / stats.total) * 100) : 0}%)</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500 transition-all duration-700 ease-out"
                                        style={{ width: `${stats.total > 0 ? (stats.byAnonymity.identified / stats.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Anonymous */}
                            <div className="group">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-violet-400"></div>
                                        <span className="text-sm font-bold text-gray-700">🕶️ Anónimos</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-black text-violet-600">{stats.byAnonymity.anonymous}</span>
                                        <span className="text-xs text-gray-400">({stats.total > 0 ? Math.round((stats.byAnonymity.anonymous / stats.total) * 100) : 0}%)</span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-violet-300 to-violet-400 transition-all duration-700 ease-out"
                                        style={{ width: `${stats.total > 0 ? (stats.byAnonymity.anonymous / stats.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Insight */}
                            <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-xs text-gray-500">
                                    💡 {stats.byAnonymity.anonymous > stats.byAnonymity.identified
                                        ? 'La mayoría de los reportes son anónimos. Esto puede indicar una cultura donde los reportantes prefieren no identificarse.'
                                        : stats.byAnonymity.anonymous === 0
                                            ? 'Todos los reportes están identificados. Excelente nivel de transparencia.'
                                            : `El ${Math.round((stats.byAnonymity.anonymous / stats.total) * 100)}% de los reportes son anónimos. Un balance saludable entre confidencialidad y transparencia.`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-400">
                        <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="text-sm">No hay datos disponibles.</p>
                    </div>
                )}
            </div>


            {/* ── Alertas de Tiempo de Respuesta ── */}
            <SlaAlertBanner
                reports={rawReports}
                onResendWhatsApp={async (report) => {
                    if (!report.assigned_to) return;
                    const botNumber = `549${report.assigned_to}`;
                    const resolutionLink = `${window.location.origin}/resolver-caso/${report.tracking_id}`;
                    await supabase.functions.invoke('send-whatsapp', {
                        body: {
                            number: botNumber,
                            templateName: '7_recordatorio_automtico_vencimiento_de_tiempo_de_respuesta__sla',
                            languageCode: 'en',
                            templateVariables: [report.tracking_id, report.sector, report.ai_summary || report.content || '', resolutionLink]
                        }
                    });
                }}
            />

            {/* ── Advanced Analytics ── */}
            <div>
                <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-sanatorio-primary" />
                    Análisis Avanzado
                </h2>
                <AdvancedAnalytics reports={rawReports} />
            </div>

            {/* ── PDCA Panel ── */}
            <div>
                <h2 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-sanatorio-primary" />
                    Ciclo PDCA — Verificación de Efectividad
                </h2>
                <p className="text-sm text-gray-500 mb-4">Seguimiento de acciones correctivas a 30, 60 y 90 días post-resolución.</p>
                <PdcaPanel />
            </div>

            <div className="bg-gradient-to-r from-[#002b4d] to-[#004270] rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 relative z-10">
                    <TrendingUp className="w-6 h-6 text-sanatorio-secondary" />
                    Insights Automáticos
                </h3>

                <div className="grid md:grid-cols-2 gap-6 relative z-10">
                    <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                        <p className="text-[#00D1FF] text-xs font-bold uppercase mb-1 tracking-widest">Área Crítica Detectada</p>
                        <p className="font-medium text-sm text-gray-100">
                            {stats.bySector.length > 0 ? stats.bySector[0].sector : 'N/A'} es el sector con más reportes ({stats.bySector.length > 0 ? stats.bySector[0].count : 0}).
                            Se sugiere revisión de procesos en esta área.
                        </p>
                    </div>
                    <div className="bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                        <p className="text-[#00D1FF] text-xs font-bold uppercase mb-1 tracking-widest">Eficiencia de Respuesta</p>
                        <p className="font-medium text-sm text-gray-100">
                            El tiempo promedio de resolución es de {stats.avgResolutionTimeDays} días.
                            {stats.avgResolutionTimeDays > 2
                                ? ' Se recomienda mejorar los tiempos para casos urgentes.'
                                : ' El equipo está respondiendo dentro de los parámetros esperados.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── VENTANA EMERGENTE (MODAL) DE CASOS POR GRAVEDAD / FILTRO CON DESCARGA PDF ── */}
            {caseModalFilter && (() => {
                const info = getModalTitleInfo();
                const resolvedCount = modalCases.filter(c => c.status === 'resolved').length;
                const pendingCount = modalCases.length - resolvedCount;

                return (
                    <div
                        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
                        onClick={() => setCaseModalFilter(null)}
                    >
                        <div
                            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-sanatorio-primary/10 text-sanatorio-primary">
                                            Auditoría de Casos en Ventana Emergente
                                        </span>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                            {modalCases.length} {modalCases.length === 1 ? 'caso' : 'casos'}
                                        </span>
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                                        {info.title}
                                    </h2>
                                    {info.subtitle && (
                                        <p className="text-xs text-slate-500 mt-0.5">{info.subtitle}</p>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5">
                                    <button
                                        onClick={handleDownloadModalPDF}
                                        disabled={isExportingModalPdf || modalCases.length === 0}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sanatorio-primary hover:bg-[#003f69] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                                    >
                                        {isExportingModalPdf ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <FileDown className="w-4 h-4" />
                                        )}
                                        Descargar en PDF ({modalCases.length})
                                    </button>

                                    <button
                                        onClick={handleDownloadModalExcel}
                                        disabled={isExportingModalExcel || modalCases.length === 0}
                                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                                    >
                                        {isExportingModalExcel ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <FileSpreadsheet className="w-4 h-4" />
                                        )}
                                        Excel
                                    </button>

                                    <button
                                        onClick={() => setCaseModalFilter(null)}
                                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                        title="Cerrar ventana"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Severity Quick-Selector Bar + Search & Status Filter */}
                            <div className="px-5 sm:px-6 py-3.5 bg-white border-b border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                                {/* Quick-switch between Verde, Amarillo, Rojo, Felicitaciones */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                                        Gravedad:
                                    </span>
                                    <button
                                        onClick={() => setCaseModalFilter({ urgency: 'Verde' })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                            caseModalFilter.urgency === 'Verde'
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                        }`}
                                    >
                                        🟢 Leves / Verdes ({stats.byUrgency.Verdes})
                                    </button>
                                    <button
                                        onClick={() => setCaseModalFilter({ urgency: 'Amarillo' })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                            caseModalFilter.urgency === 'Amarillo'
                                                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                        }`}
                                    >
                                        🟡 Medios / Amarillos ({stats.byUrgency.Amarillos})
                                    </button>
                                    <button
                                        onClick={() => setCaseModalFilter({ urgency: 'Rojo' })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                            caseModalFilter.urgency === 'Rojo'
                                                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                        }`}
                                    >
                                        🔴 Críticos / Rojos ({stats.byUrgency.Rojos})
                                    </button>
                                    <button
                                        onClick={() => setCaseModalFilter({ category: 'Felicitación' })}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                            caseModalFilter.category === 'Felicitación'
                                                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                                : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                                        }`}
                                    >
                                        🌟 Felicitaciones ({stats.felicitaciones})
                                    </button>
                                </div>

                                {/* Search & Status Filter */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-bold">
                                        <button
                                            onClick={() => setModalStatusFilter('all')}
                                            className={`px-2.5 py-1 rounded-md transition-all ${
                                                modalStatusFilter === 'all'
                                                    ? 'bg-white text-slate-800 shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            Todos ({modalCases.length})
                                        </button>
                                        <button
                                            onClick={() => setModalStatusFilter('pending')}
                                            className={`px-2.5 py-1 rounded-md transition-all ${
                                                modalStatusFilter === 'pending'
                                                    ? 'bg-white text-amber-700 shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            Pendientes ({pendingCount})
                                        </button>
                                        <button
                                            onClick={() => setModalStatusFilter('resolved')}
                                            className={`px-2.5 py-1 rounded-md transition-all ${
                                                modalStatusFilter === 'resolved'
                                                    ? 'bg-white text-emerald-700 shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            Resueltos ({resolvedCount})
                                        </button>
                                    </div>

                                    <div className="relative min-w-[230px]">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={modalSearch}
                                            onChange={e => setModalSearch(e.target.value)}
                                            placeholder="Buscar por #ID, sector, texto..."
                                            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Body: Cases List */}
                            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3 bg-slate-50/60">
                                {modalCases.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
                                        <p className="text-sm font-bold text-slate-600">
                                            No se encontraron casos para este filtro.
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Probá cambiar entre Verdes, Amarillos o Rojos en la barra superior.
                                        </p>
                                    </div>
                                ) : (
                                    modalCases.map(caso => {
                                        const isResolved = caso.status === 'resolved';
                                        const urg = caso.ai_urgency || 'S/C';
                                        const urgBadge =
                                            urg === 'Rojo'
                                                ? 'bg-red-100 text-red-700 border-red-200'
                                                : urg === 'Amarillo'
                                                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                                                    : urg === 'Verde'
                                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                        : 'bg-teal-100 text-teal-700 border-teal-200';

                                        return (
                                            <div
                                                key={caso.id || caso.tracking_id}
                                                className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:border-sanatorio-primary/30 transition-all"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-slate-100 text-sanatorio-primary">
                                                            #{caso.tracking_id || 'S/N'}
                                                        </span>
                                                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${urgBadge}`}>
                                                            {urg === 'Rojo'
                                                                ? '🔴 Crítico (Rojo)'
                                                                : urg === 'Amarillo'
                                                                    ? '🟡 Medio (Amarillo)'
                                                                    : urg === 'Verde'
                                                                        ? '🟢 Leve (Verde)'
                                                                        : caso.finding_type || 'Felicitación'}
                                                        </span>
                                                        <span
                                                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                                                isResolved
                                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                            }`}
                                                        >
                                                            {isResolved ? '✓ Resuelto' : '⏳ En Gestión / Pendiente'}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            {caso.created_at
                                                                ? new Date(caso.created_at).toLocaleDateString('es-AR')
                                                                : '-'}
                                                        </span>
                                                    </div>

                                                    <button
                                                        onClick={() => generateValidationPDF(caso)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-sanatorio-primary hover:text-white text-slate-700 text-[11px] font-bold transition-colors self-start sm:self-auto"
                                                        title="Descargar ficha individual en PDF"
                                                    >
                                                        <FileDown className="w-3.5 h-3.5" />
                                                        Ficha PDF
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-xs">
                                                    <div>
                                                        <span className="text-slate-400 font-semibold">Sector Destino: </span>
                                                        <span className="font-bold text-slate-700">{caso.sector || 'Sin asignar'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 font-semibold">Sector Origen: </span>
                                                        <span className="font-medium text-slate-600">
                                                            {caso.reporter_sector || caso.origin_sector || 'No especificado'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 font-semibold">Clasificación: </span>
                                                        <span className="font-medium text-slate-600">
                                                            {caso.ai_category || caso.finding_type || 'General'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {caso.ai_summary && (
                                                    <p className="text-xs font-bold text-slate-800 mt-2.5">
                                                        Resumen IA: <span className="font-semibold text-slate-700">{caso.ai_summary}</span>
                                                    </p>
                                                )}

                                                {caso.content && (
                                                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                        {caso.content}
                                                    </p>
                                                )}

                                                {(caso.immediate_action || caso.solution_notes || caso.quality_observations) && (
                                                    <div className="mt-2.5 p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-900 space-y-1">
                                                        {(caso.immediate_action || caso.solution_notes) && (
                                                            <p>
                                                                <strong>Acción / Resolución:</strong>{' '}
                                                                {caso.immediate_action || caso.solution_notes}
                                                            </p>
                                                        )}
                                                        {caso.quality_observations && (
                                                            <p>
                                                                <strong>Observaciones de Calidad:</strong> {caso.quality_observations}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-5 sm:px-6 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                                <span>
                                    Sanatorio Argentino · Gestión de Calidad · <strong>Innovación y Transformación Digital</strong>
                                </span>
                                <button
                                    onClick={() => setCaseModalFilter(null)}
                                    className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                                >
                                    Cerrar ventana
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
