import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Search, Clock, CheckCircle, AlertCircle, Activity } from 'lucide-react';

export const TrackingPage = () => {
    const [trackingId, setTrackingId] = useState('');
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<any>(null);
    const [error, setError] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingId.trim()) return;

        setLoading(true);
        setError('');
        setReport(null);

        try {
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .ilike('tracking_id', trackingId.trim())
                .single();

            if (error) throw error;
            setReport(data);
        } catch (err) {
            console.error(err);
            setError('No encontramos un reporte con ese ID. Por favor verifica e intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStep = (status: string) => {
        if (status === 'resolved') return 3;
        if (status === 'in_progress' || status === 'analyzed') return 2;
        return 1;
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6">
            <div className="mb-10 text-center space-y-2">
                <h1 className="text-3xl font-bold text-sanatorio-primary tracking-tight">Seguimiento de Reportes</h1>
                <p className="text-gray-500">Consulta el estado de tu gestión en tiempo real.</p>
            </div>

            {/* Search Card */}
            <div className="bg-white rounded-3xl shadow-card p-8 border border-gray-100 mb-8">
                <form onSubmit={handleSearch} className="relative">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Ej: SA-2024-X9Y2"
                            className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl text-lg uppercase font-mono tracking-wider focus:border-sanatorio-primary focus:ring-4 focus:ring-blue-50 outline-none transition-all placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
                            value={trackingId}
                            onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !trackingId}
                        className="mt-4 w-full py-3 bg-sanatorio-primary text-white rounded-xl font-bold hover:bg-[#004270] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {loading ? 'Buscando...' : 'Consultar Estado'}
                    </button>
                </form>

                {error && (
                    <div className="mt-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {error}
                    </div>
                )}
            </div>

            {/* Result Card */}
            {report && (
                <div className="bg-white rounded-3xl shadow-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Header */}
                    <div className="bg-sanatorio-neutral p-6 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">REPORTE</p>
                            <p className="text-xl font-mono font-bold text-sanatorio-primary">{report.tracking_id}</p>
                        </div>
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                            <Activity className="text-sanatorio-secondary w-6 h-6" />
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="p-8">
                        <div className="relative flex justify-between mb-8">
                            {/* Line */}
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 -translate-y-1/2 rounded-full"></div>
                            <div
                                className="absolute top-1/2 left-0 h-1 bg-green-500 -z-10 -translate-y-1/2 rounded-full transition-all duration-1000"
                                style={{ width: `${(getStatusStep(report.status) - 1) * 50}%` }}
                            ></div>

                            {/* Steps */}
                            {['Recibido', 'En Análisis', 'Resuelto'].map((step, idx) => {
                                const active = getStatusStep(report.status) > idx;
                                const current = getStatusStep(report.status) === idx + 1;

                                return (
                                    <div key={idx} className="flex flex-col items-center gap-2 bg-white px-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${active || current
                                            ? 'bg-green-500 border-green-500 text-white'
                                            : 'bg-white border-gray-200 text-gray-300'
                                            }`}>
                                            {active ? <CheckCircle className="w-5 h-5" /> : (idx + 1)}
                                        </div>
                                        <span className={`text-xs font-bold ${active || current ? 'text-gray-800' : 'text-gray-400'}`}>{step}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Content */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">Tu Reporte</h3>
                                <div className="bg-gray-50 p-4 rounded-xl text-gray-700 text-sm leading-relaxed border border-gray-100">
                                    "{report.content}"
                                </div>
                            </div>

                            {/* Activity History Log */}
                            {report.notes && (
                                <div className="mt-6 border-t border-gray-100 pt-6">
                                    <h3 className="text-sm font-bold text-sanatorio-primary flex items-center gap-2 mb-4">
                                        <Clock className="w-4 h-4" />
                                        Historial de Actividad
                                    </h3>

                                    <div className="relative space-y-0 pl-2">
                                        {/* Vertical Guide Line */}
                                        <div className="absolute top-2 bottom-2 left-[19px] w-0.5 bg-gray-100 -z-10"></div>

                                        {(() => {
                                            // 1. Initial Creation Event
                                            const events = [{
                                                date: new Date(report.created_at).toLocaleString('es-AR', {
                                                    timeZone: 'America/Argentina/Buenos_Aires',
                                                    day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                }),
                                                message: "Ticket Creado",
                                                type: 'start'
                                            }];

                                            // 2. Parse Notes for Events
                                            // Expected fomat: "[timestamp] message" e.g. "[2/5/2026, 08:30:00] 🔄 REOPENED..."
                                            if (report.notes) {
                                                const notes = report.notes.split('\n\n').filter((n: string) => n.trim().length > 0);
                                                notes.forEach((note: string) => {
                                                    const match = note.match(/^\[(.*?)\]\s?(.*)/);
                                                    if (match) {
                                                        events.push({
                                                            date: match[1], // Keep original string or parse if needed
                                                            message: match[2],
                                                            type: note.includes('🔄') ? 'reopen' : note.includes('🛑') ? 'rejection' : 'info'
                                                        });
                                                    } else {
                                                        // Legacy plain notes
                                                        events.push({
                                                            date: 'Nota Reciente',
                                                            message: note,
                                                            type: 'note'
                                                        });
                                                    }
                                                });
                                            }

                                            // 3. Status Based Events
                                            if (report.status === 'resolved') {
                                                events.push({
                                                    date: new Date(report.resolved_at || new Date()).toLocaleString('es-AR', {
                                                        timeZone: 'America/Argentina/Buenos_Aires',
                                                        day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    }),
                                                    message: "Resolución Finalizada",
                                                    type: 'resolved'
                                                });
                                            }

                                            return events.map((event, idx) => (
                                                <div key={idx} className="flex gap-4 pb-6 last:pb-0 group">
                                                    {/* Custom Icon/Dot based on type */}
                                                    <div className={`
                                                        w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm z-10
                                                        ${event.type === 'start' ? 'bg-gray-200 text-gray-500' :
                                                            event.type === 'resolved' ? 'bg-green-100 text-green-600' :
                                                                event.type === 'reopen' ? 'bg-blue-100 text-blue-600' :
                                                                    'bg-white border-blue-50 text-sanatorio-primary'}
                                                    `}>
                                                        {event.type === 'start' && <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />}
                                                        {event.type === 'resolved' && <CheckCircle className="w-5 h-5" />}
                                                        {event.type === 'reopen' && <Activity className="w-4 h-4" />}
                                                        {(event.type === 'info' || event.type === 'note') && <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />}
                                                    </div>

                                                    <div className="pt-1.5 w-full">
                                                        <span className="text-xs text-gray-400 font-mono block mb-0.5">{event.date}</span>
                                                        <div className={`text-sm ${event.type === 'resolved' ? 'font-bold text-green-700' : 'text-gray-700'}`}>
                                                            {event.message}
                                                        </div>
                                                        {/* If resolved, show resolution note */}
                                                        {event.type === 'resolved' && report.resolution_notes && (
                                                            <div className="mt-2 text-xs text-green-600 bg-green-50 p-3 rounded-lg border border-green-100 italic">
                                                                "{report.resolution_notes}"
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}

                            {report.status === 'resolved' && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-5 mt-6 animate-in zoom-in-95 delay-300">
                                    <h3 className="text-green-800 font-bold flex items-center gap-2 mb-2">
                                        <CheckCircle className="w-5 h-5" />
                                        Resolución
                                    </h3>
                                    <p className="text-green-700 text-sm mb-3">
                                        {report.resolution_notes?.split("Origen:")[0] || 'El caso ha sido gestionado con éxito.'}
                                    </p>
                                    {report.corrective_plan && (
                                        <div className="mt-3 pt-3 border-t border-green-200/50">
                                            <p className="text-xs font-bold text-green-800 uppercase mb-1">Acción Tomada:</p>
                                            <p className="text-xs text-green-700">{report.corrective_plan}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {report.status !== 'resolved' && !report.notes && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-3 mt-6">
                                    <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-blue-800 font-bold text-sm mb-1">En Proceso de Análisis</h3>
                                        <p className="text-blue-700 text-xs leading-relaxed">
                                            Tu reporte ha entrado en la cola de gestión de calidad. Pronto verás actualizaciones aquí.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            <div className="mt-8 text-center">
                <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-sanatorio-primary hover:text-[#004270] transition-colors bg-blue-50 px-6 py-3 rounded-xl hover:bg-blue-100">
                    ← Volver al Inicio
                </a>
            </div>
        </div>
    );
};
