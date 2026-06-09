# Política de integración - JoathiVA

## Objetivo
Integrar cambios de dos agentes Codex sin pisar archivos, sin perder trabajo y sin generar conflictos evitables.

## Agentes
- agente desktop: `agencia.doblerruy`
- agente web: `rhernand14`

## Regla principal
No integrar cambios grandes de ambos agentes al mismo tiempo.

## Flujo obligatorio de integración
1. Cerrar la tarea del agente
2. Revisar `WORK_IN_PROGRESS.md`
3. Verificar archivos reservados
4. Confirmar que no haya superposición con el otro agente
5. Integrar cambio pequeño
6. Validar funcionamiento básico
7. Actualizar `WORK_IN_PROGRESS.md`

## Antes de integrar
Verificar:
- rama origen
- objetivo de la tarea
- archivos modificados
- archivos reservados por el otro agente
- riesgos abiertos
- si hubo cambios en archivos compartidos

## Archivos compartidos peligrosos
Estos no deben integrarse a la vez desde ambos agentes:
- `V/v1/app.js`
- `V/v1/repository.local.js`
- `server/joathiva-server.ps1`
- `docs/README.md`
- cualquier archivo de configuración global

## Regla de tamaño de merge
Preferir:
- merges pequeños
- una funcionalidad por integración
- una corrección por integración

Evitar:
- merges gigantes
- “cleanup general”
- “alineación masiva”
- reformateo global en archivos compartidos

## Regla de resolución de conflictos
Si dos agentes tocaron el mismo archivo:
1. detener integración
2. revisar quién tenía reserva del archivo
3. conservar el bloque reservado
4. re-aplicar manualmente el cambio compatible del otro agente
5. documentar el conflicto resuelto

## Regla para documentación
- docs funcionales: prioridad agente web
- docs técnicas / backend: prioridad agente desktop
- docs compartidas: integrar con revisión explícita

## Regla para backend/frontend
- backend e integraciones: prioridad agente desktop
- frontend y UX: prioridad agente web
- si un cambio frontend requiere backend, integrar primero backend y luego UI

## Checklist mínima antes de cerrar merge
- [ ] tarea cerrada
- [ ] archivos revisados
- [ ] sin superposición activa
- [ ] validación básica hecha
- [ ] bitácora actualizada
- [ ] riesgos documentados

## No hacer
- no hacer merge con archivos reservados activos del otro agente
- no hacer rebase agresivo con trabajo paralelo en curso
- no reordenar carpetas compartidas sin coordinación
- no borrar trabajo del otro agente
