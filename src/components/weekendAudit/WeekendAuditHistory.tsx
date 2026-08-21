import { useState, useEffect } from 'react';
import { Archive, ArrowLeft, FileSpreadsheet, ClipboardCheck, Trash2 } from 'lucide-react';
import { exportWeekendAudit } from '../../services/weekendAuditExportService';
import { exportWeekendAuditPPTX } from '../../services/weekendAuditPresentationService';

interface WeekendAuditHistoryProps {
  onBack: () => void;
}

export default function WeekendAuditHistory({ onBack }: WeekendAuditHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('weekend_audit_history');
      if (stored) {
        setHistory(JSON.parse(stored).reverse());
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  const clearHistory = () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar TODO el historial? Esta acción no se puede deshacer.')) {
      localStorage.removeItem('weekend_audit_history');
      setHistory([]);
    }
  };

  const calculateScore = (answers: any) => {
    let totalDemeritos = 0;
    let evaluated = 0;
    
    Object.keys(answers).forEach(sector => {
      Object.keys(answers[sector]).forEach(itemIndex => {
        const ans = answers[sector][itemIndex];
        if (ans && ans.demerito !== null) {
          totalDemeritos += ans.demerito;
          evaluated++;
        }
      });
    });

    return { totalDemeritos, evaluated };
  };

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Archive className="w-5 h-5 text-blue-600" />
            Historial de Auditorías
          </h1>
        </div>
        {history.length > 0 && (
          <button 
            onClick={clearHistory}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Limpiar todo el historial"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-600 font-bold mb-1">No hay auditorías guardadas</h3>
          <p className="text-slate-400 text-sm">Al finalizar una auditoría, se guardará aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => {
            const { totalDemeritos } = calculateScore(record.answers);
            const formattedDate = new Date(record.date).toLocaleDateString('es-AR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            });

            return (
              <div key={record.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{record.metadata?.auditorName || 'Sin Auditor'}</h3>
                    <p className="text-xs text-slate-500">{formattedDate} • Fecha auditoría: {record.metadata?.auditDate}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-500 uppercase">Deméritos</div>
                    <div className={`text-lg font-black ${totalDemeritos > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {totalDemeritos}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => exportWeekendAudit(record.answers, record.patientExperience, record.metadata?.auditorName || 'Desconocido')}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-600 hover:text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </button>
                  <button
                    onClick={() => exportWeekendAuditPPTX(record.answers, record.sectorPersonal || {}, record.patientExperience, record.metadata)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    PPTX
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
