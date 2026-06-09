# Auth Middleware Closeout

## Resumen ejecutivo

Fase 5 agrega una capa incremental de autenticacion para endpoints sensibles del portal JoathiVA, manteniendo el contrato actual de `sessionToken` en el body y el almacenamiento en memoria con `$script:PortalSessions`.

## Alcance implementado

- `Write-AuthErrorResponse` centraliza respuestas JSON de autenticacion con `{ ok: false, error }`.
- `Assert-PortalAuthenticatedUser` valida el usuario del portal mediante `Get-PortalUserFromRequestBody`.
- `Assert-PortalRole` valida roles permitidos sin duplicar reglas en cada endpoint.
- `/api/tools/profiles` exige usuario autenticado.
- `/api/openai/settings` exige rol `master`.
- `/api/openai/respond` exige rol `master`.
- `/api/portal/session` emite `sessionToken` de servidor mediante `New-PortalSession`.
- `tools/qa/check-auth-middleware-boundary.sh` verifica helpers, limite de middleware y endpoints migrados.
- `tools/qa/run-core-smoke.sh` ejecuta el boundary check.
- `V/portal.js` solicita sesion al servidor durante login cuando hay backend configurado.
- `V/portal.js` y `V/growth-lab.js` envian `sessionToken` en los endpoints protegidos.

## Contrato conservado

- El token de sesion viaja en `body.sessionToken`.
- Las sesiones viven en `$script:PortalSessions`.
- No se introduce `Authorization: Bearer` para autenticacion del portal.
- No se usa `$Global:SessionStore`.
- No se toca `secure/auth-users.local.json`.

## Compatibilidad operativa

`Get-PortalUserFromRequestBody` autentica por `body.sessionToken`. No acepta `username/password` como autenticacion principal para los endpoints migrados.

`/api/portal/session` usa credenciales solo para emitir una sesion inicial del servidor. Los endpoints protegidos siguen autenticando exclusivamente por `body.sessionToken`.

## Cierre incremental Fase 5

El cierre incremental queda limitado a la capa de middleware del servidor PowerShell:

- Los helpers de sesion existen y mantienen sesiones en `$script:PortalSessions`.
- Los helpers de autenticacion/autorizacion devuelven respuestas consistentes.
- Los endpoints protegidos no autentican directo contra credenciales.
- `/api/openai/settings` y `/api/openai/respond` exigen rol `master`.
- El login puede persistir el `sessionToken` emitido por `/api/portal/session`.
- El smoke valida emision de sesion, envio de `sessionToken` a endpoints migrados y que el frontend no use `user.password`.

## Riesgos y seguimiento

- Las sesiones son en memoria: se pierden al reiniciar el servidor local.
- El login conserva fallback local si no hay URL de servidor configurada o si el servidor no esta disponible.
- Google Sign-In y registros locales nuevos siguen sin sesion de servidor hasta que exista alta/sincronizacion server-side.
- Si una pantalla llama endpoints migrados sin un `sessionToken` emitido por servidor, recibira 401.
- Los endpoints OpenAI siguen protegidos por rol `master`; la API key permanece del lado servidor.

## Validacion esperada

```bash
node --check V/portal.js
node --check V/growth-lab.js
bash tools/qa/run-core-smoke.sh
git status --short
```
