import { useState, useEffect } from 'react';

interface DoraAssistantProps {
    message?: string;
    className?: string;
    emotion?: 'happy' | 'thinking' | 'neutral'; // Kept in interface for future use
}

export const DoraAssistant = ({ message, className = '' }: DoraAssistantProps) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Small delay for entrance animation
        const timer = setTimeout(() => setIsVisible(true), 500);
        return () => clearTimeout(timer);
    }, []);

    if (!isVisible && !message) return null;

    return (
        <div
            className={`fixed bottom-0 right-4 z-40 hidden md:flex flex-col items-end transition-all duration-500 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'} ${className}`}
        >
            {/* Message Bubble */}
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

            {/* Dora Avatar Image */}
            <div className="relative group cursor-pointer">
                <img
                    src="/dora_avatar.png"
                    alt="Dora Asistente"
                    className="h-48 w-auto object-contain drop-shadow-2xl transition-transform duration-300 hover:-translate-y-2"
                />

                {/* Badge when minimized or active */}
                <div className="absolute bottom-4 right-4 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-pulse"></div>
            </div>
        </div>
    );
};
