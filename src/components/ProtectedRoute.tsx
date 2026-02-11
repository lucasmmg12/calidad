import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const [checking, setChecking] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const { role, loading: authLoading } = useAuth();

    const checkAuth = async () => {
        const { data } = await supabase.auth.getSession();
        setIsAuthenticated(!!data.session);
        setChecking(false);
    };

    useEffect(() => {
        checkAuth();
    }, []);

    if (checking || authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-sanatorio-primary" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/admin" replace />;
    }

    // Role-based access check
    if (allowedRoles && role && !allowedRoles.includes(role)) {
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
