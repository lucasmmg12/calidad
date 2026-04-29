import { useEffect, useState, useMemo, useCallback } from 'react';
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
    ChevronDown,
    Sparkles,
    Tag,
    ClipboardCheck,
    Star
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import confetti from 'canvas-confetti';
import { Chart, registerables } from 'chart.js';
import { AdvancedAnalytics } from './AdvancedAnalytics';
import { SlaAlertBanner } from './SlaAlerts';
import { PdcaPanel } from './PdcaPanel';
import { SectorFlowMetrics } from './SectorFlowMetrics';
import { MetricsFilters, type MetricsFilterState } from './MetricsFilters';

Chart.register(...registerables);

export const MetricsDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        resolved: 0,
        pending: 0,
        urgentCount: 0,
        avgResolutionTimeDays: 0,
        bySector: [] as { sector: string; count: number; percentage: number }[],
        byUrgency: { Verdes: 0, Amarillos: 0, Rojos: 0 },
        byStatus: { resolved: 0, pending: 0, waiting: 0, cancelled: 0 },
        byClassification: [] as { category: string; count: number; percentage: number }[],
        byAnonymity: { anonymous: 0, identified: 0 },
        felicitaciones: 0
    });
    const [isExporting, setIsExporting] = useState(false);
    const [rawReports, setRawReports] = useState<any[]>([]);
    const [roleFilteredReports, setRoleFilteredReports] = useState<any[]>([]);
    const [expandedSector, setExpandedSector] = useState<string | null>(null);
    const [expandedClassification, setExpandedClassification] = useState<string | null>(null);
    const [sectorFeedback, setSectorFeedback] = useState<Record<string, string>>({});
    const [loadingFeedback, setLoadingFeedback] = useState<string | null>(null);
    const [filters, setFilters] = useState<MetricsFilterState>({ sectors: [], dateFrom: '', dateTo: '' });

    const { role, sectors, profile, session } = useAuth();

    const canViewAll = role === 'admin' || role === 'directivo';

    // ─── Apply user filters (sectors[], dateFrom, dateTo) on top of role-filtered reports ───
    const applyUserFilters = useCallback((reports: any[]) => {
        let result = reports;

        // Multi-sector filter
        if (filters.sectors.length > 0) {
            result = result.filter(r => filters.sectors.includes(r.sector));
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
        // Responsable: View only assigned sectors
        let roleFiltered = reports;

        if (role === 'responsable') {
            roleFiltered = reports.filter(r =>
                r.sector && sectors.includes(r.sector)
            );
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
        const felicitaciones = filteredReports.filter(r => r.finding_type === 'Felicitación' || r.ai_category === 'Felicitación').length;
        const nonFelicitaciones = filteredReports.filter(r => r.finding_type !== 'Felicitación' && r.ai_category !== 'Felicitación');
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
            sectorMap[s] = (sectorMap[s] || 0) + 1;
        });
        const bySector = Object.entries(sectorMap)
            .map(([sector, count]) => ({ sector, count, percentage: total > 0 ? (count / total) * 100 : 0 }))
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
            const cat = r.ai_category || 'Sin clasificar';
            classificationMap[cat] = (classificationMap[cat] || 0) + 1;
        });
        const byClassification = Object.entries(classificationMap)
            .map(([category, count]) => ({ category, count, percentage: total > 0 ? (count / total) * 100 : 0 }))
            .sort((a, b) => b.count - a.count);

        // By Anonymity
        const anonymousCount = filteredReports.filter(r => r.is_anonymous === true).length;
        const identifiedCount = total - anonymousCount;
        const byAnonymity = { anonymous: anonymousCount, identified: identifiedCount };

        setStats({
            total,
            resolved: resolved.length,
            pending: pending.length,
            urgentCount: urgent.length,
            avgResolutionTimeDays: Number(avgDays),
            bySector,
            byUrgency,
            byStatus,
            byClassification,
            byAnonymity,
            felicitaciones
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

    const loadImageAsBase64 = (url: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve('');
            img.src = url;
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

            // 1. Get AI Analysis and Logo
            const [{ data: aiAnalysis, error: aiError }, logoBase64] = await Promise.all([
                supabase.functions.invoke('generate-intelligence-report', {
                    body: {
                        reports: rawReports,
                        startDate: new Date(Math.min(...rawReports.map(r => new Date(r.created_at).getTime()))).toLocaleDateString(),
                        endDate: new Date().toLocaleDateString(),
                        roleContext: roleContextMap[userRole] || roleContextMap.admin
                    }
                }),
                loadImageAsBase64('/logosanatorio.png')
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
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const primaryColor: [number, number, number] = [0, 84, 139];
            const secondaryColor: [number, number, number] = [0, 169, 157];

            // ─── HELPER: Add footer to every page ───
            const addFooter = (pageNum: number, totalPages: number) => {
                doc.setFontSize(7);
                doc.setTextColor(180, 180, 180);
                doc.text(`Sanatorio Argentino - Gestión de Calidad bajo Normas ISO 9001:2015 | Documento Confidencial`, 20, pageHeight - 8);
                doc.text(`Pág. ${pageNum} / ${totalPages}`, pageWidth - 20, pageHeight - 8, { align: 'right' });
            };

            // ─── HELPER: Cover page ───
            const buildCover = (title: string, subtitle: string, roleBadge: string, badgeColor: [number, number, number]) => {
                // Full-width header band
                doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                doc.rect(0, 0, pageWidth, 60, 'F');

                // Accent bar
                doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
                doc.rect(0, 60, pageWidth, 3, 'F');

                if (logoBase64) {
                    doc.addImage(logoBase64, 'PNG', 15, 12, 30, 30);
                }

                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(22);
                doc.text(title, logoBase64 ? 52 : 20, 28);

                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                doc.text(subtitle, logoBase64 ? 52 : 20, 38);

                const periodStart = new Date(Math.min(...rawReports.map(r => new Date(r.created_at).getTime()))).toLocaleDateString();
                doc.text(`Periodo: ${periodStart} - ${new Date().toLocaleDateString()}`, logoBase64 ? 52 : 20, 48);

                // Role badge
                doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
                doc.roundedRect(pageWidth - 65, 70, 50, 12, 3, 3, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.text(roleBadge, pageWidth - 40, 78, { align: 'center' });

                // User info
                doc.setTextColor(80, 80, 80);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.text(`Generado por: ${userName}`, 20, 78);
                doc.text(`Fecha: ${new Date().toLocaleString()}`, 20, 85);

                if (userRole === 'responsable' && userSectors.length > 0) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                    doc.text(`Sectores Asignados: ${userSectors.join(', ')}`, 20, 95);
                }
            };

            // ─── HELPER: Section title  ───
            const sectionTitle = (text: string, y: number, num?: number) => {
                doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(16);
                doc.text(num ? `${num}. ${text}` : text, 20, y);
                // underline
                doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
                doc.setLineWidth(0.8);
                doc.line(20, y + 2, 100, y + 2);
            };

            // ─── HELPER: AI text block ───
            const aiTextBlock = (text: string, y: number) => {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(50, 50, 50);
                const lines = doc.splitTextToSize(text || 'Análisis no disponible.', pageWidth - 40);
                doc.text(lines, 20, y);
                return y + (lines.length * 5);
            };

            // ════════════════════════════════════════════
            //  ADMIN REPORT — Full Institutional Intelligence
            // ════════════════════════════════════════════
            if (userRole === 'admin') {
                // PAGE 1: COVER + KPIs
                buildCover('INFORME DE INTELIGENCIA INSTITUCIONAL', 'Análisis integral de Gestión de Calidad', 'ADMINISTRADOR', [106, 27, 154]);

                sectionTitle('RESUMEN EJECUTIVO', 110, 1);

                autoTable(doc, {
                    startY: 118,
                    head: [['Métrica', 'Valor', 'Indicador']],
                    body: [
                        ['Total Hallazgos', stats.total.toString(), '📊'],
                        ['Casos Resueltos', stats.resolved.toString(), '✅'],
                        ['Tasa de Resolución', `${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%`, stats.total > 0 && (stats.resolved / stats.total) >= 0.7 ? '🟢' : '🟡'],
                        ['Alertas Críticas (Rojo)', stats.urgentCount.toString(), stats.urgentCount > 0 ? '🔴' : '🟢'],
                        ['Tiempo Promedio Resolución', `${stats.avgResolutionTimeDays} días`, Number(stats.avgResolutionTimeDays) <= 2 ? '🟢' : '🟡'],
                        ['Casos Pendientes', stats.pending.toString(), stats.pending > 5 ? '🟡' : '🟢'],
                    ],
                    theme: 'striped',
                    headStyles: { fillColor: primaryColor, fontSize: 10, fontStyle: 'bold' },
                    styles: { fontSize: 9, cellPadding: 4 },
                    columnStyles: { 2: { halign: 'center' } }
                });

                // Sector chart on page 1
                if (sectorChartImg) {
                    const chartY = (doc as any).lastAutoTable.finalY + 10;
                    doc.addImage(sectorChartImg, 'PNG', 20, chartY, pageWidth - 40, 75);
                }

                // PAGE 2: ANALYSIS
                doc.addPage();
                if (urgencyChartImg) doc.addImage(urgencyChartImg, 'PNG', 20, 15, pageWidth - 40, 75);

                sectionTitle('ANÁLISIS DESCRIPTIVO', 105, 2);
                let nextY = aiTextBlock(aiAnalysis.descriptive, 115);

                nextY = Math.max(nextY + 10, 180);
                sectionTitle('ANÁLISIS DIAGNÓSTICO', nextY, 3);
                aiTextBlock(aiAnalysis.diagnostic, nextY + 10);

                // PAGE 3: PREDICTIVE + PRESCRIPTIVE
                doc.addPage();
                sectionTitle('ANÁLISIS PREDICTIVO', 25, 4);
                let presY = aiTextBlock(aiAnalysis.predictive, 35);

                presY = Math.max(presY + 10, 120);
                sectionTitle('ANÁLISIS PRESCRIPTIVO', presY, 5);
                aiTextBlock(aiAnalysis.prescriptive, presY + 10);

                // PAGE 4: CLASSIFICATION + PERSONNEL
                doc.addPage();
                if (classificationChartImg) {
                    doc.addImage(classificationChartImg, 'PNG', 20, 15, pageWidth - 40, 75);
                }

                sectionTitle('PERSONAL Y GESTIÓN', classificationChartImg ? 105 : 25, 6);

                // Fetch all user profiles for admin report
                const { data: allProfiles } = await supabase.from('user_profiles').select('display_name, role, assigned_sectors');
                if (allProfiles && allProfiles.length > 0) {
                    autoTable(doc, {
                        startY: classificationChartImg ? 115 : 35,
                        head: [['Nombre', 'Rol', 'Sectores Asignados']],
                        body: allProfiles.map(p => [
                            p.display_name || 'Sin nombre',
                            p.role === 'admin' ? 'Administrador' : p.role === 'directivo' ? 'Directivo' : 'Responsable',
                            (p.assigned_sectors || []).join(', ') || '-'
                        ]),
                        theme: 'striped',
                        headStyles: { fillColor: secondaryColor, fontSize: 9 },
                        styles: { fontSize: 8, cellPadding: 3 }
                    });
                }

                // PAGE 5: CRITICAL CASES ANNEX
                doc.addPage();
                sectionTitle('ANEXO: CASOS CRÍTICOS', 25);

                const criticalCases = rawReports.filter(r => r.ai_urgency === 'Rojo').slice(0, 15);
                if (criticalCases.length > 0) {
                    autoTable(doc, {
                        startY: 35,
                        head: [['ID', 'Sector', 'Clasificación', 'Resumen', 'Estado']],
                        body: criticalCases.map(r => [
                            r.tracking_id,
                            r.sector || '-',
                            r.ai_category || '-',
                            (r.ai_summary || r.content || '').substring(0, 60),
                            r.status === 'resolved' ? '✅ Resuelto' : r.status === 'cancelled' ? '❌ Cancelado' : '⏳ Pendiente'
                        ]),
                        theme: 'grid',
                        headStyles: { fillColor: [239, 68, 68], fontSize: 8 },
                        styles: { fontSize: 7, cellPadding: 3 }
                    });
                } else {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(10);
                    doc.setTextColor(100, 100, 100);
                    doc.text('No se registraron casos críticos en el periodo analizado.', 20, 40);
                }

                // ════════════════════════════════════════════
                //  RESPONSABLE REPORT — Sectoral Management
                // ════════════════════════════════════════════
            } else if (userRole === 'responsable') {
                // PAGE 1: COVER
                buildCover('INFORME DE GESTIÓN SECTORIAL', `Responsable: ${userName}`, 'RESPONSABLE', [22, 163, 74]);

                sectionTitle('MIS INDICADORES', 110, 1);

                autoTable(doc, {
                    startY: 118,
                    head: [['Métrica de Mi Gestión', 'Valor']],
                    body: [
                        ['Total Casos en Mis Sectores', stats.total.toString()],
                        ['Casos Resueltos', stats.resolved.toString()],
                        ['Tasa de Resolución', `${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%`],
                        ['Casos Pendientes de Resolución', stats.pending.toString()],
                        ['Alertas Críticas', stats.urgentCount.toString()],
                        ['Tiempo Promedio de Respuesta', `${stats.avgResolutionTimeDays} días`],
                        ['Sectores Asignados', userSectors.join(', ') || 'Ninguno'],
                    ],
                    theme: 'striped',
                    headStyles: { fillColor: [22, 163, 74], fontSize: 10 },
                    styles: { fontSize: 9, cellPadding: 4 }
                });

                // PAGE 2: CHARTS
                doc.addPage();
                if (sectorChartImg) doc.addImage(sectorChartImg, 'PNG', 20, 15, pageWidth - 40, 75);
                if (urgencyChartImg) doc.addImage(urgencyChartImg, 'PNG', 20, 105, pageWidth - 40, 75);

                // PAGE 3: MY CASES TABLE
                doc.addPage();
                sectionTitle('MIS CASOS DETALLADOS', 25, 2);

                autoTable(doc, {
                    startY: 35,
                    head: [['Ticket', 'Sector', 'Clasificación', 'Urgencia', 'Estado', 'Fecha']],
                    body: rawReports.slice(0, 30).map(r => [
                        r.tracking_id,
                        r.sector || '-',
                        r.ai_category || '-',
                        r.ai_urgency || '-',
                        r.status === 'resolved' ? 'Resuelto' : r.status === 'cancelled' ? 'Cancelado' : r.status === 'pending_resolution' ? 'Pendiente Resolución' : r.status === 'quality_validation' ? 'Validación Calidad' : 'Pendiente',
                        new Date(r.created_at).toLocaleDateString()
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: primaryColor, fontSize: 8 },
                    styles: { fontSize: 7, cellPadding: 3 }
                });

                // PAGE 4: AI ANALYSIS (Focused)
                doc.addPage();
                sectionTitle('ANÁLISIS DE MI GESTIÓN', 25, 3);
                let rNextY = aiTextBlock(aiAnalysis.descriptive, 35);

                rNextY = Math.max(rNextY + 10, 100);
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
                buildCover('EXECUTIVE INTELLIGENCE BRIEF', 'Resumen Estratégico de Gestión de Calidad', 'DIRECCIÓN', [0, 84, 139]);

                // Big KPI blocks
                const kpiStartY = 105;
                const kpiBoxW = (pageWidth - 50) / 2;
                const kpiBoxH = 35;

                const kpis = [
                    { label: 'TOTAL HALLAZGOS', value: stats.total.toString(), color: primaryColor },
                    { label: 'TASA DE RESOLUCIÓN', value: `${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%`, color: secondaryColor },
                    { label: 'ALERTAS CRÍTICAS', value: stats.urgentCount.toString(), color: [239, 68, 68] as [number, number, number] },
                    { label: 'TIEMPO PROMEDIO', value: `${stats.avgResolutionTimeDays}d`, color: [99, 102, 241] as [number, number, number] },
                ];

                kpis.forEach((kpi, i) => {
                    const col = i % 2;
                    const row = Math.floor(i / 2);
                    const x = 20 + col * (kpiBoxW + 10);
                    const y = kpiStartY + row * (kpiBoxH + 8);

                    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
                    doc.roundedRect(x, y, kpiBoxW, kpiBoxH, 4, 4, 'F');

                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.text(kpi.label, x + 10, y + 12);

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(24);
                    doc.text(kpi.value, x + 10, y + 28);
                });

                // PAGE 2: STRATEGIC ANALYSIS
                doc.addPage();
                sectionTitle('VISIÓN ESTRATÉGICA', 25, 1);
                let dNextY = aiTextBlock(aiAnalysis.descriptive, 35);

                dNextY = Math.max(dNextY + 10, 120);
                sectionTitle('DIAGNÓSTICO INSTITUCIONAL', dNextY, 2);
                aiTextBlock(aiAnalysis.diagnostic, dNextY + 10);

                // PAGE 3: CHARTS
                doc.addPage();
                sectionTitle('INDICADORES VISUALES', 25, 3);
                if (sectorChartImg) doc.addImage(sectorChartImg, 'PNG', 20, 35, pageWidth - 40, 75);
                if (urgencyChartImg) doc.addImage(urgencyChartImg, 'PNG', 20, 120, pageWidth - 40, 75);

                // PAGE 4: CLASSIFICATION + STATUS
                doc.addPage();
                if (classificationChartImg) {
                    doc.addImage(classificationChartImg, 'PNG', 20, 15, pageWidth - 40, 75);
                }

                sectionTitle('ESTADO DE GESTIÓN', classificationChartImg ? 105 : 25, 4);
                autoTable(doc, {
                    startY: classificationChartImg ? 115 : 35,
                    head: [['Estado', 'Cantidad', 'Porcentaje']],
                    body: [
                        ['Resueltos', stats.byStatus.resolved.toString(), `${stats.total > 0 ? Math.round((stats.byStatus.resolved / stats.total) * 100) : 0}%`],
                        ['Pendientes', stats.byStatus.pending.toString(), `${stats.total > 0 ? Math.round((stats.byStatus.pending / stats.total) * 100) : 0}%`],
                        ['En Proceso', stats.byStatus.waiting.toString(), `${stats.total > 0 ? Math.round((stats.byStatus.waiting / stats.total) * 100) : 0}%`],
                        ['Cancelados', stats.byStatus.cancelled.toString(), `${stats.total > 0 ? Math.round((stats.byStatus.cancelled / stats.total) * 100) : 0}%`],
                    ],
                    theme: 'striped',
                    headStyles: { fillColor: primaryColor, fontSize: 10 },
                    styles: { fontSize: 9, cellPadding: 5 }
                });

                // PAGE 5: STRATEGIC RECOMMENDATIONS
                doc.addPage();
                sectionTitle('PROYECCIÓN Y TENDENCIAS', 25, 5);
                let stratY = aiTextBlock(aiAnalysis.predictive, 35);

                stratY = Math.max(stratY + 10, 120);
                sectionTitle('RECOMENDACIONES ESTRATÉGICAS', stratY, 6);
                aiTextBlock(aiAnalysis.prescriptive, stratY + 10);
            }

            // Add page numbers to all pages
            const totalPages = doc.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                addFooter(i, totalPages);
            }

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <BarChart3 className="w-24 h-24 text-blue-600" />
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Reportes</p>
                    <p className="text-4xl font-black text-gray-800 mt-2">{stats.total}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs text-green-600 font-medium">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>100% Data Actual</span>
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

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
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

                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-2xl shadow-sm border border-amber-200 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Star className="w-24 h-24 text-amber-400" />
                    </div>
                    <p className="text-amber-600 text-xs font-bold uppercase tracking-wider">Felicitaciones</p>
                    <p className="text-4xl font-black text-amber-600 mt-2">{stats.felicitaciones}</p>
                    <p className="text-xs text-amber-500 mt-2 font-medium">Reconocimientos positivos 🎉</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sector Breakwodn Chart */}
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-sanatorio-secondary" />
                        Distribución por Sector
                    </h3>
                    <div className="space-y-2">
                        {stats.bySector.map((item, idx) => {
                            const isExpanded = expandedSector === item.sector;
                            const sectorReports = rawReports.filter(r => (r.sector || 'Otros') === item.sector);
                            const sectorActive = sectorReports.filter(r => r.status !== 'resolved' && r.status !== 'discarded');
                            const sectorResolved = sectorReports.filter(r => r.status === 'resolved');
                            const sectorPending = sectorReports.filter(r => ['pending', 'analyzed'].includes(r.status));
                            const sectorInProgress = sectorReports.filter(r => ['pending_resolution', 'in_progress', 'quality_validation'].includes(r.status));

                            // Avg resolution time for this sector
                            let sectorTotalTimeMs = 0;
                            let sectorResolvedWithDates = 0;
                            sectorResolved.forEach(r => {
                                if (r.resolved_at && r.created_at) {
                                    sectorTotalTimeMs += new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime();
                                    sectorResolvedWithDates++;
                                }
                            });
                            const sectorAvgHours = sectorResolvedWithDates > 0
                                ? (sectorTotalTimeMs / sectorResolvedWithDates / (1000 * 60 * 60)).toFixed(1)
                                : 0;

                            return (
                                <div key={idx} className="rounded-xl border border-gray-100 overflow-hidden transition-all duration-300">
                                    {/* Sector Bar - Clickable */}
                                    <button
                                        onClick={() => setExpandedSector(isExpanded ? null : item.sector)}
                                        className={`w-full p-4 flex items-center gap-4 transition-all duration-200 hover:bg-blue-50/50 ${isExpanded ? 'bg-blue-50/70 border-b border-blue-100' : 'bg-white'
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex justify-between items-end mb-1.5">
                                                <span className="text-sm font-medium text-gray-700">{item.sector}</span>
                                                <span className="text-xs font-bold text-gray-500">{item.count} ({Math.round(item.percentage)}%)</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ease-out ${isExpanded ? 'bg-sanatorio-primary' : 'bg-sanatorio-primary/70'
                                                        }`}
                                                    style={{ width: `${item.percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        </div>
                                    </button>

                                    {/* Expanded Drill-Down Panel */}
                                    {isExpanded && (
                                        <div className="p-5 bg-gradient-to-b from-blue-50/30 to-white animate-in slide-in-from-top-2 duration-300 space-y-5">

                                            {/* Local Metrics Row */}
                                            <div className="grid grid-cols-4 gap-3">
                                                <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                                                    <p className="text-2xl font-black text-gray-800">{sectorReports.length}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
                                                </div>
                                                <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
                                                    <p className="text-2xl font-black text-green-700">{sectorResolved.length}</p>
                                                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Resueltos</p>
                                                </div>
                                                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                                                    <p className="text-2xl font-black text-orange-700">{sectorPending.length + sectorInProgress.length}</p>
                                                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Pendientes</p>
                                                </div>
                                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                                                    <p className="text-2xl font-black text-blue-700">{sectorAvgHours}h</p>
                                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Tiempo Prom.</p>
                                                </div>
                                            </div>

                                            {/* Status Bar */}
                                            {sectorReports.length > 0 && (
                                                <div className="flex w-full h-2.5 rounded-full overflow-hidden">
                                                    <div style={{ width: `${(sectorResolved.length / sectorReports.length) * 100}%` }} className="h-full bg-green-500" title="Resueltos"></div>
                                                    <div style={{ width: `${(sectorPending.length / sectorReports.length) * 100}%` }} className="h-full bg-blue-500" title="Pendientes"></div>
                                                    <div style={{ width: `${(sectorInProgress.length / sectorReports.length) * 100}%` }} className="h-full bg-orange-500" title="En Proceso"></div>
                                                </div>
                                            )}

                                            {/* Gravity Breakdown per Sector */}
                                            {sectorReports.length > 0 && (() => {
                                                const sGreen = sectorReports.filter(r => r.ai_urgency === 'Verde').length;
                                                const sYellow = sectorReports.filter(r => r.ai_urgency === 'Amarillo').length;
                                                const sRed = sectorReports.filter(r => r.ai_urgency === 'Rojo').length;
                                                const sTotal = sectorReports.length;
                                                const pGreen = (sGreen / sTotal) * 100;
                                                const pYellow = (sYellow / sTotal) * 100;
                                                const pRed = (sRed / sTotal) * 100;

                                                return (
                                                    <div className="bg-white rounded-xl border border-gray-100 p-3.5">
                                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Gravedad del Sector</h4>

                                                        {/* Segmented Bar */}
                                                        <div className="flex w-full h-3 rounded-full overflow-hidden mb-3">
                                                            {sGreen > 0 && (
                                                                <div
                                                                    style={{ width: `${pGreen}%` }}
                                                                    className="h-full bg-green-500 transition-all duration-700"
                                                                    title={`Leve: ${sGreen}`}
                                                                />
                                                            )}
                                                            {sYellow > 0 && (
                                                                <div
                                                                    style={{ width: `${pYellow}%` }}
                                                                    className="h-full bg-yellow-400 transition-all duration-700"
                                                                    title={`Medio: ${sYellow}`}
                                                                />
                                                            )}
                                                            {sRed > 0 && (
                                                                <div
                                                                    style={{ width: `${pRed}%` }}
                                                                    className="h-full bg-red-500 transition-all duration-700"
                                                                    title={`Crítico: ${sRed}`}
                                                                />
                                                            )}
                                                        </div>

                                                        {/* Legend */}
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                                                <span className="text-[10px] font-bold text-gray-600">Leve</span>
                                                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">{sGreen}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                                                <span className="text-[10px] font-bold text-gray-600">Medio</span>
                                                                <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full">{sYellow}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                                                <span className="text-[10px] font-bold text-gray-600">Crítico</span>
                                                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">{sRed}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Claims Table */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Casos Activos ({sectorActive.length})</h4>
                                                {sectorActive.length > 0 ? (
                                                    <div className="rounded-xl border border-gray-100 overflow-x-auto max-h-[400px] overflow-y-auto">
                                                        <table className="w-full text-xs min-w-[600px]">
                                                            <thead className="sticky top-0 z-10">
                                                                <tr className="bg-gray-50 text-gray-400 font-bold uppercase tracking-wider">
                                                                    <th className="px-3 py-2 text-left">ID</th>
                                                                    <th className="px-3 py-2 text-left">Fecha</th>
                                                                    <th className="px-3 py-2 text-left">Resumen</th>
                                                                    <th className="px-3 py-2 text-center">Estado</th>
                                                                    <th className="px-3 py-2 text-center">Urgencia</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-50">
                                                                {sectorActive.map((r: any) => (
                                                                    <tr key={r.id} className="hover:bg-blue-50/40 transition-colors">
                                                                        <td className="px-3 py-2 font-bold text-sanatorio-primary">{r.tracking_id}</td>
                                                                        <td className="px-3 py-2 text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                                                                        <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{r.ai_summary || r.content?.substring(0, 50)}</td>
                                                                        <td className="px-3 py-2 text-center">
                                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'pending' || r.status === 'analyzed' ? 'bg-orange-100 text-orange-700' :
                                                                                r.status === 'pending_resolution' ? 'bg-blue-100 text-blue-700' :
                                                                                    r.status === 'quality_validation' ? 'bg-purple-100 text-purple-700' :
                                                                                        r.status === 'assignment_rejected' ? 'bg-red-100 text-red-700' :
                                                                                            'bg-gray-100 text-gray-600'
                                                                                }`}>
                                                                                {r.status === 'pending' || r.status === 'analyzed' ? 'Pendiente' :
                                                                                    r.status === 'pending_resolution' ? 'En Gestión' :
                                                                                        r.status === 'quality_validation' ? 'Validación' :
                                                                                            r.status === 'assignment_rejected' ? 'Rechazado' :
                                                                                                r.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-3 py-2 text-center">
                                                                            <span className={`inline-block w-3 h-3 rounded-full ${r.ai_urgency === 'Rojo' ? 'bg-red-500' : r.ai_urgency === 'Amarillo' ? 'bg-yellow-400' : 'bg-green-500'
                                                                                }`}></span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 text-center">
                                                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                                                        <p className="text-xs text-green-700 font-medium">Sin casos activos en este sector</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* AI Feedback Module */}
                                            <div className="bg-gradient-to-r from-[#002b4d] to-[#004270] rounded-xl p-4 text-white relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                                <div className="relative z-10">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-[#00D1FF]">
                                                            <Sparkles className="w-4 h-4" />
                                                            Feedback Inteligente
                                                        </h4>
                                                        <button
                                                            onClick={async () => {
                                                                setLoadingFeedback(item.sector);
                                                                try {
                                                                    const recentReports = sectorReports
                                                                        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                                        .slice(0, 20)
                                                                        .map((r: any) => ({
                                                                            content: r.content?.substring(0, 200),
                                                                            ai_summary: r.ai_summary,
                                                                            status: r.status,
                                                                            ai_category: r.ai_category
                                                                        }));

                                                                    const { data, error } = await supabase.functions.invoke('generate-sector-feedback', {
                                                                        body: { sector: item.sector, reports: recentReports }
                                                                    });

                                                                    if (error) throw error;
                                                                    setSectorFeedback(prev => ({ ...prev, [item.sector]: data.feedback }));
                                                                } catch (err) {
                                                                    console.error('Sector feedback error:', err);
                                                                    setSectorFeedback(prev => ({ ...prev, [item.sector]: 'No se pudo generar el insight. Intente nuevamente.' }));
                                                                } finally {
                                                                    setLoadingFeedback(null);
                                                                }
                                                            }}
                                                            disabled={loadingFeedback === item.sector}
                                                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5"
                                                        >
                                                            {loadingFeedback === item.sector ? (
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <BrainCircuit className="w-3 h-3" />
                                                            )}
                                                            {sectorFeedback[item.sector] ? 'Regenerar' : 'Generar Insight'}
                                                        </button>
                                                    </div>

                                                    {sectorFeedback[item.sector] ? (
                                                        <p className="text-sm text-gray-100 leading-relaxed italic">
                                                            "{sectorFeedback[item.sector]}"
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-gray-300/60">
                                                            Haz click en "Generar Insight" para obtener un análisis AI de los patrones de este sector.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {stats.bySector.length === 0 && <p className="text-gray-400 text-sm p-4">Sin datos aún.</p>}
                    </div>
                </div>

                {/* Urgency Donut Chart */}
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        Gravedad de Hallazgos
                    </h3>

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
                    <div className="space-y-3">
                        {stats.byClassification.map((item, idx) => {
                            const classificationColors = [
                                'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
                                'bg-pink-500', 'bg-rose-500', 'bg-sky-500', 'bg-cyan-500',
                                'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-500',
                                'bg-red-500', 'bg-blue-500', 'bg-lime-500', 'bg-slate-400'
                            ];
                            const barColor = classificationColors[idx % classificationColors.length];
                            const isUnclassified = item.category === 'Sin clasificar';
                            const isExpanded = expandedClassification === item.category;
                            const associatedReports = rawReports.filter(r => (r.ai_category || 'Sin clasificar') === item.category);

                            return (
                                <div key={item.category} className={`rounded-xl transition-all ${isUnclassified ? 'opacity-60' : ''}`}>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedClassification(isExpanded ? null : item.category)}
                                        className={`w-full group rounded-xl p-3 transition-all text-left cursor-pointer ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className={`text-sm font-medium flex items-center gap-1.5 ${isUnclassified ? 'text-gray-400 italic' : 'text-gray-700'}`}>
                                                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                {item.category}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-500">{item.count}</span>
                                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                                    {Math.round(item.percentage)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ease-out ${barColor} group-hover:opacity-90`}
                                                style={{ width: `${item.percentage}%` }}
                                            ></div>
                                        </div>
                                    </button>

                                    {/* Expanded: list of associated reports */}
                                    {isExpanded && associatedReports.length > 0 && (
                                        <div className="mt-1 ml-4 mr-1 mb-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                            {associatedReports.map((report: any) => {
                                                const urgencyColor = report.ai_urgency === 'Rojo' ? 'bg-red-500' : report.ai_urgency === 'Amarillo' ? 'bg-amber-400' : 'bg-green-500';
                                                const statusLabel: Record<string, string> = {
                                                    pending: 'Pendiente', analyzed: 'Analizado', pending_resolution: 'En resolución',
                                                    in_progress: 'En progreso', quality_validation: 'Validación', resolved: 'Resuelto',
                                                    cancelled: 'Cancelado', multi_sector_pending: 'Multi-sector'
                                                };
                                                return (
                                                    <div
                                                        key={report.id}
                                                        className="flex items-center gap-3 p-2.5 bg-white border border-gray-100 rounded-lg hover:shadow-sm transition-all group/item"
                                                    >
                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${urgencyColor}`}></div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className="text-xs font-bold text-gray-700 font-mono">
                                                                    {report.tracking_id || '—'}
                                                                </span>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                                                                    {statusLabel[report.status] || report.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-gray-500 truncate">
                                                                {report.ai_summary || report.content?.substring(0, 80) || 'Sin descripción'}
                                                            </p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-[10px] text-gray-400 font-medium">
                                                                {report.sector || '—'}
                                                            </p>
                                                            <p className="text-[10px] text-gray-300">
                                                                {report.created_at ? new Date(report.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-400">
                        <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No hay datos de clasificación disponibles.</p>
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

            {/* ── Reportes Emitidos por Sector ── */}
            <SectorFlowMetrics reports={rawReports} />

            {/* ── Alertas de Tiempo de Respuesta ── */}
            <SlaAlertBanner
                reports={rawReports}
                onResendWhatsApp={async (report) => {
                    if (!report.assigned_to) return;
                    const botNumber = `549${report.assigned_to}`;
                    const resolutionLink = `${window.location.origin}/resolver-caso/${report.tracking_id}`;
                    const message = `⏰ *Recordatorio de Tiempo de Respuesta - Calidad*\n\nEl caso *${report.tracking_id}* del sector *${report.sector}* requiere su atención urgente.\n\n📝 "${(report.ai_summary || report.content || '').substring(0, 150)}"\n\n👉 *Gestione el caso aquí:* ${resolutionLink}\n\n⚠️ Este caso ha superado el tiempo de respuesta esperado.`;
                    await supabase.functions.invoke('send-whatsapp', {
                        body: {
                            number: botNumber,
                            message,
                            mediaUrl: "https://i.imgur.com/JGQlbiJ.jpeg"
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
