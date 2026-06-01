import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BookOpen, Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

// ─── Paleta institucional ITAES / Grow Labs ──────────────────────────────────
const C = {
  primary:      [30,  87, 153] as [number, number, number],
  primaryMid:   [41, 128, 185] as [number, number, number],
  primaryLight: [214, 234, 248] as [number, number, number],
  accent:       [26,  82, 118] as [number, number, number],
  white:        [255, 255, 255] as [number, number, number],
  grayLight:    [245, 247, 250] as [number, number, number],
  grayMid:      [189, 195, 199] as [number, number, number],
  grayDark:     [52,  73,  94] as [number, number, number],
  textMain:     [30,  39,  46] as [number, number, number],
  textSub:      [86, 101, 115] as [number, number, number],
  tableHead:    [52,  73,  94] as [number, number, number],
  tableRow2:    [235, 243, 252] as [number, number, number],
  green:        [39, 174,  96] as [number, number, number],
  red:          [192,  57,  43] as [number, number, number],
  orange:       [211, 84,   0] as [number, number, number],
  yellow:       [241, 196,  15] as [number, number, number],
};

// ─── Constantes del documento ─────────────────────────────────────────────────
const DOC = {
  sistema:   'Sistema de Gestión de Calidad',
  sigla:     'QOAG',
  codigo:    'QOAG-MP-001',
  version:   '1.0',
  fecha:     '01/06/2026',
  estado:    'VIGENTE',
  elaboro:   'Área de Innovación y Transformación Digital / Grow Labs',
  reviso:    'Departamento de Calidad',
  aprobo:    'Dirección Médica',
  url:       'https://calidad.sanatorioargentino.com.ar',
  logo:      '/logosanatorio.png',
  filename:  'Manual_QOAG_v1.0_01-06-2026.pdf',
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

  // Logo pequeño
  if (logoUrl) {
    try { doc.addImage(logoUrl, 'PNG', ML, 2, 20, 14); } catch { /* fallback */ }
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

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(...C.textSub);
  doc.text(
    `DOCUMENTO CONTROLADO - Prohibida su reproduccion sin autorizacion. ${DOC.codigo} | Emitido: ${DOC.fecha}`,
    W / 2,
    H - 5,
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

  // Logo institucional
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', W / 2 - 25, 10, 50, 35);
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
    'Reporte de no conformidades, eventos adversos, sugerencias y felicitaciones',
    'Seguimiento publico de casos por numero de ticket',
    'Gestion y resolucion interna por Responsables y Administradores',
    'Metricas e indicadores de calidad con filtros temporales',
    'Notificaciones automaticas por correo y WhatsApp',
    'Comunicacion directa con Dora (asistente IA institucional)',
    'Administracion de usuarios, roles y permisos',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  tocEntries.push({ titulo: '1.3 Acronimos y Definiciones', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '1.3 Acronimos y Definiciones');

  p = checkSpace(doc, p, 50, logoUrl);
  autoTable(doc, {
    startY: p,
    margin: { left: ML, right: MR },
    head: [['Termino / Sigla', 'Definicion']],
    body: [
      ['QOAG',      'Sistema de Gestion de Calidad del Sanatorio Argentino'],
      ['ITAES',     'Instituto Tecnico para la Acreditacion de Establecimientos de Salud'],
      ['NC',        'No Conformidad: evento que no cumple con el estandar esperado'],
      ['EA',        'Evento Adverso: incidente con consecuencias para el paciente o personal'],
      ['SLA',       'Service Level Agreement: tiempo maximo de resolucion por tipo de caso'],
      ['PDCA',      'Plan-Do-Check-Act: ciclo de mejora continua'],
      ['Ticket',    'Numero unico asignado a cada caso al momento del reporte'],
      ['Supabase',  'Plataforma BaaS (Backend as a Service) con PostgreSQL y auth'],
      ['Dora',      'Asistente virtual institucional basado en IA (OpenAI / WhatsApp)'],
      ['ROI',       'Responsable de area que gestiona los casos asignados'],
      ['Admin',     'Administrador del sistema con acceso total'],
      ['Directivo', 'Rol de solo lectura con acceso a metricas e indicadores'],
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
    'El QOAG es una aplicacion web Single Page Application (SPA) desarrollada sobre Vite + React + TypeScript ' +
    'con Tailwind CSS v4. Implementa un flujo completo de gestion de calidad hospitalaria con autenticacion ' +
    'por roles, reporte anonimo o identificado de eventos, tablero de casos, metricas avanzadas, ' +
    'notificaciones automaticas y asistencia por IA. La aplicacion esta desplegada en Vercel con acceso ' +
    `en produccion: ${DOC.url}`
  );

  p = checkSpace(doc, p, 20, logoUrl);
  tocEntries.push({ titulo: '2.2 Stack Tecnologico', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '2.2 Stack Tecnologico');

  autoTable(doc, {
    startY: p,
    margin: { left: ML, right: MR },
    head: [['Capa', 'Tecnologia', 'Version', 'Proposito']],
    body: [
      ['Frontend',    'Vite + React',      '7.x / 19.x',  'Framework de interfaz de usuario'],
      ['Lenguaje',    'TypeScript',        '5.9.x',        'Tipado estatico'],
      ['Estilos',     'Tailwind CSS',      'v4',           'Sistema de diseno utilitario'],
      ['Backend',     'Supabase',          '2.x',          'Base de datos, Auth y Storage'],
      ['Base de datos','PostgreSQL',       '15+',          'Motor relacional principal'],
      ['PDF',         'jsPDF + AutoTable', '4.x / 5.x',   'Generacion de reportes PDF'],
      ['Graficos',    'Chart.js',          '4.x',          'Visualizacion de metricas'],
      ['IA',          'OpenAI / Dora',     'GPT-4o-mini',  'Asistente conversacional'],
      ['Mensajeria',  'BuilderBot + WA',   'Cloud API',    'Notificaciones WhatsApp'],
      ['Deploy',      'Vercel',            '-',            'Hosting y CI/CD automatico'],
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

  // 4.1 Formulario de Reporte
  tocEntries.push({ titulo: '4.1 Formulario de Reporte de Eventos', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.1 Formulario de Reporte de Eventos (Inicio)');
  p = paragraph(doc, p,
    'Modulo principal accesible sin autenticacion. Permite a cualquier empleado o colaborador reportar ' +
    'un evento de calidad de forma anonima o identificada. Es la puerta de entrada al ciclo PDCA.'
  );
  p = bulletList(doc, p, [
    'Seleccion de tipo de evento: No Conformidad, Evento Adverso, Sugerencia, Felicitacion',
    'Campo de descripcion con soporte de grabacion de voz (Voice Recorder)',
    'Seleccion de sector y area afectada',
    'Adjunto de evidencia fotografica o documental',
    'Notificacion automatica al responsable del area por correo y/o WhatsApp',
    'Generacion de numero de ticket unico para seguimiento',
    'Confirmacion visual con confetti y codigo de seguimiento',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 4.2 Seguimiento
  tocEntries.push({ titulo: '4.2 Seguimiento de Casos (Publico)', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.2 Seguimiento de Casos (Publico)');
  p = paragraph(doc, p,
    'Modulo accesible sin autenticacion. Permite a cualquier usuario consultar el estado de su reporte ' +
    'ingresando el numero de ticket recibido al momento del reporte.'
  );
  p = bulletList(doc, p, [
    'Busqueda por numero de ticket',
    'Visualizacion del estado actual: Abierto, En proceso, Resuelto, Cerrado',
    'Timeline de actividad del caso',
    'Descarga de comprobante de reporte en PDF',
    'Informacion de contacto del responsable (si aplica)',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 4.3 Tablero de Casos
  tocEntries.push({ titulo: '4.3 Tablero de Casos (Admin / Responsable)', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.3 Tablero de Casos (Dashboard)');
  p = paragraph(doc, p,
    'Modulo protegido para Administradores y Responsables. Centro operativo del ciclo de calidad. ' +
    'Muestra todos los casos segun estado y permite gestionarlos de forma integral.'
  );
  p = bulletList(doc, p, [
    'Vista Kanban: Abiertos / En proceso / Resueltos / Cerrados',
    'Filtros por sector, tipo, prioridad, responsable y periodo',
    'Asignacion y reasignacion de casos a responsables',
    'Indicadores SLA (semaforo verde/amarillo/rojo segun tiempo de resolucion)',
    'Formulario de resolucion con acciones correctivas PDCA',
    'Solicitud de informacion adicional al reportante',
    'Exportacion de casos a Excel / PDF',
    'Alertas de vencimiento de SLA',
    'Comunicacion por WhatsApp desde el mismo caso',
  ]);

  p = newPage(doc, logoUrl);
  // 4.4 Mis Casos
  tocEntries.push({ titulo: '4.4 Mis Casos (Panel Personal)', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.4 Mis Casos (Panel Personal del Responsable)');
  p = paragraph(doc, p,
    'Vista personalizada para Responsables que muestra exclusivamente los casos asignados a su usuario. ' +
    'Permite gestion rapida sin perderse en el tablero global.'
  );
  p = bulletList(doc, p, [
    'Lista filtrada de casos propios con indicador de prioridad',
    'Acceso rapido al formulario de resolucion',
    'Estado SLA por caso (dias restantes / vencidos)',
    'Notificaciones de nuevos casos asignados',
    'Historial de casos resueltos propios',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 4.5 Metricas
  tocEntries.push({ titulo: '4.5 Metricas e Indicadores', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.5 Metricas e Indicadores');
  p = paragraph(doc, p,
    'Dashboard analitico con indicadores clave de calidad. Accesible para Administradores, Responsables ' +
    'y Directivos. Soporta filtros por periodo, sector y tipo de evento.'
  );
  p = bulletList(doc, p, [
    'KPIs principales: Total reportes / Tasa de resolucion / SLA cumplido / Tiempo promedio',
    'Graficos de evolucion temporal (lineas)',
    'Distribucion por tipo y sector (torta / barras)',
    'Mapa de calor de eventos por area',
    'Ranking de sectores con mas incidencias',
    'Exportacion a PDF o Excel del reporte de metricas',
    'Comparativo periodico (mes actual vs anterior)',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 4.6 Administracion de Usuarios
  tocEntries.push({ titulo: '4.6 Administracion de Usuarios', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.6 Administracion de Usuarios (Solo Admin)');
  p = paragraph(doc, p,
    'Modulo exclusivo del Administrador para gestionar las cuentas de usuario del sistema.'
  );
  p = bulletList(doc, p, [
    'Listado de todos los usuarios registrados con filtros',
    'Aprobacion o rechazo de nuevas cuentas pendientes',
    'Asignacion y modificacion de roles',
    'Desactivacion de cuentas',
    'Busqueda por nombre, correo o sector',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 4.7 Alertas
  tocEntries.push({ titulo: '4.7 Configuracion de Alertas', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.7 Configuracion de Alertas (Solo Admin)');
  p = bulletList(doc, p, [
    'Gestion de destinatarios de alertas automaticas por correo',
    'Configuracion de umbrales de notificacion por tipo y sector',
    'Prueba de envio de alertas',
    'Historial de notificaciones enviadas',
  ]);

  p = checkSpace(doc, p, 20, logoUrl);
  // 4.8 Guia de Uso
  tocEntries.push({ titulo: '4.8 Guia de Uso', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.8 Guia de Uso (Publica)');
  p = paragraph(doc, p,
    'Pagina informativa con instrucciones paso a paso para el reporte de eventos. Accesible sin ' +
    'autenticacion. Incluye preguntas frecuentes, tipos de eventos y protocolo de accion.'
  );

  p = checkSpace(doc, p, 20, logoUrl);
  // 4.9 Changelog
  tocEntries.push({ titulo: '4.9 Registro de Actualizaciones', page: doc.getNumberOfPages(), level: 1 });
  p = subTitle(doc, p, '4.9 Registro de Actualizaciones (Changelog)');
  p = paragraph(doc, p,
    'Pagina publica con el historial de versiones y mejoras del sistema. ' +
    'Permite a los usuarios conocer las novedades de cada release.'
  );

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
      ['1.0', '01/06/2026', 'Version inicial del Manual de Procedimientos ITAES. Incluye todas las secciones 1-9.', 'Grow Labs / Calidad'],
      ['0.9', '15/05/2026', 'Incorporacion del modulo Mis Casos y mejoras en la derivacion multi-sector.',          'Grow Labs'],
      ['0.8', '20/04/2026', 'Integracion de Dora (IA) en chat web y WhatsApp bidireccional.',                       'Grow Labs'],
      ['0.7', '10/03/2026', 'Ciclo PDCA completo implementado. Formulario de resolucion con accion correctiva.',    'Grow Labs'],
      ['0.6', '20/02/2026', 'Dashboard de metricas con Recharts. Exportacion a Excel y PDF.',                       'Grow Labs'],
      ['0.5', '15/01/2026', 'Sistema de roles y permisos: Admin / Responsable / Directivo.',                        'Grow Labs'],
      ['0.4', '10/12/2025', 'Notificaciones automaticas por correo y WhatsApp (BuilderBot).',                       'Grow Labs'],
      ['0.3', '15/11/2025', 'Tablero de casos con filtros, estados Kanban y SLA.',                                  'Grow Labs'],
      ['0.2', '01/10/2025', 'Formulario de reporte anonimo/identificado con generacion de ticket.',                 'Grow Labs'],
      ['0.1', '01/09/2025', 'Prototipo inicial: formulario basico de reporte y seguimiento.',                       'Grow Labs'],
    ],
    headStyles: { fillColor: C.tableHead, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: C.textMain },
    alternateRowStyles: { fillColor: C.tableRow2 },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 38 },
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
// COMPONENTE REACT — UI del Manual
// ═══════════════════════════════════════════════════════════════════════════════
export default function ManualProcedimientos() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

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

  const contenido = [
    'Portada con control documental ITAES y bloques de firma',
    'Indice General con numeracion real de paginas',
    'Seccion 1: Introduccion, alcance, acronimos y definiciones',
    'Seccion 2: Descripcion del sistema, stack tecnologico y arquitectura',
    'Seccion 3: Acceso, autenticacion y procedimientos de sesion',
    'Seccion 4: Descripcion detallada de todos los modulos (9 modulos)',
    'Seccion 5: Integraciones con Supabase, WhatsApp, OpenAI y Vercel',
    'Seccion 6: Roles, permisos y matriz de acceso con colores ITAES',
    'Seccion 7: Errores frecuentes, soporte y plan de contingencia',
    'Seccion 8: Historial completo de versiones del sistema',
    'Seccion 9: Firmas ITAES - Elaboro / Reviso / Aprobo',
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 font-sans">
      {/* Card principal */}
      <div className="rounded-2xl shadow-xl overflow-hidden border border-blue-100">

        {/* Header azul */}
        <div
          className="relative px-8 py-8"
          style={{ background: 'linear-gradient(135deg, #1E5799 0%, #2980B9 100%)' }}
        >
          {/* Badge ITAES */}
          <div className="absolute top-5 right-6 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/30">
            ITAES COMPLIANT
          </div>

          <div className="flex items-start gap-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl flex-shrink-0 mt-1">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div className="flex-grow">
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">{DOC.codigo}</p>
              <h1 className="text-white font-bold text-2xl leading-tight mb-1">Manual de Procedimientos</h1>
              <p className="text-blue-100 text-sm font-medium">{DOC.sistema}</p>
              <p className="text-blue-200/70 text-xs mt-1">Sistema de Reporte y Gestion de No Conformidades · Sanatorio Argentino</p>
            </div>
          </div>

          {/* Chips de metadata */}
          <div className="flex flex-wrap gap-2 mt-6">
            {[
              { label: 'Version', value: DOC.version },
              { label: 'Emision', value: DOC.fecha },
              { label: 'Estado',  value: DOC.estado },
            ].map(chip => (
              <div key={chip.label} className="bg-white/15 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                <span className="text-blue-200 text-[10px] font-semibold uppercase tracking-wider block">{chip.label}</span>
                <span className="text-white text-xs font-bold">{chip.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="bg-white px-8 py-7">
          <p className="text-slate-600 text-sm leading-relaxed mb-5">
            Este manual cumple con los requisitos del proceso de acreditacion{' '}
            <span className="font-semibold text-blue-700">ITAES</span> e incluye toda la documentacion
            necesaria para la evaluacion institucional. Generado programaticamente con estructura
            de 9 secciones, encabezados, pie de pagina, indice con paginacion real y bloques de firma.
          </p>

          {/* Lista de contenido */}
          <div className="bg-slate-50 rounded-xl p-5 mb-6 border border-slate-100">
            <h2 className="text-slate-700 font-bold text-sm mb-3 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-blue-500 inline-block"></span>
              Contenido del documento PDF
            </h2>
            <ul className="space-y-1.5">
              {contenido.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-slate-600 text-xs">
                  <span className="text-green-500 font-bold mt-0.5 flex-shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Boton de descarga */}
          <button
            id="btn-descargar-manual"
            onClick={handleDownload}
            disabled={status === 'loading'}
            className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold text-sm transition-all duration-300 shadow-md cursor-pointer
              ${status === 'idle'    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:-translate-y-0.5' : ''}
              ${status === 'loading' ? 'bg-blue-100 text-blue-400 cursor-not-allowed' : ''}
              ${status === 'done'    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' : ''}
            `}
          >
            {status === 'idle' && (
              <>
                <Download className="w-5 h-5" />
                Descargar Manual ({DOC.filename})
              </>
            )}
            {status === 'loading' && (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generando PDF... esto puede tomar unos segundos
              </>
            )}
            {status === 'done' && (
              <>
                <CheckCircle2 className="w-5 h-5" />
                ¡PDF Descargado Exitosamente!
              </>
            )}
          </button>

          <p className="text-center text-slate-400 text-xs mt-2">
            El archivo se guardara como: <span className="font-mono text-slate-500">{DOC.filename}</span>
          </p>
        </div>

        {/* Card de aviso ITAES */}
        <div className="bg-amber-50 border-t border-amber-200 px-8 py-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-bold text-sm mb-1">Proceso de Aprobacion Institucional ITAES</p>
              <p className="text-amber-700 text-xs leading-relaxed">
                Este manual debe ser impreso, firmado por los responsables (Elaboro / Reviso / Aprobo)
                y archivado en el Departamento de Calidad. La version digital en el sistema prevalece
                sobre cualquier copia impresa. Ante actualizaciones, el Administrador debe incrementar
                el numero de version y generar un nuevo PDF.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metadatos adicionales */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { label: 'Elaboro',  value: DOC.elaboro },
          { label: 'Reviso',   value: DOC.reviso },
          { label: 'Aprobo',   value: DOC.aprobo },
          { label: 'URL',      value: DOC.url },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm">
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">{item.label}</p>
            <p className="text-slate-700 text-xs font-medium mt-0.5 break-words">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
