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
    // === 5 de Noviembre 2026 ===
    {
        hash: '3961f60',
        date: '2026-11-05',
        type: 'other',
        title: 'Simplificación Visual del Encabezado de Reportes',
        description: 'Se despejó la cabecera del Canal de Calidad y Reconocimiento para ofrecer una lectura más directa y clínica.'
    },
    {
        hash: '23d8f01',
        date: '2026-11-05',
        type: 'feat',
        title: 'Actualización Integral del Manual de Procedimientos v2.0',
        description: 'Se renovó el Manual de Procedimientos tanto en su vista interactiva por capítulos como en el documento PDF descargable con todos los módulos vigentes.'
    },
    {
        hash: '925ecf1',
        date: '2026-11-05',
        type: 'feat',
        title: 'Radar Operativo de Tiempo de Respuesta (SLA)',
        description: 'Se rediseñó el panel de alertas de tiempo de respuesta en formato colapsable, priorizando los casos recientes y por vencer sobre el pasivo histórico e incorporando resumen por sector y exportación PDF.'
    },
    {
        hash: 'd5064b6',
        date: '2026-11-05',
        type: 'other',
        title: 'Optimización de Memoria y Carga Completa en Ciclo PDCA',
        description: 'Se eliminó el límite de registros en las verificaciones de efectividad (30, 60 y 90 días) y se organizó el listado en grupos desplegables por sector y etapa para minimizar el uso de memoria RAM.'
    },
    {
        hash: '59ed504',
        date: '2026-11-05',
        type: 'feat',
        title: 'Ventana Emergente de Casos por Nivel de Gravedad con Descarga PDF',
        description: 'Al seleccionar casos Leves (Verdes), Moderados (Amarillos), Críticos (Rojos) o Felicitaciones en Métricas, se despliega una ventana emergente interactiva con buscador y exportación directa a PDF y Excel sin abandonar el tablero.'
    },
    {
        hash: 'cff034f',
        date: '2026-11-05',
        type: 'feat',
        title: 'Revista Institucional de Inteligencia Clínica y Gráficos Explicativos',
        description: 'Se transformó el Informe Institucional PDF en una revista editorial de 5 páginas con glosario de indicadores explicados, gráficos de línea y barras con valores directos y Dossier de Inteligencia Clínica.'
    },
    {
        hash: '30d2324',
        date: '2026-11-05',
        type: 'feat',
        title: 'Rediseño del Centro de Ayuda y Guías Interactivas',
        description: 'Se incorporó el circuito visual de 6 etapas del ciclo de calidad, la matriz comparativa entre Gestión Simple y Desvío, guías operativas por perfil y acordeón de preguntas frecuentes.'
    },
    {
        hash: '62f2286',
        date: '2026-11-05',
        type: 'other',
        title: 'Aprovechamiento de Pantalla Completa en Tableros Operativos',
        description: 'Se expandió el ancho útil de la interfaz en la barra de navegación, Mis Casos, Tablero de Gestión y Métricas para facilitar la auditoría en monitores de escritorio.'
    },
    {
        hash: 'b889ca8',
        date: '2026-11-05',
        type: 'feat',
        title: 'Exportación Institucional en Excel Estilizado y PDF en Mis Casos',
        description: 'Se habilitó la descarga de Casos Asignados y Seguimientos en formato Excel (.xlsx con identidad visual, logo del Sanatorio y resumen de indicadores) y en PDF con pie institucional.'
    },
    {
        hash: '298d77e',
        date: '2026-11-05',
        type: 'other',
        title: 'Limpieza de Etiqueta Superior en el Tablero de Gestión',
        description: 'Se depuró el encabezado principal del Tablero de Casos para optimizar el espacio vertical disponible.'
    },
    {
        hash: '09d396f',
        date: '2026-11-05',
        type: 'fix',
        title: 'Panel de Alertas de Vencimiento Colapsado por Defecto',
        description: 'El bloque de alertas en el Tablero de Casos ahora inicia contraído como un acordeón desplegable con contadores rápidos de vencidos y próximos a vencer.'
    },
    {
        hash: '487c5d4',
        date: '2026-11-05',
        type: 'feat',
        title: 'Rediseño de Documentos PDF y Certificados de Felicitación',
        description: 'Se renovó la estética tipográfica y visual de todas las exportaciones PDF y se crearon los Certificados Oficiales de Reconocimiento y Felicitación para el personal destacado.'
    },

    // === 9 de Septiembre 2026 ===
    {
        hash: '6f6e03e',
        date: '2026-09-09',
        type: 'feat',
        title: 'Unificación de Nomenclatura en Auditoría de Proceso',
        description: 'Se estandarizó la denominación del módulo de relevamiento operativo como Auditoría de Proceso en toda la plataforma.'
    },

    // === 31 de Agosto 2026 ===
    {
        hash: 'dd1dbfe',
        date: '2026-08-31',
        type: 'other',
        title: 'Actualización de Plantilla de Relevamiento y Exportador de Planillas',
        description: 'Se ajustó la estructura de criterios de evaluación en terreno y se perfeccionó la exportación de resultados a hojas de cálculo.'
    },

    // === 24 de Agosto 2026 ===
    {
        hash: '06974dc',
        date: '2026-08-24',
        type: 'feat',
        title: 'Visualización de Evidencia Fotográfica en Resolución de Casos',
        description: 'Los responsables de sector ahora pueden visualizar directamente las fotografías adjuntadas por el reportante dentro del formulario de resolución.'
    },

    // === 21 de Agosto 2026 ===
    {
        hash: 'c255c2e',
        date: '2026-08-21',
        type: 'feat',
        title: 'Registro de Personal Presente y Mejora de Presentaciones Ejecutivas',
        description: 'Se incorporó el campo de registro de personal presente durante la auditoría y se optimizó la maquetación del reporte ejecutivo.'
    },
    {
        hash: '79c9ab7',
        date: '2026-08-21',
        type: 'feat',
        title: 'Lista de Verificación Binaria (Sí / No) por Sector',
        description: 'Se rediseñó el cuestionario sectorial como una lista de chequeo ágil Sí/No para acelerar el relevamiento en terreno.'
    },
    {
        hash: '92be31d',
        date: '2026-08-21',
        type: 'fix',
        title: 'Ajuste de Textos Largos y Experiencia Móvil en Auditorías',
        description: 'Se corrigió el ajuste de líneas en los formularios de recepción y se mejoró la adaptabilidad en dispositivos móviles y tablets.'
    },
    {
        hash: '51571a7',
        date: '2026-08-21',
        type: 'other',
        title: 'Contraste Visual Alternado en Tarjetas de Evaluación',
        description: 'Se aplicó alternancia cromática suave entre ítems de auditoría para facilitar la lectura secuencial.'
    },
    {
        hash: 'b54f913',
        date: '2026-08-21',
        type: 'fix',
        title: 'Corrección de Tipado en Componentes de Notificación Interna',
        description: 'Se estandarizaron las definiciones de tipos en los avisos del módulo de auditoría.'
    },
    {
        hash: 'ebcb5f6',
        date: '2026-08-21',
        type: 'feat',
        title: 'Modales Institucionales de Confirmación en Auditorías',
        description: 'Se reemplazaron los avisos nativos del navegador por ventanas modales integradas al diseño clínico del sistema.'
    },
    {
        hash: '1f16b35',
        date: '2026-08-21',
        type: 'feat',
        title: 'Reportes Ejecutivos con Veredictos y Tablas Autopaginadas',
        description: 'Se añadieron indicadores de resultado global, paginación automática de tablas extensas y notas metodológicas sobre la muestra.'
    },
    {
        hash: 'ec827d4',
        date: '2026-08-21',
        type: 'feat',
        title: 'Escala Cromática Permanente en Indicadores de Cumplimiento',
        description: 'Los selectores de ponderación mantienen visible su escala semántica de color para identificar rápidamente el nivel de adherencia.'
    },
    {
        hash: 'c9e3cdc',
        date: '2026-08-21',
        type: 'feat',
        title: 'Historial de Relevamientos y Panel de Instrucciones Operativas',
        description: 'Se incorporó el archivo histórico de auditorías realizadas junto con una guía rápida de criterios de evaluación.'
    },
    {
        hash: '1f867fb',
        date: '2026-08-21',
        type: 'feat',
        title: 'Guardado Automático y Notas de Voz en Relevamientos',
        description: 'Se sumó soporte para dictado por voz, persistencia automática de borradores y generación de presentaciones de resultados.'
    },
    {
        hash: '4a481bc',
        date: '2026-08-21',
        type: 'fix',
        title: 'Preservación de Saltos de Línea en Observaciones de Campo',
        description: 'Se corrigió el formateo de párrafos y saltos de línea en las notas detalladas de auditoría.'
    },
    {
        hash: 'f1f77ec',
        date: '2026-08-21',
        type: 'fix',
        title: 'Restauración de Accesos Directos en Barra de Navegación',
        description: 'Se normalizaron los enlaces principales de navegación entre los módulos operativos.'
    },
    {
        hash: '547a748',
        date: '2026-08-21',
        type: 'feat',
        title: 'Lanzamiento del Módulo de Relevamiento con Exportación a Planilla',
        description: 'Implementación de la estructura base para el registro de controles en terreno y descarga de resultados tabulados.'
    },

    // === 13 de Agosto 2026 ===
    {
        hash: 'b23f004',
        date: '2026-08-13',
        type: 'feat',
        title: 'Edición de Resumen de Caso y Observaciones de Calidad en PDF',
        description: 'Se habilitó la edición manual del resumen ejecutivo del caso y la inclusión de las observaciones de cierre del Comité de Calidad en la ficha PDF.'
    },

    // === 7 de Agosto 2026 ===
    {
        hash: '23b5364',
        date: '2026-08-07',
        type: 'feat',
        title: 'Módulo de Auditoría de Procesos con Listas de Chequeo e Informes',
        description: 'Incorporación del módulo de evaluación de procesos asistenciales con permisos por rol, formularios estructurados y vinculación con hallazgos.'
    },

    // === 6 de Agosto 2026 ===
    {
        hash: '1c626e5',
        date: '2026-08-06',
        type: 'fix',
        title: 'Depuración de Dependencias Visuales en Componentes',
        description: 'Limpieza de íconos no utilizados para mantener una compilación limpia y rápida.'
    },
    {
        hash: '5107646',
        date: '2026-08-06',
        type: 'feat',
        title: 'Separación de Indicadores entre Reportes Recibidos y Emitidos',
        description: 'El panel de Métricas distingue claramente cuántos hallazgos recibió un sector como destinatario y cuántos generó como sector emisor.'
    },
    {
        hash: 'a10f208',
        date: '2026-08-06',
        type: 'fix',
        title: 'Sincronización de Sector Emisor en Filtros y Gráficos de Métricas',
        description: 'Los filtros sectoriales del tablero estadístico ahora contemplan tanto el sector de origen como el sector asignado.'
    },
    {
        hash: '69a6bae',
        date: '2026-08-06',
        type: 'fix',
        title: 'Visualización y Filtrado por Sector Origen y Destino en el Tablero',
        description: 'Se añadieron columnas e indicadores diferenciados para identificar qué servicio originó el reporte y cuál debe resolverlo.'
    },
    {
        hash: 'bbfb36a',
        date: '2026-08-06',
        type: 'fix',
        title: 'Trazabilidad Unificada del Sector Reportante en Todo el Flujo',
        description: 'Se sincronizó el dato del sector de origen entre el formulario de ingreso, el tablero central y la vista de resolución.'
    },

    // === 5 de Agosto 2026 ===
    {
        hash: 'dc754fe',
        date: '2026-08-05',
        type: 'fix',
        title: 'Cálculo Preciso de Demanda Recibida por Sector',
        description: 'Se ajustó el conteo de casos recibidos para no mezclar los reportes emitidos proactivamente por el propio servicio.'
    },
    {
        hash: 'afb317e',
        date: '2026-08-05',
        type: 'fix',
        title: 'Sincronización de Derivaciones Multi-Sector en Estadísticas',
        description: 'El panel de Métricas incorpora todas las asignaciones compartidas entre múltiples servicios.'
    },

    // === 20 de Julio 2026 ===
    {
        hash: 'bbba095',
        date: '2026-07-20',
        type: 'feat',
        title: 'Acceso Rápido de Derivación de Mantenimiento en Asistente Virtual',
        description: 'Se integró un acceso directo en la ventana del asistente para orientar solicitudes edilicias o de mantenimiento al canal correspondiente.'
    },
    {
        hash: '087c332',
        date: '2026-07-20',
        type: 'feat',
        title: 'Aviso Preventivo para Solicitudes de Mantenimiento e Infraestructura',
        description: 'Se añadió una guía interactiva en el formulario de reporte para encauzar pedidos de mantenimiento operativo.'
    },

    // === 17 de Julio 2026 ===
    {
        hash: 'c82afda',
        date: '2026-07-17',
        type: 'fix',
        title: 'Prevención de Tarjetas Duplicadas al Re-derivar en Mis Casos',
        description: 'Se optimizó la consulta de asignaciones para mostrar una única entrada consolidada cuando un caso es reasignado al mismo servicio.'
    },

    // === 15 de Julio 2026 ===
    {
        hash: '924e40f',
        date: '2026-07-15',
        type: 'fix',
        title: 'Corrección de Apertura en Modal de Retroalimentación de Calidad',
        description: 'Se ajustó la lógica de visualización del cuadro de devolución y cierre en el Tablero de Gestión.'
    },
    {
        hash: '3b970fa',
        date: '2026-07-15',
        type: 'feat',
        title: 'Avisos Claros ante Errores de Entrega en Notificaciones Externas',
        description: 'El sistema informa de manera detallada al administrador cuando un número de contacto presenta inconvenientes de recepción.'
    },
    {
        hash: '0e8c00b',
        date: '2026-07-15',
        type: 'fix',
        title: 'Estandarización de Configuración Regional en Plantillas de Aviso',
        description: 'Se alineó el código de idioma regional en los mensajes automáticos para garantizar la entrega inmediata.'
    },
    {
        hash: 'fd9d070',
        date: '2026-07-15',
        type: 'fix',
        title: 'Ajuste de Parámetros en Notificación de Derivación a Responsables',
        description: 'Se normalizó la plantilla utilizada al notificar nuevas asignaciones a líderes de sector.'
    },

    // === 14 de Julio 2026 ===
    {
        hash: '32f5ab5',
        date: '2026-07-14',
        type: 'fix',
        title: 'Saneamiento de Textos y Saltos de Línea en Notificaciones Automáticas',
        description: 'Se incorporó limpieza automática de caracteres especiales en los resúmenes enviados por mensajería.'
    },
    {
        hash: 'bd6ec52',
        date: '2026-07-14',
        type: 'fix',
        title: 'Normalización de Formato Telefónico Nacional en Alertas',
        description: 'Se estandarizó el formato de números móviles para asegurar la compatibilidad con el motor de notificaciones.'
    },
    {
        hash: 'eea0604',
        date: '2026-07-14',
        type: 'fix',
        title: 'Compatibilidad de Numeración Móvil en Envío de Mensajes',
        description: 'Ajuste en el procesamiento de números de contacto para envíos automáticos.'
    },
    {
        hash: 'b90dfaf',
        date: '2026-07-14',
        type: 'feat',
        title: 'Mejoras en Encuesta de Conformidad del Reportante y Tablero',
        description: 'Se perfeccionó el registro de retroalimentación post-cierre y su visualización en el panel de control.'
    },

    // === 24 de Junio 2026 ===
    {
        hash: '449d1b1',
        date: '2026-06-24',
        type: 'fix',
        title: 'Vinculación del Filtro de Tipo de Hallazgo en Tablero y Mis Casos',
        description: 'Se conectó el filtrado por tipología de hallazgo entre las tarjetas de métricas y las listas de casos.'
    },
    {
        hash: '5696c45',
        date: '2026-06-24',
        type: 'feat',
        title: 'Nota Metodológica sobre Reportes sin Riesgo Clínico Asignado',
        description: 'Se incorporó el desglose aclaratorio para distinguir felicitaciones y registros históricos dentro de las métricas de severidad.'
    },
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
