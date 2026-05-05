/**
 * Validation PDF Export — Generates a professional PDF from the Quality Validation panel.
 * Uses the Outfit font (same as the project) and the institutional color palette.
 */
import jsPDF from 'jspdf';

// ─── Color Palette (matching the project design system) ───
const PRIMARY: [number, number, number] = [0, 84, 139];      // #00548B
const SECONDARY: [number, number, number] = [0, 169, 157];   // #00A99D
const BLUE_BG: [number, number, number] = [239, 246, 255];   // bg-blue-50
const AMBER_BG: [number, number, number] = [255, 251, 235];  // bg-amber-50
const GREEN_BG: [number, number, number] = [240, 253, 244];  // bg-green-50
const RED_BG: [number, number, number] = [254, 242, 242];    // bg-red-50
const PURPLE_BG: [number, number, number] = [250, 245, 255]; // bg-purple-50
const BLUE_ACCENT: [number, number, number] = [37, 99, 235];
const AMBER_ACCENT: [number, number, number] = [180, 83, 9];
const GREEN_ACCENT: [number, number, number] = [21, 128, 61];
const DARK_TEXT: [number, number, number] = [30, 41, 59];
const GRAY_TEXT: [number, number, number] = [100, 116, 139];
const BODY_TEXT: [number, number, number] = [55, 65, 81];

// ─── Helpers ───
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = url;
    });
};

/**
 * Try to register the Outfit font. Falls back to helvetica if not available.
 */
const registerFonts = async (doc: jsPDF): Promise<string> => {
    try {
        const response = await fetch('/fonts/Outfit-Variable.ttf');
        if (!response.ok) throw new Error('Font not available');
        const buffer = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);

        doc.addFileToVFS('Outfit-Regular.ttf', base64);
        doc.addFont('Outfit-Regular.ttf', 'Outfit', 'normal');

        // Register same variable font for bold style
        doc.addFileToVFS('Outfit-Bold.ttf', base64);
        doc.addFont('Outfit-Bold.ttf', 'Outfit', 'bold');

        return 'Outfit';
    } catch {
        console.warn('Outfit font not available, falling back to helvetica');
        return 'helvetica';
    }
};

// ─── PDF Generator ───

interface SectorAssignment {
    id: string;
    sector: string;
    status: string;
    assigned_phone?: string;
    immediate_action?: string;
    root_cause?: string;
    corrective_plan?: string;
    implementation_date?: string;
    resolution_evidence_urls?: string[];
    resolution_notes?: string;
    notes?: string;
    resolved_at?: string;
    created_at?: string;
}

interface ReportData {
    tracking_id: string;
    content: string;
    ai_summary?: string;
    ai_urgency?: string;
    ai_category?: string;
    sector?: string;
    status: string;
    created_at: string;
    resolved_at?: string;
    resolution_notes?: string;
    root_cause?: string;
    corrective_plan?: string;
    implementation_date?: string;
    resolution_evidence_urls?: string[];
    assigned_to?: string;
    evidence_urls?: string[];
    finding_type?: string;
    resolution_history?: any[];
}

export const generateValidationPDF = async (
    report: ReportData,
    sectorAssignments: SectorAssignment[],
    sectorOptions: { value: string; label: string }[]
) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const fontName = await registerFonts(doc);
    const logoBase64 = await loadImageAsBase64('/logosanatorio.png');

    const pageW = doc.internal.pageSize.getWidth();   // 210
    const pageH = doc.internal.pageSize.getHeight();  // 297
    const M = 18; // margin
    const CW = pageW - 2 * M; // content width
    let y = 0;

    const activeAssignments = sectorAssignments.filter(a => a.status !== 'rejected');
    const respondedAssignments = sectorAssignments.filter(a =>
        a.status === 'resolved' || a.status === 'quality_validation'
    );
    const isMultiSector = sectorAssignments.length > 0;

    // ─── Font helper ───
    const setF = (style: 'normal' | 'bold', size: number, color: [number, number, number] = DARK_TEXT) => {
        doc.setFont(fontName, style);
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
    };

    // ─── Check page break ───
    const checkBreak = (neededHeight: number) => {
        if (y + neededHeight > pageH - 22) {
            doc.addPage();
            y = 22;
        }
    };

    // ─── Wrapped text with auto page break ───
    const writeWrappedText = (text: string, x: number, startY: number, maxWidth: number, fontSize: number, color: [number, number, number] = BODY_TEXT): number => {
        setF('normal', fontSize, color);
        const lines: string[] = doc.splitTextToSize(text, maxWidth);
        const lineHeight = fontSize * 0.45;
        let currentY = startY;

        for (const line of lines) {
            if (currentY + lineHeight > pageH - 22) {
                doc.addPage();
                currentY = 22;
                setF('normal', fontSize, color);
            }
            doc.text(line, x, currentY);
            currentY += lineHeight;
        }
        return currentY;
    };

    // ═══════════════════════════════════════
    //  PAGE 1: HEADER + CASE SUMMARY
    // ═══════════════════════════════════════

    // ─── Blue header band ───
    doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    doc.rect(0, 0, pageW, 48, 'F');

    // Accent bar
    doc.setFillColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
    doc.rect(0, 48, pageW, 2.5, 'F');

    // Logo
    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', M, 8, 28, 28);
    }

    // Title text
    setF('bold', 20, [255, 255, 255]);
    doc.text('VALIDACIÓN DE CALIDAD', logoBase64 ? M + 34 : M, 22);

    setF('normal', 10, [200, 220, 240]);
    doc.text('Informe de Resolución de Caso', logoBase64 ? M + 34 : M, 30);

    // Tracking ID badge
    const ticketText = report.tracking_id || 'Sin ID';
    setF('bold', 9, [255, 255, 255]);
    const ticketW = doc.getTextWidth(ticketText) + 10;
    doc.setFillColor(255, 255, 255, 30);
    doc.roundedRect(logoBase64 ? M + 34 : M, 34, ticketW, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(ticketText, (logoBase64 ? M + 34 : M) + 5, 39.5);

    // Date on right
    setF('normal', 8, [200, 220, 240]);
    const dateStr = new Date().toLocaleDateString('es-AR', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(dateStr, pageW - M, 40, { align: 'right' });

    y = 58;

    // ─── Case Info Card ───
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(M, y, CW, 38, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CW, 38, 3, 3, 'S');

    // Row 1: Sector + Urgency + Classification
    setF('bold', 7, GRAY_TEXT);
    doc.text('SECTOR', M + 6, y + 7);
    doc.text('URGENCIA', M + 60, y + 7);
    doc.text('CLASIFICACIÓN', M + 110, y + 7);

    setF('bold', 10, DARK_TEXT);
    doc.text(report.sector || 'Sin sector', M + 6, y + 14);

    // Urgency badge
    const urgencyColors: Record<string, { bg: [number, number, number]; text: [number, number, number]; label: string }> = {
        Verde: { bg: [220, 252, 231], text: [21, 128, 61], label: '● Leve' },
        Amarillo: { bg: [254, 249, 195], text: [161, 98, 7], label: '● Medio' },
        Rojo: { bg: [254, 226, 226], text: [185, 28, 28], label: '● Crítico' },
    };
    const urg = urgencyColors[report.ai_urgency || ''] || { bg: [241, 245, 249], text: GRAY_TEXT, label: report.ai_urgency || '-' };
    doc.setFillColor(urg.bg[0], urg.bg[1], urg.bg[2]);
    doc.roundedRect(M + 60, y + 9, 35, 7, 2, 2, 'F');
    setF('bold', 8, urg.text);
    doc.text(urg.label, M + 63, y + 14);

    setF('normal', 10, DARK_TEXT);
    doc.text(report.ai_category || 'Sin clasificar', M + 110, y + 14);

    // Row 2: Date + Status
    setF('bold', 7, GRAY_TEXT);
    doc.text('FECHA DE CREACIÓN', M + 6, y + 23);
    doc.text('ESTADO', M + 60, y + 23);
    doc.text('ORIGEN', M + 110, y + 23);

    setF('normal', 10, DARK_TEXT);
    doc.text(new Date(report.created_at).toLocaleDateString('es-AR'), M + 6, y + 30);

    const statusLabels: Record<string, string> = {
        quality_validation: 'En Validación de Calidad',
        resolved: 'Resuelto',
        pending_resolution: 'Pendiente Resolución',
        pending: 'Pendiente',
        analyzed: 'Analizado',
    };
    doc.text(statusLabels[report.status] || report.status, M + 60, y + 30);

    // Origin (from resolution_notes)
    const originMatch = report.resolution_notes?.match(/Origen:\s*(.+)/);
    const originText = originMatch ? originMatch[1].trim() : report.finding_type || '-';
    setF('normal', 9, DARK_TEXT);
    doc.text(originText.substring(0, 40), M + 110, y + 30);

    y += 45;

    // ─── Sector Progress ───
    if (isMultiSector) {
        checkBreak(20);
        doc.setFillColor(PURPLE_BG[0], PURPLE_BG[1], PURPLE_BG[2]);
        doc.roundedRect(M, y, CW, 16, 3, 3, 'F');

        setF('bold', 7, GRAY_TEXT);
        doc.text('PROGRESO DE SECTORES', M + 6, y + 6);

        // Progress bar
        const barX = M + 6;
        const barW = CW - 50;
        const barY = y + 9;
        doc.setFillColor(230, 230, 240);
        doc.roundedRect(barX, barY, barW, 3, 1.5, 1.5, 'F');

        const progress = activeAssignments.length > 0
            ? respondedAssignments.length / activeAssignments.length : 0;
        if (progress > 0) {
            doc.setFillColor(139, 92, 246);
            doc.roundedRect(barX, barY, barW * progress, 3, 1.5, 1.5, 'F');
        }

        setF('bold', 9, [139, 92, 246]);
        doc.text(`${respondedAssignments.length}/${activeAssignments.length}`, pageW - M - 6, y + 11, { align: 'right' });

        y += 22;
    }

    // ─── AI Summary ───
    if (report.ai_summary) {
        checkBreak(30);
        setF('bold', 8, GRAY_TEXT);
        doc.text('RESUMEN DEL CASO (IA)', M, y);
        y += 5;

        doc.setFillColor(248, 250, 252);
        const summaryLines = doc.splitTextToSize(report.ai_summary, CW - 12);
        const summaryH = summaryLines.length * 4.5 + 8;
        doc.roundedRect(M, y, CW, summaryH, 3, 3, 'F');

        setF('normal', 9, BODY_TEXT);
        doc.text(summaryLines, M + 6, y + 6);
        y += summaryH + 6;
    }

    // ═══════════════════════════════════════
    //  SECTOR RESPONSES
    // ═══════════════════════════════════════

    // ─── Helper: draw a colored content section ───
    const drawSection = (
        title: string,
        content: string,
        bgColor: [number, number, number],
        accentColor: [number, number, number],
        titleColor: [number, number, number]
    ) => {
        setF('normal', 9.5);
        const lines = doc.splitTextToSize(content, CW - 20);
        const textH = lines.length * 4.5;
        const boxH = textH + 14;

        checkBreak(boxH + 4);

        // Background
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.roundedRect(M, y, CW, boxH, 3, 3, 'F');

        // Left accent bar
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.roundedRect(M, y, 2.5, boxH, 1, 1, 'F');

        // Title
        setF('bold', 7.5, titleColor);
        doc.text(title.toUpperCase(), M + 8, y + 7);

        // Content
        setF('normal', 9.5, BODY_TEXT);
        doc.text(lines, M + 8, y + 13);

        y += boxH + 4;
    };

    // For multi-sector: render each sector assignment
    if (isMultiSector) {
        const respondedOnly = sectorAssignments.filter(a =>
            a.status === 'resolved' || a.status === 'quality_validation'
        );

        // If no sectors responded yet but report has data, use report-level data
        const sectorsToRender = respondedOnly.length > 0 ? respondedOnly : (
            (report.resolution_notes || report.root_cause || report.corrective_plan)
                ? [{ 
                    id: 'report-level', 
                    sector: report.sector || 'Sector',
                    status: 'quality_validation',
                    immediate_action: report.resolution_notes,
                    root_cause: report.root_cause,
                    corrective_plan: report.corrective_plan,
                    implementation_date: report.implementation_date,
                    resolution_evidence_urls: report.resolution_evidence_urls,
                } as SectorAssignment] : []
        );

        for (let i = 0; i < sectorsToRender.length; i++) {
            const assignment = sectorsToRender[i];
            const sectorLabel = sectorOptions.find(s => s.value === assignment.sector)?.label || assignment.sector;

            // Sector header
            checkBreak(16);
            doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
            doc.roundedRect(M, y, CW, 12, 3, 3, 'F');

            setF('bold', 10, [255, 255, 255]);
            doc.text(`${i + 1}. ${sectorLabel}`, M + 6, y + 8);

            // Status badge
            const resolved = assignment.status === 'resolved';
            const statusBadge = resolved ? '✓ Resuelto' : 'En Revisión';
            setF('bold', 7, [255, 255, 255]);
            const badgeW = doc.getTextWidth(statusBadge) + 8;
            doc.setFillColor(resolved ? 21 : 139, resolved ? 128 : 92, resolved ? 61 : 246);
            doc.roundedRect(pageW - M - badgeW - 4, y + 2.5, badgeW, 7, 2, 2, 'F');
            doc.text(statusBadge, pageW - M - badgeW, y + 7.5);

            y += 17;

            // Effective data (fallback to report level)
            const effectiveAction = assignment.immediate_action || report.resolution_notes;
            const effectiveRootCause = assignment.root_cause || report.root_cause;
            const effectivePlan = assignment.corrective_plan || report.corrective_plan;
            const effectiveImplDate = assignment.implementation_date || report.implementation_date;

            // Acción Inmediata
            if (effectiveAction) {
                const cleanAction = effectiveAction.split('Origen:')[0].trim();
                if (cleanAction) {
                    drawSection(
                        '● Acción Inmediata',
                        cleanAction,
                        BLUE_BG,
                        BLUE_ACCENT,
                        BLUE_ACCENT
                    );
                }
            }

            // Causa Raíz
            if (effectiveRootCause) {
                drawSection(
                    '🧠 Causa Raíz',
                    effectiveRootCause,
                    AMBER_BG,
                    AMBER_ACCENT,
                    AMBER_ACCENT
                );
            }

            // Plan de Acción
            if (effectivePlan) {
                drawSection(
                    '✓ Plan de Acción',
                    effectivePlan,
                    GREEN_BG,
                    GREEN_ACCENT,
                    GREEN_ACCENT
                );

                // Implementation date
                if (effectiveImplDate) {
                    setF('bold', 8, GREEN_ACCENT);
                    doc.text(
                        `Fecha de Implementación: ${new Date(effectiveImplDate).toLocaleDateString('es-AR')}`,
                        M + 8, y - 1
                    );
                    y += 4;
                }
            }

            // If no data at all
            if (!effectiveAction && !effectiveRootCause && !effectivePlan) {
                checkBreak(14);
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(M, y, CW, 10, 3, 3, 'F');
                setF('normal', 9, GRAY_TEXT);
                doc.text('Sin datos de resolución registrados.', M + 6, y + 7);
                y += 14;
            }

            // Separator between sectors
            if (i < sectorsToRender.length - 1) {
                y += 4;
            }
        }
    } else {
        // Single-sector view: use report-level data directly
        checkBreak(16);
        setF('bold', 12, PRIMARY);
        doc.text('Resolución del Caso', M, y + 4);
        y += 12;

        if (report.resolution_notes) {
            const cleanAction = report.resolution_notes.split('Origen:')[0].trim();
            if (cleanAction) {
                drawSection('● Acción Inmediata', cleanAction, BLUE_BG, BLUE_ACCENT, BLUE_ACCENT);
            }
        }

        if (report.root_cause) {
            drawSection('🧠 Causa Raíz', report.root_cause, AMBER_BG, AMBER_ACCENT, AMBER_ACCENT);
        }

        if (report.corrective_plan) {
            drawSection('✓ Plan de Acción', report.corrective_plan, GREEN_BG, GREEN_ACCENT, GREEN_ACCENT);

            if (report.implementation_date) {
                setF('bold', 8, GREEN_ACCENT);
                doc.text(
                    `Fecha de Implementación: ${new Date(report.implementation_date).toLocaleDateString('es-AR')}`,
                    M + 8, y - 1
                );
                y += 4;
            }
        }
    }

    // ═══════════════════════════════════════
    //  REJECTION HISTORY (if any)
    // ═══════════════════════════════════════
    if (report.resolution_history && report.resolution_history.length > 0) {
        checkBreak(20);
        y += 4;

        doc.setFillColor(RED_BG[0], RED_BG[1], RED_BG[2]);
        const historyTitleH = 10;
        doc.roundedRect(M, y, CW, historyTitleH, 3, 3, 'F');
        setF('bold', 9, [185, 28, 28]);
        doc.text(`⚠ Historial de Soluciones Rechazadas (${report.resolution_history.length})`, M + 6, y + 7);
        y += historyTitleH + 4;

        report.resolution_history.forEach((entry: any, idx: number) => {
            checkBreak(30);
            doc.setFillColor(254, 249, 249);
            doc.roundedRect(M, y, CW, 8, 2, 2, 'F');
            setF('bold', 7, [185, 28, 28]);
            doc.text(`Intento #${idx + 1} — Rechazado: ${new Date(entry.rejected_at).toLocaleDateString('es-AR')}`, M + 6, y + 5.5);
            setF('normal', 7, [185, 28, 28]);
            doc.text(`Motivo: "${entry.reject_reason}"`, M + 6 + CW * 0.45, y + 5.5);
            y += 11;

            if (entry.previous_data?.immediate_action) {
                setF('bold', 7, GRAY_TEXT);
                doc.text('Acción:', M + 6, y);
                setF('normal', 8, GRAY_TEXT);
                const actionLines = doc.splitTextToSize(entry.previous_data.immediate_action, CW - 30);
                doc.text(actionLines.slice(0, 2), M + 24, y);
                y += Math.min(actionLines.length, 2) * 4 + 2;
            }

            if (entry.previous_data?.root_cause) {
                setF('bold', 7, GRAY_TEXT);
                doc.text('RCA:', M + 6, y);
                setF('normal', 8, GRAY_TEXT);
                const rcaLines = doc.splitTextToSize(entry.previous_data.root_cause, CW - 30);
                doc.text(rcaLines.slice(0, 2), M + 24, y);
                y += Math.min(rcaLines.length, 2) * 4 + 2;
            }

            if (entry.previous_data?.corrective_plan) {
                setF('bold', 7, GRAY_TEXT);
                doc.text('Plan:', M + 6, y);
                setF('normal', 8, GRAY_TEXT);
                const planLines = doc.splitTextToSize(entry.previous_data.corrective_plan, CW - 30);
                doc.text(planLines.slice(0, 2), M + 24, y);
                y += Math.min(planLines.length, 2) * 4 + 2;
            }

            y += 4;
        });
    }

    // ═══════════════════════════════════════
    //  ORIGINAL REPORT
    // ═══════════════════════════════════════
    checkBreak(30);
    y += 6;

    doc.setFillColor(248, 250, 252);
    setF('bold', 8, GRAY_TEXT);
    doc.text('REPORTE ORIGINAL', M, y);
    y += 6;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    const reportLines = doc.splitTextToSize(report.content || 'Sin contenido.', CW - 12);
    const reportH = reportLines.length * 4.5 + 10;
    checkBreak(reportH);
    doc.roundedRect(M, y, CW, reportH, 3, 3, 'S');

    setF('normal', 9, BODY_TEXT);
    doc.text(reportLines, M + 6, y + 7);
    y += reportH + 6;

    // ─── Assigned To ───
    if (report.assigned_to) {
        checkBreak(10);
        setF('bold', 8, GRAY_TEXT);
        doc.text(`Responsable: ${report.assigned_to}`, M, y);
        y += 8;
    }

    // ═══════════════════════════════════════
    //  FOOTER ON ALL PAGES
    // ═══════════════════════════════════════
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Bottom line
        doc.setDrawColor(SECONDARY[0], SECONDARY[1], SECONDARY[2]);
        doc.setLineWidth(0.5);
        doc.line(M, pageH - 14, pageW - M, pageH - 14);

        // Footer text
        setF('normal', 7, GRAY_TEXT);
        doc.text(
            'Sanatorio Argentino · Gestión de Calidad bajo Normas ISO 9001:2015 · Documento Confidencial',
            M, pageH - 9
        );

        setF('bold', 7, GRAY_TEXT);
        doc.text(`Pág. ${i}/${totalPages}`, pageW - M, pageH - 9, { align: 'right' });
    }

    // ─── Save ───
    const fileName = `Validacion_${report.tracking_id || 'caso'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};
