import { useEffect } from 'react';
import {
    Shield,
    Lock,
    Eye,
    MessageCircle,
    Clock,
    AlertTriangle,
    CheckCircle,
    FileText,
    TrendingUp,
    Smartphone,
    Search,
    Brain,
    Zap,
    LayoutDashboard
} from 'lucide-react';

const Presentation = () => {
    useEffect(() => {
        // Load html2pdf script
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return (
        <div className="bg-[#525252] min-h-screen">
            <style>{`
        :root {
            --slide-width: 1920px;
            --slide-height: 1080px; 
        }

        .presentation-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 40px;
            padding: 60px;
        }

        .slide-page {
            width: var(--slide-width);
            height: var(--slide-height);
            background-color: #F8FAFC;
            background-image:
                radial-gradient(circle at 0% 0%, rgba(0, 84, 139, 0.05) 0px, transparent 50%),
                radial-gradient(circle at 100% 100%, rgba(0, 169, 157, 0.05) 0px, transparent 50%);
            position: relative;
            overflow: hidden;
            box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.5);
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
        }

        @media screen and (max-width: 1950px) {
            .presentation-wrapper {
                zoom: 0.45;
            }
        }

        .glass-panel {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.5);
            box-shadow: 0 8px 32px 0 rgba(0, 84, 139, 0.05);
        }

        .glass-card {
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.6);
        }

        .grid-bg {
             background-image: linear-gradient(#00548B 1px, transparent 1px), linear-gradient(90deg, #00548B 1px, transparent 1px);
             background-size: 50px 50px;
             opacity: 0.03;
        }

        .text-gradient {
            background: linear-gradient(to right, #00548B, #00A99D);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .slide-number {
            position: absolute;
            bottom: 40px;
            right: 40px;
            font-family: 'Outfit', sans-serif;
            font-size: 1.5rem;
            color: #94A3B8;
            font-weight: 700;
        }
        
        .floating-element { animation: float 6s ease-in-out infinite; }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
            100% { transform: translateY(0px); }
        }
      `}</style>

            <div className="presentation-wrapper" id="presentation-content">

                {/* SLIDE 1: EL PROBLEMA INVISIBLE */}
                <div className="slide-page p-24 relative justify-center">
                    <div className="absolute inset-0 grid-bg"></div>

                    {/* Background Chaos Elements */}
                    <div className="absolute top-20 right-20 opacity-10 rotate-12"><FileText size={400} /></div>
                    <div className="absolute bottom-20 left-20 opacity-5 -rotate-12"><MessageCircle size={300} /></div>

                    <div className="absolute top-12 left-12 flex items-center gap-4 opacity-50">
                        <img src="/logosanatorio.png" className="h-10" alt="Logo" />
                        <span className="text-slate-400 font-bold tracking-widest uppercase text-sm">Desafío Institucional</span>
                    </div>

                    <div className="relative z-10 grid grid-cols-2 gap-24 items-center h-full">
                        <div className="space-y-10">
                            <h1 className="font-display font-black text-8xl text-slate-800 leading-none">
                                El Problema <br />
                                <span className="text-slate-300">Invisible</span>
                            </h1>
                            <div className="h-2 w-32 bg-red-500 rounded-full"></div>
                            <p className="font-sans text-3xl text-slate-500 leading-relaxed font-light">
                                La vieja era se define por el silencio. Quejas de pasillo, emails perdidos y la sensación de hablarle a la pared generan un costo oculto incalculable.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="glass-panel p-8 rounded-2xl border-l-8 border-red-500 flex items-start gap-6 transform rotate-1">
                                <div className="p-4 bg-red-50 text-red-500 rounded-xl">
                                    <Search size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-700">Sin Trazabilidad</h3>
                                    <p className="text-xl text-slate-500 mt-2">¿En qué quedó mi reporte? Nadie sabe.</p>
                                </div>
                            </div>
                            <div className="glass-panel p-8 rounded-2xl border-l-8 border-orange-500 flex items-start gap-6 transform -rotate-1 relative left-8">
                                <div className="p-4 bg-orange-50 text-orange-500 rounded-xl">
                                    <Lock size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-700">Miedo a Represalias</h3>
                                    <p className="text-xl text-slate-500 mt-2">La falta de anonimato silencia la verdad.</p>
                                </div>
                            </div>
                            <div className="glass-panel p-8 rounded-2xl border-l-8 border-slate-500 flex items-start gap-6 transform rotate-2">
                                <div className="p-4 bg-slate-100 text-slate-500 rounded-xl">
                                    <AlertTriangle size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-700">Riesgo Institucional</h3>
                                    <p className="text-xl text-slate-500 mt-2">Lo que no se reporta, se repite.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <span className="slide-number">01</span>
                </div>

                {/* SLIDE 2: PRESENTANDO DORA */}
                <div className="slide-page relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white"></div>
                    <div className="absolute inset-0 grid-bg opacity-20"></div>

                    <div className="relative z-10 flex flex-col items-center text-center space-y-12">
                        <div className="relative z-10 w-[400px] h-[400px] rounded-full bg-gradient-to-b from-white/80 to-white/40 shadow-2xl border-4 border-white backdrop-blur-sm flex items-end justify-center overflow-hidden mb-8 floating-element">
                            <img src="/dora (2).png" className="h-[95%] w-auto object-contain drop-shadow-xl" alt="Dora" />
                        </div>

                        <div>
                            <span className="inline-block py-2 px-6 rounded-full bg-sanatorio-primary/10 text-sanatorio-primary font-bold tracking-widest mb-6">SISTEMA OPERATIVO DE CALIDAD</span>
                            <h2 className="font-display font-black text-8xl text-sanatorio-primary mb-4">DORA</h2>
                            <p className="text-3xl text-slate-400 font-light">Inteligencia Colectiva & Mejora Continua</p>
                        </div>

                        <div className="grid grid-cols-3 gap-12 w-full max-w-6xl mt-12">
                            <div className="glass-card p-8 rounded-2xl text-center">
                                <div className="mx-auto w-16 h-16 bg-blue-50 text-sanatorio-primary rounded-full flex items-center justify-center mb-4"><Zap /></div>
                                <h3 className="text-xl font-bold text-slate-700">Rapidez</h3>
                                <p className="text-slate-500 mt-2">Gestión en tiempo real</p>
                            </div>
                            <div className="glass-card p-8 rounded-2xl text-center">
                                <div className="mx-auto w-16 h-16 bg-teal-50 text-sanatorio-secondary rounded-full flex items-center justify-center mb-4"><Eye /></div>
                                <h3 className="text-xl font-bold text-slate-700">Transparencia</h3>
                                <p className="text-slate-500 mt-2">Visibilidad total</p>
                            </div>
                            <div className="glass-card p-8 rounded-2xl text-center">
                                <div className="mx-auto w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4"><Brain /></div>
                                <h3 className="text-xl font-bold text-slate-700">Modernidad</h3>
                                <p className="text-slate-500 mt-2">Ecosistema vivo</p>
                            </div>
                        </div>
                    </div>
                    <span className="slide-number">02</span>
                </div>

                {/* SLIDE 3: SEGURIDAD PSICOLOGICA */}
                <div className="slide-page p-24 flex items-center bg-[#F0F9FA]">
                    <div className="absolute right-0 top-0 w-1/2 h-full bg-sanatorio-primary/5 clip-path-slant"></div>

                    <div className="grid grid-cols-2 gap-24 w-full h-full items-center z-10">
                        <div className="relative flex justify-center">
                            <div className="absolute inset-0 bg-sanatorio-secondary/20 blur-[100px] rounded-full"></div>
                            <Shield size={500} className="text-sanatorio-primary drop-shadow-2xl relative z-10" strokeWidth={1} />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <Lock size={150} className="text-white drop-shadow-lg" />
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div className="flex items-center gap-4">
                                <div className="h-[2px] w-12 bg-sanatorio-secondary"></div>
                                <span className="text-sanatorio-secondary font-bold tracking-widest uppercase">Cultura Justa</span>
                            </div>
                            <h2 className="font-display font-bold text-7xl text-slate-800 leading-tight">
                                Seguridad <br />
                                <span className="text-sanatorio-primary">Psicológica</span>
                            </h2>
                            <p className="font-sans text-2xl text-slate-600 leading-relaxed">
                                Eliminamos el miedo para multiplicar la verdad. Nuestro sistema de anonimato cifrado protege al reportante, fomentando la detección temprana de riesgos.
                            </p>

                            <div className="bg-white p-8 rounded-2xl shadow-lg border-l-4 border-sanatorio-secondary mt-8">
                                <div className="flex items-center gap-4 mb-2">
                                    <TrendingUp className="text-green-500" />
                                    <span className="font-bold text-slate-700 text-lg">Impacto Proyectado</span>
                                </div>
                                <p className="text-4xl font-bold text-slate-800">2x a 5x <span className="text-lg font-normal text-slate-500">más reportes en 90 días</span></p>
                            </div>
                        </div>
                    </div>
                    <span className="slide-number">03</span>
                </div>

                {/* SLIDE 4: TRAZABILIDAD ABSOLUTA */}
                <div className="slide-page p-24 flex flex-col justify-center">
                    <div className="text-center mb-20">
                        <h2 className="font-display font-black text-6xl text-slate-800">Trazabilidad Absoluta</h2>
                        <p className="text-2xl text-slate-500 mt-4 font-light">Nada se pierde. Todo se transforma en aprendizaje.</p>
                    </div>

                    <div className="relative w-full max-w-6xl mx-auto">
                        {/* Timeline Line */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2"></div>

                        <div className="grid grid-cols-5 gap-4 relative z-10">
                            {/* Step 1 */}
                            <div className="text-center group">
                                <div className="w-24 h-24 bg-white border-4 border-sanatorio-primary rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                                    <FileText size={32} className="text-sanatorio-primary" />
                                </div>
                                <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="block font-mono text-xs text-slate-400 mb-1">#SA-2026-001</span>
                                    <h4 className="font-bold text-slate-700">Reporte</h4>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="text-center group">
                                <div className="w-24 h-24 bg-white border-4 border-sanatorio-secondary rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                                    <Search size={32} className="text-sanatorio-secondary" />
                                </div>
                                <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="block font-mono text-xs text-slate-400 mb-1">Análisis</span>
                                    <h4 className="font-bold text-slate-700">Evaluación</h4>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="text-center group">
                                <div className="w-24 h-24 bg-white border-4 border-orange-400 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                                    <Zap size={32} className="text-orange-400" />
                                </div>
                                <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="block font-mono text-xs text-slate-400 mb-1">Acción</span>
                                    <h4 className="font-bold text-slate-700">Mejora</h4>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className="text-center group">
                                <div className="w-24 h-24 bg-white border-4 border-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                                    <CheckCircle size={32} className="text-indigo-400" />
                                </div>
                                <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="block font-mono text-xs text-slate-400 mb-1">Verificación</span>
                                    <h4 className="font-bold text-slate-700">Audit</h4>
                                </div>
                            </div>

                            {/* Step 5 */}
                            <div className="text-center group">
                                <div className="w-24 h-24 bg-sanatorio-primary rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                                    <Lock size={32} className="text-white" />
                                </div>
                                <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span className="block font-mono text-xs text-slate-400 mb-1">Cierre</span>
                                    <h4 className="font-bold text-slate-700">Forensic</h4>
                                </div>
                            </div>
                        </div>

                        <div className="mt-20 p-6 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-center gap-4 max-w-2xl mx-auto">
                            <AlertTriangle className="text-red-500" />
                            <p className="text-red-700 font-medium">Novedad: "Historial de Rechazos" para auditar la calidad de las respuestas.</p>
                        </div>
                    </div>
                    <span className="slide-number">04</span>
                </div>

                {/* SLIDE 5: GESTION AGIL WHATSAPP */}
                <div className="slide-page p-24 flex items-center justify-center bg-slate-900">
                    <div className="absolute inset-0 bg-[#0c1214]"></div>
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-green-500/10 rounded-full blur-[120px]"></div>

                    <div className="grid grid-cols-2 gap-24 w-full h-full items-center relative z-10">
                        <div className="space-y-10 text-white">
                            <div className="inline-flex items-center gap-3 bg-green-500/20 px-4 py-2 rounded-full text-green-400 border border-green-500/30">
                                <Smartphone size={20} />
                                <span className="font-bold tracking-wider text-sm uppercase">Quick Response</span>
                            </div>
                            <h2 className="font-display font-black text-7xl leading-tight">
                                Gestión Ágil<br />
                                <span className="text-green-500">WhatsApp Integration</span>
                            </h2>
                            <p className="font-sans text-2xl text-slate-400 leading-relaxed font-light">
                                Resolvemos la falta de tiempo de los jefes. Notificaciones automáticas con autenticación segura y "One-Click Action".
                            </p>
                            <div className="flex gap-8">
                                <div>
                                    <h4 className="text-4xl font-bold text-white">-70%</h4>
                                    <p className="text-slate-500">TPO Resolución</p>
                                </div>
                                <div>
                                    <h4 className="text-4xl font-bold text-white">100%</h4>
                                    <p className="text-slate-500">Mobile Friendly</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative mx-auto">
                            {/* Phone Mockup */}
                            <div className="w-[380px] h-[750px] bg-slate-800 rounded-[50px] border-[14px] border-slate-900 shadow-2xl relative overflow-hidden flex flex-col">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-slate-900 rounded-b-3xl"></div>
                                <div className="bg-[#111b21] flex-1 p-4 pt-12 font-sans relative">
                                    {/* Chat Header */}
                                    <div className="flex items-center gap-3 pb-4 border-b border-slate-700 mb-4">
                                        <div className="w-10 h-10 bg-sanatorio-primary rounded-full flex items-center justify-center text-white font-bold">D</div>
                                        <div>
                                            <p className="text-white font-bold text-sm">DORA Calidad</p>
                                            <p className="text-slate-400 text-xs">Business Account</p>
                                        </div>
                                    </div>
                                    {/* Messages */}
                                    <div className="bg-[#202c33] p-3 rounded-lg rounded-tl-none max-w-[85%] mb-4">
                                        <p className="text-white text-sm">Hola Dra. Martinez 👋, se ha asignado un nuevo incidente de <strong>Seguridad del Paciente (Caídas)</strong>.</p>
                                        <span className="text-[10px] text-slate-400 block text-right mt-1">10:30 AM</span>
                                    </div>
                                    <div className="bg-[#202c33] p-3 rounded-lg rounded-tl-none max-w-[85%] mb-4">
                                        <p className="text-white text-sm mb-2">Por favor, analice el caso #SA-2026-089 y proponga una acción correctiva antes de 48hs.</p>
                                        <div className="bg-[#2a3942] p-2 rounded flex items-center gap-2 mt-2">
                                            <div className="w-1 bg-green-500 h-8"></div>
                                            <p className="text-green-400 text-xs font-bold">Ver Caso en App</p>
                                        </div>
                                    </div>
                                    {/* Floating Button inside mock */}
                                    <div className="absolute bottom-6 right-6 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                        <MessageCircle className="text-white" size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <span className="slide-number">05</span>
                </div>

                {/* SLIDE 6: GESTION PROACTIVA */}
                <div className="slide-page p-24 bg-slate-50 flex flex-col justify-center">
                    <div className="flex justify-between items-end mb-16">
                        <div className="space-y-4">
                            <span className="text-sanatorio-primary font-bold tracking-widest uppercase">Semáforos & Alertas</span>
                            <h2 className="font-display font-black text-6xl text-slate-800">Gestión Proactiva</h2>
                        </div>
                        <div className="flex gap-4">
                            <div className="px-6 py-3 bg-red-100 text-red-700 rounded-lg font-bold flex items-center gap-2"><AlertTriangle size={18} /> Crítico</div>
                            <div className="px-6 py-3 bg-orange-100 text-orange-700 rounded-lg font-bold flex items-center gap-2"><Clock size={18} /> Vence Pronto</div>
                            <div className="px-6 py-3 bg-green-100 text-green-700 rounded-lg font-bold flex items-center gap-2"><CheckCircle size={18} /> En Plazo</div>
                        </div>
                    </div>

                    <div className="w-full h-[600px] glass-panel rounded-3xl border border-slate-200 shadow-2xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-sanatorio-primary"></div>

                        <div className="grid grid-cols-4 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase">Tiempo Promedio</p>
                                <p className="text-3xl font-black text-slate-800 mt-2">1.2 días</p>
                                <div className="flex items-center gap-1 text-green-500 text-xs mt-2"><TrendingUp size={12} /> -15% vs mes ant.</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase">Eficacia Terapéutica</p>
                                <p className="text-3xl font-black text-slate-800 mt-2">94%</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 col-span-2 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase">Alertas de Vencimiento (48h)</p>
                                    <p className="text-3xl font-black text-orange-500 mt-2">3 Casos</p>
                                </div>
                                <div className="flex -space-x-2">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white"></div>
                                    <div className="w-10 h-10 rounded-full bg-slate-300 border-2 border-white"></div>
                                    <div className="w-10 h-10 rounded-full bg-slate-400 border-2 border-white flex items-center justify-center text-xs font-bold text-white">+1</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm flex items-center justify-between">
                                <div className="flex gap-4 items-center">
                                    <AlertTriangle className="text-red-500" size={20} />
                                    <div>
                                        <p className="font-bold text-slate-800">Desvío en Protocolo Quirúrgico</p>
                                        <p className="text-sm text-slate-500">Quirófano 3 • Dr. R. Gomez</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">VENCIDO (+2h)</span>
                            </div>

                            <div className="bg-white p-4 rounded-xl border-l-4 border-orange-500 shadow-sm flex items-center justify-between">
                                <div className="flex gap-4 items-center">
                                    <Clock className="text-orange-500" size={20} />
                                    <div>
                                        <p className="font-bold text-slate-800">Falta de Insumo Crítico</p>
                                        <p className="text-sm text-slate-500">Farmacia • Lic. A. Perez</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">VENCE HOY</span>
                            </div>

                            <div className="bg-white p-4 rounded-xl border-l-4 border-green-500 shadow-sm flex items-center justify-between opacity-60">
                                <div className="flex gap-4 items-center">
                                    <CheckCircle className="text-green-500" size={20} />
                                    <div>
                                        <p className="font-bold text-slate-800">Error de Identificación (Near Miss)</p>
                                        <p className="text-sm text-slate-500">Admisión • J. Lopez</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">RESUELTO</span>
                            </div>
                        </div>
                    </div>
                    <span className="slide-number">06</span>
                </div>

                {/* SLIDE 7: BIENVENIDOS ALA ERA DORA */}
                <div className="slide-page relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-sanatorio-primary"></div>
                    <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '40px 40px' }}></div>

                    <div className="relative z-10 grid grid-cols-2 gap-20 w-full max-w-7xl px-12 items-center">
                        <div className="space-y-8 text-white">
                            <h2 className="font-display font-black text-8xl leading-tight">
                                La Nueva Era <br />
                                <span className="text-sanatorio-secondary">de Calidad</span>
                            </h2>
                            <p className="font-sans text-3xl font-light opacity-90 leading-relaxed">
                                Un sistema <span className="font-bold">transparente, seguro y eficiente</span>. <br />
                                Dejamos atrás la opacidad para construir un ecosistema de excelencia.
                            </p>

                            <div className="pt-8">
                                <div className="inline-block border-2 border-white/20 bg-white/10 backdrop-blur-md px-10 py-6 rounded-2xl">
                                    <p className="font-mono uppercase tracking-widest text-sm mb-2 opacity-70">Próximos Pasos</p>
                                    <div className="flex items-center gap-8 text-xl font-bold">
                                        <div className="flex items-center gap-3"><CheckCircle className="text-green-400" /> Piloto 30 Días</div>
                                        <div className="flex items-center gap-3"><LayoutDashboard className="text-blue-300" /> Migración</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-sanatorio-secondary/30 rounded-full blur-2xl"></div>
                                <LayoutDashboard size={400} className="text-white/10 relative z-0" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                                    <h3 className="font-display text-6xl font-black text-white">DORA</h3>
                                    <p className="text-white/60 tracking-widest uppercase mt-2">Bienvenido</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <span className="slide-number">07</span>
                </div>

            </div>
        </div>
    );
};

export default Presentation;
