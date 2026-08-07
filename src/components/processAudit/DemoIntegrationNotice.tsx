import React, { useState } from 'react';
import { Database, Code2, Sparkles, CheckCircle2, ArrowRight, X } from 'lucide-react';

interface DemoIntegrationNoticeProps {
    onClose?: () => void;
}

export const DemoIntegrationNotice: React.FC<DemoIntegrationNoticeProps> = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    return (
        <div className="mb-6 bg-gradient-to-r from-blue-950 via-slate-900 to-sanatorio-primary text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-blue-800/40 relative overflow-hidden transition-all">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-sanatorio-secondary/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl text-sanatorio-secondary border border-white/10 shrink-0">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="bg-sanatorio-secondary text-slate-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                                Modo Demo
                            </span>
                            <h3 className="font-bold text-base text-white">Auditoría de Procesos DORA</h3>
                        </div>
                        <p className="text-xs text-blue-200/90 mt-0.5">
                            Experiencia 100% interactiva con datos locales de Sanatorio Argentino y vinculación directa con el sistema DORA.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                        <Code2 className="w-3.5 h-3.5" />
                        {isExpanded ? 'Ocultar Guía DB' : 'Ver Guía Técnica DB'}
                    </button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1.5 text-blue-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Cerrar aviso"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/10 text-xs text-blue-100/90 space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/5 font-mono">
                            <div className="flex items-center gap-2 font-bold text-sanatorio-secondary mb-2">
                                <Database className="w-4 h-4" /> Esquema Supabase Sugerido: `process_audits`
                            </div>
                            <pre className="text-[11px] leading-relaxed text-blue-200 overflow-x-auto">
                                {`CREATE TABLE process_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_number TEXT UNIQUE NOT NULL,
  sector_id TEXT NOT NULL,
  auditor_name TEXT NOT NULL,
  auditor_role TEXT NOT NULL,
  audit_date TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL,
  score_percent INT NOT NULL,
  items JSONB NOT NULL,
  fortalezas JSONB,
  observaciones JSONB,
  oportunidades_mejora JSONB,
  desvios JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);`}
                            </pre>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-white flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Vinculación Integral con DORA:
                            </h4>
                            <ul className="space-y-1.5 text-blue-200 text-xs pl-2">
                                <li className="flex items-start gap-2">
                                    <ArrowRight className="w-3.5 h-3.5 text-sanatorio-secondary shrink-0 mt-0.5" />
                                    <span><strong>Oportunidades de Mejora (OM):</strong> Al detectar hallazgos, se genera un ticket en DORA (ej. `OM-2026-XXX`) conectando con el tablero PDCA.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <ArrowRight className="w-3.5 h-3.5 text-sanatorio-secondary shrink-0 mt-0.5" />
                                    <span><strong>Desvíos e Incumplimientos:</strong> Se abre un caso DORA (`CASO-2026-XXX`) con asignación de responsable, fecha límite y severidad.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <ArrowRight className="w-3.5 h-3.5 text-sanatorio-secondary shrink-0 mt-0.5" />
                                    <span><strong>Filtro de Roles:</strong> El <em>Responsable de Servicio</em> solo visualiza su sector; el rol <em>Calidad / Admin</em> supervisa la totalidad de la institución.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
