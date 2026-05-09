# JoathiVA V1 Sync / API Contract

Scope:
- Canonical sync entities: `customer`, `quote`, `task`, `activity`, `operation`
- Local CRM remains a UI projection over the commercial flow and does not expose its own API contract
- The UI keeps working local-first while this contract stays ready for future backend and assistant ingestion

## Sync Strategy

| Entity | Direction | Create/Update | Archive | Notes |
|---|---|---:|---:|---|
| customer | bidirectional | yes | yes | Canonical commercial master record |
| quote | bidirectional | yes | yes | `calculation` is read-only/derived |
| task | bidirectional | yes | yes | Agenda item, may link to `operationId` |
| activity | append-only | create only | no | Event stream, no edits |
| operation | bidirectional | yes | yes | Workflow record, checklist is source of truth |

## Identity And Timestamps

- `id` is the canonical primary key for local and remote sync.
- Local records are created with stable ids using the existing prefix scheme: `cus-`, `quo-`, `task-`, `act-`, `op-`.
- Remote services should accept the same `id` when possible so offline-first records do not need remapping.
- `createdAt` is immutable origin time.
- `updatedAt` is the last mutation time and the main LWW sync cursor.
- `archivedAt` is a soft-delete marker.
- `activity` does not use `archivedAt`.

## Source Of Truth

- `customer`: fields on the record are authoritative.
- `quote`: record fields are authoritative; `calculation` is derived on read.
- `task`: record fields are authoritative.
- `activity`: append-only event payload is authoritative.
- `operation`: record fields plus `documentChecklist` are authoritative.
- `operation.checklistProgress` and `operation.alerts` are derived, not persisted.

## Alias Rule

- Local UI and storage may use `clientId` on `operation`.
- API contract canonical field is `customerId`.
- The adapter maps:
  - local `clientId` -> API `customerId`
  - API `customerId` -> local `clientId`
- Both fields may be mirrored locally for compatibility, but the API should emit `customerId`.

## Endpoints

### customer

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/customers` | Create customer |
| GET | `/api/v1/customers/{id}` | Get customer |
| GET | `/api/v1/customers` | List customers |
| PATCH | `/api/v1/customers/{id}` | Update customer |
| POST | `/api/v1/customers/{id}/archive` | Archive customer |
| POST | `/api/v1/customers/{id}/unarchive` | Unarchive customer |
| GET | `/api/v1/customers/changes` | Incremental pull |
| POST | `/api/v1/customers/sync` | Batch sync push |

List filters:
- `q`
- `tipoCliente`
- `updatedAfter`
- `archived`
- `limit`
- `cursor`

### quote

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/quotes` | Create quote |
| GET | `/api/v1/quotes/{id}` | Get quote |
| GET | `/api/v1/quotes` | List quotes |
| PATCH | `/api/v1/quotes/{id}` | Update quote |
| POST | `/api/v1/quotes/{id}/archive` | Archive quote |
| POST | `/api/v1/quotes/{id}/unarchive` | Unarchive quote |
| GET | `/api/v1/quotes/changes` | Incremental pull |
| POST | `/api/v1/quotes/sync` | Batch sync push |

List filters:
- `q`
- `customerId`
- `paisOrigen`
- `paisDestino`
- `tipoOperacion`
- `moneda`
- `updatedAfter`
- `archived`
- `limit`
- `cursor`

### task

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/tasks` | Create task |
| GET | `/api/v1/tasks/{id}` | Get task |
| GET | `/api/v1/tasks` | List tasks |
| PATCH | `/api/v1/tasks/{id}` | Update task |
| POST | `/api/v1/tasks/{id}/archive` | Archive task |
| POST | `/api/v1/tasks/{id}/unarchive` | Unarchive task |
| GET | `/api/v1/tasks/changes` | Incremental pull |
| POST | `/api/v1/tasks/sync` | Batch sync push |

List filters:
- `q`
- `customerId`
- `operationId`
- `estado`
- `prioridad`
- `dueBefore`
- `dueAfter`
- `updatedAfter`
- `archived`
- `limit`
- `cursor`

### activity

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/activities` | Create activity event |
| GET | `/api/v1/activities/{id}` | Get activity |
| GET | `/api/v1/activities` | List activity feed |
| GET | `/api/v1/activities/changes` | Incremental pull |
| POST | `/api/v1/activities/sync` | Append-only sync push |

List filters:
- `q`
- `customerId`
- `operationId`
- `entityKind`
- `entityId`
- `source`
- `since`
- `until`
- `limit`
- `cursor`

### operation

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/operations` | Create operation |
| GET | `/api/v1/operations/{id}` | Get operation |
| GET | `/api/v1/operations` | List operations |
| PATCH | `/api/v1/operations/{id}` | Update operation |
| POST | `/api/v1/operations/{id}/archive` | Archive operation |
| POST | `/api/v1/operations/{id}/unarchive` | Unarchive operation |
| GET | `/api/v1/operations/changes` | Incremental pull |
| POST | `/api/v1/operations/sync` | Batch sync push |

List filters:
- `q`
- `customerId`
- `tipoOperacion`
- `estadoOperacion`
- `riesgo`
- `dueBefore`
- `dueAfter`
- `updatedAfter`
- `archived`
- `limit`
- `cursor`

## Request Envelope

The adapter returns a transport descriptor, but the API contract itself can use a lightweight envelope:

```json
{
  "apiVersion": "v1",
  "envelopeVersion": 1,
  "domainVersion": 3,
  "entityKind": "operation",
  "action": "create",
  "meta": {
    "source": "local-first",
    "requestId": "req_123",
    "cursor": null,
    "limit": 50
  },
  "data": {}
}
```

## Success Response

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "apiVersion": "v1",
    "envelopeVersion": 1,
    "domainVersion": 3,
    "entityKind": "customer",
    "action": "list",
    "count": 2,
    "hasMore": false
  },
  "pagination": {
    "cursor": "next_cursor_value",
    "limit": 50
  }
}
```

For list and changes responses, `data` can be an array or a cursor payload:

```json
{
  "ok": true,
  "data": {
    "items": [],
    "nextCursor": null,
    "hasMore": false
  }
}
```

## Error Response

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "status": 400,
    "message": "Missing required fields",
    "retryable": false,
    "entityKind": "task",
    "action": "create",
    "details": {
      "fieldErrors": {
        "customerId": "Selecciona un cliente."
      }
    }
  }
}
```

Canonical error codes:
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `RATE_LIMITED`
- `SYNC_CONFLICT`
- `NOT_IMPLEMENTED`
- `TRANSPORT_UNAVAILABLE`
- `UNKNOWN`

## Payload Examples

### customer create

```json
{
  "id": "cus-1004",
  "nombre": "Nueva cuenta SA",
  "empresa": "Nueva cuenta SA",
  "contactoPrincipal": "Sofia Perez",
  "telefono": "+598 99 000 111",
  "email": "logistica@nuevacuenta.com",
  "tipoCliente": "Prospecto",
  "ciudad": "Montevideo",
  "pais": "Uruguay",
  "createdAt": "2026-04-21T12:00:00.000Z",
  "updatedAt": "2026-04-21T12:00:00.000Z",
  "archivedAt": null
}
```

### quote create

```json
{
  "id": "quo-2001",
  "customerId": "cus-1004",
  "origen": "Porto Alegre",
  "destino": "Montevideo",
  "paisOrigen": "Brasil",
  "paisDestino": "Uruguay",
  "tipoOperacion": "Importacion",
  "modoTransporte": "Terrestre",
  "proveedor": "Proveedor X",
  "costoProveedor": 1200,
  "gastosAdicionales": 180,
  "seguro": 65,
  "horasExtra": 0,
  "estadiaAduanaDias": 1,
  "margenPct": 30,
  "moneda": "USD",
  "tipoCambio": 1,
  "observaciones": "Entrega en deposito fiscal.",
  "createdAt": "2026-04-21T12:00:00.000Z",
  "updatedAt": "2026-04-21T12:00:00.000Z",
  "archivedAt": null
}
```

### task create

```json
{
  "id": "task-2001",
  "customerId": "cus-1004",
  "operationId": "op-3001",
  "tarea": "Confirmar documentacion",
  "prioridad": "Alta",
  "fechaCompromiso": "2026-04-22",
  "recordatorio": "2026-04-22T10:00:00.000Z",
  "estado": "Pendiente",
  "observaciones": "Seguir por WhatsApp.",
  "createdAt": "2026-04-21T12:00:00.000Z",
  "updatedAt": "2026-04-21T12:00:00.000Z",
  "archivedAt": null
}
```

### activity create

```json
{
  "id": "act-2001",
  "at": "2026-04-21T12:00:00.000Z",
  "type": "operation-update",
  "label": "Operacion actualizada",
  "tone": "info",
  "title": "Operacion actualizada",
  "details": "Se actualizo el estado de la operacion.",
  "customerId": "cus-1004",
  "entityKind": "operation",
  "entityId": "op-3001",
  "operationId": "op-3001",
  "source": "assistant",
  "metadata": {
    "origin": "email"
  },
  "createdAt": "2026-04-21T12:00:00.000Z",
  "updatedAt": "2026-04-21T12:00:00.000Z"
}
```

### operation create

```json
{
  "id": "op-3001",
  "customerId": "cus-1004",
  "tipoOperacion": "Importacion",
  "referencia": "REF-2026-001",
  "contenedor": "MSCU1234567",
  "origen": "Porto Alegre",
  "destino": "Montevideo",
  "fechaArribo": "2026-04-24",
  "fechaCarga": "2026-04-23",
  "fechaDevolucion": "2026-04-28",
  "poloLogistico": "Montevideo",
  "despachanteUY": "Despachante UY",
  "despachantePY": "Despachante PY",
  "estadoOperacion": "Arribo detectado",
  "riesgo": "Medio",
  "observaciones": "Operacion sensible por plazo.",
  "documentChecklist": {
    "avisoArribo": true,
    "previsionCamion": false,
    "facturaCRT": true,
    "borradorCRT": false,
    "controlDespachantePY": false,
    "ncm": false,
    "valorSeguro": false,
    "dua": false,
    "micDefinitivo": false,
    "crtDefinitivo": false,
    "entregaDocumentalDespachanteUY": false
  },
  "createdAt": "2026-04-21T12:00:00.000Z",
  "updatedAt": "2026-04-21T12:00:00.000Z",
  "archivedAt": null
}
```

### operation sync push

```json
{
  "entityKind": "operation",
  "mode": "push",
  "baseVersion": 3,
  "cursor": null,
  "source": "local-first",
  "upserts": [
    {
      "id": "op-3001",
      "customerId": "cus-1004",
      "tipoOperacion": "Importacion",
      "referencia": "REF-2026-001",
      "contenedor": "MSCU1234567",
      "origen": "Porto Alegre",
      "destino": "Montevideo",
      "estadoOperacion": "Arribo detectado",
      "riesgo": "Medio",
      "createdAt": "2026-04-21T12:00:00.000Z",
      "updatedAt": "2026-04-21T12:00:00.000Z"
    }
  ],
  "archives": [],
  "unarchives": []
}
```

### activity sync push

```json
{
  "entityKind": "activity",
  "mode": "push",
  "baseVersion": 3,
  "cursor": null,
  "source": "assistant",
  "records": [
    {
      "id": "act-2001",
      "at": "2026-04-21T12:00:00.000Z",
      "type": "operation-update",
      "label": "Operacion actualizada",
      "tone": "info",
      "title": "Operacion actualizada",
      "details": "Se actualizo el estado de la operacion.",
      "customerId": "cus-1004",
      "entityKind": "operation",
      "entityId": "op-3001",
      "operationId": "op-3001",
      "source": "assistant",
      "metadata": {
        "origin": "email"
      },
      "createdAt": "2026-04-21T12:00:00.000Z",
      "updatedAt": "2026-04-21T12:00:00.000Z"
    }
  ]
}
```

## Sync Rules

- `customer`, `quote`, `task`, `operation` use last-write-wins by `updatedAt`.
- `activity` is append-only and should never be edited in place.
- `calculation` on quote is derived on read and may be omitted from writes.
- `checklistProgress` and `alerts` on operation are derived on read and may be omitted from writes.
- The assistant operational layer can write `customer`, `task`, `activity`, and `operation` with the same contract.

## Future Backend Notes

- Keep `id` stable across offline and online writes.
- Accept `archivedAt: null` to unarchive.
- Preserve unknown fields in read responses only if they are needed by future projections.
- The adapter already exposes request envelopes and a noop transport placeholder so a real backend can be injected later without changing the UI.
