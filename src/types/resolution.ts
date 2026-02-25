export interface ResolutionFormData {
  reportId: string;
  isAdverseEvent: boolean; // Flag enviado por Calidad
  reportSummary: string;

  // Bloque Inmediato
  immediateAction: string;
  evidenceUrls: string[];

  // Flag: true when only Step 1 is being submitted (adverse events)
  isStep1Only?: boolean;

  // Bloque de Fondo (Solo si isAdverseEvent = true)
  rootCause?: string;
  correctivePlan?: string;
  implementationDate?: string;
}

export type ResolutionStatus = 'pending' | 'submitted' | 'error';
