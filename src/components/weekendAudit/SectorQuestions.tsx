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
    <div className="bg-white min-h-screen flex flex-col">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="font-bold text-slate-800 text-[15px] truncate flex-1">{sector.name}</h2>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6 pb-28 w-full">
        {sector.items.map((item, itemIndex) => {
          const currentAnswer = answers[sector.name]?.[itemIndex] || { demerito: null, observaciones: '' };
          const isAnswered = currentAnswer.demerito !== null;

          return (
            <div key={itemIndex} className={`rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 ${isAnswered ? 'border-l-4 border-l-emerald-500 border-slate-100' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-bold text-slate-800 text-[15px] leading-snug">
                  {item.item}
                </h3>
                {isAnswered && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />}
              </div>
              
              {item.description && (
                <p className="text-sm text-slate-600 mb-5 whitespace-pre-wrap leading-relaxed">
                  {item.description}
                </p>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Puntaje / Demérito</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((val) => {
                      const isSelected = currentAnswer.demerito === val;
                      
                      let baseClass = '';
                      if (val === 0) baseClass = 'bg-blue-900 text-white border-blue-900';
                      else if (val === 1) baseClass = 'bg-blue-500 text-white border-blue-500';
                      else if (val === 2) baseClass = 'bg-blue-300 text-slate-900 border-blue-300';
                      else if (val === 3) baseClass = 'bg-blue-100 text-slate-800 border-blue-200';
                      
                      const selectedClass = isSelected 
                        ? 'ring-2 ring-offset-2 ring-slate-300 scale-[1.02] shadow-md z-10 border-slate-400 font-black opacity-100' 
                        : 'opacity-50 hover:opacity-100 scale-100 hover:scale-[1.02]';
                      
                      return (
                        <button
                          key={val}
                          onClick={() => setAnswer(sector.name, itemIndex, { ...currentAnswer, demerito: val })}
                          className={`py-3 rounded-xl text-base font-bold border transition-all duration-200 min-h-[48px] ${baseClass} ${selectedClass}`}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-400 mt-2 px-1">
                    <span>Satisfactorio (0)</span>
                    <span>Deficiente (3)</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Observaciones</label>
                    <button 
                      onClick={() => setActiveRecorder(activeRecorder === itemIndex ? null : itemIndex)}
                      className={`p-2.5 rounded-xl transition-all duration-200 ${activeRecorder === itemIndex ? 'bg-red-100 text-red-600 shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
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
                    className="w-full text-[15px] p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none bg-slate-50 transition-shadow min-h-[100px]"
                    placeholder="Detalles adicionales o hallazgos..."
                  />
                </div>
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
