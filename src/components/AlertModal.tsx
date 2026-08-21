import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'info';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: AlertType;
    showCancel?: boolean;
    onConfirm?: () => void;
}

export const AlertModal = ({ isOpen, onClose, title, message, type = 'info', showCancel = false, onConfirm }: AlertModalProps) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        onClose();
    };

    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-emerald-50',
                    border: 'border-emerald-100',
                    icon: <CheckCircle2 className="w-10 h-10 text-emerald-500" />,
                    buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
                    buttonShadow: 'shadow-emerald-500/20'
                };
            case 'error':
                return {
                    bg: 'bg-red-50',
                    border: 'border-red-100',
                    icon: <AlertCircle className="w-10 h-10 text-red-500" />,
                    buttonBg: 'bg-red-600 hover:bg-red-700',
                    buttonShadow: 'shadow-red-500/20'
                };
            case 'info':
            default:
                return {
                    bg: 'bg-blue-50',
                    border: 'border-blue-100',
                    icon: <Info className="w-10 h-10 text-blue-500" />,
                    buttonBg: 'bg-blue-600 hover:bg-blue-700',
                    buttonShadow: 'shadow-blue-500/20'
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">

                <div className="p-8 relative z-10 text-center">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border transform rotate-3 ${styles.bg} ${styles.border}`}>
                        {styles.icon}
                    </div>

                    <h3 className="text-2xl font-display font-black text-slate-800 mb-3">
                        {title}
                    </h3>

                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        {message}
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={handleConfirm}
                            className={`w-full py-3.5 px-6 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 ${styles.buttonBg} ${styles.buttonShadow}`}
                        >
                            {showCancel ? 'Confirmar' : 'Aceptar'}
                        </button>

                        {showCancel && (
                            <button
                                onClick={onClose}
                                className="w-full py-3.5 px-6 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 active:scale-95 rounded-xl font-bold transition-all"
                            >
                                Cancelar
                            </button>
                        )}
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
