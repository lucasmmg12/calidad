import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type {
    ProcessAuditReport,
    AuditSchedule
} from '../types/processAudit';
import { ProcessAuditService } from '../services/processAuditService';
import { DemoIntegrationNotice } from '../components/processAudit/DemoIntegrationNotice';
import { ProcessAuditHeader } from '../components/processAudit/ProcessAuditHeader';
import { ProcessAuditDashboard } from '../components/processAudit/ProcessAuditDashboard';
import { ProcessAuditChecklist } from '../components/processAudit/ProcessAuditChecklist';
import { ProcessAuditReportView } from '../components/processAudit/ProcessAuditReport';
import { ProcessAuditScheduleView } from '../components/processAudit/ProcessAuditSchedule';
import {
    BarChart3,
    ClipboardList,
    FileText,
    Calendar,
    CheckCircle2
} from 'lucide-react';

export const ProcessAuditPage: React.FC = () => {
    const { profile, isAdmin } = useAuth();

    // Rol simulado para probar la app (por defecto sincronizado con el rol de Auth o 'admin')
    const [simulatedRole, setSimulatedRole] = useState<'admin' | 'responsable'>(() => {
        return isAdmin ? 'admin' : 'responsable';
    });

    // Pestañas activas: 'dashboard' | 'checklist' | 'report' | 'schedule'
    const [activeTab, setActiveTab] = useState<'dashboard' | 'checklist' | 'report' | 'schedule'>('dashboard');

    // Sector seleccionado en el filtro principal
    const userFirstSector = profile?.assigned_sectors?.[0] || 'REC-S1-Recepcion-Sede-1';
    const [selectedSector, setSelectedSector] = useState<string>(() => {
        return isAdmin ? 'ALL' : userFirstSector;
    });

    // Auditorías y Cronogramas cargados
    const [reports, setReports] = useState<ProcessAuditReport[]>([]);
    const [schedules, setSchedules] = useState<AuditSchedule[]>([]);

    // Informe seleccionado para visualización detallada
    const [selectedReport, setSelectedReport] = useState<ProcessAuditReport | null>(null);

    // Toast de notificación cuando se vincula un caso DORA
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Carga de datos inicial
    const reloadData = () => {
        const reps = ProcessAuditService.getReports();
        const schs = ProcessAuditService.getSchedules();
        setReports(reps);
        setSchedules(schs);
    };

    useEffect(() => {
        reloadData();
    }, []);

    // Sincronizar el sector inicial cuando cambia el rol simulado
    const handleRoleToggle = (newRole: 'admin' | 'responsable') => {
        setSimulatedRole(newRole);
        if (newRole === 'admin') {
            setSelectedSector('ALL');
        } else {
            setSelectedSector(userFirstSector);
        }
    };

    // Reiniciar datos demo
    const handleResetDemoData = () => {
        ProcessAuditService.resetMockData();
        reloadData();
        setSelectedReport(null);
        setActiveTab('dashboard');
        showToast('🔄 Datos de demostración de Auditoría de Procesos restablecidos');
    };

    // Iniciar nueva auditoría
    const handleStartNewAudit = (targetSectorId?: string) => {
        if (targetSectorId && targetSectorId !== 'ALL') {
            setSelectedSector(targetSectorId);
        }
        setActiveTab('checklist');
    };

    // Finalizar auditoría
    const handleAuditComplete = (newReport: ProcessAuditReport) => {
        reloadData();
        setSelectedReport(newReport);
        setActiveTab('report');
        showToast(`✅ Auditoría ${newReport.auditNumber} registrada con éxito (${newReport.scorePercent}% cumplimiento)`);
    };

    // Mostrar informe seleccionado
    const handleSelectReport = (report: ProcessAuditReport) => {
        setSelectedReport(report);
        setActiveTab('report');
    };

    // Action handler: Vincular hallazgo (OM o Desvío) a un Caso DORA
    const handleLinkDoraClick = (reportId: string, findingType: 'om' | 'desvio', findingId: string) => {
        const doraPrefix = findingType === 'om' ? 'OM' : 'CASO';
        const generatedDoraTicket = `${doraPrefix}-2026-${Math.floor(100 + Math.random() * 900)}`;

        const updated = ProcessAuditService.linkFindingToDora(reportId, findingType, findingId, generatedDoraTicket);
        if (updated) {
            reloadData();
            if (selectedReport && selectedReport.id === reportId) {
                setSelectedReport({ ...updated });
            }
            showToast(`🔗 Caso DORA #${generatedDoraTicket} generado y vinculado exitosamente a DORA`);
        }
    };

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    return (
        <div className="space-y-6 min-h-[80vh]">
            {/* Notification Toast */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold">{toastMessage}</span>
                </div>
            )}

            {/* Banner de Guía e Integración Demo */}
            <DemoIntegrationNotice />

            {/* Header del Módulo de Auditoría */}
            <ProcessAuditHeader
                simulatedRole={simulatedRole}
                onRoleToggle={handleRoleToggle}
                selectedSector={selectedSector}
                onSectorChange={setSelectedSector}
                onStartNewAudit={() => handleStartNewAudit()}
                onResetDemoData={handleResetDemoData}
                userAssignedSectors={profile?.assigned_sectors || []}
            />

            {/* Pestañas Principales de Navegación del Módulo */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-px overflow-x-auto">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-2 px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'dashboard'
                            ? 'border-sanatorio-primary text-sanatorio-primary bg-sanatorio-primary/5 rounded-t-xl'
                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 rounded-t-xl'
                        }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    <span>Tablero de Métricas</span>
                </button>

                <button
                    onClick={() => setActiveTab('checklist')}
                    className={`flex items-center gap-2 px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'checklist'
                            ? 'border-sanatorio-primary text-sanatorio-primary bg-sanatorio-primary/5 rounded-t-xl'
                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 rounded-t-xl'
                        }`}
                >
                    <ClipboardList className="w-4 h-4" />
                    <span>Ejecutar Checklist Auditoría</span>
                </button>

                {selectedReport && (
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`flex items-center gap-2 px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'report'
                                ? 'border-sanatorio-primary text-sanatorio-primary bg-sanatorio-primary/5 rounded-t-xl'
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 rounded-t-xl'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>Informe Activo ({selectedReport.auditNumber})</span>
                    </button>
                )}

                <button
                    onClick={() => setActiveTab('schedule')}
                    className={`flex items-center gap-2 px-4 py-3 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'schedule'
                            ? 'border-sanatorio-primary text-sanatorio-primary bg-sanatorio-primary/5 rounded-t-xl'
                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 rounded-t-xl'
                        }`}
                >
                    <Calendar className="w-4 h-4" />
                    <span>Cronograma de Auditorías</span>
                </button>
            </div>

            {/* Contenido de la Pestaña Activa */}
            <main>
                {activeTab === 'dashboard' && (
                    <ProcessAuditDashboard
                        reports={reports}
                        schedules={schedules}
                        selectedSector={selectedSector}
                        simulatedRole={simulatedRole}
                        onSelectReport={handleSelectReport}
                        onStartNewAuditForSector={(secId) => handleStartNewAudit(secId)}
                        onLinkDoraClick={handleLinkDoraClick}
                    />
                )}

                {activeTab === 'checklist' && (
                    <ProcessAuditChecklist
                        initialSectorId={selectedSector}
                        auditorName={profile?.display_name || (simulatedRole === 'admin' ? 'Lic. Auditoría de Calidad' : 'Responsable de Servicio')}
                        auditorRole={simulatedRole === 'admin' ? 'Calidad / Admin' : 'Responsable de Servicio'}
                        onAuditComplete={handleAuditComplete}
                        onCancel={() => setActiveTab('dashboard')}
                    />
                )}

                {activeTab === 'report' && selectedReport && (
                    <ProcessAuditReportView
                        report={selectedReport}
                        onBack={() => setActiveTab('dashboard')}
                        onLinkDoraClick={handleLinkDoraClick}
                    />
                )}

                {activeTab === 'schedule' && (
                    <ProcessAuditScheduleView
                        schedules={schedules}
                        selectedSector={selectedSector}
                        onStartAuditForSector={(secId) => handleStartNewAudit(secId)}
                    />
                )}
            </main>
        </div>
    );
};
