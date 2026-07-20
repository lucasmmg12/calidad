const fs = require('fs');
const file = 'src/components/ManualProcedimientos.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Reemplazar colores por la paleta blanco y negro y DOC constants
code = code.replace(/const DOC = \{[\s\S]*?\};/, \const DOC = {
  sistema:   'Sistema Administración',
  sigla:     'QOAG',
  codigo:    'ITYS 23',
  revision:  '01',
  version:   '1.0',
  fecha:     new Date().toLocaleDateString('es-AR'),
  estado:    'VIGENTE',
  autor:     'lucas marinero',
  departamento: 'Innovación y transformación digital',
  elaboro:   'lucas marinero',
  reviso:    'Gabriela Iragorre',
  aprobo:    'Dr. Carlos Buteler',
  url:       'https://calidad.sanatorioargentino.com.ar',
  logo:      '/logosanatorio.png',
  filename:  'Manual_QOAG_v1.0.pdf',
};\);

// 2. Reemplazar drawHeader
code = code.replace(/function drawHeader[\\s\\S]*?function drawFooter/m, \unction drawHeader(doc: jsPDF, pageNum: number, totalPages: number, logoUrl: string | null) {
  doc.setDrawColor(0, 0, 0); // black borders
  doc.setLineWidth(0.3);
  doc.setTextColor(0, 0, 0);

  // Fila 1 y 2 (Grid principal)
  // Col 1: Logo + texto
  doc.rect(ML, 10, 45, 20, 'S'); // Logo box
  if (logoUrl) {
    try { doc.addImage(logoUrl, 'PNG', ML + 2, 12, 12, 12); } catch { /* fallback */ }
  }
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('SANATORIO', ML + 28, 14, { align: 'center' });
  doc.text('ARGENTINO SRL', ML + 28, 17, { align: 'center' });
  doc.line(ML + 16, 18, ML + 45, 18);
  doc.text('INNOVACIÓN Y', ML + 28, 22, { align: 'center' });
  doc.text('TRANSFORMACIÓN DIGITAL', ML + 28, 25, { align: 'center' });

  // Col 2: INSTRUCTIVO + Título
  doc.rect(ML + 45, 10, CW - 90, 20, 'S');
  doc.setFontSize(8);
  doc.text('INSTRUCTIVO:', ML + 47, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(DOC.sistema.toUpperCase(), ML + 45 + ((CW - 90)/2), 22, { align: 'center' });

  // Col 3: Código + Revisión + Pág
  doc.rect(ML + CW - 45, 10, 45, 20, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(DOC.codigo, ML + CW - 22.5, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Revisión Nº ' + DOC.revision, ML + CW - 22.5, 22, { align: 'center' });
  doc.setFontSize(8);
  doc.text(\\\Pág. \ de \\\\, ML + CW - 22.5, 28, { align: 'center' });

  // Fila Inferior
  doc.rect(ML, 30, CW, 5, 'S');
  doc.setFontSize(7.5);
  doc.text('VALIDO SOLO EN FORMATO ELECTRÓNICO – LAS COPIAS EN PAPEL CARECEN DE VALOR', ML + (CW/2), 33.5, { align: 'center' });
}

function drawFooter\);

// 3. Reemplazar drawFooter por vacío y crear drawSignatures
code = code.replace(/function drawFooter\\(doc: jsPDF\\) \\{[\\s\\S]*?\\}/m, \unction drawFooter(doc: jsPDF) {
  // En formato ITAES las paginas intermedias no suelen llevar footer, solo el header repetido.
}

function drawSignatures(doc: jsPDF, y: number) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.setTextColor(0, 0, 0);

  const colW = CW / 3;
  
  // Row 1: Headers
  doc.rect(ML, y, colW, 5, 'S');
  doc.rect(ML + colW, y, colW, 5, 'S');
  doc.rect(ML + colW * 2, y, colW, 5, 'S');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('ELABORADO:', ML + 2, y + 3.5);
  doc.text('REVISADO:', ML + colW + 2, y + 3.5);
  doc.text('APROBADO:', ML + colW * 2 + 2, y + 3.5);

  // Row 2: Signatures block
  doc.rect(ML, y + 5, colW, 20, 'S');
  doc.rect(ML + colW, y + 5, colW, 20, 'S');
  doc.rect(ML + colW * 2, y + 5, colW, 20, 'S');

  doc.setFontSize(8);
  // Elaborado
  doc.text(DOC.elaboro, ML + colW / 2, y + 19, { align: 'center' });
  doc.text(DOC.departamento, ML + colW / 2, y + 23, { align: 'center' });

  // Revisado
  doc.text(DOC.reviso, ML + colW + colW / 2, y + 19, { align: 'center' });
  doc.text('Responsable Documentos SGC', ML + colW + colW / 2, y + 23, { align: 'center' });

  // Aprobado
  doc.text(DOC.aprobo, ML + colW * 2 + colW / 2, y + 19, { align: 'center' });
  doc.text('Director Médico', ML + colW * 2 + colW / 2, y + 23, { align: 'center' });

  return y + 25;
}\);

// 4. Reemplazar estilos de títulos y notas
code = code.replace(/function noteBox[\\s\\S]*?function sectionTitle/m, \unction noteBox(
  doc: jsPDF,
  y: number,
  text: string,
  type: 'info' | 'warning' | 'danger' | 'success' = 'info'
): number {
  const maxW = CW - 4;
  let lines: string[] = [];
  text.split('\\n').forEach(part => {
    lines = lines.concat(doc.splitTextToSize(part.trim(), maxW - 10));
  });
  const boxH = lines.length * 4.8 + 10;

  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, y, CW, boxH, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(\\\[NOTA]\\\, ML + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(lines, ML + 4, y + 11);

  return y + boxH + 4;
}

function sectionTitle\);

code = code.replace(/function sectionTitle[\\s\\S]*?function subTitle/m, \unction sectionTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(text.toUpperCase(), ML, y + 5.5);
  return y + 10;
}

function subTitle\);

code = code.replace(/function subTitle[\\s\\S]*?function paragraph/m, \unction subTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(text, ML + 3, y + 4.5);
  return y + 8;
}

function paragraph\);

// 5. Ajustar márgenes
code = code.replace(/const MT = 28;/, 'const MT = 40;');
code = code.replace(/const MB = 22;/, 'const MB = 15;');

// 6. Eliminar la portada antigua de generateManualPDF e inyectar tablas
code = code.replace(/\\/\\/ --- PÁGINA 1: PORTADA[\\s\\S]*?let currentY = MT;/m, \// --- PÁGINA 1: PORTADA ITAES ------------------------------------------------------
  let currentY = 40;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setDrawColor(0,0,0);
  doc.setLineWidth(0.3);
  doc.rect(ML, currentY, CW, 5, 'S');
  doc.setFillColor(230, 230, 230);
  doc.rect(ML, currentY, CW, 5, 'F');
  doc.text('REVISIONES', ML + CW/2, currentY + 3.5, { align: 'center' });
  currentY += 5;

  autoTable(doc, {
    startY: currentY,
    margin: { left: ML, right: MR },
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3, font: 'helvetica' },
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    head: [['Nº', 'Descripción de los cambios', 'Autor', 'Fecha vigencia']],
    body: [
      ['00', 'Versión original', 'Pamela Araya', '20/03/2024'],
      ['01', 'Actualización de flujo de procesos y contenido', 'Pamela Araya\\nMarcelo Rodriguez\\nPablo Samat', '14/08/2024']
    ]
  });
  currentY = (doc as any).lastAutoTable.finalY + 5;

  doc.setFont('helvetica', 'bold');
  doc.rect(ML, currentY, CW, 5, 'S');
  doc.setFillColor(230, 230, 230);
  doc.rect(ML, currentY, CW, 5, 'F');
  doc.text('DOCUMENTOS DE REFERENCIA', ML + CW/2, currentY + 3.5, { align: 'center' });
  currentY += 5;

  autoTable(doc, {
    startY: currentY,
    margin: { left: ML, right: MR },
    theme: 'grid',
    styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3, font: 'helvetica' },
    headStyles: { fillColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    head: [['Código', 'Título del documento']],
    body: [
      ['', '']
    ]
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;\);

// 7. Reemplazar las referencias al color primario por negro en AutoTables
code = code.replace(/headStyles: \\{ fillColor: C\\.primaryMid/g, "headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0,0,0], lineWidth: 0.3");
code = code.replace(/headStyles: \\{ fillColor: C\\.primary/g, "headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0,0,0], lineWidth: 0.3");
code = code.replace(/styles: \\{ fontSize: 8, textColor: C\\.textMain \\}/g, "styles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.3 }");

// 8. Al final del PDF, agregar las firmas
code = code.replace(/const totalPages = doc\\.getNumberOfPages\\(\\);/m, \currentY = checkSpace(doc, currentY, 30, logoUrl);
  currentY = drawSignatures(doc, currentY + 10);
  const totalPages = doc.getNumberOfPages();\);

// Guardar
fs.writeFileSync(file, code);
console.log('Done!');
