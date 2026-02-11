import { useState, useMemo } from 'react';
import { TrendingUp, Repeat2, Flame, ChevronDown } from 'lucide-react';

interface Report {
    id: string;
    created_at: string;
    sector: string;
    ai_urgency: string;
    ai_category: string;
    status: string;
    resolved_at?: string;
}

interface Props {
    reports: Report[];
}

export const AdvancedAnalytics = ({ reports }: Props) => {
    const [trendPeriod, setTrendPeriod] = useState<'week' | 'month'>('week');
    const [activeTab, setActiveTab] = useState<'trends' | 'heatmap' | 'recurrence'>('trends');

    // ────────────────────────────────────────
    // TRENDS: Group reports by week or month
    // ────────────────────────────────────────
    const trendData = useMemo(() => {
        const groups: Record<string, number> = {};
        reports.forEach(r => {
            const d = new Date(r.created_at);
            let key: string;
            if (trendPeriod === 'week') {
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay());
                key = weekStart.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
            } else {
                key = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
            }
            groups[key] = (groups[key] || 0) + 1;
        });
        const entries = Object.entries(groups).slice(-12);
        const maxVal = Math.max(...entries.map(([, v]) => v), 1);
        return { entries, maxVal };
    }, [reports, trendPeriod]);

    // ────────────────────────────────────────
    // HEATMAP: Sector × Day of Week
    // ────────────────────────────────────────
    const heatmapData = useMemo(() => {
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const sectorSet = new Set<string>();
        const matrix: Record<string, Record<number, number>> = {};

        reports.forEach(r => {
            const sector = r.sector || 'Otros';
            const day = new Date(r.created_at).getDay();
            sectorSet.add(sector);
            if (!matrix[sector]) matrix[sector] = {};
            matrix[sector][day] = (matrix[sector][day] || 0) + 1;
        });

        const sectors = Array.from(sectorSet).sort();
        let globalMax = 0;
        sectors.forEach(s => {
            for (let d = 0; d < 7; d++) {
                const val = matrix[s]?.[d] || 0;
                if (val > globalMax) globalMax = val;
            }
        });

        return { sectors, days, matrix, globalMax };
    }, [reports]);

    // ────────────────────────────────────────
    // RECURRENCE: Same category in same sector
    // ────────────────────────────────────────
    const recurrenceData = useMemo(() => {
        const combos: Record<string, { count: number; sector: string; category: string }> = {};
        reports.forEach(r => {
            const key = `${r.sector}__${r.ai_category || 'Sin clasificar'}`;
            if (!combos[key]) combos[key] = { count: 0, sector: r.sector || 'Otros', category: r.ai_category || 'Sin clasificar' };
            combos[key].count++;
        });
        return Object.values(combos)
            .filter(c => c.count >= 2)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [reports]);

    const heatColor = (val: number, max: number) => {
        if (max === 0) return 'bg-gray-50';
        const intensity = val / max;
        if (intensity === 0) return 'bg-gray-50 text-gray-300';
        if (intensity < 0.25) return 'bg-blue-50 text-blue-600';
        if (intensity < 0.5) return 'bg-blue-100 text-blue-700';
        if (intensity < 0.75) return 'bg-orange-100 text-orange-700';
        return 'bg-red-100 text-red-700 font-bold';
    };

    const tabs = [
        { id: 'trends' as const, label: 'Tendencias', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'heatmap' as const, label: 'Mapa de Calor', icon: <Flame className="w-4 h-4" /> },
        { id: 'recurrence' as const, label: 'Recurrencia', icon: <Repeat2 className="w-4 h-4" /> },
    ];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Tab Header */}
            <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-100">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === tab.id
                            ? 'bg-white text-sanatorio-primary shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-6">
                {/* ── TRENDS ── */}
                {activeTab === 'trends' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-gray-800">Evolución de Incidentes</h3>
                                <p className="text-xs text-gray-400 mt-1">Últimos 12 periodos</p>
                            </div>
                            <div className="relative">
                                <select
                                    value={trendPeriod}
                                    onChange={(e) => setTrendPeriod(e.target.value as 'week' | 'month')}
                                    className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-gray-700 cursor-pointer"
                                >
                                    <option value="week">Por Semana</option>
                                    <option value="month">Por Mes</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Bar chart */}
                        <div className="flex items-end gap-2 h-48">
                            {trendData.entries.map(([label, value], i) => {
                                const height = (value / trendData.maxVal) * 100;
                                const isLast = i === trendData.entries.length - 1;
                                return (
                                    <div key={label} className="flex-1 flex flex-col items-center gap-1 group">
                                        <span className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {value}
                                        </span>
                                        <div
                                            className={`w-full rounded-t-lg transition-all duration-500 ${isLast ? 'bg-sanatorio-primary' : 'bg-sanatorio-primary/30'
                                                } group-hover:bg-sanatorio-primary/70`}
                                            style={{ height: `${Math.max(height, 4)}%` }}
                                        />
                                        <span className="text-[9px] text-gray-400 font-medium mt-1 truncate w-full text-center">
                                            {label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Trend indicator */}
                        {trendData.entries.length >= 2 && (
                            <div className="mt-4 flex items-center gap-2">
                                {(() => {
                                    const vals = trendData.entries.map(([, v]) => v);
                                    const last = vals[vals.length - 1];
                                    const prev = vals[vals.length - 2];
                                    const change = prev > 0 ? Math.round(((last - prev) / prev) * 100) : 0;
                                    const isUp = change > 0;
                                    return (
                                        <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${isUp ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                            }`}>
                                            {isUp ? '↑' : '↓'} {Math.abs(change)}% vs periodo anterior
                                        </span>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}

                {/* ── HEATMAP ── */}
                {activeTab === 'heatmap' && (
                    <div>
                        <h3 className="font-bold text-gray-800 mb-1">Mapa de Calor: Sector × Día</h3>
                        <p className="text-xs text-gray-400 mb-4">Concentración de incidentes por día de la semana</p>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr>
                                        <th className="text-left py-2 px-3 text-gray-500 font-bold">Sector</th>
                                        {heatmapData.days.map(day => (
                                            <th key={day} className="text-center py-2 px-2 text-gray-500 font-bold">{day}</th>
                                        ))}
                                        <th className="text-center py-2 px-3 text-gray-500 font-bold">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {heatmapData.sectors.map(sector => {
                                        const total = Array.from({ length: 7 }, (_, d) => heatmapData.matrix[sector]?.[d] || 0).reduce((a, b) => a + b, 0);
                                        return (
                                            <tr key={sector} className="border-t border-gray-50">
                                                <td className="py-2 px-3 font-bold text-gray-700 truncate max-w-32">{sector}</td>
                                                {Array.from({ length: 7 }, (_, d) => {
                                                    const val = heatmapData.matrix[sector]?.[d] || 0;
                                                    return (
                                                        <td key={d} className="p-1">
                                                            <div className={`text-center py-2 rounded-lg font-bold ${heatColor(val, heatmapData.globalMax)}`}>
                                                                {val || '·'}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="text-center py-2 px-3 font-black text-gray-800">{total}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── RECURRENCE ── */}
                {activeTab === 'recurrence' && (
                    <div>
                        <h3 className="font-bold text-gray-800 mb-1">Análisis de Recurrencia</h3>
                        <p className="text-xs text-gray-400 mb-4">Problemas que se repiten en el mismo sector (≥2 ocurrencias)</p>

                        {recurrenceData.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Repeat2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">No se detectaron patrones recurrentes</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recurrenceData.map((item, i) => {
                                    const maxCount = recurrenceData[0].count;
                                    const width = (item.count / maxCount) * 100;
                                    return (
                                        <div key={i} className="group">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white ${item.count >= 5 ? 'bg-red-500' : item.count >= 3 ? 'bg-orange-500' : 'bg-yellow-500'
                                                        }`}>
                                                        {item.count}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-700">{item.sector}</span>
                                                    <span className="text-[10px] text-gray-400">→</span>
                                                    <span className="text-xs text-gray-500">{item.category}</span>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.count >= 5 ? 'bg-red-50 text-red-600' : item.count >= 3 ? 'bg-orange-50 text-orange-600' : 'bg-yellow-50 text-yellow-600'
                                                    }`}>
                                                    {item.count}x repetido
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full transition-all duration-700 ${item.count >= 5 ? 'bg-red-400' : item.count >= 3 ? 'bg-orange-400' : 'bg-yellow-400'
                                                        }`}
                                                    style={{ width: `${width}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
