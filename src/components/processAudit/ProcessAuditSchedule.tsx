import React, { useState } from 'react';
import type { AuditSchedule } from '../../types/processAudit';
import {
    Calendar as CalendarIcon,
    Building2,
    Play,
    CheckCircle2,
    AlertTriangle,
    Clock
} from 'lucide-react';
import { SECTOR_OPTIONS } from '../../constants/sectors';

interface ProcessAuditScheduleProps {
    schedules: AuditSchedule[];
    selectedSector: string;
    onStartAuditForSector: (sectorId: string) => void;
}

export const ProcessAuditScheduleView: React.FC<ProcessAuditScheduleProps> = ({
    schedules,
    selectedSector,
    onStartAuditForSector
}) => {
    const [selectedPeriod, setSelectedPeriod] = useState<'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q3');

    // Filtrado
    const filteredSchedules = schedules.filter(s => {
        const matchesSector = selectedSector === 'ALL' || s.sectorId === selectedSector;
        const matchesPeriod = selectedPeriod === 'ALL' || s.period === selectedPeriod;
        return matchesSector && matchesPeriod;
    });

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-6 animate-in fade-in duration-300">
            {/* Header del Cronograma */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                    <span className="text-xs font-bold text-sanatorio-primary bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
                        Planificación Trimestral DORA
                    </span>
                    <h2 className="text-xl font-display font-bold text-slate-800 mt-1 flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-sanatorio-primary" />
                        Cronograma General de Auditorías de Procesos
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                        Calendario instituido para auditorías continuas en cada servicio del Sanatorio.
                    </p>
                </div>

                {/* Filtro Trimestral */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                    {(['Q1', 'Q2', 'Q3', 'Q4', 'ALL'] as const).map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setSelectedPeriod(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${selectedPeriod === p
                                    ? 'bg-white text-sanatorio-primary shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                        >
                            {p === 'ALL' ? 'Todos los Trimestres' : p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Listado / Timeline de Auditorías Programadas */}
            {filteredSchedules.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-sm">No hay auditorías programadas para este filtro.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredSchedules.map(sch => {
                        const secLabel = SECTOR_OPTIONS.find(s => s.value === sch.sectorId)?.label || sch.sectorName;

                        return (
                            <div
                                key={sch.id}
                                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${sch.status === 'completada'
                                        ? 'bg-emerald-50/40 border-emerald-200'
                                        : sch.status === 'desvio_abierto'
                                            ? 'bg-red-50/40 border-red-200'
                                            : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 text-sanatorio-primary shadow-sm">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                {sch.period} • Año {sch.year}
                                            </span>
                                            <h4 className="font-bold text-sm text-slate-800 leading-snug">
                                                {secLabel}
                                            </h4>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1 ${sch.status === 'completada'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : sch.status === 'desvio_abierto'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {sch.status === 'completada' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                        {sch.status === 'desvio_abierto' && <AlertTriangle className="w-3 h-3 text-red-600" />}
                                        {sch.status === 'programada' && <Clock className="w-3 h-3 text-blue-600" />}
                                        {sch.status === 'completada' ? 'Completada' : sch.status === 'desvio_abierto' ? 'Desvío Abierto' : 'Programada'}
                                    </span>
                                </div>

                                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-medium">
                                    <div>
                                        <span>Auditor: <strong>{sch.auditorAssigned}</strong></span>
                                        <span className="block text-[11px] text-slate-400">Fecha planificada: {sch.scheduledDate}</span>
                                    </div>

                                    {sch.lastScore !== undefined ? (
                                        <div className="text-right">
                                            <span className="text-base font-display font-black text-slate-800">
                                                {sch.lastScore}%
                                            </span>
                                            <span className="text-[10px] block font-bold text-slate-400">Último Score</span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => onStartAuditForSector(sch.sectorId)}
                                            className="px-3 py-1.5 bg-sanatorio-primary hover:bg-[#00385c] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                            <span>Auditar Ahora</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
