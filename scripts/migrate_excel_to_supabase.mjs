/**
 * ════════════════════════════════════════════════════════
 * 🚀 DORA - Script de Migración: Excel Legacy → Supabase
 * ════════════════════════════════════════════════════════
 * Lee 'Dora bd desde enero.xlsx', aplica el mapeo corregido
 * de columnas y sectores, genera tracking_ids y los inserta
 * en la tabla 'reports' de Supabase.
 *
 * Uso:
 *   node scripts/migrate_excel_to_supabase.mjs [--dry-run]
 *
 * Flags:
 *   --dry-run   Solo genera el preview sin insertar
 * ════════════════════════════════════════════════════════
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_DIR = path.dirname(__dirname);
const EXCEL_PATH = path.join(PROJECT_DIR, 'Dora bd desde enero.xlsx');
const OUTPUT_DIR = path.join(PROJECT_DIR, 'scripts', 'migration_output');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ─── MODE ───
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Supabase Client ───
const SUPABASE_URL = 'https://tqvmqdydoiukszmymuef.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxdm1xZHlkb2l1a3N6bXltdWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODg0NzUsImV4cCI6MjA4Mjc2NDQ3NX0.D-4W6bVhG7-2-mzm_KC6AGdGbzqhT9tcbhfG3qHNIHY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ════════════════════════════════════════════════════════
// SECTOR MAPPING — Corrected manually from analysis
// ════════════════════════════════════════════════════════
const SECTOR_MAP = {
    // EXACT MATCHES (Excel value → Supabase value)
    'ADM - Administración': 'ADM-Administracion',
    'ANST - Anestesia': 'ANST-Anestesia',
    'APA - Anatomía Patológica': 'APA-Anatomia-Patologica',
    'AUX - Auxiliares de Hotelería': 'AUX-Auxiliares-Hoteleria',
    'CC - Contact Center': 'CC-Contact-Center',
    'CDI - Control de Infecciones': 'CDI-Control-de-Infecciones',
    'CEXT - Consultorio Externo': 'CEXT-S1-Consultorios-Externos-Sede-1',
    'CEXT S1 - Consultorios Externos Sede 1': 'CEXT-S1-Consultorios-Externos-Sede-1',
    'CYS - Compras y Suministro': 'CYS-Compras-y-Suministro',
    'DIR - Dirección': 'DIR-Direccion',
    'DXI - Diagnóstico por Imágenes': 'DXI-S1-Diagnostico-Imagenes-Sede-1',
    'DXI S1 - Diagnóstico por Imágenes Sede 1': 'DXI-S1-Diagnostico-Imagenes-Sede-1',
    'FACT - Facturación': 'FACT-AMB-Facturacion-Ambulatorio',
    'FAR - Farmacia': 'FAR-Farmacia',
    'FER - Fertilidad': 'FER-Fertilidad',
    'FUN - Fundación': 'FUN-Fundacion',
    'GCM - Guardia Clínica Médica': 'GCM-Guardia-Clinica-Medica',
    'GGO - Guardia Gineco Obstétrica': 'GGO-Guardia-Gineco-Obstetrica',
    'GPE - Guardia Pediátrica': 'GPE-Guardia-Pediatrica',
    'HDD - Hospital de Día': 'HDD-Hospital-de-Dia',
    'HDM - Hemodinamia': 'HDM-Hemodinamia',
    'HEM - Hemoterapia': 'HEM-Hemoterapia',
    'HyS - Higiene y Seguridad': 'HYS-Higiene-y-Seguridad',
    'INST - Instrumentadoras': 'INST-Instrumentadoras',
    'INSUMED': 'INSUMED-Insumed',
    'KIN - Kinesiología': 'KIN-Kinesiologia',
    'LAB - Laboratorio': 'LAB-Laboratorio-Analisis-Clinicos',
    'LYC - Liquidaciones y Convenios': 'LYC-Liquidaciones-y-Convenio',
    'NUT - Alimentación y Nutrición': 'NUT-Nutricion-y-Alimentacion',
    'QUI - Quirófano': 'QUI-Quirofano',
    'REC SLS - Recepción SSLS': 'REC-S1-Recepcion-Sede-1',
    'RRHH - Recursos Humanos': 'RRHH-Recursos-Humanos',
    'SGC - Sistema de Gestión de la Calidad': 'SGC-Sistema-Gestion-Calidad',
    'SR - Shock Room': 'SR-Shock-Room',
    'Shock Room': 'SR-Shock-Room',
    'TC - Tomografia computada': 'TC-Tomografia-Computada',
    'TC - Tomografía computada': 'TC-Tomografia-Computada',
    'TYS - Tecnología y Sistemas': 'TYS-Tecnologia-y-Sistemas',
    'UCI - Unidad de cuidados intensivos': 'UCI-Unidad-Cuidados-Intensivos',

    // CORRECTED — These were wrong in the fuzzy match
    'INT - Internado': 'INT-Internado-Adultos',
    'IPE - Internación Pediátrica': 'IPE-Internacion-Pediatrica',
    'MAN - Mantenimiento edilicio': 'MAN-Mantenimiento-Edilicio',
    'SEG - Seguridad Patrimonial': 'SEG-Seguridad-Patrimonial',
    'RES - Residencias Médicas': 'RES-Residencias-Medicas',
    'NEO - Neonatología': 'UTIN-Cuidados-Intensivos-Neonatales',

    // ADDITIONAL — Discovered during dry-run
    'FCT INT - Facturación Internado': 'FACT-INT-Facturacion-Internado',
    'FCT AMB - Facturación Ambulatorio': 'FACT-AMB-Facturacion-Ambulatorio',
    'Asesor Médico de Dirección': 'ASMED-Asesor-Medico-Direccion',
    'HMD - Hemodinamia': 'HDM-Hemodinamia',
    'Calidad': 'SGC-Sistema-Gestion-Calidad',
    'PRST- Prestadores': 'LYC-Liquidaciones-y-Convenio',
    'CHQ - Chequeo de Salud': 'CHQ-Chequeo-Medico-Preventivo',
    'CX PED - Cirugía Pediátrica': 'GPE-Guardia-Pediatrica',
    'COM - Comunicación Institucional': 'DIR-Direccion',
    'AGC - Mantenimiento de equipos médicos': 'AGC-Mantenimiento-Equipamiento-Medico',
};

// ════════════════════════════════════════════════════════
// FINDING TYPE MAPPING
// ════════════════════════════════════════════════════════
const FINDING_TYPE_MAP = {
    'EA': 'Evento Adverso',
    'Cuasi-EA': 'Cuasi Evento Adverso',
    'OM': 'Oportunidad de Mejora',
    'Felicitaciones': 'Felicitaciones',
};

// ════════════════════════════════════════════════════════
// STATUS DETERMINATION
// ════════════════════════════════════════════════════════
function determineStatus(row) {
    const hasRootCause = !!row['Analisis de Causa'];
    const hasCorrective = !!row['Acción correctiva'];
    const hasResponsable = !!row['Responsable'];

    // If there's corrective action AND root cause → resolved
    if (hasRootCause && hasCorrective) return 'resolved';
    // If only one → quality_validation (waiting for review)
    if (hasRootCause || hasCorrective || hasResponsable) return 'quality_validation';
    // Default → pending (still unaddressed)
    return 'pending';
}

// ════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════
function resolveSector(excelValue) {
    if (!excelValue) return null;
    const trimmed = String(excelValue).trim();

    // Direct lookup
    if (SECTOR_MAP[trimmed]) return SECTOR_MAP[trimmed];

    // Normalized lookup (case insensitive + accent insensitive)
    const normalized = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const [key, val] of Object.entries(SECTOR_MAP)) {
        const keyNorm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (keyNorm === normalized) return val;
    }

    // Partial match — try prefix (e.g. "INT" → "INT-Internado-Adultos")
    const prefix = trimmed.split(' ')[0].replace('-', '').toUpperCase();
    for (const [key, val] of Object.entries(SECTOR_MAP)) {
        if (key.toUpperCase().startsWith(prefix)) return val;
    }

    console.warn(`  ⚠️ Sector no mapeado: '${trimmed}'`);
    return trimmed; // Fallback: use raw value
}

function formatDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') {
        // Excel serial date
        const utcDays = Math.floor(value - 25569);
        return new Date(utcDays * 86400 * 1000).toISOString();
    }
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
    return null;
}

function cleanText(value) {
    if (value === null || value === undefined) return null;
    return String(value).trim() || null;
}

function banner(text) {
    const sep = '═'.repeat(60);
    console.log(`\n${sep}`);
    console.log(`  ${text}`);
    console.log(sep);
}


// ════════════════════════════════════════════════════════
// MAIN MIGRATION
// ════════════════════════════════════════════════════════
async function migrate() {
    banner(`🚀 MIGRACIÓN EXCEL → SUPABASE ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);

    // ─── 1. Load Excel ───
    console.log(`\n📂 Leyendo: ${EXCEL_PATH}`);
    const workbook = XLSX.readFile(EXCEL_PATH, { cellDates: true });

    // Find the main sheet (most rows)
    let mainSheet = null;
    let maxRows = 0;
    for (const name of workbook.SheetNames) {
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: null });
        if (data.length > maxRows) {
            maxRows = data.length;
            mainSheet = name;
        }
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[mainSheet], { defval: null });
    console.log(`✅ Hoja '${mainSheet}': ${rows.length} filas cargadas`);

    // ─── 2. Check for existing legacy records ───
    banner('2. VERIFICANDO REGISTROS EXISTENTES');
    const { data: existingReports, error: fetchError } = await supabase
        .from('reports')
        .select('tracking_id')
        .like('tracking_id', 'SA-LEG-%');

    if (fetchError) {
        console.error('❌ Error consultando la BD:', fetchError.message);
        return;
    }

    const existingIds = new Set((existingReports || []).map(r => r.tracking_id));
    console.log(`  📊 Registros legacy ya existentes en BD: ${existingIds.size}`);

    // ─── 3. Transform rows ───
    banner('3. TRANSFORMANDO DATOS');

    const transformed = [];
    const errors = [];
    const skipped = [];
    const unmappedSectors = new Set();

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 because 1-indexed + header row

        try {
            // Extract raw values
            const seqNum = row['N°'] || (7600 + i);
            const trackingId = `SA-LEG-${String(seqNum).padStart(4, '0')}`;

            // Skip if already exists
            if (existingIds.has(trackingId)) {
                skipped.push({ row: rowNum, trackingId, reason: 'Ya existe en BD' });
                continue;
            }

            const marcaTemporal = formatDate(row['Marca temporal']);
            const nombre = cleanText(row['Nombre y apellido:\r\n\r\n'] || row['Nombre y apellido:']);
            const detalle = cleanText(row['Detalle del evento a reportar:']);

            // Column: "A qué sector perteneces?"" → origin_sector
            const originSectorRaw = cleanText(row['A qué sector perteneces? (opcional):']);
            // Column: "A qué sector enviamos tu reclamo?" → sector (destination)
            const sectorRaw = cleanText(row['A qué sector enviamos tu reclamo?']);

            const tipoRaw = cleanText(row['Tipo (EA / OM)']);
            const clasificacion = cleanText(row['Clasificación']);
            const analisisCausa = cleanText(row['Analisis de Causa']);
            const accionCorr = cleanText(row['Acción correctiva']);
            const esPertinente = cleanText(row['Es pertinente?']);
            const fechaCompromiso = formatDate(row['Fecha de compromiso']);
            const responsable = cleanText(row['Responsable']);

            // Validations
            if (!detalle) {
                errors.push({ row: rowNum, trackingId, error: 'Sin detalle del evento' });
                continue;
            }

            if (!sectorRaw) {
                errors.push({ row: rowNum, trackingId, error: 'Sin sector destino' });
                continue;
            }

            // Resolve sector
            const sector = resolveSector(sectorRaw);
            const originSector = originSectorRaw ? resolveSector(originSectorRaw) : null;

            // Check for unmapped
            if (sector === sectorRaw) unmappedSectors.add(sectorRaw);
            if (originSector === originSectorRaw && originSectorRaw) unmappedSectors.add(originSectorRaw);

            // Determine anonymity
            const isAnonymous = !nombre;

            // Determine finding type
            const findingType = tipoRaw ? (FINDING_TYPE_MAP[tipoRaw] || tipoRaw) : null;

            // Determine is_adverse_event
            const isAdverseEvent = tipoRaw === 'EA' ? true : tipoRaw === 'Cuasi-EA' ? true : false;

            // Determine status
            const status = determineStatus(row);

            // Build notes (concat metadata that doesn't have a column)
            const notesParts = [];
            if (esPertinente) notesParts.push(`[Pertinencia: ${esPertinente}]`);
            if (clasificacion) notesParts.push(`[Clasificación legacy: ${clasificacion}]`);
            notesParts.push('[Migrado desde Excel legacy - Enero/Feb 2026]');

            // Build record
            const record = {
                tracking_id: trackingId,
                created_at: marcaTemporal || new Date().toISOString(),
                sector: sector,
                origin_sector: originSector,
                content: detalle,
                is_anonymous: isAnonymous,
                contact_name: nombre || null,
                contact_number: null, // Excel doesn't have phone numbers
                status: status,
                finding_type: findingType,
                is_adverse_event: isAdverseEvent,
                root_cause: analisisCausa,
                corrective_plan: accionCorr,
                implementation_date: fechaCompromiso ? fechaCompromiso.split('T')[0] : null,
                assigned_to: responsable,
                notes: notesParts.join(' | '),
                evidence_urls: [],
                sla_status: 'on_time',
                resolution_history: [],
            };

            // If resolved, set resolved_at
            if (status === 'resolved') {
                record.resolved_at = fechaCompromiso || marcaTemporal;
            }

            transformed.push(record);
        } catch (err) {
            errors.push({ row: rowNum, error: err.message });
        }
    }

    // ─── 4. Report ───
    banner('4. RESUMEN DE TRANSFORMACIÓN');

    console.log(`  ✅ Registros transformados: ${transformed.length}`);
    console.log(`  ⏭️  Saltados (ya existen):  ${skipped.length}`);
    console.log(`  ❌ Errores:                 ${errors.length}`);

    if (unmappedSectors.size > 0) {
        console.log(`\n  ⚠️ Sectores no mapeados (usados tal cual):`);
        for (const s of unmappedSectors) {
            console.log(`     • '${s}'`);
        }
    }

    if (errors.length > 0) {
        console.log(`\n  ❌ Detalle de errores:`);
        for (const e of errors) {
            console.log(`     Fila ${e.row}: ${e.error} ${e.trackingId ? `(${e.trackingId})` : ''}`);
        }
    }

    if (skipped.length > 0) {
        console.log(`\n  ⏭️ Detalle de saltados:`);
        for (const s of skipped.slice(0, 10)) {
            console.log(`     ${s.trackingId}: ${s.reason}`);
        }
        if (skipped.length > 10) console.log(`     ... y ${skipped.length - 10} más`);
    }

    // ─── 5. Status breakdown ───
    const statusBreakdown = {};
    for (const r of transformed) {
        statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1;
    }
    console.log('\n  📊 Desglose por estado:');
    for (const [s, count] of Object.entries(statusBreakdown)) {
        console.log(`     ${s}: ${count}`);
    }

    // Finding type breakdown
    const typeBreakdown = {};
    for (const r of transformed) {
        const t = r.finding_type || 'Sin tipo';
        typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
    }
    console.log('\n  📊 Desglose por tipo:');
    for (const [t, count] of Object.entries(typeBreakdown)) {
        console.log(`     ${t}: ${count}`);
    }

    // ─── 6. Export preview ───
    banner('5. EXPORTANDO PREVIEW');

    const previewPath = path.join(OUTPUT_DIR, 'migration_preview.json');
    fs.writeFileSync(previewPath, JSON.stringify(transformed.slice(0, 10), null, 2), 'utf-8');
    console.log(`  💾 Preview (10 primeros) en: ${previewPath}`);

    const fullPath = path.join(OUTPUT_DIR, 'migration_full_payload.json');
    fs.writeFileSync(fullPath, JSON.stringify(transformed, null, 2), 'utf-8');
    console.log(`  💾 Payload completo en: ${fullPath}`);

    // ─── 7. INSERT into Supabase ───
    if (DRY_RUN) {
        banner('🏁 DRY RUN COMPLETADO');
        console.log('  No se insertaron registros. Ejecute sin --dry-run para migrar.');
        console.log(`  node scripts/migrate_excel_to_supabase.mjs`);
        return;
    }

    banner('6. INSERTANDO EN SUPABASE');

    const BATCH_SIZE = 25;
    let insertedCount = 0;
    let failedCount = 0;
    const insertErrors = [];

    for (let i = 0; i < transformed.length; i += BATCH_SIZE) {
        const batch = transformed.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(transformed.length / BATCH_SIZE);

        process.stdout.write(`  📤 Batch ${batchNum}/${totalBatches} (${batch.length} registros)...`);

        const { data, error } = await supabase
            .from('reports')
            .insert(batch)
            .select('tracking_id');

        if (error) {
            console.log(` ❌ ERROR: ${error.message}`);
            failedCount += batch.length;
            insertErrors.push({
                batch: batchNum,
                error: error.message,
                details: error.details,
                hint: error.hint,
                trackingIds: batch.map(r => r.tracking_id),
            });
        } else {
            insertedCount += (data?.length || batch.length);
            console.log(` ✅ ${data?.length || batch.length} insertados`);
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    // ─── 8. Final Report ───
    banner('🏁 MIGRACIÓN COMPLETADA');

    console.log(`
  ✅ Insertados exitosamente: ${insertedCount}
  ❌ Fallidos:                ${failedCount}
  ⏭️  Saltados (duplicados):  ${skipped.length}
  📊 Total procesados:        ${rows.length}
`);

    if (insertErrors.length > 0) {
        console.log('  ❌ Errores de inserción:');
        for (const e of insertErrors) {
            console.log(`     Batch ${e.batch}: ${e.error}`);
            if (e.details) console.log(`       Details: ${e.details}`);
            if (e.hint) console.log(`       Hint: ${e.hint}`);
        }

        const errPath = path.join(OUTPUT_DIR, 'migration_errors.json');
        fs.writeFileSync(errPath, JSON.stringify(insertErrors, null, 2), 'utf-8');
        console.log(`\n  💾 Errores guardados en: ${errPath}`);
    }

    // ─── 9. Verification query ───
    banner('7. VERIFICACIÓN');

    const { count, error: countError } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .like('tracking_id', 'SA-LEG-%');

    if (!countError) {
        console.log(`  📊 Total registros legacy en BD: ${count}`);
    } else {
        console.log(`  ⚠️ Error verificando: ${countError.message}`);
    }
}

migrate().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
