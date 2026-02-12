import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, UserPlus, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (signUpError) throw signUpError;

            // After signUp, the auth state change will create the profile
            // and redirect to onboarding via ProtectedRoute
            navigate('/onboarding');
        } catch (err: any) {
            if (err.message?.includes('already registered')) {
                setError('Este email ya está registrado. Intentá iniciar sesión.');
            } else {
                setError(err.message || 'Error al crear la cuenta. Intente nuevamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-card border border-gray-100 p-8 md:p-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                        <img src="/logosanatorio.png" alt="Sanatorio Argentino" className="w-14 h-14 object-contain" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Crear Cuenta</h2>
                    <p className="text-sm text-gray-500 mt-2">Registrate para acceder al sistema de Calidad</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-5">
                    <div className="space-y-2">
                        <label className="label-text">Correo Electrónico</label>
                        <div className="relative">
                            <input
                                type="email"
                                required
                                className="input-field"
                                style={{ paddingLeft: '3.5rem' }}
                                placeholder="ejemplo@sanatorio.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="label-text">Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={6}
                                className="input-field"
                                style={{ paddingLeft: '3.5rem', paddingRight: '3rem' }}
                                placeholder="Mínimo 6 caracteres"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 pointer-events-none" />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="label-text">Confirmar Contraseña</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={6}
                                className="input-field"
                                style={{ paddingLeft: '3.5rem' }}
                                placeholder="Repita la contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 pointer-events-none" />
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                            <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || password !== confirmPassword}
                        className="w-full py-4 bg-sanatorio-primary text-white rounded-xl font-bold text-lg hover:bg-[#004270] transition-all flex items-center justify-center gap-2 shadow-lg shadow-sanatorio-primary/20 disabled:opacity-70"
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <><UserPlus className="w-5 h-5" /> Crear Cuenta</>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center space-y-3">
                    <p className="text-sm text-gray-500">
                        ¿Ya tenés cuenta?{' '}
                        <Link to="/login" className="text-sanatorio-primary font-bold hover:underline">
                            Iniciar Sesión
                        </Link>
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="text-sm text-gray-400 hover:text-sanatorio-primary flex items-center gap-2 mx-auto transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al Formulario Público
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Register;
