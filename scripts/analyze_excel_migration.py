"""
========================================================
📊 DORA - Análisis de Excel Legacy para Migración
========================================================
Este script analiza el archivo 'Dora bd desde enero.xlsx'
y lo compara contra el esquema de la tabla 'reports' de
Supabase para generar un informe de mapeo y migración.

Requisitos:
    pip install pandas openpyxl

Uso:
    python scripts/analyze_excel_migration.py
========================================================
"""

import pandas as pd
import os
import json
from datetime import datetime

# ─── Paths ───
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
EXCEL_PATH = os.path.join(PROJECT_DIR, "Dora bd desde enero.xlsx")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "scripts", "migration_output")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── Supabase 'reports' table columns (from migrations + insert logic) ───
SUPABASE_REPORTS_COLUMNS = {
    # Core identity
    "id":                       {"type": "UUID",        "auto": True,  "required": False, "desc": "UUID auto-generado"},
    "tracking_id":              {"type": "TEXT",        "auto": False, "required": True,  "desc": "Código de seguimiento SA-YYYY-XXXX"},
    "created_at":               {"type": "TIMESTAMPTZ", "auto": True,  "required": False, "desc": "Timestamp de creación"},

    # Report content
    "sector":                   {"type": "TEXT",        "auto": False, "required": True,  "desc": "Sector destino del hallazgo"},
    "origin_sector":            {"type": "TEXT",        "auto": False, "required": False, "desc": "Sector de origen del reportante"},
    "content":                  {"type": "TEXT",        "auto": False, "required": True,  "desc": "Texto del hallazgo / descripción"},

    # Contact
    "is_anonymous":             {"type": "BOOLEAN",     "auto": False, "required": False, "desc": "Es anónimo?"},
    "contact_name":             {"type": "TEXT",        "auto": False, "required": False, "desc": "Nombre del reportante"},
    "contact_number":           {"type": "TEXT",        "auto": False, "required": False, "desc": "Teléfono del reportante (10 dígitos)"},

    # Status & workflow
    "status":                   {"type": "TEXT",        "auto": False, "required": True,
                                 "desc": "Estado: pending|pending_resolution|quality_validation|resolved|discarded|multi_sector_pending|assignment_rejected"},
    "assigned_to":              {"type": "TEXT",        "auto": False, "required": False, "desc": "Teléfono o texto del responsable asignado"},
    "notes":                    {"type": "TEXT",        "auto": False, "required": False, "desc": "Historial de notas del caso (log concatenado)"},
    "resolved_at":              {"type": "TIMESTAMPTZ", "auto": False, "required": False, "desc": "Fecha de resolución"},

    # Evidence
    "evidence_urls":            {"type": "TEXT[]",      "auto": False, "required": False, "desc": "URLs de evidencia adjunta"},

    # AI classification
    "ai_summary":               {"type": "TEXT",        "auto": True,  "required": False, "desc": "Resumen generado por IA"},
    "ai_classification":        {"type": "TEXT",        "auto": True,  "required": False, "desc": "Clasificación IA (leve/moderado/grave/crítico)"},
    "ai_urgency":               {"type": "TEXT",        "auto": True,  "required": False, "desc": "Urgencia IA"},
    "finding_type":             {"type": "TEXT",        "auto": False, "required": False, "desc": "Tipo: Evento Adverso, Desvío, etc."},

    # Adverse event / resolution
    "is_adverse_event":         {"type": "BOOLEAN",     "auto": False, "required": False, "desc": "¿Es evento adverso?"},
    "immediate_action":         {"type": "TEXT",        "auto": False, "required": False, "desc": "Acción inmediata tomada"},
    "root_cause":               {"type": "TEXT",        "auto": False, "required": False, "desc": "Análisis de causa raíz"},
    "corrective_plan":          {"type": "TEXT",        "auto": False, "required": False, "desc": "Plan de acción correctiva"},
    "corrective_action_plan":   {"type": "TEXT",        "auto": False, "required": False, "desc": "Plan de acción correctiva (legacy)"},
    "implementation_date":      {"type": "TEXT",        "auto": False, "required": False, "desc": "Fecha de implementación del plan"},
    "resolution_evidence_urls": {"type": "TEXT[]",      "auto": False, "required": False, "desc": "URLs de evidencia de resolución"},
    "resolution_notes":         {"type": "TEXT",        "auto": False, "required": False, "desc": "Notas de resolución general"},
    "resolution_history":       {"type": "JSONB",       "auto": False, "required": False, "desc": "Historial de resoluciones rechazadas"},
    "resolution_step":          {"type": "TEXT",        "auto": False, "required": False, "desc": "Paso actual de resolución"},
    "step1_evidence_urls":      {"type": "TEXT[]",      "auto": False, "required": False, "desc": "Evidencia paso 1"},
    "step2_evidence_urls":      {"type": "TEXT[]",      "auto": False, "required": False, "desc": "Evidencia paso 2"},
    "draft_data":               {"type": "JSONB",       "auto": False, "required": False, "desc": "Borrador de resolución (auto-save)"},
    "draft_updated_at":         {"type": "TIMESTAMPTZ", "auto": False, "required": False, "desc": "Última actualización del borrador"},

    # SLA
    "sla_deadline":             {"type": "TIMESTAMPTZ", "auto": False, "required": False, "desc": "Deadline SLA"},
    "sla_status":               {"type": "TEXT",        "auto": False, "required": False, "desc": "Estado SLA: on_time|at_risk|overdue"},

    # Quality
    "quality_observations":     {"type": "TEXT",        "auto": False, "required": False, "desc": "Observaciones de calidad"},

    # WhatsApp tracking
    "last_whatsapp_status":     {"type": "TEXT",        "auto": False, "required": False, "desc": "Estado del último WhatsApp enviado"},
    "last_whatsapp_sent_at":    {"type": "TIMESTAMPTZ", "auto": False, "required": False, "desc": "Timestamp del último WhatsApp"},
}

# ─── Known sector mapping (value from sectors.ts) ───
SECTOR_VALUES = [
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
]


def banner(text: str):
    sep = "═" * 60
    print(f"\n{sep}")
    print(f"  {text}")
    print(sep)


def analyze():
    # ──────────────────────────────────────────────
    # 1. LOAD EXCEL
    # ──────────────────────────────────────────────
    banner("1. CARGANDO ARCHIVO EXCEL")
    print(f"📂 Archivo: {EXCEL_PATH}")

    if not os.path.exists(EXCEL_PATH):
        print("❌ ERROR: No se encontró el archivo Excel.")
        return

    # Read all sheets to check
    xl = pd.ExcelFile(EXCEL_PATH, engine="openpyxl")
    print(f"📑 Hojas encontradas: {xl.sheet_names}")

    all_sheets_data = {}
    for sheet_name in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name=sheet_name)
        all_sheets_data[sheet_name] = df
        print(f"\n  ▸ Hoja '{sheet_name}': {len(df)} filas × {len(df.columns)} columnas")
        print(f"    Columnas: {list(df.columns)}")

    # Use first sheet as main data (or detect the biggest one)
    main_sheet = max(all_sheets_data.keys(), key=lambda k: len(all_sheets_data[k]))
    df = all_sheets_data[main_sheet]
    print(f"\n✅ Hoja principal seleccionada: '{main_sheet}' ({len(df)} registros)")

    # ──────────────────────────────────────────────
    # 2. PERFIL DE DATOS DEL EXCEL
    # ──────────────────────────────────────────────
    banner("2. PERFIL DE DATOS DEL EXCEL")

    for col in df.columns:
        non_null = df[col].notna().sum()
        null = df[col].isna().sum()
        fill_pct = (non_null / len(df)) * 100
        dtype = str(df[col].dtype)

        # Sample values
        sample_values = df[col].dropna().unique()
        n_unique = len(sample_values)
        sample_display = list(sample_values[:5])

        print(f"\n📊 Columna: '{col}'")
        print(f"   Tipo: {dtype} | Llenas: {non_null}/{len(df)} ({fill_pct:.0f}%) | Únicas: {n_unique}")
        print(f"   Muestra: {sample_display}")

    # ──────────────────────────────────────────────
    # 3. ESQUEMA SUPABASE 'reports'
    # ──────────────────────────────────────────────
    banner("3. ESQUEMA SUPABASE 'reports'")

    print(f"{'Columna':<30} {'Tipo':<15} {'Auto':>5}  {'Req':>4}  Descripción")
    print("─" * 100)
    for col, info in SUPABASE_REPORTS_COLUMNS.items():
        auto = "✓" if info.get("auto") else ""
        req = "★" if info.get("required") else ""
        print(f"{col:<30} {info['type']:<15} {auto:>5}  {req:>4}  {info['desc']}")

    # ──────────────────────────────────────────────
    # 4. ANÁLISIS DE MAPEO AUTOMÁTICO
    # ──────────────────────────────────────────────
    banner("4. ANÁLISIS DE MAPEO (Excel → Supabase)")

    excel_cols = [str(c).strip().lower() for c in df.columns]
    supabase_cols = list(SUPABASE_REPORTS_COLUMNS.keys())

    # Fuzzy matching attempt
    mapping_suggestions = {}
    unmapped_excel = []
    keyword_map = {
        "sector": ["sector", "area", "servicio", "unidad", "destino"],
        "content": ["descripcion", "detalle", "relato", "contenido", "texto", "hallazgo", "incidente", "observacion", "reporte"],
        "tracking_id": ["id", "codigo", "código", "tracking", "seguimiento", "numero", "nro"],
        "created_at": ["fecha", "date", "creado", "registro", "reportado", "cuando", "ingreso"],
        "contact_name": ["nombre", "reportante", "contacto", "persona", "quien", "informante"],
        "contact_number": ["telefono", "teléfono", "celular", "whatsapp", "phone", "tel"],
        "status": ["estado", "status", "situacion", "gestion"],
        "is_anonymous": ["anonimo", "anónimo", "confidencial"],
        "ai_classification": ["clasificacion", "clasificación", "gravedad", "severidad", "riesgo", "urgencia", "prioridad"],
        "finding_type": ["tipo", "hallazgo", "finding", "categoria", "categoría"],
        "origin_sector": ["origen", "procedencia", "sector_origen"],
        "immediate_action": ["accion", "acción", "inmediata", "contención", "contencion"],
        "root_cause": ["causa", "raiz", "raíz", "root", "porque", "why"],
        "corrective_plan": ["plan", "correctiva", "mejora", "accion_correctiva"],
        "resolution_notes": ["resolucion", "resolución", "respuesta", "resultado"],
        "notes": ["nota", "observaciones", "comentario", "historial"],
        "assigned_to": ["responsable", "asignado", "derivado", "encargado"],
        "evidence_urls": ["evidencia", "foto", "imagen", "archivo", "adjunto"],
        "is_adverse_event": ["adverso", "evento_adverso", "grave"],
        "resolved_at": ["resuelto", "cierre", "cerrado", "fecha_resolucion"],
    }

    print(f"\n📋 Columnas del Excel ({len(df.columns)}):")
    for i, col in enumerate(df.columns):
        col_lower = str(col).strip().lower()
        matched = None
        for supabase_col, keywords in keyword_map.items():
            for kw in keywords:
                if kw in col_lower:
                    matched = supabase_col
                    break
            if matched:
                break

        if matched:
            mapping_suggestions[str(col)] = matched
            print(f"  ✅ '{col}' → {matched}")
        else:
            unmapped_excel.append(str(col))
            print(f"  ❓ '{col}' → SIN MAPEO DIRECTO")

    # ──────────────────────────────────────────────
    # 5. ANÁLISIS DE SECTORES
    # ──────────────────────────────────────────────
    banner("5. ANÁLISIS DE SECTORES DEL EXCEL")

    # Try to find what column has sector-like data
    sector_candidates = []
    for col in df.columns:
        col_lower = str(col).strip().lower()
        if any(kw in col_lower for kw in ["sector", "area", "servicio", "unidad", "destino"]):
            sector_candidates.append(col)

    if sector_candidates:
        for col in sector_candidates:
            print(f"\n  📌 Candidato a sector: '{col}'")
            unique_sectors = df[col].dropna().unique()
            print(f"  Valores únicos ({len(unique_sectors)}):")
            for s in sorted(unique_sectors, key=str):
                # Try to fuzzy match
                s_lower = str(s).strip().lower()
                best_match = None
                for sv in SECTOR_VALUES:
                    sv_parts = sv.lower().replace("-", " ").split()
                    if any(part in s_lower for part in sv_parts if len(part) > 3):
                        best_match = sv
                        break
                status = f"→ {best_match}" if best_match else "⚠️ SIN MATCH"
                print(f"    • '{s}' {status}")
    else:
        print("  ⚠️ No se encontraron columnas candidatas a sector.")
        print("  Las columnas disponibles son:")
        for col in df.columns:
            print(f"    • '{col}'")

    # ──────────────────────────────────────────────
    # 6. ESTADÍSTICAS DE FECHAS
    # ──────────────────────────────────────────────
    banner("6. ANÁLISIS DE FECHAS")

    date_cols = df.select_dtypes(include=["datetime64", "object"]).columns
    for col in date_cols:
        try:
            parsed = pd.to_datetime(df[col], errors="coerce", dayfirst=True)
            valid = parsed.notna().sum()
            if valid > len(df) * 0.3:  # At least 30% look like dates
                min_date = parsed.dropna().min()
                max_date = parsed.dropna().max()
                print(f"\n  📅 '{col}': {valid}/{len(df)} valores válidos como fecha")
                print(f"     Rango: {min_date} → {max_date}")
        except Exception:
            pass

    # ──────────────────────────────────────────────
    # 7. RESUMEN DE MAPEO PROPUESTO
    # ──────────────────────────────────────────────
    banner("7. RESUMEN DE MAPEO PROPUESTO")

    print("\n┌─────────────────────────────────────┬────────────────────────────────────┐")
    print("│ Columna Excel                       │ → Columna Supabase 'reports'       │")
    print("├─────────────────────────────────────┼────────────────────────────────────┤")
    for excel_col, supa_col in mapping_suggestions.items():
        print(f"│ {excel_col:<35} │ → {supa_col:<32} │")
    print("├─────────────────────────────────────┼────────────────────────────────────┤")
    for col in unmapped_excel:
        print(f"│ {col:<35} │   ❓ REVISAR MANUALMENTE          │")
    print("└─────────────────────────────────────┴────────────────────────────────────┘")

    # Auto-generated fields
    print("\n🤖 Campos auto-generados (no requieren mapeo del Excel):")
    for col, info in SUPABASE_REPORTS_COLUMNS.items():
        if info.get("auto"):
            print(f"  • {col}: {info['desc']}")

    # ──────────────────────────────────────────────
    # 8. DETECTAR DUPLICADOS POTENCIALES
    # ──────────────────────────────────────────────
    banner("8. DETECCIÓN DE DUPLICADOS")

    for col in df.columns:
        col_lower = str(col).strip().lower()
        if any(kw in col_lower for kw in ["id", "codigo", "código", "tracking"]):
            dupes = df[col].dropna().duplicated().sum()
            print(f"  '{col}': {dupes} duplicados de {df[col].notna().sum()} registros")

    total_rows = len(df)
    dupe_rows = df.duplicated().sum()
    print(f"\n  Filas duplicadas completas: {dupe_rows} de {total_rows}")

    # ──────────────────────────────────────────────
    # 9. EXPORTAR ANÁLISIS
    # ──────────────────────────────────────────────
    banner("9. EXPORTANDO RESULTADOS")

    # Save mapping to JSON
    mapping_output = {
        "generated_at": datetime.now().isoformat(),
        "excel_file": os.path.basename(EXCEL_PATH),
        "total_rows": total_rows,
        "total_columns": len(df.columns),
        "excel_columns": list(df.columns),
        "mapping_suggestions": mapping_suggestions,
        "unmapped_columns": unmapped_excel,
        "sector_values_system": SECTOR_VALUES,
    }

    mapping_path = os.path.join(OUTPUT_DIR, "mapping_analysis.json")
    with open(mapping_path, "w", encoding="utf-8") as f:
        json.dump(mapping_output, f, ensure_ascii=False, indent=2, default=str)
    print(f"  ✅ Mapeo guardado en: {mapping_path}")

    # Save first 20 rows as CSV for manual review
    preview_path = os.path.join(OUTPUT_DIR, "excel_preview_20rows.csv")
    df.head(20).to_csv(preview_path, index=False, encoding="utf-8-sig")
    print(f"  ✅ Preview (20 filas) guardado en: {preview_path}")

    # Save column profile
    profile_path = os.path.join(OUTPUT_DIR, "column_profile.csv")
    profile_data = []
    for col in df.columns:
        non_null = df[col].notna().sum()
        n_unique = df[col].nunique()
        sample = str(df[col].dropna().iloc[0]) if non_null > 0 else ""
        suggested = mapping_suggestions.get(str(col), "❓ MANUAL")
        profile_data.append({
            "excel_column": col,
            "dtype": str(df[col].dtype),
            "non_null": non_null,
            "null": df[col].isna().sum(),
            "fill_pct": f"{(non_null/len(df))*100:.0f}%",
            "unique_values": n_unique,
            "sample": sample[:100],
            "suggested_mapping": suggested
        })
    pd.DataFrame(profile_data).to_csv(profile_path, index=False, encoding="utf-8-sig")
    print(f"  ✅ Perfil de columnas guardado en: {profile_path}")

    # ──────────────────────────────────────────────
    # FINAL
    # ──────────────────────────────────────────────
    banner("✅ ANÁLISIS COMPLETADO")
    print(f"""
  📊 Total de registros a migrar: {total_rows}
  📋 Columnas con mapeo sugerido: {len(mapping_suggestions)}/{len(df.columns)}
  ❓ Columnas sin mapeo:          {len(unmapped_excel)}
  📂 Resultados en:               {OUTPUT_DIR}

  ⚡ PRÓXIMOS PASOS:
  1. Revisar el mapeo sugerido en mapping_analysis.json
  2. Definir manualmente el mapeo de columnas sin match
  3. Crear la tabla de mapeo de sectores (Excel → Supabase)
  4. Ejecutar el script de migración real
""")


if __name__ == "__main__":
    analyze()
