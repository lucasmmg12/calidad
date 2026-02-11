import { AlertTriangle, Clock, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

interface Report {
    id: string;
    tracking_id: string;
    sector: string;
    ai_urgency: string;
    status: string;
    created_at: string;
    assigned_to_phone?: string;
}

interface Props {
    reports: Report[];
}

interface SlaAlert {
    report: Report;
    hoursElapsed: number;
    level: 'critical' | 'warning' | 'ok';
    message: string;
}

const SLA_THRESHOLDS = {
    critical_case: 24,   // Rojo -> 24hs max
    normal_case: 48,     // Verde/Amarillo -> 48hs max
    warning_buffer: 12,  // Alert 12hs before deadline
};

export const getSlaLevel = (report: Report): { level: 'critical' | 'warning' | 'ok'; hoursElapsed: number } => {
    if (report.status === 'resolved' || report.status === 'cancelled') {
        return { level: 'ok', hoursElapsed: 0 };
    }
    const hoursElapsed = (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60);
    const threshold = report.ai_urgency === 'Rojo' ? SLA_THRESHOLDS.critical_case : SLA_THRESHOLDS.normal_case;

    if (hoursElapsed > threshold) return { level: 'critical', hoursElapsed };
    if (hoursElapsed > threshold - SLA_THRESHOLDS.warning_buffer) return { level: 'warning', hoursElapsed };
    return { level: 'ok', hoursElapsed };
};

export const SlaAlertBanner = ({ reports }: Props) => {
    const alerts = useMemo(() => {
        const result: SlaAlert[] = [];
        reports.forEach(report => {
            if (report.status === 'resolved' || report.status === 'cancelled') return;
            const { level, hoursElapsed } = getSlaLevel(report);
            if (level === 'ok') return;
            const threshold = report.ai_urgency === 'Rojo' ? SLA_THRESHOLDS.critical_case : SLA_THRESHOLDS.normal_case;
            result.push({
                report,
                hoursElapsed,
                level,
                message: level === 'critical'
                    ? `${Math.round(hoursElapsed - threshold)}hs fuera de SLA`
                    : `${Math.round(threshold - hoursElapsed)}hs para vencer SLA`
            });
        });
        return result.sort((a, b) => {
            if (a.level === 'critical' && b.level !== 'critical') return -1;
            if (a.level !== 'critical' && b.level === 'critical') return 1;
            return b.hoursElapsed - a.hoursElapsed;
        });
    }, [reports]);

    const criticalCount = alerts.filter(a => a.level === 'critical').length;
    const warningCount = alerts.filter(a => a.level === 'warning').length;

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
                    Alertas de SLA
                </h3>
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
                    </div>
                ))}
            </div>
        </div>
    );
};

// Small badge for table rows
export const SlaBadge = ({ report }: { report: Report }) => {
    const { level, hoursElapsed } = getSlaLevel(report);

    if (report.status === 'resolved' || report.status === 'cancelled') {
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    }

    const colors = {
        ok: 'bg-green-100 text-green-700',
        warning: 'bg-amber-100 text-amber-700 animate-pulse',
        critical: 'bg-red-100 text-red-700 animate-pulse',
    };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${colors[level]}`}>
            {level === 'ok' ? '✓ OK' : `${Math.round(hoursElapsed)}h`}
        </span>
    );
};
