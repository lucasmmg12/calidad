import { GitCommit, Sparkles, Wrench, Zap, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ChangelogEntry {
    hash: string;
    date: string;
    type: 'feat' | 'fix' | 'other';
    title: string;
    description: string;
}

const rawChangelog: ChangelogEntry[] = [
    { hash: 'e2ff7d5', date: '2026-02-11', type: 'fix', title: 'Fix padding en inputs del Login', description: 'Se fuerza padding-left inline para evitar que los íconos se superpongan con el texto ingresado en los campos de correo y contraseña.' },
    { hash: 'ed91c14', date: '2026-02-11', type: 'fix', title: 'Limpieza del avatar Dora en Guía Rápida', description: 'Se removió el avatar de Dora del recuadro de Guía Rápida de Reporte, restaurando el diseño limpio original. Se actualizó el logo del login.' },
    { hash: 'dc2581c', date: '2026-02-11', type: 'fix', title: 'Login: logo institucional y padding', description: 'Se reemplazó el ícono de candado por el logo del Sanatorio Argentino en la pantalla de inicio de sesión.' },
    { hash: 'f96b4ac', date: '2026-02-11', type: 'feat', title: 'Dora asomándose en el formulario', description: 'Se integró a la mascota Dora en el borde superior del card de Guía Rápida con efecto de "asomarse" y globo de diálogo interactivo.' },
    { hash: 'c6493f2', date: '2026-02-11', type: 'feat', title: 'Donut Chart para Gravedad de Incidentes', description: 'Se reemplazó el gráfico de barras verticales por un donut chart CSS con conic-gradient. Incluye total en el centro y leyenda lateral con barras de progreso.' },
    { hash: '7292867', date: '2026-02-11', type: 'feat', title: 'Guía de Ayuda diferenciada por Rol', description: 'Se crearon 4 guías distintas en /guia según el rol del usuario: Público (sin login), Admin (gestión completa), Responsable (consulta y estados) y Directivo (métricas ejecutivas).' },
    { hash: '8aa3ac7', date: '2026-02-11', type: 'feat', title: 'Dashboard solo lectura para Responsable', description: 'Se restringieron las acciones del Dashboard para el rol Responsable: botones de derivación, clasificación, prioridad y descarte son solo visibles para Admin. Se reemplazó la columna "Ver" por "Clasificación".' },
    { hash: 'ecc0298', date: '2026-02-11', type: 'feat', title: 'Mascota Dora: variante Peek', description: 'Se añadió una variante "peek" del componente DoraAssistant que se asoma entre el título y el formulario con un globo de diálogo auto-dismissible.' },
    { hash: 'f4e4cba', date: '2026-02-11', type: 'fix', title: 'Fix AbortError en AuthContext', description: 'Se resolvió el error AbortError al diferir las llamadas a la base de datos fuera del callback onAuthStateChange usando setTimeout.' },
    { hash: '243b42f', date: '2026-02-11', type: 'fix', title: 'Persistencia de sesión en refresh', description: 'Se eliminaron condiciones de carrera en AuthContext y ProtectedRoute, asegurando que la sesión se mantenga al recargar la página.' },
    { hash: 'bf875b6', date: '2026-02-11', type: 'feat', title: 'Log de Actividad completo con Timeline', description: 'Se implementó un log de actividad visual con timeline parseada tanto en el Dashboard como en la página de Seguimiento de tickets.' },
    { hash: 'b7136d6', date: '2026-02-11', type: 'fix', title: 'Fix modal de rechazo inline', description: 'Se corrigió la pérdida de foco del textarea al re-renderizar, integrando el modal de rechazo directamente en el componente.' },
    { hash: '370549e', date: '2026-02-11', type: 'fix', title: 'Botón Rechazar visible en formulario', description: 'Se agregó un botón "Rechazar Asignación" visible dentro del formulario de resolución para el Responsable.' },
    { hash: '1dcc48c', date: '2026-02-11', type: 'feat', title: 'Vista de rechazo de asignación en Admin', description: 'Se añadió una vista específica para asignaciones rechazadas en el Dashboard del admin, mostrando el motivo y permitiendo re-derivación.' },
    { hash: 'b0d533c', date: '2026-02-11', type: 'fix', title: 'Redirección Directivo a Métricas', description: 'Los usuarios con rol Directivo ahora son redirigidos a /metrics después del login en lugar del Dashboard.' },
    { hash: '4eb074f', date: '2026-02-11', type: 'feat', title: 'Gráfico de distribución de clasificaciones', description: 'Se añadió un gráfico de distribución de categorías/clasificaciones en el panel de Métricas.' },
    { hash: '331e83d', date: '2026-02-11', type: 'fix', title: 'Filtro de métricas por sectores asignados', description: 'Las métricas ahora se filtran correctamente por los sectores asignados al usuario con rol Responsable.' },
    { hash: '1e4fec3', date: '2026-02-11', type: 'fix', title: 'Modales de notificación en Gestión de Usuarios', description: 'Se reemplazaron las alertas del navegador por modales personalizados en la página de administración de usuarios.' },
    { hash: '2ec4821', date: '2026-02-11', type: 'feat', title: 'Gestión de Usuarios y Edge Function', description: 'Se creó la página de administración de usuarios con CRUD completo y una Edge Function en Supabase para la creación de cuentas.' },
    { hash: 'de7e38a', date: '2026-02-11', type: 'fix', title: 'Fix loop infinito en perfil de usuario', description: 'Se resolvió un bucle infinito en el perfil de usuario, se removió el botón SOS y se mejoró el flujo de logout.' },
    { hash: '7788e83', date: '2026-02-11', type: 'feat', title: 'Filtrado por perfil y acceso basado en roles', description: 'Se implementó el filtrado de datos según el perfil del usuario y el sistema de acceso basado en roles (RBAC).' },
    { hash: '76295bf', date: '2026-02-11', type: 'feat', title: 'Modal de confirmación de Logout', description: 'Se añadió un modal de confirmación estilizado para cerrar sesión, mejorando la experiencia y previniendo cierres accidentales.' },
    { hash: '739ba3e', date: '2026-02-11', type: 'fix', title: 'Fix z-index del botón de emergencia', description: 'Se corrigió el problema de z-index en la interfaz de usuario relacionado con el botón de logout de emergencia.' },
    { hash: 'b80b252', date: '2026-02-11', type: 'feat', title: 'RBAC completo: roles, rechazo, métricas, IA', description: 'Se implementó el sistema completo de control de acceso por roles, flujo de rechazo, drill-down en métricas y feedback de IA.' },
    { hash: 'f69ea30', date: '2026-02-09', type: 'feat', title: 'Reestructura de Presentación: 7 slides', description: 'Se reestructuró completamente la presentación institucional con 7 slides estratégicos sobre el sistema DORA.' },
    { hash: 'c391f4c', date: '2026-02-09', type: 'feat', title: 'Avatar de Dora en presentación', description: 'Se integró el avatar circular de Dora dentro del slide de presentación institucional.' },
    { hash: '70a4b0a', date: '2026-02-09', type: 'feat', title: 'Link de Inicio en Navbar', description: 'Se movió el enlace de inicio a la barra de navegación principal para mejorar la accesibilidad.' },
    { hash: 'd3bb6c4', date: '2026-02-09', type: 'feat', title: 'Remoción del botón de descarga PDF', description: 'Se eliminó el botón de descarga de PDF de la interfaz según requerimiento.' },
    { hash: '74e49ec', date: '2026-02-09', type: 'feat', title: 'Botón Home en Presentación', description: 'Se añadió un botón para volver al inicio desde la vista de presentación.' },
    { hash: '9505f53', date: '2026-02-09', type: 'fix', title: 'Mejora posicionamiento de Dora', description: 'Se mejoró el posicionamiento y la integración visual de la mascota Dora en las distintas vistas.' },
];

// Group by date
const groupByDate = (entries: ChangelogEntry[]) => {
    const groups: Record<string, ChangelogEntry[]> = {};
    entries.forEach(entry => {
        if (!groups[entry.date]) groups[entry.date] = [];
        groups[entry.date].push(entry);
    });
    return Object.entries(groups);
};

const typeConfig = {
    feat: { label: 'Nueva Funcionalidad', icon: <Sparkles className="w-3.5 h-3.5" />, bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    fix: { label: 'Corrección', icon: <Wrench className="w-3.5 h-3.5" />, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    other: { label: 'Mejora', icon: <Zap className="w-3.5 h-3.5" />, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
};

const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${parseInt(day)} de ${months[parseInt(month) - 1]} ${year}`;
};

export const Changelog = () => {
    const grouped = groupByDate(rawChangelog);

    return (
        <div className="max-w-3xl mx-auto pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="text-center space-y-4 mb-12">
                <div className="w-16 h-16 bg-sanatorio-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                    <GitCommit className="w-8 h-8 text-sanatorio-primary" />
                </div>
                <h1 className="text-3xl md:text-5xl font-bold text-sanatorio-primary tracking-tight">Registro de Actualizaciones</h1>
                <p className="text-gray-500 max-w-xl mx-auto text-lg leading-relaxed">
                    Todas las mejoras, correcciones y nuevas funcionalidades implementadas en el sistema.
                </p>
                <div className="flex items-center justify-center gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                        <Sparkles className="w-3 h-3" /> Funcionalidades
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                        <Wrench className="w-3 h-3" /> Correcciones
                    </span>
                </div>
            </div>

            {/* Timeline */}
            <div className="space-y-10">
                {grouped.map(([date, entries]) => (
                    <div key={date}>
                        {/* Date Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-3 h-3 rounded-full bg-sanatorio-primary shadow-sm shadow-sanatorio-primary/30"></div>
                            <h2 className="text-sm font-black text-sanatorio-primary uppercase tracking-widest">{formatDate(date)}</h2>
                            <div className="flex-1 h-px bg-gray-200"></div>
                            <span className="text-xs text-gray-400 font-bold">{entries.length} cambios</span>
                        </div>

                        {/* Entries */}
                        <div className="ml-1.5 border-l-2 border-gray-100 pl-6 space-y-3">
                            {entries.map(entry => {
                                const config = typeConfig[entry.type];
                                return (
                                    <div
                                        key={entry.hash}
                                        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all hover:border-gray-200 group"
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Dot on timeline */}
                                            <div className={`w-2.5 h-2.5 rounded-full ${config.dot} shrink-0 mt-1.5 -ml-[33px] ring-4 ring-white`}></div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.text} border ${config.border}`}>
                                                        {config.icon} {config.label}
                                                    </span>
                                                    <span className="text-[10px] text-gray-300 font-mono">{entry.hash}</span>
                                                </div>
                                                <h3 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-sanatorio-primary transition-colors">
                                                    {entry.title}
                                                </h3>
                                                <p className="text-xs text-gray-500 leading-relaxed">
                                                    {entry.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Back link */}
            <div className="mt-12 text-center">
                <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-sanatorio-primary transition-colors font-medium">
                    <ArrowLeft className="w-4 h-4" /> Volver al Inicio
                </Link>
            </div>
        </div>
    );
};
