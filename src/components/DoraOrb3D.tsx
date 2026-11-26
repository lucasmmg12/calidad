import { useEffect, useRef } from 'react';

export interface DoraOrb3DProps {
    /** Canvas diameter in pixels (default 120) */
    size?: number;
    /** Visual state of the AI orb */
    mode?: 'clinical' | 'processing' | 'gold';
    /** Allow dragging/hovering to tilt the 3D sphere */
    interactive?: boolean;
    /** Optional dark background pill wrapper */
    withBackdrop?: boolean;
    className?: string;
}

/**
 * Orbe Volumétrico 3D "Dora IA" (Opción C)
 * Esfera geodésica 3D deformada por ondas sinusoidales en tiempo real con
 * iluminación especular, profundidad Z y anillos orbitales (inspirado en
 * Figma Shaders: Moving blobs + Glowing wave + Water caustic).
 */
export const DoraOrb3D = ({
    size = 120,
    mode = 'clinical',
    interactive = true,
    withBackdrop = true,
    className = '',
}: DoraOrb3DProps) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const modeRef = useRef(mode);
    modeRef.current = mode;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        let animId = 0;
        let rotY = 0.4;
        let rotX = 0.32;
        let mouseX = 0;
        let mouseY = 0;
        let dragging = false;
        let lastX = 0;
        let lastY = 0;

        const onPointerDown = (e: PointerEvent) => {
            if (!interactive) return;
            dragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!interactive) return;
            const rect = canvas.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
                mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
            }
            if (dragging) {
                rotY += (e.clientX - lastX) * 0.015;
                rotX = Math.max(-1.2, Math.min(1.2, rotX + (e.clientY - lastY) * 0.015));
                lastX = e.clientX;
                lastY = e.clientY;
            }
        };

        const onPointerUp = () => {
            dragging = false;
        };

        const onPointerLeave = () => {
            dragging = false;
            mouseX = 0;
            mouseY = 0;
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointerleave', onPointerLeave);

        const rings = size >= 110 ? 11 : 8;
        const segs = size >= 110 ? 20 : 14;
        const baseR = size * 0.31;
        const fov = size * 2.4;

        const project = (x: number, y: number, z: number, rx: number, ry: number, cx: number, cy: number) => {
            const x1 = x * Math.cos(ry) + z * Math.sin(ry);
            const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
            const y2 = y * Math.cos(rx) - z1 * Math.sin(rx);
            const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
            const scale = fov / Math.max(30, fov - z2);
            return { sx: cx + x1 * scale, sy: cy + y2 * scale, z: z2, scale };
        };

        const drawSphereNode = (
            sx: number,
            sy: number,
            radius: number,
            r: number,
            g: number,
            b: number,
            alpha: number
        ) => {
            if (radius <= 0.35) return;
            const grad = ctx.createRadialGradient(
                sx - radius * 0.32,
                sy - radius * 0.32,
                radius * 0.08,
                sx,
                sy,
                radius
            );
            grad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, 0.96 * alpha)})`);
            grad.addColorStop(
                0.35,
                `rgba(${Math.min(255, r + 55)}, ${Math.min(255, g + 55)}, ${Math.min(255, b + 55)}, ${0.92 * alpha})`
            );
            grad.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, ${0.86 * alpha})`);
            grad.addColorStop(
                1,
                `rgba(${Math.round(r * 0.35)}, ${Math.round(g * 0.35)}, ${Math.round(b * 0.35)}, ${0.55 * alpha})`
            );
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, radius, 0, Math.PI * 2);
            ctx.fill();
        };

        const render = (t: number) => {
            const currentMode = modeRef.current;
            const speedMult = currentMode === 'processing' ? 2.2 : 1.0;
            const time = t * 0.001 * speedMult;

            ctx.clearRect(0, 0, size, size);
            const cx = size / 2;
            const cy = size / 2;

            if (!dragging) {
                rotY += 0.009 * speedMult;
            }
            const effRotY = rotY + mouseX * 0.35;
            const effRotX = rotX + mouseY * 0.25;

            // 1. Volumetric Core Halo
            const haloGrad = ctx.createRadialGradient(cx, cy, size * 0.03, cx, cy, size * 0.46);
            if (currentMode === 'gold') {
                haloGrad.addColorStop(0, 'rgba(251, 191, 36, 0.58)');
                haloGrad.addColorStop(0.48, 'rgba(217, 119, 6, 0.22)');
                haloGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
            } else if (currentMode === 'processing') {
                haloGrad.addColorStop(0, 'rgba(0, 209, 255, 0.68)');
                haloGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.28)');
                haloGrad.addColorStop(1, 'rgba(0, 84, 139, 0)');
            } else {
                haloGrad.addColorStop(0, 'rgba(0, 209, 255, 0.56)');
                haloGrad.addColorStop(0.48, 'rgba(0, 169, 157, 0.24)');
                haloGrad.addColorStop(1, 'rgba(0, 84, 139, 0)');
            }
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
            ctx.fill();

            // 2. Orbital Energy Ribbon Ring
            ctx.beginPath();
            const orbitR = baseR * 1.34;
            for (let k = 0; k <= 40; k++) {
                const a = (k / 40) * Math.PI * 2 + time * 0.8;
                const ox = Math.cos(a) * orbitR;
                const oy = Math.sin(a * 2 + time) * (size * 0.04);
                const oz = Math.sin(a) * orbitR;
                const pr = project(ox, oy, oz, effRotX + 0.4, effRotY * 0.6, cx, cy);
                if (k === 0) ctx.moveTo(pr.sx, pr.sy);
                else ctx.lineTo(pr.sx, pr.sy);
            }
            ctx.strokeStyle =
                currentMode === 'gold'
                    ? 'rgba(253, 224, 71, 0.35)'
                    : 'rgba(56, 189, 248, 0.28)';
            ctx.lineWidth = Math.max(1, size * 0.012);
            ctx.stroke();

            // 3. Geodesic Wave-Deformed 3D Nodes
            const nodes: Array<{
                sx: number;
                sy: number;
                z: number;
                scale: number;
                alt: boolean;
            }> = [];

            const waveAmp = size * (currentMode === 'processing' ? 0.042 : 0.026);
            for (let i = 0; i <= rings; i++) {
                const lat = (i / rings) * Math.PI;
                for (let j = 0; j < segs; j++) {
                    const lon = (j / segs) * Math.PI * 2;
                    const wave =
                        Math.sin(lat * 4 + time * 3.1) * waveAmp +
                        Math.cos(lon * 3 - time * 2.4) * (waveAmp * 0.85);
                    const r = baseR + wave;
                    const x = r * Math.sin(lat) * Math.cos(lon);
                    const y = r * Math.cos(lat);
                    const z = r * Math.sin(lat) * Math.sin(lon);
                    const pr = project(x, y, z, effRotX, effRotY, cx, cy);
                    nodes.push({ ...pr, alt: (i + j) % 2 === 0 });
                }
            }

            nodes.sort((a, b) => a.z - b.z);
            const nodeBaseRadius = Math.max(1.4, size * 0.017);

            nodes.forEach((n) => {
                const depthNorm = (n.z + baseR * 1.3) / (baseR * 2.6);
                const alpha = Math.max(0.16, Math.min(0.98, depthNorm));
                if (currentMode === 'gold') {
                    const c = n.alt ? [251, 191, 36] : [245, 158, 11];
                    drawSphereNode(n.sx, n.sy, nodeBaseRadius * n.scale, c[0], c[1], c[2], alpha);
                } else if (currentMode === 'processing') {
                    const c = n.alt ? [0, 209, 255] : [167, 139, 250];
                    drawSphereNode(n.sx, n.sy, nodeBaseRadius * n.scale, c[0], c[1], c[2], alpha);
                } else {
                    const c = n.alt ? [0, 210, 200] : [56, 189, 248];
                    drawSphereNode(n.sx, n.sy, nodeBaseRadius * n.scale, c[0], c[1], c[2], alpha);
                }
            });

            animId = requestAnimationFrame(render);
        };

        animId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animId);
            canvas.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointerleave', onPointerLeave);
        };
    }, [size, interactive]);

    return (
        <div
            className={`relative inline-flex items-center justify-center shrink-0 select-none ${
                withBackdrop
                    ? 'rounded-2xl bg-gradient-to-br from-[#06152d] via-[#0a2346] to-[#041022] border border-sky-400/25 shadow-lg shadow-sky-950/20'
                    : ''
            } ${className}`}
            style={{ width: size, height: size }}
            title="Núcleo 3D Dora IA · Arrastrá o mové el cursor para rotar"
        >
            <canvas
                ref={canvasRef}
                style={{ width: size, height: size }}
                className={interactive ? 'cursor-grab active:cursor-grabbing' : ''}
            />
        </div>
    );
};
