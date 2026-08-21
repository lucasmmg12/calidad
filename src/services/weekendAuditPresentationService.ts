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
  const COLOR_SECONDARY = '059669'; // emerald-600
  
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

  // --- SLIDE 2: Resumen Global ---
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
      if (ans.demerito !== null) {
        totalDemeritos += ans.demerito;
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

  sectorSummary.forEach(s => {
    tableData.push([
      { text: s.sector, options: {} },
      { text: `${s.evaluados} / ${s.total}`, options: {} },
      { text: s.demeritos.toString(), options: { bold: true, color: s.demeritos > 0 ? 'DC2626' : '059669' } }
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

  // --- SLIDES 3+: Detalles por Sector ---
  templateData.sectors.forEach(sector => {
    const sectorAnswers = answers[sector.name] || {};
    const itemsWithIssues = sector.items.map((item, index) => ({
      item: item.item,
      ans: sectorAnswers[index]
    })).filter(x => x.ans && ((x.ans.demerito || 0) > 0 || (x.ans.observaciones && x.ans.observaciones.trim().length > 0)));

    if (itemsWithIssues.length > 0) {
      const slideSector = pres.addSlide();
      slideSector.addText(`Detalle: ${sector.name}`, {
        x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, bold: true, color: COLOR_PRIMARY
      });

      let yPos = 1.2;
      itemsWithIssues.forEach(issue => {
        // Prevent overflowing slide (very basic logic, a real impl might chunk to multiple slides)
        if (yPos > 4.5) return;

        slideSector.addText(`Ítem: ${issue.item}`, {
          x: 0.5, y: yPos, w: 9, h: 0.3, fontSize: 12, bold: true, color: '334155'
        });
        yPos += 0.3;
        
        slideSector.addText(`Demérito: ${issue.ans.demerito || 0} | Observaciones: ${issue.ans.observaciones || 'N/A'}`, {
          x: 0.8, y: yPos, w: 8.7, h: 0.3, fontSize: 11, color: (issue.ans.demerito || 0) > 0 ? 'DC2626' : '64748B'
        });
        yPos += 0.5;
      });
      
      if (itemsWithIssues.length > 6) {
         slideSector.addText('... (más ítems omitidos en esta vista)', { x: 0.8, y: 5.2, w: 8.7, fontSize: 10, italic: true });
      }
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
