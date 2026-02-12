import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import { SECTOR_OPTIONS } from '../constants/sectors';
import { CheckCircle2, AlertTriangle, Settings, Shield, Save, Loader2, Lock, Phone, MessageSquare } from 'lucide-react';

const ProfileSettings = () => {
    const { profile, refreshProfile, isAdmin, loading: authLoading } = useAuth();
    const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const maxEdits = 3;
    const editsRemaining = maxEdits - (profile?.sector_edit_count || 0);
    const isLocked = editsRemaining <= 0 && !isAdmin;

    useEffect(() => {
        if (profile) {
            if (profile.assigned_sectors) {
                setSelectedSectors([...profile.assigned_sectors]);
            }
            setPhoneNumber(profile.phone_number || '');
        }
    }, [profile]);

    const toggleSector = (sectorValue: string) => {
        if (isLocked) return;
        setSelectedSectors(prev =>
            prev.includes(sectorValue)
                ? prev.filter(s => s !== sectorValue)
                : [...prev, sectorValue]
        );
    };

    const isPhoneValid = phoneNumber.replace(/\D/g, '').length >= 10;
    const phoneDigits = phoneNumber.replace(/\D/g, '');

    const handleSave = async () => {
        if (!profile || isLocked) return;

        // Phone validation
        if (!isPhoneValid) {
            alert('Debe ingresar un número de teléfono válido (mínimo 10 dígitos) para recibir notificaciones.');
            return;
        }

        setSaving(true);

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    assigned_sectors: selectedSectors,
                    phone_number: phoneDigits,
                    sector_edit_count: (profile.sector_edit_count || 0) + 1,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', profile.user_id);

            if (error) throw error;

            await refreshProfile();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('[ProfileSettings] Error saving:', err);
            alert('Error al guardar. Intente nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    // Phone-only save (does NOT consume an edit)
    const handleSavePhone = async () => {
        if (!profile) return;
        if (!isPhoneValid) {
            alert('Debe ingresar un número de teléfono válido (mínimo 10 dígitos).');
            return;
        }
        setSaving(true);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    phone_number: phoneDigits,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', profile.user_id);

            if (error) throw error;
            await refreshProfile();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('[ProfileSettings] Error saving phone:', err);
            alert('Error al guardar el teléfono. Intente nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    const hasSectorChanges = JSON.stringify(selectedSectors.sort()) !== JSON.stringify([...(profile?.assigned_sectors || [])].sort());
    const hasPhoneChanges = phoneDigits !== (profile?.phone_number || '');
    const hasChanges = hasSectorChanges || hasPhoneChanges;
    const phoneMissing = !profile?.phone_number;

    const filteredSectors = SECTOR_OPTIONS.filter(s =>
        s.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-sanatorio-primary" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in">
                <div className="bg-red-50 p-6 rounded-2xl border border-red-200 max-w-md">
                    <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-700 mb-2">Error de Perfil</h2>
                    <p className="text-sm text-red-600 mb-4">
                        No pudimos recuperar tu información de perfil. Por favor intenta recargar la página.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn-primary bg-red-600 hover:bg-red-700 text-white w-full"
                    >
                        Recargar Página
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-display font-black text-sanatorio-primary tracking-tight flex items-center gap-3">
                    <Settings className="w-8 h-8" />
                    Mi Perfil
                </h1>
                <p className="text-slate-500 font-medium mt-1">Configura los sectores bajo tu responsabilidad.</p>
            </div>

            {/* Role Badge */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${profile.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                            profile.role === 'directivo' ? 'bg-blue-100 text-blue-600' :
                                'bg-green-100 text-green-600'
                            }`}>
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-800">{profile.display_name || 'Usuario'}</p>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                Rol: <span className={`${profile.role === 'admin' ? 'text-purple-600' :
                                    profile.role === 'directivo' ? 'text-blue-600' :
                                        'text-green-600'
                                    }`}>{profile.role === 'admin' ? 'Administrador (Calidad)' : profile.role === 'directivo' ? 'Directivo' : 'Responsable'}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Phone Number Banner — Mandatory */}
            {phoneMissing && (
                <div className="rounded-2xl p-5 mb-6 border bg-red-50 border-red-200 animate-pulse">
                    <div className="flex items-start gap-3">
                        <MessageSquare className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-bold text-sm text-red-700">⚠️ Acción Obligatoria: Registre su número de WhatsApp</p>
                            <p className="text-xs text-red-600 mt-1">
                                Para recibir notificaciones de casos derivados, debe completar su número de teléfono. Sin este dato no podrá ser seleccionado como responsable.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Phone Number Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                        <Phone className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-800">Número de WhatsApp</h3>
                        <p className="text-xs text-gray-400">Se usará para recibir notificaciones de casos derivados.</p>
                    </div>
                </div>

                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-mono">+54 9</span>
                    <input
                        type="tel"
                        maxLength={10}
                        placeholder="Ej: 2645438114"
                        className={`w-full pl-16 pr-4 py-3 rounded-xl border outline-none focus:ring-2 transition-all font-mono text-sm ${phoneMissing && !phoneNumber
                                ? 'border-red-300 focus:ring-red-200 bg-red-50/50'
                                : 'border-gray-200 focus:ring-blue-50 focus:border-sanatorio-primary bg-gray-50 focus:bg-white'
                            }`}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    />
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">10 dígitos sin 0 ni 15. Incluir código de área. Ej: 264XXXXXXX</p>

                {/* Show current registered number */}
                {profile.phone_number && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Número registrado: <strong className="font-mono">{profile.phone_number}</strong></span>
                    </div>
                )}

                {/* Quick save phone only (no edit consumption) */}
                {hasPhoneChanges && !hasSectorChanges && (
                    <button
                        onClick={handleSavePhone}
                        disabled={saving || !isPhoneValid}
                        className="mt-3 w-full py-2.5 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                    >
                        {saving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                        ) : saved ? (
                            <><CheckCircle2 className="w-4 h-4" /> ¡Guardado!</>
                        ) : (
                            <><Save className="w-4 h-4" /> Guardar Teléfono</>
                        )}
                    </button>
                )}
            </div>

            {/* Edit Counter */}
            <div className={`rounded-2xl p-5 mb-6 border ${isLocked
                ? 'bg-red-50 border-red-200'
                : editsRemaining === 1
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                <div className="flex items-start gap-3">
                    {isLocked ? (
                        <Lock className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    ) : (
                        <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${editsRemaining === 1 ? 'text-amber-500' : 'text-blue-500'}`} />
                    )}
                    <div>
                        <p className={`font-bold text-sm ${isLocked ? 'text-red-700' : editsRemaining === 1 ? 'text-amber-700' : 'text-blue-700'}`}>
                            {isLocked
                                ? 'Has alcanzado el límite de ediciones'
                                : `Ediciones restantes: ${editsRemaining} de ${maxEdits}`
                            }
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {isLocked
                                ? 'Contacta a Calidad para modificar tus sectores.'
                                : 'Selecciona cuidadosamente los sectores que tenés a cargo. Cada vez que guardes, se consume una edición.'
                            }
                        </p>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                            <div
                                className={`h-2 rounded-full transition-all duration-500 ${isLocked ? 'bg-red-500' : editsRemaining === 1 ? 'bg-amber-500' : 'bg-blue-500'
                                    }`}
                                style={{ width: `${((profile.sector_edit_count || 0) / maxEdits) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sector Selector */}
            <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Sectores a Cargo</h3>
                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Buscar sector..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sanatorio-primary focus:ring-2 focus:ring-blue-50 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                        disabled={isLocked}
                    />
                    {selectedSectors.length > 0 && (
                        <p className="text-xs text-gray-400 mt-2 font-medium">
                            {selectedSectors.length} sector{selectedSectors.length !== 1 ? 'es' : ''} seleccionado{selectedSectors.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>

                <div className="max-h-[400px] overflow-y-auto p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredSectors.map((sector) => {
                            const isSelected = selectedSectors.includes(sector.value);
                            return (
                                <button
                                    key={sector.value}
                                    onClick={() => toggleSector(sector.value)}
                                    disabled={isLocked}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left ${isSelected
                                        ? 'border-sanatorio-primary bg-blue-50 shadow-sm'
                                        : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                                        } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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

                {/* Save Button (sectors + phone, consumes edit) */}
                {!isLocked && hasSectorChanges && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges || !isPhoneValid}
                            className="btn-primary w-full disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {saving ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
                            ) : saved ? (
                                <><CheckCircle2 className="w-5 h-5" /> ¡Guardado correctamente!</>
                            ) : (
                                <><Save className="w-5 h-5" /> Guardar Cambios</>
                            )}
                        </button>
                        {!isPhoneValid && (
                            <p className="text-center text-xs text-red-500 mt-2 font-medium">⚠️ Debe completar su número de WhatsApp para guardar</p>
                        )}
                        {!hasSectorChanges && !saved && (
                            <p className="text-center text-xs text-gray-400 mt-2">No hay cambios por guardar</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileSettings;
