# Manual de Usuario Maestro

## Acceso

- Usuario demo: `maestro`
- Clave demo: `Maestro2026!`
- URL: [http://localhost:8787/admin.html](http://localhost:8787/admin.html)

## Que puede hacer

- ver el panel global,
- administrar usuarios,
- importar clientes, proveedores y despachantes,
- editar choferes, transportes, viajes y pedidos,
- ver tracking GPS en mapa,
- ver panel de estados operativos,
- revisar clientes a facturar y recibos proveedor.
- abrir el Sistema Lucia oficial desde la pantalla maestra,
- consultar tablas publicas importadas como referencia local,
- validar la clasificacion arancelaria sin guardar contrasenas en JoathiVA.
- guardar una sesion local protegida para Lucia en esta PC si el equipo opera el sistema de forma habitual.
- importar las exportaciones publicas descargadas por el exportador local para auditar paquetes y archivos.

## Panel maestro

En el inicio del maestro veras:

- usuarios,
- choferes,
- transportes,
- viajes,
- pedidos.

Tambien veras el tablero de operaciones:

- pedidos de cliente,
- viaje disponible,
- viaje aceptado,
- viajes en curso,
- viajes finalizados,
- precio de venta,
- costo proveedor,
- ganancia JoathiVA.

## Uso recomendado

1. Revisar tablero operativo y resumen comercial.
2. Ver mapa maestro y unidades activas.
3. Controlar pedidos finalizados para facturacion y liquidacion.
4. Ajustar datos base si hay errores de usuario, viaje o pedido.
5. Abrir Lucía solo desde el enlace oficial y autenticar con la cuenta habilitada en esa PC.
6. Usar la referencia local de tablas solo como apoyo, no como sustituto de la pantalla oficial.
7. Si guardas acceso local, la contraseña queda protegida en el servidor de esta PC y no en el navegador.
8. Si importas exportaciones publicas, usa solo la carpeta local generada por el exportador y no fuentes mezcladas.

### Cierre estandar de QA Lucía

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\Joathi\JOATHIVA\tools\lucia_export\lucia_qa_smoke.ps1"
```

Ese comando valida:
- importacion de exportacion publica local
- estado persistido del importador
- smoke de alertas operativas

Resultado esperado:
- `ok: true`
- sin errores en importacion ni alertas

### Verificacion de actividad

```bash
node tools/lucia_export/lucia_activity_smoke.mjs
```

Ese smoke valida:
- actividad normalizada en `activityLog`
- feed consolidado de cliente
- feed vinculado de operacion

Resultado esperado:
- `ok: true`
- `records: 2`
- `operationFeed: 1`

### Centro Lucía y ETL operativo

Regenera los datasets locales con:

```bash
python3 tools/lucia_export/build_lucia_smart_search_data.py
python3 tools/lucia_export/build_lucia_operational_dataset.py
```

Luego abre el panel Lucía para usar:
- busqueda global
- filtro por tabla
- favoritos
- acceso rapido al sistema oficial

El panel maestro de cumplimiento muestra:
- operaciones incompletas
- observaciones
- faltantes documentales
- control ejecutivo para despachante y proveedor

Verificacion operativa adicional:

```bash
python3 tools/lucia_export/lucia_operational_smoke.py
```

Eso confirma que el dataset ETL de Lucía esta cargado, deja historial de corrida y queda listo para consumo del panel.

## Importacion CSV

Se puede importar:

- cliente,
- proveedor,
- despachante.

Encabezado requerido:

`displayName,username,password,company,legalName,documentType,documentNumber,email,phone,notificationsEnabled,notificationOrigin,notificationDestination,bankAccountHolder,bankName,bankAccountType,bankAccountNumber,bankSwift`

## Observaciones

- Si editas un pedido o un viaje, la facturacion se recalcula.
- Si editas un proveedor, conviene verificar sus datos bancarios.
