import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { ResolutionForm } from '../components/ResolutionForm';
import { useEffect, useState } from 'react';
import { Loader2, XCircle, AlertTriangle, X, Send } from 'lucide-react';

export const ResolutionPage = () => {
    const { ticketId, assignmentId } = useParams();
    const [reportData, setReportData] = useState<any>(null);
    const [assignmentData, setAssignmentData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const [rejected, setRejected] = useState(false);
    const isMultiSectorAssignment = !!assignmentId;

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

                // If multi-sector, fetch the specific assignment
                if (assignmentId) {
                    const { data: assignment, error: assignErr } = await supabase
                        .from('sector_assignments')
                        .select('*')
                        .eq('id', assignmentId)
                        .single();

                    if (assignErr || !assignment) {
                        throw new Error('Asignación no encontrada');
                    }

                    setAssignmentData(assignment);

                    // Check if this specific assignment was already resolved/rejected
                    if (assignment.status === 'rejected') {
                        setRejected(true);
                    }

                    // For multi-sector: determine step from the ASSIGNMENT + report data
                    const getAssignmentStep = () => {
                        if (assignment.status === 'resolved' || assignment.status === 'quality_validation') return 'step2_submitted';
                        // Check report-level step for draft state (draft is saved to reports table)
                        if (data.resolution_step === 'step2_draft') return 'step2_draft';
                        if (data.resolution_step === 'step1_completed') return 'step1_completed';
                        if (assignment.immediate_action) return 'step1_completed';
                        return 'step1_pending';
                    };

                    // Determine if this assignment needs full RCA based on management_type
                    const needsRCA = assignment.management_type === 'desvio' || assignment.management_type === 'adverse';

                    // Build draft data from assignment's previous response (for rejected/returned cases)
                    // This ensures the responsible sees their previous RCA work pre-populated
                    const assignmentDraft = (assignment.root_cause || assignment.corrective_plan || assignment.implementation_date)
                        ? {
                            rootCause: assignment.root_cause || '',
                            correctivePlan: assignment.corrective_plan || '',
                            implementationDate: assignment.implementation_date || '',
                        }
                        : null;

                    setReportData({
                        id: data.id,
                        trackingId: data.tracking_id,
                        description: data.content,
                        isAdverseEvent: needsRCA,
                        sector: assignment.sector || data.sector,
                        originSector: data.origin_sector || '',
                        reporterSector: data.reporter_sector || '',
                        contactNumber: data.contact_number,
                        isAnonymous: data.is_anonymous || false,
                        assignmentId: assignmentId,
                        status: assignment.status,
                        notes: data.notes,
                        resolutionStep: getAssignmentStep(),
                        draftData: assignmentDraft || data.draft_data || null,
                        draftUpdatedAt: data.draft_updated_at || null,
                        immediateAction: assignment.immediate_action || data.resolution_notes || '',
                        step1EvidenceUrls: assignment.resolution_evidence_urls || data.step1_evidence_urls || [],
                        qualityObservations: data.quality_observations || '',
                        managementType: assignment.management_type || 'simple',
                    });
                } else {
                    // Legacy: Check if already rejected at report level
                    if (data.status === 'assignment_rejected') {
                        setRejected(true);
                    }

                    setReportData({
                        id: data.id,
                        trackingId: data.tracking_id,
                        description: data.content,
                        isAdverseEvent: data.is_adverse_event || data.ai_urgency === 'Rojo',
                        sector: data.sector,
                        originSector: data.origin_sector || '',
                        reporterSector: data.reporter_sector || '',
                        contactNumber: data.contact_number,
                        isAnonymous: data.is_anonymous || false,
                        status: data.status,
                        notes: data.notes,
                        resolutionStep: data.resolution_step || 'step1_pending',
                        draftData: data.draft_data || null,
                        draftUpdatedAt: data.draft_updated_at || null,
                        immediateAction: data.resolution_notes || '',
                        step1EvidenceUrls: data.step1_evidence_urls || [],
                        qualityObservations: data.quality_observations || '',
                        managementType: 'simple',
                    });
                }

                // Only show the old CorrectiveActionForm for already-completed adverse events
                // New flow uses the 2-step ResolutionForm
                // We no longer auto-switch to CorrectiveActionForm

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

            if (isMultiSectorAssignment && assignmentId) {
                // Multi-sector: update the specific assignment
                const { error: assignErr } = await supabase
                    .from('sector_assignments')
                    .update({
                        status: 'rejected',
                        notes: rejectionReason.trim(),
                        resolved_at: new Date().toISOString()
                    })
                    .eq('id', assignmentId);

                if (assignErr) throw assignErr;

                // Also update report status + notes so Dashboard shows rejection
                await supabase
                    .from('reports')
                    .update({
                        status: 'assignment_rejected',
                        notes: updatedNotes,
                    })
                    .eq('id', reportData.id);
            } else {
                // Legacy: update report status directly
                const { error } = await supabase
                    .from('reports')
                    .update({
                        status: 'assignment_rejected',
                        notes: updatedNotes,
                    })
                    .eq('id', reportData.id);

                if (error) throw error;
            }

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
            if (isMultiSectorAssignment && assignmentId) {
                if (formData.isStep1Only) {
                    // Step 1 only (adverse events): save immediate action but keep pending
                    const { error: assignErr } = await supabase
                        .from('sector_assignments')
                        .update({
                            immediate_action: formData.immediateAction,
                            resolution_evidence_urls: formData.evidenceUrls || [],
                        })
                        .eq('id', assignmentId);

                    if (assignErr) throw assignErr;

                    // Log in report notes
                    const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
                    const sectorNote = assignmentData?.sector || 'sector';
                    const logEntry = `[${timestamp}] 📝 PASO 1 COMPLETADO: ${sectorNote} registró acción inmediata (pendiente análisis profundo)`;
                    const currentNotes = reportData.notes || '';
                    const updatedNotes = currentNotes ? `${currentNotes}\n\n${logEntry}` : logEntry;

                    await supabase
                        .from('reports')
                        .update({ notes: updatedNotes })
                        .eq('id', reportData.id);
                } else {
                    // Full resolution: mark as resolved
                    const { error: assignErr } = await supabase
                        .from('sector_assignments')
                        .update({
                            status: 'resolved',
                            immediate_action: formData.immediateAction,
                            root_cause: formData.rootCause || null,
                            corrective_plan: formData.correctivePlan || null,
                            implementation_date: formData.implementationDate || null,
                            resolution_evidence_urls: formData.evidenceUrls || [],
                            resolved_at: new Date().toISOString()
                        })
                        .eq('id', assignmentId);

                    if (assignErr) throw assignErr;

                    // Log in report notes
                    const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
                    const sectorNote = assignmentData?.sector || 'sector';
                    const logEntry = `[${timestamp}] ✅ RESOLUCIÓN RECIBIDA: ${sectorNote} completó su gestión`;
                    const currentNotes = reportData.notes || '';
                    const updatedNotes = currentNotes ? `${currentNotes}\n\n${logEntry}` : logEntry;

                    await supabase
                        .from('reports')
                        .update({ notes: updatedNotes })
                        .eq('id', reportData.id);
                }
            }
            // Note: For non-multi-sector, the ResolutionForm already handles the DB updates directly
            // via supabase in handleStep1Submit and handleStep2Submit

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

    // Render the 2-step ResolutionForm + rejection modal
    return (
        <div className="relative">
            {/* Top Action Bar — only "No me corresponde" now */}
            <div className="absolute top-4 right-4 z-10 md:top-8 md:right-8 flex gap-2">
                <button
                    onClick={() => setShowRejectionModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-red-200 text-red-600 font-bold text-xs rounded-full shadow-sm hover:bg-red-50 transition-all"
                >
                    <XCircle className="w-4 h-4" />
                    No me corresponde
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
                                    placeholder="Ej: Esta observación corresponde al sector de Mantenimiento, no al mío..."
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
