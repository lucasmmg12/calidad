/**
 * Opciones de Origen para el formulario de reporte.
 * Define de dónde proviene el hallazgo (tipo de auditoría, observación, reclamo).
 */
export const ORIGIN_OPTIONS = [
    { value: 'AUD_FDS', label: 'AUD FDS' },
    { value: 'AUD_PROC', label: 'AUD PROC' },
    { value: 'AUD_SOL', label: 'AUD SOL' },
    { value: 'AUD_EXTERNA', label: 'AUD EXTERNA' },
    { value: 'OBSERVACION_HALLAZGO', label: 'OBSERVACIONES/HALLAZGO' },
    { value: 'RECLAMO_PACIENTE', label: 'RECLAMO DE PACIENTE' },
] as const;

export type OriginType = typeof ORIGIN_OPTIONS[number]['value'];
