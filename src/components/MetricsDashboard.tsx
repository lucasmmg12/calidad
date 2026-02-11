import { useEffect, useState } from 'react';
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
    Tag
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import confetti from 'canvas-confetti';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

export const MetricsDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        resolved: 0,
        pending: 0,
        urgentCount: 0,
        avgResolutionTimeHours: 0,
        bySector: [] as { sector: string; count: number; percentage: number }[],
        byUrgency: { Verdes: 0, Amarillos: 0, Rojos: 0 },
        byStatus: { resolved: 0, pending: 0, waiting: 0, cancelled: 0 },
        byClassification: [] as { category: string; count: number; percentage: number }[]
    });
    const [isExporting, setIsExporting] = useState(false);
    const [rawReports, setRawReports] = useState<any[]>([]);
    const [expandedSector, setExpandedSector] = useState<string | null>(null);
    const [sectorFeedback, setSectorFeedback] = useState<Record<string, string>>({});
    const [loadingFeedback, setLoadingFeedback] = useState<string | null>(null);

    const { role, sectors } = useAuth();

    useEffect(() => {
        calculateMetrics();
    }, [role, sectors]);

    const calculateMetrics = async () => {
        setLoading(true);
        const { data: reports, error } = await supabase
            .from('reports')
            .select('*');

        if (error || !reports) {
            console.error('Error fetching metrics', error);
            setLoading(false);
            return;
        }

        // --- Role Based Filtering ---
        // Admin & Directivo: View All
        // Responsable: View only assigned sectors
        let filteredReports = reports;

        if (role === 'responsable') {
            // Normalize sectors for comparison (just in case)
            filteredReports = reports.filter(r =>
                r.sector && sectors.includes(r.sector)
            );
        }

        setRawReports(filteredReports);

        const total = filteredReports.length;
        const resolved = filteredReports.filter(r => r.status === 'resolved');
        const pending = filteredReports.filter(r => r.status !== 'resolved');
        const urgent = filteredReports.filter(r => r.ai_urgency === 'Rojo');

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
        const avgHours = resolvedCountWithDates > 0
            ? (totalTimeMs / resolvedCountWithDates / (1000 * 60 * 60)).toFixed(1)
            : 0;

        // By Sector — use filteredReports so responsable only sees their sectors
        const sectorMap: Record<string, number> = {};
        filteredReports.forEach(r => {
            const s = r.sector || 'Otros';
            sectorMap[s] = (sectorMap[s] || 0) + 1;
        });
        const bySector = Object.entries(sectorMap)
            .map(([sector, count]) => ({ sector, count, percentage: (count / total) * 100 }))
            .sort((a, b) => b.count - a.count);

        // By Urgency — use filteredReports
        const byUrgency = {
            Verdes: filteredReports.filter(r => r.ai_urgency === 'Verde').length,
            Amarillos: filteredReports.filter(r => r.ai_urgency === 'Amarillo').length,
            Rojos: filteredReports.filter(r => r.ai_urgency === 'Rojo').length
        };

        // By Status (Detailed) — use filteredReports
        // Mapping:
        // Resueltos -> resolved
        // Pendientes -> pending, analyzed
        // Esperando Solución -> pending_resolution, in_progress, quality_validation
        // Cancelados -> cancelled
        const byStatus = {
            resolved: filteredReports.filter(r => r.status === 'resolved').length,
            pending: filteredReports.filter(r => ['pending', 'analyzed'].includes(r.status)).length,
            waiting: filteredReports.filter(r => ['pending_resolution', 'in_progress', 'quality_validation'].includes(r.status)).length,
            cancelled: filteredReports.filter(r => r.status === 'cancelled').length
        };

        // By Classification (ai_category) — use filteredReports
        const classificationMap: Record<string, number> = {};
        filteredReports.forEach(r => {
            const cat = r.ai_category || 'Sin clasificar';
            classificationMap[cat] = (classificationMap[cat] || 0) + 1;
        });
        const byClassification = Object.entries(classificationMap)
            .map(([category, count]) => ({ category, count, percentage: total > 0 ? (count / total) * 100 : 0 }))
            .sort((a, b) => b.count - a.count);

        setStats({
            total,
            resolved: resolved.length,
            pending: pending.length,
            urgentCount: urgent.length,
            avgResolutionTimeHours: Number(avgHours),
            bySector,
            byUrgency,
            byStatus,
            byClassification
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
            // 1. Get AI Analysis and Logo
            const [{ data: aiAnalysis, error: aiError }, logoBase64] = await Promise.all([
                supabase.functions.invoke('generate-intelligence-report', {
                    body: {
                        reports: rawReports,
                        startDate: new Date(Math.min(...rawReports.map(r => new Date(r.created_at).getTime()))).toLocaleDateString(),
                        endDate: new Date().toLocaleDateString()
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
                    datasets: [{
                        data: stats.bySector.map(s => s.count),
                        backgroundColor: sectorColors,
                        borderWidth: 0
                    }]
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
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Análisis de Triage (Riesgo)', font: { size: 18, weight: 'bold' }, padding: 20 }
                    },
                    scales: {
                        y: { beginAtZero: true, border: { display: false }, grid: { display: true, color: '#f1f5f9' } },
                        x: { border: { display: false }, grid: { display: false } }
                    }
                }
            });

            // 3. Initialize PDF
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const primaryColor: [number, number, number] = [0, 84, 139]; // Sanatorio Blue
            const secondaryColor: [number, number, number] = [0, 169, 157]; // Sanatorio Green

            // --- PAGE 1: COVER & DESCRIPIVE ---
            // Header
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, pageWidth, 45, 'F');

            if (logoBase64) {
                doc.addImage(logoBase64, 'PNG', 15, 10, 25, 25);
            }

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text('INFORME DE INTELIGENCIA DE CALIDAD', logoBase64 ? 45 : 20, 25);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Periodo: ${new Date(Math.min(...rawReports.map(r => new Date(r.created_at).getTime()))).toLocaleDateString()} - ${new Date().toLocaleDateString()}`, logoBase64 ? 45 : 20, 32);
            doc.text(`Analytics Hub SA | ${new Date().toLocaleString()}`, logoBase64 ? 45 : 20, 37);

            // Descriptive Section
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text('1. ANÁLISIS DESCRIPTIVO', 20, 60);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(60, 60, 60);
            const descriptiveLines = doc.splitTextToSize(aiAnalysis.descriptive, pageWidth - 40);
            doc.text(descriptiveLines, 20, 70);

            // KPIs
            const kpiY = 70 + (descriptiveLines.length * 6) + 10;
            autoTable(doc, {
                startY: kpiY,
                head: [['Métrica de Performance', 'Valor']],
                body: [
                    ['Total Incidentes Registrados', stats.total.toString()],
                    ['Casos Gestionados con Éxito', stats.resolved.toString()],
                    ['Tasa de Resolución Institucional', `${Math.round((stats.resolved / stats.total) * 100)}%`],
                    ['Alertas de Riesgo Crítico', stats.urgentCount.toString()],
                    ['Tiempo de Respuesta Promedio', `${stats.avgResolutionTimeHours} hs`]
                ],
                theme: 'striped',
                headStyles: { fillColor: primaryColor, fontSize: 11 },
                styles: { fontSize: 10, cellPadding: 4 }
            });

            // Sector Chart
            if (sectorChartImg) {
                const chartImgY = (doc as any).lastAutoTable.finalY + 15;
                doc.addImage(sectorChartImg, 'PNG', 20, chartImgY, pageWidth - 40, 80);
            }

            // --- PAGE 2: DIAGNOSTIC & PREDICTIVE ---
            doc.addPage();

            // Urgency Chart
            if (urgencyChartImg) {
                doc.addImage(urgencyChartImg, 'PNG', 20, 20, pageWidth - 40, 80);
            }

            // Diagnostic Section
            const diagY = 115;
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text('2. ANÁLISIS DIAGNÓSTICO', 20, diagY);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(60, 60, 60);
            const diagnosticLines = doc.splitTextToSize(aiAnalysis.diagnostic, pageWidth - 40);
            doc.text(diagnosticLines, 20, diagY + 10);

            // Predictive Section
            const predictiveY = diagY + 10 + (diagnosticLines.length * 6) + 15;
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text('3. ANÁLISIS PREDICTIVO', 20, predictiveY);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(60, 60, 60);
            const predictiveLines = doc.splitTextToSize(aiAnalysis.predictive, pageWidth - 40);
            doc.text(predictiveLines, 20, predictiveY + 10);

            // --- PAGE 3: PRESCRIPTIVE ---
            doc.addPage();
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text('4. ANÁLISIS PRESCRIPTIVO', 20, 30);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(60, 60, 60);
            const prescriptiveLines = doc.splitTextToSize(aiAnalysis.prescriptive, pageWidth - 40);
            doc.text(prescriptiveLines, 20, 40);

            // List of Recent Critical Cases (Operational Annex)
            const annexY = 40 + (prescriptiveLines.length * 6) + 20;
            doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('ANEXO: CASOS CRÍTICOS DEL PERIODO', 20, annexY);

            autoTable(doc, {
                startY: annexY + 5,
                head: [['ID', 'Sector', 'Resumen AI', 'Estado']],
                body: rawReports
                    .filter(r => r.ai_urgency === 'Rojo')
                    .slice(0, 10)
                    .map(r => [r.tracking_id, r.sector, r.ai_summary || r.content.substring(0, 50), r.status === 'resolved' ? '✅ Resuelto' : '⏳ Pendiente']),
                theme: 'grid',
                headStyles: { fillColor: [239, 68, 68] },
                styles: { fontSize: 8 }
            });

            // Final Footer
            doc.setFontSize(8);
            doc.setTextColor(180, 180, 180);
            doc.text(`Sanatorio Argentino - Gestión de Calidad bajo Normas ISO 9001:2015. Documento Confidencial.`, pageWidth / 2, 285, { align: 'center' });

            // Save PDF
            doc.save(`Sanatorio_Argentino_Intelligence_Report_${new Date().toISOString().split('T')[0]}.pdf`);

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
                            Exportar Informe PDF
                        </>
                    )}
                </button>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Incidentes Críticos</p>
                    <p className="text-4xl font-black text-gray-800 mt-2">{stats.urgentCount}</p>
                    <p className="text-xs text-red-500 mt-2 font-medium">Requiren atención inmediata</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock className="w-24 h-24 text-purple-600" />
                    </div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Tiempo Promedio</p>
                    <p className="text-4xl font-black text-gray-800 mt-2">{stats.avgResolutionTimeHours}h</p>
                    <p className="text-xs text-gray-400 mt-2">Desde reporte hasta cierre</p>
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

                                            {/* Claims Table */}
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Casos Activos ({sectorActive.length})</h4>
                                                {sectorActive.length > 0 ? (
                                                    <div className="rounded-xl border border-gray-100 overflow-x-auto">
                                                        <table className="w-full text-xs min-w-[600px]">
                                                            <thead>
                                                                <tr className="bg-gray-50 text-gray-400 font-bold uppercase tracking-wider">
                                                                    <th className="px-3 py-2 text-left">ID</th>
                                                                    <th className="px-3 py-2 text-left">Fecha</th>
                                                                    <th className="px-3 py-2 text-left">Resumen</th>
                                                                    <th className="px-3 py-2 text-center">Estado</th>
                                                                    <th className="px-3 py-2 text-center">Urgencia</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-50">
                                                                {sectorActive.slice(0, 10).map((r: any) => (
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
                                                        {sectorActive.length > 10 && (
                                                            <p className="text-center text-[10px] text-gray-400 py-2">Mostrando 10 de {sectorActive.length} casos</p>
                                                        )}
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

                {/* Urgency Chart (Visual) */}
                <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        Gravedad de Incidentes
                    </h3>

                    <div className="flex-1 flex gap-4 items-end justify-center h-64 border-b border-gray-100 pb-0">
                        {/* Green Bar */}
                        <div className="flex flex-col items-center justify-end gap-2 w-20 h-full group">
                            <span className="text-green-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity mb-auto">{stats.byUrgency.Verdes}</span>
                            <div
                                className="w-full bg-green-100 rounded-t-xl relative overflow-hidden transition-all hover:bg-green-200"
                                style={{ height: `${stats.total ? (stats.byUrgency.Verdes / stats.total) * 100 : 0}%`, minHeight: '8px' }}
                            >
                                <div className="absolute bottom-0 w-full bg-green-500 h-1"></div>
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase mt-2">Leve</span>
                        </div>

                        {/* Yellow Bar */}
                        <div className="flex flex-col items-center justify-end gap-2 w-20 h-full group">
                            <span className="text-yellow-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity mb-auto">{stats.byUrgency.Amarillos}</span>
                            <div
                                className="w-full bg-yellow-100 rounded-t-xl relative overflow-hidden transition-all hover:bg-yellow-200"
                                style={{ height: `${stats.total ? (stats.byUrgency.Amarillos / stats.total) * 100 : 0}%`, minHeight: '8px' }}
                            >
                                <div className="absolute bottom-0 w-full bg-yellow-500 h-1"></div>
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase mt-2">Medio</span>
                        </div>

                        {/* Red Bar */}
                        <div className="flex flex-col items-center justify-end gap-2 w-20 h-full group">
                            <span className="text-red-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity mb-auto">{stats.byUrgency.Rojos}</span>
                            <div
                                className="w-full bg-red-100 rounded-t-xl relative overflow-hidden transition-all hover:bg-red-200"
                                style={{ height: `${stats.total ? (stats.byUrgency.Rojos / stats.total) * 100 : 0}%`, minHeight: '8px' }}
                            >
                                <div className="absolute bottom-0 w-full bg-red-500 h-1 animate-pulse"></div>
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase mt-2">Crítico</span>
                        </div>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-4">Distribución basada en Triage AI</p>
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

                            return (
                                <div key={item.category} className={`group rounded-xl p-3 transition-all hover:bg-slate-50 ${isUnclassified ? 'opacity-60' : ''}`}>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className={`text-sm font-medium ${isUnclassified ? 'text-gray-400 italic' : 'text-gray-700'}`}>
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
                            El tiempo promedio de resolución es de {stats.avgResolutionTimeHours} horas.
                            {stats.avgResolutionTimeHours > 24
                                ? ' Se recomienda mejorar los tiempos para casos urgentes.'
                                : ' El equipo está respondiendo dentro de los parámetros esperados.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
