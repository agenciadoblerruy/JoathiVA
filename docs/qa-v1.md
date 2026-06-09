# JoathiVA V1 - QA Manual y Cierre

Objetivo: validar que JoathiVA V1 mantiene CRM, cotizador, agenda, operaciones Paraguay, checklist, alertas, persistencia local-first y Android sin regresiones.

Ambiente base:
- Web V1: `V/v1/index.html`
- Datos locales: `localStorage` key `joathiva-v1-state`
- Android: proyecto `android-app`, WebView con assets web
- Backend remoto: no requerido para V1 local-first

## Matriz de QA

### 1. Flujo completo: cliente -> cotizacion -> tarea -> operacion -> cierre operativo

Pasos:
1. Abrir JoathiVA V1.
2. Crear o seleccionar un cliente.
3. Confirmar que el cliente aparece en CRM/ficha de cliente.
4. Crear una cotizacion asociada a ese cliente.
5. Confirmar que la cotizacion aparece asociada al cliente.
6. Crear una tarea asociada al cliente.
7. Crear una operacion asociada al mismo cliente.
8. Desde la operacion, crear o vincular una tarea con `operationId`.
9. Cambiar estado de la operacion por el flujo operativo.
10. Marcar checklist documental.
11. Cerrar operacion con estado `Cerrado`.
12. Revisar activity log de cliente y operacion.

Resultado esperado:
- No se duplica el cliente.
- La cotizacion conserva `customerId`.
- La tarea conserva `customerId`.
- La tarea vinculada conserva `operationId`.
- La operacion conserva `clientId` y `customerId`.
- La ficha de cliente muestra operaciones/tareas/cotizaciones relacionadas.
- La ficha de operacion muestra tareas y actividad.
- Al cerrar, desaparecen alertas activas de esa operacion.

### 2. Persistencia al recargar navegador

Pasos:
1. Crear cliente, tarea y operacion de prueba.
2. Editar checklist y estado de la operacion.
3. Recargar navegador.
4. Volver a CRM, agenda y operaciones.

Resultado esperado:
- Los datos siguen visibles.
- Checklist conserva booleanos.
- Filtros siguen operando sobre datos persistidos.
- No vuelve a seed original sobrescribiendo datos reales.

### 3. Operaciones: alta, edicion, detalle y filtros

Pasos:
1. Crear operacion con cliente, referencia, contenedor, origen, destino, fechas, estado y riesgo.
2. Buscar por cliente.
3. Buscar por referencia.
4. Buscar por contenedor.
5. Buscar por DUA usando el campo dedicado de operacion.
6. Filtrar por estado.
7. Filtrar por riesgo.
8. Abrir detalle.
9. Editar operacion.

Resultado esperado:
- El listado se actualiza.
- El detalle muestra cliente, referencia, contenedor, estado, riesgo y fechas.
- La edicion no crea duplicados.
- Los filtros por estado/riesgo no rompen busqueda textual.

Estado esperado:
- `operation.dua` queda normalizado como campo dedicado y `operation.duaNumber` como alias compatible.
- El formulario, detalle, listado y busqueda de operaciones muestran o consideran DUA.

### 4. Checklist documental

Pasos:
1. Abrir ficha de operacion.
2. Editar checklist desde formulario de operacion.
3. Marcar y desmarcar: aviso de arribo, camion, factura CRT, borrador CRT, NCM, seguro, DUA, MIC/CRT definitivo.
4. Guardar.
5. Reabrir detalle.

Resultado esperado:
- Cada item persiste como booleano en `documentChecklist`.
- El progreso se recalcula.
- Activity log registra cambios relevantes si la UI lo dispara.
- Las alertas cambian segun checklist y estado.

### 5. Alertas operativas

Casos minimos:
- Arribo proximo: `fechaArribo` dentro de 3 dias y operacion no cerrada.
- Arribo hoy: `fechaArribo` igual a fecha actual.
- Arribo vencido: `fechaArribo` anterior a hoy.
- Falta camion: estado al menos `Arribo detectado` y `previsionCamion = false`.
- Falta NCM/seguro: estado al menos `Documentacion preliminar` y falta `ncm` o `valorSeguro`.
- Falta DUA: estado al menos `Esperando NCM/seguro` y `dua = false`.
- Devolucion proxima/hoy/vencida: `fechaDevolucion` segun ventana de 3 dias.
- Operacion en riesgo: `estadoOperacion = En riesgo` o `riesgo = Alto`.

Resultado esperado:
- Dashboard muestra conteo de alertas.
- Ficha de operacion muestra alertas propias.
- Operaciones cerradas no generan alertas activas.
- Las alertas son derivadas; no quedan registros persistidos como fuente de verdad.

Smoke test local:
1. Ejecutar `tools/lucia_export/lucia_alerts_smoke.mjs` con el runtime bundleado de Node.
2. Confirmar que valida los casos `arrival.due`, `truck.missing`, `docs.ncm-insurance`, `docs.dua` y operacion cerrada sin alertas.

Resultado esperado:
- El smoke retorna `ok: true`.
- Cada caso produce solo las alertas esperadas.
- Una operacion en estado `Cerrado` no produce alertas activas aunque tenga riesgo alto o checklist incompleto.

Cierre estandar de QA Lucía:
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\Joathi\JOATHIVA\tools\lucia_export\lucia_qa_smoke.ps1"
```

Resultado esperado:
- el import de exportacion publica responde OK
- el smoke de alertas responde OK
- la salida final termina en `ok: true`

### 6. Activity log

Pasos:
1. Crear operacion.
2. Editar datos principales.
3. Cambiar estado.
4. Actualizar checklist.
5. Vincular tarea.
6. Cerrar operacion.
7. Revisar ficha de cliente y ficha de operacion.

Resultado esperado:
- Se ven eventos con titulo, detalle, fecha y entidad relacionada.
- Las actividades de operacion aparecen en la operacion.
- Las actividades de cliente aparecen en cliente.
- No se pierde historial al recargar.

Smoke test local:
1. Ejecutar `tools/lucia_export/lucia_activity_smoke.mjs` con el runtime bundleado de Node.
2. Confirmar que el log normalizado conserva 2 eventos sintéticos.
3. Confirmar que el feed de cliente devuelve actividad consolidada.
4. Confirmar que el feed de operacion devuelve solo el evento vinculado a la operacion.

Resultado esperado:
- El smoke retorna `ok: true`.
- `records: 2`.
- `customerFeed` incluye el evento CRM y el evento de operacion.
- `operationFeed: 1`.

### 7. Centro Lucía y ETL operativo

Pasos:
1. Regenerar el indice de busqueda con `python3 tools/lucia_export/build_lucia_smart_search_data.py`.
2. Regenerar el dataset operativo con `python3 tools/lucia_export/build_lucia_operational_dataset.py`.
3. Abrir el panel Lucía en JoathiVA y validar busqueda global, filtros por tabla y favoritos.
4. Confirmar que el panel maestro muestra cumplimiento aduanero y faltantes documentales.

Resultado esperado:
- `version-24/V/lucia-smart-search-data.js` contiene un indice de referencias.
- `version-24/V/lucia-operational-data.js` contiene el dataset operacional normalizado.
- El panel Lucía responde a busquedas de texto, tabla y favoritos.
- El panel maestro muestra riesgos y faltantes de forma ejecutiva.

Smoke test operativo:
1. Ejecutar `python3 tools/lucia_export/lucia_operational_smoke.py`.
2. Confirmar que el dataset operativo existe y expone itemCount, FTP y CKAN.
3. Confirmar que `tools/lucia_export/data/lucia_operational_runs.json` guarda la corrida mas reciente.

Resultado esperado:
- `ok: true`.
- `itemCount` mayor que cero.

### 7. Export/import local

Prueba:
1. Exportar JSON local.
2. Confirmar que incluye `version`, `session`, `settings`, `crm`, `customers`, `quotes`, `agenda`, `operations` y `activityLog`.
3. Importar el JSON fusionando por ID.
4. Restaurar el JSON con reemplazo solo tras confirmacion explicita.
5. Validar que no borra datos existentes sin control.
6. Validar errores con JSON invalido.

Resultado esperado:
- Export descarga archivo `.json`.
- Import fusiona registros por `id` y mantiene compatibilidad `joathiva-v1-state`.
- Restauracion con reemplazo exige checkbox y confirmacion del navegador.
- Export/import registra actividad tecnica en `activityLog`.

### 8. No regresion CRM

Pasos:
1. Listar CRM.
2. Crear prospecto.
3. Editar etapa.
4. Abrir ficha.
5. Confirmar actividad reciente.

Resultado esperado:
- CRM sigue navegable.
- No se rompe relacion con customer.
- No se duplican clientes al sincronizar desde CRM.

### 9. No regresion cotizador

Pasos:
1. Crear cotizacion con USD.
2. Crear cotizacion con UYU y tipo de cambio.
3. Revisar calculos.
4. Asociar cliente.

Resultado esperado:
- Calculo se mantiene.
- `calculation` es coherente con inputs.
- La cotizacion aparece en ficha de cliente.

### 10. No regresion agenda

Pasos:
1. Crear tarea sin operacion.
2. Crear tarea con operacion.
3. Cambiar estado a `Hecha`.
4. Filtrar agenda.

Resultado esperado:
- Tareas sin `operationId` siguen funcionando.
- Tareas con `operationId` muestran referencia de operacion.
- Agenda conserva prioridad, fecha y estado.

### 11. Android

Pasos:
1. Sincronizar assets web a Android si hubo cambios en `V/v1`.
2. Abrir `android-app` en Android Studio o ejecutar build Gradle.
3. Instalar en emulador/dispositivo.
4. Validar navegacion: inicio, CRM, cotizador, agenda, operaciones, cliente.
5. Validar que el menu no tape contenido al hacer scroll.
6. Validar persistencia al cerrar y abrir app.

Resultado esperado:
- La app compila.
- WebView carga assets locales.
- No hay crash al navegar.
- Datos locales persisten en el WebView.

Notas:
- En esta Fase 5 no se modifican assets web ni Android.
- Si Android falla por SDK/local environment, documentar el error y no tocar codigo funcional.

### 12. Relacionamiento proveedor/despachante/cliente por operacion

Pasos:
1. Crear o identificar un proveedor A.
2. Crear o identificar un despachante A.
3. Crear cliente A y cliente B.
4. Crear operacion 1 con cliente A, proveedor A y despachante A.
5. Crear operacion 2 con cliente B, proveedor A y despachante A.
6. Crear operacion 3 con cliente A, otro proveedor y otro despachante.
7. Ingresar con perfil proveedor A.
8. Ingresar con perfil despachante A.

Resultado esperado:
- Proveedor A ve operaciones 1 y 2.
- Proveedor A no ve operacion 3.
- Despachante A ve operaciones 1 y 2.
- Despachante A no ve operacion 3.
- Cliente A puede tener operaciones con distintos proveedor/despachante.
- La visibilidad se calcula por operacion, no por asignacion global fija del cliente.

### 13. Lucía: exportacion publica e importacion local

Prueba:
1. Generar un export demo o una exportacion local valida en `tools/lucia_export/data/lucia_public_export`.
2. Ejecutar el smoke test `tools/lucia_export/lucia_import_smoke.ps1`.
3. Confirmar que el servidor local responde en `/api/health`.
4. Confirmar que `GET /api/lucia/import` devuelve estado persistido.
5. Abrir Maestro y verificar que el bloque Lucía muestra origen, fecha y contadores.

Resultado esperado:
- El exportador genera una carpeta con `manifests`.
- La importacion local responde `ok = true`.
- El estado persiste en `server/data/lucia-imports.json`.
- La UI muestra el estado actual sin exponer credenciales.

Limitacion actual:
- La UI V1 sigue mostrando principalmente texto legacy (`quote.proveedor`, `operation.despachanteUY`, `operation.despachantePY`).
- El modelo ya normaliza `operation.providerId` y `operation.brokerId`, pero no implementa permisos complejos por perfil.

### 13. Dashboard proveedor

Indicadores a validar para perfil proveedor:
- Cantidad de operaciones abiertas vinculadas a su proveedor.
- Ubicacion o estado actual de su flota.
- Fecha de finalizacion de la proxima operacion.
- Fecha de disponibilidad de flota.
- Documentacion visible por operacion.
- Contacto responsable de cada operacion.

Resultado esperado:
- Los indicadores solo usan operaciones relacionadas al proveedor logueado.
- No aparecen operaciones de otros proveedores.
- El contacto responsable es visible y accionable.
- La documentacion mostrada pertenece a la operacion correcta.

Limitacion actual:
- Si no existen campos de flota (`fleetLocation`, `fleetStatus`, `fleetAvailableAt`) el indicador debe mostrarse como pendiente/sin dato, no inventarse.

## Comandos de verificacion recomendados

Web/static JS:

```bash
node --check V/v1/domain-contract.js
node --check V/v1/domain-core.js
node --check V/v1/repository.local.js
node --check V/v1/adapter.api.js
node --check V/v1/core.js
node --check V/v1/app.js
```

Android:

```powershell
Set-Location E:\Joathi\JOATHIVA\android-app
.\gradlew.bat assembleDebug
```

Busqueda de scripts/test disponibles:

```bash
find . -maxdepth 3 -name package.json -print
find android-app -maxdepth 2 -name "gradlew*" -print
```

## Verificacion ejecutada en esta fase

Fecha de ejecucion: 2026-04-30.

Comandos ejecutados:

```bash
cmd.exe /c node --version
cmd.exe /c node --check V\\v1\\domain-contract.js
cmd.exe /c node --check V\\v1\\domain-core.js
cmd.exe /c node --check V\\v1\\repository.local.js
cmd.exe /c node --check V\\v1\\adapter.api.js
cmd.exe /c node --check V\\v1\\core.js
cmd.exe /c node --check V\\v1\\app.js
```

Resultado:
- Node Windows disponible: `v24.15.0`.
- Checks sintacticos JS sin errores.
- Node no estaba disponible desde bash/WSL (`node: command not found`), por eso se ejecuto via `cmd.exe`.

Verificacion adicional de cierre de brechas:

```bash
cmd.exe /c node --check V\\v1\\domain-contract.js
cmd.exe /c node --check V\\v1\\domain-core.js
cmd.exe /c node --check V\\v1\\repository.local.js
cmd.exe /c node --check V\\v1\\adapter.api.js
cmd.exe /c node --check V\\v1\\core.js
cmd.exe /c node --check V\\v1\\app.js
cmd.exe /c node --check android-app\\app\\src\\main\\assets\\www\\v1\\domain-contract.js
cmd.exe /c node --check android-app\\app\\src\\main\\assets\\www\\v1\\domain-core.js
cmd.exe /c node --check android-app\\app\\src\\main\\assets\\www\\v1\\repository.local.js
cmd.exe /c node --check android-app\\app\\src\\main\\assets\\www\\v1\\adapter.api.js
cmd.exe /c node --check android-app\\app\\src\\main\\assets\\www\\v1\\core.js
cmd.exe /c node --check android-app\\app\\src\\main\\assets\\www\\v1\\app.js
```

Resultado:
- Checks sintacticos JS de V1 fuente y bundle Android sin errores.

Comandos Android:

```powershell
Set-Location E:\Joathi\JOATHIVA\android-app
.\gradlew.bat assembleDebug
.\gradlew.bat testDebugUnitTest lintDebug
```

Resultado:
- `tools\sync-web-to-android-assets.ps1`: sincronizacion web -> Android completada.
- `assembleDebug`: `BUILD SUCCESSFUL`.
- `testDebugUnitTest`: `NO-SOURCE`, no hay tests unitarios Android definidos.
- `lintDebug`: `BUILD SUCCESSFUL`.
- Reporte lint generado en `E:\Joathi\JOATHIVA\android-app\app\build\reports\lint-results-debug.html`.

Warnings observados:
- Varias opciones Android Gradle estan deprecadas y se removeran en AGP 10.0.
- No bloquean V1, pero conviene limpiarlas antes de actualizar Android Gradle Plugin.

## Criterio de cierre V1

V1 puede considerarse cerrada si:
- CRM, cotizador y agenda no presentan regresiones.
- Operaciones Paraguay permite alta, edicion, detalle, filtros y checklist.
- Cliente, tarea y operacion quedan vinculados por IDs.
- Activity log deja trazabilidad suficiente.
- Alertas se calculan localmente y no duplican datos.
- Export/import queda implementado o explicitamente marcado como pendiente antes de uso real.
- Android compila y carga la misma V1.

## Limitaciones conocidas

- No hay backend remoto obligatorio en V1.
- No hay integracion real con Sistema Lucia.
- No se debe asumir Gmail ni proveedores externos.
- `activityLog` local esta limitado por la implementacion visible para UI.
- Los permisos completos por proveedor/despachante quedan fuera de V1; el modelo queda preparado con IDs por operacion.
