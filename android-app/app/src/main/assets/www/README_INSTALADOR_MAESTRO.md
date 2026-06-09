# Instalador maestro JoathiVA | Cotizador real + HubSpot

## Qué hace
Este instalador:
1. valida la raíz del proyecto
2. valida `.env.hubspot`
3. copia el builder del payload a `V/`
4. copia el bridge local a la raíz del proyecto
5. inserta el script en `V/index.html` si falta
6. inicia el bridge local en puerto `8791`
7. abre el portal

## Archivos incluidos
- `20_instalador_maestro_joathiva.ps1`
- `20_instalador_maestro_joathiva.bat`
- `15_joathiva_quote_payload_builder.js`
- `16_hubspot_bridge_server.py`

## Requisitos
- Proyecto en `~/proyectos/joathiva` o ajustar `ProjectRoot`
- `.env.hubspot` creado en la raíz del proyecto
- Python accesible desde terminal
- Servidor JoathiVA activo en `http://localhost:8787/`

## Uso recomendado
1. Copiar esta carpeta completa al equipo
2. Doble clic en `20_instalador_maestro_joathiva.bat`
3. Esperar a que abra portal y login
4. Probar el flujo cliente

## Prueba final
- entrar como cliente
- abrir `#solicitar-traslado`
- enviar una solicitud
- verificar mensaje CRM
- revisar deal creado en HubSpot
