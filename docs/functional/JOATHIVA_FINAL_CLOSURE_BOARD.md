# JOATHIVA - Final Closure Board

## Objetivo
Tablero de seguimiento para cerrar JoathiVA por bloques, con responsables claros, prioridades, archivos reservados, riesgos y estado.

## Estados sugeridos
- `Pendiente`
- `En curso`
- `Bloqueado`
- `Parcial`
- `Cerrado`

## Prioridades sugeridas
- `Alta`
- `Media`
- `Baja`

---

## 1. Gobernanza y coordinación

| Bloque | Estado | Responsable | Prioridad | Objetivo | Archivos / áreas | Riesgo |
|---|---|---:|---:|---|---|---|
| Gobernanza y coordinación | Pendiente | Ambos | Alta | Evitar superposición entre agentes y ordenar el trabajo diario | `docs/governance/*` | Conflictos de archivos, trabajo duplicado |

### Checklist
- [ ] Revisar `docs/governance/WORK_IN_PROGRESS.md`
- [ ] Reservar archivos antes de empezar
- [ ] Confirmar alcance desktop vs web
- [ ] Actualizar bitácora al cierre de cada tarea

---

## 2. Revisión técnica base

| Bloque | Estado | Responsable | Prioridad | Objetivo | Archivos / áreas | Riesgo |
|---|---|---:|---:|---|---|---|
| Revisión técnica base | Pendiente | Desktop | Alta | Confirmar estabilidad técnica del proyecto antes del cierre funcional | `server/`, `tools/`, `scripts/`, `android-app/`, integraciones | Rutas rotas, permisos incompletos, persistencia inconsistente |

### Checklist
- [ ] Revisar backend real
- [ ] Revisar roles/permisos reales
- [ ] Validar `commercial_ops`
- [ ] Validar `provider`
- [ ] Revisar auth
- [ ] Revisar rutas dinámicas
- [ ] Revisar persistencia real vs local
- [ ] Revisar build/test/dev
- [ ] Revisar correo e integraciones
- [ ] Revisar Outlook assistant
- [ ] Revisar Lucía
- [ ] Revisar Android

---

## 3. Revisión visual y UX general

| Bloque | Estado | Responsable | Prioridad | Objetivo | Archivos / áreas | Riesgo |
|---|---|---:|---:|---|---|---|
| Revisión visual y UX general | Pendiente | Web | Alta | Asegurar que JoathiVA se vea profesional y usable | `V/v1/*`, docs funcionales | UI vieja, navegación confusa, pantallas incompletas |

### Checklist
- [ ] Revisar home/dashboard
- [ ] Revisar jerarquía visual
- [ ] Revisar botones
- [ ] Revisar espaciados
- [ ] Revisar responsive
- [ ] Revisar textos cortados
- [ ] Revisar navegación
- [ ] Revisar módulos vacíos o decorativos

### Documento guía
- `docs/functional/JOATHIVA_VISUAL_FUNCTIONAL_CHECKLIST.md`

---

## 4. Cierre del perfil `commercial_ops`

| Bloque | Estado | Responsable | Prioridad | Objetivo | Archivos / áreas | Riesgo |
|---|---|---:|---:|---|---|---|
| `commercial_ops` | Pendiente | Web | Alta | Dejar el perfil comercial operativo usable de punta a punta | `V/v1/*`, contratos comunes si aplica | Flujo parcial, acciones sin persistencia, documento/correo no cerrados |

### Checklist
- [ ] Checklist de tareas
- [ ] Seguimiento de clientes
- [ ] Búsqueda de clientes
- [ ] Alta/modificación de clientes
- [ ] Búsqueda de proveedores
- [ ] Alta/modificación de proveedores
- [ ] Agrupación por tipoUnidad
- [ ] Cotizador
- [ ] Documento editable
- [ ] Word/PDF comercial
- [ ] Envío por correo

### Soporte backend si aplica
- [ ] Permisos reales
- [ ] Persistencia real
- [ ] Correo real

---

## 5. Cierre del perfil `provider`

| Bloque | Estado | Responsable | Prioridad | Objetivo | Archivos / áreas | Riesgo |
|---|---|---:|---:|---|---|---|
| `provider` | Pendiente | Web | Alta | Dejar el perfil proveedor funcional y claro | `V/v1/*`, uploads, contratos de datos | Perfil solo visual, campos incompletos, uploads no persistentes |

### Checklist
- [ ] Alta de proveedor
- [ ] Tipo de unidad
- [ ] Configuración
- [ ] Rutas/cobertura
- [ ] Portada del proveedor
- [ ] Alerta de cotizaciones disponibles
- [ ] Responder cotización
- [ ] Historial de viajes
- [ ] Carga de e-ticket/factura
- [ ] Carga de CRT
- [ ] Datos de chofer
- [ ] Datos del camión
- [ ] MIC
- [ ] DUA

### Soporte backend si aplica
- [ ] Persistencia de proveedor
- [ ] Persistencia de documentación
- [ ] Lógica de cotizaciones disponibles

---

## 6. Vertical de cotización comercial

| Bloque | Estado | Responsable | Prioridad | Objetivo | Archivos / áreas | Riesgo |
|---|---|---:|---:|---|---|---|
| Cotización comercial | Pendiente | Web + Desktop | Alta | Cerrar el flujo de negocio principal | Cotizador, documentos, correo, cliente | Flujo incompleto entre UI, documento y envío |

### Flujo esperado
`cliente -> cotización -> documento editable -> Word/PDF -> correo`

### Checklist
- [ ] Validar formulario
- [ ] Validar asociación con cliente
- [ ] Validar guardado
- [ ] Validar historial
- [ ] Validar documento comercial
- [ ] Validar exportación
- [ ] Validar envío por correo

---

## 7. Integraciones y soportes reales

| Bloque | Estado | Responsable | Prioridad | Objetivo | Archivos / áreas | Riesgo |
|---|---|---:|---:|---|---|---|
| Integraciones y soportes reales | Pendiente | Desktop | Alta | Cerrar lo que sostiene el producto detrás de escena | Correo, Outlook, Lucía, Android, scripts | Integraciones parciales, scripts con rutas fijas, adjuntos no conectados |

### Checklist
- [ ] Correo real
- [ ] Adjuntos
- [ ] Outlook assistant
- [ ] Lucía
- [ ] Android sync
- [ ] Rutas dinámicas
- [ ] Scripts activos
- [ ] Documentación técnica viva

---

## 8. Documentación final operativa

| Bloque | Estado | Responsable | Prioridad | Objetivo | Archivos / áreas | Riesgo |
|---|---|---:|---:|---|---|---|
| Documentación final operativa | Pendiente | Ambos | Media | Dejar el proyecto legible y mantenible | `docs/*` | Documentación desactualizada o dispersa |

### Checklist
- [ ] Actualizar `README.md`
- [ ] Actualizar docs funcionales
- [ ] Actualizar docs técnicas
- [ ] Limpiar duplicaciones obvias
- [ ] Dejar checklist final marcado

---

## 9. QA final

| Bloque | Estado | Responsable | Prioridad | Objetivo | Archivos / áreas | Riesgo |
|---|---|---:|---:|---|---|---|
| QA técnico | Pendiente | Desktop | Alta | Confirmar estabilidad técnica final | tests, build, dev, logs, scripts | Falla de build, test roto, entorno inconsistente |
| QA visual/funcional | Pendiente | Web | Alta | Confirmar experiencia final del producto | pantallas, perfiles, navegación | Bugs visuales, wiring incompleto, acciones sin efecto |

### Checklist Desktop
- [ ] `git diff --check`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run dev`
- [ ] Validación de errores técnicos
- [ ] Validación de scripts

### Checklist Web
- [ ] Prueba manual de pantallas
- [ ] Validación visual
- [ ] Validación funcional por perfil
- [ ] Lista de bugs finales

---

## 10. Cierre ejecutivo

| Bloque | Estado | Responsable | Prioridad | Objetivo | Archivos / áreas | Riesgo |
|---|---|---:|---:|---|---|---|
| Cierre ejecutivo | Pendiente | Tú + Ambos | Alta | Tomar decisión final de cierre y siguiente fase | Resumen global | Cierre prematuro con pendientes críticos |

### Entregable final
- [ ] Qué está terminado
- [ ] Qué está parcial
- [ ] Qué queda pendiente
- [ ] Qué se puede publicar/usar
- [ ] Qué requiere siguiente fase

---

# Reparto operativo

## Agente desktop
### Bloques asignados
- [ ] Bloque 2 — Revisión técnica base
- [ ] Bloque 7 — Integraciones y soportes reales
- [ ] Parte técnica del Bloque 9 — QA final

## Agente web
### Bloques asignados
- [ ] Bloque 3 — Revisión visual y UX general
- [ ] Bloque 4 — `commercial_ops`
- [ ] Bloque 5 — `provider`
- [ ] Bloque 6 — cotización comercial
- [ ] Parte visual/funcional del Bloque 9 — QA final

## Ambos
- [ ] Bloque 1 — Gobernanza y coordinación
- [ ] Bloque 8 — Documentación final operativa
- [ ] Bloque 10 — Cierre ejecutivo

---

# Orden recomendado de ejecución

## Etapa 1
- [ ] Bloque 1
- [ ] Bloque 2
- [ ] Bloque 3

## Etapa 2
- [ ] Bloque 4
- [ ] Bloque 5
- [ ] Bloque 6

## Etapa 3
- [ ] Bloque 7
- [ ] Bloque 8
- [ ] Bloque 9

## Etapa 4
- [ ] Bloque 10

---

# Prioridad real de cierre

## Orden sugerido por verticales de negocio
1. [ ] Cotización comercial
2. [ ] `commercial_ops`
3. [ ] `provider`
4. [ ] Integraciones
5. [ ] QA + documentación
