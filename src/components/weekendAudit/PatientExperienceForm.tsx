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
    <div className="bg-[#f0ebf8] min-h-screen text-slate-800">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-slate-800 text-sm truncate flex-1">Volver a Auditoría</h2>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="h-2 bg-purple-600 w-full"></div>
          <div className="p-6">
            <h1 className="text-3xl font-normal mb-4">EXPERIENCIA A PACIENTE</h1>
            <p className="text-sm text-red-600">* Indica que la pregunta es obligatoria</p>
          </div>
        </div>

        {/* Email */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <label className="block text-sm mb-4">Correo electrónico <span className="text-red-600">*</span></label>
          <input 
            type="email" 
            value={d.email} 
            onChange={e => setPatientExperience({ email: e.target.value })}
            className="w-full border-b border-slate-300 pb-1 focus:border-purple-600 outline-none text-sm bg-transparent"
            placeholder="Tu respuesta"
          />
        </div>

        {/* Nombre y Apellido */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <label className="block text-sm mb-4">NOMBRE Y APELLIDO - HABITACION</label>
          <input 
            type="text" 
            value={d.name} 
            onChange={e => setPatientExperience({ name: e.target.value })}
            className="w-full border-b border-slate-300 pb-1 focus:border-purple-600 outline-none text-sm bg-transparent"
            placeholder="Tu respuesta"
          />
        </div>

        {/* Servicio Auditado */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <label className="block text-sm mb-4">Servicio Auditado <span className="text-red-600">*</span></label>
          <div className="space-y-4">
            {SERVICES.map(srv => (
              <label key={srv} className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="service"
                  checked={d.service === srv}
                  onChange={() => setPatientExperience({ service: srv })}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">{srv}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Google Rating */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <label className="block text-sm text-blue-600 underline mb-4">Déjanos tu calificación y reseña en Google <span className="text-red-600">*</span></label>
          <div className="space-y-4">
            {['Si', 'No'].map(opt => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="google"
                  checked={d.ratingGoogle === opt}
                  onChange={() => setPatientExperience({ ratingGoogle: opt })}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Evaluacion Atencion */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <label className="block text-sm mb-4">¿Cómo evalúa la atención de nuestro personal durante toda tu experiencia? PROACTIVA <span className="text-red-600">*</span></label>
          <div className="space-y-4">
            {EVALUATION_OPTIONS.map(opt => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="evaluation"
                  checked={d.evaluation === opt}
                  onChange={() => setPatientExperience({ evaluation: opt })}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Recibio toda la informacion */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <label className="block text-sm mb-4">¿Recibió toda la información necesaria? Identificación de pacientes ( Solicitud de DNI - Carnet de obra social u otro de seguridad de paciente ) <span className="text-red-600">*</span></label>
          <div className="space-y-4">
            {INFO_OPTIONS.map(opt => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="information"
                  checked={d.information === opt}
                  onChange={() => setPatientExperience({ information: opt })}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Recomendacion */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <label className="block text-sm mb-4">Basándote en su experiencia, ¿recomendarías nuestro servicios a sus amigos y/o familiares? <span className="text-red-600">*</span></label>
          <div className="space-y-4">
            {['SI', 'NO'].map(opt => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="recommend"
                  checked={d.recommend === opt}
                  onChange={() => setPatientExperience({ recommend: opt })}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Si es SI */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <label className="block text-sm mb-4">SI es SI.... ¿porque?</label>
          <div className="space-y-4">
            {REASONS_YES.map(opt => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={d.recommendYesReasons.includes(opt)}
                  onChange={() => toggleReason('yes', opt)}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500 rounded-sm"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Si es NO */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <label className="block text-sm mb-4">SI es NO....¿porque?</label>
          <div className="space-y-4">
            {REASONS_NO.map(opt => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={d.recommendNoReasons.includes(opt)}
                  onChange={() => toggleReason('no', opt)}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500 rounded-sm"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Calificacion Final */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <label className="block text-sm mb-4">Como nos calificaría del 1 al 10 - (siendo 1 extremadamente malo y 10 excelente) <span className="text-red-600">*</span></label>
          <div className="space-y-4">
            {[1,2,3,4,5,6,7,8,9,10].map(opt => (
              <label key={opt} className="flex items-center gap-3 cursor-pointer">
                <input 
                  type="radio" 
                  name="finalRating"
                  checked={d.finalRating === opt}
                  onChange={() => setPatientExperience({ finalRating: opt })}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
