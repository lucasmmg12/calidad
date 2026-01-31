import { useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { Send, ShieldAlert, CheckCircle, Loader2, ChevronDown, User, Lock, Info, AlertTriangle, Lightbulb, Paperclip, X, Image as ImageIcon } from 'lucide-react';

export const ReportingForm = () => {
    const [loading, setLoading] = useState(false);
    const [successId, setSuccessId] = useState<string | null>(null);
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        sector: '',
        content: '',
        contactNumber: ''
    });

    const generateTrackingId = () => {
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `SA-${year}-${random}`;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 5 * 1024 * 1024) {
                alert('El archivo es demasiado grande. Máximo 5MB.');
                return;
            }
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const removeFile = () => {
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const trackingId = generateTrackingId();
        let evidenceUrls: string[] = [];

        // Formatting Phone Number
        // DB: 2645438114 (Clean digits only)
        const rawNumber = formData.contactNumber.replace(/\D/g, '');
        const dbNumber = isAnonymous ? null : (rawNumber || null);

        // Bot: 549 + Number (e.g. 5492645438114)
        const botNumber = dbNumber ? `549${dbNumber}` : null;

        try {
            // 1. Upload File if exists
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${trackingId}_evidence.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('evidence')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('evidence')
                    .getPublicUrl(fileName);

                evidenceUrls.push(data.publicUrl);
            }

            // 2. Insert Report
            const { error: dbError } = await supabase
                .from('reports')
                .insert({
                    tracking_id: trackingId,
                    sector: formData.sector,
                    content: formData.content,
                    is_anonymous: isAnonymous,
                    contact_number: dbNumber,
                    status: 'pending',
                    evidence_urls: evidenceUrls
                });

            if (dbError) throw dbError;

            // 3. Send WhatsApp Confirmation IMMEDIATELY (if contact provided)
            // We do this before AI analysis so the user gets feedback instantly.
            if (botNumber) {
                // Fire and forget - don't block the UI for this
                supabase.functions.invoke('send-whatsapp', {
                    body: {
                        number: botNumber,
                        message: `👋 ¡Hola! Valoramos mucho que nos hayas contactado. Queremos contarte que ya recibimos tu reporte y el equipo de Calidad comenzará a revisarlo a la brevedad.\n\n🆔 Tu código de seguimiento personal es: *${trackingId}*\n\nCon este código podrás consultar los avances en el sistema cuando lo desees.\n\n¡Muchas gracias por ayudarnos a brindar una mejor atención cada día! ✨💙`,
                        mediaUrl: "https://i.imgur.com/X2903s6.png"
                    }
                }).catch(err => console.error('Error sending immediate whatsapp:', err));
            }

            // 4. Trigger AI (Background Process)
            await supabase.functions.invoke('analyze-report', {
                body: {
                    reportText: formData.content,
                    reportId: trackingId,
                    contactNumber: botNumber, // Still passing it for Red Alerts usage
                    evidenceUrls: evidenceUrls
                }
            });

            setSuccessId(trackingId);
        } catch (error) {
            console.error('Error submitting report:', error);
            alert('Hubo un error al enviar el reporte. Por favor intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (successId) {
        return (
            <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-2xl shadow-card border border-gray-100 text-center animate-in zoom-in-95 duration-300">
                <div className="flex justify-center mb-6">
                    <div className="bg-green-50 p-4 rounded-full">
                        <CheckCircle className="w-16 h-16 text-sanatorio-secondary" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Reporte Recibido!</h2>
                <p className="text-gray-500 mb-8">Gracias por ayudarnos a mejorar la calidad de atención.</p>

                <div className="bg-sanatorio-neutral p-6 rounded-xl border border-gray-100 mb-8">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">ID DE SEGUIMIENTO</p>
                    <p className="text-4xl font-mono font-bold text-sanatorio-primary tracking-widest">{successId}</p>
                </div>

                <p className="text-sm text-gray-400 mb-8 px-4">
                    Guarda este código para consultar el estado.
                </p>

                <button
                    onClick={() => {
                        setSuccessId(null);
                        setFormData({ sector: '', content: '', contactNumber: '' });
                        removeFile();
                    }}
                    className="w-full py-4 bg-sanatorio-primary text-white rounded-xl font-bold hover:bg-[#004270] transition-all shadow-lg shadow-sanatorio-primary/20 active:scale-95"
                >
                    Enviar Nuevo Reporte
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6">
            <div className="mb-8 text-center space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold text-sanatorio-primary tracking-tight">Gestión de Calidad</h1>
                <p className="text-gray-500 text-lg">Tu opinión es fundamental para mejorar nuestra atención.</p>
            </div>

            {/* Quick Guide Card */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 mb-8">
                <h3 className="text-sm font-bold text-sanatorio-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Guía Rápida de Reporte
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="flex gap-3">
                        <div className="bg-white p-2 rounded-lg shadow-sm h-fit">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 text-sm">Sé Específico</p>
                            <p className="text-xs text-gray-500 mt-1">Indica Qué pasó, Dónde y Cuándo. Evita generalidades.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white p-2 rounded-lg shadow-sm h-fit">
                            <Lightbulb className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 text-sm">Propone Soluciones</p>
                            <p className="text-xs text-gray-500 mt-1">Si tienes una idea, ¡queremos escucharla!</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white p-2 rounded-lg shadow-sm h-fit">
                            <ShieldAlert className="w-5 h-5 text-sanatorio-secondary" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 text-sm">Confidencialidad</p>
                            <p className="text-xs text-gray-500 mt-1">Usa el modo anónimo si prefieres mantener tu privacidad.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-card p-6 md:p-10 border border-white/50 backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Toggle Anónimo */}
                    <div
                        className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer ${isAnonymous
                            ? 'border-sanatorio-primary/10 bg-blue-50/50'
                            : 'border-transparent bg-gray-50'
                            }`}
                        onClick={() => setIsAnonymous(!isAnonymous)}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            {isAnonymous ? <ShieldAlert className="w-24 h-24 text-sanatorio-primary" /> : <User className="w-24 h-24 text-gray-400" />}
                        </div>

                        <div className="p-5 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${isAnonymous ? 'bg-sanatorio-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
                                    {isAnonymous ? <Lock className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                </div>
                                <div className="text-left">
                                    <p className={`font-bold text-lg ${isAnonymous ? 'text-sanatorio-primary' : 'text-gray-600'}`}>
                                        {isAnonymous ? 'Modo Anónimo Activo' : 'Modo Identificado'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {isAnonymous ? 'Tu identidad está protegida' : 'Podremos contactarte directamente'}
                                    </p>
                                </div>
                            </div>

                            <div className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ${isAnonymous ? 'bg-sanatorio-primary' : 'bg-gray-300'}`}>
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${isAnonymous ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Selector de Sector */}
                        <div className="space-y-2">
                            <label className="label-text">Sector / Servicio</label>
                            <div className="relative">
                                <select
                                    required
                                    className="input-field appearance-none cursor-pointer"
                                    value={formData.sector}
                                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                >
                                    <option value="">Selecciona el área relacionada...</option>
                                    <option value="Enfermeria">👩‍⚕️ Enfermería</option>
                                    <option value="Guardia">🚑 Guardia</option>
                                    <option value="UTI">🏥 Terapia Intensiva (UTI)</option>
                                    <option value="Piso">🛏️ Internación (Piso)</option>
                                    <option value="Quirofano">😷 Quirófano</option>
                                    <option value="Administracion">💼 Administración</option>
                                    <option value="Limpieza">🧹 Limpieza / Maestranza</option>
                                    <option value="Otro">📝 Otro</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                            </div>
                        </div>

                        {/* Contenido */}
                        <div className="space-y-2">
                            <label className="label-text">Detalle del Reporte</label>
                            <textarea
                                required
                                rows={6}
                                placeholder="Por favor detalla qué sucedió, dónde y cuándo con la mayor precisión posible."
                                className="input-field resize-none leading-relaxed placeholder:text-gray-400"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                            <label className="label-text">Evidencia (Opcional)</label>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                {previewUrl ? (
                                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden group">
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={removeFile}
                                            className="absolute top-2 right-2 bg-white/90 p-2 rounded-full shadow-md hover:bg-red-50 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-sanatorio-primary hover:text-sanatorio-primary hover:bg-white transition-all gap-2"
                                    >
                                        <div className="bg-gray-200 p-2 rounded-full mb-1">
                                            <Paperclip className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-medium">Adjuntar foto o evidencia</span>
                                        <span className="text-xs text-gray-400">Máx 5MB</span>
                                    </button>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>

                        {/* Contacto (Animado) */}
                        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${!isAnonymous ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="space-y-2 pt-2">
                                <label className="label-text flex items-center gap-2">
                                    WhatsApp de Contacto <span className="text-gray-400 font-normal text-xs">(Opcional)</span>
                                </label>
                                <input
                                    type="tel"
                                    placeholder="Ej: 2645438114 (Sin 0 ni 15)"
                                    className="input-field"
                                    value={formData.contactNumber}
                                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-sanatorio-primary text-white rounded-xl font-bold text-lg hover:bg-[#004270] transition-all flex items-center justify-center gap-3 shadow-lg shadow-sanatorio-primary/30 hover:shadow-xl hover:-translate-y-1 active:scale-95 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                Subiendo...
                            </>
                        ) : (
                            <>
                                Enviar Reporte
                                <Send className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                            </>
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-400 mt-6 md:px-12">
                        Tus datos son tratados con estricta confidencialidad bajo normas de calidad del Sanatorio Argentino (ISO 9001).
                    </p>
                </form>
            </div>
        </div>
    );
};
