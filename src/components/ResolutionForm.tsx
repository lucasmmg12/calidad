import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import {
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    Camera,
    Send,
    ClipboardCheck,
    BrainCircuit,
    Calendar,
    Info,
    X,
    XCircle,
    Loader2,
    Save,
    Clock,
    ChevronRight,
    Image,
    MessageSquare,
    FileQuestion,
    CheckCircle,
} from 'lucide-react';
import type { ResolutionFormData, ResolutionStatus } from '../types/resolution';
import { SECTOR_OPTIONS } from '../constants/sectors';
import { ORIGIN_OPTIONS } from '../constants/origin_options';
import { VoiceRecorder } from './VoiceRecorder';

interface SupplementaryRequest {
    id: string;
    request_message: string;
    response_text: string | null;
    response_evidence_urls: string[] | null;
    responded_at: string | null;
    status: string;
    created_at: string;
    requested_by_sector: string;
}

interface Props {
    reportData: {
        id: string;
        trackingId: string;
        description: string;
        isAdverseEvent: boolean;
        sector: string;
        originSector?: string;
        reporterSector?: string;
        contactNumber?: string;
        isAnonymous?: boolean;
        assignmentId?: string;
        status?: string;
        resolutionStep?: string;
        draftData?: any;
        draftUpdatedAt?: string;
        immediateAction?: string;
        step1EvidenceUrls?: string[];
        qualityObservations?: string;
        managementType?: string;
    };
    onSubmit: (data: ResolutionFormData) => Promise<void>;
    onReject?: () => void;
}

export const ResolutionForm = ({ reportData, onSubmit, onReject }: Props) => {
    // Determine initial step from DB
    const getInitialStep = (): 'step1' | 'step2' | 'completed' => {
        const dbStep = reportData.resolutionStep;
        const reportStatus = reportData.status;

        // CRITICAL: If report was reopened by Quality, always start fresh
        if (reportStatus === 'pending_resolution' || reportStatus === 'pending') {
            // If there's a draft, resume from step2
            if (dbStep === 'step2_draft') return 'step2';
            // If step1 was done before rejection, go to step2 for adverse events
            if (dbStep === 'step1_completed' && reportData.isAdverseEvent) return 'step2';
            // Otherwise start from step1
            return 'step1';
        }

        if (dbStep === 'step1_completed' || dbStep === 'step2_draft') return 'step2';
        if (dbStep === 'step2_submitted') return 'completed';
        return 'step1';
    };

    const [currentStep, setCurrentStep] = useState<'step1' | 'step2' | 'completed'>(getInitialStep());

    // Step 1 state
    const [immediateAction, setImmediateAction] = useState(reportData.immediateAction || '');
    const [step1Files, setStep1Files] = useState<File[]>([]);
    const [step1ExistingUrls, setStep1ExistingUrls] = useState<string[]>(reportData.step1EvidenceUrls || []);
    const step1FileInputRef = useRef<HTMLInputElement>(null);

    // Step 2 state — load from draft if available
    const [step2Data, setStep2Data] = useState({
        rootCause: reportData.draftData?.rootCause || '',
        correctivePlan: reportData.draftData?.correctivePlan || '',
        implementationDate: reportData.draftData?.implementationDate || '',
    });
    const [step2Files, setStep2Files] = useState<File[]>([]);
    const [step2ExistingUrls] = useState<string[]>(reportData.draftData?.step2EvidenceUrls || []);
    const step2FileInputRef = useRef<HTMLInputElement>(null);

    // UI state
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<ResolutionStatus>('pending');
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(reportData.draftUpdatedAt || null);
    const [showDraftBanner, setShowDraftBanner] = useState(!!reportData.draftData);
    const [showAutoSaveOnboarding, setShowAutoSaveOnboarding] = useState(() => {
        return !localStorage.getItem('calidad_autosave_onboarding_seen');
    });
    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Supplementary Information Request state
    const [showInsufficientDataModal, setShowInsufficientDataModal] = useState(false);
    const [insufficientDataMessage, setInsufficientDataMessage] = useState('');
    const [isSendingInfoRequest, setIsSendingInfoRequest] = useState(false);
    const [supplementaryRequests, setSupplementaryRequests] = useState<SupplementaryRequest[]>([]);
    const [loadingSupplementary, setLoadingSupplementary] = useState(true);
    const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({ isOpen: false, type: 'success', title: '', message: '' });
    const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);

    const dismissAutoSaveOnboarding = () => {
        setShowAutoSaveOnboarding(false);
        localStorage.setItem('calidad_autosave_onboarding_seen', 'true');
    };

    // ═══════════════════════════════════════════
    //  FETCH SUPPLEMENTARY REQUESTS
    // ═══════════════════════════════════════════
    useEffect(() => {
        const fetchSupplementary = async () => {
            try {
                let query = supabase
                    .from('supplementary_requests')
                    .select('*')
                    .eq('report_id', reportData.id)
                    .order('created_at', { ascending: false });

                if (reportData.assignmentId) {
                    query = query.eq('assignment_id', reportData.assignmentId);
                }

                const { data, error } = await query;
                if (!error && data) {
                    setSupplementaryRequests(data);
                }
            } catch (err) {
                console.error('[SupplementaryRequests] Error fetching:', err);
            } finally {
                setLoadingSupplementary(false);
            }
        };
        fetchSupplementary();
    }, [reportData.id, reportData.assignmentId]);

    // ═══════════════════════════════════════════
    //  HANDLE INSUFFICIENT DATA REQUEST
    // ═══════════════════════════════════════════
    const handleRequestMoreInfo = async () => {
        if (!insufficientDataMessage.trim()) return;
        setIsSendingInfoRequest(true);

        try {
            const sectorLabel = SECTOR_OPTIONS.find(s => s.value === reportData.sector)?.label || reportData.sector;

            // 1. Create supplementary request in DB
            const { data: newReq, error: insertErr } = await supabase
                .from('supplementary_requests')
                .insert({
                    report_id: reportData.id,
                    assignment_id: reportData.assignmentId || null,
                    requested_by_sector: sectorLabel,
                    reporter_phone: reportData.contactNumber || null,
                    request_message: insufficientDataMessage.trim(),
                })
                .select()
                .single();

            if (insertErr) throw insertErr;

            // 2. Send WhatsApp to reporter
            const rawPhone = (reportData.contactNumber || '').replace(/\D/g, '');
            const botNumber = `549${rawPhone}`;
            const infoLink = `${window.location.origin}/info-adicional/${newReq.id}`;

            await supabase.functions.invoke('send-whatsapp', {
                body: {
                    number: botNumber,
                    message: `📋 *Solicitud de Información Adicional*\n\nEl responsable del sector *${sectorLabel}* necesita más información para gestionar su caso *${reportData.trackingId}*.\n\n💬 Mensaje: "${insufficientDataMessage.trim()}"\n\n👉 *Complete aquí:* ${infoLink}\n\nSanatorio Argentino | Gestión de Calidad`,
                    mediaUrl: "https://i.imgur.com/534kAhJ.jpeg"
                }
            });

            // 3. Log in report notes
            const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
            const logEntry = `[${timestamp}] ⚠️ DATOS INSUFICIENTES: ${sectorLabel} solicitó más información al reportante. Pregunta: "${insufficientDataMessage.trim()}"`;

            const { data: currentReport } = await supabase
                .from('reports')
                .select('notes')
                .eq('id', reportData.id)
                .single();

            const updatedNotes = currentReport?.notes ? `${currentReport.notes}\n\n${logEntry}` : logEntry;
            await supabase.from('reports').update({ notes: updatedNotes }).eq('id', reportData.id);

            // 4. Update local state
            setSupplementaryRequests(prev => [newReq, ...prev]);
            setShowInsufficientDataModal(false);
            setInsufficientDataMessage('');
            setFeedbackModal({ isOpen: true, type: 'success', title: 'Solicitud Enviada', message: 'Se envió la solicitud de información al reportante por WhatsApp.' });
        } catch (err: any) {
            console.error('[InsufficientData] Error:', err);
            setFeedbackModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo enviar la solicitud: ' + err.message });
        } finally {
            setIsSendingInfoRequest(false);
        }
    };

    const handleDiscardInsufficientData = async () => {

        try {
            const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
            const sectorLabel = SECTOR_OPTIONS.find(s => s.value === reportData.sector)?.label || reportData.sector;
            const logEntry = `[${timestamp}] ❌ DESCARTADO POR DATOS INSUFICIENTES: ${sectorLabel} no puede resolver — reportante anónimo sin datos de contacto.`;

            const { data: currentReport } = await supabase
                .from('reports')
                .select('notes')
                .eq('id', reportData.id)
                .single();

            const updatedNotes = currentReport?.notes ? `${currentReport.notes}\n\n${logEntry}` : logEntry;

            // Update report to discarded
            await supabase.from('reports').update({
                status: 'discarded',
                notes: updatedNotes,
            }).eq('id', reportData.id);

            // If multi-sector, also update assignment
            if (reportData.assignmentId) {
                await supabase.from('sector_assignments').update({
                    status: 'rejected',
                    notes: 'Descartado por datos insuficientes — reportante anónimo sin contacto.',
                }).eq('id', reportData.assignmentId);
            }

            setFeedbackModal({ isOpen: true, type: 'success', title: 'Caso Descartado', message: 'El caso fue descartado por datos insuficientes.' });
            setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
            console.error('[DiscardInsufficient] Error:', err);
            setFeedbackModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo descartar: ' + err.message });
        }
    };

    // ═══════════════════════════════════════════
    //  FILE UPLOAD LOGIC (shared)
    // ═══════════════════════════════════════════
    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        setFiles: React.Dispatch<React.SetStateAction<File[]>>
    ) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files).filter(f => {
                if (f.size > 5 * 1024 * 1024) {
                    alert(`${f.name} es demasiado grande. Máximo 5MB.`);
                    return false;
                }
                return true;
            });
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (
        index: number,
        setFiles: React.Dispatch<React.SetStateAction<File[]>>
    ) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async (files: File[], prefix: string): Promise<string[]> => {
        const urls: string[] = [];
        for (const file of files) {
            const ext = file.name.split('.').pop();
            const name = `${reportData.trackingId}_${prefix}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
            try {
                const { error } = await supabase.storage.from('evidence').upload(name, file);
                if (error) throw error;
                const { data } = supabase.storage.from('evidence').getPublicUrl(name);
                if (data) urls.push(data.publicUrl);
            } catch (err) {
                console.error('Upload error:', err);
            }
        }
        return urls;
    };

    // ═══════════════════════════════════════════
    //  STEP 1: SUBMIT IMMEDIATE ACTION
    // ═══════════════════════════════════════════
    const handleStep1Submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!immediateAction.trim()) return;

        setIsUploading(true);
        try {
            // Upload step1 files
            const newUrls = await uploadFiles(step1Files, 'step1');
            const allStep1Urls = [...step1ExistingUrls, ...newUrls];

            // Save to DB
            const { error } = await supabase
                .from('reports')
                .update({
                    resolution_notes: immediateAction.trim(),
                    step1_evidence_urls: allStep1Urls,
                    resolution_step: reportData.isAdverseEvent ? 'step1_completed' : 'step2_submitted',
                    // For non-adverse events, step 1 IS the full resolution
                    ...(reportData.isAdverseEvent ? {} : {
                        resolved_at: new Date().toISOString(),
                        status: 'quality_validation',
                        resolution_evidence_urls: allStep1Urls,
                    })
                })
                .eq('id', reportData.id);

            if (error) throw error;

            // Always notify parent so sector_assignments get updated
            await onSubmit({
                reportId: reportData.id,
                isAdverseEvent: reportData.isAdverseEvent,
                reportSummary: reportData.description,
                immediateAction: immediateAction.trim(),
                evidenceUrls: allStep1Urls,
                isStep1Only: reportData.isAdverseEvent, // Flag: step1 partial, not full resolution
            });

            if (reportData.isAdverseEvent) {
                // Move to step 2
                setStep1ExistingUrls(allStep1Urls);
                setStep1Files([]);
                setCurrentStep('step2');
            } else {
                setStatus('submitted');
                setCurrentStep('completed');
            }
        } catch (err: any) {
            console.error('Step 1 error:', err);
            alert('Error al guardar: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    // ═══════════════════════════════════════════
    //  STEP 2: AUTO-SAVE LOGIC
    // ═══════════════════════════════════════════
    const saveDraft = useCallback(async (silent = true) => {
        if (currentStep !== 'step2') return;

        try {
            if (!silent) setAutoSaveStatus('saving');

            const draftPayload = {
                rootCause: step2Data.rootCause,
                correctivePlan: step2Data.correctivePlan,
                implementationDate: step2Data.implementationDate,
                step2EvidenceUrls: step2ExistingUrls,
            };

            const now = new Date().toISOString();
            const { error } = await supabase
                .from('reports')
                .update({
                    draft_data: draftPayload,
                    draft_updated_at: now,
                    resolution_step: 'step2_draft',
                })
                .eq('id', reportData.id);

            if (error) throw error;

            setLastSavedAt(now);
            setAutoSaveStatus('saved');

            // Reset to idle after 3s
            setTimeout(() => setAutoSaveStatus('idle'), 3000);
        } catch (err) {
            console.error('Auto-save error:', err);
            setAutoSaveStatus('error');
        }
    }, [currentStep, step2Data, step2ExistingUrls, reportData.id]);

    // Debounced auto-save: triggers 3s after last keystroke
    useEffect(() => {
        if (currentStep !== 'step2') return;
        // Don't auto-save if all fields are empty
        if (!step2Data.rootCause && !step2Data.correctivePlan && !step2Data.implementationDate) return;

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            saveDraft(false);
        }, 3000);

        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        };
    }, [step2Data, currentStep, saveDraft]);

    // ═══════════════════════════════════════════
    //  STEP 2: MANUAL SAVE DRAFT
    // ═══════════════════════════════════════════
    const handleSaveDraft = async () => {
        await saveDraft(false);
    };

    // ═══════════════════════════════════════════
    //  STEP 2: SUBMIT TO QUALITY
    // ═══════════════════════════════════════════
    const handleStep2Submit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!step2Data.rootCause.trim() || !step2Data.correctivePlan.trim()) {
            alert('Por favor, completa el Análisis de Causa Raíz y el Plan de Acción antes de enviar.');
            return;
        }

        setIsUploading(true);
        try {
            // Upload step2 files
            const newUrls = await uploadFiles(step2Files, 'step2');
            const allStep2Urls = [...step2ExistingUrls, ...newUrls];

            // Build the full resolution data for the parent handler
            const fullData: ResolutionFormData = {
                reportId: reportData.id,
                isAdverseEvent: true,
                reportSummary: reportData.description,
                immediateAction: immediateAction || reportData.immediateAction || '',
                evidenceUrls: [...step1ExistingUrls, ...allStep2Urls],
                rootCause: step2Data.rootCause,
                correctivePlan: step2Data.correctivePlan,
                implementationDate: step2Data.implementationDate,
            };

            // Update DB with step2 data + clear draft
            const { error } = await supabase
                .from('reports')
                .update({
                    root_cause: step2Data.rootCause,
                    corrective_plan: step2Data.correctivePlan,
                    implementation_date: step2Data.implementationDate || null,
                    step2_evidence_urls: allStep2Urls,
                    resolution_evidence_urls: [...step1ExistingUrls, ...allStep2Urls],
                    resolution_step: 'step2_submitted',
                    status: 'quality_validation',
                    resolved_at: new Date().toISOString(),
                    draft_data: null, // Clear draft
                    draft_updated_at: null,
                })
                .eq('id', reportData.id);

            if (error) throw error;

            await onSubmit(fullData);
            setStatus('submitted');
            setCurrentStep('completed');
        } catch (err: any) {
            console.error('Step 2 submit error:', err);
            alert('Error al enviar: ' + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    // ═══════════════════════════════════════════
    //  RENDER: SUCCESS STATE
    // ═══════════════════════════════════════════
    if (status === 'submitted' || currentStep === 'completed') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-green-100 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Gestión Registrada!</h2>
                    <p className="text-gray-500">
                        La información ha sido enviada al Departamento de Calidad.
                        El ciclo de mejora continúa gracias a tu aporte.
                    </p>
                    <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-sm font-mono text-gray-400">Ticket #{reportData.trackingId}</p>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════
    //  HELPER: File Preview Grid
    // ═══════════════════════════════════════════
    const FileUploadSection = ({
        files, existingUrls, fileInputRef, setFiles, label
    }: {
        files: File[];
        existingUrls: string[];
        fileInputRef: React.RefObject<HTMLInputElement>;
        setFiles: React.Dispatch<React.SetStateAction<File[]>>;
        label?: string;
    }) => (
        <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
                {label || 'Evidencia Fotográfica'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {/* Existing uploaded images */}
                {existingUrls.map((url, idx) => (
                    <div key={`existing-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
                        <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute bottom-1 left-1 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                            ✓ Subida
                        </div>
                    </div>
                ))}

                {/* New files pending upload */}
                {files.map((file, idx) => (
                    <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-blue-200 group">
                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => removeFile(idx, setFiles)}
                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                            Pendiente
                        </div>
                    </div>
                ))}

                {/* Add button */}
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-500">
                    <Camera className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Agregar</span>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => handleFileChange(e, setFiles)}
                    />
                </label>
            </div>
            <p className="text-[10px] text-gray-400">Puede subir múltiples fotos como evidencia. Máximo 5MB por imagen.</p>
        </div>
    );

    // ═══════════════════════════════════════════
    //  HELPER: Auto-Save Indicator
    // ═══════════════════════════════════════════
    const AutoSaveIndicator = () => {
        if (currentStep !== 'step2') return null;

        const formatTime = (iso: string) => {
            try {
                return new Date(iso).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Argentina/Buenos_Aires'
                });
            } catch { return ''; }
        };

        return (
            <div className="flex items-center gap-2 text-xs">
                {autoSaveStatus === 'saving' && (
                    <span className="flex items-center gap-1 text-blue-500 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
                    </span>
                )}
                {autoSaveStatus === 'saved' && (
                    <span className="flex items-center gap-1 text-green-600 animate-in fade-in duration-300">
                        <CheckCircle2 className="w-3 h-3" /> Borrador guardado
                    </span>
                )}
                {autoSaveStatus === 'error' && (
                    <span className="flex items-center gap-1 text-red-500">
                        <AlertTriangle className="w-3 h-3" /> Error al guardar
                    </span>
                )}
                {autoSaveStatus === 'idle' && lastSavedAt && (
                    <span className="flex items-center gap-1 text-gray-400">
                        <Clock className="w-3 h-3" /> Último guardado: {formatTime(lastSavedAt)}
                    </span>
                )}
            </div>
        );
    };

    // ═══════════════════════════════════════════
    //  RENDER: MAIN FORM
    // ═══════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-100">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#00385c] p-2 rounded-lg">
                            <ClipboardCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 leading-tight">Resolución de Caso</h1>
                            <p className="text-xs text-gray-500 font-medium">#{reportData.trackingId} • {reportData.sector}</p>
                        </div>
                    </div>
                    <AutoSaveIndicator />
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

                {/* Step Progress Indicator (only for adverse events) */}
                {reportData.isAdverseEvent && (
                    <div className="flex items-center gap-0 bg-white rounded-2xl p-4 shadow-sm border border-gray-200/60">
                        {/* Step 1 */}
                        <div className={`flex items-center gap-2 flex-1 ${currentStep === 'step1' ? 'text-blue-600' : 'text-green-600'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${currentStep === 'step1'
                                ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500/30'
                                : 'bg-green-100 text-green-700'
                                }`}>
                                {currentStep === 'step1' ? '1' : '✓'}
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-xs font-bold">Respuesta Rápida</p>
                                <p className="text-[10px] text-gray-400">Acción inmediata</p>
                            </div>
                        </div>

                        {/* Connector */}
                        <div className={`flex-shrink-0 w-12 h-0.5 mx-1 transition-colors ${currentStep === 'step2' ? 'bg-green-400' : 'bg-gray-200'}`} />

                        {/* Step 2 */}
                        <div className={`flex items-center gap-2 flex-1 ${currentStep === 'step2'
                            ? 'text-amber-600'
                            : currentStep === 'step1' ? 'text-gray-300' : 'text-green-600'
                            }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${currentStep === 'step2'
                                ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500/30'
                                : currentStep === 'step1' ? 'bg-gray-100 text-gray-300' : 'bg-green-100 text-green-700'
                                }`}>
                                2
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-xs font-bold">Análisis Profundo</p>
                                <p className="text-[10px] text-gray-400">Causa raíz + Plan</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Report Summary Card */}
                <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/60">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Reporte Original</h3>
                    <div className="bg-gray-50 rounded-xl p-4 text-gray-700 text-sm leading-relaxed border border-gray-100 italic">
                        "{reportData.description}"
                    </div>

                    {/* Sectores intervinientes */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {reportData.originSector && (
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Origen</p>
                                <p className="text-xs font-bold text-blue-800">{ORIGIN_OPTIONS.find(o => o.value === reportData.originSector)?.label || reportData.originSector}</p>
                            </div>
                        )}
                        {reportData.reporterSector && (
                            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">Sector Reportante</p>
                                <p className="text-xs font-bold text-indigo-800">{SECTOR_OPTIONS.find(s => s.value === reportData.reporterSector)?.label || reportData.reporterSector}</p>
                            </div>
                        )}
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                            <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-0.5">Sector Destino</p>
                            <p className="text-xs font-bold text-purple-800">{SECTOR_OPTIONS.find(s => s.value === reportData.sector)?.label || reportData.sector}</p>
                        </div>
                    </div>

                    {reportData.isAdverseEvent && (
                        <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-2 rounded-lg text-xs font-bold border border-amber-100/50">
                            <AlertTriangle className="w-4 h-4" />
                            Requiere Análisis de Causa Raíz (Paso 2)
                        </div>
                    )}
                </section>

                {/* ═══════════════════════════════════
                    OBSERVACIONES DE CALIDAD (Read-only)
                ═══════════════════════════════════ */}
                {reportData.qualityObservations && (
                    <section className="bg-indigo-50/60 rounded-2xl p-5 shadow-sm border border-indigo-200/60 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                <MessageSquare className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-indigo-900">Observaciones de Calidad</h3>
                                <p className="text-[10px] text-indigo-500">Notas del equipo de Calidad sobre este caso</p>
                            </div>
                        </div>
                        <div className="bg-white/80 rounded-xl p-4 border border-indigo-100">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {reportData.qualityObservations}
                            </p>
                        </div>
                    </section>
                )}

                {/* ═══════════════════════════════════
                    SUPPLEMENTARY INFO SECTION
                ═══════════════════════════════════ */}
                {!loadingSupplementary && supplementaryRequests.length > 0 && (
                    <section className="space-y-3 animate-in fade-in duration-300">
                        {supplementaryRequests.map((req) => (
                            <div
                                key={req.id}
                                className={`rounded-2xl p-5 shadow-sm border transition-all ${req.status === 'completed'
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-amber-50 border-amber-200'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    {req.status === 'completed' ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                                    )}
                                    <h3 className="text-sm font-bold text-gray-800">
                                        {req.status === 'completed'
                                            ? '📎 Información Complementaria Recibida'
                                            : '⏳ Esperando Información del Reportante'}
                                    </h3>
                                </div>

                                <div className="bg-white/70 rounded-xl p-3 border border-gray-200/50 mb-3">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tu Pregunta</p>
                                    <p className="text-sm text-gray-700 italic">"{req.request_message}"</p>
                                </div>

                                {req.status === 'completed' && (
                                    <>
                                        {req.response_text && (
                                            <div className="bg-white/70 rounded-xl p-3 border border-green-200/50 mb-3">
                                                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Respuesta del Reportante</p>
                                                <p className="text-sm text-gray-800">{req.response_text}</p>
                                            </div>
                                        )}
                                        {req.response_evidence_urls && req.response_evidence_urls.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">📷 Evidencia Adicional</p>
                                                <div className="flex gap-2 overflow-x-auto pb-2">
                                                    {req.response_evidence_urls.map((url, i) => (
                                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                                            className="w-20 h-20 rounded-xl bg-gray-100 bg-cover bg-center border border-gray-200 flex-shrink-0 hover:ring-2 ring-blue-400 transition-all"
                                                            style={{ backgroundImage: `url(${url})` }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-gray-400 mt-2">
                                            Respondido el {new Date(req.responded_at!).toLocaleString('es-AR')}
                                        </p>
                                    </>
                                )}

                                {req.status === 'pending' && (
                                    <p className="text-xs text-amber-700 font-medium">
                                        El reportante aún no completó la información solicitada.
                                        Solicitado el {new Date(req.created_at).toLocaleString('es-AR')}
                                    </p>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                {/* ═══════════════════════════════════
                    STEP 1: IMMEDIATE ACTION
                ═══════════════════════════════════ */}
                {currentStep === 'step1' && (
                    <form onSubmit={handleStep1Submit} className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/60 transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
                            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">1</div>
                                    <div>
                                        <h2 className="font-bold text-gray-800">
                                            {reportData.managementType === 'felicitacion' ? 'Mensaje de Acuse' : 'Respuesta Rápida'}
                                        </h2>
                                        <p className="text-xs text-gray-400">
                                            {reportData.managementType === 'felicitacion' 
                                                ? 'Agradecé o sumá un comentario a esta felicitación.' 
                                                : '¿Qué hiciste en el momento para resolver o contener la situación?'}
                                        </p>
                                    </div>
                                </div>
                                {/* Insufficient Data — inline with header */}
                                {reportData.contactNumber ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowInsufficientDataModal(true)}
                                        className="px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs rounded-xl hover:bg-amber-100 transition-all flex items-center gap-1.5 flex-shrink-0"
                                    >
                                        <FileQuestion className="w-3.5 h-3.5" />
                                        Datos Insuficientes
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmDiscard(true)}
                                        className="px-3 py-2 bg-gray-100 border border-gray-200 text-gray-400 font-bold text-xs rounded-xl hover:bg-gray-200 hover:text-gray-500 transition-all flex items-center gap-1.5 flex-shrink-0"
                                    >
                                        <FileQuestion className="w-3.5 h-3.5" />
                                        Datos Insuficientes
                                    </button>
                                )}
                            </div>

                            {/* Tip */}
                            {reportData.managementType === 'felicitacion' ? (
                                <div className="mb-4 bg-green-50/50 p-3 rounded-lg border border-green-100 flex gap-3">
                                    <Info className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-green-600 leading-relaxed">
                                        <strong>¡Sector Destacado!</strong> Un usuario ha reconocido positivamente a tu área. Por favor, dejá un breve acuse de recibo.
                                    </p>
                                </div>
                            ) : (
                                <div className="mb-4 bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex gap-3">
                                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-600 leading-relaxed">
                                        <strong>Contanos la acción inmediata.</strong> No necesitás un análisis profundo ahora — solo qué se hizo para contener el problema (ej: se reemplazó la luminaria, se notificó al proveedor, se limpió el derrame).
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-2">
                                        {reportData.managementType === 'felicitacion' ? 'Comentario / Agradecimiento' : 'Descripción de la solución inmediata'} <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        required
                                        className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none h-32 text-sm"
                                        placeholder={reportData.managementType === 'felicitacion' ? "Ej: ¡Gracias! Lo haremos llegar al equipo..." : "Ej: Se reemplazó la luminaria afectada y se reportó a mantenimiento..."}
                                        value={immediateAction}
                                        onChange={e => setImmediateAction(e.target.value)}
                                    />
                                    <VoiceRecorder
                                        onTranscription={(text) => {
                                            setImmediateAction(prev => prev ? prev.trimEnd() + '\n\n' + text : text);
                                        }}
                                        disabled={isUploading}
                                        maxDurationSeconds={300}
                                    />
                                </div>

                                <FileUploadSection
                                    files={step1Files}
                                    existingUrls={step1ExistingUrls}
                                    fileInputRef={step1FileInputRef as React.RefObject<HTMLInputElement>}
                                    setFiles={setStep1Files}
                                    label="Evidencia Fotográfica (Paso 1)"
                                />
                            </div>
                        </section>

                        {/* Step 1 Action Bar */}
                        <div className="pt-2 pb-12 space-y-4">
                            <button
                                type="submit"
                                disabled={isUploading || !immediateAction.trim()}
                                className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transform transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        {reportData.isAdverseEvent ? (
                                            <>
                                                Enviar y Continuar al Paso 2
                                                <ChevronRight className="w-4 h-4" />
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                Confirmar Resolución
                                            </>
                                        )}
                                    </>
                                )}
                            </button>

                            {reportData.isAdverseEvent && (
                                <p className="text-center text-xs text-gray-400">
                                    Después de este paso, podrás completar el Análisis de Causa Raíz en el momento que quieras.
                                </p>
                            )}

                            {/* Reject Option */}
                            {onReject && (
                                <div className="border-2 border-dashed border-red-200 rounded-xl p-4 bg-red-50/30">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <XCircle className="w-4 h-4 text-red-400" />
                                            <span className="text-sm text-gray-600">¿Este caso no te corresponde?</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={onReject}
                                            className="px-4 py-2 bg-white border border-red-200 text-red-600 font-bold text-xs rounded-lg hover:bg-red-50 transition-all"
                                        >
                                            Rechazar Asignación
                                        </button>
                                    </div>
                                </div>
                            )}

                            <p className="text-center text-xs text-gray-400 mt-4">
                                Sanatorio Argentino • Sistema de Gestión de Calidad
                            </p>
                        </div>
                    </form>
                )}

                {/* ═══════════════════════════════════
                    STEP 2: RCA + ACTION PLAN (auto-save)
                ═══════════════════════════════════ */}
                {currentStep === 'step2' && (
                    <form onSubmit={handleStep2Submit} className="space-y-6 animate-in slide-in-from-right-4 duration-500">

                        {/* Auto-save Onboarding Banner (first time only) */}
                        {showAutoSaveOnboarding && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200/60 shadow-sm animate-in slide-in-from-top-3 duration-500">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <Info className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <p className="text-sm font-bold text-blue-900">💡 ¿Sabías que tu progreso se guarda automáticamente?</p>
                                        <p className="text-xs text-blue-700 leading-relaxed">
                                            Mientras completás este formulario, el sistema guarda tu borrador cada vez que dejás de escribir.
                                            Podés cerrar esta página, volver otro día, y tu trabajo estará exactamente donde lo dejaste.
                                            <span className="font-semibold"> ¡Sin miedo a perder lo que escribiste!</span>
                                        </p>
                                        <div className="flex items-center gap-3 pt-1">
                                            <button
                                                type="button"
                                                onClick={dismissAutoSaveOnboarding}
                                                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Entendido
                                            </button>
                                            <span className="text-[10px] text-blue-400">No volverás a ver este mensaje</span>
                                        </div>
                                    </div>
                                    <button type="button" onClick={dismissAutoSaveOnboarding} className="p-1 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0">
                                        <X className="w-4 h-4 text-blue-300" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Draft Recovery Banner */}
                        {showDraftBanner && (
                            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Save className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-blue-800">Borrador recuperado</p>
                                    <p className="text-xs text-blue-600">
                                        Tenés un borrador guardado{lastSavedAt ? ` del ${new Date(lastSavedAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}` : ''}. Podés continuar donde lo dejaste.
                                    </p>
                                </div>
                                <button type="button" onClick={() => setShowDraftBanner(false)} className="p-1 hover:bg-blue-100 rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-blue-400" />
                                </button>
                            </div>
                        )}

                        {/* Step 1 Summary (completed) */}
                        <section className="bg-green-50/50 rounded-2xl p-5 border border-green-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">✓</div>
                                <h3 className="text-sm font-bold text-green-800">Paso 1 Completado — Respuesta Rápida</h3>
                            </div>
                            <p className="text-sm text-green-700 bg-white rounded-lg p-3 border border-green-100 italic">
                                "{immediateAction || reportData.immediateAction}"
                            </p>
                            {step1ExistingUrls.length > 0 && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                                    <Image className="w-3 h-3" />
                                    {step1ExistingUrls.length} imagen{step1ExistingUrls.length > 1 ? 'es' : ''} adjunta{step1ExistingUrls.length > 1 ? 's' : ''}
                                </div>
                            )}
                        </section>

                        {/* Auto-save info banner */}
                        <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100 flex gap-3">
                            <Save className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-700 leading-relaxed">
                                <strong>Autoguardado activo.</strong> Tu progreso se guarda automáticamente mientras escribís. Podés cerrar esta página y volver en cualquier momento — tu borrador estará aquí.
                            </div>
                        </div>

                        {/* RCA Section */}
                        <section className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 shadow-sm border border-amber-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">2</div>
                                <div>
                                    <h2 className="font-bold text-gray-800">Análisis Profundo</h2>
                                    <p className="text-xs text-gray-500">Completá cuando estés listo — no hay apuro</p>
                                </div>
                            </div>

                            {/* RCA Tip */}
                            <div className="mb-6 bg-white/60 p-3 rounded-lg border border-amber-200/50 flex gap-3">
                                <BrainCircuit className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-900 leading-relaxed space-y-1">
                                    <p><strong>Análisis de Causa Raíz:</strong> No te detengas en el síntoma visible. Preguntá "¿Por qué?" al menos 5 veces.</p>
                                    <ul className="list-disc pl-3 opacity-80">
                                        <li>¿Por qué falló el equipo? (Porque no tuvo mantenimiento)</li>
                                        <li>¿Por qué no tuvo mantenimiento? (Porque no estaba en el cronograma)</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Causa Raíz Identificada <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        className="w-full p-3 rounded-xl border border-amber-200 bg-white/80 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all resize-none h-32 text-sm"
                                        placeholder="Detallá la causa fundamental del desvío..."
                                        value={step2Data.rootCause}
                                        onChange={e => setStep2Data(prev => ({ ...prev, rootCause: e.target.value }))}
                                    />
                                    <VoiceRecorder
                                        onTranscription={(text) => {
                                            setStep2Data(prev => ({ ...prev, rootCause: prev.rootCause ? prev.rootCause.trimEnd() + '\n\n' + text : text }));
                                        }}
                                        disabled={isUploading}
                                        maxDurationSeconds={300}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Plan de Acción Correctivo <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        className="w-full p-3 rounded-xl border border-amber-200 bg-white/80 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all resize-none h-24 text-sm"
                                        placeholder="¿Qué se hará para que esto NO vuelva a ocurrir?"
                                        value={step2Data.correctivePlan}
                                        onChange={e => setStep2Data(prev => ({ ...prev, correctivePlan: e.target.value }))}
                                    />
                                    <VoiceRecorder
                                        onTranscription={(text) => {
                                            setStep2Data(prev => ({ ...prev, correctivePlan: prev.correctivePlan ? prev.correctivePlan.trimEnd() + '\n\n' + text : text }));
                                        }}
                                        disabled={isUploading}
                                        maxDurationSeconds={300}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Estimada Implementación</label>
                                    <div className="relative">
                                        <Calendar className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                        <input
                                            type="date"
                                            className="w-full p-3 pl-10 rounded-xl border border-amber-200 bg-white/80 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all text-sm"
                                            value={step2Data.implementationDate}
                                            onChange={e => setStep2Data(prev => ({ ...prev, implementationDate: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                {/* Step 2 Evidence */}
                                <FileUploadSection
                                    files={step2Files}
                                    existingUrls={step2ExistingUrls}
                                    fileInputRef={step2FileInputRef as React.RefObject<HTMLInputElement>}
                                    setFiles={setStep2Files}
                                    label="Evidencia Fotográfica (Análisis)"
                                />
                            </div>
                        </section>

                        {/* Step 2 Action Bar */}
                        <div className="pt-2 pb-12 space-y-4">
                            <div className="flex gap-3">
                                {/* Save Draft */}
                                <button
                                    type="button"
                                    onClick={handleSaveDraft}
                                    disabled={autoSaveStatus === 'saving'}
                                    className={`flex-1 py-4 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 text-sm ${autoSaveStatus === 'saved'
                                        ? 'bg-green-50 border-2 border-green-300 text-green-700'
                                        : autoSaveStatus === 'error'
                                            ? 'bg-red-50 border-2 border-red-300 text-red-700'
                                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {autoSaveStatus === 'saving' ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : autoSaveStatus === 'saved' ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            ¡Borrador guardado!
                                        </>
                                    ) : autoSaveStatus === 'error' ? (
                                        <>
                                            <AlertTriangle className="w-4 h-4" />
                                            Error al guardar
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Guardar Borrador
                                        </>
                                    )}
                                </button>

                                {/* Submit to Quality */}
                                <button
                                    type="submit"
                                    disabled={isUploading || !step2Data.rootCause.trim() || !step2Data.correctivePlan.trim()}
                                    className="flex-[2] py-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-slate-900 shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Enviar a Calidad
                                        </>
                                    )}
                                </button>
                            </div>

                            <p className="text-center text-xs text-gray-400">
                                Tu borrador se guarda automáticamente. Podés volver en cualquier momento.
                            </p>

                            <p className="text-center text-xs text-gray-400 mt-4">
                                Sanatorio Argentino • Sistema de Gestión de Calidad
                            </p>
                        </div>
                    </form>
                )}

            </main>

            {/* ═══════════════════════════════════
                INSUFFICIENT DATA MODAL
            ═══════════════════════════════════ */}
            {showInsufficientDataModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5 border-b border-amber-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Solicitar Información Adicional</h3>
                                    <p className="text-xs text-amber-700">El reportante recibirá un WhatsApp con un formulario</p>
                                </div>
                                <button
                                    onClick={() => { setShowInsufficientDataModal(false); setInsufficientDataMessage(''); }}
                                    className="ml-auto p-2 hover:bg-amber-100 rounded-xl transition-colors"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    ¿Qué información necesitás del reportante?
                                </label>
                                <textarea
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all resize-none h-28 text-sm"
                                    placeholder="Ej: ¿En qué piso y sala está la ventana rota? ¿Podés enviar una foto?"
                                    value={insufficientDataMessage}
                                    onChange={e => setInsufficientDataMessage(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {/* Preview */}
                            {insufficientDataMessage.trim() && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Vista previa del mensaje</p>
                                    <div className="bg-green-50 rounded-lg p-3 border border-green-100 text-xs text-gray-700 leading-relaxed font-mono">
                                        📋 <strong>Solicitud de Información Adicional</strong><br />
                                        <br />
                                        El responsable del sector necesita más información para su caso <strong>#{reportData.trackingId}</strong>.<br />
                                        <br />
                                        💬 "{insufficientDataMessage.trim()}"<br />
                                        <br />
                                        👉 [Link al formulario]
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={() => { setShowInsufficientDataModal(false); setInsufficientDataMessage(''); }}
                                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRequestMoreInfo}
                                disabled={!insufficientDataMessage.trim() || isSendingInfoRequest}
                                className="flex-1 py-3 bg-amber-500 text-white font-bold text-sm rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSendingInfoRequest ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Enviar por WhatsApp
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════
                FEEDBACK MODAL (success / error)
            ═══════════════════════════════════ */}
            {feedbackModal.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 transform transition-all animate-in zoom-in-95 text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto ${feedbackModal.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {feedbackModal.type === 'success' ? <CheckCircle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{feedbackModal.title}</h3>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{feedbackModal.message}</p>
                        <button
                            onClick={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
                            className={`w-full py-3 px-4 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2
                                ${feedbackModal.type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-500/30' : 'bg-red-600 hover:bg-red-700 shadow-red-500/30'}`}
                        >
                            {feedbackModal.type === 'success' ? 'Aceptar' : 'Entendido'}
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════
                CONFIRM DISCARD MODAL
            ═══════════════════════════════════ */}
            {showConfirmDiscard && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 transform transition-all animate-in zoom-in-95 text-center">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto bg-red-100 text-red-600">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">¿Descartar este caso?</h3>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                            El reportante es anónimo y no dejó forma de contacto. El caso será descartado por datos insuficientes.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmDiscard(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => { setShowConfirmDiscard(false); handleDiscardInsufficientData(); }}
                                className="flex-1 py-3 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all"
                            >
                                Sí, Descartar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
