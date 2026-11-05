import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    BarChart3,
    PieChart,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertOctagon,
    ArrowUpRight,
    Zap,
    FileDown,
    BrainCircuit,
    Loader2,
    Tag,
    ClipboardCheck,
    Star,
    Send
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import confetti from 'canvas-confetti';
import { Chart, registerables } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { AdvancedAnalytics } from './AdvancedAnalytics';
import { SlaAlertBanner } from './SlaAlerts';
import { PdcaPanel } from './PdcaPanel';
import { MetricsFilters, type MetricsFilterState } from './MetricsFilters';
import { SECTOR_OPTIONS } from '../constants/sectors';
import { PDF_COLORS, loadLogoImage, drawLogoBadge, sanitizePdfText, cleanMarkdownForPdf, applyInstitutionalFooters } from '../utils/pdfTheme';

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
    const navigate = useNavigate();

    const canViewAll = role === 'admin' || role === 'directivo';

    const handleMetricClick = (filters: { urgency?: string; category?: string; sector?: string; reporter_sector?: string; finding_type?: string }) => {
        const base = (role === 'admin' || role === 'responsable') ? '/dashboard' : '/mis-casos';
        const params = new URLSearchParams();
        if (filters.urgency) params.set('urgency', filters.urgency);
        if (filters.category) params.set('category', filters.category);
        if (filters.sector) params.set('sector', filters.sector);
        if (filters.reporter_sector) params.set('reporter_sector', filters.reporter_sector);
        if (filters.finding_type) params.set('finding_type', filters.finding_type);
        
        navigate(`${base}?${params.toString()}`);
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

    const renderChartToImage = (config: any): Promise<string> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = 400;
            canvas.style.visibility = 'hidden';
            document.body.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve('');

            new Chart(ctx, {
                ...config,
                options: {
                    ...config.options,
                    animation: false,
                    responsive: false,
                    devicePixelRatio: 2, // High resolution
                }
            });

            // Wait a bit for Chart.js to render
            setTimeout(() => {
                const imgData = canvas.toDataURL('image/png');
                document.body.removeChild(canvas);
                resolve(imgData);
            }, 100);
        });
    };

    const handleExportIntelligenceReport = async () => {
        if (rawReports.length === 0) return;
        setIsExporting(true);

        try {
            const userName = profile?.display_name || session?.user?.email || 'Usuario';
            const userRole = role || 'responsable';
            const userSectors = sectors || [];

            // Role-based context for AI prompt
            const roleContextMap: Record<string, string> = {
                admin: 'Genera un informe completo institucional con visión global de todos los sectores. Incluye análisis profundo de causas raíz, correlaciones entre sectores y recomendaciones operativas detalladas.',
                responsable: `Genera un informe de gestión sectorial enfocado EXCLUSIVAMENTE en los sectores: ${userSectors.join(', ')}. El tono debe ser operativo y práctico, con pasos concretos de mejora para estos sectores específicos.`,
                directivo: 'Genera un executive brief estratégico. El tono debe ser conciso, ejecutivo, orientado a KPIs y decisiones de alto nivel. Usa bullet points. Evita detalles operativos, enfócate en tendencias, riesgos institucionales y recomendaciones estratégicas.'
            };

            // 1. Get AI Analysis and Proportional Logo
            const [{ data: aiAnalysis, error: aiError }, logoObj] = await Promise.all([
                supabase.functions.invoke('generate-intelligence-report', {
                    body: {
                        reports: rawReports,
                        startDate: new Date(Math.min(...rawReports.map(r => new Date(r.created_at).getTime()))).toLocaleDateString(),
                        endDate: new Date().toLocaleDateString(),
                        roleContext: roleContextMap[userRole] || roleContextMap.admin
                    }
                }),
                loadLogoImage('/logosanatorio.png')
            ]);

            if (aiError) throw aiError;

            // 2. Generate Charts for PDF
            const sectorColors = ['#00548B', '#00A99D', '#00385c', '#FACC15', '#FF3131', '#00D1FF', '#6366f1', '#a855f7'];

            const sectorChartImg = await renderChartToImage({
                type: 'doughnut',
                data: {
                    labels: stats.bySector.map(s => s.sector),
                    datasets: [{ data: stats.bySector.map(s => s.count), backgroundColor: sectorColors, borderWidth: 0 }]
                },
                options: {
                    plugins: {
                        legend: { position: 'right', labels: { font: { size: 14, weight: 'bold' } } },
                        title: { display: true, text: 'Distribución por Sector', font: { size: 18, weight: 'bold' }, padding: 20 }
                    }
                }
            });

            const urgencyChartImg = await renderChartToImage({
                type: 'bar',
                data: {
                    labels: ['Leve (Verde)', 'Medio (Amarillo)', 'Crítico (Rojo)'],
                    datasets: [{
                        label: 'Número de Reportes',
                        data: [stats.byUrgency.Verdes, stats.byUrgency.Amarillos, stats.byUrgency.Rojos],
                        backgroundColor: ['#22c55e', '#eab308', '#ef4444'],
                        borderRadius: 10
                    }]
                },
                options: {
                    plugins: { legend: { display: false }, title: { display: true, text: 'Análisis de Triage (Riesgo)', font: { size: 18, weight: 'bold' }, padding: 20 } },
                    scales: { y: { beginAtZero: true, border: { display: false }, grid: { display: true, color: '#f1f5f9' } }, x: { border: { display: false }, grid: { display: false } } }
                }
            });

            const classificationChartImg = stats.byClassification.length > 0 ? await renderChartToImage({
                type: 'doughnut',
                data: {
                    labels: stats.byClassification.map(c => c.category),
                    datasets: [{ data: stats.byClassification.map(c => c.count), backgroundColor: ['#6366f1', '#00A99D', '#00548B', '#FACC15', '#FF3131', '#a855f7', '#00D1FF', '#f97316'], borderWidth: 0 }]
                },
                options: {
                    plugins: {
                        legend: { position: 'right', labels: { font: { size: 12, weight: 'bold' } } },
                        title: { display: true, text: 'Distribución por Clasificación', font: { size: 18, weight: 'bold' }, padding: 20 }
                    }
                }
            }) : null;

            // 3. Initialize PDF
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const primaryColor: [number, number, number] = PDF_COLORS.primary;
            const secondaryColor: [number, number, number] = PDF_COLORS.secondary;

            // ─── HELPER: Cover page ───
            const buildCover = (title: string, subtitle: string, roleBadge: string, badgeColor: [number, number, number]) => {
                // Full-width header band
                doc.setFillColor(...primaryColor);
                doc.rect(0, 0, pageWidth, 56, 'F');

                // Accent bar
                doc.setFillColor(...secondaryColor);
                doc.rect(0, 56, pageWidth, 2.8, 'F');

                // Proportional Logo in crisp white badge
                drawLogoBadge(doc, logoObj, 16, 11, 38, 32, 3);

                const tx = 60;
                doc.setTextColor(186, 230, 253);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.text('DEPARTAMENTO DE GESTIÓN DE CALIDAD · SANATORIO ARGENTINO', tx, 17);

                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(17.5);
                doc.text(sanitizePdfText(title), tx, 26);

                doc.setFontSize(10.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(224, 242, 254);
                doc.text(sanitizePdfText(subtitle), tx, 34);

                const periodStart = rawReports.length > 0
                    ? new Date(Math.min(...rawReports.map(r => new Date(r.created_at).getTime()))).toLocaleDateString('es-AR')
                    : new Date().toLocaleDateString('es-AR');
                doc.setFontSize(9);
                doc.text(`Período Analizado: ${periodStart} al ${new Date().toLocaleDateString('es-AR')}`, tx, 42);

                // Metadata strip below header
                doc.setFillColor(...PDF_COLORS.slate50);
                doc.setDrawColor(...PDF_COLORS.slate200);
                doc.setLineWidth(0.35);
                doc.roundedRect(16, 65, pageWidth - 32, 20, 3, 3, 'FD');

                // Role badge
                doc.setFillColor(...badgeColor);
                doc.roundedRect(pageWidth - 64, 69, 44, 12, 2.5, 2.5, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.text(sanitizePdfText(roleBadge), pageWidth - 42, 76.5, { align: 'center' });

                // User info
                doc.setTextColor(...PDF_COLORS.slate800);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9.5);
                doc.text(`Generado por: ${sanitizePdfText(userName)}`, 22, 73);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(...PDF_COLORS.slate500);
                doc.text(`Emisión: ${new Date().toLocaleString('es-AR')}`, 22, 79.5);

                if (userRole === 'responsable' && userSectors.length > 0) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8.5);
                    doc.setTextColor(...primaryColor);
                    doc.text(sanitizePdfText(`Sectores Asignados: ${userSectors.join(', ')}`), 20, 93);
                }
            };

            // ─── HELPER: Section title  ───
            const sectionTitle = (text: string, y: number, num?: number) => {
                doc.setTextColor(...primaryColor);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(13.5);
                doc.text(sanitizePdfText(num ? `${num}. ${text}` : text), 16, y);
                doc.setDrawColor(...secondaryColor);
                doc.setLineWidth(0.7);
                doc.line(16, y + 2.2, 105, y + 2.2);
            };

            // ─── HELPER: AI text block (Clean Markdown + Clinical Card) ───
            const aiTextBlock = (text: string, y: number) => {
                const cleaned = cleanMarkdownForPdf(text || 'Análisis no disponible.');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9.5);
                const maxW = pageWidth - 44;
                const lines = doc.splitTextToSize(cleaned, maxW);
                const lineH = 4.8;
                const boxH = lines.length * lineH + 10;

                if (y + boxH > pageHeight - 20) {
                    doc.addPage();
                    y = 22;
                }

                doc.setFillColor(...PDF_COLORS.slate50);
                doc.setDrawColor(...PDF_COLORS.slate200);
                doc.setLineWidth(0.3);
                doc.roundedRect(16, y - 4, pageWidth - 32, boxH, 2.5, 2.5, 'FD');

                doc.setFillColor(...primaryColor);
                doc.roundedRect(16, y - 4, 2.5, boxH, 1, 1, 'F');

                doc.setTextColor(...PDF_COLORS.slate800);
                lines.forEach((line: string, idx: number) => {
                    doc.text(line, 22, y + 2.5 + idx * lineH);
                });
                return y + boxH + 4;
            };

            const styleKpiIndicatorCell = (hookData: any) => {
                if (hookData.section === 'body' && hookData.column.index === 2) {
                    const val = hookData.cell.raw;
                    hookData.cell.styles.fontStyle = 'bold';
                    if (val === 'ÓPTIMO' || val === 'COMPLETADO') {
                        hookData.cell.styles.textColor = PDF_COLORS.emerald;
                        hookData.cell.styles.fillColor = PDF_COLORS.emeraldBg;
                    } else if (val === 'ATENCIÓN') {
                        hookData.cell.styles.textColor = PDF_COLORS.amber;
                        hookData.cell.styles.fillColor = PDF_COLORS.amberBg;
                    } else if (val === 'CRÍTICO') {
                        hookData.cell.styles.textColor = PDF_COLORS.red;
                        hookData.cell.styles.fillColor = PDF_COLORS.redBg;
                    } else if (val === 'DESTACADO') {
                        hookData.cell.styles.textColor = PDF_COLORS.gold;
                        hookData.cell.styles.fillColor = PDF_COLORS.goldBg;
                    } else {
                        hookData.cell.styles.textColor = PDF_COLORS.primary;
                        hookData.cell.styles.fillColor = PDF_COLORS.primaryLight;
                    }
                }
            };

            // ════════════════════════════════════════════
            //  ADMIN REPORT — Full Institutional Intelligence
            // ════════════════════════════════════════════
            if (userRole === 'admin') {
                // PAGE 1: COVER + KPIs
                buildCover('INFORME DE INTELIGENCIA INSTITUCIONAL', 'Análisis Integral de Gestión de Calidad y Trazabilidad', 'ADMINISTRADOR', [109, 40, 217]);

                sectionTitle('RESUMEN EJECUTIVO DE INDICADORES', 98, 1);

                autoTable(doc, {
                    startY: 105,
                    head: [['Métrica Institucional', 'Valor Registrado', 'Estado / Nivel']],
                    body: [
                        ['Total Hallazgos Operativos', stats.total.toString(), 'REGISTRO'],
                        ['Casos Resueltos y Cerrados', stats.resolved.toString(), 'COMPLETADO'],
                        ['Tasa de Resolución Efectiva', `${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%`, stats.total > 0 && (stats.resolved / stats.total) >= 0.7 ? 'ÓPTIMO' : 'ATENCIÓN'],
                        ['Alertas Críticas (Riesgo Rojo)', stats.urgentCount.toString(), stats.urgentCount > 0 ? 'CRÍTICO' : 'ÓPTIMO'],
                        ['Tiempo Promedio de Resolución', `${stats.avgResolutionTimeDays} días`, Number(stats.avgResolutionTimeDays) <= 2 ? 'ÓPTIMO' : 'ATENCIÓN'],
                        ['Casos Pendientes en Gestión', stats.pending.toString(), stats.pending > 5 ? 'ATENCIÓN' : 'ÓPTIMO'],
                        ['Felicitaciones y Reconocimientos al Personal', (stats.felicitaciones || 0).toString(), 'DESTACADO'],
                    ],
                    theme: 'striped',
                    headStyles: { fillColor: primaryColor, fontSize: 9.5, fontStyle: 'bold', cellPadding: 3.5 },
                    styles: { fontSize: 9, cellPadding: 3.5, textColor: PDF_COLORS.slate800 },
                    columnStyles: {
                        0: { fontStyle: 'bold' },
                        1: { halign: 'center', fontStyle: 'bold' },
                        2: { halign: 'center', cellWidth: 38 }
                    },
                    didParseCell: styleKpiIndicatorCell,
                    margin: { left: 16, right: 16 },
                });

                // Sector chart on page 1
                if (sectorChartImg) {
                    const chartY = (doc as any).lastAutoTable.finalY + 8;
                    doc.addImage(sectorChartImg, 'PNG', 16, chartY, pageWidth - 32, 74);
                }

                // PAGE 2: ANALYSIS
                doc.addPage();
                if (urgencyChartImg) doc.addImage(urgencyChartImg, 'PNG', 16, 15, pageWidth - 32, 74);

                sectionTitle('ANÁLISIS DESCRIPTIVO', 102, 2);
                let nextY = aiTextBlock(aiAnalysis.descriptive, 112);

                nextY = Math.max(nextY + 8, 175);
                sectionTitle('ANÁLISIS DIAGNÓSTICO', nextY, 3);
                aiTextBlock(aiAnalysis.diagnostic, nextY + 10);

                // PAGE 3: PREDICTIVE + PRESCRIPTIVE
                doc.addPage();
                sectionTitle('ANÁLISIS PREDICTIVO Y TENDENCIAS', 25, 4);
                let presY = aiTextBlock(aiAnalysis.predictive, 35);

                presY = Math.max(presY + 10, 115);
                sectionTitle('ANÁLISIS PRESCRIPTIVO Y PLAN DE MEJORA', presY, 5);
                aiTextBlock(aiAnalysis.prescriptive, presY + 10);

                // PAGE 4: CLASSIFICATION + PERSONNEL
                doc.addPage();
                if (classificationChartImg) {
                    doc.addImage(classificationChartImg, 'PNG', 16, 15, pageWidth - 32, 74);
                }

                sectionTitle('EQUIPO Y GESTIÓN POR SECTOR', classificationChartImg ? 102 : 25, 6);

                const { data: allProfiles } = await supabase.from('user_profiles').select('display_name, role, assigned_sectors');
                if (allProfiles && allProfiles.length > 0) {
                    autoTable(doc, {
                        startY: classificationChartImg ? 110 : 33,
                        head: [['Nombre del Profesional', 'Rol en Sistema', 'Sectores Asignados']],
                        body: allProfiles.map(p => [
                            sanitizePdfText(p.display_name || 'Sin nombre'),
                            p.role === 'admin' ? 'Administrador' : p.role === 'directivo' ? 'Directivo' : 'Responsable',
                            sanitizePdfText((p.assigned_sectors || []).join(', ') || '-')
                        ]),
                        theme: 'striped',
                        headStyles: { fillColor: secondaryColor, fontSize: 9, fontStyle: 'bold' },
                        styles: { fontSize: 8, cellPadding: 3, textColor: PDF_COLORS.slate800 },
                        margin: { left: 16, right: 16 },
                    });
                }

                // PAGE 5: CRITICAL CASES ANNEX
                doc.addPage();
                sectionTitle('ANEXO: CASOS CRÍTICOS Y FELICITACIONES DESTACADAS', 25);

                const criticalCases = rawReports.filter(r => r.ai_urgency === 'Rojo').slice(0, 15);
                if (criticalCases.length > 0) {
                    autoTable(doc, {
                        startY: 33,
                        head: [['Ticket ID', 'Sector', 'Clasificación', 'Resumen del Caso Crítico', 'Estado']],
                        body: criticalCases.map(r => [
                            sanitizePdfText(r.tracking_id),
                            sanitizePdfText(r.sector || '-'),
                            sanitizePdfText(r.ai_category || '-'),
                            sanitizePdfText(r.ai_summary || r.content || '').substring(0, 68),
                            r.status === 'resolved' ? 'Resuelto' : r.status === 'cancelled' ? 'Cancelado' : 'Pendiente'
                        ]),
                        theme: 'grid',
                        headStyles: { fillColor: PDF_COLORS.red, fontSize: 8, fontStyle: 'bold' },
                        styles: { fontSize: 7.5, cellPadding: 3, textColor: PDF_COLORS.slate800 },
                        margin: { left: 16, right: 16 },
                    });
                } else {
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(9.5);
                    doc.setTextColor(...PDF_COLORS.slate500);
                    doc.text('No se registraron alertas de riesgo crítico (Rojo) en el período analizado.', 16, 38);
                }

                // ════════════════════════════════════════════
                //  RESPONSABLE REPORT — Sectoral Management
                // ════════════════════════════════════════════
            } else if (userRole === 'responsable') {
                // PAGE 1: COVER
                buildCover('INFORME DE GESTIÓN SECTORIAL', `Responsable: ${userName}`, 'RESPONSABLE', [21, 128, 61]);

                sectionTitle('MIS INDICADORES DE SECTOR', 102, 1);

                autoTable(doc, {
                    startY: 110,
                    head: [['Métrica de Mi Gestión', 'Valor']],
                    body: [
                        ['Total Casos Operativos en Mis Sectores', stats.total.toString()],
                        ['Casos Resueltos', stats.resolved.toString()],
                        ['Tasa de Resolución', `${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%`],
                        ['Casos Pendientes de Resolución', stats.pending.toString()],
                        ['Alertas Críticas', stats.urgentCount.toString()],
                        ['Tiempo Promedio de Respuesta', `${stats.avgResolutionTimeDays} días`],
                        ['Felicitaciones Recibidas', (stats.felicitaciones || 0).toString()],
                        ['Sectores Asignados', sanitizePdfText(userSectors.join(', ') || 'Ninguno')],
                    ],
                    theme: 'striped',
                    headStyles: { fillColor: PDF_COLORS.emerald, fontSize: 9.5, fontStyle: 'bold' },
                    styles: { fontSize: 9, cellPadding: 3.5, textColor: PDF_COLORS.slate800 },
                    columnStyles: { 0: { fontStyle: 'bold' } },
                    margin: { left: 16, right: 16 },
                });

                // PAGE 2: CHARTS
                doc.addPage();
                if (sectorChartImg) doc.addImage(sectorChartImg, 'PNG', 16, 15, pageWidth - 32, 74);
                if (urgencyChartImg) doc.addImage(urgencyChartImg, 'PNG', 16, 102, pageWidth - 32, 74);

                // PAGE 3: MY CASES TABLE
                doc.addPage();
                sectionTitle('MIS CASOS DETALLADOS', 25, 2);

                autoTable(doc, {
                    startY: 33,
                    head: [['Ticket', 'Sector', 'Clasificación', 'Urgencia', 'Estado', 'Fecha']],
                    body: rawReports.slice(0, 30).map(r => [
                        sanitizePdfText(r.tracking_id),
                        sanitizePdfText(r.sector || '-'),
                        sanitizePdfText(r.ai_category || r.finding_type || '-'),
                        sanitizePdfText(r.ai_urgency || '-'),
                        r.status === 'resolved' ? 'Resuelto' : r.status === 'cancelled' ? 'Cancelado' : r.status === 'pending_resolution' ? 'En Gestión' : r.status === 'quality_validation' ? 'Validación Calidad' : 'Pendiente',
                        new Date(r.created_at).toLocaleDateString('es-AR')
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: primaryColor, fontSize: 8, fontStyle: 'bold' },
                    styles: { fontSize: 7.5, cellPadding: 3, textColor: PDF_COLORS.slate800 },
                    margin: { left: 16, right: 16 },
                });

                // PAGE 4: AI ANALYSIS (Focused)
                doc.addPage();
                sectionTitle('ANÁLISIS DE MI GESTIÓN', 25, 3);
                let rNextY = aiTextBlock(aiAnalysis.descriptive, 35);

                rNextY = Math.max(rNextY + 10, 105);
                sectionTitle('DIAGNÓSTICO SECTORIAL', rNextY, 4);
                rNextY = aiTextBlock(aiAnalysis.diagnostic, rNextY + 10);

                // PAGE 5: RECOMMENDATIONS
                doc.addPage();
                sectionTitle('RECOMENDACIONES PARA MIS SECTORES', 25, 5);
                let recY = aiTextBlock(aiAnalysis.prescriptive, 35);

                recY = Math.max(recY + 15, 110);
                sectionTitle('PROYECCIÓN', recY, 6);
                aiTextBlock(aiAnalysis.predictive, recY + 10);

                // ════════════════════════════════════════════
                //  DIRECTIVO REPORT — Executive Intelligence Brief
                // ════════════════════════════════════════════
            } else {
                // PAGE 1: COVER
                buildCover('EXECUTIVE INTELLIGENCE BRIEF', 'Resumen Estratégico de Gestión de Calidad Institucional', 'DIRECCIÓN', primaryColor);

                // Big KPI blocks (2x3 grid including Felicitaciones)
                const kpiStartY = 98;
                const kpiBoxW = (pageWidth - 42) / 2;
                const kpiBoxH = 30;

                const kpis = [
                    { label: 'TOTAL HALLAZGOS', value: stats.total.toString(), color: primaryColor },
                    { label: 'TASA DE RESOLUCIÓN', value: `${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%`, color: secondaryColor },
                    { label: 'ALERTAS CRÍTICAS', value: stats.urgentCount.toString(), color: PDF_COLORS.red },
                    { label: 'TIEMPO PROMEDIO', value: `${stats.avgResolutionTimeDays}d`, color: PDF_COLORS.purple },
                    { label: 'FELICITACIONES RECIBIDAS', value: (stats.felicitaciones || 0).toString(), color: PDF_COLORS.gold },
                    { label: 'CASOS PENDIENTES', value: stats.pending.toString(), color: PDF_COLORS.slate700 },
                ];

                kpis.forEach((kpi, i) => {
                    const col = i % 2;
                    const row = Math.floor(i / 2);
                    const x = 16 + col * (kpiBoxW + 10);
                    const y = kpiStartY + row * (kpiBoxH + 7);

                    doc.setFillColor(...kpi.color);
                    doc.roundedRect(x, y, kpiBoxW, kpiBoxH, 3.5, 3.5, 'F');

                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(7.5);
                    doc.text(kpi.label, x + 8, y + 10);

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(21);
                    doc.text(kpi.value, x + 8, y + 23.5);
                });

                // PAGE 2: STRATEGIC ANALYSIS
                doc.addPage();
                sectionTitle('VISIÓN ESTRATÉGICA', 25, 1);
                let dNextY = aiTextBlock(aiAnalysis.descriptive, 35);

                dNextY = Math.max(dNextY + 10, 115);
                sectionTitle('DIAGNÓSTICO INSTITUCIONAL', dNextY, 2);
                aiTextBlock(aiAnalysis.diagnostic, dNextY + 10);

                // PAGE 3: CHARTS
                doc.addPage();
                sectionTitle('INDICADORES VISUALES', 25, 3);
                if (sectorChartImg) doc.addImage(sectorChartImg, 'PNG', 16, 35, pageWidth - 32, 74);
                if (urgencyChartImg) doc.addImage(urgencyChartImg, 'PNG', 16, 120, pageWidth - 32, 74);

                // PAGE 4: CLASSIFICATION + STATUS
                doc.addPage();
                if (classificationChartImg) {
                    doc.addImage(classificationChartImg, 'PNG', 16, 15, pageWidth - 32, 74);
                }

                sectionTitle('ESTADO DE GESTIÓN', classificationChartImg ? 102 : 25, 4);
                autoTable(doc, {
                    startY: classificationChartImg ? 110 : 33,
                    head: [['Estado de Casos', 'Cantidad', 'Participación']],
                    body: [
                        ['Resueltos', stats.byStatus.resolved.toString(), `${stats.total > 0 ? Math.round((stats.byStatus.resolved / stats.total) * 100) : 0}%`],
                        ['Pendientes', stats.byStatus.pending.toString(), `${stats.total > 0 ? Math.round((stats.byStatus.pending / stats.total) * 100) : 0}%`],
                        ['En Proceso', stats.byStatus.waiting.toString(), `${stats.total > 0 ? Math.round((stats.byStatus.waiting / stats.total) * 100) : 0}%`],
                        ['Cancelados / Descartados', stats.byStatus.cancelled.toString(), `${stats.total > 0 ? Math.round((stats.byStatus.cancelled / stats.total) * 100) : 0}%`],
                        ['Felicitaciones / Reconocimientos', (stats.felicitaciones || 0).toString(), 'Destacado Positivo'],
                    ],
                    theme: 'striped',
                    headStyles: { fillColor: primaryColor, fontSize: 9.5, fontStyle: 'bold' },
                    styles: { fontSize: 9, cellPadding: 4, textColor: PDF_COLORS.slate800 },
                    margin: { left: 16, right: 16 },
                });

                // PAGE 5: STRATEGIC RECOMMENDATIONS
                doc.addPage();
                sectionTitle('PROYECCIÓN Y TENDENCIAS', 25, 5);
                let stratY = aiTextBlock(aiAnalysis.predictive, 35);

                stratY = Math.max(stratY + 10, 115);
                sectionTitle('RECOMENDACIONES ESTRATÉGICAS', stratY, 6);
                aiTextBlock(aiAnalysis.prescriptive, stratY + 10);
            }

            // Add institutional footers to all pages
            applyInstitutionalFooters(doc, { margin: 16 });

            // Role-based filename
            const roleNames: Record<string, string> = {
                admin: 'Institucional',
                responsable: 'Sectorial',
                directivo: 'Executive_Brief'
            };

            doc.save(`SA_Informe_${roleNames[userRole] || 'Calidad'}_${new Date().toISOString().split('T')[0]}.pdf`);

            // Success Feedback
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
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-display font-black text-sanatorio-primary tracking-tight">
                        Inteligencia de Calidad
                    </h1>
                    <p className="text-slate-500 font-medium">Análisis avanzado y detección de patrones en tiempo real.</p>
                </div>

                <button
                    onClick={handleExportIntelligenceReport}
                    disabled={isExporting}
                    className="btn-primary w-full md:w-auto px-8"
                >
                    {isExporting ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generando Informe...
                        </>
                    ) : (
                        <>
                            <FileDown className="w-5 h-5" />
                            <BrainCircuit className="w-5 h-5 text-sanatorio-secondary" />
                            {role === 'admin' ? 'Informe Institucional' : role === 'directivo' ? 'Executive Brief' : 'Informe Sectorial'}
                        </>
                    )}
                </button>
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

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <BarChart3 className="w-24 h-24 text-blue-600" />
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Reportes Recibidos</p>
                    <p className="text-4xl font-black text-gray-800 mt-2">{stats.totalReceived}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs text-blue-600 font-medium">
                        <span>Como Sector Destino</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <CheckCircle2 className="w-24 h-24 text-green-600" />
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Tasa de Resolución</p>
                    <p className="text-4xl font-black text-gray-800 mt-2">
                        {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                    </p>
                    <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5">
                        <div
                            className="bg-green-500 h-1.5 rounded-full transition-all duration-1000"
                            style={{ width: `${stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0}%` }}
                        ></div>
                    </div>
                </div>

                <div 
                    onClick={() => handleMetricClick({ urgency: 'Rojo' })}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group cursor-pointer hover:border-red-200 transition-all"
                >
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <AlertOctagon className="w-24 h-24 text-red-600" />
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Hallazgos Críticos</p>
                    <p className="text-4xl font-black text-gray-800 mt-2">{stats.urgentCount}</p>
                    <p className="text-xs text-red-500 mt-2 font-medium">Requiren atención inmediata</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock className="w-24 h-24 text-purple-600" />
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Tiempo Promedio</p>
                    <p className="text-4xl font-black text-gray-800 mt-2">{stats.avgResolutionTimeDays}d</p>
                    <p className="text-xs text-gray-400 mt-2">Desde reporte hasta cierre</p>
                </div>

                <div 
                    onClick={() => handleMetricClick({ category: 'Felicitación' })}
                    className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-2xl shadow-sm border border-amber-200 relative overflow-hidden group cursor-pointer hover:border-amber-300 transition-all"
                >
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Star className="w-24 h-24 text-amber-400" />
                    </div>
                    <p className="text-amber-600 text-xs font-bold uppercase tracking-wider">Felicitaciones</p>
                    <p className="text-4xl font-black text-amber-600 mt-2">{stats.felicitaciones}</p>
                    <p className="text-xs text-amber-500 mt-2 font-medium">Reconocimientos positivos 🎉</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ArrowUpRight className="w-24 h-24 text-indigo-600" />
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Reportes Emitidos</p>
                    <p className="text-4xl font-black text-gray-800 mt-2">{stats.totalEmitted}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs text-indigo-600 font-medium">
                        <span>Como Sector Origen</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sector Breakwodn Chart */}
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-sanatorio-secondary" />
                        Hallazgos Recibidos por Sector
                    </h3>
                    <div className="space-y-2">
                        {stats.bySector.length > 0 ? (
                            <div className="h-[400px] w-full mt-4">
                                <Bar 
                                    data={{
                                        labels: stats.bySector.map(c => c.sector),
                                        datasets: [{
                                            label: 'Reportes',
                                            data: stats.bySector.map(c => c.count),
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
                                        onClick: (_event, elements, chart) => {
                                            if (elements.length > 0) {
                                                const index = elements[0].index;
                                                const label = chart.data.labels![index] as string;
                                                handleMetricClick({ sector: label });
                                            }
                                        },
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
                                                ticks: { font: { family: "'Inter', sans-serif", weight: 'bold' }, color: '#4b5563', padding: 10 }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-400">
                                <PieChart className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">No hay sectores registrados.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Urgency Donut Chart */}
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        Gravedad de Hallazgos
                    </h3>
                    <p className="text-[11px] text-gray-400 mb-6 leading-tight">
                        * No se incluyen {stats.total - (stats.byUrgency.Verdes + stats.byUrgency.Amarillos + stats.byUrgency.Rojos)} reportes sin riesgo clínico asignado (ej. históricos o felicitaciones).
                    </p>

                    {(() => {
                        const green = stats.byUrgency.Verdes;
                        const yellow = stats.byUrgency.Amarillos;
                        const red = stats.byUrgency.Rojos;
                        const total = green + yellow + red || 1;
                        const pGreen = (green / total) * 100;
                        const pYellow = (yellow / total) * 100;
                        const pRed = (red / total) * 100;

                        const segments = [
                            { label: 'Leve', count: green, pct: pGreen, color: '#22c55e', bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', barBg: 'bg-green-200', barFill: 'bg-green-500' },
                            { label: 'Medio', count: yellow, pct: pYellow, color: '#eab308', bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-700', barBg: 'bg-yellow-200', barFill: 'bg-yellow-500' },
                            { label: 'Crítico', count: red, pct: pRed, color: '#ef4444', bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700', barBg: 'bg-red-200', barFill: 'bg-red-500' },
                        ];

                        // Build conic-gradient stops
                        let cumulative = 0;
                        const stops = segments.map(s => {
                            const start = cumulative;
                            cumulative += s.pct;
                            return `${s.color} ${start}% ${cumulative}%`;
                        }).join(', ');

                        return (
                            <div className="flex flex-col sm:flex-row items-center gap-8 flex-1">
                                {/* Donut */}
                                <div className="relative w-44 h-44 shrink-0">
                                    <div
                                        className="w-full h-full rounded-full shadow-inner"
                                        style={{
                                            background: total > 1
                                                ? `conic-gradient(${stops})`
                                                : '#e5e7eb',
                                        }}
                                    />
                                    {/* Inner white circle (donut hole) */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[65%] bg-white rounded-full shadow-sm flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-gray-800 leading-none">{green + yellow + red}</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total</span>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="flex-1 space-y-3 w-full">
                                    {segments.map(s => (
                                        <div key={s.label} className={`flex items-center gap-3 p-3 rounded-xl ${s.bg} border ${s.border} transition-all hover:scale-[1.02]`}>
                                            <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-baseline justify-between mb-1">
                                                    <span className={`text-sm font-bold ${s.text}`}>{s.label}</span>
                                                    <span className="text-xs font-bold text-gray-500">{s.count} <span className="text-gray-400 font-medium">({s.pct.toFixed(0)}%)</span></span>
                                                </div>
                                                <div className={`w-full h-1.5 rounded-full ${s.barBg}`}>
                                                    <div className={`h-full rounded-full ${s.barFill} transition-all duration-700`} style={{ width: `${s.pct}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    <p className="text-center text-xs text-gray-400 mt-6">Distribución basada en Triage AI</p>
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
        </div>
    );
};
