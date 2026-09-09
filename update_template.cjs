const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'C:\\Users\\Sanatorio Argentino\\Desktop\\Proyectos\\Calidad\\calidad-main\\RSGC_03_10_CHECK_LIST_AFDS_UCI_SR_GCM.xlsx';
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets['nuevo'];
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

const sectors = [];
let currentSector = null;

for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;
    
    const col0 = String(row[0]).trim();
    if (col0 === 'ÍTEM') continue;

    // Detect Sector header
    if (col0.match(/\(\d+\)$/) || col0 === 'SHOCK ROOM' || col0.startsWith('UCI -') || col0 === 'CONSULTORIO DE GUARDIA CLINICA MEDICA') {
        currentSector = { name: col0, items: [] };
        sectors.push(currentSector);
    } else if (currentSector && !col0.startsWith('CRITERIO') && col0 !== 'EXPERIENCIA A PACIENTE') {
        const desc1 = row[1] ? String(row[1]).trim() : '';
        const desc2 = row[2] ? String(row[2]).trim() : '';
        
        let finalDesc = desc1;
        if (desc2 && desc2 !== desc1) {
            finalDesc = finalDesc ? `${finalDesc}\n${desc2}` : desc2;
        }

        currentSector.items.push({
            item: col0,
            description: finalDesc
        });
    }
}

fs.writeFileSync('C:\\Users\\Sanatorio Argentino\\Desktop\\Proyectos\\Calidad\\calidad-main\\src\\data\\weekendAuditTemplate.json', JSON.stringify({ sectors }, null, 2));
console.log('Template updated successfully!');
