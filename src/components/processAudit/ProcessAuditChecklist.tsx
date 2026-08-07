import React, { useState } from 'react';
import type {
    ProcessAuditReport,
    AuditChecklistItem,
    AuditAnswer,
    Fortaleza,
    Observacion,
    OportunidadMejora,
    Desvio,
    RiskLevel
} from '../../types/processAudit';
import {
    getDefaultTemplatesForSector,
    ProcessAuditService
} from '../../services/processAuditService';
import {
    CheckCircle2,
    AlertCircle,
    Plus,
    Trash2,
    UploadCloud,
    Building2,
    Sparkles,
    ShieldAlert,
    ExternalLink,
    Send
} from 'lucide-react';
import { SECTOR_OPTIONS } from '../../constants/sectors';

interface ProcessAuditChecklistProps {
    initialSectorId: string;
    auditorName: string;
    auditorRole: string;
    onAuditComplete: (report: ProcessAuditReport) => void;
    onCancel: () => void;
}

export const ProcessAuditChecklist: React.FC<ProcessAuditChecklistProps> = ({
    initialSectorId,
    auditorName,
    auditorRole,
    onAuditComplete,
    onCancel
}) => {
    // Definir sector actual y plantilla
    const effectiveSectorId = initialSectorId === 'ALL' ? 'REC-S1-Recepcion-Sede-1' : initialSectorId;
    const sectorOption = SECTOR_OPTIONS.find(s => s.value === effectiveSectorId) || SECTOR_OPTIONS[0];

    const [sectorId, setSectorId] = useState<string>(effectiveSectorId);
    const config = getDefaultTemplatesForSector(sectorId, sectorOption.label);

    // Inicializar checklist de items
    const [items, setItems] = useState<AuditChecklistItem[]>(() => {
        return config.templates.map(t => ({
            id: t.id,
            processName: t.processName,
            category: t.category,
            itemText: t.itemText,
            description: t.description,
            answer: 'cumple',
            observation: ''
        }));
    });

    // Formulario cualitativo
    const [generalSummary, setGeneralSummary] = useState('');
    const [fortalezas, setFortalezas] = useState<Fortaleza[]>([]);
    const [observaciones, setObservaciones] = useState<Observacion[]>([]);
    const [oportunidadesMejora, setOportunidadesMejora] = useState<OportunidadMejora[]>([]);
    const [desvios, setDesvios] = useState<Desvio[]>([]);

    // Estados para nuevos hallazgos
    const [newFortaleza, setNewFortaleza] = useState({ processName: '', description: '', highlight: '' });
    const [newObs, setNewObs] = useState({ processName: '', description: '', recommendation: '' });
    const [newOM, setNewOM] = useState({ title: '', description: '', processName: '', autoLinkDora: true });
    const [newDesvio, setNewDesvio] = useState<{
        title: string;
        description: string;
        processName: string;
        riskLevel: RiskLevel;
        actionPlan: string;
        responsiblePerson: string;
        deadline: string;
        autoLinkDora: boolean;
    }>({
        title: '',
        description: '',
        processName: '',
        riskLevel: 'medio',
        actionPlan: '',
        responsiblePerson: '',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        autoLinkDora: true
    });

    const [mockEvidenceFile, setMockEvidenceFile] = useState<string | null>(null);

    // Re-cargar la plantilla si cambia de sector el usuario
    const handleSectorSelect = (newSecId: string) => {
        setSectorId(newSecId);
        const newSecOption = SECTOR_OPTIONS.find(s => s.value === newSecId) || SECTOR_OPTIONS[0];
        const newConfig = getDefaultTemplatesForSector(newSecId, newSecOption.label);
        setItems(newConfig.templates.map(t => ({
            id: t.id,
            processName: t.processName,
            category: t.category,
            itemText: t.itemText,
            description: t.description,
            answer: 'cumple',
            observation: ''
        })));
    };

    // Actualizar respuesta de un ítem
    const handleAnswerChange = (itemId: string, answer: AuditAnswer) => {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, answer } : i));
    };

    // Actualizar observación de un ítem
    const handleItemObservation = (itemId: string, obs: string) => {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, observation: obs } : i));
    };

    // Calcular score en tiempo real
    const currentScore = ProcessAuditService.calculateScorePercent(items);

    // Funciones agregar hallazgos
    const addFortaleza = () => {
        if (!newFortaleza.description.trim()) return;
        setFortalezas(prev => [...prev, {
            id: `fort-${Date.now()}`,
            processName: newFortaleza.processName || items[0]?.processName || 'General',
            description: newFortaleza.description,
            highlight: newFortaleza.highlight || 'Punto a destacar'
        }]);
        setNewFortaleza({ processName: '', description: '', highlight: '' });
    };

    const addObservacion = () => {
        if (!newObs.description.trim()) return;
        setObservaciones(prev => [...prev, {
            id: `obs-${Date.now()}`,
            processName: newObs.processName || items[0]?.processName || 'General',
            description: newObs.description,
            recommendation: newObs.recommendation
        }]);
        setNewObs({ processName: '', description: '', recommendation: '' });
    };

    const addOM = () => {
        if (!newOM.title.trim()) return;
        const mockTicketId = newOM.autoLinkDora ? `OM-2026-${Math.floor(100 + Math.random() * 900)}` : undefined;
        setOportunidadesMejora(prev => [...prev, {
            id: `om-${Date.now()}`,
            title: newOM.title,
            description: newOM.description,
            processName: newOM.processName || items[0]?.processName || 'General',
            category: 'Procesos de Calidad',
            doraTicketId: mockTicketId,
            doraStatus: mockTicketId ? 'en_proceso' : undefined
        }]);
        setNewOM({ title: '', description: '', processName: '', autoLinkDora: true });
    };

    const addDesvio = () => {
        if (!newDesvio.title.trim()) return;
        const mockTicketId = newDesvio.autoLinkDora ? `CASO-2026-${Math.floor(100 + Math.random() * 900)}` : undefined;
        setDesvios(prev => [...prev, {
            id: `desv-${Date.now()}`,
            title: newDesvio.title,
            description: newDesvio.description,
            processName: newDesvio.processName || items[0]?.processName || 'General',
            riskLevel: newDesvio.riskLevel,
            actionPlan: newDesvio.actionPlan || 'Plan de Acción Inmediato',
            responsiblePerson: newDesvio.responsiblePerson || auditorName,
            deadline: newDesvio.deadline,
            status: 'abierto',
            doraTicketId: mockTicketId,
            doraStatus: mockTicketId ? 'en_proceso' : undefined
        }]);
        setNewDesvio({
            title: '',
            description: '',
            processName: '',
            riskLevel: 'medio',
            actionPlan: '',
            responsiblePerson: '',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            autoLinkDora: true
        });
    };

    // Finalizar y Guardar Auditoría
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const currentSecObj = SECTOR_OPTIONS.find(s => s.value === sectorId) || sectorOption;
        const randomNum = Math.floor(100 + Math.random() * 900);
        const secCode = sectorId.split('-')[0];

        const hasOpenDesvios = desvios.length > 0;
        const finalStatus = hasOpenDesvios ? 'desvio_abierto' : 'completada';

        const newReport: ProcessAuditReport = {
            id: `aud-${Date.now()}`,
            auditNumber: `AUD-2026-${secCode}-${randomNum}`,
            sectorId: sectorId,
            sectorName: currentSecObj.label.replace(/^.*?–\s*/, ''),
            auditorName: auditorName || 'Auditor de Calidad',
            auditorRole: auditorRole || 'Calidad / Admin',
            auditDate: new Date().toISOString(),
            status: finalStatus,
            scorePercent: currentScore,
            items: items,
            fortalezas: fortalezas,
            observaciones: observaciones,
            oportunidadesMejora: oportunidadesMejora,
            desvios: desvios,
            generalSummary: generalSummary || `Auditoría efectuada en ${currentSecObj.label} alcanzando un ${currentScore}% de cumplimiento general.`
        };

        const saved = ProcessAuditService.saveAudit(newReport);
        onAuditComplete(saved);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-8 animate-in fade-in duration-300">
            {/* Header del Formulario de Auditoría */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
                <div>
                    <span className="text-xs font-bold text-sanatorio-primary bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 uppercase tracking-wider">
                        Formulario de Chequeo de Auditoría
                    </span>
                    <h2 className="text-2xl font-display font-bold text-slate-800 mt-1">
                        Auditoría de Procesos de Sector
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                        Completa la evaluación ítem por ítem. Los puntajes y desvíos se generarán automáticamente.
                    </p>
                </div>

                {/* Realtime Score Gauge */}
                <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 self-start md:self-auto">
                    <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score Actual</span>
                        <div className="text-2xl font-display font-black text-slate-800">{currentScore}%</div>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${currentScore >= 85 ? 'bg-emerald-500' : currentScore >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}>
                        {currentScore >= 85 ? 'A' : currentScore >= 70 ? 'B' : 'C'}
                    </div>
                </div>
            </div>

            {/* Selector de Sector */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center gap-3">
                <Building2 className="w-5 h-5 text-sanatorio-primary shrink-0" />
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide shrink-0">
                    Sector a Auditar:
                </label>
                <select
                    value={sectorId}
                    onChange={(e) => handleSectorSelect(e.target.value)}
                    className="w-full sm:w-80 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary focus:outline-none cursor-pointer"
                >
                    {SECTOR_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Checklist items */}
            <div className="space-y-4">
                <h3 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Items de Evaluación de Proceso ({items.length})
                </h3>

                <div className="space-y-4">
                    {items.map((item, idx) => (
                        <div
                            key={item.id}
                            className={`p-5 rounded-2xl border transition-all ${item.answer === 'no_cumple'
                                    ? 'bg-red-50/40 border-red-200'
                                    : item.answer === 'parcial'
                                        ? 'bg-amber-50/40 border-amber-200'
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {item.category}
                                        </span>
                                        <span className="text-xs font-semibold text-sanatorio-primary">
                                            {item.processName}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-sm sm:text-base text-slate-800 leading-snug">
                                        {item.itemText}
                                    </h4>
                                    {item.description && (
                                        <p className="text-xs text-slate-500 italic">
                                            💡 {item.description}
                                        </p>
                                    )}
                                </div>

                                {/* Answers Radio Pill Options */}
                                <div className="flex items-center gap-1.5 self-start shrink-0 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => handleAnswerChange(item.id, 'cumple')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${item.answer === 'cumple'
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                            }`}
                                    >
                                        Cumple (100%)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleAnswerChange(item.id, 'parcial')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${item.answer === 'parcial'
                                                ? 'bg-amber-500 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                                            }`}
                                    >
                                        Parcial (50%)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleAnswerChange(item.id, 'no_cumple')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${item.answer === 'no_cumple'
                                                ? 'bg-red-600 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700'
                                            }`}
                                    >
                                        No Cumple (0%)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleAnswerChange(item.id, 'no_aplica')}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${item.answer === 'no_aplica'
                                                ? 'bg-slate-700 text-white shadow-sm'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                    >
                                        N/A
                                    </button>
                                </div>
                            </div>

                            {/* Optional Item Observation */}
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <input
                                    type="text"
                                    placeholder="Añadir nota u observación específica sobre este ítem..."
                                    value={item.observation || ''}
                                    onChange={(e) => handleItemObservation(item.id, e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary outline-none transition-all"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sección Cualitativa: Fortalezas, Observaciones, OMs y Desvíos */}
            <div className="space-y-6 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-display font-bold text-slate-800">
                    Registro de Hallazgos e Informes Cualitativos
                </h3>

                {/* 1. Fortalezas */}
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
                    <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        🟢 Fortalezas Detectadas ({fortalezas.length})
                    </h4>

                    {fortalezas.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-200 text-xs">
                            <div>
                                <span className="font-bold text-emerald-800">[{f.processName}]</span> {f.description}
                                <span className="text-[10px] block font-semibold text-emerald-600 mt-0.5">⭐ {f.highlight}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFortalezas(fortalezas.filter(x => x.id !== f.id))}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                            type="text"
                            placeholder="Descripción de la Fortaleza..."
                            value={newFortaleza.description}
                            onChange={(e) => setNewFortaleza({ ...newFortaleza, description: e.target.value })}
                            className="sm:col-span-2 px-3 py-1.5 text-xs bg-white border border-emerald-200 rounded-xl outline-none"
                        />
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Destacado..."
                                value={newFortaleza.highlight}
                                onChange={(e) => setNewFortaleza({ ...newFortaleza, highlight: e.target.value })}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-emerald-200 rounded-xl outline-none"
                            />
                            <button
                                type="button"
                                onClick={addFortaleza}
                                className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all shrink-0 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Observaciones de Campo */}
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-sanatorio-primary" />
                        🔵 Observaciones de Campo ({observaciones.length})
                    </h4>

                    {observaciones.map((o) => (
                        <div key={o.id} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-blue-200 text-xs">
                            <div>
                                <span className="font-bold text-slate-800">[{o.processName}]</span> {o.description}
                                {o.recommendation && (
                                    <span className="text-[10px] block font-semibold text-sanatorio-primary mt-0.5">💡 {o.recommendation}</span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setObservaciones(observaciones.filter(x => x.id !== o.id))}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                            type="text"
                            placeholder="Descripción de la Observación..."
                            value={newObs.description}
                            onChange={(e) => setNewObs({ ...newObs, description: e.target.value })}
                            className="sm:col-span-2 px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-xl outline-none"
                        />
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Recomendación..."
                                value={newObs.recommendation}
                                onChange={(e) => setNewObs({ ...newObs, recommendation: e.target.value })}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-xl outline-none"
                            />
                            <button
                                type="button"
                                onClick={addObservacion}
                                className="px-3 py-1.5 bg-sanatorio-primary text-white font-bold text-xs rounded-xl hover:bg-[#00385c] transition-all shrink-0 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Oportunidades de Mejora (OM) atadas a DORA */}
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            🟡 Oportunidades de Mejora (OM) - Vinculación a DORA ({oportunidadesMejora.length})
                        </h4>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                            Genera Ticket OM DORA
                        </span>
                    </div>

                    {oportunidadesMejora.map((om) => (
                        <div key={om.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-200 text-xs">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800">{om.title}</span>
                                    {om.doraTicketId && (
                                        <span className="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                            <ExternalLink className="w-3 h-3" /> Ticket DORA #{om.doraTicketId}
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-600 mt-0.5">{om.description}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOportunidadesMejora(oportunidadesMejora.filter(x => x.id !== om.id))}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}

                    <div className="space-y-2">
                        <input
                            type="text"
                            placeholder="Título de la Oportunidad de Mejora..."
                            value={newOM.title}
                            onChange={(e) => setNewOM({ ...newOM, title: e.target.value })}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-xl outline-none"
                        />
                        <div className="flex flex-col sm:flex-row gap-2 items-center">
                            <input
                                type="text"
                                placeholder="Propuesta de acción preventiva..."
                                value={newOM.description}
                                onChange={(e) => setNewOM({ ...newOM, description: e.target.value })}
                                className="w-full px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-xl outline-none"
                            />
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newOM.autoLinkDora}
                                        onChange={(e) => setNewOM({ ...newOM, autoLinkDora: e.target.checked })}
                                        className="rounded text-sanatorio-primary focus:ring-sanatorio-primary"
                                    />
                                    🔗 Vincular a DORA
                                </label>
                                <button
                                    type="button"
                                    onClick={addOM}
                                    className="px-3 py-1.5 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 transition-all cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Desvíos con Plan de Acción y Caso DORA */}
                <div className="p-4 bg-red-50/50 rounded-2xl border border-red-200 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-red-900 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-600" />
                            🔴 Desvíos e Incumplimientos ({desvios.length})
                        </h4>
                        <span className="text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                            Genera Caso DORA de Resolución
                        </span>
                    </div>

                    {desvios.map((d) => (
                        <div key={d.id} className="p-3 bg-white rounded-xl border border-red-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-red-800">{d.title}</span>
                                    <span className="bg-red-100 text-red-700 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">
                                        Riesgo {d.riskLevel}
                                    </span>
                                    {d.doraTicketId && (
                                        <span className="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                            <ExternalLink className="w-3 h-3" /> Caso DORA #{d.doraTicketId}
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDesvios(desvios.filter(x => x.id !== d.id))}
                                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <p className="text-slate-600">{d.description}</p>
                            <div className="text-[11px] text-slate-500 font-medium">
                                Plan: {d.actionPlan} • Resp: {d.responsiblePerson} • Vence: {d.deadline}
                            </div>
                        </div>
                    ))}

                    <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                                type="text"
                                placeholder="Título del desvío detectado..."
                                value={newDesvio.title}
                                onChange={(e) => setNewDesvio({ ...newDesvio, title: e.target.value })}
                                className="sm:col-span-2 px-3 py-1.5 text-xs bg-white border border-red-200 rounded-xl outline-none"
                            />
                            <select
                                value={newDesvio.riskLevel}
                                onChange={(e) => setNewDesvio({ ...newDesvio, riskLevel: e.target.value as RiskLevel })}
                                className="px-3 py-1.5 text-xs bg-white border border-red-200 rounded-xl outline-none font-bold"
                            >
                                <option value="bajo">Riesgo Bajo</option>
                                <option value="medio">Riesgo Medio</option>
                                <option value="alto">Riesgo Alto</option>
                                <option value="critico">Riesgo Crítico</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                                type="text"
                                placeholder="Plan de Acción Correctiva..."
                                value={newDesvio.actionPlan}
                                onChange={(e) => setNewDesvio({ ...newDesvio, actionPlan: e.target.value })}
                                className="px-3 py-1.5 text-xs bg-white border border-red-200 rounded-xl outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Responsable del Plan..."
                                value={newDesvio.responsiblePerson}
                                onChange={(e) => setNewDesvio({ ...newDesvio, responsiblePerson: e.target.value })}
                                className="px-3 py-1.5 text-xs bg-white border border-red-200 rounded-xl outline-none"
                            />
                            <div className="flex gap-2 items-center">
                                <input
                                    type="date"
                                    value={newDesvio.deadline}
                                    onChange={(e) => setNewDesvio({ ...newDesvio, deadline: e.target.value })}
                                    className="w-full px-3 py-1.5 text-xs bg-white border border-red-200 rounded-xl outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={addDesvio}
                                    className="px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-all shrink-0 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resumen General / Conclusión */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                        Resumen General de la Auditoría:
                    </label>
                    <textarea
                        rows={3}
                        placeholder="Escribe la conclusión general de la evaluación de este servicio..."
                        value={generalSummary}
                        onChange={(e) => setGeneralSummary(e.target.value)}
                        className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary outline-none transition-all"
                    />
                </div>

                {/* Adjunto de Evidencia Fotográfica / Documental Demo */}
                <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center">
                    <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                    <p className="text-xs font-bold text-slate-700">Adjuntar Evidencias (Fotos de Planilla / Archivos)</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Modo Demo: Simula adjuntos de respaldo para la auditoría.</p>
                    <button
                        type="button"
                        onClick={() => setMockEvidenceFile('evidencia_auditoria_001.pdf')}
                        className="mt-2 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all"
                    >
                        {mockEvidenceFile ? `📎 Adjuntado: ${mockEvidenceFile}` : 'Simular Carga de Archivo'}
                    </button>
                </div>
            </div>

            {/* Acciones de Cierre */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    className="px-6 py-2.5 bg-sanatorio-primary hover:bg-[#00385c] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
                >
                    <Send className="w-4 h-4" />
                    <span>Guardar y Emitir Informe de Auditoría</span>
                </button>
            </div>
        </form>
    );
};
