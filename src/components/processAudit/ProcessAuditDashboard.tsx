import React from 'react';
import type {
    ProcessAuditReport,
    AuditSchedule
} from '../../types/processAudit';
import {
    CheckCircle2,
    AlertTriangle,
    TrendingUp,
    FileSpreadsheet,
    Eye,
    ShieldAlert,
    ExternalLink,
    Clock
} from 'lucide-react';
import { SECTOR_OPTIONS } from '../../constants/sectors';

interface ProcessAuditDashboardProps {
    reports: ProcessAuditReport[];
    schedules: AuditSchedule[];
    selectedSector: string;
    simulatedRole: 'admin' | 'responsable';
    onSelectReport: (report: ProcessAuditReport) => void;
    onStartNewAuditForSector: (sectorId: string) => void;
    onLinkDoraClick: (reportId: string, findingType: 'om' | 'desvio', findingId: string) => void;
}

export const ProcessAuditDashboard: React.FC<ProcessAuditDashboardProps> = ({
    reports,
    selectedSector,
    simulatedRole,
    onSelectReport,
    onStartNewAuditForSector,
    onLinkDoraClick
}) => {
    // Filtrar reportes según el sector seleccionado
    const filteredReports = selectedSector === 'ALL'
        ? reports
        : reports.filter(r => r.sectorId === selectedSector);

    // Métricas clave
    const totalAudits = filteredReports.length;
    const avgScore = totalAudits > 0
        ? Math.round(filteredReports.reduce((acc, r) => acc + r.scorePercent, 0) / totalAudits)
        : 0;

    const allDesvios = filteredReports.flatMap(r => r.desvios.map(d => ({ ...d, reportId: r.id, sectorName: r.sectorName })));
    const openDesvios = allDesvios.filter(d => d.status !== 'resuelto');

    const allOMs = filteredReports.flatMap(r => r.oportunidadesMejora.map(o => ({ ...o, reportId: r.id, sectorName: r.sectorName })));

    // Obtener lista de sectores únicos presentes en los reportes o catálogo
    const sectorRanking = SECTOR_OPTIONS.map(sec => {
        const secReports = reports.filter(r => r.sectorId === sec.value);
        if (secReports.length === 0) return null;
        const avg = Math.round(secReports.reduce((a, b) => a + b.scorePercent, 0) / secReports.length);
        const lastAudit = secReports[0];
        return {
            sectorId: sec.value,
            sectorLabel: sec.label,
            avgScore: avg,
            auditCount: secReports.length,
            lastAuditDate: lastAudit?.auditDate,
            hasOpenDesvio: secReports.some(r => r.desvios.some(d => d.status !== 'resuelto'))
        };
    }).filter(Boolean) as {
        sectorId: string;
        sectorLabel: string;
        avgScore: number;
        auditCount: number;
        lastAuditDate?: string;
        hasOpenDesvio: boolean;
    }[];

    // Ordenar ranking de mayor a menor cumplimiento
    sectorRanking.sort((a, b) => b.avgScore - a.avgScore);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Executive KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Cumplimiento Promedio */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cumplimiento Global</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-display font-black text-slate-800">{avgScore}%</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${avgScore >= 85 ? 'bg-emerald-100 text-emerald-700' : avgScore >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                {avgScore >= 85 ? 'Óptimo' : avgScore >= 70 ? 'Aceptable' : 'En Riesgo'}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Promedio ponderado de procesos</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>

                {/* KPI 2: Auditorías Ejecutadas */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auditorías Realizadas</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-display font-black text-slate-800">{totalAudits}</span>
                            <span className="text-xs text-slate-500 font-bold">informes</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Evaluaciones de procesos</p>
                    </div>
                    <div className="p-3 bg-blue-50 text-sanatorio-primary rounded-2xl border border-blue-100">
                        <FileSpreadsheet className="w-6 h-6" />
                    </div>
                </div>

                {/* KPI 3: Desvíos Abiertos */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Desvíos Abiertos</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-display font-black text-red-600">{openDesvios.length}</span>
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                Acciones DORA
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Requieren plan de acción</p>
                    </div>
                    <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-100">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                </div>

                {/* KPI 4: Oportunidades de Mejora */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">OMs Integradas a DORA</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-display font-black text-amber-600">{allOMs.length}</span>
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                Ciclo PDCA
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">Mejoras continuas detectadas</p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Ranking de Cumplimiento por Sector (Visible especialmente para Admin/Calidad) */}
            {simulatedRole === 'admin' && sectorRanking.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-display font-bold text-slate-800">
                                Ranking de Cumplimiento por Sector
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                                Nivel de adhesión a los procesos evaluados en cada servicio del Sanatorio.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {sectorRanking.map(sec => (
                            <div key={sec.sectorId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/80 transition-all border border-slate-200/60">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full shrink-0 ${sec.avgScore >= 85 ? 'bg-emerald-500' : sec.avgScore >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} />
                                    <div>
                                        <span className="font-bold text-sm text-slate-800">{sec.sectorLabel}</span>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                                            <span>{sec.auditCount} auditoría(s) realizada(s)</span>
                                            {sec.hasOpenDesvio && (
                                                <span className="text-red-600 font-bold flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Desvío abierto
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 self-end sm:self-center">
                                    <div className="w-32 sm:w-48 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${sec.avgScore >= 85 ? 'bg-emerald-500' : sec.avgScore >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{ width: `${sec.avgScore}%` }}
                                        />
                                    </div>
                                    <span className="font-display font-black text-sm text-slate-800 w-12 text-right">
                                        {sec.avgScore}%
                                    </span>
                                    <button
                                        onClick={() => onStartNewAuditForSector(sec.sectorId)}
                                        className="px-3 py-1.5 bg-sanatorio-primary/10 hover:bg-sanatorio-primary hover:text-white text-sanatorio-primary font-bold text-xs rounded-lg transition-all cursor-pointer"
                                    >
                                        Auditar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Grid 2 columnas: Auditorías Recientes & Desvíos Abiertos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Auditorías Recientes */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-display font-bold text-slate-800">
                                Histórico de Auditorías Emitidas
                            </h3>
                            <span className="text-xs font-bold text-slate-400">
                                {filteredReports.length} registro(s)
                            </span>
                        </div>

                        {filteredReports.length === 0 ? (
                            <div className="py-12 text-center text-slate-400">
                                <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 opacity-40" />
                                <p className="font-bold text-sm">No hay auditorías registradas para este sector.</p>
                                <p className="text-xs mt-1">Haz clic en "Ejecutar Auditoría" para comenzar.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredReports.map(report => (
                                    <div
                                        key={report.id}
                                        className="p-4 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200/70 transition-all flex items-center justify-between group"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-bold text-sanatorio-primary bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                                    {report.auditNumber}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-500">
                                                    {new Date(report.auditDate).toLocaleDateString('es-AR')}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-sm text-slate-800 mt-1">
                                                {report.sectorName}
                                            </h4>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                <span>Auditor: {report.auditorName}</span>
                                                <span>•</span>
                                                <span className="text-emerald-700 font-semibold">{report.fortalezas.length} Fortaleza(s)</span>
                                                <span>•</span>
                                                <span className="text-red-600 font-semibold">{report.desvios.length} Desvío(s)</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-lg font-display font-black text-slate-800">
                                                    {report.scorePercent}%
                                                </div>
                                                <span className="text-[10px] uppercase font-bold text-slate-400">Score</span>
                                            </div>

                                            <button
                                                onClick={() => onSelectReport(report)}
                                                className="p-2 bg-white group-hover:bg-sanatorio-primary group-hover:text-white text-slate-600 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-sm"
                                                title="Ver Informe Completo"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Desvíos e Incumplimientos con Vinculación a DORA */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-red-600" />
                                    Desvíos y Casos DORA
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Incumplimientos detectados atados a la gestión de casos DORA.
                                </p>
                            </div>
                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                {openDesvios.length} Pendiente(s)
                            </span>
                        </div>

                        {openDesvios.length === 0 ? (
                            <div className="py-12 text-center text-slate-400">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500 opacity-60" />
                                <p className="font-bold text-sm text-slate-700">¡Excelente! Sin desvíos ni desvíos abiertos.</p>
                                <p className="text-xs mt-1">Todos los procesos cumplen los estándares normativos.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {openDesvios.map(d => (
                                    <div key={d.id} className="p-4 bg-red-50/50 rounded-xl border border-red-200/70 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md text-white ${d.riskLevel === 'critico' ? 'bg-red-600' : d.riskLevel === 'alto' ? 'bg-amber-600' : 'bg-blue-600'}`}>
                                                        Riesgo {d.riskLevel}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-500">{d.sectorName}</span>
                                                </div>
                                                <h4 className="font-bold text-sm text-slate-800 mt-1">
                                                    {d.title}
                                                </h4>
                                            </div>

                                            {/* DORA Link Status */}
                                            {d.doraTicketId ? (
                                                <div className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    <span>DORA #{d.doraTicketId}</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => onLinkDoraClick(d.reportId, 'desvio', d.id)}
                                                    className="px-2.5 py-1 bg-sanatorio-primary hover:bg-[#00385c] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                                    title="Generar Caso DORA atado a este desvío"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    <span>Vincular DORA</span>
                                                </button>
                                            )}
                                        </div>

                                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                            {d.description}
                                        </p>

                                        <div className="pt-2 border-t border-red-200/50 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                                            <span>Resp: <strong>{d.responsiblePerson}</strong></span>
                                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" /> Vence: {d.deadline}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
