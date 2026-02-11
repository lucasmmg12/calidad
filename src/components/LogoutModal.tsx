import { LogOut, X } from 'lucide-react';

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const LogoutModal = ({ isOpen, onClose, onConfirm }: LogoutModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">

                {/* Header Decoration */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-sanatorio-primary/10 to-transparent pointer-events-none" />

                <div className="p-8 relative z-10 text-center">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-100 transform rotate-3">
                        <LogOut className="w-10 h-10 text-red-500 ml-1" />
                    </div>

                    <h3 className="text-2xl font-display font-black text-slate-800 mb-3">
                        ¿Cerrar Sesión?
                    </h3>

                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        Estás a punto de salir del sistema de Calidad. Tendrás que volver a ingresar tus credenciales para acceder.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={onConfirm}
                            className="w-full py-3.5 px-6 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-5 h-5" />
                            Sí, Cerrar Sesión
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-3.5 px-6 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 active:scale-95 rounded-xl font-bold transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>

                {/* Footer Brand */}
                <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Sanatorio Argentino
                    </p>
                </div>
            </div>
        </div>
    );
};
