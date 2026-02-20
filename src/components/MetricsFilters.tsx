import { useMemo } from 'react';
import { Filter, X, CalendarDays, Building2 } from 'lucide-react';
import { SECTOR_OPTIONS } from '../constants/sectors';

// ─── Types ───
export interface MetricsFilterState {
    sector: string;   // '' = all
    month: number;    // 0 = all, 1-12
    year: number;     // 0 = all
}

interface MetricsFiltersProps {
    filters: MetricsFilterState;
    onChange: (filters: MetricsFilterState) => void;
    /** The sectors the current user is allowed to see. Empty = all sectors (admin/directivo). */
    allowedSectors: string[];
    /** Whether the user can see all sectors (admin/directivo). */
    canViewAll: boolean;
    /** All raw report dates for computing available years. */
    reportDates: string[];
}

const MONTHS = [
    { value: 0, label: 'Todos los meses' },
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
];

export const MetricsFilters = ({ filters, onChange, allowedSectors, canViewAll, reportDates }: MetricsFiltersProps) => {

    // Compute available years from report data
    const availableYears = useMemo(() => {
        const yearsSet = new Set<number>();
        reportDates.forEach(d => {
            const y = new Date(d).getFullYear();
            if (!isNaN(y)) yearsSet.add(y);
        });
        // Always include the current year
        yearsSet.add(new Date().getFullYear());
        return Array.from(yearsSet).sort((a, b) => b - a);
    }, [reportDates]);

    // Compute available sector options based on permissions
    const sectorOptions = useMemo(() => {
        if (canViewAll) {
            return SECTOR_OPTIONS;
        }
        return SECTOR_OPTIONS.filter(s => allowedSectors.includes(s.value));
    }, [allowedSectors, canViewAll]);

    const hasActiveFilters = filters.sector !== '' || filters.month !== 0 || filters.year !== 0;

    const clearFilters = () => {
        onChange({ sector: '', month: 0, year: 0 });
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-in fade-in duration-300">
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

                    {/* Sector Filter */}
                    <div className="relative flex-1 min-w-[180px]">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select
                            id="filter-sector"
                            value={filters.sector}
                            onChange={(e) => onChange({ ...filters, sector: e.target.value })}
                            className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-medium text-gray-700 cursor-pointer hover:border-sanatorio-primary/40 focus:outline-none focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary/50 transition-all"
                        >
                            <option value="">
                                {canViewAll ? 'Todos los sectores' : 'Mis sectores'}
                            </option>
                            {sectorOptions.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>

                    {/* Month Filter */}
                    <div className="relative min-w-[160px]">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select
                            id="filter-month"
                            value={filters.month}
                            onChange={(e) => onChange({ ...filters, month: Number(e.target.value) })}
                            className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-medium text-gray-700 cursor-pointer hover:border-sanatorio-primary/40 focus:outline-none focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary/50 transition-all"
                        >
                            {MONTHS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>

                    {/* Year Filter */}
                    <div className="relative min-w-[130px]">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <select
                            id="filter-year"
                            value={filters.year}
                            onChange={(e) => onChange({ ...filters, year: Number(e.target.value) })}
                            className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-medium text-gray-700 cursor-pointer hover:border-sanatorio-primary/40 focus:outline-none focus:ring-2 focus:ring-sanatorio-primary/20 focus:border-sanatorio-primary/50 transition-all"
                        >
                            <option value={0}>Todos los años</option>
                            {availableYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
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
                            {filters.sector && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-sanatorio-primary/10 text-sanatorio-primary rounded-lg text-[10px] font-bold">
                                    <Building2 className="w-3 h-3" />
                                    {SECTOR_OPTIONS.find(s => s.value === filters.sector)?.label || filters.sector}
                                </span>
                            )}
                            {filters.month !== 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-bold">
                                    <CalendarDays className="w-3 h-3" />
                                    {MONTHS.find(m => m.value === filters.month)?.label}
                                </span>
                            )}
                            {filters.year !== 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold">
                                    <CalendarDays className="w-3 h-3" />
                                    {filters.year}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
