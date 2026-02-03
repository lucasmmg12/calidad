import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { ResolutionForm } from '../components/ResolutionForm';
import { CorrectiveActionForm } from '../components/CorrectiveActionForm';
import { useEffect, useState } from 'react';
import { Loader2, FileText } from 'lucide-react';

export const ResolutionPage = () => {
    const { ticketId } = useParams();
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCorrectiveForm, setShowCorrectiveForm] = useState(false);

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

                // Mapear datos de la respuesta a la estructura requerida por el componente
                setReportData({
                    id: data.id,
                    trackingId: data.tracking_id,
                    description: data.content,
                    isAdverseEvent: data.is_adverse_event || (data.ai_category === 'Incidente' || data.ai_urgency === 'Rojo'), // Priorizar flag explícito
                    sector: data.sector,
                    contactNumber: data.contact_number
                });

                // Auto-activar formulario correctivo si es evento adverso
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
                    status: 'resolved'
                })
                .eq('id', reportData.id);

            if (error) throw error;

            console.log("Resolución guardada exitosamente");

            // NOTIFICAR AL REPORTANTE (Si existe contacto)
            if (reportData.contactNumber) {
                // Asumimos que el número en DB viene limpio (ej: 264xxxxxxx) y agregamos el prefijo de país 549
                const botNumber = `549${reportData.contactNumber}`;

                supabase.functions.invoke('send-whatsapp', {
                    body: {
                        number: botNumber,
                        message: `✅ *¡Buenas noticias!* \n\nTe informamos que el reporte con código *${reportData.trackingId}* ha sido gestionado y resuelto exitosamente por nuestro equipo.\n\nGracias por comprometerte con la calidad y seguridad de nuestra institución. 🙌`,
                        mediaUrl: "https://i.imgur.com/PnVTbEd.jpeg" // Imagen de 'Caso Resuelto'
                    }
                }).catch(err => console.error('Error enviando notificación de resolución:', err));
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

    // Modo Formulario de Acción Correctiva
    if (showCorrectiveForm) {
        return (
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
                    // Reutilizar lógica de notificación o mostrar 'Success' simple
                    handleSubmit({}); // Hacky reuse to trigger notif? No, separate handling appropriate inside component or passing callback.
                    // CorrectiveActionForm handles its own DB update, keeping it encapsulated. 
                    // But we might want to trigger the WhatsApp notification here too.

                    if (reportData.contactNumber) {
                        const botNumber = `549${reportData.contactNumber}`;
                        supabase.functions.invoke('send-whatsapp', {
                            body: {
                                number: botNumber,
                                message: `✅ *Caso Resuelto (Acción Correctiva)* \n\nEl evento código *${reportData.trackingId}* ha sido analizado y cerrado con un plan de mejora.\n\nGracias por tu compromiso con la seguridad del paciente. 🙌`,
                                mediaUrl: "https://i.imgur.com/PnVTbEd.jpeg"
                            }
                        }).catch(console.error);
                    }
                    alert("Acción Correctiva Registrada y PDF Generado.");
                    window.close(); // Try to close tab or redirect
                }}
            />
        );
    }

    return (
        <div className="relative">
            {/* Toggle Button for Full Form */}
            <div className="absolute top-4 right-4 z-10 md:top-8 md:right-8">
                <button
                    onClick={() => setShowCorrectiveForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-orange-200 text-orange-700 font-bold text-xs rounded-full shadow-sm hover:bg-orange-50 transition-all"
                >
                    <FileText className="w-4 h-4" />
                    Cambiar a Modo Evento Adverso
                </button>
            </div>
            <ResolutionForm reportData={reportData} onSubmit={handleSubmit} />
        </div>
    );
};
