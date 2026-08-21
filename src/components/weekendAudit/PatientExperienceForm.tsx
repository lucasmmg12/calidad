import { ArrowLeft } from 'lucide-react';
import { useWeekendAudit } from '../../context/WeekendAuditContext';

const SERVICES = [
  'HDD - Hospital de dia',
  'INT - Internado',
  'NEO - Neontalogia',
  'PED - Pediatría',
  'GGO - Guardia Ginecologica',
  'GPE - Guardia Pediatrica',
  'FERTILIDAD',
  'LAB ANALISIS CLINICOS',
  'SEDE 1-2-3 CONSULTORIOS AMBULATORIOS',
  'Consultorios Externos Sede Santa Fé',
  'Control Recien Nacido',
  'Chequeo Médico Preventivo',
  'UCI - Unidad de Cuidados Intensivos',
  'GCM - Guardia Clínica Médica',
  'Shock Room',
  'TC - Tomografía'
];

const EVALUATION_OPTIONS = ['EXCELENTE', 'MUY BUENA', 'BUENA', 'REGULAR', 'MALA'];
const INFO_OPTIONS = ['SIEMPRE', 'CASI SIEMPRE', 'A VECES', 'CASI NUNCA', 'NUNCA'];

const REASONS_YES = [
  'CALIDEZ EN LA ATENCION - Interés por los pacientes',
  'SE SINTIO COMODO Y SEGURO',
  'RESPUESTA INMEDIATA- Trato personalizado',
  'PROFESIONALISMO (respetuosos, confiables y conocedores)',
  'TRABAJO INTEGRAL DE LOS EQUIPOS (recepción hasta el médico tratante)',
  'RAPIDA ATENCION Y CONTENCION'
];

const REASONS_NO = [
  'DESTRATOS',
  'INGRESO LENTO EN RECEPCION',
  'DEMORA EN LA ATENCION MEDICO DE GUARDIA',
  'PROCESOS ADMINISTRATIVOS',
  'LENTITUD EN LA ATENCION',
  'POCA PREDISPOSICION',
  'MALAS CONTESTACIONES',
  'COMIDA',
  'LIMPIEZA',
  'INFRAESTRUCTURA'
];

export default function PatientExperienceForm({ onBack }: { onBack: () => void }) {
  const { patientExperience, setPatientExperience } = useWeekendAudit();
  const d = patientExperience;

  const toggleReason = (type: 'yes' | 'no', reason: string) => {
    if (type === 'yes') {
      const arr = d.recommendYesReasons.includes(reason)
        ? d.recommendYesReasons.filter(r => r !== reason)
        : [...d.recommendYesReasons, reason];
      setPatientExperience({ recommendYesReasons: arr });
    } else {
      const arr = d.recommendNoReasons.includes(reason)
        ? d.recommendNoReasons.filter(r => r !== reason)
        : [...d.recommendNoReasons, reason];
      setPatientExperience({ recommendNoReasons: arr });
    }
  };

  return (
    <div className="bg-white min-h-screen text-slate-800 flex flex-col">
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="font-bold text-slate-800 text-[15px] truncate flex-1">Volver a Auditoría</h2>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6 pb-28 w-full">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="h-2 bg-blue-900 w-full"></div>
          <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Experiencia del Paciente</h1>
            <p className="text-[13px] font-medium text-slate-500">Completar al finalizar la evaluación del sector.</p>
            <p className="text-[13px] text-red-600 font-semibold mt-4">* Indica que la pregunta es obligatoria</p>
          </div>
        </div>

        {/* Email */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <label className="block text-[15px] font-bold text-slate-800 mb-4">Correo electrónico <span className="text-red-600">*</span></label>
          <input 
            type="email" 
            value={d.email} 
            onChange={e => setPatientExperience({ email: e.target.value })}
            className="w-full border-b-2 border-slate-200 pb-2 focus:border-blue-600 outline-none text-[15px] bg-transparent transition-colors"
            placeholder="Ej: paciente@email.com"
          />
        </div>

        {/* Nombre y Apellido */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <label className="block text-[15px] font-bold text-slate-800 mb-4">Nombre y Apellido - Habitación</label>
          <input 
            type="text" 
            value={d.name} 
            onChange={e => setPatientExperience({ name: e.target.value })}
            className="w-full border-b-2 border-slate-200 pb-2 focus:border-blue-600 outline-none text-[15px] bg-transparent transition-colors"
            placeholder="Ej: Juan Perez - Hab. 204"
          />
        </div>

        {/* Servicio Auditado */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <label className="block text-[15px] font-bold text-slate-800 mb-4">Servicio Auditado <span className="text-red-600">*</span></label>
          <div className="space-y-2">
            {SERVICES.map(srv => (
              <label key={srv} className="flex items-center gap-4 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent has-[:checked]:bg-blue-50/50 has-[:checked]:border-blue-100">
                <input 
                  type="radio" 
                  name="service"
                  checked={d.service === srv}
                  onChange={() => setPatientExperience({ service: srv })}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-[15px]">{srv}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Google Rating */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <label className="block text-[15px] font-bold text-blue-600 underline mb-4">Déjanos tu calificación y reseña en Google <span className="text-red-600">*</span></label>
          <div className="flex gap-4">
            {['Si', 'No'].map(opt => (
              <label key={opt} className="flex-1 flex items-center justify-center gap-3 cursor-pointer p-4 rounded-xl border border-slate-200 transition-all has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300">
                <input 
                  type="radio" 
                  name="google"
                  checked={d.ratingGoogle === opt}
                  onChange={() => setPatientExperience({ ratingGoogle: opt })}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-[15px]">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Evaluacion Atencion */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <label className="block text-[15px] font-bold text-slate-800 mb-4 leading-snug">¿Cómo evalúa la atención de nuestro personal durante toda tu experiencia? (PROACTIVA) <span className="text-red-600">*</span></label>
          <div className="space-y-2">
            {EVALUATION_OPTIONS.map(opt => (
              <label key={opt} className="flex items-center gap-4 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent has-[:checked]:bg-blue-50/50 has-[:checked]:border-blue-100">
                <input 
                  type="radio" 
                  name="evaluation"
                  checked={d.evaluation === opt}
                  onChange={() => setPatientExperience({ evaluation: opt })}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[15px]">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Recibio toda la informacion */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <label className="block text-[15px] font-bold text-slate-800 mb-4 leading-snug">¿Recibió toda la información necesaria? Identificación de pacientes (Solicitud de DNI - Carnet de obra social u otro) <span className="text-red-600">*</span></label>
          <div className="space-y-2">
            {INFO_OPTIONS.map(opt => (
              <label key={opt} className="flex items-center gap-4 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent has-[:checked]:bg-blue-50/50 has-[:checked]:border-blue-100">
                <input 
                  type="radio" 
                  name="information"
                  checked={d.information === opt}
                  onChange={() => setPatientExperience({ information: opt })}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-[15px]">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Recomendacion */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <label className="block text-[15px] font-bold text-slate-800 mb-4 leading-snug">Basándote en su experiencia, ¿recomendarías nuestro servicios a sus amigos y/o familiares? <span className="text-red-600">*</span></label>
          <div className="flex gap-4">
            {['SI', 'NO'].map(opt => (
              <label key={opt} className="flex-1 flex items-center justify-center gap-3 cursor-pointer p-4 rounded-xl border border-slate-200 transition-all has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300">
                <input 
                  type="radio" 
                  name="recommend"
                  checked={d.recommend === opt}
                  onChange={() => setPatientExperience({ recommend: opt })}
                  className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold text-[15px]">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Si es SI */}
        {d.recommend === 'SI' && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-6 animate-in fade-in slide-in-from-top-2">
            <label className="block text-[15px] font-bold text-slate-800 mb-4">Si seleccionó SI... ¿por qué?</label>
            <div className="space-y-2">
              {REASONS_YES.map(opt => (
                <label key={opt} className="flex items-start gap-4 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent has-[:checked]:bg-emerald-50/50 has-[:checked]:border-emerald-100">
                  <input 
                    type="checkbox" 
                    checked={d.recommendYesReasons.includes(opt)}
                    onChange={() => toggleReason('yes', opt)}
                    className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 rounded border-slate-300 mt-0.5"
                  />
                  <span className="text-[15px] leading-snug">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Si es NO */}
        {d.recommend === 'NO' && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6 animate-in fade-in slide-in-from-top-2">
            <label className="block text-[15px] font-bold text-slate-800 mb-4">Si seleccionó NO... ¿por qué?</label>
            <div className="space-y-2">
              {REASONS_NO.map(opt => (
                <label key={opt} className="flex items-start gap-4 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent has-[:checked]:bg-red-50/50 has-[:checked]:border-red-100">
                  <input 
                    type="checkbox" 
                    checked={d.recommendNoReasons.includes(opt)}
                    onChange={() => toggleReason('no', opt)}
                    className="w-5 h-5 text-red-600 focus:ring-red-500 rounded border-slate-300 mt-0.5"
                  />
                  <span className="text-[15px] leading-snug">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Calificacion Final */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <label className="block text-[15px] font-bold text-slate-800 mb-4 leading-snug">¿Cómo nos calificaría del 1 al 10? <span className="block text-sm font-normal text-slate-500 mt-1">(1 muy malo, 10 excelente)</span> <span className="text-red-600">*</span></label>
          <div className="grid grid-cols-5 gap-2">
            {[1,2,3,4,5,6,7,8,9,10].map(opt => {
              const isSelected = d.finalRating === opt;
              
              // Color scale from red (1) to green (10)
              let bgClass = 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
              if (isSelected) {
                if (opt <= 4) bgClass = 'bg-red-500 text-white border-red-500 shadow-md scale-[1.05] ring-2 ring-red-200';
                else if (opt <= 7) bgClass = 'bg-amber-500 text-white border-amber-500 shadow-md scale-[1.05] ring-2 ring-amber-200';
                else bgClass = 'bg-emerald-500 text-white border-emerald-500 shadow-md scale-[1.05] ring-2 ring-emerald-200';
              }
              
              return (
                <button
                  key={opt}
                  onClick={() => setPatientExperience({ finalRating: opt })}
                  className={`py-3 rounded-xl text-base font-bold border transition-all duration-200 ${bgClass}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <button
          onClick={onBack}
          className="w-full max-w-2xl mx-auto block bg-blue-900 text-white font-bold py-4 rounded-xl shadow-md hover:bg-blue-800 hover:shadow-lg transition-all active:scale-[0.98] text-[15px]"
        >
          Guardar Formulario y Volver
        </button>
      </div>
    </div>
  );
}
