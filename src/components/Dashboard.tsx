
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import {
    LayoutDashboard,
    CheckCircle,
    Clock,
    ShieldAlert,
    X,
    Loader2,
    AlertCircle,
    AlertTriangle,
    Send,
    Eye,
    BrainCircuit,
    UserCog,
    Camera,
    Archive,
    Bell,
    XCircle
} from 'lucide-react';
import { useMemo } from 'react';
import { CLASSIFICATION_CATEGORIES } from '../constants/classification_categories';

// Discard Confirmation Modal Component
const DiscardConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    isDiscarding
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDiscarding: boolean;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Archive className="w-6 h-6 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">¿Descartar Reporte?</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        El reporte se moverá a la bandeja de <span className="font-bold">Descartados</span> y no será visible en el tablero principal.
                    </p>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            disabled={isDiscarding}
                            className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDiscarding}
                            className="flex-1 py-2.5 px-4 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 transition-colors shadow-lg shadow-gray-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isDiscarding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                            Descartar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// Referral Modal Component
// Referral Modal Component
const ReferralModal = ({
    isOpen,
    onClose,
    onConfirm,
    isSending
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (type: 'simple' | 'desvio' | 'adverse', responsiblePhone: string) => void;
    isSending: boolean;
}) => {
    const [managementType, setManagementType] = useState<'simple' | 'desvio' | 'adverse'>('simple');
    const [phone, setPhone] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <Send className="w-5 h-5 text-sanatorio-primary" />
                    Derivar Caso
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    Se enviará un enlace de gestión vía WhatsApp al responsable.
                </p>

                <div className="space-y-4 mb-6">
                    {/* Selector de Tipo de Gestión */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Tipo de Gestión Requerida</label>

                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setManagementType('simple')}
                                className={`p-2 rounded-lg text-xs font-bold transition-all border ${managementType === 'simple'
                                    ? 'bg-white border-blue-500 text-blue-700 shadow-sm ring-1 ring-blue-500'
                                    : 'border-transparent text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                ⚡ Simple
                            </button>
                            <button
                                onClick={() => setManagementType('desvio')}
                                className={`p-2 rounded-lg text-xs font-bold transition-all border ${managementType === 'desvio'
                                    ? 'bg-white border-orange-500 text-orange-700 shadow-sm ring-1 ring-orange-500'
                                    : 'border-transparent text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                🔧 Desvío
                            </button>
                            <button
                                onClick={() => setManagementType('adverse')}
                                className={`p-2 rounded-lg text-xs font-bold transition-all border ${managementType === 'adverse'
                                    ? 'bg-white border-red-500 text-red-700 shadow-sm ring-1 ring-red-500'
                                    : 'border-transparent text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                ⚠️ Evento A.
                            </button>
                        </div>

                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100 text-xs text-gray-600">
                            {managementType === 'simple' && (
                                <p className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    Solo solicita <strong>Acción Inmediata</strong>.
                                </p>
                            )}
                            {managementType === 'desvio' && (
                                <p className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                    Solicita <strong>Acción Inmediata + RCA + Plan</strong>.
                                </p>
                            )}
                            {managementType === 'adverse' && (
                                <p className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                    Solicita <strong>Acción Inmediata + RCA + Plan</strong> (Crítico).
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Input Teléfono */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">WhatsApp del Responsable</label>
                        <input
                            type="tel"
                            maxLength={10}
                            placeholder="Ej: 2645438114"
                            className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-sanatorio-primary transition-all font-mono text-sm"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        />
                        <p className="text-[10px] text-gray-400 mt-1">10 dígitos sin 0 ni 15. Incluir código de área.</p>
                    </div>
                </div>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        disabled={isSending}
                        className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(managementType, phone)}
                        disabled={isSending || phone.length < 8}
                        className="flex-1 py-2.5 px-4 bg-sanatorio-primary text-white font-bold rounded-xl hover:opacity-90 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Enviar Solicitud
                    </button>
                </div>
            </div>
        </div>
    );
};

// Feedback Modal Component (Success/Error)
const FeedbackModal = ({
    isOpen,
    onClose,
    type,
    title,
    message
}: {
    isOpen: boolean;
    onClose: () => void;
    type: 'success' | 'error';
    title: string;
    message: string;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {type === 'success' ? <CheckCircle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                    {message}
                </p>

                <button
                    onClick={onClose}
                    className={`w-full py-3 px-4 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2
                        ${type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-500/30' : 'bg-red-600 hover:bg-red-700 shadow-red-500/30'}
                    `}
                >
                    {type === 'success' ? 'Aceptar' : 'Entendido'}
                </button>
            </div>
        </div>
    );
};

// Reopen Case Modal Component
const ReopenModal = ({
    isOpen,
    onClose,
    onConfirm,
    initialPhone,
    isSubmitting
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string, phone: string) => void;
    initialPhone: string;
    isSubmitting: boolean;
}) => {
    const [reason, setReason] = useState('');
    const [phone, setPhone] = useState(initialPhone || '');

    useEffect(() => {
        if (isOpen) {
            setReason('');
            setPhone(initialPhone || '');
        }
    }, [isOpen, initialPhone]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <span className="p-2 bg-red-100 rounded-lg text-red-600"><AlertCircle className="w-5 h-5" /></span>
                    Reapertura de Caso
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    Indique el motivo de la corrección. El caso volverá a estado pendiente.
                </p>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Motivo de Corrección</label>
                        <textarea
                            className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-sanatorio-primary/50 transition-all text-sm min-h-[100px] bg-gray-50 focus:bg-white"
                            placeholder="Ej: La evidencia adjunta no es suficiente..."
                            value={reason}
                            autoFocus
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">WhatsApp Responsable</label>
                        <input
                            type="tel"
                            maxLength={10}
                            className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-sanatorio-primary/50 transition-all font-mono text-sm bg-gray-50 focus:bg-white"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="Ej: 2645438114"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">10 dígitos sin 0 ni 15. Se notificará la reapertura a este número.</p>
                    </div>
                </div>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(reason, phone)}
                        disabled={!reason.trim() || isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                        Confirmar Reubertura
                    </button>
                </div>
            </div>
        </div>
    );
};

// Quality Return Modal (Rechazo)
const QualityReturnModal = ({
    isOpen,
    onClose,
    onConfirm,
    initialPhone,
    isSubmitting
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string, phone: string) => void;
    initialPhone: string;
    isSubmitting: boolean;
}) => {
    const [reason, setReason] = useState('');
    const [phone, setPhone] = useState(initialPhone || '');

    useEffect(() => {
        if (isOpen) {
            setReason('');
            setPhone(initialPhone || '');
        }
    }, [isOpen, initialPhone]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <span className="p-2 bg-purple-100 rounded-lg text-purple-600"><BrainCircuit className="w-5 h-5" /></span>
                    Devolver a Responsable
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    El caso volverá a estado "En Gestión" para que el responsable realice correcciones.
                </p>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Motivo de Devolución</label>
                        <textarea
                            className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm min-h-[100px] bg-gray-50 focus:bg-white"
                            placeholder="Ej: El plan de acción es insuficiente..."
                            value={reason}
                            autoFocus
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">WhatsApp Responsable</label>
                        <input
                            type="tel"
                            maxLength={10}
                            className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono text-sm bg-gray-50 focus:bg-white"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="Ej: 2645438114"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">10 dígitos sin 0 ni 15. Se notificará la devolución a este número.</p>
                    </div>
                </div>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(reason, phone)}
                        disabled={!reason.trim() || isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Confirmar Devolución
                    </button>
                </div>
            </div>
        </div>
    );
};

// Quality Approve Modal
const QualityApproveModal = ({
    isOpen,
    onClose,
    onConfirm,
    isSubmitting
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4 mx-auto">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">¿Aprobar y Cerrar Caso?</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Esta acción finalizará el reporte y notificará al usuario original (si corresponde).
                </p>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Aprobar
                    </button>
                </div>
            </div>
        </div>
    );
};

import { useAuth } from '../contexts/AuthContext';

// ... (other imports remain, just ensuring useAuth is imported)

export const Dashboard = () => {
    const { role, sectors, isAdmin } = useAuth();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [, setUpdatingColor] = useState(false);

    // Modals
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [showReferralModal, setShowReferralModal] = useState(false);
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false); // Toggle Notification Panel
    const [isDiscarding, setIsDiscarding] = useState(false);
    const [isReopening, setIsReopening] = useState(false);
    const [isSendingReferral, setIsSendingReferral] = useState(false);
    const [showQualityReturnModal, setShowQualityReturnModal] = useState(false);
    const [showQualityApproveModal, setShowQualityApproveModal] = useState(false);
    const [isProcessingQuality, setIsProcessingQuality] = useState(false);

    const [feedbackModal, setFeedbackModal] = useState<{
        isOpen: boolean;
        type: 'success' | 'error';
        title: string;
        message: string;
    }>({ isOpen: false, type: 'success', title: '', message: '' });

    const handleQualityReturn = async (reason: string, phoneTarget: string) => {
        if (!selectedReport) return;
        setIsProcessingQuality(true);

        const timestamp = new Date().toLocaleString();
        const logEntry = `[${timestamp}] ⚠️ RECHAZADO POR CALIDAD: ${reason}`;
        const currentNotes = selectedReport.notes || '';
        const updatedNotes = currentNotes ? `${currentNotes}\n\n${logEntry}` : logEntry;

        const historyEntry = {
            rejected_at: new Date().toISOString(),
            rejected_by: "Calidad",
            reject_reason: reason,
            previous_data: {
                immediate_action: selectedReport.immediate_action,
                root_cause: selectedReport.root_cause,
                corrective_plan: selectedReport.corrective_plan,
                implementation_date: selectedReport.implementation_date,
                resolution_evidence_urls: selectedReport.resolution_evidence_urls
            }
        };

        const currentHistory = selectedReport.resolution_history || [];
        const updatedHistory = [...currentHistory, historyEntry];

        const { error } = await supabase
            .from('reports')
            .update({
                status: 'pending_resolution',
                notes: updatedNotes,
                resolution_history: updatedHistory,
                immediate_action: null,
                root_cause: null,
                corrective_plan: null,
                implementation_date: null
            })
            .eq('id', selectedReport.id);

        if (!error) {
            if (phoneTarget && phoneTarget.length > 5) {
                const botNumber = `549${phoneTarget.replace(/\D/g, '').replace(/^549/, '')}`;
                const resolutionLink = `${window.location.origin}/resolver-caso/${selectedReport.tracking_id}`;

                await supabase.functions.invoke('send-whatsapp', {
                    body: {
                        number: botNumber,
                        message: `🛑 *Solución Insuficiente - Calidad*\n\nLa solución propuesta para el caso *${selectedReport.tracking_id}* ha sido rechazada por considerarse insuficiente.\n\n⚠️ *Motivo:* ${reason}\n\n👉 *Por favor, gestione nuevamente el caso e ingrese un nuevo plan de acción:* ${resolutionLink}`,
                        mediaUrl: "https://i.imgur.com/GfBdckl.jpeg"
                    }
                });
            }

            setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'pending_resolution', notes: updatedNotes } : r));
            setSelectedReport(null);
            setShowQualityReturnModal(false);
            setFeedbackModal({ isOpen: true, type: 'success', title: 'Ticket Devuelto', message: 'El caso ha vuelto a estado pendiente y se ha notificado al responsable.' });
        } else {
            setFeedbackModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo devolver el caso: ' + error.message });
        }
        setIsProcessingQuality(false);
    };

    const handleQualityApprove = async () => {
        if (!selectedReport) return;
        setIsProcessingQuality(true);

        if (selectedReport.contact_number && selectedReport.contact_number.length > 5) {
            const userNumber = `549${selectedReport.contact_number}`;
            await supabase.functions.invoke('send-whatsapp', {
                body: {
                    number: userNumber,
                    message: `✅ *Reporte Resuelto - Calidad*\n\nEstimado/a, su reporte *${selectedReport.tracking_id}* ha sido gestionado y cerrado exitosamente.\n\n📝 *Resolución:* "${selectedReport.resolution_notes || selectedReport.corrective_plan || 'Sin observaciones.'}"\n\nGracias por su compromiso con la mejora continua.`,
                    mediaUrl: "https://i.imgur.com/rOkI8sA.png"
                }
            });
        }

        const approveTimestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
        const approveLog = `[${approveTimestamp}] ✅ APROBADO POR CALIDAD: Caso cerrado tras validación`;
        const prevNotes = selectedReport.notes || '';
        const finalNotes = prevNotes ? `${prevNotes}\n\n${approveLog}` : approveLog;

        const { error } = await supabase.from('reports').update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            notes: finalNotes
        }).eq('id', selectedReport.id);

        if (!error) {
            setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'resolved', notes: finalNotes, resolved_at: new Date().toISOString() } : r));
            setSelectedReport(null);
            setShowQualityApproveModal(false);
            setFeedbackModal({ isOpen: true, type: 'success', title: 'Caso Aprobado', message: 'El ticket ha sido cerrado correctamente.' });
        } else {
            setFeedbackModal({ isOpen: true, type: 'error', title: 'Error', message: 'Hubo un error al cerrar el caso.' });
        }
        setIsProcessingQuality(false);
    };

    useEffect(() => {
        if (role) fetchReports();
    }, [role, sectors]);

    const fetchReports = async () => {
        setLoading(true);
        let query = supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        // Role-based filtering
        if (role === 'responsable') {
            if (sectors.length > 0) {
                query = query.in('sector', sectors);
            } else {
                // If responsible has no sectors, return empty
                setReports([]);
                setLoading(false);
                return;
            }
        }

        const { data, error } = await query;

        if (error) console.error('Error fetching reports:', error);
        else setReports(data || []);
        setLoading(false);
    };

    const handleSendReferral = async (managementType: 'simple' | 'desvio' | 'adverse', responsiblePhone: string) => {
        if (!selectedReport) return;
        setIsSendingReferral(true);

        const isAdverse = managementType !== 'simple'; // Desvio and Adverse both require RCA
        const typeLabel = managementType === 'simple' ? 'Simple' : managementType === 'desvio' ? 'Desvío' : 'Evento Adverso';

        // 1. Generar Link Único
        const resolutionLink = `${window.location.origin}/resolver-caso/${selectedReport.tracking_id}`;
        const botNumber = `549${responsiblePhone}`;

        // 2. Enviar WhatsApp
        console.log(`[Referral] Enviando a ${botNumber}. Link: ${resolutionLink}. Type: ${managementType}`);

        let messageBody = `👋 *Solicitud de Gestión - Calidad*\n\nSe requiere su intervención para el caso: *${selectedReport.tracking_id}*\n📂 Sector: ${selectedReport.sector}\n\n📝 *Reporte:* "${selectedReport.ai_summary || selectedReport.content}"\n\n`;

        if (managementType === 'simple') {
            messageBody += `🛠️ *Tipo: Simple*\nSe solicita: *Contención / Acción Inmediata*.`;
        } else if (managementType === 'desvio') {
            messageBody += `🔧 *Tipo: Desvío*\nSe solicita: *Acción Inmediata + Análisis de Causa + Plan de Acción*.`;
        } else {
            messageBody += `⚠️ *Tipo: Evento Adverso*\nSe solicita: *Acción Inmediata + Análisis de Causa + Plan de Acción*.`;
        }

        messageBody += `\n\n👉 *Gestione el caso aquí:* ${resolutionLink}`;

        const { error } = await supabase.functions.invoke('send-whatsapp', {
            body: {
                number: botNumber,
                message: messageBody,
                mediaUrl: managementType === 'adverse' ? "https://i.imgur.com/jgX2y4n.png" : "https://i.imgur.com/JGQlbiJ.jpeg"
            }
        });

        // 3. Determinar estado del envío
        const whatsappStatus = error ? 'failed' : 'sent';
        const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
        const logEntry = error
            ? `[${timestamp}] ❌ ERROR AL ENVIAR: Error al enviar WhatsApp a ${responsiblePhone}`
            : `[${timestamp}] 📤 DERIVADO: Enviado a ${responsiblePhone} como [${typeLabel}]`;
        const currentNotes = selectedReport.notes || '';
        const updatedNotes = currentNotes ? `${currentNotes}\n\n${logEntry}` : logEntry;

        if (error) {
            console.error("Error al enviar WhatsApp:", error);
            setFeedbackModal({
                isOpen: true,
                type: 'error',
                title: 'Envío Fallido',
                message: 'El sistema no pudo conectar con WhatsApp. Se ha registrado el error para su auditoría.'
            });
        } else {
            setFeedbackModal({
                isOpen: true,
                type: 'success',
                title: 'Solicitud Enviada',
                message: `Solicitud de gestión (${typeLabel}) enviada correctamente.`
            });
        }

        // 4. Actualizar Base de Datos
        const { error: dbError } = await supabase
            .from('reports')
            .update({
                status: 'pending_resolution',
                notes: updatedNotes,
                is_adverse_event: isAdverse,
                assigned_to: responsiblePhone,
                last_whatsapp_status: whatsappStatus,
                last_whatsapp_sent_at: new Date().toISOString()
            })
            .eq('id', selectedReport.id);

        if (!dbError) {
            setReports(reports.map(r => r.id === selectedReport.id ? {
                ...r,
                status: 'pending_resolution',
                notes: updatedNotes,
                assigned_to: responsiblePhone,
                last_whatsapp_status: whatsappStatus,
                last_whatsapp_sent_at: new Date().toISOString()
            } : r));
            setShowReferralModal(false);
        } else {
            // Si falla la BD, mostramos alerta o log, pero ya mostramos el modal de envío.
            console.error("Error DB:", dbError);
        }

        setIsSendingReferral(false);
    };

    const handleReopenCase = async (reason: string, phoneTarget: string) => {
        if (!selectedReport) return;
        setIsReopening(true);

        const timestamp = new Date().toLocaleString();
        const logEntry = `[${timestamp}] 🔄 APELADO/REABIERTO: ${reason}`;
        const currentNotes = selectedReport.notes || '';
        const updatedNotes = currentNotes ? `${currentNotes}\n\n${logEntry}` : logEntry;

        // 0. Prepare history entry
        const historyEntry = {
            rejected_at: new Date().toISOString(),
            rejected_by: "Calidad (Reapertura)",
            reject_reason: reason,
            previous_data: {
                immediate_action: selectedReport.immediate_action,
                root_cause: selectedReport.root_cause,
                corrective_plan: selectedReport.corrective_plan,
                implementation_date: selectedReport.implementation_date,
                resolution_evidence_urls: selectedReport.resolution_evidence_urls
            }
        };

        const currentHistory = selectedReport.resolution_history || [];
        const updatedHistory = [...currentHistory, historyEntry];

        // 1. Update Database
        const { error } = await supabase
            .from('reports')
            .update({
                status: 'pending_resolution',
                notes: updatedNotes,
                resolution_history: updatedHistory
            })
            .eq('id', selectedReport.id);

        if (!error) {
            // 2. Send WhatsApp if phone provided
            if (phoneTarget && phoneTarget.length > 5) {
                const botNumber = `549${phoneTarget.replace(/\D/g, '').replace(/^549/, '')}`;
                const resolutionLink = `${window.location.origin}/resolver-caso/${selectedReport.tracking_id}`;

                const { error: waError } = await supabase.functions.invoke('send-whatsapp', {
                    body: {
                        number: botNumber,
                        message: `🛑 *Solución Insuficiente - Caso Reabierto*\n\nSe ha reabierto el caso *${selectedReport.tracking_id}* tras revisión de Calidad.\n\n⚠️ *Motivo:* ${reason}\n\n👉 *Se requiere una nueva gestión del caso:* ${resolutionLink}`,
                        mediaUrl: "https://i.imgur.com/GfBdckl.jpeg"
                    }
                });

                if (waError) console.error("Error sending WA rejection:", waError);
            }

            // 3. Update local state
            setReports(reports.map(r => r.id === selectedReport.id ? {
                ...r,
                status: 'pending_resolution',
                notes: updatedNotes,
                resolution_history: updatedHistory
            } : r));
            setSelectedReport(null);
            setShowReopenModal(false);
            setFeedbackModal({ isOpen: true, type: 'success', title: 'Caso Reabierto', message: 'El ticket ha vuelto a estado pendiente para corrección.' });
        } else {
            setFeedbackModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo reabrir el caso: ' + error.message });
        }
        setIsReopening(false);
    };

    // ... (Mantener funciones handleDeleteClick, confirmDelete, handleUpdateUrgency del código original)
    // Para brevedad del reemplazo, asumo que existen o se mantienen. 
    // RE-IMPLEMENTANDO LAS FUNCIONES CRÍTICAS PARA QUE NO SE PIERDAN AL REEMPLAZAR EL COMPONENTE COMPLETO

    const handleDiscardClick = () => {
        setShowDiscardModal(true);
    };

    const confirmDiscard = async () => {
        if (!selectedReport) return;
        setIsDiscarding(true);

        // Update status to 'discarded' instead of deleting
        const { error } = await supabase
            .from('reports')
            .update({ status: 'discarded' })
            .eq('id', selectedReport.id);

        if (error) {
            alert('Error al descartar: ' + error.message);
        } else {
            // Update local state: Update the status or remove from view depending on filter
            const updatedReport = { ...selectedReport, status: 'discarded' };
            setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
            setSelectedReport(null);
            setShowDiscardModal(false);
            setFeedbackModal({ isOpen: true, type: 'success', title: 'Caso Descartado', message: 'El reporte se ha movido a la bandeja de descartados.' });
        }
        setIsDiscarding(false);
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

    // FILTROS
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'all' | 'in_progress' | 'quality_validation' | 'discarded' | 'assignment_rejected'>('all');



    const filteredReports = reports.filter(report => {
        // Filtro por Estado (Mapeo de UI a valores BD)
        const matchesStatus =
            statusFilter === 'all' ? (report.status !== 'discarded' && report.status !== 'assignment_rejected') :
                statusFilter === 'pending' ? (report.status === 'pending' || report.status === 'analyzed') :
                    statusFilter === 'in_progress' ? report.status === 'pending_resolution' :
                        statusFilter === 'quality_validation' ? report.status === 'quality_validation' :
                            statusFilter === 'resolved' ? report.status === 'resolved' :
                                statusFilter === 'discarded' ? report.status === 'discarded' :
                                    statusFilter === 'assignment_rejected' ? report.status === 'assignment_rejected' : true;

        // Filtro por Texto (ID, Sector, Contenido)
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            report.tracking_id?.toLowerCase().includes(searchLower) ||
            report.sector?.toLowerCase().includes(searchLower) ||
            report.content?.toLowerCase().includes(searchLower) ||
            report.ai_summary?.toLowerCase().includes(searchLower);

        return matchesStatus && matchesSearch;
    });



    // Calculate Expiration Alerts
    const expirationAlerts = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const warningThreshold = new Date();
        warningThreshold.setDate(today.getDate() + 5); // Warn 5 days in advance

        return reports.filter(r => {
            if (!r.implementation_date || r.status === 'resolved' || r.status === 'discarded') return false;
            const implDate = new Date(r.implementation_date);
            // Check if date is valid
            if (isNaN(implDate.getTime())) return false;

            return implDate <= warningThreshold;
        }).sort((a, b) => new Date(a.implementation_date).getTime() - new Date(b.implementation_date).getTime());
    }, [reports]);

    // Auto-open notifications if urgency exists (initially)
    useEffect(() => {
        if (expirationAlerts.length > 0) {
            setShowNotifications(true);
        }
    }, [expirationAlerts.length]);

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
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`bg-white px-4 py-2 rounded-lg border border-gray-200 flex items-center gap-2 text-sm font-medium shadow-sm transition-all hover:bg-gray-50
                            ${showNotifications ? 'ring-2 ring-orange-100 border-orange-200' : ''}
                        `}
                    >
                        <Bell className={`w-4 h-4 ${expirationAlerts.length > 0 ? 'text-orange-600 animate-pulse' : 'text-gray-400'}`} />
                        <span className="text-gray-700">Notificaciones</span>
                        {expirationAlerts.length > 0 && (
                            <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {expirationAlerts.length}
                            </span>
                        )}
                    </button>

                    <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 flex items-center gap-4 text-sm font-medium shadow-sm">
                        <span className="flex items-center gap-1 text-red-600 font-bold">
                            <ShieldAlert className="w-4 h-4" />
                            {reports.filter(r => r.ai_urgency === 'Rojo').length} Críticos
                        </span>
                    </div>
                </div>
            </div>

            {/* Notifications Panel */}
            {showNotifications && (
                <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                        <div className="bg-orange-50/50 p-4 border-b border-orange-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                                <Bell className="w-4 h-4" />
                                Alertas de Vencimiento
                            </h3>
                            <button onClick={() => setShowNotifications(false)} className="text-orange-400 hover:text-orange-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {expirationAlerts.length > 0 ? (
                            <div className="p-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                {expirationAlerts.map(alert => {
                                    const implDate = new Date(alert.implementation_date);
                                    const today = new Date();
                                    const isOverdue = implDate < today;
                                    const daysDiff = Math.ceil((implDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

                                    return (
                                        <button
                                            key={alert.id}
                                            onClick={() => setSelectedReport(alert)}
                                            className={`text-left p-3 rounded-xl border transition-all hover:shadow-md flex items-start gap-3 group
                                            ${isOverdue
                                                    ? 'bg-red-50 border-red-100 hover:border-red-200'
                                                    : 'bg-orange-50/30 border-orange-100 hover:border-orange-200'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                                <Clock className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-bold text-gray-800 text-xs">#{alert.tracking_id}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isOverdue ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'}`}>
                                                        {isOverdue ? 'Vencido' : `${daysDiff} días`}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 line-clamp-1 mb-1">{alert.sector}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">
                                                    Vence: {implDate.toLocaleDateString()}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <CheckCircle className="w-6 h-6 text-green-500/50" />
                                </div>
                                <p className="text-sm font-medium text-gray-600">Todo al día</p>
                                <p className="text-xs">No hay acciones correctivas próximas a vencer.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Barra de Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">

                {/* Tabs de Estado */}
                <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'pending', label: 'Pendientes' },
                        { id: 'in_progress', label: 'En Gestión' },
                        { id: 'quality_validation', label: 'Por Validar' },
                        { id: 'resolved', label: 'Resueltos' },
                        { id: 'assignment_rejected', label: '⚡ Rechazados' },
                        { id: 'discarded', label: 'Descartados' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id as 'pending' | 'resolved' | 'all' | 'in_progress' | 'quality_validation' | 'discarded' | 'assignment_rejected')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${statusFilter === tab.id
                                ? 'bg-white text-sanatorio-primary shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Buscador */}
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Buscar por ID, sector o problema..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary transition-all outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                </div>
            </div>

            {/* Main Content - List View */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Cargando reportes...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Sector</th>
                                    <th className="px-6 py-4">Problema</th>
                                    <th className="px-6 py-4">Prioridad</th>
                                    <th className="px-6 py-4 text-center">Notif.</th>
                                    <th className="px-6 py-4">Clasificación</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredReports.length > 0 ? (
                                    filteredReports.map((report) => (
                                        <tr key={report.id} onClick={() => setSelectedReport(report)} className="hover:bg-blue-50/40 cursor-pointer transition-colors group">
                                            <td className="px-6 py-4">
                                                {report.status === 'resolved' ? (
                                                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle className="w-3 h-3" /></div>
                                                ) : report.status === 'pending_resolution' ? (
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center animate-pulse"><Clock className="w-3 h-3" /></div>
                                                ) : report.status === 'quality_validation' ? (
                                                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">Q</div>
                                                ) : report.status === 'assignment_rejected' ? (
                                                    <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><XCircle className="w-3 h-3" /></div>
                                                ) : report.status === 'discarded' ? (
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"><Archive className="w-3 h-3" /></div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"><AlertCircle className="w-3 h-3" /></div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-700 group-hover:text-sanatorio-primary transition-colors">{report.tracking_id}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{report.sector || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 line-clamp-1 max-w-xs">{report.ai_summary || report.content}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                                                    ${report.ai_urgency === 'Rojo' ? 'bg-red-100 text-red-700' :
                                                        report.ai_urgency === 'Amarillo' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'
                                                    } `}>
                                                    {report.ai_urgency || 'Normal'}
                                                </span>
                                                {/* Expiration Alert */}
                                                {(report.implementation_date && new Date(report.implementation_date) < new Date() && report.status !== 'resolved') && (
                                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 animate-pulse" title={`Vencido el ${new Date(report.implementation_date).toLocaleDateString()}`}>
                                                        <Clock className="w-3 h-3 mr-1" /> Vencido
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {report.last_whatsapp_status === 'sent' && (
                                                    <div title={`Enviado: ${new Date(report.last_whatsapp_sent_at).toLocaleString()}`} className="w-3 h-3 rounded-full bg-green-500 mx-auto shadow-sm shadow-green-200"></div>
                                                )}
                                                {report.last_whatsapp_status === 'failed' && (
                                                    <div title="Fallo en envío" className="w-3 h-3 rounded-full bg-red-500 mx-auto animate-pulse shadow-sm shadow-red-200"></div>
                                                )}
                                                {!report.last_whatsapp_status && (
                                                    <div className="w-2 h-2 rounded-full bg-gray-200 mx-auto"></div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${(!report.ai_category || report.ai_category === 'Sin clasificar') ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
                                                    {report.ai_category || 'Sin clasificar'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                            No se encontraron reportes con los criterios seleccionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Detalle */}
            {selectedReport && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] shadow-2xl flex overflow-hidden">

                        {/* Columna Izquierda: Información del Reporte */}
                        <div className="w-1/2 p-8 overflow-y-auto bg-white">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-sanatorio-primary">Ticket #{selectedReport.tracking_id}</h2>
                                    <p className="text-sm text-gray-400">{new Date(selectedReport.created_at).toLocaleString()}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Prioridad</span>
                                    {isAdmin ? (
                                        <div className="flex gap-1.5 p-1 bg-gray-50 rounded-full border border-gray-100">
                                            {['Verde', 'Amarillo', 'Rojo'].map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => handleUpdateUrgency(color)}
                                                    title={`Cambiar prioridad a ${color}`}
                                                    className={`w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center relative group
                                                        ${color === 'Rojo' ? 'bg-red-500 hover:bg-red-600' : color === 'Amarillo' ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-green-500 hover:bg-green-600'}
                                                        ${selectedReport.ai_urgency === color
                                                            ? 'scale-110 ring-2 ring-offset-1 ring-gray-200 shadow-sm opacity-100'
                                                            : 'opacity-30 hover:opacity-100 grayscale hover:grayscale-0'
                                                        }
                                                    `}
                                                >
                                                    {selectedReport.ai_urgency === color && (
                                                        <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                                            ${selectedReport.ai_urgency === 'Rojo' ? 'bg-red-100 text-red-700' :
                                                selectedReport.ai_urgency === 'Amarillo' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'
                                            }`}>
                                            <span className={`w-2 h-2 rounded-full ${selectedReport.ai_urgency === 'Rojo' ? 'bg-red-500' : selectedReport.ai_urgency === 'Amarillo' ? 'bg-yellow-400' : 'bg-green-500'}`}></span>
                                            {selectedReport.ai_urgency || 'Normal'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Resumen IA</h3>
                                    <p className="text-blue-900 leading-relaxed font-medium">{selectedReport.ai_summary}</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-2">Descripción Original</h3>
                                    <div className="p-4 bg-gray-50 rounded-xl text-gray-600 text-sm leading-relaxed border border-gray-100">
                                        "{selectedReport.content}"
                                    </div>

                                    {/* Sector Info */}
                                    <div className="mt-4 flex gap-4">
                                        <div className="flex-1">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Sector Destino</h3>
                                            <p className="text-sm font-bold text-gray-700">{selectedReport.sector}</p>
                                        </div>
                                        {selectedReport.origin_sector && (
                                            <div className="flex-1">
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Sector Origen</h3>
                                                <p className="text-sm font-bold text-gray-700">{selectedReport.origin_sector}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Origin Field (Editable - Admin Only) */}
                                    <div className="mt-4">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Origen (Calidad)</h3>
                                        {isAdmin ? (
                                            <select
                                                value={selectedReport.resolution_notes?.split('Origen: ')[1]?.split('.')[0] || 'Reclamo/Queja'}
                                                onChange={async (e) => {
                                                    const newOrigin = e.target.value;
                                                    let currentNotes = selectedReport.resolution_notes || '';
                                                    let newNotes = currentNotes;
                                                    if (currentNotes.includes('Origen: ')) {
                                                        newNotes = currentNotes.replace(/Origen: [^.]*/, `Origen: ${newOrigin}`);
                                                    } else {
                                                        newNotes = `${currentNotes ? currentNotes + '. ' : ''}Origen: ${newOrigin}`;
                                                    }
                                                    const { error } = await supabase.from('reports').update({ resolution_notes: newNotes }).eq('id', selectedReport.id);
                                                    if (!error) {
                                                        const updatedReport = { ...selectedReport, resolution_notes: newNotes };
                                                        setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
                                                        setSelectedReport(updatedReport);
                                                    }
                                                }}
                                                className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 outline-none focus:border-sanatorio-primary focus:ring-1 focus:ring-sanatorio-primary"
                                            >
                                                <option value="Reclamo/Queja">Reclamo/Queja</option>
                                                <option value="Auditoría fin de semana">Auditoría fin de semana</option>
                                                <option value="Auditoría de proceso">Auditoría de proceso</option>
                                                <option value="5S">5S</option>
                                                <option value="Evento Adverso">Evento Adverso</option>
                                            </select>
                                        ) : (
                                            <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                {selectedReport.resolution_notes?.split('Origen: ')[1]?.split('.')[0] || 'Reclamo/Queja'}
                                            </p>
                                        )}
                                    </div>

                                    {/* Clasificación Operativa (Tableau) */}
                                    <div className="mt-4">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Clasificación Operativa</h3>
                                        {isAdmin ? (
                                            <>
                                                <select
                                                    value={selectedReport.ai_category || 'Sin clasificar'}
                                                    onChange={async (e) => {
                                                        const newCategory = e.target.value;
                                                        const { error } = await supabase.from('reports').update({ ai_category: newCategory }).eq('id', selectedReport.id);
                                                        if (!error) {
                                                            const updatedReport = { ...selectedReport, ai_category: newCategory };
                                                            setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
                                                            setSelectedReport(updatedReport);
                                                        }
                                                    }}
                                                    className={`w-full bg-white border text-sm rounded-lg p-2.5 outline-none focus:border-sanatorio-primary focus:ring-1 focus:ring-sanatorio-primary ${(!selectedReport.ai_category || selectedReport.ai_category === 'Sin clasificar')
                                                        ? 'border-amber-300 bg-amber-50'
                                                        : 'border-gray-200 text-gray-700'
                                                        }`}
                                                >
                                                    <option value="Sin clasificar">⚠️ Sin clasificar</option>
                                                    {CLASSIFICATION_CATEGORIES.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                                {(!selectedReport.ai_category || selectedReport.ai_category === 'Sin clasificar') && (
                                                    <p className="text-[10px] text-amber-600 mt-1 font-medium">⚠ Este ticket necesita clasificación operativa</p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                {selectedReport.ai_category || 'Sin clasificar'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {selectedReport.evidence_urls && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 mb-2">Evidencia</h3>
                                        <div className="flex gap-2">
                                            {selectedReport.evidence_urls.map((url: string, i: number) => (
                                                <a key={i} href={url} target="_blank" className="w-20 h-20 rounded-lg bg-gray-100 bg-cover border border-gray-200" style={{ backgroundImage: `url(${url})` }} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-gray-100 pt-6">
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-sanatorio-primary" />
                                        Historial de Actividad
                                    </h3>
                                    <div className="space-y-0 relative">
                                        {/* Vertical guide */}
                                        <div className="absolute top-2 bottom-2 left-[4px] w-0.5 bg-gray-100"></div>

                                        {(() => {
                                            // Build events array from all sources
                                            const events: { date: string; message: string; type: string }[] = [];

                                            // 1. Ticket Created
                                            events.push({
                                                date: new Date(selectedReport.created_at).toLocaleString('es-AR', {
                                                    timeZone: 'America/Argentina/Buenos_Aires',
                                                    day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                }),
                                                message: 'Ticket Creado',
                                                type: 'start'
                                            });

                                            // 2. Parse Notes (each entry separated by \n\n)
                                            if (selectedReport.notes) {
                                                const entries = selectedReport.notes.split('\n\n').filter((n: string) => n.trim().length > 0);
                                                entries.forEach((entry: string) => {
                                                    const match = entry.match(/^\[([^\]]+)\]\s?(.*)/);
                                                    if (match) {
                                                        const msg = match[2];
                                                        let type = 'info';
                                                        if (msg.includes('📤 DERIVADO') || msg.includes('Derivado')) type = 'derivation';
                                                        else if (msg.includes('🔴 RECHAZO DE ASIGNACIÓN')) type = 'rejection';
                                                        else if (msg.includes('⚠️ RECHAZADO POR CALIDAD')) type = 'quality_return';
                                                        else if (msg.includes('🔄 APELADO') || msg.includes('REABIERTO')) type = 'reopen';
                                                        else if (msg.includes('✅ APROBADO POR CALIDAD')) type = 'approved';
                                                        else if (msg.includes('❌ ERROR')) type = 'error';

                                                        events.push({ date: match[1], message: msg, type });
                                                    } else {
                                                        // Legacy plain notes (no timestamp format)
                                                        events.push({ date: '', message: entry, type: 'note' });
                                                    }
                                                });
                                            }

                                            // 3. Resolved event (if applicable and not already in notes)
                                            if (selectedReport.resolved_at && !events.some(e => e.type === 'approved')) {
                                                events.push({
                                                    date: new Date(selectedReport.resolved_at).toLocaleString('es-AR', {
                                                        timeZone: 'America/Argentina/Buenos_Aires',
                                                        day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                    }),
                                                    message: 'Resolución Finalizada',
                                                    type: 'resolved'
                                                });
                                            }

                                            // Color mapping
                                            const dotColor: Record<string, string> = {
                                                start: 'bg-gray-300',
                                                derivation: 'bg-blue-400',
                                                rejection: 'bg-red-500',
                                                quality_return: 'bg-orange-500',
                                                reopen: 'bg-amber-500',
                                                approved: 'bg-green-500',
                                                resolved: 'bg-green-500',
                                                error: 'bg-red-400',
                                                info: 'bg-purple-400',
                                                note: 'bg-purple-400'
                                            };

                                            const textColor: Record<string, string> = {
                                                start: 'text-gray-600',
                                                derivation: 'text-blue-700',
                                                rejection: 'text-red-600 font-bold',
                                                quality_return: 'text-orange-700 font-bold',
                                                reopen: 'text-amber-700 font-bold',
                                                approved: 'text-green-700 font-bold',
                                                resolved: 'text-green-700 font-bold',
                                                error: 'text-red-600',
                                                info: 'text-gray-600',
                                                note: 'text-gray-600 italic'
                                            };

                                            return events.map((event, idx) => (
                                                <div key={idx} className="flex gap-3 relative pb-4 pl-4 last:pb-0">
                                                    <div className={`absolute left-0 top-1 w-2.5 h-2.5 rounded-full ${dotColor[event.type] || 'bg-gray-300'} ring-4 ring-white z-10`}></div>
                                                    <div className="min-w-0">
                                                        {event.date && (
                                                            <p className="text-xs text-gray-400 font-mono mb-0.5 truncate">{event.date}</p>
                                                        )}
                                                        <p className={`text-sm ${textColor[event.type] || 'text-gray-600'}`}>
                                                            {event.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha: Gestión y Resolución */}
                        <div className="w-1/2 bg-gray-50 border-l border-gray-200 p-8 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800">{isAdmin ? 'Centro de Gestión' : 'Detalle del Caso'}</h3>
                                <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2">
                                {selectedReport.status === 'resolved' ? (
                                    // VISTA RESOLUCIÓN COMPLETADA
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 flex flex-col h-full">
                                        <div className="flex items-center gap-3 mb-6 bg-green-50 p-4 rounded-xl border border-green-100">
                                            <div className="w-12 h-12 rounded-full bg-white text-green-600 flex items-center justify-center shadow-sm">
                                                <CheckCircle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-lg">Caso Cerrado</h4>
                                                <p className="text-sm text-green-700 font-medium">Gestión completada exitosamente</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                            {/* Responsable */}
                                            {selectedReport.assigned_to && (
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                                        <UserCog className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-bold uppercase">Resuelto por</p>
                                                        <p className="text-sm font-bold text-gray-700">{selectedReport.assigned_to}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Detalles de Resolución */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h5 className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-sanatorio-primary"></span>
                                                        Notas de Resolución
                                                    </h5>
                                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                        {selectedReport.resolution_notes || "Sin notas registradas."}
                                                    </p>
                                                </div>

                                                {selectedReport.root_cause && (
                                                    <div>
                                                        <h5 className="text-xs font-bold text-amber-600 uppercase mb-1 flex items-center gap-2">
                                                            <BrainCircuit className="w-3 h-3" />
                                                            Causa Raíz
                                                        </h5>
                                                        <p className="text-sm text-gray-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                                            {selectedReport.root_cause}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Plan de Acción */}
                                                {selectedReport.corrective_plan && (
                                                    <div>
                                                        <h5 className="text-xs font-bold text-green-600 uppercase mb-1 flex items-center gap-2">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Plan de Acción
                                                        </h5>
                                                        <div className="bg-green-50 p-3 rounded-lg border border-green-100 space-y-2">
                                                            <p className="text-sm text-gray-700 leading-relaxed">
                                                                {selectedReport.corrective_plan}
                                                            </p>
                                                            {selectedReport.implementation_date && (
                                                                <div className="flex items-center gap-2 text-xs font-bold text-green-700 pt-2 border-t border-green-200/50">
                                                                    <Clock className="w-3 h-3" />
                                                                    Fecha Implementación: {new Date(selectedReport.implementation_date).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Evidencia de Resolución */}
                                                {selectedReport.resolution_evidence_urls && selectedReport.resolution_evidence_urls.length > 0 && (
                                                    <div>
                                                        <h5 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                                                            <Camera className="w-3 h-3" />
                                                            Evidencia de Resolución
                                                        </h5>
                                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                                            {selectedReport.resolution_evidence_urls.map((url: string, i: number) => (
                                                                <a key={i} href={url} target="_blank" className="w-16 h-16 rounded-lg bg-gray-100 bg-cover bg-center border border-gray-200 flex-shrink-0 hover:ring-2 ring-blue-400 transition-all" style={{ backgroundImage: `url(${url})` }} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {isAdmin && (
                                            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowReopenModal(true);
                                                    }}
                                                    className="w-full py-3 px-4 bg-red-50 border border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <BrainCircuit className="w-5 h-5" />
                                                    Apelar / Solicitar Corrección
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : selectedReport.status === 'pending_resolution' ? (
                                    // VISTA ESPERANDO RESPUESTA
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
                                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
                                        <h4 className="font-bold text-blue-900">Esperando Resolución</h4>
                                        <p className="text-sm text-blue-700 mt-1 mb-4">
                                            La solicitud ha sido enviada al responsable. <br />
                                            El sistema te notificará cuando haya respuesta.
                                        </p>
                                        {isAdmin && (
                                            <button
                                                onClick={() => setShowReferralModal(true)}
                                                className="text-xs font-bold text-blue-600 hover:underline"
                                            >
                                                Reenviar Solicitud
                                            </button>
                                        )}
                                    </div>
                                ) : selectedReport.status === 'quality_validation' ? (
                                    // VISTA VALIDACIÓN CALIDAD
                                    // VISTA VALIDACIÓN CALIDAD
                                    <div className="bg-purple-50 p-6 rounded-2xl shadow-sm border border-purple-100 flex flex-col h-full overflow-hidden">
                                        <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                                <BrainCircuit className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900">Validación de Calidad</h4>
                                                <p className="text-xs text-purple-600">Revisión requerida para cierre</p>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 mb-6">
                                            {/* 1. Acción Inmediata (Siempre visible) */}
                                            <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                                                <h5 className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                    Acción Inmediata
                                                </h5>
                                                <p className="text-sm text-gray-700 leading-relaxed">
                                                    {selectedReport.resolution_notes || <span className="text-gray-400 italic">Sin datos registrados.</span>}
                                                </p>
                                            </div>

                                            {/* 2. Causa Raíz (Condicional) */}
                                            {selectedReport.root_cause && (
                                                <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                                                    <h5 className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-2">
                                                        <BrainCircuit className="w-3 h-3" />
                                                        Causa Raíz Identificada
                                                    </h5>
                                                    <p className="text-sm text-gray-700 leading-relaxed">
                                                        {selectedReport.root_cause}
                                                    </p>
                                                </div>
                                            )}

                                            {/* 3. Plan de Acción (Condicional) */}
                                            {selectedReport.corrective_plan && (
                                                <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm relative overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                                                    <h5 className="text-xs font-bold text-green-700 uppercase mb-2 flex items-center gap-2">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Plan de Acción
                                                    </h5>
                                                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                                                        {selectedReport.corrective_plan}
                                                    </p>
                                                    {selectedReport.implementation_date && (
                                                        <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg w-fit">
                                                            <Clock className="w-3 h-3" />
                                                            Implementación: {new Date(selectedReport.implementation_date).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* 4. Evidencia de Resolución */}
                                            {selectedReport.resolution_evidence_urls && selectedReport.resolution_evidence_urls.length > 0 && (
                                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                    <h5 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                                        <Camera className="w-3 h-3" />
                                                        Evidencia Adjunta
                                                    </h5>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {selectedReport.resolution_evidence_urls.map((url: string, i: number) => (
                                                            <a
                                                                key={i}
                                                                href={url}
                                                                target="_blank"
                                                                className="aspect-square rounded-lg bg-gray-100 bg-cover bg-center border border-gray-200 hover:ring-2 ring-purple-500 transition-all cursor-zoom-in"
                                                                style={{ backgroundImage: `url(${url})` }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Info del Responsable */}
                                            {selectedReport.assigned_to && (
                                                <div className="text-right">
                                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                                        Responsable: {selectedReport.assigned_to}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* RENDERIZADO DE HISTORIAL DE RECHAZOS (SOLUCIONES INSUFICIENTES) */}
                                        {selectedReport.resolution_history && selectedReport.resolution_history.length > 0 && (
                                            <div className="bg-red-50 rounded-2xl p-6 border border-red-100 mt-6">
                                                <h3 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-4">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    Historial de Soluciones Insuficientes
                                                </h3>
                                                <div className="space-y-4">
                                                    {selectedReport.resolution_history.map((entry: any, index: number) => (
                                                        <div key={index} className="bg-white rounded-xl p-4 border border-red-100 shadow-sm relative overflow-hidden">
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-red-200"></div>

                                                            <div className="flex justify-between items-start mb-3">
                                                                <div>
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                                        Rechazado el {new Date(entry.rejected_at).toLocaleString()}
                                                                    </span>
                                                                    <p className="text-xs font-bold text-red-600 mt-1">
                                                                        Motivo: "{entry.reject_reason}"
                                                                    </p>
                                                                </div>
                                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">
                                                                    Intento #{index + 1}
                                                                </span>
                                                            </div>

                                                            <div className="space-y-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                                <div>
                                                                    <span className="font-bold text-gray-700 block mb-0.5">Acción Inmediata Propuesta:</span>
                                                                    {entry.previous_data.immediate_action || '-'}
                                                                </div>
                                                                {entry.previous_data.root_cause && (
                                                                    <div>
                                                                        <span className="font-bold text-gray-700 block mb-0.5">Causa Raíz (RCA):</span>
                                                                        {entry.previous_data.root_cause}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <span className="font-bold text-gray-700 block mb-0.5">Plan de Acción:</span>
                                                                    {entry.previous_data.corrective_plan || '-'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {isAdmin && (
                                            <div className="flex gap-3 flex-shrink-0 pt-2 border-t border-purple-100">
                                                <button
                                                    onClick={() => setShowQualityReturnModal(true)}
                                                    className="flex-1 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors"
                                                >
                                                    Devolver (Rechazo)
                                                </button>
                                                <button
                                                    onClick={() => setShowQualityApproveModal(true)}
                                                    className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 shadow-lg shadow-purple-500/20"
                                                >
                                                    Aprobar y Cerrar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : selectedReport.status === 'assignment_rejected' ? (
                                    // VISTA RECHAZO DEL RESPONSABLE
                                    <div className="space-y-4">
                                        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                                    <XCircle className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-red-900 text-lg">Asignación Rechazada</h4>
                                                    <p className="text-xs text-red-600 font-medium">El responsable indica que este caso no le corresponde</p>
                                                </div>
                                            </div>

                                            {/* Extract rejection reason from notes */}
                                            {(() => {
                                                const notes = selectedReport.notes || '';
                                                const rejectionMatch = notes.match(/RECHAZO DE ASIGNACIÓN:\s*(.+?)(?:\n|$)/);
                                                const rejectionReason = rejectionMatch ? rejectionMatch[1].trim() : null;
                                                // Extract timestamp
                                                const timestampMatch = notes.match(/\[([^\]]+)\]\s*🔴\s*RECHAZO/);
                                                const rejectionTime = timestampMatch ? timestampMatch[1] : null;

                                                return (
                                                    <div className="space-y-3">
                                                        {rejectionTime && (
                                                            <div className="flex items-center gap-2 text-xs text-red-500 font-medium">
                                                                <Clock className="w-3 h-3" />
                                                                Rechazado el {rejectionTime}
                                                            </div>
                                                        )}
                                                        <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                                                            <h5 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Motivo del Rechazo</h5>
                                                            <p className="text-sm text-gray-700 leading-relaxed italic">
                                                                "{rejectionReason || 'Motivo no especificado'}"
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Responsable info */}
                                        {selectedReport.assigned_to && (
                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                                                    <UserCog className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400 font-bold uppercase">Rechazado por</p>
                                                    <p className="text-sm font-bold text-gray-700">{selectedReport.assigned_to}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions - Admin Only */}
                                        {isAdmin ? (
                                            <>
                                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                                    <h4 className="font-bold text-gray-800 mb-2">Rederivación Requerida</h4>
                                                    <p className="text-xs text-gray-500 mb-4">
                                                        Asigná este caso a otro responsable o al sector correcto enviando una nueva solicitud por WhatsApp.
                                                    </p>
                                                    <button
                                                        onClick={() => setShowReferralModal(true)}
                                                        className="w-full py-3 bg-sanatorio-primary text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2"
                                                    >
                                                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                                            <Send className="w-3 h-3" />
                                                        </div>
                                                        Rederivación (WhatsApp)
                                                    </button>
                                                </div>
                                                <div className="text-center py-4 border-t border-gray-100">
                                                    <p className="text-xs text-gray-400 mb-2">Otras acciones</p>
                                                    <button
                                                        onClick={handleDiscardClick}
                                                        className="text-gray-400 hover:text-gray-600 text-xs font-bold transition-colors flex items-center justify-center gap-1 mx-auto"
                                                    >
                                                        <Archive className="w-3 h-3" /> Descartar Caso
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                                                <p className="text-sm text-blue-700 font-medium">👀 Solo lectura — la gestión de este caso está a cargo del equipo de Calidad.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // VISTA ACCIONES INICIALES (DERIVAR) - Admin Only
                                    <div className="space-y-4">
                                        {isAdmin ? (
                                            <>
                                                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                                    <h4 className="font-bold text-gray-800 mb-2">Derivar a Responsable</h4>
                                                    <p className="text-xs text-gray-500 mb-4">
                                                        Envía un formulario de gestión automático al encargado del sector.
                                                    </p>
                                                    <button
                                                        onClick={() => setShowReferralModal(true)}
                                                        className="w-full py-3 bg-sanatorio-primary text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2"
                                                    >
                                                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                                            <Send className="w-3 h-3" />
                                                        </div>
                                                        Solicitar Gestión (WhatsApp)
                                                    </button>

                                                    {selectedReport.last_whatsapp_status === 'sent' && selectedReport.last_whatsapp_sent_at && (
                                                        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-green-600 font-medium bg-green-50 py-2 rounded-lg border border-green-100">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Enviado: {new Date(selectedReport.last_whatsapp_sent_at).toLocaleString()}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="text-center py-4 border-t border-gray-100">
                                                    <p className="text-xs text-gray-400 mb-2">Otras acciones</p>
                                                    <button
                                                        onClick={handleDiscardClick}
                                                        className="text-gray-400 hover:text-gray-600 text-xs font-bold transition-colors flex items-center justify-center gap-1 mx-auto"
                                                    >
                                                        <Archive className="w-3 h-3" /> Descartar Caso
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-center space-y-2">
                                                <Eye className="w-8 h-8 text-blue-400 mx-auto" />
                                                <h4 className="font-bold text-blue-800 text-sm">Modo Visualización</h4>
                                                <p className="text-xs text-blue-600">Este caso está pendiente de derivación por el equipo de Calidad. Aquí podrás seguir su progreso.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ReferralModal
                isOpen={showReferralModal}
                onClose={() => setShowReferralModal(false)}
                onConfirm={handleSendReferral}
                isSending={isSendingReferral}
            />

            <ReopenModal
                isOpen={showReopenModal}
                onClose={() => setShowReopenModal(false)}
                onConfirm={handleReopenCase}
                initialPhone={selectedReport?.assigned_to || ''}
                isSubmitting={isReopening}
            />

            <QualityReturnModal
                isOpen={showQualityReturnModal}
                onClose={() => setShowQualityReturnModal(false)}
                onConfirm={handleQualityReturn}
                initialPhone={selectedReport?.assigned_to || ''}
                isSubmitting={isProcessingQuality}
            />

            <QualityApproveModal
                isOpen={showQualityApproveModal}
                onClose={() => setShowQualityApproveModal(false)}
                onConfirm={handleQualityApprove}
                isSubmitting={isProcessingQuality}
            />

            <DiscardConfirmationModal
                isOpen={showDiscardModal}
                onClose={() => setShowDiscardModal(false)}
                onConfirm={confirmDiscard}
                isDiscarding={isDiscarding}
            />

            <FeedbackModal
                isOpen={feedbackModal.isOpen}
                onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
                type={feedbackModal.type}
                title={feedbackModal.title}
                message={feedbackModal.message}
            />
        </div>
    );
};

