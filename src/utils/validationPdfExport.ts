/**
 * Validation, Case Dossier & Felicitación PDF Export Engine
 * Sanatorio Argentino — Sistema de Gestión de Calidad (Estética Calidad-QOAG)
 *
 * Includes:
 * 1. Dedicated "Reconocimiento Institucional / Certificado de Felicitación" PDF
 * 2. Upgraded "Informe de Resolución y Validación de Calidad" PDF
 * 3. "Comprobante de Reporte / Felicitación" PDF for immediate download after submission
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    PDF_COLORS,
    loadLogoImage,
    drawLogoBadge,
    sanitizePdfText,
    drawFiveStarsRow,
    drawExcellenceMedal,
    drawVectorStar,
    applyInstitutionalFooters,
} from './pdfTheme';

export interface SectorAssignment {
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
    management_type?: string;
}

export interface ReportData {
    id?: string;
    tracking_id: string;
    content: string;
    ai_summary?: string;
    ai_urgency?: string;
    ai_category?: string;
    sector?: string;
    origin_sector?: string;
    reporter_sector?: string;
    status: string;
    created_at: string;
    resolved_at?: string;
    resolution_notes?: string;
    immediate_action?: string;
    root_cause?: string;
    corrective_plan?: string;
    implementation_date?: string;
    resolution_evidence_urls?: string[];
    assigned_to?: string;
    evidence_urls?: string[];
    finding_type?: string;
    resolution_history?: any[];
    quality_observations?: string;
    contact_name?: string | null;
    contact_number?: string | null;
    is_anonymous?: boolean;
    notes?: string;
    management_type?: string;
}

export interface ResponsableInfo {
    display_name?: string | null;
    phone_number?: string | null;
}

/**
 * Determines whether a report represents a Felicitación / Reconocimiento.
 */
export const isFelicitacionReport = (report: Partial<ReportData>): boolean => {
    const ft = (report.finding_type || '').toLowerCase();
    const cat = (report.ai_category || '').toLowerCase();
    const sum = (report.ai_summary || '').toLowerCase();
    const mgmt = (report.management_type || '').toLowerCase();
    return (
        ft.includes('felicitac') ||
        cat.includes('felicitac') ||
        mgmt === 'felicitacion' ||
        sum.includes('felicitación para') ||
        sum.includes('felicitacion para')
    );
};

const resolveSectorLabel = (
    sectorValue: string | undefined,
    sectorOptions: { value: string; label: string }[]
): string => {
    if (!sectorValue) return 'Sin especificar';
    const found = sectorOptions.find(
        (s) => s.value === sectorValue || s.label.toLowerCase() === sectorValue.toLowerCase()
    );
    return sanitizePdfText(found ? found.label : sectorValue);
};

const resolveResponsableName = (
    phone: string | undefined,
    responsables: ResponsableInfo[]
): string | null => {
    if (!phone || responsables.length === 0) return null;
    const normalized = phone.replace(/\D/g, '');
    if (!normalized) return null;
    const found = responsables.find((r) => {
        const rPhone = (r.phone_number || '').replace(/\D/g, '');
        return (
            rPhone &&
            (rPhone === normalized ||
                normalized.endsWith(rPhone) ||
                rPhone.endsWith(normalized))
        );
    });
    return found?.display_name ? sanitizePdfText(found.display_name) : null;
};

// ═══════════════════════════════════════════════════════════════════════════
//  1. CERTIFICADO / RECONOCIMIENTO DE FELICITACIÓN (ESPECIAL)
// ═══════════════════════════════════════════════════════════════════════════

export const generateFelicitacionPDF = async (
    report: ReportData,
    sectorAssignments: SectorAssignment[] = [],
    sectorOptions: { value: string; label: string }[] = [],
    responsables: ResponsableInfo[] = []
) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logo = await loadLogoImage('/logosanatorio.png');

    const pageW = doc.internal.pageSize.getWidth();   // 210
    const pageH = doc.internal.pageSize.getHeight();  // 297
    const M = 18;
    const CW = pageW - 2 * M;

    const setF = (
        style: 'normal' | 'bold' | 'italic' | 'bolditalic',
        size: number,
        color: [number, number, number] = PDF_COLORS.slate800
    ) => {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
    };

    const drawOrnamentalFrame = () => {
        // Soft warm ivory background tint inside frame
        doc.setFillColor(255, 254, 250);
        doc.rect(8, 8, pageW - 16, pageH - 16, 'F');

        // Outer Institutional Blue Frame
        doc.setDrawColor(...PDF_COLORS.primary);
        doc.setLineWidth(0.9);
        doc.roundedRect(8, 8, pageW - 16, pageH - 16, 4, 4, 'S');

        // Inner Prestige Gold Frame
        doc.setDrawColor(...PDF_COLORS.goldBright);
        doc.setLineWidth(0.4);
        doc.roundedRect(10.5, 10.5, pageW - 21, pageH - 21, 2.5, 2.5, 'S');

        // Corner Golden Stars
        drawVectorStar(doc, 13.5, 13.5, 1.8, PDF_COLORS.goldBright);
        drawVectorStar(doc, pageW - 13.5, 13.5, 1.8, PDF_COLORS.goldBright);
        drawVectorStar(doc, 13.5, pageH - 13.5, 1.8, PDF_COLORS.goldBright);
        drawVectorStar(doc, pageW - 13.5, pageH - 13.5, 1.8, PDF_COLORS.goldBright);
    };

    drawOrnamentalFrame();

    // ─── Header Banner ───
    const headerY = 15;
    const headerH = 38;
    doc.setFillColor(...PDF_COLORS.primary);
    doc.roundedRect(14, headerY, pageW - 28, headerH, 3, 3, 'F');

    // Bottom Golden + Teal Accent Ribbon on Header
    doc.setFillColor(...PDF_COLORS.goldBright);
    doc.rect(14, headerY + headerH - 3, pageW - 28, 3, 'F');

    // White Logo Badge (proportional)
    drawLogoBadge(doc, logo, 19, headerY + 5.5, 36, 24, 3);

    // Header Titles
    const titleX = 60;
    setF('bold', 7.5, PDF_COLORS.goldBorder);
    doc.text('DEPARTAMENTO DE GESTIÓN DE CALIDAD Y SEGURIDAD DEL PACIENTE', titleX, headerY + 10.5);

    setF('bold', 17, PDF_COLORS.white);
    doc.text('RECONOCIMIENTO INSTITUCIONAL', titleX, headerY + 19.5);

    setF('normal', 9, [219, 234, 254]);
    doc.text('Distinción a la Calidez Humana, Vocación de Servicio y Excelencia Asistencial', titleX, headerY + 26);

    // Ticket Pill inside Header
    const ticketLabel = `REGISTRO #${sanitizePdfText(report.tracking_id || 'S/N')}`;
    setF('bold', 8, PDF_COLORS.white);
    const pillW = doc.getTextWidth(ticketLabel) + 8;
    doc.setFillColor(...PDF_COLORS.primaryDark);
    doc.roundedRect(titleX, headerY + 28.5, pillW, 5.2, 1.5, 1.5, 'F');
    doc.text(ticketLabel, titleX + 4, headerY + 32.2);

    // Medal of Excellence on Right of Header
    drawExcellenceMedal(doc, pageW - 29, headerY + 17, 9.5);

    let y = headerY + headerH + 9;

    // ─── 5 Golden Stars & Dedication Intro ───
    drawFiveStarsRow(doc, pageW / 2, y, 8.5);
    y += 8.5;

    setF('italic', 10, PDF_COLORS.slate600);
    doc.text(
        'Por medio del presente documento, Sanatorio Argentino celebra y transmite una especial felicitación a:',
        pageW / 2,
        y,
        { align: 'center' }
    );
    y += 5.5;

    // ─── Sector(s) Destacado(s) Plaquette ───
    const activeAssignments = sectorAssignments.filter((a) => a.status !== 'rejected');
    const sectorNamesList: string[] =
        activeAssignments.length > 0
            ? Array.from(
                  new Set(
                      activeAssignments.map((a) => resolveSectorLabel(a.sector, sectorOptions))
                  )
              )
            : [resolveSectorLabel(report.sector, sectorOptions)];

    const sectorDisplay = sectorNamesList.join('  ·  ').toUpperCase();
    setF('bold', 14.5, PDF_COLORS.primary);
    const sectorLines = doc.splitTextToSize(sectorDisplay, CW - 24);
    const plaquetteH = Math.max(18, sectorLines.length * 6.5 + 10);

    // Gold-trimmed Plaquette
    doc.setFillColor(...PDF_COLORS.goldBg);
    doc.setDrawColor(...PDF_COLORS.goldBright);
    doc.setLineWidth(0.6);
    doc.roundedRect(M, y, CW, plaquetteH, 3.5, 3.5, 'FD');

    // Left & Right decorative bars inside plaquette
    doc.setFillColor(...PDF_COLORS.goldBright);
    doc.roundedRect(M + 2.5, y + 2.5, 2, plaquetteH - 5, 1, 1, 'F');
    doc.roundedRect(pageW - M - 4.5, y + 2.5, 2, plaquetteH - 5, 1, 1, 'F');

    setF('bold', 7, PDF_COLORS.gold);
    doc.text('SECTOR / EQUIPO DESTACADO', pageW / 2, y + 5.5, { align: 'center' });

    setF('bold', 14, PDF_COLORS.primary);
    sectorLines.forEach((line: string, idx: number) => {
        doc.text(line, pageW / 2, y + 12.5 + idx * 6.2, { align: 'center' });
    });

    y += plaquetteH + 7;

    // ─── Main Quote Box: Mensaje de Felicitación ───
    const rawContent = sanitizePdfText(report.content || 'Sin mensaje detallado.');
    setF('italic', 11, PDF_COLORS.slate800);
    const contentLines = doc.splitTextToSize(`"${rawContent}"`, CW - 28);
    const contentLineH = 5.6;

    // Determine sender attribution
    const senderName =
        !report.is_anonymous && report.contact_name
            ? sanitizePdfText(report.contact_name)
            : null;
    const originSectorName =
        report.reporter_sector || report.origin_sector
            ? resolveSectorLabel(report.reporter_sector || report.origin_sector, sectorOptions)
            : null;

    const attributionParts: string[] = [];
    if (senderName) attributionParts.push(`Enviado por: ${senderName}`);
    else attributionParts.push('Enviado por: Paciente / Familiar / Comunidad');
    if (originSectorName) attributionParts.push(`Sector Origen: ${originSectorName}`);

    const attributionText = attributionParts.join('   |   ');
    const quoteBoxH = Math.max(36, contentLines.length * contentLineH + 24);

    // Check if quoteBox fits on page 1
    if (y + quoteBoxH > pageH - 65) {
        doc.addPage();
        drawOrnamentalFrame();
        y = 22;
    }

    // White elevated card with golden border and warm header strip
    doc.setFillColor(...PDF_COLORS.white);
    doc.setDrawColor(...PDF_COLORS.goldBorder);
    doc.setLineWidth(0.45);
    doc.roundedRect(M, y, CW, quoteBoxH, 3.5, 3.5, 'FD');

    // Left golden accent bar
    doc.setFillColor(...PDF_COLORS.goldBright);
    doc.roundedRect(M, y, 3.2, quoteBoxH, 1.5, 1.5, 'F');

    // Top label inside quote card
    setF('bold', 8, PDF_COLORS.gold);
    doc.text('MENSAJE DE RECONOCIMIENTO Y GRATITUD', M + 9, y + 7.5);

    // Decorative divider line under label
    doc.setDrawColor(254, 243, 199);
    doc.setLineWidth(0.3);
    doc.line(M + 9, y + 9.8, pageW - M - 8, y + 9.8);

    // Quote Content
    setF('italic', 10.8, PDF_COLORS.slate800);
    contentLines.forEach((line: string, i: number) => {
        doc.text(line, M + 10, y + 16.5 + i * contentLineH);
    });

    // Attribution line at bottom of quote card
    setF('bold', 8.2, PDF_COLORS.slate500);
    doc.text(attributionText, pageW - M - 8, y + quoteBoxH - 4.5, { align: 'right' });

    y += quoteBoxH + 6;

    // ─── Metadata & Traceability Card (4 Columns) ───
    if (y + 22 > pageH - 55) {
        doc.addPage();
        drawOrnamentalFrame();
        y = 22;
    }

    const metaH = 17;
    doc.setFillColor(...PDF_COLORS.slate50);
    doc.setDrawColor(...PDF_COLORS.slate200);
    doc.setLineWidth(0.35);
    doc.roundedRect(M, y, CW, metaH, 2.5, 2.5, 'FD');

    const colW = CW / 4;
    const createdDateStr = report.created_at
        ? new Date(report.created_at).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          })
        : new Date().toLocaleDateString('es-AR');

    // Determine responsible(s)
    const respNames: string[] = [];
    if (activeAssignments.length > 0) {
        activeAssignments.forEach((a) => {
            const rName = resolveResponsableName(a.assigned_phone, responsables);
            if (rName && !respNames.includes(rName)) respNames.push(rName);
        });
    }
    if (respNames.length === 0 && report.assigned_to) {
        const singleResp = resolveResponsableName(report.assigned_to, responsables);
        respNames.push(singleResp || sanitizePdfText(report.assigned_to));
    }
    const destinatarioText =
        respNames.length > 0
            ? respNames.join(', ').substring(0, 26)
            : 'Equipo del Sector';

    const metaCols = [
        { label: 'CÓDIGO DE SEGUIMIENTO', value: `#${sanitizePdfText(report.tracking_id || 'S/N')}` },
        { label: 'FECHA DE REGISTRO', value: sanitizePdfText(createdDateStr) },
        { label: 'REFERENTE / DESTINATARIO', value: destinatarioText },
        { label: 'CLASIFICACIÓN', value: 'Felicitación Institucional' },
    ];

    metaCols.forEach((col, idx) => {
        const cx = M + idx * colW + 4.5;
        if (idx > 0) {
            doc.setDrawColor(...PDF_COLORS.slate200);
            doc.setLineWidth(0.25);
            doc.line(M + idx * colW, y + 3, M + idx * colW, y + metaH - 3);
        }
        setF('bold', 6.5, PDF_COLORS.slate500);
        doc.text(col.label, cx, y + 6);
        setF('bold', 8.8, PDF_COLORS.slate800);
        doc.text(col.value, cx, y + 12.2);
    });

    y += metaH + 6;

    // ─── Sector Acknowledgment / Response (if any) ───
    const sectorResponses: { sectorLabel: string; message: string; author?: string | null }[] = [];

    if (activeAssignments.length > 0) {
        activeAssignments.forEach((a) => {
            const msg = (a.immediate_action || a.resolution_notes || '').trim();
            if (msg && !msg.startsWith('Origen:')) {
                sectorResponses.push({
                    sectorLabel: resolveSectorLabel(a.sector, sectorOptions),
                    message: sanitizePdfText(msg),
                    author: resolveResponsableName(a.assigned_phone, responsables),
                });
            }
        });
    }

    if (sectorResponses.length === 0 && (report.immediate_action || report.resolution_notes)) {
        const rawNote = (report.immediate_action || report.resolution_notes || '').trim();
        const cleanedNote = rawNote.replace(/^Origen:.*?(?=\n|$)/, '').trim();
        if (cleanedNote && !cleanedNote.startsWith('Origen:')) {
            sectorResponses.push({
                sectorLabel: resolveSectorLabel(report.sector, sectorOptions),
                message: sanitizePdfText(cleanedNote),
                author: resolveResponsableName(report.assigned_to, responsables),
            });
        }
    }

    for (const resp of sectorResponses) {
        setF('normal', 9.5, PDF_COLORS.slate800);
        const respLines = doc.splitTextToSize(resp.message, CW - 22);
        const respBoxH = respLines.length * 4.8 + 16;

        if (y + respBoxH > pageH - 52) {
            doc.addPage();
            drawOrnamentalFrame();
            y = 22;
        }

        doc.setFillColor(...PDF_COLORS.emeraldBg);
        doc.setDrawColor(...PDF_COLORS.emeraldBorder);
        doc.setLineWidth(0.35);
        doc.roundedRect(M, y, CW, respBoxH, 3, 3, 'FD');

        doc.setFillColor(...PDF_COLORS.emerald);
        doc.roundedRect(M, y, 2.8, respBoxH, 1.2, 1.2, 'F');

        const headerTitle = resp.author
            ? `ACUSE Y AGRADECIMIENTO DEL SECTOR (${resp.sectorLabel.toUpperCase()} - ${resp.author})`
            : `ACUSE Y AGRADECIMIENTO DEL SECTOR (${resp.sectorLabel.toUpperCase()})`;

        setF('bold', 7.8, PDF_COLORS.emerald);
        doc.text(headerTitle, M + 8, y + 6.8);

        setF('normal', 9.5, PDF_COLORS.slate800);
        respLines.forEach((l: string, idx: number) => {
            doc.text(l, M + 8, y + 12.8 + idx * 4.8);
        });

        y += respBoxH + 5;
    }

    // ─── Quality Observations (if any) ───
    if (report.quality_observations && report.quality_observations.trim()) {
        const cleanObs = sanitizePdfText(report.quality_observations);
        setF('normal', 9.5, PDF_COLORS.slate800);
        const obsLines = doc.splitTextToSize(cleanObs, CW - 22);
        const obsBoxH = obsLines.length * 4.8 + 16;

        if (y + obsBoxH > pageH - 52) {
            doc.addPage();
            drawOrnamentalFrame();
            y = 22;
        }

        doc.setFillColor(...PDF_COLORS.primaryLight);
        doc.setDrawColor(191, 219, 254);
        doc.setLineWidth(0.35);
        doc.roundedRect(M, y, CW, obsBoxH, 3, 3, 'FD');

        doc.setFillColor(...PDF_COLORS.primary);
        doc.roundedRect(M, y, 2.8, obsBoxH, 1.2, 1.2, 'F');

        setF('bold', 7.8, PDF_COLORS.primary);
        doc.text('MENSAJE DEL DEPARTAMENTO DE GESTIÓN DE CALIDAD', M + 8, y + 6.8);

        setF('normal', 9.5, PDF_COLORS.slate800);
        obsLines.forEach((l: string, idx: number) => {
            doc.text(l, M + 8, y + 12.8 + idx * 4.8);
        });

        y += obsBoxH + 5;
    }

    // ─── Institutional Signature & Seal Block at Bottom ───
    const sigBlockY = Math.max(y + 8, pageH - 46);
    if (sigBlockY + 26 <= pageH - 16) {
        // Left signature line
        doc.setDrawColor(...PDF_COLORS.slate400);
        doc.setLineWidth(0.35);
        doc.line(M + 6, sigBlockY + 12, M + 66, sigBlockY + 12);
        setF('bold', 8, PDF_COLORS.primary);
        doc.text('Departamento de Gestión de Calidad', M + 36, sigBlockY + 16.5, { align: 'center' });
        setF('normal', 7, PDF_COLORS.slate500);
        doc.text('Sanatorio Argentino · Normas ITAES', M + 36, sigBlockY + 20.5, { align: 'center' });

        // Center Institutional Seal Badge
        const sealX = pageW / 2;
        const sealY = sigBlockY + 11;
        doc.setFillColor(...PDF_COLORS.goldBg);
        doc.setDrawColor(...PDF_COLORS.goldBright);
        doc.setLineWidth(0.5);
        doc.circle(sealX, sealY, 9.5, 'FD');
        doc.setDrawColor(...PDF_COLORS.primary);
        doc.setLineWidth(0.25);
        doc.circle(sealX, sealY, 7.8, 'S');
        drawVectorStar(doc, sealX, sealY - 2, 2.6, PDF_COLORS.goldBright);
        setF('bold', 4.8, PDF_COLORS.primary);
        doc.text('CALIDAD', sealX, sealY + 3.2, { align: 'center' });
        doc.text('CERTIFICADA', sealX, sealY + 5.5, { align: 'center' });

        // Right signature line
        doc.setDrawColor(...PDF_COLORS.slate400);
        doc.setLineWidth(0.35);
        doc.line(pageW - M - 66, sigBlockY + 12, pageW - M - 6, sigBlockY + 12);
        setF('bold', 8, PDF_COLORS.primary);
        doc.text('Dirección Institucional', pageW - M - 36, sigBlockY + 16.5, { align: 'center' });
        setF('normal', 7, PDF_COLORS.slate500);
        doc.text('Reconocimiento al Equipo de Salud', pageW - M - 36, sigBlockY + 20.5, { align: 'center' });
    }

    // ─── Footer ───
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        setF('bold', 7, PDF_COLORS.slate500);
        doc.text(
            `Emitido el ${new Date().toLocaleDateString('es-AR')} · Sanatorio Argentino · Sistema de Gestión de Calidad DORA`,
            pageW / 2,
            pageH - 12.5,
            { align: 'center' }
        );
    }

    const fileName = `Felicitacion_${sanitizePdfText(report.tracking_id || 'Reconocimiento')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};

// ═══════════════════════════════════════════════════════════════════════════
//  2. INFORME DE VALIDACIÓN Y RESOLUCIÓN DE CASO (HALLAZGOS / DESVÍOS / EA)
// ═══════════════════════════════════════════════════════════════════════════

export const generateValidationPDF = async (
    report: ReportData,
    sectorAssignments: SectorAssignment[] = [],
    sectorOptions: { value: string; label: string }[] = [],
    responsables: ResponsableInfo[] = []
) => {
    // Automatically route Felicitaciones to the dedicated prestigious template!
    if (isFelicitacionReport(report)) {
        return generateFelicitacionPDF(report, sectorAssignments, sectorOptions, responsables);
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const logo = await loadLogoImage('/logosanatorio.png');

    const pageW = doc.internal.pageSize.getWidth();   // 210
    const pageH = doc.internal.pageSize.getHeight();  // 297
    const M = 16;
    const CW = pageW - 2 * M;
    let y = 0;

    const activeAssignments = sectorAssignments.filter((a) => a.status !== 'rejected');
    const respondedAssignments = sectorAssignments.filter(
        (a) => a.status === 'resolved' || a.status === 'quality_validation'
    );
    const isMultiSector = sectorAssignments.length > 0;

    const setF = (
        style: 'normal' | 'bold' | 'italic',
        size: number,
        color: [number, number, number] = PDF_COLORS.slate800
    ) => {
        doc.setFont('helvetica', style);
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
    };

    const drawPageHeaderBar = (isContinuation = false) => {
        if (!isContinuation) {
            // Full primary header on Page 1
            doc.setFillColor(...PDF_COLORS.primary);
            doc.rect(0, 0, pageW, 42, 'F');

            // Secondary Teal accent strip
            doc.setFillColor(...PDF_COLORS.secondary);
            doc.rect(0, 42, pageW, 2.2, 'F');

            // Proportional Logo in crisp white badge
            drawLogoBadge(doc, logo, M, 7, 36, 26, 3);

            const textX = M + 41;
            setF('bold', 7.5, [186, 230, 253]);
            doc.text('DEPARTAMENTO DE GESTIÓN DE CALIDAD Y SEGURIDAD DEL PACIENTE', textX, 13.5);

            setF('bold', 17, PDF_COLORS.white);
            doc.text('INFORME DE RESOLUCIÓN Y CALIDAD', textX, 21.5);

            setF('normal', 9.5, [224, 242, 254]);
            doc.text('Dossier de Trazabilidad, Análisis de Causa y Plan de Acción', textX, 27.5);

            // Tracking ID Pill (using solid RGB, fixing CMYK bug)
            const ticketText = `CASO #${sanitizePdfText(report.tracking_id || 'SIN-ID')}`;
            setF('bold', 8.5, PDF_COLORS.white);
            const ticketW = doc.getTextWidth(ticketText) + 9;
            doc.setFillColor(...PDF_COLORS.primaryDark);
            doc.roundedRect(textX, 30.5, ticketW, 6.5, 2, 2, 'F');
            doc.text(ticketText, textX + 4.5, 35);

            // Date on right
            setF('normal', 8, [200, 225, 245]);
            const dateStr = new Date().toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            doc.text(`Emitido: ${sanitizePdfText(dateStr)}`, pageW - M, 35, { align: 'right' });

            y = 51;
        } else {
            // Compact running header on subsequent pages
            doc.setFillColor(...PDF_COLORS.primary);
            doc.rect(0, 0, pageW, 14, 'F');
            doc.setFillColor(...PDF_COLORS.secondary);
            doc.rect(0, 14, pageW, 1.2, 'F');

            setF('bold', 8, PDF_COLORS.white);
            doc.text('SANATORIO ARGENTINO · GESTIÓN DE CALIDAD', M, 9);
            doc.text(`CASO #${sanitizePdfText(report.tracking_id || '')}`, pageW - M, 9, { align: 'right' });

            y = 22;
        }
    };

    const checkBreak = (neededHeight: number) => {
        if (y + neededHeight > pageH - 20) {
            doc.addPage();
            drawPageHeaderBar(true);
        }
    };

    drawPageHeaderBar(false);

    // ─── 1. Case Metadata Grid Card (3 columns x 2 rows) ───
    const cardH = 34;
    doc.setFillColor(...PDF_COLORS.slate50);
    doc.setDrawColor(...PDF_COLORS.slate200);
    doc.setLineWidth(0.35);
    doc.roundedRect(M, y, CW, cardH, 3, 3, 'FD');

    // Internal grid lines
    const colW = CW / 3;
    doc.setDrawColor(...PDF_COLORS.slate200);
    doc.setLineWidth(0.25);
    doc.line(M + colW, y + 3, M + colW, y + cardH - 3);
    doc.line(M + colW * 2, y + 3, M + colW * 2, y + cardH - 3);
    doc.line(M + 4, y + cardH / 2, pageW - M - 4, y + cardH / 2);

    // Row 1: Sector | Urgencia | Clasificación
    setF('bold', 6.8, PDF_COLORS.slate500);
    doc.text('SECTOR DESTINO', M + 5, y + 6);
    doc.text('PRIORIDAD / TRIAGE', M + colW + 5, y + 6);
    doc.text('CLASIFICACIÓN OPERATIVA', M + colW * 2 + 5, y + 6);

    setF('bold', 9.5, PDF_COLORS.slate900);
    const sectorDisplay = resolveSectorLabel(report.sector, sectorOptions);
    doc.text(sectorDisplay.substring(0, 32), M + 5, y + 12.5);

    // Urgency Pill
    const urgencyMap: Record<
        string,
        { bg: [number, number, number]; text: [number, number, number]; label: string }
    > = {
        Verde: { bg: [220, 252, 231], text: [21, 128, 61], label: 'Riesgo Leve (Verde)' },
        Amarillo: { bg: [254, 249, 195], text: [161, 98, 7], label: 'Riesgo Medio (Amarillo)' },
        Rojo: { bg: [254, 226, 226], text: [185, 28, 28], label: 'Riesgo Crítico (Rojo)' },
    };
    const urg = urgencyMap[report.ai_urgency || ''] || {
        bg: PDF_COLORS.slate200,
        text: PDF_COLORS.slate700,
        label: sanitizePdfText(report.ai_urgency || 'Normal'),
    };
    setF('bold', 8, urg.text);
    const urgW = doc.getTextWidth(urg.label) + 7;
    doc.setFillColor(...urg.bg);
    doc.roundedRect(M + colW + 5, y + 8, urgW, 6, 1.8, 1.8, 'F');
    doc.text(urg.label, M + colW + 8.5, y + 12.2);

    setF('bold', 9, PDF_COLORS.slate800);
    doc.text(sanitizePdfText(report.ai_category || 'Sin clasificar').substring(0, 32), M + colW * 2 + 5, y + 12.5);

    // Row 2: Fecha de Creación | Estado | Tipo / Origen
    const row2Y = y + cardH / 2;
    setF('bold', 6.8, PDF_COLORS.slate500);
    doc.text('FECHA DE REPORTE', M + 5, row2Y + 6);
    doc.text('ESTADO DEL CASO', M + colW + 5, row2Y + 6);
    doc.text('TIPO DE HALLAZGO / ORIGEN', M + colW * 2 + 5, row2Y + 6);

    setF('normal', 9.5, PDF_COLORS.slate800);
    const createdStr = report.created_at
        ? new Date(report.created_at).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
          })
        : '-';
    doc.text(createdStr, M + 5, row2Y + 12.5);

    const statusLabels: Record<
        string,
        { label: string; bg: [number, number, number]; text: [number, number, number] }
    > = {
        quality_validation: { label: 'En Validación de Calidad', bg: PDF_COLORS.purpleBg, text: PDF_COLORS.purple },
        resolved: { label: 'Caso Resuelto y Cerrado', bg: PDF_COLORS.emeraldBg, text: PDF_COLORS.emerald },
        pending_resolution: { label: 'En Gestión por Sector', bg: PDF_COLORS.primaryLight, text: PDF_COLORS.primary },
        multi_sector_pending: { label: 'Gestión Multi-Sector', bg: PDF_COLORS.purpleBg, text: PDF_COLORS.purple },
        pending: { label: 'Pendiente de Derivación', bg: PDF_COLORS.amberBg, text: PDF_COLORS.amber },
        analyzed: { label: 'Analizado por IA', bg: PDF_COLORS.primaryLight, text: PDF_COLORS.primary },
    };
    const st = statusLabels[report.status] || {
        label: sanitizePdfText(report.status || 'Pendiente'),
        bg: PDF_COLORS.slate200,
        text: PDF_COLORS.slate700,
    };
    setF('bold', 8, st.text);
    const stW = doc.getTextWidth(st.label) + 7;
    doc.setFillColor(...st.bg);
    doc.roundedRect(M + colW + 5, row2Y + 8, stW, 6, 1.8, 1.8, 'F');
    doc.text(st.label, M + colW + 8.5, row2Y + 12.2);

    const originMatch = report.resolution_notes?.match(/Origen:\s*([^.\n]+)/);
    const originText = sanitizePdfText(
        report.finding_type || (originMatch ? originMatch[1].trim() : 'Observación / Hallazgo')
    );
    setF('normal', 9, PDF_COLORS.slate800);
    doc.text(originText.substring(0, 32), M + colW * 2 + 5, row2Y + 12.5);

    y += cardH + 6;

    // ─── Multi-Sector Progress Bar (if applicable) ───
    if (isMultiSector) {
        checkBreak(18);
        doc.setFillColor(...PDF_COLORS.purpleBg);
        doc.setDrawColor(...PDF_COLORS.purpleBorder);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, CW, 14, 2.5, 2.5, 'FD');

        setF('bold', 7, PDF_COLORS.purple);
        doc.text('PROGRESO DE RESPUESTA MULTI-SECTOR', M + 5, y + 5.5);

        const barX = M + 5;
        const barW = CW - 48;
        const barY = y + 8.2;
        doc.setFillColor(221, 214, 254);
        doc.roundedRect(barX, barY, barW, 2.8, 1.4, 1.4, 'F');

        const progress =
            activeAssignments.length > 0
                ? respondedAssignments.length / activeAssignments.length
                : 0;
        if (progress > 0) {
            doc.setFillColor(...PDF_COLORS.purple);
            doc.roundedRect(barX, barY, Math.max(4, barW * progress), 2.8, 1.4, 1.4, 'F');
        }

        setF('bold', 8.5, PDF_COLORS.purple);
        doc.text(
            `${respondedAssignments.length}/${activeAssignments.length} sectores`,
            pageW - M - 5,
            y + 9.8,
            { align: 'right' }
        );

        y += 19;
    }

    // ─── Helper: Styled Content Box with Left Accent Bar ───
    const drawSectionBox = (
        title: string,
        content: string,
        bgColor: [number, number, number],
        borderColor: [number, number, number],
        accentColor: [number, number, number],
        titleColor: [number, number, number],
        footerNote?: string
    ) => {
        const cleanBody = sanitizePdfText(content);
        if (!cleanBody) return;

        setF('normal', 9.5);
        const lines = doc.splitTextToSize(cleanBody, CW - 18);
        const lineH = 4.9;
        const extraFooter = footerNote ? 6 : 0;
        const boxH = lines.length * lineH + 15 + extraFooter;

        checkBreak(boxH + 4);

        doc.setFillColor(...bgColor);
        doc.setDrawColor(...borderColor);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, CW, boxH, 2.8, 2.8, 'FD');

        // Left accent strip
        doc.setFillColor(...accentColor);
        doc.roundedRect(M, y, 2.8, boxH, 1.2, 1.2, 'F');

        setF('bold', 8, titleColor);
        doc.text(sanitizePdfText(title).toUpperCase(), M + 7, y + 6.8);

        setF('normal', 9.5, PDF_COLORS.slate800);
        lines.forEach((line: string, i: number) => {
            doc.text(line, M + 7, y + 12.8 + i * lineH);
        });

        if (footerNote) {
            setF('bold', 8, titleColor);
            doc.text(sanitizePdfText(footerNote), M + 7, y + boxH - 3.5);
        }

        y += boxH + 4;
    };

    // ─── 2. AI Summary & Original Report ───
    if (report.ai_summary) {
        drawSectionBox(
            'Resumen Ejecutivo (Síntesis IA)',
            report.ai_summary,
            PDF_COLORS.primaryLight,
            [191, 219, 254],
            PDF_COLORS.primary,
            PDF_COLORS.primary
        );
    }

    drawSectionBox(
        'Descripción Original del Reporte',
        report.content || 'Sin contenido registrado.',
        PDF_COLORS.white,
        PDF_COLORS.slate200,
        PDF_COLORS.slate500,
        PDF_COLORS.slate600
    );

    // ─── 3. Observaciones de Calidad (if any) ───
    if (report.quality_observations && report.quality_observations.trim()) {
        drawSectionBox(
            'Observaciones de Auditoría de Calidad',
            report.quality_observations.trim(),
            PDF_COLORS.purpleBg,
            PDF_COLORS.purpleBorder,
            PDF_COLORS.purple,
            PDF_COLORS.purple
        );
    }

    // ─── 4. Gestión y Resolución por Sector ───
    if (isMultiSector) {
        const respondedOnly = sectorAssignments.filter(
            (a) =>
                a.status === 'resolved' ||
                a.status === 'quality_validation' ||
                (a.status === 'pending' &&
                    report.status === 'quality_validation' &&
                    !!(report.resolution_notes || report.immediate_action))
        );

        const sectorsToRender =
            respondedOnly.length > 0
                ? respondedOnly
                : report.resolution_notes || report.root_cause || report.corrective_plan
                ? [
                      {
                          id: 'report-level',
                          sector: report.sector || 'Sector',
                          status: report.status,
                          immediate_action: report.immediate_action || report.resolution_notes,
                          root_cause: report.root_cause,
                          corrective_plan: report.corrective_plan,
                          implementation_date: report.implementation_date,
                          resolution_evidence_urls: report.resolution_evidence_urls,
                      } as SectorAssignment,
                  ]
                : activeAssignments;

        for (let i = 0; i < sectorsToRender.length; i++) {
            const assignment = sectorsToRender[i];
            const sectorLabel = resolveSectorLabel(assignment.sector, sectorOptions);

            checkBreak(18);
            doc.setFillColor(...PDF_COLORS.primary);
            doc.roundedRect(M, y, CW, 10.5, 2.5, 2.5, 'F');

            setF('bold', 9.5, PDF_COLORS.white);
            doc.text(`${i + 1}. SECTOR: ${sectorLabel.toUpperCase()}`, M + 5, y + 6.8);

            const resolved = assignment.status === 'resolved';
            const statusBadge = resolved
                ? 'RESUELTO'
                : assignment.status === 'quality_validation'
                ? 'EN VALIDACIÓN'
                : 'PENDIENTE';
            setF('bold', 7, PDF_COLORS.white);
            const badgeW = doc.getTextWidth(statusBadge) + 7;
            doc.setFillColor(
                ...(resolved
                    ? PDF_COLORS.emerald
                    : assignment.status === 'quality_validation'
                    ? PDF_COLORS.purple
                    : PDF_COLORS.amber)
            );
            doc.roundedRect(pageW - M - badgeW - 3.5, y + 2.2, badgeW, 6, 1.5, 1.5, 'F');
            doc.text(statusBadge, pageW - M - badgeW, y + 6.3);

            y += 13.5;

            const responsableName = resolveResponsableName(assignment.assigned_phone, responsables);
            if (responsableName || assignment.assigned_phone) {
                checkBreak(7);
                setF('bold', 8, PDF_COLORS.slate600);
                const phoneClean = sanitizePdfText(assignment.assigned_phone);
                const nameLabel = responsableName
                    ? `Responsable Asignado: ${responsableName}${phoneClean ? ` (${phoneClean})` : ''}`
                    : `Teléfono Asignado: ${phoneClean}`;
                doc.text(nameLabel, M + 2, y);
                y += 5;
            }

            const effectiveAction =
                assignment.immediate_action ||
                assignment.resolution_notes ||
                (sectorsToRender.length === 1 ? report.resolution_notes : '');
            const effectiveRootCause =
                assignment.root_cause || (sectorsToRender.length === 1 ? report.root_cause : '');
            const effectivePlan =
                assignment.corrective_plan ||
                (sectorsToRender.length === 1 ? report.corrective_plan : '');
            const effectiveImplDate =
                assignment.implementation_date ||
                (sectorsToRender.length === 1 ? report.implementation_date : '');

            if (effectiveAction) {
                const isSystemOriginNote =
                    effectiveAction.startsWith('Origen: ') && !effectiveAction.includes('\n');
                const cleanAction = isSystemOriginNote
                    ? ''
                    : effectiveAction.replace(/^Origen:.*?(?=\n|$)/, '').trim() ||
                      effectiveAction.trim();

                if (cleanAction) {
                    drawSectionBox(
                        '1. Contención / Acción Inmediata',
                        cleanAction,
                        PDF_COLORS.primaryLight,
                        [191, 219, 254],
                        [37, 99, 235],
                        [29, 78, 216]
                    );
                }
            }

            if (effectiveRootCause) {
                drawSectionBox(
                    '2. Análisis de Causa Raíz (RCA)',
                    effectiveRootCause,
                    PDF_COLORS.amberBg,
                    PDF_COLORS.amberBorder,
                    PDF_COLORS.amber,
                    PDF_COLORS.amber
                );
            }

            if (effectivePlan) {
                const implFooter = effectiveImplDate
                    ? `Fecha Comprometida de Implementación: ${new Date(effectiveImplDate).toLocaleDateString('es-AR')}`
                    : undefined;
                drawSectionBox(
                    '3. Plan de Acción Correctiva / Preventiva',
                    effectivePlan,
                    PDF_COLORS.emeraldBg,
                    PDF_COLORS.emeraldBorder,
                    PDF_COLORS.emerald,
                    PDF_COLORS.emerald,
                    implFooter
                );
            }

            if (!effectiveAction && !effectiveRootCause && !effectivePlan) {
                checkBreak(12);
                doc.setFillColor(...PDF_COLORS.slate50);
                doc.setDrawColor(...PDF_COLORS.slate200);
                doc.roundedRect(M, y, CW, 9.5, 2, 2, 'FD');
                setF('italic', 8.5, PDF_COLORS.slate500);
                doc.text('Sin descargo o resolución registrada por este sector aún.', M + 5, y + 6.2);
                y += 13;
            }

            if (i < sectorsToRender.length - 1) {
                y += 2;
            }
        }
    } else {
        // Single-sector view
        checkBreak(16);
        doc.setFillColor(...PDF_COLORS.primary);
        doc.roundedRect(M, y, CW, 10, 2.5, 2.5, 'F');
        setF('bold', 9.5, PDF_COLORS.white);
        doc.text('GESTIÓN Y RESOLUCIÓN DEL CASO', M + 5, y + 6.5);
        y += 13.5;

        const singleResponsableName = resolveResponsableName(report.assigned_to, responsables);
        if (singleResponsableName || report.assigned_to) {
            checkBreak(7);
            setF('bold', 8.5, PDF_COLORS.slate600);
            const cleanAssigned = sanitizePdfText(report.assigned_to);
            const nameText = singleResponsableName
                ? `Responsable Asignado: ${singleResponsableName}${cleanAssigned ? ` (${cleanAssigned})` : ''}`
                : `Responsable Asignado: ${cleanAssigned}`;
            doc.text(nameText, M + 2, y);
            y += 5.5;
        }

        const effectiveLegacyAction = report.immediate_action || report.resolution_notes;
        let hasAnyResolution = false;

        if (effectiveLegacyAction) {
            const isSystemOriginNote =
                effectiveLegacyAction.startsWith('Origen: ') && !effectiveLegacyAction.includes('\n');
            const cleanLegacy = isSystemOriginNote
                ? ''
                : effectiveLegacyAction.replace(/^Origen:.*?(?=\n|$)/, '').trim() ||
                  effectiveLegacyAction.trim();
            if (cleanLegacy) {
                hasAnyResolution = true;
                drawSectionBox(
                    '1. Contención / Acción Inmediata',
                    cleanLegacy,
                    PDF_COLORS.primaryLight,
                    [191, 219, 254],
                    [37, 99, 235],
                    [29, 78, 216]
                );
            }
        }

        if (report.root_cause) {
            hasAnyResolution = true;
            drawSectionBox(
                '2. Análisis de Causa Raíz (RCA)',
                report.root_cause,
                PDF_COLORS.amberBg,
                PDF_COLORS.amberBorder,
                PDF_COLORS.amber,
                PDF_COLORS.amber
            );
        }

        if (report.corrective_plan) {
            hasAnyResolution = true;
            const implFooter = report.implementation_date
                ? `Fecha Comprometida de Implementación: ${new Date(report.implementation_date).toLocaleDateString('es-AR')}`
                : undefined;
            drawSectionBox(
                '3. Plan de Acción Correctiva / Preventiva',
                report.corrective_plan,
                PDF_COLORS.emeraldBg,
                PDF_COLORS.emeraldBorder,
                PDF_COLORS.emerald,
                PDF_COLORS.emerald,
                implFooter
            );
        }

        if (!hasAnyResolution) {
            checkBreak(12);
            doc.setFillColor(...PDF_COLORS.slate50);
            doc.setDrawColor(...PDF_COLORS.slate200);
            doc.roundedRect(M, y, CW, 10, 2, 2, 'FD');
            setF('italic', 8.5, PDF_COLORS.slate500);
            doc.text('El caso aún no registra descargo o plan de acción completado.', M + 5, y + 6.5);
            y += 14;
        }
    }

    // ─── 5. Rejection History (if any) ───
    if (report.resolution_history && report.resolution_history.length > 0) {
        checkBreak(22);
        y += 2;

        doc.setFillColor(...PDF_COLORS.redBg);
        doc.setDrawColor(...PDF_COLORS.redBorder);
        doc.setLineWidth(0.35);
        doc.roundedRect(M, y, CW, 9.5, 2.5, 2.5, 'FD');
        setF('bold', 8.5, PDF_COLORS.red);
        doc.text(
            `HISTORIAL DE REVISIONES DEVUELTAS POR CALIDAD (${report.resolution_history.length})`,
            M + 5,
            y + 6.2
        );
        y += 12.5;

        report.resolution_history.forEach((entry: any, idx: number) => {
            checkBreak(26);
            doc.setFillColor(255, 250, 250);
            doc.setDrawColor(...PDF_COLORS.redBorder);
            doc.roundedRect(M, y, CW, 8, 2, 2, 'FD');
            setF('bold', 8, PDF_COLORS.red);
            const rejDate = entry.rejected_at
                ? new Date(entry.rejected_at).toLocaleDateString('es-AR')
                : '-';
            doc.text(`Revisión #${idx + 1} — Devuelto el ${rejDate}`, M + 4, y + 5.3);
            setF('italic', 8, PDF_COLORS.red);
            doc.text(
                `Motivo: "${sanitizePdfText(entry.reject_reason || 'Sin especificar').substring(0, 65)}"`,
                M + CW * 0.42,
                y + 5.3
            );
            y += 10.5;

            const prevItems = [
                { label: 'Acción:', val: entry.previous_data?.immediate_action },
                { label: 'RCA:', val: entry.previous_data?.root_cause },
                { label: 'Plan:', val: entry.previous_data?.corrective_plan },
            ];
            prevItems.forEach((item) => {
                if (item.val) {
                    setF('bold', 7.8, PDF_COLORS.slate600);
                    doc.text(item.label, M + 5, y);
                    setF('normal', 8.2, PDF_COLORS.slate700);
                    const lines = doc.splitTextToSize(sanitizePdfText(item.val), CW - 28);
                    doc.text(lines.slice(0, 2), M + 22, y);
                    y += Math.min(lines.length, 2) * 4.4 + 2;
                }
            });
            y += 3;
        });
    }

    // ─── 6. Activity Log Timeline (if notes present) ───
    if (report.notes && report.notes.trim()) {
        const entries = report.notes
            .split('\n\n')
            .map((n) => n.trim())
            .filter(Boolean);

        if (entries.length > 0) {
            checkBreak(28);
            y += 2;
            setF('bold', 9.5, PDF_COLORS.primary);
            doc.text('TRAZABILIDAD Y BITÁCORA DE EVENTOS', M, y + 4);
            y += 6.5;

            const timelineRows = entries.map((entry) => {
                const match = entry.match(/^\[([^\]]+)\]\s*(.*)/s);
                if (match) {
                    return [sanitizePdfText(match[1]), sanitizePdfText(match[2])];
                }
                return ['-', sanitizePdfText(entry)];
            });

            autoTable(doc, {
                startY: y,
                head: [['Fecha y Hora', 'Detalle del Evento Registrado']],
                body: timelineRows,
                theme: 'striped',
                headStyles: {
                    fillColor: PDF_COLORS.primary,
                    textColor: 255,
                    fontSize: 8,
                    fontStyle: 'bold',
                },
                bodyStyles: {
                    fontSize: 8,
                    textColor: PDF_COLORS.slate700,
                    cellPadding: 2.8,
                },
                alternateRowStyles: {
                    fillColor: PDF_COLORS.slate50,
                },
                columnStyles: {
                    0: { cellWidth: 40, fontStyle: 'bold', textColor: PDF_COLORS.slate600 },
                },
                margin: { left: M, right: M },
            });
            y = (doc as any).lastAutoTable.finalY + 8;
        }
    }

    // ─── Footers on all pages ───
    applyInstitutionalFooters(doc, { margin: M });

    const fileName = `Informe_Calidad_${sanitizePdfText(report.tracking_id || 'caso')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};
