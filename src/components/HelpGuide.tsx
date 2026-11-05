import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ShieldCheck,
    UserCog,
    MessageSquare,
    Bell,
    Lock,
    Smartphone,
    BrainCircuit,
    FileCheck,
    Eye,
    Clock,
    AlertTriangle,
    TrendingUp,
    ClipboardList,
    Layers,
    ArrowRight,
    Send,
    Sparkles,
    PieChart,
    Target,
    Activity,
    Award,
    FileSpreadsheet,
    Download,
    Users,
    ChevronDown,
    HelpCircle,
    BookOpen,
    Check,
    Building2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ──────────────────────────────────────────────────────────
   1. CICLO INTEGRAL DE CALIDAD (6 ETAPAS CONECTADAS)
   ────────────────────────────────────────────────────────── */
const QualityCyclePipeline = () => {
    const stages = [
        {
            step: '01',
            icon: <MessageSquare className="w-5 h-5" />,
            title: 'Reporte / Felicitación',
            badge: 'Canal Abierto 24/7',
            desc: 'El colaborador o paciente registra un hallazgo (identificado o anónimo) o una felicitación con fotos y audio.',
            accent: 'border-blue-200 bg-blue-50/60 text-sanatorio-primary',
            iconBg: 'bg-sanatorio-primary text-white shadow-sanatorio-primary/20',
        },
        {
            step: '02',
            icon: <BrainCircuit className="w-5 h-5" />,
            title: 'Triage & Análisis IA',
            badge: 'Automático',
            desc: 'El motor de IA resume el caso, sugiere categoría operativa y asigna semáforo de urgencia (Verde, Amarillo o Rojo).',
            accent: 'border-purple-200 bg-purple-50/60 text-purple-700',
            iconBg: 'bg-purple-600 text-white shadow-purple-500/20',
        },
        {
            step: '03',
            icon: <UserCog className="w-5 h-5" />,
            title: 'Derivación Calidad',
            badge: 'Simple o Multi-Sector',
            desc: 'Calidad define el tipo de gestión (Simple, Desvío, Evento Adverso o Felicitación) y deriva a uno o varios sectores.',
            accent: 'border-amber-200 bg-amber-50/60 text-amber-800',
            iconBg: 'bg-amber-500 text-white shadow-amber-500/20',
        },
        {
            step: '04',
            icon: <Smartphone className="w-5 h-5" />,
            title: 'Aviso WhatsApp',
            badge: 'Link Único Directo',
            desc: 'El responsable recibe una notificación instantánea en su celular con enlace directo para gestionar sin trabas.',
            accent: 'border-emerald-200 bg-emerald-50/60 text-emerald-700',
            iconBg: 'bg-emerald-600 text-white shadow-emerald-500/20',
        },
        {
            step: '05',
            icon: <FileCheck className="w-5 h-5" />,
            title: 'Resolución Sectorial',
            badge: 'Causa Raíz + Plan',
            desc: 'El sector documenta la acción inmediata, análisis de causa raíz, plan de acción, fecha compromiso y evidencias.',
            accent: 'border-teal-200 bg-teal-50/60 text-teal-800',
            iconBg: 'bg-sanatorio-secondary text-white shadow-sanatorio-secondary/20',
        },
        {
            step: '06',
            icon: <Award className="w-5 h-5" />,
            title: 'Validación & Cierre',
            badge: 'Feedback + PDF',
            desc: 'Calidad audita y aprueba la solución, notifica al reportante por WhatsApp y habilita el Informe o Certificado PDF.',
            accent: 'border-indigo-200 bg-indigo-50/60 text-indigo-700',
            iconBg: 'bg-indigo-600 text-white shadow-indigo-500/20',
        },
    ];

    return (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-sanatorio-primary/10 text-sanatorio-primary flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-sanatorio-secondary">
                            Trazabilidad Punta a Punta
                        </span>
                        <h2 className="text-xl sm:text-2xl font-display font-black text-slate-800">
                            Ciclo Institucional de Gestión de Calidad
                        </h2>
                    </div>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-600 self-start sm:self-auto">
                    <Clock className="w-4 h-4 text-sanatorio-primary" />
                    Monitoreo continuo en tiempo real
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {stages.map((s, idx) => (
                    <div
                        key={s.step}
                        className="relative group bg-slate-50/60 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-sanatorio-primary/30 p-4 transition-all duration-200 hover:shadow-md flex flex-col justify-between"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl ${s.iconBg} shadow-md flex items-center justify-center transition-transform group-hover:scale-105`}>
                                    {s.icon}
                                </div>
                                <span className="font-mono text-xs font-black text-slate-300 group-hover:text-sanatorio-primary/60 transition-colors">
                                    ETAPA {s.step}
                                </span>
                            </div>

                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border mb-2 ${s.accent}`}>
                                {s.badge}
                            </span>

                            <h3 className="font-display font-bold text-slate-800 text-sm mb-1.5">
                                {s.title}
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {s.desc}
                            </p>
                        </div>

                        {idx < stages.length - 1 && (
                            <div className="hidden xl:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-2xs items-center justify-center text-slate-400">
                                <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────
   2. CLASIFICACIÓN DE TIPOS DE GESTIÓN Y ESTADOS
   ────────────────────────────────────────────────────────── */
const ClassificationMatrix = () => {
    const types = [
        {
            name: 'Hallazgo Simple',
            pill: 'Simple',
            pillClass: 'bg-blue-100 text-blue-700 border-blue-200',
            cardBorder: 'border-blue-200/70',
            requerimiento: 'Acción correctiva inmediata y evidencia de resolución.',
            uso: 'Observaciones operativas puntuales, mantenimiento menor o ajustes rápidos.',
        },
        {
            name: 'Desvío de Proceso',
            pill: 'Desvío',
            pillClass: 'bg-orange-100 text-orange-800 border-orange-200',
            cardBorder: 'border-orange-200/70',
            requerimiento: 'Acción inmediata + Análisis de Causa Raíz + Plan de Acción + Fecha de implementación.',
            uso: 'Incumplimiento de protocolos, demoras inter-sectoriales o fallas recurrentes.',
        },
        {
            name: 'Evento Adverso / Centinela',
            pill: 'Evento Adverso',
            pillClass: 'bg-red-100 text-red-700 border-red-200',
            cardBorder: 'border-red-200/70',
            requerimiento: 'Prioridad Crítica (Rojo) + Alerta inmediata + Investigación de Causa Raíz y barreras de seguridad.',
            uso: 'Incidentes que afectaron o pudieron comprometer la seguridad clínica del paciente.',
        },
        {
            name: 'Reconocimiento Institucional',
            pill: '🌟 Felicitación',
            pillClass: 'bg-amber-100 text-amber-800 border-amber-300',
            cardBorder: 'border-amber-200/80',
            requerimiento: 'Notificación positiva al equipo y emisión automática del Certificado de Felicitación en PDF.',
            uso: 'Destacar la calidez humana, empatía y excelencia profesional de un sector o colaborador.',
        },
    ];

    return (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <div className="mb-6">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-sanatorio-primary">
                    Tipología Clínica y Operativa
                </span>
                <h3 className="text-xl font-display font-black text-slate-800 mt-0.5">
                    Modalidades de Gestión y Nivel de Profundidad Requerido
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Cada caso se clasifica según su impacto para solicitar únicamente la información necesaria al responsable del sector.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {types.map((t) => (
                    <div
                        key={t.name}
                        className={`rounded-2xl border ${t.cardBorder} bg-slate-50/40 p-5 flex flex-col justify-between gap-3`}
                    >
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${t.pillClass}`}>
                                    {t.pill}
                                </span>
                            </div>
                            <h4 className="font-display font-bold text-slate-800 text-base mb-1.5">
                                {t.name}
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed mb-3">
                                {t.uso}
                            </p>
                        </div>
                        <div className="pt-3 border-t border-slate-200/70">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Requisito de Cierre
                            </p>
                            <p className="text-xs font-semibold text-slate-700 leading-snug">
                                {t.requerimiento}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────
   3. REUSABLE COMPONENTS FOR ROLE GUIDES
   ────────────────────────────────────────────────────────── */
const StepItem = ({ number, title, children }: { number: number; title: string; children: React.ReactNode }) => (
    <div className="flex gap-3.5 items-start">
        <div className="flex-shrink-0 w-7 h-7 bg-sanatorio-primary text-white rounded-lg flex items-center justify-center font-bold text-xs shadow-2xs mt-0.5">
            {number}
        </div>
        <div>
            <h4 className="font-bold text-slate-800 text-sm mb-0.5">{title}</h4>
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">{children}</div>
        </div>
    </div>
);

const FeatureCard = ({
    icon,
    title,
    description,
    accent,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    accent: string;
}) => (
    <div className="bg-slate-50/60 hover:bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition-all">
        <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center mb-3`}>
            {icon}
        </div>
        <h4 className="font-display font-bold text-slate-800 text-sm mb-1">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
);

/* ══════════════════════════════════════════════════════════
   GUÍA 1: PÚBLICA (SIN SESIÓN INICIADA)
   ══════════════════════════════════════════════════════════ */
const PublicGuide = () => (
    <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="bg-gradient-to-r from-sanatorio-primary/8 via-sanatorio-secondary/8 to-transparent p-6 sm:p-8 border-b border-slate-100 flex items-center gap-4">
                <div className="w-13 h-13 bg-sanatorio-primary rounded-2xl flex items-center justify-center shadow-md shadow-sanatorio-primary/20 shrink-0">
                    <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-800">
                        Guía para el Personal y Pacientes
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                        Cómo registrar un hallazgo, sugerencia o felicitación en menos de 1 minuto.
                    </p>
                </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
                <StepItem number={1} title="Elegí el modo: Hallazgo o Felicitación">
                    <p>
                        En la pantalla de inicio podés reportar una oportunidad de mejora (<strong>Hallazgo</strong>) o destacar el desempeño de un equipo (<strong>Enviar Felicitación</strong>).
                    </p>
                </StepItem>
                <StepItem number={2} title="Modo Identificado o Anónimo">
                    <p>
                        Si elegís <strong>Modo Identificado</strong> y dejás tu WhatsApp, recibirás notificaciones automáticas del avance y resolución de tu caso. También podés reportar en <strong>Modo Anónimo</strong> con total confidencialidad.
                    </p>
                </StepItem>
                <StepItem number={3} title="Adjuntá fotos o dictá por voz">
                    <p>
                        Podés subir fotografías como evidencia visual o utilizar el grabador de voz integrado para que el sistema transcriba tu relato automáticamente.
                    </p>
                </StepItem>
                <StepItem number={4} title="Descargá tu Comprobante o Certificado PDF">
                    <p>
                        Al enviar el formulario obtendrás un <strong>Código de Seguimiento (`#SA-2026-XXXX`)</strong> y podrás descargar en el acto tu comprobante o el <strong>Certificado Institucional de Felicitación en PDF</strong>.
                    </p>
                </StepItem>
            </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="space-y-4">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-sanatorio-primary">
                    <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-display font-bold text-slate-800">
                    ¿Sos Responsable de Sector o Integrante de Calidad?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    Iniciá sesión con tu cuenta institucional para acceder a las guías operativas de <strong>Mis Casos</strong>, <strong>Tablero de Control</strong>, <strong>Auditorías de Proceso</strong> e <strong>Inteligencia de Calidad</strong>.
                </p>
                <ul className="space-y-2 text-xs text-slate-600 pt-2">
                    <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        Gestión y seguimiento de casos de tu sector
                    </li>
                    <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        Exportación de listados en Excel con formato y PDF
                    </li>
                    <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        Indicadores y métricas en tiempo real
                    </li>
                </ul>
            </div>

            <Link
                to="/login"
                className="btn-primary w-full text-sm py-3"
            >
                Ingresar con Cuenta Institucional
            </Link>
        </div>
    </div>
);

/* ══════════════════════════════════════════════════════════
   GUÍA 2: ADMINISTRADOR (GESTIÓN DE CALIDAD)
   ══════════════════════════════════════════════════════════ */
const AdminGuide = () => (
    <div className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
            {/* Card 1: Operación del Tablero de Casos */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-sanatorio-primary/8 to-transparent p-6 sm:p-7 border-b border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-sanatorio-primary rounded-2xl flex items-center justify-center shadow-md shadow-sanatorio-primary/20 shrink-0">
                        <UserCog className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-display font-bold text-slate-800">
                            Administración del Tablero de Casos
                        </h2>
                        <p className="text-xs text-slate-500">
                            Flujo operativo diario para el equipo de Gestión de Calidad.
                        </p>
                    </div>
                </div>

                <div className="p-6 sm:p-7 space-y-5 flex-grow">
                    <StepItem number={1} title="Clasificación y Semáforo de Prioridad">
                        <p>
                            Al abrir un ticket en <strong>Casos (`/dashboard`)</strong>, verificá la prioridad sugerida por IA (Verde, Amarillo, Rojo), el sector de origen/destino y el tipo de hallazgo (incluyendo <strong>🌟 Felicitación</strong>).
                        </p>
                    </StepItem>
                    <StepItem number={2} title="Derivación Simple o Multi-Sector por WhatsApp">
                        <p>
                            Derivá el caso a un único responsable o activá la <strong>Derivación Multi-Sector (`MS`)</strong> cuando el problema involucre a varias áreas simultáneamente. Cada área recibe su propio link de resolución.
                        </p>
                    </StepItem>
                    <StepItem number={3} title="Validación de Calidad o Devolución">
                        <p>
                            En la pestaña <strong>Por Validar</strong>, revisá la respuesta y evidencias del sector. Si es satisfactoria, aprobá el cierre; si está incompleta, devolvelo con observaciones (queda registrado en el historial de rechazos).
                        </p>
                    </StepItem>
                    <StepItem number={4} title="Solicitudes de Información Adicional y Apelaciones">
                        <p>
                            Podés solicitar información complementaria a un tercero mediante un link dedicado o <strong>Reabrir / Apelar</strong> un caso cerrado si el reportante indica no conformidad.
                        </p>
                    </StepItem>
                </div>
            </div>

            {/* Card 2: Exportaciones, Alertas y Gobernanza */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-purple-500/8 to-transparent p-6 sm:p-7 border-b border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-display font-bold text-slate-800">
                            Herramientas Avanzadas y Reportes Ejecutivos
                        </h2>
                        <p className="text-xs text-slate-500">
                            Control de vencimientos, auditorías y exportaciones con diseño institucional.
                        </p>
                    </div>
                </div>

                <div className="p-6 sm:p-7 space-y-4 flex-grow">
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3.5">
                        <Award className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 mb-0.5">
                                Certificados de Felicitación en PDF
                            </h4>
                            <p className="text-xs text-amber-800 leading-relaxed">
                                Cualquier caso clasificado como <strong>Felicitación</strong> permite descargar un <strong>Certificado Institucional A4</strong> con medalla de excelencia y marco dorado listo para imprimir o compartir con el sector.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3.5">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 mb-0.5">
                                Exportación Excel (.xlsx) y PDF con Identidad Institucional
                            </h4>
                            <p className="text-xs text-emerald-800 leading-relaxed">
                                Tanto en <strong>Casos</strong> como en <strong>Mis Casos</strong> podés exportar la vista filtrada a Excel (con logo del Sanatorio, KPIs, autofiltros y celdas coloreadas) o a PDF A4 Horizontal.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex items-start gap-3.5">
                        <Bell className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-orange-900 mb-0.5">
                                Acordeón de Alertas de Vencimiento
                            </h4>
                            <p className="text-xs text-orange-800 leading-relaxed">
                                El tablero monitorea las fechas de implementación comprometidas y agrupa en la barra desplegable superior los casos próximos a vencer (5 días) o vencidos.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Grid de 4 Módulos de Administración */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <h3 className="text-base sm:text-lg font-display font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-sanatorio-primary" />
                Módulos Exclusivos del Perfil Administrador
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FeatureCard
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    title="Gestión de Usuarios (/admin/users)"
                    description="Aprobá nuevos registros, asigná roles (Admin, Responsable, Directivo) y vinculá múltiples sectores por referente."
                    accent="bg-blue-100"
                />
                <FeatureCard
                    icon={<Bell className="w-5 h-5 text-red-600" />}
                    title="Destinatarios de Alertas (/admin/alertas)"
                    description="Configurá qué números reciben alertas críticas inmediatas por WhatsApp cuando ingresa un hallazgo Rojo."
                    accent="bg-red-100"
                />
                <FeatureCard
                    icon={<ClipboardList className="w-5 h-5 text-emerald-600" />}
                    title="Auditoría de Proceso"
                    description="Ejecutá relevamientos estructurados por sector con cálculo de cumplimiento, experiencia del paciente y exportación."
                    accent="bg-emerald-100"
                />
                <FeatureCard
                    icon={<BrainCircuit className="w-5 h-5 text-purple-600" />}
                    title="Informe Ejecutivo IA (/metrics)"
                    description="Generá informes institucionales en PDF con análisis descriptivo, predictivo y prescriptivo asistido por IA."
                    accent="bg-purple-100"
                />
            </div>
        </div>
    </div>
);

/* ══════════════════════════════════════════════════════════
   GUÍA 3: RESPONSABLE DE SECTOR
   ══════════════════════════════════════════════════════════ */
const ResponsableGuide = () => (
    <div className="space-y-6">
        <div className="grid lg:grid-cols-2 gap-6">
            {/* Card 1: Mis Casos vs Seguimientos */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-sanatorio-primary/8 to-transparent p-6 sm:p-7 border-b border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-sanatorio-primary rounded-2xl flex items-center justify-center shadow-md shadow-sanatorio-primary/20 shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-display font-bold text-slate-800">
                            Cómo usar el módulo "Mis Casos"
                        </h2>
                        <p className="text-xs text-slate-500">
                            Gestión de casos recibidos y monitoreo de reportes originados en tu sector.
                        </p>
                    </div>
                </div>

                <div className="p-6 sm:p-7 space-y-5 flex-grow">
                    <StepItem number={1} title="Pestaña 1: Casos Asignados (Para Resolver)">
                        <p>
                            Muestra todos los hallazgos o felicitaciones que Calidad derivó a tus sectores. Haciendo clic en <strong>Gestionar</strong> accedés al formulario de resolución para cargar tu descargo y plan de acción.
                        </p>
                    </StepItem>
                    <StepItem number={2} title="Pestaña 2: Seguimientos (Monitoreo)">
                        <p>
                            Te permite seguir el estado en tiempo real de los reportes que <strong>tu propio sector envió hacia otras áreas</strong> del Sanatorio, visualizando la línea de tiempo de actividad y la respuesta final.
                        </p>
                    </StepItem>
                    <StepItem number={3} title="Descarga en Excel (.xlsx) y PDF">
                        <p>
                            En ambas pestañas contás con los botones <strong>Excel</strong> (planilla con formato institucional, logo del Sanatorio y resumen de KPIs) y <strong>PDF</strong> (listado general o ficha individual por caso).
                        </p>
                    </StepItem>
                </div>
            </div>

            {/* Card 2: Cómo responder un caso derivado */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-emerald-500/8 to-transparent p-6 sm:p-7 border-b border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                        <Send className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-display font-bold text-slate-800">
                            Paso a Paso para Resolver un Caso
                        </h2>
                        <p className="text-xs text-slate-500">
                            Desde el link de WhatsApp o desde tu panel web.
                        </p>
                    </div>
                </div>

                <div className="p-6 sm:p-7 space-y-5 flex-grow">
                    <StepItem number={1} title="Abrí el enlace desde WhatsApp o desde 'Mis Casos'">
                        <p>
                            Cuando Calidad te asigna un caso, recibís un WhatsApp con un enlace directo (`/resolver-caso/...`). Podés completarlo desde el celular sin siquiera necesitar recordar tu contraseña.
                        </p>
                    </StepItem>
                    <StepItem number={2} title="Completá la Resolución según el Tipo de Caso">
                        <p>
                            Si es <strong>Simple</strong>, indicá la solución aplicada. Si es <strong>Desvío</strong> o <strong>Evento Adverso</strong>, detallá la <em>Acción Inmediata</em>, la <em>Causa Raíz</em>, el <em>Plan de Acción</em> y la <em>Fecha de Implementación</em>.
                        </p>
                    </StepItem>
                    <StepItem number={3} title="¿El caso no corresponde a tu sector?">
                        <p>
                            Dentro de la página de resolución podés utilizar la opción de <strong>Rechazar Asignación</strong> indicando el motivo para que Calidad lo reasigne inmediatamente al área correcta.
                        </p>
                    </StepItem>
                </div>
            </div>
        </div>
    </div>
);

/* ══════════════════════════════════════════════════════════
   GUÍA 4: DIRECTIVO
   ══════════════════════════════════════════════════════════ */
const DirectivoGuide = () => (
    <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-sanatorio-primary/8 to-transparent p-6 sm:p-7 border-b border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-sanatorio-primary rounded-2xl flex items-center justify-center shadow-md shadow-sanatorio-primary/20 shrink-0">
                    <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-display font-bold text-slate-800">
                        Visión Ejecutiva para Dirección
                    </h2>
                    <p className="text-xs text-slate-500">
                        Monitoreo estratégico de seguridad del paciente y desempeño sectorial.
                    </p>
                </div>
            </div>
            <div className="p-6 sm:p-7 space-y-5 flex-grow">
                <StepItem number={1} title="Tablero de Inteligencia de Calidad (/metrics)">
                    <p>
                        Visualizá el volumen de reportes recibidos, tasa global de resolución, hallazgos críticos activos, tiempos de respuesta promedio y felicitaciones por sector.
                    </p>
                </StepItem>
                <StepItem number={2} title="Filtros Dinámicos por Fecha y Sector">
                    <p>
                        Analizá períodos específicos o compará el rendimiento entre diferentes servicios médicos y administrativos con un solo clic.
                    </p>
                </StepItem>
                <StepItem number={3} title="Descarga del Executive Brief con IA (PDF)">
                    <p>
                        El botón <strong>Executive Brief</strong> genera un documento PDF de alta dirección con KPIs consolidados, matriz de eficiencia sectorial y recomendaciones estratégicas redactadas por IA.
                    </p>
                </StepItem>
            </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 flex flex-col justify-between gap-4">
            <div>
                <h3 className="text-lg font-display font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-sanatorio-secondary" />
                    Indicadores Clave Monitoreados
                </h3>
                <div className="grid sm:grid-cols-2 gap-3.5">
                    <FeatureCard
                        icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
                        title="Evolución Temporal"
                        description="Curva histórica de hallazgos y cierres para detectar estacionalidad o desvíos tempranos."
                        accent="bg-blue-100"
                    />
                    <FeatureCard
                        icon={<Activity className="w-5 h-5 text-emerald-600" />}
                        title="Eficiencia por Sector"
                        description="Ranking de áreas según tasa de resolución y velocidad de respuesta."
                        accent="bg-emerald-100"
                    />
                    <FeatureCard
                        icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
                        title="Riesgo Clínico (Rojo)"
                        description="Seguimiento prioritario de eventos adversos e incidentes críticos."
                        accent="bg-red-100"
                    />
                    <FeatureCard
                        icon={<Award className="w-5 h-5 text-amber-600" />}
                        title="Clima y Reconocimiento"
                        description="Contabilización de felicitaciones recibidas por cada equipo de salud."
                        accent="bg-amber-100"
                    />
                </div>
            </div>
        </div>
    </div>
);

/* ──────────────────────────────────────────────────────────
   4. PREGUNTAS FRECUENTES (ACORDEÓN INTERACTIVO)
   ────────────────────────────────────────────────────────── */
const FAQSection = () => {
    const [openIdx, setOpenIdx] = useState<number | null>(0);

    const faqs = [
        {
            q: '¿Cómo descargo mis casos asignados en Excel o PDF?',
            a: 'Ingresá a la sección "Mis Casos" desde el menú superior. Tanto en la pestaña "Casos Asignados" como en "Seguimientos (Monitoreo)" encontrarás a la derecha del buscador los botones "Excel" (que descarga una planilla con el logo del Sanatorio, colores institucionales, KPIs y pie de página de Innovación y Transformación Digital) y "PDF" (que genera el reporte en hoja A4 horizontal). Además, cada tarjeta tiene su propio botón PDF individual.',
        },
        {
            q: '¿Cómo funciona el Certificado de Felicitación en PDF?',
            a: 'Cuando un paciente o colaborador envía un reporte en modo "Felicitación" (o cuando Calidad clasifica un caso como Felicitación), el sistema habilita automáticamente un diseño especial de "Reconocimiento a la Excelencia" con marco dorado, medalla vectorial y firma institucional, listo para descargar e imprimir.',
        },
        {
            q: '¿Qué diferencia hay entre Modo Identificado y Modo Anónimo?',
            a: 'En el Modo Identificado ingresás tu nombre y número de WhatsApp para recibir notificaciones automáticas cuando el caso se deriva y cuando se resuelve, permitiendo además que Calidad te consulte si necesita más detalles. En el Modo Anónimo no se solicita ningún dato personal y aún así recibís un código de seguimiento (#SA-2026-XXXX) para consultar el avance en la pestaña "Seguimiento".',
        },
        {
            q: '¿Qué hago si me derivaron un caso que no pertenece a mi sector?',
            a: 'Al abrir el link de resolución del caso (desde WhatsApp o desde el botón "Gestionar" en Mis Casos), encontrarás la opción para rechazar la asignación indicando brevemente el motivo. El caso volverá inmediatamente a la bandeja de "⚡ Rechazados" de Calidad para su reasignación.',
        },
    ];

    return (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-sanatorio-primary/10 text-sanatorio-primary flex items-center justify-center">
                    <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg sm:text-xl font-display font-black text-slate-800">
                        Preguntas Frecuentes
                    </h3>
                    <p className="text-xs text-slate-500">
                        Respuestas rápidas a las consultas más habituales sobre el uso de la plataforma.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {faqs.map((item, idx) => {
                    const isOpen = openIdx === idx;
                    return (
                        <div
                            key={idx}
                            className={`rounded-2xl border transition-all overflow-hidden ${
                                isOpen
                                    ? 'border-sanatorio-primary/30 bg-blue-50/20'
                                    : 'border-slate-200/80 bg-slate-50/40 hover:bg-slate-50'
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => setOpenIdx(isOpen ? null : idx)}
                                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                            >
                                <span className="font-display font-bold text-sm text-slate-800">
                                    {item.q}
                                </span>
                                <ChevronDown
                                    className={`w-4 h-4 text-sanatorio-primary shrink-0 transition-transform duration-200 ${
                                        isOpen ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>
                            {isOpen && (
                                <div className="px-5 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                                    {item.a}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT — CENTRO DE AYUDA Y GUÍAS
   ══════════════════════════════════════════════════════════ */
export const HelpGuide = () => {
    const { session, role } = useAuth();

    const roleConfig: Record<string, { label: string; badgeClass: string; description: string }> = {
        admin: {
            label: 'Administrador de Calidad',
            badgeClass: 'bg-white/15 text-white border-white/25',
            description: 'Guía integral de administración, derivación multi-sector, validación de casos y exportaciones ejecutivas.',
        },
        responsable: {
            label: 'Responsable de Sector',
            badgeClass: 'bg-emerald-400/20 text-emerald-100 border-emerald-300/30',
            description: 'Guía práctica para gestionar tus casos asignados, monitorear seguimientos y descargar reportes en Excel y PDF.',
        },
        directivo: {
            label: 'Directivo',
            badgeClass: 'bg-sky-400/20 text-sky-100 border-sky-300/30',
            description: 'Guía ejecutiva de indicadores estratégicos, tasas de resolución e informes de inteligencia con IA.',
        },
    };

    const currentConfig = role ? roleConfig[role] : null;

    return (
        <div className="w-full space-y-8 pb-12 animate-in fade-in duration-300">
            {/* Hero Header Card */}
            <div className="relative rounded-3xl bg-gradient-to-br from-sanatorio-primary via-[#003E6B] to-slate-900 text-white p-6 sm:p-10 shadow-md overflow-hidden">
                <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sanatorio-secondary/20 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-white/10 border border-white/15 text-sky-200">
                                <BookOpen className="w-3.5 h-3.5 text-sanatorio-secondary" />
                                Centro de Ayuda y Documentación Rápida
                            </span>
                            {session && currentConfig && (
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${currentConfig.badgeClass}`}>
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Perfil: {currentConfig.label}
                                </span>
                            )}
                        </div>

                        <h1 className="text-2xl sm:text-4xl font-display font-black text-white tracking-tight">
                            Centro de Ayuda y Guías Operativas
                        </h1>

                        <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
                            {session && currentConfig
                                ? currentConfig.description
                                : 'Conocé cómo funciona el ecosistema de mejora continua y seguridad del paciente del Sanatorio Argentino, desde el reporte inicial hasta la validación y certificación final.'}
                        </p>
                    </div>

                    {/* Quick Action Shortcuts */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <Link
                            to="/"
                            className="px-4 py-2.5 rounded-xl bg-white text-sanatorio-primary font-bold text-xs shadow-sm hover:bg-blue-50 transition-all flex items-center gap-1.5"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Nuevo Reporte
                        </Link>
                        <Link
                            to="/track"
                            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs transition-all flex items-center gap-1.5"
                        >
                            <Eye className="w-4 h-4" />
                            Consultar Ticket
                        </Link>
                        {session && (
                            <Link
                                to="/manual"
                                className="px-4 py-2.5 rounded-xl bg-sanatorio-secondary hover:bg-[#009388] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                            >
                                <Download className="w-4 h-4" />
                                Manual Completo
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* 1. Visual 6-Stage Quality Cycle Pipeline */}
            <QualityCyclePipeline />

            {/* 2. Classification & SLA Matrix */}
            <ClassificationMatrix />

            {/* 3. Role-specific Guide Content */}
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

            {/* 4. Interactive FAQ Section */}
            <FAQSection />
        </div>
    );
};
