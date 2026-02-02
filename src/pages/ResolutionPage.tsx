import { useParams } from 'react-router-dom';
import { ResolutionForm } from '../components/ResolutionForm';

export const ResolutionPage = () => {
    const { ticketId } = useParams();

    // MOCK DATA: Simula lo que vendría de la Base de Datos
    // En producción, aquí haríamos un fetch a Supabase usando el ticketId

    // CASO DE PRUEBA 1: Simple (Luz quemada)
    // Cambiar isAdverseEvent a true para probar el flujo complejo
    const mockData = {
        id: "123",
        trackingId: ticketId || "TK-2024-001",
        description: "Se reporta falta de luminaria en el pasillo de Quirófano 3. Es urgente por riesgo de caída.",
        isAdverseEvent: true, // <--- CAMBIAR ESTO AQUI PARA PROBAR MODOS (true/false)
        sector: "Mantenimiento"
    };

    const handleMockSubmit = async (data: any) => {
        console.log("Datos enviados al servidor (Simulado):", data);
        // Aquí iría el update a Supabase
    };

    return <ResolutionForm reportData={mockData} onSubmit={handleMockSubmit} />;
};
