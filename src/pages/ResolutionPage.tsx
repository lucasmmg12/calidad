import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { ResolutionForm } from '../components/ResolutionForm';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export const ResolutionPage = () => {
    const { ticketId } = useParams();
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            if (!ticketId) return;

            try {
                const { data, error } = await supabase
                    .from('reports')
                    .select('*')
                    .eq('tracking_id', ticketId)
                    .single();

                if (error) throw error;

                // Mapear datos de la respuesta a la estructura requerida por el componente
                setReportData({
                    id: data.id,
                    trackingId: data.tracking_id,
                    description: data.content,
                    isAdverseEvent: data.is_adverse_event || (data.ai_category === 'Incidente' || data.ai_urgency === 'Rojo'), // Priorizar flag explícito
                    sector: data.sector
                });
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
                    resolved_at: new Date().toISOString(),
                    status: 'resolved'
                })
                .eq('id', reportData.id);

            if (error) throw error;

            console.log("Resolución guardada exitosamente");
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

    return <ResolutionForm reportData={reportData} onSubmit={handleSubmit} />;
};
