# JoathiVA

JoathiVA es un portal operativo y una app Android orientados a la gestion de viajes, pedidos, seguimiento GPS, documentacion y control comercial entre clientes, proveedores, maestro y despachantes de aduana.

## Documentacion

- [Indice documental](C:/Joathi/pro/docs/README.md)
- [Resumen del proyecto](C:/Joathi/pro/docs/PROYECTO_JOATHIVA.md)
- [Modelo de negocio y Canvas](C:/Joathi/pro/docs/MODELO_NEGOCIO_CANVAS.md)
- [Presentacion para proveedores](C:/Joathi/pro/docs/PRESENTACION_PROVEEDORES_JOATHIVA.html)
- [Manual de redireccion de servidores](C:/Joathi/pro/docs/MANUAL_REDIRECCION_SERVIDORES.md)
- [Servidor local](C:/Joathi/pro/docs/SERVIDOR_LOCAL.md)
- [Manual Maestro](C:/Joathi/pro/docs/MANUAL_MAESTRO.md)
- [Manual Cliente](C:/Joathi/pro/docs/MANUAL_CLIENTE.md)
- [Manual Proveedor](C:/Joathi/pro/docs/MANUAL_PROVEEDOR.md)
- [Manual Despachante](C:/Joathi/pro/docs/MANUAL_DESPACHANTE.md)

## Modulos principales

- Portal web en [index.html](C:/Joathi/pro/index.html), [admin.html](C:/Joathi/pro/admin.html), [choferes.html](C:/Joathi/pro/choferes.html), [transportes.html](C:/Joathi/pro/transportes.html), [viajes.html](C:/Joathi/pro/viajes.html), [growth-lab.html](C:/Joathi/pro/V/growth-lab.html) y [login.html](C:/Joathi/pro/login.html)
- Logica central en [portal.js](C:/Joathi/pro/portal.js)
- Mejoras JoathiVA y workspace movil en [joathiva.js](C:/Joathi/pro/joathiva.js)
- Motor del Growth Lab en [growth-lab.js](C:/Joathi/pro/V/growth-lab.js)
- Estilos en [styles.css](C:/Joathi/pro/styles.css)
- Terminos y condiciones en [terms.html](C:/Joathi/pro/terms.html)
- Backend local en [server](C:/Joathi/pro/server)
- App Android en [android-app](C:/Joathi/pro/android-app)

## Accesos demo

- Maestro: `maestro` / `Maestro2026!`
- Proveedor: `admin` / `Joathi2026!`
- Cliente: `cliente` / `Cliente2026!`
- Despachante: `despachante` / `Despachante2026!`

## Inicio rapido

1. Ejecutar [start-server.bat](C:/Joathi/pro/server/start-server.bat)
2. Abrir [http://localhost:8787](http://localhost:8787)
3. Ingresar con un usuario demo o registrar un nuevo acceso

## URLs locales

- Portal: [http://localhost:8787](http://localhost:8787)
- Salud API: [http://localhost:8787/api/health](http://localhost:8787/api/health)
- Red local actual: [http://192.168.1.3:8787](http://192.168.1.3:8787)

## Estado de esta etapa

- Roles operativos: `maestro`, `cliente`, `proveedor`, `despachante`
- Tracking GPS con hitos de carga, viaje, llegada, descarga y finalizacion
- Cola de notificaciones operativas
- Lista de cliente a facturar y recibo de proveedor
- Repositorio documental
- Panel maestro con embudo operativo y resumen comercial

## Limitaciones actuales

- El backend local corre en esta PC y usa JSON como base central
- No hay autenticacion segura de servidor ni multiempresa avanzada
- No hay facturacion electronica ni pasarela de pago integrada
- No hay build Android ejecutado desde este entorno
