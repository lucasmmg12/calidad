import { useState, useEffect } from 'react';

interface DoraAssistantProps {
    message?: string;
    className?: string;
    emotion?: 'happy' | 'thinking' | 'neutral';
    variant?: 'peek' | 'corner' | 'inline';
}

export const DoraAssistant = ({
    message,
    className = '',
    variant = 'corner'
}: DoraAssistantProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [bubbleDismissed, setBubbleDismissed] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 600);
        return () => clearTimeout(timer);
    }, []);

    // Auto-dismiss speech bubble after 8 seconds
    useEffect(() => {
        if (isVisible && message && variant === 'peek') {
            const dismissTimer = setTimeout(() => setBubbleDismissed(true), 8000);
            return () => clearTimeout(dismissTimer);
        }
    }, [isVisible, message, variant]);

    if (!isVisible && !message) return null;

    // ─── PEEK VARIANT: Dora asomándose desde abajo del título ───
    if (variant === 'peek') {
        return (
            <div className={`relative flex justify-center mb-6 ${className}`}>
                <div
                    className={`
                        flex items-end gap-3 transition-all duration-700 ease-out transform
                        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}
                    `}
                >
                    {/* Dora Peek Image - shows from chest up */}
                    <div className="relative group">
                        <div
                            className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-white shadow-xl 
                                       bg-gradient-to-br from-blue-50 to-blue-100
                                       transition-transform duration-300 group-hover:scale-110 cursor-pointer"
                            style={{ animation: 'doraBounce 3s ease-in-out infinite' }}
                        >
                            <img
                                src="/dora (2).png"
                                alt="Dora - Asistente de Calidad"
                                className="w-full h-full object-cover object-top scale-150"
                                style={{ objectPosition: '50% 15%' }}
                            />
                        </div>
                        {/* Online indicator */}
                        <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-pulse"></div>
                    </div>

                    {/* Speech Bubble */}
                    {message && !bubbleDismissed && (
                        <div
                            className={`
                                relative bg-white px-5 py-3 rounded-2xl rounded-bl-md shadow-lg border border-blue-100
                                max-w-[260px] transform transition-all duration-500 origin-bottom-left
                                ${isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}
                            `}
                        >
                            {/* Bubble arrow */}
                            <div className="absolute -left-2 bottom-3 w-0 h-0 
                                           border-t-[6px] border-t-transparent 
                                           border-r-[8px] border-r-white 
                                           border-b-[6px] border-b-transparent
                                           drop-shadow-sm"></div>
                            <p className="text-sm text-gray-700 font-medium leading-relaxed">
                                {message}
                            </p>
                            <button
                                onClick={() => setBubbleDismissed(true)}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors text-xs"
                                aria-label="Cerrar"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* CSS animation */}
                <style>{`
                    @keyframes doraBounce {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-5px); }
                    }
                `}</style>
            </div>
        );
    }

    // ─── INLINE VARIANT: Small Dora next to text ───
    if (variant === 'inline') {
        return (
            <div className={`flex items-center gap-3 ${className}`}>
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md bg-blue-50 shrink-0">
                    <img
                        src="/dora (2).png"
                        alt="Dora"
                        className="w-full h-full object-cover scale-150"
                        style={{ objectPosition: '50% 15%' }}
                    />
                </div>
                {message && (
                    <p className="text-sm text-gray-600 font-medium italic">
                        {message}
                    </p>
                )}
            </div>
        );
    }

    // ─── CORNER VARIANT (Default): Fixed bottom-right ───
    return (
        <div
            className={`fixed bottom-0 right-4 z-40 hidden md:flex flex-col items-end transition-all duration-500 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'} ${className}`}
        >
            {message && (
                <div className={`
                    mb-4 mr-8 bg-white p-4 rounded-2xl rounded-br-none shadow-xl border border-blue-100 max-w-xs
                    transform transition-all duration-300 origin-bottom-right
                    ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
                `}>
                    <p className="text-sm text-gray-700 font-medium leading-relaxed">
                        {message}
                    </p>
                </div>
            )}

            <div className="relative group cursor-pointer">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
                    <img
                        src="/dora (2).png"
                        alt="Dora AI"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="absolute bottom-4 right-4 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-pulse"></div>
            </div>
        </div>
    );
};
