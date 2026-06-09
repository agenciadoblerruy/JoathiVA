# Servidor Local JoathiVA

## Objetivo

Esta PC puede actuar como servidor local para que el portal JoathiVA comparta el mismo estado entre varios dispositivos de la red.

## Archivos de servidor

- Inicio: [start-server.bat](../server/start-server.bat)
- Detencion: [stop-server.bat](../server/stop-server.bat)
- Servidor HTTP: [joathiva-server.ps1](../server/joathiva-server.ps1)
- Interfaz web servida: [V](../V)
- Base central JSON: [joathiva-db.json](../server/data/joathiva-db.json)

## URLs

- Local: [http://localhost:8787](http://localhost:8787)
- Salud API: [http://localhost:8787/api/health](http://localhost:8787/api/health)
- Red local: usar la IP que el propio servidor muestra al arrancar

## Como iniciar

1. Ejecutar [start-server.bat](../server/start-server.bat)
2. Esperar la consola con las URLs disponibles
3. Abrir el portal en [http://localhost:8787](http://localhost:8787)

## Como detener

1. Ejecutar [stop-server.bat](../server/stop-server.bat)

## Deploy y rollback tecnico

1. Publicar el bundle tecnico con [tools/deploy/joathiva-deploy.ps1](../tools/deploy/joathiva-deploy.ps1)
2. Si el build falla, el snapshot previo se restaura automaticamente
3. Los snapshots quedan en `dist/deploy-snapshots/`
4. El bundle publicado escribe `dist/windows/deploy-manifest.json`
5. El sistema conserva automaticamente los 10 snapshots mas recientes
6. Para volver a una version anterior, ejecutar el mismo script con `-Action Rollback`

## Como usar desde otro movil o PC

1. Conectar el dispositivo a la misma red local
2. Tomar la IP publicada por la consola del servidor, por ejemplo `http://192.168.x.x:8787`
3. Abrir esa URL desde el navegador o configurarla dentro de la app Android

## Alcance tecnico actual

- Sincroniza el estado general del portal
- Guarda usuarios, viajes, pedidos, documentos y notificaciones
- Publica la interfaz web actual desde [V](../V)
- No reemplaza un backend productivo

## Riesgos o limites

- depende de que esta PC permanezca encendida
- no tiene base de datos relacional
- no tiene autenticacion de servidor robusta
- los snapshots de deploy son locales y no reemplazan backups externos
