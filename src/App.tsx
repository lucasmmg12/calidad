import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './utils/supabase';
import { ReportingForm } from './components/ReportingForm';
import { Dashboard } from './components/Dashboard';
import { TrackingPage } from './components/TrackingPage';
import { MetricsDashboard } from './components/MetricsDashboard';
import { HelpGuide } from './components/HelpGuide';
import { AdminLogin } from './components/AdminLogin';
import { ProtectedRoute } from './components/ProtectedRoute';
import {
  MessageSquareHeart,
  LayoutDashboard,
  BarChart3,
  HelpCircle,
  LogOut,
  User,
  LogIn
} from 'lucide-react';

function Navbar() {
  const [session, setSession] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/logosanatorio.png"
            alt="Sanatorio Argentino Logo"
            className="h-12 w-auto transition-transform duration-300 group-hover:scale-105"
          />
          <div className="hidden sm:block border-l border-gray-300 pl-3">
            <h1 className="text-lg font-bold text-sanatorio-primary leading-none mb-1">Gestión de Calidad</h1>
            <p className="text-xs text-sanatorio-secondary font-medium tracking-widest uppercase">Mejora Continua</p>
          </div>
        </Link>

        <nav className="flex gap-1 sm:gap-4 items-center">
          <Link to="/" className="px-3 py-2 text-gray-600 hover:text-sanatorio-primary hover:bg-blue-50 rounded-lg font-medium text-sm transition-all">Nuevo Reporte</Link>
          <Link to="/track" className="px-3 py-2 text-gray-600 hover:text-sanatorio-primary hover:bg-blue-50 rounded-lg font-medium text-sm transition-all">Seguimiento</Link>
          <Link to="/guia" className="px-3 py-2 text-gray-600 hover:text-sanatorio-primary hover:bg-blue-50 rounded-lg font-medium text-sm transition-all border border-transparent hover:border-blue-100 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Guía
          </Link>

          {session ? (
            <>
              <Link to="/metrics" className="hidden md:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-sanatorio-primary hover:bg-blue-50 rounded-lg font-medium text-sm transition-all">
                <BarChart3 className="w-4 h-4" />
                Métricas
              </Link>
              <Link to="/dashboard" className="hidden md:flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-sanatorio-primary hover:bg-blue-50 rounded-lg font-medium text-sm transition-all">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm transition-all ml-2"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 hover:text-sanatorio-primary hover:bg-blue-50 rounded-lg font-medium text-sm transition-all border border-gray-100"
            >
              <LogIn className="w-4 h-4" />
              Acceso Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans text-gray-900 bg-gray-50/50">
        <Navbar />

        {/* Main Content */}
        <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<ReportingForm />} />
            <Route path="/track" element={<TrackingPage />} />
            <Route path="/guia" element={<HelpGuide />} />
            <Route path="/login" element={<AdminLogin />} />

            {/* Rutas Privadas (Admin) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/metrics" element={<MetricsDashboard />} />
            </Route>
          </Routes>
        </main>

        {/* Enhanced Footer */}
        <footer className="bg-white border-t border-gray-100 mt-auto relative overflow-hidden">
          {/* Call to Action Section */}
          <div className="bg-gradient-to-r from-sanatorio-primary to-[#00385c] py-12 px-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="max-w-4xl mx-auto text-center relative z-10 text-white">
              <MessageSquareHeart className="w-12 h-12 mx-auto mb-4 text-sanatorio-secondary animate-pulse" />
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Tu voz construye nuestra excelencia</h2>
              <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-8">
                Cada reporte, sugerencia o feedback nos ayuda a elevar los estándares de cuidado para nuestros pacientes. Gracias por ser parte del cambio.
              </p>
              {/* Button Removed */}
            </div>
          </div>

          {/* Copyright Section */}
          <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>© {new Date().getFullYear()} Sanatorio Argentino • Departamento de Calidad</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-sanatorio-primary transition-colors">Privacidad</a>
              <a href="#" className="hover:text-sanatorio-primary transition-colors">Términos</a>
              <a href="#" className="hover:text-sanatorio-primary transition-colors">Contacto</a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
