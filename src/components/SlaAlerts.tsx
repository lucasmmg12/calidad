import { AlertTriangle, Clock, AlertOctagon, CheckCircle2, HelpCircle, ChevronDown, ChevronUp, MessageCircle, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Report {
    id: string;
    tracking_id: string;
    sector: string;
    ai_urgency: string;
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
    level: 'critical' | 'warning' | 'ok';
    message: string;
}

const SLA_THRESHOLDS = {
    critical_case: 1,    // Rojo -> 1 día max
    normal_case: 2,      // Verde/Amarillo -> 2 días max
    warning_buffer: 0.5, // Alert 0.5 días before deadline
};

export const getSlaLevel = (report: Report): { level: 'critical' | 'warning' | 'ok'; daysElapsed: number } => {
    if (report.status === 'resolved' || report.status === 'cancelled') {
        return { level: 'ok', daysElapsed: 0 };
    }
    const daysElapsed = (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const threshold = report.ai_urgency === 'Rojo' ? SLA_THRESHOLDS.critical_case : SLA_THRESHOLDS.normal_case;

    if (daysElapsed > threshold) return { level: 'critical', daysElapsed };
    if (daysElapsed > threshold - SLA_THRESHOLDS.warning_buffer) return { level: 'warning', daysElapsed };
    return { level: 'ok', daysElapsed };
};

export const SlaAlertBanner = ({ reports, onResendWhatsApp }: Props) => {
    const [showInfo, setShowInfo] = useState(false);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());

    const alerts = useMemo(() => {
        const result: SlaAlert[] = [];
        reports.forEach(report => {
            if (report.status === 'resolved' || report.status === 'cancelled') return;
            const { level, daysElapsed } = getSlaLevel(report);
            if (level === 'ok') return;
            const threshold = report.ai_urgency === 'Rojo' ? SLA_THRESHOLDS.critical_case : SLA_THRESHOLDS.normal_case;
            const diffDays = Math.abs(daysElapsed - threshold);
            const displayValue = diffDays < 1 ? `${Math.round(diffDays * 24)}hs` : `${Math.round(diffDays)} día${Math.round(diffDays) !== 1 ? 's' : ''}`;
            result.push({
                report,
                daysElapsed,
                level,
                message: level === 'critical'
                    ? `${displayValue} fuera de plazo`
                    : `${displayValue} para vencer plazo`
            });
        });
        return result.sort((a, b) => {
            if (a.level === 'critical' && b.level !== 'critical') return -1;
            if (a.level !== 'critical' && b.level === 'critical') return 1;
            return b.daysElapsed - a.daysElapsed;
        });
    }, [reports]);

    const criticalCount = alerts.filter(a => a.level === 'critical').length;
    const warningCount = alerts.filter(a => a.level === 'warning').length;

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

    if (alerts.length === 0) return null;

    return (
        <div className={`rounded-2xl border p-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-500 ${criticalCount > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
            }`}>
            <div className="flex items-center gap-3 mb-3">
                {criticalCount > 0 ? (
                    <AlertOctagon className="w-5 h-5 text-red-600 animate-pulse" />
                ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <h3 className={`text-sm font-black uppercase tracking-wider ${criticalCount > 0 ? 'text-red-700' : 'text-amber-700'
                    }`}>
                    Alertas de Tiempo de Respuesta
                </h3>
                <button
                    onClick={() => setShowInfo(!showInfo)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${showInfo ? 'bg-white/80 text-gray-600' : 'bg-white/50 text-gray-400 hover:bg-white/70'
                        }`}
                    title="¿Qué es el Tiempo de Respuesta?"
                >
                    <HelpCircle className="w-3.5 h-3.5" />
                    ¿Qué es esto?
                    {showInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <div className="flex items-center gap-2 ml-auto">
                    {criticalCount > 0 && (
                        <span className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-black rounded-full">
                            {criticalCount} VENCIDOS
                        </span>
                    )}
                    {warningCount > 0 && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full">
                            {warningCount} POR VENCER
                        </span>
                    )}
                </div>
            </div>

            {showInfo && (
                <div className="mb-3 p-4 bg-white/70 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    <p className="font-bold text-gray-800 text-sm">📋 Tiempo de Respuesta (Acuerdo de Nivel de Servicio)</p>
                    <p>Es el <strong>tiempo máximo</strong> que tiene un responsable para responder un hallazgo desde que fue reportado. Funciona como el triage de una guardia: cada caso tiene un plazo según su urgencia.</p>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="bg-red-50 p-2 rounded-lg text-center">
                            <p className="font-black text-red-600">🔴 Crítico</p>
                            <p className="text-red-700 font-bold">1 día máx.</p>
                        </div>
                        <div className="bg-amber-50 p-2 rounded-lg text-center">
                            <p className="font-black text-amber-600">🟡 Medio</p>
                            <p className="text-amber-700 font-bold">2 días máx.</p>
                        </div>
                        <div className="bg-green-50 p-2 rounded-lg text-center">
                            <p className="font-black text-green-600">🟢 Leve</p>
                            <p className="text-green-700 font-bold">2 días máx.</p>
                        </div>
                    </div>
                    <p className="mt-2"><strong>"X días fuera de plazo"</strong> = días que pasaron desde que venció el tiempo límite. <strong>"X días para vencer plazo"</strong> = días que quedan antes de que venza el tiempo de respuesta.</p>
                </div>
            )}

            <div className="space-y-2 max-h-40 overflow-y-auto">
                {alerts.slice(0, 8).map(alert => (
                    <div
                        key={alert.report.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium ${alert.level === 'critical' ? 'bg-red-100/60 text-red-800' : 'bg-amber-100/60 text-amber-800'
                            }`}
                    >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-bold">{alert.report.tracking_id}</span>
                        <span className="text-gray-500">•</span>
                        <span className="truncate">{alert.report.sector}</span>
                        <span className="ml-auto font-black whitespace-nowrap">
                            {alert.message}
                        </span>
                        {/* WhatsApp Resend Button */}
                        {alert.report.assigned_to && onResendWhatsApp && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleResend(alert.report);
                                }}
                                disabled={sendingId === alert.report.id}
                                title={`Reenviar WhatsApp a ${alert.report.assigned_to}`}
                                className={`shrink-0 p-1.5 rounded-lg transition-all ${sentIds.has(alert.report.id)
                                    ? 'bg-green-200 text-green-700'
                                    : 'bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 hover:shadow-sm'
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
                ))}
            </div>
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
