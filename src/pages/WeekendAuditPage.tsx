import { useState } from 'react';
import { ClipboardCheck, Smile, FileSpreadsheet } from 'lucide-react';
import templateData from '../data/weekendAuditTemplate.json';
import { WeekendAuditProvider, useWeekendAudit } from '../context/WeekendAuditContext';
import SectorQuestions from '../components/weekendAudit/SectorQuestions';
import PatientExperienceForm from '../components/weekendAudit/PatientExperienceForm';
import { exportWeekendAudit } from '../services/weekendAuditExportService';
import { useAuth } from '../contexts/AuthContext';

const WeekendAuditContent = () => {
  const [activeView, setActiveView] = useState<'list' | 'sector' | 'patient'>('list');
  const [selectedSectorIndex, setSelectedSectorIndex] = useState<number | null>(null);
  const { answers, patientExperience } = useWeekendAudit();
  const { session } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportWeekendAudit(answers, patientExperience, session?.user?.id || 'Desconocido');
      alert('Auditoría exportada correctamente');
    } catch (error) {
      console.error(error);
      alert('Error al exportar la auditoría');
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

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-emerald-600" />
            Auditoría Fin de Semana
          </h1>
          <p className="text-sm text-slate-500 mt-1">Completa los checklist por sector.</p>
        </div>
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

      <div className="mt-6 border-t border-slate-200 pt-6">
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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] md:static md:bg-transparent md:border-t-0 md:shadow-none md:mt-6 md:p-0">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
        >
          <FileSpreadsheet className="w-5 h-5" />
          {isExporting ? 'Generando Excel...' : 'Exportar Auditoría'}
        </button>
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
