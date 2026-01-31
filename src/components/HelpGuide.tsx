import { ShieldCheck, UserCog, Clock, MessageSquare, BarChart3, Bell, CheckCircle2, Info } from 'lucide-react';

export const HelpGuide = () => {
    return (
        <div className="space-y-12 pb-12 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="text-center space-y-4">
                <h1 className="text-3xl md:text-5xl font-bold text-sanatorio-primary tracking-tight">Centro de Ayuda y Guías</h1>
                <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
                    Conoce cómo funciona el sistema de Gestión de Calidad y cómo tu participación impulsa la mejora continua en el Sanatorio Argentino.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">

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
                                        Completa el formulario indicando sector y detalle. Puedes elegir el **Modo Anónimo** para proteger tu identidad o el **Modo Identificado** para recibir alertas personalizadas.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-sanatorio-primary rounded-full flex items-center justify-center font-bold">2</div>
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-1">Respuesta Inmediata</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Si proporcionas tu número, el sistema te enviará un **WhatsApp automático** con tu ID de seguimiento (ej: SA-2026-QAD2) apenas guardes el reporte.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-sanatorio-primary rounded-full flex items-center justify-center font-bold">3</div>
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-1">Triage Inteligente (IA)</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Una Inteligencia Artificial analiza tu texto para categorizar la gravedad:
                                        <span className="block mt-2 font-medium">✨ <span className="text-red-500">Rojo:</span> Crítico / Acción inmediata (Alerta a directores).</span>
                                        <span className="block font-medium">✨ <span className="text-yellow-600">Amarillo:</span> Urgente / Seguimiento semanal.</span>
                                        <span className="block font-medium">✨ <span className="text-green-600">Verde:</span> Mejora / Rutina.</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-sanatorio-primary rounded-full flex items-center justify-center font-bold">4</div>
                                <div>
                                    <h3 className="font-bold text-gray-800 mb-1">Tiempos de Respuesta</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Buscamos la máxima agilidad. Los tiempos de respuesta se miden en **horas reales**, permitiendo al equipo de Calidad gestionar los cuellos de botella de forma eficiente.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-sanatorio-neutral rounded-2xl p-5 border border-gray-100 flex items-start gap-4 mt-4">
                            <ShieldCheck className="w-6 h-6 text-sanatorio-secondary shrink-0" />
                            <p className="text-xs text-gray-500 leading-relaxed italic">
                                Tu reporte es confidencial y solo accesible por el comité de Calidad. El objetivo no es punitivo, sino preventivo para garantizar la seguridad del paciente.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. SECCIÓN ADMIN (GESTIÓN) */}
                <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden flex flex-col">
                    <div className="bg-gradient-to-br from-sanatorio-primary/5 to-transparent p-8 border-b border-gray-50">
                        <div className="w-14 h-14 bg-sanatorio-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-sanatorio-primary/20">
                            <UserCog className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Guía Administrativa</h2>
                        <p className="text-gray-500">Panel de control para Claudia y Gabriela (Comité de Calidad).</p>
                    </div>

                    <div className="p-8 space-y-8 flex-grow">
                        <div className="space-y-6">
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                                <Bell className="w-5 h-5 text-red-600 shrink-0 mt-0.5 animate-bounce" />
                                <div>
                                    <h4 className="text-sm font-bold text-red-800 uppercase mb-1">Alertas en Tiempo Real</h4>
                                    <p className="text-xs text-red-700 leading-relaxed">
                                        Los incidentes marcados como **Rojo** disparan una notificación de WhatsApp inmediata al responsable indicando resumen y riesgo potencial.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <BarChart3 className="w-5 h-5 text-sanatorio-primary mb-3" />
                                    <h4 className="font-bold text-gray-800 text-sm mb-1">Métricas Clave</h4>
                                    <p className="text-xs text-gray-500">Sigue el volumen de reportes por sector y la distribución histórica de urgencias.</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <Clock className="w-5 h-5 text-sanatorio-primary mb-3" />
                                    <h4 className="font-bold text-gray-800 text-sm mb-1">Eficiencia</h4>
                                    <p className="text-xs text-gray-500">Promedio de tiempo de respuesta medido en horas para auditorías de calidad.</p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    Gestión de Casos
                                </h3>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-2 text-sm text-gray-600">
                                        <div className="w-1.5 h-1.5 bg-sanatorio-primary rounded-full mt-1.5 shrink-0" />
                                        <span><strong>Filtrado:</strong> Utiliza los filtros avanzados por sector y prioridad para priorizar tareas.</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-gray-600">
                                        <div className="w-1.5 h-1.5 bg-sanatorio-primary rounded-full mt-1.5 shrink-0" />
                                        <span><strong>Resolución:</strong> Al marcar como "Realizado", se requiere una nota de cierre que queda guardada para el historial.</span>
                                    </li>
                                    <li className="flex items-start gap-2 text-sm text-gray-600">
                                        <div className="w-1.5 h-1.5 bg-sanatorio-primary rounded-full mt-1.5 shrink-0" />
                                        <span><strong>Auditoría:</strong> Puedes consultar en cualquier momento los reportes resueltos y las soluciones sugeridas por la IA.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 flex items-start gap-4 mt-auto">
                            <Info className="w-6 h-6 text-sanatorio-primary shrink-0" />
                            <p className="text-xs text-blue-800 leading-relaxed font-medium italic">
                                Recuerda que los reportes identificados permiten una comunicación bidireccional vía WhatsApp para solicitar más detalles si fuera necesario.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
