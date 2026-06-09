# JoathiVA Assistant Daily Pilot

Piloto diario controlado para una sola cuenta IMAP y un folder dedicado.

El runner usa un snapshot IMAP local y luego publica los mensajes al endpoint
`/api/assistant/v1/intake/provider` del asistente ya validado.

## Objetivo

- Intake de correo
- Matching de cliente
- Clasificacion
- Creacion o actualizacion de `task`, `activity` y `operation` cuando aplique
- Generacion y exportacion de drafts cuando corresponda
- Salida auditable para revision humana diaria

## Configuracion

Archivo:

- [`daily-pilot.config.json`](./daily-pilot.config.json)

Valores clave:

- `baseUrl`: backend local del asistente
- `mailboxProfileId`: perfil IMAP autorizado
- `mailboxFolder`: folder dedicado del piloto, por defecto `INBOX.PILOTO`
- `limit`: cantidad maxima de correos a procesar en cada corrida
- `execute`: si `true`, aplica cambios; si `false`, hace preview
- `allowedCaseTypes`: casos validos para el piloto
- `pauseFile`: archivo centinela para detener el piloto

## Arranque

1. Asegura que el backend local de JoathiVA este activo.
2. Crea o usa un folder IMAP dedicado para el piloto.
3. Mueve alli solo correos/casos ya validados.
4. Ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File server\assistant\pilot\daily-pilot.ps1
```

Si el folder del piloto esta vacio, el runner termina en `completed` con `fetchedCount = 0` y deja igual el reporte diario.

## Pausa

Dos opciones:

- Cambia `enabled` a `false` en `daily-pilot.config.json`
- Crea el archivo `server/assistant/pilot/PAUSE`

## Revision diaria

Revisa estos archivos:

- `server/assistant/pilot/out/latest.json`
- `server/assistant/pilot/out/latest.md`

Chequea por item:

- `customerMatchKind`
- `customerMatchReason`
- `customerMatchConfidence`
- `classification.caseType`
- `planned.operation.action`
- `planned.task.action`
- `planned.draft.action`
- `draftFallbackMode`
- `draftProviderOk`
- `draftError`

## Seguridad operativa

- No envia correos automaticamente
- No toca UI
- No usa multiples cuentas
- No modifica heuristicas
- No rehace backend
