

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import {
    LayoutDashboard,
    CheckCircle,
    Clock,
    ShieldAlert,
    X,
    Loader2,
    AlertCircle,
    AlertTriangle,
    Send,
    Eye,
    BrainCircuit,
    UserCog,
    Camera,
    Archive,
    Bell,
    XCircle,
    User,
    Phone,
    MessageSquare,
    Save,
    ChevronDown,
    Trash2,
    Download,
    FileSpreadsheet,
    CalendarDays,
    Building2,
    Filter,
    Search,
    Check
} from 'lucide-react';
import { useMemo } from 'react';
import { CLASSIFICATION_CATEGORIES } from '../constants/classification_categories';
import { SECTOR_OPTIONS } from '../constants/sectors';
import type { UserProfile } from '../contexts/AuthContext';
import { generateId } from '../utils/compat';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Discard Confirmation Modal Component
const DiscardConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    isDiscarding
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDiscarding: boolean;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Archive className="w-6 h-6 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">¿Descartar Reporte?</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        El reporte se moverá a la bandeja de <span className="font-bold">Descartados</span> y no será visible en el tablero principal.
                    </p>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            disabled={isDiscarding}
                            className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDiscarding}
                            className="flex-1 py-2.5 px-4 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 transition-colors shadow-lg shadow-gray-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isDiscarding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                            Descartar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// ==========================================================
// Shared Responsable Phone Selector (Cascading: Sector → Responsable)
// ==========================================================
const ResponsablePhoneSelector = ({
    responsables,
    loadingResponsables,
    phone,
    setPhone,
    selectedUserId,
    setSelectedUserId,
    reportSector,
}: {
    responsables: UserProfile[];
    loadingResponsables: boolean;
    phone: string;
    setPhone: (v: string) => void;
    selectedUserId: string;
    setSelectedUserId: (v: string) => void;
    reportSector?: string;
}) => {
    const [selectedSector, setSelectedSector] = useState(reportSector || '');
    const isManual = selectedUserId === '__manual__';

    // Filter responsables by selected sector
    const filteredBySecor = selectedSector
        ? responsables.filter(r => r.assigned_sectors?.includes(selectedSector))
        : [];

    const handleSectorChange = (sector: string) => {
        setSelectedSector(sector);
        // Reset responsable selection when sector changes
        setSelectedUserId('');
        setPhone('');
    };

    const handleSelect = (value: string) => {
        setSelectedUserId(value);
        if (value === '__manual__') {
            setPhone('');
        } else {
            const found = responsables.find(r => r.user_id === value);
            setPhone(found?.phone_number || '');
        }
    };

    const selectedProfile = responsables.find(r => r.user_id === selectedUserId);
    const selectedHasNoPhone = selectedUserId && selectedUserId !== '__manual__' && !selectedProfile?.phone_number;

    return (
        <div className="space-y-3">
            {/* STEP 1: Sector Selector */}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Sector
                </label>
                <select
                    value={selectedSector}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-sanatorio-primary/50 transition-all text-sm bg-gray-50 focus:bg-white appearance-none cursor-pointer"
                >
                    <option value="">-- Seleccionar sector --</option>
                    {SECTOR_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>
            </div>

            {/* STEP 2: Responsable Selector (filtered by sector) */}
            {selectedSector && (
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Responsable
                        {filteredBySecor.length > 0 && (
                            <span className="text-[10px] font-normal text-gray-400 ml-1">
                                ({filteredBySecor.length} disponible{filteredBySecor.length !== 1 ? 's' : ''})
                            </span>
                        )}
                    </label>
                    {loadingResponsables ? (
                        <div className="flex items-center gap-2 p-3 text-sm text-gray-400">
                            <Loader2 className="w-4 h-4 animate-spin" /> Cargando responsables...
                        </div>
                    ) : filteredBySecor.length > 0 ? (
                        <select
                            value={selectedUserId}
                            onChange={(e) => handleSelect(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-sanatorio-primary/50 transition-all text-sm bg-gray-50 focus:bg-white appearance-none cursor-pointer"
                        >
                            <option value="">-- Seleccionar responsable --</option>
                            {filteredBySecor.map(r => (
                                <option key={r.user_id} value={r.user_id}>
                                    {r.display_name || r.user_id}{r.phone_number ? ` (${r.phone_number})` : ' ⚠️ Sin teléfono'}
                                </option>
                            ))}
                            <optgroup label="──────────">
                                <option value="__manual__">✏️ Ingresar número manualmente</option>
                            </optgroup>
                        </select>
                    ) : (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm space-y-2">
                            <div className="flex items-center gap-2 text-amber-700 font-medium">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                No hay responsables asignados a este sector.
                            </div>
                            <button
                                type="button"
                                onClick={() => handleSelect('__manual__')}
                                className="text-xs font-bold text-sanatorio-primary hover:underline"
                            >
                                ✏️ Ingresar número manualmente
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Warning if selected responsable has no phone */}
            {selectedHasNoPhone && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Este responsable no tiene teléfono registrado. Ingrese el número manualmente.</span>
                </div>
            )}

            {/* Phone input */}
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    WhatsApp
                </label>
                <input
                    type="tel"
                    maxLength={10}
                    placeholder="Ej: 2645438114"
                    className={`w-full p-3 rounded-xl border outline-none focus:ring-2 focus:ring-sanatorio-primary/50 transition-all font-mono text-sm ${(isManual || selectedHasNoPhone)
                        ? 'border-gray-200 bg-gray-50 focus:bg-white'
                        : 'border-gray-100 bg-gray-100 text-gray-500 cursor-not-allowed'
                        }`}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    readOnly={!isManual && !selectedHasNoPhone}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                    {isManual || selectedHasNoPhone
                        ? '10 dígitos sin 0 ni 15. Incluir código de área.'
                        : 'Auto-completado desde el perfil del responsable.'
                    }
                </p>
            </div>
        </div>
    );
};


// =====================================================
// Multi-Sector Referral Modal — Allows assigning to N sectors
// =====================================================
interface SectorAssignmentRow {
    id: string;
    sector: string;
    selectedUserId: string;
    phone: string;
}

const MultiSectorRowSelector = ({
    row,
    onUpdate,
    onRemove,
    canRemove,
    responsables,
    loadingResponsables,
}: {
    row: SectorAssignmentRow;
    onUpdate: (updated: SectorAssignmentRow) => void;
    onRemove: () => void;
    canRemove: boolean;
    responsables: UserProfile[];
    loadingResponsables: boolean;
}) => {
    const isManual = row.selectedUserId === '__manual__';

    const filteredBySector = row.sector
        ? responsables.filter(r => r.assigned_sectors?.includes(row.sector))
        : [];

    const selectedProfile = responsables.find(r => r.user_id === row.selectedUserId);
    const selectedHasNoPhone = row.selectedUserId && row.selectedUserId !== '__manual__' && !selectedProfile?.phone_number;

    return (
        <div className="relative bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 transition-all hover:border-gray-300">
            {canRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Quitar sector"
                >
                    <X className="w-4 h-4" />
                </button>
            )}

            {/* Sector */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Sector</label>
                <select
                    value={row.sector}
                    onChange={(e) => onUpdate({ ...row, sector: e.target.value, selectedUserId: '', phone: '' })}
                    className="w-full p-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-sanatorio-primary/50 transition-all text-sm bg-white"
                >
                    <option value="">-- Seleccionar sector --</option>
                    {SECTOR_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>
            </div>

            {/* Responsable */}
            {row.sector && (
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                        Responsable
                        {filteredBySector.length > 0 && (
                            <span className="text-[9px] font-normal text-gray-400 ml-1">
                                ({filteredBySector.length} disponible{filteredBySector.length !== 1 ? 's' : ''})
                            </span>
                        )}
                    </label>
                    {loadingResponsables ? (
                        <div className="flex items-center gap-2 p-2 text-xs text-gray-400">
                            <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
                        </div>
                    ) : filteredBySector.length > 0 ? (
                        <select
                            value={row.selectedUserId}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__manual__') {
                                    onUpdate({ ...row, selectedUserId: val, phone: '' });
                                } else {
                                    const found = responsables.find(r => r.user_id === val);
                                    onUpdate({ ...row, selectedUserId: val, phone: found?.phone_number || '' });
                                }
                            }}
                            className="w-full p-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-sanatorio-primary/50 transition-all text-sm bg-white"
                        >
                            <option value="">-- Seleccionar --</option>
                            {filteredBySector.map(r => (
                                <option key={r.user_id} value={r.user_id}>
                                    {r.display_name || r.user_id}{r.phone_number ? ` (${r.phone_number})` : ' ⚠️ Sin tel'}
                                </option>
                            ))}
                            <optgroup label="──────────">
                                <option value="__manual__">✏️ Ingresar manualmente</option>
                            </optgroup>
                        </select>
                    ) : (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                            <span className="text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Sin responsables</span>
                            <button type="button" onClick={() => onUpdate({ ...row, selectedUserId: '__manual__', phone: '' })} className="text-sanatorio-primary font-bold hover:underline">Manual</button>
                        </div>
                    )}
                </div>
            )}

            {/* Phone */}
            {row.sector && (
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">WhatsApp</label>
                    <input
                        type="tel"
                        maxLength={10}
                        placeholder="2645438114"
                        className={`w-full p-2.5 rounded-lg border outline-none focus:ring-2 focus:ring-sanatorio-primary/50 transition-all font-mono text-sm ${(isManual || selectedHasNoPhone)
                            ? 'border-gray-200 bg-white'
                            : 'border-gray-100 bg-gray-100 text-gray-500 cursor-not-allowed'
                            }`}
                        value={row.phone}
                        onChange={(e) => onUpdate({ ...row, phone: e.target.value.replace(/\D/g, '') })}
                        readOnly={!isManual && !selectedHasNoPhone}
                    />
                </div>
            )}

            {/* Sector badge indicator */}
            {row.sector && row.phone.length >= 8 && (
                <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-bold">
                    <CheckCircle className="w-3 h-3" /> Listo para enviar
                </div>
            )}
        </div>
    );
};

const ReferralModal = ({
    isOpen,
    onClose,
    onConfirm,
    isSending,
    responsables,
    loadingResponsables,
    reportSector,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (type: 'simple' | 'desvio' | 'adverse', responsiblePhone: string, sectorAssignments?: SectorAssignmentRow[]) => void;
    isSending: boolean;
    responsables: UserProfile[];
    loadingResponsables: boolean;
    reportSector?: string;
}) => {
    const [managementType, setManagementType] = useState<'simple' | 'desvio' | 'adverse'>('simple');
    const [rows, setRows] = useState<SectorAssignmentRow[]>([
        { id: generateId(), sector: reportSector || '', selectedUserId: '', phone: '' }
    ]);

    useEffect(() => {
        if (isOpen) {
            setManagementType('simple');
            setRows([{ id: generateId(), sector: reportSector || '', selectedUserId: '', phone: '' }]);
        }
    }, [isOpen]);

    const addRow = () => {
        setRows(prev => [...prev, { id: generateId(), sector: '', selectedUserId: '', phone: '' }]);
    };

    const updateRow = (id: string, updated: SectorAssignmentRow) => {
        setRows(prev => prev.map(r => r.id === id ? updated : r));
    };

    const removeRow = (id: string) => {
        setRows(prev => prev.filter(r => r.id !== id));
    };

    const validRows = rows.filter(r => r.sector && r.phone.length >= 8);
    const isMultiSector = rows.length > 1;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Send className="w-5 h-5 text-sanatorio-primary" />
                        Derivar Caso
                    </h3>
                    {isMultiSector && (
                        <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                            Multi-Sector
                        </span>
                    )}
                </div>
                <p className="text-sm text-gray-500 mb-5">
                    {isMultiSector
                        ? 'Se enviará un enlace individual a cada responsable asignado.'
                        : 'Se enviará un enlace de gestión vía WhatsApp al responsable.'
                    }
                </p>

                <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-5 custom-scrollbar">
                    {/* Tipo de Gestión (shared) */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Tipo de Gestión Requerida</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setManagementType('simple')} className={`p-2 rounded-lg text-xs font-bold transition-all border ${managementType === 'simple' ? 'bg-white border-blue-500 text-blue-700 shadow-sm ring-1 ring-blue-500' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}>⚡ Simple</button>
                            <button onClick={() => setManagementType('desvio')} className={`p-2 rounded-lg text-xs font-bold transition-all border ${managementType === 'desvio' ? 'bg-white border-orange-500 text-orange-700 shadow-sm ring-1 ring-orange-500' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}>🔧 Desvío</button>
                            <button onClick={() => setManagementType('adverse')} className={`p-2 rounded-lg text-xs font-bold transition-all border ${managementType === 'adverse' ? 'bg-white border-red-500 text-red-700 shadow-sm ring-1 ring-red-500' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}>⚠️ Evento A.</button>
                        </div>
                        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100 text-xs text-gray-600">
                            {managementType === 'simple' && <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Solo solicita <strong>Acción Inmediata</strong>.</p>}
                            {managementType === 'desvio' && <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>Solicita <strong>Acción Inmediata + RCA + Plan</strong>.</p>}
                            {managementType === 'adverse' && <p className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Solicita <strong>Acción Inmediata + RCA + Plan</strong> (Crítico).</p>}
                        </div>
                    </div>

                    {/* Sector Assignment Rows */}
                    {rows.map((row, idx) => (
                        <div key={row.id}>
                            {rows.length > 1 && (
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                    Asignación {idx + 1} de {rows.length}
                                </p>
                            )}
                            <MultiSectorRowSelector
                                row={row}
                                onUpdate={(updated) => updateRow(row.id, updated)}
                                onRemove={() => removeRow(row.id)}
                                canRemove={rows.length > 1}
                                responsables={responsables}
                                loadingResponsables={loadingResponsables}
                            />
                        </div>
                    ))}

                    {/* Add Sector Button */}
                    <button
                        type="button"
                        onClick={addRow}
                        className="w-full py-2.5 px-4 border-2 border-dashed border-gray-200 rounded-xl text-sm font-bold text-gray-400 hover:text-sanatorio-primary hover:border-sanatorio-primary/30 hover:bg-sanatorio-primary/5 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="text-lg leading-none">+</span> Agregar otro sector
                    </button>
                </div>

                {/* Summary & Actions */}
                {validRows.length > 1 && (
                    <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                        <p className="text-xs font-bold text-indigo-700 mb-1">Resumen Multi-Sector</p>
                        <div className="flex flex-wrap gap-1.5">
                            {validRows.map(r => {
                                const sectorLabel = SECTOR_OPTIONS.find(s => s.value === r.sector)?.label || r.sector;
                                return (
                                    <span key={r.id} className="px-2 py-0.5 bg-white rounded-full text-[10px] font-bold text-indigo-600 border border-indigo-200">
                                        {sectorLabel}
                                    </span>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-indigo-500 mt-1.5">{validRows.length} sectores serán notificados simultáneamente</p>
                    </div>
                )}

                <div className="flex gap-3 w-full flex-shrink-0">
                    <button onClick={onClose} disabled={isSending} className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">Cancelar</button>
                    <button
                        onClick={() => onConfirm(managementType, validRows[0]?.phone || '', validRows.length > 0 ? rows : undefined)}
                        disabled={isSending || validRows.length === 0}
                        className="flex-1 py-2.5 px-4 bg-sanatorio-primary text-white font-bold rounded-xl hover:opacity-90 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {validRows.length > 1 ? `Enviar a ${validRows.length} sectores` : 'Enviar Solicitud'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Feedback Modal Component (Success/Error)
const FeedbackModal = ({
    isOpen,
    onClose,
    type,
    title,
    message
}: {
    isOpen: boolean;
    onClose: () => void;
    type: 'success' | 'error';
    title: string;
    message: string;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95 text-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {type === 'success' ? <CheckCircle className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                    {message}
                </p>

                <button
                    onClick={onClose}
                    className={`w-full py-3 px-4 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2
                        ${type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-500/30' : 'bg-red-600 hover:bg-red-700 shadow-red-500/30'}
                    `}
                >
                    {type === 'success' ? 'Aceptar' : 'Entendido'}
                </button>
            </div>
        </div>
    );
};

// Reopen Case Modal Component (Hybrid)
const ReopenModal = ({
    isOpen,
    onClose,
    onConfirm,
    initialPhone,
    isSubmitting,
    responsables,
    loadingResponsables,
    reportSector,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string, phone: string) => void;
    initialPhone: string;
    isSubmitting: boolean;
    responsables: UserProfile[];
    loadingResponsables: boolean;
    reportSector?: string;
}) => {
    const [reason, setReason] = useState('');
    const [phone, setPhone] = useState(initialPhone || '');
    const [selectedUserId, setSelectedUserId] = useState('');

    useEffect(() => {
        if (isOpen) {
            setReason('');
            // Try to find the responsable by their phone (for pre-selection)
            if (initialPhone) {
                const found = responsables.find(r => r.phone_number === initialPhone);
                if (found) {
                    setSelectedUserId(found.user_id);
                    setPhone(found.phone_number || '');
                } else {
                    setSelectedUserId('__manual__');
                    setPhone(initialPhone);
                }
            } else {
                setSelectedUserId('');
                setPhone('');
            }
        }
    }, [isOpen, initialPhone, responsables]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <span className="p-2 bg-red-100 rounded-lg text-red-600"><AlertCircle className="w-5 h-5" /></span>
                    Reapertura de Caso
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    Indique el motivo de la corrección. El caso volverá a estado pendiente.
                </p>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Motivo de Corrección</label>
                        <textarea
                            className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-sanatorio-primary/50 transition-all text-sm min-h-[100px] bg-gray-50 focus:bg-white"
                            placeholder="Ej: La evidencia adjunta no es suficiente..."
                            value={reason}
                            autoFocus
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <ResponsablePhoneSelector
                        responsables={responsables}
                        loadingResponsables={loadingResponsables}
                        phone={phone}
                        setPhone={setPhone}
                        selectedUserId={selectedUserId}
                        setSelectedUserId={setSelectedUserId}
                        reportSector={reportSector}
                    />
                </div>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(reason, phone)}
                        disabled={!reason.trim() || isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                        Confirmar Reapertura
                    </button>
                </div>
            </div>
        </div>
    );
};

// Quality Return Modal (Rechazo) — Hybrid
const QualityReturnModal = ({
    isOpen,
    onClose,
    onConfirm,
    initialPhone,
    isSubmitting,
    responsables,
    loadingResponsables,
    reportSector,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string, phone: string) => void;
    initialPhone: string;
    isSubmitting: boolean;
    responsables: UserProfile[];
    loadingResponsables: boolean;
    reportSector?: string;
}) => {
    const [reason, setReason] = useState('');
    const [phone, setPhone] = useState(initialPhone || '');
    const [selectedUserId, setSelectedUserId] = useState('');

    useEffect(() => {
        if (isOpen) {
            setReason('');
            if (initialPhone) {
                const found = responsables.find(r => r.phone_number === initialPhone);
                if (found) {
                    setSelectedUserId(found.user_id);
                    setPhone(found.phone_number || '');
                } else {
                    setSelectedUserId('__manual__');
                    setPhone(initialPhone);
                }
            } else {
                setSelectedUserId('');
                setPhone('');
            }
        }
    }, [isOpen, initialPhone, responsables]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <span className="p-2 bg-purple-100 rounded-lg text-purple-600"><BrainCircuit className="w-5 h-5" /></span>
                    Devolver a Responsable
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    El caso volverá a estado "En Gestión" para que el responsable realice correcciones.
                </p>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Motivo de Devolución</label>
                        <textarea
                            className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm min-h-[100px] bg-gray-50 focus:bg-white"
                            placeholder="Ej: El plan de acción es insuficiente..."
                            value={reason}
                            autoFocus
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <ResponsablePhoneSelector
                        responsables={responsables}
                        loadingResponsables={loadingResponsables}
                        phone={phone}
                        setPhone={setPhone}
                        selectedUserId={selectedUserId}
                        setSelectedUserId={setSelectedUserId}
                        reportSector={reportSector}
                    />
                </div>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(reason, phone)}
                        disabled={!reason.trim() || isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Confirmar Devolución
                    </button>
                </div>
            </div>
        </div>
    );
};

// Quality Approve Modal
const QualityApproveModal = ({
    isOpen,
    onClose,
    onConfirm,
    isSubmitting
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isSubmitting: boolean;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4 mx-auto">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">¿Aprobar y Cerrar Caso?</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Esta acción finalizará el reporte y notificará al usuario original (si corresponde).
                </p>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Aprobar
                    </button>
                </div>
            </div>
        </div>
    );
};

import { useAuth } from '../contexts/AuthContext';

// ... (other imports remain, just ensuring useAuth is imported)

export const Dashboard = () => {
    const { role, sectors, isAdmin } = useAuth();
    const [reports, setReports] = useState<any[]>([]);
    const [responsables, setResponsables] = useState<UserProfile[]>([]);
    const [loadingResponsables, setLoadingResponsables] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [, setUpdatingColor] = useState(false);

    // Modals
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [showReferralModal, setShowReferralModal] = useState(false);
    const [showReopenModal, setShowReopenModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false); // Toggle Notification Panel
    const [isDiscarding, setIsDiscarding] = useState(false);
    const [isReopening, setIsReopening] = useState(false);
    const [isSendingReferral, setIsSendingReferral] = useState(false);
    const [showQualityReturnModal, setShowQualityReturnModal] = useState(false);
    const [showQualityApproveModal, setShowQualityApproveModal] = useState(false);
    const [isProcessingQuality, setIsProcessingQuality] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sector assignments state (shared by multi_sector_pending & quality_validation views)
    const [sectorAssignmentsData, setSectorAssignmentsData] = useState<any[]>([]);
    const [loadingAssignments, setLoadingAssignments] = useState(true);
    const [expandedSector, setExpandedSector] = useState<string | null>(null);
    const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

    // Send reminder WhatsApp for a pending sector assignment
    const handleSendReminder = async (assignment: any) => {
        if (!selectedReport || sendingReminderId) return;
        setSendingReminderId(assignment.id);
        try {
            const sectorLabel = SECTOR_OPTIONS.find(s => s.value === assignment.sector)?.label || assignment.sector;
            const resolutionLink = `${window.location.origin}/resolver-caso/${selectedReport.tracking_id}/${assignment.id}`;
            const botNumber = `549${(assignment.assigned_phone || '').replace(/\D/g, '').replace(/^549/, '')}`;

            if (botNumber.length < 12) {
                setFeedbackModal({ isOpen: true, type: 'error', title: 'Sin teléfono', message: 'No hay un número de teléfono válido para esta asignación.' });
                setSendingReminderId(null);
                return;
            }

            const { error } = await supabase.functions.invoke('send-whatsapp', {
                body: {
                    number: botNumber,
                    message: `🔔 *Recordatorio - Caso Pendiente*\n\nEl caso *${selectedReport.tracking_id}* aún requiere su gestión.\n📂 Sector: ${sectorLabel}\n\n⏰ Este caso está esperando su respuesta. Por favor, gestione a la brevedad.\n\n👉 *Gestione aquí:* ${resolutionLink}`,
                    mediaUrl: "https://i.imgur.com/JGQlbiJ.jpeg"
                }
            });

            if (error) {
                setFeedbackModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo enviar el recordatorio.' });
            } else {
                setFeedbackModal({ isOpen: true, type: 'success', title: 'Recordatorio Enviado', message: `Se reenvió la notificación a ${sectorLabel} (${assignment.assigned_phone}).` });
            }
        } catch (err) {
            console.error('[Reminder] Error:', err);
            setFeedbackModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error inesperado al enviar recordatorio.' });
        } finally {
            setSendingReminderId(null);
        }
    };

    // Fetch sector assignments when a report is selected
    useEffect(() => {
        if (!selectedReport?.id) {
            setSectorAssignmentsData([]);
            setLoadingAssignments(false);
            setExpandedSector(null);
            return;
        }
        // Only fetch if the report could have sector assignments
        if (selectedReport.status === 'multi_sector_pending' || selectedReport.status === 'quality_validation') {
            const fetchAssignments = async () => {
                setLoadingAssignments(true);
                setExpandedSector(null);
                const { data, error } = await supabase
                    .from('sector_assignments')
                    .select('*')
                    .eq('report_id', selectedReport.id)
                    .order('created_at', { ascending: true });

                if (!error && data) {
                    setSectorAssignmentsData(data);
                } else {
                    setSectorAssignmentsData([]);
                }
                setLoadingAssignments(false);
            };
            fetchAssignments();
        } else {
            setSectorAssignmentsData([]);
            setLoadingAssignments(false);
        }
    }, [selectedReport?.id, selectedReport?.status]);

    // Observations state
    const [observationText, setObservationText] = useState('');
    const [isSavingObservation, setIsSavingObservation] = useState(false);
    const [observationSaved, setObservationSaved] = useState(false);

    // Sync observation text when a report is selected
    useEffect(() => {
        if (selectedReport) {
            setObservationText(selectedReport.quality_observations || '');
            setObservationSaved(false);
        }
    }, [selectedReport?.id]);

    const [feedbackModal, setFeedbackModal] = useState<{
        isOpen: boolean;
        type: 'success' | 'error';
        title: string;
        message: string;
    }>({ isOpen: false, type: 'success', title: '', message: '' });

    const handleQualityReturn = async (reason: string, phoneTarget: string) => {
        if (!selectedReport) return;
        setIsProcessingQuality(true);

        const timestamp = new Date().toLocaleString();
        const logEntry = `[${timestamp}] ⚠️ RECHAZADO POR CALIDAD: ${reason}`;
        const currentNotes = selectedReport.notes || '';
        const updatedNotes = currentNotes ? `${currentNotes}\n\n${logEntry}` : logEntry;

        const historyEntry = {
            rejected_at: new Date().toISOString(),
            rejected_by: "Calidad",
            reject_reason: reason,
            previous_data: {
                immediate_action: selectedReport.immediate_action,
                root_cause: selectedReport.root_cause,
                corrective_plan: selectedReport.corrective_plan,
                implementation_date: selectedReport.implementation_date,
                resolution_evidence_urls: selectedReport.resolution_evidence_urls
            }
        };

        const currentHistory = selectedReport.resolution_history || [];
        const updatedHistory = [...currentHistory, historyEntry];

        const { error } = await supabase
            .from('reports')
            .update({
                status: 'pending_resolution',
                notes: updatedNotes,
                resolution_history: updatedHistory,
                immediate_action: null,
                root_cause: null,
                corrective_plan: null,
                implementation_date: null
            })
            .eq('id', selectedReport.id);

        if (!error) {
            if (phoneTarget && phoneTarget.length > 5) {
                const botNumber = `549${phoneTarget.replace(/\D/g, '').replace(/^549/, '')}`;
                const resolutionLink = `${window.location.origin}/resolver-caso/${selectedReport.tracking_id}`;

                await supabase.functions.invoke('send-whatsapp', {
                    body: {
                        number: botNumber,
                        message: `🛑 *Solución Insuficiente - Calidad*\n\nLa solución propuesta para el caso *${selectedReport.tracking_id}* ha sido rechazada por considerarse insuficiente.\n\n⚠️ *Motivo:* ${reason}\n\n👉 *Por favor, gestione nuevamente el caso e ingrese un nuevo plan de acción:* ${resolutionLink}`,
                        mediaUrl: "https://i.imgur.com/GfBdckl.jpeg"
                    }
                });
            }

            setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'pending_resolution', notes: updatedNotes } : r));
            setSelectedReport(null);
            setShowQualityReturnModal(false);
            setFeedbackModal({ isOpen: true, type: 'success', title: 'Ticket Devuelto', message: 'El caso ha vuelto a estado pendiente y se ha notificado al responsable.' });
        } else {
            setFeedbackModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo devolver el caso: ' + error.message });
        }
        setIsProcessingQuality(false);
    };

    const handleQualityApprove = async () => {
        if (!selectedReport) return;
        setIsProcessingQuality(true);

        if (selectedReport.contact_number && selectedReport.contact_number.length > 5) {
            const userNumber = `549${selectedReport.contact_number}`;
            await supabase.functions.invoke('send-whatsapp', {
                body: {
                    number: userNumber,
                    message: `✅ *Reporte Resuelto - Calidad*\n\nEstimado/a, su reporte *${selectedReport.tracking_id}* ha sido gestionado y cerrado exitosamente.\n\n📝 *Resolución:* "${selectedReport.resolution_notes || selectedReport.corrective_plan || 'Sin observaciones.'}"\n\nGracias por su compromiso con la mejora continua.`,
                    mediaUrl: "https://i.imgur.com/rOkI8sA.png"
                }
            });
        }

        const approveTimestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
        const approveLog = `[${approveTimestamp}] ✅ APROBADO POR CALIDAD: Caso cerrado tras validación`;
        const prevNotes = selectedReport.notes || '';
        const finalNotes = prevNotes ? `${prevNotes}\n\n${approveLog}` : approveLog;

        const { error } = await supabase.from('reports').update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            notes: finalNotes
        }).eq('id', selectedReport.id);

        if (!error) {
            setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'resolved', notes: finalNotes, resolved_at: new Date().toISOString() } : r));
            setSelectedReport(null);
            setShowQualityApproveModal(false);
            setFeedbackModal({ isOpen: true, type: 'success', title: 'Caso Aprobado', message: 'El ticket ha sido cerrado correctamente.' });
        } else {
            setFeedbackModal({ isOpen: true, type: 'error', title: 'Error', message: 'Hubo un error al cerrar el caso.' });
        }
        setIsProcessingQuality(false);
    };

    // Fetch all users with assigned sectors (responsables + admin/directivo with sectors)
    const fetchResponsables = useCallback(async () => {
        if (!isAdmin) return;
        setLoadingResponsables(true);
        try {
            // Fetch ALL approved users who have at least one sector assigned
            // This includes responsables AND admin/directivo with sectors
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .order('display_name', { ascending: true });

            if (error) {
                console.error('[Dashboard] Error fetching responsables:', error);
            } else {
                // Filter to only include users that have sectors assigned
                const usersWithSectors = (data || []).filter(
                    u => u.assigned_sectors && u.assigned_sectors.length > 0
                );
                setResponsables(usersWithSectors);
            }
        } catch (err) {
            console.error('[Dashboard] Unexpected error fetching responsables:', err);
        } finally {
            setLoadingResponsables(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        if (role) {
            fetchReports();
            fetchResponsables();
        }
    }, [role, sectors]);

    const fetchReports = async () => {
        setLoading(true);
        let query = supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        // Role-based filtering
        if (role === 'responsable') {
            if (sectors.length > 0) {
                query = query.in('sector', sectors);
            } else {
                // If responsible has no sectors, return empty
                setReports([]);
                setLoading(false);
                return;
            }
        }

        const { data, error } = await query;

        if (error) console.error('Error fetching reports:', error);
        else setReports(data || []);
        setLoading(false);
    };

    const handleSendReferral = async (managementType: 'simple' | 'desvio' | 'adverse', responsiblePhone: string, sectorAssignments?: SectorAssignmentRow[]) => {
        if (!selectedReport) return;
        setIsSendingReferral(true);

        const isAdverse = managementType !== 'simple';
        const typeLabel = managementType === 'simple' ? 'Simple' : managementType === 'desvio' ? 'Desvío' : 'Evento Adverso';
        const timestamp = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

        // Determine the valid rows to process
        const validRows = sectorAssignments
            ? sectorAssignments.filter(r => r.sector && r.phone.length >= 8)
            : [{ id: '', sector: selectedReport.sector || '', selectedUserId: '', phone: responsiblePhone }];

        const isMultiSector = validRows.length > 1;
        let allSuccess = true;
        const logEntries: string[] = [];
        const assignmentIds: string[] = [];

        for (const row of validRows) {
            // 1. Create sector_assignment record
            const { data: assignmentData, error: insertError } = await supabase
                .from('sector_assignments')
                .insert({
                    report_id: selectedReport.id,
                    sector: row.sector,
                    assigned_phone: row.phone,
                    management_type: managementType,
                    status: 'pending'
                })
                .select('id')
                .single();

            if (insertError) {
                console.error('[MultiSector] Error creating assignment:', insertError);
                logEntries.push(`[${timestamp}] ❌ ERROR: No se pudo crear asignación para ${row.sector}`);
                allSuccess = false;
                continue;
            }

            const assignmentId = assignmentData.id;
            assignmentIds.push(assignmentId);

            // 2. Generate unique resolution link per assignment
            const resolutionLink = `${window.location.origin}/resolver-caso/${selectedReport.tracking_id}/${assignmentId}`;
            const botNumber = `549${row.phone}`;

            // 3. Build WhatsApp message
            const sectorLabel = SECTOR_OPTIONS.find(s => s.value === row.sector)?.label || row.sector;
            let messageBody = `👋 *Solicitud de Gestión - Calidad*\n\nSe requiere su intervención para el caso: *${selectedReport.tracking_id}*\n📂 Sector: ${sectorLabel}\n\n📝 *Reporte:* "${selectedReport.ai_summary || selectedReport.content}"\n\n`;

            if (managementType === 'simple') {
                messageBody += `🛠️ *Tipo: Simple*\nSe solicita: *Contención / Acción Inmediata*.`;
            } else if (managementType === 'desvio') {
                messageBody += `🔧 *Tipo: Desvío*\nSe solicita: *Acción Inmediata + Análisis de Causa + Plan de Acción*.`;
            } else {
                messageBody += `⚠️ *Tipo: Evento Adverso*\nSe solicita: *Acción Inmediata + Análisis de Causa + Plan de Acción*.`;
            }

            if (isMultiSector) {
                messageBody += `\n\n🏥 *Nota:* Este caso fue asignado a ${validRows.length} sectores simultáneamente. Su respuesta es independiente.`;
            }

            messageBody += `\n\n👉 *Gestione el caso aquí:* ${resolutionLink}`;

            // 4. Send WhatsApp
            console.log(`[MultiSector] Enviando a ${botNumber} (${sectorLabel}). Link: ${resolutionLink}`);
            const { error: waError } = await supabase.functions.invoke('send-whatsapp', {
                body: {
                    number: botNumber,
                    message: messageBody,
                    mediaUrl: managementType === 'adverse' ? "https://i.imgur.com/jgX2y4n.png" : "https://i.imgur.com/JGQlbiJ.jpeg"
                }
            });

            if (waError) {
                console.error(`[MultiSector] WhatsApp error for ${sectorLabel}:`, waError);
                logEntries.push(`[${timestamp}] ❌ ERROR AL ENVIAR: Fallo WhatsApp a ${row.phone} (${sectorLabel})`);
                allSuccess = false;
            } else {
                logEntries.push(`[${timestamp}] 📤 DERIVADO: Enviado a ${row.phone} como [${typeLabel}] → ${sectorLabel}`);
            }
        }

        // 5. Update report status and notes
        const currentNotes = selectedReport.notes || '';
        const updatedNotes = currentNotes
            ? `${currentNotes}\n\n${logEntries.join('\n\n')}`
            : logEntries.join('\n\n');

        const newStatus = isMultiSector ? 'multi_sector_pending' : 'pending_resolution';

        const { error: dbError } = await supabase
            .from('reports')
            .update({
                status: newStatus,
                notes: updatedNotes,
                is_adverse_event: isAdverse,
                assigned_to: isMultiSector ? `${validRows.length} sectores` : validRows[0]?.phone || responsiblePhone,
                last_whatsapp_status: allSuccess ? 'sent' : 'failed',
                last_whatsapp_sent_at: new Date().toISOString()
            })
            .eq('id', selectedReport.id);

        if (!dbError) {
            setReports(reports.map(r => r.id === selectedReport.id ? {
                ...r,
                status: newStatus,
                notes: updatedNotes,
                assigned_to: isMultiSector ? `${validRows.length} sectores` : validRows[0]?.phone || responsiblePhone,
                last_whatsapp_status: allSuccess ? 'sent' : 'failed',
                last_whatsapp_sent_at: new Date().toISOString()
            } : r));
            setShowReferralModal(false);
        } else {
            console.error("Error DB:", dbError);
        }

        // Show feedback
        if (allSuccess) {
            setFeedbackModal({
                isOpen: true,
                type: 'success',
                title: isMultiSector ? 'Derivación Multi-Sector Exitosa' : 'Solicitud Enviada',
                message: isMultiSector
                    ? `Se derivó el caso a ${validRows.length} sectores exitosamente.`
                    : `Solicitud de gestión (${typeLabel}) enviada correctamente.`
            });
        } else {
            setFeedbackModal({
                isOpen: true,
                type: 'error',
                title: 'Envío Parcial',
                message: 'Algunos sectores no pudieron ser notificados. Revise el historial del caso.'
            });
        }

        setIsSendingReferral(false);
    };

    const handleReopenCase = async (reason: string, phoneTarget: string) => {
        if (!selectedReport) return;
        setIsReopening(true);

        const timestamp = new Date().toLocaleString();
        const logEntry = `[${timestamp}] 🔄 APELADO/REABIERTO: ${reason}`;
        const currentNotes = selectedReport.notes || '';
        const updatedNotes = currentNotes ? `${currentNotes}\n\n${logEntry}` : logEntry;

        // 0. Prepare history entry
        const historyEntry = {
            rejected_at: new Date().toISOString(),
            rejected_by: "Calidad (Reapertura)",
            reject_reason: reason,
            previous_data: {
                immediate_action: selectedReport.immediate_action,
                root_cause: selectedReport.root_cause,
                corrective_plan: selectedReport.corrective_plan,
                implementation_date: selectedReport.implementation_date,
                resolution_evidence_urls: selectedReport.resolution_evidence_urls
            }
        };

        const currentHistory = selectedReport.resolution_history || [];
        const updatedHistory = [...currentHistory, historyEntry];

        // 1. Update Database
        const { error } = await supabase
            .from('reports')
            .update({
                status: 'pending_resolution',
                notes: updatedNotes,
                resolution_history: updatedHistory
            })
            .eq('id', selectedReport.id);

        if (!error) {
            // 2. Send WhatsApp if phone provided
            if (phoneTarget && phoneTarget.length > 5) {
                const botNumber = `549${phoneTarget.replace(/\D/g, '').replace(/^549/, '')}`;
                const resolutionLink = `${window.location.origin}/resolver-caso/${selectedReport.tracking_id}`;

                const { error: waError } = await supabase.functions.invoke('send-whatsapp', {
                    body: {
                        number: botNumber,
                        message: `🛑 *Solución Insuficiente - Caso Reabierto*\n\nSe ha reabierto el caso *${selectedReport.tracking_id}* tras revisión de Calidad.\n\n⚠️ *Motivo:* ${reason}\n\n👉 *Se requiere una nueva gestión del caso:* ${resolutionLink}`,
                        mediaUrl: "https://i.imgur.com/GfBdckl.jpeg"
                    }
                });

                if (waError) console.error("Error sending WA rejection:", waError);
            }

            // 3. Update local state
            setReports(reports.map(r => r.id === selectedReport.id ? {
                ...r,
                status: 'pending_resolution',
                notes: updatedNotes,
                resolution_history: updatedHistory
            } : r));
            setSelectedReport(null);
            setShowReopenModal(false);
            setFeedbackModal({ isOpen: true, type: 'success', title: 'Caso Reabierto', message: 'El ticket ha vuelto a estado pendiente para corrección.' });
        } else {
            setFeedbackModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo reabrir el caso: ' + error.message });
        }
        setIsReopening(false);
    };

    // ... (Mantener funciones handleDeleteClick, confirmDelete, handleUpdateUrgency del código original)
    // Para brevedad del reemplazo, asumo que existen o se mantienen. 
    // RE-IMPLEMENTANDO LAS FUNCIONES CRÍTICAS PARA QUE NO SE PIERDAN AL REEMPLAZAR EL COMPONENTE COMPLETO

    const handleDiscardClick = () => {
        setShowDiscardModal(true);
    };

    const confirmDiscard = async () => {
        if (!selectedReport) return;
        setIsDiscarding(true);

        // Update status to 'discarded' instead of deleting
        const { error } = await supabase
            .from('reports')
            .update({ status: 'discarded' })
            .eq('id', selectedReport.id);

        if (error) {
            alert('Error al descartar: ' + error.message);
        } else {
            // Update local state: Update the status or remove from view depending on filter
            const updatedReport = { ...selectedReport, status: 'discarded' };
            setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
            setSelectedReport(null);
            setShowDiscardModal(false);
            setFeedbackModal({ isOpen: true, type: 'success', title: 'Caso Descartado', message: 'El reporte se ha movido a la bandeja de descartados.' });
        }
        setIsDiscarding(false);
    };

    const handleUpdateUrgency = async (newColor: string) => {
        if (!selectedReport) return;
        setUpdatingColor(true);

        const { error } = await supabase
            .from('reports')
            .update({ ai_urgency: newColor })
            .eq('id', selectedReport.id);

        if (error) {
            alert('Error actualizando urgencia');
        } else {
            const updatedReport = { ...selectedReport, ai_urgency: newColor };
            setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
            setSelectedReport(updatedReport);
        }
        setUpdatingColor(false);
    }

    // FILTROS
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'all' | 'in_progress' | 'quality_validation' | 'discarded' | 'assignment_rejected' | 'multi_sector_pending'>('all');
    const [listSectorFilter, setListSectorFilter] = useState<string[]>([]);
    const [listDateFrom, setListDateFrom] = useState('');
    const [listDateTo, setListDateTo] = useState('');
    const [listSectorDropdownOpen, setListSectorDropdownOpen] = useState(false);
    const [listSectorSearch, setListSectorSearch] = useState('');
    const listSectorDropdownRef = useRef<HTMLDivElement>(null);

    // Close sector dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (listSectorDropdownRef.current && !listSectorDropdownRef.current.contains(e.target as Node)) {
                setListSectorDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);



    const filteredReports = reports.filter(report => {
        // Filtro por Estado (Mapeo de UI a valores BD)
        const matchesStatus =
            statusFilter === 'all' ? (report.status !== 'discarded' && report.status !== 'assignment_rejected') :
                statusFilter === 'pending' ? (report.status === 'pending' || report.status === 'analyzed') :
                    statusFilter === 'in_progress' ? (report.status === 'pending_resolution' || report.status === 'multi_sector_pending') :
                        statusFilter === 'quality_validation' ? report.status === 'quality_validation' :
                            statusFilter === 'resolved' ? report.status === 'resolved' :
                                statusFilter === 'discarded' ? report.status === 'discarded' :
                                    statusFilter === 'assignment_rejected' ? report.status === 'assignment_rejected' : true;

        // Filtro por Texto (ID, Sector, Contenido)
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            report.tracking_id?.toLowerCase().includes(searchLower) ||
            report.sector?.toLowerCase().includes(searchLower) ||
            report.content?.toLowerCase().includes(searchLower) ||
            report.ai_summary?.toLowerCase().includes(searchLower);

        // Filtro por Sector (multi-select)
        const matchesSector = listSectorFilter.length === 0 || listSectorFilter.includes(report.sector);

        // Filtro por Fecha Desde
        let matchesDateFrom = true;
        if (listDateFrom) {
            const from = new Date(listDateFrom);
            from.setHours(0, 0, 0, 0);
            matchesDateFrom = new Date(report.created_at) >= from;
        }

        // Filtro por Fecha Hasta
        let matchesDateTo = true;
        if (listDateTo) {
            const to = new Date(listDateTo);
            to.setHours(23, 59, 59, 999);
            matchesDateTo = new Date(report.created_at) <= to;
        }

        return matchesStatus && matchesSearch && matchesSector && matchesDateFrom && matchesDateTo;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());



    // Calculate Expiration Alerts
    const expirationAlerts = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const warningThreshold = new Date();
        warningThreshold.setDate(today.getDate() + 5); // Warn 5 days in advance

        return reports.filter(r => {
            if (!r.implementation_date || r.status === 'resolved' || r.status === 'discarded') return false;
            const implDate = new Date(r.implementation_date);
            // Check if date is valid
            if (isNaN(implDate.getTime())) return false;

            return implDate <= warningThreshold;
        }).sort((a, b) => new Date(a.implementation_date).getTime() - new Date(b.implementation_date).getTime());
    }, [reports]);

    // Auto-open notifications if urgency exists (initially)
    useEffect(() => {
        if (expirationAlerts.length > 0) {
            setShowNotifications(true);
        }
    }, [expirationAlerts.length]);

    return (
        <div className="max-w-7xl mx-auto p-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <LayoutDashboard className="text-sanatorio-primary" />
                        Tablero de Control
                    </h1>
                    <p className="text-gray-500">Gestión de Calidad y Seguridad del Paciente</p>
                </div>
                {/* Stats Summary */}
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`bg-white px-4 py-2 rounded-lg border border-gray-200 flex items-center gap-2 text-sm font-medium shadow-sm transition-all hover:bg-gray-50
                            ${showNotifications ? 'ring-2 ring-orange-100 border-orange-200' : ''}
                        `}
                    >
                        <Bell className={`w-4 h-4 ${expirationAlerts.length > 0 ? 'text-orange-600 animate-pulse' : 'text-gray-400'}`} />
                        <span className="text-gray-700">Notificaciones</span>
                        {expirationAlerts.length > 0 && (
                            <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {expirationAlerts.length}
                            </span>
                        )}
                    </button>

                    <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 flex items-center gap-4 text-sm font-medium shadow-sm">
                        <span className="flex items-center gap-1 text-red-600 font-bold">
                            <ShieldAlert className="w-4 h-4" />
                            {reports.filter(r => r.ai_urgency === 'Rojo').length} Críticos
                        </span>
                    </div>
                </div>
            </div>

            {/* Notifications Panel */}
            {showNotifications && (
                <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                        <div className="bg-orange-50/50 p-4 border-b border-orange-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2">
                                <Bell className="w-4 h-4" />
                                Alertas de Vencimiento
                            </h3>
                            <button onClick={() => setShowNotifications(false)} className="text-orange-400 hover:text-orange-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {expirationAlerts.length > 0 ? (
                            <div className="p-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                {expirationAlerts.map(alert => {
                                    const implDate = new Date(alert.implementation_date);
                                    const today = new Date();
                                    const isOverdue = implDate < today;
                                    const daysDiff = Math.ceil((implDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

                                    return (
                                        <button
                                            key={alert.id}
                                            onClick={() => setSelectedReport(alert)}
                                            className={`text-left p-3 rounded-xl border transition-all hover:shadow-md flex items-start gap-3 group
                                            ${isOverdue
                                                    ? 'bg-red-50 border-red-100 hover:border-red-200'
                                                    : 'bg-orange-50/30 border-orange-100 hover:border-orange-200'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                                <Clock className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-bold text-gray-800 text-xs">#{alert.tracking_id}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isOverdue ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'}`}>
                                                        {isOverdue ? 'Vencido' : `${daysDiff} días`}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 line-clamp-1 mb-1">{alert.sector}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">
                                                    Vence: {implDate.toLocaleDateString()}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <CheckCircle className="w-6 h-6 text-green-500/50" />
                                </div>
                                <p className="text-sm font-medium text-gray-600">Todo al día</p>
                                <p className="text-xs">No hay acciones correctivas próximas a vencer.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Barra de Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">

                {/* Tabs de Estado */}
                <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto flex-wrap">
                    {[
                        { id: 'all', label: 'Todos', tooltip: 'Vista general de todos los casos activos (excluye descartados y rechazados).' },
                        { id: 'pending', label: 'Pendientes', tooltip: 'Hallazgos nuevos que aún no fueron derivados a ningún responsable. Calidad todavía no les envió WhatsApp.' },
                        { id: 'in_progress', label: 'En Gestión', tooltip: 'Ya se envió el mensaje al responsable (o múltiples sectores) pero todavía no respondieron. Están "en curso".' },
                        { id: 'quality_validation', label: 'Por Validar', tooltip: 'El responsable ya envió su resolución, pero Calidad aún debe revisar y aprobar la respuesta.' },
                        { id: 'resolved', label: 'Resueltos', tooltip: 'Calidad aprobó la resolución. Caso cerrado ✅' },
                        { id: 'assignment_rejected', label: '⚡ Rechazados', tooltip: 'El responsable rechazó la asignación (no le correspondía, etc.). Requiere reasignación por Calidad.' },
                        { id: 'discarded', label: 'Descartados', tooltip: 'Calidad decidió descartar el hallazgo (no procede, duplicado, etc.).' }
                    ].map(tab => (
                        <div key={tab.id} className="group relative">
                            <button
                                onClick={() => setStatusFilter(tab.id as 'pending' | 'resolved' | 'all' | 'in_progress' | 'quality_validation' | 'discarded' | 'assignment_rejected')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${statusFilter === tab.id
                                    ? 'bg-white text-sanatorio-primary shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-2.5 bg-gray-800 text-white text-[11px] leading-snug rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center z-50 shadow-lg">
                                {tab.tooltip}
                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Buscador */}
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Buscar por ID, sector o problema..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary transition-all outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                </div>
            </div>

            {/* Filtros de Sector + Fecha + Export */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 relative z-30">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
                    <div className="flex items-center gap-2 shrink-0">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filtros</span>
                    </div>

                    {/* Sector Multi-Select */}
                    <div className="relative flex-1 min-w-[200px]" ref={listSectorDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setListSectorDropdownOpen(!listSectorDropdownOpen)}
                            className={`w-full flex items-center gap-2 bg-gray-50 border rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${listSectorFilter.length > 0 ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate flex-1 text-left">
                                {listSectorFilter.length === 0 ? 'Todos los sectores' :
                                    listSectorFilter.length === 1 ? listSectorFilter[0] :
                                        `${listSectorFilter.length} sectores`}
                            </span>
                            {listSectorFilter.length > 0 && (
                                <span className="shrink-0 w-5 h-5 bg-sanatorio-primary text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                                    {listSectorFilter.length}
                                </span>
                            )}
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${listSectorDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {listSectorDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-w-md">
                                <div className="p-2 border-b border-gray-100">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={listSectorSearch}
                                            onChange={(e) => setListSectorSearch(e.target.value)}
                                            placeholder="Buscar sector..."
                                            className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-sanatorio-primary/30 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="px-2 py-1.5 border-b border-gray-100 flex gap-2">
                                    <button type="button" onClick={() => { setListSectorFilter(SECTOR_OPTIONS.map(s => s.value)); }} className="text-[10px] font-bold text-sanatorio-primary hover:underline">Todos</button>
                                    {listSectorFilter.length > 0 && (
                                        <button type="button" onClick={() => setListSectorFilter([])} className="text-[10px] font-bold text-red-500 hover:underline">Limpiar</button>
                                    )}
                                </div>
                                <div className="max-h-[240px] overflow-y-auto">
                                    {SECTOR_OPTIONS.filter(s =>
                                        s.label.toLowerCase().includes(listSectorSearch.toLowerCase()) ||
                                        s.value.toLowerCase().includes(listSectorSearch.toLowerCase())
                                    ).map(s => {
                                        const isSelected = listSectorFilter.includes(s.value);
                                        return (
                                            <button
                                                key={s.value}
                                                type="button"
                                                onClick={() => {
                                                    setListSectorFilter(prev =>
                                                        isSelected ? prev.filter(v => v !== s.value) : [...prev, s.value]
                                                    );
                                                }}
                                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${isSelected ? 'bg-sanatorio-primary/5 font-bold text-sanatorio-primary' : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-sanatorio-primary border-sanatorio-primary' : 'border-gray-300 bg-white'
                                                    }`}>
                                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className="truncate">{s.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Date From */}
                    <div className="flex items-center gap-1.5 min-w-[170px]">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Desde</span>
                        <div className="relative flex-1">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="date"
                                value={listDateFrom}
                                onChange={(e) => setListDateFrom(e.target.value)}
                                max={listDateTo || undefined}
                                className={`w-full bg-gray-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium transition-all outline-none focus:ring-1 focus:ring-sanatorio-primary/30 ${listDateFrom ? 'border-purple-300 bg-purple-50/50' : 'border-gray-200'}`}
                                title="Fecha desde"
                            />
                        </div>
                    </div>

                    {/* Date To */}
                    <div className="flex items-center gap-1.5 min-w-[170px]">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Hasta</span>
                        <div className="relative flex-1">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="date"
                                value={listDateTo}
                                onChange={(e) => setListDateTo(e.target.value)}
                                min={listDateFrom || undefined}
                                className={`w-full bg-gray-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium transition-all outline-none focus:ring-1 focus:ring-sanatorio-primary/30 ${listDateTo ? 'border-purple-300 bg-purple-50/50' : 'border-gray-200'}`}
                                title="Fecha hasta"
                            />
                        </div>
                    </div>

                    {/* Clear filters */}
                    {(listSectorFilter.length > 0 || listDateFrom || listDateTo) && (
                        <button
                            type="button"
                            onClick={() => { setListSectorFilter([]); setListDateFrom(''); setListDateTo(''); }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                        >
                            ✕ Limpiar
                        </button>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Export Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                const statusLabel = (s: string) =>
                                    s === 'pending' || s === 'analyzed' ? 'Pendiente' :
                                        s === 'pending_resolution' ? 'En Gestión' :
                                            s === 'quality_validation' ? 'Validación' :
                                                s === 'resolved' ? 'Resuelto' :
                                                    s === 'discarded' ? 'Descartado' : s;
                                const data = filteredReports.map(r => ({
                                    'ID': r.tracking_id || '',
                                    'Fecha': r.created_at ? new Date(r.created_at).toLocaleDateString('es-AR') : '',
                                    'Sector': r.sector || '',
                                    'Problema': r.ai_summary || r.content?.substring(0, 100) || '',
                                    'Prioridad': r.ai_urgency || 'Normal',
                                    'Estado': statusLabel(r.status),
                                    'Clasificación': r.ai_category || 'Sin clasificar',
                                    'Anónimo': r.is_anonymous ? 'Sí' : 'No'
                                }));
                                const ws = XLSX.utils.json_to_sheet(data);
                                const wb = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(wb, ws, 'Reportes');
                                XLSX.writeFile(wb, `reportes_calidad_${new Date().toISOString().slice(0, 10)}.xlsx`);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            XLSX
                        </button>
                        <button
                            type="button"
                            onClick={async () => {
                                const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
                                // Logo
                                try {
                                    const logoImg = new Image();
                                    logoImg.crossOrigin = 'Anonymous';
                                    logoImg.src = '/logosanatorio.png';
                                    await new Promise<void>((resolve) => {
                                        logoImg.onload = () => resolve();
                                        logoImg.onerror = () => resolve();
                                    });
                                    const canvas = document.createElement('canvas');
                                    canvas.width = logoImg.naturalWidth;
                                    canvas.height = logoImg.naturalHeight;
                                    const ctx = canvas.getContext('2d');
                                    ctx?.drawImage(logoImg, 0, 0);
                                    const logoData = canvas.toDataURL('image/png');
                                    doc.addImage(logoData, 'PNG', 14, 8, 30, 12);
                                } catch { /* skip logo */ }

                                doc.setFontSize(16);
                                doc.setFont('helvetica', 'bold');
                                doc.setTextColor(0, 43, 77);
                                doc.text('Listado de Casos — Gestión de Calidad', 50, 16);
                                doc.setFontSize(9);
                                doc.setFont('helvetica', 'normal');
                                doc.setTextColor(120, 120, 120);
                                doc.text(`Generado: ${new Date().toLocaleString('es-AR')} | Total: ${filteredReports.length} casos`, 50, 22);
                                doc.setDrawColor(0, 43, 77);
                                doc.setLineWidth(0.5);
                                doc.line(14, 25, 283, 25);

                                const statusLabel = (s: string) =>
                                    s === 'pending' || s === 'analyzed' ? 'Pendiente' :
                                        s === 'pending_resolution' ? 'En Gestión' :
                                            s === 'quality_validation' ? 'Validación' :
                                                s === 'resolved' ? 'Resuelto' :
                                                    s === 'discarded' ? 'Descartado' : s;
                                autoTable(doc, {
                                    startY: 28,
                                    head: [['ID', 'Fecha', 'Sector', 'Problema', 'Prioridad', 'Estado', 'Clasificación']],
                                    body: filteredReports.map(r => [
                                        r.tracking_id || '',
                                        r.created_at ? new Date(r.created_at).toLocaleDateString('es-AR') : '',
                                        r.sector || '',
                                        (r.ai_summary || r.content?.substring(0, 80) || '').substring(0, 60),
                                        r.ai_urgency || 'Normal',
                                        statusLabel(r.status),
                                        r.ai_category || 'Sin clasificar'
                                    ]),
                                    styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
                                    headStyles: { fillColor: [0, 43, 77], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                                    alternateRowStyles: { fillColor: [245, 247, 250] },
                                    columnStyles: {
                                        0: { cellWidth: 28 },
                                        1: { cellWidth: 24, halign: 'center' as const },
                                        2: { cellWidth: 35 },
                                        3: { cellWidth: 75 },
                                        4: { cellWidth: 22, halign: 'center' as const },
                                        5: { cellWidth: 25, halign: 'center' as const },
                                        6: { cellWidth: 35 }
                                    },
                                    margin: { left: 14, right: 14, top: 28 },
                                    didDrawPage: (data: any) => {
                                        doc.setFontSize(7);
                                        doc.setTextColor(160, 160, 160);
                                        doc.text('Sanatorio Argentino — Sistema de Gestión de Calidad', 14, doc.internal.pageSize.height - 8);
                                        doc.text(`Página ${data.pageNumber}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 8);
                                    }
                                });
                                doc.save(`reportes_calidad_${new Date().toISOString().slice(0, 10)}.pdf`);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            PDF
                        </button>
                    </div>
                </div>

                {/* Active filter summary */}
                {(listSectorFilter.length > 0 || listDateFrom || listDateTo) && (
                    <div className="mt-3 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-blue-700">📊 {filteredReports.length} reportes filtrados</span>
                        <span className="text-[10px] text-gray-400">de {reports.length} totales</span>
                    </div>
                )}
            </div>

            {/* Main Content - List View */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p>Cargando reportes...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4">Sector</th>
                                    <th className="px-6 py-4">Problema</th>
                                    <th className="px-6 py-4">Prioridad</th>
                                    <th className="px-6 py-4 text-center">Notif.</th>
                                    <th className="px-6 py-4">Clasificación</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredReports.length > 0 ? (
                                    filteredReports.map((report) => (
                                        <tr key={report.id} onClick={() => setSelectedReport(report)} className="hover:bg-blue-50/40 cursor-pointer transition-colors group">
                                            <td className="px-6 py-4">
                                                {(report.finding_type === 'Felicitación' || report.ai_category === 'Felicitación') ? (
                                                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center" title="Felicitación">⭐</div>
                                                ) : report.status === 'resolved' ? (
                                                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle className="w-3 h-3" /></div>
                                                ) : report.status === 'multi_sector_pending' ? (
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center animate-pulse" title="Multi-Sector">
                                                        <span className="text-[9px] font-black">MS</span>
                                                    </div>
                                                ) : report.status === 'pending_resolution' ? (
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center animate-pulse"><Clock className="w-3 h-3" /></div>
                                                ) : report.status === 'quality_validation' ? (
                                                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">Q</div>
                                                ) : report.status === 'assignment_rejected' ? (
                                                    <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><XCircle className="w-3 h-3" /></div>
                                                ) : report.status === 'discarded' ? (
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"><Archive className="w-3 h-3" /></div>
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"><AlertCircle className="w-3 h-3" /></div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-700 group-hover:text-sanatorio-primary transition-colors">{report.tracking_id}</td>
                                            <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{report.created_at ? new Date(report.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{report.sector || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 line-clamp-1 max-w-xs">{report.ai_summary || report.content}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                                                    ${report.ai_urgency === 'Rojo' ? 'bg-red-100 text-red-700' :
                                                        report.ai_urgency === 'Amarillo' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'
                                                    } `}>
                                                    {report.ai_urgency || 'Normal'}
                                                </span>
                                                {/* Expiration Alert */}
                                                {(report.implementation_date && new Date(report.implementation_date) < new Date() && report.status !== 'resolved') && (
                                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 animate-pulse" title={`Vencido el ${new Date(report.implementation_date).toLocaleDateString()}`}>
                                                        <Clock className="w-3 h-3 mr-1" /> Vencido
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {report.last_whatsapp_status === 'sent' && (
                                                    <div title={`Enviado: ${new Date(report.last_whatsapp_sent_at).toLocaleString()}`} className="w-3 h-3 rounded-full bg-green-500 mx-auto shadow-sm shadow-green-200"></div>
                                                )}
                                                {report.last_whatsapp_status === 'failed' && (
                                                    <div title="Fallo en envío" className="w-3 h-3 rounded-full bg-red-500 mx-auto animate-pulse shadow-sm shadow-red-200"></div>
                                                )}
                                                {!report.last_whatsapp_status && (
                                                    <div className="w-2 h-2 rounded-full bg-gray-200 mx-auto"></div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${(!report.ai_category || report.ai_category === 'Sin clasificar') ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
                                                    {report.ai_category || 'Sin clasificar'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                                            No se encontraron reportes con los criterios seleccionados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Detalle */}
            {selectedReport && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] shadow-2xl flex overflow-hidden">

                        {/* Columna Izquierda: Información del Reporte */}
                        <div className="w-1/2 p-8 overflow-y-auto bg-white">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-sanatorio-primary">Ticket #{selectedReport.tracking_id}</h2>
                                    <p className="text-sm text-gray-400">{new Date(selectedReport.created_at).toLocaleString()}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Prioridad</span>
                                    {isAdmin ? (
                                        <div className="flex gap-1.5 p-1 bg-gray-50 rounded-full border border-gray-100">
                                            {['Verde', 'Amarillo', 'Rojo'].map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => handleUpdateUrgency(color)}
                                                    title={`Cambiar prioridad a ${color}`}
                                                    className={`w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center relative group
                                                        ${color === 'Rojo' ? 'bg-red-500 hover:bg-red-600' : color === 'Amarillo' ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-green-500 hover:bg-green-600'}
                                                        ${selectedReport.ai_urgency === color
                                                            ? 'scale-110 ring-2 ring-offset-1 ring-gray-200 shadow-sm opacity-100'
                                                            : 'opacity-30 hover:opacity-100 grayscale hover:grayscale-0'
                                                        }
                                                    `}
                                                >
                                                    {selectedReport.ai_urgency === color && (
                                                        <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                                            ${selectedReport.ai_urgency === 'Rojo' ? 'bg-red-100 text-red-700' :
                                                selectedReport.ai_urgency === 'Amarillo' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'
                                            }`}>
                                            <span className={`w-2 h-2 rounded-full ${selectedReport.ai_urgency === 'Rojo' ? 'bg-red-500' : selectedReport.ai_urgency === 'Amarillo' ? 'bg-yellow-400' : 'bg-green-500'}`}></span>
                                            {selectedReport.ai_urgency || 'Normal'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-1">Resumen IA</h3>
                                    <p className="text-blue-900 leading-relaxed font-medium">{selectedReport.ai_summary}</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-2">Descripción Original</h3>
                                    <div className="p-4 bg-gray-50 rounded-xl text-gray-600 text-sm leading-relaxed border border-gray-100">
                                        "{selectedReport.content}"
                                    </div>

                                    {/* Sector Info — Editable by Admin */}
                                    <div className="mt-4 flex gap-4">
                                        <div className="flex-1">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Sector Destino</h3>
                                            {isAdmin ? (
                                                <select
                                                    value={selectedReport.sector || ''}
                                                    onChange={async (e) => {
                                                        const newSector = e.target.value;
                                                        const { error } = await supabase.from('reports').update({ sector: newSector }).eq('id', selectedReport.id);
                                                        if (!error) {
                                                            const updatedReport = { ...selectedReport, sector: newSector };
                                                            setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
                                                            setSelectedReport(updatedReport);
                                                        }
                                                    }}
                                                    className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg p-2 outline-none focus:border-sanatorio-primary focus:ring-1 focus:ring-sanatorio-primary font-bold"
                                                >
                                                    <option value="">Seleccionar sector...</option>
                                                    {SECTOR_OPTIONS.map(s => (
                                                        <option key={`dest-${s.value}`} value={s.value}>{s.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="text-sm font-bold text-gray-700">{selectedReport.sector}</p>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Sector Origen</h3>
                                            {isAdmin ? (
                                                <select
                                                    value={selectedReport.reporter_sector || selectedReport.origin_sector || ''}
                                                    onChange={async (e) => {
                                                        const newOrigin = e.target.value;
                                                        const { error } = await supabase.from('reports').update({ reporter_sector: newOrigin }).eq('id', selectedReport.id);
                                                        if (!error) {
                                                            const updatedReport = { ...selectedReport, reporter_sector: newOrigin };
                                                            setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
                                                            setSelectedReport(updatedReport);
                                                        }
                                                    }}
                                                    className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg p-2 outline-none focus:border-sanatorio-primary focus:ring-1 focus:ring-sanatorio-primary font-bold"
                                                >
                                                    <option value="">Seleccionar sector...</option>
                                                    {SECTOR_OPTIONS.map(s => (
                                                        <option key={`orig-${s.value}`} value={s.value}>{s.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="text-sm font-bold text-gray-700">
                                                    {selectedReport.reporter_sector || selectedReport.origin_sector || 'Sin asignar'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tipo de Hallazgo (1st Dropdown - Admin Only) */}
                                    <div className="mt-4">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Tipo de Hallazgo</h3>
                                        {isAdmin ? (
                                            <>
                                                <select
                                                    value={selectedReport.finding_type || ''}
                                                    onChange={async (e) => {
                                                        const newType = e.target.value;
                                                        const { error } = await supabase.from('reports').update({ finding_type: newType }).eq('id', selectedReport.id);
                                                        if (!error) {
                                                            const updatedReport = { ...selectedReport, finding_type: newType };
                                                            setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
                                                            setSelectedReport(updatedReport);
                                                        }
                                                    }}
                                                    className={`w-full bg-white border text-sm rounded-lg p-2.5 outline-none focus:border-sanatorio-primary focus:ring-1 focus:ring-sanatorio-primary ${!selectedReport.finding_type
                                                        ? 'border-amber-300 bg-amber-50'
                                                        : 'border-gray-200 text-gray-700'
                                                        }`}
                                                >
                                                    <option value="">⚠️ Seleccionar tipo...</option>
                                                    <option value="Oportunidad de Mejora">Oportunidad de Mejora</option>
                                                    <option value="Observación">Observación</option>
                                                    <option value="Evento Adverso">Evento Adverso</option>
                                                    <option value="Evento Cuasi Adverso">Evento Cuasi Adverso</option>
                                                    <option value="Desvío">Desvío</option>
                                                </select>
                                                {!selectedReport.finding_type && (
                                                    <p className="text-[10px] text-amber-600 mt-1 font-medium">⚠ Este ticket necesita clasificación de hallazgo</p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                {selectedReport.finding_type || 'Sin clasificar'}
                                            </p>
                                        )}
                                    </div>

                                    {/* Origin Field (Editable - Admin Only) */}
                                    <div className="mt-4">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Origen (Calidad)</h3>
                                        {isAdmin ? (
                                            <select
                                                value={selectedReport.resolution_notes?.split('Origen: ')[1]?.split('.')[0] || 'Observación/Hallazgo'}
                                                onChange={async (e) => {
                                                    const newOrigin = e.target.value;
                                                    let currentNotes = selectedReport.resolution_notes || '';
                                                    let newNotes = currentNotes;
                                                    if (currentNotes.includes('Origen: ')) {
                                                        newNotes = currentNotes.replace(/Origen: [^.]*/, `Origen: ${newOrigin}`);
                                                    } else {
                                                        newNotes = `${currentNotes ? currentNotes + '. ' : ''}Origen: ${newOrigin}`;
                                                    }
                                                    const { error } = await supabase.from('reports').update({ resolution_notes: newNotes }).eq('id', selectedReport.id);
                                                    if (!error) {
                                                        const updatedReport = { ...selectedReport, resolution_notes: newNotes };
                                                        setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
                                                        setSelectedReport(updatedReport);
                                                    }
                                                }}
                                                className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg p-2.5 outline-none focus:border-sanatorio-primary focus:ring-1 focus:ring-sanatorio-primary"
                                            >
                                                <option value="Observación/Hallazgo">Observación/Hallazgo</option>
                                                <option value="Auditoría fin de semana">Auditoría fin de semana</option>
                                                <option value="Auditoría de proceso">Auditoría de proceso</option>
                                                <option value="5S">5S</option>
                                                <option value="Evento Adverso">Evento Adverso</option>
                                            </select>
                                        ) : (
                                            <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                {selectedReport.resolution_notes?.split('Origen: ')[1]?.split('.')[0] || 'Observación/Hallazgo'}
                                            </p>
                                        )}
                                    </div>

                                    {/* Clasificación Operativa (Tableau) */}
                                    <div className="mt-4">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Clasificación Operativa</h3>
                                        {isAdmin ? (
                                            <>
                                                <select
                                                    value={selectedReport.ai_category || 'Sin clasificar'}
                                                    onChange={async (e) => {
                                                        const newCategory = e.target.value;
                                                        const { error } = await supabase.from('reports').update({ ai_category: newCategory }).eq('id', selectedReport.id);
                                                        if (!error) {
                                                            const updatedReport = { ...selectedReport, ai_category: newCategory };
                                                            setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
                                                            setSelectedReport(updatedReport);
                                                        }
                                                    }}
                                                    className={`w-full bg-white border text-sm rounded-lg p-2.5 outline-none focus:border-sanatorio-primary focus:ring-1 focus:ring-sanatorio-primary ${(!selectedReport.ai_category || selectedReport.ai_category === 'Sin clasificar')
                                                        ? 'border-amber-300 bg-amber-50'
                                                        : 'border-gray-200 text-gray-700'
                                                        }`}
                                                >
                                                    <option value="Sin clasificar">⚠️ Sin clasificar</option>
                                                    {CLASSIFICATION_CATEGORIES.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                                {(!selectedReport.ai_category || selectedReport.ai_category === 'Sin clasificar') && (
                                                    <p className="text-[10px] text-amber-600 mt-1 font-medium">⚠ Este ticket necesita clasificación operativa</p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-sm text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                                {selectedReport.ai_category || 'Sin clasificar'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {selectedReport.evidence_urls && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 mb-2">Evidencia</h3>
                                        <div className="flex gap-2">
                                            {selectedReport.evidence_urls.map((url: string, i: number) => (
                                                <a key={i} href={url} target="_blank" className="w-20 h-20 rounded-lg bg-gray-100 bg-cover border border-gray-200" style={{ backgroundImage: `url(${url})` }} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ========== OBSERVACIONES DE CALIDAD ========== */}
                                <div className="border-t border-gray-100 pt-6">
                                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                                        Observaciones de Calidad
                                    </h3>
                                    {isAdmin ? (
                                        <div className="space-y-3">
                                            <textarea
                                                value={observationText}
                                                onChange={(e) => {
                                                    setObservationText(e.target.value);
                                                    setObservationSaved(false);
                                                }}
                                                placeholder="Escribí observaciones internas sobre este caso...&#10;(Solo visible para el equipo de Calidad)"
                                                className="w-full min-h-[120px] p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all resize-y leading-relaxed"
                                            />
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] text-gray-400 italic">🔒 Visible solo para administradores de Calidad</p>
                                                <button
                                                    onClick={async () => {
                                                        if (!selectedReport) return;
                                                        setIsSavingObservation(true);
                                                        const { error } = await supabase
                                                            .from('reports')
                                                            .update({ quality_observations: observationText })
                                                            .eq('id', selectedReport.id);
                                                        if (!error) {
                                                            const updatedReport = { ...selectedReport, quality_observations: observationText };
                                                            setReports(reports.map(r => r.id === selectedReport.id ? updatedReport : r));
                                                            setSelectedReport(updatedReport);
                                                            setObservationSaved(true);
                                                            setTimeout(() => setObservationSaved(false), 3000);
                                                        }
                                                        setIsSavingObservation(false);
                                                    }}
                                                    disabled={isSavingObservation}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${observationSaved
                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'
                                                        }`}
                                                >
                                                    {isSavingObservation ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : observationSaved ? (
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Save className="w-3.5 h-3.5" />
                                                    )}
                                                    {isSavingObservation ? 'Guardando...' : observationSaved ? '¡Guardado!' : 'Guardar'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        selectedReport.quality_observations ? (
                                            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedReport.quality_observations}</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic p-4 bg-gray-50 rounded-xl border border-gray-100">Sin observaciones registradas.</p>
                                        )
                                    )}
                                </div>

                                <div className="border-t border-gray-100 pt-6">
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-sanatorio-primary" />
                                        Historial de Actividad
                                    </h3>
                                    <div className="space-y-0 relative">
                                        {/* Vertical guide */}
                                        <div className="absolute top-2 bottom-2 left-[4px] w-0.5 bg-gray-100"></div>

                                        {(() => {
                                            // Build events array from all sources
                                            const events: { date: string; message: string; type: string }[] = [];

                                            // 1. Ticket Created
                                            events.push({
                                                date: new Date(selectedReport.created_at).toLocaleString('es-AR', {
                                                    timeZone: 'America/Argentina/Buenos_Aires',
                                                    day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                }),
                                                message: 'Ticket Creado',
                                                type: 'start'
                                            });

                                            // 2. Parse Notes (each entry separated by \n\n)
                                            if (selectedReport.notes) {
                                                const entries = selectedReport.notes.split('\n\n').filter((n: string) => n.trim().length > 0);
                                                entries.forEach((entry: string) => {
                                                    const match = entry.match(/^\[([^\]]+)\]\s?(.*)/);
                                                    if (match) {
                                                        const msg = match[2];
                                                        let type = 'info';
                                                        if (msg.includes('📤 DERIVADO') || msg.includes('Derivado')) type = 'derivation';
                                                        else if (msg.includes('🔴 RECHAZO DE ASIGNACIÓN')) type = 'rejection';
                                                        else if (msg.includes('⚠️ RECHAZADO POR CALIDAD')) type = 'quality_return';
                                                        else if (msg.includes('🔄 APELADO') || msg.includes('REABIERTO')) type = 'reopen';
                                                        else if (msg.includes('✅ APROBADO POR CALIDAD')) type = 'approved';
                                                        else if (msg.includes('❌ ERROR')) type = 'error';

                                                        events.push({ date: match[1], message: msg, type });
                                                    } else {
                                                        // Legacy plain notes (no timestamp format)
                                                        events.push({ date: '', message: entry, type: 'note' });
                                                    }
                                                });
                                            }

                                            // 3. Resolved event (if applicable and not already in notes)
                                            if (selectedReport.resolved_at && !events.some(e => e.type === 'approved')) {
                                                events.push({
                                                    date: new Date(selectedReport.resolved_at).toLocaleString('es-AR', {
                                                        timeZone: 'America/Argentina/Buenos_Aires',
                                                        day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                    }),
                                                    message: 'Resolución Finalizada',
                                                    type: 'resolved'
                                                });
                                            }

                                            // Color mapping
                                            const dotColor: Record<string, string> = {
                                                start: 'bg-gray-300',
                                                derivation: 'bg-blue-400',
                                                rejection: 'bg-red-500',
                                                quality_return: 'bg-orange-500',
                                                reopen: 'bg-amber-500',
                                                approved: 'bg-green-500',
                                                resolved: 'bg-green-500',
                                                error: 'bg-red-400',
                                                info: 'bg-purple-400',
                                                note: 'bg-purple-400'
                                            };

                                            const textColor: Record<string, string> = {
                                                start: 'text-gray-600',
                                                derivation: 'text-blue-700',
                                                rejection: 'text-red-600 font-bold',
                                                quality_return: 'text-orange-700 font-bold',
                                                reopen: 'text-amber-700 font-bold',
                                                approved: 'text-green-700 font-bold',
                                                resolved: 'text-green-700 font-bold',
                                                error: 'text-red-600',
                                                info: 'text-gray-600',
                                                note: 'text-gray-600 italic'
                                            };

                                            return events.map((event, idx) => (
                                                <div key={idx} className="flex gap-3 relative pb-4 pl-4 last:pb-0">
                                                    <div className={`absolute left-0 top-1 w-2.5 h-2.5 rounded-full ${dotColor[event.type] || 'bg-gray-300'} ring-4 ring-white z-10`}></div>
                                                    <div className="min-w-0">
                                                        {event.date && (
                                                            <p className="text-xs text-gray-400 font-mono mb-0.5 truncate">{event.date}</p>
                                                        )}
                                                        <p className={`text-sm ${textColor[event.type] || 'text-gray-600'}`}>
                                                            {event.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha: Gestión y Resolución */}
                        <div className="w-1/2 bg-gray-50 border-l border-gray-200 p-8 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-gray-800">{isAdmin ? 'Centro de Gestión' : 'Detalle del Caso'}</h3>
                                <div className="flex items-center gap-1">
                                    {isAdmin && (
                                        <button
                                            onClick={() => setShowDeleteModal(true)}
                                            className="p-2 hover:bg-red-100 rounded-full group transition-colors"
                                            title="Eliminar reporte"
                                        >
                                            <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                                        </button>
                                    )}
                                    <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2">
                                {selectedReport.status === 'resolved' ? (
                                    // VISTA RESOLUCIÓN COMPLETADA
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-100 flex flex-col h-full">
                                        <div className="flex items-center gap-3 mb-6 bg-green-50 p-4 rounded-xl border border-green-100">
                                            <div className="w-12 h-12 rounded-full bg-white text-green-600 flex items-center justify-center shadow-sm">
                                                <CheckCircle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 text-lg">Caso Cerrado</h4>
                                                <p className="text-sm text-green-700 font-medium">Gestión completada exitosamente</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                            {/* Responsable */}
                                            {selectedReport.assigned_to && (
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                                        <UserCog className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-bold uppercase">Resuelto por</p>
                                                        <p className="text-sm font-bold text-gray-700">{selectedReport.assigned_to}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Detalles de Resolución */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h5 className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-sanatorio-primary"></span>
                                                        Notas de Resolución
                                                    </h5>
                                                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                        {selectedReport.resolution_notes || "Sin notas registradas."}
                                                    </p>
                                                </div>

                                                {selectedReport.root_cause && (
                                                    <div>
                                                        <h5 className="text-xs font-bold text-amber-600 uppercase mb-1 flex items-center gap-2">
                                                            <BrainCircuit className="w-3 h-3" />
                                                            Causa Raíz
                                                        </h5>
                                                        <p className="text-sm text-gray-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                                            {selectedReport.root_cause}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Plan de Acción */}
                                                {selectedReport.corrective_plan && (
                                                    <div>
                                                        <h5 className="text-xs font-bold text-green-600 uppercase mb-1 flex items-center gap-2">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Plan de Acción
                                                        </h5>
                                                        <div className="bg-green-50 p-3 rounded-lg border border-green-100 space-y-2">
                                                            <p className="text-sm text-gray-700 leading-relaxed">
                                                                {selectedReport.corrective_plan}
                                                            </p>
                                                            {selectedReport.implementation_date && (
                                                                <div className="flex items-center gap-2 text-xs font-bold text-green-700 pt-2 border-t border-green-200/50">
                                                                    <Clock className="w-3 h-3" />
                                                                    Fecha Implementación: {new Date(selectedReport.implementation_date).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Evidencia de Resolución */}
                                                {selectedReport.resolution_evidence_urls && selectedReport.resolution_evidence_urls.length > 0 && (
                                                    <div>
                                                        <h5 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-2">
                                                            <Camera className="w-3 h-3" />
                                                            Evidencia de Resolución
                                                        </h5>
                                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                                            {selectedReport.resolution_evidence_urls.map((url: string, i: number) => (
                                                                <a key={i} href={url} target="_blank" className="w-16 h-16 rounded-lg bg-gray-100 bg-cover bg-center border border-gray-200 flex-shrink-0 hover:ring-2 ring-blue-400 transition-all" style={{ backgroundImage: `url(${url})` }} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {isAdmin && (
                                            <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowReopenModal(true);
                                                    }}
                                                    className="w-full py-3 px-4 bg-red-50 border border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <BrainCircuit className="w-5 h-5" />
                                                    Apelar / Solicitar Corrección
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : selectedReport.status === 'multi_sector_pending' ? (() => {
                                    // VISTA MULTI-SECTOR — Progress Panel (hooks are at top-level)
                                    const totalAssignments = sectorAssignmentsData.length;
                                    const resolvedCount = sectorAssignmentsData.filter(a => a.status === 'resolved' || a.status === 'quality_validation').length;
                                    const partialCount = sectorAssignmentsData.filter(a => a.status === 'partial').length;
                                    const pendingCount = sectorAssignmentsData.filter(a => a.status === 'pending').length;
                                    const rejectedCount = sectorAssignmentsData.filter(a => a.status === 'rejected').length;
                                    const progressPercent = totalAssignments > 0 ? Math.round(((resolvedCount + partialCount) / totalAssignments) * 100) : 0;

                                    const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
                                        pending: { label: 'Pendiente', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '⏳' },
                                        resolved: { label: 'Resuelto', color: 'text-green-700', bg: 'bg-green-100', icon: '✅' },
                                        quality_validation: { label: 'Validación', color: 'text-purple-700', bg: 'bg-purple-100', icon: '🔍' },
                                        partial: { label: 'Parcial', color: 'text-orange-700', bg: 'bg-orange-100', icon: '⚠️' },
                                        rejected: { label: 'Rechazado', color: 'text-red-700', bg: 'bg-red-100', icon: '❌' },
                                    };

                                    return (
                                        <div className="space-y-4">
                                            {/* Header */}
                                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                                        <span className="text-lg font-black">MS</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">Derivación Multi-Sector</h4>
                                                        <p className="text-xs text-indigo-600">
                                                            {totalAssignments} sector{totalAssignments !== 1 ? 'es' : ''} asignado{totalAssignments !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="mb-2">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className="text-xs font-bold text-gray-600">Progreso General</span>
                                                        <span className="text-xs font-bold text-indigo-700">{progressPercent}%</span>
                                                    </div>
                                                    <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-gray-100">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${progressPercent}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex gap-3 mt-2 text-[10px] font-medium text-gray-500">
                                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> {resolvedCount} resuelto{resolvedCount !== 1 ? 's' : ''}</span>
                                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> {partialCount} parcial{partialCount !== 1 ? 'es' : ''}</span>
                                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
                                                        {rejectedCount > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> {rejectedCount} rechazado{rejectedCount !== 1 ? 's' : ''}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Sector Cards */}
                                            {loadingAssignments ? (
                                                <div className="flex items-center justify-center p-6 text-gray-400">
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando asignaciones...
                                                </div>
                                            ) : (
                                                <div className="space-y-2.5">
                                                    {sectorAssignmentsData.map((assignment) => {
                                                        const config = statusConfig[assignment.status] || statusConfig.pending;
                                                        const sectorLabel = SECTOR_OPTIONS.find(s => s.value === assignment.sector)?.label || assignment.sector;

                                                        return (
                                                            <div key={assignment.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-sm px-2 py-0.5 rounded-lg ${config.bg} ${config.color} font-bold`}>
                                                                            {config.icon} {sectorLabel}
                                                                        </span>
                                                                    </div>
                                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                                                                        {config.label}
                                                                    </span>
                                                                </div>

                                                                <div className="text-xs text-gray-500 space-y-1">
                                                                    <p className="flex items-center gap-1.5">
                                                                        <Phone className="w-3 h-3" />
                                                                        {assignment.assigned_phone || 'Sin teléfono'}
                                                                    </p>
                                                                    <p className="flex items-center gap-1.5">
                                                                        <Clock className="w-3 h-3" />
                                                                        Asignado: {new Date(assignment.created_at).toLocaleString('es-AR')}
                                                                    </p>
                                                                </div>

                                                                {/* Show resolution data if available */}
                                                                {(assignment.status === 'resolved' || assignment.status === 'quality_validation') && assignment.immediate_action && (
                                                                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100 text-xs text-gray-700">
                                                                        <p className="font-bold text-green-700 mb-1">Acción Inmediata:</p>
                                                                        <p>{assignment.immediate_action}</p>
                                                                    </div>
                                                                )}

                                                                {assignment.status === 'partial' && assignment.notes && (
                                                                    <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-100 text-xs text-gray-700">
                                                                        <p className="font-bold text-orange-700 mb-1">Motivo (Parcial):</p>
                                                                        <p>{assignment.notes}</p>
                                                                    </div>
                                                                )}

                                                                {assignment.status === 'rejected' && assignment.notes && (
                                                                    <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100 text-xs text-gray-700">
                                                                        <p className="font-bold text-red-700 mb-1">Motivo Rechazo:</p>
                                                                        <p>{assignment.notes}</p>
                                                                    </div>
                                                                )}

                                                                {/* Reminder Button — only for pending assignments, visible to admins */}
                                                                {isAdmin && assignment.status === 'pending' && assignment.assigned_phone && (
                                                                    <button
                                                                        onClick={() => handleSendReminder(assignment)}
                                                                        disabled={sendingReminderId === assignment.id}
                                                                        className="mt-3 w-full py-2 px-3 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs rounded-lg hover:bg-amber-100 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                                    >
                                                                        {sendingReminderId === assignment.id ? (
                                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                        ) : (
                                                                            <Bell className="w-3.5 h-3.5" />
                                                                        )}
                                                                        Enviar Recordatorio
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Admin Actions */}
                                            {isAdmin && (
                                                <div className="space-y-3 pt-3 border-t border-gray-100">
                                                    {/* Re-derive */}
                                                    <button
                                                        onClick={() => setShowReferralModal(true)}
                                                        className="w-full py-2.5 px-4 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                        Agregar más sectores
                                                    </button>

                                                    {/* Approve with partial */}
                                                    {pendingCount === 0 && (resolvedCount > 0 || partialCount > 0) && (
                                                        <button
                                                            onClick={() => setShowQualityApproveModal(true)}
                                                            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                            {partialCount > 0 ? 'Aprobar con Solución Parcial' : 'Aprobar y Cerrar'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()
                                    : selectedReport.status === 'pending_resolution' ? (
                                        // VISTA ESPERANDO RESPUESTA
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
                                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
                                            <h4 className="font-bold text-blue-900">Esperando Resolución</h4>
                                            <p className="text-sm text-blue-700 mt-1 mb-4">
                                                La solicitud ha sido enviada al responsable. <br />
                                                El sistema te notificará cuando haya respuesta.
                                            </p>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => setShowReferralModal(true)}
                                                    className="text-xs font-bold text-blue-600 hover:underline"
                                                >
                                                    Reenviar Solicitud
                                                </button>
                                            )}
                                        </div>
                                    ) : selectedReport.status === 'quality_validation' ? (() => {
                                        // VISTA VALIDACIÓN CALIDAD — con soporte multi-sector (hooks are at top-level)
                                        const isMultiSectorReport = sectorAssignmentsData.length > 0;
                                        const resolvedAssignments = sectorAssignmentsData.filter(a => a.status === 'resolved' || a.status === 'quality_validation');
                                        const pendingAssignments = sectorAssignmentsData.filter(a => a.status === 'pending');
                                        const allSectorsComplete = sectorAssignmentsData.length > 0 && pendingAssignments.length === 0;

                                        const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
                                            pending: { label: 'Pendiente', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '⏳' },
                                            resolved: { label: 'Resuelto', color: 'text-green-700', bg: 'bg-green-100', icon: '✅' },
                                            quality_validation: { label: 'En Revisión', color: 'text-purple-700', bg: 'bg-purple-100', icon: '🔍' },
                                            partial: { label: 'Parcial', color: 'text-orange-700', bg: 'bg-orange-100', icon: '⚠️' },
                                            rejected: { label: 'Rechazado', color: 'text-red-700', bg: 'bg-red-100', icon: '❌' },
                                        };

                                        return (
                                            <div className="bg-purple-50 p-6 rounded-2xl shadow-sm border border-purple-100 flex flex-col h-full overflow-hidden">
                                                <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                                                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                                        <BrainCircuit className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">Validación de Calidad</h4>
                                                        <p className="text-xs text-purple-600">
                                                            {isMultiSectorReport
                                                                ? `${resolvedAssignments.length}/${sectorAssignmentsData.length} sectores respondieron`
                                                                : 'Revisión requerida para cierre'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Multi-sector progress indicator */}
                                                {isMultiSectorReport && !loadingAssignments && (
                                                    <div className="mb-4 flex-shrink-0">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Progreso de Sectores</span>
                                                            <span className="text-[10px] font-bold text-purple-700">
                                                                {resolvedAssignments.length}/{sectorAssignmentsData.length}
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-gray-100">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                                                                style={{ width: `${sectorAssignmentsData.length > 0 ? Math.round((resolvedAssignments.length / sectorAssignmentsData.length) * 100) : 0}%` }}
                                                            />
                                                        </div>
                                                        {!allSectorsComplete && (
                                                            <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                                                <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                                                                    <AlertTriangle className="w-3 h-3" />
                                                                    {pendingAssignments.length} sector{pendingAssignments.length !== 1 ? 'es' : ''} aún no respondió
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 mb-6">
                                                    {loadingAssignments ? (
                                                        <div className="flex items-center justify-center p-6 text-gray-400">
                                                            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
                                                        </div>
                                                    ) : isMultiSectorReport ? (
                                                        /* ========== MULTI-SECTOR VIEW ========== */
                                                        <div className="space-y-3">
                                                            {sectorAssignmentsData.map((assignment: any) => {
                                                                const config = statusConfig[assignment.status] || statusConfig.pending;
                                                                const sectorLabel = SECTOR_OPTIONS.find(s => s.value === assignment.sector)?.label || assignment.sector;
                                                                const isExpanded = expandedSector === assignment.id;
                                                                const hasResponse = assignment.status === 'resolved' || assignment.status === 'quality_validation';

                                                                return (
                                                                    <div
                                                                        key={assignment.id}
                                                                        className={`bg-white rounded-xl border shadow-sm transition-all ${hasResponse ? 'border-green-200 hover:shadow-md' : 'border-gray-100 opacity-75'}`}
                                                                    >
                                                                        {/* Sector Header — clickable */}
                                                                        <button
                                                                            onClick={() => setExpandedSector(isExpanded ? null : assignment.id)}
                                                                            className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
                                                                        >
                                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                                <span className={`text-sm px-2.5 py-1 rounded-lg ${config.bg} ${config.color} font-bold shrink-0`}>
                                                                                    {config.icon}
                                                                                </span>
                                                                                <div className="min-w-0">
                                                                                    <p className="text-sm font-bold text-gray-800 truncate">{sectorLabel}</p>
                                                                                    <p className="text-[10px] text-gray-400 font-medium">
                                                                                        {assignment.assigned_phone || 'Sin teléfono'}
                                                                                        {assignment.resolved_at && ` · ${new Date(assignment.resolved_at).toLocaleString('es-AR')}`}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                                                                                    {config.label}
                                                                                </span>
                                                                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                                            </div>
                                                                        </button>

                                                                        {/* Expanded Content */}
                                                                        {isExpanded && hasResponse && (
                                                                            <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3 animate-in fade-in duration-200">
                                                                                {/* Acción Inmediata */}
                                                                                {assignment.immediate_action && (
                                                                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                                                                        <h6 className="text-[10px] font-bold text-blue-600 uppercase mb-1 flex items-center gap-1">
                                                                                            <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                                                                                            Acción Inmediata
                                                                                        </h6>
                                                                                        <p className="text-xs text-gray-700 leading-relaxed">{assignment.immediate_action}</p>
                                                                                    </div>
                                                                                )}

                                                                                {/* Causa Raíz */}
                                                                                {assignment.root_cause && (
                                                                                    <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                                                                        <h6 className="text-[10px] font-bold text-amber-700 uppercase mb-1 flex items-center gap-1">
                                                                                            <BrainCircuit className="w-3 h-3" />
                                                                                            Causa Raíz
                                                                                        </h6>
                                                                                        <p className="text-xs text-gray-700 leading-relaxed">{assignment.root_cause}</p>
                                                                                    </div>
                                                                                )}

                                                                                {/* Plan de Acción */}
                                                                                {assignment.corrective_plan && (
                                                                                    <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                                                                        <h6 className="text-[10px] font-bold text-green-700 uppercase mb-1 flex items-center gap-1">
                                                                                            <CheckCircle className="w-3 h-3" />
                                                                                            Plan de Acción
                                                                                        </h6>
                                                                                        <p className="text-xs text-gray-700 leading-relaxed">{assignment.corrective_plan}</p>
                                                                                        {assignment.implementation_date && (
                                                                                            <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 mt-2">
                                                                                                <Clock className="w-3 h-3" />
                                                                                                Implementación: {new Date(assignment.implementation_date).toLocaleDateString()}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}

                                                                                {/* Evidencia */}
                                                                                {assignment.resolution_evidence_urls && assignment.resolution_evidence_urls.length > 0 && (
                                                                                    <div>
                                                                                        <h6 className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                                                                            <Camera className="w-3 h-3" />
                                                                                            Evidencia ({assignment.resolution_evidence_urls.length})
                                                                                        </h6>
                                                                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                                                                            {assignment.resolution_evidence_urls.map((url: string, i: number) => (
                                                                                                <a
                                                                                                    key={i}
                                                                                                    href={url}
                                                                                                    target="_blank"
                                                                                                    className="w-14 h-14 rounded-lg bg-gray-100 bg-cover bg-center border border-gray-200 flex-shrink-0 hover:ring-2 ring-purple-500 transition-all cursor-zoom-in"
                                                                                                    style={{ backgroundImage: `url(${url})` }}
                                                                                                />
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {/* Notas adicionales */}
                                                                                {assignment.resolution_notes && (
                                                                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                                                        <h6 className="text-[10px] font-bold text-gray-500 uppercase mb-1">Notas</h6>
                                                                                        <p className="text-xs text-gray-600">{assignment.resolution_notes}</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Expanded: Rejected/Partial */}
                                                                        {isExpanded && assignment.status === 'rejected' && assignment.notes && (
                                                                            <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                                                                                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                                                                                    <h6 className="text-[10px] font-bold text-red-700 uppercase mb-1">Motivo del Rechazo</h6>
                                                                                    <p className="text-xs text-red-600">{assignment.notes}</p>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {isExpanded && assignment.status === 'partial' && assignment.notes && (
                                                                            <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                                                                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                                                                                    <h6 className="text-[10px] font-bold text-orange-700 uppercase mb-1">Nota (Parcial)</h6>
                                                                                    <p className="text-xs text-orange-600">{assignment.notes}</p>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {isExpanded && assignment.status === 'pending' && (
                                                                            <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                                                                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-center space-y-2">
                                                                                    <p className="text-xs text-yellow-700 font-medium">⏳ Este sector aún no ha enviado su respuesta</p>
                                                                                    {isAdmin && (
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); handleSendReminder(assignment); }}
                                                                                            disabled={sendingReminderId === assignment.id}
                                                                                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                        >
                                                                                            {sendingReminderId === assignment.id ? (
                                                                                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                                                                                            ) : (
                                                                                                <><MessageSquare className="w-3.5 h-3.5" /> Reenviar mensaje</>
                                                                                            )}
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        /* ========== SINGLE-SECTOR VIEW (original) ========== */
                                                        <>
                                                            {/* 1. Acción Inmediata */}
                                                            <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                                                                <h5 className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center gap-2">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                                    Acción Inmediata
                                                                </h5>
                                                                <p className="text-sm text-gray-700 leading-relaxed">
                                                                    {selectedReport.resolution_notes || <span className="text-gray-400 italic">Sin datos registrados.</span>}
                                                                </p>
                                                            </div>

                                                            {/* 2. Causa Raíz */}
                                                            {selectedReport.root_cause && (
                                                                <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm relative overflow-hidden">
                                                                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                                                                    <h5 className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-2">
                                                                        <BrainCircuit className="w-3 h-3" />
                                                                        Causa Raíz Identificada
                                                                    </h5>
                                                                    <p className="text-sm text-gray-700 leading-relaxed">
                                                                        {selectedReport.root_cause}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* 3. Plan de Acción */}
                                                            {selectedReport.corrective_plan && (
                                                                <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm relative overflow-hidden">
                                                                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                                                                    <h5 className="text-xs font-bold text-green-700 uppercase mb-2 flex items-center gap-2">
                                                                        <CheckCircle className="w-3 h-3" />
                                                                        Plan de Acción
                                                                    </h5>
                                                                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                                                                        {selectedReport.corrective_plan}
                                                                    </p>
                                                                    {selectedReport.implementation_date && (
                                                                        <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg w-fit">
                                                                            <Clock className="w-3 h-3" />
                                                                            Implementación: {new Date(selectedReport.implementation_date).toLocaleDateString()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* 4. Evidencia */}
                                                            {selectedReport.resolution_evidence_urls && selectedReport.resolution_evidence_urls.length > 0 && (
                                                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                                                    <h5 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                                                        <Camera className="w-3 h-3" />
                                                                        Evidencia Adjunta
                                                                    </h5>
                                                                    <div className="grid grid-cols-3 gap-2">
                                                                        {selectedReport.resolution_evidence_urls.map((url: string, i: number) => (
                                                                            <a
                                                                                key={i}
                                                                                href={url}
                                                                                target="_blank"
                                                                                className="aspect-square rounded-lg bg-gray-100 bg-cover bg-center border border-gray-200 hover:ring-2 ring-purple-500 transition-all cursor-zoom-in"
                                                                                style={{ backgroundImage: `url(${url})` }}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Info del Responsable */}
                                                            {selectedReport.assigned_to && (
                                                                <div className="text-right">
                                                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                                                                        Responsable: {selectedReport.assigned_to}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>

                                                {/* RENDERIZADO DE HISTORIAL DE RECHAZOS (SOLUCIONES INSUFICIENTES) */}
                                                {selectedReport.resolution_history && selectedReport.resolution_history.length > 0 && (
                                                    <div className="bg-red-50 rounded-2xl p-6 border border-red-100 mt-6">
                                                        <h3 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-4">
                                                            <AlertTriangle className="w-4 h-4" />
                                                            Historial de Soluciones Insuficientes
                                                        </h3>
                                                        <div className="space-y-4">
                                                            {selectedReport.resolution_history.map((entry: any, index: number) => (
                                                                <div key={index} className="bg-white rounded-xl p-4 border border-red-100 shadow-sm relative overflow-hidden">
                                                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-200"></div>

                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <div>
                                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                                                Rechazado el {new Date(entry.rejected_at).toLocaleString()}
                                                                            </span>
                                                                            <p className="text-xs font-bold text-red-600 mt-1">
                                                                                Motivo: "{entry.reject_reason}"
                                                                            </p>
                                                                        </div>
                                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">
                                                                            Intento #{index + 1}
                                                                        </span>
                                                                    </div>

                                                                    <div className="space-y-3 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                                        <div>
                                                                            <span className="font-bold text-gray-700 block mb-0.5">Acción Inmediata Propuesta:</span>
                                                                            {entry.previous_data.immediate_action || '-'}
                                                                        </div>
                                                                        {entry.previous_data.root_cause && (
                                                                            <div>
                                                                                <span className="font-bold text-gray-700 block mb-0.5">Causa Raíz (RCA):</span>
                                                                                {entry.previous_data.root_cause}
                                                                            </div>
                                                                        )}
                                                                        <div>
                                                                            <span className="font-bold text-gray-700 block mb-0.5">Plan de Acción:</span>
                                                                            {entry.previous_data.corrective_plan || '-'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {isAdmin && (
                                                    <div className="flex gap-3 flex-shrink-0 pt-2 border-t border-purple-100">
                                                        <button
                                                            onClick={() => setShowQualityReturnModal(true)}
                                                            className="flex-1 py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors"
                                                        >
                                                            Devolver (Rechazo)
                                                        </button>
                                                        <button
                                                            onClick={() => setShowQualityApproveModal(true)}
                                                            className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 shadow-lg shadow-purple-500/20"
                                                        >
                                                            Aprobar y Cerrar
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })() : selectedReport.status === 'assignment_rejected' ? (
                                        // VISTA RECHAZO DEL RESPONSABLE
                                        <div className="space-y-4">
                                            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                                        <XCircle className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-red-900 text-lg">Asignación Rechazada</h4>
                                                        <p className="text-xs text-red-600 font-medium">El responsable indica que este caso no le corresponde</p>
                                                    </div>
                                                </div>

                                                {/* Extract rejection reason from notes */}
                                                {(() => {
                                                    const notes = selectedReport.notes || '';
                                                    const rejectionMatch = notes.match(/RECHAZO DE ASIGNACIÓN:\s*(.+?)(?:\n|$)/);
                                                    const rejectionReason = rejectionMatch ? rejectionMatch[1].trim() : null;
                                                    // Extract timestamp
                                                    const timestampMatch = notes.match(/\[([^\]]+)\]\s*🔴\s*RECHAZO/);
                                                    const rejectionTime = timestampMatch ? timestampMatch[1] : null;

                                                    return (
                                                        <div className="space-y-3">
                                                            {rejectionTime && (
                                                                <div className="flex items-center gap-2 text-xs text-red-500 font-medium">
                                                                    <Clock className="w-3 h-3" />
                                                                    Rechazado el {rejectionTime}
                                                                </div>
                                                            )}
                                                            <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
                                                                <h5 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Motivo del Rechazo</h5>
                                                                <p className="text-sm text-gray-700 leading-relaxed italic">
                                                                    "{rejectionReason || 'Motivo no especificado'}"
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            {/* Responsable info */}
                                            {selectedReport.assigned_to && (
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                                                        <UserCog className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-400 font-bold uppercase">Rechazado por</p>
                                                        <p className="text-sm font-bold text-gray-700">{selectedReport.assigned_to}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions - Admin Only */}
                                            {isAdmin ? (
                                                <>
                                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                                        <h4 className="font-bold text-gray-800 mb-2">Rederivación Requerida</h4>
                                                        <p className="text-xs text-gray-500 mb-4">
                                                            Asigná este caso a otro responsable o al sector correcto enviando una nueva solicitud por WhatsApp.
                                                        </p>
                                                        <button
                                                            onClick={() => setShowReferralModal(true)}
                                                            className="w-full py-3 bg-sanatorio-primary text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2"
                                                        >
                                                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                                                <Send className="w-3 h-3" />
                                                            </div>
                                                            Rederivación (WhatsApp)
                                                        </button>
                                                    </div>
                                                    <div className="text-center py-4 border-t border-gray-100">
                                                        <p className="text-xs text-gray-400 mb-2">Otras acciones</p>
                                                        <button
                                                            onClick={handleDiscardClick}
                                                            className="text-gray-400 hover:text-gray-600 text-xs font-bold transition-colors flex items-center justify-center gap-1 mx-auto"
                                                        >
                                                            <Archive className="w-3 h-3" /> Descartar Caso
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                                                    <p className="text-sm text-blue-700 font-medium">👀 Solo lectura — la gestión de este caso está a cargo del equipo de Calidad.</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // VISTA ACCIONES INICIALES (DERIVAR) - Admin Only
                                        <div className="space-y-4">
                                            {isAdmin ? (
                                                <>
                                                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                                        <h4 className="font-bold text-gray-800 mb-2">Derivar a Responsable</h4>
                                                        <p className="text-xs text-gray-500 mb-4">
                                                            Envía un formulario de gestión automático al encargado del sector.
                                                        </p>
                                                        <button
                                                            onClick={() => setShowReferralModal(true)}
                                                            className="w-full py-3 bg-sanatorio-primary text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2"
                                                        >
                                                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                                                <Send className="w-3 h-3" />
                                                            </div>
                                                            Solicitar Gestión (WhatsApp)
                                                        </button>

                                                        {selectedReport.last_whatsapp_status === 'sent' && selectedReport.last_whatsapp_sent_at && (
                                                            <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-green-600 font-medium bg-green-50 py-2 rounded-lg border border-green-100">
                                                                <CheckCircle className="w-3 h-3" />
                                                                Enviado: {new Date(selectedReport.last_whatsapp_sent_at).toLocaleString()}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="text-center py-4 border-t border-gray-100">
                                                        <p className="text-xs text-gray-400 mb-2">Otras acciones</p>
                                                        <button
                                                            onClick={handleDiscardClick}
                                                            className="text-gray-400 hover:text-gray-600 text-xs font-bold transition-colors flex items-center justify-center gap-1 mx-auto"
                                                        >
                                                            <Archive className="w-3 h-3" /> Descartar Caso
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-center space-y-2">
                                                    <Eye className="w-8 h-8 text-blue-400 mx-auto" />
                                                    <h4 className="font-bold text-blue-800 text-sm">Modo Visualización</h4>
                                                    <p className="text-xs text-blue-600">Este caso está pendiente de derivación por el equipo de Calidad. Aquí podrás seguir su progreso.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ReferralModal
                isOpen={showReferralModal}
                onClose={() => setShowReferralModal(false)}
                onConfirm={handleSendReferral}
                isSending={isSendingReferral}
                responsables={responsables}
                loadingResponsables={loadingResponsables}
                reportSector={selectedReport?.sector}
            />

            <ReopenModal
                isOpen={showReopenModal}
                onClose={() => setShowReopenModal(false)}
                onConfirm={handleReopenCase}
                initialPhone={selectedReport?.assigned_to || ''}
                isSubmitting={isReopening}
                responsables={responsables}
                loadingResponsables={loadingResponsables}
                reportSector={selectedReport?.sector}
            />

            <QualityReturnModal
                isOpen={showQualityReturnModal}
                onClose={() => setShowQualityReturnModal(false)}
                onConfirm={handleQualityReturn}
                initialPhone={selectedReport?.assigned_to || ''}
                isSubmitting={isProcessingQuality}
                responsables={responsables}
                loadingResponsables={loadingResponsables}
                reportSector={selectedReport?.sector}
            />

            <QualityApproveModal
                isOpen={showQualityApproveModal}
                onClose={() => setShowQualityApproveModal(false)}
                onConfirm={handleQualityApprove}
                isSubmitting={isProcessingQuality}
            />

            <DiscardConfirmationModal
                isOpen={showDiscardModal}
                onClose={() => setShowDiscardModal(false)}
                onConfirm={confirmDiscard}
                isDiscarding={isDiscarding}
            />

            <FeedbackModal
                isOpen={feedbackModal.isOpen}
                onClose={() => setFeedbackModal({ ...feedbackModal, isOpen: false })}
                type={feedbackModal.type}
                title={feedbackModal.title}
                message={feedbackModal.message}
            />

            {/* Delete Confirmation Modal — Admin Only */}
            {showDeleteModal && selectedReport && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Eliminar Reporte</h3>
                                <p className="text-xs text-gray-500">Esta acción no se puede deshacer</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-3">
                            <p className="text-sm text-gray-600">
                                ¿Estás seguro que deseas eliminar permanentemente el reporte{' '}
                                <span className="font-bold text-sanatorio-primary">{selectedReport.tracking_id}</span>?
                            </p>
                            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                                <p className="text-xs text-red-700">
                                    <span className="font-bold">⚠️ Advertencia:</span> Se eliminarán también todas las asignaciones de sector, respuestas, evidencias y notas asociadas a este caso.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                                disabled={isDeleting}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    setIsDeleting(true);
                                    try {
                                        // First delete sector_assignments (if any)
                                        await supabase
                                            .from('sector_assignments')
                                            .delete()
                                            .eq('report_id', selectedReport.id);

                                        // Then delete the report
                                        const { error } = await supabase
                                            .from('reports')
                                            .delete()
                                            .eq('id', selectedReport.id);

                                        if (error) throw error;

                                        setShowDeleteModal(false);
                                        setSelectedReport(null);
                                        // Refresh the list
                                        setReports(prev => prev.filter(r => r.id !== selectedReport.id));
                                        setFeedbackModal({
                                            isOpen: true,
                                            type: 'success',
                                            title: 'Reporte Eliminado',
                                            message: `El reporte ${selectedReport.tracking_id} fue eliminado permanentemente.`
                                        });
                                    } catch (err: any) {
                                        console.error('Error deleting report:', err);
                                        setFeedbackModal({
                                            isOpen: true,
                                            type: 'error',
                                            title: 'Error',
                                            message: 'No se pudo eliminar el reporte: ' + err.message
                                        });
                                    } finally {
                                        setIsDeleting(false);
                                    }
                                }}
                                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar Permanentemente
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

