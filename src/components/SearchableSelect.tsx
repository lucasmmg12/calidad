import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: readonly Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    className?: string;
}

export const SearchableSelect = ({
    options,
    value,
    onChange,
    placeholder = 'Selecciona...',
    required = false,
    className = '',
}: SearchableSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedLabel = options.find(o => o.value === value)?.label || '';

    const filtered = options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase())
    );

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Focus input when opening
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Hidden input for form validation */}
            {required && (
                <input
                    type="text"
                    required
                    value={value}
                    onChange={() => { }}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                />
            )}

            {/* Trigger button */}
            <button
                type="button"
                onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
                className={`w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-left flex items-center justify-between gap-2 ${value ? 'text-gray-700' : 'text-gray-400'
                    }`}
            >
                <span className="truncate text-sm">
                    {selectedLabel || placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Search input */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar sector..."
                                className="w-full pl-9 pr-8 py-2.5 text-sm rounded-lg border border-gray-100 bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 outline-none transition-all"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                    <X className="w-3 h-3 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options list */}
                    <div className="max-h-52 overflow-y-auto overscroll-contain">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-6 text-center text-sm text-gray-400">
                                No se encontraron resultados
                            </div>
                        ) : (
                            filtered.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${option.value === value
                                            ? 'bg-blue-50 text-blue-700 font-semibold'
                                            : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    {option.value === value && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                    )}
                                    <span className="truncate">{option.label}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
