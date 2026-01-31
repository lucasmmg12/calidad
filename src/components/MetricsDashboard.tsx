import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
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
    Loader2
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
        byUrgency: { Verdes: 0, Amarillos: 0, Rojos: 0 }
    });
    const [isExporting, setIsExporting] = useState(false);
    const [rawReports, setRawReports] = useState<any[]>([]);

    useEffect(() => {
        calculateMetrics();
    }, []);

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

        setRawReports(reports);

        const total = reports.length;
        const resolved = reports.filter(r => r.status === 'resolved');
        const pending = reports.filter(r => r.status !== 'resolved');
        const urgent = reports.filter(r => r.ai_urgency === 'Rojo');

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

        // By Sector
        const sectorMap: Record<string, number> = {};
        reports.forEach(r => {
            const s = r.sector || 'Otros';
            sectorMap[s] = (sectorMap[s] || 0) + 1;
        });
        const bySector = Object.entries(sectorMap)
            .map(([sector, count]) => ({ sector, count, percentage: (count / total) * 100 }))
            .sort((a, b) => b.count - a.count);

        // By Urgency
        const byUrgency = {
            Verdes: reports.filter(r => r.ai_urgency === 'Verde').length,
            Amarillos: reports.filter(r => r.ai_urgency === 'Amarillo').length,
            Rojos: reports.filter(r => r.ai_urgency === 'Rojo').length
        };

        setStats({
            total,
            resolved: resolved.length,
            pending: pending.length,
            urgentCount: urgent.length,
            avgResolutionTimeHours: Number(avgHours),
            bySector,
            byUrgency
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
                    <div className="space-y-4">
                        {stats.bySector.map((item, idx) => (
                            <div key={idx} className="group">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-medium text-gray-700">{item.sector}</span>
                                    <span className="text-xs font-bold text-gray-500">{item.count} ({Math.round(item.percentage)}%)</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-sanatorio-primary h-full rounded-full group-hover:bg-[#004270] transition-all duration-700 ease-out"
                                        style={{ width: `${item.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                        {stats.bySector.length === 0 && <p className="text-gray-400 text-sm">Sin datos aún.</p>}
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

            {/* AI Insights (Mock based on data) */}
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
