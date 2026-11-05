import {
    Clock,
    AlertOctagon,
    CheckCircle2,
    HelpCircle,
    ChevronDown,
    ChevronUp,
    MessageCircle,
    Loader2,
    FileDown,
    Search,
    Flame,
    History,
    Building2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { exportCasesToPDF } from '../utils/institutionalExport';
import { generateValidationPDF } from '../utils/validationPdfExport';

interface Report {
    id: string;
    tracking_id: string;
    sector: string;
    reporter_sector?: string;
    origin_sector?: string;
    ai_urgency: string;
    ai_category?: string;
    finding_type?: string;
    status: string;
    created_at: string;
    assigned_to_phone?: string;
    assigned_to?: string;
    ai_summary?: string;
    content?: string;
    is_adverse_event?: boolean;
}

interface Props {
    reports: Report[];
    onResendWhatsApp?: (report: Report) => Promise<void>;
}

interface SlaAlert {
    report: Report;
    daysElapsed: number;
    diffDays: number;
    level: 'critical' | 'warning' | 'ok';
    isLegacy: boolean;
    message: string;
}

const SLA_THRESHOLDS = {
    critical_case: 1,    // Rojo -> 1 día max
    normal_case: 2,      // Verde/Amarillo -> 2 días max
    warning_buffer: 0.5, // Alert 0.5 días before deadline
};

export const getSlaLevel = (report: Report): { level: 'critical' | 'warning' | 'ok'; daysElapsed: number } => {
    if (
        report.status === 'resolved' ||
        report.status === 'cancelled' ||
        report.status === 'discarded' ||
        report.finding_type?.startsWith('Felicitaci') ||
        report.ai_category?.startsWith('Felicitaci')
    ) {
        return { level: 'ok', daysElapsed: 0 };
    }
    const daysElapsed = (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const threshold = report.ai_urgency === 'Rojo' ? SLA_THRESHOLDS.critical_case : SLA_THRESHOLDS.normal_case;

    if (daysElapsed > threshold) return { level: 'critical', daysElapsed };
    if (daysElapsed > threshold - SLA_THRESHOLDS.warning_buffer) return { level: 'warning', daysElapsed };
    return { level: 'ok', daysElapsed };
};

export const SlaAlertBanner = ({ reports, onResendWhatsApp }: Props) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [activeTab, setActiveTab] = useState<'recent' | 'critical_red' | 'sectors' | 'legacy'>('recent');
    const [searchQuery, setSearchQuery] = useState('');
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const alerts = useMemo(() => {
        const result: SlaAlert[] = [];
        reports.forEach(report => {
            if (
                report.status === 'resolved' ||
                report.status === 'cancelled' ||
                report.status === 'discarded' ||
                report.finding_type?.startsWith('Felicitaci') ||
                report.ai_category?.startsWith('Felicitaci')
            ) {
                return;
            }
            const { level, daysElapsed } = getSlaLevel(report);
            if (level === 'ok') return;

            const threshold = report.ai_urgency === 'Rojo' ? SLA_THRESHOLDS.critical_case : SLA_THRESHOLDS.normal_case;
            const diffDays = Math.abs(daysElapsed - threshold);
            const displayValue =
                diffDays < 1
                    ? `${Math.max(1, Math.round(diffDays * 24))} hs`
                    : `${Math.round(diffDays)} día${Math.round(diffDays) !== 1 ? 's' : ''}`;

            const isLegacy =
                daysElapsed > 30 || (report.tracking_id || '').toUpperCase().startsWith('SA-LEG');

            result.push({
                report,
                daysElapsed,
                diffDays,
                level,
                isLegacy,
                message:
                    level === 'critical'
                        ? `Vencido hace ${displayValue}`
                        : `Vence en ${displayValue}`,
            });
        });

        // Sort MOST RECENT / ACTIONABLE FIRST (so 270-day-old legacy cases never bury today's alerts)
        return result.sort((a, b) => {
            // Warning (about to expire) and recent Rojo first
            if (a.level === 'warning' && b.level !== 'warning') return -1;
            if (a.level !== 'warning' && b.level === 'warning') return 1;
            if (a.report.ai_urgency === 'Rojo' && b.report.ai_urgency !== 'Rojo') return -1;
            if (a.report.ai_urgency !== 'Rojo' && b.report.ai_urgency === 'Rojo') return 1;
            return a.daysElapsed - b.daysElapsed;
        });
    }, [reports]);

    const warningAlerts = useMemo(() => alerts.filter(a => a.level === 'warning'), [alerts]);
    const recentAlerts = useMemo(() => alerts.filter(a => !a.isLegacy), [alerts]);
    const criticalRedAlerts = useMemo(
        () => alerts.filter(a => a.report.ai_urgency === 'Rojo'),
        [alerts]
    );
    const legacyAlerts = useMemo(() => alerts.filter(a => a.isLegacy), [alerts]);

    const topSectors = useMemo(() => {
        const map = new Map<string, { total: number; recent: number; red: number; legacy: number }>();
        alerts.forEach(a => {
            const sec = a.report.sector || 'Sin asignar';
            const curr = map.get(sec) || { total: 0, recent: 0, red: 0, legacy: 0 };
            curr.total++;
            if (!a.isLegacy) curr.recent++;
            if (a.report.ai_urgency === 'Rojo') curr.red++;
            if (a.isLegacy) curr.legacy++;
            map.set(sec, curr);
        });
        return Array.from(map.entries())
            .map(([sector, counts]) => ({ sector, ...counts }))
            .sort((a, b) => b.recent - a.recent || b.red - a.red || b.total - a.total);
    }, [alerts]);

    const displayedAlerts = useMemo(() => {
        let base =
            activeTab === 'recent'
                ? recentAlerts.length > 0
                    ? recentAlerts
                    : alerts
                : activeTab === 'critical_red'
                    ? criticalRedAlerts
                    : activeTab === 'legacy'
                        ? legacyAlerts
                        : alerts;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            base = base.filter(
                a =>
                    (a.report.tracking_id || '').toLowerCase().includes(q) ||
                    (a.report.sector || '').toLowerCase().includes(q) ||
                    (a.report.ai_summary || '').toLowerCase().includes(q) ||
                    (a.report.content || '').toLowerCase().includes(q)
            );
        }
        return base;
    }, [alerts, recentAlerts, criticalRedAlerts, legacyAlerts, activeTab, searchQuery]);

    const handleResend = async (report: Report) => {
        if (!onResendWhatsApp || !report.assigned_to) return;
        setSendingId(report.id);
        try {
            await onResendWhatsApp(report);
            setSentIds(prev => new Set(prev).add(report.id));
            setTimeout(() => {
                setSentIds(prev => {
                    const next = new Set(prev);
                    next.delete(report.id);
                    return next;
                });
            }, 3000);
        } catch (err) {
            console.error('Error resending WhatsApp:', err);
        } finally {
            setSendingId(null);
        }
    };

    const handleExportSlaPdf = async () => {
        if (displayedAlerts.length === 0) return;
        setIsExportingPdf(true);
        try {
            const tabTitle =
                activeTab === 'recent'
                    ? 'Alertas Activas Recientes y Por Vencer (≤ 30 días)'
                    : activeTab === 'critical_red'
                        ? 'Casos Críticos (Riesgo Rojo) Fuera de SLA'
                        : 'Pasivo Histórico de Casos Abiertos (> 30 días)';
            await exportCasesToPDF({
                title: `Control de Tiempo de Respuesta (SLA) — ${tabTitle}`,
                subtitle: `Listado priorizado para gestión operativa · ${displayedAlerts.length} casos`,
                fileNamePrefix: `Alertas_SLA_${activeTab}`,
                rows: displayedAlerts.map(a => ({
                    trackingId: a.report.tracking_id || 'S/N',
                    date: a.report.created_at
                        ? new Date(a.report.created_at).toLocaleDateString('es-AR')
                        : '-',
                    sector: a.report.sector || 'Sin asignar',
                    originSector: a.report.reporter_sector || a.report.origin_sector || '-',
                    managementType: a.message,
                    urgency: a.report.ai_urgency || 'Media',
                    status: a.level === 'warning' ? 'Por Vencer' : 'Fuera de Plazo',
                    category: a.report.ai_category || a.report.finding_type || 'General',
                    summary: a.report.ai_summary || a.report.content || 'Sin resumen',
                })),
                kpis: {
                    total: displayedAlerts.length,
                    pending: displayedAlerts.length,
                    resolved: 0,
                },
            });
        } finally {
            setIsExportingPdf(false);
        }
    };

    if (alerts.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
            {/* Collapsible Executive Header */}
            <div
                onClick={() => setIsExpanded(prev => !prev)}
                className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-white to-red-50/30 hover:bg-slate-50/90 cursor-pointer transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
                <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                        <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
                                Radar de Tiempo de Respuesta (SLA Operativo)
                            </h3>
                            <button
                                onClick={e => {
                                    e.stopPropagation();
                                    setShowInfo(!showInfo);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                <HelpCircle className="w-3 h-3" />
                                ¿Cómo se calcula?
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Separa los casos recientes que requieren acción inmediata del pasivo histórico acumulado.
                        </p>
                    </div>
                </div>

                {/* Meaningful Operational Pills */}
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        onClick={e => {
                            e.stopPropagation();
                            setActiveTab('recent');
                            setIsExpanded(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black flex items-center gap-1.5 hover:bg-amber-100 transition-colors"
                    >
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {warningAlerts.length} Por Vencer
                    </span>

                    <span
                        onClick={e => {
                            e.stopPropagation();
                            setActiveTab('recent');
                            setIsExpanded(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-sanatorio-primary text-xs font-black flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
                    >
                        <Flame className="w-3.5 h-3.5 text-sanatorio-primary" />
                        {recentAlerts.length} Activos Recientes (≤30d)
                    </span>

                    <span
                        onClick={e => {
                            e.stopPropagation();
                            setActiveTab('critical_red');
                            setIsExpanded(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-black flex items-center gap-1.5 hover:bg-red-100 transition-colors"
                    >
                        🔴 {criticalRedAlerts.length} Críticos Rojos
                    </span>

                    {legacyAlerts.length > 0 && (
                        <span
                            onClick={e => {
                                e.stopPropagation();
                                setActiveTab('legacy');
                                setIsExpanded(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200 transition-colors"
                        >
                            <History className="w-3.5 h-3.5 text-slate-500" />
                            {legacyAlerts.length} Históricos (&gt;30d)
                        </span>
                    )}

                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 ml-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>
            </div>

            {/* SLA Explanation Box */}
            {showInfo && (
                <div className="mx-5 my-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2 animate-in fade-in duration-200">
                    <p className="font-bold text-slate-800 text-sm">
                        📋 Estándar de Tiempo de Respuesta (SLA Clínico)
                    </p>
                    <p>
                        Mide el plazo máximo para dar respuesta o contención a un hallazgo desde su ingreso. Para que el indicador sea accionable, el sistema prioriza primero los casos <strong>Por Vencer</strong> y los <strong>Recientes (últimos 30 días)</strong>, aislando los registros históricos (`SA-LEG`) en una pestaña separada.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <div className="bg-red-50 p-2.5 rounded-lg border border-red-100">
                            <p className="font-black text-red-700">🔴 Riesgo Crítico (Rojo)</p>
                            <p className="text-red-600 font-semibold">Plazo máximo: 24 hs (1 día)</p>
                        </div>
                        <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                            <p className="font-black text-amber-700">🟡 Riesgo Medio (Amarillo)</p>
                            <p className="text-amber-700 font-semibold">Plazo máximo: 48 hs (2 días)</p>
                        </div>
                        <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                            <p className="font-black text-emerald-700">🟢 Riesgo Leve (Verde)</p>
                            <p className="text-emerald-700 font-semibold">Plazo máximo: 48 hs (2 días)</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded Actionable Workspace */}
            {isExpanded && (
                <div className="p-4 sm:p-6 border-t border-slate-200/80 space-y-4 bg-slate-50/40 animate-in fade-in duration-200">
                    {/* Navigation Tabs + Search + PDF Export */}
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setActiveTab('recent')}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    activeTab === 'recent'
                                        ? 'bg-sanatorio-primary text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <Flame className="w-3.5 h-3.5" />
                                Prioridad Actual ≤30d ({recentAlerts.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('critical_red')}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    activeTab === 'critical_red'
                                        ? 'bg-red-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-red-700 hover:bg-red-50'
                                }`}
                            >
                                🔴 Críticos Rojos ({criticalRedAlerts.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('sectors')}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    activeTab === 'sectors'
                                        ? 'bg-sanatorio-primary text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <Building2 className="w-3.5 h-3.5" />
                                Resumen por Sector ({topSectors.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('legacy')}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    activeTab === 'legacy'
                                        ? 'bg-slate-700 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <History className="w-3.5 h-3.5" />
                                Pasivo Histórico &gt;30d ({legacyAlerts.length})
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative min-w-[220px]">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Buscar #ID, sector o resumen..."
                                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sanatorio-primary/20"
                                />
                            </div>

                            {activeTab !== 'sectors' && displayedAlerts.length > 0 && (
                                <button
                                    onClick={handleExportSlaPdf}
                                    disabled={isExportingPdf}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sanatorio-primary hover:bg-[#003f69] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                                >
                                    {isExportingPdf ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <FileDown className="w-3.5 h-3.5" />
                                    )}
                                    Exportar PDF ({displayedAlerts.length})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tab Content: Sectors Summary vs Case Cards */}
                    {activeTab === 'sectors' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {topSectors.map(sec => (
                                <div
                                    key={sec.sector}
                                    onClick={() => {
                                        setSearchQuery(sec.sector);
                                        setActiveTab(sec.recent > 0 ? 'recent' : 'legacy');
                                    }}
                                    className="bg-white p-4 rounded-xl border border-slate-200/90 hover:border-sanatorio-primary/40 cursor-pointer transition-all flex flex-col justify-between gap-2"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="font-bold text-xs text-slate-800">{sec.sector}</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                                            {sec.total} total
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                        {sec.recent > 0 && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-sanatorio-primary border border-blue-200">
                                                {sec.recent} recientes (≤30d)
                                            </span>
                                        )}
                                        {sec.red > 0 && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                🔴 {sec.red} críticos
                                            </span>
                                        )}
                                        {sec.legacy > 0 && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                                                {sec.legacy} históricos
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                            {displayedAlerts.length === 0 ? (
                                <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-xs text-slate-500">
                                    No hay alertas activas para este filtro.
                                </div>
                            ) : (
                                displayedAlerts.slice(0, 60).map(alert => {
                                    const urg = alert.report.ai_urgency || 'Amarillo';
                                    const urgBadge =
                                        urg === 'Rojo'
                                            ? 'bg-red-100 text-red-700 border-red-200'
                                            : urg === 'Amarillo'
                                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                                : 'bg-emerald-100 text-emerald-700 border-emerald-200';

                                    return (
                                        <div
                                            key={alert.report.id}
                                            className="bg-white rounded-xl p-3.5 border border-slate-200/90 hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                                        >
                                            <div className="space-y-1 flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-100 text-sanatorio-primary">
                                                        #{alert.report.tracking_id}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgBadge}`}>
                                                        {urg === 'Rojo' ? '🔴 Crítico' : urg === 'Amarillo' ? '🟡 Medio' : '🟢 Leve'}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-700 truncate">
                                                        {alert.report.sector || 'Sin sector'}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        • Ingreso: {new Date(alert.report.created_at).toLocaleDateString('es-AR')}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 line-clamp-1">
                                                    {alert.report.ai_summary || alert.report.content || 'Sin resumen registrado'}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                                <span
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap ${
                                                        alert.level === 'warning'
                                                            ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-red-50 text-red-700 border border-red-200'
                                                    }`}
                                                >
                                                    {alert.message}
                                                </span>

                                                <button
                                                    onClick={() => generateValidationPDF(alert.report)}
                                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-sanatorio-primary hover:text-white text-slate-600 transition-colors"
                                                    title="Descargar Ficha PDF del caso"
                                                >
                                                    <FileDown className="w-3.5 h-3.5" />
                                                </button>

                                                {alert.report.assigned_to && onResendWhatsApp && (
                                                    <button
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            handleResend(alert.report);
                                                        }}
                                                        disabled={sendingId === alert.report.id}
                                                        title={`Reenviar recordatorio WhatsApp a ${alert.report.assigned_to}`}
                                                        className={`p-1.5 rounded-lg transition-all ${
                                                            sentIds.has(alert.report.id)
                                                                ? 'bg-emerald-200 text-emerald-800'
                                                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                                                        }`}
                                                    >
                                                        {sendingId === alert.report.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : sentIds.has(alert.report.id) ? (
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <MessageCircle className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Small badge for table rows
export const SlaBadge = ({ report }: { report: Report }) => {
    const { level, daysElapsed } = getSlaLevel(report);

    if (report.status === 'resolved' || report.status === 'cancelled') {
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    }

    const colors = {
        ok: 'bg-green-100 text-green-700',
        warning: 'bg-amber-100 text-amber-700 animate-pulse',
        critical: 'bg-red-100 text-red-700 animate-pulse',
    };

    const displayValue = daysElapsed < 1 ? `${Math.round(daysElapsed * 24)}h` : `${Math.round(daysElapsed)}d`;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[level]}`}>
            {level === 'ok' ? '✓ OK' : displayValue}
        </span>
    );
};
