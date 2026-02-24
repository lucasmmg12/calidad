/**
 * ========================================================
 * 📊 DORA - Análisis de Excel Legacy para Migración
 * ========================================================
 * Analiza 'Dora bd desde enero.xlsx' y lo compara contra
 * el esquema de la tabla 'reports' de Supabase para generar
 * un informe de mapeo y migración.
 *
 * Uso:
 *   npm install xlsx
 *   node scripts/analyze_excel_migration.mjs
 * ========================================================
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_DIR = path.dirname(__dirname);
const EXCEL_PATH = path.join(PROJECT_DIR, 'Dora bd desde enero.xlsx');
const OUTPUT_DIR = path.join(PROJECT_DIR, 'scripts', 'migration_output');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── Supabase 'reports' table columns ───
const SUPABASE_COLUMNS = {
    id: { type: 'UUID', auto: true, required: false, desc: 'UUID auto-generado' },
    tracking_id: { type: 'TEXT', auto: false, required: true, desc: 'Código de seguimiento SA-YYYY-XXXX' },
    created_at: { type: 'TIMESTAMPTZ', auto: true, required: false, desc: 'Timestamp de creación' },
    sector: { type: 'TEXT', auto: false, required: true, desc: 'Sector destino del hallazgo' },
    origin_sector: { type: 'TEXT', auto: false, required: false, desc: 'Sector de origen del reportante' },
    content: { type: 'TEXT', auto: false, required: true, desc: 'Texto del hallazgo / descripción' },
    is_anonymous: { type: 'BOOLEAN', auto: false, required: false, desc: 'Es anónimo?' },
    contact_name: { type: 'TEXT', auto: false, required: false, desc: 'Nombre del reportante' },
    contact_number: { type: 'TEXT', auto: false, required: false, desc: 'Teléfono del reportante (10 dígitos)' },
    status: { type: 'TEXT', auto: false, required: true, desc: 'Estado del caso' },
    assigned_to: { type: 'TEXT', auto: false, required: false, desc: 'Teléfono o texto del responsable' },
    notes: { type: 'TEXT', auto: false, required: false, desc: 'Historial de notas del caso' },
    resolved_at: { type: 'TIMESTAMPTZ', auto: false, required: false, desc: 'Fecha de resolución' },
    evidence_urls: { type: 'TEXT[]', auto: false, required: false, desc: 'URLs de evidencia' },
    ai_summary: { type: 'TEXT', auto: true, required: false, desc: 'Resumen IA' },
    ai_classification: { type: 'TEXT', auto: true, required: false, desc: 'Clasificación IA' },
    ai_urgency: { type: 'TEXT', auto: true, required: false, desc: 'Urgencia IA' },
    finding_type: { type: 'TEXT', auto: false, required: false, desc: 'Tipo: EA, Desvío, etc.' },
    is_adverse_event: { type: 'BOOLEAN', auto: false, required: false, desc: '¿Es evento adverso?' },
    immediate_action: { type: 'TEXT', auto: false, required: false, desc: 'Acción inmediata tomada' },
    root_cause: { type: 'TEXT', auto: false, required: false, desc: 'Causa raíz' },
    corrective_plan: { type: 'TEXT', auto: false, required: false, desc: 'Plan correctivo' },
    implementation_date: { type: 'TEXT', auto: false, required: false, desc: 'Fecha implementación' },
    resolution_notes: { type: 'TEXT', auto: false, required: false, desc: 'Notas resolución' },
    resolution_history: { type: 'JSONB', auto: false, required: false, desc: 'Historial rechazos' },
    quality_observations: { type: 'TEXT', auto: false, required: false, desc: 'Observaciones calidad' },
    sla_deadline: { type: 'TIMESTAMPTZ', auto: false, required: false, desc: 'Deadline SLA' },
    sla_status: { type: 'TEXT', auto: false, required: false, desc: 'Estado SLA' },
};

// ─── Known sector values ───
const SECTOR_VALUES = [
    "ADM-Administracion", "AGC-Mantenimiento-Equipamiento-Medico", "ANST-Anestesia",
    "APA-Anatomia-Patologica", "APS-Asistencia-Psicologica", "ASMED-Asesor-Medico-Direccion",
    "AUX-Auxiliares-Hoteleria", "CC-Contact-Center", "CDI-Control-de-Infecciones",
    "CEXT-S1-Consultorios-Externos-Sede-1", "CEXT-S2-Consultorios-Externos-Sede-2",
    "CEXT-S3-Consultorios-Externos-Sede-3", "CEXT-SFS-Consultorios-Externos-Sede-Santa-Fe",
    "CHQ-Chequeo-Medico-Preventivo", "CIT-Citologia", "CYS-Compras-y-Suministro",
    "DIR-Direccion", "DXI-S1-Diagnostico-Imagenes-Sede-1", "DXI-SF-Diagnostico-Imagenes-Sede-Santa-Fe",
    "FACT-AMB-Facturacion-Ambulatorio", "FACT-INT-Facturacion-Internado", "FAR-Farmacia",
    "FER-Fertilidad", "FUN-Fundacion", "GCM-Guardia-Clinica-Medica",
    "GGO-Guardia-Gineco-Obstetrica", "GPE-Guardia-Pediatrica", "HDD-Hospital-de-Dia",
    "HDM-Hemodinamia", "HEM-Hemoterapia", "HYS-Higiene-y-Seguridad",
    "INST-Instrumentadoras", "INSUMED-Insumed", "INT-Internado-Adultos",
    "IPE-Internacion-Pediatrica", "KIN-Kinesiologia", "LAB-Laboratorio-Analisis-Clinicos",
    "LAB-FERT-Laboratorio-Fertilidad", "LYC-Liquidaciones-y-Convenio", "MAN-Mantenimiento-Edilicio",
    "NUT-Nutricion-y-Alimentacion", "PYT-Pagos-y-Tesoreria", "QUI-Quirofano",
    "REC-S1-Recepcion-Sede-1", "RES-Residencias-Medicas", "RRHH-Recursos-Humanos",
    "SEG-Seguridad-Patrimonial", "SGC-Sistema-Gestion-Calidad", "SR-Shock-Room",
    "TC-Tomografia-Computada", "TRM-Traumatologia", "TYS-Tecnologia-y-Sistemas",
    "UCI-Unidad-Cuidados-Intensivos", "UTIN-Cuidados-Intensivos-Neonatales", "VAC-Vacunatorio",
];

// ─── Keyword map for fuzzy matching ───
const KEYWORD_MAP = {
    sector: ['sector', 'area', 'servicio', 'unidad', 'destino', 'dirigido'],
    content: ['descripcion', 'detalle', 'relato', 'contenido', 'texto', 'hallazgo', 'incidente', 'observacion', 'reporte', 'situacion'],
    tracking_id: ['id', 'codigo', 'código', 'tracking', 'seguimiento', 'numero', 'nro'],
    created_at: ['fecha', 'date', 'creado', 'registro', 'reportado', 'cuando', 'ingreso'],
    contact_name: ['nombre', 'reportante', 'contacto', 'persona', 'quien', 'informante'],
    contact_number: ['telefono', 'teléfono', 'celular', 'whatsapp', 'phone', 'tel'],
    status: ['estado', 'status', 'situacion', 'gestion'],
    is_anonymous: ['anonimo', 'anónimo', 'confidencial'],
    ai_classification: ['clasificacion', 'clasificación', 'gravedad', 'severidad', 'riesgo', 'urgencia', 'prioridad', 'nivel'],
    finding_type: ['tipo', 'hallazgo', 'finding', 'categoria', 'categoría'],
    origin_sector: ['origen', 'procedencia', 'sector_origen'],
    immediate_action: ['accion', 'acción', 'inmediata', 'contencion', 'contención'],
    root_cause: ['causa', 'raiz', 'raíz', 'root', 'porque', 'why'],
    corrective_plan: ['plan', 'correctiva', 'mejora', 'accion_correctiva'],
    resolution_notes: ['resolucion', 'resolución', 'respuesta', 'resultado'],
    notes: ['nota', 'observaciones', 'comentario', 'historial'],
    assigned_to: ['responsable', 'asignado', 'derivado', 'encargado'],
    evidence_urls: ['evidencia', 'foto', 'imagen', 'archivo', 'adjunto'],
    is_adverse_event: ['adverso', 'evento_adverso', 'grave'],
    resolved_at: ['resuelto', 'cierre', 'cerrado', 'fecha_resolucion'],
};

function banner(text) {
    const sep = '═'.repeat(60);
    console.log(`\n${sep}`);
    console.log(`  ${text}`);
    console.log(sep);
}

function isDateValue(v) {
    if (v instanceof Date) return true;
    if (typeof v === 'number' && v > 40000 && v < 50000) return true; // Excel serial date
    if (typeof v === 'string') {
        const d = new Date(v);
        return !isNaN(d.getTime()) && d.getFullYear() > 2000;
    }
    return false;
}

function excelDateToJS(serial) {
    if (serial instanceof Date) return serial;
    if (typeof serial === 'number') {
        const utcDays = Math.floor(serial - 25569);
        return new Date(utcDays * 86400 * 1000);
    }
    return new Date(serial);
}

function analyze() {
    banner('1. CARGANDO ARCHIVO EXCEL');
    console.log(`📂 Archivo: ${EXCEL_PATH}`);

    if (!fs.existsSync(EXCEL_PATH)) {
        console.log('❌ ERROR: No se encontró el archivo Excel.');
        return;
    }

    const workbook = XLSX.readFile(EXCEL_PATH, { cellDates: true });
    const sheetNames = workbook.SheetNames;
    console.log(`📑 Hojas encontradas: ${sheetNames.join(', ')}`);

    // Pick the sheet with most data
    let mainSheet = null;
    let maxRows = 0;
    const allSheetsData = {};

    for (const name of sheetNames) {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: null });
        allSheetsData[name] = data;

        const cols = data.length > 0 ? Object.keys(data[0]) : [];
        console.log(`\n  ▸ Hoja '${name}': ${data.length} filas × ${cols.length} columnas`);
        console.log(`    Columnas: ${cols.join(', ')}`);

        if (data.length > maxRows) {
            maxRows = data.length;
            mainSheet = name;
        }
    }

    const rows = allSheetsData[mainSheet];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    console.log(`\n✅ Hoja principal: '${mainSheet}' (${rows.length} registros, ${columns.length} columnas)`);

    // ──────────────────────────────────────────────
    // 2. PERFIL DE DATOS
    // ──────────────────────────────────────────────
    banner('2. PERFIL DE DATOS DEL EXCEL');

    const columnProfiles = [];

    for (const col of columns) {
        const values = rows.map(r => r[col]);
        const nonNull = values.filter(v => v !== null && v !== undefined && v !== '').length;
        const nullCount = values.length - nonNull;
        const fillPct = ((nonNull / values.length) * 100).toFixed(0);
        const uniqueVals = [...new Set(values.filter(v => v !== null && v !== undefined && v !== ''))];
        const sampleVals = uniqueVals.slice(0, 5).map(v => String(v).substring(0, 80));

        // Detect type
        let detectedType = 'TEXT';
        if (nonNull > 0) {
            const firstValid = values.find(v => v !== null && v !== undefined && v !== '');
            if (typeof firstValid === 'number') detectedType = 'NUMBER';
            else if (firstValid instanceof Date) detectedType = 'DATE';
            else if (typeof firstValid === 'boolean') detectedType = 'BOOLEAN';
            else if (isDateValue(firstValid)) detectedType = 'DATE?';
        }

        console.log(`\n📊 Columna: '${col}'`);
        console.log(`   Tipo detectado: ${detectedType} | Llenas: ${nonNull}/${values.length} (${fillPct}%) | Únicas: ${uniqueVals.length}`);
        console.log(`   Muestra: ${JSON.stringify(sampleVals)}`);

        columnProfiles.push({ col, detectedType, nonNull, nullCount, fillPct: `${fillPct}%`, uniqueCount: uniqueVals.length, sample: sampleVals });
    }

    // ──────────────────────────────────────────────
    // 3. ESQUEMA SUPABASE
    // ──────────────────────────────────────────────
    banner('3. ESQUEMA SUPABASE \'reports\'');

    console.log(`${'Columna'.padEnd(30)} ${'Tipo'.padEnd(15)} ${'Auto'.padStart(5)}  ${'Req'.padStart(4)}  Descripción`);
    console.log('─'.repeat(100));
    for (const [col, info] of Object.entries(SUPABASE_COLUMNS)) {
        const auto = info.auto ? '✓' : '';
        const req = info.required ? '★' : '';
        console.log(`${col.padEnd(30)} ${info.type.padEnd(15)} ${auto.padStart(5)}  ${req.padStart(4)}  ${info.desc}`);
    }

    // ──────────────────────────────────────────────
    // 4. MAPEO AUTOMÁTICO
    // ──────────────────────────────────────────────
    banner('4. ANÁLISIS DE MAPEO (Excel → Supabase)');

    const mappingSuggestions = {};
    const unmappedExcel = [];
    const usedSupabaseCols = new Set();

    for (const col of columns) {
        const colLower = col.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let matched = null;

        for (const [supabaseCol, keywords] of Object.entries(KEYWORD_MAP)) {
            if (usedSupabaseCols.has(supabaseCol)) continue;
            for (const kw of keywords) {
                if (colLower.includes(kw)) {
                    matched = supabaseCol;
                    break;
                }
            }
            if (matched) break;
        }

        if (matched) {
            mappingSuggestions[col] = matched;
            usedSupabaseCols.add(matched);
            console.log(`  ✅ '${col}' → ${matched}`);
        } else {
            unmappedExcel.push(col);
            console.log(`  ❓ '${col}' → SIN MAPEO DIRECTO`);
        }
    }

    // ──────────────────────────────────────────────
    // 5. ANÁLISIS DE SECTORES
    // ──────────────────────────────────────────────
    banner('5. ANÁLISIS DE SECTORES DEL EXCEL');

    const sectorCandidateCols = columns.filter(c => {
        const cl = c.toLowerCase();
        return ['sector', 'area', 'servicio', 'unidad', 'destino', 'dirigido'].some(kw => cl.includes(kw));
    });

    if (sectorCandidateCols.length > 0) {
        for (const col of sectorCandidateCols) {
            const uniqueSectors = [...new Set(rows.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== ''))];
            console.log(`\n  📌 Candidato a sector: '${col}' (${uniqueSectors.length} valores únicos)`);

            const sectorMapping = {};
            for (const s of uniqueSectors.sort()) {
                const sLower = String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                let bestMatch = null;

                for (const sv of SECTOR_VALUES) {
                    const svParts = sv.toLowerCase().replace(/-/g, ' ').split(' ').filter(p => p.length > 3);
                    if (svParts.some(part => sLower.includes(part))) {
                        bestMatch = sv;
                        break;
                    }
                }

                sectorMapping[String(s)] = bestMatch;
                const status = bestMatch ? `→ ${bestMatch}` : '⚠️ SIN MATCH';
                console.log(`    • '${s}' ${status}`);
            }

            // Export sector mapping
            const sectorMapPath = path.join(OUTPUT_DIR, 'sector_mapping.json');
            fs.writeFileSync(sectorMapPath, JSON.stringify(sectorMapping, null, 2), 'utf-8');
            console.log(`\n  💾 Mapeo de sectores guardado en: ${sectorMapPath}`);
        }
    } else {
        console.log('  ⚠️ No se encontraron columnas candidatas a sector.');
        console.log('  Columnas disponibles:');
        columns.forEach(c => console.log(`    • '${c}'`));
    }

    // ──────────────────────────────────────────────
    // 6. ANÁLISIS DE FECHAS
    // ──────────────────────────────────────────────
    banner('6. ANÁLISIS DE FECHAS');

    for (const col of columns) {
        const values = rows.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
        const dateValues = values.filter(v => isDateValue(v));
        if (dateValues.length > values.length * 0.3) {
            const jsDates = dateValues.map(v => excelDateToJS(v)).filter(d => !isNaN(d.getTime()));
            if (jsDates.length > 0) {
                const min = new Date(Math.min(...jsDates.map(d => d.getTime())));
                const max = new Date(Math.max(...jsDates.map(d => d.getTime())));
                console.log(`\n  📅 '${col}': ${dateValues.length}/${values.length} valores como fecha`);
                console.log(`     Rango: ${min.toISOString().split('T')[0]} → ${max.toISOString().split('T')[0]}`);
            }
        }
    }

    // ──────────────────────────────────────────────
    // 7. RESUMEN DE MAPEO
    // ──────────────────────────────────────────────
    banner('7. RESUMEN DE MAPEO PROPUESTO');

    console.log('\n┌─────────────────────────────────────┬────────────────────────────────────┐');
    console.log('│ Columna Excel                       │ → Columna Supabase \'reports\'       │');
    console.log('├─────────────────────────────────────┼────────────────────────────────────┤');
    for (const [excelCol, supaCol] of Object.entries(mappingSuggestions)) {
        console.log(`│ ${excelCol.padEnd(35)} │ → ${supaCol.padEnd(32)} │`);
    }
    console.log('├─────────────────────────────────────┼────────────────────────────────────┤');
    for (const col of unmappedExcel) {
        console.log(`│ ${col.padEnd(35)} │   ❓ REVISAR MANUALMENTE          │`);
    }
    console.log('└─────────────────────────────────────┴────────────────────────────────────┘');

    console.log('\n🤖 Campos auto-generados (no requieren mapeo del Excel):');
    for (const [col, info] of Object.entries(SUPABASE_COLUMNS)) {
        if (info.auto) console.log(`  • ${col}: ${info.desc}`);
    }

    // ──────────────────────────────────────────────
    // 8. DUPLICADOS
    // ──────────────────────────────────────────────
    banner('8. DETECCIÓN DE DUPLICADOS');

    for (const col of columns) {
        const cl = col.toLowerCase();
        if (['id', 'codigo', 'código', 'tracking', 'nro'].some(kw => cl.includes(kw))) {
            const vals = rows.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
            const dupes = vals.length - new Set(vals).size;
            console.log(`  '${col}': ${dupes} duplicados de ${vals.length} registros`);
        }
    }

    // Complete row duplicates
    const rowStrings = rows.map(r => JSON.stringify(r));
    const dupeRows = rowStrings.length - new Set(rowStrings).size;
    console.log(`\n  Filas duplicadas completas: ${dupeRows} de ${rows.length}`);

    // ──────────────────────────────────────────────
    // 9. EXPORTAR RESULTADOS
    // ──────────────────────────────────────────────
    banner('9. EXPORTANDO RESULTADOS');

    // Mapping JSON
    const mappingOutput = {
        generated_at: new Date().toISOString(),
        excel_file: path.basename(EXCEL_PATH),
        total_rows: rows.length,
        total_columns: columns.length,
        excel_columns: columns,
        mapping_suggestions: mappingSuggestions,
        unmapped_columns: unmappedExcel,
        column_profiles: columnProfiles,
        sector_values_system: SECTOR_VALUES,
    };

    const mappingPath = path.join(OUTPUT_DIR, 'mapping_analysis.json');
    fs.writeFileSync(mappingPath, JSON.stringify(mappingOutput, null, 2), 'utf-8');
    console.log(`  ✅ Mapeo guardado en: ${mappingPath}`);

    // CSV preview (first 20 rows)
    const previewSheet = XLSX.utils.json_to_sheet(rows.slice(0, 20));
    const previewCSV = XLSX.utils.sheet_to_csv(previewSheet);
    const previewPath = path.join(OUTPUT_DIR, 'excel_preview_20rows.csv');
    fs.writeFileSync(previewPath, previewCSV, 'utf-8');
    console.log(`  ✅ Preview (20 filas) guardado en: ${previewPath}`);

    // Column profile CSV
    const profileSheet = XLSX.utils.json_to_sheet(columnProfiles.map(p => ({
        excel_column: p.col,
        detected_type: p.detectedType,
        non_null: p.nonNull,
        null_count: p.nullCount,
        fill_pct: p.fillPct,
        unique_values: p.uniqueCount,
        sample: p.sample.join(' | '),
        suggested_mapping: mappingSuggestions[p.col] || '❓ MANUAL',
    })));
    const profileCSV = XLSX.utils.sheet_to_csv(profileSheet);
    const profilePath = path.join(OUTPUT_DIR, 'column_profile.csv');
    fs.writeFileSync(profilePath, profileCSV, 'utf-8');
    console.log(`  ✅ Perfil de columnas guardado en: ${profilePath}`);

    // ──────────────────────────────────────────────
    // FINAL
    // ──────────────────────────────────────────────
    banner('✅ ANÁLISIS COMPLETADO');
    console.log(`
  📊 Total de registros a migrar: ${rows.length}
  📋 Columnas con mapeo sugerido: ${Object.keys(mappingSuggestions).length}/${columns.length}
  ❓ Columnas sin mapeo:          ${unmappedExcel.length}
  📂 Resultados en:               ${OUTPUT_DIR}

  ⚡ PRÓXIMOS PASOS:
  1. Revisar el mapeo en mapping_analysis.json
  2. Ajustar manualmente el mapeo de columnas sin match
  3. Validar la tabla de mapeo de sectores (sector_mapping.json)
  4. Ejecutar el script de migración real hacia Supabase
`);
}

analyze();
