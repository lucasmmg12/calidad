import { useEffect } from 'react';

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
            --slide-height: 1358px;
        }

        .presentation-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 40px;
            padding: 60px;
            transition: all 0.3s ease;
        }

        .slide-page {
            width: var(--slide-width);
            height: var(--slide-height);
            background-color: #F8FAFC;
            background-image:
                radial-gradient(circle at 0% 0%, rgba(0, 84, 139, 0.08) 0px, transparent 50%),
                radial-gradient(circle at 100% 100%, rgba(0, 169, 157, 0.08) 0px, transparent 50%);
            position: relative;
            overflow: hidden;
            box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.5);
            page-break-inside: avoid;
            page-break-after: always;
        }

        @media screen and (max-width: 1950px) {
            .presentation-wrapper {
                zoom: 0.4;
            }
        }

        body.pdf-mode {
            background-color: white;
        }
        
        body.pdf-mode .presentation-wrapper {
            padding: 0;
            gap: 0;
            width: var(--slide-width);
        }

        body.pdf-mode .slide-page {
            box-shadow: none;
            border-radius: 0;
        }

        .glass-panel {
            background: rgba(255, 255, 255, 0.75);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.6);
            box-shadow: 0 8px 32px 0 rgba(0, 84, 139, 0.1);
        }

        .glass-card {
            background: rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.5);
            transition: all 0.3s ease;
        }

        .grid-bg {
             background-image: linear-gradient(#00548B 1px, transparent 1px), linear-gradient(90deg, #00548B 1px, transparent 1px);
             background-size: 40px 40px;
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
            color: #CBD5E1;
            font-weight: 700;
        }

        .floating-element { animation: float 6s ease-in-out infinite; }
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
            100% { transform: translateY(0px); }
        }

        @media print {
            body { background: white; }
            .presentation-wrapper { zoom: 1; padding: 0; gap: 0; }
            .slide-page { box-shadow: none; margin: 0; page-break-after: always; width: 100%; height: 100%; }
            .no-print { display: none !important; }
            @page { size: A4 landscape; margin: 0; }
        }
      `}</style>



            <div className="presentation-wrapper" id="presentation-content">
                {/* SLIDE 1: TITLE */}
                <div className="slide-page relative flex items-center justify-center">
                    <div className="absolute inset-0 z-0 grid-bg"></div>
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-sanatorio-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sanatorio-secondary/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

                    <div className="relative z-10 grid grid-cols-12 h-full w-full p-24 gap-12 items-center">
                        <div className="col-span-7 flex flex-col justify-center space-y-10">
                            <div className="mb-4">
                                <img src="/logosanatorio.png" alt="Sanatorio Argentino" className="h-20 w-auto object-contain bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm" />
                            </div>
                            <div className="space-y-4">
                                <div className="inline-flex items-center space-x-3 bg-sanatorio-primary/10 px-5 py-2 rounded-full border border-sanatorio-primary/10 w-fit">
                                    <span className="w-2 h-2 rounded-full bg-sanatorio-secondary animate-pulse"></span>
                                    <span className="text-sanatorio-primary font-bold tracking-wider text-sm uppercase">Proyecto Estratégico 2026</span>
                                </div>
                                <h1 className="font-display font-black text-9xl text-sanatorio-primary leading-tight tracking-tight drop-shadow-sm">
                                    CALIDAD
                                </h1>
                                <h2 className="font-display font-medium text-5xl text-slate-500 max-w-2xl border-l-4 border-sanatorio-secondary pl-8 py-2">
                                    Gestión Inteligente & <br />
                                    <span className="text-sanatorio-secondary font-bold">Seguridad del Paciente</span>
                                </h2>
                            </div>
                        </div>
                        <div className="col-span-5 relative h-full flex items-center justify-center">
                            <div className="relative z-20 h-full flex items-end justify-center pb-12">

                            </div>
                        </div>
                    </div>
                    <span className="slide-number">01</span>
                </div>

                {/* SLIDE 2: VISION */}
                <div className="slide-page relative flex flex-col p-24 justify-center">
                    <div className="absolute inset-0 z-0 grid-bg"></div>

                    <div className="absolute top-24 left-24 right-24 flex justify-between items-start">
                        <h3 className="font-display text-sanatorio-primary text-xl font-bold tracking-widest uppercase">Nuestra Visión</h3>
                        <img src="/logosanatorio.png" className="h-10 opacity-50" />
                    </div>

                    <div className="flex flex-col justify-center max-w-5xl mx-auto text-center space-y-16">
                        <h2 className="font-display text-7xl font-bold text-slate-800 leading-tight">
                            "Lo que no se mide,<br />
                            <span className="text-gradient">no se puede mejorar."</span>
                        </h2>
                        <div className="glass-panel p-12 rounded-3xl border-l-8 border-sanatorio-secondary">
                            <p className="font-sans text-3xl font-light text-slate-600 leading-relaxed">
                                Transformar la gestión de calidad en un ecosistema vivo, donde cada dato se convierte en una oportunidad para elevar el estándar de seguridad y excelencia médica.
                            </p>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 z-20 h-[500px] w-auto flex items-end justify-end pointer-events-none">

                    </div>
                    <span className="slide-number">02</span>
                </div>

                {/* SLIDE 3: EL PROBLEMA */}
                <div className="slide-page relative flex flex-col p-24">
                    <div className="absolute inset-0 z-0 grid-bg"></div>
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-slate-100 to-transparent"></div>

                    <div className="relative z-10 h-full flex flex-col justify-center">
                        <div className="absolute top-0 left-0 w-full flex justify-between items-start mb-16">
                            <h3 className="font-display text-sanatorio-primary text-xl font-bold tracking-widest uppercase">El Desafío Actual</h3>
                            <img src="/logosanatorio.png" className="h-10 opacity-50" />
                        </div>

                        <div className="grid grid-cols-2 gap-20 items-center h-full mt-10">
                            <div className="space-y-12">
                                <h2 className="font-display text-6xl font-bold text-slate-800">Silos de <br /><span className="text-sanatorio-primary">Información</span></h2>
                                <p className="font-sans text-2xl text-slate-500 leading-relaxed">
                                    Los procesos manuales y desconectados generan puntos ciegos en la atención. La falta de trazabilidad inmediata impide una respuesta ágil ante incidentes críticos.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-8">
                                <div className="glass-card p-8 rounded-2xl flex items-center space-x-6">
                                    <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-display text-2xl font-bold text-slate-700">Fragmentación</h4>
                                        <p className="text-slate-500">Datos dispersos en múltiples canales.</p>
                                    </div>
                                </div>
                                <div className="glass-card p-8 rounded-2xl flex items-center space-x-6">
                                    <div className="h-16 w-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-display text-2xl font-bold text-slate-700">Lentitud</h4>
                                        <p className="text-slate-500">Tiempos de respuesta inconsistentes.</p>
                                    </div>
                                </div>
                                <div className="glass-card p-8 rounded-2xl flex items-center space-x-6">
                                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-500">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    </div>
                                    <div>
                                        <h4 className="font-display text-2xl font-bold text-slate-700">Burocracia</h4>
                                        <p className="text-slate-500">Gestión documental excesiva.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 z-20 h-[450px] w-auto flex items-end justify-end pointer-events-none">

                    </div>
                    <span className="slide-number">03</span>
                </div>

                {/* SLIDE 4: LA SOLUCION */}
                <div className="slide-page relative flex flex-col p-24">
                    <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#F8FAFC] to-[#EFF6FF]"></div>
                    <div className="absolute inset-0 z-0 grid-bg"></div>

                    <div className="relative z-10 h-full flex flex-col items-center justify-center">
                        <div className="text-center mb-16">
                            <h2 className="font-display text-6xl font-bold text-slate-800 mb-6">El Ecosistema Calidad</h2>
                            <p className="font-sans text-2xl text-slate-500 max-w-3xl mx-auto">Una plataforma unificada que conecta personas, procesos y datos.</p>
                        </div>

                        <div className="relative w-[800px] h-[600px] scale-125 origin-center mt-10">
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-sanatorio-primary rounded-full flex items-center justify-center shadow-glass z-20">
                                <div className="text-center text-white">
                                    <span className="block font-display text-3xl font-bold">CORE</span>
                                    <span className="block text-sm opacity-80">Centralizado</span>
                                </div>
                            </div>
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 glass-card px-8 py-4 rounded-full shadow-lg">
                                <span className="font-bold text-sanatorio-primary text-xl">Gestión de Incidentes</span>
                            </div>
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 glass-card px-8 py-4 rounded-full shadow-lg">
                                <span className="font-bold text-sanatorio-primary text-xl">Auditoría Clínica</span>
                            </div>
                            <div className="absolute top-1/2 left-0 transform -translate-y-1/2 glass-card px-8 py-4 rounded-full shadow-lg">
                                <span className="font-bold text-sanatorio-primary text-xl">Analytics</span>
                            </div>
                            <div className="absolute top-1/2 right-0 transform -translate-y-1/2 glass-card px-8 py-4 rounded-full shadow-lg">
                                <span className="font-bold text-sanatorio-primary text-xl">Seguridad</span>
                            </div>

                            <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" style={{ overflow: 'visible' }}>
                                <circle cx="400" cy="300" r="200" fill="none" stroke="#00548B" strokeWidth="2" strokeDasharray="10 10" className="opacity-20"></circle>
                            </svg>
                        </div>
                    </div>
                    <div className="absolute top-12 right-12 z-30">
                        <img src="/logosanatorio.png" className="h-12 opacity-60" />
                    </div>
                    <div className="absolute bottom-0 right-0 z-0 h-[400px] w-auto flex items-end justify-end pointer-events-none opacity-40">

                    </div>
                    <span className="slide-number">04</span>
                </div>

                {/* SLIDE 5: DASHBOARD */}
                <div className="slide-page relative flex flex-col p-24">
                    <div className="absolute inset-0 z-0 grid-bg"></div>

                    <div className="flex justify-between items-start mb-12">
                        <div>
                            <h3 className="font-display text-sanatorio-primary text-xl font-bold tracking-widest uppercase mb-2">Interface</h3>
                            <h2 className="font-display text-5xl font-bold text-slate-800">Dashboard Inteligente</h2>
                        </div>
                        <img src="/logosanatorio.png" className="h-10 opacity-50" />
                    </div>

                    <div className="flex-1 glass-panel rounded-3xl p-8 shadow-2xl overflow-hidden relative border border-slate-200">
                        <div className="flex gap-8 h-full">
                            <div className="w-64 bg-slate-50 rounded-2xl p-6 flex flex-col gap-4">
                                <div className="h-12 w-12 bg-sanatorio-primary rounded-xl mb-4"></div>
                                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                                <div className="h-4 bg-slate-200 rounded w-4/5 mt-8"></div>
                                <div className="h-4 bg-slate-200 rounded w-4/5"></div>
                            </div>
                            <div className="flex-1 flex flex-col gap-6">
                                <div className="flex gap-6">
                                    <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-32">
                                        <span className="text-sm font-bold text-slate-400 uppercase">Casos Abiertos</span>
                                        <div className="text-4xl font-bold text-sanatorio-primary mt-2">24</div>
                                    </div>
                                    <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-32">
                                        <span className="text-sm font-bold text-slate-400 uppercase">Resueltos</span>
                                        <div className="text-4xl font-bold text-sanatorio-secondary mt-2">156</div>
                                    </div>
                                    <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-32">
                                        <span className="text-sm font-bold text-slate-400 uppercase">Tiempo Promedio</span>
                                        <div className="text-4xl font-bold text-slate-700 mt-2">48h</div>
                                    </div>
                                </div>
                                <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="h-6 bg-slate-200 rounded w-1/4"></div>
                                        <div className="h-8 bg-sanatorio-primary rounded px-4"></div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-12 bg-slate-50 rounded-lg w-full"></div>
                                        <div className="h-12 bg-white border border-slate-100 rounded-lg w-full"></div>
                                        <div className="h-12 bg-white border border-slate-100 rounded-lg w-full"></div>
                                        <div className="h-12 bg-white border border-slate-100 rounded-lg w-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 z-20 h-[400px] w-auto flex items-end justify-end pointer-events-none">

                    </div>
                    <span className="slide-number">05</span>
                </div>

                {/* SLIDE 6: DORA */}
                <div className="slide-page relative flex items-center bg-[#F0F9FA]">
                    <div className="absolute inset-0 z-0 grid-bg opacity-10"></div>
                    <div className="absolute top-12 right-12 z-30">
                        <img src="/logosanatorio.png" className="h-12 opacity-60" />
                    </div>

                    <div className="grid grid-cols-2 w-full h-full">
                        <div className="flex items-center justify-center relative">
                            <div className="w-[700px] h-[700px] bg-sanatorio-secondary/10 rounded-full absolute blur-3xl"></div>

                        </div>
                        <div className="flex flex-col justify-center p-24 space-y-10">
                            <div>
                                <span className="bg-white/80 backdrop-blur px-4 py-2 rounded-full text-sanatorio-secondary font-bold text-sm uppercase tracking-wider shadow-sm border border-sanatorio-secondary/20">Asistente IA</span>
                            </div>
                            <h2 className="font-display text-8xl font-black text-sanatorio-primary">DORA</h2>
                            <h3 className="font-display text-4xl text-slate-600">Tu copiloto experto en calidad.</h3>
                            <p className="font-sans text-xl text-slate-500 leading-relaxed max-w-xl">
                                Dora no solo responde preguntas; analiza patrones, sugiere clasificaciones de incidentes y guía a los usuarios a través de protocolos complejos con lenguaje natural.
                            </p>
                            <div className="flex gap-4">
                                <div className="px-6 py-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 font-medium">✨ Análisis Predictivo</div>
                                <div className="px-6 py-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 font-medium">💬 Chat Interactivo</div>
                            </div>
                        </div>
                    </div>
                    <span className="slide-number">06</span>
                </div>

                {/* SLIDE 7: INCIDENT WORKFLOW */}
                <div className="slide-page relative flex flex-col p-24 justify-center">
                    <div className="absolute inset-0 z-0 grid-bg"></div>

                    <div className="absolute top-12 right-12 z-30">
                        <img src="/logosanatorio.png" className="h-12 opacity-60" />
                    </div>

                    <div className="absolute top-24 left-24 right-24 flex justify-between items-start">
                        <h3 className="font-display text-sanatorio-primary text-xl font-bold tracking-widest uppercase">Flujo de Trabajo</h3>
                        <h2 className="font-display text-5xl font-bold text-slate-800">Gestión de Incidentes</h2>
                    </div>

                    <div className="flex items-center justify-between w-full mt-24 px-12">
                        <div className="relative flex flex-col items-center group">
                            <div className="w-40 h-40 bg-white rounded-full shadow-lg border-4 border-sanatorio-primary flex items-center justify-center z-10 group-hover:scale-110 transition-transform">
                                <span className="font-display text-6xl font-bold text-sanatorio-primary">1</span>
                            </div>
                            <h4 className="mt-8 font-display text-3xl font-bold text-slate-700">Reporte</h4>
                            <p className="text-center text-slate-500 mt-2 max-w-xs text-xl">Notificación inmediata del evento adverso.</p>
                        </div>

                        <div className="h-2 bg-slate-200 flex-1 mx-4 rounded-full relative overflow-hidden">
                            <div className="absolute inset-0 bg-sanatorio-primary/20 w-full animate-pulse"></div>
                        </div>

                        <div className="relative flex flex-col items-center group">
                            <div className="w-40 h-40 bg-white rounded-full shadow-lg border-4 border-sanatorio-secondary flex items-center justify-center z-10 group-hover:scale-110 transition-transform">
                                <span className="font-display text-6xl font-bold text-sanatorio-secondary">2</span>
                            </div>
                            <h4 className="mt-8 font-display text-3xl font-bold text-slate-700">Análisis</h4>
                            <p className="text-center text-slate-500 mt-2 max-w-xs text-xl">Clasificación y evaluación del riesgo.</p>
                        </div>

                        <div className="h-2 bg-slate-200 flex-1 mx-4 rounded-full"></div>

                        <div className="relative flex flex-col items-center group">
                            <div className="w-40 h-40 bg-white rounded-full shadow-lg border-4 border-slate-300 flex items-center justify-center z-10 group-hover:scale-110 transition-transform">
                                <span className="font-display text-6xl font-bold text-slate-300">3</span>
                            </div>
                            <h4 className="mt-8 font-display text-3xl font-bold text-slate-700">Resolución</h4>
                            <p className="text-center text-slate-500 mt-2 max-w-xs text-xl">Implementación de mejoras y cierre.</p>
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 z-20 h-[400px] w-auto flex items-end justify-end pointer-events-none">

                    </div>
                    <span className="slide-number">07</span>
                </div>

                {/* SLIDE 8: RCA & ACTIONS */}
                <div className="slide-page relative flex flex-col p-24 bg-slate-900 overflow-hidden justify-center">
                    <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-sanatorio-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>

                    <div className="absolute top-12 right-12 z-30">
                        <img src="/logosanatorio.png" className="h-12 opacity-80 brightness-0 invert" />
                    </div>
                    <div className="absolute bottom-0 right-0 z-20 h-[450px] w-auto flex items-end justify-end pointer-events-none">

                    </div>

                    <div className="relative z-10 grid grid-cols-2 gap-20 items-center h-full">
                        <div className="space-y-8">
                            <h2 className="font-display text-6xl font-bold text-white leading-tight">Causa Raíz &<br /><span className="text-sanatorio-secondary">Acción Correctiva</span></h2>
                            <p className="font-sans text-2xl text-slate-300 leading-relaxed font-light">
                                El sistema fuerza un análisis profundo. No basta con registrar el problema; exigimos entender el "por qué" y documentar el plan de acción concreto para evitar la recurrencia.
                            </p>
                            <ul className="space-y-6 mt-8">
                                <li className="flex items-center text-xl text-white">
                                    <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mr-4 text-xs font-bold text-white">✓</span>
                                    Validación de Planes de Acción
                                </li>
                                <li className="flex items-center text-xl text-white">
                                    <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mr-4 text-xs font-bold text-white">✓</span>
                                    Seguimiento de Eficacia
                                </li>
                                <li className="flex items-center text-xl text-white">
                                    <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mr-4 text-xs font-bold text-white">✓</span>
                                    Evidencia Documental Obligatoria
                                </li>
                            </ul>
                        </div>
                        <div className="glass-panel bg-white/10 border-white/10 p-10 rounded-3xl">
                            <div className="flex flex-col gap-6">
                                <div className="text-white font-bold text-xl mb-4">Eficacia de las Medidas</div>
                                <div className="flex items-end gap-4 h-64 border-b border-white/20 pb-4">
                                    <div className="flex-1 bg-sanatorio-secondary/30 rounded-t-lg h-[40%] relative group cursor-pointer hover:bg-sanatorio-secondary/50 transition-all">
                                        <div className="absolute bottom-full mb-2 text-white text-center w-full opacity-0 group-hover:opacity-100">Q1</div>
                                    </div>
                                    <div className="flex-1 bg-sanatorio-secondary/50 rounded-t-lg h-[60%] relative group cursor-pointer hover:bg-sanatorio-secondary/70 transition-all"></div>
                                    <div className="flex-1 bg-sanatorio-secondary/70 rounded-t-lg h-[75%] relative group cursor-pointer hover:bg-sanatorio-secondary/90 transition-all"></div>
                                    <div className="flex-1 bg-sanatorio-secondary rounded-t-lg h-[90%] relative group cursor-pointer hover:bg-white transition-all">
                                        <div className="absolute top-4 w-full text-center text-white font-bold text-xs">ACTUAL</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <span className="slide-number">08</span>
                </div>

                {/* SLIDE 9: ANALYTICS */}
                <div className="slide-page relative flex flex-col p-24 justify-center">
                    <div className="absolute inset-0 z-0 grid-bg"></div>
                    <div className="absolute top-12 right-12 z-30">
                        <img src="/logosanatorio.png" className="h-12 opacity-60" />
                    </div>
                    <div className="absolute bottom-0 right-0 z-0 h-[400px] w-auto flex items-end justify-end pointer-events-none opacity-20">

                    </div>

                    <div className="text-center mb-16">
                        <h2 className="font-display text-5xl font-bold text-slate-800">Cultura de Datos</h2>
                        <p className="text-xl text-slate-500 mt-4">Transformando registros en inteligencia institucional.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-8">
                        <div className="glass-card p-10 rounded-3xl text-center hover:-translate-y-2 transition-transform">
                            <div className="text-6xl font-display font-black text-sanatorio-primary mb-4">40%</div>
                            <div className="h-2 w-20 bg-slate-200 mx-auto rounded-full mb-4"></div>
                            <h4 className="text-xl font-bold text-slate-700">Reducción en Tiempos de Respuesta</h4>
                        </div>
                        <div className="glass-card p-10 rounded-3xl text-center hover:-translate-y-2 transition-transform">
                            <div className="text-6xl font-display font-black text-sanatorio-secondary mb-4">100%</div>
                            <div className="h-2 w-20 bg-slate-200 mx-auto rounded-full mb-4"></div>
                            <h4 className="text-xl font-bold text-slate-700">Trazabilidad Digital de Casos</h4>
                        </div>
                        <div className="glass-card p-10 rounded-3xl text-center hover:-translate-y-2 transition-transform">
                            <div className="text-6xl font-display font-black text-slate-800 mb-4">24/7</div>
                            <div className="h-2 w-20 bg-slate-200 mx-auto rounded-full mb-4"></div>
                            <h4 className="text-xl font-bold text-slate-700">Disponibilidad del Sistema</h4>
                        </div>
                    </div>
                    <span className="slide-number">09</span>
                </div>

                {/* SLIDE 10: FUTURE */}
                <div className="slide-page relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-sanatorio-primary"></div>
                    <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '50px 50px' }}></div>

                    <div className="absolute top-12 right-12 z-30">
                        <img src="/logosanatorio.png" className="h-12 brightness-0 invert opacity-80" />
                    </div>
                    <div className="absolute bottom-0 right-0 z-20 h-[500px] w-auto flex items-end justify-end pointer-events-none">

                    </div>

                    <div className="relative z-10 text-center text-white space-y-8 p-12 max-w-4xl">
                        <div className="inline-block border border-white/30 bg-white/10 backdrop-blur px-6 py-2 rounded-full font-mono text-sm tracking-widest mb-4">ROADMAP 2026</div>
                        <h2 className="font-display text-7xl font-bold leading-tight">El estándar de oro en<br />salud digital.</h2>
                        <p className="font-sans text-2xl text-white/80 font-light">
                            Sanatorio Argentino lidera el camino hacia un futuro donde la tecnología y el cuidado humano son indisolubles.
                        </p>
                        <div className="pt-12">
                            <h3 className="font-display text-4xl font-bold">Gracias.</h3>
                            <div className="mt-8 flex justify-center gap-8 text-white/60">
                                <span>www.sanatorioargentino.com.ar</span>
                                <span>•</span>
                                <span>Departamento de Calidad</span>
                            </div>
                        </div>
                    </div>
                    <span className="slide-number">10</span>
                </div>

            </div>
        </div>
    );
};

export default Presentation;
