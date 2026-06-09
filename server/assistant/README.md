# JoathiVA Assistant V1

Capas:

- `normalize`: convierte correo bruto en mensaje estandar
- `classify`: asigna caso, prioridad y señales operativas
- `plan`: define borrador, tarea, actividad y operacion sugerida
- `execute`: escribe solo en el backend validado de JoathiVA cuando se habilita

Entradas soportadas:

- `simulated`: payload manual para pruebas extremas a extremo
- `provider`: envelope compatible con un proveedor corporativo tradicional
- `mailbox`: ingesta IMAP desde perfil backend-only

Contratos expuestos:

- `GET /api/assistant/v1/health`
- `GET /api/assistant/v1/manifest`
- `POST /api/assistant/v1/intake`
- `POST /api/assistant/v1/intake/simulate`
- `POST /api/assistant/v1/intake/provider`
- `POST /api/assistant/v1/intake/mailbox`
- `GET /api/assistant/v1/intakes`
- `GET /api/assistant/v1/intakes/{id}`

Reglas V1:

- no autorrespuesta automatica
- no credenciales en frontend
- `task`, `activity` y `operation` se escriben via el contrato API ya validado
- `activity` sigue siendo append-only
- `operation` solo se escribe si hay suficientes datos para hacerlo con seguridad

Modelo de mensaje normalizado:

- `id`
- `externalId`
- `from`
- `subject`
- `date`
- `bodyNormalized`
- `customerId`
- `caseType`
- `priority`
- `requiresResponse`
- `requiresFollowUp`
- `requiresOperation`
- `requiresTask`

Modelo persistido del asistente:

- `dedupeKey`
- `summary`
- `draftReply`
- `planned`
- `execution`
- `createdAt`
- `updatedAt`

## Matching de cliente

El asistente prioriza estas señales para asociar correo -> cliente:

- remitente exacto
- dominio del remitente
- nombre de empresa o contacto en remitente/asunto/cuerpo
- referencias operativas previas del cliente cuando refuerzan una coincidencia ya plausible

Regla de seguridad:

- el contexto previo nunca crea un match por sí solo
- si la coincidencia queda ambigua, el sistema devuelve `found = false` para evitar falsos positivos

## Regresión: reconciliación de operación provisional -> real

Fixture:

- [`fixtures/reconciliation-clean.fixture.json`](./fixtures/reconciliation-clean.fixture.json)

Harness repetible:

- [`tests/reconcile-provisional-to-real.ps1`](./tests/reconcile-provisional-to-real.ps1)

Ejecución:

```powershell
powershell -ExecutionPolicy Bypass -File server\assistant\tests\reconcile-provisional-to-real.ps1
```

Qué valida:

- primer correo crea operación provisional
- segundo correo reconcilia por `PATCH` sobre la misma operación
- no hay duplicación
- `sameOperation = true`
- `operationCount = 1`
- el contenedor provisional se reemplaza por el real
- `task`, `activity` y `draft` quedan consistentes

La prueba usa copias temporales de `server\data\api-v1-store.json` y `server\data\assistant-store.json`, y no contamina los stores principales.

## Regresión negativa: correo sin señales suficientes

Fixture:

- [`fixtures/no-operation-clean.fixture.json`](./fixtures/no-operation-clean.fixture.json)

Harness repetible:

- [`tests/no-operation-when-insufficient-signals.ps1`](./tests/no-operation-when-insufficient-signals.ps1)
- [`tests/customer-match-context-smoke.ps1`](./tests/customer-match-context-smoke.ps1)

Ejecución:

```powershell
powershell -ExecutionPolicy Bypass -File server\assistant\tests\no-operation-when-insufficient-signals.ps1
```

Qué valida:

- procesa un correo simple sin señales operativas
- no crea `operation`
- puede crear `activity`
- puede crear `task` si la respuesta explícita lo justifica
- puede crear `draft`
- falla si aparece una `operation` espuria

La prueba usa stores temporales y no contamina `server\data\api-v1-store.json` ni `server\data\assistant-store.json`.

## Regresión ambigua

Fixture:

- [`fixtures/ambiguous-no-operation.fixture.json`](./fixtures/ambiguous-no-operation.fixture.json)

Harness repetible:

- [`tests/ambiguous-no-operation-regression.ps1`](./tests/ambiguous-no-operation-regression.ps1)

Ejecución:

```powershell
powershell -ExecutionPolicy Bypass -File server\assistant\tests\ambiguous-no-operation-regression.ps1
```

Qué valida:

- procesa un correo con señales parciales o ambiguas
- no crea `operation`
- puede crear `activity`
- puede crear `task` si corresponde
- puede crear `draft`
- falla si aparece una `operation` espuria

El harness crea un customer temporal para aislar la decisión de `operation`; la ambigüedad queda en el contenido del correo.

La prueba usa stores temporales y no contamina `server\data\api-v1-store.json` ni `server\data\assistant-store.json`.

Smoke de matching contextual:

```powershell
powershell -ExecutionPolicy Bypass -File server\assistant\tests\customer-match-context-smoke.ps1
```

Valida que un correo posterior pueda resolver el mismo cliente por `heuristic+context`, usando el contexto operativo previo como refuerzo y sin depender de la UI.

## Regresión IMAP controlada

Esta prueba usa un buzón IMAP controlado definido en `server\data\mailbox-profiles.json`, siembra una carpeta temporal con 3 correos reales de prueba, ejecuta el intake normal del asistente y luego elimina esa carpeta temporal.

Las identidades de prueba usadas por estos fixtures son solo de laboratorio, no de producción:

- cliente de prueba: `agencia.doblerruy@gmail.com`
- proveedor de prueba: `rhernand14@gmail.com`

Cuando estas direcciones aportan señal al match, el intake deja trazabilidad en `customerMatchReason` y `customerMatchEvidence`.

Script:

- [`tests/imap-controlled-regression.ps1`](./tests/imap-controlled-regression.ps1)

Helper IMAP:

- [`tests/imap-mailbox-control.py`](./tests/imap-mailbox-control.py)

Ejecución:

```powershell
powershell -ExecutionPolicy Bypass -File server\assistant\tests\imap-controlled-regression.ps1
```

Opcional:

- `-KeepMailboxFolder` deja la carpeta temporal del buzón sin borrar para inspección.
- `-KeepTempStores` conserva las copias temporales de los stores.

Qué valida:

- caso operativo Paraguay que crea operación provisional
- segundo correo del mismo caso que reconcilia por `PATCH`
- caso informativo que no crea operación
- drafts exportados al buzón real controlado
- stores principales intactos al cierre

Notas:

- la carpeta temporal del buzón se elimina al finalizar
- la prueba usa stores temporales de `server\data\api-v1-store.json` y `server\data\assistant-store.json`
- el buzón de borradores controlado sigue recibiendo los drafts exportados durante la validación
- el runner resuelve `python3` o `python` si existen en `PATH` y, si no, usa `WSL` automáticamente para ejecutar el helper IMAP

## Prueba real controlada 3 casos

Fixture:

- [`fixtures/imap-real-3case.fixture.json`](./fixtures/imap-real-3case.fixture.json)

Harness:

- [`tests/imap-real-3case-regression.ps1`](./tests/imap-real-3case-regression.ps1)

Ejecución:

```powershell
powershell -ExecutionPolicy Bypass -File server\assistant\tests\imap-real-3case-regression.ps1
```

Qué valida:

- caso 1 operativo Paraguay crea operación provisional
- caso 2 reconciliación hace `PATCH` sobre la misma operación
- caso 3 informativo o comercial sin operación no crea `operation`
- matching, clasificación, `task`, `activity` y drafts
- limpieza de carpeta temporal del buzón y stores principales intactos

## Regresión: cierre operativo por contenedor devuelto interno

Fixture:

- [`fixtures/internal-container-return.fixture.json`](./fixtures/internal-container-return.fixture.json)

Harness:

- [`tests/internal-container-return-regression.ps1`](./tests/internal-container-return-regression.ps1)

Ejecución:

```powershell
powershell -ExecutionPolicy Bypass -File server\assistant\tests\internal-container-return-regression.ps1
```

Qué valida:

- un primer correo crea o actualiza la operación Paraguay correspondiente
- un correo posterior enviado por Joathi con la confirmación de devolución del contenedor fuerza el cierre de la operación
- `estadoOperacion` queda en `Cerrado`
- la misma `operation` se reutiliza y no se duplica
- `task` y `activity` siguen enlazadas al mismo flujo
- la trazabilidad de cierre queda en observaciones / reconciliación

## Reglas Paraguay derivadas del corpus real

Estas reglas vienen del corpus operativo real de Paraguay y quedan como guardrail de dominio para el asistente:

- `ulglogistics.com.uy` no se trata como un solo rol fijo: puede inferirse como `cliente` o `despachante_uy` segun el contexto del hilo.
- Señales fuertes de Paraguay: `PYxxxx`, `PAR`, `BOGG`, `arribo`, `Asuncion`, `Murchison`, `booking`, `contenedor`, `ETA`, `destino PY`.
- Estados operativos cubiertos: `aviso de arribo`, `pedido de camión`, `factura CRT`, `borrador CRT`, `espera NCM / seguro`, `DUA`, `MIC / CRT definitivo`, `entrega documental`, `devolución / retorno`, `demoras / costos`.
- Los borradores quedan en revisión humana: nunca hay autorrespuesta automatica.
- `operation` se crea o actualiza solo si la combinación de cliente + señales Paraguay + estado operativo lo justifican con confianza suficiente.

Smoke de corpus Paraguay:

- [`tests/paraguay-corpus-rules-smoke.ps1`](./tests/paraguay-corpus-rules-smoke.ps1)

Ejecución:

```powershell
powershell -ExecutionPolicy Bypass -File server\assistant\tests\paraguay-corpus-rules-smoke.ps1
```

Qué valida:

- matching por actor y contexto sobre `ULG`, `RFM Capital`, `Tradex` y un caso de control
- stage Paraguay `aviso de arribo`, `DUA`, `factura CRT`, `espera NCM / seguro`, `borrador CRT` e `informativo`
- `operation` se plantea solo cuando corresponde
- `task` y `draft` se siguen proponiendo cuando aplica
- el corpus real se usa como señal de reglas, no como hardcode de producción

## Piloto diario real

Piloto operativo minimo para una sola cuenta IMAP y un folder dedicado:

- [`pilot/README.md`](./pilot/README.md)
- [`pilot/daily-pilot.ps1`](./pilot/daily-pilot.ps1)
- [`pilot/daily-pilot.config.json`](./pilot/daily-pilot.config.json)

Uso recomendado:

```powershell
powershell -ExecutionPolicy Bypass -File server\assistant\pilot\daily-pilot.ps1
```

Pausa:

- cambiar `enabled` a `false` en `pilot/daily-pilot.config.json`
- o crear `pilot/PAUSE`

Revision diaria:

- `server/assistant/pilot/out/latest.json`
- `server/assistant/pilot/out/latest.md`
