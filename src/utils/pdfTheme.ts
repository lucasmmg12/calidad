/**
 * Shared PDF Theme, Typography & Vector Graphics Engine
 * Sanatorio Argentino — Sistema de Gestión de Calidad (Estética Calidad-QOAG)
 *
 * Ensures crisp Latin-1 typography (no broken emojis or squished logos),
 * institutional color palette, and pure vector icons/ornaments for jsPDF.
 */
import jsPDF from 'jspdf';

export const PDF_COLORS = {
    primary: [0, 84, 139] as [number, number, number],        // #00548B Azul Institucional
    primaryDark: [0, 48, 82] as [number, number, number],     // #003052 Azul Profundo
    primaryLight: [239, 246, 255] as [number, number, number],// #EFF6FF
    secondary: [0, 169, 157] as [number, number, number],     // #00A99D Verde Clínico / Teal
    secondaryLight: [240, 253, 250] as [number, number, number],

    // Gold / Amber palette for Felicitaciones & Reconocimientos
    gold: [217, 119, 6] as [number, number, number],          // #D97706
    goldBright: [245, 158, 11] as [number, number, number],   // #F59E0B
    goldDark: [146, 64, 14] as [number, number, number],      // #92400E
    goldBg: [255, 251, 235] as [number, number, number],      // #FFFBEB
    goldBorder: [252, 211, 77] as [number, number, number],   // #FCD34D

    // Semantic statuses
    emerald: [21, 128, 61] as [number, number, number],       // #15803D
    emeraldBg: [240, 253, 244] as [number, number, number],   // #F0FDF4
    emeraldBorder: [187, 247, 208] as [number, number, number],

    amber: [180, 83, 9] as [number, number, number],          // #B45309
    amberBg: [254, 252, 232] as [number, number, number],     // #FEFCE8
    amberBorder: [253, 230, 138] as [number, number, number],

    red: [185, 28, 28] as [number, number, number],           // #B91C1C
    redBg: [254, 242, 242] as [number, number, number],       // #FEF2F2
    redBorder: [254, 202, 202] as [number, number, number],

    purple: [109, 40, 217] as [number, number, number],       // #6D28D9
    purpleBg: [245, 243, 255] as [number, number, number],    // #F5F3FF
    purpleBorder: [221, 214, 254] as [number, number, number],

    // Neutrals
    slate900: [15, 23, 42] as [number, number, number],       // #0F172A
    slate800: [30, 41, 59] as [number, number, number],       // #1E293B
    slate700: [51, 65, 85] as [number, number, number],       // #334155
    slate600: [71, 85, 105] as [number, number, number],      // #475569
    slate500: [100, 116, 139] as [number, number, number],    // #64748B
    slate400: [148, 163, 184] as [number, number, number],    // #94A3B8
    slate200: [226, 232, 240] as [number, number, number],    // #E2E8F0
    slate100: [241, 245, 249] as [number, number, number],    // #F1F5F9
    slate50: [248, 250, 252] as [number, number, number],     // #F8FAFC
    white: [255, 255, 255] as [number, number, number],
};

export interface LoadedImage {
    dataUrl: string;
    width: number;
    height: number;
    ratio: number; // width / height
}

/**
 * Loads an image and returns its Base64 PNG along with its natural aspect ratio
 * so logos are never stretched or squished.
 */
export const loadLogoImage = (url = '/logosanatorio.png'): Promise<LoadedImage | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const w = img.naturalWidth || img.width || 200;
                const h = img.naturalHeight || img.height || 80;
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                resolve({
                    dataUrl: canvas.toDataURL('image/png'),
                    width: w,
                    height: h,
                    ratio: w / h,
                });
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
};

/**
 * Draws the institutional logo inside a crisp white rounded badge,
 * preserving its exact aspect ratio.
 */
export const drawLogoBadge = (
    doc: jsPDF,
    logo: LoadedImage | null,
    x: number,
    y: number,
    boxW: number,
    boxH: number,
    radius = 3
) => {
    // Crisp white pill background
    doc.setFillColor(...PDF_COLORS.white);
    doc.roundedRect(x, y, boxW, boxH, radius, radius, 'F');

    if (logo && logo.dataUrl) {
        const pad = 2.2;
        const availW = boxW - pad * 2;
        const availH = boxH - pad * 2;
        let drawW = availW;
        let drawH = drawW / logo.ratio;
        if (drawH > availH) {
            drawH = availH;
            drawW = drawH * logo.ratio;
        }
        const imgX = x + (boxW - drawW) / 2;
        const imgY = y + (boxH - drawH) / 2;
        try {
            doc.addImage(logo.dataUrl, 'PNG', imgX, imgY, drawW, drawH);
            return;
        } catch {
            // fallback to monogram below
        }
    }

    // Fallback monogram if logo image is missing
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text('SA', x + boxW / 2, y + boxH / 2 + 1.5, { align: 'center' });
};

/**
 * Sanitizes text for jsPDF standard fonts (Helvetica / WinAnsiEncoding).
 * Strips or replaces emojis and unsupported Unicode glyphs that otherwise render
 * as garbled characters (e.g. "Ø=Ü¬" or "âœ“"), while preserving all Spanish accents.
 */
export const sanitizePdfText = (input?: string | null): string => {
    if (!input) return '';
    return String(input)
        // Replace common typographical Unicode with WinAnsi-safe equivalents
        .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/\u2026/g, '...')
        .replace(/[\u2022\u25CF\u25CB\u25AA\u25AB]/g, '-')
        .replace(/[\u2192\u2794\u27A1]/g, '->')
        .replace(/[\u2713\u2714\u2611]/g, '[OK]')
        .replace(/[\u2715\u2716\u2717\u2718\u274C]/g, '[X]')
        .replace(/[\u26A0\uFE0F]/g, '')
        // Strip surrogate pairs (all emojis like 🎉, 💬, 🧠, 👤, 📱, 🌟, ⭐, 📊, ✅, etc.)
        .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
        // Strip remaining miscellaneous symbols outside Latin-1 / Windows-1252
        .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
        // Clean up double spaces left by stripped emojis at start of lines
        .replace(/^[ \t]+/gm, (m) => m)
        .replace(/  +/g, ' ')
        .trim();
};

/**
 * Strips markdown syntax (**bold**, ### headers) for clean plain-text rendering in jsPDF.
 */
export const cleanMarkdownForPdf = (input?: string | null): string => {
    if (!input) return '';
    const cleaned = String(input)
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s*[-*•]\s+/gm, '• ');
    return sanitizePdfText(cleaned)
        // Restore bullet symbol • (0x95 in WinAnsi, or use standard middot · \xB7)
        .replace(/^- /gm, '\xB7 ');
};

/**
 * Draws a 5-pointed vector star centered at (cx, cy) with outer radius R and inner radius r.
 */
export const drawVectorStar = (
    doc: jsPDF,
    cx: number,
    cy: number,
    outerR: number,
    fillColor: [number, number, number] = PDF_COLORS.goldBright,
    strokeColor?: [number, number, number]
) => {
    const innerR = outerR * 0.42;
    const points: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outerR : innerR;
        const angle = ((i * 36 - 90) * Math.PI) / 180;
        points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }

    doc.setFillColor(...fillColor);
    if (strokeColor) {
        doc.setDrawColor(...strokeColor);
        doc.setLineWidth(0.25);
    }

    const lines: [number, number][] = [];
    for (let i = 1; i < points.length; i++) {
        lines.push([points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]]);
    }
    doc.lines(lines, points[0][0], points[0][1], [1, 1], strokeColor ? 'FD' : 'F', true);
};

/**
 * Draws a row of 5 golden stars (with the center star slightly larger) for Felicitaciones.
 */
export const drawFiveStarsRow = (doc: jsPDF, centerX: number, cy: number, spacing = 9) => {
    const sizes = [2.6, 3.1, 3.8, 3.1, 2.6];
    for (let i = -2; i <= 2; i++) {
        const r = sizes[i + 2];
        drawVectorStar(
            doc,
            centerX + i * spacing,
            cy,
            r,
            PDF_COLORS.goldBright,
            PDF_COLORS.gold
        );
    }
};

/**
 * Draws a prestigious vector Medal / Seal of Excellence at (cx, cy).
 */
export const drawExcellenceMedal = (
    doc: jsPDF,
    cx: number,
    cy: number,
    radius = 11
) => {
    // Bottom ribbons
    doc.setFillColor(...PDF_COLORS.primary);
    doc.lines(
        [
            [-4, 11],
            [3.2, -1.5],
            [1.8, 2.5],
            [3, -12],
        ],
        cx - 3,
        cy + radius * 0.6,
        [1, 1],
        'F',
        true
    );
    doc.setFillColor(...PDF_COLORS.secondary);
    doc.lines(
        [
            [4, 11],
            [-3.2, -1.5],
            [-1.8, 2.5],
            [-3, -12],
        ],
        cx + 3,
        cy + radius * 0.6,
        [1, 1],
        'F',
        true
    );

    // Outer gold scalloped/double ring
    doc.setFillColor(...PDF_COLORS.goldBright);
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(0.5);
    doc.circle(cx, cy, radius, 'FD');

    // Inner cream ring
    doc.setFillColor(...PDF_COLORS.goldBg);
    doc.setDrawColor(...PDF_COLORS.gold);
    doc.setLineWidth(0.3);
    doc.circle(cx, cy, radius * 0.82, 'FD');

    // Inner institutional blue core
    doc.setFillColor(...PDF_COLORS.primary);
    doc.circle(cx, cy, radius * 0.66, 'F');

    // Center gold star
    drawVectorStar(doc, cx, cy, radius * 0.44, PDF_COLORS.goldBright);
};

/**
 * Draws a standard institutional footer across all pages of a document.
 */
export const applyInstitutionalFooters = (
    doc: jsPDF,
    options?: {
        subtitle?: string;
        accentColor?: [number, number, number];
        margin?: number;
    }
) => {
    const totalPages = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = options?.margin ?? 16;
    const accent = options?.accentColor ?? PDF_COLORS.secondary;
    const subtitle = options?.subtitle ?? 'Sanatorio Argentino · Departamento de Gestión de Calidad y Seguridad del Paciente · Normas ITAES';

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Hairline accent bar
        doc.setDrawColor(...accent);
        doc.setLineWidth(0.45);
        doc.line(M, pageH - 13, pageW - M, pageH - 13);

        // Left institutional text
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...PDF_COLORS.slate500);
        doc.text(sanitizePdfText(subtitle), M, pageH - 8.2);

        // Right page pill
        const pageStr = `Página ${i} de ${totalPages}`;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...PDF_COLORS.primary);
        doc.text(pageStr, pageW - M, pageH - 8.2, { align: 'right' });
    }
};

