import React, { useState } from 'react';
import { ClipboardCheck, Smile, FileSpreadsheet, Archive, Save } from 'lucide-react';
import templateData from '../data/weekendAuditTemplate.json';
import { WeekendAuditProvider, useWeekendAudit } from '../context/WeekendAuditContext';
import SectorQuestions from '../components/weekendAudit/SectorQuestions';
import PatientExperienceForm from '../components/weekendAudit/PatientExperienceForm';
import WeekendAuditHistory from '../components/weekendAudit/WeekendAuditHistory';
import InstructionsPanel from '../components/weekendAudit/InstructionsPanel';
import { exportWeekendAudit } from '../services/weekendAuditExportService';
import { exportWeekendAuditPPTX } from '../services/weekendAuditPresentationService';
import { useAuth } from '../contexts/AuthContext';
import { AlertModal } from '../components/AlertModal';
import type { AlertType } from '../components/AlertModal';

const WeekendAuditContent = () => {
  const [activeView, setActiveView] = useState<'list' | 'sector' | 'patient' | 'history'>('list');
  const [selectedSectorIndex, setSelectedSectorIndex] = useState<number | null>(null);
  const { answers, patientExperience, metadata, setMetadata, resetAudit, saveToHistory } = useWeekendAudit();
  const { session, profile } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: AlertType;
    showCancel?: boolean;
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'info' });

  const showAlert = (title: string, message: string, type: AlertType = 'info') => {
    setAlertConfig({ isOpen: true, title, message, type, showCancel: false, onConfirm: undefined });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setAlertConfig({ isOpen: true, title, message, type: 'info', showCancel: true, onConfirm });
  };

  // Set default auditor name if empty
  React.useEffect(() => {
    if (!metadata.auditorName && profile?.display_name) {
      setMetadata({ auditorName: profile.display_name });
    }
  }, [profile, metadata.auditorName, setMetadata]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportWeekendAudit(answers, patientExperience, metadata.auditorName || session?.user?.id || 'Desconocido');
      showAlert('¡Éxito!', 'Auditoría exportada a Excel correctamente', 'success');
    } catch (error) {
      console.error(error);
      showAlert('Error', 'Error al exportar la auditoría a Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPPTX = async () => {
    setIsExporting(true);
    try {
      await exportWeekendAuditPPTX(answers, patientExperience, metadata);
      showAlert('¡Éxito!', 'Presentación PPTX generada correctamente', 'success');
    } catch (error) {
      console.error(error);
      showAlert('Error', 'Error al generar la presentación', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const getSectorProgress = (sectorIndex: number) => {
    const sector = templateData.sectors[sectorIndex];
    const answered = Object.keys(answers[sector.name] || {}).length;
    return { answered, total: sector.items.length };
  };

  if (activeView === 'sector' && selectedSectorIndex !== null) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <SectorQuestions 
          sectorIndex={selectedSectorIndex} 
          onBack={() => setActiveView('list')} 
        />
      </div>
    );
  }

  if (activeView === 'patient') {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <PatientExperienceForm onBack={() => setActiveView('list')} />
      </div>
    );
  }
  
  if (activeView === 'history') {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <WeekendAuditHistory onBack={() => setActiveView('list')} />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-32">
      <AlertModal 
        isOpen={alertConfig.isOpen}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        showCancel={alertConfig.showCancel}
        onConfirm={alertConfig.onConfirm}
      />
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-emerald-600" />
            Auditoría Fin de Semana
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveView('history')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              Historial
            </button>
            <button 
              onClick={() => {
                showConfirm(
                  'Limpiar Datos', 
                  '¿Estás seguro de que deseas limpiar la auditoría en curso? Todos los datos se perderán.', 
                  () => resetAudit()
                );
              }}
              className="text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-1.5 bg-red-50 rounded-lg"
            >
              Limpiar
            </button>
          </div>
        </div>
        
        <InstructionsPanel />
        
        {/* Contexto de la Auditoría */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 gap-3 mb-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Auditor</label>
            <input 
              type="text" 
              value={metadata.auditorName} 
              onChange={(e) => setMetadata({ auditorName: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
              placeholder="Nombre del Auditor..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fecha de Auditoría</label>
            <input 
              type="date" 
              value={metadata.auditDate} 
              onChange={(e) => setMetadata({ auditDate: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500">Asegúrate de configurar la fecha correcta (ej: Lunes para el Hospital de Día).</p>
      </div>

      <div className="grid gap-3">
        {templateData.sectors.map((sector, index) => {
          const { answered, total } = getSectorProgress(index);
          const isComplete = answered === total && total > 0;

          return (
            <button
              key={sector.name}
              onClick={() => {
                setSelectedSectorIndex(index);
                setActiveView('sector');
              }}
              className={`flex items-center justify-between p-4 rounded-xl border bg-white shadow-sm transition-all text-left ${
                isComplete ? 'border-emerald-200' : 'border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">{sector.name}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {answered} de {total} ítems completados
                </p>
              </div>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-100">
                {isComplete ? (
                  <span className="text-emerald-500 font-bold text-xs">✓</span>
                ) : (
                  <span className="text-slate-400 font-bold text-xs">{Math.round((answered/total)*100 || 0)}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-6 mb-8">
        <h2 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Módulos Adicionales</h2>
        <button
          onClick={() => setActiveView('patient')}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-blue-200 bg-blue-50 shadow-sm transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Smile className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 text-sm">Experiencia del Paciente</h3>
              <p className="text-xs text-blue-700/80 mt-0.5">
                Encuesta de satisfacción de servicios.
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] md:static md:bg-transparent md:border-t-0 md:shadow-none md:p-0 flex flex-col gap-3">
        <button
          onClick={() => {
            showConfirm(
              'Finalizar Auditoría',
              '¿Guardar esta auditoría en el historial y finalizar? Esto limpiará el formulario actual.',
              () => {
                saveToHistory();
                showAlert('¡Guardado!', 'Auditoría guardada en el historial con éxito.', 'success');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            );
          }}
          className="w-full flex items-center justify-center gap-2 bg-blue-900 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm hover:bg-blue-950 transition-all"
        >
          <Save className="w-5 h-5" />
          Guardar y Finalizar Auditoría
        </button>

        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50 text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>

          <button
            onClick={handleExportPPTX}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 text-sm"
          >
            <ClipboardCheck className="w-4 h-4" />
            PPTX
          </button>
        </div>
      </div>
    </div>
  );
};

export default function WeekendAuditPage() {
  return (
    <WeekendAuditProvider>
      <WeekendAuditContent />
    </WeekendAuditProvider>
  );
}
