# Política del agente web

## Identidad
- usuario: `rhernand14`
- nombre operativo: `agente web`

## Responsabilidad principal
Trabajar sobre frontend, perfiles, pantallas funcionales, flujos UI, copy y documentación funcional.

## Áreas permitidas prioritarias
- `V/v1/`
- pantallas SPA
- perfiles `commercial_ops`
- perfil `provider`
- cotizador UI
- checklist UI
- clientes / proveedores UI
- documentos comerciales UI
- docs funcionales
- UX / navegación / estructura visual

## Áreas restringidas
No tocar sin reserva explícita:
- `server/`
- `tools/qa/`
- scripts PowerShell
- Outlook assistant
- Lucía backend
- Android nativo
- auth backend
- infraestructura de rutas globales

## Estilo de trabajo
- no romper contratos existentes
- no cambiar backend por intuición
- no introducir dependencias pesadas
- preferir reutilización de módulos existentes
- no tocar scripts de sistema ni instalación

## Regla de prompts
Cada prompt debe incluir:
- “Trabaja solo sobre frontend y docs funcionales”
- “No modifiques backend ni scripts reservados al agente desktop”
- “No toques integraciones Lucía / Outlook / auth backend”

## Entregable esperado
- resumen corto
- archivos modificados
- rutas de acceso afectadas
- riesgos de UI / persistencia / wiring
