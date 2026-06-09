# JOATHIVA

Paquete operativo limpio de JoathiVA.

## Núcleo

- `V/`: frontend activo
- `server/`: backend local y arranque
- `docs/`: manuales y QA
- `tools/`: exportador, ETL Lucía y utilidades de seguridad
- `android-app/`: proyecto Android fuente
- `secure/`: secretos locales protegidos
- `AGENTS.md`: reglas de trabajo
- `VERSION-ACTUAL.txt`: referencia de version vigente

## Legado

- `legacy/`: pantallas y módulos secundarios que no forman parte del núcleo operativo

## Arranque

Usa `server/joathiva-server.ps1` y abre `V/index.html`.

## Ejecutables Windows

Los launchers Windows se generan en `dist/windows/` desde `tools/windows-launchers/`.
Incluyen el arranque de JoathiVA, el servidor local y las utilidades Lucía más usadas.

## Criterio de limpieza

Se excluyen logs, caches, binarios generados, backups viejos y pantallas secundarias del núcleo principal.
