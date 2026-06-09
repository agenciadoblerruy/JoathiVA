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
- objetivo: paquete descargable de imagenes corporativas habilitadas para uso
- archivos tocados:
  - dist/brand-assets/JoathiVA_Corporate_Assets/README.md
  - dist/brand-assets/JoathiVA_Corporate_Assets/manifest.json
  - dist/brand-assets/JoathiVA_Corporate_Assets.zip
- cierre: bundle de activos oficiales de marca listo para descargar

### agente desktop
- usuario: agencia.doblerruy
- rama:
- objetivo: validacion tecnica de publicacion desktop, QA base y bundle Windows
- archivos tocados:
  - dist/windows/JoathiVA.exe
  - dist/windows/JoathiVA-Server.exe
  - dist/windows/JoathiVA-StopServer.exe
  - dist/windows/JoathiVA-ServerConsole.exe
  - dist/windows/JoathiVA-MktJoathi.exe
  - dist/windows/LuciaExportPublicData.exe
  - dist/windows/LuciaBuildSmartSearch.exe
  - dist/windows/LuciaBuildReference.exe
  - dist/windows/LuciaBuildOperational.exe
  - dist/windows/LuciaCreateDemo.exe
  - dist/windows/LuciaZCGenerator.exe
  - dist/windows/README_USO.md
- cierre: core smoke PASS y bundle de launchers Windows generado con exito

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
- objetivo: segunda pasada tecnica de deploy, snapshot y rollback
- archivos tocados:
  - dist/windows/JoathiVA-Deploy.exe
  - dist/windows/JoathiVA-Rollback.exe
  - tools/deploy/joathiva-deploy.ps1
  - tools/deploy/README.md
  - docs/SERVIDOR_LOCAL.md
  - tools/windows-launchers/build-windows-exes.js
  - tools/windows-launchers/joathiva-launcher.js
  - tools/windows-launchers/README.md
  - docs/governance/WORK_IN_PROGRESS.md
- cierre: deploy tecnico con snapshot previo, rollback local, retencion automatica y launchers directos de publicacion

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

### agente desktop
- usuario: agencia.doblerruy
- rama:
- objetivo: formalizacion ejecutiva de la acta final de cierre Fase 2
- archivos tocados:
  - docs/functional/JOATHIVA_ACTA_FINAL_CIERRE_FASE_2.md
- cierre: acta de Fase 2 formalizada con fecha, resumen ejecutivo y responsables
