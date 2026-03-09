import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Search, Clock, CheckCircle, AlertCircle, Activity, XCircle, AlertTriangle, ChevronDown, Send, Image } from 'lucide-react';

export const TrackingPage = () => {
    const PREFIX = 'SA-2026-';
    const [suffix, setSuffix] = useState('');
    const [useFullInput, setUseFullInput] = useState(false);
    const [fullCode, setFullCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<any>(null);
    const [sectorAssignments, setSectorAssignments] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [expandedLogEntry, setExpandedLogEntry] = useState<number | null>(null);

    const computedTrackingId = useFullInput ? fullCode.trim() : `${PREFIX}${suffix}`;
    const canSearch = useFullInput ? fullCode.trim().length > 0 : suffix.length === 4;

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSearch) return;

        setLoading(true);
        setError('');
        setReport(null);
        setSectorAssignments([]);
        setExpandedLogEntry(null);

        try {
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .ilike('tracking_id', computedTrackingId)
                .single();

            if (error) throw error;
            setReport(data);

            // Also fetch sector assignments for this report
            if (data?.id) {
                const { data: assignments } = await supabase
                    .from('sector_assignments')
                    .select('*')
                    .eq('report_id', data.id)
                    .order('created_at', { ascending: true });
                setSectorAssignments(assignments || []);
            }
        } catch (err) {
            console.error(err);
            setError('No encontramos un reporte con ese ID. Por favor verifica e intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStep = (status: string) => {
        if (status === 'resolved') return 3;
        if (status === 'in_progress' || status === 'analyzed' || status === 'pending_resolution' || status === 'quality_validation') return 2;
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
                <form onSubmit={handleSearch} className="space-y-4">
                    {!useFullInput ? (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Ingresá los últimos 4 caracteres de tu código
                            </label>
                            <div className="relative flex items-stretch">
                                <div className="flex items-center bg-gray-100 border-2 border-r-0 border-gray-200 rounded-l-xl px-4 select-none">
                                    <span className="text-lg font-mono font-bold text-gray-400 tracking-wider">{PREFIX}</span>
                                </div>
                                <input
                                    type="text"
                                    maxLength={4}
                                    placeholder="X9Y2"
                                    className="flex-1 p-4 border-2 border-gray-200 rounded-r-xl text-2xl uppercase font-mono tracking-[0.3em] text-center focus:border-sanatorio-primary focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                    value={suffix}
                                    onChange={(e) => setSuffix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))}
                                    autoFocus
                                />
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-[11px] text-gray-400">
                                    {suffix.length < 4 ? `Faltan ${4 - suffix.length} caracteres` : '✅ Listo para buscar'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setUseFullInput(true); setFullCode(suffix ? `${PREFIX}${suffix}` : ''); }}
                                    className="text-[11px] text-sanatorio-primary hover:underline font-medium"
                                >
                                    Ingresar código completo
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Código completo de seguimiento
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="SA-2026-X9Y2"
                                    className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl text-lg uppercase font-mono tracking-wider focus:border-sanatorio-primary focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                    value={fullCode}
                                    onChange={(e) => setFullCode(e.target.value.toUpperCase())}
                                    autoFocus
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            </div>
                            <div className="flex justify-end mt-2">
                                <button
                                    type="button"
                                    onClick={() => { setUseFullInput(false); setSuffix(''); }}
                                    className="text-[11px] text-sanatorio-primary hover:underline font-medium"
                                >
                                    ← Solo últimos 4 dígitos
                                </button>
                            </div>
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading || !canSearch}
                        className="w-full py-3 bg-sanatorio-primary text-white rounded-xl font-bold hover:bg-[#004270] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
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
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 -translate-y-1/2 rounded-full"></div>
                            <div
                                className="absolute top-1/2 left-0 h-1 bg-green-500 -z-10 -translate-y-1/2 rounded-full transition-all duration-1000"
                                style={{ width: `${(getStatusStep(report.status) - 1) * 50}%` }}
                            ></div>

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

                            {/* Activity History Log — EXPANDABLE */}
                            <div className="mt-6 border-t border-gray-100 pt-6">
                                <h3 className="text-sm font-bold text-sanatorio-primary flex items-center gap-2 mb-1">
                                    <Clock className="w-4 h-4" />
                                    Historial de Actividad
                                </h3>
                                <p className="text-[10px] text-gray-400 mb-4">Tocá cada evento para ver el detalle completo</p>

                                <div className="relative space-y-0 pl-2">
                                    <div className="absolute top-2 bottom-2 left-[19px] w-0.5 bg-gray-100 -z-10"></div>

                                    {(() => {
                                        const events: { date: string; message: string; type: string; detail?: any }[] = [{
                                            date: new Date(report.created_at).toLocaleString('es-AR', {
                                                timeZone: 'America/Argentina/Buenos_Aires',
                                                day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            }),
                                            message: "Ticket Creado",
                                            type: 'start',
                                            detail: {
                                                content: report.content,
                                                ai_summary: report.ai_summary,
                                                evidence_urls: report.evidence_urls,
                                            }
                                        }];

                                        // Parse Notes
                                        if (report.notes) {
                                            const notes = report.notes.split('\n\n').filter((n: string) => n.trim().length > 0);
                                            notes.forEach((note: string) => {
                                                const match = note.match(/^\[([^\]]+)\]\s?(.*)/);
                                                if (match) {
                                                    const msg = match[2];
                                                    let type = 'info';
                                                    let detail: any = { rawNote: note };

                                                    if (msg.includes('📤 DERIVADO') || msg.includes('Derivado')) {
                                                        type = 'derivation';
                                                        const sectorMatch = msg.match(/→\s*(.+?)$/);
                                                        if (sectorMatch) {
                                                            const sectorName = sectorMatch[1].trim();
                                                            const matchingAssignment = sectorAssignments.find((a: any) =>
                                                                a.sector === sectorName || msg.includes(a.sector)
                                                            );
                                                            if (matchingAssignment) detail = { ...detail, assignment: matchingAssignment };
                                                        }
                                                    }
                                                    else if (msg.includes('⚠️ RECHAZADO POR CALIDAD')) {
                                                        type = 'quality_return';
                                                        const reasonMatch = msg.match(/RECHAZADO POR CALIDAD:\s*(.+)/);
                                                        if (reasonMatch) detail = { ...detail, rejectReason: reasonMatch[1].trim() };
                                                        if (report.resolution_history) {
                                                            const historyEntry = report.resolution_history.find((h: any) => {
                                                                const rejDate = new Date(h.rejected_at);
                                                                const noteDate = new Date(match[1]);
                                                                return Math.abs(rejDate.getTime() - noteDate.getTime()) < 60000;
                                                            });
                                                            if (historyEntry) detail = { ...detail, historyEntry };
                                                        }
                                                    }
                                                    else if (msg.includes('🔴 RECHAZO DE ASIGNACIÓN')) {
                                                        type = 'rejection';
                                                        const reasonMatch = msg.match(/RECHAZO DE ASIGNACIÓN:\s*(.+)/);
                                                        if (reasonMatch) detail = { ...detail, rejectReason: reasonMatch[1].trim() };
                                                    }
                                                    else if (msg.includes('🔄 APELADO') || msg.includes('REABIERTO')) {
                                                        type = 'reopen';
                                                    }
                                                    else if (msg.includes('✅ APROBADO POR CALIDAD')) {
                                                        type = 'approved';
                                                        detail = {
                                                            ...detail,
                                                            resolution_notes: report.resolution_notes,
                                                            root_cause: report.root_cause,
                                                            corrective_plan: report.corrective_plan,
                                                            resolution_evidence_urls: report.resolution_evidence_urls,
                                                        };
                                                    }
                                                    else if (msg.includes('RESOLUCIÓN RECIBIDA')) {
                                                        type = 'info';
                                                        // Find matching assignment
                                                        const assignmentMatch = sectorAssignments.find((a: any) =>
                                                            msg.includes(a.sector)
                                                        );
                                                        if (assignmentMatch) {
                                                            detail = {
                                                                ...detail,
                                                                assignment: assignmentMatch,
                                                                immediate_action: assignmentMatch.immediate_action,
                                                                resolution_evidence_urls: assignmentMatch.resolution_evidence_urls,
                                                            };
                                                        }
                                                    }
                                                    else if (msg.includes('❌ ERROR')) type = 'error';

                                                    events.push({ date: match[1], message: msg, type, detail });
                                                } else {
                                                    events.push({ date: '', message: note, type: 'note' });
                                                }
                                            });
                                        }

                                        // Status events
                                        if (report.status === 'resolved' && !events.some(e => e.type === 'approved')) {
                                            events.push({
                                                date: report.resolved_at ? new Date(report.resolved_at).toLocaleString('es-AR', {
                                                    timeZone: 'America/Argentina/Buenos_Aires',
                                                    day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                }) : '',
                                                message: "Resolución Finalizada",
                                                type: 'resolved',
                                                detail: {
                                                    resolution_notes: report.resolution_notes,
                                                    root_cause: report.root_cause,
                                                    corrective_plan: report.corrective_plan,
                                                    resolution_evidence_urls: report.resolution_evidence_urls,
                                                }
                                            });
                                        }

                                        if (report.status === 'quality_validation' && report.resolved_at) {
                                            events.push({
                                                date: new Date(report.resolved_at).toLocaleString('es-AR', {
                                                    timeZone: 'America/Argentina/Buenos_Aires',
                                                    day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                }),
                                                message: "🔍 Respuesta enviada — Pendiente de validación",
                                                type: 'info',
                                                detail: {
                                                    resolution_notes: report.resolution_notes,
                                                    root_cause: report.root_cause,
                                                    corrective_plan: report.corrective_plan,
                                                    resolution_evidence_urls: report.resolution_evidence_urls,
                                                }
                                            });
                                        }

                                        // Pending resolution with history
                                        if (report.status === 'pending_resolution' && report.resolution_history?.length > 0) {
                                            // Already shown in notes, but add a summary
                                        }

                                        const getIcon = (type: string) => {
                                            switch (type) {
                                                case 'start': return <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />;
                                                case 'derivation': return <Send className="w-4 h-4" />;
                                                case 'rejection': return <XCircle className="w-4 h-4" />;
                                                case 'quality_return': return <AlertTriangle className="w-4 h-4" />;
                                                case 'reopen': return <Activity className="w-4 h-4" />;
                                                case 'approved': return <CheckCircle className="w-5 h-5" />;
                                                case 'resolved': return <CheckCircle className="w-5 h-5" />;
                                                case 'error': return <AlertCircle className="w-4 h-4" />;
                                                default: return <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />;
                                            }
                                        };

                                        const bgColor: Record<string, string> = {
                                            start: 'bg-gray-200 text-gray-500',
                                            derivation: 'bg-blue-100 text-blue-600',
                                            rejection: 'bg-red-100 text-red-600',
                                            quality_return: 'bg-orange-100 text-orange-600',
                                            reopen: 'bg-amber-100 text-amber-600',
                                            approved: 'bg-green-100 text-green-600',
                                            resolved: 'bg-green-100 text-green-600',
                                            error: 'bg-red-100 text-red-500',
                                            info: 'bg-white border-blue-50 text-sanatorio-primary',
                                            note: 'bg-white border-purple-50 text-purple-500'
                                        };

                                        const textColor: Record<string, string> = {
                                            start: 'text-gray-700',
                                            derivation: 'text-blue-700',
                                            rejection: 'text-red-700 font-bold',
                                            quality_return: 'text-orange-700 font-bold',
                                            reopen: 'text-amber-700 font-bold',
                                            approved: 'font-bold text-green-700',
                                            resolved: 'font-bold text-green-700',
                                            error: 'text-red-600',
                                            info: 'text-gray-700',
                                            note: 'text-gray-700 italic'
                                        };

                                        const expandableTypes = ['start', 'derivation', 'quality_return', 'rejection', 'approved', 'resolved', 'info'];

                                        return events.map((event, idx) => {
                                            const hasDetail = expandableTypes.includes(event.type) && event.detail;
                                            const isExpanded = expandedLogEntry === idx;

                                            return (
                                                <div key={idx} className="flex gap-4 pb-6 last:pb-0 group">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-sm z-10 ${bgColor[event.type] || 'bg-gray-100 text-gray-500'}`}>
                                                        {getIcon(event.type)}
                                                    </div>

                                                    <div
                                                        className={`pt-1.5 w-full min-w-0 ${hasDetail ? 'cursor-pointer' : ''}`}
                                                        onClick={() => hasDetail && setExpandedLogEntry(isExpanded ? null : idx)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                {event.date && (
                                                                    <span className="text-xs text-gray-400 font-mono block mb-0.5">{event.date}</span>
                                                                )}
                                                                <div className={`text-sm ${textColor[event.type] || 'text-gray-700'}`}>
                                                                    {event.message}
                                                                </div>
                                                            </div>
                                                            {hasDetail && (
                                                                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                            )}
                                                        </div>

                                                        {/* Expanded Detail */}
                                                        {isExpanded && event.detail && (
                                                            <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3 text-xs animate-in fade-in slide-in-from-top-2 duration-200" onClick={e => e.stopPropagation()}>

                                                                {/* START: report detail */}
                                                                {event.type === 'start' && (
                                                                    <>
                                                                        {event.detail.ai_summary && (
                                                                            <div>
                                                                                <span className="font-bold text-purple-600">Resumen IA:</span>
                                                                                <p className="text-gray-600 mt-0.5">{event.detail.ai_summary}</p>
                                                                            </div>
                                                                        )}
                                                                        {event.detail.evidence_urls?.length > 0 && (
                                                                            <div>
                                                                                <span className="font-bold text-gray-600 flex items-center gap-1"><Image className="w-3 h-3" /> Evidencia ({event.detail.evidence_urls.length}):</span>
                                                                                <div className="flex gap-2 mt-1 overflow-x-auto pb-1">
                                                                                    {event.detail.evidence_urls.map((url: string, i: number) => (
                                                                                        <a key={i} href={url} target="_blank" className="w-14 h-14 rounded-lg bg-gray-200 bg-cover bg-center border border-gray-300 flex-shrink-0 hover:ring-2 ring-blue-400 transition-all cursor-zoom-in" style={{ backgroundImage: `url(${url})` }} />
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {/* DERIVATION: assignment detail */}
                                                                {event.type === 'derivation' && event.detail.assignment && (() => {
                                                                    const a = event.detail.assignment;
                                                                    return (
                                                                        <>
                                                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                                                <span className="font-bold">Estado:</span>
                                                                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${a.status === 'resolved' ? 'bg-green-100 text-green-700' : a.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                                                                            </div>
                                                                            {a.immediate_action && (
                                                                                <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                                                                                    <span className="font-bold text-green-700">Acción Inmediata:</span>
                                                                                    <p className="text-gray-600 mt-0.5">{a.immediate_action}</p>
                                                                                </div>
                                                                            )}
                                                                            {a.resolution_evidence_urls?.length > 0 && (
                                                                                <div>
                                                                                    <span className="font-bold text-gray-600">Evidencia:</span>
                                                                                    <div className="flex gap-2 mt-1 overflow-x-auto pb-1">
                                                                                        {a.resolution_evidence_urls.map((url: string, i: number) => (
                                                                                            <a key={i} href={url} target="_blank" className="w-14 h-14 rounded-lg bg-gray-200 bg-cover bg-center border border-gray-300 flex-shrink-0 hover:ring-2 ring-blue-400 transition-all cursor-zoom-in" style={{ backgroundImage: `url(${url})` }} />
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}

                                                                {/* QUALITY_RETURN */}
                                                                {event.type === 'quality_return' && (
                                                                    <>
                                                                        {event.detail.rejectReason && (
                                                                            <div className="bg-orange-50 p-2 rounded-lg border border-orange-100">
                                                                                <span className="font-bold text-orange-700">Motivo del Rechazo:</span>
                                                                                <p className="text-orange-600 mt-0.5">{event.detail.rejectReason}</p>
                                                                            </div>
                                                                        )}
                                                                        {event.detail.historyEntry && (
                                                                            <div className="space-y-1.5 bg-white p-2 rounded-lg border border-gray-100">
                                                                                <span className="font-bold text-gray-600">Solución Rechazada:</span>
                                                                                {event.detail.historyEntry.previous_data?.immediate_action && (
                                                                                    <p className="text-gray-400 line-through"><span className="font-bold text-gray-500 no-underline">Acción:</span> {event.detail.historyEntry.previous_data.immediate_action}</p>
                                                                                )}
                                                                                {event.detail.historyEntry.previous_data?.root_cause && (
                                                                                    <p className="text-gray-400 line-through"><span className="font-bold text-gray-500 no-underline">RCA:</span> {event.detail.historyEntry.previous_data.root_cause}</p>
                                                                                )}
                                                                                {event.detail.historyEntry.previous_data?.corrective_plan && (
                                                                                    <p className="text-gray-400 line-through"><span className="font-bold text-gray-500 no-underline">Plan:</span> {event.detail.historyEntry.previous_data.corrective_plan}</p>
                                                                                )}
                                                                                {event.detail.historyEntry.previous_data?.resolution_evidence_urls?.length > 0 && (
                                                                                    <div className="flex gap-2 mt-1 overflow-x-auto pb-1">
                                                                                        {event.detail.historyEntry.previous_data.resolution_evidence_urls.map((url: string, i: number) => (
                                                                                            <a key={i} href={url} target="_blank" className="w-12 h-12 rounded-lg bg-gray-200 bg-cover bg-center border border-gray-300 flex-shrink-0 opacity-60 hover:ring-2 ring-orange-400 transition-all cursor-zoom-in" style={{ backgroundImage: `url(${url})` }} />
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {/* REJECTION */}
                                                                {event.type === 'rejection' && event.detail.rejectReason && (
                                                                    <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                                                                        <span className="font-bold text-red-700">Motivo:</span>
                                                                        <p className="text-red-600 mt-0.5">{event.detail.rejectReason}</p>
                                                                    </div>
                                                                )}

                                                                {/* APPROVED / RESOLVED / INFO with resolution data */}
                                                                {(event.type === 'approved' || event.type === 'resolved' || event.type === 'info') && (event.detail.resolution_notes || event.detail.root_cause || event.detail.corrective_plan || event.detail.immediate_action) && (
                                                                    <div className="space-y-2">
                                                                        {(event.detail.resolution_notes || event.detail.immediate_action) && (
                                                                            <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                                                                                <span className="font-bold text-blue-700">Acción Inmediata:</span>
                                                                                <p className="text-gray-600 mt-0.5">{event.detail.resolution_notes || event.detail.immediate_action}</p>
                                                                            </div>
                                                                        )}
                                                                        {event.detail.root_cause && (
                                                                            <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                                                                                <span className="font-bold text-amber-700">Causa Raíz:</span>
                                                                                <p className="text-gray-600 mt-0.5">{event.detail.root_cause}</p>
                                                                            </div>
                                                                        )}
                                                                        {event.detail.corrective_plan && (
                                                                            <div className="bg-green-50 p-2 rounded-lg border border-green-100">
                                                                                <span className="font-bold text-green-700">Plan de Acción:</span>
                                                                                <p className="text-gray-600 mt-0.5">{event.detail.corrective_plan}</p>
                                                                            </div>
                                                                        )}
                                                                        {event.detail.resolution_evidence_urls?.length > 0 && (
                                                                            <div>
                                                                                <span className="font-bold text-gray-600">Evidencia:</span>
                                                                                <div className="flex gap-2 mt-1 overflow-x-auto pb-1">
                                                                                    {event.detail.resolution_evidence_urls.map((url: string, i: number) => (
                                                                                        <a key={i} href={url} target="_blank" className="w-14 h-14 rounded-lg bg-gray-200 bg-cover bg-center border border-gray-300 flex-shrink-0 hover:ring-2 ring-green-400 transition-all cursor-zoom-in" style={{ backgroundImage: `url(${url})` }} />
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            {/* Resolution History (rejected solutions) */}
                            {report.resolution_history?.length > 0 && (
                                <div className="mt-4 bg-red-50 rounded-2xl p-5 border border-red-100">
                                    <h4 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-3">
                                        <AlertTriangle className="w-4 h-4" />
                                        Historial de Soluciones Rechazadas ({report.resolution_history.length})
                                    </h4>
                                    <div className="space-y-3">
                                        {report.resolution_history.map((entry: any, index: number) => (
                                            <div key={index} className="bg-white rounded-xl p-4 border border-red-100 shadow-sm relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-red-200"></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                            Rechazado el {new Date(entry.rejected_at).toLocaleString('es-AR')}
                                                        </span>
                                                        <p className="text-xs font-bold text-red-600 mt-1">Motivo: "{entry.reject_reason}"</p>
                                                    </div>
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full shrink-0">Intento #{index + 1}</span>
                                                </div>
                                                <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    {entry.previous_data?.immediate_action && (
                                                        <div><span className="font-bold text-blue-700">Acción:</span> <span className="line-through text-gray-400">{entry.previous_data.immediate_action}</span></div>
                                                    )}
                                                    {entry.previous_data?.root_cause && (
                                                        <div><span className="font-bold text-amber-700">RCA:</span> <span className="line-through text-gray-400">{entry.previous_data.root_cause}</span></div>
                                                    )}
                                                    {entry.previous_data?.corrective_plan && (
                                                        <div><span className="font-bold text-green-700">Plan:</span> <span className="line-through text-gray-400">{entry.previous_data.corrective_plan}</span></div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
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

                            {report.status === 'pending' && (
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
