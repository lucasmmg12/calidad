import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import {
    BarChart3,
    PieChart,
    Activity,
    TrendingUp,
    Clock,
    CheckCircle2,
    AlertOctagon,
    ArrowUpRight,
    Zap
} from 'lucide-react';

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

    if (loading) {
        return <div className="p-10 flex justify-center"><div className="w-8 h-8 border-4 border-sanatorio-primary border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <Activity className="text-sanatorio-primary" />
                    Métricas de Calidad
                </h1>
                <p className="text-gray-500">Análisis en tiempo real de incidentes y tiempos de respuesta.</p>
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
