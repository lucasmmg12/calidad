import { forwardRef } from 'react';
import { Search, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface PrintableReportProps {
    data: {
        trackingId: string;
        date: string;
        sector: string;
        description: string;
        origin?: string;
        findingType?: string;
        rootCause?: string;
        actionPlan?: string;
        responsible?: string;
        deadline?: string;
    };
}

export const PrintableReport = forwardRef<HTMLDivElement, PrintableReportProps>(({ data }, ref) => {
    return (
        <div ref={ref} className="bg-white p-8 w-[210mm] mx-auto text-gray-800" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div className="flex justify-between items-start mb-8 border-b-2 border-primary-900 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#062E70] uppercase">Registro de Acción Correctiva</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestión de Calidad y Seguridad del Paciente</p>
                </div>
                <div className="text-right">
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded inline-block mb-1">ID: {data.trackingId}</div>
                    <p className="text-xs text-gray-500">Emisión: {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* Section 1: Data */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase block">Origen</label>
                    <div className="text-sm border-b border-gray-200 pb-1">{data.origin || 'Reclamo / Gestión'}</div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase block">Sector</label>
                    <div className="text-sm border-b border-gray-200 pb-1">{data.sector}</div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase block">Tipo Hallazgo</label>
                    <div className="text-sm border-b border-gray-200 pb-1">{data.findingType || 'Evento Adverso'}</div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase block">Fecha Incidente</label>
                    <div className="text-sm border-b border-gray-200 pb-1">{new Date(data.date).toLocaleDateString()}</div>
                </div>
            </div>

            {/* Section 2: Description */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="text-sm font-bold text-[#062E70] mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Descripción del Evento
                </h3>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.description}</p>
            </div>

            {/* Section 3: Root Cause */}
            {data.rootCause && (
                <div className="mb-6 bg-orange-50 p-4 rounded-lg border border-orange-100">
                    <h3 className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
                        <Search className="w-4 h-4" /> Análisis Causa Raíz
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.rootCause}</p>
                </div>
            )}

            {/* Section 4: Action Plan */}
            {data.actionPlan && (
                <div className="mb-8 border border-green-200 rounded-lg overflow-hidden">
                    <div className="bg-green-50 px-4 py-2 border-b border-green-100">
                        <h3 className="text-sm font-bold text-green-800 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Plan de Acción
                        </h3>
                    </div>
                    <div className="p-4">
                        <p className="text-sm leading-relaxed mb-4 whitespace-pre-wrap">{data.actionPlan}</p>

                        <div className="flex gap-8 mt-4 pt-4 border-t border-gray-100">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Responsable</label>
                                <div className="text-sm font-medium">{data.responsible || 'No asignado'}</div>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Fecha Límite</label>
                                <div className="text-sm font-medium">{data.deadline ? new Date(data.deadline).toLocaleDateString() : 'A definir'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center mt-12 pt-8 border-t border-gray-200">
                <p className="text-[10px] text-gray-400">
                    Documento generado el {new Date().toLocaleString()} • Sanatorio Argentino • Sistema de Gestión de Calidad
                </p>
                <p className="text-[10px] text-gray-300 mt-1">Este documento es confidencial y para uso interno exclusivo.</p>
            </div>
        </div>
    );
});
