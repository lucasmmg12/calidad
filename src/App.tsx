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
import LegalContent from './components/LegalContent';
import {
  LayoutDashboard,
  BarChart3,
  HelpCircle,
  LogOut,
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
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full px-4 py-3">
      <div className="max-w-7xl mx-auto glass-panel rounded-2xl md:rounded-3xl px-4 md:px-8 py-3 flex justify-between items-center transition-all duration-300">
        <Link to="/" className="flex items-center group focus:outline-none">
          <img
            src="/logosanatorio.png"
            alt="Sanatorio Argentino"
            className="h-10 md:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        <nav className="flex items-center gap-1">
          <Link to="/track" className="p-2.5 rounded-xl text-slate-500 hover:text-sanatorio-primary hover:bg-sanatorio-primary/5 transition-all duration-200" title="Seguimiento">
            <LayoutDashboard className="w-5 h-5" />
          </Link>
          <Link to="/guia" className="p-2.5 rounded-xl text-slate-500 hover:text-sanatorio-primary hover:bg-sanatorio-primary/5 transition-all duration-200" title="Guía">
            <HelpCircle className="w-5 h-5" />
          </Link>

          <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block"></div>

          {session ? (
            <>
              <Link
                to="/dashboard"
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-slate-600 font-bold text-sm hover:text-sanatorio-primary hover:bg-sanatorio-primary/5 rounded-xl transition-all"
              >
                <LayoutDashboard className="w-4 h-4" /> Casos
              </Link>
              <Link
                to="/metrics"
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sanatorio-primary font-bold text-sm hover:bg-sanatorio-primary/5 rounded-xl transition-all"
              >
                <BarChart3 className="w-4 h-4" /> Métricas
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl font-bold text-sm transition-all ml-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-5 py-2.5 bg-sanatorio-primary/5 text-sanatorio-primary hover:bg-sanatorio-primary hover:text-white rounded-xl font-bold text-sm transition-all border border-sanatorio-primary/10 shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
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
      <div className="min-h-screen flex flex-col font-sans text-slate-900 selection:bg-sanatorio-primary/10 selection:text-sanatorio-primary">
        <Navbar />

        {/* Main Content */}
        <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/" element={<ReportingForm />} />
            <Route path="/track" element={<TrackingPage />} />
            <Route path="/guia" element={<HelpGuide />} />
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/privacidad" element={<LegalContent />} />
            <Route path="/terminos" element={<LegalContent />} />

            {/* Rutas Privadas (Admin) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/metrics" element={<MetricsDashboard />} />
            </Route>
          </Routes>
        </main>

        {/* Enhanced Footer */}
        <footer className="mt-20 border-t border-slate-200/60 bg-white/30 backdrop-blur-md relative overflow-hidden">
          {/* Call to Action Section */}
          <div className="bg-gradient-to-br from-sanatorio-primary via-[#00385c] to-slate-900 py-16 px-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-sanatorio-secondary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4"></div>

            <div className="max-w-4xl mx-auto text-center relative z-10 px-4">
              <h2 className="text-3xl md:text-5xl font-display font-black mb-6 text-white leading-tight">
                Tu voz construye nuestra <span className="text-sanatorio-secondary">excelencia</span>
              </h2>
              <p className="text-blue-100/80 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed italic">
                "Cada reporte, sugerencia o feedback nos ayuda a elevar los estándares de cuidado para nuestros pacientes. Gracias por ser parte del cambio."
              </p>
            </div>
          </div>

          {/* Copyright Section */}
          <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-slate-400 font-medium">
            <p>© {new Date().getFullYear()} Sanatorio Argentino • Desarrollado por el Departamento de Innovación y Transformación Digital</p>
            <div className="flex gap-8 items-center">
              <Link to="/privacidad" className="hover:text-sanatorio-primary transition-colors">Privacidad</Link>
              <Link to="/terminos" className="hover:text-sanatorio-primary transition-colors">Términos</Link>
              <div className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></div>
              <a href="mailto:innovacion@sanatorioargentino.com.ar" className="hover:text-sanatorio-primary transition-colors flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sanatorio-secondary"></span>
                Soporte IT
              </a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
