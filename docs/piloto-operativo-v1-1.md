# JoathiVA V1.1 - Piloto Operativo

Objetivo: preparar una prueba real controlada sobre la base V1 cerrada, sin reabrir arquitectura ni cambiar el contrato local-first.

Estado de base:
- V1 se considera cerrada por `docs/qa-v1.md`.
- Tag esperado de cierre: `joathiva-v1-cierre`.
- Rama objetivo informada: `feature/v1-1-piloto-operativo`.
- Alcance V1.1: validar uso operativo real, detectar fricciones y priorizar correcciones pequeñas antes de nuevas features.

Regla de trabajo:
- No cambiar arquitectura base.
- No modificar contrato de datos salvo inconsistencia critica, pequena y documentada.
- No implementar integraciones externas durante el piloto.
- No exponer credenciales ni datos sensibles en capturas, logs o reportes.

## 1. Plan de prueba visual navegador

Ambiente:
- Abrir `V/v1/index.html` en navegador desktop.
- Usar una sesion limpia cuando se necesite validar seed inicial.
- Exportar backup JSON antes de pruebas con datos reales.

Viewports minimos:
- Desktop ancho: 1440 x 900.
- Laptop: 1366 x 768.
- Tablet aproximada: 1024 x 768.
- Mobile: 390 x 844.

Recorrido visual:
1. Inicio/dashboard.
2. CRM listado.
3. Ficha de cliente.
4. Cotizador nuevo y detalle de cotizacion.
5. Agenda listado y detalle de tarea.
6. Operaciones listado.
7. Alta/edicion de operacion Paraguay.
8. Detalle de operacion con checklist, alertas y actividad.
9. Backup local export/import.

Criterios visuales:
- No hay textos cortados en botones, cards, tablas o formularios.
- El menu no tapa contenido.
- Los filtros son visibles y operables.
- Las tablas/listas son legibles sin perder acciones principales.
- Los estados `loading`, `empty`, `error` o mensajes equivalentes no se ven improvisados.
- La paleta mantiene identidad JoathiVA: corporativa, clara y premium B2B.

Registro por pantalla:
- Fecha.
- Navegador y viewport.
- Pantalla validada.
- Resultado: pasa, pasa con observacion, falla.
- Evidencia: captura o descripcion concreta.
- Friccion detectada.
- Severidad: bloqueante, alta, media, baja.

## 2. Plan de prueba Android/emulador

Ambiente:
- Proyecto: `android-app`.
- WebView local: `android-app/app/src/main/assets/www`.
- Antes de probar, confirmar sync desde `V` hacia assets Android si hubo cambios.

Comandos base:

```powershell
Set-Location E:\Joathi\JOATHIVA\android-app
.\gradlew.bat assembleDebug
.\gradlew.bat testDebugUnitTest lintDebug
```

Prueba en emulador/dispositivo:
1. Instalar APK debug.
2. Abrir la app.
3. Validar carga inicial sin pantalla en blanco.
4. Navegar: inicio, CRM, cliente, cotizador, agenda, operaciones.
5. Crear o editar una operacion de prueba.
6. Cerrar y reabrir app.
7. Confirmar persistencia en WebView.
8. Validar scroll, menu y formularios tactiles.

Criterios Android:
- No hay crash.
- WebView carga assets locales.
- Navegacion principal no tapa contenido.
- Inputs, selects y botones son tactiles y legibles.
- Persistencia local funciona al cerrar y abrir.
- No aparecen errores internos crudos al usuario.

Limitaciones aceptadas para V1.1:
- No se exige backend remoto.
- No se exige login por rol real.
- No se exige integracion Lucia.
- Si el entorno SDK/emulador falla, registrar error tecnico y no modificar codigo funcional sin diagnostico.

## 3. Flujo operativo Paraguay

Objetivo: comprobar que una operacion Paraguay se puede seguir de punta a punta con trazabilidad suficiente.

Caso piloto recomendado:
- Cliente importador/exportador real o de prueba controlada.
- Ruta Uruguay/Paraguay o Paraguay/Uruguay.
- Referencia comercial.
- Contenedor o unidad.
- DUA si existe.
- Fechas de arribo, carga y devolucion.
- Despachante UY/PY.

Secuencia:
1. Crear o seleccionar cliente.
2. Crear cotizacion asociada si aplica.
3. Crear tarea comercial u operativa asociada.
4. Crear operacion con `tipoOperacion`, `referencia`, `contenedor`, `dua`, origen/destino, fechas, estado y riesgo.
5. Completar checklist documental por etapas:
   - aviso de arribo,
   - prevision de camion,
   - factura CRT,
   - borrador CRT,
   - NCM,
   - valor seguro,
   - DUA,
   - MIC definitivo,
   - CRT definitivo.
6. Cambiar estado operativo segun avance real.
7. Revisar alertas activas.
8. Crear tarea vinculada a la operacion si hay accion pendiente.
9. Cerrar operacion cuando corresponda.
10. Confirmar que no quedan alertas activas de esa operacion cerrada.

Resultado esperado:
- La operacion mantiene `clientId/customerId`.
- `dua` y `duaNumber` se mantienen compatibles.
- El detalle muestra datos prioritarios sin ambiguedad.
- Las alertas se derivan del estado, fechas y checklist.
- La actividad deja trazabilidad suficiente para reconstruir decisiones.

## 4. Validacion CRM/cotizador/agenda/operaciones

CRM:
- Crear prospecto.
- Editar etapa.
- Abrir ficha.
- Confirmar cliente relacionado sin duplicacion.
- Confirmar actividad visible.

Cotizador:
- Crear cotizacion USD.
- Crear cotizacion UYU con tipo de cambio.
- Verificar calculo y margen.
- Asociar a cliente.
- Confirmar que no crea operacion automaticamente.

Agenda:
- Crear tarea sin operacion.
- Crear tarea vinculada a operacion.
- Cambiar estado a `Hecha`.
- Confirmar filtros y orden.
- Confirmar que la ficha de operacion muestra tarea vinculada.

Operaciones:
- Crear operacion.
- Buscar por cliente, referencia, contenedor y DUA.
- Filtrar por estado y riesgo.
- Editar sin duplicar.
- Revisar detalle, checklist, alertas y activity log.
- Cerrar y confirmar ausencia de alertas activas.

Export/import local:
- Exportar JSON.
- Confirmar colecciones esperadas.
- Importar fusionando por ID.
- Probar JSON invalido.
- Restaurar con reemplazo solo si existe backup previo y confirmacion explicita.

## 5. Bugs y fricciones a registrar

Formato obligatorio:
- ID: `V11-###`.
- Fecha.
- Ambiente: navegador, Android emulador, Android dispositivo.
- Version/rama/tag observados.
- Modulo: CRM, cotizador, agenda, operaciones, backup, Android, visual, datos.
- Pasos para reproducir.
- Resultado esperado.
- Resultado observado.
- Severidad: bloqueante, alta, media, baja.
- Impacto operativo/comercial.
- Evidencia.
- Workaround si existe.
- Estado: nuevo, confirmado, en correccion, validado, descartado.

Clasificacion:
- Bloqueante: impide operar o puede perder datos.
- Alta: rompe flujo principal o genera trazabilidad incorrecta.
- Media: friccion relevante con workaround.
- Baja: detalle visual, texto o mejora menor.

Reglas:
- No mezclar bugs con pedidos de nuevas features.
- No registrar datos sensibles completos en evidencia.
- No usar capturas con informacion comercial real sin ocultar datos.
- Si hay perdida de datos, detener piloto y preservar backup/export.

## 6. Criterios de aceptacion del piloto

El piloto V1.1 puede aceptarse si:
- Navegador desktop y mobile pasan recorrido visual minimo.
- Android compila y carga WebView local.
- Android permite navegar modulos principales sin crash.
- CRM, cotizador, agenda y operaciones completan el flujo basico.
- Operacion Paraguay se puede crear, editar, seguir, cerrar y auditar.
- Busqueda por DUA funciona en listado de operaciones.
- Export/import local funciona sin borrar datos sin confirmacion.
- Activity log cubre operaciones, cambios relevantes e import/export.
- Alertas se comportan como derivadas y desaparecen al cerrar operacion.
- No hay secretos expuestos.
- No hay bugs bloqueantes abiertos.
- Bugs altos tienen workaround aceptado o correccion planificada antes de uso real continuo.

No aceptado si:
- Hay perdida de datos.
- Android no abre la app o queda en blanco.
- No se puede crear o cerrar una operacion.
- La busqueda por DUA falla.
- Export/import puede borrar datos sin confirmacion.
- El usuario final ve errores internos crudos.

## 7. Salida esperada del piloto

Entregables:
- Lista de bugs/fricciones priorizada.
- Capturas o evidencia de pantallas criticas.
- Decision: avanzar, corregir antes de operar, o pausar.
- Recomendaciones para V1.1.1 o V1.2.

Proximos cambios recomendados:
- Crear plantilla de registro de bugs si el equipo la necesita en CSV/Markdown.
- Ejecutar prueba visual real con capturas.
- Ejecutar prueba Android en emulador y un dispositivo fisico.
- Priorizar solo correcciones bloqueantes/altas antes de nuevas features.
## Registro de incidencias del piloto

### V11-001 - Pantalla inicial vacía por error de sintaxis en app.js

- Fecha: 2026-04-30
- Ambiente: navegador desktop, `http://localhost:8080/V/v1/index.html`
- Módulo: inicio/dashboard
- Severidad: alta
- Estado: corregido
- Resultado observado: cargaba el header JoathiVA V1, pero el contenido principal quedaba vacío.
- Error detectado: `Uncaught SyntaxError: Unexpected identifier 'version'` en `V/v1/app.js:1562`.
- Causa: uso de backticks dentro de un template string en el texto de Backup local.
- Corrección: se removieron los backticks internos alrededor de `version`, `session`, `settings`, `crm`, `customers`, `quotes`, `agenda`, `operations` y `activityLog`.
- Validación:
  - `V/v1/app.js` pasa `node --check`.
  - `android-app/app/src/main/assets/www/v1/app.js` pasa `node --check`.
  - Los JS principales de fuente y Android assets pasan `node --check`.
  - `diff -qr V/v1 android-app/app/src/main/assets/www/v1` no muestra diferencias.
  - La pantalla inicial vuelve a renderizar contenido.

### V11-002 - Generalizar lenguaje operativo para no limitar JoathiVA a Paraguay

- Fecha: 2026-04-30
- Ambiente: revisión funcional/documental V1.1
- Módulo: operaciones / expedientes
- Severidad: media
- Tipo: fricción de producto / escalabilidad operativa
- Estado: corregido
- Resultado observado: parte del lenguaje del piloto y de la operación puede interpretarse como si JoathiVA estuviera limitado al flujo Paraguay o al rol "Despachante PY".
- Resultado esperado: JoathiVA debe presentar Operaciones como un módulo global de expedientes logísticos. Paraguay debe quedar como caso piloto inicial o plantilla operativa, no como límite del sistema.
- Impacto: si se mantiene lenguaje demasiado específico, puede confundir al usuario y dificultar la expansión a otros países, rutas, proveedores o despachantes.
- Decisión de producto: usar lenguaje global en UI y documentación.
- Recomendación:
  - Cambiar "Operaciones Paraguay" por "Operaciones / Expedientes".
  - Cambiar "Flujo Paraguay" por "Flujo operativo internacional, caso piloto Paraguay".
  - Cambiar "Despachante PY" por "Despachante responsable" o "Despachante destino".
  - Cambiar "Control despachante PY" por "Control documental despachante".
  - Mantener campos legacy como `despachanteUY` y `despachantePY` por compatibilidad.
  - Priorizar nuevos nombres visibles sin romper el contrato de datos.
- Criterio de cierre:
  - La UI y la documentación hablan de operaciones globales.
  - Paraguay queda nombrado solo como caso piloto inicial.
  - No se rompe compatibilidad con datos existentes.
- Validación:
  - Se reemplazaron etiquetas visibles específicas por lenguaje global.
  - Web y Android assets quedaron sincronizados.
  - `node --check` no muestra errores en `app.js` fuente ni Android.
  - `diff -qr V/v1 android-app/app/src/main/assets/www/v1` no muestra diferencias.

### V11-003 - Crear seguimientos automáticos al ejecutar acciones operativas

- Fecha: 2026-04-30
- Ambiente: revisión funcional/documental V1.1
- Módulo: operaciones / agenda / activity log
- Severidad: alta
- Tipo: mejora funcional operativa
- Estado: corregido
- Resultado observado: actualmente el usuario puede ejecutar acciones operativas, pero no siempre queda garantizado que se cree un seguimiento automático para la próxima acción necesaria.
- Resultado esperado: cuando se ejecuta una acción relevante dentro de una operación, JoathiVA debe registrar actividad automáticamente y, si corresponde, crear una tarea/seguimiento asociado a la operación.
- Regla de producto:
  - Toda acción operativa relevante debe generar `activityLog`.
  - Solo debe crearse una tarea automática cuando exista una próxima acción humana clara.
  - No deben crearse tareas duplicadas si ya existe una tarea abierta equivalente para la misma operación.
  - Toda tarea automática debe conservar `customerId` y `operationId`.
- Ejemplos:
  - Al marcar DUA recibido, crear seguimiento para revisar MIC/CRT si siguen pendientes.
  - Al detectar NCM faltante, crear seguimiento para solicitar NCM.
  - Al cambiar estado a camión pendiente, crear seguimiento para coordinar transporte/proveedor.
  - Al acercarse fecha de devolución, crear seguimiento de devolución.
  - Al cerrar una operación, no crear nuevas tareas salvo que queden pendientes explícitos.
- Impacto: reduce olvidos operativos, mejora trazabilidad y convierte JoathiVA en una herramienta activa de coordinación, no solo de registro manual.
- Criterio de cierre:
  - Las acciones principales de operación generan activity log.
  - Las acciones con próxima gestión humana crean tarea automática.
  - Las tareas automáticas aparecen en agenda y en la ficha de operación.
  - No se duplican seguimientos existentes.
- Validación:
  - Se implementaron seguimientos automáticos desde `upsertOperationRecord`.
  - Cambio de estado a `Camion pendiente` crea tarea automática de coordinación de transporte/proveedor.
  - La tarea automática aparece en Agenda.
  - Web y Android assets quedaron sincronizados.
  - `node --check` no muestra errores en `repository.local.js` fuente ni Android.
