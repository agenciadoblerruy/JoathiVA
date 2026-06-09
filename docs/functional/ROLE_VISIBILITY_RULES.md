# JoathiVA - Regla de visibilidad por perfil

## Regla base

Los perfiles `Cliente`, `Proveedor` y `Despachante` siempre ven solo su propia información, su propio menú, su propio panel principal y sus propias acciones.

Esta regla es obligatoria para diseño, frontend y lógica de acceso.

## Alcance

Para estos tres perfiles no se debe mostrar:

- información de otros perfiles,
- tablas, cards o métricas ajenas,
- menús cruzados de otro rol,
- accesos administrativos,
- reportes globales que no correspondan a su trabajo directo.

## Definición por perfil

### Cliente

Ve solo:

- sus cotizaciones,
- sus operaciones,
- su documentación,
- su soporte,
- su historial propio.

### Proveedor

Ve solo:

- sus servicios,
- sus órdenes de servicio,
- su historial de viajes,
- su área de operaciones,
- su documentación asociada.

### Despachante

Ve solo:

- sus operaciones asignadas,
- su documentación aduanera,
- sus reportes,
- sus trámites y estados,
- su trazabilidad operativa.

## Criterio de pantalla inicial

Cada perfil entra primero a su pantalla principal:

- `Cliente` -> `Mis Cotizaciones`
- `Proveedor` -> `Órdenes de Servicio`
- `Despachante` -> `Operaciones Asignadas`

## Criterio de implementación

La interfaz debe aplicar la separación por rol en:

- navegación lateral,
- encabezado,
- panel central,
- botones de acción,
- listados,
- formularios,
- reportes,
- notificaciones.

## Criterio de aceptación

La regla se considera cumplida si:

- el perfil no ve datos ajenos,
- el perfil no navega a módulos ajenos desde la UI,
- el destino principal coincide con su trabajo real,
- y cualquier vista compartida respeta la autorización del usuario.

## Nota de producto

Esta regla no es una preferencia visual. Es una condición funcional del portal JoathiVA.
