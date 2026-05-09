# JoathiVA V1 Domain Contract

This document closes the local-first domain contract for the current V1 base.
It mirrors the code that already exists in `core.js` and defines the stable shape
to be reused later by backend/API, sync, and assistant-driven ingestion.

## Canonical rules

- Business fields stay in Spanish and camelCase.
- Audit fields are always `id`, `createdAt`, `updatedAt`, and optionally `archivedAt`.
- Business dates use `YYYY-MM-DD`.
- Timestamps use ISO 8601 UTC strings.
- `customerId` is the canonical foreign key for customer relations.
- `operation.clientId` remains accepted as a compatibility alias in V1.
- `activity` is append-only.
- Derived data stays derived: quote calculation, operation alerts, checklist progress, and activity feeds.
- Soft delete is reserved through `archivedAt` for mutable entities.

## Entity model

### customer

Fields:
- Required: `nombre`, `empresa`, `contactoPrincipal`, `ciudad`, `pais`, `tipoCliente`
- Required contact channel: `telefono` or `email`
- Optional: `datosGenerales`, `contactos`, `historialComercial`, `cotizacionesAsociadas`, `incidencias`, `condicionesPactadas`, `observacionesClave`, `archivedAt`

Relations:
- `quote.customerId -> customer.id`
- `task.customerId -> customer.id`
- `crm.customerId -> customer.id`
- `operation.clientId` alias `operation.customerId -> customer.id`

States:
- `Prospecto`, `Activo`, `Cliente`

Traceability:
- Customer history is a denormalized local feed.
- Activity log entries linked to the customer are the canonical event stream.

CRUD contract:

```json
{
  "create": {
    "nombre": "AgroSur Export",
    "empresa": "AgroSur Export SA",
    "contactoPrincipal": "Mariana Gomez",
    "telefono": "+54 11 5555 1212",
    "email": "logistica@agrosur.com",
    "tipoCliente": "Activo",
    "ciudad": "Buenos Aires",
    "pais": "Argentina",
    "datosGenerales": "Exportador regional."
  },
  "update": {
    "id": "cus-1002",
    "empresa": "AgroSur Export SA",
    "observacionesClave": "Cliente de volumen."
  },
  "getByIdResponse": {
    "id": "cus-1002",
    "nombre": "AgroSur Export",
    "empresa": "AgroSur Export SA",
    "contactoPrincipal": "Mariana Gomez",
    "telefono": "+54 11 5555 1212",
    "email": "logistica@agrosur.com",
    "tipoCliente": "Activo",
    "ciudad": "Buenos Aires",
    "pais": "Argentina",
    "datosGenerales": "Exportador regional.",
    "contactos": [],
    "historialComercial": [],
    "cotizacionesAsociadas": [],
    "incidencias": [],
    "condicionesPactadas": "",
    "observacionesClave": "",
    "createdAt": "2026-04-21T12:00:00.000Z",
    "updatedAt": "2026-04-21T12:00:00.000Z"
  },
  "listResponse": {
    "items": [],
    "total": 0
  },
  "archive": {
    "id": "cus-1002",
    "archivedAt": "2026-04-21T12:00:00.000Z"
  }
}
```

### quote

Fields:
- Required: `customerId`, `origen`, `destino`, `paisOrigen`, `paisDestino`, `tipoOperacion`, `modoTransporte`, `proveedor`, `costoProveedor`, `margenPct`, `moneda`
- Optional: `cliente`, `gastosAdicionales`, `seguro`, `horasExtra`, `estadiaAduanaDias`, `tipoCambio`, `observaciones`, `estado`, `calculation`, `archivedAt`

Relations:
- `quote.customerId -> customer.id`

States:
- `Borrador`, `Calculada`, `Archivada`

Traceability:
- `calculation` is a derived read model and can be recomputed from source fields.
- Customer history should receive a summary note when the quote changes.

CRUD contract:

```json
{
  "create": {
    "customerId": "cus-1002",
    "cliente": "AgroSur Export",
    "origen": "Asuncion",
    "destino": "Montevideo",
    "paisOrigen": "Paraguay",
    "paisDestino": "Uruguay",
    "tipoOperacion": "Importacion",
    "modoTransporte": "Multimodal",
    "proveedor": "Corredor Rio",
    "costoProveedor": 1450,
    "gastosAdicionales": 210,
    "seguro": 80,
    "horasExtra": 0,
    "estadiaAduanaDias": 2,
    "margenPct": 30,
    "moneda": "USD",
    "tipoCambio": 1,
    "observaciones": "Requiere control documental anticipado."
  },
  "update": {
    "id": "quo-1002",
    "gastosAdicionales": 230,
    "seguro": 95
  },
  "getByIdResponse": {
    "id": "quo-1002",
    "customerId": "cus-1002",
    "cliente": "AgroSur Export",
    "origen": "Asuncion",
    "destino": "Montevideo",
    "paisOrigen": "Paraguay",
    "paisDestino": "Uruguay",
    "tipoOperacion": "Importacion",
    "modoTransporte": "Multimodal",
    "proveedor": "Corredor Rio",
    "costoProveedor": 1450,
    "gastosAdicionales": 210,
    "seguro": 80,
    "horasExtra": 0,
    "estadiaAduanaDias": 2,
    "margenPct": 30,
    "moneda": "USD",
    "tipoCambio": 1,
    "observaciones": "Requiere control documental anticipado.",
    "calculation": {},
    "createdAt": "2026-04-21T08:50:00.000Z",
    "updatedAt": "2026-04-21T08:50:00.000Z"
  },
  "listResponse": {
    "items": [],
    "total": 0
  },
  "archive": {
    "id": "quo-1002",
    "archivedAt": "2026-04-21T12:00:00.000Z"
  }
}
```

### task

Fields:
- Required: `customerId`, `tarea`, `prioridad`, `fechaCompromiso`, `estado`
- Optional: `operationId`, `cliente`, `recordatorio`, `observaciones`, `archivedAt`

Relations:
- `task.customerId -> customer.id`
- `task.operationId -> operation.id`

States:
- `Pendiente`, `En curso`, `Hecha`

Traceability:
- Task saves append a customer history note.
- Task activity entries remain the canonical operational log.

CRUD contract:

```json
{
  "create": {
    "customerId": "cus-1002",
    "operationId": "op-1001",
    "cliente": "AgroSur Export",
    "tarea": "Confirmar prevision de camion",
    "prioridad": "Alta",
    "fechaCompromiso": "2026-04-22",
    "recordatorio": "2026-04-21T18:00:00.000Z",
    "estado": "En curso",
    "observaciones": "Coordinar con despachante PY."
  },
  "update": {
    "id": "task-1004",
    "estado": "Hecha",
    "observaciones": "Confirmado por telefono."
  },
  "getByIdResponse": {
    "id": "task-1004",
    "customerId": "cus-1002",
    "operationId": "op-1001",
    "cliente": "AgroSur Export",
    "tarea": "Confirmar prevision de camion",
    "prioridad": "Alta",
    "fechaCompromiso": "2026-04-22",
    "recordatorio": "2026-04-21T18:00:00.000Z",
    "estado": "En curso",
    "observaciones": "Coordinar con despachante PY.",
    "createdAt": "2026-04-21T12:00:00.000Z",
    "updatedAt": "2026-04-21T12:00:00.000Z"
  },
  "listResponse": {
    "items": [],
    "total": 0
  },
  "archive": {
    "id": "task-1004",
    "archivedAt": "2026-04-21T12:00:00.000Z"
  }
}
```

### activity

Fields:
- Required: `at`, `type`, `label`, `tone`, `title`, `details`
- Optional: `customerId`, `entityKind`, `entityId`, `operationId`, `source`, `metadata`, `createdAt`, `updatedAt`

Relations:
- `customerId -> customer.id`
- `entityKind + entityId` is the polymorphic subject reference
- `operationId -> operation.id` is optional and useful for ingestion/sync

States:
- No workflow state. This entity is an append-only event stream.

Traceability:
- `activity` is the canonical event log for changes, alerts, and assistant-driven ingestion.

CRUD contract:

```json
{
  "create": {
    "at": "2026-04-21T12:00:00.000Z",
    "type": "operation.updated",
    "label": "Operacion",
    "tone": "warning",
    "title": "Operacion actualizada",
    "details": "Montevideo -> Asuncion | Camion pendiente",
    "customerId": "cus-1002",
    "entityKind": "operation",
    "entityId": "op-1001",
    "operationId": "op-1001",
    "source": "local"
  },
  "getByIdResponse": {
    "id": "act-1001",
    "at": "2026-04-21T12:00:00.000Z",
    "type": "operation.updated",
    "label": "Operacion",
    "tone": "warning",
    "title": "Operacion actualizada",
    "details": "Montevideo -> Asuncion | Camion pendiente",
    "customerId": "cus-1002",
    "entityKind": "operation",
    "entityId": "op-1001",
    "operationId": "op-1001",
    "source": "local",
    "createdAt": "2026-04-21T12:00:00.000Z",
    "updatedAt": "2026-04-21T12:00:00.000Z"
  },
  "listResponse": {
    "items": [],
    "total": 0
  }
}
```

### operation

Fields:
- Required: `clientId`, `tipoOperacion`, `referencia`, `contenedor`, `origen`, `destino`, `estadoOperacion`, `riesgo`
- Optional: `customerId`, `fechaArribo`, `fechaCarga`, `fechaDevolucion`, `poloLogistico`, `despachanteUY`, `despachantePY`, `observaciones`, `documentChecklist`, `archivedAt`

Relations:
- `clientId` is the current V1 alias for `customerId`
- `task.operationId -> operation.id`
- `activity.entityKind + entityId -> operation.id`

States:
- `Arribo detectado`
- `Camion pendiente`
- `Documentacion preliminar`
- `Esperando NCM/seguro`
- `DUA recibido`
- `Documentacion definitiva lista`
- `En transito`
- `Devolucion pendiente`
- `Cerrado`
- `En riesgo`

Checklist criteria:
- `documentChecklist` is a fixed boolean object with the 11 keys in `OPERATION_CHECKLIST_ITEMS`
- Missing keys are normalized to `false`
- Alerts are derived from dates, state, risk, and checklist facts

Traceability:
- Operation changes generate activity entries
- Checklist progress and alerts are read models, not source-of-truth fields

CRUD contract:

```json
{
  "create": {
    "clientId": "cus-1002",
    "tipoOperacion": "Exportacion",
    "referencia": "PY-2026-041",
    "contenedor": "MSCU1234567",
    "origen": "Montevideo",
    "destino": "Asuncion",
    "fechaArribo": "2026-04-22",
    "fechaCarga": "2026-04-21",
    "fechaDevolucion": "2026-04-27",
    "poloLogistico": "Puerto de Montevideo",
    "despachanteUY": "Despachos Rivera",
    "despachantePY": "PY Logistica SRL",
    "estadoOperacion": "Camion pendiente",
    "riesgo": "Medio",
    "observaciones": "Salida coordinada con documentacion preliminar.",
    "documentChecklist": {
      "avisoArribo": true,
      "previsionCamion": false,
      "facturaCRT": true,
      "borradorCRT": true,
      "controlDespachantePY": true,
      "ncm": false,
      "valorSeguro": false,
      "dua": false,
      "micDefinitivo": false,
      "crtDefinitivo": false,
      "entregaDocumentalDespachanteUY": false
    }
  },
  "update": {
    "id": "op-1001",
    "estadoOperacion": "En transito",
    "riesgo": "Bajo"
  },
  "getByIdResponse": {
    "id": "op-1001",
    "clientId": "cus-1002",
    "customerId": "cus-1002",
    "tipoOperacion": "Exportacion",
    "referencia": "PY-2026-041",
    "contenedor": "MSCU1234567",
    "origen": "Montevideo",
    "destino": "Asuncion",
    "fechaArribo": "2026-04-22",
    "fechaCarga": "2026-04-21",
    "fechaDevolucion": "2026-04-27",
    "poloLogistico": "Puerto de Montevideo",
    "despachanteUY": "Despachos Rivera",
    "despachantePY": "PY Logistica SRL",
    "estadoOperacion": "Camion pendiente",
    "riesgo": "Medio",
    "observaciones": "Salida coordinada con documentacion preliminar.",
    "documentChecklist": {},
    "createdAt": "2026-04-21T12:00:00.000Z",
    "updatedAt": "2026-04-21T12:00:00.000Z"
  },
  "listResponse": {
    "items": [],
    "total": 0
  },
  "archive": {
    "id": "op-1001",
    "archivedAt": "2026-04-21T12:00:00.000Z"
  }
}
```

## Normalization and consistency

- Business timestamps stay ISO 8601 UTC.
- Business dates stay `YYYY-MM-DD`.
- `customerId` is the canonical relation name across the API.
- `operation.clientId` is the only legacy alias we keep for current V1 compatibility.
- Quote calculations remain derived from source fields and can be recalculated on any backend.
- Operation alerts remain derived from operation source facts plus linked task state.
- Checklist progress is derived from the fixed checklist object.
- No derived alert should be persisted as source-of-truth data.

## Current domain layer in `core.js`

Reusable domain already lives in `core.js` through:

- `calculateQuote`
- `validateCrmRecord`
- `validateQuoteRecord`
- `validateTaskRecord`
- `validateCustomerRecord`
- `validateOperationRecord`
- `upsertCrmRecord`
- `upsertQuoteRecord`
- `upsertTaskRecord`
- `upsertCustomerRecord`
- `upsertOperationRecord`
- `getCrmById`
- `getQuoteById`
- `getTaskById`
- `getCustomerById`
- `getOperationById`
- `listCrmRecords`
- `listQuoteRecords`
- `listTaskRecords`
- `listCustomerRecords`
- `listOperationRecords`
- `getCustomerActivityFeed`
- `getOperationActivityFeed`
- `getOperationAlerts`
- `getOperationChecklistProgress`
- `getDashboardMetrics`

These are the pieces that should stay UI-agnostic.

## What should remain decoupled from UI

- Validation rules
- Quote calculation
- State migration
- CRUD normalization
- Activity feed aggregation
- Operation alerts and checklist progress
- Customer synchronization from CRM records

## Minimal future split for API

The next safe split is:

1. `domain-contract.js` for enums, entity schemas, aliases, and payload rules.
2. `domain-core.js` for validation and pure business calculations.
3. `repository.local.js` for localStorage persistence.
4. `read-models.js` for feeds, metrics, alerts, and list ordering.

That split lets API sync and assistant ingestion land without rewriting the screens.

## Future compatibility

- Local records already map cleanly to backend DTOs because the domain now has explicit entity contracts.
- `operation.clientId` can be mapped to backend `customerId` without changing the UI.
- `quote.calculation`, `operation.documentChecklist`, alerts, and feeds can be recomputed server-side.
- Screen behavior can stay unchanged while data source moves from localStorage to API.
- Remaining debt is sync conflict handling, archive/unarchive UI, and assistant ingestion plumbing.
