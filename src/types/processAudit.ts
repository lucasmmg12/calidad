export type AuditAnswer = 'cumple' | 'parcial' | 'no_cumple' | 'no_aplica';

export type RiskLevel = 'critico' | 'alto' | 'medio' | 'bajo';

export type AuditStatus = 'programada' | 'en_curso' | 'completada' | 'desvio_abierto' | 'vencida';

export interface AuditChecklistItem {
    id: string;
    processName: string; // e.g. "Recepción e Identificación del Paciente"
    category: 'Seguridad del Paciente' | 'Trazabilidad y Documentación' | 'Bioseguridad e Higiene' | 'Calidez y Tiempos de Atención' | 'Infraestructura y Equipamiento';
    itemText: string; // Question/item to audit
    description?: string; // Guidance note for auditor
    answer: AuditAnswer;
    observation?: string;
    evidenceUrl?: string; // Mock attachment URL
}

export interface Fortaleza {
    id: string;
    description: string;
    processName: string;
    highlight: string;
}

export interface Observacion {
    id: string;
    description: string;
    processName: string;
    recommendation?: string;
}

export interface OportunidadMejora {
    id: string;
    title: string;
    description: string;
    processName: string;
    category: string;
    doraTicketId?: string; // Linked DORA case/ticket ID (e.g., "OM-2026-104")
    doraStatus?: 'pendiente' | 'en_proceso' | 'resuelto';
}

export interface Desvio {
    id: string;
    title: string;
    description: string;
    processName: string;
    riskLevel: RiskLevel;
    actionPlan: string;
    responsiblePerson: string;
    deadline: string; // ISO date string
    status: 'abierto' | 'en_accion' | 'resuelto';
    doraTicketId?: string; // Linked DORA case/ticket ID for resolution (e.g. "CASO-2026-088")
    doraStatus?: 'pendiente' | 'en_proceso' | 'resuelto';
}

export interface ProcessAuditReport {
    id: string;
    auditNumber: string; // e.g. "AUD-2026-REC-001"
    sectorId: string; // Matches SECTOR_OPTIONS value
    sectorName: string;
    auditorName: string;
    auditorRole: string;
    auditDate: string; // ISO string
    status: AuditStatus;
    scorePercent: number; // 0 to 100
    items: AuditChecklistItem[];
    fortalezas: Fortaleza[];
    observaciones: Observacion[];
    oportunidadesMejora: OportunidadMejora[];
    desvios: Desvio[];
    generalSummary?: string;
}

export interface ProcessTemplateItem {
    id: string;
    processName: string;
    category: 'Seguridad del Paciente' | 'Trazabilidad y Documentación' | 'Bioseguridad e Higiene' | 'Calidez y Tiempos de Atención' | 'Infraestructura y Equipamiento';
    itemText: string;
    description?: string;
}

export interface SectorProcessConfig {
    sectorId: string;
    sectorLabel: string;
    icon?: string;
    templates: ProcessTemplateItem[];
}

export interface AuditSchedule {
    id: string;
    sectorId: string;
    sectorName: string;
    scheduledDate: string;
    auditorAssigned: string;
    period: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    year: number;
    status: AuditStatus;
    lastScore?: number;
    auditId?: string;
}
