import { useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { Send, ShieldAlert, Loader2, ChevronDown, User, Lock, Info, AlertTriangle, Lightbulb, Paperclip, X, Phone } from 'lucide-react';
import { DoraAssistant } from './DoraAssistant';
import { SECTOR_OPTIONS } from '../constants/sectors';


export const ReportingForm = () => {
    const [loading, setLoading] = useState(false);
    const [successId, setSuccessId] = useState<string | null>(null);
    const [isAnonymous, setIsAnonymous] = useState<boolean | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        originSector: '',
        sector: '',
        content: '',
        contactName: '',
        contactNumber: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const generateTrackingId = () => {
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `SA-${year}-${random}`;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);

            // Validate sizes
            const validFiles = newFiles.filter(file => {
                if (file.size > 5 * 1024 * 1024) {
                    alert(`El archivo ${file.name} es demasiado grande. Máximo 5MB.`);
                    return false;
                }
                return true;
            });

            if (validFiles.length > 0) {
                setFiles(prev => [...prev, ...validFiles]);
                const newPreviews = validFiles.map(file => URL.createObjectURL(file));
                setPreviewUrls(prev => [...prev, ...newPreviews]);
            }
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => {
            const urlToRemove = prev[index];
            URL.revokeObjectURL(urlToRemove);
            return prev.filter((_, i) => i !== index);
        });
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

        // Validate required fields
        if (!formData.sector) {
            alert('Por favor, selecciona el sector al que va dirigido el hallazgo.');
            setLoading(false);
            return;
        }

        if (isAnonymous === null) {
            alert('Por favor, indica si deseas reportar de forma anónima o identificada.');
            setLoading(false);
            return;
        }

        if (!isAnonymous) {
            if (!formData.contactName.trim()) {
                alert("Por favor, ingresa tu nombre completo.");
                setLoading(false);
                return;
            }
            if (rawNumber.length !== 10) {
                alert("El número de teléfono debe tener exactamente 10 dígitos (cod. área + número), sin 0 ni 15. Ej: 2645438114");
                setLoading(false);
                return;
            }
        }

        const dbNumber = rawNumber.length >= 8 ? rawNumber : null;
        const dbName = formData.contactName.trim() || null;

        // Bot: 549 + Number (e.g. 5492645438114)
        const botNumber = dbNumber ? `549${dbNumber}` : null;

        try {
            // 1. Upload Files if exist
            if (files.length > 0) {
                for (const file of files) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${trackingId}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage
                        .from('evidence')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage
                        .from('evidence')
                        .getPublicUrl(fileName);

                    evidenceUrls.push(data.publicUrl);
                }
            }

            // 2. Insert Report
            const { error: dbError } = await supabase
                .from('reports')
                .insert({
                    tracking_id: trackingId,
                    sector: formData.sector,
                    origin_sector: formData.originSector || null,
                    content: formData.content,
                    is_anonymous: isAnonymous === true,
                    contact_name: dbName,
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
                    onClick={() => { setSuccessId(null); setFormData({ originSector: '', sector: '', content: '', contactName: '', contactNumber: '' }); setFiles([]); setPreviewUrls([]); setIsAnonymous(null); }}
                    className="btn-primary w-full"
                >
                    Enviar Nuevo Reporte
                </button>

                {/* Dora Success Message */}
                <div className="mt-6">
                    <DoraAssistant
                        variant="inline"
                        message="¡Excelente trabajo! Tu reporte nos ayuda a ser mejores cada día. 💙"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 mb-20 relative">
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
                        <p className="font-bold text-slate-800 text-sm">Identificación</p>
                        <p className="text-xs text-slate-500 leading-relaxed">Identificarte nos permite darte feedback directo y hacer seguimiento.</p>
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-[2.5rem] p-6 md:p-12">
                <form onSubmit={handleSubmit} className="space-y-10">

                    {/* Identified Mode Header */}
                    <div className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-500 ${isAnonymous === null
                        ? 'border-slate-200 bg-slate-50/50'
                        : !isAnonymous
                            ? 'border-green-200 bg-green-50/50'
                            : 'border-amber-200 bg-amber-50/50'
                        }`}>
                        <div className="p-6">
                            <div className="mb-3">
                                <p className="text-sm font-bold text-slate-700 mb-1">
                                    ¿Cómo deseas reportar? <span className="text-red-500">*</span>
                                </p>
                                <p className="text-xs text-slate-400">Seleccioná una opción antes de continuar</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAnonymous(false)}
                                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${isAnonymous === false
                                        ? 'border-green-400 bg-green-50 shadow-md shadow-green-500/10'
                                        : 'border-slate-200 hover:border-green-200 hover:bg-green-50/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isAnonymous === false ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            <User className="w-5 h-5" />
                                        </div>
                                        <span className={`font-bold text-sm ${isAnonymous === false ? 'text-green-700' : 'text-slate-600'}`}>
                                            Identificado
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        Recibís seguimiento por WhatsApp y podemos contactarte.
                                    </p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsAnonymous(true)}
                                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${isAnonymous === true
                                        ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-500/10'
                                        : 'border-slate-200 hover:border-amber-200 hover:bg-amber-50/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isAnonymous === true ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <span className={`font-bold text-sm ${isAnonymous === true ? 'text-amber-700' : 'text-slate-600'}`}>
                                            Anónimo
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">
                                        Tu identidad queda protegida con cifrado total.
                                    </p>
                                </button>
                            </div>

                            {/* Persuasive message when anonymous */}
                            {isAnonymous === true && (
                                <div className="mt-4 p-4 bg-white rounded-xl border border-amber-100 animate-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Info className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-amber-800 mb-1">¿Sabías que identificarte tiene ventajas?</p>
                                            <ul className="text-xs text-amber-700 space-y-1">
                                                <li className="flex items-center gap-1.5">✅ Recibís notificaciones del avance de tu caso por WhatsApp</li>
                                                <li className="flex items-center gap-1.5">✅ Podemos contactarte para resolver tu inquietud más rápido</li>
                                                <li className="flex items-center gap-1.5">✅ Tu información se trata con <strong>estricta confidencialidad</strong></li>
                                            </ul>
                                            <button
                                                type="button"
                                                onClick={() => setIsAnonymous(false)}
                                                className="mt-3 text-xs font-bold text-sanatorio-primary hover:underline flex items-center gap-1"
                                            >
                                                <User className="w-3 h-3" /> Quiero identificarme
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Selector de Sector Origen (Opcional) */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                Sector al que perteneces (Opcional)
                                <div className="group relative">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                                        Si lo deseas, indícanos a qué sector perteneces. Esto es opcional para mantener el anonimato.
                                    </div>
                                </div>
                            </label>
                            <div className="relative group">
                                <select
                                    className="w-full px-4 py-3 rounded-xl border-gray-200 focus:border-sanatorio-primary focus:ring-sanatorio-primary transition-all bg-gray-50 focus:bg-white appearance-none cursor-pointer pr-12 text-gray-700"
                                    value={formData.originSector}
                                    onChange={(e) => setFormData({ ...formData, originSector: e.target.value })}
                                >
                                    <option value="">Selecciona tu sector (Opcional)...</option>
                                    {SECTOR_OPTIONS.map((option) => (
                                        <option key={`origin-${option.value}`} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none group-focus-within:text-sanatorio-primary transition-colors" />
                            </div>
                        </div>

                        {/* Selector de Sector Destino (OBLIGATORIO) */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                Sector al cual va dirigida su observación <span className="text-red-500">*</span>
                                <div className="group relative">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                                        Indique el área donde ocurrió el evento o hacia donde dirige su reporte.
                                    </div>
                                </div>
                            </label>
                            <div className="relative group">
                                <select
                                    required
                                    className="w-full px-4 py-3 rounded-xl border-gray-200 focus:border-sanatorio-primary focus:ring-sanatorio-primary transition-all bg-gray-50 focus:bg-white appearance-none cursor-pointer pr-12 text-gray-700"
                                    value={formData.sector}
                                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                >
                                    <option value="">Selecciona el área relacionada...</option>
                                    {SECTOR_OPTIONS.map((option) => (
                                        <option key={`dest-${option.value}`} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none group-focus-within:text-sanatorio-primary transition-colors" />
                            </div>
                        </div>



                        {/* Contenido */}
                        <div className="space-y-2">
                            <label className="label-text">Detalle del Hallazgo</label>
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

                            {/* Previews Grid */}
                            {previewUrls.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                                    {previewUrls.map((url, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                                            <img src={url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(idx)}
                                                    className="bg-white p-2 rounded-full text-red-600 shadow-md hover:scale-110 active:scale-95 transition-all"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-sanatorio-primary/40 hover:text-sanatorio-primary hover:bg-white transition-all duration-300 gap-2 group"
                                >
                                    <div className="bg-slate-100 p-2 rounded-xl group-hover:bg-sanatorio-primary/10 transition-colors">
                                        <Paperclip className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-bold tracking-tight">Adjuntar fotos o evidencia (+ Fotos)</span>
                                </button>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                multiple
                                className="hidden"
                            />
                        </div>

                        {/* Contact Fields — Required when identified, optional when anonymous */}
                        {isAnonymous === false ? (
                            <div className="space-y-5 p-5 bg-green-50/50 rounded-2xl border border-green-100 animate-in slide-in-from-top-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <User className="w-4 h-4 text-green-600" />
                                    <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Datos de Contacto (Obligatorio)</span>
                                </div>
                                <div className="space-y-2">
                                    <label className="label-text">Nombre Completo <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-sanatorio-primary transition-colors" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Juan Pérez"
                                            className="input-field pl-12"
                                            value={formData.contactName}
                                            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="label-text">WhatsApp de Contacto <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-sanatorio-primary transition-colors" />
                                        <input
                                            type="tel"
                                            required
                                            placeholder="Ej: 2645438114"
                                            className="input-field pl-12"
                                            value={formData.contactNumber}
                                            onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                            maxLength={10}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-1">
                                        Ingresa 10 dígitos sin 0 ni 15. Ej: 2645438114
                                    </p>
                                </div>
                            </div>
                        ) : isAnonymous === true ? (
                            <div className="space-y-5 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 animate-in slide-in-from-top-4">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Datos de Contacto (Opcional)</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Modo Anónimo</span>
                                </div>
                                <p className="text-xs text-slate-500 -mt-2">
                                    Aunque elegiste el modo anónimo, dejarnos tu nombre o teléfono nos permite darte un mejor seguimiento. <strong>Es completamente opcional.</strong>
                                </p>
                                <div className="space-y-2">
                                    <label className="label-text">Nombre (Opcional)</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-sanatorio-primary transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Si querés, dejanos tu nombre..."
                                            className="input-field pl-12"
                                            value={formData.contactName}
                                            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="label-text">WhatsApp (Opcional)</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-sanatorio-primary transition-colors" />
                                        <input
                                            type="tel"
                                            placeholder="Ej: 2645438114"
                                            className="input-field pl-12"
                                            value={formData.contactNumber}
                                            onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                            maxLength={10}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-1">
                                        Si lo ingresás, te notificaremos el avance de tu caso.
                                    </p>
                                </div>
                            </div>
                        ) : null}
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
                </form >
            </div >
        </div >
    );
};
