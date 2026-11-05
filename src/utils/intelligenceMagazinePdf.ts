/**
 * Revista de Inteligencia Clínica y Gestión de Calidad (PDF Editorial Engine)
 * Sanatorio Argentino — Departamento de Gestión de Calidad · Innovación y Transformación Digital
 *
 * Diseña el Informe Institucional / Sectorial / Executive Brief con estética de
 * revista ejecutiva del sector salud: explicaciones pedagógicas por cada métrica,
 * gráficos de línea y barras de alta definición con etiquetas de datos directas,
 * barras de progreso vectoriales en tablas y bloques editoriales de IA.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart } from 'chart.js';
import {
    PDF_COLORS,
    loadLogoImage,
    drawLogoBadge,
    sanitizePdfText,
    cleanMarkdownForPdf,
    applyInstitutionalFooters,
} from './pdfTheme';
import { SECTOR_OPTIONS } from '../constants/sectors';

export interface MagazineStats {
    total: number;
    totalReceived: number;
    totalEmitted: number;
    resolved: number;
    pending: number;
    urgentCount: number;
    avgResolutionTimeDays: number;
    bySector: { sector: string; count: number; percentage: number }[];
    byReporterSector: { sector: string; count: number; percentage: number }[];
    byUrgency: { Verdes: number; Amarillos: number; Rojos: number };
    byStatus: { resolved: number; pending: number; waiting: number; cancelled: number };
    byClassification: { category: string; count: number; percentage: number }[];
    byFindingType: { type: string; count: number; percentage: number }[];
    byAnonymity: { anonymous: number; identified: number };
    felicitaciones: number;
    nonConforming: number;
}

export interface MagazineReportParams {
    rawReports: any[];
    stats: MagazineStats;
    aiAnalysis: {
        descriptive?: string;
        diagnostic?: string;
        predictive?: string;
        prescriptive?: string;
    };
    userName: string;
    userRole: string;
    userSectors: string[];
}

const getSectorLabel = (codeOrName: string): string => {
    const found = SECTOR_OPTIONS.find((s) => s.value === codeOrName || s.label === codeOrName);
    return found ? found.label.replace(/^[^\wÁÉÍÓÚÑáéíóúñ]+/, '').trim() : codeOrName;
};

/**
 * Renders a high-resolution Chart.js Line or Bar chart onto a crisp white canvas
 * with direct data labels drawn on every bar/point so the PDF reader never has to guess values.
 */
const renderEditorialChart = (
    config: any,
    width = 1100,
    height = 480
): Promise<string> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.visibility = 'hidden';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            document.body.removeChild(canvas);
            return resolve('');
        }

        // Inline plugin for white background + direct value labels on bars/points
        const editorialPlugin = {
            id: 'editorialMagazinePlugin',
            beforeDraw: (chart: any) => {
                const c = chart.ctx;
                c.save();
                c.fillStyle = '#FFFFFF';
                c.fillRect(0, 0, chart.width, chart.height);
                c.restore();
            },
            afterDatasetsDraw: (chart: any) => {
                const c = chart.ctx;
                c.save();
                const isHorizontal = chart.config.options?.indexAxis === 'y';

                chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    if (meta.hidden) return;

                    meta.data.forEach((element: any, index: number) => {
                        const val = dataset.data[index];
                        if (val === null || val === undefined || val === 0) return;

                        c.font = 'bold 13px Inter, Helvetica, Arial, sans-serif';
                        c.fillStyle = dataset.datalabelColor || '#1E293B';

                        if (chart.config.type === 'bar') {
                            if (isHorizontal) {
                                c.textAlign = 'left';
                                c.textBaseline = 'middle';
                                const suffix = dataset.unitSuffix || '';
                                c.fillText(`${val}${suffix}`, element.x + 8, element.y);
                            } else {
                                c.textAlign = 'center';
                                c.textBaseline = 'bottom';
                                const suffix = dataset.unitSuffix || '';
                                c.fillText(`${val}${suffix}`, element.x, element.y - 6);
                            }
                        } else if (chart.config.type === 'line') {
                            c.textAlign = 'center';
                            c.textBaseline = 'bottom';
                            const yOffset = datasetIndex === 0 ? -8 : 16;
                            c.fillText(`${val}`, element.x, element.y + yOffset);
                        }
                    });
                });
                c.restore();
            },
        };

        const chartInstance = new Chart(ctx, {
            ...config,
            plugins: [editorialPlugin, ...(config.plugins || [])],
            options: {
                ...config.options,
                animation: false,
                responsive: false,
                devicePixelRatio: 2,
            },
        });

        setTimeout(() => {
            const imgData = canvas.toDataURL('image/png', 1.0);
            chartInstance.destroy();
            document.body.removeChild(canvas);
            resolve(imgData);
        }, 80);
    });
};

/**
 * Computes monthly (or weekly if single month) time series of Ingresados vs Resueltos.
 */
export const computeTimeSeries = (reports: any[]) => {
    if (!reports || reports.length === 0) {
        return { labels: ['Sin datos'], totalSeries: [0], resolvedSeries: [0], criticalSeries: [0] };
    }

    const sorted = [...reports].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const firstDate = new Date(sorted[0].created_at);
    const lastDate = new Date(sorted[sorted.length - 1].created_at);
    const spanDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24);

    // If span <= 45 days, group by week; otherwise group by month
    const useWeeks = spanDays <= 45;
    const buckets = new Map<
        string,
        { label: string; total: number; resolved: number; critical: number }
    >();

    sorted.forEach((r) => {
        const d = new Date(r.created_at);
        if (isNaN(d.getTime())) return;

        let key = '';
        let label = '';
        if (useWeeks) {
            // Start of week (Monday)
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const weekStart = new Date(d);
            weekStart.setDate(diff);
            key = weekStart.toISOString().slice(0, 10);
            label = `Sem ${weekStart.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}`;
        } else {
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }).toUpperCase();
        }

        const curr = buckets.get(key) || { label, total: 0, resolved: 0, critical: 0 };
        curr.total += 1;
        if (r.status === 'resolved') curr.resolved += 1;
        if (r.ai_urgency === 'Rojo') curr.critical += 1;
        buckets.set(key, curr);
    });

    const entries = Array.from(buckets.values()).slice(-10);
    return {
        labels: entries.map((e) => e.label),
        totalSeries: entries.map((e) => e.total),
        resolvedSeries: entries.map((e) => e.resolved),
        criticalSeries: entries.map((e) => e.critical),
    };
};

/**
 * Computes per-sector breakdown with Received, Resolved, Pending, Critical, and Felicitaciones.
 */
export const computeSectorPerformance = (reports: any[]) => {
    const map = new Map<
        string,
        {
            sectorCode: string;
            sectorLabel: string;
            received: number;
            resolved: number;
            pending: number;
            critical: number;
            felicitaciones: number;
        }
    >();

    reports.forEach((r) => {
        const code = r.sector || 'Sin asignar';
        const label = getSectorLabel(code);
        const curr = map.get(code) || {
            sectorCode: code,
            sectorLabel: label,
            received: 0,
            resolved: 0,
            pending: 0,
            critical: 0,
            felicitaciones: 0,
        };

        const isFelic =
            r.finding_type?.startsWith('Felicitaci') || r.ai_category?.startsWith('Felicitaci');

        curr.received += 1;
        if (isFelic) {
            curr.felicitaciones += 1;
        } else if (r.status === 'resolved') {
            curr.resolved += 1;
        } else {
            curr.pending += 1;
        }
        if (r.ai_urgency === 'Rojo') curr.critical += 1;

        map.set(code, curr);
    });

    return Array.from(map.values()).sort((a, b) => b.received - a.received);
};

/**
 * Generates and downloads the Editorial Magazine PDF Report.
 */
export const generateIntelligenceMagazinePDF = async (
    params: MagazineReportParams
): Promise<void> => {
    const { rawReports, stats, aiAnalysis, userName, userRole, userSectors } = params;

    const logoObj = await loadLogoImage('/logosanatorio.png');
    const timeSeries = computeTimeSeries(rawReports);
    const sectorPerf = computeSectorPerformance(rawReports);

    // ─── 1. RENDER HIGH-RES LINE & BAR CHARTS FOR THE MAGAZINE ───

    // Chart A: Line Chart — Evolución Temporal (Ingresados vs. Resueltos)
    const trendLineChartImg = await renderEditorialChart({
        type: 'line',
        data: {
            labels: timeSeries.labels,
            datasets: [
                {
                    label: 'Reportes Ingresados',
                    data: timeSeries.totalSeries,
                    borderColor: '#00548B',
                    backgroundColor: 'rgba(0, 84, 139, 0.10)',
                    borderWidth: 3,
                    pointBackgroundColor: '#00548B',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    tension: 0.32,
                    fill: true,
                    datalabelColor: '#00548B',
                },
                {
                    label: 'Casos Resueltos',
                    data: timeSeries.resolvedSeries,
                    borderColor: '#00A99D',
                    backgroundColor: 'rgba(0, 169, 157, 0.08)',
                    borderWidth: 3,
                    pointBackgroundColor: '#00A99D',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    tension: 0.32,
                    fill: true,
                    datalabelColor: '#0F766E',
                },
            ],
        },
        options: {
            layout: { padding: { top: 28, right: 28, left: 16, bottom: 12 } },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                        font: { size: 13, weight: 'bold' },
                        color: '#334155',
                    },
                },
                title: {
                    display: true,
                    align: 'start',
                    text: 'EVOLUCIÓN TEMPORAL: CASOS INGRESADOS VS. RESUELTOS',
                    font: { size: 15, weight: 'bold' },
                    color: '#00548B',
                    padding: { bottom: 6 },
                },
                subtitle: {
                    display: true,
                    align: 'start',
                    text: 'Curva comparativa de volumen de entrada frente a capacidad de cierre validado en el período',
                    font: { size: 11.5 },
                    color: '#64748B',
                    padding: { bottom: 18 },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '20%',
                    grid: { color: '#E2E8F0' },
                    border: { display: false },
                    ticks: { font: { size: 11, weight: 'bold' }, color: '#64748B', precision: 0 },
                },
                x: {
                    grid: { display: false },
                    border: { color: '#CBD5E1' },
                    ticks: { font: { size: 11, weight: 'bold' }, color: '#334155' },
                },
            },
        },
    });

    // Chart B: Horizontal Grouped Bar Chart — Top Sectores (Recibidos vs Resueltos)
    const topSectors = sectorPerf.slice(0, 8);
    const sectorComparisonBarImg = await renderEditorialChart(
        {
            type: 'bar',
            data: {
                labels: topSectors.map((s) =>
                    s.sectorLabel.length > 28 ? s.sectorLabel.substring(0, 26) + '...' : s.sectorLabel
                ),
                datasets: [
                    {
                        label: 'Total Recibidos',
                        data: topSectors.map((s) => s.received),
                        backgroundColor: '#00548B',
                        borderRadius: 5,
                        barPercentage: 0.8,
                        categoryPercentage: 0.78,
                        datalabelColor: '#00548B',
                    },
                    {
                        label: 'Resueltos / Validados',
                        data: topSectors.map((s) => s.resolved + s.felicitaciones),
                        backgroundColor: '#00A99D',
                        borderRadius: 5,
                        barPercentage: 0.8,
                        categoryPercentage: 0.78,
                        datalabelColor: '#0F766E',
                    },
                ],
            },
            options: {
                indexAxis: 'y',
                layout: { padding: { top: 20, right: 48, left: 12, bottom: 10 } },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 10,
                            font: { size: 12.5, weight: 'bold' },
                            color: '#334155',
                        },
                    },
                    title: {
                        display: true,
                        align: 'start',
                        text: 'VOLUMEN Y RESOLUCIÓN POR SECTOR (TOP ÁREAS CON MAYOR DEMANDA)',
                        font: { size: 15, weight: 'bold' },
                        color: '#00548B',
                        padding: { bottom: 4 },
                    },
                    subtitle: {
                        display: true,
                        align: 'start',
                        text: 'Comparación directa entre reportes recibidos por el área y casos efectivamente resueltos',
                        font: { size: 11.5 },
                        color: '#64748B',
                        padding: { bottom: 14 },
                    },
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grace: '15%',
                        grid: { color: '#E2E8F0' },
                        border: { display: false },
                        ticks: { font: { size: 11 }, color: '#64748B', precision: 0 },
                    },
                    y: {
                        grid: { display: false },
                        border: { color: '#CBD5E1' },
                        ticks: { font: { size: 11.5, weight: 'bold' }, color: '#1E293B' },
                    },
                },
            },
        },
        1100,
        500
    );

    // Chart C: Vertical Bar Chart — Semáforo de Triage Clínico + Felicitaciones
    const triageBarImg = await renderEditorialChart(
        {
            type: 'bar',
            data: {
                labels: [
                    'Riesgo Bajo (Verde)',
                    'Riesgo Medio (Amarillo)',
                    'Riesgo Crítico (Rojo)',
                    'Felicitaciones',
                ],
                datasets: [
                    {
                        label: 'Cantidad de Casos',
                        data: [
                            stats.byUrgency.Verdes,
                            stats.byUrgency.Amarillos,
                            stats.byUrgency.Rojos,
                            stats.felicitaciones,
                        ],
                        backgroundColor: ['#16A34A', '#D97706', '#DC2626', '#F59E0B'],
                        borderRadius: 8,
                        maxBarThickness: 64,
                        datalabelColor: '#0F172A',
                    },
                ],
            },
            options: {
                layout: { padding: { top: 24, right: 20, left: 16, bottom: 10 } },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        align: 'start',
                        text: 'DISTRIBUCIÓN POR NIVEL DE CRITICIDAD (TRIAGE IA) Y RECONOCIMIENTOS',
                        font: { size: 14, weight: 'bold' },
                        color: '#00548B',
                        padding: { bottom: 4 },
                    },
                    subtitle: {
                        display: true,
                        align: 'start',
                        text: 'Estratificación del riesgo operativo/clínico frente a los reconocimientos positivos recibidos',
                        font: { size: 11 },
                        color: '#64748B',
                        padding: { bottom: 18 },
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: '22%',
                        grid: { color: '#E2E8F0' },
                        border: { display: false },
                        ticks: { font: { size: 11 }, color: '#64748B', precision: 0 },
                    },
                    x: {
                        grid: { display: false },
                        border: { color: '#CBD5E1' },
                        ticks: { font: { size: 11.5, weight: 'bold' }, color: '#1E293B' },
                    },
                },
            },
        },
        1050,
        420
    );

    // Chart D: Horizontal Bar Chart — Categorías / Tipología de Hallazgos
    const topCategories = (
        stats.byClassification.length > 0
            ? stats.byClassification
            : stats.byFindingType.map((f) => ({
                  category: f.type,
                  count: f.count,
                  percentage: f.percentage,
              }))
    ).slice(0, 7);

    const categoryBarImg =
        topCategories.length > 0
            ? await renderEditorialChart(
                  {
                      type: 'bar',
                      data: {
                          labels: topCategories.map((c) =>
                              c.category.length > 30
                                  ? c.category.substring(0, 28) + '...'
                                  : c.category
                          ),
                          datasets: [
                              {
                                  label: 'Casos por Categoría',
                                  data: topCategories.map((c) => c.count),
                                  backgroundColor: [
                                      '#00548B',
                                      '#00A99D',
                                      '#2563EB',
                                      '#7C3AED',
                                      '#D97706',
                                      '#0D9488',
                                      '#475569',
                                  ],
                                  borderRadius: 6,
                                  maxBarThickness: 28,
                                  datalabelColor: '#0F172A',
                              },
                          ],
                      },
                      options: {
                          indexAxis: 'y',
                          layout: { padding: { top: 20, right: 48, left: 12, bottom: 10 } },
                          plugins: {
                              legend: { display: false },
                              title: {
                                  display: true,
                                  align: 'start',
                                  text: 'CLASIFICACIÓN OPERATIVA Y TIPOLOGÍA DE HALLAZGOS',
                                  font: { size: 14, weight: 'bold' },
                                  color: '#00548B',
                                  padding: { bottom: 4 },
                              },
                              subtitle: {
                                  display: true,
                                  align: 'start',
                                  text: 'Principales ejes temáticos donde se concentran los reportes del período',
                                  font: { size: 11 },
                                  color: '#64748B',
                                  padding: { bottom: 14 },
                              },
                          },
                          scales: {
                              x: {
                                  beginAtZero: true,
                                  grace: '18%',
                                  grid: { color: '#E2E8F0' },
                                  border: { display: false },
                                  ticks: { font: { size: 11 }, color: '#64748B', precision: 0 },
                              },
                              y: {
                                  grid: { display: false },
                                  border: { color: '#CBD5E1' },
                                  ticks: { font: { size: 11.5, weight: 'bold' }, color: '#1E293B' },
                              },
                          },
                      },
                  },
                  1050,
                  420
              )
            : null;

    // ─── 2. BUILD EDITORIAL MAGAZINE PDF ───
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth(); // 210
    const pageH = doc.internal.pageSize.getHeight(); // 297
    const M = 14;
    const CW = pageW - M * 2; // 182

    const periodStart =
        rawReports.length > 0
            ? new Date(
                  Math.min(...rawReports.map((r) => new Date(r.created_at).getTime()))
              ).toLocaleDateString('es-AR')
            : new Date().toLocaleDateString('es-AR');
    const periodEnd = new Date().toLocaleDateString('es-AR');

    const resolutionRate =
        stats.total - stats.felicitaciones > 0
            ? Math.round((stats.resolved / (stats.total - stats.felicitaciones)) * 100)
            : stats.total > 0
              ? 100
              : 0;

    // Running Header for inner magazine pages (Pages 2+)
    const drawInnerMagazineHeader = (sectionName: string, sectionNumber: string) => {
        doc.setFillColor(...PDF_COLORS.primary);
        doc.rect(0, 0, pageW, 13, 'F');
        doc.setFillColor(...PDF_COLORS.secondary);
        doc.rect(0, 13, pageW, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(186, 230, 253);
        doc.text('REVISTA DE INTELIGENCIA CLÍNICA Y CALIDAD · SANATORIO ARGENTINO', M, 8.2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(
            sanitizePdfText(`SECCIÓN ${sectionNumber} · ${sectionName.toUpperCase()}`),
            pageW - M,
            8.2,
            { align: 'right' }
        );
    };

    // Magazine Section Title Block
    const drawEditorialSectionTitle = (
        kicker: string,
        title: string,
        subtitle: string,
        y: number
    ): number => {
        doc.setFillColor(...PDF_COLORS.secondary);
        doc.rect(M, y, 3, 12, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...PDF_COLORS.secondary);
        doc.text(sanitizePdfText(kicker.toUpperCase()), M + 6, y + 3.2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13.5);
        doc.setTextColor(...PDF_COLORS.primary);
        doc.text(sanitizePdfText(title), M + 6, y + 8.8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...PDF_COLORS.slate500);
        doc.text(sanitizePdfText(subtitle), M + 6, y + 13.5);

        return y + 17;
    };

    // Editorial Explanation Box ("Lectura de Revista")
    const drawInsightCallout = (
        title: string,
        body: string,
        y: number,
        accent: [number, number, number] = PDF_COLORS.primary,
        bg: [number, number, number] = PDF_COLORS.primaryLight
    ): number => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const lines = doc.splitTextToSize(sanitizePdfText(body), CW - 14);
        const boxH = lines.length * 4.2 + 10.5;

        doc.setFillColor(...bg);
        doc.setDrawColor(...PDF_COLORS.slate200);
        doc.setLineWidth(0.25);
        doc.roundedRect(M, y, CW, boxH, 2.5, 2.5, 'FD');

        doc.setFillColor(...accent);
        doc.roundedRect(M, y, 2.5, boxH, 1, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...accent);
        doc.text(sanitizePdfText(title.toUpperCase()), M + 6, y + 5.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...PDF_COLORS.slate800);
        lines.forEach((l: string, idx: number) => {
            doc.text(l, M + 6, y + 9.8 + idx * 4.2);
        });

        return y + boxH + 4;
    };

    // ═══════════════════════════════════════════════════════════════════════
    //  PÁGINA 1: PORTADA DE REVISTA & GUÍA EXPLICATIVA DE INDICADORES (KPIs)
    // ═══════════════════════════════════════════════════════════════════════
    // Masthead Banner
    doc.setFillColor(...PDF_COLORS.primaryDark);
    doc.rect(0, 0, pageW, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(186, 230, 253);
    doc.text(
        'PUBLICACIÓN TÉCNICA INTERNA · DEPARTAMENTO DE GESTIÓN DE CALIDAD Y SEGURIDAD DEL PACIENTE',
        M,
        6.5
    );
    doc.setTextColor(255, 255, 255);
    doc.text(`EDICIÓN ${new Date().toLocaleDateString('es-AR')}`, pageW - M, 6.5, {
        align: 'right',
    });

    // Main Cover Hero Band
    doc.setFillColor(...PDF_COLORS.primary);
    doc.rect(0, 10, pageW, 46, 'F');
    doc.setFillColor(...PDF_COLORS.secondary);
    doc.rect(0, 56, pageW, 2.5, 'F');

    drawLogoBadge(doc, logoObj, M, 15, 36, 34, 3);

    const roleTitles: Record<string, { title: string; sub: string; badge: string }> = {
        admin: {
            title: 'REVISTA DE INTELIGENCIA INSTITUCIONAL',
            sub: 'Radiografía Integral de Calidad Asistencial, Trazabilidad y Mejora Continua',
            badge: 'EDICIÓN INSTITUCIONAL',
        },
        directivo: {
            title: 'EXECUTIVE INTELLIGENCE BRIEF',
            sub: 'Síntesis Estratégica de Indicadores Clínicos y Desempeño por Servicio',
            badge: 'EDICIÓN DIRECCIÓN',
        },
        responsable: {
            title: 'REVISTA DE GESTIÓN SECTORIAL',
            sub: ` balance operativo y evolución de indicadores (${userSectors.join(', ') || 'Mis Sectores'})`,
            badge: 'EDICIÓN SECTORIAL',
        },
    };
    const rMeta = roleTitles[userRole] || roleTitles.admin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(125, 211, 252);
    doc.text(sanitizePdfText(rMeta.badge), M + 42, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(sanitizePdfText(rMeta.title), M + 42, 29);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(224, 242, 254);
    doc.text(sanitizePdfText(rMeta.sub), M + 42, 36.5);

    // Metadata pills inside hero
    doc.setFillColor(...PDF_COLORS.primaryDark);
    doc.roundedRect(M + 42, 41, CW - 42, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(255, 255, 255);
    doc.text(
        sanitizePdfText(
            `Período: ${periodStart} al ${periodEnd}   |   Emitido por: ${userName}   |   Universo: ${stats.total} registros auditados`
        ),
        M + 46,
        47.2
    );

    // Editorial Intro Box
    let y = 64;
    const topSectorName =
        stats.bySector.length > 0 ? getSectorLabel(stats.bySector[0].sector) : 'Sin registros';
    const topSectorCount = stats.bySector.length > 0 ? stats.bySector[0].count : 0;

    y = drawInsightCallout(
        'Síntesis Editorial del Período — ¿Cómo interpretar este informe?',
        `Esta publicación consolida la actividad del Sistema de Gestión de Calidad del Sanatorio Argentino. En el período evaluado se registraron ${stats.total} casos totales (${stats.total - stats.felicitaciones} hallazgos operativos y ${stats.felicitaciones} felicitaciones al personal). La tasa de resolución efectiva alcanzó el ${resolutionRate}%, con un tiempo promedio de respuesta de ${stats.avgResolutionTimeDays} días. El área con mayor volumen de actividad fue ${topSectorName} (${topSectorCount} casos). A continuación se detalla cada métrica con su significado clínico y operativo.`,
        y,
        PDF_COLORS.primary,
        PDF_COLORS.primaryLight
    );

    // Section 1: 6 Explained KPI Magazine Cards (2 columns x 3 rows)
    y = drawEditorialSectionTitle(
        'Sección 01 · Glosario de Indicadores',
        'Tablero de Métricas Explicadas',
        'Cada indicador incluye su valor actual, su nivel de desempeño y la explicación de qué mide exactamente.',
        y + 1
    );

    const kpiCards = [
        {
            title: '1. REPORTES RECIBIDOS (DEMANDA)',
            value: `${stats.totalReceived}`,
            unit: 'casos en el período',
            status: 'TRAZABILIDAD ACTIVA',
            statusColor: PDF_COLORS.primary,
            statusBg: PDF_COLORS.primaryLight,
            whatItMeans:
                'Mide el volumen total de reportes dirigidos a los sectores auditados. Un mayor número refleja una cultura activa de reporte y detección temprana.',
        },
        {
            title: '2. TASA DE RESOLUCIÓN EFECTIVA',
            value: `${resolutionRate}%`,
            unit: `${stats.resolved} cerrados de ${ Math.max(0, stats.total - stats.felicitaciones)} hallazgos`,
            status: resolutionRate >= 75 ? 'ÓPTIMO (EN META)' : 'REQUIERE IMPULSO',
            statusColor: resolutionRate >= 75 ? PDF_COLORS.emerald : PDF_COLORS.amber,
            statusBg: resolutionRate >= 75 ? PDF_COLORS.emeraldBg : PDF_COLORS.amberBg,
            whatItMeans:
                'Porcentaje de desvíos y hallazgos cuya solución ya fue implementada por el sector y validada por Calidad. Meta institucional: >= 75%.',
        },
        {
            title: '3. VELOCIDAD DE RESPUESTA (SLA)',
            value: `${stats.avgResolutionTimeDays}`,
            unit: 'días corridos en promedio',
            status: stats.avgResolutionTimeDays <= 3 ? 'DENTRO DE ESTÁNDAR' : 'DEMORA DETECTADA',
            statusColor: stats.avgResolutionTimeDays <= 3 ? PDF_COLORS.emerald : PDF_COLORS.amber,
            statusBg: stats.avgResolutionTimeDays <= 3 ? PDF_COLORS.emeraldBg : PDF_COLORS.amberBg,
            whatItMeans:
                'Tiempo promedio transcurrido desde que ingresa el reporte hasta que se aprueba su cierre definitivo. Estándar esperado: <= 3.0 días.',
        },
        {
            title: '4. HALLAZGOS CRÍTICOS (RIESGO ROJO)',
            value: `${stats.urgentCount}`,
            unit: 'casos de prioridad alta',
            status: stats.urgentCount === 0 ? 'SIN EVENTOS ROJOS' : 'ATENCIÓN PRIORITARIA',
            statusColor: stats.urgentCount === 0 ? PDF_COLORS.emerald : PDF_COLORS.red,
            statusBg: stats.urgentCount === 0 ? PDF_COLORS.emeraldBg : PDF_COLORS.redBg,
            whatItMeans:
                'Incidentes o eventos adversos clasificados con urgencia Roja por su impacto potencial en la seguridad del paciente o continuidad operativa.',
        },
        {
            title: '5. CASOS EN GESTIÓN (BACKLOG)',
            value: `${stats.pending}`,
            unit: 'casos abiertos actualmente',
            status: stats.pending <= 5 ? 'FLUJO CONTROLADO' : 'SEGUIMIENTO ACTIVO',
            statusColor: stats.pending <= 5 ? PDF_COLORS.secondary : PDF_COLORS.amber,
            statusBg: stats.pending <= 5 ? PDF_COLORS.secondaryLight : PDF_COLORS.amberBg,
            whatItMeans:
                'Hallazgos que se encuentran actualmente derivados al responsable de sector o aguardando validación final del equipo de Calidad.',
        },
        {
            title: '6. FELICITACIONES AL PERSONAL',
            value: `${stats.felicitaciones}`,
            unit: 'reconocimientos recibidos',
            status: 'EXCELENCIA HUMANA',
            statusColor: PDF_COLORS.gold,
            statusBg: PDF_COLORS.goldBg,
            whatItMeans:
                'Reconocimientos positivos enviados por pacientes, familiares o colegas destacando la calidez y profesionalismo de los equipos.',
        },
    ];

    const cardW = (CW - 6) / 2;
    const cardH = 38;

    kpiCards.forEach((card, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cx = M + col * (cardW + 6);
        const cy = y + row * (cardH + 4.5);

        // Card container
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...PDF_COLORS.slate200);
        doc.setLineWidth(0.35);
        doc.roundedRect(cx, cy, cardW, cardH, 2.5, 2.5, 'FD');

        // Top color bar
        doc.setFillColor(...card.statusColor);
        doc.roundedRect(cx, cy, cardW, 2, 1, 1, 'F');

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.3);
        doc.setTextColor(...PDF_COLORS.slate600);
        doc.text(sanitizePdfText(card.title), cx + 4, cy + 6.8);

        // Status pill on top right
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        const pillW = doc.getTextWidth(card.status) + 5;
        doc.setFillColor(...card.statusBg);
        doc.roundedRect(cx + cardW - pillW - 3.5, cy + 3.5, pillW, 4.8, 1.2, 1.2, 'F');
        doc.setTextColor(...card.statusColor);
        doc.text(sanitizePdfText(card.status), cx + cardW - pillW / 2 - 3.5, cy + 6.8, {
            align: 'center',
        });

        // Big Value + Unit
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(17);
        doc.setTextColor(...PDF_COLORS.slate900);
        doc.text(card.value, cx + 4, cy + 16);

        const valW = doc.getTextWidth(card.value);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...PDF_COLORS.slate500);
        doc.text(sanitizePdfText(card.unit), cx + 6 + valW, cy + 15.2);

        // Divider line
        doc.setDrawColor(...PDF_COLORS.slate100);
        doc.setLineWidth(0.25);
        doc.line(cx + 4, cy + 19, cx + cardW - 4, cy + 19);

        // Pedagogical explanation ("¿Qué mide?")
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(...PDF_COLORS.slate600);
        const expLines = doc.splitTextToSize(sanitizePdfText(card.whatItMeans), cardW - 8);
        expLines.slice(0, 4).forEach((l: string, lIdx: number) => {
            doc.text(l, cx + 4, cy + 23.2 + lIdx * 3.5);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    //  PÁGINA 2: GRÁFICOS EXPLICATIVOS DE LÍNEA Y BARRAS (TENDENCIA Y SECTORES)
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage();
    drawInnerMagazineHeader('Tendencia Temporal y Demanda por Sector', '02');

    let p2Y = 19;
    p2Y = drawEditorialSectionTitle(
        'Sección 02 · Análisis Gráfico de Evolución y Capacidad de Respuesta',
        'Curva de Ingresos vs. Cierres y Comparativa por Sector',
        'Priorizamos gráficos de línea y de barras pareadas con etiquetas directas para visualizar brechas operativas al instante.',
        p2Y
    );

    // 1. Line Chart Box
    if (trendLineChartImg) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...PDF_COLORS.slate200);
        doc.setLineWidth(0.35);
        doc.roundedRect(M, p2Y, CW, 78, 3, 3, 'FD');
        doc.addImage(trendLineChartImg, 'PNG', M + 2, p2Y + 2, CW - 4, 74);
        p2Y += 81;
    }

    p2Y = drawInsightCallout(
        'Lectura del Gráfico de Línea (Dinámica de Flujo)',
        `La línea azul muestra el ritmo de ingreso de reportes y la línea verde-teal refleja cuántos de esos casos ya alcanzaron la resolución validada. Cuando ambas curvas se mantienen próximas (${stats.resolved} resueltos sobre ${stats.total - stats.felicitaciones} hallazgos), el sistema absorbe la demanda sin acumular retrasos crónicos.`,
        p2Y,
        PDF_COLORS.secondary,
        PDF_COLORS.secondaryLight
    );

    // 2. Horizontal Grouped Bar Chart Box (Top Sectors)
    if (sectorComparisonBarImg) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...PDF_COLORS.slate200);
        doc.setLineWidth(0.35);
        doc.roundedRect(M, p2Y + 1, CW, 84, 3, 3, 'FD');
        doc.addImage(sectorComparisonBarImg, 'PNG', M + 2, p2Y + 3, CW - 4, 80);
        p2Y += 88;
    }

    drawInsightCallout(
        'Lectura del Gráfico de Barras por Sector (Carga vs. Respuesta)',
        `Cada sector muestra dos barras paralelas: la barra superior (Azul) indica cuántas solicitudes recibió como área destino y la barra inferior (Teal) cuántos casos ya solucionó o fueron felicitaciones. Esto permite distinguir entre áreas con alta demanda pero rápida gestión y áreas con cuello de botella.`,
        p2Y,
        PDF_COLORS.primary,
        PDF_COLORS.primaryLight
    );

    // ═══════════════════════════════════════════════════════════════════════
    //  PÁGINA 3: BARRAS DE RIESGO, CATEGORÍAS Y MATRIZ DE EFICIENCIA SECTORIAL
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage();
    drawInnerMagazineHeader('Estratificación de Riesgo y Matriz Sectorial', '03');

    let p3Y = 19;
    p3Y = drawEditorialSectionTitle(
        'Sección 03 · Radiografía de Criticidad y Clasificación Operativa',
        'Semáforo de Riesgo Clínico, Tipologías y Ranking Sectorial',
        'Desglose en gráficos de barras de la severidad de los hallazgos y tabla completa de rendimiento por servicio.',
        p3Y
    );

    // Side-by-side or stacked Bar Charts (Triage + Categories)
    if (triageBarImg && categoryBarImg) {
        const halfW = (CW - 4) / 2;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...PDF_COLORS.slate200);
        doc.setLineWidth(0.35);
        doc.roundedRect(M, p3Y, halfW, 66, 2.5, 2.5, 'FD');
        doc.addImage(triageBarImg, 'PNG', M + 1.5, p3Y + 2, halfW - 3, 62);

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...PDF_COLORS.slate200);
        doc.roundedRect(M + halfW + 4, p3Y, halfW, 66, 2.5, 2.5, 'FD');
        doc.addImage(categoryBarImg, 'PNG', M + halfW + 5.5, p3Y + 2, halfW - 3, 62);
        p3Y += 70;
    } else if (triageBarImg) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...PDF_COLORS.slate200);
        doc.roundedRect(M, p3Y, CW, 66, 2.5, 2.5, 'FD');
        doc.addImage(triageBarImg, 'PNG', M + 2, p3Y + 2, CW - 4, 62);
        p3Y += 70;
    }

    p3Y = drawInsightCallout(
        'Interpretación de Criticidad y Categorías',
        `De los hallazgos clasificados por riesgo: ${stats.byUrgency.Verdes} corresponden a nivel Leve (Verde), ${stats.byUrgency.Amarillos} a nivel Moderado (Amarillo) y ${stats.byUrgency.Rojos} a nivel Crítico (Rojo). En cuanto a participación: ${stats.byAnonymity.identified} reportes fueron identificados (${stats.total > 0 ? Math.round((stats.byAnonymity.identified / stats.total) * 100) : 0}%) y ${stats.byAnonymity.anonymous} anónimos, demostrando confianza en el canal.`,
        p3Y,
        PDF_COLORS.primary,
        PDF_COLORS.slate50
    );

    // Table of Sector Performance with Visual Progress Bars
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('MATRIZ EXPLICATIVA DE RENDIMIENTO POR SECTOR (TOP 12 SERVICIOS)', M, p3Y + 4);

    const sectorTableRows = sectorPerf.slice(0, 12).map((s) => {
        const actionable = Math.max(0, s.received - s.felicitaciones);
        const effPct = actionable > 0 ? Math.round((s.resolved / actionable) * 100) : 100;
        const diag =
            s.critical > 0 && s.pending > 0
                ? 'PRIORIZAR CRÍTICOS'
                : effPct >= 80
                  ? 'ÓPTIMO'
                  : effPct >= 50
                    ? 'EN GESTIÓN'
                    : 'REQUIERE APOYO';
        return [
            sanitizePdfText(s.sectorLabel),
            String(s.received),
            String(s.resolved),
            String(s.pending),
            String(s.critical),
            String(s.felicitaciones),
            `${effPct}%`,
            diag,
        ];
    });

    autoTable(doc, {
        startY: p3Y + 7,
        head: [
            [
                'Sector / Servicio',
                'Recibidos',
                'Resueltos',
                'Pendientes',
                'Críticos',
                'Felicit.',
                'Eficacia',
                'Diagnóstico Operativo',
            ],
        ],
        body: sectorTableRows,
        styles: {
            fontSize: 7.8,
            cellPadding: 2.6,
            font: 'helvetica',
            textColor: PDF_COLORS.slate800,
            lineColor: PDF_COLORS.slate200,
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: PDF_COLORS.primary,
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 7.8,
            halign: 'center',
        },
        alternateRowStyles: { fillColor: PDF_COLORS.slate50 },
        columnStyles: {
            0: { cellWidth: 54, fontStyle: 'bold', halign: 'left' },
            1: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
            2: { cellWidth: 16, halign: 'center', textColor: PDF_COLORS.emerald },
            3: { cellWidth: 17, halign: 'center', textColor: PDF_COLORS.amber },
            4: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
            5: { cellWidth: 14, halign: 'center', textColor: PDF_COLORS.gold },
            6: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
            7: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (hookData: any) => {
            if (hookData.section === 'body') {
                if (hookData.column.index === 4) {
                    const cVal = Number(hookData.cell.raw || 0);
                    if (cVal > 0) {
                        hookData.cell.styles.textColor = PDF_COLORS.red;
                        hookData.cell.styles.fillColor = PDF_COLORS.redBg;
                    } else {
                        hookData.cell.styles.textColor = PDF_COLORS.slate400;
                    }
                }
                if (hookData.column.index === 7) {
                    const dVal = String(hookData.cell.raw || '');
                    if (dVal === 'ÓPTIMO') {
                        hookData.cell.styles.textColor = PDF_COLORS.emerald;
                        hookData.cell.styles.fillColor = PDF_COLORS.emeraldBg;
                    } else if (dVal === 'PRIORIZAR CRÍTICOS' || dVal === 'REQUIERE APOYO') {
                        hookData.cell.styles.textColor = PDF_COLORS.red;
                        hookData.cell.styles.fillColor = PDF_COLORS.redBg;
                    } else {
                        hookData.cell.styles.textColor = PDF_COLORS.amber;
                        hookData.cell.styles.fillColor = PDF_COLORS.amberBg;
                    }
                }
            }
        },
        margin: { left: M, right: M },
    });

    // ═══════════════════════════════════════════════════════════════════════
    //  PÁGINA 4: DOSSIER DE INTELIGENCIA ARTIFICIAL (ANÁLISIS EN 4 PILARES)
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage();
    drawInnerMagazineHeader('Dossier de Inteligencia Clínica Asistida por IA', '04');

    let p4Y = 19;
    p4Y = drawEditorialSectionTitle(
        'Sección 04 · Evaluación Cualitativa y Estratégica (Motor IA)',
        'Lectura Integral: Descriptiva, Diagnóstica, Predictiva y Prescriptiva',
        'Análisis profundo redactado a partir de la totalidad de los hallazgos, causas raíz y planes correctivos del período.',
        p4Y
    );

    const aiPillars = [
        {
            num: '01',
            title: 'ANÁLISIS DESCRIPTIVO — ¿Qué ocurrió en el período?',
            subtitle: 'Resumen ejecutivo de los eventos, patrones de volumen y comportamiento general.',
            text: aiAnalysis?.descriptive || 'Sin análisis descriptivo disponible.',
            accent: PDF_COLORS.primary,
            bg: PDF_COLORS.primaryLight,
        },
        {
            num: '02',
            title: 'ANÁLISIS DIAGNÓSTICO — ¿Por qué ocurrió? (Causas Raíz)',
            subtitle: 'Identificación de cuellos de botella, correlaciones inter-sectoriales y factores subyacentes.',
            text: aiAnalysis?.diagnostic || 'Sin análisis diagnóstico disponible.',
            accent: PDF_COLORS.amber,
            bg: PDF_COLORS.amberBg,
        },
        {
            num: '03',
            title: 'ANÁLISIS PREDICTIVO — ¿Qué riesgos y tendencias se proyectan?',
            subtitle: 'Proyección de áreas vulnerables y posibles recurrencias si no se interviene.',
            text: aiAnalysis?.predictive || 'Sin análisis predictivo disponible.',
            accent: PDF_COLORS.purple,
            bg: PDF_COLORS.purpleBg,
        },
        {
            num: '04',
            title: 'PLAN PRESCRIPTIVO — Hoja de Ruta y Acciones Recomendadas',
            subtitle: 'Intervenciones concretas sugeridas para elevar la calidad y seguridad del paciente.',
            text: aiAnalysis?.prescriptive || 'Sin análisis prescriptivo disponible.',
            accent: PDF_COLORS.secondary,
            bg: PDF_COLORS.secondaryLight,
        },
    ];

    aiPillars.forEach((pillar) => {
        const cleaned = cleanMarkdownForPdf(pillar.text);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.8);
        const textLines = doc.splitTextToSize(cleaned, CW - 14);
        const lineH = 4.3;
        const blockH = textLines.length * lineH + 16;

        if (p4Y + blockH > pageH - 18) {
            doc.addPage();
            drawInnerMagazineHeader('Dossier de Inteligencia Clínica Asistida por IA (Cont.)', '04');
            p4Y = 20;
        }

        // Card container
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...PDF_COLORS.slate200);
        doc.setLineWidth(0.35);
        doc.roundedRect(M, p4Y, CW, blockH, 2.5, 2.5, 'FD');

        // Header strip inside card
        doc.setFillColor(...pillar.bg);
        doc.roundedRect(M + 0.4, p4Y + 0.4, CW - 0.8, 10.5, 2, 2, 'F');

        // Left vertical accent bar
        doc.setFillColor(...pillar.accent);
        doc.roundedRect(M, p4Y, 2.8, blockH, 1, 1, 'F');

        // Number badge + Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.8);
        doc.setTextColor(...pillar.accent);
        doc.text(sanitizePdfText(`${pillar.num}. ${pillar.title}`), M + 6, p4Y + 5);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.2);
        doc.setTextColor(...PDF_COLORS.slate500);
        doc.text(sanitizePdfText(pillar.subtitle), M + 6, p4Y + 9.2);

        // Body text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.8);
        doc.setTextColor(...PDF_COLORS.slate800);
        textLines.forEach((l: string, idx: number) => {
            doc.text(l, M + 6, p4Y + 15.2 + idx * lineH);
        });

        p4Y += blockH + 5;
    });

    // ═══════════════════════════════════════════════════════════════════════
    //  PÁGINA 5: CASOS CRÍTICOS Y DESTACADOS POSITIVOS (FELICITACIONES)
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage();
    drawInnerMagazineHeader('Anexo de Casos Críticos y Reconocimientos', '05');

    let p5Y = 19;
    p5Y = drawEditorialSectionTitle(
        'Sección 05 · Trazabilidad de Casos Destacados',
        'Detalle de Eventos Críticos (Riesgo Rojo) y Felicitaciones al Equipo',
        'Registro nominal de los casos de mayor prioridad clínica y de los reconocimientos recibidos en el período.',
        p5Y
    );

    const criticalCases = rawReports.filter((r) => r.ai_urgency === 'Rojo').slice(0, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...PDF_COLORS.red);
    doc.text(
        sanitizePdfText(`A. CASOS DE PRIORIDAD CRÍTICA / RIESGO ROJO (${criticalCases.length} mostrados)`),
        M,
        p5Y + 3
    );

    if (criticalCases.length > 0) {
        autoTable(doc, {
            startY: p5Y + 6,
            head: [['Ticket ID', 'Fecha', 'Sector', 'Categoría', 'Resumen del Caso Crítico', 'Estado']],
            body: criticalCases.map((r) => [
                sanitizePdfText(r.tracking_id || '-'),
                r.created_at ? new Date(r.created_at).toLocaleDateString('es-AR') : '-',
                sanitizePdfText(getSectorLabel(r.sector || '-')),
                sanitizePdfText(r.ai_category || r.finding_type || '-'),
                sanitizePdfText(r.ai_summary || r.content || '-').substring(0, 85),
                r.status === 'resolved'
                    ? 'Resuelto'
                    : r.status === 'quality_validation'
                      ? 'En Validación'
                      : 'En Gestión',
            ]),
            styles: { fontSize: 7.5, cellPadding: 2.6, textColor: PDF_COLORS.slate800 },
            headStyles: { fillColor: PDF_COLORS.red, textColor: 255, fontStyle: 'bold', fontSize: 7.8 },
            alternateRowStyles: { fillColor: PDF_COLORS.redBg },
            columnStyles: {
                0: { cellWidth: 25, fontStyle: 'bold', textColor: PDF_COLORS.red },
                1: { cellWidth: 18, halign: 'center' },
                2: { cellWidth: 34, fontStyle: 'bold' },
                3: { cellWidth: 28 },
                4: { cellWidth: 55 },
                5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
            },
            margin: { left: M, right: M },
        });
        p5Y = (doc as any).lastAutoTable.finalY + 10;
    } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(...PDF_COLORS.slate500);
        doc.text(
            'No se registraron hallazgos con urgencia crítica (Rojo) en el período seleccionado.',
            M,
            p5Y + 9
        );
        p5Y += 16;
    }

    // Felicitaciones Table
    const felicCases = rawReports
        .filter(
            (r) =>
                r.finding_type?.startsWith('Felicitaci') ||
                r.ai_category?.startsWith('Felicitaci')
        )
        .slice(0, 10);

    if (p5Y + 40 > pageH - 20) {
        doc.addPage();
        drawInnerMagazineHeader('Anexo de Reconocimientos al Personal', '05');
        p5Y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...PDF_COLORS.gold);
    doc.text(
        sanitizePdfText(`B. RECONOCIMIENTOS Y FELICITACIONES DESTACADAS (${felicCases.length} mostrados)`),
        M,
        p5Y + 3
    );

    if (felicCases.length > 0) {
        autoTable(doc, {
            startY: p5Y + 6,
            head: [['Ticket ID', 'Fecha', 'Sector Reconocido', 'Mensaje de Reconocimiento / Resumen']],
            body: felicCases.map((r) => [
                sanitizePdfText(r.tracking_id || '-'),
                r.created_at ? new Date(r.created_at).toLocaleDateString('es-AR') : '-',
                sanitizePdfText(getSectorLabel(r.sector || '-')),
                sanitizePdfText(r.ai_summary || r.content || '-').substring(0, 115),
            ]),
            styles: { fontSize: 7.5, cellPadding: 2.6, textColor: PDF_COLORS.slate800 },
            headStyles: { fillColor: PDF_COLORS.gold, textColor: 255, fontStyle: 'bold', fontSize: 7.8 },
            alternateRowStyles: { fillColor: PDF_COLORS.goldBg },
            columnStyles: {
                0: { cellWidth: 26, fontStyle: 'bold', textColor: PDF_COLORS.goldDark },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 44, fontStyle: 'bold' },
                3: { cellWidth: 92 },
            },
            margin: { left: M, right: M },
        });
    } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(...PDF_COLORS.slate500);
        doc.text(
            'No se registraron felicitaciones en el filtro actual.',
            M,
            p5Y + 9
        );
    }

    // Apply Institutional Footers on all pages
    applyInstitutionalFooters(doc, {
        margin: M,
        subtitle:
            'Sanatorio Argentino · Gestión de Calidad y Seguridad del Paciente · Innovación y Transformación Digital',
    });

    const roleNames: Record<string, string> = {
        admin: 'Revista_Institucional_Calidad',
        responsable: 'Revista_Sectorial_Calidad',
        directivo: 'Executive_Brief_Calidad',
    };

    doc.save(`${roleNames[userRole] || 'Informe_Calidad'}_${new Date().toISOString().split('T')[0]}.pdf`);
};

