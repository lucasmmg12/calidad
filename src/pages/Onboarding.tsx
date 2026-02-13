import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SECTOR_OPTIONS } from '../constants/sectors';
import {
    Shield, User, Phone, Mail, CheckCircle2,
    ChevronRight, ChevronLeft, Loader2,
    BarChart3, ClipboardList
} from 'lucide-react';

type RoleOption = 'responsable' | 'directivo';

const STEPS_RESPONSABLE = ['rol', 'datos', 'telefono', 'email', 'sectores'] as const;
const STEPS_DIRECTIVO = ['rol', 'datos', 'telefono', 'email'] as const;

const Onboarding = () => {
    const { session, profile, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(0);
    const [selectedRole, setSelectedRole] = useState<RoleOption | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
    const [sectorSearch, setSectorSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const steps = selectedRole === 'directivo' ? STEPS_DIRECTIVO : STEPS_RESPONSABLE;
    const totalSteps = steps.length;
    const currentStepName = steps[currentStep] || 'rol';
    const progress = ((currentStep + 1) / totalSteps) * 100;

    const canProceed = () => {
        switch (currentStepName) {
            case 'rol': return !!selectedRole;
            case 'datos': return displayName.trim().length >= 3;
            case 'telefono': return phoneNumber.replace(/\D/g, '').length >= 10;
            case 'email': return true;
            case 'sectores': return selectedSectors.length > 0;
            default: return false;
        }
    };

    const isLastStep = currentStep === totalSteps - 1;

    const handleNext = () => {
        if (isLastStep) {
            handleFinish();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleFinish = async () => {
        if (!profile || !selectedRole) return;
        setSaving(true);

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    role: selectedRole,
                    display_name: displayName.trim(),
                    phone_number: phoneNumber.replace(/\D/g, ''),
                    assigned_sectors: selectedRole === 'responsable' ? selectedSectors : [],
                    onboarding_completed: true,
                    account_status: 'pending',
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', profile.user_id);

            if (error) throw error;

            await refreshProfile();
            navigate('/pendiente');
        } catch (err) {
            console.error('[Onboarding] Error saving:', err);
            alert('Error al guardar. Intente nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    const toggleSector = (value: string) => {
        setSelectedSectors(prev =>
            prev.includes(value)
                ? prev.filter(s => s !== value)
                : [...prev, value]
        );
    };

    const filteredSectors = SECTOR_OPTIONS.filter(s =>
        s.label.toLowerCase().includes(sectorSearch.toLowerCase())
    );

    if (!session) {
        navigate('/login');
        return null;
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">

                {/* Progress Bar */}
                <div className="bg-gray-50 px-8 pt-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Paso {currentStep + 1} de {totalSteps}
                        </p>
                        <p className="text-xs font-bold text-sanatorio-primary">
                            {Math.round(progress)}%
                        </p>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-sanatorio-primary to-blue-400 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Step Indicators */}
                    <div className="flex justify-between mt-4">
                        {steps.map((step, idx) => (
                            <div key={step} className="flex flex-col items-center gap-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${idx < currentStep
                                    ? 'bg-green-500 text-white'
                                    : idx === currentStep
                                        ? 'bg-sanatorio-primary text-white shadow-lg shadow-sanatorio-primary/30'
                                        : 'bg-gray-200 text-gray-400'
                                    }`}>
                                    {idx < currentStep ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${idx === currentStep ? 'text-sanatorio-primary' : 'text-gray-400'
                                    }`}>
                                    {step === 'rol' ? 'Rol' :
                                        step === 'datos' ? 'Datos' :
                                            step === 'telefono' ? 'Teléfono' :
                                                step === 'email' ? 'Email' : 'Sectores'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <div className="p-8 min-h-[340px] flex flex-col">
                    {/* Step 1: Role Selection */}
                    {currentStepName === 'rol' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex-1">
                            <h2 className="text-2xl font-display font-black text-gray-800 mb-2">¿Cuál es tu rol?</h2>
                            <p className="text-sm text-gray-500 mb-8">Seleccioná el rol que mejor describe tu función en el Sanatorio.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Responsable Card */}
                                <button
                                    onClick={() => setSelectedRole('responsable')}
                                    className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 group hover:shadow-lg ${selectedRole === 'responsable'
                                        ? 'border-green-500 bg-green-50/50 shadow-lg shadow-green-500/10 ring-2 ring-green-500/20'
                                        : 'border-gray-200 bg-white hover:border-green-300'
                                        }`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${selectedRole === 'responsable' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'
                                        }`}>
                                        <ClipboardList className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-2">🛠️ Responsable</h3>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                            <span>Gestiona <strong>casos derivados</strong> de su sector</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                            <span>Recibe notificaciones por <strong>WhatsApp</strong></span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                            <span>Completa acciones correctivas, <strong>RCA y planes de mejora</strong></span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                            <span>Define los <strong>sectores bajo su cargo</strong></span>
                                        </li>
                                    </ul>
                                    {selectedRole === 'responsable' && (
                                        <div className="absolute top-3 right-3">
                                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        </div>
                                    )}
                                </button>

                                {/* Directivo Card */}
                                <button
                                    onClick={() => setSelectedRole('directivo')}
                                    className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 group hover:shadow-lg ${selectedRole === 'directivo'
                                        ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
                                        : 'border-gray-200 bg-white hover:border-blue-300'
                                        }`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${selectedRole === 'directivo' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                        <BarChart3 className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-2">🏥 Directivo</h3>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                            <span>Accede a <strong>métricas y reportes</strong> institucionales</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                            <span>Visualiza <strong>indicadores, tiempos de respuesta y KPIs</strong></span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                            <span>Vista de alto nivel para <strong>toma de decisiones</strong></span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                            <span><strong>No</strong> gestiona casos individualmente</span>
                                        </li>
                                    </ul>
                                    {selectedRole === 'directivo' && (
                                        <div className="absolute top-3 right-3">
                                            <CheckCircle2 className="w-6 h-6 text-blue-500" />
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Name */}
                    {currentStepName === 'datos' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex-1">
                            <h2 className="text-2xl font-display font-black text-gray-800 mb-2">Tus datos personales</h2>
                            <p className="text-sm text-gray-500 mb-8">Ingresá tu nombre completo, tal como aparecerá en el sistema.</p>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" />
                                    Nombre y Apellido
                                </label>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Ej: Laura Casas"
                                    className="w-full p-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-sanatorio-primary/50 transition-all text-lg bg-gray-50 focus:bg-white"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-400">Mínimo 3 caracteres. Este nombre será visible para el equipo de Calidad.</p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Phone */}
                    {currentStepName === 'telefono' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex-1">
                            <h2 className="text-2xl font-display font-black text-gray-800 mb-2">Tu número de WhatsApp</h2>
                            <p className="text-sm text-gray-500 mb-8">
                                Se usará para enviarte notificaciones de casos derivados y la confirmación de tu autorización.
                            </p>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5" />
                                    Número de WhatsApp
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm">+54 9</span>
                                    <input
                                        type="tel"
                                        autoFocus
                                        maxLength={10}
                                        placeholder="2645438114"
                                        className="w-full pl-16 pr-4 py-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-sanatorio-primary/50 transition-all font-mono text-lg bg-gray-50 focus:bg-white"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400">10 dígitos sin 0 ni 15. Incluir código de área. Ej: 264XXXXXXX</p>
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-start gap-3">
                                <Phone className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>Este número es fundamental. La confirmación de autorización de tu cuenta y las notificaciones de casos llegarán a este WhatsApp.</span>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Email Confirmation */}
                    {currentStepName === 'email' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex-1">
                            <h2 className="text-2xl font-display font-black text-gray-800 mb-2">Tu correo electrónico</h2>
                            <p className="text-sm text-gray-500 mb-8">Confirmá que este es el email con el que te registraste.</p>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" />
                                    Email de la cuenta
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        readOnly
                                        className="w-full p-4 rounded-xl border border-green-200 bg-green-50/50 text-gray-700 text-lg cursor-default outline-none"
                                        value={session?.user?.email || ''}
                                    />
                                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                                </div>
                                <p className="text-[10px] text-green-600 font-medium">✓ Email verificado correctamente</p>
                            </div>

                            {/* Summary card */}
                            <div className="mt-8 p-5 bg-gray-50 rounded-xl border border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Resumen de tus datos</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Rol:</span>
                                        <span className="font-bold text-gray-800 capitalize">{selectedRole === 'responsable' ? '🛠️ Responsable' : '🏥 Directivo'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Nombre:</span>
                                        <span className="font-bold text-gray-800">{displayName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">WhatsApp:</span>
                                        <span className="font-bold text-gray-800 font-mono">{phoneNumber}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Email:</span>
                                        <span className="font-bold text-gray-800">{session?.user?.email}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Sectors (Responsable only) */}
                    {currentStepName === 'sectores' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex-1">
                            <h2 className="text-2xl font-display font-black text-gray-800 mb-2">Sectores a tu cargo</h2>
                            <p className="text-sm text-gray-500 mb-4">
                                Seleccioná los sectores de los cuales sos responsable. Recibirás las derivaciones de estos sectores.
                            </p>

                            <input
                                type="text"
                                placeholder="Buscar sector..."
                                value={sectorSearch}
                                onChange={(e) => setSectorSearch(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sanatorio-primary focus:ring-2 focus:ring-blue-50 outline-none transition-all bg-gray-50 focus:bg-white text-sm mb-3"
                            />

                            {selectedSectors.length > 0 && (
                                <p className="text-xs text-sanatorio-primary font-bold mb-3">
                                    {selectedSectors.length} sector{selectedSectors.length !== 1 ? 'es' : ''} seleccionado{selectedSectors.length !== 1 ? 's' : ''}
                                </p>
                            )}

                            <div className="max-h-[250px] overflow-y-auto pr-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {filteredSectors.map(sector => {
                                        const isSelected = selectedSectors.includes(sector.value);
                                        return (
                                            <button
                                                key={sector.value}
                                                onClick={() => toggleSector(sector.value)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left ${isSelected
                                                    ? 'border-sanatorio-primary bg-blue-50 shadow-sm'
                                                    : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSelected
                                                    ? 'border-sanatorio-primary bg-sanatorio-primary'
                                                    : 'border-gray-300'
                                                    }`}>
                                                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <span className={`text-sm font-medium ${isSelected ? 'text-sanatorio-primary' : 'text-gray-600'}`}>
                                                    {sector.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Footer */}
                <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className="flex items-center gap-2 px-5 py-2.5 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Atrás
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={!canProceed() || saving}
                        className={`flex items-center gap-2 px-6 py-2.5 font-bold text-sm rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:pointer-events-none ${isLastStep
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20'
                            : 'bg-sanatorio-primary hover:bg-[#004270] text-white shadow-sanatorio-primary/20'
                            }`}
                    >
                        {saving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                        ) : isLastStep ? (
                            <><Shield className="w-4 h-4" /> Finalizar Registro</>
                        ) : (
                            <>Siguiente <ChevronRight className="w-4 h-4" /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
