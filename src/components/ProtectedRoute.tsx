import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const { session, role, loading } = useAuth();

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
