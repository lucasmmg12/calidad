export interface ResolutionFormData {
  reportId: string;
  isAdverseEvent: boolean; // Flag enviado por Calidad
  reportSummary: string;
  
  // Bloque Inmediato
  immediateAction: string;
  evidenceUrl?: string;

  // Bloque de Fondo (Solo si isAdverseEvent = true)
  rootCause?: string;
  correctivePlan?: string;
  implementationDate?: string;
}

export type ResolutionStatus = 'pending' | 'submitted' | 'error';
