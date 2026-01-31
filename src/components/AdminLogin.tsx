import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-card border border-gray-100 p-8 md:p-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-sanatorio-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-sanatorio-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Acceso Administrativo</h2>
                    <p className="text-sm text-gray-500 mt-2">Panel de Control de Calidad</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="label-text">Correo Electrónico</label>
                        <div className="relative">
                            <input
                                type="email"
                                required
                                className="input-field pl-12"
                                placeholder="ejemplo@sanatorio.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="label-text">Contraseña</label>
                        <div className="relative">
                            <input
                                type="password"
                                required
                                className="input-field pl-12"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-sanatorio-primary text-white rounded-xl font-bold text-lg hover:bg-[#004270] transition-all flex items-center justify-center shadow-lg shadow-sanatorio-primary/20 disabled:opacity-70"
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
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
