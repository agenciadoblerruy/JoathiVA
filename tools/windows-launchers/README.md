# Windows launchers JoathiVA

Este directorio genera ejecutables Windows para abrir JoathiVA y lanzar las utilidades locales disponibles.

## Salida

Los binarios se generan en:

`dist/windows/`

## Ejecutables generados

- `JoathiVA.exe`
- `JoathiVA-Server.exe`
- `JoathiVA-StopServer.exe`
- `JoathiVA-ServerConsole.exe`
- `JoathiVA-MktJoathi.exe`
- `JoathiVA-Deploy.exe`
- `JoathiVA-Rollback.exe`
- `LuciaExportPublicData.exe`
- `LuciaBuildSmartSearch.exe`
- `LuciaBuildReference.exe`
- `LuciaBuildOperational.exe`
- `LuciaCreateDemo.exe`
- `LuciaZCGenerator.exe`, se copia desde `tools/lucia_export/LuciaZCGenerator.exe`

## Build

Desde `tools/windows-launchers/`:

```bash
node build-windows-exes.js
```

## Notas

- `JoathiVA.exe` abre el portal principal y levanta el servidor local si hace falta.
- Los launchers de Lucía reutilizan scripts existentes de Python o PowerShell.
- `LuciaZCGenerator.exe` ya existía y se conserva como binario separado.
