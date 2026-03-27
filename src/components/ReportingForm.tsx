import { useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { Send, ShieldAlert, Loader2, User, Lock, Info, AlertTriangle, Lightbulb, Paperclip, X, Phone, Star, Trophy } from 'lucide-react';
import { DoraAssistant } from './DoraAssistant';
import { SearchableSelect } from './SearchableSelect';
import { SECTOR_OPTIONS } from '../constants/sectors';
import { VoiceRecorder } from './VoiceRecorder';

type ReportMode = 'hallazgo' | 'felicitacion';



export const ReportingForm = () => {
    const [loading, setLoading] = useState(false);
    const [successId, setSuccessId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [reportMode, setReportMode] = useState<ReportMode>('hallazgo');
    const [felicitacionSent, setFelicitacionSent] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        originSector: '',
        reporterSector: '',
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
        const rawNumber = formData.contactNumber.replace(/\D/g, '');

        if (!formData.sector) {
            alert('Por favor, selecciona el sector.');
            setLoading(false);
            return;
        }

        // Validations only for hallazgo identified mode
        if (reportMode === 'hallazgo' && !isAnonymous) {
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
                    const { data } = supabase.storage.from('evidence').getPublicUrl(fileName);
                    evidenceUrls.push(data.publicUrl);
                }
            }

            if (reportMode === 'felicitacion') {
                // ── FELICITACIÓN FLOW ──
                const sectorLabel = SECTOR_OPTIONS.find(s => s.value === formData.sector)?.label || formData.sector;
                const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

                const { error: dbError } = await supabase
                    .from('reports')
                    .insert({
                        tracking_id: trackingId,
                        sector: formData.sector,
                        reporter_sector: formData.reporterSector || null,
                        content: formData.content,
                        is_anonymous: false,
                        contact_name: dbName,
                        contact_number: dbNumber,
                        status: 'resolved',
                        finding_type: 'Felicitación',
                        ai_urgency: 'Verde',
                        ai_summary: `🎉 Felicitación para ${sectorLabel}`,
                        ai_category: 'Felicitación',
                        evidence_urls: evidenceUrls,
                        resolved_at: new Date().toISOString(),
                        notes: `[${timestamp}] 🎉 Felicitación recibida para ${sectorLabel}. Auto-cerrada.`
                    });
                if (dbError) throw dbError;

                // Auto-send WhatsApp to sector referentes
                try {
                    const { data: referentes } = await supabase
                        .from('user_profiles')
                        .select('display_name, phone_number, assigned_sectors')
                        .eq('account_status', 'approved');

                    const sectorReferentes = (referentes || []).filter(
                        u => u.phone_number && u.assigned_sectors?.includes(formData.sector)
                    );

                    const fromName = dbName || 'Un colaborador';
                    for (const ref of sectorReferentes) {
                        const refNumber = `549${ref.phone_number.replace(/\D/g, '')}`;
                        supabase.functions.invoke('send-whatsapp', {
                            body: {
                                number: refNumber,
                                message: `🎉 *¡Felicitaciones, ${ref.display_name || 'equipo'}!*\n\n${fromName} ha reconocido el trabajo de tu sector *${sectorLabel}*.\n\n💬 _"${formData.content}"_\n\n¡Seguí así! Tu dedicación marca la diferencia. 💪✨\n\n— Sistema de Calidad, Sanatorio Argentino`,
                                mediaUrl: "https://i.imgur.com/63f9RLD.jpeg"
                            }
                        }).catch(err => console.error('Error sending felicitacion whatsapp:', err));
                    }
                    setFelicitacionSent(sectorReferentes.length > 0);
                } catch (waErr) {
                    console.error('Error looking up referentes:', waErr);
                }

                setSuccessId(trackingId);
            } else {
                // ── HALLAZGO FLOW (original) ──
                const { error: dbError } = await supabase
                    .from('reports')
                    .insert({
                        tracking_id: trackingId,
                        sector: formData.sector,
                        origin_sector: formData.originSector || null,
                        reporter_sector: formData.reporterSector || null,
                        content: formData.content,
                        is_anonymous: isAnonymous === true,
                        contact_name: dbName,
                        contact_number: dbNumber,
                        status: 'pending',
                        evidence_urls: evidenceUrls
                    });
                if (dbError) throw dbError;

                if (botNumber) {
                    supabase.functions.invoke('send-whatsapp', {
                        body: {
                            number: botNumber,
                            message: `👋 ¡Hola! Valoramos mucho que nos hayas contactado. Queremos contarte que ya recibimos tu reporte y el equipo de Calidad comenzará a revisarlo a la brevedad.\n\n🆔 Tu código de seguimiento personal es: *${trackingId}*\n\nCon este código podrás consultar los avances en el sistema cuando lo desees.\n\n¡Muchas gracias por ayudarnos a brindar una mejor atención cada día! ✨💙`,
                            mediaUrl: "https://i.imgur.com/63f9RLD.jpeg"
                        }
                    }).catch(err => console.error('Error sending immediate whatsapp:', err));
                }

                await supabase.functions.invoke('analyze-report', {
                    body: {
                        reportText: formData.content,
                        reportId: trackingId,
                        contactNumber: botNumber,
                        evidenceUrls: evidenceUrls
                    }
                });

                setSuccessId(trackingId);
            }
        } catch (error) {
            console.error('Error submitting report:', error);
            alert('Hubo un error al enviar. Por favor intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (successId) {
        const isFelicitacion = reportMode === 'felicitacion';
        return (
            <div className="max-w-md mx-auto mt-10 p-10 glass-card text-center animate-in zoom-in-95 duration-500 rounded-[2.5rem]">
                <div className="flex justify-center mb-8 relative">
                    <div className={`p-4 rounded-2xl shadow-premium animate-pulse ${isFelicitacion ? 'bg-gradient-to-br from-yellow-100 to-amber-50' : 'bg-white'}`}>
                        {isFelicitacion ? (
                            <Trophy className="w-20 h-20 text-amber-500" />
                        ) : (
                            <img src="/logosanatorio.png" alt="Logo" className="w-20 h-20 object-contain" />
                        )}
                    </div>
                </div>
                <h2 className={`text-3xl font-display font-black mb-4 ${isFelicitacion ? 'text-amber-600' : 'text-sanatorio-primary'}`}>
                    {isFelicitacion ? '🎉 ¡Felicitación Enviada!' : '¡Reporte Enviado!'}
                </h2>
                <p className="text-slate-500 mb-8 font-medium">
                    {isFelicitacion
                        ? (felicitacionSent ? 'Tu reconocimiento fue enviado directamente al equipo del sector. ¡Gracias!' : 'Tu felicitación fue registrada exitosamente.')
                        : 'Gracias por ayudarnos a mejorar. Tu código de seguimiento es:'}
                </p>
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl mb-8">
                    <p className="text-3xl font-mono font-black text-sanatorio-primary tracking-wider">{successId}</p>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Guarda este código para consultas futuras</p>
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(successId);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            } catch {
                                // Fallback for older browsers
                                const input = document.createElement('input');
                                input.value = successId;
                                document.body.appendChild(input);
                                input.select();
                                document.execCommand('copy');
                                document.body.removeChild(input);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }
                        }}
                        className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${copied
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-white text-sanatorio-primary border border-sanatorio-primary/20 hover:bg-sanatorio-primary hover:text-white shadow-sm hover:shadow-md'
                            }`}
                    >
                        {copied ? (
                            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> ¡Copiado!</>
                        ) : (
                            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copiar código</>
                        )}
                    </button>
                </div>
                <button
                    onClick={() => { setSuccessId(null); setFormData({ originSector: '', reporterSector: '', sector: '', content: '', contactName: '', contactNumber: '' }); setFiles([]); setPreviewUrls([]); setIsAnonymous(false); setReportMode('hallazgo'); setFelicitacionSent(false); }}
                    className="btn-primary w-full"
                >
                    {isFelicitacion ? 'Enviar Otra' : 'Enviar Nuevo Reporte'}
                </button>
                <div className="mt-6">
                    <DoraAssistant
                        variant="inline"
                        message={isFelicitacion ? '¡Qué lindo gesto! Reconocer el trabajo de los demás fortalece al equipo. 🌟' : '¡Excelente trabajo! Tu reporte nos ayuda a ser mejores cada día. 💙'}
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

            {/* ── Mode Selector: Hallazgo vs Felicitación ── */}
            <div className="flex gap-4 mb-8">
                <button
                    type="button"
                    onClick={() => setReportMode('hallazgo')}
                    className={`flex-1 p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 group ${reportMode === 'hallazgo'
                        ? 'border-sanatorio-primary bg-sanatorio-primary/5 shadow-lg shadow-sanatorio-primary/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${reportMode === 'hallazgo' ? 'bg-sanatorio-primary text-white shadow-lg' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                        }`}>
                        <ShieldAlert className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                        <p className={`font-bold text-lg ${reportMode === 'hallazgo' ? 'text-sanatorio-primary' : 'text-gray-600'}`}>Hallazgo</p>
                        <p className="text-xs text-slate-400 mt-0.5">Reportar un problema u observación</p>
                    </div>
                </button>
                <button
                    type="button"
                    onClick={() => { setReportMode('felicitacion'); setIsAnonymous(false); }}
                    className={`flex-1 p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 group ${reportMode === 'felicitacion'
                        ? 'border-amber-400 bg-amber-50/50 shadow-lg shadow-amber-400/10'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                        }`}
                >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${reportMode === 'felicitacion' ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                        }`}>
                        <Star className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                        <p className={`font-bold text-lg ${reportMode === 'felicitacion' ? 'text-amber-600' : 'text-gray-600'}`}>Felicitación</p>
                        <p className="text-xs text-slate-400 mt-0.5">Reconocer el trabajo de un sector</p>
                    </div>
                </button>
            </div>

            {/* Quick Guide Card — only for hallazgo */}
            {reportMode === 'hallazgo' && (
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
            )}

            <div className="glass-card rounded-[2.5rem] p-6 md:p-12">
                <form onSubmit={handleSubmit} className="space-y-10">

                    {/* Identified Mode Header — only for hallazgo */}
                    {reportMode === 'hallazgo' && (<>
                        <div className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-500 ${!isAnonymous
                            ? 'border-green-200 bg-green-50/50'
                            : 'border-amber-200 bg-amber-50/50'
                            }`}>
                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${!isAnonymous ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-amber-400 text-white shadow-lg shadow-amber-400/20'}`}>
                                            {!isAnonymous ? <User className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                                        </div>
                                        <div className="text-left">
                                            <p className={`font-bold text-lg ${!isAnonymous ? 'text-green-700' : 'text-amber-700'}`}>
                                                {!isAnonymous ? 'Modo Identificado' : 'Modo Anónimo'}
                                            </p>
                                            <p className="text-sm text-slate-500 font-medium tracking-tight">
                                                {!isAnonymous ? 'Podremos contactarte para darte seguimiento y feedback.' : 'Tu identidad estará protegida.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-500 cursor-pointer ${isAnonymous ? 'bg-amber-400' : 'bg-green-500'}`}
                                        onClick={() => setIsAnonymous(!isAnonymous)}
                                    >
                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-500 shadow-md ${isAnonymous ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </div>
                                </div>

                                {/* Persuasive message when anonymous */}
                                {isAnonymous && (
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

                    </>)}

                    {/* Felicitación header */}
                    {reportMode === 'felicitacion' && (
                        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50/50 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white flex items-center justify-center shadow-lg shadow-amber-400/20">
                                    <Trophy className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-lg text-amber-700">Enviar Felicitación</p>
                                    <p className="text-sm text-amber-600/70">Tu reconocimiento será enviado directamente al equipo del sector 💛</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-8">

                        {/* Selector de Sector al que perteneces (OBLIGATORIO siempre) */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                Sector al que perteneces <span className="text-red-500">*</span>
                                <div className="group relative">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center z-10">
                                        Selecciona el sector o área al que perteneces dentro del Sanatorio. Este dato es obligatorio para la trazabilidad del hallazgo.
                                    </div>
                                </div>
                            </label>
                            <SearchableSelect
                                options={SECTOR_OPTIONS}
                                value={formData.reporterSector}
                                onChange={(val) => setFormData({ ...formData, reporterSector: val })}
                                placeholder="Selecciona tu sector..."
                                required
                            />
                        </div>

                        {/* Selector de Sector Destino (OBLIGATORIO) */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                {reportMode === 'felicitacion' ? 'Sector que deseas felicitar' : 'Sector al cual va dirigida su observación'} <span className="text-red-500">*</span>
                                <div className="group relative">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                                        Indique el área donde ocurrió el evento o hacia donde dirige su reporte.
                                    </div>
                                </div>
                            </label>
                            <SearchableSelect
                                options={SECTOR_OPTIONS}
                                value={formData.sector}
                                onChange={(val) => setFormData({ ...formData, sector: val })}
                                placeholder="Selecciona el área relacionada..."
                                required
                            />
                        </div>



                        {/* Contenido */}
                        <div className="space-y-2">
                            <label className="label-text">{reportMode === 'felicitacion' ? 'Tu mensaje de felicitación' : 'Detalle del Hallazgo'}</label>
                            <textarea
                                required
                                rows={reportMode === 'felicitacion' ? 4 : 6}
                                placeholder={reportMode === 'felicitacion' ? 'Contanos qué te gustó y por qué querés felicitar a este sector...' : 'Describe brevemente lo sucedido...'}
                                className="input-field resize-none leading-relaxed placeholder:text-slate-300"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>

                        {/* Voice Recorder */}
                        <VoiceRecorder
                            onTranscription={(text) => {
                                setFormData(prev => ({
                                    ...prev,
                                    content: prev.content
                                        ? prev.content.trimEnd() + '\n\n' + text
                                        : text
                                }));
                            }}
                            disabled={loading}
                            maxDurationSeconds={300}
                        />

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

                        {/* Contact Fields — Required when identified, optional when anonymous (hallazgo only) */}
                        {reportMode === 'hallazgo' && !isAnonymous ? (
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
                        ) : reportMode === 'hallazgo' ? (
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
                        ) : (
                            /* Felicitación: optional name field */
                            <div className="space-y-5 p-5 bg-amber-50/50 rounded-2xl border border-amber-100 animate-in slide-in-from-top-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Star className="w-4 h-4 text-amber-500" />
                                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">¿Quién felicita? (Opcional)</span>
                                </div>
                                <div className="space-y-2">
                                    <label className="label-text">Tu Nombre</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-amber-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Tu nombre (opcional)"
                                            className="input-field pl-12"
                                            value={formData.contactName}
                                            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full disabled:opacity-50 disabled:hover:scale-100 ${reportMode === 'felicitacion' ? 'btn-primary !bg-gradient-to-r !from-amber-400 !to-yellow-500 hover:!from-amber-500 hover:!to-yellow-600' : 'btn-primary'}`}
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : reportMode === 'felicitacion' ? (
                            <>
                                <Trophy className="w-5 h-5" />
                                Enviar Felicitación 🎉
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Enviar Reporte Seguro
                            </>
                        )}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-6 md:px-12 uppercase tracking-tight font-bold">
                        Tus datos son tratados con estricta confidencialidad.
                    </p>
                </form >
            </div >
        </div >
    );
};
