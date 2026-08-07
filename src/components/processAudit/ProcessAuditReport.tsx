import React from 'react';
import type { ProcessAuditReport as ReportType } from '../../types/processAudit';
import {
    CheckCircle2,
    AlertCircle,
    Printer,
    ArrowLeft,
    Sparkles,
    ShieldAlert,
    ExternalLink,
    Calendar,
    User,
    Building2,
    FileCheck
} from 'lucide-react';

interface ProcessAuditReportProps {
    report: ReportType;
    onBack: () => void;
    onLinkDoraClick: (reportId: string, findingType: 'om' | 'desvio', findingId: string) => void;
}

export const ProcessAuditReportView: React.FC<ProcessAuditReportProps> = ({
    report,
    onBack,
    onLinkDoraClick
}) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-3 print:hidden">
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver al Tablero</span>
                </button>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-sanatorio-primary hover:bg-[#00385c] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Imprimir / Exportar PDF</span>
                    </button>
                </div>
            </div>

            {/* Printable Audit Document Container */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-8 print:p-0 print:border-none print:shadow-none">

                {/* Encabezado del Documento Institucional */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                    <div className="flex items-center gap-4">
                        <img
                            src="/logosanatorio.png"
                            alt="Sanatorio Argentino"
                            className="h-12 w-auto object-contain"
                        />
                        <div>
                            <span className="text-[10px] font-black uppercase text-sanatorio-primary tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
                                Departamento de Gestión de Calidad
                            </span>
                            <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-800 mt-1">
                                Informe de Auditoría de Procesos
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">
                                Sanatorio Argentino • DORA Sistema Integral
                            </p>
                        </div>
                    </div>

                    <div className="text-right self-end sm:self-auto">
                        <div className="font-mono text-sm font-bold text-sanatorio-primary bg-blue-50/80 px-3 py-1 rounded-xl border border-blue-100 inline-block">
                            {report.auditNumber}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-medium flex items-center justify-end gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(report.auditDate).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </div>
                    </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                    <div className="space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Sector Auditado</span>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                            <Building2 className="w-4 h-4 text-sanatorio-primary" />
                            {report.sectorName}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Auditor Responsable</span>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                            <User className="w-4 h-4 text-slate-500" />
                            {report.auditorName} ({report.auditorRole})
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Nivel de Cumplimiento</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-display font-black text-slate-800">
                                {report.scorePercent}%
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${report.scorePercent >= 85 ? 'bg-emerald-100 text-emerald-800' : report.scorePercent >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                {report.scorePercent >= 85 ? 'Cumplimiento Óptimo' : report.scorePercent >= 70 ? 'Aceptable' : 'Desvío Significativo'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Resumen Ejecutivo */}
                {report.generalSummary && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-sanatorio-primary" />
                            Conclusión y Resumen Ejecutivo
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed p-4 bg-blue-50/40 rounded-xl border border-blue-100 italic">
                            "{report.generalSummary}"
                        </p>
                    </div>
                )}

                {/* ESTRUCTURA SEGÚN NOTA MANUSCRITA: Fortalezas, Observaciones, OMs, Desvíos */}
                <div className="space-y-6">
                    <h3 className="text-base font-display font-bold text-slate-800 border-b pb-2">
                        Resultados y Clasificación de Hallazgos
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* 🟢 FORTALEZAS */}
                        <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
                            <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-600" />
                                Fortalezas del Servicio ({report.fortalezas.length})
                            </h4>

                            {report.fortalezas.length === 0 ? (
                                <p className="text-xs text-emerald-700/70 italic">Sin fortalezas registradas.</p>
                            ) : (
                                <div className="space-y-2">
                                    {report.fortalezas.map(f => (
                                        <div key={f.id} className="p-3 bg-white rounded-xl border border-emerald-200 text-xs space-y-1">
                                            <span className="font-bold text-emerald-800 block">[{f.processName}]</span>
                                            <p className="text-slate-700">{f.description}</p>
                                            <span className="text-[11px] text-emerald-600 font-semibold block">⭐ {f.highlight}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 🔵 OBSERVACIONES */}
                        <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-3">
                            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-sanatorio-primary" />
                                Observaciones de Campo ({report.observaciones.length})
                            </h4>

                            {report.observaciones.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">Sin observaciones puntuales.</p>
                            ) : (
                                <div className="space-y-2">
                                    {report.observaciones.map(o => (
                                        <div key={o.id} className="p-3 bg-white rounded-xl border border-blue-200 text-xs space-y-1">
                                            <span className="font-bold text-slate-800 block">[{o.processName}]</span>
                                            <p className="text-slate-700">{o.description}</p>
                                            {o.recommendation && (
                                                <span className="text-[11px] text-sanatorio-primary font-medium block">💡 Rec: {o.recommendation}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 🟡 OPORTUNIDADES DE MEJORA (OM) VINCULADAS A DORA */}
                        <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                    Oportunidades de Mejora (OM) ({report.oportunidadesMejora.length})
                                </h4>
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                                    Atadas a DORA
                                </span>
                            </div>

                            {report.oportunidadesMejora.length === 0 ? (
                                <p className="text-xs text-amber-700/70 italic">Sin oportunidades de mejora detectadas.</p>
                            ) : (
                                <div className="space-y-2.5">
                                    {report.oportunidadesMejora.map(om => (
                                        <div key={om.id} className="p-3.5 bg-white rounded-xl border border-amber-200 text-xs space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="font-bold text-slate-800 block">{om.title}</span>
                                                    <span className="text-[10px] font-semibold text-slate-400">Proceso: {om.processName}</span>
                                                </div>

                                                {om.doraTicketId ? (
                                                    <span className="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 shrink-0">
                                                        <ExternalLink className="w-3 h-3" /> DORA #{om.doraTicketId}
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => onLinkDoraClick(report.id, 'om', om.id)}
                                                        className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        <span>Vincular a DORA</span>
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-slate-600 leading-relaxed">{om.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 🔴 DESVÍOS E INCUMPLIMIENTOS ATADOS A CASOS DORA */}
                        <div className="p-5 bg-red-50/50 rounded-2xl border border-red-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm text-red-900 flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-red-600" />
                                    Desvíos e Incumplimientos ({report.desvios.length})
                                </h4>
                                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                    Casos DORA Abiertos
                                </span>
                            </div>

                            {report.desvios.length === 0 ? (
                                <p className="text-xs text-red-700/70 italic">Sin desvíos detectados en esta evaluación.</p>
                            ) : (
                                <div className="space-y-2.5">
                                    {report.desvios.map(d => (
                                        <div key={d.id} className="p-3.5 bg-white rounded-xl border border-red-200 text-xs space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-red-800">{d.title}</span>
                                                        <span className="bg-red-100 text-red-700 text-[10px] font-bold uppercase px-1.5 py-0.2 rounded">
                                                            Riesgo {d.riskLevel}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-semibold">Proceso: {d.processName}</span>
                                                </div>

                                                {d.doraTicketId ? (
                                                    <span className="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 shrink-0">
                                                        <ExternalLink className="w-3 h-3" /> Caso DORA #{d.doraTicketId}
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => onLinkDoraClick(report.id, 'desvio', d.id)}
                                                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        <span>Vincular Caso DORA</span>
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-slate-600">{d.description}</p>
                                            <div className="p-2 bg-slate-50 rounded-lg text-[11px] font-medium text-slate-700 border border-slate-200/60">
                                                <strong>Plan de Acción:</strong> {d.actionPlan} • <strong>Resp:</strong> {d.responsiblePerson} • <strong>Vence:</strong> {d.deadline}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabla Detallada de Items Evaluados */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                        Desglose Ítem por Ítem del Checklist
                    </h3>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                                <tr>
                                    <th className="py-3 px-4">#</th>
                                    <th className="py-3 px-4">Categoría / Proceso</th>
                                    <th className="py-3 px-4">Ítem Evaluado</th>
                                    <th className="py-3 px-4 text-center">Respuesta</th>
                                    <th className="py-3 px-4">Observación</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/70 font-medium">
                                {report.items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-400">{index + 1}</td>
                                        <td className="py-3 px-4">
                                            <span className="font-bold text-slate-800 block">{item.processName}</span>
                                            <span className="text-[10px] text-slate-400">{item.category}</span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-700 font-semibold">{item.itemText}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${item.answer === 'cumple'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : item.answer === 'parcial'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : item.answer === 'no_cumple'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {item.answer === 'cumple' ? 'Cumple (100%)' : item.answer === 'parcial' ? 'Parcial (50%)' : item.answer === 'no_cumple' ? 'No Cumple (0%)' : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 italic">
                                            {item.observation || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer de Firma */}
                <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-500 font-semibold">
                    <div>
                        <div className="w-48 h-px bg-slate-300 mx-auto mb-2" />
                        <span>Firma Auditor: {report.auditorName}</span>
                    </div>
                    <div>
                        <div className="w-48 h-px bg-slate-300 mx-auto mb-2" />
                        <span>Revisión Sistema DORA Calidad</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
