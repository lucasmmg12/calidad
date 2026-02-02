import { useState } from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    Camera,
    Send,
    ClipboardCheck,
    BrainCircuit,
    Calendar
} from 'lucide-react';
import type { ResolutionFormData, ResolutionStatus } from '../types/resolution';

interface Props {
    reportData: {
        id: string;
        trackingId: string;
        description: string;
        isAdverseEvent: boolean; // Esto vendría de la URL o estado previo
        sector: string;
    };
    onSubmit: (data: ResolutionFormData) => Promise<void>;
}

export const ResolutionForm = ({ reportData, onSubmit }: Props) => {
    const [formData, setFormData] = useState<ResolutionFormData>({
        reportId: reportData.id,
        isAdverseEvent: reportData.isAdverseEvent,
        reportSummary: reportData.description,
        immediateAction: '',
        rootCause: '',
        correctivePlan: '',
        implementationDate: ''
    });

    const [status, setStatus] = useState<ResolutionStatus>('pending');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitted'); // Simulación visual inmediata
        // Aquí iría la lógica real de envío
        await new Promise(resolve => setTimeout(resolve, 1500));
        onSubmit(formData);
    };

    if (status === 'submitted') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-green-100 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Gestión Registrada!</h2>
                    <p className="text-gray-500">
                        La información ha sido enviada al Departamento de Calidad.
                        El ciclo de mejora continúa gracias a tu aporte.
                    </p>
                    <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-sm font-mono text-gray-400">Ticket #{reportData.trackingId}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-100">
            {/* Header Clínico */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#00385c] p-2 rounded-lg">
                            <ClipboardCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 leading-tight">Resolución de Caso</h1>
                            <p className="text-xs text-gray-500 font-medium">#{reportData.trackingId} • {reportData.sector}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                {/* Tarjeta del Incidente Original */}
                <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/60">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Reporte Original</h3>
                    <div className="bg-gray-50 rounded-xl p-4 text-gray-700 text-sm leading-relaxed border border-gray-100">
                        "{reportData.description}"
                    </div>

                    {reportData.isAdverseEvent && (
                        <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-2 rounded-lg text-xs font-bold border border-amber-100/50">
                            <AlertTriangle className="w-4 h-4" />
                            Requiere Análisis de Causa Raíz
                        </div>
                    )}
                </section>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Bloque 1: Acción Inmediata (Siempre visible) */}
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/60 transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">1</div>
                            <h2 className="font-bold text-gray-800">Acción Correctiva Inmediata</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">
                                    ¿Qué medida se tomó para solucionar el problema ahora?
                                </label>
                                <textarea
                                    required
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none h-32 text-sm"
                                    placeholder="Ej: Se reemplazó la luminaria afectada / Se colocó señalización provisoria..."
                                    value={formData.immediateAction}
                                    onChange={e => setFormData({ ...formData, immediateAction: e.target.value })}
                                />
                            </div>

                            {/* Botón de Evidencia (Simulado) */}
                            <button type="button" className="flex items-center gap-2 text-sm text-gray-500 font-medium hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors w-fit">
                                <Camera className="w-4 h-4" />
                                Adjuntar foto de la solución (Opcional)
                            </button>
                        </div>
                    </section>

                    {/* Bloque 2: Análisis de Fondo (Condicional) */}
                    {reportData.isAdverseEvent && (
                        <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 shadow-sm border border-amber-100 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">2</div>
                                <div>
                                    <h2 className="font-bold text-gray-800">Análisis y Prevención</h2>
                                    <p className="text-xs text-gray-500">Requerido por Calidad para prevenir recurrencia</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                        <BrainCircuit className="w-4 h-4 text-amber-600" />
                                        Análisis de Causa Raíz
                                    </label>
                                    <p className="text-xs text-gray-500 mb-2 italic">¿Por qué ocurrió el evento? (Considere método de los 5 porqués)</p>
                                    <textarea
                                        required
                                        className="w-full p-3 rounded-xl border border-amber-200 bg-white/80 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all resize-none h-32 text-sm"
                                        placeholder="Detalle la causa fundamental del desvío..."
                                        value={formData.rootCause}
                                        onChange={e => setFormData({ ...formData, rootCause: e.target.value })}
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Plan de Acción de Fondo</label>
                                        <textarea
                                            required
                                            className="w-full p-3 rounded-xl border border-amber-200 bg-white/80 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all resize-none h-24 text-sm"
                                            placeholder="Medidas a largo plazo..."
                                            value={formData.correctivePlan}
                                            onChange={e => setFormData({ ...formData, correctivePlan: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Estimada</label>
                                        <div className="relative">
                                            <Calendar className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                            <input
                                                type="date"
                                                required
                                                className="w-full p-3 pl-10 rounded-xl border border-amber-200 bg-white/80 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all text-sm"
                                                value={formData.implementationDate}
                                                onChange={e => setFormData({ ...formData, implementationDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Action Bar */}
                    <div className="pt-4 pb-12">
                        <button
                            type="submit"
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20 transform transition-all active:scale-95 flex items-center justify-center gap-2 
                ${reportData.isAdverseEvent ? 'bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-slate-900' : 'bg-blue-600 hover:bg-blue-700'}
              `}
                        >
                            <span>Confirmar Resolución</span>
                            <Send className="w-4 h-4" />
                        </button>
                        <p className="text-center text-xs text-gray-400 mt-4">
                            Sanatorio Argentino • Sistema de Gestión de Calidad
                        </p>
                    </div>

                </form>
            </main>
        </div>
    );
};
