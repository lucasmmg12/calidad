import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ReportingForm } from './components/ReportingForm';
import { Dashboard } from './components/Dashboard';
import { TrackingPage } from './components/TrackingPage';
import { MetricsDashboard } from './components/MetricsDashboard';
import { HelpGuide } from './components/HelpGuide';
import { AdminLogin } from './components/AdminLogin';
import { ProtectedRoute } from './components/ProtectedRoute';
import LegalContent from './components/LegalContent';
import { Changelog } from './components/Changelog';
import { AlertRecipientsManager } from './components/AlertRecipientsManager';
import { UserManagement } from './pages/UserManagement';
import { ResolutionPage } from './pages/ResolutionPage';
import { SupplementaryInfoPage } from './pages/SupplementaryInfoPage';
import { MyCases } from './pages/MyCases';
import { ProcessAuditPage } from './pages/ProcessAuditPage';
import Presentation from './pages/Presentation';
import ManualProcedimientos from './components/ManualProcedimientos';
import ProfileSettings from './pages/ProfileSettings';
import WeekendAuditPage from './pages/WeekendAuditPage';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import PendingApproval from './pages/PendingApproval';
import { LogoutModal } from './components/LogoutModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import {
  LayoutDashboard,
  BarChart3,
  HelpCircle,
  LogOut,
  LogIn,
  UserCog,
  Shield,
  Users,
  Bell,
  Briefcase,
  BookMarked,
  ClipboardCheck
} from 'lucide-react';
import { supabase } from './utils/supabase';

function Navbar() {
  const { session, role, isAdmin, isDirectivo } = useAuth();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navLinkClass = (path: string, variant: 'default' | 'emerald' | 'red' = 'default') => {
    const active = isActive(path);
    if (variant === 'emerald') {
      return `hidden md:flex items-center gap-1.5 px-3.5 py-2 font-bold text-xs rounded-xl transition-all ${
        active
          ? 'bg-emerald-600 text-white shadow-xs'
          : 'text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200/70'
      }`;
    }
    if (variant === 'red') {
      return `hidden md:flex items-center gap-1.5 px-3.5 py-2 font-bold text-xs rounded-xl transition-all ${
        active
          ? 'bg-red-600 text-white shadow-xs'
          : 'text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200/70'
      }`;
    }
    return `flex items-center gap-1.5 px-3.5 py-2 font-bold text-xs rounded-xl transition-all ${
      active
        ? 'bg-sanatorio-primary text-white shadow-xs'
        : 'text-slate-600 hover:text-sanatorio-primary hover:bg-slate-100/80'
    }`;
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    setMobileMenuOpen(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);

    // 1. Clear local storage immediately
    const key = 'sb-' + import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token';
    localStorage.removeItem(key);

    // 2. Fire and forget signOut (don't await it)
    supabase.auth.signOut().catch(err => console.error('[Logout] signOut error:', err));

    // 3. Force reload/redirect immediately
    window.location.href = '/login';
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-[9999] w-full px-2 sm:px-4 py-2 sm:py-2.5">
        <div className="max-w-7xl mx-auto glass-panel rounded-2xl px-3 sm:px-5 md:px-6 py-2.5 flex justify-between items-center transition-all duration-300">
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3.5 group focus:outline-none" onClick={closeMobileMenu}>
            <div className="bg-white p-1 rounded-xl border border-slate-100 shadow-2xs transition-transform duration-300 group-hover:scale-[1.03]">
              <img
                src="/logosanatorio.png"
                alt="Sanatorio Argentino"
                className="h-7 sm:h-9 md:h-10 w-auto object-contain"
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-display font-extrabold text-sanatorio-primary text-sm md:text-base leading-tight tracking-tight group-hover:text-[#003E6B] transition-colors">
                Calidad & Seguridad
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Sanatorio Argentino
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden sm:flex items-center gap-1">
            <Link to="/track" className={navLinkClass('/track')} title="Seguimiento">
              <LayoutDashboard className="w-3.5 h-3.5" /> <span className="hidden md:inline">Seguimiento</span>
            </Link>
            <Link to="/guia" className={navLinkClass('/guia')} title="Guía">
              <HelpCircle className="w-3.5 h-3.5" /> <span className="hidden md:inline">Guía</span>
            </Link>

            <div className="w-px h-5 bg-slate-200 mx-1.5 hidden md:block"></div>

            {session ? (
              <>
                {isAdmin && (
                  <>
                    <Link to="/admin/users" className={`hidden md:flex ${navLinkClass('/admin/users')}`}>
                      <Users className="w-3.5 h-3.5" /> Usuarios
                    </Link>
                    <Link to="/admin/alertas" className={navLinkClass('/admin/alertas', 'red')}>
                      <Bell className="w-3.5 h-3.5" /> Alertas
                    </Link>
                  </>
                )}

                {!isDirectivo && (
                  <Link to="/dashboard" className={`hidden md:flex ${navLinkClass('/dashboard')}`}>
                    <LayoutDashboard className="w-3.5 h-3.5" /> Casos
                  </Link>
                )}

                <Link to="/mis-casos" className={`hidden md:flex ${navLinkClass('/mis-casos')}`}>
                  <Briefcase className="w-3.5 h-3.5" /> Mis Casos
                </Link>

                <Link to="/auditoria-fin-de-semana" className={navLinkClass('/auditoria-fin-de-semana', 'emerald')} title="Auditoría de Proceso">
                  <ClipboardCheck className="w-3.5 h-3.5" /> Auditoría de Proceso
                </Link>

                <Link to="/metrics" className={`hidden md:flex ${navLinkClass('/metrics')}`}>
                  <BarChart3 className="w-3.5 h-3.5" /> Métricas
                </Link>

                <Link to="/manual" className={`hidden md:flex ${navLinkClass('/manual')}`} title="Manual del Sistema">
                  <BookMarked className="w-3.5 h-3.5" /> Manual
                </Link>

                {!isAdmin && !isDirectivo && (
                  <Link to="/perfil" className={`hidden md:flex ${navLinkClass('/perfil')}`}>
                    <UserCog className="w-3.5 h-3.5" /> Perfil
                  </Link>
                )}

                <button
                  onClick={handleLogoutClick}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 border border-slate-200/60 hover:border-red-200 rounded-xl font-bold text-xs transition-all ml-1.5 cursor-pointer z-[10000]"
                  style={{ pointerEvents: 'auto' }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Salir</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-4 py-2 bg-sanatorio-primary text-white hover:bg-[#004270] rounded-xl font-bold text-xs transition-all shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Acceso Institucional</span>
              </Link>
            )}
          </nav>

          {/* Mobile Nav Controls */}
          <div className="flex sm:hidden items-center gap-2">
            {session && (
              <button
                onClick={handleLogoutClick}
                className="p-2 bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              aria-label="Menú"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden mt-2 max-w-7xl mx-auto glass-panel rounded-2xl px-3 py-3 animate-in slide-in-from-top-2 fade-in duration-200 shadow-xl border border-white/50">
            <div className="flex flex-col gap-1">
              <Link onClick={closeMobileMenu} to="/track" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-bold text-sm hover:text-sanatorio-primary hover:bg-sanatorio-primary/5 rounded-xl transition-all">
                <LayoutDashboard className="w-4 h-4" /> Seguimiento
              </Link>
              <Link onClick={closeMobileMenu} to="/guia" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-bold text-sm hover:text-sanatorio-primary hover:bg-sanatorio-primary/5 rounded-xl transition-all">
                <HelpCircle className="w-4 h-4" /> Guía
              </Link>

              {session ? (
                <>
                  <div className="h-px bg-slate-200/60 my-1 mx-2"></div>

                  {isAdmin && (
                    <>
                      <Link onClick={closeMobileMenu} to="/admin/users" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-bold text-sm hover:text-sanatorio-primary hover:bg-sanatorio-primary/5 rounded-xl transition-all">
                        <Users className="w-4 h-4" /> Usuarios
                      </Link>
                      <Link onClick={closeMobileMenu} to="/admin/alertas" className="flex items-center gap-3 px-4 py-3 text-red-500 font-bold text-sm hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <Bell className="w-4 h-4" /> Alertas
                      </Link>
                    </>
                  )}

                  {!isDirectivo && (
                    <Link onClick={closeMobileMenu} to="/dashboard" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-bold text-sm hover:text-sanatorio-primary hover:bg-sanatorio-primary/5 rounded-xl transition-all">
                      <LayoutDashboard className="w-4 h-4" /> Tablero de Casos
                    </Link>
                  )}

                  <Link onClick={closeMobileMenu} to="/mis-casos" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-bold text-sm hover:text-sanatorio-primary hover:bg-sanatorio-primary/5 rounded-xl transition-all">
                    <Briefcase className="w-4 h-4" /> Mis Casos
                  </Link>

                  {/*
                  <Link onClick={closeMobileMenu} to="/auditoria-procesos" className="flex items-center gap-3 px-4 py-3 text-emerald-700 font-bold text-sm hover:bg-emerald-50 rounded-xl transition-all">
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" /> Auditoría de Procesos
                  </Link>
                  */}

                  <Link onClick={closeMobileMenu} to="/auditoria-fin-de-semana" className="flex items-center gap-3 px-4 py-3 text-emerald-700 font-bold text-sm hover:bg-emerald-50 rounded-xl transition-all">
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" /> Auditoría de Proceso
                  </Link>

                  <Link onClick={closeMobileMenu} to="/metrics" className="flex items-center gap-3 px-4 py-3 text-sanatorio-primary font-bold text-sm hover:bg-sanatorio-primary/5 rounded-xl transition-all">
                    <BarChart3 className="w-4 h-4" /> Métricas
                  </Link>

                  <Link onClick={closeMobileMenu} to="/manual" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-bold text-sm hover:text-sanatorio-primary hover:bg-sanatorio-primary/5 rounded-xl transition-all">
                    <BookMarked className="w-4 h-4" /> Manual del Sistema
                  </Link>

                  {!isAdmin && !isDirectivo && (
                    <Link onClick={closeMobileMenu} to="/perfil" className="flex items-center gap-3 px-4 py-3 text-slate-600 font-bold text-sm hover:text-sanatorio-primary hover:bg-sanatorio-primary/5 rounded-xl transition-all">
                      <UserCog className="w-4 h-4" /> Perfil
                    </Link>
                  )}

                  {/* Mobile Role Badge */}
                  <div className="mx-2 mt-1">
                    <div className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest ${role === 'admin' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                      role === 'directivo' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                        'bg-green-50 text-green-600 border border-green-200'
                      }`}>
                      <Shield className="w-3 h-3" />
                      {role === 'admin' ? 'Admin' : role === 'directivo' ? 'Directivo' : 'Responsable'}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-px bg-slate-200/60 my-1 mx-2"></div>
                  <Link onClick={closeMobileMenu} to="/login" className="flex items-center justify-center gap-2 px-5 py-3 bg-sanatorio-primary text-white rounded-xl font-bold text-sm transition-all shadow-sm mx-2">
                    <LogIn className="w-4 h-4" /> Ingresar
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Logout Modal */}
      {showLogoutModal && (
        <LogoutModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={handleConfirmLogout}
        />
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
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
              <Route path="/registro" element={<Register />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/pendiente" element={<PendingApproval />} />
              <Route path="/privacidad" element={<LegalContent />} />
              <Route path="/terminos" element={<LegalContent />} />
              <Route path="/resolver-caso/:ticketId" element={<ResolutionPage />} />
              <Route path="/resolver-caso/:ticketId/:assignmentId" element={<ResolutionPage />} />
              <Route path="/info-adicional/:requestId" element={<SupplementaryInfoPage />} />
              <Route path="/presentacion" element={<Presentation />} />
              <Route path="/changelog" element={<Changelog />} />

              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/alertas" element={<AlertRecipientsManager />} />
              </Route>

              {/* Dashboard — Admin & Responsable */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'responsable']} />}>
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>

              {/* Métricas — Todos los roles autenticados */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'responsable', 'directivo']} />}>
                <Route path="/metrics" element={<MetricsDashboard />} />
                <Route path="/auditoria-procesos" element={<ProcessAuditPage />} />
                <Route path="/auditoria-fin-de-semana" element={<WeekendAuditPage />} />
                <Route path="/auditoria-proceso" element={<WeekendAuditPage />} />
                <Route path="/auditoria-de-proceso" element={<WeekendAuditPage />} />
              </Route>

              {/* Perfil y Manual — Cualquier rol autenticado */}
              <Route element={<ProtectedRoute />}>
                <Route path="/perfil" element={<ProfileSettings />} />
                <Route path="/mis-casos" element={<MyCases />} />
                <Route path="/manual" element={<ManualProcedimientos />} />
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
                <Link to="/changelog" className="hover:text-sanatorio-primary transition-colors">Actualizaciones</Link>
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
      </AuthProvider>
    </Router>
  );
}

export default App;
