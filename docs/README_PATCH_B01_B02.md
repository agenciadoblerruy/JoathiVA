# PATCH B01/B02 — JoathiVA — 2026-07-05

## Estado
Patch aplicado en el clone de trabajo.
Sin commit.
Sin deploy.
Sin push.
Sin cambios en DB.
Sin cambios en APK.
Sin cambios en roots legacy protegidos.

## Motivo
Git operativo en el clone de trabajo oficial.
El patch portable B01/B02 ya existía y se copió a este repo para preparar commit controlado.

## Tareas incluidas

### B01 — Separar fetch crítico/opcional
Archivos:
- `modules/mod_common.js`
- `modules/mod_operador.js`

Cambios:
- Se agregó `apiFetchOptional()`.
- `apiFetch()` queda como camino crítico.
- `apiFetch()` dispara `jva:session-expired` ante 401.
- `apiFetchOptional()` maneja 401 localmente y no cierra el shell.
- Se pasaron a fetch opcional llamadas a:
  - `chat.php`
  - `comercial_api.php`
  - `imap_inbox.php`
  - `imap_diagnostico.php`

### B02 — Corregir CORS abierto
Archivo:
- `api/auth_unified.php`

Cambios:
- Se quitó `Access-Control-Allow-Origin: *`.
- Se usa `cors_header.php`.

## Cómo aplicar / commitear
1. Crear rama `fix/auth-fetch-cors-preprod`.
2. Revisar diff.
3. Commit 1: `fix(auth): separate critical and optional API fetch handling`
4. Commit 2: `fix(security): replace open CORS in auth_unified`
5. No deploy sin aprobación de Rodrigo.
