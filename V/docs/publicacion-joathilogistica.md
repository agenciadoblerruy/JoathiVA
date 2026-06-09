# Publicacion segura de joathilogistica.com

## Diagnostico tecnico

- Produccion actual: WordPress 6.9.4.
- Hosting actual: LiteSpeed sobre PHP 8.3.30.
- Tema actual: `packers-agency` de Themeignite.
- Home publica actual: `https://joathilogistica.com/`.
- Ruta publica de JoathiVA: `https://joathilogistica.com/acceso-joathiva/`.
- Cotizador publico actual: ancla `#cotizador` en la home.

## Base local real

- Carpeta fuente de trabajo: `/mnt/e/Joathi/JOATHIVA/V`
- Tipo de sitio local: estatico HTML/CSS/JS.
- No hay `wp-config.php` local.
- No hay `package.json` en la raiz local.
- El arbol incluye contenido publico y tambien datos operativos de asistencia que no deben ir al bundle de publicacion.

## Que se publica

Para el bundle de publicacion solo deben salir los archivos y recursos publicos del sitio:

- `index.html`
- `login.html`
- `admin.html`
- `brand-studio.html`
- `media-studio.html`
- `mktjoathi.html`
- `styles.css`
- `app.js`
- `brand-studio.js`
- `growth-lab.js`
- `joathiva.js`
- `portal.js`
- `mktjoathi.css`
- `mktjoathi.js`
- `logo.png`
- `logo.svg`
- `isotipo.svg`
- `lucia-arancel-data.js`
- `lucia-operational-data.js`
- `lucia-reference-data.js`
- `lucia-smart-search-data.js`
- `assets/brand/`

## Que no se publica

Excluir siempre del bundle:

- `.env`
- `*.log`
- `*.bak*`
- `node_modules/`
- archivos temporales o de respaldo
- `docs/`
- `scripts/`
- `prototipos/`
- `v1/`
- `tasks.config.json`
- `assets/joathi-outlook-assistant/output/`
- `assets/joathi-outlook-assistant/input/emails/`
- `assets/joathi-outlook-assistant/config/assistant.local.env`
- cualquier archivo generado por validacion o empaquetado

## Proceso exacto

1. Ejecutar la validacion previa.
2. Generar el backup local completo del arbol fuente con exclusiones de seguridad.
3. Generar el bundle publico en un directorio de staging limpio.
4. Revisar el contenido del bundle antes de subirlo.
5. Si hay acceso al hosting remoto, generar un backup remoto equivalente antes del cambio.
6. Publicar solo el bundle validado.
7. Verificar la home publica y la ruta de JoathiVA.
8. Mantener el backup listo para rollback.

## Backup y rollback

### Backup local

El script de publicacion crea un archivo `tar.gz` con el estado del arbol local excluyendo datos operativos, backups previos y temporales.

### Backup remoto

Solo aplica si hay acceso a cPanel, FTP, SFTP o snapshot del hosting. No se debe subir nada nuevo sin ese respaldo previo.

### Rollback

1. Detener la publicacion nueva.
2. Restaurar el backup local o remoto correspondiente.
3. Revertir los archivos del host al ultimo estado conocido bueno.
4. Volver a validar la home y `https://joathilogistica.com/acceso-joathiva/`.

## Validacion de rutas

- Cotizador automatico: `https://joathilogistica.com/#cotizador`
- JoathiVA: `https://joathilogistica.com/acceso-joathiva/`

En el arbol local, la equivalencia de trabajo es:

- Cotizador: `index.html` con `#quotePanel`
- JoathiVA: `login.html`

## Riesgos abiertos

- El sitio publico real sigue siendo WordPress, asi que el bundle local no se puede subir sin confirmar el mecanismo de publicacion del hosting.
- Falta una pagina local `terms.html`; el enlace existe en `index.html`, asi que hay un riesgo de enlace roto si no se resuelve antes de publicar.
- La carpeta `assets/joathi-outlook-assistant` contiene historial y salidas operativas, por lo que no debe ir al bundle publico.

