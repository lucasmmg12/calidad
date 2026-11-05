import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BookOpen,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Layers,
  BrainCircuit,
  FileSpreadsheet,
  FileText,
  Users,
  Wrench,
  History,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ─── Paleta institucional Sanatorio Argentino / ITAES / Grow Labs ────────────
const C = {
  primary:      [0,   84, 139] as [number, number, number], // #00548B
  primaryMid:   [0,  118, 182] as [number, number, number],
  primaryLight: [224, 242, 254] as [number, number, number],
  teal:         [0,  169, 157] as [number, number, number], // #00A99D
  accent:       [15,  23,  42] as [number, number, number],
  white:        [255, 255, 255] as [number, number, number],
  grayLight:    [248, 250, 252] as [number, number, number],
  grayMid:      [203, 213, 225] as [number, number, number],
  grayDark:     [51,  65,  85] as [number, number, number],
  textMain:     [30,  41,  59] as [number, number, number],
  textSub:      [100, 116, 139] as [number, number, number],
  tableHead:    [0,   84, 139] as [number, number, number],
  tableRow2:    [241, 245, 249] as [number, number, number],
  green:        [22, 163,  74] as [number, number, number],
  red:          [220,  38,  38] as [number, number, number],
  orange:       [217, 119,   6] as [number, number, number],
  yellow:       [234, 179,   8] as [number, number, number],
};

// ─── Constantes del documento (Versión 2.0 Actualizada) ──────────────────────
const DOC = {
  sistema:   'Sistema Integral de Gestión de Calidad y Seguridad del Paciente',
  sigla:     'QOAG',
  codigo:    'QOAG-MP-001',
  version:   '2.0',
  fecha:     new Date().toLocaleDateString('es-AR'),
  estado:    'VIGENTE — EDICIÓN ACTUALIZADA',
  elaboro:   'Innovación y Transformación Digital · Grow Labs',
  reviso:    'Comité de Calidad y Seguridad del Paciente',
  aprobo:    'Dirección Médica · Sanatorio Argentino',
  url:       'https://calidad.sanatorioargentino.com.ar',
  logo:      '/logosanatorio.png',
  filename:  'Manual_Procedimientos_Calidad_QOAG_v2.0.pdf',
};

const W = 210; // A4 ancho mm
const H = 297; // A4 alto mm
const ML = 20; // margen izquierdo
const MR = 20; // margen derecho
const MT = 28; // margen superior (debajo header)
const MB = 22; // margen inferior (sobre footer)
const CW = W - ML - MR; // ancho contenido

// ─── Helper: cargar logo ──────────────────────────────────────────────────────
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const resp = await fetch(DOC.logo);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Helper: header en cada página (excepto portada) ─────────────────────────
function drawHeader(doc: jsPDF, pageNum: number, totalPages: number, logoUrl: string | null) {
  // Banda azul
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 18, 'F');

  // Logo pequeño con contenedor blanco para legibilidad sobre fondo azul
  if (logoUrl) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(ML, 2, 22, 14, 1.8, 1.8, 'F');
      doc.addImage(logoUrl, 'PNG', ML + 1.5, 3, 19, 12);
    } catch { /* fallback */ }
  }

  // Texto header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.white);
  doc.text('SANATORIO ARGENTINO', 44, 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`${DOC.sistema} - ${DOC.codigo}  |  Version ${DOC.version}`, 44, 12.5);

  // Paginacion derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(`Pag. ${pageNum} de ${totalPages}`, W - MR, 10, { align: 'right' });

  doc.setTextColor(...C.textMain);
}

// ─── Helper: footer en cada página (excepto portada) ─────────────────────────
function drawFooter(doc: jsPDF) {
  doc.setFillColor(...C.grayLight);
  doc.rect(0, H - 12, W, 12, 'F');
  doc.setDrawColor(...C.grayMid);
  doc.setLineWidth(0.3);
  doc.line(0, H - 12, W, H - 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(...C.primary);
  doc.text(
    'Sanatorio Argentino · Gestión de Calidad y Seguridad del Paciente · Innovación y Transformación Digital',
    W / 2,
    H - 7,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.8);
  doc.setTextColor(...C.textSub);
  doc.text(
    `DOCUMENTO CONTROLADO ITAES — ${DOC.codigo} v${DOC.version} | Emitido: ${DOC.fecha}`,
    W / 2,
    H - 3.2,
    { align: 'center' }
  );
  doc.setTextColor(...C.textMain);
}

// ─── Helper: cuadro de alerta / nota ─────────────────────────────────────────
function noteBox(
  doc: jsPDF,
  y: number,
  text: string,
  type: 'info' | 'warning' | 'danger' | 'success' = 'info'
): number {
  const colorMap = {
    info:    { bg: [214, 234, 248] as [number,number,number], border: C.primaryMid, label: 'NOTA' },
    warning: { bg: [253, 243, 205] as [number,number,number], border: C.yellow,     label: 'AVISO' },
    danger:  { bg: [253, 220, 215] as [number,number,number], border: C.red,        label: 'IMPORTANTE' },
    success: { bg: [212, 239, 223] as [number,number,number], border: C.green,      label: 'OK' },
  };
  const { bg, border, label } = colorMap[type];
  const maxW = CW - 4;

  let lines: string[] = [];
  text.split('\n').forEach(part => {
    lines = lines.concat(doc.splitTextToSize(part.trim(), maxW - 20));
  });

  const boxH = lines.length * 4.8 + 10;

  doc.setFillColor(...bg);
  doc.setDrawColor(...border);
  doc.setLineWidth(0.5);
  doc.roundedRect(ML, y, CW, boxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...border);
  doc.text(`[${label}]`, ML + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMain);
  doc.text(lines, ML + 4, y + 11);

  return y + boxH + 4;
}

// ─── Helper: titulo de seccion ────────────────────────────────────────────────
function sectionTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFillColor(...C.primary);
  doc.rect(ML, y, CW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.white);
  doc.text(text, ML + 4, y + 5.5);
  doc.setTextColor(...C.textMain);
  return y + 12;
}

// ─── Helper: subtitulo ───────────────────────────────────────────────────────
function subTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFillColor(...C.primaryLight);
  doc.rect(ML, y, CW, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.accent);
  doc.text(text, ML + 3, y + 4.5);
  doc.setTextColor(...C.textMain);
  return y + 10;
}

// ─── Helper: parrafo de texto ─────────────────────────────────────────────────
function paragraph(doc: jsPDF, y: number, text: string): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.textMain);
  const lines = doc.splitTextToSize(text, CW);
  doc.text(lines, ML, y);
  return y + lines.length * 5 + 3;
}

// ─── Helper: lista con bullets ────────────────────────────────────────────────
function bulletList(doc: jsPDF, y: number, items: string[]): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.textMain);
  items.forEach(item => {
    const lines = doc.splitTextToSize(`   - ${item}`, CW - 6);
    doc.text(lines, ML + 3, y);
    y += lines.length * 5 + 1;
  });
  return y + 2;
}

// ─── Helper: lista numerada ───────────────────────────────────────────────────
function numberedList(doc: jsPDF, y: number, items: string[]): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.textMain);
  items.forEach((item, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${item}`, CW - 6);
    doc.text(lines, ML + 3, y);
    y += lines.length * 5 + 1;
  });
  return y + 2;
}

// ─── Helper: separador ───────────────────────────────────────────────────────
function divider(doc: jsPDF, y: number): number {
  doc.setDrawColor(...C.grayMid);
  doc.setLineWidth(0.2);
  doc.line(ML, y, W - MR, y);
  return y + 4;
}

// ─── Helper: nueva página con header/footer ───────────────────────────────────
function newPage(doc: jsPDF, logoUrl: string | null): number {
  doc.addPage();
  // Header y footer serán sobreescritos en segunda pasada; aquí ponemos placeholder
  drawHeader(doc, doc.getNumberOfPages(), 999, logoUrl);
  drawFooter(doc);
  return MT;
}

// ─── Helper: verificar espacio disponible y saltar si es necesario ─────────────
function checkSpace(doc: jsPDF, y: number, needed: number, logoUrl: string | null): number {
  if (y + needed > H - MB) {
    return newPage(doc, logoUrl);
  }
  return y;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERADOR PRINCIPAL DEL PDF
// ═══════════════════════════════════════════════════════════════════════════════
export async function generateManualPDF() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const logoUrl = await loadLogoDataUrl();

  // Registro de entradas para el TOC
  const tocEntries: Array<{ titulo: string; page: number; level: number }> = [];

  // ─── PÁGINA 1: PORTADA ──────────────────────────────────────────────────────
  // Fondo degradado azul superior
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, W, 80, 'F');

  // Banda decorativa diagonal
  doc.setFillColor(...C.primaryMid);
  doc.rect(0, 65, W, 8, 'F');
  doc.setFillColor(...C.primaryLight);
  doc.rect(0, 73, W, 3, 'F');

  // Logo institucional con contenedor blanco redondeado
  if (logoUrl) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(W / 2 - 28, 9, 56, 36, 4, 4, 'F');
      doc.addImage(logoUrl, 'PNG', W / 2 - 24, 12, 48, 30);
    } catch {
      // Monograma fallback
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(36);
      doc.setTextColor(...C.white);
      doc.text('SA', W / 2, 42, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(...C.white);
    doc.text('SA', W / 2, 42, { align: 'center' });
  }

  // Nombre institución
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.text('SANATORIO ARGENTINO', W / 2, 52, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Departamento de Innovacion y Transformacion Digital - Grow Labs', W / 2, 58, { align: 'center' });

  // Titulo del manual
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.accent);
  doc.text('MANUAL DE PROCEDIMIENTOS', W / 2, 90, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.primary);
  doc.text(DOC.sistema.toUpperCase(), W / 2, 100, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.textSub);
  doc.text('Sistema de Reporte, Seguimiento y Gestion de No Conformidades y Mejora Continua', W / 2, 108, { align: 'center' });

  // Tabla de control documental
  autoTable(doc, {
    startY: 118,
    margin: { left: ML, right: MR },
    head: [['Campo', 'Valor']],
    body: [
      ['Codigo del Documento', DOC.codigo],
      ['Version', DOC.version],
      ['Fecha de Emision', DOC.fecha],
      ['Estado', DOC.estado],
      ['Sistema', DOC.sistema],
      ['Sigla / Codigo', DOC.sigla],
      ['URL de Acceso', DOC.url],
      ['Stack Tecnologico', 'Vite + React + TypeScript + Supabase + Tailwind CSS v4'],
    ],
    headStyles: { fillColor: C.tableHead, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: C.textMain },
    alternateRowStyles: { fillColor: C.tableRow2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
  });

  // Bloque Elaboro / Reviso / Aprobo
  const yFirmas = (doc as any).lastAutoTable.finalY + 12;
  const bW = (CW - 8) / 3;
  const firmas = [
    { label: 'ELABORO', nombre: DOC.elaboro },
    { label: 'REVISO',  nombre: DOC.reviso },
    { label: 'APROBO',  nombre: DOC.aprobo },
  ];

  firmas.forEach((f, i) => {
    const bx = ML + i * (bW + 4);
    doc.setFillColor(...C.primaryLight);
    doc.roundedRect(bx, yFirmas, bW, 32, 2, 2, 'FD');
    doc.setDrawColor(...C.primaryMid);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.primary);
    doc.text(f.label, bx + bW / 2, yFirmas + 6, { align: 'center' });

    doc.setDrawColor(...C.grayMid);
    doc.setLineWidth(0.4);
    doc.line(bx + 6, yFirmas + 18, bx + bW - 6, yFirmas + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textSub);
    const nameLines = doc.splitTextToSize(f.nombre, bW - 8);
    doc.text(nameLines, bx + bW / 2, yFirmas + 22, { align: 'center' });

    doc.text('Firma y Sello', bx + bW / 2, yFirmas + 30, { align: 'center' });
  });

  // Footer portada
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(...C.textSub);
  doc.text(`Documento generado el ${new Date().toLocaleString('es-AR')} - Confidencial`, W / 2, H - 8, { align: 'center' });

  // ─── PÁGINA 2: INDICE (placeholder - se sobreescribe en segunda pasada) ──────
  doc.addPage();
  drawHeader(doc, 2, 999, logoUrl);
  drawFooter(doc);
  const tocPageNum = 2;

  // ─── PAGINAS DE CONTENIDO ─────────────────────────────────────────────────

  // ══════════════════════════════════════
  // SECCIÓN 1: Introducción y Alcance
  // ══════════════════════════════════════
  let p = newPage(doc, logoUrl);
  tocEntries.push({ titulo: 'SECCION 1 - Introduccion y Alcance', page: doc.getNumberOfPages(), level: 0 });

  p = sectionTitle(doc, p, 'SECCION 1 - INTRODUCCION Y ALCANCE');

  p = checkSpace(doc, p, 20, logoUrl);
  tocEntries.push({ titulo: '1.1 Proposito del Documento', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '1.1 Proposito del Documento');
  p = paragraph(doc, p,
    'El presente Manual de Procedimientos tiene como proposito documentar, estandarizar y comunicar los ' +
    'procesos operativos del Sistema de Gestion de Calidad (QOAG) del Sanatorio Argentino. Este documento ' +
    'constituye un instrumento de referencia obligatoria para todos los usuarios del sistema y sirve como ' +
    'evidencia ante los procesos de acreditacion ITAES (Instituto Tecnico para la Acreditacion de ' +
    'Establecimientos de Salud).'
  );

  p = checkSpace(doc, p, 20, logoUrl);
  tocEntries.push({ titulo: '1.2 Alcance del Sistema', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '1.2 Alcance del Sistema');
  p = paragraph(doc, p,
    'El sistema QOAG alcanza a todos los departamentos, servicios y areas del Sanatorio Argentino que ' +
    'generen, gestionen o resuelvan eventos de calidad. Incluye el ciclo completo de gestion: desde el ' +
    'reporte anonimo/identificado de un caso hasta su resolucion, validacion, derivacion y analisis estadistico.'
  );
  p = bulletList(doc, p, [
    'Reporte de hallazgos, desvíos, oportunidades de mejora, eventos adversos/cuasi adversos y felicitaciones',
    'Triage automático asistido por Inteligencia Artificial (severidad Verde, Amarillo, Rojo y categorización)',
    'Seguimiento público por código único (#SA-XXXX) y encuesta de conformidad post-resolución',
    'Gestión multi-sector (Derivación Simple con cierre directo o Desvío con análisis de causa raíz)',
    'Panel Mis Casos y Seguimientos con descarga estilizada en Excel (.xlsx con logo institucional) y PDF',
    'Emisión de Certificados Oficiales de Reconocimiento y Felicitación en PDF para el personal destacado',
    'Observatorio de Inteligencia de Calidad: KPIs explicados, gráficos de línea y barras, ventana emergente por gravedad y Revista Institucional PDF con IA',
    'Radar de Tiempo de Respuesta (SLA Operativo) priorizando casos recientes/por vencer sobre el pasivo histórico',
    'Ciclo PDCA de Verificación de Efectividad (30, 60 y 90 días) sin límite de registros y con grupos desplegables',
    'Módulos de Auditoría de Proceso en Terreno y Recorridas de Guardia, Fin de Semana y Feriados',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  tocEntries.push({ titulo: '1.3 Acronimos y Definiciones', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '1.3 Acronimos y Definiciones');

  p = checkSpace(doc, p, 55, logoUrl);
  autoTable(doc, {
    startY: p,
    margin: { left: ML, right: MR },
    head: [['Termino / Sigla', 'Definicion']],
    body: [
      ['QOAG',         'Sistema Integral de Gestion de Calidad y Seguridad del Paciente del Sanatorio Argentino'],
      ['ITAES',        'Instituto Tecnico para la Acreditacion de Establecimientos de Salud'],
      ['Desvio / NC',  'Incumplimiento de un estandar o protocolo que requiere analisis de causa raiz y accion correctiva'],
      ['EA / ECA',     'Evento Adverso / Evento Cuasi Adverso con impacto real o potencial en la seguridad del paciente'],
      ['Felicitacion', 'Reconocimiento positivo de pacientes o colegas que genera un Certificado Oficial de Excelencia'],
      ['Triage IA',    'Clasificacion automatica de severidad clinica en Rojo (Critico), Amarillo (Medio) o Verde (Leve)'],
      ['SLA',          'Acuerdo de Tiempo de Respuesta: 24 hs para casos Criticos (Rojo) y 48 hs para Medios/Leves'],
      ['PDCA',         'Ciclo Plan-Do-Check-Act con controles de efectividad a 30, 60 y 90 dias post-cierre'],
      ['Revista IA',   'Informe Institucional en formato revista editorial con graficos explicativos y dossier IA'],
      ['Dora',         'Asistente virtual institucional y motor de notificaciones via WhatsApp Cloud API'],
      ['Responsable',  'Lider o referente de servicio que gestiona casos asignados y monitorea seguimientos'],
      ['Directivo',    'Perfil ejecutivo con acceso a Inteligencia de Calidad, Executive Brief y tableros globales'],
    ],
    headStyles: { fillColor: C.tableHead, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: C.textMain },
    alternateRowStyles: { fillColor: C.tableRow2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
  });
  p = (doc as any).lastAutoTable.finalY + 6;

  // ══════════════════════════════════════
  // SECCIÓN 2: Información del Sistema
  // ══════════════════════════════════════
  p = newPage(doc, logoUrl);
  tocEntries.push({ titulo: 'SECCION 2 - Informacion del Sistema', page: doc.getNumberOfPages(), level: 0 });
  p = sectionTitle(doc, p, 'SECCION 2 - INFORMACION DEL SISTEMA');

  tocEntries.push({ titulo: '2.1 Descripcion General', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '2.1 Descripcion General');
  p = paragraph(doc, p,
    'El sistema QOAG v2.0 es una plataforma web clinica de pantalla completa desarrollada sobre Vite + React + TypeScript ' +
    'y Tailwind CSS. Integra captura multicanal de hallazgos, Triage de Inteligencia Artificial, derivacion multi-sector, ' +
    'auditoria de procesos, recorridas de fin de semana, generacion de hojas de calculo Excel (.xlsx) con diseno institucional, ' +
    'certificados de felicitacion y una Revista de Inteligencia Clinica en PDF. Acceso en produccion: ' + DOC.url
  );

  p = checkSpace(doc, p, 20, logoUrl);
  tocEntries.push({ titulo: '2.2 Stack Tecnologico', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '2.2 Stack Tecnologico');

  autoTable(doc, {
    startY: p,
    margin: { left: ML, right: MR },
    head: [['Capa', 'Tecnologia', 'Version', 'Proposito']],
    body: [
      ['Frontend',      'Vite + React',          '7.x / 19.x', 'Interfaz clinica reactiva de pantalla completa'],
      ['Lenguaje',      'TypeScript',            '5.9.x',      'Tipado estatico estricto de extremo a extremo'],
      ['Estilos',       'Tailwind CSS',          'v4',         'Estetica Limpia y Clinica (Calidad-QOAG)'],
      ['Backend & DB',  'Supabase PostgreSQL',   '2.x / 15+',  'Base de datos relacional, RLS, Auth y Storage'],
      ['Motor PDF',     'jsPDF + AutoTable',     '4.x / 5.x',  'Revista Institucional, Certificados y Fichas PDF'],
      ['Motor Excel',   'ExcelJS',               '4.x',        'Planillas .xlsx con logo, KPIs y colores institucionales'],
      ['Visualizacion', 'Chart.js + React-Chart','4.x',        'Graficos explicativos de linea y barras con etiquetas'],
      ['Motor IA',      'Edge Functions + LLM',  'GPT-4o',     'Triage clinico automatico y Dossier Prescriptivo IA'],
      ['Mensajeria',    'WhatsApp Cloud API',    'v2',         'Alertas de asignacion, recordatorios SLA y cierre'],
      ['Deploy',        'Vercel Cloud',          'Edge',       'Despliegue continuo CI/CD desde rama main'],
    ],
    headStyles: { fillColor: C.tableHead, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: C.textMain },
    alternateRowStyles: { fillColor: C.tableRow2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      2: { cellWidth: 24 },
    },
  });
  p = (doc as any).lastAutoTable.finalY + 6;

  p = checkSpace(doc, p, 20, logoUrl);
  tocEntries.push({ titulo: '2.3 Arquitectura del Sistema', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '2.3 Arquitectura del Sistema');

  autoTable(doc, {
    startY: p,
    margin: { left: ML, right: MR },
    head: [['Componente', 'Descripcion', 'Tecnologia']],
    body: [
      ['SPA Frontend',         'Interfaz React compilada con Vite y servida por Vercel',       'React + TypeScript'],
      ['Auth Provider',        'Gestion de sesion por JWT con Supabase Auth',                  'Supabase Auth'],
      ['Database Layer',       'Tablas PostgreSQL: tickets, assignments, comments, users',      'Supabase / PostgreSQL'],
      ['Row Level Security',   'Politicas RLS que restringen acceso segun rol de usuario',     'PostgreSQL RLS'],
      ['Edge Functions',       'Funciones serverless para alertas y notificaciones',            'Deno (Supabase)'],
      ['WhatsApp Integration', 'Envio de mensajes via BuilderBot Cloud API',                   'BuilderBot + Meta API'],
      ['IA Assistant (Dora)',  'Chatbot institucional entrenado en protocolos de calidad',      'OpenAI GPT-4o-mini'],
      ['PDF Engine',           'Generacion de reportes en el navegador sin server-side',        'jsPDF + jsPDF-AutoTable'],
    ],
    headStyles: { fillColor: C.tableHead, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: C.textMain },
    alternateRowStyles: { fillColor: C.tableRow2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 }, 2: { cellWidth: 45 } },
  });
  p = (doc as any).lastAutoTable.finalY + 6;

  // ══════════════════════════════════════
  // SECCIÓN 3: Acceso y Autenticación
  // ══════════════════════════════════════
  p = newPage(doc, logoUrl);
  tocEntries.push({ titulo: 'SECCION 3 - Acceso y Autenticacion', page: doc.getNumberOfPages(), level: 0 });
  p = sectionTitle(doc, p, 'SECCION 3 - ACCESO Y AUTENTICACION');

  tocEntries.push({ titulo: '3.1 Ingreso al Sistema', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '3.1 Ingreso al Sistema');
  p = paragraph(doc, p,
    `El sistema QOAG es accesible desde cualquier navegador web moderno (Chrome, Firefox, Edge, Safari) ` +
    `mediante la URL: ${DOC.url}\n` +
    `No requiere instalacion de software adicional. Se recomienda una resolucion minima de 1280x720 px.`
  );

  p = checkSpace(doc, p, 20, logoUrl);
  tocEntries.push({ titulo: '3.2 Procedimiento de Inicio de Sesion', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '3.2 Procedimiento de Inicio de Sesion');
  p = numberedList(doc, p, [
    `Ingresar a la URL: ${DOC.url}`,
    'Hacer clic en el boton "Ingresar" ubicado en la barra de navegacion superior derecha.',
    'Ingresar el correo electronico institucional en el campo "Email".',
    'Ingresar la contrasena asignada por el Administrador.',
    'Hacer clic en "Iniciar sesion".',
    'Si la cuenta requiere aprobacion, el sistema redirige a la pantalla de "Pendiente de aprobacion".',
    'Una vez autenticado, el sistema redirige al modulo correspondiente segun el rol asignado.',
  ]);

  p = checkSpace(doc, p, 30, logoUrl);
  p = noteBox(doc, p,
    'Si el usuario no recuerda su contrasena, debe comunicarse con el Administrador del sistema al correo ' +
    'innovacion@sanatorioargentino.com.ar. No existe recupero automatico por correo en esta version.',
    'warning'
  );

  p = checkSpace(doc, p, 20, logoUrl);
  tocEntries.push({ titulo: '3.3 Registro de Nuevo Usuario', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '3.3 Registro de Nuevo Usuario');
  p = numberedList(doc, p, [
    `Acceder a la URL: ${DOC.url}/registro`,
    'Completar el formulario con nombre completo, correo institucional, contrasena y sector.',
    'Completar el proceso de onboarding indicando sector y cargo.',
    'El sistema notifica al Administrador para la aprobacion de la cuenta.',
    'Una vez aprobada, el usuario recibira acceso al sistema.',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  tocEntries.push({ titulo: '3.4 Cierre de Sesion', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '3.4 Cierre de Sesion');
  p = numberedList(doc, p, [
    'Hacer clic en el boton "Salir" (icono de salida) ubicado en la barra de navegacion.',
    'El sistema muestra un modal de confirmacion.',
    'Confirmar para cerrar la sesion. El sistema redirige a la pantalla de login.',
    'Por seguridad, cerrar el navegador o pestana al finalizar el trabajo.',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  tocEntries.push({ titulo: '3.5 Modos de Visualizacion', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '3.5 Modos de Visualizacion');
  p = paragraph(doc, p,
    'El sistema adapta automaticamente la interfaz segun el dispositivo. Soporta dispositivos de escritorio, ' +
    'tablets y moviles. En dispositivos moviles, la barra de navegacion colapsa en un menu hamburguesa ' +
    'accesible mediante el icono de tres lineas en la esquina superior derecha.'
  );

  // ══════════════════════════════════════
  // SECCIÓN 4: Módulos del Sistema
  // ══════════════════════════════════════
  p = newPage(doc, logoUrl);
  tocEntries.push({ titulo: 'SECCION 4 - Modulos del Sistema', page: doc.getNumberOfPages(), level: 0 });
  p = sectionTitle(doc, p, 'SECCION 4 - MODULOS DEL SISTEMA');

  // 4.1 Formulario de Reporte y Triage IA
  tocEntries.push({ titulo: '4.1 Formulario de Reporte y Triage IA', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.1 Formulario de Reporte y Triage Automatico IA (Inicio)');
  p = paragraph(doc, p,
    'Modulo de acceso libre (sin requerir inicio de sesion) que permite a cualquier colaborador o paciente ' +
    'notificar un hallazgo, sugerencia o felicitacion de forma anonima o identificada.'
  );
  p = bulletList(doc, p, [
    'Tipologias: Desvio, Observacion, Oportunidad de Mejora, Evento Adverso / Cuasi Adverso y Felicitacion',
    'Dictado por voz integrado y carga de evidencia fotografica o documental',
    'Triage IA instantaneo: clasifica severidad en Rojo (Critico), Amarillo (Medio) o Verde (Leve) y genera resumen ejecutivo',
    'Emision de codigo unico de seguimiento (#SA-XXXX) con descarga de comprobante oficial en PDF',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 4.2 Seguimiento Publico
  tocEntries.push({ titulo: '4.2 Seguimiento Publico y Conformidad', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.2 Seguimiento Publico y Evaluacion de Conformidad');
  p = paragraph(doc, p,
    'Permite consultar la trazabilidad en tiempo real mediante el codigo #SA-XXXX y evaluar la conformidad ' +
    'de la respuesta una vez cerrado el caso.'
  );
  p = bulletList(doc, p, [
    'Consulta de estado actual: Pendiente, En Gestion, En Validacion de Calidad o Resuelto',
    'Descarga de Ficha Oficial en PDF o Certificado de Reconocimiento (cuando se trata de una Felicitacion)',
    'Retroalimentacion del reportante (Conforme / No Conforme) para auditoria del Comite de Calidad',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 4.3 Tablero Central de Casos
  tocEntries.push({ titulo: '4.3 Tablero Central de Casos (Dashboard)', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.3 Tablero Central de Casos (Dashboard de Calidad)');
  p = paragraph(doc, p,
    'Centro de comando operativo para Administradores y Comité de Calidad en vista de pantalla completa.'
  );
  p = bulletList(doc, p, [
    'Acordeon colapsable de Alertas de Vencimiento para priorizar plazos sin saturar la vista',
    'Derivacion simple o multiple a uno o varios sectores simultaneamente',
    'Seleccion de modalidad de gestion: Gestion Simple (cierre directo) vs. Desvio (exige Causa Raiz, Plan Correctivo y Evidencia)',
    'Validacion final de Calidad antes del cierre definitivo y notificacion automatica por WhatsApp',
    'Exportacion institucional del listado filtrado a Excel (.xlsx con logo y KPIs) y PDF A4 apaisado',
  ]);

  p = newPage(doc, logoUrl);
  // 4.4 Mis Casos y Seguimientos
  tocEntries.push({ titulo: '4.4 Mis Casos y Seguimientos (Monitoreo)', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.4 Mis Casos y Seguimientos (Panel del Responsable)');
  p = paragraph(doc, p,
    'Espacio de trabajo exclusivo para Responsables de Sector con dos pestanas operativas: Casos Asignados y Seguimientos.'
  );
  p = bulletList(doc, p, [
    'Pestana Casos Asignados: lista de casos derivados al sector con acceso directo a la pantalla de resolucion',
    'Pestana Seguimientos (Monitoreo): trazabilidad de todos los hallazgos recibidos y emitidos por el servicio',
    'Descarga directa de Mis Casos en Excel (.xlsx estilizado con logo del Sanatorio) y en PDF institucional',
    'Descarga individual de Ficha PDF de cada caso o Certificado Oficial de Felicitacion',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 4.5 Inteligencia de Calidad (Metricas)
  tocEntries.push({ titulo: '4.5 Inteligencia de Calidad y Revista IA', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.5 Inteligencia de Calidad (Metricas, SLA, PDCA y Revista PDF)');
  p = paragraph(doc, p,
    'Observatorio estadistico y clinico para Administradores, Directivos y Responsables con lectura pedagogica de cada indicador.'
  );
  p = bulletList(doc, p, [
    'Glosario de 6 KPIs explicados en pantalla (que mide cada metrica y cual es la meta institucional esperada)',
    'Grafico de Linea Explicativo de Evolucion Temporal (Casos Ingresados vs. Resueltos vs. Criticos)',
    'Graficos de Barras Explicativos por Sector (Recibidos y Emitidos), Clasificacion, Tipo de Hallazgo y Gravedad Triage IA',
    'Ventana Emergente por Gravedad: al seleccionar Leves (Verdes), Medios (Amarillos), Criticos (Rojos) o Felicitaciones se abre un modal interactivo con buscador y descarga directa en PDF y Excel sin salir de Metricas',
    'Radar de Tiempo de Respuesta (SLA Operativo) colapsable: prioriza casos Por Vencer y Recientes (<=30 dias) separandolos del Pasivo Historico (>30 dias / SA-LEG)',
    'Explorador Desplegable del Ciclo PDCA (30, 60 y 90 dias): consulta el 100% de las verificaciones sin limite de 1000 filas y las agrupa en acordeones por Sector o Etapa para optimizar la memoria RAM',
    'Exportacion de Revista Institucional / Sectorial / Executive Brief en PDF (5 paginas con diseno editorial, graficos de alta resolucion con etiquetas de datos y Dossier IA Descriptivo, Diagnostico, Predictivo y Prescriptivo)',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 4.6 Auditoria de Proceso y Recorridas
  tocEntries.push({ titulo: '4.6 Auditoria de Proceso y Fin de Semana', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.6 Auditoria de Proceso y Recorridas de Fin de Semana');
  p = bulletList(doc, p, [
    'Auditoria de Proceso: relevamiento estructurado en terreno con calculo de adherencia y desvio automatico',
    'Recorridas de Guardia y Fin de Semana: registro digital de novedades operativas y exportacion de informe ejecutivo',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 4.7 Centro de Ayuda y Administracion
  tocEntries.push({ titulo: '4.7 Centro de Ayuda, Usuarios y Alertas', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.7 Centro de Ayuda (/guia), Usuarios y Alertas');
  p = bulletList(doc, p, [
    'Centro de Ayuda y Guias (/guia): flujo interactivo de 6 etapas, matriz de gestion Simple vs. Desvio, guias por rol y preguntas frecuentes',
    'Gestion de Usuarios (/usuarios): aprobacion de altas, asignacion de multiples sectores y cambio de rol',
    'Destinatarios de Alertas (/alertas): configuracion de telefonos WhatsApp y correos por servicio',
  ]);

  // ══════════════════════════════════════
  // SECCIÓN 5: Integración con Sistemas
  // ══════════════════════════════════════
  p = newPage(doc, logoUrl);
  tocEntries.push({ titulo: 'SECCION 5 - Integracion con Sistemas Externos', page: doc.getNumberOfPages(), level: 0 });
  p = sectionTitle(doc, p, 'SECCION 5 - INTEGRACION CON SISTEMAS EXTERNOS');

  // 5.1 Supabase
  tocEntries.push({ titulo: '5.1 Supabase (Base de Datos y Auth)', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '5.1 Supabase - Base de Datos y Autenticacion');
  p = paragraph(doc, p,
    'Supabase actua como Backend as a Service (BaaS) del sistema. Provee la base de datos PostgreSQL, ' +
    'el modulo de autenticacion JWT, el sistema de almacenamiento de archivos (Storage) y las ' +
    'Edge Functions (funciones serverless en Deno).'
  );
  p = bulletList(doc, p, [
    'Tablas principales: tickets, assignments, comments, users_extended, alert_recipients',
    'Row Level Security (RLS): restriccion de acceso por politicas segun rol',
    'Auth: registro, inicio de sesion, recupero de sesion por JWT',
    'Edge Functions: disparadas por eventos de base de datos (triggers)',
    'Storage: almacenamiento de evidencias adjuntas a casos',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 5.2 WhatsApp / BuilderBot
  tocEntries.push({ titulo: '5.2 WhatsApp / BuilderBot', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '5.2 WhatsApp / BuilderBot - Mensajeria Institucional');
  p = paragraph(doc, p,
    'Integracion con la API de WhatsApp Business via BuilderBot Cloud API para envio de notificaciones ' +
    'automaticas y comunicacion bidireccional entre el sistema y los usuarios/responsables.'
  );
  p = bulletList(doc, p, [
    'Notificacion automatica al responsable al recibir un nuevo caso',
    'Alerta de vencimiento de SLA al responsable y al administrador',
    'Envio de mensajes manuales desde el tablero de casos',
    'Asistente Dora: chatbot institucional de atencion por WhatsApp',
    'Templates de mensajes predefinidos con variables dinamicas ({nombre}, {ticket}, {sector})',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 5.3 OpenAI / Dora
  tocEntries.push({ titulo: '5.3 OpenAI / Asistente Dora', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '5.3 OpenAI / Asistente Dora - Inteligencia Artificial');
  p = paragraph(doc, p,
    'Dora es la asistente virtual institucional del Sanatorio Argentino, basada en el modelo GPT-4o-mini ' +
    'de OpenAI. Actua como primer punto de contacto para consultas de empleados via WhatsApp y desde ' +
    'el chat embebido en el sistema web.'
  );
  p = bulletList(doc, p, [
    'Respuestas a preguntas frecuentes sobre procesos de calidad',
    'Guia para completar el formulario de reporte',
    'Informacion sobre estado de casos (integrado con Supabase)',
    'Escalado automatico a un humano si no puede resolver la consulta',
    'Entrenamiento en protocolos ITAES y normativas del sanatorio',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 5.4 Vercel
  tocEntries.push({ titulo: '5.4 Vercel - Deploy y CI/CD', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '5.4 Vercel - Deploy y CI/CD');
  p = paragraph(doc, p,
    'La aplicacion esta desplegada en Vercel con integracion continua. Cada push a la rama main del ' +
    'repositorio GitHub dispara un build automatico y deploy a produccion en menos de 2 minutos.'
  );
  p = bulletList(doc, p, [
    `URL de produccion: ${DOC.url}`,
    'SSL/HTTPS automatico con certificado renovado por Vercel',
    'CDN global para carga rapida desde cualquier ubicacion',
    'Variables de entorno gestionadas en el panel de Vercel',
    'Previews automaticos por Pull Request para testing',
  ]);

  // ══════════════════════════════════════
  // SECCIÓN 6: Roles y Permisos
  // ══════════════════════════════════════
  p = newPage(doc, logoUrl);
  tocEntries.push({ titulo: 'SECCION 6 - Roles y Permisos de Acceso', page: doc.getNumberOfPages(), level: 0 });
  p = sectionTitle(doc, p, 'SECCION 6 - ROLES Y PERMISOS DE ACCESO');

  tocEntries.push({ titulo: '6.1 Roles del Sistema', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '6.1 Roles del Sistema');

  autoTable(doc, {
    startY: p,
    margin: { left: ML, right: MR },
    head: [['Rol', 'Codigo', 'Descripcion', 'Perfil Tipico']],
    body: [
      ['Administrador', 'admin',      'Acceso total al sistema, gestion de usuarios y configuracion', 'Jefe de Calidad / IT'],
      ['Responsable',   'responsable','Gestion de casos asignados, resolucion y metricas',            'Jefe de Servicio / Sector'],
      ['Directivo',     'directivo',  'Solo lectura: metricas e indicadores. Sin gestion de casos',  'Gerencia / Direccion Medica'],
      ['Publico',       '(sin auth)', 'Reporte de eventos y seguimiento por ticket (sin login)',      'Cualquier empleado'],
    ],
    headStyles: { fillColor: C.tableHead, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: C.textMain },
    alternateRowStyles: { fillColor: C.tableRow2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28 }, 1: { cellWidth: 26 } },
  });
  p = (doc as any).lastAutoTable.finalY + 8;

  tocEntries.push({ titulo: '6.2 Matriz de Acceso por Modulo', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '6.2 Matriz de Acceso por Modulo');

  p = checkSpace(doc, p, 80, logoUrl);
  autoTable(doc, {
    startY: p,
    margin: { left: ML, right: MR },
    head: [['Modulo / Funcion', 'Admin', 'Responsable', 'Directivo', 'Publico']],
    body: [
      ['Formulario de Reporte',          'Total',         'Total',         'Total',         'Total'],
      ['Seguimiento por Ticket',         'Total',         'Total',         'Total',         'Total'],
      ['Guia de Uso',                    'Total',         'Total',         'Total',         'Total'],
      ['Changelog',                      'Total',         'Total',         'Total',         'Total'],
      ['Tablero de Casos (Dashboard)',   'Total',         'Total',         'Sin acceso',    'Sin acceso'],
      ['Mis Casos',                      'Total',         'Total',         'Sin acceso',    'Sin acceso'],
      ['Resolucion de Casos',            'Total',         'Total',         'Sin acceso',    'Sin acceso'],
      ['Metricas e Indicadores',         'Total',         'Total',         'Solo lectura',  'Sin acceso'],
      ['Administracion de Usuarios',     'Total',         'Sin acceso',    'Sin acceso',    'Sin acceso'],
      ['Configuracion de Alertas',       'Total',         'Sin acceso',    'Sin acceso',    'Sin acceso'],
      ['Perfil de Usuario',              'Total',         'Total',         'Sin acceso',    'Sin acceso'],
      ['Chat con Dora (IA)',             'Total',         'Total',         'Total',         'Sin acceso'],
      ['Exportacion PDF / Excel',        'Total',         'Total',         'Solo lectura',  'Sin acceso'],
      ['Manual del Sistema',             'Total',         'Total',         'Total',         'Sin acceso'],
    ],
    headStyles: { fillColor: C.tableHead, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: C.textMain },
    alternateRowStyles: { fillColor: C.tableRow2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 26, halign: 'center' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index > 0) {
        const val = data.cell.raw;
        if (val === 'Total')        { data.cell.styles.textColor = [39, 174, 96];  data.cell.styles.fontStyle = 'bold'; }
        if (val === 'Sin acceso')   { data.cell.styles.textColor = [192, 57, 43]; }
        if (val === 'Solo lectura') { data.cell.styles.textColor = [41, 128, 185]; }
      }
    },
  });
  p = (doc as any).lastAutoTable.finalY + 8;

  p = checkSpace(doc, p, 25, logoUrl);
  p = noteBox(doc, p,
    'Leyenda de colores:\n' +
    'Total: acceso completo de lectura y escritura (verde)\n' +
    'Solo lectura: puede ver pero no modificar (azul)\n' +
    'Sin acceso: el modulo no es visible para este rol (rojo)',
    'info'
  );

  // ══════════════════════════════════════
  // SECCIÓN 7: Procedimientos ante Fallas
  // ══════════════════════════════════════
  p = newPage(doc, logoUrl);
  tocEntries.push({ titulo: 'SECCION 7 - Procedimientos ante Fallas del Sistema', page: doc.getNumberOfPages(), level: 0 });
  p = sectionTitle(doc, p, 'SECCION 7 - PROCEDIMIENTOS ANTE FALLAS DEL SISTEMA');

  tocEntries.push({ titulo: '7.1 Tabla de Errores Frecuentes', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '7.1 Tabla de Errores Frecuentes y Acciones Correctivas');

  autoTable(doc, {
    startY: p,
    margin: { left: ML, right: MR },
    head: [['Error / Sintoma', 'Causa Probable', 'Accion Correctiva', 'Escalada']],
    body: [
      [
        'No puedo iniciar sesion',
        'Contrasena incorrecta o cuenta no aprobada',
        'Verificar credenciales. Si persiste, contactar al Admin.',
        'Admin del sistema',
      ],
      [
        'El formulario de reporte no se envia',
        'Error de red o campo obligatorio incompleto',
        'Verificar conexion a internet. Revisar campos con asterisco.',
        'Soporte IT',
      ],
      [
        'No recibo notificaciones por correo',
        'Direccion incorrecta o filtro anti-spam',
        'Verificar carpeta de spam. Confirmar email con Admin.',
        'Admin del sistema',
      ],
      [
        'El PDF no se descarga / genera error',
        'Bloqueador de popups activo en el navegador',
        'Deshabilitar bloqueador de popups para este sitio.',
        'Soporte IT',
      ],
      [
        'Dora no responde en WhatsApp',
        'Servicio IA fuera de linea o limite de API',
        'Esperar 5 minutos y reintentar. Reportar si persiste.',
        'Soporte IT',
      ],
      [
        'Los casos no aparecen en el Tablero',
        'Filtros activos o error de permisos RLS',
        'Limpiar filtros. Si persiste, cerrar y reiniciar sesion.',
        'Admin del sistema',
      ],
      [
        'El sistema muestra pantalla en blanco',
        'Error de JavaScript o actualizacion del sistema',
        'Limpiar cache del navegador (Ctrl+Shift+Delete) y recargar.',
        'Soporte IT',
      ],
      [
        'Las metricas no cargan o muestran 0',
        'Sin datos en el periodo seleccionado o error de consulta',
        'Ampliar rango de fechas. Si persiste, contactar al Admin.',
        'Admin del sistema',
      ],
    ],
    headStyles: { fillColor: C.tableHead, textColor: C.white, fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: C.textMain },
    alternateRowStyles: { fillColor: C.tableRow2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
      1: { cellWidth: 38 },
      2: { cellWidth: 50 },
      3: { cellWidth: 30 },
    },
  });
  p = (doc as any).lastAutoTable.finalY + 8;

  p = checkSpace(doc, p, 20, logoUrl);
  tocEntries.push({ titulo: '7.2 Contacto de Soporte Tecnico', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '7.2 Contacto de Soporte Tecnico');

  autoTable(doc, {
    startY: p,
    margin: { left: ML, right: MR },
    head: [['Tipo de Soporte', 'Contacto', 'Disponibilidad']],
    body: [
      ['Soporte IT (Grow Labs)',     'innovacion@sanatorioargentino.com.ar',  'Lunes a Viernes 8:00 - 18:00 hs'],
      ['Administrador del Sistema',  'Jefe de Calidad (interno)',              'Horario administrativo'],
      ['Emergencia tecnica critica', 'Guardia IT: interno 5555',               '24/7 para incidentes criticos'],
    ],
    headStyles: { fillColor: C.tableHead, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: C.textMain },
    alternateRowStyles: { fillColor: C.tableRow2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 48 } },
  });
  p = (doc as any).lastAutoTable.finalY + 8;

  p = checkSpace(doc, p, 35, logoUrl);
  tocEntries.push({ titulo: '7.3 Plan de Contingencia', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '7.3 Plan de Contingencia');
  p = noteBox(doc, p,
    'PLAN DE CONTINGENCIA ANTE CAIDA DEL SISTEMA\n' +
    'En caso de indisponibilidad total del sistema QOAG, se activara el siguiente protocolo:\n' +
    '1. Registrar el evento en el formulario fisico de NC/EA (Formulario QOAG-F-001, disponible en Calidad).\n' +
    '2. Notificar al Jefe de Calidad via telefono o correo electronico.\n' +
    '3. El Jefe de Calidad centralizara los registros y los cargara al sistema una vez restaurado.\n' +
    '4. Tiempo maximo de contingencia aceptado: 4 horas en horario habitual, 24 hs en guardia.\n' +
    '5. Toda contingencia mayor a 2 horas debe ser reportada al Departamento de Calidad.',
    'danger'
  );

  // ══════════════════════════════════════
  // SECCIÓN 8: Historial de Versiones
  // ══════════════════════════════════════
  p = newPage(doc, logoUrl);
  tocEntries.push({ titulo: 'SECCION 8 - Historial de Versiones', page: doc.getNumberOfPages(), level: 0 });
  p = sectionTitle(doc, p, 'SECCION 8 - HISTORIAL DE VERSIONES');

  autoTable(doc, {
    startY: p,
    margin: { left: ML, right: MR },
    head: [['Version', 'Fecha', 'Descripcion de Cambios', 'Responsable']],
    body: [
      ['2.0', DOC.fecha,    'Actualizacion integral v2.0: Revista Institucional PDF con IA, ventana emergente por gravedad (Verde/Amarillo/Rojo), Radar SLA priorizado, Ciclo PDCA desplegable sin limite de filas, exportacion Excel/PDF estilizada en Mis Casos, Certificados de Felicitacion y nueva Guia interactiva.', 'Innovacion y Transformacion Digital / Grow Labs'],
      ['1.5', '25/10/2026', 'Incorporacion de Auditoria de Proceso y Recorridas de Guardia, Fin de Semana y Feriados.', 'Grow Labs / Calidad'],
      ['1.0', '01/06/2026', 'Version inicial del Manual de Procedimientos ITAES. Incluye todas las secciones 1-9.', 'Grow Labs / Calidad'],
      ['0.9', '15/05/2026', 'Incorporacion del modulo Mis Casos y mejoras en la derivacion multi-sector.',          'Grow Labs'],
      ['0.8', '20/04/2026', 'Integracion de Dora (IA) en chat web y WhatsApp bidireccional.',                       'Grow Labs'],
      ['0.7', '10/03/2026', 'Ciclo PDCA completo implementado. Formulario de resolucion con accion correctiva.',    'Grow Labs'],
      ['0.6', '20/02/2026', 'Dashboard de metricas y exportacion inicial a Excel y PDF.',                           'Grow Labs'],
      ['0.5', '15/01/2026', 'Sistema de roles y permisos: Admin / Responsable / Directivo.',                        'Grow Labs'],
    ],
    headStyles: { fillColor: C.tableHead, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: C.textMain },
    alternateRowStyles: { fillColor: C.tableRow2 },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 42 },
    },
  });
  p = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════
  // SECCIÓN 9: Firmas y Aprobaciones ITAES
  // ══════════════════════════════════════
  p = newPage(doc, logoUrl);
  tocEntries.push({ titulo: 'SECCION 9 - Firmas y Aprobaciones (ITAES)', page: doc.getNumberOfPages(), level: 0 });
  p = sectionTitle(doc, p, 'SECCION 9 - FIRMAS Y APROBACIONES (ITAES)');

  p = paragraph(doc, p,
    'De conformidad con los requisitos del proceso de acreditacion ITAES, el presente Manual de ' +
    'Procedimientos debe contar con las firmas de los responsables de su elaboracion, revision y aprobacion. ' +
    'Las firmas a continuacion certifican que el documento ha sido revisado y aprobado en su version ' + DOC.version + '.'
  );

  p = divider(doc, p);

  // 3 bloques de firma ITAES
  const firmasItaes = [
    {
      titulo:   'ELABORO',
      nombre:   DOC.elaboro,
      cargo:    'Innovacion y Transformacion Digital',
      subtitulo: 'Responsable de Elaboracion',
    },
    {
      titulo:   'REVISO',
      nombre:   DOC.reviso,
      cargo:    'Departamento de Calidad',
      subtitulo: 'Responsable de Revision',
    },
    {
      titulo:   'APROBO',
      nombre:   DOC.aprobo,
      cargo:    'Direccion Medica / Gerencia',
      subtitulo: 'Autoridad Aprobadora',
    },
  ];

  const firmaW = (CW - 8) / 3;
  const firmaH = 60;
  const firmaY = p;

  firmasItaes.forEach((f, i) => {
    const bx = ML + i * (firmaW + 4);

    // Fondo
    doc.setFillColor(...C.grayLight);
    doc.setDrawColor(...C.primaryMid);
    doc.setLineWidth(0.5);
    doc.roundedRect(bx, firmaY, firmaW, firmaH, 3, 3, 'FD');

    // Header del bloque
    doc.setFillColor(...C.primary);
    doc.roundedRect(bx, firmaY, firmaW, 12, 3, 3, 'F');
    doc.setFillColor(...C.primary);
    doc.rect(bx, firmaY + 9, firmaW, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.white);
    doc.text(f.titulo, bx + firmaW / 2, firmaY + 8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.textSub);
    doc.text(f.subtitulo, bx + firmaW / 2, firmaY + 17, { align: 'center' });

    // Linea de firma
    doc.setDrawColor(...C.grayMid);
    doc.setLineWidth(0.7);
    doc.line(bx + 8, firmaY + 36, bx + firmaW - 8, firmaY + 36);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.textMain);
    const nameLines = doc.splitTextToSize(f.nombre, firmaW - 10);
    doc.text(nameLines, bx + firmaW / 2, firmaY + 41, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textSub);
    doc.text(f.cargo, bx + firmaW / 2, firmaY + 47, { align: 'center' });

    // Fecha
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.text(`Fecha: ${DOC.fecha}`, bx + firmaW / 2, firmaY + 54, { align: 'center' });
  });

  p = firmaY + firmaH + 12;
  doc.setTextColor(...C.textMain);

  // Nota de estado del documento
  p = noteBox(doc, p,
    `Estado del Documento: ${DOC.estado}\n` +
    `Codigo: ${DOC.codigo} | Version: ${DOC.version} | Fecha: ${DOC.fecha}\n` +
    'Este documento es de caracter CONTROLADO. Toda copia impresa se considera NO CONTROLADA. ' +
    'La version vigente siempre se encuentra en el sistema digital. ' +
    'Ante cualquier discrepancia entre la version impresa y la digital, prevalece la digital.',
    'info'
  );

  p = divider(doc, p);

  // Tabla de control de copias
  p = checkSpace(doc, p, 40, logoUrl);
  autoTable(doc, {
    startY: p,
    margin: { left: ML, right: MR },
    head: [['N. de Copia', 'Titular', 'Formato', 'Ubicacion']],
    body: [
      ['01', 'Departamento de Calidad',                  '[Digital]', 'Sistema QOAG (original)'],
      ['02', 'Direccion Medica',                         '[Digital]', 'Sistema QOAG (solo lectura)'],
      ['03', 'Innovacion y Transformacion Digital',      '[Digital]', 'Repositorio GitHub / Vercel'],
      ['--', 'Copias impresas',                          '[Impreso]', 'No Controlado - ver nota'],
    ],
    headStyles: { fillColor: C.tableHead, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: C.textMain },
    alternateRowStyles: { fillColor: C.tableRow2 },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 24, halign: 'center' },
    },
  });

  // ═══════════════════════════════════════════════
  // SEGUNDA PASADA: PINTAR ÍNDICE EN PÁGINA 2
  // ═══════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();

  doc.setPage(tocPageNum);
  // Limpiar área de contenido
  doc.setFillColor(...C.white);
  doc.rect(0, 18, W, H - 30, 'F');

  let iy = MT;
  // Título del índice
  doc.setFillColor(...C.primary);
  doc.rect(ML, iy, CW, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.white);
  doc.text('INDICE GENERAL', ML + 4, iy + 6.5);
  doc.setTextColor(...C.textMain);
  iy += 14;

  tocEntries.forEach(entry => {
    if (iy > H - MB - 5) return; // overflow protection
    const indent = entry.level === 1 ? 8 : 0;
    const dotLeader = '.'.repeat(80);

    doc.setFont('helvetica', entry.level === 0 ? 'bold' : 'normal');
    doc.setFontSize(entry.level === 0 ? 9 : 8.5);
    doc.setTextColor(entry.level === 0 ? C.primary[0] : C.textMain[0],
                     entry.level === 0 ? C.primary[1] : C.textMain[1],
                     entry.level === 0 ? C.primary[2] : C.textMain[2]);

    const titleW = CW - indent - 20;
    doc.text(entry.titulo, ML + indent, iy);

    // Linea de puntos
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.grayMid);
    const titleTextW = doc.getTextWidth(entry.titulo);
    const dotsStart = ML + indent + titleTextW + 2;
    const dotsEnd = W - MR - 12;
    if (dotsStart < dotsEnd) {
      const dotsW = dotsEnd - dotsStart;
      const dots = dotLeader.substring(0, Math.floor(dotsW / doc.getTextWidth('.')));
      doc.text(dots, dotsStart, iy);
    }

    // Número de página
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.primary);
    doc.text(String(entry.page), W - MR, iy, { align: 'right' });
    doc.setTextColor(...C.textMain);

    iy += entry.level === 0 ? 7.5 : 6;
    void titleW; // suppress unused warning
  });

  // ═══════════════════════════════════════════════
  // TERCERA PASADA: Actualizar headers con total de páginas
  // ═══════════════════════════════════════════════
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    drawHeader(doc, i, totalPages, logoUrl);
    drawFooter(doc);
  }

  // ─── DESCARGAR ──────────────────────────────────────────────────────────────
  doc.save(DOC.filename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE REACT — UI Interactiva del Manual de Procedimientos v2.0
// ═══════════════════════════════════════════════════════════════════════════════
export default function ManualProcedimientos() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [openSection, setOpenSection] = useState<string>('sec-4');

  const handleDownload = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      await generateManualPDF();
      setStatus('done');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (err) {
      console.error('[ManualProcedimientos] Error generando PDF:', err);
      setStatus('idle');
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  };

  const manualSections = [
    {
      id: 'sec-1',
      code: 'SECCIÓN 01',
      title: 'Propósito, Alcance Institucional y Glosario ITAES',
      icon: ShieldCheck,
      summary: 'Marco normativo de acreditación ITAES, objetivos de seguridad del paciente y definiciones clave.',
      items: [
        'Estandariza el ciclo completo desde la detección de un hallazgo o felicitación hasta la validación de efectividad PDCA.',
        'Clasificación clínica automática por Triage IA: Crítico (Rojo - SLA 24 hs), Moderado (Amarillo - SLA 48 hs) y Leve (Verde - SLA 48 hs).',
        'Abarca No Conformidades (Desvíos), Observaciones, Oportunidades de Mejora, Eventos Adversos/Cuasi Adversos y Felicitaciones al personal.',
      ],
    },
    {
      id: 'sec-2',
      code: 'SECCIÓN 02',
      title: 'Arquitectura Técnica y Motores de Exportación',
      icon: Layers,
      summary: 'Stack tecnológico Vite + React + TypeScript + Supabase + Motores editoriales PDF y ExcelJS.',
      items: [
        'Frontend SPA de pantalla completa con estética clínica institucional (#00548B / #00A99D) y diseño adaptable.',
        'Motor ExcelJS: genera libros .xlsx estilizados con logo institucional, tarjetas KPI, celdas semánticas y pie oficial.',
        'Motor Editorial PDF: genera Certificados de Reconocimiento, Fichas de Caso y la Revista Institucional de Inteligencia Clínica con gráficos de alta resolución.',
      ],
    },
    {
      id: 'sec-3',
      code: 'SECCIÓN 03',
      title: 'Acceso, Autenticación y Seguridad (RLS)',
      icon: Users,
      summary: 'Flujo de ingreso, registro con onboarding por sector y políticas Row Level Security.',
      items: [
        'Acceso libre para reportar eventos (/) y consultar estado por ticket (/seguimiento) o leer la guía (/guia).',
        'Autenticación protegida por JWT en Supabase con aprobación administrativa para nuevos usuarios (/registro).',
        'Aislamiento por rol: cada Responsable visualiza y gestiona únicamente los sectores asignados a su perfil.',
      ],
    },
    {
      id: 'sec-4',
      code: 'SECCIÓN 04',
      title: 'Módulos Operativos del Sistema (Actualización v2.0)',
      icon: BrainCircuit,
      summary: 'Detalle de los 9 módulos activos, incluyendo las nuevas herramientas de Inteligencia y Auditoría.',
      items: [
        '4.1 Reporte Público y Triage IA: grabación por voz, adjuntos y severidad automática.',
        '4.2 Tablero Central (Dashboard): acordeón colapsable de alertas, derivación multi-sector y modalidad Simple vs. Desvío.',
        '4.3 Mis Casos y Seguimientos: panel del responsable con exportación directa a Excel (.xlsx) y PDF institucional.',
        '4.4 Inteligencia de Calidad (Métricas): KPIs explicados, gráficos de línea y barras, ventana emergente interactiva por gravedad (Verde/Amarillo/Rojo) con descarga PDF, Radar SLA Operativo priorizado y Ciclo PDCA desplegable sin límite de registros.',
        '4.5 Revista Institucional PDF: publicación de 5 páginas con análisis Descriptivo, Diagnóstico, Predictivo y Prescriptivo.',
        '4.6 Auditoría de Proceso y Recorridas de Guardia/Fin de Semana: control de terreno y exportación ejecutiva.',
      ],
    },
    {
      id: 'sec-5',
      code: 'SECCIÓN 05',
      title: 'Integraciones: WhatsApp Cloud API, IA y Certificados',
      icon: Award,
      summary: 'Notificaciones automáticas a responsables, recordatorios SLA y diplomas de reconocimiento.',
      items: [
        'Envío automático de enlace de resolución por WhatsApp al derivar un caso a un responsable de sector.',
        'Recordatorio de SLA con un clic desde el Radar de Tiempo de Respuesta.',
        'Generación automática de Certificados Oficiales de Felicitación con estética dorada/institucional.',
      ],
    },
    {
      id: 'sec-6',
      code: 'SECCIÓN 06',
      title: 'Plan de Contingencia, Soporte y Control Documental ITAES',
      icon: Wrench,
      summary: 'Protocolo ante indisponibilidad, contactos de soporte e historial de versiones hasta v2.0.',
      items: [
        'Protocolo de contingencia física (Formulario QOAG-F-001) ante eventuales cortes de conectividad.',
        'Soporte técnico gestionado por Innovación y Transformación Digital · Grow Labs.',
        'Bloques de firma controlada ITAES (Elaboró / Revisó / Aprobó) listos para impresión y archivo oficial.',
      ],
    },
  ];

  return (
    <div className="w-full py-2 sm:py-4 space-y-6 font-sans animate-in fade-in duration-500">
      {/* Hero Banner Principal */}
      <div className="rounded-2xl shadow-sm overflow-hidden border border-slate-200/90 bg-white">
        <div
          className="relative px-6 sm:px-10 py-8 sm:py-10 text-white"
          style={{ background: 'linear-gradient(135deg, #003E6B 0%, #00548B 60%, #0076B6 100%)' }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[11px] font-black uppercase tracking-widest">
                <BookOpen className="w-3.5 h-3.5 text-[#00D1FF]" />
                Documento Controlado ITAES · {DOC.codigo} · Versión {DOC.version}
              </div>
              <h1 className="text-2xl sm:text-4xl font-display font-black tracking-tight">
                Manual de Procedimientos y Calidad
              </h1>
              <p className="text-sky-100 text-sm sm:text-base font-medium leading-relaxed">
                {DOC.sistema} — Documentación oficial actualizada con todos los módulos operativos, motores de exportación Excel/PDF, Radar SLA, Ciclo PDCA y Revista de Inteligencia Clínica.
              </p>
            </div>

            {/* Botón de Descarga Oficial */}
            <div className="shrink-0 flex flex-col sm:items-end gap-2">
              <button
                id="btn-descargar-manual"
                onClick={handleDownload}
                disabled={status === 'loading'}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-3 py-4 px-7 rounded-xl font-black text-sm transition-all duration-300 shadow-lg cursor-pointer ${
                  status === 'idle'
                    ? 'bg-white text-sanatorio-primary hover:bg-sky-50 hover:scale-[1.01]'
                    : status === 'loading'
                      ? 'bg-white/20 text-white cursor-not-allowed'
                      : 'bg-emerald-500 text-white'
                }`}
              >
                {status === 'idle' && (
                  <>
                    <Download className="w-5 h-5 text-sanatorio-primary" />
                    <div className="text-left">
                      <span className="block leading-none">Descargar Manual Oficial PDF</span>
                      <span className="block text-[10px] font-semibold text-slate-500 mt-1">
                        {DOC.filename} (9 Secciones ITAES)
                      </span>
                    </div>
                  </>
                )}
                {status === 'loading' && (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Maquetando Manual v{DOC.version}...</span>
                  </>
                )}
                {status === 'done' && (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>¡Manual PDF Descargado!</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Metadata Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-7 pt-6 border-t border-white/15">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl px-4 py-2.5 border border-white/15">
              <span className="text-sky-200 text-[10px] font-bold uppercase tracking-wider block">Código / Versión</span>
              <span className="text-white text-xs sm:text-sm font-black">{DOC.codigo} · v{DOC.version}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl px-4 py-2.5 border border-white/15">
              <span className="text-sky-200 text-[10px] font-bold uppercase tracking-wider block">Fecha de Emisión</span>
              <span className="text-white text-xs sm:text-sm font-black">{DOC.fecha}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl px-4 py-2.5 border border-white/15">
              <span className="text-sky-200 text-[10px] font-bold uppercase tracking-wider block">Estado Normativo</span>
              <span className="text-emerald-300 text-xs sm:text-sm font-black">{DOC.estado}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl px-4 py-2.5 border border-white/15">
              <span className="text-sky-200 text-[10px] font-bold uppercase tracking-wider block">Elaboración Técnica</span>
              <span className="text-white text-xs sm:text-sm font-black">Innovación y Transformación Digital</span>
            </div>
          </div>
        </div>

        {/* Resumen de Novedades de la Versión 2.0 */}
        <div className="p-6 sm:p-8 bg-slate-50/70 border-b border-slate-200/80">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-sanatorio-primary" />
            <h2 className="text-xs font-black uppercase tracking-widest text-sanatorio-primary">
              Actualizaciones Incorporadas en el Manual v2.0
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 text-sanatorio-primary font-black text-xs mb-1.5">
                <FileText className="w-4 h-4" />
                Revista Institucional IA
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Informe de 5 páginas con KPIs explicados, gráficos de línea y barras con valores directos y Dossier IA en 4 dimensiones.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-700 font-black text-xs mb-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                Exportación Excel & PDF
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Descarga en Mis Casos, Seguimientos y Métricas con logo del Sanatorio, colores institucionales y pie oficial.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 text-amber-700 font-black text-xs mb-1.5">
                <BrainCircuit className="w-4 h-4" />
                Modal por Gravedad & Radar SLA
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ventana emergente para auditar y bajar en PDF casos Verdes, Amarillos y Rojos, más Radar SLA que prioriza casos recientes.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2 text-teal-700 font-black text-xs mb-1.5">
                <Award className="w-4 h-4" />
                PDCA Sin Límites & Certificados
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Verificaciones PDCA (30/60/90d) sin tope de 1000 filas en acordeones de bajo consumo RAM y Diplomas de Felicitación.
              </p>
            </div>
          </div>
        </div>

        {/* Explorador Interactivo de Capítulos del Manual */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <h2 className="text-lg font-black text-slate-800">
                Índice Interactivo de Procedimientos (Lectura en Pantalla)
              </h2>
              <p className="text-xs text-slate-500">
                Hacé clic en cada capítulo para consultar los procedimientos vigentes o descargá el documento completo en PDF arriba.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {manualSections.map(sec => {
              const Icon = sec.icon;
              const isOpen = openSection === sec.id;
              return (
                <div
                  key={sec.id}
                  className="rounded-xl border border-slate-200/90 bg-white overflow-hidden transition-all"
                >
                  <div
                    onClick={() => setOpenSection(isOpen ? '' : sec.id)}
                    className="p-4 sm:p-5 bg-slate-50/60 hover:bg-slate-100/70 cursor-pointer flex items-center justify-between gap-4 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-sanatorio-primary/10 text-sanatorio-primary flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-sanatorio-primary block">
                          {sec.code}
                        </span>
                        <h3 className="text-sm sm:text-base font-black text-slate-800">{sec.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{sec.summary}</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="p-5 bg-white border-t border-slate-100 space-y-2.5 animate-in fade-in duration-200">
                      {sec.items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Aviso de Validez Normativa ITAES */}
        <div className="bg-amber-50/80 border-t border-amber-200/80 px-6 sm:px-8 py-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-900 font-bold text-sm mb-0.5">
                Control Documental ITAES — Vigencia y Validez
              </p>
              <p className="text-amber-800/90 text-xs leading-relaxed">
                El PDF generado incluye portada oficial, tabla de control documental, índice paginado automáticamente y bloques de firma para <strong>Elaboró ({DOC.elaboro})</strong>, <strong>Revisó ({DOC.reviso})</strong> y <strong>Aprobó ({DOC.aprobo})</strong>. La versión digital publicada en el sistema prevalece sobre cualquier copia impresa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
