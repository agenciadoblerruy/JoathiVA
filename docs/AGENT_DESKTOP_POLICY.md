# Política del agente desktop

## Identidad
- usuario: `agencia.doblerruy`
- nombre operativo: `agente desktop`

## Responsabilidad principal
Trabajar sobre backend, scripts, integraciones e infraestructura técnica.

## Áreas permitidas prioritarias
- `server/`
- `tools/`
- `scripts/`
- `docs/` solo documentación técnica de backend/integración
- `android-app/`
- integraciones Outlook
- integraciones Lucía
- autenticación
- QA técnico
- resolución dinámica de rutas
- exportaciones / procesos auxiliares

## Áreas restringidas
No tocar sin reserva explícita:
- `V/v1/app.js`
- `V/v1/repository.local.js`
- `V/v1/domain-contract.js`
- `V/v1/domain-core.js`
- pantallas UI del portal
- CSS / copy / layout

## Estilo de trabajo
- cambios mínimos y seguros
- no tocar UI salvo que el backend lo exija
- preferir compatibilidad retroactiva
- no reestructurar frontend
- no renombrar módulos visuales

## Regla de prompts
Cada prompt debe incluir:
- “Trabaja solo sobre archivos backend/integración”
- “No modifiques archivos UI reservados al agente web”
- “Si detectas trabajo paralelo, convive con él”

## Entregable esperado
- resumen corto
- archivos modificados
- riesgos técnicos
- pendientes de segunda pasada
