# Manual de Redireccion de Servidores

## Objetivo

Este manual explica dos cosas distintas:

1. como hacer que JoathiVA apunte a otro servidor,
2. como publicar este servidor local para que otros equipos o internet puedan entrar.

## Escenario 1: redirigir JoathiVA a otro servidor

Esto significa cambiar la URL base que usa la app o el portal.

## Desde el portal web

En [index.html](../index.html) y [login.html](../login.html) aparece el panel:

- `Backend local de esta PC`

Pasos:

1. Abrir el portal.
2. Buscar el panel `Servidor`.
3. En `URL base del servidor` escribir la nueva direccion.
4. Guardar.
5. Usar `Probar conexion`.

Ejemplos validos:

- `http://localhost:8787`
- `http://192.168.1.3:8787`
- `http://IP-DE-OTRO-SERVIDOR:8787`
- `http://midominio.com:8787`

## Desde la app Android

La app usa la misma logica del portal.

Pasos:

1. Abrir JoathiVA en Android.
2. Entrar al panel `Servidor`.
3. Cargar la nueva URL base.
4. Guardar y probar conexion.

## Nota tecnica

La configuracion se guarda localmente en el navegador o en la app mediante la clave:

- `joathiva-server-url`

La logica esta en [joathiva.js](../joathiva.js).

## Escenario 2: permitir acceso desde otros equipos de la misma red

Esto no requiere internet publica.

Pasos:

1. Iniciar el servidor con [start-server.bat](../server/start-server.bat)
2. Verificar que esta PC este en la red local
3. Usar la IP local de esta PC

URL actual:

- [http://192.168.1.3:8787](http://192.168.1.3:8787)

Si la IP cambia, los otros equipos deberan usar la nueva IP.

## Recomendacion

Configurar una reserva DHCP en el router para que esta PC mantenga siempre la misma IP local.

## Escenario 3: publicar este servidor hacia internet

Esto ya no es solo redirigir JoathiVA: es exponer el servidor.

## Requisitos

- esta PC debe quedar encendida,
- el servidor debe estar iniciado,
- debes conocer la IP local de la PC,
- debes abrir el puerto en router y firewall.

## Paso 1: fijar IP local

Lo ideal es reservar en el router:

- `192.168.1.3`

Si cambia la IP local, el redireccionamiento de puertos deja de funcionar.

## Paso 2: redireccionar puerto en el router

En el router debes crear una regla `Port Forwarding` o `NAT`.

Configuracion sugerida:

- Puerto externo: `8787`
- Protocolo: `TCP`
- IP interna: `192.168.1.3`
- Puerto interno: `8787`

Eso hara que las conexiones que lleguen al router por el puerto `8787` se envien a esta PC.

## Paso 3: permitir el puerto en Windows Firewall

Debes crear una regla de entrada para:

- Puerto `TCP 8787`

Si el firewall bloquea el puerto, aunque el router redireccione, no funcionara.

## Paso 4: conocer tu IP publica

Con esa IP externa podrias entrar desde afuera con una URL del tipo:

- `http://TU-IP-PUBLICA:8787`

## Paso 5: usar DNS dinamico si la IP publica cambia

Si tu proveedor de internet cambia la IP publica, conviene usar un servicio DDNS, por ejemplo:

- `no-ip`
- `duckdns`
- el DDNS del propio router si lo soporta

Entonces podrias entrar con algo como:

- `http://tu-servidor.ddns.net:8787`

## Escenario 4: usar un dominio o proxy

Si en el futuro quieres un acceso mas profesional, puedes poner un proxy inverso adelante del servidor.

Ejemplo de arquitectura:

- dominio publico,
- proxy reverso,
- JoathiVA corriendo en `8787` dentro de la red.

Eso permite:

- usar nombres mas amigables,
- cambiar puertos internos sin tocar a los usuarios,
- agregar HTTPS mas adelante.

## Diferencia entre redirigir y publicar

- `redirigir JoathiVA`:
  cambiar la URL base que usa la app.

- `publicar el servidor`:
  abrir router/firewall para que el servidor sea accesible desde fuera.

## Recomendacion practica para tu etapa actual

Orden sugerido:

1. usar [http://localhost:8787](http://localhost:8787) en esta PC,
2. probar con [http://192.168.1.3:8787](http://192.168.1.3:8787) desde otro movil,
3. si todo funciona, recien ahi abrir puertos al exterior.

## Advertencia

Hoy JoathiVA funciona como backend local en esta PC, con base central JSON y sin capa fuerte de seguridad.

Publicarlo en internet sirve para pruebas controladas, pero no es la arquitectura recomendada para produccion.
