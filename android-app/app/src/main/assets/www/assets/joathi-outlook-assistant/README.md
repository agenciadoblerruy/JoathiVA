# Joathi Outlook Assistant

Asistente Operativo Joathi para ordenar correos de Outlook/Microsoft 365.

La primera version es segura por defecto: clasifica correos, genera `EmailRecord`, sugiere tareas, prepara borradores y deja archivos visibles para revision. No envia respuestas automaticas y no modifica Outlook salvo que ejecutes explicitamente `-ApplyToOutlook`.

## Que hace

- Lee correos desde archivos exportados (`.eml`, `.txt`, `.json`) o desde Microsoft Graph.
- Normaliza cada mensaje a `EmailRecord`.
- Clasifica correos como:
  - responder
  - seguimiento
  - cotizacion
  - tarea
  - documento
  - urgente
  - pago
- Genera:
  - `output/email_records.json`
  - `output/classified_messages.json`
  - `output/tasks_suggested.csv`
  - `output/drafts_suggested.md`
  - `output/summary.md`
- Puede aplicar categorias en Outlook cuando se usa Microsoft Graph y `-ApplyToOutlook`.

## Requisitos

- Windows PowerShell o PowerShell 7.
- Node.js 18 o superior.
- Para modo Outlook real: modulo Microsoft Graph PowerShell.

Instalacion opcional de Microsoft Graph:

```powershell
Install-Module Microsoft.Graph -Scope CurrentUser -Force -AllowClobber
```

## Uso rapido con correos exportados

1. Copiar correos `.eml`, `.txt` o `.json` en:

```text
input/emails
```

2. Ejecutar:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\03_run_mail_assistant.ps1 -Mode files -Limit 25
```

3. Revisar:

```text
output/summary.md
output/tasks_suggested.csv
output/drafts_suggested.md
output/classified_messages.json
```

## Uso con Outlook/Microsoft 365 real

Dry-run, sin modificar Outlook:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\03_run_mail_assistant.ps1 -Mode graph -Limit 25
```

La primera ejecucion pedira login de Microsoft y consentimiento para leer/escribir correo mediante Microsoft Graph.

Aplicar categorias en Outlook:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\03_run_mail_assistant.ps1 -Mode graph -Limit 25 -ApplyToOutlook
```

Categorias creadas/aplicadas:

- `Joathi - Responder`
- `Joathi - Seguimiento`
- `Joathi - Cotizacion`
- `Joathi - Tarea`
- `Joathi - Documento`
- `Joathi - Urgente`
- `Joathi - Pago`

## Ejecutar ejemplo incluido

```powershell
node .\src\joathi-mail-assistant.js --mode files --input .\samples --output .\output --limit 10
```

O con npm:

```bash
npm run run:sample
```

## Configuracion local

Copiar:

```text
config/assistant.local.env.example
```

a:

```text
config/assistant.local.env
```

No subir `assistant.local.env` si contiene datos privados.

## Seguridad

- No guardar passwords, tokens ni secretos en el repo.
- No envia autorrespuestas.
- No mueve ni borra correos.
- `-ApplyToOutlook` solo aplica categorias a mensajes clasificados.
- El modo `files` permite validar la logica antes de tocar Outlook real.

## Proximo paso tecnico

Para integrar con JoathiVA V1 se debe consumir `output/classified_messages.json` y mapear:

- `joathiva.activity` hacia el feed de actividad.
- `joathiva.task` hacia agenda/tareas.
- `operationRefs` hacia operaciones/expedientes cuando exista `operationId`, DUA, booking o contenedor.


## Vista Outlook configurada

Esta version esta configurada para la estructura actual:

```text
HUBSPOT+JOATHIVA+WEB+OUTLOOK
├─ 00_PENDIENTE_TRIAGE
├─ 02_CLIENTES
│  └─ Cliente - ULG Logistics
├─ 03_OPERACIONES
│  └─ 01_ABIERTAS
├─ 04_COMERCIAL
│  ├─ 01_COTIZACIONES_NUEVAS
│  └─ 02_EN_SEGUIMIENTO
├─ 05_DOCUMENTACION
│  ├─ 01_DUA
│  ├─ 02_CRT_MIC
│  └─ 03_FACTURAS
├─ 06_PROVEEDORES_Y_DESPACHANTES
├─ 07_INTERNO_JOATHI
└─ 08_PENDIENTES_CRITICOS
```

Primero ejecutar siempre en simulacion:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\03_run_mail_assistant.ps1 -Mode graph -Folder Inbox -Limit 10
```

Revisar:

```text
output\folder_moves_suggested.csv
output\summary.md
output\classified_messages.json
```

Para aplicar categorias sin mover:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\03_run_mail_assistant.ps1 -Mode graph -Folder Inbox -Limit 10 -ApplyToOutlook
```

Para aplicar categorias y mover a carpetas:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\03_run_mail_assistant.ps1 -Mode graph -Folder Inbox -Limit 10 -ApplyToOutlook -ApplyMoves
```

El asistente no elimina correos y no envia respuestas automaticas. `-ApplyMoves` usa la salida revisada por el motor y mueve cada mensaje a la carpeta sugerida.
