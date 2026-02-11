import React, { useState, useEffect } from 'react';
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
    Shield
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

    const { role, sectors, session } = useAuth();

    useEffect(() => {
        fetchFollowUps();
    }, [role, sectors]);

    const fetchFollowUps = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('follow_ups')
            .select(`
                *,
                report:reports(tracking_id, sector, ai_category, ai_summary, corrective_action_plan)
            `)
            .order('due_date', { ascending: true });

        if (error) {
            console.error('Error fetching follow-ups:', error);
            setLoading(false);
            return;
        }

        let filtered = data || [];

        // Mark overdue
        const now = new Date();
        filtered = filtered.map(f => ({
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

    const filteredFollowUps = followUps.filter(f => {
        if (filter === 'all') return true;
        if (filter === 'overdue') return f.status === 'overdue';
        if (filter === 'completed') return f.status === 'completed';
        return f.status === 'pending';
    });

    // KPIs
    const totalCompleted = followUps.filter(f => f.status === 'completed').length;
    const totalEffective = followUps.filter(f => f.verification_result === 'effective').length;
    const totalOverdue = followUps.filter(f => f.status === 'overdue').length;
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
        <div className="space-y-6">
            {/* PDCA KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Verificaciones</p>
                    <p className="text-3xl font-black text-gray-800 mt-1">{followUps.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completadas</p>
                    <p className="text-3xl font-black text-green-600 mt-1">{totalCompleted}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vencidas</p>
                    <p className="text-3xl font-black text-red-600 mt-1">{totalOverdue}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-2 opacity-5">
                        <TrendingUp className="w-16 h-16 text-sanatorio-primary" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tasa Efectividad</p>
                    <p className="text-3xl font-black text-sanatorio-primary mt-1">{effectivenessRate}%</p>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2">
                {[
                    { id: 'pending' as const, label: 'Pendientes', count: followUps.filter(f => f.status === 'pending').length },
                    { id: 'overdue' as const, label: 'Vencidas', count: totalOverdue },
                    { id: 'completed' as const, label: 'Completadas', count: totalCompleted },
                    { id: 'all' as const, label: 'Todas', count: followUps.length },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${filter === tab.id
                            ? 'bg-sanatorio-primary text-white shadow-sm'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* Follow-up list */}
            <div className="space-y-2">
                {filteredFollowUps.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                        <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-medium">No hay verificaciones en esta categoría</p>
                    </div>
                ) : (
                    filteredFollowUps.map(fu => {
                        const st = statusConfig[fu.status] || statusConfig.pending;
                        const isExpanded = expandedId === fu.id;
                        const daysUntilDue = Math.ceil((new Date(fu.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                        return (
                            <div
                                key={fu.id}
                                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-all"
                            >
                                <div
                                    className="flex items-center gap-3 p-4 cursor-pointer"
                                    onClick={() => setExpandedId(isExpanded ? null : fu.id)}
                                >
                                    {/* Checkpoint badge */}
                                    <span className="px-3 py-1.5 bg-sanatorio-primary/10 text-sanatorio-primary text-[10px] font-black rounded-lg">
                                        {checkpointLabel(fu.checkpoint_type)}
                                    </span>

                                    {/* Ticket info */}
                                    <div className="flex-1 min-w-0">
                                        <span className="font-bold text-sm text-gray-800">{fu.report?.tracking_id || 'Sin ID'}</span>
                                        <span className="text-xs text-gray-400 ml-2">{fu.report?.sector || ''}</span>
                                    </div>

                                    {/* Due date */}
                                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(fu.due_date).toLocaleDateString('es-AR')}
                                        {fu.status !== 'completed' && (
                                            <span className={`ml-1 font-bold ${daysUntilDue < 0 ? 'text-red-600' : daysUntilDue <= 7 ? 'text-amber-600' : 'text-gray-400'}`}>
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

                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-0 border-t border-gray-50 animate-in fade-in slide-in-from-top-1 duration-300">
                                        <div className="grid md:grid-cols-2 gap-4 mt-3">
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clasificación AI</p>
                                                <p className="text-sm text-gray-700">{fu.report?.ai_category || 'Sin clasificar'}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Resumen AI</p>
                                                <p className="text-sm text-gray-700">{fu.report?.ai_summary || 'Sin resumen'}</p>
                                            </div>
                                            <div className="md:col-span-2 space-y-2">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plan de Acción Correctiva</p>
                                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">{fu.report?.corrective_action_plan || 'No registrado'}</p>
                                            </div>

                                            {fu.notes && (
                                                <div className="md:col-span-2 space-y-2">
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Notas de Verificación</p>
                                                    <p className="text-sm text-gray-700 bg-green-50 p-3 rounded-xl">{fu.notes}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Verification action */}
                                        {(fu.status === 'pending' || fu.status === 'overdue') && (role === 'admin' || role === 'responsable') && (
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
                                                            onClick={() => { setSelectedFollowUp(fu); setVerificationResult(opt.value); }}
                                                            className={`flex-1 px-3 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${selectedFollowUp?.id === fu.id && verificationResult === opt.value
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
                                                    <div className="space-y-2 animate-in fade-in duration-300">
                                                        <textarea
                                                            placeholder="Notas de la verificación (opcional)..."
                                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sanatorio-primary/20"
                                                            rows={2}
                                                            value={verificationNotes}
                                                            onChange={(e) => setVerificationNotes(e.target.value)}
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
                    })
                )}
            </div>
        </div>
    );
};
