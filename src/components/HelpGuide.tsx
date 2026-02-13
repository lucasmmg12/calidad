import { ShieldCheck, UserCog, MessageSquare, Bell, CheckCircle2, Info, Lock, Smartphone, BrainCircuit, FileCheck, Eye, BarChart3, Filter, Clock, AlertTriangle, TrendingUp, Zap, ClipboardList, Layers, ArrowRight, Send, Sparkles, PieChart, Target, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ──────────────────────────────────────────
   WORKFLOW GRAPH (shared across all views)
   ────────────────────────────────────────── */
const WorkflowGraph = () => {
    const steps = [
        { icon: <MessageSquare className="w-5 h-5" />, title: "Reporte", desc: "Usuario envía incidente (+Foto)", color: "bg-blue-100 text-blue-600", position: "top-0 left-1/2 -translate-x-1/2" },
        { icon: <BrainCircuit className="w-5 h-5" />, title: "Análisis IA", desc: "Clasificación automática Riesgo", color: "bg-purple-100 text-purple-600", position: "top-1/4 right-[5%]" },
        { icon: <UserCog className="w-5 h-5" />, title: "Gestión", desc: "Calidad deriva al Responsable", color: "bg-orange-100 text-orange-600", position: "bottom-1/4 right-[5%]" },
        { icon: <Smartphone className="w-5 h-5" />, title: "Notificación", desc: "Responsable recibe link WhatsApp", color: "bg-green-100 text-green-600", position: "bottom-0 left-1/2 -translate-x-1/2" },
        { icon: <FileCheck className="w-5 h-5" />, title: "Resolución", desc: "Carga de solución y evidencias", color: "bg-teal-100 text-teal-600", position: "bottom-1/4 left-[5%]" },
        { icon: <Bell className="w-5 h-5" />, title: "Feedback", desc: "Reportante recibe aviso de cierre", color: "bg-pink-100 text-pink-600", position: "top-1/4 left-[5%]" }
    ];

    return (
        <div className="relative w-full max-w-lg mx-auto h-[350px] md:h-[400px] my-12 hidden md:block">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full shadow-xl border-4 border-sanatorio-primary/10 flex flex-col items-center justify-center text-center z-10">
                <ShieldCheck className="w-10 h-10 text-sanatorio-primary mb-1" />
                <p className="text-[10px] font-black uppercase text-sanatorio-primary tracking-widest">Ciclo de<br />Calidad</p>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full border-2 border-dashed border-gray-200 -z-0 animate-spin-slow"></div>
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

/* ──────────────────────────────────────────
   REUSABLE STEP CARD
   ────────────────────────────────────────── */
const StepItem = ({ number, title, children }: { number: number; title: string; children: React.ReactNode }) => (
    <div className="flex gap-4">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-sanatorio-primary rounded-full flex items-center justify-center font-bold text-sm">{number}</div>
        <div>
            <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
            <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
        </div>
    </div>
);

/* ──────────────────────────────────────────
   FEATURE CARD
   ────────────────────────────────────────── */
const FeatureCard = ({ icon, title, description, accent }: { icon: React.ReactNode; title: string; description: string; accent: string }) => (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow`}>
        <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center mb-3`}>
            {icon}
        </div>
        <h4 className="font-bold text-gray-800 text-sm mb-1">{title}</h4>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
);

/* ══════════════════════════════════════════
   1. GUÍA PÚBLICA (sin login)
   ══════════════════════════════════════════ */
const PublicGuide = () => (
    <div className="max-w-3xl mx-auto space-y-8">
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-br from-sanatorio-secondary/10 to-transparent p-8 border-b border-gray-50">
                <div className="w-14 h-14 bg-sanatorio-secondary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-sanatorio-secondary/20">
                    <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Guía para el Personal</h2>
                <p className="text-gray-500">Todo lo que necesitas saber para reportar incidentes o sugerencias.</p>
            </div>

            <div className="p-8 space-y-8">
                <div className="space-y-6">
                    <StepItem number={1} title="Carga de Reporte">
                        <p>Completa el formulario indicando sector y detalle. Si dejas tu teléfono, recibirás notificaciones.</p>
                    </StepItem>
                    <StepItem number={2} title="Análisis Automático">
                        <p>Nuestra IA clasifica la urgencia. Si es <span className="text-red-600 font-bold">Crítica</span>, avisa a los directores al instante.</p>
                    </StepItem>
                    <StepItem number={3} title="Ciclo de Resolución">
                        <p>Calidad deriva el caso al responsable de área. Cuando este lo soluciona, recibirás un mensaje de <strong>"Caso Resuelto"</strong> en tu WhatsApp con la confirmación.</p>
                    </StepItem>
                </div>

                <div className="bg-sanatorio-neutral rounded-2xl p-5 border border-gray-100 flex items-start gap-4">
                    <ShieldCheck className="w-6 h-6 text-sanatorio-secondary shrink-0" />
                    <p className="text-xs text-gray-500 leading-relaxed italic">
                        Tu participación activa cierra el círculo de mejora. Gracias por comprometerte.
                    </p>
                </div>
            </div>
        </div>

        {/* Panel bloqueado para no-logueados */}
        <div className="bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                <Lock className="w-8 h-8 text-gray-300" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-400">Contenido Restringido</h3>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">
                    Las guías específicas por rol solo son visibles para personal autorizado con sesión activa.
                </p>
            </div>
        </div>
    </div>
);

/* ══════════════════════════════════════════
   2. GUÍA ADMIN
   ══════════════════════════════════════════ */
const AdminGuide = () => (
    <div className="space-y-8">
        {/* Grid de cards: 2 columnas */}
        <div className="grid lg:grid-cols-2 gap-8">

            {/* Card 1: Guía Personal (breve) */}
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden flex flex-col">
                <div className="bg-gradient-to-br from-sanatorio-secondary/10 to-transparent p-8 border-b border-gray-50">
                    <div className="w-14 h-14 bg-sanatorio-secondary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-sanatorio-secondary/20">
                        <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Guía para el Personal</h2>
                    <p className="text-gray-500">Ciclo de reporte: desde la carga hasta la resolución.</p>
                </div>
                <div className="p-8 space-y-6 flex-grow">
                    <StepItem number={1} title="Carga de Reporte">
                        <p>El usuario completa el formulario, la IA clasifica urgencia y sector.</p>
                    </StepItem>
                    <StepItem number={2} title="Análisis y Derivación">
                        <p>Tu equipo revisa, clasifica y deriva al responsable vía WhatsApp.</p>
                    </StepItem>
                    <StepItem number={3} title="Resolución y Cierre">
                        <p>Cuando el responsable responde, el sistema lo envía a <strong>Validación de Calidad</strong> para su aprobación o rechazo.</p>
                    </StepItem>
                </div>
            </div>

            {/* Card 2: Panel Administrativo */}
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-500">
                <div className="bg-gradient-to-br from-purple-500/5 to-transparent p-8 border-b border-gray-50">
                    <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                        <UserCog className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Panel Administrativo</h2>
                    <p className="text-gray-500">Control total del ciclo de calidad.</p>
                </div>
                <div className="p-8 space-y-6 flex-grow">
                    {/* WhatsApp Feature */}
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-start gap-3">
                        <Smartphone className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-green-800 uppercase mb-1">Derivación por WhatsApp</h4>
                            <p className="text-xs text-green-700 leading-relaxed">
                                Envía solicitudes de gestión directamente con un link único. El responsable carga solución desde su celular.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            Acciones Disponibles
                        </h3>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-2 text-sm text-gray-600">
                                <div className="w-1.5 h-1.5 bg-sanatorio-primary rounded-full mt-1.5 shrink-0" />
                                <span><strong>Derivar:</strong> Envía el caso al responsable por WhatsApp con tipo de gestión (Simple, Desvío, Evento Adverso).</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-gray-600">
                                <div className="w-1.5 h-1.5 bg-sanatorio-primary rounded-full mt-1.5 shrink-0" />
                                <span><strong>Clasificar:</strong> Asigná prioridad (semáforo), origen y clasificación operativa.</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-gray-600">
                                <div className="w-1.5 h-1.5 bg-sanatorio-primary rounded-full mt-1.5 shrink-0" />
                                <span><strong>Validar:</strong> Aprobá o devolvé resoluciones desde la pantalla de Validación de Calidad.</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-gray-600">
                                <div className="w-1.5 h-1.5 bg-sanatorio-primary rounded-full mt-1.5 shrink-0" />
                                <span><strong>Apelar:</strong> Reabrí casos cerrados que necesiten corrección adicional.</span>
                            </li>
                            <li className="flex items-start gap-2 text-sm text-gray-600">
                                <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 shrink-0" />
                                <span><strong>Descartar:</strong> Archivá reportes que no ameriten gestión.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 flex items-start gap-4 mt-auto">
                        <Info className="w-6 h-6 text-sanatorio-primary shrink-0" />
                        <p className="text-xs text-blue-800 leading-relaxed font-medium italic">
                            El sistema cierra el ciclo automáticamente: Reporte → Gestión → Solución → Validación → Feedback.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Funcionalidades clave del admin */}
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-purple-500" />
                Funcionalidades Exclusivas del Administrador
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FeatureCard
                    icon={<Filter className="w-5 h-5 text-blue-600" />}
                    title="Filtros Avanzados"
                    description="Filtrá reportes por estado, sector y prioridad. Las pestañas muestran contadores en tiempo real."
                    accent="bg-blue-100"
                />
                <FeatureCard
                    icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
                    title="Alertas de Tiempo de Respuesta"
                    description="El sistema te avisa con bandas rojas cuando un caso supera los plazos establecidos."
                    accent="bg-amber-100"
                />
                <FeatureCard
                    icon={<Layers className="w-5 h-5 text-purple-600" />}
                    title="Historial de Rechazos"
                    description="Cada devolución se registra con timestamp, motivo y datos anteriores para auditoría completa."
                    accent="bg-purple-100"
                />
                <FeatureCard
                    icon={<ClipboardList className="w-5 h-5 text-teal-600" />}
                    title="Gestión de Usuarios"
                    description="Crear, editar roles y asignar sectores a responsables desde /admin/users."
                    accent="bg-teal-100"
                />
            </div>
        </div>
    </div>
);

/* ══════════════════════════════════════════
   3. GUÍA RESPONSABLE
   ══════════════════════════════════════════ */
const ResponsableGuide = () => (
    <div className="space-y-8">
        <div className="grid lg:grid-cols-2 gap-8">

            {/* Card 1: ¿Qué estás viendo? */}
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden flex flex-col">
                <div className="bg-gradient-to-br from-green-500/10 to-transparent p-8 border-b border-gray-50">
                    <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
                        <Eye className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">¿Qué estás viendo?</h2>
                    <p className="text-gray-500">Tu dashboard muestra los casos relacionados con tus sectores asignados.</p>
                </div>
                <div className="p-8 space-y-6 flex-grow">
                    <StepItem number={1} title="Tus Casos">
                        <p>Ves los reportes que afectan a los sectores que tenés asignados. Son filtrados automáticamente para vos.</p>
                    </StepItem>
                    <StepItem number={2} title="Vista de Solo Lectura">
                        <p>Tu acceso es de <strong>consulta</strong>: podés ver toda la información, historial y estado de cada caso, pero las acciones de gestión están reservadas al equipo de Calidad.</p>
                    </StepItem>
                    <StepItem number={3} title="Seguimiento en Tiempo Real">
                        <p>Los estados se actualizan automáticamente. Verás cuando un caso pasa de "Pendiente" a "En Gestión" o "Resuelto".</p>
                    </StepItem>

                    <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 flex items-start gap-4 mt-auto">
                        <Info className="w-6 h-6 text-blue-600 shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed font-medium italic">
                            Si recibiste un link por WhatsApp, podés resolver el caso directamente desde ahí sin necesidad de iniciar sesión.
                        </p>
                    </div>
                </div>
            </div>

            {/* Card 2: Significado de los estados */}
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-500">
                <div className="bg-gradient-to-br from-orange-500/5 to-transparent p-8 border-b border-gray-50">
                    <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
                        <Layers className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">¿Qué significa cada estado?</h2>
                    <p className="text-gray-500">Guía rápida de los estados que verás en la tabla.</p>
                </div>
                <div className="p-8 space-y-4 flex-grow">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></span>
                        <div>
                            <p className="font-bold text-sm text-gray-800">Nuevo</p>
                            <p className="text-xs text-gray-500">El reporte acaba de ingresar y está pendiente de revisión por Calidad.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
                        <div>
                            <p className="font-bold text-sm text-gray-800">En Gestión</p>
                            <p className="text-xs text-gray-500">Fue derivado al responsable. Se espera la carga de la solución.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                        <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0"></span>
                        <div>
                            <p className="font-bold text-sm text-gray-800">Validación Calidad</p>
                            <p className="text-xs text-gray-500">El responsable respondió. Calidad revisa si la resolución es satisfactoria.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                        <span className="w-3 h-3 rounded-full bg-green-500 shrink-0"></span>
                        <div>
                            <p className="font-bold text-sm text-gray-800">Resuelto</p>
                            <p className="text-xs text-gray-500">Calidad aprobó la solución. El caso está cerrado y el reportante fue notificado.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                        <span className="w-3 h-3 rounded-full bg-red-500 shrink-0"></span>
                        <div>
                            <p className="font-bold text-sm text-gray-800">Rechazado / Devuelto</p>
                            <p className="text-xs text-gray-500">La resolución fue insuficiente. Se requiere una nueva respuesta.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Insights disponibles */}
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-green-500" />
                Insights Disponibles para Tu Perfil
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FeatureCard
                    icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
                    title="Métricas de tus Sectores"
                    description="Accedé a /metrics para ver tendencias, volumen de reportes y tiempo promedio de resolución de tus áreas."
                    accent="bg-blue-100"
                />
                <FeatureCard
                    icon={<Clock className="w-5 h-5 text-amber-600" />}
                    title="Tiempos de Respuesta"
                    description="Observá cuánto tarda en resolverse cada caso y compará contra los tiempos de respuesta establecidos."
                    accent="bg-amber-100"
                />
                <FeatureCard
                    icon={<Eye className="w-5 h-5 text-green-600" />}
                    title="Detalle Completo"
                    description="Hacé clic en cualquier fila para abrir el detalle: descripción IA, evidencia, historial de actividad y resolución."
                    accent="bg-green-100"
                />
            </div>
        </div>

        {/* Cómo resolver un caso */}
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <Send className="w-6 h-6 text-sanatorio-primary" />
                ¿Cómo resolver un caso que te derivaron?
            </h3>
            <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-green-50 to-transparent rounded-xl border border-green-100">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                        <Smartphone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 mb-1">1. Recibís un WhatsApp</h4>
                        <p className="text-sm text-gray-600">Calidad te envía un mensaje con un <strong>link único</strong> para cargar la resolución del caso.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-xl border border-blue-100">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                        <ClipboardList className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 mb-1">2. Completás el formulario</h4>
                        <p className="text-sm text-gray-600">Cargá la acción inmediata, causa raíz (si aplica) y plan correctivo. Todo desde el celular.</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-transparent rounded-xl border border-purple-100">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 mb-1">3. Calidad valida tu respuesta</h4>
                        <p className="text-sm text-gray-600">Si es aprobada, el caso se cierra. Si necesita mejoras, te lo devuelven con indicaciones.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

/* ══════════════════════════════════════════
   4. GUÍA DIRECTIVO
   ══════════════════════════════════════════ */
const DirectivoGuide = () => (
    <div className="space-y-8">
        <div className="grid lg:grid-cols-2 gap-8">

            {/* Card 1: Tu rol en el sistema */}
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden flex flex-col">
                <div className="bg-gradient-to-br from-blue-500/10 to-transparent p-8 border-b border-gray-50">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                        <Target className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Tu Rol como Directivo</h2>
                    <p className="text-gray-500">Acceso ejecutivo a los indicadores de calidad del Sanatorio.</p>
                </div>
                <div className="p-8 space-y-6 flex-grow">
                    <StepItem number={1} title="Vista Ejecutiva">
                        <p>Tu perfil tiene acceso a las <strong>métricas y KPIs</strong> del sistema sin intervenir en la operación diaria. Esto te permite monitorear sin interferir.</p>
                    </StepItem>
                    <StepItem number={2} title="¿Qué NO ves?">
                        <p>No tenés acceso al tablero de casos operativos (Dashboard). Tu foco está en los resultados e indicadores estratégicos.</p>
                    </StepItem>
                    <StepItem number={3} title="¿Cómo acceder a las Métricas?">
                        <p>Desde la barra de navegación, hacé clic en <span className="inline-flex items-center gap-1 bg-sanatorio-primary/10 text-sanatorio-primary text-xs px-2 py-0.5 rounded-md font-bold"><BarChart3 className="w-3 h-3" /> Métricas</span> para acceder al panel.</p>
                    </StepItem>

                    <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 flex items-start gap-4 mt-auto">
                        <Info className="w-6 h-6 text-blue-600 shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed font-medium italic">
                            Tus datos se actualizan en tiempo real. No necesitás solicitar reportes manuales: el sistema los genera automáticamente.
                        </p>
                    </div>
                </div>
            </div>

            {/* Card 2: Insights disponibles */}
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden flex flex-col animate-in slide-in-from-right-8 duration-500">
                <div className="bg-gradient-to-br from-indigo-500/5 to-transparent p-8 border-b border-gray-50">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                        <PieChart className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">¿Qué insights podés obtener?</h2>
                    <p className="text-gray-500">Indicadores clave para la toma de decisiones.</p>
                </div>
                <div className="p-8 space-y-4 flex-grow">
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-transparent rounded-xl border border-blue-100">
                        <TrendingUp className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm text-gray-800">Tendencias Temporales</p>
                            <p className="text-xs text-gray-500">Evolución de reportes por semana/mes. Detectá picos y patrones recurrentes.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-transparent rounded-xl border border-green-100">
                        <Activity className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm text-gray-800">Performance por Sector</p>
                            <p className="text-xs text-gray-500">Qué sectores generan más incidentes y cuáles resuelven más rápido.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50 to-transparent rounded-xl border border-amber-100">
                        <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm text-gray-800">Tiempos de Resolución</p>
                            <p className="text-xs text-gray-500">Promedio de días para cerrar un caso. Comparación contra los tiempos de respuesta establecidos.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-red-50 to-transparent rounded-xl border border-red-100">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm text-gray-800">Alertas Críticas</p>
                            <p className="text-xs text-gray-500">Casos de urgencia roja o eventos adversos que requieren atención directiva.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-transparent rounded-xl border border-purple-100">
                        <Zap className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-sm text-gray-800">Clasificación de Hallazgos</p>
                            <p className="text-xs text-gray-500">Distribución de categorías: Infraestructura, Procesos, Atención al Paciente, etc.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Cómo funciona el sistema (resumen para directivos) */}
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8">
            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Cómo funciona DORA?</h3>
            <p className="text-gray-500 mb-6 text-sm">Resumen del flujo completo para contexto estratégico.</p>
            <div className="flex flex-col md:flex-row items-center gap-3 justify-center">
                {[
                    { label: 'Reporte Anónimo', icon: <MessageSquare className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
                    { label: 'Análisis IA', icon: <BrainCircuit className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
                    { label: 'Derivación Calidad', icon: <UserCog className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700' },
                    { label: 'Resolución', icon: <FileCheck className="w-4 h-4" />, color: 'bg-teal-100 text-teal-700' },
                    { label: 'Validación', icon: <ShieldCheck className="w-4 h-4" />, color: 'bg-green-100 text-green-700' },
                ].map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${step.color} font-bold text-xs`}>
                            {step.icon} {step.label}
                        </div>
                        {idx < 4 && <ArrowRight className="w-4 h-4 text-gray-300 hidden md:block" />}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

/* ══════════════════════════════════════════
   MAIN COMPONENT — Routes by role
   ══════════════════════════════════════════ */
export const HelpGuide = () => {
    const { session, role } = useAuth();

    // Determine which role-specific label and accent to show
    const roleConfig: Record<string, { label: string; accent: string; description: string }> = {
        admin: { label: 'Administrador', accent: 'text-purple-600', description: 'Guía completa de gestión del sistema' },
        responsable: { label: 'Responsable', accent: 'text-green-600', description: 'Todo lo que necesitás saber sobre tu panel de consulta' },
        directivo: { label: 'Directivo', accent: 'text-blue-600', description: 'Acceso ejecutivo a métricas e indicadores' },
    };

    const currentConfig = role ? roleConfig[role] : null;

    return (
        <div className="space-y-12 pb-12 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="text-center space-y-4">
                <h1 className="text-3xl md:text-5xl font-bold text-sanatorio-primary tracking-tight">Centro de Ayuda y Guías</h1>
                {session && currentConfig ? (
                    <div className="space-y-2">
                        <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
                            {currentConfig.description}
                        </p>
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-bold ${currentConfig.accent} shadow-sm`}>
                            <ShieldCheck className="w-4 h-4" />
                            Perfil: {currentConfig.label}
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
                        Conoce cómo funciona el ecosistema de mejora continua, desde el reporte inicial hasta la resolución confirmada.
                    </p>
                )}
            </div>

            {/* Visual Workflow Graph */}
            <WorkflowGraph />

            {/* Role-based content */}
            {!session || !role ? (
                <PublicGuide />
            ) : role === 'admin' ? (
                <AdminGuide />
            ) : role === 'responsable' ? (
                <ResponsableGuide />
            ) : role === 'directivo' ? (
                <DirectivoGuide />
            ) : (
                <PublicGuide />
            )}
        </div>
    );
};
