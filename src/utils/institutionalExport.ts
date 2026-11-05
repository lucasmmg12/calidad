/**
 * Institutional Excel (.xlsx) & PDF Export Engine
 * Sanatorio Argentino — Gestión de Calidad · Innovación y Transformación Digital
 *
 * Uses ExcelJS for rich styled spreadsheets (embedded logo, institutional colors,
 * semantic status/priority cells, KPI strip, and institutional footer) and jsPDF + autoTable
 * for matching Landscape A4 PDF reports.
 */
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    PDF_COLORS,
    loadLogoImage,
    drawLogoBadge,
    sanitizePdfText,
    applyInstitutionalFooters,
} from './pdfTheme';

export interface ExportCaseRow {
    trackingId: string;
    date: string;
    sector: string;
    originSector?: string;
    managementType?: string;
    urgency?: string;
    status: string;
    category?: string;
    summary: string;
    immediateAction?: string;
    qualityObservations?: string;
    resolvedAt?: string;
}

export interface InstitutionalExportOptions {
    title: string;
    subtitle: string;
    sheetName?: string;
    fileNamePrefix: string;
    rows: ExportCaseRow[];
    kpis?: {
        total: number;
        pending: number;
        resolved: number;
        felicitaciones?: number;
    };
}

const FOOTER_TEXT =
    'Sanatorio Argentino · Gestión de Calidad y Seguridad del Paciente · Innovación y Transformación Digital';

/**
 * Helper to fetch /logosanatorio.png onto a white rounded badge canvas so it looks
 * crisp inside Excel headers (preserving transparency/contrast).
 */
const loadLogoBadgeBase64 = (url = '/logosanatorio.png'): Promise<string | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            try {
                const badgeW = 320;
                const badgeH = 140;
                const canvas = document.createElement('canvas');
                canvas.width = badgeW;
                canvas.height = badgeH;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(null);
                    return;
                }

                // White rounded rectangle background
                const r = 20;
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.moveTo(r, 0);
                ctx.lineTo(badgeW - r, 0);
                ctx.quadraticCurveTo(badgeW, 0, badgeW, r);
                ctx.lineTo(badgeW, badgeH - r);
                ctx.quadraticCurveTo(badgeW, badgeH, badgeW - r, badgeH);
                ctx.lineTo(r, badgeH);
                ctx.quadraticCurveTo(0, badgeH, 0, badgeH - r);
                ctx.lineTo(0, r);
                ctx.quadraticCurveTo(0, 0, r, 0);
                ctx.closePath();
                ctx.fill();

                // Draw logo centered preserving aspect ratio
                const pad = 18;
                const availW = badgeW - pad * 2;
                const availH = badgeH - pad * 2;
                const natW = img.naturalWidth || img.width || 200;
                const natH = img.naturalHeight || img.height || 80;
                const ratio = natW / natH;

                let drawW = availW;
                let drawH = drawW / ratio;
                if (drawH > availH) {
                    drawH = availH;
                    drawW = drawH * ratio;
                }
                const dx = (badgeW - drawW) / 2;
                const dy = (badgeH - drawH) / 2;
                ctx.drawImage(img, dx, dy, drawW, drawH);

                resolve(canvas.toDataURL('image/png'));
            } catch {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
};

/**
 * Generates and downloads a styled institutional Excel (.xlsx) file with logo,
 * Sanatorio Argentino colors (#00548B & #00A99D), KPI cards, formatted table, and footer.
 */
export const exportCasesToExcel = async (options: InstitutionalExportOptions): Promise<void> => {
    const {
        title,
        subtitle,
        sheetName = 'Casos de Calidad',
        fileNamePrefix,
        rows,
        kpis,
    } = options;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sanatorio Argentino · Innovación y Transformación Digital';
    workbook.created = new Date();
    workbook.modified = new Date();

    const ws = workbook.addWorksheet(sheetName, {
        views: [{ state: 'frozen', ySplit: 8, showGridLines: true }],
        pageSetup: {
            paperSize: 9, // A4
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: {
                left: 0.4,
                right: 0.4,
                top: 0.5,
                bottom: 0.6,
                header: 0.3,
                footer: 0.3,
            },
        },
        headerFooter: {
            oddFooter: `&L&"Calibri,Bold"&8${FOOTER_TEXT}&R&"Calibri,Regular"&8Página &P de &N`,
        },
    });

    // Configure 8 columns
    ws.columns = [
        { key: 'trackingId', width: 17 },
        { key: 'date', width: 14 },
        { key: 'sector', width: 28 },
        { key: 'typeOrPriority', width: 18 },
        { key: 'status', width: 16 },
        { key: 'category', width: 22 },
        { key: 'summary', width: 48 },
        { key: 'actionOrObs', width: 38 },
    ];

    const totalCols = 8;

    // ─── 1. INSTITUTIONAL HEADER BANNER (Rows 1 to 3) ───
    ws.mergeCells('A1:A3');
    ws.mergeCells('B1:H1');
    ws.mergeCells('B2:H2');
    ws.mergeCells('B3:H3');

    ws.getRow(1).height = 20;
    ws.getRow(2).height = 24;
    ws.getRow(3).height = 18;

    for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= totalCols; c++) {
            const cell = ws.getCell(r, c);
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF00548B' }, // #00548B Azul Institucional
            };
            if (r === 3) {
                cell.border = {
                    bottom: { style: 'medium', color: { argb: 'FF00A99D' } }, // #00A99D Teal Clínico
                };
            }
        }
    }

    // Header texts in Column B
    const deptCell = ws.getCell('B1');
    deptCell.value = 'SANATORIO ARGENTINO · DEPARTAMENTO DE GESTIÓN DE CALIDAD Y SEGURIDAD DEL PACIENTE';
    deptCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFBAE6FD' } };
    deptCell.alignment = { vertical: 'bottom', horizontal: 'left', indent: 1 };

    const titleCell = ws.getCell('B2');
    titleCell.value = title.toUpperCase();
    titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    const subCell = ws.getCell('B3');
    subCell.value = `${subtitle}  ·  Emitido: ${new Date().toLocaleString('es-AR')}`;
    subCell.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FFE0F2FE' } };
    subCell.alignment = { vertical: 'top', horizontal: 'left', indent: 1 };

    // Embed Logo inside A1:A3
    const logoBase64 = await loadLogoBadgeBase64('/logosanatorio.png');
    if (logoBase64) {
        const imageId = workbook.addImage({
            base64: logoBase64,
            extension: 'png',
        });
        ws.addImage(imageId, {
            tl: { col: 0.12, row: 0.18 },
            ext: { width: 112, height: 50 },
        });
    } else {
        const fallbackLogo = ws.getCell('A1');
        fallbackLogo.value = 'SANATORIO\nARGENTINO';
        fallbackLogo.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        fallbackLogo.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    }

    // ─── 2. SPACER ROW (Row 4) ───
    ws.getRow(4).height = 8;

    // ─── 3. KPI SUMMARY STRIP (Rows 5 & 6) ───
    const computedTotal = kpis?.total ?? rows.length;
    const computedPending =
        kpis?.pending ??
        rows.filter(
            (r) =>
                r.status.toLowerCase().includes('pendiente') ||
                r.status.toLowerCase().includes('gestión') ||
                r.status.toLowerCase().includes('activo') ||
                r.status.toLowerCase().includes('recibido')
        ).length;
    const computedResolved =
        kpis?.resolved ??
        rows.filter(
            (r) =>
                r.status.toLowerCase().includes('resuelto') ||
                r.status.toLowerCase().includes('validación')
        ).length;
    const computedFelic =
        kpis?.felicitaciones ??
        rows.filter(
            (r) =>
                r.category?.toLowerCase().includes('felicit') ||
                r.managementType?.toLowerCase().includes('felicit') ||
                r.status.toLowerCase().includes('felicit')
        ).length;

    ws.getRow(5).height = 14;
    ws.getRow(6).height = 22;

    const kpiBlocks = [
        {
            cols: ['A', 'B'],
            label: 'TOTAL DE CASOS EN VISTA',
            value: computedTotal,
            bg: 'FFEFF6FF',
            border: 'FFBFDBFE',
            labelColor: 'FF00548B',
            valColor: 'FF003052',
        },
        {
            cols: ['C', 'D'],
            label: 'PENDIENTES / EN GESTIÓN',
            value: computedPending,
            bg: 'FFFEFCE8',
            border: 'FFFDE68A',
            labelColor: 'FFB45309',
            valColor: 'FF92400E',
        },
        {
            cols: ['E', 'F'],
            label: 'RESUELTOS / EN VALIDACIÓN',
            value: computedResolved,
            bg: 'FFF0FDF4',
            border: 'FFBBF7D0',
            labelColor: 'FF15803D',
            valColor: 'FF166534',
        },
        {
            cols: ['G', 'H'],
            label: 'FELICITACIONES / DESTACADOS',
            value: computedFelic,
            bg: 'FFFFFBEB',
            border: 'FFFCD34D',
            labelColor: 'FFD97706',
            valColor: 'FF92400E',
        },
    ];

    kpiBlocks.forEach((b) => {
        const [c1, c2] = b.cols;
        ws.mergeCells(`${c1}5:${c2}5`);
        ws.mergeCells(`${c1}6:${c2}6`);

        const topCell = ws.getCell(`${c1}5`);
        topCell.value = b.label;
        topCell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: b.labelColor } };
        topCell.alignment = { vertical: 'bottom', horizontal: 'center' };

        const botCell = ws.getCell(`${c1}6`);
        botCell.value = b.value;
        botCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: b.valColor } };
        botCell.alignment = { vertical: 'middle', horizontal: 'center' };

        [c1, c2].forEach((colLetter) => {
            [5, 6].forEach((rNum) => {
                const c = ws.getCell(`${colLetter}${rNum}`);
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: b.bg } };
                c.border = {
                    top: rNum === 5 ? { style: 'thin', color: { argb: b.border } } : undefined,
                    bottom: rNum === 6 ? { style: 'thin', color: { argb: b.border } } : undefined,
                    left: colLetter === c1 ? { style: 'thin', color: { argb: b.border } } : undefined,
                    right: colLetter === c2 ? { style: 'thin', color: { argb: b.border } } : undefined,
                };
            });
        });
    });

    // ─── 4. SPACER ROW (Row 7) ───
    ws.getRow(7).height = 8;

    // ─── 5. TABLE HEADER (Row 8) ───
    const headerRowIndex = 8;
    const headers = [
        'Ticket ID',
        'Fecha',
        'Sector',
        'Tipo / Prioridad',
        'Estado',
        'Clasificación',
        'Resumen / Descripción del Caso',
        'Acción Inmediata / Observaciones',
    ];

    const headerRow = ws.getRow(headerRowIndex);
    headerRow.height = 26;
    headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h;
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF00548B' },
        };
        cell.alignment = {
            vertical: 'middle',
            horizontal: idx <= 4 ? 'center' : 'left',
            wrapText: true,
        };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF003052' } },
            bottom: { style: 'medium', color: { argb: 'FF00A99D' } },
            left: { style: 'thin', color: { argb: 'FF003E6B' } },
            right: { style: 'thin', color: { argb: 'FF003E6B' } },
        };
    });

    // Enable autoFilter on the table header
    ws.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: headerRowIndex + Math.max(rows.length, 1), column: totalCols },
    };

    // ─── 6. DATA ROWS ───
    rows.forEach((r, idx) => {
        const rowNum = headerRowIndex + 1 + idx;
        const row = ws.getRow(rowNum);
        const isEven = idx % 2 === 1;
        const baseBg = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

        const typeOrPrio = r.managementType || r.urgency || 'Normal';
        const actionOrObs = [
            r.immediateAction ? `Acción: ${r.immediateAction}` : '',
            r.qualityObservations ? `Obs. Calidad: ${r.qualityObservations}` : '',
        ]
            .filter(Boolean)
            .join(' | ') || '—';

        const values = [
            r.trackingId || '—',
            r.date || '—',
            r.sector || '—',
            typeOrPrio,
            r.status || '—',
            r.category || 'General',
            r.summary || '—',
            actionOrObs,
        ];

        // Estimate row height from text length
        const maxLen = Math.max((r.summary || '').length, actionOrObs.length);
        row.height = maxLen > 120 ? 42 : maxLen > 65 ? 30 : 22;

        values.forEach((val, colIdx) => {
            const cell = row.getCell(colIdx + 1);
            cell.value = val;
            cell.font = {
                name: 'Calibri',
                size: 9.5,
                bold: colIdx === 0 || colIdx === 2 || colIdx === 3 || colIdx === 4,
                color: { argb: colIdx === 0 ? 'FF00548B' : 'FF1E293B' },
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: baseBg },
            };
            cell.alignment = {
                vertical: 'middle',
                horizontal: colIdx === 0 || colIdx === 1 || colIdx === 3 || colIdx === 4 ? 'center' : 'left',
                wrapText: true,
            };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            };

            // Semantic styling for Column 4 (Tipo / Prioridad)
            if (colIdx === 3) {
                const vLow = String(val).toLowerCase();
                if (vLow.includes('rojo') || vLow.includes('adverso') || vLow.includes('crít')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
                    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };
                } else if (vLow.includes('amarillo') || vLow.includes('desv')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCE8' } };
                    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFB45309' } };
                } else if (vLow.includes('felicit') || vLow.includes('reconoc')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
                    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFD97706' } };
                } else {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
                    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF00548B' } };
                }
            }

            // Semantic styling for Column 5 (Estado)
            if (colIdx === 4) {
                const sLow = String(val).toLowerCase();
                if (sLow.includes('resuelto') || sLow.includes('aprobado')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
                    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF15803D' } };
                } else if (sLow.includes('validaci')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
                    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF6D28D9' } };
                } else if (sLow.includes('rechaz') || sLow.includes('cancel')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
                    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };
                } else if (sLow.includes('felicit')) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
                    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFD97706' } };
                } else {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEFCE8' } };
                    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFB45309' } };
                }
            }
        });
    });

    // ─── 7. INSTITUTIONAL FOOTER BLOCK IN SHEET ───
    const footerSpacerRow = headerRowIndex + rows.length + 1;
    ws.getRow(footerSpacerRow).height = 10;

    const footerRowNum = footerSpacerRow + 1;
    ws.mergeCells(`A${footerRowNum}:H${footerRowNum}`);
    const footerRow = ws.getRow(footerRowNum);
    footerRow.height = 24;

    for (let c = 1; c <= totalCols; c++) {
        const fCell = ws.getCell(footerRowNum, c);
        fCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' },
        };
        fCell.border = {
            top: { style: 'medium', color: { argb: 'FF00548B' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        };
    }

    const mainFooterCell = ws.getCell(`A${footerRowNum}`);
    mainFooterCell.value = `${FOOTER_TEXT}  ·  Documento Confidencial (${new Date().getFullYear()})`;
    mainFooterCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF00548B' } };
    mainFooterCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Generate buffer and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Generates and downloads a Landscape A4 PDF report for Mis Casos / Seguimientos / Tablero
 * with the Sanatorio Argentino logo, KPI summary pill, color-coded table, and
 * "Innovación y Transformación Digital" institutional footer.
 */
export const exportCasesToPDF = async (options: InstitutionalExportOptions): Promise<void> => {
    const { title, subtitle, fileNamePrefix, rows, kpis } = options;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const logo = await loadLogoImage('/logosanatorio.png');
    const pageW = doc.internal.pageSize.getWidth(); // 297
    const M = 14;

    // Header Institucional
    doc.setFillColor(...PDF_COLORS.primary);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setFillColor(...PDF_COLORS.secondary);
    doc.rect(0, 28, pageW, 1.8, 'F');

    drawLogoBadge(doc, logo, M, 4, 32, 20, 2.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(186, 230, 253);
    doc.text(
        'SANATORIO ARGENTINO · GESTIÓN DE CALIDAD Y SEGURIDAD DEL PACIENTE',
        M + 36,
        9.5
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(sanitizePdfText(title.toUpperCase()), M + 36, 16.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(224, 242, 254);
    doc.text(
        sanitizePdfText(
            `${subtitle}  ·  Emitido: ${new Date().toLocaleString('es-AR')}  ·  Total: ${rows.length} registros`
        ),
        M + 36,
        22.5
    );

    // KPI Pill on right side of header
    const totalVal = kpis?.total ?? rows.length;
    const pendVal =
        kpis?.pending ??
        rows.filter(
            (r) =>
                r.status.toLowerCase().includes('pendiente') ||
                r.status.toLowerCase().includes('gestión') ||
                r.status.toLowerCase().includes('activo')
        ).length;
    const resVal =
        kpis?.resolved ??
        rows.filter(
            (r) =>
                r.status.toLowerCase().includes('resuelto') ||
                r.status.toLowerCase().includes('validación')
        ).length;

    const kpiSummary = `Total: ${totalVal}   |   Pendientes/Activos: ${pendVal}   |   Resueltos: ${resVal}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const kpiW = doc.getTextWidth(kpiSummary) + 10;
    doc.setFillColor(...PDF_COLORS.primaryDark);
    doc.roundedRect(pageW - M - kpiW, 10, kpiW, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(kpiSummary, pageW - M - kpiW + 5, 15.2);

    autoTable(doc, {
        startY: 34,
        head: [
            [
                'Ticket ID',
                'Fecha',
                'Sector',
                'Tipo / Prioridad',
                'Estado',
                'Resumen / Descripción del Caso',
                'Acción Inmediata / Observaciones',
            ],
        ],
        body: rows.map((r) => {
            const actionOrObs = [
                r.immediateAction ? `Acción: ${r.immediateAction}` : '',
                r.qualityObservations ? `Obs.: ${r.qualityObservations}` : '',
            ]
                .filter(Boolean)
                .join(' | ') || '-';

            return [
                sanitizePdfText(r.trackingId || '-'),
                sanitizePdfText(r.date || '-'),
                sanitizePdfText(r.sector || '-'),
                sanitizePdfText(r.managementType || r.urgency || 'Normal'),
                sanitizePdfText(r.status || '-'),
                sanitizePdfText(r.summary || '-').substring(0, 120),
                sanitizePdfText(actionOrObs).substring(0, 95),
            ];
        }),
        styles: {
            fontSize: 8,
            cellPadding: 3,
            font: 'helvetica',
            textColor: PDF_COLORS.slate800,
            lineColor: PDF_COLORS.slate200,
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: PDF_COLORS.primary,
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: 3.5,
        },
        alternateRowStyles: { fillColor: PDF_COLORS.slate50 },
        columnStyles: {
            0: { cellWidth: 26, fontStyle: 'bold', textColor: PDF_COLORS.primary },
            1: { cellWidth: 22, halign: 'center' as const },
            2: { cellWidth: 38, fontStyle: 'bold' },
            3: { cellWidth: 26, halign: 'center' as const, fontStyle: 'bold' },
            4: { cellWidth: 26, halign: 'center' as const, fontStyle: 'bold' },
            5: { cellWidth: 78 },
            6: { cellWidth: 53 },
        },
        didParseCell: (hookData: any) => {
            if (hookData.section === 'body') {
                const prio = String(hookData.row.raw[3] || '').toLowerCase();
                const estado = String(hookData.row.raw[4] || '').toLowerCase();
                if (hookData.column.index === 3) {
                    if (prio.includes('rojo') || prio.includes('adverso')) {
                        hookData.cell.styles.textColor = PDF_COLORS.red;
                        hookData.cell.styles.fillColor = PDF_COLORS.redBg;
                    } else if (prio.includes('amarillo') || prio.includes('desv')) {
                        hookData.cell.styles.textColor = PDF_COLORS.amber;
                        hookData.cell.styles.fillColor = PDF_COLORS.amberBg;
                    } else if (prio.includes('felicit') || prio.includes('reconoc')) {
                        hookData.cell.styles.textColor = PDF_COLORS.gold;
                        hookData.cell.styles.fillColor = PDF_COLORS.goldBg;
                    } else {
                        hookData.cell.styles.textColor = PDF_COLORS.primary;
                    }
                }
                if (hookData.column.index === 4) {
                    if (estado.includes('resuelto')) {
                        hookData.cell.styles.textColor = PDF_COLORS.emerald;
                        hookData.cell.styles.fillColor = PDF_COLORS.emeraldBg;
                    } else if (estado.includes('validaci')) {
                        hookData.cell.styles.textColor = PDF_COLORS.purple;
                        hookData.cell.styles.fillColor = PDF_COLORS.purpleBg;
                    } else if (estado.includes('rechaz')) {
                        hookData.cell.styles.textColor = PDF_COLORS.red;
                        hookData.cell.styles.fillColor = PDF_COLORS.redBg;
                    } else {
                        hookData.cell.styles.textColor = PDF_COLORS.amber;
                    }
                }
            }
        },
        margin: { left: M, right: M, top: 20, bottom: 16 },
    });

    applyInstitutionalFooters(doc, {
        margin: M,
        subtitle: FOOTER_TEXT,
    });

    doc.save(`${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

