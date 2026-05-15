import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SECTOR_OPTIONS } from '../constants/sectors';
import {
    Loader2,
    Clock,
    CheckCircle2,
    AlertCircle,
    Activity,
    Search,
    XCircle,
    Filter,
    Inbox,
    ChevronDown,
    Send,
    AlertTriangle,
    Eye,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending: { label: 'Recibido', color: 'text-gray-600', bg: 'bg-gray-100 border-gray-200', icon: <Clock className="w-3.5 h-3.5" /> },
    analyzed: { label: 'Analizado', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: <Activity className="w-3.5 h-3.5" /> },
    pending_resolution: { label: 'En Resolución', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <AlertCircle className="w-3.5 h-3.5" /> },
    in_progress: { label: 'En Proceso', color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', icon: <Activity className="w-3.5 h-3.5" /> },
    quality_validation: { label: 'Validación Calidad', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', icon: <Eye className="w-3.5 h-3.5" /> },
    resolved: { label: 'Resuelto', color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    discarded: { label: 'Descartado', color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200', icon: <XCircle className="w-3.5 h-3.5" /> },
    cancelled: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
};

type FilterType = 'all' | 'active' | 'resolved';

export const SectorTracking = () => {
    const { sectors } = useAuth();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const fetchReports = async () => {
            if (!sectors || sectors.length === 0) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .in('reporter_sector', sectors)
                .not('status', 'eq', 'discarded')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[SectorTracking] Error:', error);
            } else {
                setReports(data || []);
            }
            setLoading(false);
        };

        fetchReports();
    }, [sectors]);

    const filtered = reports.filter(r => {
        if (filter === 'active' && r.status === 'resolved') return false;
        if (filter === 'resolved' && r.status !== 'resolved') return false;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const sectorLabel = (SECTOR_OPTIONS.find(s => s.value === r.sector)?.label || r.sector || '').toLowerCase();
            const fields = [r.tracking_id, r.content, r.ai_summary, sectorLabel].filter(Boolean).map(f => f.toLowerCase());
            return fields.some(f => f.includes(q));
        }
        return true;
    });

    const activeCount = reports.filter(r => r.status !== 'resolved').length;
    const resolvedCount = reports.filter(r => r.status === 'resolved').length;

    const getStepProgress = (status: string) => {
        if (status === 'resolved') return 3;
        if (['in_progress', 'analyzed', 'pending_resolution', 'quality_validation'].includes(status)) return 2;
        return 1;
    };

    const parseNotes = (notes: string | null) => {
        if (!notes) return [];
        return notes.split('\n\n').filter(n => n.trim().length > 0).map(note => {
            const match = note.match(/^\[([^\]]+)\]\s?(.*)/s);
            if (match) {
                let type = 'info';
                const msg = match[2];
                if (msg.includes('📤 DERIVADO') || msg.includes('Derivado')) type = 'derivation';
                else if (msg.includes('⚠️ RECHAZADO POR CALIDAD')) type = 'quality_return';
                else if (msg.includes('🔴 RECHAZO DE ASIGNACIÓN')) type = 'rejection';
                else if (msg.includes('🔄 APELADO') || msg.includes('REABIERTO')) type = 'reopen';
                else if (msg.includes('✅ APROBADO POR CALIDAD')) type = 'approved';
                return { date: match[1], message: msg, type };
            }
            return { date: '', message: note, type: 'note' };
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-sanatorio-primary mx-auto" />
                    <p className="text-sm text-gray-500 font-medium">Cargando monitoreo...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">


            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-black text-gray-800">{reports.length}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Activos</p>
                    <p className="text-2xl font-black text-amber-700">{activeCount}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Resueltos</p>
                    <p className="text-2xl font-black text-green-700">{resolvedCount}</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    {(['all', 'active', 'resolved'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f
                                ? 'bg-sanatorio-primary text-white shadow-sm'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Resueltos'}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar por ID, palabras clave..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sanatorio-primary/30 focus:border-sanatorio-primary transition-all placeholder:text-gray-400"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <XCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Reports List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
                    <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-500 mb-1">No hay casos en monitoreo</h3>
                    <p className="text-sm text-gray-400">
                        {searchQuery ? `Sin resultados para "${searchQuery}"` : filter !== 'all' ? 'No hay reportes con este filtro.' : 'Aún no hay reportes de tu sector.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(report => {
                        const statusInfo = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
                        const destSector = SECTOR_OPTIONS.find(s => s.value === report.sector)?.label || report.sector || 'Sin sector';
                        const isExpanded = expandedId === report.id;
                        const step = getStepProgress(report.status);
                        const noteEntries = parseNotes(report.notes);
                        const hasActivity = noteEntries.length > 0 || report.status === 'resolved';

                        return (
                            <div key={report.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                <div className="p-4">
                                    {/* Top row */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-mono font-bold text-sanatorio-primary text-sm">{report.tracking_id}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${statusInfo.bg} ${statusInfo.color}`}>
                                                    {statusInfo.icon}
                                                    {statusInfo.label}
                                                </span>
                                                {report.ai_urgency === 'Rojo' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">🔴 Crítico</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                <span className="font-bold">Dirigido a:</span> {destSector} · {new Date(report.created_at).toLocaleDateString('es-AR')}
                                            </p>
                                        </div>
                                        {hasActivity && (
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : report.id)}
                                                className="flex-shrink-0 px-3 py-2 bg-gray-50 text-gray-600 font-bold text-xs rounded-lg hover:bg-sanatorio-primary/5 hover:text-sanatorio-primary transition-all flex items-center gap-1.5 border border-gray-200"
                                            >
                                                <Activity className="w-3.5 h-3.5" />
                                                Actividad
                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Content preview */}
                                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                                        {report.ai_summary || report.content}
                                    </p>

                                    {/* Mini progress bar */}
                                    <div className="mt-3 flex items-center gap-1.5">
                                        {['Recibido', 'En Gestión', 'Resuelto'].map((label, idx) => {
                                            const active = step > idx;
                                            return (
                                                <div key={idx} className="flex items-center gap-1.5 flex-1">
                                                    <div className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${active ? 'bg-green-400' : 'bg-gray-100'}`} />
                                                    <span className={`text-[9px] font-bold ${active ? 'text-green-600' : 'text-gray-300'}`}>{label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Resolution summary (if resolved) */}
                                    {report.status === 'resolved' && report.resolution_notes && !isExpanded && (
                                        <div className="mt-3 p-2.5 bg-green-50 rounded-lg border border-green-100">
                                            <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-0.5">Resolución</p>
                                            <p className="text-xs text-green-700 line-clamp-2">{report.resolution_notes.split("Origen:")[0]}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Expanded Activity Timeline */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50/50 p-4 animate-in slide-in-from-top-2 duration-200">
                                        <h4 className="text-xs font-bold text-sanatorio-primary flex items-center gap-1.5 mb-3">
                                            <Clock className="w-3.5 h-3.5" />
                                            Historial de Actividad
                                        </h4>

                                        <div className="relative space-y-0 pl-1">
                                            <div className="absolute top-2 bottom-2 left-[11px] w-0.5 bg-gray-200 -z-10" />

                                            {/* Creation event */}
                                            <TimelineEntry
                                                date={new Date(report.created_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                message="Ticket Creado"
                                                type="start"
                                            />

                                            {/* Notes-based events */}
                                            {noteEntries.map((entry, idx) => (
                                                <TimelineEntry key={idx} date={entry.date} message={entry.message} type={entry.type} />
                                            ))}

                                            {/* Resolution event */}
                                            {report.status === 'resolved' && (
                                                <TimelineEntry
                                                    date={report.resolved_at ? new Date(report.resolved_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                                    message="✅ Caso Resuelto"
                                                    type="resolved"
                                                />
                                            )}

                                            {report.status === 'quality_validation' && (
                                                <TimelineEntry
                                                    date=""
                                                    message="🔍 Pendiente de validación por Calidad"
                                                    type="info"
                                                />
                                            )}
                                        </div>

                                        {/* Resolution details */}
                                        {report.status === 'resolved' && (report.resolution_notes || report.root_cause || report.corrective_plan) && (
                                            <div className="mt-4 space-y-2">
                                                {report.resolution_notes && (
                                                    <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                                                        <span className="text-[10px] font-bold text-blue-600 uppercase">Acción Inmediata</span>
                                                        <p className="text-xs text-gray-600 mt-0.5">{report.resolution_notes.split("Origen:")[0]}</p>
                                                    </div>
                                                )}
                                                {report.root_cause && (
                                                    <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                                                        <span className="text-[10px] font-bold text-amber-600 uppercase">Causa Raíz</span>
                                                        <p className="text-xs text-gray-600 mt-0.5">{report.root_cause}</p>
                                                    </div>
                                                )}
                                                {report.corrective_plan && (
                                                    <div className="bg-green-50 p-2.5 rounded-lg border border-green-100">
                                                        <span className="text-[10px] font-bold text-green-600 uppercase">Plan de Acción</span>
                                                        <p className="text-xs text-gray-600 mt-0.5">{report.corrective_plan}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ─── Timeline Entry Sub-component ─── */
const TimelineEntry = ({ date, message, type }: { date: string; message: string; type: string }) => {
    const iconMap: Record<string, React.ReactNode> = {
        start: <div className="w-2 h-2 rounded-full bg-gray-400" />,
        derivation: <Send className="w-3.5 h-3.5" />,
        rejection: <XCircle className="w-3.5 h-3.5" />,
        quality_return: <AlertTriangle className="w-3.5 h-3.5" />,
        reopen: <Activity className="w-3.5 h-3.5" />,
        approved: <CheckCircle2 className="w-4 h-4" />,
        resolved: <CheckCircle2 className="w-4 h-4" />,
        info: <div className="w-2 h-2 rounded-full bg-blue-400" />,
        note: <div className="w-2 h-2 rounded-full bg-purple-400" />,
    };

    const bgMap: Record<string, string> = {
        start: 'bg-gray-200 text-gray-500',
        derivation: 'bg-blue-100 text-blue-600',
        rejection: 'bg-red-100 text-red-600',
        quality_return: 'bg-orange-100 text-orange-600',
        reopen: 'bg-amber-100 text-amber-600',
        approved: 'bg-green-100 text-green-600',
        resolved: 'bg-green-100 text-green-600',
        info: 'bg-blue-50 text-blue-500',
        note: 'bg-purple-50 text-purple-500',
    };

    const textMap: Record<string, string> = {
        start: 'text-gray-700',
        derivation: 'text-blue-700',
        rejection: 'text-red-700 font-bold',
        quality_return: 'text-orange-700 font-bold',
        reopen: 'text-amber-700 font-bold',
        approved: 'text-green-700 font-bold',
        resolved: 'text-green-700 font-bold',
        info: 'text-gray-700',
        note: 'text-gray-700 italic',
    };

    return (
        <div className="flex gap-3 pb-4 last:pb-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10 ${bgMap[type] || 'bg-gray-100 text-gray-500'}`}>
                {iconMap[type] || <div className="w-2 h-2 rounded-full bg-gray-400" />}
            </div>
            <div className="pt-0.5 min-w-0">
                {date && <span className="text-[10px] text-gray-400 font-mono block">{date}</span>}
                <p className={`text-xs leading-relaxed ${textMap[type] || 'text-gray-700'}`}>{message}</p>
            </div>
        </div>
    );
};
