import { useEffect, useMemo, useRef, useState } from 'react';
import { Layers, BarChart3, RotateCw, Maximize2 } from 'lucide-react';

interface TemporalEvolution3DProps {
    reports: any[];
}

interface SeriesConfig {
    id: string;
    name: string;
    color: string;
    fillTop: string;
    fillBot: string;
    rgb: [number, number, number];
    data: number[];
}

/**
 * Evolución Temporal 3D a Ancho Completo (Full-Bleed 3D Multi-Lane & 3D Columns)
 * - Ocupa el 100% del ancho útil del contenedor sin márgenes muertos.
 * - Separa cada serie en su propio carril Z con colores clínicos de alto contraste
 *   para que nunca se empasten ni se confundan las curvas.
 * - Incluye plano de corte interactivo al pasar el mouse, giro 360° y zoom.
 */
export const TemporalEvolution3D = ({ reports }: TemporalEvolution3DProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [chartMode, setChartMode] = useState<'ribbons' | 'bars'>('ribbons');
    const [granularity, setGranularity] = useState<'auto' | 'day' | 'month'>('auto');
    const [visibleIds, setVisibleIds] = useState<Record<string, boolean>>({
        total: true,
        resolved: true,
        medium: true,
        critical: true,
        felic: true,
    });
    const [autoSpin, setAutoSpin] = useState(false);
    const [hoverIdx, setHoverIdx] = useState<number>(0);

    // Camera state refs for 60fps animation without React re-renders
    const camRef = useRef({
        rotX: -0.38,
        rotY: 0.26,
        targetRotX: -0.38,
        targetRotY: 0.26,
        zoom: 1.0,
        targetZoom: 1.0,
    });
    const autoSpinRef = useRef(autoSpin);
    autoSpinRef.current = autoSpin;
    const modeRef = useRef(chartMode);
    modeRef.current = chartMode;
    const hoverIdxRef = useRef(hoverIdx);
    hoverIdxRef.current = hoverIdx;

    // Build time buckets from real reports
    const { labels, seriesList } = useMemo(() => {
        if (!reports || reports.length === 0) {
            return { labels: ['Sin datos'], seriesList: [] as SeriesConfig[] };
        }

        const valid = reports.filter(r => r.created_at && !isNaN(new Date(r.created_at).getTime()));
        if (valid.length === 0) {
            return { labels: ['Sin datos'], seriesList: [] as SeriesConfig[] };
        }

        const sorted = [...valid].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const first = new Date(sorted[0].created_at);
        const last = new Date(sorted[sorted.length - 1].created_at);
        const spanDays = (last.getTime() - first.getTime()) / (1000 * 3600 * 24);

        const useDay = granularity === 'day' || (granularity === 'auto' && spanDays <= 60);

        const buckets = new Map<
            string,
            {
                label: string;
                total: number;
                resolved: number;
                medium: number;
                critical: number;
                felic: number;
            }
        >();

        sorted.forEach(r => {
            const d = new Date(r.created_at);
            let key = '';
            let label = '';
            if (useDay) {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
            } else {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }).toUpperCase();
            }

            const curr = buckets.get(key) || {
                label,
                total: 0,
                resolved: 0,
                medium: 0,
                critical: 0,
                felic: 0,
            };

            const isFelic =
                r.finding_type?.startsWith('Felicitaci') || r.ai_category?.startsWith('Felicitaci');

            curr.total += 1;
            if (r.status === 'resolved') curr.resolved += 1;
            if (r.ai_urgency === 'Amarillo') curr.medium += 1;
            if (r.ai_urgency === 'Rojo') curr.critical += 1;
            if (isFelic) curr.felic += 1;

            buckets.set(key, curr);
        });

        // Keep up to the most recent 24 buckets so labels remain crisp and readable
        const entries = Array.from(buckets.values()).slice(-24);
        const lbls = entries.map(e => e.label);

        const builtSeries: SeriesConfig[] = [
            {
                id: 'total',
                name: 'Total Ingresados',
                color: '#00D1FF',
                fillTop: 'rgba(0, 209, 255, 0.52)',
                fillBot: 'rgba(0, 84, 139, 0.10)',
                rgb: [0, 209, 255],
                data: entries.map(e => e.total),
            },
            {
                id: 'resolved',
                name: 'Casos Resueltos',
                color: '#10B981',
                fillTop: 'rgba(16, 185, 129, 0.56)',
                fillBot: 'rgba(6, 95, 70, 0.10)',
                rgb: [16, 185, 129],
                data: entries.map(e => e.resolved),
            },
            {
                id: 'medium',
                name: 'Moderados (Amarillo)',
                color: '#F59E0B',
                fillTop: 'rgba(245, 158, 11, 0.56)',
                fillBot: 'rgba(146, 64, 14, 0.10)',
                rgb: [245, 158, 11],
                data: entries.map(e => e.medium),
            },
            {
                id: 'critical',
                name: 'Críticos (Rojo)',
                color: '#F43F5E',
                fillTop: 'rgba(244, 63, 94, 0.64)',
                fillBot: 'rgba(136, 19, 55, 0.12)',
                rgb: [244, 63, 94],
                data: entries.map(e => e.critical),
            },
            {
                id: 'felic',
                name: 'Felicitaciones ★',
                color: '#A855F7',
                fillTop: 'rgba(168, 85, 247, 0.58)',
                fillBot: 'rgba(88, 28, 135, 0.10)',
                rgb: [168, 85, 247],
                data: entries.map(e => e.felic),
            },
        ];

        return { labels: lbls, seriesList: builtSeries };
    }, [reports, granularity]);

    useEffect(() => {
        if (labels.length > 0) {
            setHoverIdx(labels.length - 1);
        }
    }, [labels.length]);

    const activeSeries = useMemo(
        () => seriesList.filter(s => visibleIds[s.id]),
        [seriesList, visibleIds]
    );

    const setCameraPreset = (rx: number, ry: number, zoom = 1.0) => {
        setAutoSpin(false);
        camRef.current.targetRotX = rx;
        camRef.current.targetRotY = ry;
        camRef.current.targetZoom = zoom;
    };

    const toggleSeries = (id: string) => {
        setVisibleIds(prev => {
            const next = { ...prev, [id]: !prev[id] };
            if (!Object.values(next).some(Boolean)) {
                return prev;
            }
            return next;
        });
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let W = 1000;
        let H = 400;
        let animId = 0;
        let dragging = false;
        let lastX = 0;
        let lastY = 0;

        const updateSize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            W = rect.width || 1000;
            H = rect.height || 400;
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        updateSize();
        window.addEventListener('resize', updateSize);

        const onPointerDown = (e: PointerEvent) => {
            dragging = true;
            setAutoSpin(false);
            lastX = e.clientX;
            lastY = e.clientY;
        };

        const onPointerMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / (rect.width || 1);
            if (!dragging && labels.length > 1 && relX >= 0.06 && relX <= 0.94) {
                const idx = Math.min(
                    labels.length - 1,
                    Math.max(0, Math.round(((relX - 0.08) / 0.84) * (labels.length - 1)))
                );
                if (idx !== hoverIdxRef.current) {
                    hoverIdxRef.current = idx;
                    setHoverIdx(idx);
                }
            }
            if (dragging) {
                camRef.current.targetRotY += (e.clientX - lastX) * 0.008;
                camRef.current.targetRotX = Math.max(
                    -1.2,
                    Math.min(-0.08, camRef.current.targetRotX + (e.clientY - lastY) * 0.008)
                );
                lastX = e.clientX;
                lastY = e.clientY;
            }
        };

        const onPointerUp = () => {
            dragging = false;
        };

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            camRef.current.targetZoom = Math.max(
                0.72,
                Math.min(1.45, camRef.current.targetZoom - e.deltaY * 0.0008)
            );
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });

        const interpolateSmooth = (arr: number[], steps = 4) => {
            if (arr.length <= 1) return [{ tIndex: 0, val: arr[0] || 0 }];
            const out: Array<{ tIndex: number; val: number }> = [];
            for (let i = 0; i < arr.length - 1; i++) {
                const p0 = arr[Math.max(0, i - 1)];
                const p1 = arr[i];
                const p2 = arr[i + 1];
                const p3 = arr[Math.min(arr.length - 1, i + 2)];
                for (let s = 0; s < steps; s++) {
                    const t = s / steps;
                    const t2 = t * t;
                    const t3 = t2 * t;
                    const val =
                        0.5 *
                        (2 * p1 +
                            (-p0 + p2) * t +
                            (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                            (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
                    out.push({ tIndex: i + t, val: Math.max(0, val) });
                }
            }
            out.push({ tIndex: arr.length - 1, val: arr[arr.length - 1] });
            return out;
        };

        const project3D = (x: number, y: number, z: number) => {
            const { rotX, rotY, zoom } = camRef.current;
            const cosY = Math.cos(rotY);
            const sinY = Math.sin(rotY);
            const cosX = Math.cos(rotX);
            const sinX = Math.sin(rotX);
            const x1 = x * cosY + z * sinY;
            const z1 = -x * sinY + z * cosY;
            const y2 = y * cosX - z1 * sinX;
            const z2 = y * sinX + z1 * cosX;
            const fov = 1050;
            const scale = (fov / Math.max(140, fov - z2)) * zoom;
            return {
                sx: W * 0.51 + x1 * scale,
                sy: H * 0.69 + y2 * scale,
                z: z2,
                scale,
            };
        };

        const render = () => {
            const cam = camRef.current;
            cam.rotX += (cam.targetRotX - cam.rotX) * 0.14;
            cam.rotY += (cam.targetRotY - cam.rotY) * 0.14;
            cam.zoom += (cam.targetZoom - cam.zoom) * 0.14;
            if (autoSpinRef.current) {
                cam.targetRotY += 0.005;
            }

            ctx.clearRect(0, 0, W, H);

            if (activeSeries.length === 0 || labels.length === 0) {
                animId = requestAnimationFrame(render);
                return;
            }

            const maxVal = Math.max(5, ...activeSeries.flatMap(s => s.data));
            const denom = Math.max(1, labels.length - 1);

            // Full-bleed stage width (uses 78% of horizontal width so there are no empty side margins)
            const spanX = W * 0.76;
            const halfX = spanX / 2;
            const maxH = H * 0.45;
            const laneSpacing = Math.min(48, (H * 0.46) / Math.max(1, activeSeries.length));
            const totalZ = (activeSeries.length - 1) * laneSpacing;
            const halfZ = totalZ / 2;

            // 1. Floor Platform
            const floor = [
                project3D(-halfX, 0, -halfZ - 24),
                project3D(halfX, 0, -halfZ - 24),
                project3D(halfX, 0, halfZ + 24),
                project3D(-halfX, 0, halfZ + 24),
            ];
            ctx.fillStyle = 'rgba(15, 35, 66, 0.58)';
            ctx.beginPath();
            ctx.moveTo(floor[0].sx, floor[0].sy);
            floor.forEach(p => ctx.lineTo(p.sx, p.sy));
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.24)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 2. Back Elevation Grid & Y-axis Values
            [0, 0.25, 0.5, 0.75, 1].forEach(frac => {
                const y = -frac * maxH;
                const pL = project3D(-halfX, y, -halfZ - 24);
                const pR = project3D(halfX, y, -halfZ - 24);
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
                ctx.beginPath();
                ctx.moveTo(pL.sx, pL.sy);
                ctx.lineTo(pR.sx, pR.sy);
                ctx.stroke();

                ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'right';
                ctx.fillText(String(Math.round(frac * maxVal)), pL.sx - 8, pL.sy + 3);
            });

            // 3. Floor X-axis Date Guides
            const stepLabel = labels.length > 14 ? 2 : 1;
            labels.forEach((lbl, idx) => {
                const x = -halfX + (idx / denom) * spanX;
                const pBack = project3D(x, 0, -halfZ - 24);
                const pFront = project3D(x, 0, halfZ + 24);
                const isHov = idx === hoverIdxRef.current;

                ctx.strokeStyle = isHov ? 'rgba(0, 209, 255, 0.65)' : 'rgba(148, 163, 184, 0.12)';
                ctx.lineWidth = isHov ? 2 : 1;
                ctx.beginPath();
                ctx.moveTo(pBack.sx, pBack.sy);
                ctx.lineTo(pFront.sx, pFront.sy);
                ctx.stroke();

                if (isHov || idx % stepLabel === 0 || idx === labels.length - 1) {
                    ctx.fillStyle = isHov ? '#00D1FF' : 'rgba(203, 213, 225, 0.82)';
                    ctx.font = isHov ? 'bold 11px monospace' : '10px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(lbl, pFront.sx, pFront.sy + 15);
                }
            });

            // 4. Depth-sort 3D Lanes
            const lanes = activeSeries
                .map((s, idx) => {
                    const z = -halfZ + idx * laneSpacing;
                    return { series: s, z, depth: project3D(0, 0, z).z };
                })
                .sort((a, b) => a.depth - b.depth);

            lanes.forEach(({ series, z }) => {
                const [r, g, b] = series.rgb;

                // Lane Title on Left
                const laneTag = project3D(-halfX - 14, -8, z);
                ctx.fillStyle = series.color;
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(series.name, laneTag.sx, laneTag.sy);

                if (modeRef.current === 'ribbons') {
                    const smooth = interpolateSmooth(series.data, 4);
                    const topPts = smooth.map(pt =>
                        project3D(-halfX + (pt.tIndex / denom) * spanX, -(pt.val / maxVal) * maxH, z)
                    );
                    const basePts = smooth.map(pt =>
                        project3D(-halfX + (pt.tIndex / denom) * spanX, 0, z)
                    );

                    // Vertical energy ribs
                    for (let k = 0; k < topPts.length; k += 2) {
                        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.22)`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(basePts[k].sx, basePts[k].sy);
                        ctx.lineTo(topPts[k].sx, topPts[k].sy);
                        ctx.stroke();
                    }

                    // Translucent Ribbon Wall
                    const grad = ctx.createLinearGradient(0, H * 0.18, 0, H * 0.75);
                    grad.addColorStop(0, series.fillTop);
                    grad.addColorStop(1, series.fillBot);
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.moveTo(basePts[0].sx, basePts[0].sy);
                    topPts.forEach(p => ctx.lineTo(p.sx, p.sy));
                    for (let k = basePts.length - 1; k >= 0; k--) {
                        ctx.lineTo(basePts[k].sx, basePts[k].sy);
                    }
                    ctx.closePath();
                    ctx.fill();

                    // High-contrast top crest line
                    ctx.strokeStyle = series.color;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    topPts.forEach((p, i) => {
                        if (i === 0) ctx.moveTo(p.sx, p.sy);
                        else ctx.lineTo(p.sx, p.sy);
                    });
                    ctx.stroke();

                    // Data points & hovered value pill
                    series.data.forEach((val, dIdx) => {
                        const x = -halfX + (dIdx / denom) * spanX;
                        const y = -(val / maxVal) * maxH;
                        const pr = project3D(x, y, z);
                        const isHov = dIdx === hoverIdxRef.current;

                        ctx.fillStyle = isHov ? '#FFFFFF' : series.color;
                        ctx.beginPath();
                        ctx.arc(pr.sx, pr.sy, isHov ? 5.5 : 3.2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = '#071324';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();

                        if (isHov) {
                            const txt = String(val);
                            ctx.font = 'bold 11px monospace';
                            const tw = ctx.measureText(txt).width + 12;
                            ctx.fillStyle = series.color;
                            ctx.beginPath();
                            ctx.roundRect(pr.sx - tw / 2, pr.sy - 24, tw, 17, 5);
                            ctx.fill();
                            ctx.fillStyle = '#04101f';
                            ctx.textAlign = 'center';
                            ctx.fillText(txt, pr.sx, pr.sy - 12);
                        }
                    });
                } else {
                    // 3D EXTRUDED COLUMNS MODE
                    const bw = Math.min(18, (spanX / Math.max(4, labels.length)) * 0.28);
                    const bz = Math.min(10, laneSpacing * 0.32);
                    series.data.forEach((val, dIdx) => {
                        const x = -halfX + (dIdx / denom) * spanX;
                        const h = Math.max(3, (val / maxVal) * maxH);
                        const isHov = dIdx === hoverIdxRef.current;

                        const c = [
                            project3D(x - bw, -h, z - bz),
                            project3D(x + bw, -h, z - bz),
                            project3D(x + bw, 0, z - bz),
                            project3D(x - bw, 0, z - bz),
                            project3D(x - bw, -h, z + bz),
                            project3D(x + bw, -h, z + bz),
                            project3D(x + bw, 0, z + bz),
                            project3D(x - bw, 0, z + bz),
                        ];

                        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${isHov ? 0.96 : 0.8})`;
                        ctx.beginPath();
                        ctx.moveTo(c[4].sx, c[4].sy);
                        ctx.lineTo(c[5].sx, c[5].sy);
                        ctx.lineTo(c[6].sx, c[6].sy);
                        ctx.lineTo(c[7].sx, c[7].sy);
                        ctx.closePath();
                        ctx.fill();
                        ctx.strokeStyle = 'rgba(255,255,255,0.32)';
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        ctx.fillStyle = `rgba(${Math.round(r * 0.7)}, ${Math.round(g * 0.7)}, ${Math.round(b * 0.7)}, 0.84)`;
                        ctx.beginPath();
                        ctx.moveTo(c[5].sx, c[5].sy);
                        ctx.lineTo(c[1].sx, c[1].sy);
                        ctx.lineTo(c[2].sx, c[2].sy);
                        ctx.lineTo(c[6].sx, c[6].sy);
                        ctx.closePath();
                        ctx.fill();

                        ctx.fillStyle = isHov
                            ? '#FFFFFF'
                            : `rgb(${Math.min(255, r + 45)}, ${Math.min(255, g + 45)}, ${Math.min(255, b + 45)})`;
                        ctx.beginPath();
                        ctx.moveTo(c[0].sx, c[0].sy);
                        ctx.lineTo(c[1].sx, c[1].sy);
                        ctx.lineTo(c[5].sx, c[5].sy);
                        ctx.lineTo(c[4].sx, c[4].sy);
                        ctx.closePath();
                        ctx.fill();
                    });
                }
            });

            animId = requestAnimationFrame(render);
        };

        animId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', updateSize);
            canvas.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('wheel', onWheel);
        };
    }, [activeSeries, labels]);

    return (
        <div className="space-y-3">
            {/* Top Controls: Series Toggles + 3D Mode + Camera Presets */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                {/* High-Contrast Series Toggles */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                        Carriles 3D:
                    </span>
                    {seriesList.map(s => {
                        const isVis = !!visibleIds[s.id];
                        const totalSum = s.data.reduce((a, b) => a + b, 0);
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleSeries(s.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                    isVis
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'bg-slate-50 text-slate-400 opacity-55 hover:opacity-80'
                                }`}
                                style={{ borderColor: s.color }}
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                    style={{ backgroundColor: s.color }}
                                />
                                <span>{s.name}</span>
                                <span className="font-mono text-[11px] opacity-80">({totalSum})</span>
                            </button>
                        );
                    })}
                </div>

                {/* 3D Mode, Granularity & Camera Angles */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => setChartMode('ribbons')}
                            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                                chartMode === 'ribbons'
                                    ? 'bg-sanatorio-primary text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            3D Carriles
                        </button>
                        <button
                            type="button"
                            onClick={() => setChartMode('bars')}
                            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                                chartMode === 'bars'
                                    ? 'bg-sanatorio-primary text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            3D Columnas
                        </button>
                    </div>

                    <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                        {(['auto', 'day', 'month'] as const).map(g => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setGranularity(g)}
                                className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                                    granularity === g
                                        ? 'bg-white text-sanatorio-primary shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                {g === 'auto' ? 'Auto' : g === 'day' ? 'Día' : 'Mes'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setCameraPreset(-0.38, 0.26, 1.0)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                            Isométrica
                        </button>
                        <button
                            type="button"
                            onClick={() => setCameraPreset(-0.22, 0.0, 1.06)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                            Frontal
                        </button>
                        <button
                            type="button"
                            onClick={() => setCameraPreset(-0.54, 0.68, 0.96)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                            Diagonal
                        </button>
                        <button
                            type="button"
                            onClick={() => setCameraPreset(-1.05, 0.0, 0.94)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        >
                            Cenital
                        </button>
                        <button
                            type="button"
                            onClick={() => setAutoSpin(s => !s)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                autoSpin
                                    ? 'bg-sanatorio-primary text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                        >
                            <RotateCw className={`w-3.5 h-3.5 ${autoSpin ? 'animate-spin' : ''}`} />
                            Giro
                        </button>
                    </div>
                </div>
            </div>

            {/* Full-Width 3D Viewport */}
            <div
                className="relative w-full rounded-2xl border border-slate-800 overflow-hidden shadow-lg"
                style={{
                    height: '410px',
                    background: 'linear-gradient(180deg, #071324 0%, #0b1e36 55%, #071526 100%)',
                }}
            >
                {/* Top Live Inspection Bar */}
                <div className="absolute top-3 left-4 right-4 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-900/85 border border-slate-700/80 backdrop-blur-md text-xs text-white z-10 pointer-events-none">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono font-bold">
                            Período: {labels[hoverIdx] || '-'}
                        </span>
                        <span className="text-slate-400 hidden sm:inline">
                            Deslizá el cursor para inspeccionar cada carril en este punto
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                        {activeSeries.map(s => (
                            <span key={s.id} className="flex items-center gap-1.5">
                                <span
                                    className="w-2.5 h-2.5 rounded-full inline-block"
                                    style={{ backgroundColor: s.color }}
                                />
                                <span className="text-slate-300">{s.name.split(' ')[0]}:</span>
                                <strong style={{ color: s.color }}>{s.data[hoverIdx] ?? 0}</strong>
                            </span>
                        ))}
                    </div>
                </div>

                <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-grab active:cursor-grabbing"
                />

                {/* Bottom Overlay Hint */}
                <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between text-[11px] text-slate-400 pointer-events-none">
                    <span className="flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                        Escenario 3D a ancho completo · Carriles separados con alto contraste cromático
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900/75 border border-slate-700/70 text-slate-300 font-medium">
                        Arrastrá para girar 360° · Rueda para zoom
                    </span>
                </div>
            </div>
        </div>
    );
};
