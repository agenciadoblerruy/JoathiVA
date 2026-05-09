## Work In Progress - JoathiVA

## Reglas
- Reservar archivos antes de modificar
- No tocar archivos UI del flujo principal
- No revertir cambios ajenos
- Si un archivo ya está siendo usado por otro agente, no editarlo

## Cerrado

### agente desktop
- usuario: agencia.doblerruy
- rama:
- objetivo: Bloque 2 - rutas dinámicas y exportaciones Lucía
- archivos tocados:
  - tools/lucia_export/repo_paths.py
  - tools/lucia_export/build_lucia_reference_data.py
- cierre: helper de rutas dinámicas y generador de Lucía sin hardcodes activos

### agente desktop
- usuario: agencia.doblerruy
- rama:
- objetivo: limpieza de rutas en documentación técnica viva
- archivos tocados:
  - docs/SERVIDOR_LOCAL.md
  - docs/PROYECTO_JOATHIVA.md
  - docs/MANUAL_REDIRECCION_SERVIDORES.md
- cierre: docs técnicas ahora usan rutas relativas

### agente desktop
- usuario: agencia.doblerruy
- rama:
- objetivo: completar docs/functional/first-functional-flow.md
- archivos tocados:
  - docs/functional/first-functional-flow.md
- cierre: primer flujo funcional real definido según el tablero final

### agente desktop
- usuario: agencia.doblerruy
- rama:
- objetivo: segunda pasada técnica backend/auth para sostener UI
- archivos tocados:
  - server/data/joathiva-db.json
  - server/joathiva-server.ps1
- cierre: backend reconoce commercial_ops, provider tiene pantalla principal y la sesión expone contexto de permisos y navegación

### agente desktop
- usuario: agencia.doblerruy
- rama:
- objetivo: segunda pasada técnica estructural para persistencia y soporte operativo backend
- archivos tocados:
  - server/api-v1-backend.ps1
  - server/data/api-v1-store.json
- cierre: provider, documents y mail/outbox ya tienen contrato y persistencia mínima real en api-v1

### agente desktop
- usuario: agencia.doblerruy
- rama:
- objetivo: cierre técnico de exportacion comercial y outbox real
- archivos tocados:
  - server/api-v1-backend.ps1
  - server/integrations/commercial_document_export.py
- cierre: exportacion comercial con generador real en Python, outbox con apoyo IMAP y provider con subrecursos operativos básicos

## Cerrado

### agente desktop
- usuario: agencia.doblerruy
- rama:
- objetivo: Fase 2 Bloque 1 - provider operativo backend
- archivos tocados:
  - server/api-v1-backend.ps1
- cierre: provider operativo con rutas, viajes, documentos, operativa y workflow minimo de cotizacion/proveedor listo para consumo backend

## En curso

### agente desktop
- usuario: agencia.doblerruy
- rama:
- objetivo: Fase 2 Bloque 2 - documento comercial, export y outbox tecnico
- archivos reservados:
  - server/api-v1-backend.ps1
  - server/integrations/commercial_document_export.py
  - server/assistant/mailbox_draft_export.py
- estado: reserva activa para endurecer export comercial, adjuntos y flujo draft IMAP

### agente desktop
- usuario: agencia.doblerruy
- rama:
- objetivo: documentacion tecnica Fase 2 para contratos de backend consumibles por frontend
- archivos tocados:
  - docs/technical/FASE2_BACKEND_CONTRACTS.md
  - docs/README.md
- cierre: resumen tecnico de endpoints utiles, payloads minimos, forma de response y campos nuevos para consumo del frontend
