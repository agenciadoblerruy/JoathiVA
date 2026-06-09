# JoathiVA V1 - Contrato de Datos

Documento operativo para mantener compatibilidad local-first y preparar una futura API/back-end sin cambiar el modelo de negocio.

Fuentes de verdad actuales:
- Web V1: `V/v1/domain-contract.js`, `V/v1/domain-core.js`, `V/v1/repository.local.js`, `V/v1/adapter.api.js`
- Persistencia local: `localStorage`
- Storage key: `joathiva-v1-state`
- Version de dominio: `DOMAIN_VERSION = 3`

## Principios

- El dato persistido debe ser simple, serializable a JSON y reversible.
- Los datos derivados no son fuente de verdad: calculos de cotizacion, progreso de checklist, alertas, feeds y metricas se recalculan.
- Las relaciones se guardan por ID, no por copia completa del registro relacionado.
- La app debe tolerar datos previos mediante normalizacion y migracion local.
- Android usa los mismos assets/datos web dentro de WebView, por lo que el contrato debe mantenerse compatible con `localStorage`.

## IDs

Formato actual:
- Generados con prefijo de entidad y sufijo local.
- Prefijos esperados: `cus`, `quo`, `task`, `act`, `op`.
- Los IDs son strings y no deben parsearse como numeros.

Reglas:
- `id` es obligatorio para updates.
- Si un registro viejo no trae `id`, el repositorio local genera uno al normalizar.
- Una futura API debe aceptar IDs existentes para no romper datos local-first ya creados.

## Timestamps

Campos comunes:
- `createdAt`: fecha ISO-8601 UTC de creacion.
- `updatedAt`: fecha ISO-8601 UTC de ultima modificacion.
- `archivedAt`: fecha ISO-8601 UTC o vacio/null cuando no esta archivado.
- `activity.at`: fecha ISO-8601 UTC del evento.

Reglas:
- No usar fechas locales ambiguas para auditoria.
- Las fechas operativas (`fechaArribo`, `fechaCarga`, `fechaDevolucion`, `fechaCompromiso`) se guardan como `YYYY-MM-DD` cuando vienen de inputs de fecha.
- `createdAt` se preserva en updates.

## Entidades

### customer

Storage local: `customers`

Campos principales:
- `id`
- `nombre`
- `empresa`
- `contactoPrincipal`
- `telefono`
- `email`
- `tipoCliente`: `Prospecto`, `Activo`, `Cliente`
- `ciudad`
- `pais`
- `datosGenerales`
- `contactos`
- `historialComercial`
- `cotizacionesAsociadas`
- `incidencias`
- `condicionesPactadas`
- `observacionesClave`
- `createdAt`
- `updatedAt`
- `archivedAt`

Relaciones:
- `quote.customerId -> customer.id`
- `task.customerId -> customer.id`
- `operation.clientId/customerId -> customer.id`
- `activity.customerId -> customer.id`

Compatibilidad:
- Puede coexistir con registros CRM (`crm.customerId`) para no duplicar cliente.
- No borrar clientes al archivar; usar `archivedAt`.

### quote

Storage local: `quotes`

Campos principales:
- `id`
- `customerId`
- `cliente`
- `origen`
- `destino`
- `paisOrigen`
- `paisDestino`
- `tipoOperacion`
- `modoTransporte`: `Terrestre`, `Maritimo`, `Aereo`, `Multimodal`
- `proveedor`
- `costoProveedor`
- `margenPct`
- `moneda`: `USD`, `UYU`
- `gastosAdicionales`
- `seguro`
- `horasExtra`
- `estadiaAduanaDias`
- `tipoCambio`
- `observaciones`
- `estado`: `Borrador`, `Calculada`, `Archivada`
- `calculation` derivado/persistido para lectura rapida, recalculable
- `createdAt`
- `updatedAt`
- `archivedAt`

Relaciones:
- `customerId -> customer.id`
- Puede generar actividad comercial en `activityLog`.

Regla:
- La cotizacion no debe crear operacion automaticamente salvo accion explicita.

### task

Storage local: `agenda`

Campos principales:
- `id`
- `customerId`
- `operationId` opcional
- `cliente`
- `tarea`
- `prioridad`: `Alta`, `Media`, `Baja`
- `fechaCompromiso`
- `estado`: `Pendiente`, `En curso`, `Hecha`
- `recordatorio`
- `observaciones`
- `createdAt`
- `updatedAt`
- `archivedAt`

Relaciones:
- `customerId -> customer.id`
- `operationId -> operation.id` cuando la tarea pertenece a un expediente.

Compatibilidad:
- `operationId` es opcional. Las tareas existentes sin operacion deben seguir funcionando.

### activity

Storage local: `activityLog`

Campos principales:
- `id`
- `at`
- `type`
- `label`
- `tone`: `neutral`, `info`, `success`, `warning`, `danger`
- `title`
- `details`
- `customerId`
- `operationId`
- `entityKind`
- `entityId`
- `source`
- `metadata`
- `createdAt`
- `updatedAt`

Relaciones:
- Puede apuntar a `customer`, `quote`, `task` u `operation`.
- Para operaciones se usa `operationId` y/o `entityKind=operation` + `entityId`.

Regla:
- `activity` es append-only a nivel funcional. Corregir un evento debe agregar otro evento, no editar historia salvo migracion tecnica.
- El feed puede limitarse para UI, pero el contrato no debe depender del orden visible.

### operation

Storage local: `operations`

Campos principales:
- `id`
- `clientId`
- `customerId`
- `tipoOperacion`: `Importacion`, `Exportacion`, `Nacional`, `Transito`
- `referencia`
- `contenedor`
- `dua`
- `duaNumber`
- `origen`
- `destino`
- `fechaArribo`
- `fechaCarga`
- `fechaDevolucion`
- `poloLogistico`
- `despachanteUY`
- `despachantePY`
- `providerId`
- `providerName`
- `brokerId`
- `brokerName`
- `brokerRole`
- `responsibleContactId`
- `responsibleContactName`
- `responsibleContactPhone`
- `responsibleContactEmail`
- `fleetUnitId`
- `fleetUnitLabel`
- `fleetLocation`
- `fleetStatus`
- `fleetAvailableAt`
- `expectedFinishAt`
- `documents`
- `estadoOperacion`
- `riesgo`: `Bajo`, `Medio`, `Alto`
- `observaciones`
- `documentChecklist`
- `createdAt`
- `updatedAt`
- `archivedAt`

Alias de compatibilidad:
- `clientId` y `customerId` representan el mismo vinculo con cliente.
- El normalizador actual completa `customerId = clientId`.
- `dua` es el campo operativo dedicado para DUA.
- `duaNumber` queda como alias compatible de `dua`.
- Una futura API debe aceptar ambos durante migracion y devolver ambos mientras Android/Web dependan de ese alias.

Estados operativos:
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

Relaciones:
- `operation.clientId/customerId -> customer.id`
- `task.operationId -> operation.id`
- `activity.operationId -> operation.id`

Datos derivados:
- `checklistProgress`
- `alerts`
- `linkedTasks`
- `activityFeed`

Regla:
- Una operacion cerrada no debe generar alertas operativas activas.

## Relacionamiento operativo: cliente, proveedor y despachante

Regla de negocio:
- Un despachante puede participar con N proveedores y N clientes a traves de N operaciones.
- Un proveedor puede participar con N despachantes y N clientes a traves de N operaciones.
- Un cliente debe tener 1 proveedor y 1 despachante por cada operacion realizada.
- La relacion concreta siempre se resuelve por `operation`, no por una asignacion global fija del cliente.

Cardinalidades:
- `broker/despachante 1 -> N operation`
- `provider/proveedor 1 -> N operation`
- `customer/cliente 1 -> N operation`
- `operation N -> 1 customer`
- `operation N -> 1 provider`
- `operation N -> 1 broker/despachante responsable`

Implicacion:
- El mismo cliente puede operar con distintos proveedores y despachantes en operaciones distintas.
- El mismo proveedor puede operar con distintos clientes y despachantes.
- El mismo despachante puede operar con distintos proveedores y clientes.
- La visibilidad por usuario debe calcularse por operaciones vinculadas, no solo por dominio/email/rol general.

Estado actual V1:
- `operation` ya vincula cliente por `clientId/customerId`.
- `operation` ya tiene campo dedicado `dua` y alias `duaNumber`.
- `operation` guarda `despachanteUY` y `despachantePY` como texto.
- `quote` guarda `proveedor` como texto.
- `operation` normaliza campos compatibles futuros para proveedor/despachante/flota/contacto, preservando los campos de texto por compatibilidad.

Campos recomendados para evolucionar sin romper datos:
- `operation.providerId`
- `operation.providerName`
- `operation.brokerId`
- `operation.brokerName`
- `operation.brokerRole`: `UY`, `PY`, `ambos`, `otro`
- `operation.responsibleContactId`
- `operation.responsibleContactName`
- `operation.responsibleContactPhone`
- `operation.responsibleContactEmail`
- `operation.fleetUnitId`
- `operation.fleetUnitLabel`
- `operation.fleetLocation`
- `operation.fleetStatus`
- `operation.fleetAvailableAt`
- `operation.expectedFinishAt`
- `operation.documents`

Regla de compatibilidad:
- Si existen `despachanteUY`, `despachantePY` o `quote.proveedor`, se conservan.
- Si se agrega `providerId` o `brokerId`, la UI debe preferir el ID para permisos y trazabilidad.
- Los textos legacy siguen sirviendo para busqueda, lectura humana y migracion.

### provider/proveedor

Entidad futura recomendada para API/back-end:

Campos:
- `id`
- `name`
- `company`
- `email`
- `phone`
- `taxId`
- `contacts`
- `fleet`
- `documents`
- `banking`
- `status`
- `createdAt`
- `updatedAt`
- `archivedAt`

Relaciones:
- `operation.providerId -> provider.id`
- `quote.providerId -> provider.id` cuando la cotizacion ya este normalizada.
- `user.providerId -> provider.id` para login de proveedor.

Visibilidad proveedor:
- Un usuario con rol `provider` ve operaciones donde `operation.providerId` coincide con su proveedor.
- Tambien ve clientes y despachantes solo en el contexto de esas operaciones.
- No debe ver operaciones de otros proveedores.
- No debe ver margen interno de Joathi si no corresponde a su perfil.

Indicadores principales para proveedor:
- Cantidad de operaciones abiertas.
- Donde esta su flota.
- Fecha de finalizacion de la proxima operacion.
- Fecha de disponibilidad de flota.
- Documentacion de la operacion.
- Contacto responsable de la operacion.

### broker/despachante

Entidad futura recomendada para API/back-end:

Campos:
- `id`
- `name`
- `company`
- `email`
- `phone`
- `country`
- `role`: `UY`, `PY`, `ambos`, `otro`
- `contacts`
- `status`
- `createdAt`
- `updatedAt`
- `archivedAt`

Relaciones:
- `operation.brokerId -> broker.id`
- `user.brokerId -> broker.id` para login de despachante.

Visibilidad despachante:
- Un usuario con rol `broker` ve operaciones donde `operation.brokerId` coincide con su despachante.
- Tambien ve proveedores y clientes solo en el contexto de esas operaciones.
- Debe priorizar estado documental, DUA/MIC/CRT, checklist, tareas y responsable.

### documents

Modelo recomendado dentro de `operation.documents` o como entidad futura:

Campos:
- `id`
- `operationId`
- `type`: `DUA`, `CRT`, `MIC`, `Factura`, `Seguro`, `NCM`, `Otro`
- `fileName`
- `status`: `pendiente`, `recibido`, `validado`, `observado`
- `uploadedByUserId`
- `visibleToRoles`
- `createdAt`
- `updatedAt`

Regla:
- La documentacion visible para proveedor/despachante debe derivarse de la operacion relacionada y permisos por rol.
- No exponer documentos de operaciones no vinculadas al usuario.

## Checklist item

Storage local: dentro de `operation.documentChecklist`.

Modelo:
- Objeto plano `{ [key: string]: boolean }`
- Todas las claves conocidas deben existir tras normalizacion.
- Valores no booleanos se normalizan con `Boolean(value)`.

Claves V1:
- `avisoArribo`: Aviso de arribo
- `previsionCamion`: Prevision de camion
- `facturaCRT`: Factura CRT
- `borradorCRT`: Borrador CRT
- `controlDespachantePY`: Control despachante PY
- `ncm`: NCM
- `valorSeguro`: Valor seguro
- `dua`: DUA
- `micDefinitivo`: MIC definitivo
- `crtDefinitivo`: CRT definitivo
- `entregaDocumentalDespachanteUY`: Entrega documental despachante UY

Regla:
- No guardar progreso como fuente de verdad. El progreso es `completed/total` calculado desde las claves booleanas.

## Alert

Las alertas son derivadas desde `operation`, fechas, estado y checklist. No se persisten como fuente de verdad.

Modelo de lectura:
- `type`
- `label`
- `tone`
- `title`
- `details`
- `at`
- `operationId`
- `customerId`

Tipos actuales:
- `arrival.due`: arribo vencido/proximo segun fecha.
- `arrival.today`: arribo hoy.
- `truck.missing`: falta prevision de camion.
- `docs.ncm-insurance`: falta NCM o valor seguro.
- `docs.dua`: falta DUA.
- `return.overdue`: devolucion vencida.
- `return.today`: devolucion hoy.
- `return.due`: devolucion proxima.
- `risk.high`: operacion en riesgo.

Reglas actuales:
- Arribo vencido/hoy/proximo se calcula con `fechaArribo` y ventana de 3 dias.
- Camion pendiente aplica si la operacion no esta cerrada, esta al menos en `Arribo detectado` y falta `previsionCamion`.
- NCM/seguro aplica si la operacion no esta cerrada, esta al menos en `Documentacion preliminar` y falta `ncm` o `valorSeguro`.
- DUA pendiente aplica si la operacion no esta cerrada, esta al menos en `Esperando NCM/seguro` y falta `dua`.
- Devolucion vencida/hoy/proxima se calcula con `fechaDevolucion` y ventana de 3 dias.
- Riesgo aplica si `estadoOperacion = En riesgo` o `riesgo = Alto`.

## Local-first y migracion

Estado local esperado:

```json
{
  "version": 3,
  "session": {},
  "settings": {},
  "crm": [],
  "customers": [],
  "quotes": [],
  "agenda": [],
  "operations": [],
  "activityLog": []
}
```

Reglas:
- Si una coleccion no existe, se usa seed local.
- Si una coleccion existe, se normaliza y se conserva.
- No borrar datos existentes por migracion automatica.
- La importacion/restauracion JSON debe validar estructura antes de mezclar.
- Export/import debe incluir `customer`, `quote`, `task`, `activity`, `operation` y `settings` relevantes.
- Export/import local V1 usa JSON con `version`, `session`, `settings`, `crm`, `customers`, `quotes`, `agenda`, `operations` y `activityLog`.
- Import por defecto fusiona por `id`; la restauracion con reemplazo requiere confirmacion explicita en UI.

## Preparacion para API/backend

Orden recomendado de sync:
1. `customer`
2. `operation`
3. `quote`
4. `task`
5. `activity`

Motivo:
- `operation`, `quote` y `task` dependen de `customer`.
- `task` puede depender de `operation`.
- `activity` referencia a las demas entidades y debe sincronizarse al final.

Requisitos para backend futuro:
- Mantener endpoints por entidad, no un blob opaco.
- Aceptar payloads local-first con IDs existentes.
- Rechazar updates que pierdan `createdAt`.
- Devolver errores claros por entidad/campo.
- No persistir alertas como tabla principal salvo cache invalidable.
- Mantener `activityLog` auditable.
- Soportar lectura offline y reconciliacion posterior.
