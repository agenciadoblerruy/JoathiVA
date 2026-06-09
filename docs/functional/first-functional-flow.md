# JOATHIVA - First Functional Flow

## Propósito
Definir el primer flujo funcional real que JoathiVA debe sostener durante el cierre final: convertir una necesidad comercial en una cotización trazable, dejarla preparada para exportación y envío, y mantener la relación con cliente y proveedor sin inventar pantallas nuevas.

Este flujo se alinea con el tablero de cierre final y con el estado actual del proyecto:
- `commercial_ops` y `provider` siguen siendo bloques de cierre.
- La vertical de cotización comercial sigue siendo el flujo central.
- Las integraciones reales, la persistencia completa y la coordinación técnica siguen siendo parte del cierre.

## Usuario objetivo
Usuario principal:
- operador comercial del perfil `commercial_ops`

Usuarios que intervienen después:
- proveedor del perfil `provider`
- supervisor operativo o maestro, si necesita validar el seguimiento

## Entrada
El flujo comienza cuando existe una necesidad comercial concreta:
- un cliente ya identificado o por identificar,
- una solicitud de cotización o tarea pendiente,
- una necesidad de registrar origen, destino, tipo de carga y condiciones comerciales,
- y, si corresponde, un proveedor a derivar por tipo de unidad y cobertura.

La entrada mínima válida es:
- cliente,
- cotizador,
- tarea o necesidad comercial,
- y contexto operativo suficiente para generar una propuesta real.

## Proceso
1. El operador entra al perfil comercial y toma la tarea pendiente o la solicitud recibida.
2. Identifica o busca al cliente.
3. Abre el cotizador y completa los datos base:
   - origen,
   - destino,
   - tipo de carga,
   - condiciones,
   - observaciones comerciales.
4. Registra la cotización como unidad trazable del negocio.
5. Genera el documento editable asociado a la cotización.
6. Exporta la salida comercial en formato Word o PDF.
7. Envía la cotización o el documento por correo electrónico.
8. Si el flujo requiere ejecución, vincula o deriva el caso al proveedor correspondiente por tipo de unidad, configuración y cobertura.
9. Deja trazabilidad para seguimiento posterior de cliente, cotización y proveedor.

## Salida esperada
Al final del flujo debe existir, como mínimo:
- una cotización trazable,
- un cliente vinculado,
- un documento editable asociado,
- una salida comercial exportable en Word o PDF,
- un envío por correo iniciado o registrado,
- y un rastro operativo suficiente para seguimiento.

Si interviene el proveedor, la salida también debe dejar:
- proveedor identificado,
- cobertura o ruta asociada,
- y estado operativo visible para el seguimiento posterior.

## Criterio de aceptación
El flujo se considera aceptado cuando:
- se puede ejecutar desde el perfil comercial sin pasos manuales fuera del sistema,
- la cotización queda asociada a un cliente real,
- el documento editable queda vinculado a la cotización,
- el Word o PDF se genera a partir de esa misma información,
- el correo usa esa salida comercial como referencia o adjunto,
- la trazabilidad queda persistida o registrada según el estado técnico actual,
- y el proveedor puede ser derivado sin romper la cadena cliente -> cotización -> documento -> correo -> proveedor.

No se considera aceptado si:
- alguna parte queda solo visual,
- la cotización no se puede recuperar,
- el documento no queda ligado a la cotización,
- el envío por correo no deja rastro,
- o el flujo depende de rutas fijas, atajos manuales o pantallas decorativas.

## Lectura de cierre
El tablero final marca este flujo como parte del cierre pendiente y por eso esta definición sirve como contrato funcional mínimo:
- no inventa módulos nuevos,
- no reordena frontend,
- y obliga a cerrar la continuidad entre comercial, documento, correo y proveedor.
