import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import { SECTOR_OPTIONS } from '../constants/sectors';
import { CheckCircle2, AlertTriangle, Settings, Shield, Save, Loader2, Lock } from 'lucide-react';

const ProfileSettings = () => {
    const { profile, refreshProfile, isAdmin } = useAuth();
    const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const maxEdits = 3;
    const editsRemaining = maxEdits - (profile?.sector_edit_count || 0);
    const isLocked = editsRemaining <= 0 && !isAdmin;

    useEffect(() => {
        if (profile?.assigned_sectors) {
            setSelectedSectors([...profile.assigned_sectors]);
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

    const handleSave = async () => {
        if (!profile || isLocked) return;
        setSaving(true);

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    assigned_sectors: selectedSectors,
                    sector_edit_count: (profile.sector_edit_count || 0) + 1,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', profile.user_id);

            if (error) throw error;

            await refreshProfile();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('[ProfileSettings] Error saving sectors:', err);
            alert('Error al guardar los sectores. Intente nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = JSON.stringify(selectedSectors.sort()) !== JSON.stringify([...(profile?.assigned_sectors || [])].sort());

    const filteredSectors = SECTOR_OPTIONS.filter(s =>
        s.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-sanatorio-primary" />
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

                {/* Save Button */}
                {!isLocked && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                        <button
                            onClick={handleSave}
                            disabled={saving || !hasChanges}
                            className="btn-primary w-full disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {saving ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
                            ) : saved ? (
                                <><CheckCircle2 className="w-5 h-5" /> ¡Guardado correctamente!</>
                            ) : (
                                <><Save className="w-5 h-5" /> Guardar Sectores</>
                            )}
                        </button>
                        {!hasChanges && !saved && (
                            <p className="text-center text-xs text-gray-400 mt-2">No hay cambios por guardar</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileSettings;
