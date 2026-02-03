import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { ShieldCheck, UserCog, MessageSquare, Bell, CheckCircle2, Info, Lock, Smartphone, BrainCircuit, FileCheck } from 'lucide-react';

const WorkflowGraph = () => {
    const steps = [
        {
            icon: <MessageSquare className="w-5 h-5" />,
            title: "Reporte",
            desc: "Usuario envía incidente (+Foto)",
            color: "bg-blue-100 text-blue-600",
            position: "top-0 left-1/2 -translate-x-1/2" // 12
        },
        {
            icon: <BrainCircuit className="w-5 h-5" />,
            title: "Análisis IA",
            desc: "Clasificación automática Riesgo",
            color: "bg-purple-100 text-purple-600",
            position: "top-1/4 right-[5%]" // 2
        },
        {
            icon: <UserCog className="w-5 h-5" />,
            title: "Gestión",
            desc: "Calidad deriva al Responsable",
            color: "bg-orange-100 text-orange-600",
            position: "bottom-1/4 right-[5%]" // 4 
        },
        {
            icon: <Smartphone className="w-5 h-5" />,
            title: "Notificación",
            desc: "Responsable recibe link WhatsApp",
            color: "bg-green-100 text-green-600",
            position: "bottom-0 left-1/2 -translate-x-1/2" // 6
        },
        {
            icon: <FileCheck className="w-5 h-5" />,
            title: "Resolución",
            desc: "Carga de solución y evidencias",
            color: "bg-teal-100 text-teal-600",
            position: "bottom-1/4 left-[5%]" // 8
        },
        {
            icon: <Bell className="w-5 h-5" />,
            title: "Feedback",
            desc: "Reportante recibe aviso de cierre",
            color: "bg-pink-100 text-pink-600",
            position: "top-1/4 left-[5%]" // 10
        }
    ];

    return (
        <div className="relative w-full max-w-lg mx-auto h-[350px] md:h-[400px] my-12 hidden md:block">
            {/* Center Hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full shadow-xl border-4 border-sanatorio-primary/10 flex flex-col items-center justify-center text-center z-10">
                <ShieldCheck className="w-10 h-10 text-sanatorio-primary mb-1" />
                <p className="text-[10px] font-black uppercase text-sanatorio-primary tracking-widest">Ciclo de<br />Calidad</p>
            </div>

            {/* Connecting Circle Line */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full border-2 border-dashed border-gray-200 -z-0 animate-spin-slow"></div>

            {/* Steps Nodes */}
            {steps.map((step, idx) => (
                <div key={idx} className={`absolute ${step.position} w-40 flex flex-col items-center text-center`}>
                    <div className={`w-12 h-12 rounded-2xl ${step.color} flex items-center justify-center shadow-lg mb-2 relative z-10 transition-transform hover:scale-110`}>
                        {step.icon}
                    </div>
                    <h4 className="font-bold text-gray-800 text-xs uppercase">{step.title}</h4>
                    <p className="text-[10px] text-gray-500 leading-tight">{step.desc}</p>
                </div>
            ))}
        </div>
    );
};

export const HelpGuide = () => {
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setIsAdmin(!!session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAdmin(!!session);
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <div className="space-y-12 pb-12 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="text-center space-y-4">
                <h1 className="text-3xl md:text-5xl font-bold text-sanatorio-primary tracking-tight">Centro de Ayuda y Guías</h1>
                <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
                    Conoce cómo funciona el ecosistema de mejora continua, desde el reporte inicial hasta la resolución confirmada.
                </p>
            </div>

            {/* Visual Workflow Graph */}
            <WorkflowGraph />

            <div className={`grid gap-8 ${isAdmin ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto grid-cols-1'}`}>

                {/* 1. SECCIÓN PERSONAL (REPORTEROS) */}
                <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden flex flex-col">
                    <div className="bg-gradient-to-br from-sanatorio-secondary/10 to-transparent p-8 border-b border-gray-50">
                        <div className="w-14 h-14 bg-sanatorio-secondary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-sanatorio-secondary/20">
                            <MessageSquare className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Guía para el Personal</h2>
                        <p className="text-gray-500">Todo lo que necesitas saber para reportar incidentes o sugerencias.</p>
                    </div>

                    <div className="p-8 space-y-8 flex-grow">
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-sanatorio-primary rounded-full flex items-center justify-center font-bold">1</div>
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-1">Carga de Reporte</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Completa el formulario indicando sector y detalle. Si dejas tu teléfono, recibirás notificaciones.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-sanatorio-primary rounded-full flex items-center justify-center font-bold">2</div>
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-1">Análisis Automático</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Nuestra IA clasifica la urgencia. Si es <span className="text-red-600 font-bold">Crítica</span>, avisa a los directores al instante.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-sanatorio-primary rounded-full flex items-center justify-center font-bold">3</div>
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-1">Ciclo de Resolución</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Calidad deriva el caso al responsable de área. Cuando este lo soluciona, recibirás un mensaje de <strong>"Caso Resuelto"</strong> en tu WhatsApp con la confirmación.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-sanatorio-neutral rounded-2xl p-5 border border-gray-100 flex items-start gap-4 mt-4">
                            <ShieldCheck className="w-6 h-6 text-sanatorio-secondary shrink-0" />
                            <p className="text-xs text-gray-500 leading-relaxed italic">
                                Tu participación activa cierra el círculo de mejora. Gracias por comprometerte.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. SECCIÓN ADMIN (GESTIÓN) - Solo visible para admins */}
                {isAdmin ? (
                    <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-500">
                        <div className="bg-gradient-to-br from-sanatorio-primary/5 to-transparent p-8 border-b border-gray-50">
                            <div className="w-14 h-14 bg-sanatorio-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-sanatorio-primary/20">
                                <UserCog className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Guía Administrativa</h2>
                            <p className="text-gray-500">Flujo de trabajo para el Comité de Calidad.</p>
                        </div>

                        <div className="p-8 space-y-8 flex-grow">
                            <div className="space-y-6">
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-start gap-3">
                                    <Smartphone className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-green-800 uppercase mb-1">Nueva Funcionalidad: Derivación</h4>
                                        <p className="text-xs text-green-700 leading-relaxed">
                                            Ahora puedes enviar solicitudes de gestión directamente por WhatsApp desde el tablero. El responsable recibirá un link único para cargar la solución y evidencias.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        Pasos de Gestión
                                    </h3>
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-2 text-sm text-gray-600">
                                            <div className="w-1.5 h-1.5 bg-sanatorio-primary rounded-full mt-1.5 shrink-0" />
                                            <span><strong>Revisar:</strong> Evalúa la prioridad asignada por IA.</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-gray-600">
                                            <div className="w-1.5 h-1.5 bg-sanatorio-primary rounded-full mt-1.5 shrink-0" />
                                            <span><strong>Derivar:</strong> Usa el botón <span className="inline-flex items-center gap-1 bg-sanatorio-primary text-white text-[10px] px-1.5 py-0.5 rounded">Solicitar Gestión</span> para enviar el caso al encargado.</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-gray-600">
                                            <div className="w-1.5 h-1.5 bg-sanatorio-primary rounded-full mt-1.5 shrink-0" />
                                            <span><strong>Monitorear:</strong> El estado cambiará a "En Gestión" y verás el tilde verde cuando el WhatsApp se entregue.</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-gray-600">
                                            <div className="w-1.5 h-1.5 bg-sanatorio-primary rounded-full mt-1.5 shrink-0" />
                                            <span><strong>Cierre Automático:</strong> Cuando el responsable responda, el caso pasa a "Resuelto" y se notifica al usuario original.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 flex items-start gap-4 mt-auto">
                                <Info className="w-6 h-6 text-sanatorio-primary shrink-0" />
                                <p className="text-xs text-blue-800 leading-relaxed font-medium italic">
                                    El sistema ahora cierra el ciclo automáticamente: Reporte &gt; Gestión &gt; Solución &gt; Feedback al Usuario.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                            <Lock className="w-8 h-8 text-gray-300" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-gray-400">Contenido Restringido</h3>
                            <p className="text-sm text-gray-400 max-w-xs mx-auto">
                                La Guía Administrativa solo es visible para personal autorizado del comité de Calidad.
                            </p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
