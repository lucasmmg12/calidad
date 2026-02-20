import { useMemo, useState, useRef, useEffect } from 'react';
import { Filter, X, CalendarDays, Building2, Check, ChevronDown, Search } from 'lucide-react';
import { SECTOR_OPTIONS } from '../constants/sectors';

// ─── Types ───
export interface MetricsFilterState {
    sectors: string[];     // [] = all
    dateFrom: string;      // '' = no limit  (YYYY-MM-DD)
    dateTo: string;        // '' = no limit  (YYYY-MM-DD)
}

interface MetricsFiltersProps {
    filters: MetricsFilterState;
    onChange: (filters: MetricsFilterState) => void;
    /** The sectors the current user is allowed to see. Empty = all sectors (admin/directivo). */
    allowedSectors: string[];
    /** Whether the user can see all sectors (admin/directivo). */
    canViewAll: boolean;
    /** All raw report dates for computing min/max dates. */
    reportDates: string[];
}

export const MetricsFilters = ({ filters, onChange, allowedSectors, canViewAll, reportDates }: MetricsFiltersProps) => {

    const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false);
    const [sectorSearch, setSectorSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setSectorDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Compute available sector options based on permissions
    const sectorOptions = useMemo(() => {
        if (canViewAll) {
            return SECTOR_OPTIONS;
        }
        return SECTOR_OPTIONS.filter(s => allowedSectors.includes(s.value));
    }, [allowedSectors, canViewAll]);

    // Filter sector options by search term
    const filteredSectorOptions = useMemo(() => {
        if (!sectorSearch.trim()) return sectorOptions;
        const q = sectorSearch.toLowerCase();
        return sectorOptions.filter(s => s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q));
    }, [sectorOptions, sectorSearch]);

    // Compute min/max dates from report data
    const dateRange = useMemo(() => {
        if (reportDates.length === 0) return { min: '', max: '' };
        const dates = reportDates.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
        if (dates.length === 0) return { min: '', max: '' };
        const min = new Date(Math.min(...dates.map(d => d.getTime())));
        const max = new Date(Math.max(...dates.map(d => d.getTime())));
        return {
            min: min.toISOString().split('T')[0],
            max: max.toISOString().split('T')[0],
        };
    }, [reportDates]);

    const hasActiveFilters = filters.sectors.length > 0 || filters.dateFrom !== '' || filters.dateTo !== '';

    const clearFilters = () => {
        onChange({ sectors: [], dateFrom: '', dateTo: '' });
    };

    const toggleSector = (value: string) => {
        const current = filters.sectors;
        if (current.includes(value)) {
            onChange({ ...filters, sectors: current.filter(s => s !== value) });
        } else {
            onChange({ ...filters, sectors: [...current, value] });
        }
    };

    const selectAllSectors = () => {
        onChange({ ...filters, sectors: [] }); // empty = all
        setSectorDropdownOpen(false);
    };

    // Label for the sector button
    const sectorButtonLabel = () => {
        if (filters.sectors.length === 0) {
            return canViewAll ? 'Todos los sectores' : 'Mis sectores';
        }
        if (filters.sectors.length === 1) {
            return SECTOR_OPTIONS.find(s => s.value === filters.sectors[0])?.label || filters.sectors[0];
        }
        return `${filters.sectors.length} sectores seleccionados`;
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-in fade-in duration-300 relative z-40">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
                {/* Label */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="w-8 h-8 rounded-xl bg-sanatorio-primary/10 flex items-center justify-center">
                        <Filter className="w-4 h-4 text-sanatorio-primary" />
                    </div>
                    <span className="text-sm font-bold text-gray-700 hidden sm:inline">Filtros</span>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2 flex-1 w-full lg:w-auto">

                    {/* ══════════ SECTOR MULTI-SELECT ══════════ */}
                    <div className="relative flex-1 min-w-[200px]" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setSectorDropdownOpen(!sectorDropdownOpen)}
                            className={`w-full flex items-center gap-2 bg-gray-50 border rounded-xl pl-3 pr-3 py-2.5 text-xs font-medium text-gray-700 cursor-pointer hover:border-sanatorio-primary/40 focus:outline-none focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary/50 transition-all text-left ${filters.sectors.length > 0 ? 'border-sanatorio-primary/40 bg-sanatorio-primary/5' : 'border-gray-200'
                                }`}
                        >
                            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="truncate flex-1">{sectorButtonLabel()}</span>
                            {filters.sectors.length > 0 && (
                                <span className="shrink-0 w-5 h-5 bg-sanatorio-primary text-white rounded-full text-[10px] font-black flex items-center justify-center">
                                    {filters.sectors.length}
                                </span>
                            )}
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${sectorDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Panel */}
                        {sectorDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                {/* Search */}
                                <div className="p-2 border-b border-gray-100">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={sectorSearch}
                                            onChange={(e) => setSectorSearch(e.target.value)}
                                            placeholder="Buscar sector por nombre o iniciales..."
                                            className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-sanatorio-primary/30"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Select All / Clear */}
                                <div className="px-2 py-1.5 border-b border-gray-100 flex gap-1">
                                    <button
                                        type="button"
                                        onClick={selectAllSectors}
                                        className="text-[10px] font-bold text-sanatorio-primary hover:underline px-2 py-1"
                                    >
                                        Todos
                                    </button>
                                    {filters.sectors.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => onChange({ ...filters, sectors: [] })}
                                            className="text-[10px] font-bold text-red-500 hover:underline px-2 py-1"
                                        >
                                            Limpiar selección
                                        </button>
                                    )}
                                </div>

                                {/* Options List */}
                                <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                                    {filteredSectorOptions.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-gray-400">
                                            No se encontraron sectores
                                        </div>
                                    ) : (
                                        filteredSectorOptions.map(s => {
                                            const isSelected = filters.sectors.includes(s.value);
                                            return (
                                                <button
                                                    key={s.value}
                                                    type="button"
                                                    onClick={() => toggleSector(s.value)}
                                                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors ${isSelected ? 'bg-sanatorio-primary/5 font-bold text-sanatorio-primary' : 'text-gray-700'
                                                        }`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected
                                                        ? 'bg-sanatorio-primary border-sanatorio-primary'
                                                        : 'border-gray-300 bg-white'
                                                        }`}>
                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <span className="truncate">{s.label}</span>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ══════════ DATE RANGE: FROM ══════════ */}
                    <div className="relative min-w-[150px]">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="date"
                            id="filter-date-from"
                            value={filters.dateFrom}
                            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                            min={dateRange.min}
                            max={filters.dateTo || dateRange.max}
                            className={`w-full bg-gray-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-gray-700 cursor-pointer hover:border-sanatorio-primary/40 focus:outline-none focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary/50 transition-all ${filters.dateFrom ? 'border-purple-300 bg-purple-50/50' : 'border-gray-200'
                                }`}
                            title="Fecha desde"
                        />
                        {!filters.dateFrom && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
                                Desde
                            </span>
                        )}
                    </div>

                    {/* ══════════ DATE RANGE: TO ══════════ */}
                    <div className="relative min-w-[150px]">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="date"
                            id="filter-date-to"
                            value={filters.dateTo}
                            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                            min={filters.dateFrom || dateRange.min}
                            max={dateRange.max}
                            className={`w-full bg-gray-50 border rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium text-gray-700 cursor-pointer hover:border-sanatorio-primary/40 focus:outline-none focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary/50 transition-all ${filters.dateTo ? 'border-purple-300 bg-purple-50/50' : 'border-gray-200'
                                }`}
                            title="Fecha hasta"
                        />
                        {!filters.dateTo && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
                                Hasta
                            </span>
                        )}
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all cursor-pointer group"
                            title="Limpiar todos los filtros"
                        >
                            <X className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-200" />
                            Limpiar
                        </button>
                    )}
                </div>

                {/* Active filters indicator */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1 flex-wrap">
                            {filters.sectors.length > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-sanatorio-primary/10 text-sanatorio-primary rounded-lg text-[10px] font-bold">
                                    <Building2 className="w-3 h-3" />
                                    {filters.sectors.length === 1
                                        ? (SECTOR_OPTIONS.find(s => s.value === filters.sectors[0])?.label || filters.sectors[0])
                                        : `${filters.sectors.length} sectores`
                                    }
                                </span>
                            )}
                            {(filters.dateFrom || filters.dateTo) && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-bold">
                                    <CalendarDays className="w-3 h-3" />
                                    {filters.dateFrom && filters.dateTo
                                        ? `${filters.dateFrom} → ${filters.dateTo}`
                                        : filters.dateFrom
                                            ? `Desde ${filters.dateFrom}`
                                            : `Hasta ${filters.dateTo}`
                                    }
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
