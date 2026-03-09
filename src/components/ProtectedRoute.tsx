import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ShieldAlert, MapPin } from 'lucide-react';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const { session, role, loading, needsOnboarding, isApproved, sectors } = useAuth();

    // Wait for auth to fully resolve (session + profile)
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-sanatorio-primary" />
            </div>
        );
    }

    // No session = not authenticated
    if (!session) {
        return <Navigate to="/login" replace />;
    }

    // Session exists but role hasn't loaded yet — shouldn't happen after loading=false
    // but guard just in case
    if (!role) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-sanatorio-primary" />
            </div>
        );
    }

    // User needs to complete onboarding first
    if (needsOnboarding) {
        return <Navigate to="/onboarding" replace />;
    }

    // User is pending approval or rejected
    if (!isApproved && role !== 'admin') {
        return <Navigate to="/pendiente" replace />;
    }

    // No sectors assigned = cannot access protected routes (admins exempt)
    if (role !== 'admin' && (!sectors || sectors.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in">
                <div className="bg-amber-50 p-8 rounded-2xl border border-amber-200 max-w-md shadow-lg">
                    <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
                        <MapPin className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-display font-bold text-amber-800 mb-3">Sin Sectores Asignados</h2>
                    <p className="text-sm text-amber-700 leading-relaxed mb-4">
                        Tu cuenta no tiene ningún sector asignado. Para acceder al sistema, primero debes
                        configurar los sectores bajo tu responsabilidad.
                    </p>
                    <div className="space-y-3">
                        <a
                            href="/perfil"
                            className="block w-full py-3 px-4 bg-sanatorio-primary text-white font-bold rounded-xl hover:bg-sanatorio-primary/90 transition-all shadow-lg shadow-sanatorio-primary/20 text-sm"
                        >
                            Configurar Mis Sectores
                        </a>
                        <p className="text-xs text-amber-600 font-medium">
                            Si necesitas ayuda, contactá al Departamento de Calidad.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Role-based access check
    if (allowedRoles && !allowedRoles.includes(role)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in">
                <div className="bg-red-50 p-6 rounded-2xl border border-red-200 max-w-md">
                    <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-700 mb-2">Acceso Restringido</h2>
                    <p className="text-sm text-red-600">
                        Tu rol actual (<span className="font-bold">{role}</span>) no tiene permisos para acceder a esta sección.
                    </p>
                    <a href="/dashboard" className="inline-block mt-4 text-sm font-bold text-sanatorio-primary hover:underline">
                        ← Volver al Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return <Outlet />;
};
