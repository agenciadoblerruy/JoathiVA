# Deploy y rollback JoathiVA

Este directorio contiene la utilidad técnica para publicar el bundle de escritorio y recuperar una version anterior si algo falla.

## Uso

Desde la raiz del proyecto:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/deploy/joathiva-deploy.ps1 -Action Deploy
```

Por defecto conserva los 10 snapshots mas recientes.

## Rollback

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/deploy/joathiva-deploy.ps1 -Action Rollback
```

## Estado

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/deploy/joathiva-deploy.ps1 -Action Status
```

## Que hace

- crea un snapshot previo en `dist/deploy-snapshots/`
- ejecuta el bundle de `tools/windows-launchers/build-windows-exes.js`
- escribe `dist/windows/deploy-manifest.json`
- limpia snapshots viejos automaticamente, conservando los 10 mas recientes
- restaura el snapshot automaticamente si el build falla

## Launchers directos

El bundle de Windows incluye:

- `JoathiVA-Deploy.exe`
- `JoathiVA-Rollback.exe`

## Nota operativa

El rollback restaura los archivos tecnicos rastreados por el deploy y el bundle de Windows. No toca la UI web reservada al agente web.
