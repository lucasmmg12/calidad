import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import {
    LayoutDashboard,
    AlertTriangle,
    CheckCircle,
    Clock,
    Search,
    Filter,
    Image as ImageIcon,
    ShieldAlert,
    X,
    Loader2,
    Trash2,
    Calendar,
    Briefcase,
    Eye,
    AlertCircle
} from 'lucide-react';

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    isDeleting
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">¿Eliminar Reporte?</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Esta acción eliminará el reporte permanentemente. <br />
                        <span className="font-bold text-red-500">No se puede deshacer.</span>
                    </p>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="flex-1 py-2.5 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Discard Confirmation Modal Component
const DiscardConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    isResolving
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isResolving: boolean;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                        <X className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">¿Descartar Reporte?</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        El reporte pasará a estado descartado y <br />
                        se guardará el motivo proporcionado.
                    </p>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            disabled={isResolving}
                            className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isResolving}
                            className="flex-1 py-2.5 px-4 bg-gray-600 text-white font-bold rounded-xl hover:bg-gray-700 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isResolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


export const Dashboard = () => {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<any>(null);

    // Advanced Filters
    const [dateFilter, setDateFilter] = useState('');
    const [urgencyFilter, setUrgencyFilter] = useState('all');
    const [sectorFilter, setSectorFilter] = useState('all');

    // Derived Lists for Filters
    const sectors = Array.from(new Set(reports.map(r => r.sector || 'General'))).sort();

    // Resolution state
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [resolving, setResolving] = useState(false);
    const [updatingColor, setUpdatingColor] = useState(false);

    // Custom Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching reports:', error);
        else setReports(data || []);
        setLoading(false);
    };

    const handleResolve = async () => {
        if (!selectedReport) return;
        setResolving(true);

        const { error } = await supabase
            .from('reports')
            .update({
                status: 'resolved',
                resolution_notes: resolutionNotes,
                resolved_at: new Date().toISOString()
            })
            .eq('id', selectedReport.id);

        if (error) {
            alert('Error al guardar resolución');
        } else {
            console.log('[Dashboard] Report resolved in DB. Checking if we should send WhatsApp...');
            // WhatsApp Notification if number exists
            if (selectedReport.contact_number) {
                // IMPORTANT: Add country prefix '549' to the DB number
                const botNumber = `549${selectedReport.contact_number}`;
                console.log('[Dashboard] Sending notification to:', botNumber);

                supabase.functions.invoke('send-whatsapp', {
                    body: {
                        number: botNumber,
                        message: `👋 ¡Hola! Queremos informarte que tu reporte con ID *${selectedReport.tracking_id}* ha sido gestionado con éxito.\n\n✅ *Resolución:* ${resolutionNotes}\n\nGracias por ayudarnos a mejorar la calidad de nuestra atención cada día. ✨💙`,
                        mediaUrl: "https://i.imgur.com/PnVTbEd.jpeg"
                    }
                }).then(({ error: fnError }) => {
                    if (fnError) console.error('[Dashboard] Error calling send-whatsapp:', fnError);
                    else console.log('[Dashboard] WhatsApp resolution notification sent successfully.');
                }).catch(err => console.error('[Dashboard] Unexpected error sending resolution whatsapp:', err));
            } else {
                console.log('[Dashboard] No contact number for this report (Anonymous).');
            }

            setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'resolved', resolution_notes: resolutionNotes, resolved_at: new Date().toISOString() } : r));
            setSelectedReport(null);
            setResolutionNotes('');
        }
        setResolving(false);
    };

    const handleDiscardClick = () => {
        setShowDiscardModal(true);
    };

    const confirmDiscard = async () => {
        if (!selectedReport) return;
        setResolving(true);

        const { error } = await supabase
            .from('reports')
            .update({
                status: 'dismissed',
                resolution_notes: resolutionNotes || 'Descartado manualmente', // Default note if empty
                resolved_at: new Date().toISOString()
            })
            .eq('id', selectedReport.id);

        if (error) {
            alert('Error al descartar reporte');
        } else {
            console.log('[Dashboard] Report discarded in DB. Checking if we should send WhatsApp...');
            // WhatsApp Notification if number exists
            if (selectedReport.contact_number) {
                // IMPORTANT: Add country prefix '549' to the DB number
                const botNumber = `549${selectedReport.contact_number}`;
                console.log('[Dashboard] Sending discard notification to:', botNumber);

                supabase.functions.invoke('send-whatsapp', {
                    body: {
                        number: botNumber,
                        message: `👋 ¡Hola! Te informamos que hemos revisado tu reporte con ID *${selectedReport.tracking_id}*.\n\n🔍 *Resultado:* En esta ocasión hemos procedido a cerrarlo ya que consideramos que el reporte es irrelevante para este canal o la información es insuficiente.\n\n⚠️ Si consideras que el problema persiste o tienes nuevos detalles, por favor genera un nuevo ticket en el sistema para que podamos analizarlo nuevamente.\n\n¡Muchas gracias! Sanatorio Argentino.`,
                        mediaUrl: "https://i.imgur.com/X2903s6.png"
                    }
                }).then(({ error: fnError }) => {
                    if (fnError) console.error('[Dashboard] Error calling send-whatsapp (discard):', fnError);
                    else console.log('[Dashboard] WhatsApp discard notification sent successfully.');
                }).catch(err => console.error('[Dashboard] Unexpected error sending discard whatsapp:', err));
            } else {
                console.log('[Dashboard] No contact number for this report (Anonymous).');
            }

            setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'dismissed', resolution_notes: resolutionNotes || 'Descartado manualmente', resolved_at: new Date().toISOString() } : r));
            setSelectedReport(null);
            setResolutionNotes('');
            setShowDiscardModal(false);
        }
        setResolving(false);
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!selectedReport) return;
        setIsDeleting(true);

        const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', selectedReport.id);

        if (error) {
            alert('Error al eliminar: ' + error.message);
        } else {
            setReports(reports.filter(r => r.id !== selectedReport.id));
            setSelectedReport(null);
            setShowDeleteModal(false);
        }
        setIsDeleting(false);
    };

    const handleUpdateUrgency = async (newColor: string) => {
        if (!selectedReport) return;
        setUpdatingColor(true);

        const { error } = await supabase
            .from('reports')
            .update({ ai_urgency: newColor })
            .eq('id', selectedReport.id);

        if (error) {
            alert('Error actualizando urgencia');
        } else {
            const updatedReport = { ...selectedReport, ai_urgency: newColor };
            setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
            setSelectedReport(updatedReport);
        }
        setUpdatingColor(false);
    }

    const filteredReports = reports.filter(r => {
        // Filter by Date
        if (dateFilter) {
            // Fix: Compare using LOCAL time to match what the user sees in the table (toLocaleDateString)
            // The date input gives YYYY-MM-DD. We need to construct the same from the report date in local time.
            const d = new Date(r.created_at);
            const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (localDate !== dateFilter) return false;
        }
        // Filter by Urgency
        if (urgencyFilter !== 'all') {
            if (urgencyFilter === 'pending' && r.status !== 'pending') return false;
            if (urgencyFilter === 'resolved' && r.status !== 'resolved') return false;
            if (urgencyFilter === 'dismissed' && r.status !== 'dismissed') return false;
            if (['Rojo', 'Amarillo', 'Verde'].includes(urgencyFilter) && r.ai_urgency !== urgencyFilter) return false;
        }
        // Filter by Sector
        if (sectorFilter !== 'all') {
            const rSector = r.sector || 'General';
            if (rSector !== sectorFilter) return false;
        }
        return true;
    });

    return (
        <div className="max-w-7xl mx-auto p-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <LayoutDashboard className="text-sanatorio-primary" />
                        Tablero de Control
                    </h1>
                    <p className="text-gray-500">Gestión de Calidad y Seguridad del Paciente</p>
                </div>

                {/* Stats Summary */}
                <div className="flex gap-2">
                    <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 flex items-center gap-4 text-sm font-medium shadow-sm">
                        <span className="flex items-center gap-1 text-red-600 font-bold">
                            <ShieldAlert className="w-4 h-4" />
                            {reports.filter(r => r.ai_urgency === 'Rojo').length} Críticos
                        </span>
                        <span className="w-px h-4 bg-gray-200"></span>
                        <span className="flex items-center gap-1 text-blue-600">
                            <Clock className="w-4 h-4" />
                            {reports.filter(r => r.status === 'pending').length} Pendientes
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Legend Guide */}
            <div className="bg-white rounded-xl p-4 mb-6 border border-gray-100 flex flex-wrap gap-4 items-center animate-in fade-in slide-in-from-top-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2">Referencias de Triage:</span>

                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-100 border border-red-300"></span>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-700">Rojo (Inmediato)</span>
                        <span className="text-[10px] text-gray-400">Riesgo de vida / legal grave</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300"></span>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-700">Amarillo (Urgente)</span>
                        <span className="text-[10px] text-gray-400">Daño temporal / Falla equipos</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-100 border border-green-300"></span>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-700">Verde (Rutina)</span>
                        <span className="text-[10px] text-gray-400">Sugerencias / Confort</span>
                    </div>
                </div>
            </div>

            {/* Advanced Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-gray-500 text-sm font-bold uppercase tracking-wider">
                    <Filter className="w-4 h-4" />
                    Filtros:
                </div>

                {/* Date Filter */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                        type="date"
                        className="bg-transparent text-sm text-gray-700 outline-none"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                    {dateFilter && (
                        <button onClick={() => setDateFilter('')} className="ml-2 hover:bg-gray-200 rounded-full p-0.5"><X className="w-3 h-3 text-gray-500" /></button>
                    )}
                </div>

                {/* Urgency/Status Filter */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 relative group">
                    <ShieldAlert className="w-4 h-4 text-gray-400" />
                    <select
                        className="bg-transparent text-sm text-gray-700 outline-none appearance-none pr-4 cursor-pointer"
                        value={urgencyFilter}
                        onChange={(e) => setUrgencyFilter(e.target.value)}
                    >
                        <option value="all">Todas las Prioridades</option>
                        <option value="Rojo">🔴 Rojo (Crítico)</option>
                        <option value="Amarillo">🟡 Amarillo (Moderado)</option>
                        <option value="Verde">🟢 Verde (Leve)</option>
                        <option value="pending">⏳ Solo Pendientes</option>
                        <option value="resolved">✅ Solo Realizados</option>
                        <option value="dismissed">🚫 Solo Descartados</option>
                    </select>
                </div>

                {/* Sector Filter */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <select
                        className="bg-transparent text-sm text-gray-700 outline-none appearance-none pr-4 cursor-pointer"
                        value={sectorFilter}
                        onChange={(e) => setSectorFilter(e.target.value)}
                    >
                        <option value="all">Todos los Sectores</option>
                        {sectors.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                {/* Reset Filters */}
                {(dateFilter || urgencyFilter !== 'all' || sectorFilter !== 'all') && (
                    <button
                        onClick={() => { setDateFilter(''); setUrgencyFilter('all'); setSectorFilter('all'); }}
                        className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium hover:underline flex items-center gap-1"
                    >
                        <X className="w-3 h-3" /> Limpiar Filtros
                    </button>
                )}
            </div>

            {/* Main Content - List View Only */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Cargando reportes...</p>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-100 m-8 rounded-xl">
                        <Search className="w-10 h-10 mb-2 opacity-20" />
                        <p>No se encontraron reportes con estos filtros.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <th className="px-6 py-4 w-16">Estado</th>
                                    <th className="px-6 py-4 w-32">Fecha / ID</th>
                                    <th className="px-6 py-4 w-40">Sector/Área</th>
                                    <th className="px-6 py-4">Descripción del Incidente</th>
                                    <th className="px-6 py-4 w-32">Prioridad</th>
                                    <th className="px-6 py-4 w-24 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredReports.map((report) => (
                                    <tr
                                        key={report.id}
                                        onClick={() => setSelectedReport(report)}
                                        className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            {report.status === 'resolved' ? (
                                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600" title="Realizado">
                                                    <CheckCircle className="w-4 h-4" />
                                                </div>
                                            ) : report.status === 'dismissed' ? (
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 opacity-60" title="Descartado">
                                                    <X className="w-4 h-4" />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600" title="Pendiente">
                                                    <Clock className="w-4 h-4" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-700 text-sm">
                                                    {new Date(report.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="font-mono text-[10px] text-gray-400">
                                                    {report.tracking_id}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                                {report.sector || 'General'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-md">
                                                <p className="text-sm font-medium text-gray-900 line-clamp-1">
                                                    {report.ai_summary || 'Procesando...'}
                                                </p>
                                                <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                                                    {report.content}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${report.ai_urgency === 'Rojo' ? 'bg-red-100 text-red-700' :
                                                report.ai_urgency === 'Amarillo' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                <span className={`w-2 h-2 rounded-full ${report.ai_urgency === 'Rojo' ? 'bg-red-500' :
                                                    report.ai_urgency === 'Amarillo' ? 'bg-yellow-500' :
                                                        'bg-green-500'
                                                    }`}></span>
                                                {report.ai_urgency || 'Normal'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-gray-400 hover:text-sanatorio-primary p-2 hover:bg-white rounded-full transition-all">
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Modal (Reused) */}
            {selectedReport && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row">

                        {/* Left: Info */}
                        <div className="p-8 flex-1">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-sanatorio-primary mb-1">Detalle del Reporte</h2>
                                    <p className="text-gray-500 font-mono text-sm">{selectedReport.tracking_id}</p>
                                </div>
                                <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4" />
                                        Análisis de IA
                                    </h3>
                                    <p className="text-sm text-gray-700 leading-relaxed">{selectedReport.ai_summary || 'Pendiente de análisis...'}</p>

                                    <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
                                        <span className="text-xs font-bold bg-white px-2 py-1 rounded text-blue-600 border border-blue-200">
                                            {selectedReport.ai_category || 'Sin Categoría'}
                                        </span>

                                        {/* Color Changer */}
                                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-100 shadow-sm">
                                            <button
                                                onClick={() => handleUpdateUrgency('Verde')}
                                                disabled={updatingColor}
                                                className={`w-4 h-4 rounded-full bg-green-500 hover:scale-110 transition-transform ${selectedReport.ai_urgency === 'Verde' ? 'ring-2 ring-offset-1 ring-green-600' : 'opacity-40 hover:opacity-100'}`}
                                                title="Cambiar a Verde"
                                            />
                                            <button
                                                onClick={() => handleUpdateUrgency('Amarillo')}
                                                disabled={updatingColor}
                                                className={`w-4 h-4 rounded-full bg-yellow-400 hover:scale-110 transition-transform ${selectedReport.ai_urgency === 'Amarillo' ? 'ring-2 ring-offset-1 ring-yellow-500' : 'opacity-40 hover:opacity-100'}`}
                                                title="Cambiar a Amarillo"
                                            />
                                            <button
                                                onClick={() => handleUpdateUrgency('Rojo')}
                                                disabled={updatingColor}
                                                className={`w-4 h-4 rounded-full bg-red-500 hover:scale-110 transition-transform ${selectedReport.ai_urgency === 'Rojo' ? 'ring-2 ring-offset-1 ring-red-600' : 'opacity-40 hover:opacity-100'}`}
                                                title="Cambiar a Rojo"
                                            />
                                        </div>
                                    </div>

                                    {/* AI Consequences Alert */}
                                    {selectedReport.ai_consequences && (
                                        <div className="mt-4 bg-red-50 p-3 rounded-lg border border-red-100 flex items-start gap-2 animate-in zoom-in-95">
                                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-red-800 uppercase">Riesgo Potencial</p>
                                                <p className="text-xs text-red-700 mt-1">{selectedReport.ai_consequences}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-2">Descripción Original</h3>
                                    <p className="text-gray-600 bg-gray-50 p-4 rounded-xl text-sm leading-relaxed">
                                        {selectedReport.content}
                                    </p>
                                </div>

                                {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4" />
                                            Evidencia Adjunta
                                        </h3>
                                        <div className="grid grid-cols-3 gap-2">
                                            {selectedReport.evidence_urls.map((url: string, idx: number) => (
                                                <a key={idx} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity">
                                                    <img src={url} alt="Evidencia" className="w-full h-full object-cover" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Action */}
                        <div className="p-8 bg-gray-50 border-l border-gray-100 w-full md:w-1/3 flex flex-col">
                            <h3 className="font-bold text-gray-800 mb-4">Gestión</h3>

                            {selectedReport.ai_solutions && (
                                <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Briefcase className="w-3 h-3" />
                                        Posibles Soluciones
                                    </h4>
                                    <p className="text-xs text-blue-900/80 leading-relaxed whitespace-pre-line font-medium">{selectedReport.ai_solutions}</p>
                                </div>
                            )}

                            {selectedReport.status === 'resolved' ? (
                                <div className="bg-green-100 border border-green-200 rounded-xl p-4 text-center">
                                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                    <p className="font-bold text-green-800">Caso Resuelto</p>
                                    <p className="text-xs text-green-700 mt-1">
                                        {new Date(selectedReport.resolved_at).toLocaleDateString()}
                                    </p>
                                    {selectedReport.resolution_notes && (
                                        <p className="text-xs text-gray-600 mt-4 text-left bg-white/50 p-2 rounded">
                                            "{selectedReport.resolution_notes}"
                                        </p>
                                    )}
                                </div>
                            ) : selectedReport.status === 'dismissed' ? (
                                <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 text-center">
                                    <X className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                    <p className="font-bold text-gray-700">Caso Descartado</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {selectedReport.resolved_at ? new Date(selectedReport.resolved_at).toLocaleDateString() : ''}
                                    </p>
                                    {selectedReport.resolution_notes && (
                                        <p className="text-xs text-gray-500 mt-4 text-left bg-white/50 p-2 rounded">
                                            "{selectedReport.resolution_notes}"
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Notas de Resolución / Descarte</label>
                                        <textarea
                                            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-sanatorio-primary outline-none resize-none h-32"
                                            placeholder="Detalle acciones o motivo de descarte..."
                                            value={resolutionNotes}
                                            onChange={(e) => setResolutionNotes(e.target.value)}
                                        ></textarea>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={handleResolve}
                                            disabled={resolving || !resolutionNotes.trim()}
                                            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {resolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            Realizado
                                        </button>

                                        <button
                                            onClick={handleDiscardClick}
                                            disabled={resolving}
                                            className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <X className="w-4 h-4" />
                                            Descartar
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <button
                                    onClick={handleDeleteClick}
                                    className="w-full py-2 text-red-500 text-xs font-bold hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Eliminar Reporte
                                </button>
                            </div>

                            <div className="mt-auto pt-6 text-xs text-gray-400 text-center">
                                {selectedReport.contact_number && (
                                    <p className="mb-2">📞 Contacto: {selectedReport.contact_number}</p>
                                )}
                                <p>Sector: {selectedReport.sector}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
            />

            <DiscardConfirmationModal
                isOpen={showDiscardModal}
                onClose={() => setShowDiscardModal(false)}
                onConfirm={confirmDiscard}
                isResolving={resolving}
            />
        </div>
    );
};
