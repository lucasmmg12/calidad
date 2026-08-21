import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Mic } from 'lucide-react';
import templateData from '../../data/weekendAuditTemplate.json';
import { useWeekendAudit } from '../../context/WeekendAuditContext';
import { VoiceRecorder } from '../VoiceRecorder';

interface SectorQuestionsProps {
  sectorIndex: number;
  onBack: () => void;
}

export default function SectorQuestions({ sectorIndex, onBack }: SectorQuestionsProps) {
  const { answers, setAnswer } = useWeekendAudit();
  const sector = templateData.sectors[sectorIndex];
  
  const [activeRecorder, setActiveRecorder] = useState<number | null>(null);

  const handleTranscription = (itemIndex: number, text: string) => {
    const currentAnswer = answers[sector.name]?.[itemIndex] || { demerito: null, observaciones: '' };
    const newObs = currentAnswer.observaciones ? `${currentAnswer.observaciones} ${text}` : text;
    setAnswer(sector.name, itemIndex, { ...currentAnswer, observaciones: newObs });
    setActiveRecorder(null);
  };
  
  if (!sector) return null;

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-slate-800 text-sm truncate flex-1">{sector.name}</h2>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6 pb-24">
        {sector.items.map((item, itemIndex) => {
          const currentAnswer = answers[sector.name]?.[itemIndex] || { demerito: null, observaciones: '' };
          const isAnswered = currentAnswer.demerito !== null;

          return (
            <div key={itemIndex} className={`bg-white rounded-xl border p-4 shadow-sm transition-all ${isAnswered ? 'border-emerald-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-slate-800 text-sm leading-tight">
                  {item.item}
                </h3>
                {isAnswered && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
              </div>
              
              {item.description && (
                <p className="text-xs text-slate-500 mb-4 whitespace-pre-wrap">
                  {item.description}
                </p>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Puntaje / Demérito</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((val) => (
                      <button
                        key={val}
                        onClick={() => setAnswer(sector.name, itemIndex, { ...currentAnswer, demerito: val })}
                        className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                          currentAnswer.demerito === val 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
                    <span>Satisfactorio (0)</span>
                    <span>Deficiente (3)</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600">Observaciones</label>
                    <button 
                      onClick={() => setActiveRecorder(activeRecorder === itemIndex ? null : itemIndex)}
                      className={`p-1.5 rounded-lg transition-colors ${activeRecorder === itemIndex ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      title="Dictar por voz"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {activeRecorder === itemIndex && (
                    <div className="mb-2 p-3 border border-slate-200 rounded-lg bg-white shadow-inner">
                      <VoiceRecorder onTranscription={(text) => handleTranscription(itemIndex, text)} maxDurationSeconds={120} />
                    </div>
                  )}

                  <textarea
                    value={currentAnswer.observaciones}
                    onChange={(e) => setAnswer(sector.name, itemIndex, { ...currentAnswer, observaciones: e.target.value })}
                    className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none bg-slate-50"
                    placeholder="Detalles adicionales o hallazgos..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <button
          onClick={onBack}
          className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-sm hover:bg-slate-700 transition-all"
        >
          Guardar Sector y Volver
        </button>
      </div>
    </div>
  );
}
