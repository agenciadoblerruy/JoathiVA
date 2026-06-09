# Proyecto JoathiVA

## Objetivo

JoathiVA centraliza la relacion entre cliente, proveedor, maestro y despachante para gestionar:

- viajes disponibles,
- pedidos de carga,
- seguimiento GPS,
- documentacion operativa y aduanera,
- control comercial,
- facturacion al cliente y liquidacion al proveedor.

## Roles del sistema

- `Maestro`: control general, base de usuarios, viajes, pedidos, mapa, embudo operativo y resumen comercial.
- `Cliente`: solicita viajes, sigue la mercaderia, revisa historial y consulta documentos. Solo ve lo propio.
- `Proveedor`: registra choferes, unidades, viajes, comparte GPS, gestiona hitos operativos y ve pedidos compatibles con sus destinos. Solo ve lo propio.
- `Despachante`: revisa operaciones, estados del viaje y documentacion aduanera. Solo ve lo propio.

## Regla formal de visibilidad

Cliente, Proveedor y Despachante siempre ven solo su propia informacion, su propio menu, su propio panel principal y sus propias acciones.

La regla aplica a:

- navegacion lateral,
- panel central,
- listados,
- formularios,
- notificaciones,
- reportes,
- y pantalla inicial.

Pantallas iniciales de referencia:

- `Cliente` -> `Mis Cotizaciones`
- `Proveedor` -> `Ordenes de Servicio`
- `Despachante` -> `Operaciones Asignadas`

## Flujo operativo resumido

1. El proveedor publica un viaje.
2. El cliente solicita un pedido sobre un viaje disponible.
3. El proveedor o chofer inicia la operacion y comparte GPS.
4. Se registran los hitos:
   - tiempo de carga,
   - comienzo de viaje,
   - tiempo de llegada,
   - tiempo de descarga,
   - finalizacion.
5. Maestro, cliente, proveedor y despachante reciben notificaciones operativas.
6. Al finalizar:
   - se habilita el cobro al cliente,
   - se genera la lista del cliente a facturar,
   - se genera el recibo del proveedor.

## Logica comercial

- El proveedor informa el costo neto del viaje.
- JoathiVA calcula el precio cliente con una comision del `33,3%` antes de IVA.
- El cliente le paga a JoathiVA.
- JoathiVA liquida al proveedor una vez finalizada la operacion.

## Modulos principales

- Portal web: [index.html](../index.html)
- Maestro: [admin.html](../admin.html)
- Choferes: [choferes.html](../choferes.html)
- Transportes: [transportes.html](../transportes.html)
- Viajes: [viajes.html](../viajes.html)
- Logica base: [portal.js](../portal.js)
- Capa JoathiVA: [joathiva.js](../joathiva.js)
- Estilos: [styles.css](../styles.css)

## Salidas operativas ya disponibles

- panel maestro con estados y cantidades,
- mapa maestro con ultima ubicacion conocida,
- historial cliente separado entre solicitados y finalizados,
- liquidaciones proveedor,
- panel del despachante para operaciones y documentos,
- soporte visible en toda la experiencia.

## Limitaciones de esta etapa

- backend local en una sola PC,
- base central en JSON,
- autenticacion basica,
- sin integracion con pagos o facturacion fiscal,
- sin despliegue cloud.
