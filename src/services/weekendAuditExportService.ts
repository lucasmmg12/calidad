import * as XLSX from 'xlsx';

export const exportWeekendAudit = async (
  answers: any,
  patientExperience: any,
  auditorId: string
) => {
  // 1. Fetch template from public folder
  const response = await fetch('/templates/RSGC_03_10_CHECK_LIST_AFDS_UCI_SR_GCM.xlsx');
  const arrayBuffer = await response.arrayBuffer();

  // 2. Read workbook
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // 3. Find and fill data
  // Convert sheet to JSON (array of arrays) for easy row manipulation
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

  // Fill Date and Auditor
  // Based on the JSON template, Date is around row 2 (0-indexed). We will find it.
  for (let i = 0; i < 15; i++) {
    const row = data[i];
    if (!row) continue;
    if (row.includes('Fecha:')) {
      const dateIndex = row.indexOf('Fecha:');
      data[i][dateIndex + 1] = new Date().toLocaleDateString('es-AR');
    }
    if (row.includes('Auditor:')) {
      const auditorIndex = row.indexOf('Auditor:');
      data[i][auditorIndex + 1] = auditorId;
    }
  }

  // Iterate to fill answers
  let currentSector = null;
  let itemIndex = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;
    
    const col0 = String(row[0]).trim();
    if (i < 30) continue;
    if (col0 === 'ÍTEM') continue;

    let isSector = false;
    if (col0.match(/\(\d+\)$/) || col0 === 'SHOCK ROOM' || col0.startsWith('UCI -') || col0 === 'CONSULTORIO DE GUARDIA CLINICA MEDICA') {
      isSector = true;
    }

    if (isSector) {
      currentSector = col0;
      itemIndex = 0;
    } else if (currentSector && !col0.startsWith('CRITERIO') && col0 !== 'EXPERIENCIA A PACIENTE') {
      // It's an item, let's inject the answer
      const answer = answers[currentSector]?.[itemIndex];
      
      if (answer) {
        // Observaciones are usually in Column F (index 5)
        // Deméritos in Column J (index 9)
        while (data[i].length < 10) {
          data[i].push(null);
        }
        data[i][5] = answer.observaciones || '';
        data[i][9] = answer.demerito !== null ? answer.demerito : '';
      }
      
      itemIndex++;
    }
  }

  // Generate modified sheet
  const newWorksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Try to preserve styling (basic properties) by copying merges from original
  if (worksheet['!merges']) {
    newWorksheet['!merges'] = worksheet['!merges'];
  }
  newWorksheet['!cols'] = worksheet['!cols'] || [];
  newWorksheet['!rows'] = worksheet['!rows'] || [];

  workbook.Sheets[sheetName] = newWorksheet;

  // 4. Add Patient Experience as a second sheet
  if (patientExperience && patientExperience.service) {
    const pxData = [
      ['FORMULARIO DE EXPERIENCIA AL PACIENTE'],
      [],
      ['Correo Electrónico', patientExperience.email || ''],
      ['Nombre/Habitación', patientExperience.name || ''],
      ['Servicio Auditado', patientExperience.service || ''],
      ['Reseña en Google', patientExperience.ratingGoogle || ''],
      ['Evaluación Atención (Proactiva)', patientExperience.evaluation || ''],
      ['Recibió toda la info (Identidad)', patientExperience.information || ''],
      ['Recomendaría (Sí/No)', patientExperience.recommend || ''],
      ['Por qué Sí', (patientExperience.recommendYesReasons || []).join(', ')],
      ['Por qué No', (patientExperience.recommendNoReasons || []).join(', ')],
      ['Calificación Final (1-10)', patientExperience.finalRating || '']
    ];
    
    const pxSheet = XLSX.utils.aoa_to_sheet(pxData);
    XLSX.utils.book_append_sheet(workbook, pxSheet, 'Experiencia Paciente');
  }

  // 5. Download the file
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Auditoria_Fin_De_Semana_${dateStr}.xlsx`);
};
