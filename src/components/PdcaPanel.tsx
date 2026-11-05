import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    ClipboardCheck,
    Calendar,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    Clock,
    Shield,
    Search,
    Layers,
    FolderOpen
} from 'lucide-react';

interface FollowUp {
    id: string;
    report_id: string;
    checkpoint_type: '30d' | '60d' | '90d';
    due_date: string;
    status: 'pending' | 'completed' | 'overdue' | 'skipped';
    verification_result: 'effective' | 'partial' | 'ineffective' | null;
    verified_at: string | null;
    notes: string | null;
    report?: {
        tracking_id: string;
        sector: string;
        ai_category: string;
        ai_summary: string;
        corrective_action_plan: string;
    };
}

export const PdcaPanel = () => {
    const [followUps, setFollowUps] = useState<FollowUp[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
    const [verificationResult, setVerificationResult] = useState<string>('');
    const [verificationNotes, setVerificationNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('pending');

    // Collapsible state so DOM nodes are only mounted when expanded (saving RAM)
    const [isPanelExpanded, setIsPanelExpanded] = useState(false);
    const [groupBy, setGroupBy] = useState<'sector' | 'checkpoint'>('sector');
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [searchQuery, setSearchQuery] = useState('');

    const { role, sectors, session } = useAuth();

    useEffect(() => {
        fetchFollowUps();
    }, [role, sectors]);

    const fetchFollowUps = async () => {
        setLoading(true);
        const pageSize = 1000;
        let allRows: any[] = [];
        let from = 0;
        let hasMore = true;

        // Fetch all pages without Supabase's default 1000-row cap
        while (hasMore) {
            const { data, error } = await supabase
                .from('follow_ups')
                .select(`
                    *,
                    report:reports(tracking_id, sector, ai_category, ai_summary, corrective_action_plan)
                `)
                .order('due_date', { ascending: true })
                .range(from, from + pageSize - 1);

            if (error) {
                console.error('Error fetching follow-ups:', error);
                setLoading(false);
                return;
            }

            if (data && data.length > 0) {
                allRows = allRows.concat(data);
                if (data.length < pageSize) {
                    hasMore = false;
                } else {
                    from += pageSize;
                }
            } else {
                hasMore = false;
            }
        }

        // Mark overdue
        const now = new Date();
        let filtered = allRows.map(f => ({
            ...f,
            status: f.status === 'pending' && new Date(f.due_date) < now ? 'overdue' : f.status
        }));

        // Role-based filter
        if (role === 'responsable') {
            filtered = filtered.filter(f =>
                f.report?.sector && sectors.includes(f.report.sector)
            );
        }

        setFollowUps(filtered as FollowUp[]);
        setLoading(false);
    };

    const handleVerify = async () => {
        if (!selectedFollowUp || !verificationResult) return;
        setSaving(true);

        const { error } = await supabase
            .from('follow_ups')
            .update({
                status: 'completed',
                verification_result: verificationResult,
                notes: verificationNotes || null,
                verified_by: session?.user?.id,
                verified_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', selectedFollowUp.id);

        if (error) {
            console.error('Error saving verification:', error);
            alert('Error al guardar la verificación.');
        } else {
            setSelectedFollowUp(null);
            setVerificationResult('');
            setVerificationNotes('');
            fetchFollowUps();
        }
        setSaving(false);
    };

    const handleApproveOverdue = async () => {
        if (!confirm('¿Estás seguro de que deseas aprobar automáticamente todas las verificaciones vencidas? Esto las marcará como Completadas y Efectivas.')) return;
        setSaving(true);
        const overdueIds = followUps.filter(f => f.status === 'overdue').map(f => f.id);

        if (overdueIds.length === 0) {
            setSaving(false);
            return;
        }

        // Process in batches of 200 to avoid URL/payload limits when there are hundreds of overdue rows
        const chunkSize = 200;
        let hadError = false;
        for (let i = 0; i < overdueIds.length; i += chunkSize) {
            const chunk = overdueIds.slice(i, i + chunkSize);
            const { error } = await supabase
                .from('follow_ups')
                .update({
                    status: 'completed',
                    verification_result: 'effective',
                    notes: 'Aprobación automática en lote (Vencidas)',
                    verified_by: session?.user?.id,
                    verified_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .in('id', chunk);

            if (error) {
                console.error('Error batch approving:', error);
                hadError = true;
                break;
            }
        }

        if (hadError) {
            alert('Error al aprobar algunas verificaciones vencidas.');
        } else {
            fetchFollowUps();
        }
        setSaving(false);
    };

    const filteredFollowUps = useMemo(() => {
        return followUps.filter(f => {
            if (filter === 'overdue' && f.status !== 'overdue') return false;
            if (filter === 'completed' && f.status !== 'completed') return false;
            if (filter === 'pending' && f.status !== 'pending') return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchId = (f.report?.tracking_id || '').toLowerCase().includes(q);
                const matchSector = (f.report?.sector || '').toLowerCase().includes(q);
                const matchSummary = (f.report?.ai_summary || '').toLowerCase().includes(q);
                if (!matchId && !matchSector && !matchSummary) return false;
            }
            return true;
        });
    }, [followUps, filter, searchQuery]);

    const groupedFollowUps = useMemo(() => {
        const map = new Map<string, FollowUp[]>();
        filteredFollowUps.forEach(fu => {
            const key =
                groupBy === 'sector'
                    ? fu.report?.sector || 'Sin Sector Asignado'
                    : fu.checkpoint_type === '30d'
                        ? 'Control a 30 Días'
                        : fu.checkpoint_type === '60d'
                            ? 'Control a 60 Días'
                            : 'Control a 90 Días';
            const list = map.get(key) || [];
            list.push(fu);
            map.set(key, list);
        });
        return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
    }, [filteredFollowUps, groupBy]);

    const toggleGroup = (key: string) => {
        setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // KPIs
    const totalPending = useMemo(() => followUps.filter(f => f.status === 'pending').length, [followUps]);
    const totalCompleted = useMemo(() => followUps.filter(f => f.status === 'completed').length, [followUps]);
    const totalEffective = useMemo(() => followUps.filter(f => f.verification_result === 'effective').length, [followUps]);
    const totalOverdue = useMemo(() => followUps.filter(f => f.status === 'overdue').length, [followUps]);
    const effectivenessRate = totalCompleted > 0 ? Math.round((totalEffective / totalCompleted) * 100) : 0;

    const checkpointLabel = (type: string) => {
        switch (type) {
            case '30d': return '30 Días';
            case '60d': return '60 Días';
            case '90d': return '90 Días';
            default: return type;
        }
    };

    const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
        pending: { label: 'Pendiente', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Clock className="w-3.5 h-3.5" /> },
        overdue: { label: 'Vencido', color: 'bg-red-50 text-red-700 border-red-200', icon: <AlertCircle className="w-3.5 h-3.5" /> },
        completed: { label: 'Verificado', color: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
        skipped: { label: 'Omitido', color: 'bg-gray-50 text-gray-500 border-gray-200', icon: <XCircle className="w-3.5 h-3.5" /> },
    };

    const resultConfig: Record<string, { label: string; color: string; emoji: string }> = {
        effective: { label: 'Efectiva', color: 'text-green-600', emoji: '✅' },
        partial: { label: 'Parcial', color: 'text-amber-600', emoji: '⚠️' },
        ineffective: { label: 'Inefectiva', color: 'text-red-600', emoji: '❌' },
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-sanatorio-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* PDCA KPIs (Clicking any KPI also opens & filters the collapsible panel) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div
                    onClick={() => { setFilter('all'); setIsPanelExpanded(true); }}
                    className="bg-white rounded-2xl border border-gray-100 p-4 text-center cursor-pointer hover:border-sanatorio-primary/30 transition-all"
                >
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Verificaciones Totales</p>
                    <p className="text-3xl font-black text-gray-800 mt-1">{followUps.length}</p>
                    <p className="text-[10px] text-sanatorio-primary font-semibold mt-1">Sin límite de registros</p>
                </div>
                <div
                    onClick={() => { setFilter('completed'); setIsPanelExpanded(true); }}
                    className="bg-white rounded-2xl border border-gray-100 p-4 text-center cursor-pointer hover:border-green-300 transition-all"
                >
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completadas</p>
                    <p className="text-3xl font-black text-green-600 mt-1">{totalCompleted}</p>
                    <p className="text-[10px] text-green-600 font-semibold mt-1">Click para desplegar</p>
                </div>
                <div
                    onClick={() => { setFilter('overdue'); setIsPanelExpanded(true); }}
                    className="bg-white rounded-2xl border border-gray-100 p-4 text-center cursor-pointer hover:border-red-300 transition-all"
                >
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vencidas</p>
                    <p className="text-3xl font-black text-red-600 mt-1">{totalOverdue}</p>
                    <p className="text-[10px] text-red-500 font-semibold mt-1">Click para desplegar</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-2 opacity-5">
                        <TrendingUp className="w-16 h-16 text-sanatorio-primary" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tasa Efectividad</p>
                    <p className="text-3xl font-black text-sanatorio-primary mt-1">{effectivenessRate}%</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">Sobre casos verificados</p>
                </div>
            </div>

            {/* Master Collapsible Container to avoid mounting hundreds of DOM nodes until requested */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div
                    onClick={() => setIsPanelExpanded(prev => !prev)}
                    className="p-4 sm:p-5 bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sanatorio-primary/10 text-sanatorio-primary flex items-center justify-center shrink-0">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black text-slate-800">
                                    Explorador Desplegable de Verificaciones PDCA ({filteredFollowUps.length})
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Memoria Optimizada
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                {isPanelExpanded
                                    ? 'Hacé clic en cada sector o etapa para desplegar únicamente los controles que necesites auditar.'
                                    : 'Panel contraído para ahorrar memoria RAM. Hacé clic aquí para desplegar los grupos de verificación.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-xs font-bold text-sanatorio-primary">
                            {isPanelExpanded ? 'Ocultar listado' : `Desplegar (${filteredFollowUps.length})`}
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                            {isPanelExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                    </div>
                </div>

                {isPanelExpanded && (
                    <div className="p-4 sm:p-6 border-t border-slate-200/80 space-y-5 animate-in fade-in duration-200">
                        {/* Filter tabs, Grouping toggle, Search, and Actions */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                {[
                                    { id: 'pending' as const, label: 'Pendientes', count: totalPending },
                                    { id: 'overdue' as const, label: 'Vencidas', count: totalOverdue },
                                    { id: 'completed' as const, label: 'Completadas', count: totalCompleted },
                                    { id: 'all' as const, label: 'Todas', count: followUps.length },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setFilter(tab.id);
                                            setOpenGroups({});
                                        }}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            filter === tab.id
                                                ? 'bg-sanatorio-primary text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {tab.label} ({tab.count})
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {/* Group by selector */}
                                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                                    <button
                                        onClick={() => { setGroupBy('sector'); setOpenGroups({}); }}
                                        className={`px-3 py-1.5 rounded-lg transition-all ${
                                            groupBy === 'sector'
                                                ? 'bg-white text-sanatorio-primary shadow-xs'
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        Por Sector
                                    </button>
                                    <button
                                        onClick={() => { setGroupBy('checkpoint'); setOpenGroups({}); }}
                                        className={`px-3 py-1.5 rounded-lg transition-all ${
                                            groupBy === 'checkpoint'
                                                ? 'bg-white text-sanatorio-primary shadow-xs'
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        Por Etapa (30/60/90d)
                                    </button>
                                </div>

                                {/* Search input */}
                                <div className="relative min-w-[210px]">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Buscar #ID o sector..."
                                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sanatorio-primary/20"
                                    />
                                </div>

                                {role === 'admin' && totalOverdue > 0 && (
                                    <button
                                        onClick={handleApproveOverdue}
                                        disabled={saving}
                                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Aprobar Vencidas ({totalOverdue})
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Collapsible Groups (Only open groups mount their follow-up cards in DOM) */}
                        <div className="space-y-2.5">
                            {groupedFollowUps.length === 0 ? (
                                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-10 text-center text-gray-400">
                                    <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm font-medium">No hay verificaciones en esta categoría</p>
                                </div>
                            ) : (
                                groupedFollowUps.map(([groupName, groupItems]) => {
                                    const isGroupOpen = !!openGroups[groupName];
                                    const overdueInGroup = groupItems.filter(i => i.status === 'overdue').length;
                                    const pendingInGroup = groupItems.filter(i => i.status === 'pending').length;
                                    const completedInGroup = groupItems.filter(i => i.status === 'completed').length;

                                    return (
                                        <div
                                            key={groupName}
                                            className="rounded-xl border border-slate-200/90 bg-white overflow-hidden"
                                        >
                                            {/* Group Accordion Header */}
                                            <div
                                                onClick={() => toggleGroup(groupName)}
                                                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <FolderOpen className="w-4 h-4 text-sanatorio-primary shrink-0" />
                                                    <span className="font-bold text-sm text-slate-800">{groupName}</span>
                                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-sanatorio-primary/10 text-sanatorio-primary">
                                                        {groupItems.length}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {pendingInGroup > 0 && (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                            {pendingInGroup} pend.
                                                        </span>
                                                    )}
                                                    {overdueInGroup > 0 && (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                            {overdueInGroup} venc.
                                                        </span>
                                                    )}
                                                    {completedInGroup > 0 && (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            {completedInGroup} verif.
                                                        </span>
                                                    )}
                                                    {isGroupOpen ? (
                                                        <ChevronUp className="w-4 h-4 text-slate-500" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-slate-500" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Group Body: Lazy mounted only when isGroupOpen is true */}
                                            {isGroupOpen && (
                                                <div className="p-3 space-y-2 border-t border-slate-100 bg-slate-50/30">
                                                    {groupItems.map(fu => {
                                                        const st = statusConfig[fu.status] || statusConfig.pending;
                                                        const isExpanded = expandedId === fu.id;
                                                        const daysUntilDue = Math.ceil(
                                                            (new Date(fu.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                                                        );

                                                        return (
                                                            <div
                                                                key={fu.id}
                                                                className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-all"
                                                            >
                                                                <div
                                                                    className="flex items-center gap-3 p-3.5 cursor-pointer"
                                                                    onClick={() => setExpandedId(isExpanded ? null : fu.id)}
                                                                >
                                                                    {/* Checkpoint badge */}
                                                                    <span className="px-2.5 py-1 bg-sanatorio-primary/10 text-sanatorio-primary text-[10px] font-black rounded-lg">
                                                                        {checkpointLabel(fu.checkpoint_type)}
                                                                    </span>

                                                                    {/* Ticket info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="font-bold text-sm text-gray-800">
                                                                            {fu.report?.tracking_id || 'Sin ID'}
                                                                        </span>
                                                                        <span className="text-xs text-gray-400 ml-2">
                                                                            {fu.report?.sector || ''}
                                                                        </span>
                                                                    </div>

                                                                    {/* Due date */}
                                                                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
                                                                        <Calendar className="w-3.5 h-3.5" />
                                                                        {new Date(fu.due_date).toLocaleDateString('es-AR')}
                                                                        {fu.status !== 'completed' && (
                                                                            <span
                                                                                className={`ml-1 font-bold ${
                                                                                    daysUntilDue < 0
                                                                                        ? 'text-red-600'
                                                                                        : daysUntilDue <= 7
                                                                                            ? 'text-amber-600'
                                                                                            : 'text-gray-400'
                                                                                }`}
                                                                            >
                                                                                ({daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d vencido` : `${daysUntilDue}d restantes`})
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Status badge */}
                                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${st.color}`}>
                                                                        {st.icon} {st.label}
                                                                    </span>

                                                                    {/* Result */}
                                                                    {fu.verification_result && (
                                                                        <span className={`text-xs font-bold ${resultConfig[fu.verification_result]?.color}`}>
                                                                            {resultConfig[fu.verification_result]?.emoji} {resultConfig[fu.verification_result]?.label}
                                                                        </span>
                                                                    )}

                                                                    {isExpanded ? (
                                                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                                                    ) : (
                                                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                                                    )}
                                                                </div>

                                                                {/* Expanded detail */}
                                                                {isExpanded && (
                                                                    <div className="px-4 pb-4 pt-0 border-t border-gray-50 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                        <div className="grid md:grid-cols-2 gap-4 mt-3">
                                                                            <div className="space-y-1">
                                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clasificación AI</p>
                                                                                <p className="text-sm text-gray-700">{fu.report?.ai_category || 'Sin clasificar'}</p>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Resumen AI</p>
                                                                                <p className="text-sm text-gray-700">{fu.report?.ai_summary || 'Sin resumen'}</p>
                                                                            </div>
                                                                            <div className="md:col-span-2 space-y-1">
                                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plan de Acción Correctiva</p>
                                                                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">
                                                                                    {fu.report?.corrective_action_plan || 'No registrado'}
                                                                                </p>
                                                                            </div>

                                                                            {fu.notes && (
                                                                                <div className="md:col-span-2 space-y-1">
                                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Notas de Verificación</p>
                                                                                    <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-xl">{fu.notes}</p>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Verification action */}
                                                                        {(fu.status === 'pending' || fu.status === 'overdue') &&
                                                                            (role === 'admin' || role === 'responsable') && (
                                                                                <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                                                                                    <p className="text-xs font-bold text-sanatorio-primary flex items-center gap-2">
                                                                                        <ClipboardCheck className="w-4 h-4" />
                                                                                        Verificar Efectividad
                                                                                    </p>

                                                                                    <div className="flex gap-2">
                                                                                        {[
                                                                                            { value: 'effective', label: '✅ Efectiva', desc: 'El problema no se repitió' },
                                                                                            { value: 'partial', label: '⚠️ Parcial', desc: 'Mejora parcial' },
                                                                                            { value: 'ineffective', label: '❌ Inefectiva', desc: 'El problema persiste' },
                                                                                        ].map(opt => (
                                                                                            <button
                                                                                                key={opt.value}
                                                                                                onClick={() => {
                                                                                                    setSelectedFollowUp(fu);
                                                                                                    setVerificationResult(opt.value);
                                                                                                }}
                                                                                                className={`flex-1 px-3 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                                                                                    selectedFollowUp?.id === fu.id && verificationResult === opt.value
                                                                                                        ? 'border-sanatorio-primary bg-sanatorio-primary/5 text-sanatorio-primary'
                                                                                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                                                                }`}
                                                                                            >
                                                                                                <div>{opt.label}</div>
                                                                                                <div className="text-[10px] font-normal text-gray-400 mt-1">{opt.desc}</div>
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>

                                                                                    {selectedFollowUp?.id === fu.id && verificationResult && (
                                                                                        <div className="space-y-2 animate-in fade-in duration-200">
                                                                                            <textarea
                                                                                                placeholder="Notas de la verificación (opcional)..."
                                                                                                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sanatorio-primary/20"
                                                                                                rows={2}
                                                                                                value={verificationNotes}
                                                                                                onChange={e => setVerificationNotes(e.target.value)}
                                                                                            />
                                                                                            <button
                                                                                                onClick={handleVerify}
                                                                                                disabled={saving}
                                                                                                className="btn-primary w-full cursor-pointer"
                                                                                            >
                                                                                                {saving ? (
                                                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                                                ) : (
                                                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                                                )}
                                                                                                {saving ? 'Guardando...' : 'Confirmar Verificación'}
                                                                                            </button>
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
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
