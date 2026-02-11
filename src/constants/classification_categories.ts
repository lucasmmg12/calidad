/**
 * Categorías de clasificación operativa alineadas con Tableau.
 * Estas reemplazan la taxonomía anterior (Evento Adverso, Cuasi Falla, etc.)
 * y son las únicas categorías válidas para el campo ai_category.
 */
export const CLASSIFICATION_CATEGORIES = [
    'Calidez en la atención',
    'Capacitación',
    'Cirugía segura',
    'Comunicación con el paciente',
    'Comunicación efectiva interservicios',
    'Demora en la atención',
    'Gestión de turnos',
    'Identificación del paciente',
    'Mantenimiento e infraestructura',
    'Prácticas administrativas',
    'Prácticas asistenciales',
    'Recursos e insumos',
    'Riesgo de caídas',
    'Seguridad de los medicamentos',
    'Sistema informático',
] as const;

export type ClassificationCategory = typeof CLASSIFICATION_CATEGORIES[number] | 'Sin clasificar';
