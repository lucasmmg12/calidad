import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Mic, AlertCircle } from 'lucide-react';
import templateData from '../../data/weekendAuditTemplate.json';
import { useWeekendAudit } from '../../context/WeekendAuditContext';
import { VoiceRecorder } from '../VoiceRecorder';

interface SectorQuestionsProps {
  sectorIndex: number;
  onBack: () => void;
}

export default function SectorQuestions({ sectorIndex, onBack }: SectorQuestionsProps) {
  const { answers, setAnswer, sectorPersonal, setSectorPersonalData } = useWeekendAudit();
  const sector = templateData.sectors[sectorIndex];
  
  const [activeRecorder, setActiveRecorder] = useState<number | null>(null);

  const handleTranscription = (itemIndex: number, text: string) => {
    const currentAnswer = answers[sector.name]?.[itemIndex] || { cumple: null, demerito: null, observaciones: '' };
    const newObs = currentAnswer.observaciones ? `${currentAnswer.observaciones} ${text}` : text;
    setAnswer(sector.name, itemIndex, { ...currentAnswer, observaciones: newObs });
    setActiveRecorder(null);
  };
  
  if (!sector) return null;

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="font-bold text-slate-800 text-[15px] truncate flex-1">{sector.name}</h2>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6 pb-28 w-full">
        {/* Personal Presente */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <label className="block text-xs font-bold text-blue-900 mb-2 uppercase tracking-wider">
            Personal Presente
          </label>
          <p className="text-[13px] text-blue-700/80 mb-3 leading-relaxed">
            Escriba los nombres del personal trabajando en este turno.
          </p>
          <textarea
            value={sectorPersonal[sector.name] || ''}
            onChange={(e) => setSectorPersonalData(sector.name, e.target.value)}
            className="w-full text-[15px] p-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-white transition-shadow min-h-[80px]"
            placeholder="Ej: Fabricio Mallea, Franco Montaña..."
          />
        </div>

        {sector.items.map((item, itemIndex) => {
          const currentAnswer = answers[sector.name]?.[itemIndex] || { cumple: null, demerito: null, observaciones: '' };
          const isAnswered = currentAnswer.cumple !== null;

          return (
            <div key={itemIndex} className={`rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 ${isAnswered ? (currentAnswer.cumple ? 'border-l-4 border-l-emerald-500 border-slate-100' : 'border-l-4 border-l-red-500 border-slate-100') : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-bold text-slate-800 text-[15px] leading-snug">
                  {item.item}
                </h3>
                {isAnswered && <CheckCircle2 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${currentAnswer.cumple ? 'text-emerald-500' : 'text-red-500'}`} />}
              </div>
              
              {item.description && (
                <p className="text-sm text-slate-600 mb-5 whitespace-pre-wrap leading-relaxed">
                  {item.description}
                </p>
              )}

              <div className="space-y-5">
                {/* Checklist Principal (SÍ / NO) */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">¿Se cumple?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setAnswer(sector.name, itemIndex, { ...currentAnswer, cumple: true, demerito: 0 })}
                      className={`py-4 rounded-xl text-base font-bold border-2 transition-all duration-200 ${
                        currentAnswer.cumple === true 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-sm' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      SÍ
                    </button>
                    <button
                      onClick={() => setAnswer(sector.name, itemIndex, { ...currentAnswer, cumple: false, demerito: 1 })}
                      className={`py-4 rounded-xl text-base font-bold border-2 transition-all duration-200 ${
                        currentAnswer.cumple === false 
                          ? 'bg-red-50 text-red-700 border-red-500 shadow-sm' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>

                {/* Sección de Observaciones (Enfática si es NO) */}
                <div className={`transition-all duration-300 ${currentAnswer.cumple === false ? 'bg-red-50/50 p-4 rounded-xl border border-red-100' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Observaciones
                      {currentAnswer.cumple === false && <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Requerido</span>}
                    </label>
                    <button 
                      onClick={() => setActiveRecorder(activeRecorder === itemIndex ? null : itemIndex)}
                      className={`p-2.5 rounded-xl transition-all duration-200 ${activeRecorder === itemIndex ? 'bg-red-100 text-red-600 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      title="Dictar por voz"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {activeRecorder === itemIndex && (
                    <div className="mb-3 p-4 border-2 border-slate-100 rounded-xl bg-white shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2">
                      <VoiceRecorder onTranscription={(text) => handleTranscription(itemIndex, text)} maxDurationSeconds={120} />
                    </div>
                  )}

                  <textarea
                    value={currentAnswer.observaciones}
                    onChange={(e) => setAnswer(sector.name, itemIndex, { ...currentAnswer, observaciones: e.target.value })}
                    className={`w-full text-[15px] p-4 border rounded-xl outline-none resize-none transition-shadow min-h-[100px] ${
                      currentAnswer.cumple === false 
                        ? 'border-red-300 focus:ring-2 focus:ring-red-400 focus:border-red-400 bg-white' 
                        : 'border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50'
                    }`}
                    placeholder={currentAnswer.cumple === false ? "Detalle por qué no se cumple el ítem..." : "Detalles adicionales o hallazgos (Opcional)"}
                  />
                </div>

                {/* Sub-sección opcional: Demérito */}
                {currentAnswer.cumple === false && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Puntaje de Demérito (Opcional)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3].map((val) => {
                        const isSelected = currentAnswer.demerito === val;
                        return (
                          <button
                            key={val}
                            onClick={() => setAnswer(sector.name, itemIndex, { ...currentAnswer, demerito: val })}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                              isSelected 
                                ? 'bg-slate-700 text-white border-slate-700' 
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <button
          onClick={onBack}
          className="w-full max-w-2xl mx-auto block bg-blue-900 text-white font-bold py-4 rounded-xl shadow-md hover:bg-blue-800 hover:shadow-lg transition-all active:scale-[0.98] text-[15px]"
        >
          Guardar Sector y Volver
        </button>
      </div>
    </div>
  );
}
