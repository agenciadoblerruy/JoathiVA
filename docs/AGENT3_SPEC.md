# AGENT3_SPEC.md — Agente de Alertas y Acciones Pendientes

Versión: 1.0 (final para Codex)
Estado: aprobado con correcciones

---

## Propósito

El Agente 3 es un agente de lectura que consume la salida ya validada del Agente 2
(clasificación de correos) y genera alertas y acciones pendientes en la base de datos local.

No envía, borra, mueve ni marca correos en ningún caso.

---

## Posición en el pipeline

```
Outlook / IMAP
    ↓
Agente 2 — clasificación
  campos producidos:
    - category
    - REQUIERE_ACCION (boolean)
    - urgency (BAJA | MEDIA | ALTA | CRITICA)
    - mentions_rodrigo (boolean)
    - due_at (ISO 8601 | null)
    - has_attachments (boolean)
    ↓
Agente 3 — alertas y acciones pendientes   ← este spec
  salida:
    - tabla pending_actions en SQLite
    - panel de alertas en JoathiVA
```

El Agente 3 no relee el correo original.
Trabaja exclusivamente sobre la salida estructurada del Agente 2.

---

## Restricciones absolutas

- No enviar correos.
- No borrar correos.
- No mover correos entre carpetas.
- No marcar correos como leídos, no leídos o con categoría.
- No modificar ningún registro que el Agente 2 ya haya escrito.
- Solo insertar y actualizar en `pending_actions`.

---

## Modelo de datos

### Tabla `agents`

```sql
CREATE TABLE IF NOT EXISTS agents (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  role       TEXT    NOT NULL,
  enabled    INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### Tabla `pending_actions`

```sql
CREATE TABLE IF NOT EXISTS pending_actions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id      TEXT    NOT NULL,
  subject       TEXT,
  from_address  TEXT,
  category      TEXT    NOT NULL,
  level         TEXT    NOT NULL CHECK(level IN ('BAJA','MEDIA','ALTA','CRITICA')),
  urgency       TEXT    NOT NULL CHECK(urgency IN ('BAJA','MEDIA','ALTA','CRITICA')),
  mentions_rodrigo INTEGER NOT NULL DEFAULT 0,
  has_attachments  INTEGER NOT NULL DEFAULT 0,
  due_at        TEXT,
  resolved      INTEGER NOT NULL DEFAULT 0,
  resolved_at   TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  agent_id      INTEGER REFERENCES agents(id)
);
```

---

## Valores de urgency

Siempre en mayúsculas. No usar valores en minúsculas.

| Valor   | Significado                               |
|---------|-------------------------------------------|
| BAJA    | informativo, sin acción urgente           |
| MEDIA   | requiere revisión o seguimiento normal    |
| ALTA    | acción requerida en el día                |
| CRITICA | bloqueo, vencimiento o riesgo inmediato   |

Mapeo desde campos legacy del Agente 2 si aparecieran en minúsculas:

| Valor recibido | Valor normalizado |
|----------------|-------------------|
| inmediata      | CRITICA           |
| alta           | ALTA              |
| normal / media | MEDIA             |
| baja           | BAJA              |

El Agente 3 normaliza al leer. No asume que el Agente 2 ya entrega mayúsculas.

---

## Lógica de generación de alertas

### Condiciones para insertar en `pending_actions`

Insertar si se cumple al menos una condición:

1. `REQUIERE_ACCION = true` y `urgency IN ('CRITICA', 'ALTA')`
2. `mentions_rodrigo = true` y `REQUIERE_ACCION = true`
3. `due_at IS NOT NULL` y `due_at <= NOW() + 48h`
4. `category IN ('documento_recibido', 'seguimiento_operacion')`

### Asignación de `level` por categoría y urgency

| category                  | urgency recibido | level asignado |
|---------------------------|------------------|----------------|
| operacion_critica         | CRITICA          | CRITICA        |
| operacion_critica         | ALTA             | ALTA           |
| pago / factura_pendiente  | CRITICA / ALTA   | ALTA           |
| documento_recibido        | cualquiera       | MEDIA          |
| seguimiento_operacion     | cualquiera       | MEDIA          |
| cotizacion_pendiente      | ALTA             | ALTA           |
| cotizacion_pendiente      | MEDIA / BAJA     | MEDIA          |
| otros con REQUIERE_ACCION | CRITICA          | CRITICA        |
| otros con REQUIERE_ACCION | ALTA             | ALTA           |
| otros con REQUIERE_ACCION | MEDIA            | MEDIA          |
| sin REQUIERE_ACCION       | BAJA             | BAJA           |

Regla de fallback: si no hay coincidencia exacta, usar el valor de `urgency` como `level`.

---

## Ordenamiento de alertas

No usar `level DESC` (orden alfabético incorrecto).
No usar `NULLS LAST` (no portable en SQLite).

Usar CASE explícito:

```sql
SELECT *
FROM   pending_actions
WHERE  resolved = 0
ORDER BY
  CASE level
    WHEN 'CRITICA' THEN 1
    WHEN 'ALTA'    THEN 2
    WHEN 'MEDIA'   THEN 3
    WHEN 'BAJA'    THEN 4
    ELSE 5
  END,
  CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,
  due_at    ASC,
  created_at ASC;
```

Este ordenamiento es el estándar para toda consulta de alertas en el Agente 3.

---

## Deduplicación

No insertar si ya existe un registro activo con el mismo `email_id` y `category`:

```sql
SELECT COUNT(*)
FROM   pending_actions
WHERE  email_id = :email_id
  AND  category = :category
  AND  resolved = 0;
```

Si el resultado es mayor que cero, omitir la inserción.

---

## Seed del Agente 3

Insertar el Agente 3 solo si no existe un agente con ese nombre o rol.
No depender del número total de agentes en la tabla.

```sql
INSERT INTO agents (name, role)
SELECT 'Agente de Alertas y Acciones', 'alertas_acciones_pendientes'
WHERE NOT EXISTS (
  SELECT 1
  FROM   agents
  WHERE  name = 'Agente de Alertas y Acciones'
     OR  role LIKE '%alerta%'
     OR  role LIKE '%acciones_pendientes%'
);
```

---

## API interna expuesta

### GET /api/assistant/v1/pending-actions

Devuelve alertas activas ordenadas por nivel y vencimiento.

Parámetros opcionales:
- `level` — filtrar por nivel: BAJA | MEDIA | ALTA | CRITICA
- `category` — filtrar por categoría
- `limit` — máximo de resultados (default: 50)
- `offset` — paginación

Respuesta:

```json
{
  "count": 3,
  "items": [
    {
      "id": 1,
      "email_id": "msg-001",
      "subject": "DUA VENCIDO",
      "from_address": "proveedores@ejemplo.com",
      "category": "operacion_critica",
      "level": "CRITICA",
      "urgency": "CRITICA",
      "mentions_rodrigo": false,
      "has_attachments": false,
      "due_at": "2026-06-02T18:00:00.000Z",
      "resolved": false,
      "created_at": "2026-06-02T10:00:00.000Z"
    }
  ]
}
```

### PATCH /api/assistant/v1/pending-actions/:id/resolve

Marca una acción como resuelta.

```json
{ "resolved": true }
```

No elimina el registro. Actualiza `resolved = 1` y `resolved_at = NOW()`.

---

## Panel de alertas en JoathiVA

El panel consume `GET /api/assistant/v1/pending-actions`.

Requisitos:
- Mostrar badge con conteo de alertas CRITICA + ALTA sin resolver.
- Ordenar usando el mismo CASE explícito definido en este spec.
- Permitir marcar como resuelta desde el panel (llama PATCH).
- No mostrar alertas resueltas en la vista principal.
- Mostrar `due_at` formateado como fecha relativa si está dentro de 72h.

Colores por nivel:

| level   | tono visual |
|---------|-------------|
| CRITICA | danger      |
| ALTA    | warning     |
| MEDIA   | info        |
| BAJA    | neutral     |

---

## Flujo de ejecución del Agente 3

```
1. Leer batch de registros clasificados del Agente 2
2. Para cada registro:
   a. Normalizar urgency a mayúsculas
   b. Evaluar condiciones de generación de alerta
   c. Si aplica:
      - Verificar deduplicación
      - Calcular level según tabla de asignación
      - Insertar en pending_actions
3. Retornar resumen: { processed, inserted, skipped_duplicate }
4. No tocar correos originales
5. No modificar registros del Agente 2
```

---

## Regresión mínima esperada

Antes de pasar a producción, validar:

1. Un correo con `urgency=CRITICA` y `REQUIERE_ACCION=true` genera alerta con `level=CRITICA`.
2. Un correo con `category=documento_recibido` genera alerta con `level=MEDIA` independientemente del urgency.
3. Un correo con `category=seguimiento_operacion` genera alerta con `level=MEDIA`.
4. El ordenamiento devuelve CRITICA antes que ALTA, ALTA antes que MEDIA.
5. Los registros con `due_at NULL` aparecen después de los que tienen fecha.
6. La deduplicación evita insertar dos veces el mismo `email_id + category`.
7. El seed no inserta el Agente 3 si ya existe por nombre o rol.
8. El Agente 3 no produce ninguna escritura en buzones de correo.

---

## Dependencias

- Agente 2 cerrado y operando en modo API local o demo.
- Base SQLite local inicializada con el schema de este spec.
- Servidor JoathiVA activo en el puerto configurado.
- No requiere conexión a servidores externos.

---

## Lo que el Agente 3 NO implementa

- Envío de correos o notificaciones externas.
- Integración con Outlook o IMAP directa.
- Reclasificación de correos ya procesados por el Agente 2.
- Reglas de IA propias (consume clasificación ya hecha).
- Modificación del store del Agente 2.

---

## Estado del proyecto al momento de este spec

```
Agente 2:  cerrado en modo demo/API local
Agente 3:  especificación aprobada — versión final para Codex
Codex:     en espera de este spec para implementación
```
