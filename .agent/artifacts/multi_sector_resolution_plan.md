# Plan: Sistema de Resolución Multi-Sector

## Resumen
Migrar el flujo de resolución de un modelo **lineal** (1 reporte → 1 responsable → 1 solución) a un modelo **multi-responsable** (1 reporte → N sectores/responsables → solución consolidada con soporte para parciales).

## Fase 1: Base de Datos

### Nueva Tabla: `sector_assignments`
```sql
CREATE TABLE IF NOT EXISTS sector_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    sector TEXT NOT NULL,
    assigned_phone TEXT,
    assigned_user_id UUID,
    management_type TEXT NOT NULL DEFAULT 'simple' CHECK (management_type IN ('simple', 'desvio', 'adverse')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'partial', 'rejected', 'quality_validation')),
    resolution_notes TEXT,
    root_cause TEXT,
    corrective_plan TEXT,
    immediate_action TEXT,
    implementation_date DATE,
    resolution_evidence_urls JSONB DEFAULT '[]'::JSONB,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sector_assignments_report_id ON sector_assignments(report_id);
CREATE INDEX IF NOT EXISTS idx_sector_assignments_status ON sector_assignments(status);
```

### Columna en Reports: `assigned_sectors` (JSONB summary for dashboard quick-view)
```sql
ALTER TABLE reports ADD COLUMN IF NOT EXISTS assigned_sectors JSONB DEFAULT '[]'::JSONB;
-- Ej: [{"sector": "LAB", "status": "resolved"}, {"sector": "MAN", "status": "pending"}]
```

## Fase 2: Dashboard - Derivación Multi-Sector

### Cambios en `ReferralModal`
- Agregar botón "+ Agregar otro sector" para derivar a múltiples responsables
- Cada fila: Selector de Sector → Selector de Responsable → Tipo de gestión
- Al enviar, se crean N registros en `sector_assignments` y se envían N WhatsApp

### Cambios en `handleSendReferral`
- Iterar sobre todos los sectores seleccionados
- Crear una entrada en `sector_assignments` por cada uno
- Enviar WhatsApp individual a cada responsable con link único por assignment
- El link ahora incluye el `assignment_id`: `/resolver-caso/{tracking_id}/{assignment_id}`

## Fase 3: Resolution Page - Por Sector

### Cambios en `ResolutionPage.tsx`
- Leer `assignment_id` del URL si existe
- Cargar los datos específicos de esa asignación
- Al enviar, actualizar solo el `sector_assignment` correspondiente
- Opción "No puedo resolver completamente" → status: 'partial' + motivo

### Nuevo componente: `PartialResolutionModal`
- Modal para indicar que la solución es parcial
- Campo: motivo de solución parcial
- Marca el assignment como 'partial'

## Fase 4: Dashboard - Vista Consolidada

### Panel Multi-Sector en Dashboard Detail
- Mostrar tabla con cada sector asignado y su estado
- Indicadores visuales:
  - 🟢 Resuelto
  - 🟡 Pendiente
  - 🟠 Parcial (con motivo visible)
  - 🔴 Rechazado
- Barra de progreso: X de N sectores respondieron
- Calidad puede aprobar el caso completo cuando:
  - Todos respondieron, o
  - Decide aceptar con soluciones parciales

### Lógica de Estado del Reporte
- `pending_resolution`: Al menos un sector tiene asignación pendiente
- `quality_validation`: Todos los sectores respondieron (o se acepta parcial)
- `resolved`: Calidad aprueba

## Fase 5: Tracking Page

### Actualización de la vista pública
- Mostrar progreso: "3 de 5 sectores han respondido"
- Sin revelar detalles internos de cada sector

## Archivos Afectados

1. **Nueva migración SQL**: `20260219_sector_assignments.sql`
2. **Dashboard.tsx**: ReferralModal, handleSendReferral, vista de detalle
3. **ResolutionPage.tsx**: Soporte para assignment_id, solución parcial
4. **ResolutionForm.tsx**: Opción de "solución parcial"
5. **CorrectiveActionForm.tsx**: Opción de "solución parcial"
6. **App.tsx**: Nueva ruta con assignment_id
7. **TrackingPage.tsx**: Mostrar progreso multi-sector
