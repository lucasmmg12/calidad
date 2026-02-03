import { useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { Send, ShieldAlert, Loader2, ChevronDown, User, Lock, Info, AlertTriangle, Lightbulb, Paperclip, X, Phone } from 'lucide-react';

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
                        mediaUrl: "https://i.imgur.com/63f9RLD.jpeg"
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
            <div className="max-w-md mx-auto mt-10 p-10 glass-card text-center animate-in zoom-in-95 duration-500 rounded-[2.5rem]">
                <div className="flex justify-center mb-8 relative">
                    <div className="bg-white p-4 rounded-2xl shadow-premium animate-pulse">
                        <img
                            src="/logosanatorio.png"
                            alt="Logo"
                            className="w-20 h-20 object-contain"
                        />
                    </div>
                </div>
                <h2 className="text-3xl font-display font-black text-sanatorio-primary mb-4">¡Reporte Enviado!</h2>
                <p className="text-slate-500 mb-8 font-medium">Gracias por ayudarnos a mejorar. Tu código de seguimiento es:</p>
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl mb-8 group cursor-pointer hover:border-sanatorio-primary transition-colors">
                    <p className="text-3xl font-mono font-black text-sanatorio-primary tracking-wider group-active:scale-95 transition-transform">{successId}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Guarda este código para consultas futuras</p>
                </div>
                <button
                    onClick={() => { setSuccessId(null); setFormData({ sector: '', content: '', contactNumber: '' }); setFile(null); setPreviewUrl(null); }}
                    className="btn-primary w-full"
                >
                    Enviar Nuevo Reporte
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 mb-20">
            <div className="mb-12 text-center space-y-3">
                <h1 className="text-4xl md:text-5xl font-display font-black text-sanatorio-primary tracking-tight">Gestión de Calidad</h1>
                <p className="text-slate-500 text-lg font-medium">Tu voz es el motor de nuestra mejora continua.</p>
            </div>

            {/* Quick Guide Card */}
            <div className="glass-panel rounded-3xl p-8 mb-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sanatorio-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <h3 className="text-xs font-bold text-sanatorio-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Guía Rápida de Reporte
                </h3>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                        </div>
                        <p className="font-bold text-slate-800 text-sm">Sé Específico</p>
                        <p className="text-xs text-slate-500 leading-relaxed">Detalla el Qué, Dónde y Cuándo con precisión.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                            <Lightbulb className="w-5 h-5 text-yellow-600" />
                        </div>
                        <p className="font-bold text-slate-800 text-sm">Aporta Ideas</p>
                        <p className="text-xs text-slate-500 leading-relaxed">Tus sugerencias de solución son muy valiosas.</p>
                    </div>
                    <div className="space-y-3">
                        <div className="w-10 h-10 bg-sanatorio-secondary/10 rounded-xl flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-sanatorio-secondary" />
                        </div>
                        <p className="font-bold text-slate-800 text-sm">Privacidad</p>
                        <p className="text-xs text-slate-500 leading-relaxed">Usa el modo anónimo para proteger tu identidad.</p>
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-[2.5rem] p-6 md:p-12">
                <form onSubmit={handleSubmit} className="space-y-10">

                    {/* Toggle Anónimo */}
                    <div
                        className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-500 cursor-pointer ${isAnonymous
                            ? 'border-sanatorio-primary/20 bg-sanatorio-primary/5'
                            : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                            }`}
                        onClick={() => setIsAnonymous(!isAnonymous)}
                    >
                        <div className="p-6 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isAnonymous ? 'bg-sanatorio-primary text-white rotate-[360deg] shadow-lg shadow-sanatorio-primary/20' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                    {isAnonymous ? <Lock className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                </div>
                                <div className="text-left">
                                    <p className={`font-bold text-lg ${isAnonymous ? 'text-sanatorio-primary' : 'text-slate-600'}`}>
                                        {isAnonymous ? 'Modo Anónimo Activo' : 'Modo Identificado'}
                                    </p>
                                    <p className="text-sm text-slate-400 font-medium tracking-tight">
                                        {isAnonymous ? 'Tu identidad está 100% protegida.' : 'Podremos contactarte para darte feedback.'}
                                    </p>
                                </div>
                            </div>

                            <div className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-500 ${isAnonymous ? 'bg-sanatorio-primary' : 'bg-slate-300'}`}>
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-500 shadow-md ${isAnonymous ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Selector de Sector */}
                        <div className="space-y-2">
                            <label className="label-text">Sector o Servicio</label>
                            <div className="relative group">
                                <select
                                    required
                                    className="input-field appearance-none cursor-pointer pr-12 group-hover:border-slate-300"
                                    value={formData.sector}
                                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                >
                                    <option value="">Selecciona el área relacionada...</option>
                                    <option value="ADM-Administración">🗃️ ADM-Administración</option>
                                    <option value="ANST-Anestesia">💉 ANST-Anestesia</option>
                                    <option value="APS-Asistencia-Psicológica">🤲 APS-Asistencia-Psicológica</option>
                                    <option value="AUX-Auxiliares-de-Hoteleria">🏨 AUX-Auxiliares-de-Hoteleria</option>
                                    <option value="CDD-Control-de-Dispositivos">📏 CDD-Control-de-Dispositivos</option>
                                    <option value="CDI-Control-de-Infecciones">🦠 CDI-Control-de-Infecciones</option>
                                    <option value="CIT-Citologia">🧫 CIT-Citologia</option>
                                    <option value="COM-Comunicacion">💬 COM-Comunicacion</option>
                                    <option value="CYS-Compras-y-Suministros">💲 CYS-Compras-y-Suministros</option>
                                    <option value="DIR-Direccion">📍 DIR-Direccion</option>
                                    <option value="DXI-Diagnostico-por-Imágenes">☢️ DXI-Diagnostico-por-Imágenes</option>
                                    <option value="EST-Estadísticas">📊 EST-Estadísticas</option>
                                    <option value="FACT-Facturacion">💰 FACT-Facturacion</option>
                                    <option value="FAR-Farmacia">💊 FAR-Farmacia</option>
                                    <option value="FER-Fertilidad">🤰 FER-Fertilidad</option>
                                    <option value="FUN-Fundacion-Sanatorio-Argentino">🏥 FUN-Fundacion-Sanatorio-Argentino</option>
                                    <option value="GCM-Guardia-Clinica-Medica">🗺️ GCM-Guardia-Clinica-Medica</option>
                                    <option value="GGO-Guardia-Gineco-Obstetricia">🤱 GGO-Guardia-Gineco-Obstetricia</option>
                                    <option value="GPE-Guardia-de-Pediatria">👧 GPE-Guardia-de-Pediatria</option>
                                    <option value="HDD-Hospital-de-dia">🏢 HDD-Hospital-de-dia</option>
                                    <option value="HDM-Hemodinamia">🩸 HDM-Hemodinamia</option>
                                    <option value="HEM-Hemoterapia">❤️ HEM-Hemoterapia</option>
                                    <option value="HYS-Higiene-y-Seguridad">🧹 HYS-Higiene-y-Seguridad</option>
                                    <option value="INT-Internado">🛏️ INT-Internado</option>
                                    <option value="IPE-Internacion-Pediatrica">👶 IPE-Internacion-Pediatrica</option>
                                    <option value="KIN-Kinesiología">🦴 KIN-Kinesiología</option>
                                    <option value="LAB-Laboratorio">🔬 LAB-Laboratorio</option>
                                    <option value="LYC-Liquidación-y-Convenio">✉️ LYC-Liquidación-y-Convenio</option>
                                    <option value="MAN-Mantenimiento">🔨 MAN-Mantenimiento</option>
                                    <option value="MEM-Mantenimiento-Equipamiento-Medico">🥼 MEM-Mantenimiento-Equipamiento-Medico</option>
                                    <option value="NEO-Neonatologia">👶 NEO-Neonatologia</option>
                                    <option value="QUI-Quirofano">👨‍⚕️ QUI-Quirofano</option>
                                    <option value="REC-Recepcion-de-Pacientes">🤒 REC-Recepcion-de-Pacientes</option>
                                    <option value="RES-Residencias-Medicas">🩺 RES-Residencias-Medicas</option>
                                    <option value="RH-Recursos-Humanos">👩‍💼 RH-Recursos-Humanos</option>
                                    <option value="SGC-Gestion-de-la-Calidad">✅ SGC-Gestion-de-la-Calidad</option>
                                    <option value="TYS-Tecnologia-y-sistemas">💻 TYS-Tecnologia-y-sistemas</option>
                                    <option value="UCI-Unidad-Cuidados-Intensivos">💓 UCI-Unidad-Cuidados-Intensivos</option>
                                    <option value="VAC-Vacunatorio">🩹 VAC-Vacunatorio</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none group-focus-within:text-sanatorio-primary transition-colors" />
                            </div>
                        </div>

                        {/* Contenido */}
                        <div className="space-y-2">
                            <label className="label-text">Detalle del Incidente</label>
                            <textarea
                                required
                                rows={6}
                                placeholder="Describe brevemente lo sucedido..."
                                className="input-field resize-none leading-relaxed placeholder:text-slate-300"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                            <label className="label-text">Evidencia Visual (Opcional)</label>
                            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                                {previewUrl ? (
                                    <div className="relative w-full h-56 rounded-xl overflow-hidden shadow-premium group">
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={removeFile}
                                                className="bg-white p-3 rounded-full text-red-600 shadow-xl hover:scale-110 active:scale-95 transition-all"
                                            >
                                                <X className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-sanatorio-primary/40 hover:text-sanatorio-primary hover:bg-white transition-all duration-300 gap-3 group"
                                    >
                                        <div className="bg-slate-100 p-3 rounded-2xl group-hover:bg-sanatorio-primary/10 transition-colors">
                                            <Paperclip className="w-6 h-6" />
                                        </div>
                                        <span className="text-sm font-bold tracking-tight">Adjuntar foto o evidencia</span>
                                    </button>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        {!isAnonymous && (
                            <div className="space-y-2 animate-in slide-in-from-top-4">
                                <label className="label-text">WhatsApp de Contacto</label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-sanatorio-primary transition-colors" />
                                    <input
                                        type="tel"
                                        placeholder="Ej: 264 543 8114"
                                        className="input-field pl-12"
                                        value={formData.contactNumber}
                                        onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-1">Para recibir notificaciones del estado del reporte</p>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Enviar Reporte Seguro
                            </>
                        )}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-6 md:px-12 uppercase tracking-tight font-bold">
                        Tus datos son tratados con estricta confidencialidad bajo normas de calidad del Sanatorio Argentino (ISO 9001).
                    </p>
                </form>
            </div>
        </div >
    );
};
