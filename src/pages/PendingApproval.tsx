import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, Phone, Mail, Shield, LogOut, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../utils/supabase';

const PendingApproval = () => {
    const { profile, session, isApproved } = useAuth();
    const navigate = useNavigate();

    // If already approved, redirect to dashboard
    if (isApproved) {
        navigate(profile?.role === 'directivo' ? '/metrics' : '/dashboard');
        return null;
    }

    const isRejected = profile?.account_status === 'rejected';

    const handleLogout = async () => {
        const key = 'sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token';
        localStorage.removeItem(key);
        supabase.auth.signOut().catch(err => console.error('[Logout]', err));
        window.location.href = '/login';
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">

                {/* Header */}
                <div className={`px-8 py-10 text-center ${isRejected
                        ? 'bg-gradient-to-br from-red-50 to-red-100/50'
                        : 'bg-gradient-to-br from-blue-50 to-sanatorio-primary/5'
                    }`}>
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg ${isRejected
                            ? 'bg-red-500 shadow-red-500/20'
                            : 'bg-sanatorio-primary shadow-sanatorio-primary/20'
                        }`}>
                        {isRejected
                            ? <XCircle className="w-10 h-10 text-white" />
                            : <Clock className="w-10 h-10 text-white" />
                        }
                    </div>

                    {isRejected ? (
                        <>
                            <h1 className="text-2xl font-display font-black text-red-800 mb-2">
                                Solicitud Rechazada
                            </h1>
                            <p className="text-sm text-red-600 leading-relaxed">
                                Lamentablemente tu solicitud de acceso no fue aprobada. Contactá al equipo de Calidad para más información.
                            </p>
                        </>
                    ) : (
                        <>
                            <h1 className="text-2xl font-display font-black text-gray-800 mb-2">
                                ¡Registro Completado con Éxito! 🎉
                            </h1>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Tu solicitud fue enviada al equipo de Calidad. Dentro de las próximas{' '}
                                <strong>24 horas hábiles</strong> recibirás una notificación acerca de tu autorización.
                            </p>
                        </>
                    )}
                </div>

                {/* Info Cards */}
                {!isRejected && (
                    <div className="px-8 py-6 space-y-4">
                        {/* Summary */}
                        <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5" />
                                Datos Registrados
                            </h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Nombre:</span>
                                    <span className="font-bold text-gray-800">{profile?.display_name || '—'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Rol:</span>
                                    <span className={`font-bold ${profile?.role === 'directivo' ? 'text-blue-600' : 'text-green-600'
                                        }`}>
                                        {profile?.role === 'directivo' ? '🏥 Directivo' : '🛠️ Responsable'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500">Email:</span>
                                    <span className="font-bold text-gray-800 text-xs">{session?.user?.email}</span>
                                </div>
                                {profile?.phone_number && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">WhatsApp:</span>
                                        <span className="font-bold text-gray-800 font-mono">{profile.phone_number}</span>
                                    </div>
                                )}
                                {profile?.assigned_sectors && profile.assigned_sectors.length > 0 && (
                                    <div>
                                        <span className="text-gray-500 block mb-1">Sectores:</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {profile.assigned_sectors.map(s => (
                                                <span key={s} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* WhatsApp notification info */}
                        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-sm">
                            <Phone className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold text-green-800 text-xs">Notificación por WhatsApp</p>
                                <p className="text-xs text-green-700 mt-1">
                                    Cuando tu cuenta sea autorizada, recibirás un mensaje de WhatsApp al número{' '}
                                    <strong className="font-mono">{profile?.phone_number}</strong> con la confirmación.
                                </p>
                            </div>
                        </div>

                        {/* Email info */}
                        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm">
                            <Mail className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold text-blue-800 text-xs">¿Qué sigue?</p>
                                <p className="text-xs text-blue-700 mt-1">
                                    El equipo de Calidad revisará tu solicitud. Una vez autorizada, podrás acceder al sistema con tu email y contraseña.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 px-4 bg-sanatorio-primary text-white font-bold rounded-xl hover:bg-[#004270] transition-all shadow-lg shadow-sanatorio-primary/20 flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Volver al Inicio
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-full py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PendingApproval;
