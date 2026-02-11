import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { ResolutionForm } from '../components/ResolutionForm';
import { CorrectiveActionForm } from '../components/CorrectiveActionForm';
import { useEffect, useState } from 'react';
import { Loader2, FileText, XCircle, AlertTriangle, X, Send } from 'lucide-react';

export const ResolutionPage = () => {
    const { ticketId } = useParams();
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCorrectiveForm, setShowCorrectiveForm] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const [rejected, setRejected] = useState(false);

    useEffect(() => {
        const fetchReport = async () => {
            if (!ticketId) return;

            try {
                const { data, error } = await supabase
                    .from('reports')
                    .select('*')
                    .ilike('tracking_id', ticketId)
                    .single();

                if (error) throw error;

                // Check if already rejected
                if (data.status === 'assignment_rejected') {
                    setRejected(true);
                }

                setReportData({
                    id: data.id,
                    trackingId: data.tracking_id,
                    description: data.content,
                    isAdverseEvent: data.is_adverse_event || data.ai_urgency === 'Rojo',
                    sector: data.sector,
                    contactNumber: data.contact_number,
                    status: data.status,
                    notes: data.notes
                });

                if (data.is_adverse_event || data.ai_urgency === 'Rojo') {
                    setShowCorrectiveForm(true);
                }

            } catch (err: any) {
                console.error("Error fetching report:", err);
                setError("No se pudo cargar el reporte. Verifique el enlace.");
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [ticketId]);

    const handleAssignmentRejection = async () => {
        if (!reportData || !rejectionReason.trim()) return;
        setRejecting(true);

        try {
            const timestamp = new Date().toLocaleString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires'
            });

            const rejectionLog = `[${timestamp}] 🔴 RECHAZO DE ASIGNACIÓN: ${rejectionReason.trim()}`;

            // Append to existing notes
            const currentNotes = reportData.notes || '';
            const updatedNotes = currentNotes
                ? `${currentNotes}\n\n${rejectionLog}`
                : rejectionLog;

            const { error } = await supabase
                .from('reports')
                .update({
                    status: 'assignment_rejected',
                    notes: updatedNotes,
                })
                .eq('id', reportData.id);

            if (error) throw error;

            setRejected(true);
            setShowRejectionModal(false);
        } catch (err: any) {
            console.error("Error rejecting assignment:", err);
            alert("Error al rechazar la asignación: " + err.message);
        } finally {
            setRejecting(false);
        }
    };

    const handleSubmit = async (formData: any) => {
        if (!reportData) return;

        try {
            const { error } = await supabase
                .from('reports')
                .update({
                    resolution_notes: formData.immediateAction,
                    root_cause: formData.rootCause,
                    corrective_plan: formData.correctivePlan,
                    implementation_date: formData.implementationDate || null,
                    resolution_evidence_urls: formData.evidenceUrls,
                    resolved_at: new Date().toISOString(),
                    status: 'quality_validation'
                })
                .eq('id', reportData.id);

            if (error) throw error;

            console.log("Resolución guardada exitosamente");

            if (reportData.contactNumber) {
                console.log("Resolución guardada. Pendiente de validación de Calidad para enviar notificación.");
            }
        } catch (err: any) {
            console.error("Error saving resolution:", err);
            alert("Error al guardar la resolución: " + err.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !reportData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center max-w-md">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Enlace no válido</h2>
                    <p className="text-gray-500">{error || "No se encontró el reporte solicitado."}</p>
                </div>
            </div>
        );
    }

    // Show rejection success
    if (rejected) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center max-w-md bg-white rounded-3xl shadow-card p-10 animate-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-8 h-8 text-orange-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">Asignación Rechazada</h2>
                    <p className="text-gray-500 text-sm mb-2">
                        Has indicado que este caso <span className="font-bold text-sanatorio-primary">{reportData.trackingId}</span> no te corresponde.
                    </p>
                    <p className="text-gray-400 text-xs">
                        El equipo de Calidad revisará tu solicitud y reasignará el caso al responsable correcto.
                    </p>
                    <div className="mt-6 bg-orange-50 rounded-xl p-4 border border-orange-100">
                        <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Estado actualizado</p>
                        <p className="text-sm text-orange-600 mt-1">Pendiente de reasignación por Calidad</p>
                    </div>
                </div>
            </div>
        );
    }

    // Modo Formulario de Acción Correctiva
    if (showCorrectiveForm) {
        return (
            <>
                <CorrectiveActionForm
                    reportId={reportData.id}
                    initialData={{
                        date: new Date().toISOString(),
                        sector: reportData.sector,
                        description: reportData.description,
                        trackingId: reportData.trackingId
                    }}
                    onClose={() => setShowCorrectiveForm(false)}
                    onSuccess={() => {
                        if (reportData.contactNumber) {
                            console.log("Acción Correctiva registrada. Pendiente de validación de Calidad.");
                        }
                        window.close();
                    }}
                />
                {showRejectionModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800">Rechazar Asignación</h3>
                                </div>
                                <button onClick={() => setShowRejectionModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-gray-600">
                                    Estás indicando que el caso <span className="font-bold text-sanatorio-primary">{reportData.trackingId}</span> no corresponde a tu sector.
                                </p>
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-gray-700">
                                        Motivo del rechazo <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Ej: Este reclamo corresponde al sector de Mantenimiento, no al mío..."
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-50 outline-none transition-all resize-none text-sm"
                                        rows={3}
                                        autoFocus
                                    />
                                </div>
                                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                                    <p className="text-xs text-amber-700">
                                        <span className="font-bold">Nota:</span> Esta acción quedará registrada en el historial del ticket y será revisada por el equipo de Calidad.
                                    </p>
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 flex gap-3">
                                <button onClick={() => setShowRejectionModal(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors text-sm">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAssignmentRejection}
                                    disabled={rejecting || !rejectionReason.trim()}
                                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {rejecting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Confirmar Rechazo
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="relative">
            {/* Top Action Bar */}
            <div className="absolute top-4 right-4 z-10 md:top-8 md:right-8 flex gap-2">
                {/* Rejection Button */}
                <button
                    onClick={() => setShowRejectionModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-red-200 text-red-600 font-bold text-xs rounded-full shadow-sm hover:bg-red-50 transition-all"
                >
                    <XCircle className="w-4 h-4" />
                    No me corresponde
                </button>

                {/* Toggle to Corrective Action Form */}
                <button
                    onClick={() => setShowCorrectiveForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-orange-200 text-orange-700 font-bold text-xs rounded-full shadow-sm hover:bg-orange-50 transition-all"
                >
                    <FileText className="w-4 h-4" />
                    Modo Evento Adverso
                </button>
            </div>

            <ResolutionForm reportData={reportData} onSubmit={handleSubmit} onReject={() => setShowRejectionModal(true)} />

            {showRejectionModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Rechazar Asignación</h3>
                            </div>
                            <button onClick={() => setShowRejectionModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">
                                Estás indicando que el caso <span className="font-bold text-sanatorio-primary">{reportData.trackingId}</span> no corresponde a tu sector.
                            </p>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-700">
                                    Motivo del rechazo <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Ej: Este reclamo corresponde al sector de Mantenimiento, no al mío..."
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-400 focus:ring-2 focus:ring-red-50 outline-none transition-all resize-none text-sm"
                                    rows={3}
                                    autoFocus
                                />
                            </div>
                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                                <p className="text-xs text-amber-700">
                                    <span className="font-bold">Nota:</span> Esta acción quedará registrada en el historial del ticket y será revisada por el equipo de Calidad.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setShowRejectionModal(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors text-sm">
                                Cancelar
                            </button>
                            <button
                                onClick={handleAssignmentRejection}
                                disabled={rejecting || !rejectionReason.trim()}
                                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {rejecting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Confirmar Rechazo
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
