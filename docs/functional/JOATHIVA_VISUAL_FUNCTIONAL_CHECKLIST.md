# JOATHIVA - Visual & Functional Checklist

## Objetivo
Este documento define cómo queremos ver JoathiVA a nivel visual y funcional, con foco en la experiencia real de uso de cada perfil, la claridad operativa y el nivel profesional del producto.

Sirve para:
- revisión visual
- revisión funcional
- priorización de ajustes
- coordinación entre frontend y backend
- validación de cierre del proyecto

---

# 1. Criterios generales de JoathiVA

## 1.1 Visual general
- [ ] Diseño moderno, limpio y profesional
- [ ] Identidad visual consistente con Joathi
- [ ] Tipografía legible
- [ ] Jerarquía clara entre títulos, subtítulos y contenidos
- [ ] Espaciado correcto entre bloques
- [ ] Botones visibles, consistentes y entendibles
- [ ] Colores corporativos bien aplicados
- [ ] Iconografía coherente con logística, trazabilidad y operación
- [ ] No hay bloques vacíos
- [ ] No hay texto cortado
- [ ] No hay elementos montados o desalineados
- [ ] No parece una plantilla genérica
- [ ] Responsive correcto en notebook y móvil

## 1.2 Funcional general
- [ ] La navegación es clara
- [ ] Cada botón ejecuta una acción real
- [ ] Cada formulario guarda o envía correctamente
- [ ] Los datos se muestran donde corresponde
- [ ] No hay pantallas solo decorativas
- [ ] No hay módulos de relleno sin funcionalidad
- [ ] Los mensajes de error o éxito son claros
- [ ] Cada perfil ve solo lo que le corresponde
- [ ] Existe relación lógica entre clientes, cotizaciones, proveedores y operativa

---

# 2. Home / Dashboard principal

## Visual esperado
- [ ] Portada clara con identidad JoathiVA
- [ ] Accesos rápidos visibles
- [ ] Paneles o cards ordenadas
- [ ] Alertas importantes visibles
- [ ] Diseño de tablero profesional
- [ ] No hay saturación visual

## Funcionalidad esperada
- [ ] Muestra módulos según el perfil
- [ ] Muestra tareas o pendientes relevantes
- [ ] Muestra actividad reciente
- [ ] Permite ir rápido a acciones principales
- [ ] Sirve como punto real de entrada al trabajo diario

---

# 3. Perfil `commercial_ops`

## 3.1 Cómo debería verse
- [ ] Dashboard comercial-operativo claro
- [ ] Checklist de tareas visible arriba o en primer bloque
- [ ] Acceso claro al cotizador
- [ ] Seguimiento de clientes visible
- [ ] Proveedores visibles por tipo de unidad
- [ ] Buscadores de clientes y proveedores visibles
- [ ] Diseño orientado a operación diaria real

## 3.2 Qué debe poder hacer
- [ ] Ver tareas pendientes
- [ ] Marcar tareas como realizadas
- [ ] Crear tareas si aplica
- [ ] Editar tareas si aplica
- [ ] Abrir cotizador
- [ ] Crear cotización
- [ ] Asociar cotización a cliente
- [ ] Generar documento editable
- [ ] Generar Word/PDF comercial
- [ ] Enviar por correo electrónico
- [ ] Buscar clientes
- [ ] Dar de alta clientes
- [ ] Modificar clientes
- [ ] Buscar proveedores
- [ ] Dar de alta proveedores
- [ ] Modificar proveedores

## 3.3 Qué debería mostrar
### Clientes
- [ ] Nombre del cliente
- [ ] Última actividad
- [ ] Tarea pendiente
- [ ] Próxima acción si aplica

### Proveedores
- [ ] Nombre
- [ ] Tipo de unidad
- [ ] Configuración
- [ ] Disponibilidad
- [ ] Cobertura / rutas

---

# 4. Perfil `provider`

## 4.1 Cómo debería verse
- [ ] Portada simple, clara y operativa
- [ ] Alerta visible de cotizaciones disponibles
- [ ] Historial de viajes visible
- [ ] Botón o acceso claro para responder cotización
- [ ] Acceso claro para subir documentación
- [ ] Acceso a datos operativos del viaje
- [ ] Interfaz rápida, simple y útil

## 4.2 Qué debe poder hacer
- [ ] Ver cotizaciones disponibles
- [ ] Completar y responder cotizaciones
- [ ] Registrar o enviar respuesta ligada a `cotizaciones@joathilogistica.com`
- [ ] Ver historial de viajes
- [ ] Cargar e-ticket / factura
- [ ] Cargar CRT
- [ ] Ver o cargar datos del chofer
- [ ] Ver o cargar datos del camión
- [ ] Ver o cargar MIC
- [ ] Ver o cargar DUA

## 4.3 Alta de proveedor
### Datos generales
- [ ] Nombre / razón social
- [ ] Contacto
- [ ] Teléfono
- [ ] Email
- [ ] País
- [ ] Observaciones

### Tipo de unidad
- [ ] Tipo de unidad
- [ ] Configuración
- [ ] Disponibilidad

### Rutas / cobertura
- [ ] Argentina
- [ ] Brasil
- [ ] Bolivia
- [ ] Chile
- [ ] Colombia
- [ ] Uruguay
- [ ] México
- [ ] Estados Unidos
- [ ] Europa
- [ ] Asia

---

# 5. Módulo de cotizador

## 5.1 Visual esperado
- [ ] Formulario claro
- [ ] Datos agrupados correctamente
- [ ] Botón principal visible
- [ ] Resumen entendible
- [ ] Apariencia comercial y profesional

## 5.2 Funcionalidad esperada
- [ ] Seleccionar o asociar cliente
- [ ] Cargar origen
- [ ] Cargar destino
- [ ] Cargar tipo de carga
- [ ] Cargar condiciones
- [ ] Guardar cotización
- [ ] Ver historial de cotizaciones
- [ ] Generar documento editable
- [ ] Exportar Word/PDF
- [ ] Enviar por correo

---

# 6. Módulo de clientes

## Visual esperado
- [ ] Listado claro
- [ ] Ficha del cliente ordenada
- [ ] Actividad visible
- [ ] Tareas visibles
- [ ] Acceso rápido a acciones relacionadas

## Funcionalidad esperada
- [ ] Alta de clientes
- [ ] Búsqueda de clientes
- [ ] Edición de clientes
- [ ] Historial de actividad
- [ ] Tareas asociadas
- [ ] Acceso a cotizaciones del cliente

---

# 7. Módulo de proveedores

## Visual esperado
- [ ] Listado claro
- [ ] Agrupación por tipo de unidad
- [ ] Filtros visibles
- [ ] Ficha del proveedor ordenada

## Funcionalidad esperada
- [ ] Alta de proveedores
- [ ] Búsqueda de proveedores
- [ ] Edición de proveedores
- [ ] Filtro por tipo de unidad
- [ ] Filtro por configuración
- [ ] Cobertura / rutas visibles
- [ ] Disponibilidad visible

## Modelo esperado
### Tipo de unidad
- [ ] Sider
- [ ] Furgón
- [ ] Plataforma
- [ ] Cisterna
- [ ] Refrigerado

### Configuración
- [ ] Semirremolque u otras configuraciones separadas del tipo de unidad

---

# 8. Documentos comerciales

## Visual esperado
- [ ] Documento prolijo
- [ ] Formato corporativo
- [ ] Datos bien distribuidos
- [ ] Legible para compartir con clientes

## Funcionalidad esperada
- [ ] Editable
- [ ] Vinculado a cotización
- [ ] Vinculado a cliente
- [ ] Exportable a Word/PDF
- [ ] Enviable por correo

---

# 9. Operativa en proceso

## Debe mostrar o permitir
- [ ] Chofer
- [ ] Camión
- [ ] Viaje
- [ ] MIC
- [ ] DUA
- [ ] CRT
- [ ] E-ticket / factura
- [ ] Estado operativo actual

---

# 10. Checklist de calidad final

## Lo que NO queremos ver
- [ ] Páginas vacías
- [ ] Texto cortado
- [ ] Botones que no hacen nada
- [ ] Módulos de relleno
- [ ] Diseño viejo o desprolijo
- [ ] Formularios incompletos
- [ ] Nombres inconsistentes
- [ ] Datos duplicados
- [ ] Navegación confusa

## Lo que SÍ queremos ver
- [ ] Claridad
- [ ] Profesionalismo
- [ ] Velocidad de uso
- [ ] Trazabilidad
- [ ] Lógica real de trabajo
- [ ] Perfiles bien definidos
- [ ] Integración entre módulos
- [ ] Diseño moderno y corporativo

---

# 11. Estado actual / seguimiento

| Módulo | Visual esperado | Funcionalidad esperada | Estado actual | Prioridad | Responsable |
|---|---|---|---|---|---|
| Home / Dashboard |  |  |  |  |  |
| commercial_ops |  |  |  |  |  |
| provider |  |  |  |  |  |
| Cotizador |  |  |  |  |  |
| Clientes |  |  |  |  |  |
| Proveedores |  |  |  |  |  |
| Documentos comerciales |  |  |  |  |  |
| Operativa en proceso |  |  |  |  |  |

---

# 12. Uso del documento

## Para el agente web
Usar este checklist para:
- revisión visual
- revisión UX
- revisión de perfiles
- revisión de pantallas
- marcar hecho / parcial / faltante

## Para el agente desktop
Usar este checklist para:
- validar qué requiere backend real
- validar qué requiere persistencia
- validar qué requiere correo, documentos e integraciones
- identificar qué es solo visual y qué necesita soporte técnico real
