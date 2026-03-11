import { useMemo } from 'react';
import { Send, ArrowRight } from 'lucide-react';
import { SECTOR_OPTIONS } from '../constants/sectors';

interface SectorFlowMetricsProps {
    reports: any[];
}

/**
 * SectorFlowMetrics
 * Simple metric: for each reporter_sector, show total reports emitted
 * and a breakdown of destination sectors.
 */
export const SectorFlowMetrics = ({ reports }: SectorFlowMetricsProps) => {

    const getSectorLabel = (value: string): string => {
        return SECTOR_OPTIONS.find(s => s.value === value)?.label || value || 'Sin asignar';
    };

    // Group reports by reporter_sector, then by destination sector
    const reporterGroups = useMemo(() => {
        const validReports = reports.filter(r => r.reporter_sector && r.sector);

        const groupMap: Record<string, Record<string, number>> = {};

        validReports.forEach(r => {
            const reporter = r.reporter_sector;
            const target = r.sector;
            if (!groupMap[reporter]) groupMap[reporter] = {};
            groupMap[reporter][target] = (groupMap[reporter][target] || 0) + 1;
        });

        return Object.entries(groupMap)
            .map(([sector, destinations]) => {
                const total = Object.values(destinations).reduce((a, b) => a + b, 0);
                const sortedDest = Object.entries(destinations)
                    .map(([s, c]) => ({ sector: s, count: c }))
                    .sort((a, b) => b.count - a.count);
                return { sector, total, destinations: sortedDest };
            })
            .sort((a, b) => b.total - a.total);
    }, [reports]);

    if (reporterGroups.length === 0) {
        return (
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-500" />
                    Reportes Emitidos por Sector
                </h3>
                <p className="text-sm text-gray-400 text-center py-8">
                    No hay reportes con sector de origen asignado.
                </p>
            </div>
        );
    }

    // Color palette for destination bars
    const barColors = [
        'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
        'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
        'bg-pink-500', 'bg-orange-500', 'bg-sky-500', 'bg-fuchsia-500',
    ];

    return (
        <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-500" />
                Reportes Emitidos por Sector
            </h3>
            <p className="text-xs text-gray-400 mb-6">
                Cuántos reportes realizó cada sector y a quiénes fueron dirigidos.
            </p>

            <div className="space-y-6">
                {reporterGroups.map((group) => (
                    <div key={group.sector} className="border border-gray-100 rounded-2xl overflow-hidden">
                        {/* Sector header */}
                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-5 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0">
                                    <Send className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">
                                        {getSectorLabel(group.sector)}
                                    </p>
                                    <p className="text-[11px] text-gray-500">
                                        Dirigidos a {group.destinations.length} {group.destinations.length === 1 ? 'sector' : 'sectores'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-3xl font-black text-indigo-700">{group.total}</p>
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">reportes</p>
                            </div>
                        </div>

                        {/* Destination list */}
                        <div className="px-5 py-4 space-y-3">
                            {group.destinations.map((dest, dIdx) => {
                                const pct = group.total > 0 ? Math.round((dest.count / group.total) * 100) : 0;
                                const maxCount = group.destinations[0]?.count || 1;
                                const barWidth = (dest.count / maxCount) * 100;

                                return (
                                    <div key={dest.sector}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                                                <span className="text-xs font-medium text-gray-600 truncate">
                                                    {getSectorLabel(dest.sector)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-sm font-black text-gray-800">{dest.count}</span>
                                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-medium">
                                                    {pct}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${barColors[dIdx % barColors.length]}`}
                                                style={{ width: `${barWidth}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
