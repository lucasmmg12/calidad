import pptxgen from 'pptxgenjs';
import templateData from '../data/weekendAuditTemplate.json';
import type { AnswersState, PatientExperienceState } from '../context/WeekendAuditContext';

type AuditMetadata = {
  auditorName: string;
  auditDate: string;
};

export const exportWeekendAuditPPTX = async (
  answers: AnswersState, 
  sectorPersonal: Record<string, string>,
  patientExperience: PatientExperienceState,
  metadata: AuditMetadata
) => {
  const pres = new pptxgen();
  
  // Theme colors
  const COLOR_TITLE = '3669C9'; // A blue similar to the one in the screenshots
  
  pres.author = metadata.auditorName;
  pres.company = 'Sanatorio Argentino';
  pres.title = 'Auditoría de Fin de Semana';

  // --- SLIDE MASTER ---
  // Define a master slide with the logos at the top and the banner at the bottom
  pres.defineSlideMaster({
    title: 'MASTER_SLIDE',
    background: { color: 'FFFFFF' },
    objects: [
      {
        // ITAES Logo (Top Left) - Placeholder using generic text if image not found, but trying to load itaes.png
        image: { x: 0.3, y: 0.2, w: 0.8, h: 0.8, path: '/itaes.png' }
      },
      {
        // Sanatorio Logo (Top Right)
        image: { x: 7.2, y: 0.2, w: 2.5, h: 0.6, path: '/logosanatorio.png' }
      },
      {
        // Footer Banner (Faces)
        image: { x: 0, y: 4.6, w: 10, h: 1, path: '/SANARG2021_fondo de pantalla.jpg', sizing: { type: 'cover', w: 10, h: 1 } }
      }
    ]
  });

  // --- SLIDE 1: Portada ---
  const slidePortada = pres.addSlide({ masterName: 'MASTER_SLIDE' });
  
  slidePortada.addText('AUDITORÍA FIN DE SEMANA', {
    x: 0.5, y: 2, w: 9, h: 1, 
    fontSize: 44, bold: true, color: COLOR_TITLE, align: 'center', shadow: { type: 'outer', color: '000000', blur: 3, offset: 2, opacity: 0.3 }
  });

  slidePortada.addText(metadata.auditDate, {
    x: 0.5, y: 3.2, w: 9, h: 1, 
    fontSize: 32, color: COLOR_TITLE, align: 'center'
  });

  // --- SECTOR SLIDES ---
  templateData.sectors.forEach(sector => {
    const sectorAnswers = answers[sector.name] || {};
    const evaluados = Object.values(sectorAnswers).filter((a: any) => a && (a.cumple !== null || a.demerito !== null)).length;
    
    // Solo mostramos sectores que fueron auditados
    if (evaluados === 0) return;

    const slideSector = pres.addSlide({ masterName: 'MASTER_SLIDE' });
    
    // Título del Sector
    slideSector.addText(sector.name.toUpperCase(), {
      x: 0.5, y: 0.6, w: 9, h: 1, 
      fontSize: 36, bold: true, color: COLOR_TITLE, align: 'center'
    });

    // Bullets de contenido
    const textObjects: any[] = [];
    
    // 1. Personal
    const personalStr = sectorPersonal[sector.name];
    if (personalStr && personalStr.trim().length > 0) {
      textObjects.push({
        text: `Personal: ${personalStr.trim()}`,
        options: { bullet: true, fontSize: 16, color: '000000', breakLine: true }
      });
    }

    // 2. Observaciones
    sector.items.forEach((item, index) => {
      const ans = sectorAnswers[index];
      if (ans) {
        if (ans.observaciones && ans.observaciones.trim().length > 0) {
          textObjects.push({
            text: ans.observaciones.trim(),
            options: { bullet: true, fontSize: 16, color: '000000', breakLine: true }
          });
        } else if (ans.cumple === false) {
          // Si no cumple pero no dejó observación, al menos listamos el ítem que falló
          textObjects.push({
            text: `NO CUMPLE: ${item.item}`,
            options: { bullet: true, fontSize: 16, color: 'DC2626', bold: true, breakLine: true }
          });
        }
      }
    });

    // Si no hay nada que mostrar en los bullets pero evaluaron
    if (textObjects.length === 0) {
      textObjects.push({
        text: 'Sector evaluado sin observaciones registradas.',
        options: { bullet: true, fontSize: 16, color: '64748B', breakLine: true }
      });
    }

    slideSector.addText(textObjects, {
      x: 0.8, y: 1.8, w: 8.5, h: 2.5,
      valign: 'top',
      lineSpacing: 24
    });
  });

  // --- ÚLTIMO SLIDE: Experiencia del Paciente ---
  if (patientExperience.finalRating !== null || patientExperience.name) {
    const slideExp = pres.addSlide({ masterName: 'MASTER_SLIDE' });
    
    slideExp.addText('EXPERIENCIA DEL PACIENTE', {
      x: 0.5, y: 0.6, w: 9, h: 1, 
      fontSize: 36, bold: true, color: COLOR_TITLE, align: 'center'
    });

    const expTexts: any[] = [];
    if (patientExperience.name) {
      expTexts.push({ text: `Paciente: ${patientExperience.name}`, options: { bullet: true, fontSize: 16, breakLine: true } });
    }
    if (patientExperience.service) {
      expTexts.push({ text: `Servicio: ${patientExperience.service}`, options: { bullet: true, fontSize: 16, breakLine: true } });
    }
    if (patientExperience.finalRating !== null) {
      expTexts.push({ text: `Calificación Final: ${patientExperience.finalRating}/10`, options: { bullet: true, fontSize: 16, bold: true, breakLine: true } });
    }
    if (patientExperience.evaluation) {
      expTexts.push({ text: `Comentarios: ${patientExperience.evaluation}`, options: { bullet: true, fontSize: 16, breakLine: true } });
    }

    slideExp.addText(expTexts, {
      x: 0.8, y: 1.8, w: 8.5, h: 2.5,
      valign: 'top',
      lineSpacing: 24
    });
  }

  // Save the presentation
  const fileName = `Auditoria_Finde_${metadata.auditDate.replace(/-/g, '')}.pptx`;
  await pres.writeFile({ fileName });
};
