# JoathiVA Android

Proyecto Android nativo que empaqueta el portal web de JoathiVA dentro de un `WebView` offline.

## Incluye

- Carga local del portal desde `app/src/main/assets/www`.
- Persistencia del portal mediante `localStorage` dentro del `WebView`.
- Navegacion interna entre `index.html`, `login.html`, `admin.html`, `choferes.html`, `transportes.html` y `viajes.html`.
- Apertura externa de enlaces `mailto:`, `tel:` y otros esquemas del sistema.
- Selector de archivos para los formularios del portal.
- Geolocalizacion del dispositivo para compartir GPS desde el inicio del viaje.
- Barra nativa con accesos rapidos a Inicio, Viajes, Maestro y recarga.
- Icono de app basado en `logo.png`.
- Landing local de terminos y condiciones.
- Hitos operativos para carga, salida, llegada y descarga final.

## Abrir en Android Studio

1. Abrir la carpeta `E:\Joathi\JOATHIVA\android-app`.
2. Dejar que Android Studio sincronice dependencias.
3. Ejecutar la app en un emulador o telefono Android.

## Nota

En este entorno no hay Gradle ni Android SDK instalados, asi que el proyecto queda preparado pero no compilado localmente.
