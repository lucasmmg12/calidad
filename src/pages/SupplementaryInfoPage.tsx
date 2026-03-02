import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import {
    Loader2,
    CheckCircle2,
    Camera,
    X,
    ClipboardCheck,
    AlertTriangle,
    MessageSquare,
    Send,
} from 'lucide-react';

export const SupplementaryInfoPage = () => {
    const { requestId } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requestData, setRequestData] = useState<any>(null);
    const [reportData, setReportData] = useState<any>(null);

    // Form state
    const [responseText, setResponseText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!requestId) return;
            try {
                // Fetch the supplementary request
                const { data: req, error: reqErr } = await supabase
                    .from('supplementary_requests')
                    .select('*')
                    .eq('id', requestId)
                    .single();

                if (reqErr || !req) throw new Error('Solicitud no encontrada');

                // Check if already completed
                if (req.status === 'completed') {
                    setRequestData(req);
                    setSubmitted(true);
                    setLoading(false);
                    return;
                }

                setRequestData(req);

                // Fetch the associated report for context
                const { data: report, error: repErr } = await supabase
                    .from('reports')
                    .select('tracking_id, content, ai_summary, sector, created_at')
                    .eq('id', req.report_id)
                    .single();

                if (repErr) throw repErr;
                setReportData(report);
            } catch (err: any) {
                console.error('Error fetching supplementary request:', err);
                setError(err.message || 'No se pudo cargar la solicitud.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [requestId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!responseText.trim() && files.length === 0) {
            alert('Por favor, agregá al menos una descripción o una foto.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Upload files
            const uploadedUrls: string[] = [];
            for (const file of files) {
                const ext = file.name.split('.').pop();
                const name = `supp_${requestId}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
                const { error: upErr } = await supabase.storage.from('evidence').upload(name, file);
                if (!upErr) {
                    const { data } = supabase.storage.from('evidence').getPublicUrl(name);
                    if (data) uploadedUrls.push(data.publicUrl);
                }
            }

            const now = new Date().toISOString();

            // Update the supplementary request
            const { error: updErr } = await supabase
                .from('supplementary_requests')
                .update({
                    response_text: responseText.trim(),
                    response_evidence_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
                    responded_at: now,
                    status: 'completed',
                })
                .eq('id', requestId);

            if (updErr) throw updErr;

            // Log in report notes
            const timestamp = new Date().toLocaleString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires'
            });
            const logEntry = `[${timestamp}] 📎 INFO COMPLEMENTARIA RECIBIDA: El reportante completó los datos adicionales solicitados por ${requestData.requested_by_sector}`;

            // Append to report notes
            const { data: currentReport } = await supabase
                .from('reports')
                .select('notes')
                .eq('id', requestData.report_id)
                .single();

            const currentNotes = currentReport?.notes || '';
            const updatedNotes = currentNotes ? `${currentNotes}\n\n${logEntry}` : logEntry;

            await supabase
                .from('reports')
                .update({ notes: updatedNotes })
                .eq('id', requestData.report_id);

            // Send WhatsApp notification to the responsable
            // We need to find who to notify — check the assignment
            if (requestData.assignment_id) {
                const { data: assignment } = await supabase
                    .from('sector_assignments')
                    .select('assigned_phone')
                    .eq('id', requestData.assignment_id)
                    .single();

                if (assignment?.assigned_phone) {
                    const botNumber = `549${assignment.assigned_phone.replace(/\D/g, '').replace(/^549/, '')}`;
                    const trackingId = reportData?.tracking_id || '';
                    const resolutionLink = `${window.location.origin}/resolver-caso/${trackingId}/${requestData.assignment_id}`;
                    const preview = responseText.trim().substring(0, 100);

                    await supabase.functions.invoke('send-whatsapp', {
                        body: {
                            number: botNumber,
                            message: `✅ *Información Adicional Recibida*\n\nEl reportante completó los datos faltantes para el caso *${trackingId}*.\n\n📝 Resumen: "${preview}${responseText.length > 100 ? '...' : ''}"\n📎 ${uploadedUrls.length} imagen${uploadedUrls.length !== 1 ? 'es' : ''} adjunta${uploadedUrls.length !== 1 ? 's' : ''}\n\n👉 *Continúe la gestión aquí:* ${resolutionLink}\n\nSanatorio Argentino | Gestión de Calidad`,
                        }
                    });
                }
            }

            setSubmitted(true);
        } catch (err: any) {
            console.error('Error submitting supplementary info:', err);
            alert('Error al enviar: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ═══════════════════════════════════
    //  LOADING STATE
    // ═══════════════════════════════════
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // ═══════════════════════════════════
    //  ERROR STATE
    // ═══════════════════════════════════
    if (error || !requestData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center max-w-md bg-white rounded-3xl shadow-xl p-8 border border-red-100">
                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Enlace no válido</h2>
                    <p className="text-gray-500 text-sm">{error || 'No se encontró la solicitud.'}</p>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════
    //  SUCCESS STATE
    // ═══════════════════════════════════
    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-green-100 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Información Enviada!</h2>
                    <p className="text-gray-500">
                        Los datos adicionales fueron enviados al responsable del sector.
                        Gracias por colaborar con la mejora continua.
                    </p>
                    <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-sm font-mono text-gray-400">
                            Ticket #{reportData?.tracking_id || 'N/A'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════
    //  MAIN FORM
    // ═══════════════════════════════════
    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-100">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
                    <div className="bg-amber-500 p-2 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">Información Adicional</h1>
                        <p className="text-xs text-gray-500 font-medium">
                            #{reportData?.tracking_id} • Solicitud del sector
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Info Banner */}
                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200/60 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-900">
                                Se necesita más información sobre tu reporte
                            </p>
                            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                El responsable del sector necesita datos adicionales para poder resolver tu caso.
                                Completá la información solicitada a continuación.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Original Report Context */}
                {reportData && (
                    <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/60">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tu Reporte Original</h3>
                        <div className="bg-gray-50 rounded-xl p-4 text-gray-700 text-sm leading-relaxed border border-gray-100 italic">
                            "{reportData.ai_summary || reportData.content}"
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2">
                            Creado el {new Date(reportData.created_at).toLocaleDateString('es-AR')}
                        </p>
                    </section>
                )}

                {/* What info is needed */}
                <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 shadow-sm border border-blue-100">
                    <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4" />
                        ¿Qué información necesitan?
                    </h3>
                    <div className="bg-white rounded-xl p-4 text-gray-800 text-sm leading-relaxed border border-blue-200/50 font-medium">
                        "{requestData.request_message}"
                    </div>
                    <p className="text-[10px] text-blue-500 mt-2 font-medium">
                        Solicitado por: {requestData.requested_by_sector}
                    </p>
                </section>

                {/* Response Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/60 transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
                        <h3 className="font-bold text-gray-800 mb-4">Tu Respuesta</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">
                                    Descripción adicional
                                </label>
                                <textarea
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none h-32 text-sm"
                                    placeholder="Agregá la información que te solicitaron..."
                                    value={responseText}
                                    onChange={e => setResponseText(e.target.value)}
                                />
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-600 mb-2">
                                    Fotos adicionales
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-blue-200 group">
                                            <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeFile(idx)}
                                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-blue-500">
                                        <Camera className="w-6 h-6" />
                                        <span className="text-[10px] font-bold">Agregar</span>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                </div>
                                <p className="text-[10px] text-gray-400">Máximo 5MB por imagen.</p>
                            </div>
                        </div>
                    </section>

                    {/* Submit */}
                    <div className="pt-2 pb-12">
                        <button
                            type="submit"
                            disabled={isSubmitting || (!responseText.trim() && files.length === 0)}
                            className="w-full py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transform transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Enviar Información
                                </>
                            )}
                        </button>
                        <p className="text-center text-xs text-gray-400 mt-4">
                            Sanatorio Argentino • Sistema de Gestión de Calidad
                        </p>
                    </div>
                </form>
            </main>
        </div>
    );
};
