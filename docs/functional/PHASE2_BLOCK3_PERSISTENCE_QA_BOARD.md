# JoathiVA — Fase 2 Bloque 3: Persistencia central + QA

## Objetivo
Reducir dependencia de `localStorage` en los flujos críticos ya soportados por backend y cerrar la validación visual/manual final del producto.

## Estado del bloque
- Estado: `Pendiente`
- Prioridad: `Alta`
- Responsable principal: `Web`
- Soporte eventual: `Desktop` solo si aparece un bloqueo real de contrato/backend

---

## 1. Persistencia central

| Ítem | Estado | Objetivo | Evidencia / notas |
|---|---|---|---|
| Provider desde backend | Pendiente | Leer providers desde backend cuando haya datos disponibles |  |
| Provider workflow desde backend | Pendiente | Reducir dependencia de localStorage en tarifas/comparación/confirmación |  |
| Document/export/outbox desde backend | Pendiente | Mostrar estado real desde backend en vez de solo fallback local |  |
| Cotización desde backend si aplica | Pendiente | Revisar qué parte ya puede hidratarse desde server |  |
| Fallback local controlado | Pendiente | Mantener fallback sin ocultar errores reales |  |
| Estados de carga/error | Pendiente | Mostrar feedback claro al usuario |  |

---

## 2. QA visual/manual

| Pantalla / flujo | Estado | Qué validar | Resultado manual |
|---|---|---|---|
| Home / navegación | Pendiente | accesos, orden, claridad visual |  |
| commercial_ops | Pendiente | métricas, paneles, navegación, consistencia |  |
| Provider | Pendiente | alta, edición, listado, workflow |  |
| Cotizador | Pendiente | carga de datos, guardado, flujo |  |
| Documento comercial | Pendiente | legibilidad, estructura, impresión |  |
| Export / PDF | Pendiente | botones, estados, apertura/descarga |  |
| Outbox / correo | Pendiente | estado, retry, mensajes |  |
| Backend integration panel | Pendiente | estados, consistencia con backend |  |
| Closure board | Pendiente | clasificación final correcta |  |

---

## 3. Checklist de cierre del bloque

### Persistencia
- [ ] Provider lee o hidrata desde backend cuando corresponde
- [ ] Provider workflow usa backend cuando está disponible
- [ ] Document/export/outbox muestran datos reales del backend
- [ ] `localStorage` queda como fallback, no como única fuente
- [ ] Los errores backend no quedan ocultos por el fallback local
- [ ] Se documenta claramente qué sigue local y qué ya quedó central

### QA
- [ ] Revisión manual de navegación
- [ ] Revisión manual de `commercial_ops`
- [ ] Revisión manual de `provider`
- [ ] Revisión manual de cotizador
- [ ] Revisión manual de documento comercial
- [ ] Revisión manual de export/PDF
- [ ] Revisión manual de outbox/correo
- [ ] Revisión manual de impresión
- [ ] Revisión manual responsive
- [ ] Capturas o evidencia manual registradas
- [ ] Lista final de bugs, si existen

---

## 4. Clasificación final esperada

| Categoría | Estado esperado al cerrar |
|---|---|
| Persistencia provider | Hecho o Parcial controlado |
| Persistencia document/export/outbox | Hecho o Parcial controlado |
| Dependencia de localStorage | Reducida |
| QA visual/manual | Hecha |
| Bugs finales | Documentados |
| Riesgos remanentes | Claros |

---

## 5. Entregable esperado del agente

1. Resumen corto  
2. Archivos modificados  
3. Rutas/pantallas afectadas  
4. Qué quedó hecho  
5. Qué quedó parcial  
6. Riesgos  
7. Resultado de QA visual/manual
