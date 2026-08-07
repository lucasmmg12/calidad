import type {
    ProcessAuditReport,
    SectorProcessConfig,
    AuditSchedule,
    AuditChecklistItem
} from '../types/processAudit';

const LOCAL_STORAGE_KEY_REPORTS = 'dora_process_audits_mock_v1';
const LOCAL_STORAGE_KEY_SCHEDULES = 'dora_process_schedules_mock_v1';

// Plantillas de Procesos y Checklists por Sector
export const MOCK_SECTOR_CONFIGS: Record<string, SectorProcessConfig> = {
    'REC-S1-Recepcion-Sede-1': {
        sectorId: 'REC-S1-Recepcion-Sede-1',
        sectorLabel: 'Recepción Sede 1',
        templates: [
            {
                id: 'rec-1',
                processName: 'Recepción e Identificación del Paciente',
                category: 'Seguridad del Paciente',
                itemText: '¿Se verifica doble identificación del paciente (DNI + Nombre completo) en la admisión?',
                description: 'Verificar protocolo institucional de prevención de errores de filiación.'
            },
            {
                id: 'rec-2',
                processName: 'Recepción e Identificación del Paciente',
                category: 'Trazabilidad y Documentación',
                itemText: '¿Se escanea e ingresa correctamente la orden de derivación u obra social en el sistema?',
                description: 'Cotejar con sistema de validación online de prepagas.'
            },
            {
                id: 'rec-3',
                processName: 'Gestión de Tiempos de Espera en Sala',
                category: 'Calidez y Tiempos de Atención',
                itemText: '¿El tiempo de espera en ventanilla para pacientes preferenciales es menor a 10 minutos?',
                description: 'Medido según ticketera del Contact Center / Totem.'
            },
            {
                id: 'rec-4',
                processName: 'Bioseguridad y Orden en Mostrador',
                category: 'Bioseguridad e Higiene',
                itemText: '¿El mostrador de atención cuenta con alcohol en gel visible y mampara higienizada?',
                description: 'Inspección visual del área de atención al público.'
            },
            {
                id: 'rec-5',
                processName: 'Calidez y Manejo de Reclamos',
                category: 'Calidez y Tiempos de Atención',
                itemText: '¿Se brinda información clara y folletería interactiva DORA para reclamos o sugerencias?',
                description: 'Disponibilidad del código QR de DORA en la sala de espera.'
            }
        ]
    },
    'QUI-Quirofano': {
        sectorId: 'QUI-Quirofano',
        sectorLabel: 'Quirófano',
        templates: [
            {
                id: 'qui-1',
                processName: 'Lista de Chequeo de Cirugía Segura',
                category: 'Seguridad del Paciente',
                itemText: '¿Se realiza la pausa quirúrgica (Time-Out) en el 100% de los procedimientos antes de la incisión?',
                description: 'Verificación tripartita (Cirujano, Anestesiólogo, Instrumentadora).'
            },
            {
                id: 'qui-2',
                processName: 'Marcación de Sitio Quirúrgico',
                category: 'Seguridad del Paciente',
                itemText: '¿El sitio quirúrgico está claramente marcado por el cirujano tratante antes del ingreso a quirófano?',
                description: 'Protocolo OMS de prevención de eventos centinela.'
            },
            {
                id: 'qui-3',
                processName: 'Control de Esterilización de Insumos',
                category: 'Bioseguridad e Higiene',
                itemText: '¿Todos los paquetes de instrumental quirúrgico cuentan con indicador químico virado adecuadamente?',
                description: 'Registro en planilla de trazabilidad de esterilización.'
            },
            {
                id: 'qui-4',
                processName: 'Conteo de Gasas y Compresas',
                category: 'Seguridad del Paciente',
                itemText: '¿Se registra el conteo inicial y final de compresas en el formulario quirúrgico de la historia clínica?',
                description: 'Firma de la instrumentadora antes del cierre de cavidad.'
            },
            {
                id: 'qui-5',
                processName: 'Mantenimiento de Quirófanos',
                category: 'Infraestructura y Equipamiento',
                itemText: '¿Las presiones positivas y filtros de aire HEPA de salas quirúrgicas están calibrados y registrados?',
                description: 'Cotejo con cuaderno de mantenimiento técnico.'
            }
        ]
    },
    'LAB-Laboratorio-Analisis-Clinicos': {
        sectorId: 'LAB-Laboratorio-Analisis-Clinicos',
        sectorLabel: 'Laboratorio de Análisis Clínicos',
        templates: [
            {
                id: 'lab-1',
                processName: 'Trazabilidad y Rotulado de Muestras',
                category: 'Trazabilidad y Documentación',
                itemText: '¿Todas las muestras biológicas se identifican con código de barras a la vista del paciente?',
                description: 'Verificación del flujo en box de extracción.'
            },
            {
                id: 'lab-2',
                processName: 'Gestión de Valores Críticos',
                category: 'Seguridad del Paciente',
                itemText: '¿Se notifica en menos de 15 minutos al médico tratante ante un valor crítico de laboratorio?',
                description: 'Registro de comunicación telefónica en el LIS.'
            },
            {
                id: 'lab-3',
                processName: 'Calibración y Control de Calidad Analítico',
                category: 'Infraestructura y Equipamiento',
                itemText: '¿Se corren controles de calidad internos diarios (Levey-Jennings) antes de procesar muestras de pacientes?',
                description: 'Revisión de gráficos de control por el bioquímico responsable.'
            },
            {
                id: 'lab-4',
                processName: 'Bioseguridad y Manejo de Residuos Patogénicos',
                category: 'Bioseguridad e Higiene',
                itemText: '¿Los contenedores para corto-punzantes se descartan al alcanzar las 3/4 partes de su capacidad?',
                description: 'Cumplimiento estricto de norma de bioseguridad.'
            }
        ]
    },
    'DXI-S1-Diagnostico-Imagenes-Sede-1': {
        sectorId: 'DXI-S1-Diagnostico-Imagenes-Sede-1',
        sectorLabel: 'Diagnóstico por Imágenes Sede 1',
        templates: [
            {
                id: 'dxi-1',
                processName: 'Consentimiento Informado y Alergias',
                category: 'Seguridad del Paciente',
                itemText: '¿Se indaga y registra la presencia de alergias al yodo o insuficiencia renal antes de estudios con contraste?',
                description: 'Formulario de consentimiento firmado en HC digital.'
            },
            {
                id: 'dxi-2',
                processName: 'Protección Radiológica',
                category: 'Bioseguridad e Higiene',
                itemText: '¿El personal y acompañantes disponen y usan elementos de protección plomados (chalecos, cuello tiroideo)?',
                description: 'Verificación visual e integridad de los delantales.'
            },
            {
                id: 'dxi-3',
                processName: 'Oportunidad de Informes Médicos',
                category: 'Calidez y Tiempos de Atención',
                itemText: '¿Los informes de tomografía y resonancia urgentes son subidos al sistema PACS en menos de 2 horas?',
                description: 'Monitoreo de tiempos de entrega en guardia.'
            }
        ]
    },
    'INT-Internado-Adultos': {
        sectorId: 'INT-Internado-Adultos',
        sectorLabel: 'Internado de Adultos',
        templates: [
            {
                id: 'int-1',
                processName: 'Administración Segura de Medicamentos',
                category: 'Seguridad del Paciente',
                itemText: '¿Se aplica la regla de los 5 Correctos (Paciente, Dosis, Vía, Hora, Fármaco) al administrar medicación?',
                description: 'Auditoría en pasarelas de enfermería.'
            },
            {
                id: 'int-2',
                processName: 'Prevención de Caídas de Pacientes',
                category: 'Seguridad del Paciente',
                itemText: '¿Las barandas de las camas permanecen elevadas y el timbre de llamada al alcance del paciente?',
                description: 'Escala de Morse registrada en el turno.'
            },
            {
                id: 'int-3',
                processName: 'Higiene de Manos',
                category: 'Bioseguridad e Higiene',
                itemText: '¿El personal de enfermería cumple con los 5 momentos de Higiene de Manos según la OMS?',
                description: 'Observación directa de prácticas clínicas.'
            }
        ]
    }
};

// Plantilla por defecto para cualquier otro sector no configurado expresamente
export function getDefaultTemplatesForSector(sectorId: string, sectorLabel: string): SectorProcessConfig {
    if (MOCK_SECTOR_CONFIGS[sectorId]) {
        return MOCK_SECTOR_CONFIGS[sectorId];
    }
    return {
        sectorId,
        sectorLabel,
        templates: [
            {
                id: `${sectorId}-gen-1`,
                processName: 'Trazabilidad y Registro Operativo',
                category: 'Trazabilidad y Documentación',
                itemText: '¿Se registran oportunamente los procedimientos y movimientos en el sistema informático?',
                description: 'Verificación de completitud de registros del servicio.'
            },
            {
                id: `${sectorId}-gen-2`,
                processName: 'Seguridad y Cumplimiento Normativo',
                category: 'Seguridad del Paciente',
                itemText: '¿Se cumplen las guías de práctica clínica y protocolos de seguridad del Sanatorio?',
                description: 'Evaluación de protocolos del sector.'
            },
            {
                id: `${sectorId}-gen-3`,
                processName: 'Higiene y Conservación del Espacio',
                category: 'Bioseguridad e Higiene',
                itemText: '¿El espacio de trabajo se mantiene limpio, libre de obstáculos y con insumos vigentes?',
                description: 'Revisión del puesto de trabajo e inventario.'
            },
            {
                id: `${sectorId}-gen-4`,
                processName: 'Atención y Solución de Requerimientos',
                category: 'Calidez y Tiempos de Atención',
                itemText: '¿Se resuelven los pedidos internos y externos dentro de las metas de tiempo del sector?',
                description: 'Evaluación de nivel de servicio percibido.'
            }
        ]
    };
}

// Datos de demostración iniciales
const INITIAL_MOCK_REPORTS: ProcessAuditReport[] = [
    {
        id: 'aud-2026-rec-001',
        auditNumber: 'AUD-2026-REC-001',
        sectorId: 'REC-S1-Recepcion-Sede-1',
        sectorName: 'Recepción Sede 1',
        auditorName: 'Lic. Mariana Gómez (Calidad)',
        auditorRole: 'Calidad / Admin',
        auditDate: '2026-08-04T10:30:00Z',
        status: 'completada',
        scorePercent: 92,
        generalSummary: 'Auditoría con excelente desempeño en filiación e identificación de pacientes. Se evidencia cumplimiento riguroso en mamparas y gel, requiriendo ajustar tiempos de espera en horas pico.',
        items: [
            {
                id: 'rec-1',
                processName: 'Recepción e Identificación del Paciente',
                category: 'Seguridad del Paciente',
                itemText: '¿Se verifica doble identificación del paciente (DNI + Nombre completo) en la admisión?',
                answer: 'cumple',
                observation: 'Cotejado en 15 admisiones presenciales sucesivas.'
            },
            {
                id: 'rec-2',
                processName: 'Recepción e Identificación del Paciente',
                category: 'Trazabilidad y Documentación',
                itemText: '¿Se escanea e ingresa correctamente la orden de derivación u obra social en el sistema?',
                answer: 'cumple',
                observation: 'Digitalización inmediata en el sistema.'
            },
            {
                id: 'rec-3',
                processName: 'Gestión de Tiempos de Espera en Sala',
                category: 'Calidez y Tiempos de Atención',
                itemText: '¿El tiempo de espera en ventanilla para pacientes preferenciales es menor a 10 minutos?',
                answer: 'parcial',
                observation: 'El promedio registrado en el tótem fue de 13.5 minutos entre las 08:30 y las 10:00 hs.'
            },
            {
                id: 'rec-4',
                processName: 'Bioseguridad y Orden en Mostrador',
                category: 'Bioseguridad e Higiene',
                itemText: '¿El mostrador de atención cuenta con alcohol en gel visible y mampara higienizada?',
                answer: 'cumple'
            },
            {
                id: 'rec-5',
                processName: 'Calidez y Manejo de Reclamos',
                category: 'Calidez y Tiempos de Atención',
                itemText: '¿Se brinda información clara y folletería interactiva DORA para reclamos o sugerencias?',
                answer: 'cumple',
                observation: 'Cartelería DORA visible con QR funcional.'
            }
        ],
        fortalezas: [
            {
                id: 'fort-1',
                processName: 'Recepción e Identificación del Paciente',
                description: '100% de apego al doble chequeo de filiación con DNI en ventanilla.',
                highlight: 'Práctica consolidada en el equipo de Recepción Sede 1.'
            }
        ],
        observaciones: [
            {
                id: 'obs-1',
                processName: 'Gestión de Tiempos de Espera en Sala',
                description: 'Picos de demora en admisión matutina (08:30 - 10:00 hs).',
                recommendation: 'Reforzar ventanilla preferencial con personal de apoyo en horario pico.'
            }
        ],
        oportunidadesMejora: [
            {
                id: 'om-101',
                title: 'Optimización de Turnero Electrónico para Pacientes Preferenciales',
                description: 'Implementar derivación automática en el sistema tótem de Contact Center cuando la fila supere 5 pacientes.',
                processName: 'Gestión de Tiempos de Espera en Sala',
                category: 'Calidez y Tiempos de Atención',
                doraTicketId: 'OM-2026-089',
                doraStatus: 'en_proceso'
            }
        ],
        desvios: []
    },
    {
        id: 'aud-2026-qui-002',
        auditNumber: 'AUD-2026-QUI-002',
        sectorId: 'QUI-Quirofano',
        sectorName: 'Quirófano',
        auditorName: 'Dr. Roberto Fernández (Calidad)',
        auditorRole: 'Calidad / Admin',
        auditDate: '2026-08-01T14:15:00Z',
        status: 'desvio_abierto',
        scorePercent: 78,
        generalSummary: 'Auditoría en área quirúrgica. Se detectan desvíos en el registro puntual de conteo de compresas en 2 cirugías auditadas, requiriendo acción correctiva inmediata.',
        items: [
            {
                id: 'qui-1',
                processName: 'Lista de Chequeo de Cirugía Segura',
                category: 'Seguridad del Paciente',
                itemText: '¿Se realiza la pausa quirúrgica (Time-Out) en el 100% de los procedimientos antes de la incisión?',
                answer: 'cumple',
                observation: 'Time-out verbal confirmado en 4 procedimientos.'
            },
            {
                id: 'qui-2',
                processName: 'Marcación de Sitio Quirúrgico',
                category: 'Seguridad del Paciente',
                itemText: '¿El sitio quirúrgico está claramente marcado por el cirujano tratante antes del ingreso a quirófano?',
                answer: 'cumple'
            },
            {
                id: 'qui-3',
                processName: 'Control de Esterilización de Insumos',
                category: 'Bioseguridad e Higiene',
                itemText: '¿Todos los paquetes de instrumental quirúrgico cuentan con indicador químico virado adecuadamente?',
                answer: 'cumple'
            },
            {
                id: 'qui-4',
                processName: 'Conteo de Gasas y Compresas',
                category: 'Seguridad del Paciente',
                itemText: '¿Se registra el conteo inicial y final de compresas en el formulario quirúrgico de la historia clínica?',
                answer: 'no_cumple',
                observation: 'Faltó la firma de la instrumentadora en la planilla física de 2 partes intervencionistas.'
            },
            {
                id: 'qui-5',
                processName: 'Mantenimiento de Quirófanos',
                category: 'Infraestructura y Equipamiento',
                itemText: '¿Las presiones positivas y filtros de aire HEPA de salas quirúrgicas están calibrados y registrados?',
                answer: 'parcial',
                observation: 'Filtros limpios pero falta firma técnica del mes de julio.'
            }
        ],
        fortalezas: [
            {
                id: 'fort-qui-1',
                processName: 'Lista de Chequeo de Cirugía Segura',
                description: 'Cultura de Time-Out afianzada en anestesiólogos e instrumentadoras.',
                highlight: 'Pausa quirúrgica rigurosa.'
            }
        ],
        observaciones: [
            {
                id: 'obs-qui-1',
                processName: 'Mantenimiento de Quirófanos',
                description: 'La planilla física de calibración HEPA requiere digitalización.',
                recommendation: 'Vincular planilla al módulo Mantenimiento en DORA.'
            }
        ],
        oportunidadesMejora: [
            {
                id: 'om-qui-1',
                title: 'Digitalización de Lista de Conteo Quirúrgico',
                description: 'Integrar la planilla de conteo de gasas directamente en el tablero de la pantalla táctil de Quirófano.',
                processName: 'Conteo de Gasas y Compresas',
                category: 'Seguridad del Paciente',
                doraTicketId: 'OM-2026-104',
                doraStatus: 'pendiente'
            }
        ],
        desvios: [
            {
                id: 'desv-qui-1',
                title: 'Omisión de Firma en Registro de Conteo de Compresas',
                description: 'Se hallaron 2 partes quirúrgicos sin la firma de cierre de conteo de compresas por parte del equipo de instrumentación.',
                processName: 'Conteo de Gasas y Compresas',
                riskLevel: 'alto',
                actionPlan: 'Re-capacitación obligatoria a la plantilla de instrumentadoras y auditoría diaria sorpresiva durante 14 días.',
                responsiblePerson: 'Lic. Claudia Rossi (Jefa de Quirófano)',
                deadline: '2026-08-15',
                status: 'en_accion',
                doraTicketId: 'CASO-2026-112',
                doraStatus: 'en_proceso'
            }
        ]
    },
    {
        id: 'aud-2026-lab-003',
        auditNumber: 'AUD-2026-LAB-003',
        sectorId: 'LAB-Laboratorio-Analisis-Clinicos',
        sectorName: 'Laboratorio de Análisis Clínicos',
        auditorName: 'Bioq. Esteban Martínez',
        auditorRole: 'Responsable de Servicio',
        auditDate: '2026-07-28T09:00:00Z',
        status: 'completada',
        scorePercent: 96,
        generalSummary: 'Auto-auditoría trimestral de Laboratorio. Excelentes indicadores en control de calidad analítico y bioseguridad. Cumplimiento perfecto en valores críticos.',
        items: [
            {
                id: 'lab-1',
                processName: 'Trazabilidad y Rotulado de Muestras',
                category: 'Trazabilidad y Documentación',
                itemText: '¿Todas las muestras biológicas se identifican con código de barras a la vista del paciente?',
                answer: 'cumple'
            },
            {
                id: 'lab-2',
                processName: 'Gestión de Valores Críticos',
                category: 'Seguridad del Paciente',
                itemText: '¿Se notifica en menos de 15 minutos al médico tratante ante un valor crítico de laboratorio?',
                answer: 'cumple'
            },
            {
                id: 'lab-3',
                processName: 'Calibración y Control de Calidad Analítico',
                category: 'Infraestructura y Equipamiento',
                itemText: '¿Se corren controles de calidad internos diarios (Levey-Jennings) antes de procesar muestras de pacientes?',
                answer: 'cumple'
            },
            {
                id: 'lab-4',
                processName: 'Bioseguridad y Manejo de Residuos Patogénicos',
                category: 'Bioseguridad e Higiene',
                itemText: '¿Los contenedores para corto-punzantes se descartan al alcanzar las 3/4 partes de su capacidad?',
                answer: 'cumple'
            }
        ],
        fortalezas: [
            {
                id: 'fort-lab-1',
                processName: 'Gestión de Valores Críticos',
                description: 'Tiempos de aviso de valores críticos promedio de 6 minutos (meta <15 min).',
                highlight: 'Excelencia en comunicación médica.'
            }
        ],
        observaciones: [],
        oportunidadesMejora: [
            {
                id: 'om-lab-1',
                title: 'Alertas Automatizadas de Valores Críticos vía DORA / WhatsApp',
                description: 'Conectar el LIS de laboratorio con la API de DORA WhatsApp para notificaciones directas al profesional.',
                processName: 'Gestión de Valores Críticos',
                category: 'Seguridad del Paciente',
                doraTicketId: 'OM-2026-072',
                doraStatus: 'resuelto'
            }
        ],
        desvios: []
    }
];

const INITIAL_MOCK_SCHEDULES: AuditSchedule[] = [
    {
        id: 'sch-1',
        sectorId: 'REC-S1-Recepcion-Sede-1',
        sectorName: 'Recepción Sede 1',
        scheduledDate: '2026-08-04',
        auditorAssigned: 'Lic. Mariana Gómez',
        period: 'Q3',
        year: 2026,
        status: 'completada',
        lastScore: 92,
        auditId: 'aud-2026-rec-001'
    },
    {
        id: 'sch-2',
        sectorId: 'QUI-Quirofano',
        sectorName: 'Quirófano',
        scheduledDate: '2026-08-01',
        auditorAssigned: 'Dr. Roberto Fernández',
        period: 'Q3',
        year: 2026,
        status: 'desvio_abierto',
        lastScore: 78,
        auditId: 'aud-2026-qui-002'
    },
    {
        id: 'sch-3',
        sectorId: 'LAB-Laboratorio-Analisis-Clinicos',
        sectorName: 'Laboratorio de Análisis Clínicos',
        scheduledDate: '2026-07-28',
        auditorAssigned: 'Bioq. Esteban Martínez',
        period: 'Q3',
        year: 2026,
        status: 'completada',
        lastScore: 96,
        auditId: 'aud-2026-lab-003'
    },
    {
        id: 'sch-4',
        sectorId: 'DXI-S1-Diagnostico-Imagenes-Sede-1',
        sectorName: 'Diagnóstico por Imágenes Sede 1',
        scheduledDate: '2026-08-18',
        auditorAssigned: 'Lic. Mariana Gómez',
        period: 'Q3',
        year: 2026,
        status: 'programada'
    },
    {
        id: 'sch-5',
        sectorId: 'INT-Internado-Adultos',
        sectorName: 'Internado de Adultos',
        scheduledDate: '2026-08-25',
        auditorAssigned: 'Enf. Patricia Blanco',
        period: 'Q3',
        year: 2026,
        status: 'programada'
    },
    {
        id: 'sch-6',
        sectorId: 'FACT-INT-Facturacion-Internado',
        sectorName: 'Facturación Internado',
        scheduledDate: '2026-09-02',
        auditorAssigned: 'Cont. Carlos Ruiz',
        period: 'Q3',
        year: 2026,
        status: 'programada'
    }
];

export class ProcessAuditService {
    // Carga de informes desde LocalStorage o Mock por defecto
    static getReports(): ProcessAuditReport[] {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY_REPORTS);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[ProcessAuditService] Error loading reports:', e);
        }
        // Guardar iniciales
        this.saveReportsToStorage(INITIAL_MOCK_REPORTS);
        return INITIAL_MOCK_REPORTS;
    }

    // Carga de cronograma
    static getSchedules(): AuditSchedule[] {
        try {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY_SCHEDULES);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[ProcessAuditService] Error loading schedules:', e);
        }
        this.saveSchedulesToStorage(INITIAL_MOCK_SCHEDULES);
        return INITIAL_MOCK_SCHEDULES;
    }

    private static saveReportsToStorage(reports: ProcessAuditReport[]) {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY_REPORTS, JSON.stringify(reports));
        } catch (e) {
            console.error('[ProcessAuditService] Error saving reports:', e);
        }
    }

    private static saveSchedulesToStorage(schedules: AuditSchedule[]) {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY_SCHEDULES, JSON.stringify(schedules));
        } catch (e) {
            console.error('[ProcessAuditService] Error saving schedules:', e);
        }
    }

    // Resetear a datos iniciales demo
    static resetMockData(): void {
        localStorage.removeItem(LOCAL_STORAGE_KEY_REPORTS);
        localStorage.removeItem(LOCAL_STORAGE_KEY_SCHEDULES);
        this.saveReportsToStorage(INITIAL_MOCK_REPORTS);
        this.saveSchedulesToStorage(INITIAL_MOCK_SCHEDULES);
    }

    // Calcular el porcentaje ponderado de cumplimiento
    static calculateScorePercent(items: AuditChecklistItem[]): number {
        const validItems = items.filter(i => i.answer !== 'no_aplica');
        if (validItems.length === 0) return 100;

        let totalPoints = 0;
        validItems.forEach(item => {
            if (item.answer === 'cumple') totalPoints += 100;
            else if (item.answer === 'parcial') totalPoints += 50;
            else if (item.answer === 'no_cumple') totalPoints += 0;
        });

        return Math.round(totalPoints / validItems.length);
    }

    // Guardar o actualizar un informe de auditoría
    static saveAudit(report: ProcessAuditReport): ProcessAuditReport {
        const reports = this.getReports();
        const existingIdx = reports.findIndex(r => r.id === report.id);

        if (existingIdx >= 0) {
            reports[existingIdx] = report;
        } else {
            reports.unshift(report);
        }

        this.saveReportsToStorage(reports);

        // Actualizar estado en el cronograma si corresponde
        const schedules = this.getSchedules();
        const schedIdx = schedules.findIndex(s => s.sectorId === report.sectorId && s.status !== 'completada');
        if (schedIdx >= 0) {
            schedules[schedIdx].status = report.status;
            schedules[schedIdx].lastScore = report.scorePercent;
            schedules[schedIdx].auditId = report.id;
            this.saveSchedulesToStorage(schedules);
        }

        return report;
    }

    // Vincular una OM o Desvío a un caso / ticket en DORA
    static linkFindingToDora(
        auditId: string,
        type: 'om' | 'desvio',
        findingId: string,
        doraTicketId: string
    ): ProcessAuditReport | null {
        const reports = this.getReports();
        const audit = reports.find(r => r.id === auditId);
        if (!audit) return null;

        if (type === 'om') {
            const item = audit.oportunidadesMejora.find(o => o.id === findingId);
            if (item) {
                item.doraTicketId = doraTicketId;
                item.doraStatus = 'en_proceso';
            }
        } else {
            const item = audit.desvios.find(d => d.id === findingId);
            if (item) {
                item.doraTicketId = doraTicketId;
                item.doraStatus = 'en_proceso';
            }
        }

        this.saveReportsToStorage(reports);
        return audit;
    }
}
