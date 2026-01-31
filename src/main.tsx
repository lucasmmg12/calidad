import { StrictMode, Component } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Basic Error Boundary for Production Debugging
class GlobalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[CRITICAL ALERT] App Crash Detected:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md border border-red-100">
            <h1 className="text-2xl font-bold text-red-600 mb-4">¡Ups! Algo salió mal.</h1>
            <p className="text-gray-600 mb-6">La aplicación no pudo iniciarse correctamente. Esto puede deberse a un error de configuración o de red.</p>
            <div className="bg-red-50 p-4 rounded-xl mb-6 text-left overflow-auto">
              <code className="text-xs text-red-800">{this.state.error?.toString()}</code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-sanatorio-primary text-white rounded-xl font-bold"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

console.log('[System] Initializing Sanatorio Argentino Quality WebApp...');

const container = document.getElementById('root');
if (!container) {
  console.error('[System] Error: HTML Root Element (#root) not found.');
} else {
  createRoot(container).render(
    <StrictMode>
      <GlobalErrorBoundary>
        <App />
      </GlobalErrorBoundary>
    </StrictMode>,
  );
  console.log('[System] Render triggered.');
}
