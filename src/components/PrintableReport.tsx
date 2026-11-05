import { forwardRef } from 'react';
import { Search, AlertTriangle, CheckCircle2, Trophy, Star } from 'lucide-react';

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
    const isFelicitacion = data.findingType?.toLowerCase().includes('felicitac');

    return (
        <div
            ref={ref}
            className="bg-white p-10 w-[210mm] mx-auto text-slate-800 font-sans"
            style={{ fontFamily: "'Outfit', 'Inter', 'Helvetica Neue', Arial, sans-serif" }}
        >
            {/* Header Institucional */}
            <div
                className={`flex justify-between items-center mb-8 pb-6 border-b-2 ${
                    isFelicitacion ? 'border-amber-400' : 'border-[#00548B]'
                }`}
            >
                <div className="flex items-center gap-4">
                    <img
                        src="/logosanatorio.png"
                        alt="Sanatorio Argentino"
                        className="h-14 w-auto object-contain"
                    />
                    <div>
                        <span
                            className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md inline-block mb-1 ${
                                isFelicitacion
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-50 text-[#00548B]'
                            }`}
                        >
                            Departamento de Gestión de Calidad · Normas ITAES
                        </span>
                        <h1 className="text-2xl font-bold text-[#00548B] tracking-tight">
                            {isFelicitacion
                                ? 'Certificado de Reconocimiento y Felicitación'
                                : 'Informe de Gestión y Acción Correctiva'}
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Sanatorio Argentino · Seguridad del Paciente y Mejora Continua
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg inline-block mb-1 border ${
                            isFelicitacion
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-[#00548B] border-slate-200'
                        }`}
                    >
                        REGISTRO #{data.trackingId}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                        Emisión: {new Date().toLocaleDateString('es-AR')}
                    </p>
                </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Origen
                    </label>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {data.origin || 'Observación / Gestión'}
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {isFelicitacion ? 'Sector Destacado' : 'Sector Destino'}
                    </label>
                    <div className="text-sm font-bold text-[#00548B] mt-0.5">{data.sector}</div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Clasificación
                    </label>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {data.findingType || 'Hallazgo Operativo'}
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Fecha del Registro
                    </label>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                        {new Date(data.date).toLocaleDateString('es-AR')}
                    </div>
                </div>
            </div>

            {/* Description / Recognition Quote */}
            {isFelicitacion ? (
                <div className="mb-6 bg-amber-50/70 p-6 rounded-xl border-2 border-amber-200 text-center space-y-3">
                    <div className="flex justify-center gap-1 text-amber-500">
                        <Star className="w-5 h-5 fill-amber-400" />
                        <Star className="w-5 h-5 fill-amber-400" />
                        <Trophy className="w-6 h-6 text-amber-600 mx-1" />
                        <Star className="w-5 h-5 fill-amber-400" />
                        <Star className="w-5 h-5 fill-amber-400" />
                    </div>
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-widest">
                        Mensaje de Felicitación Recibido
                    </h3>
                    <p className="text-base italic text-slate-800 leading-relaxed whitespace-pre-wrap px-4">
                        "{data.description}"
                    </p>
                </div>
            ) : (
                <div className="mb-6 bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <h3 className="text-xs font-bold text-[#00548B] uppercase tracking-wider mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Descripción del Reporte
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {data.description}
                    </p>
                </div>
            )}

            {/* Root Cause */}
            {data.rootCause && (
                <div className="mb-6 bg-amber-50/60 p-5 rounded-xl border border-amber-200">
                    <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Search className="w-4 h-4" /> Análisis de Causa Raíz (RCA)
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {data.rootCause}
                    </p>
                </div>
            )}

            {/* Action Plan */}
            {data.actionPlan && (
                <div className="mb-8 border border-emerald-200 rounded-xl overflow-hidden">
                    <div className="bg-emerald-50 px-5 py-2.5 border-b border-emerald-100">
                        <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Plan de Acción Correctiva / Preventiva
                        </h3>
                    </div>
                    <div className="p-5 bg-white">
                        <p className="text-sm leading-relaxed text-slate-700 mb-4 whitespace-pre-wrap">
                            {data.actionPlan}
                        </p>

                        <div className="flex gap-8 mt-4 pt-4 border-t border-slate-100">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Responsable Asignado
                                </label>
                                <div className="text-sm font-bold text-slate-800">
                                    {data.responsible || 'Equipo del Sector'}
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Fecha Comprometida
                                </label>
                                <div className="text-sm font-bold text-slate-800">
                                    {data.deadline
                                        ? new Date(data.deadline).toLocaleDateString('es-AR')
                                        : 'A definir'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center mt-12 pt-6 border-t border-slate-200">
                <p className="text-[11px] font-semibold text-slate-500">
                    Sanatorio Argentino · Departamento de Gestión de Calidad bajo Normas ITAES
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                    Emitido el {new Date().toLocaleString('es-AR')} · Documento Institucional
                </p>
            </div>
        </div>
    );
});
