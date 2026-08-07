import React from 'react';
import { ClipboardCheck, ShieldCheck, UserCheck, RefreshCw, PlusCircle, Building2 } from 'lucide-react';
import { SECTOR_OPTIONS } from '../../constants/sectors';

interface ProcessAuditHeaderProps {
    simulatedRole: 'admin' | 'responsable';
    onRoleToggle: (role: 'admin' | 'responsable') => void;
    selectedSector: string;
    onSectorChange: (sectorId: string) => void;
    onStartNewAudit: () => void;
    onResetDemoData: () => void;
    userAssignedSectors?: string[];
}

export const ProcessAuditHeader: React.FC<ProcessAuditHeaderProps> = ({
    simulatedRole,
    onRoleToggle,
    selectedSector,
    onSectorChange,
    onStartNewAudit,
    onResetDemoData,
    userAssignedSectors = []
}) => {
    // Filtrar opciones de sector si el usuario simulado es responsable
    const availableSectors = simulatedRole === 'admin'
        ? SECTOR_OPTIONS
        : SECTOR_OPTIONS.filter(s => userAssignedSectors.includes(s.value) || userAssignedSectors.length === 0);

    return (
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200/80 mb-6 transition-all">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                {/* Branding and Title */}
                <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-sanatorio-primary/10 text-sanatorio-primary rounded-2xl border border-sanatorio-primary/20 shrink-0">
                        <ClipboardCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-sanatorio-primary text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                                DORA • Sistema de Calidad
                            </span>
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                Auditorías de Procesos
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-800 mt-1">
                            Auditoría de Procesos por Sector
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                            Evaluación sistemática de cumplimiento de procesos, hallazgos y métricas institucionales.
                        </p>
                    </div>
                </div>

                {/* Quick Actions and Role Switcher */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Role Switcher Button */}
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 shadow-inner">
                        <button
                            type="button"
                            onClick={() => onRoleToggle('admin')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${simulatedRole === 'admin'
                                    ? 'bg-white text-purple-700 shadow-sm border border-purple-100'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                            title="Ver todo como Gestión de Calidad (Admin)"
                        >
                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                            <span>Calidad (Admin)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onRoleToggle('responsable')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${simulatedRole === 'responsable'
                                    ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                            title="Ver solo el sector asignado al responsable"
                        >
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                            <span>Resp. Servicio</span>
                        </button>
                    </div>

                    {/* Reset Demo Button */}
                    <button
                        type="button"
                        onClick={onResetDemoData}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-200/80 cursor-pointer"
                        title="Restablecer datos mock iniciales de prueba"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reiniciar Demo</span>
                    </button>

                    {/* Start Audit CTA */}
                    <button
                        type="button"
                        onClick={onStartNewAudit}
                        className="px-5 py-2.5 bg-sanatorio-primary hover:bg-[#00385c] text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer shrink-0"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>Ejecutar Auditoría</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar: Sector selection */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide shrink-0">
                        {simulatedRole === 'admin' ? 'Sector a Supervisar:' : 'Mi Sector Asignado:'}
                    </span>
                    <select
                        value={selectedSector}
                        onChange={(e) => onSectorChange(e.target.value)}
                        className="w-full sm:w-72 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary focus:outline-none transition-all cursor-pointer"
                    >
                        {simulatedRole === 'admin' && (
                            <option value="ALL">🌐 Todos los Sectores (Vista Consolidada Calidad)</option>
                        )}
                        {availableSectors.map(s => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="text-[11px] font-medium text-slate-400 italic">
                    {simulatedRole === 'admin'
                        ? 'Acceso total como Calidad (Admin): auditoría de todos los servicios e informes institucionales.'
                        : 'Acceso acotado: completado de auditorías e informes de tu sector.'}
                </div>
            </div>
        </div>
    );
};
