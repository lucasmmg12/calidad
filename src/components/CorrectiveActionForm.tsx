import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
    FileText,
    Save,
    Download,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    Building2,
    Search,
    UserCircle2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '../utils/supabase';

interface CorrectiveActionFormProps {
    reportId?: string;
    initialData?: {
        date: string;
        sector: string;
        description: string;
        trackingId: string;
    };
    onClose?: () => void;
    onSuccess?: () => void;
}

interface CorrectiveActionFormData {
    origin: 'auditoria' | 'reclamo' | 'seguridad' | 'otro';
    sector: string;
    findingType: 'desvio' | 'oportunidad' | 'no_conformidad' | 'evento_adverso';
    description: string;
    rootCauseAnalysis: string;
    actionPlan: string;
    responsible: string;
    deadline: string;
}

export const CorrectiveActionForm: React.FC<CorrectiveActionFormProps> = ({
    reportId,
    initialData,
    onClose,
    onSuccess
}) => {
    const { register, handleSubmit, formState: { errors } } = useForm<CorrectiveActionFormData>({
        defaultValues: {
            origin: 'reclamo',
            sector: initialData?.sector || '',
            findingType: 'evento_adverso', // Default for this context
            description: initialData?.description || '',
            responsible: '',
        }
    });

    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const generatePDF = async () => {
        if (!formRef.current) return;
        setIsGeneratingPdf(true);

        try {
            // Create a canvas from the form element
            const canvas = await html2canvas(formRef.current, {
                scale: 2, // Higher resolution
                backgroundColor: '#ffffff',
                ignoreElements: (element) => element.classList.contains('no-print') // Ignore buttons
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // Add Header
            pdf.setFillColor(6, 46, 112); // Sanatorio Primary Blue
            pdf.rect(0, 0, pdfWidth, 20, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(16);
            pdf.text('REGISTRO DE ACCIÓN CORRECTIVA', 10, 13);
            pdf.setFontSize(10);
            pdf.text(`ID: ${initialData?.trackingId || 'N/A'}`, pdfWidth - 40, 13);

            // Add Form Image
            pdf.addImage(imgData, 'PNG', 0, 25, pdfWidth, pdfHeight);

            // Footer
            const today = new Date().toLocaleDateString();
            pdf.setFontSize(8);
            pdf.setTextColor(100);
            pdf.text(`Generado el: ${today} - Sistema de Gestión de Calidad Sanatorio Argentino`, 10, pdf.internal.pageSize.getHeight() - 10);

            pdf.save(`Accion_Correctiva_${initialData?.trackingId || 'Borrador'}.pdf`);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF. Por favor intente nuevamente.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const onSubmit = async (data: CorrectiveActionFormData) => {
        setIsSubmitting(true);
        try {
            // Update Supabase if we have a reportId
            if (reportId) {
                // Determine values for DB update
                const updates = {
                    status: 'resolved', // Or keep as pending_resolution depending on workflow? Assuming this closes it or stages it.
                    root_cause: data.rootCauseAnalysis,
                    corrective_plan: data.actionPlan,
                    assigned_to: data.responsible,
                    resolution_notes: `Acción Correctiva Registrada. Tipo: ${data.findingType}. Origen: ${data.origin}`,
                    // Note: We might need to add implementation_date column if not exists, 
                    // storing it in resolution_notes or another field for now if schema update strictly forbidden without explicit ask, 
                    // but user asked for "Formulario WEB" context. I will stick to existing fields + notes for now.
                };

                const { error } = await supabase
                    .from('reports')
                    .update(updates)
                    .eq('id', reportId);

                if (error) throw error;
            }

            // Auto-generate PDF on submit? Or keep it separate. User said "de esto se genere un archivo en pdf descargable".
            // We can offer the download after saving or do it automatically.
            // Let's prompt or just do it.
            await generatePDF();

            if (onSuccess) onSuccess();
            if (onClose) onClose();

        } catch (error) {
            console.error('Error saving corrective action:', error);
            alert('Error al guardar la acción correctiva.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl my-8 flex flex-col max-h-[90vh]">

                {/* Header Toolbar */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-sanatorio-primary flex items-center gap-2">
                            <FileText className="w-6 h-6" />
                            Acción Correctiva
                        </h2>
                        <p className="text-sm text-gray-500">Gestión de Eventos Adversos y Desvíos</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => generatePDF()}
                            disabled={isGeneratingPdf}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-sanatorio-primary bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                        >
                            <Download className="w-4 h-4" />
                            {isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Scrollable Form Content */}
                <div className="overflow-y-auto p-8 bg-slate-50 custom-scrollbar" >
                    <form id="corrective-form" ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto pb-10">

                        {/* Title Wrapper for PDF Capture Context */}
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-sanatorio-primary"></div>

                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 uppercase tracking-widest">Informe de Calidad</h3>
                                    <p className="text-sm text-gray-500 mt-1">Fecha de Emisión: {new Date().toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase tracking-wider mb-1">
                                        Confidencial
                                    </span>
                                    <p className="text-xs text-gray-400 font-mono">REF: {initialData?.trackingId}</p>
                                </div>
                            </div>

                            {/* Section 1: Origen */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                        <Building2 className="w-3 h-3" /> Origen
                                    </label>
                                    <select
                                        {...register('origin', { required: true })}
                                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-sanatorio-primary focus:border-sanatorio-primary block p-2.5 outline-none"
                                    >
                                        <option value="reclamo">Reclamo / Queja</option>
                                        <option value="auditoria">Hallazgo Auditoría</option>
                                        <option value="seguridad">Ronda de Seguridad</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                        <Search className="w-3 h-3" /> Tipo Hallazgo
                                    </label>
                                    <select
                                        {...register('findingType', { required: true })}
                                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-sanatorio-primary focus:border-sanatorio-primary block p-2.5 outline-none"
                                    >
                                        <option value="evento_adverso">Evento Adverso</option>
                                        <option value="no_conformidad">No Conformidad</option>
                                        <option value="desvio">Desvío Menor</option>
                                        <option value="oportunidad">Oportunidad Mejora</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                        <Building2 className="w-3 h-3" /> Sector Afectado
                                    </label>
                                    <input
                                        type="text"
                                        {...register('sector', { required: true })}
                                        className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-sanatorio-primary focus:border-sanatorio-primary block p-2.5 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Detalle */}
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 bg-blue-50 text-sanatorio-primary rounded-lg">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Descripción del Hallazgo</h3>
                            </div>
                            <textarea
                                {...register('description', { required: true })}
                                rows={4}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary outline-none transition-all resize-none"
                                placeholder="Describa detalladamente qué sucedió, dónde y quiénes estuvieron involucrados (sin nombres de pacientes)..."
                            ></textarea>
                            {errors.description && <span className="text-xs text-red-500 font-medium">Este campo es requerido.</span>}
                        </div>

                        {/* Section 3: Causa Raíz */}
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-4 border-l-4 border-l-orange-400">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                    <Search className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Análisis Causa Raíz (RCA)</h3>
                            </div>
                            <p className="text-xs text-gray-500">Utilice metodología de los 5 Porqués o Diagrama de Ishikawa.</p>
                            <textarea
                                {...register('rootCauseAnalysis', { required: true })}
                                rows={5}
                                className="w-full bg-orange-50/30 border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none transition-all resize-none"
                                placeholder="1. ¿Por qué ocurrió? ... 2. ¿Por qué? ... Identifique la causa sistémica, no solo el error humano."
                            ></textarea>
                            {errors.rootCauseAnalysis && <span className="text-xs text-red-500 font-medium">El análisis es obligatorio para eventos adversos.</span>}
                        </div>

                        {/* Section 4: Plan Acción */}
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 space-y-6 border-l-4 border-l-green-500">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Plan de Acción Correctiva</h3>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Acción Propuesta</label>
                                <textarea
                                    {...register('actionPlan', { required: true })}
                                    rows={3}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-green-200 focus:border-green-500 outline-none transition-all resize-none"
                                    placeholder="Describa la acción concreta para prevenir la recurrencia..."
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                        <UserCircle2 className="w-3 h-3" /> Responsable Implementación
                                    </label>
                                    <input
                                        type="text"
                                        {...register('responsible', { required: true })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-green-200 focus:border-green-500 outline-none"
                                        placeholder="Nombre y Apellido"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Fecha Límite
                                    </label>
                                    <input
                                        type="date"
                                        {...register('deadline', { required: true })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-green-200 focus:border-green-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-between items-center no-print">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 font-medium text-sm px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <div className="flex gap-4">
                        <button
                            type="button"
                            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:shadow hover:bg-gray-50 transition-all text-sm"
                        >
                            <Save className="w-4 h-4" />
                            Guardar Borrador
                        </button>
                        <button
                            // Trigger form submit via ref/external or putting this inside form (moved form tag out of scroll div ideally, or verify form id trigger)
                            onClick={handleSubmit(onSubmit)}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-sanatorio-primary text-white font-bold rounded-xl shadow-lg shadow-sanatorio-primary/30 hover:shadow-xl hover:-translate-y-0.5 transition-all text-sm"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {isSubmitting ? 'Registrando...' : 'Registrar Acción'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
