import { useState, useMemo } from 'react';
import {
    ArrowRight,
    Building2,
    ChevronDown,
    ChevronRight,
    Send,
    Target,
    TrendingUp,
    Filter,
} from 'lucide-react';
import { SECTOR_OPTIONS } from '../constants/sectors';

interface SectorFlowMetricsProps {
    reports: any[];
    userSectors?: string[];
    canViewAll?: boolean;
}

interface FlowEntry {
    reporterSector: string;
    targetSector: string;
    count: number;
}

/**
 * SectorFlowMetrics — Metric: "¿Cuántos reportes emitió cada sector y a quiénes van dirigidos?"
 * Visualizes the cross-reference between reporter_sector (origin) and sector (destination).
 */
export const SectorFlowMetrics = ({ reports, userSectors, canViewAll }: SectorFlowMetricsProps) => {
    const [expandedReporter, setExpandedReporter] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'reporter' | 'matrix'>('reporter');
    const [filterSector, setFilterSector] = useState<string>('');

    const getSectorLabel = (value: string): string => {
        return SECTOR_OPTIONS.find(s => s.value === value)?.label || value || 'Sin asignar';
    };

    const getSectorShortLabel = (value: string): string => {
        const label = SECTOR_OPTIONS.find(s => s.value === value)?.label || value || 'Sin asignar';
        // Extract the short code (e.g., "📞 CC – Contact Center" → "CC")
        const match = label.match(/^.+?\s(.+?)\s–/);
        return match ? match[1] : label.substring(0, 12);
    };

    // ─── Core computation: cross-reference reporter_sector → sector ───
    const { flowData, reporterStats, topDestinations, totalWithReporter } = useMemo(() => {
        // Only consider reports that have a reporter_sector set
        const validReports = reports.filter(r => r.reporter_sector && r.sector);

        const flowMap: Record<string, Record<string, number>> = {};
        const reporterTotals: Record<string, number> = {};
        const destinationTotals: Record<string, number> = {};

        validReports.forEach(r => {
            const reporter = r.reporter_sector;
            const target = r.sector;

            if (!flowMap[reporter]) flowMap[reporter] = {};
            flowMap[reporter][target] = (flowMap[reporter][target] || 0) + 1;

            reporterTotals[reporter] = (reporterTotals[reporter] || 0) + 1;
            destinationTotals[target] = (destinationTotals[target] || 0) + 1;
        });

        // Build flow entries
        const flowData: FlowEntry[] = [];
        Object.entries(flowMap).forEach(([reporter, targets]) => {
            Object.entries(targets).forEach(([target, count]) => {
                flowData.push({ reporterSector: reporter, targetSector: target, count });
            });
        });

        // Reporter stats sorted by total
        const reporterStats = Object.entries(reporterTotals)
            .map(([sector, total]) => ({
                sector,
                total,
                destinations: flowMap[sector] || {},
                destinationCount: Object.keys(flowMap[sector] || {}).length
            }))
            .sort((a, b) => b.total - a.total);

        // Top destinations
        const topDestinations = Object.entries(destinationTotals)
            .map(([sector, total]) => ({ sector, total }))
            .sort((a, b) => b.total - a.total);

        return {
            flowData,
            reporterStats,
            topDestinations,
            totalWithReporter: validReports.length
        };
    }, [reports]);

    // Filter reporter stats based on user sectors or search
    const filteredReporterStats = useMemo(() => {
        let filtered = reporterStats;

        if (filterSector) {
            filtered = filtered.filter(r =>
                getSectorLabel(r.sector).toLowerCase().includes(filterSector.toLowerCase())
            );
        }

        // If not admin/directivo, only show user's sectors
        if (!canViewAll && userSectors && userSectors.length > 0) {
            filtered = filtered.filter(r => userSectors.includes(r.sector));
        }

        return filtered;
    }, [reporterStats, filterSector, canViewAll, userSectors]);

    // Color palette for destination bars
    const destinationColors = [
        'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
        'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
        'bg-pink-500', 'bg-orange-500', 'bg-sky-500', 'bg-fuchsia-500',
    ];

    if (totalWithReporter === 0) {
        return (
            <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-500" />
                    Flujo de Reportes por Sector
                </h3>
                <div className="text-center py-12 text-gray-400">
                    <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No hay reportes con sector de origen asignado.</p>
                    <p className="text-xs mt-1">Los reportes necesitan tener el campo "Sector al que perteneces" completado.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-3xl shadow-card border border-gray-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Send className="w-5 h-5 text-indigo-500" />
                        Flujo de Reportes por Sector
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                        ¿Cuántos reportes emite cada sector y a quiénes van dirigidos?
                    </p>
                </div>

                {/* View toggle + Filter */}
                <div className="flex items-center gap-3">
                    {/* Search filter */}
                    <div className="relative">
                        <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar sector..."
                            value={filterSector}
                            onChange={(e) => setFilterSector(e.target.value)}
                            className="pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-sanatorio-primary/30 focus:ring-2 focus:ring-sanatorio-primary/10 outline-none transition-all w-48"
                        />
                    </div>

                    {/* View mode tabs */}
                    <div className="flex bg-gray-100 rounded-xl p-0.5">
                        <button
                            onClick={() => setViewMode('reporter')}
                            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${viewMode === 'reporter'
                                ? 'bg-white text-sanatorio-primary shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Por Sector
                        </button>
                        <button
                            onClick={() => setViewMode('matrix')}
                            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${viewMode === 'matrix'
                                ? 'bg-white text-sanatorio-primary shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Matriz
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Reportes con Origen</p>
                    <p className="text-2xl font-black text-indigo-700 mt-1">{totalWithReporter}</p>
                    <p className="text-[10px] text-indigo-400 mt-0.5">de {reports.length} totales</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Sectores Emisores</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{reporterStats.length}</p>
                    <p className="text-[10px] text-emerald-400 mt-0.5">sectores reportando</p>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 p-4 rounded-2xl border border-violet-100">
                    <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Mayor Emisor</p>
                    <p className="text-sm font-black text-violet-700 mt-1 truncate" title={getSectorLabel(reporterStats[0]?.sector || '')}>
                        {getSectorShortLabel(reporterStats[0]?.sector || '')}
                    </p>
                    <p className="text-[10px] text-violet-400 mt-0.5">{reporterStats[0]?.total || 0} reportes</p>
                </div>
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-4 rounded-2xl border border-rose-100">
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Mayor Receptor</p>
                    <p className="text-sm font-black text-rose-700 mt-1 truncate" title={getSectorLabel(topDestinations[0]?.sector || '')}>
                        {getSectorShortLabel(topDestinations[0]?.sector || '')}
                    </p>
                    <p className="text-[10px] text-rose-400 mt-0.5">{topDestinations[0]?.total || 0} recibidos</p>
                </div>
            </div>

            {/* ═══════════ VIEW: By Reporter Sector ═══════════ */}
            {viewMode === 'reporter' && (
                <div className="space-y-2">
                    {filteredReporterStats.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                            <p className="text-sm">No se encontraron sectores con ese criterio.</p>
                        </div>
                    )}

                    {filteredReporterStats.map((reporter, idx) => {
                        const isExpanded = expandedReporter === reporter.sector;
                        const maxCount = filteredReporterStats[0]?.total || 1;
                        const barWidth = (reporter.total / maxCount) * 100;

                        // Sorted destination breakdown
                        const destEntries = Object.entries(reporter.destinations)
                            .map(([sector, count]) => ({ sector, count }))
                            .sort((a, b) => b.count - a.count);

                        return (
                            <div key={reporter.sector} className="rounded-xl border border-gray-100 overflow-hidden transition-all duration-300">
                                {/* Reporter Row — Clickable */}
                                <button
                                    onClick={() => setExpandedReporter(isExpanded ? null : reporter.sector)}
                                    className={`w-full p-4 flex items-center gap-4 transition-all duration-200 hover:bg-indigo-50/50 ${isExpanded ? 'bg-indigo-50/70 border-b border-indigo-100' : 'bg-white'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${isExpanded ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-600'
                                        }`}>
                                        <span className="text-xs font-black">{idx + 1}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-end mb-1.5">
                                            <span className="text-sm font-medium text-gray-700 truncate">
                                                {getSectorLabel(reporter.sector)}
                                            </span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs font-bold text-gray-500">
                                                    {reporter.total} reportes
                                                </span>
                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                                                    → {reporter.destinationCount} {reporter.destinationCount === 1 ? 'sector' : 'sectores'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ease-out ${isExpanded
                                                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                                                    : 'bg-indigo-400/70'
                                                    }`}
                                                style={{ width: `${barWidth}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    </div>
                                </button>

                                {/* Expanded: Destination Breakdown */}
                                {isExpanded && (
                                    <div className="p-5 bg-gradient-to-b from-indigo-50/30 to-white animate-in slide-in-from-top-2 duration-300 space-y-4">
                                        {/* Summary header */}
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Building2 className="w-3.5 h-3.5" />
                                            <span className="font-bold">{getSectorShortLabel(reporter.sector)}</span>
                                            <ArrowRight className="w-3 h-3 text-indigo-400" />
                                            <span>Reportes dirigidos a:</span>
                                        </div>

                                        {/* Destination bars */}
                                        <div className="space-y-2">
                                            {destEntries.map((dest, dIdx) => {
                                                const destMax = destEntries[0]?.count || 1;
                                                const destBarWidth = (dest.count / destMax) * 100;
                                                const pct = reporter.total > 0 ? Math.round((dest.count / reporter.total) * 100) : 0;

                                                return (
                                                    <div key={dest.sector} className="group">
                                                        <div className="flex items-center gap-3">
                                                            {/* Target icon */}
                                                            <Target className={`w-3.5 h-3.5 shrink-0 ${dIdx === 0 ? 'text-rose-500' : 'text-gray-300'}`} />

                                                            {/* Bar */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs font-medium text-gray-600 truncate">
                                                                        {getSectorLabel(dest.sector)}
                                                                    </span>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        <span className="text-xs font-bold text-gray-700">
                                                                            {dest.count}
                                                                        </span>
                                                                        <span className="text-[10px] text-gray-400">
                                                                            ({pct}%)
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-500 ${destinationColors[dIdx % destinationColors.length]}`}
                                                                        style={{ width: `${destBarWidth}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Bottom insight */}
                                        <div className="bg-white border border-gray-100 rounded-xl p-3 mt-2">
                                            <p className="text-[11px] text-gray-500">
                                                💡 <span className="font-bold">{getSectorShortLabel(reporter.sector)}</span> dirigió el{' '}
                                                <span className="font-bold text-indigo-600">
                                                    {destEntries[0] && reporter.total > 0
                                                        ? Math.round((destEntries[0].count / reporter.total) * 100)
                                                        : 0}%
                                                </span>{' '}
                                                de sus reportes a{' '}
                                                <span className="font-bold text-gray-700">{getSectorShortLabel(destEntries[0]?.sector || '')}</span>
                                                {destEntries.length > 1 && (
                                                    <>, seguido por <span className="font-bold text-gray-700">{getSectorShortLabel(destEntries[1]?.sector || '')}</span> ({destEntries[1]?.count || 0})</>
                                                )}.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══════════ VIEW: Matrix ═══════════ */}
            {viewMode === 'matrix' && (() => {
                // Get unique reporters & targets for the matrix
                const reporters = filteredReporterStats.map(r => r.sector);
                const allTargets = new Set<string>();
                filteredReporterStats.forEach(r => {
                    Object.keys(r.destinations).forEach(t => allTargets.add(t));
                });
                const targets = Array.from(allTargets);

                // Max value for heat-map intensity
                const maxVal = Math.max(...flowData.map(f => f.count), 1);

                return (
                    <div className="overflow-x-auto -mx-2 px-2">
                        {reporters.length === 0 || targets.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <p className="text-sm">No hay datos suficientes para la matriz.</p>
                            </div>
                        ) : (
                            <div>
                                {/* Legend */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <ChevronRight className="w-3 h-3" />
                                        <span className="font-bold">Filas:</span> Sector Emisor
                                        <span className="mx-2 text-gray-300">|</span>
                                        <span className="font-bold">Columnas:</span> Sector Destino
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                        <div className="w-4 h-3 rounded bg-indigo-100"></div>
                                        <span>Bajo</span>
                                        <div className="w-4 h-3 rounded bg-indigo-300"></div>
                                        <span>Medio</span>
                                        <div className="w-4 h-3 rounded bg-indigo-600"></div>
                                        <span>Alto</span>
                                    </div>
                                </div>

                                <table className="w-full text-xs border-collapse min-w-[500px]">
                                    <thead>
                                        <tr>
                                            <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 min-w-[140px]">
                                                Emisor ↓ / Destino →
                                            </th>
                                            {targets.map(t => (
                                                <th
                                                    key={t}
                                                    className="px-2 py-2 text-center text-[9px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 min-w-[60px]"
                                                    title={getSectorLabel(t)}
                                                >
                                                    <span className="block truncate max-w-[70px]">
                                                        {getSectorShortLabel(t)}
                                                    </span>
                                                </th>
                                            ))}
                                            <th className="px-3 py-2 text-center text-[10px] font-bold text-indigo-500 uppercase tracking-wider border-b border-indigo-100 bg-indigo-50/50">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reporters.map((reporter, rIdx) => {
                                            const rData = filteredReporterStats.find(r => r.sector === reporter);
                                            if (!rData) return null;

                                            return (
                                                <tr key={reporter} className={`${rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-indigo-50/30 transition-colors`}>
                                                    <td
                                                        className="sticky left-0 bg-inherit px-3 py-2.5 font-medium text-gray-700 border-b border-gray-50 truncate max-w-[180px]"
                                                        title={getSectorLabel(reporter)}
                                                    >
                                                        {getSectorLabel(reporter)}
                                                    </td>
                                                    {targets.map(target => {
                                                        const count = rData.destinations[target] || 0;
                                                        const intensity = count / maxVal;
                                                        let cellBg = '';
                                                        let cellText = 'text-gray-300';

                                                        if (count > 0) {
                                                            if (intensity >= 0.7) {
                                                                cellBg = 'bg-indigo-600';
                                                                cellText = 'text-white font-bold';
                                                            } else if (intensity >= 0.4) {
                                                                cellBg = 'bg-indigo-300';
                                                                cellText = 'text-indigo-900 font-bold';
                                                            } else {
                                                                cellBg = 'bg-indigo-100';
                                                                cellText = 'text-indigo-700 font-medium';
                                                            }
                                                        }

                                                        return (
                                                            <td
                                                                key={target}
                                                                className={`px-2 py-2.5 text-center border-b border-gray-50 ${cellText}`}
                                                                title={`${getSectorShortLabel(reporter)} → ${getSectorShortLabel(target)}: ${count}`}
                                                            >
                                                                <span className={`inline-flex items-center justify-center w-8 h-6 rounded-md text-[11px] ${cellBg || ''}`}>
                                                                    {count > 0 ? count : '–'}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-3 py-2.5 text-center border-b border-indigo-50 bg-indigo-50/30">
                                                        <span className="text-sm font-black text-indigo-700">{rData.total}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>

                                    {/* Footer: column totals */}
                                    <tfoot>
                                        <tr className="bg-gray-50 border-t-2 border-gray-200">
                                            <td className="sticky left-0 bg-gray-50 px-3 py-2.5 font-bold text-[10px] text-gray-500 uppercase tracking-wider">
                                                Total Recibidos
                                            </td>
                                            {targets.map(target => {
                                                const total = filteredReporterStats.reduce((sum, r) => sum + (r.destinations[target] || 0), 0);
                                                return (
                                                    <td key={target} className="px-2 py-2.5 text-center">
                                                        <span className="text-xs font-black text-gray-600">{total}</span>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-2.5 text-center bg-indigo-100/50">
                                                <span className="text-sm font-black text-indigo-800">{totalWithReporter}</span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Bottom: Top 5 destinations summary */}
            <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Top 5 Sectores más reportados (destino)
                </h4>
                <div className="flex flex-wrap gap-2">
                    {topDestinations.slice(0, 5).map((dest, idx) => (
                        <div key={dest.sector} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 hover:bg-gray-100 transition-colors">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white ${idx === 0 ? 'bg-rose-500' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-amber-500' : 'bg-gray-400'
                                }`}>
                                {idx + 1}
                            </span>
                            <span className="text-xs font-medium text-gray-700 truncate max-w-[180px]" title={getSectorLabel(dest.sector)}>
                                {getSectorLabel(dest.sector)}
                            </span>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                                {dest.total}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
