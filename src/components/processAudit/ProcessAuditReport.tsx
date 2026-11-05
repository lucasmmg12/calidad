import React from 'react';
import type { ProcessAuditReport as ReportType } from '../../types/processAudit';
import {
    CheckCircle2,
    AlertCircle,
    Printer,
    Download,
    ArrowLeft,
    Sparkles,
    ShieldAlert,
    ExternalLink,
    Calendar,
    User,
    Building2,
    FileCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_COLORS, loadLogoImage, drawLogoBadge, sanitizePdfText, applyInstitutionalFooters } from '../../utils/pdfTheme';

interface ProcessAuditReportProps {
    report: ReportType;
    onBack: () => void;
    onLinkDoraClick: (reportId: string, findingType: 'om' | 'desvio', findingId: string) => void;
}

export const ProcessAuditReportView: React.FC<ProcessAuditReportProps> = ({
    report,
    onBack,
    onLinkDoraClick
}) => {
    const handlePrint = () => {
        window.print();
    };

    const handleExportPdf = async () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const logo = await loadLogoImage('/logosanatorio.png');
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const M = 16;
        const CW = pageW - 2 * M;
        let y = 0;

        const setF = (style: 'normal' | 'bold' | 'italic', size: number, color: [number, number, number] = PDF_COLORS.slate800) => {
            doc.setFont('helvetica', style);
            doc.setFontSize(size);
            doc.setTextColor(color[0], color[1], color[2]);
        };

        const checkBreak = (needed: number) => {
            if (y + needed > pageH - 22) {
                doc.addPage();
                doc.setFillColor(...PDF_COLORS.primary);
                doc.rect(0, 0, pageW, 13, 'F');
                doc.setFillColor(...PDF_COLORS.secondary);
                doc.rect(0, 13, pageW, 1.2, 'F');
                setF('bold', 8, PDF_COLORS.white);
                doc.text('SANATORIO ARGENTINO · INFORME DE AUDITORÍA DE PROCESOS', M, 8.5);
                doc.text(sanitizePdfText(report.auditNumber), pageW - M, 8.5, { align: 'right' });
                y = 21;
            }
        };

        // Header Page 1
        doc.setFillColor(...PDF_COLORS.primary);
        doc.rect(0, 0, pageW, 40, 'F');
        doc.setFillColor(...PDF_COLORS.secondary);
        doc.rect(0, 40, pageW, 2.2, 'F');

        drawLogoBadge(doc, logo, M, 7, 36, 26, 3);

        const tx = M + 41;
        setF('bold', 7.5, [186, 230, 253]);
        doc.text('DEPARTAMENTO DE GESTIÓN DE CALIDAD · SISTEMA INTEGRAL DORA', tx, 13);
        setF('bold', 16.5, PDF_COLORS.white);
        doc.text('INFORME DE AUDITORÍA DE PROCESOS', tx, 21);
        setF('normal', 9, [224, 242, 254]);
        doc.text(`Auditoría #${sanitizePdfText(report.auditNumber)} · Fecha: ${new Date(report.auditDate).toLocaleDateString('es-AR')}`, tx, 28);

        // Score Pill on Right
        const scoreColor = report.scorePercent >= 85 ? PDF_COLORS.emerald : report.scorePercent >= 70 ? PDF_COLORS.amber : PDF_COLORS.red;
        doc.setFillColor(...PDF_COLORS.white);
        doc.roundedRect(pageW - M - 34, 9, 34, 22, 3, 3, 'F');
        setF('bold', 6.5, PDF_COLORS.slate500);
        doc.text('CUMPLIMIENTO', pageW - M - 17, 14.5, { align: 'center' });
        setF('bold', 15, scoreColor);
        doc.text(`${report.scorePercent}%`, pageW - M - 17, 23, { align: 'center' });
        setF('bold', 6, scoreColor);
        doc.text(
            report.scorePercent >= 85 ? 'ÓPTIMO' : report.scorePercent >= 70 ? 'ACEPTABLE' : 'DESVÍO',
            pageW - M - 17,
            28,
            { align: 'center' }
        );

        y = 49;

        // Metadata Grid
        doc.setFillColor(...PDF_COLORS.slate50);
        doc.setDrawColor(...PDF_COLORS.slate200);
        doc.setLineWidth(0.35);
        doc.roundedRect(M, y, CW, 18, 2.5, 2.5, 'FD');

        const colW = CW / 3;
        setF('bold', 6.8, PDF_COLORS.slate500);
        doc.text('SECTOR AUDITADO', M + 5, y + 6);
        doc.text('AUDITOR RESPONSABLE', M + colW + 5, y + 6);
        doc.text('ESTADO GENERAL', M + colW * 2 + 5, y + 6);

        setF('bold', 9.5, PDF_COLORS.slate900);
        doc.text(sanitizePdfText(report.sectorName).substring(0, 32), M + 5, y + 12.5);
        doc.text(sanitizePdfText(`${report.auditorName} (${report.auditorRole})`).substring(0, 34), M + colW + 5, y + 12.5);
        setF('bold', 9.5, scoreColor);
        doc.text(
            report.scorePercent >= 85 ? 'Cumplimiento Óptimo' : report.scorePercent >= 70 ? 'Cumplimiento Aceptable' : 'Desvío Significativo',
            M + colW * 2 + 5,
            y + 12.5
        );

        y += 24;

        // Resumen Ejecutivo
        if (report.generalSummary) {
            setF('italic', 9.5, PDF_COLORS.slate800);
            const sumLines = doc.splitTextToSize(`"${sanitizePdfText(report.generalSummary)}"`, CW - 18);
            const sumH = sumLines.length * 4.8 + 14;
            checkBreak(sumH);

            doc.setFillColor(...PDF_COLORS.primaryLight);
            doc.setDrawColor(191, 219, 254);
            doc.roundedRect(M, y, CW, sumH, 2.5, 2.5, 'FD');
            doc.setFillColor(...PDF_COLORS.primary);
            doc.roundedRect(M, y, 2.8, sumH, 1.2, 1.2, 'F');

            setF('bold', 7.8, PDF_COLORS.primary);
            doc.text('CONCLUSIÓN Y RESUMEN EJECUTIVO', M + 7, y + 6.5);
            setF('italic', 9.5, PDF_COLORS.slate800);
            sumLines.forEach((l: string, idx: number) => {
                doc.text(l, M + 7, y + 12.2 + idx * 4.8);
            });
            y += sumH + 6;
        }

        // Helper for Finding Blocks
        const drawFindingCategory = (
            title: string,
            items: { heading: string; desc: string; extra?: string }[],
            bg: [number, number, number],
            border: [number, number, number],
            accent: [number, number, number]
        ) => {
            if (items.length === 0) return;
            checkBreak(18);
            doc.setFillColor(...accent);
            doc.roundedRect(M, y, CW, 8.5, 2, 2, 'F');
            setF('bold', 8.5, PDF_COLORS.white);
            doc.text(`${sanitizePdfText(title).toUpperCase()} (${items.length})`, M + 4, y + 5.7);
            y += 11;

            items.forEach((it) => {
                setF('normal', 9);
                const descLines = doc.splitTextToSize(sanitizePdfText(it.desc), CW - 16);
                const extraH = it.extra ? 5.5 : 0;
                const boxH = descLines.length * 4.5 + 13 + extraH;
                checkBreak(boxH + 3);

                doc.setFillColor(...bg);
                doc.setDrawColor(...border);
                doc.setLineWidth(0.3);
                doc.roundedRect(M, y, CW, boxH, 2, 2, 'FD');
                doc.setFillColor(...accent);
                doc.roundedRect(M, y, 2.2, boxH, 1, 1, 'F');

                setF('bold', 8.8, accent);
                doc.text(sanitizePdfText(it.heading), M + 6, y + 6);
                setF('normal', 8.8, PDF_COLORS.slate800);
                descLines.forEach((dl: string, idx: number) => {
                    doc.text(dl, M + 6, y + 11.2 + idx * 4.5);
                });
                if (it.extra) {
                    setF('bold', 7.8, PDF_COLORS.slate600);
                    doc.text(sanitizePdfText(it.extra), M + 6, y + boxH - 3.2);
                }
                y += boxH + 3;
            });
            y += 3;
        };

        drawFindingCategory(
            'Fortalezas Destacadas del Servicio',
            report.fortalezas.map(f => ({
                heading: `[${f.processName}]`,
                desc: f.description,
                extra: f.highlight ? `Destacado: ${f.highlight}` : undefined,
            })),
            PDF_COLORS.emeraldBg,
            PDF_COLORS.emeraldBorder,
            PDF_COLORS.emerald
        );

        drawFindingCategory(
            'Observaciones de Campo',
            report.observaciones.map(o => ({
                heading: `[${o.processName}]`,
                desc: o.description,
                extra: o.recommendation ? `Recomendación: ${o.recommendation}` : undefined,
            })),
            PDF_COLORS.primaryLight,
            [191, 219, 254],
            PDF_COLORS.primary
        );

        drawFindingCategory(
            'Oportunidades de Mejora (OM)',
            report.oportunidadesMejora.map(om => ({
                heading: `${om.title} (${om.processName})`,
                desc: om.description,
                extra: om.doraTicketId ? `Ticket DORA Vinculado: #${om.doraTicketId}` : 'Pendiente vinculación DORA',
            })),
            PDF_COLORS.amberBg,
            PDF_COLORS.amberBorder,
            PDF_COLORS.amber
        );

        drawFindingCategory(
            'Desvíos e Incumplimientos Detectados',
            report.desvios.map(d => ({
                heading: `${d.title} — Riesgo ${d.riskLevel.toUpperCase()} (${d.processName})`,
                desc: d.description,
                extra: `Plan: ${d.actionPlan}  |  Resp: ${d.responsiblePerson}  |  Vence: ${d.deadline}`,
            })),
            PDF_COLORS.redBg,
            PDF_COLORS.redBorder,
            PDF_COLORS.red
        );

        // Checklist Table
        checkBreak(25);
        setF('bold', 10, PDF_COLORS.primary);
        doc.text('DESGLOSE ÍTEM POR ÍTEM DEL CHECKLIST', M, y + 4);
        y += 7;

        autoTable(doc, {
            startY: y,
            head: [['#', 'Proceso / Categoría', 'Ítem Evaluado', 'Resultado', 'Observación']],
            body: report.items.map((item, idx) => [
                (idx + 1).toString(),
                sanitizePdfText(`${item.processName} (${item.category})`),
                sanitizePdfText(item.itemText),
                item.answer === 'cumple' ? 'Cumple (100%)' : item.answer === 'parcial' ? 'Parcial (50%)' : item.answer === 'no_cumple' ? 'No Cumple (0%)' : 'N/A',
                sanitizePdfText(item.observation || '-')
            ]),
            theme: 'striped',
            headStyles: { fillColor: PDF_COLORS.primary, fontSize: 8, fontStyle: 'bold' },
            styles: { fontSize: 7.5, cellPadding: 2.8, textColor: PDF_COLORS.slate800 },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 38, fontStyle: 'bold' },
                2: { cellWidth: 62 },
                3: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
                4: { cellWidth: 40 },
            },
            didParseCell: (hookData: any) => {
                if (hookData.section === 'body' && hookData.column.index === 3) {
                    const v = hookData.cell.raw;
                    if (v.startsWith('Cumple')) hookData.cell.styles.textColor = PDF_COLORS.emerald;
                    else if (v.startsWith('Parcial')) hookData.cell.styles.textColor = PDF_COLORS.amber;
                    else if (v.startsWith('No Cumple')) hookData.cell.styles.textColor = PDF_COLORS.red;
                }
            },
            margin: { left: M, right: M },
        });

        y = (doc as any).lastAutoTable.finalY + 18;
        checkBreak(22);

        // Signatures
        doc.setDrawColor(...PDF_COLORS.slate400);
        doc.setLineWidth(0.35);
        doc.line(M + 10, y + 8, M + 70, y + 8);
        doc.line(pageW - M - 70, y + 8, pageW - M - 10, y + 8);
        setF('bold', 8, PDF_COLORS.slate700);
        doc.text(sanitizePdfText(`Firma Auditor: ${report.auditorName}`), M + 40, y + 13, { align: 'center' });
        doc.text('Revisión Sistema DORA Calidad', pageW - M - 40, y + 13, { align: 'center' });

        applyInstitutionalFooters(doc, { margin: M });
        doc.save(`Auditoria_Procesos_${sanitizePdfText(report.auditNumber)}.pdf`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between gap-3 print:hidden">
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver al Tablero</span>
                </button>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Imprimir</span>
                    </button>
                    <button
                        onClick={handleExportPdf}
                        className="px-4 py-2 bg-sanatorio-primary hover:bg-[#00385c] text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        <span>Descargar PDF</span>
                    </button>
                </div>
            </div>

            {/* Printable Audit Document Container */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-8 print:p-0 print:border-none print:shadow-none">

                {/* Encabezado del Documento Institucional */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                    <div className="flex items-center gap-4">
                        <img
                            src="/logosanatorio.png"
                            alt="Sanatorio Argentino"
                            className="h-12 w-auto object-contain"
                        />
                        <div>
                            <span className="text-[10px] font-black uppercase text-sanatorio-primary tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">
                                Departamento de Gestión de Calidad
                            </span>
                            <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-800 mt-1">
                                Informe de Auditoría de Procesos
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">
                                Sanatorio Argentino • DORA Sistema Integral
                            </p>
                        </div>
                    </div>

                    <div className="text-right self-end sm:self-auto">
                        <div className="font-mono text-sm font-bold text-sanatorio-primary bg-blue-50/80 px-3 py-1 rounded-xl border border-blue-100 inline-block">
                            {report.auditNumber}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-medium flex items-center justify-end gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(report.auditDate).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </div>
                    </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                    <div className="space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Sector Auditado</span>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                            <Building2 className="w-4 h-4 text-sanatorio-primary" />
                            {report.sectorName}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Auditor Responsable</span>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                            <User className="w-4 h-4 text-slate-500" />
                            {report.auditorName} ({report.auditorRole})
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Nivel de Cumplimiento</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-display font-black text-slate-800">
                                {report.scorePercent}%
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${report.scorePercent >= 85 ? 'bg-emerald-100 text-emerald-800' : report.scorePercent >= 70 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                {report.scorePercent >= 85 ? 'Cumplimiento Óptimo' : report.scorePercent >= 70 ? 'Aceptable' : 'Desvío Significativo'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Resumen Ejecutivo */}
                {report.generalSummary && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-sanatorio-primary" />
                            Conclusión y Resumen Ejecutivo
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed p-4 bg-blue-50/40 rounded-xl border border-blue-100 italic">
                            "{report.generalSummary}"
                        </p>
                    </div>
                )}

                {/* ESTRUCTURA SEGÚN NOTA MANUSCRITA: Fortalezas, Observaciones, OMs, Desvíos */}
                <div className="space-y-6">
                    <h3 className="text-base font-display font-bold text-slate-800 border-b pb-2">
                        Resultados y Clasificación de Hallazgos
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* 🟢 FORTALEZAS */}
                        <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
                            <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-600" />
                                Fortalezas del Servicio ({report.fortalezas.length})
                            </h4>

                            {report.fortalezas.length === 0 ? (
                                <p className="text-xs text-emerald-700/70 italic">Sin fortalezas registradas.</p>
                            ) : (
                                <div className="space-y-2">
                                    {report.fortalezas.map(f => (
                                        <div key={f.id} className="p-3 bg-white rounded-xl border border-emerald-200 text-xs space-y-1">
                                            <span className="font-bold text-emerald-800 block">[{f.processName}]</span>
                                            <p className="text-slate-700">{f.description}</p>
                                            <span className="text-[11px] text-emerald-600 font-semibold block">⭐ {f.highlight}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 🔵 OBSERVACIONES */}
                        <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-3">
                            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-sanatorio-primary" />
                                Observaciones de Campo ({report.observaciones.length})
                            </h4>

                            {report.observaciones.length === 0 ? (
                                <p className="text-xs text-slate-500 italic">Sin observaciones puntuales.</p>
                            ) : (
                                <div className="space-y-2">
                                    {report.observaciones.map(o => (
                                        <div key={o.id} className="p-3 bg-white rounded-xl border border-blue-200 text-xs space-y-1">
                                            <span className="font-bold text-slate-800 block">[{o.processName}]</span>
                                            <p className="text-slate-700">{o.description}</p>
                                            {o.recommendation && (
                                                <span className="text-[11px] text-sanatorio-primary font-medium block">💡 Rec: {o.recommendation}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 🟡 OPORTUNIDADES DE MEJORA (OM) VINCULADAS A DORA */}
                        <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                    Oportunidades de Mejora (OM) ({report.oportunidadesMejora.length})
                                </h4>
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                                    Atadas a DORA
                                </span>
                            </div>

                            {report.oportunidadesMejora.length === 0 ? (
                                <p className="text-xs text-amber-700/70 italic">Sin oportunidades de mejora detectadas.</p>
                            ) : (
                                <div className="space-y-2.5">
                                    {report.oportunidadesMejora.map(om => (
                                        <div key={om.id} className="p-3.5 bg-white rounded-xl border border-amber-200 text-xs space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="font-bold text-slate-800 block">{om.title}</span>
                                                    <span className="text-[10px] font-semibold text-slate-400">Proceso: {om.processName}</span>
                                                </div>

                                                {om.doraTicketId ? (
                                                    <span className="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 shrink-0">
                                                        <ExternalLink className="w-3 h-3" /> DORA #{om.doraTicketId}
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => onLinkDoraClick(report.id, 'om', om.id)}
                                                        className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        <span>Vincular a DORA</span>
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-slate-600 leading-relaxed">{om.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 🔴 DESVÍOS E INCUMPLIMIENTOS ATADOS A CASOS DORA */}
                        <div className="p-5 bg-red-50/50 rounded-2xl border border-red-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm text-red-900 flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-red-600" />
                                    Desvíos e Incumplimientos ({report.desvios.length})
                                </h4>
                                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                                    Casos DORA Abiertos
                                </span>
                            </div>

                            {report.desvios.length === 0 ? (
                                <p className="text-xs text-red-700/70 italic">Sin desvíos detectados en esta evaluación.</p>
                            ) : (
                                <div className="space-y-2.5">
                                    {report.desvios.map(d => (
                                        <div key={d.id} className="p-3.5 bg-white rounded-xl border border-red-200 text-xs space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-red-800">{d.title}</span>
                                                        <span className="bg-red-100 text-red-700 text-[10px] font-bold uppercase px-1.5 py-0.2 rounded">
                                                            Riesgo {d.riskLevel}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-semibold">Proceso: {d.processName}</span>
                                                </div>

                                                {d.doraTicketId ? (
                                                    <span className="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1 shrink-0">
                                                        <ExternalLink className="w-3 h-3" /> Caso DORA #{d.doraTicketId}
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => onLinkDoraClick(report.id, 'desvio', d.id)}
                                                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded transition-all flex items-center gap-1 cursor-pointer shrink-0"
                                                    >
                                                        <ExternalLink className="w-3 h-3" />
                                                        <span>Vincular Caso DORA</span>
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-slate-600">{d.description}</p>
                                            <div className="p-2 bg-slate-50 rounded-lg text-[11px] font-medium text-slate-700 border border-slate-200/60">
                                                <strong>Plan de Acción:</strong> {d.actionPlan} • <strong>Resp:</strong> {d.responsiblePerson} • <strong>Vence:</strong> {d.deadline}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabla Detallada de Items Evaluados */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                        Desglose Ítem por Ítem del Checklist
                    </h3>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                                <tr>
                                    <th className="py-3 px-4">#</th>
                                    <th className="py-3 px-4">Categoría / Proceso</th>
                                    <th className="py-3 px-4">Ítem Evaluado</th>
                                    <th className="py-3 px-4 text-center">Respuesta</th>
                                    <th className="py-3 px-4">Observación</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/70 font-medium">
                                {report.items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-400">{index + 1}</td>
                                        <td className="py-3 px-4">
                                            <span className="font-bold text-slate-800 block">{item.processName}</span>
                                            <span className="text-[10px] text-slate-400">{item.category}</span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-700 font-semibold">{item.itemText}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${item.answer === 'cumple'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : item.answer === 'parcial'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : item.answer === 'no_cumple'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {item.answer === 'cumple' ? 'Cumple (100%)' : item.answer === 'parcial' ? 'Parcial (50%)' : item.answer === 'no_cumple' ? 'No Cumple (0%)' : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 italic">
                                            {item.observation || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer de Firma */}
                <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-500 font-semibold">
                    <div>
                        <div className="w-48 h-px bg-slate-300 mx-auto mb-2" />
                        <span>Firma Auditor: {report.auditorName}</span>
                    </div>
                    <div>
                        <div className="w-48 h-px bg-slate-300 mx-auto mb-2" />
                        <span>Revisión Sistema DORA Calidad</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
