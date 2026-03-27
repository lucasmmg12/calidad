import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SECTOR_OPTIONS } from '../constants/sectors';
import {
    Loader2,
    ExternalLink,
    Clock,
    CheckCircle2,
    XCircle,
    Inbox,
    Filter,
    FileQuestion,
    MessageSquare,
} from 'lucide-react';

interface Assignment {
    id: string;
    report_id: string;
    sector: string;
    assigned_phone: string;
    management_type: string;
    status: string;
    immediate_action: string | null;
    created_at: string;
    resolved_at: string | null;
    reports: {
        id: string;
        tracking_id: string;
        content: string;
        ai_summary: string | null;
        status: string;
        created_at: string;
        sector: string;
        evidence_urls: string[];
        quality_observations: string | null;
    };
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'Pendiente', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
    resolved: { label: 'Resuelto', color: 'text-green-700 bg-green-50 border-green-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    quality_validation: { label: 'En Validación', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: <FileQuestion className="w-3.5 h-3.5" /> },
    rejected: { label: 'Rechazado', color: 'text-red-700 bg-red-50 border-red-200', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const TYPE_MAP: Record<string, { label: string; color: string }> = {
    simple: { label: 'Simple', color: 'bg-blue-100 text-blue-700' },
    desvio: { label: 'Desvío', color: 'bg-orange-100 text-orange-700' },
    adverse: { label: 'Evento Adverso', color: 'bg-red-100 text-red-700' },
};

export const MyCases = () => {
    const { profile, sectors } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');

    useEffect(() => {
        const fetchMyCases = async () => {
            if (!profile) return;

            try {
                // Fetch assignments where the phone matches or the sector is in user's assigned sectors
                const userPhone = profile.phone_number || '';

                let query = supabase
                    .from('sector_assignments')
                    .select(`
                        id,
                        report_id,
                        sector,
                        assigned_phone,
                        management_type,
                        status,
                        immediate_action,
                        created_at,
                        resolved_at,
                        reports!inner (
                            id,
                            tracking_id,
                            content,
                            ai_summary,
                            status,
                            created_at,
                            sector,
                            evidence_urls,
                            quality_observations
                        )
                    `)
                    .order('created_at', { ascending: false });

                // For responsables: filter by their phone or sectors
                // For admins/directivos: show assignments for their sectors too
                if (userPhone) {
                    query = query.or(`assigned_phone.eq.${userPhone},sector.in.(${sectors.join(',')})`);
                } else if (sectors.length > 0) {
                    query = query.in('sector', sectors);
                }

                const { data, error } = await query;

                if (error) {
                    console.error('[MyCases] Error:', error);
                } else {
                    setAssignments((data as any) || []);
                }
            } catch (err) {
                console.error('[MyCases] Unexpected error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMyCases();
    }, [profile, sectors]);

    const filteredAssignments = assignments.filter(a => {
        if (filter === 'pending') return a.status === 'pending';
        if (filter === 'resolved') return a.status === 'resolved' || a.status === 'quality_validation';
        return true;
    });

    const pendingCount = assignments.filter(a => a.status === 'pending').length;
    const resolvedCount = assignments.filter(a => a.status === 'resolved' || a.status === 'quality_validation').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-sanatorio-primary mx-auto" />
                    <p className="text-sm text-gray-500 font-medium">Cargando tus casos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 mb-20">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-display font-black text-gray-900 mb-2">Mis Casos</h1>
                <p className="text-gray-500">
                    Todos los casos asignados a tus sectores ({sectors.map(s => SECTOR_OPTIONS.find(o => o.value === s)?.label || s).join(', ') || 'ninguno'})
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
                    <p className="text-2xl font-black text-gray-800">{assignments.length}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pendientes</p>
                    <p className="text-2xl font-black text-amber-700">{pendingCount}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Resueltos</p>
                    <p className="text-2xl font-black text-green-700">{resolvedCount}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-6">
                <Filter className="w-4 h-4 text-gray-400" />
                {(['all', 'pending', 'resolved'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f
                            ? 'bg-sanatorio-primary text-white shadow-sm'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : 'Resueltos'}
                    </button>
                ))}
            </div>

            {/* Cases List */}
            {filteredAssignments.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200">
                    <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-500 mb-1">No hay casos</h3>
                    <p className="text-sm text-gray-400">
                        {filter !== 'all' ? 'No hay casos con este filtro.' : 'Aún no tenés casos asignados.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredAssignments.map(assignment => {
                        const report = assignment.reports as any;
                        const statusInfo = STATUS_MAP[assignment.status] || STATUS_MAP.pending;
                        const typeInfo = TYPE_MAP[assignment.management_type] || TYPE_MAP.simple;
                        const sectorLabel = SECTOR_OPTIONS.find(s => s.value === assignment.sector)?.label || assignment.sector;
                        const resolutionLink = `/resolver-caso/${report.tracking_id}/${assignment.id}`;

                        return (
                            <div
                                key={assignment.id}
                                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
                            >
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-mono font-bold text-sanatorio-primary text-sm">{report.tracking_id}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.color} flex items-center gap-1`}>
                                                    {statusInfo.icon}
                                                    {statusInfo.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-2">
                                                <span className="font-bold">{sectorLabel}</span> · {new Date(assignment.created_at).toLocaleDateString('es-AR')}
                                            </p>
                                        </div>
                                        <a
                                            href={resolutionLink}
                                            className="flex-shrink-0 px-3 py-2 bg-sanatorio-primary text-white font-bold text-xs rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            {assignment.status === 'pending' ? 'Gestionar' : 'Ver'}
                                        </a>
                                    </div>

                                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                                        {report.ai_summary || report.content}
                                    </p>

                                    {assignment.immediate_action && (
                                        <div className="mt-3 p-2.5 bg-green-50 rounded-lg border border-green-100">
                                            <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-0.5">Acción Inmediata</p>
                                            <p className="text-xs text-green-700 line-clamp-2">{assignment.immediate_action}</p>
                                        </div>
                                    )}

                                    {report.quality_observations && (
                                        <div className="mt-3 p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <MessageSquare className="w-3 h-3 text-indigo-500" />
                                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Observaciones de Calidad</p>
                                            </div>
                                            <p className="text-xs text-indigo-700 line-clamp-3 whitespace-pre-wrap">{report.quality_observations}</p>
                                        </div>
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
