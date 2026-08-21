const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../RSGC_03_10_CHECK_LIST_AFDS_UCI_SR_GCM.xlsx');
const outPath = path.join(__dirname, '../data/weekendAuditTemplate.json');

const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

const template = { sectors: [] };
let currentSector = null;

for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row || row.length === 0 || !row[0]) continue;
  
  const col0 = String(row[0]).trim();
  if (col0 === 'ÍTEM') continue;

  // A sector usually ends with (number) or is a known special sector like "SHOCK ROOM" or "UCI - Cuidados intensivos e intermedios"
  let isSector = false;
  if (col0.match(/\(\d+\)$/)) {
    isSector = true;
  } else if (col0 === 'SHOCK ROOM' || col0.startsWith('UCI -') || col0 === 'CONSULTORIO DE GUARDIA CLINICA MEDICA') {
    isSector = true;
  }

  if (isSector) {
    currentSector = { name: col0, items: [] };
    template.sectors.push(currentSector);
  } else if (currentSector && !col0.startsWith('CRITERIO') && col0 !== 'EXPERIENCIA A PACIENTE') {
    let desc = '';
    if (row[1]) desc = String(row[1]);
    else if (row[2]) desc = String(row[2]);
    else if (row[3]) desc = String(row[3]);
    else if (row[4]) desc = String(row[4]);
    
    currentSector.items.push({
      item: col0,
      description: desc ? desc.trim() : ''
    });
  }
}

fs.writeFileSync(outPath, JSON.stringify(template, null, 2));
console.log('Done parsing.');
