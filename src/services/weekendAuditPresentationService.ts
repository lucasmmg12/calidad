import pptxgen from 'pptxgenjs';
import templateData from '../data/weekendAuditTemplate.json';
import type { AnswersState, PatientExperienceState } from '../context/WeekendAuditContext';

type AuditMetadata = {
  auditorName: string;
  auditDate: string;
};

export const exportWeekendAuditPPTX = async (
  answers: AnswersState, 
  patientExperience: PatientExperienceState,
  metadata: AuditMetadata
) => {
  const pres = new pptxgen();
  
  // Theme colors based on Sanatorio's palette
  const COLOR_PRIMARY = '0F172A'; // slate-900
  const COLOR_SECONDARY = '1E3A8A'; // blue-900 (Sanatorio Blue)
  const COLOR_LIGHT_BLUE = 'DBEAFE'; // blue-100
  
  pres.author = metadata.auditorName;
  pres.company = 'Sanatorio Argentino';
  pres.title = 'Auditoría de Fin de Semana';

  // --- SLIDE 1: Portada ---
  const slidePortada = pres.addSlide();
  slidePortada.background = { color: 'FFFFFF' };
  
  // Logo placeholder or text
  slidePortada.addText('Sanatorio Argentino', {
    x: 0.5, y: 0.5, w: 9, h: 1, 
    fontSize: 24, bold: true, color: COLOR_PRIMARY, align: 'center'
  });

  slidePortada.addText('AUDITORÍA DE FIN DE SEMANA', {
    x: 0.5, y: 2, w: 9, h: 1.5, 
    fontSize: 44, bold: true, color: COLOR_SECONDARY, align: 'center'
  });

  slidePortada.addText(`Auditor: ${metadata.auditorName || 'No especificado'}\nFecha: ${metadata.auditDate}`, {
    x: 0.5, y: 4, w: 9, h: 1, 
    fontSize: 18, color: '64748B', align: 'center'
  });

  // --- SLIDE 2: Metodología y Alcance ---
  const slideAlcance = pres.addSlide();
  slideAlcance.addText('Metodología y Alcance', {
    x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 32, bold: true, color: COLOR_PRIMARY
  });
  slideAlcance.addText('NOTA IMPORTANTE:', {
    x: 0.5, y: 1.8, w: 9, h: 0.5, fontSize: 20, bold: true, color: COLOR_SECONDARY
  });
  slideAlcance.addText(
    'Esta auditoría es de carácter muestral. Durante el fin de semana solo se realiza la evaluación ' + 
    'de los sectores seleccionados o que tuvieron actividad clínica y administrativa.\n\n' + 
    'Los sectores que no figuran en este reporte no fueron auditados en esta oportunidad.', {
    x: 0.5, y: 2.5, w: 9, h: 2, fontSize: 18, color: '334155', fill: { color: COLOR_LIGHT_BLUE }
  });

  // --- SLIDE 3: Resumen Global ---
  const slideResumen = pres.addSlide();
  slideResumen.addText('Resumen Global por Sector', {
    x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true, color: COLOR_PRIMARY
  });

  // Calculate sector scores
  const sectorSummary = templateData.sectors.map(sector => {
    let totalDemeritos = 0;
    let itemsEvaluados = 0;
    const sectorAnswers = answers[sector.name] || {};
    
    Object.values(sectorAnswers).forEach((ans: any) => {
      if (ans.cumple !== null || ans.demerito !== null) {
        if (ans.cumple === false) {
          totalDemeritos += (ans.demerito || 1);
        } else if (ans.demerito !== null && ans.cumple !== true) {
          totalDemeritos += ans.demerito;
        }
        itemsEvaluados++;
      }
    });

    return {
      sector: sector.name,
      demeritos: totalDemeritos,
      evaluados: itemsEvaluados,
      total: sector.items.length
    };
  }).filter(s => s.evaluados > 0);

  const tableData: any[] = [
    [
      { text: 'Sector', options: { bold: true, fill: { color: COLOR_SECONDARY }, color: 'FFFFFF' } },
      { text: 'Items Evaluados', options: { bold: true, fill: { color: COLOR_SECONDARY }, color: 'FFFFFF' } },
      { text: 'Deméritos Totales', options: { bold: true, fill: { color: COLOR_SECONDARY }, color: 'FFFFFF' } }
    ]
  ];

  sectorSummary.forEach((s, index) => {
    const isEven = index % 2 === 0;
    const rowFill = isEven ? COLOR_LIGHT_BLUE : 'FFFFFF';
    tableData.push([
      { text: s.sector, options: { fill: { color: rowFill } } },
      { text: `${s.evaluados} / ${s.total}`, options: { fill: { color: rowFill }, align: 'center' } },
      { text: s.demeritos.toString(), options: { bold: true, color: s.demeritos > 0 ? 'DC2626' : COLOR_SECONDARY, fill: { color: rowFill }, align: 'center' } }
    ]);
  });

  if (tableData.length > 1) {
    slideResumen.addTable(tableData, {
      x: 0.5, y: 1.5, w: 9, 
      border: { pt: 1, color: 'E2E8F0' },
      rowH: 0.4,
      fontSize: 14
    });
  } else {
    slideResumen.addText('No hay datos evaluados para mostrar.', { x: 0.5, y: 2, w: 9, fontSize: 16, color: '64748B' });
  }

  // --- SLIDES 4+: Detalles por Sector (Sólo los evaluados) ---
  templateData.sectors.forEach(sector => {
    const sectorAnswers = answers[sector.name] || {};
    const evaluados = Object.values(sectorAnswers).filter((a: any) => a && (a.cumple !== null || a.demerito !== null)).length;
    
    // Solo mostramos sectores que fueron auditados
    if (evaluados === 0) return;

    const itemsWithIssues = sector.items.map((item, index) => ({
      item: item.item,
      ans: sectorAnswers[index]
    })).filter(x => x.ans && (x.ans.cumple === false || (x.ans.demerito || 0) > 0 || (x.ans.observaciones && x.ans.observaciones.trim().length > 0)));

    const slideSector = pres.addSlide();
    slideSector.addText(`Sector: ${sector.name}`, {
      x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: COLOR_PRIMARY
    });

    const totalDemeritosSector = itemsWithIssues.reduce((acc, curr) => acc + (curr.ans.cumple === false ? (curr.ans.demerito || 1) : (curr.ans.demerito || 0)), 0);

    if (totalDemeritosSector === 0 && itemsWithIssues.length === 0) {
      slideSector.addText('✅ VEREDICTO: Cumplimiento satisfactorio en todos los ítems evaluados. No se encontraron desviaciones ni observaciones adicionales.', {
        x: 0.5, y: 1.2, w: 9, h: 1, fontSize: 16, bold: true, color: '059669', fill: { color: 'ECFDF5' }
      });
    } else {
      slideSector.addText('⚠️ VEREDICTO: Se encontraron desviaciones u observaciones relevantes. A continuación se detalla el reporte:', {
        x: 0.5, y: 1.2, w: 9, h: 0.8, fontSize: 16, bold: true, color: 'DC2626', fill: { color: 'FEF2F2' }
      });

      const sectorTableData: any[] = [
        [
          { text: 'Ítem Evaluado', options: { bold: true, fill: { color: COLOR_SECONDARY }, color: 'FFFFFF' } },
          { text: 'Demérito', options: { bold: true, fill: { color: COLOR_SECONDARY }, color: 'FFFFFF' } },
          { text: 'Observaciones', options: { bold: true, fill: { color: COLOR_SECONDARY }, color: 'FFFFFF' } }
        ]
      ];

      itemsWithIssues.forEach((issue, idx) => {
        const isEven = idx % 2 === 0;
        const rowFill = isEven ? COLOR_LIGHT_BLUE : 'FFFFFF';
        const demeritoValue = issue.ans.cumple === false ? (issue.ans.demerito || 1) : (issue.ans.demerito || 0);
        
        sectorTableData.push([
          { text: issue.item, options: { fill: { color: rowFill }, fontSize: 11 } },
          { text: demeritoValue.toString(), options: { fill: { color: rowFill }, fontSize: 12, bold: true, color: demeritoValue > 0 ? 'DC2626' : COLOR_SECONDARY, align: 'center' } },
          { text: issue.ans.observaciones || 'N/A', options: { fill: { color: rowFill }, fontSize: 11 } }
        ]);
      });

      slideSector.addTable(sectorTableData, {
        x: 0.5, y: 2.2, w: 9, 
        border: { pt: 1, color: 'E2E8F0' },
        autoPage: true,
        colW: [4, 1.5, 3.5]
      });
    }
  });

  // --- ÚLTIMO SLIDE: Experiencia del Paciente ---
  if (patientExperience.finalRating !== null || patientExperience.name) {
    const slideExp = pres.addSlide();
    slideExp.addText('Experiencia del Paciente', {
      x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true, color: COLOR_PRIMARY, fill: { color: 'F8FAFC' }
    });

    slideExp.addText(`Paciente: ${patientExperience.name || 'Anónimo'}\nServicio: ${patientExperience.service || 'N/A'}\nCalificación Final: ${patientExperience.finalRating || 0}/10`, {
      x: 0.5, y: 1.5, w: 9, h: 1.5, fontSize: 16, color: '334155'
    });
    
    slideExp.addText(`Comentarios Adicionales:\n${patientExperience.evaluation || 'Sin comentarios.'}`, {
      x: 0.5, y: 3.2, w: 9, h: 2, fontSize: 14, color: '64748B'
    });
  }

  // Save the presentation
  const fileName = `Auditoria_Finde_${metadata.auditDate.replace(/-/g, '')}.pptx`;
  await pres.writeFile({ fileName });
};

