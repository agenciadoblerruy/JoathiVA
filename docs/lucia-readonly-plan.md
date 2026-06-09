# Plan Futuro - Integracion Lucia Read-only por DUA

Objetivo: consultar informacion del Sistema Lucia por DUA para enriquecer una operacion JoathiVA sin escribir ni modificar datos en Lucia.

Estado: plan tecnico futuro. No asume endpoints, credenciales ni permisos reales.

## Alcance

Incluido:
- Consultar por DUA.
- Vincular la respuesta a una `operation`.
- Registrar `activityLog`.
- Disparar tareas internas si falta documentacion o seguimiento.
- Actualizar checklist documental local cuando corresponda.
- Auditar accesos.

Excluido:
- Escribir en Lucia.
- Automatizar cambios en Lucia.
- Guardar credenciales en codigo.
- Asumir endpoints no confirmados.
- Saltar autenticacion oficial.

## Flujo propuesto

1. Usuario abre una operacion en JoathiVA.
2. Usuario carga o confirma DUA en la operacion.
3. JoathiVA ejecuta una consulta read-only autorizada.
4. Se normaliza la respuesta a un objeto local.
5. Se vincula la consulta con `operation.id`.
6. Se actualiza vista de operacion con datos derivados.
7. Se registra actividad.
8. Si hay faltantes, se crean tareas internas.
9. Si hay documentos confirmados, se actualiza checklist local.

## Modelo local sugerido

Entidad futura o bloque embebido:

```json
{
  "id": "lucia_xxx",
  "operationId": "op_xxx",
  "dua": "776201",
  "queriedAt": "2026-04-30T12:00:00.000Z",
  "queriedBy": "user_xxx",
  "status": "success",
  "source": "lucia-readonly",
  "payloadSummary": {
    "estado": "string",
    "canal": "string",
    "manifiesto": "string",
    "stock": "string"
  },
  "rawPayloadRef": null
}
```

Reglas:
- No guardar capturas o payloads sensibles completos si no son necesarios.
- Guardar resumen operativo y referencia auditable.
- Si se guarda payload completo, debe estar protegido y versionado.

## Vinculo con operation

Campos recomendados para una fase posterior:
- `operation.dua`: numero DUA normalizado.
- `operation.luciaLastQueryAt`: ultima consulta exitosa.
- `operation.luciaStatus`: estado resumido.
- `operation.luciaSummary`: resumen no sensible.

Compatibilidad:
- V1 usa `operation.dua` como campo dedicado y mantiene `operation.duaNumber` como alias compatible.
- Si existen registros viejos con DUA en `referencia` u `observaciones`, migrar sin borrar esos campos.
- Mantener `operation.id`, `clientId/customerId` y checklist existentes.

## Activity log

Crear actividad por cada consulta:
- `type`: `lucia.query`
- `label`: `Lucia`
- `tone`: `info`, `success`, `warning` o `danger`
- `title`: `Consulta Lucia por DUA`
- `details`: resumen corto con DUA, resultado y fecha
- `operationId`: operacion consultada
- `entityKind`: `operation`
- `entityId`: `operation.id`
- `source`: `lucia-readonly`
- `metadata`: datos tecnicos no sensibles

Regla:
- Registrar tambien errores de consulta como actividad si impactan seguimiento operativo.

## Tareas disparadas

Crear tareas solo si hay una accion humana clara:
- Falta DUA confirmado.
- Falta MIC/CRT definitivo.
- Falta documentacion de stock/manifiesto.
- Hay diferencia entre estado local y estado Lucia.
- Hay vencimiento o demora detectada.

Campos:
- `task.customerId`: cliente de la operacion.
- `task.operationId`: operacion consultada.
- `task.tarea`: accion concreta.
- `task.prioridad`: segun severidad.
- `task.fechaCompromiso`: fecha interna de seguimiento.

Regla:
- No crear tareas duplicadas si ya existe una tarea abierta equivalente para la misma operacion.

## Checklist

Actualizacion local posible:
- Si Lucia confirma DUA, marcar `documentChecklist.dua = true`.
- Si la informacion confirma MIC definitivo, marcar `micDefinitivo = true`.
- Si la informacion confirma CRT definitivo, marcar `crtDefinitivo = true`.
- Si solo hay evidencia parcial, registrar actividad y dejar checklist pendiente.

Regla:
- La actualizacion de checklist debe ser trazable con actividad.
- Si el resultado no es concluyente, no marcar completado automaticamente.

## Auditoria y seguridad

Auditar:
- Usuario que consulta.
- Fecha/hora.
- DUA consultado.
- Operacion vinculada.
- Resultado tecnico.
- Cambios locales derivados.

Guardrails:
- No escribir en Lucia.
- No enviar correos automaticamente.
- No guardar credenciales en repo.
- No exponer DUA o datos sensibles en logs innecesarios.
- No consultar masivamente sin motivo operativo.
- Respetar permisos por perfil JoathiVA.

## Integracion tecnica futura

Opciones posibles:
- Adapter read-only en backend local.
- Worker asistido que usa sesion autenticada del usuario.
- Conector oficial si existe endpoint autorizado.

Ruta operativa recomendada hoy:
- abrir el menu oficial de Lucia desde JoathiVA,
- autenticar la sesion en la PC local con el usuario habilitado,
- mantener las consultas de referencia y la trazabilidad dentro de JoathiVA,
- evitar copiar credenciales al frontend o a logs.

Si se requiere persistencia local de acceso, el lugar correcto es el servidor de esta PC con almacen protegido por DPAPI, nunca el navegador ni un archivo compartido en texto plano.

Contrato recomendado:

```http
GET /api/v1/lucia/dua/{dua}
```

Respuesta normalizada esperada:

```json
{
  "dua": "776201",
  "status": "success",
  "queriedAt": "2026-04-30T12:00:00.000Z",
  "summary": {},
  "warnings": []
}
```

Nota:
- Este endpoint es ilustrativo. No debe implementarse contra Lucia real sin confirmar mecanismo oficial, permisos y credenciales.

## Errores esperados

- DUA invalido.
- DUA no encontrado.
- Sesion expirada.
- Sin permisos.
- Timeout.
- Respuesta incompleta.
- Diferencia entre datos Lucia y datos locales.

Manejo:
- Mostrar error claro.
- Registrar actividad con `tone=warning` o `danger`.
- No modificar checklist ante error.
- Crear tarea solo si requiere accion humana.

## Criterio de cierre para esta integracion

La integracion read-only puede pasar a piloto si:
- Consulta por DUA con usuario autorizado.
- No escribe en Lucia.
- Vincula resultado a `operation`.
- Crea activity log.
- Actualiza checklist solo con evidencia suficiente.
- Crea tareas sin duplicar.
- Tiene auditoria basica.
- No rompe local-first ni Android.
