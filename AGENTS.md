# AGENTS.md — JoathiVA v2

## Identidad del producto
JoathiVA es una plataforma logística, comercial y tecnológica.
Toda decisión de diseño, arquitectura o implementación debe reforzar estas percepciones de marca:

- confianza
- velocidad
- control operativo
- orden
- visibilidad
- trazabilidad
- imagen premium B2B
- claridad comercial
- escalabilidad

El producto no debe sentirse genérico ni amateur.
Debe verse como una solución seria para empresas que necesitan operación confiable y control ejecutivo.

---

## Objetivo principal del agente
Tu función es mejorar JoathiVA sin romper la operación existente.

Cada cambio debe responder a estas preguntas:
1. ¿Hace la plataforma más estable?
2. ¿Hace la plataforma más clara para operar?
3. ¿Hace la plataforma más comercialmente sólida?
4. ¿Hace la plataforma más coherente visualmente?
5. ¿Hace la plataforma más escalable y mantenible?

Si la respuesta es no, no implementes el cambio.

---

## Prioridades absolutas
Orden de prioridad obligatorio:

1. Seguridad
2. Estabilidad
3. Continuidad operativa
4. Consistencia visual
5. Mantenibilidad
6. Escalabilidad
7. Rendimiento
8. Velocidad de implementación

Nunca sacrifiques seguridad o estabilidad por velocidad.

---

## Contexto de negocio
JoathiVA pertenece al sector logística y transporte.
La experiencia debe comunicar:

- empresa confiable
- operador profesional
- control en tiempo real
- atención empresarial
- eficiencia operativa
- soporte a decisiones comerciales
- visión tecnológica

La interfaz debe ayudar a vender mejor, operar mejor y supervisar mejor.

---

## Regla base de comportamiento
Antes de modificar código:

1. audita la estructura actual
2. detecta stack, dependencias y arquitectura
3. identifica archivos involucrados
4. explica el plan antes de ejecutar cambios grandes
5. implementa por etapas pequeñas y verificables
6. valida compilación, imports, navegación y consistencia
7. entrega resumen final claro

No hagas cambios masivos sin antes entender el sistema.

---

## Protocolo obligatorio para tareas grandes
Si la solicitud implica rediseño, integración, refactor relevante o cambio de arquitectura:

### Fase A — Auditoría
Debes detectar y documentar:
- framework o stack de web
- sistema de estilos
- librería de componentes
- navegación
- estructura de módulos
- stack Android
- XML, Compose o mixto
- tema actual
- componentes reutilizables
- dependencias críticas
- riesgos técnicos

### Fase B — Plan
Debes proponer:
- estrategia de implementación
- orden de ejecución
- archivos a tocar
- riesgos
- validaciones
- rollback lógico si algo falla

### Fase C — Implementación
Implementa en bloques pequeños.

### Fase D — Validación
Comprueba:
- build exitoso
- imports correctos
- navegación intacta
- estilos coherentes
- ausencia de secretos expuestos
- ausencia de errores obvios

---

## Reglas críticas de ingeniería
Nunca hagas esto salvo justificación explícita:

- romper funcionalidades existentes
- borrar lógica de negocio
- cambiar rutas base o nombres de paquetes sin necesidad
- introducir dependencias innecesarias
- duplicar componentes que pueden centralizarse
- hardcodear secretos, tokens o credenciales
- exponer OPENAI_API_KEY en frontend o Android
- tocar release o producción sin documentar impacto
- mezclar paradigmas de UI sin control
- aplicar refactors masivos no solicitados

Si detectas mala estructura, primero documenta y luego propone corrección gradual.

---

## Arquitectura de diseño obligatoria
JoathiVA debe usar un sistema de diseño centralizado.

Centralizar siempre:

- colores
- tipografías
- espaciados
- radios
- sombras
- íconos
- botones
- inputs
- cards
- estados
- badges
- encabezados
- toolbars
- tablas
- listas
- formularios
- empty states
- loading states
- error states
- success states

No introducir estilos inline o dispersos si existe forma de centralizar.

---

## Identidad visual obligatoria
La estética debe ser:

- corporativa
- moderna
- premium
- limpia
- confiable
- tecnológica
- clara
- dinámica
- ejecutiva

Evitar:
- saturación visual
- exceso de colores
- interfaces infantiles
- sombras exageradas
- componentes recargados
- iconografía inconsistente
- layouts confusos

---

## Paleta oficial
Usar como base la nueva identidad Joathi:

- Primary: #0E3B2E
- Accent: #F2B200
- White: #FFFFFF
- Dark: #1A1A1A

## Logo y tipografia oficial
Usar exclusivamente la nueva identidad Joathi:

- Logo completo: `V/logo.svg`, derivado del SVG oficial vectorial.
- Isotipo: `V/isotipo.svg`, derivado del SVG oficial vectorial.
- No reutilizar, recrear ni referenciar el logo anterior.
- Subtitulos: Montserrat Bold / SemiBold.
- Texto general: Montserrat Medium.
- El logo oficial debe mantenerse vectorizado o convertido a contornos cuando se generen graficas.

### Uso esperado
- Primary: estructura principal, encabezados, navegación, identidad fuerte
- Accent: CTA, foco comercial, alertas destacadas y elementos de conversión
- White: limpieza visual y contraste de contenidos
- Dark: textos fuertes, fondos de contraste controlado

No inventar una nueva paleta sin justificación.

---

## Principios de experiencia de usuario
Toda interfaz debe priorizar:

- lectura rápida
- jerarquía clara
- mínima fricción operativa
- buena experiencia móvil
- acciones principales visibles
- feedback de estado inmediato
- consistencia entre módulos
- componentes previsibles
- lenguaje empresarial

Cada pantalla debe dejar claro:
- dónde estoy
- qué puedo hacer
- qué estado tiene la operación
- qué acción sigue
- qué información es prioritaria

---

## Diseño para web
La web debe priorizar:

- dashboard ejecutivo
- tracking y trazabilidad
- cotización
- pedidos / cargas
- detalle operativo
- clientes / oportunidades
- reportes / métricas
- configuración

### Reglas web
- responsive real
- excelente uso de tablas y listados
- filtros claros
- tarjetas con jerarquía visual
- paneles de métricas limpios
- foco en lectura y productividad
- evitar scrolls innecesarios dentro de componentes si se puede simplificar

La web debe sentirse como plataforma empresarial, no como landing improvisada.

---

## Diseño para Android
La app Android debe priorizar:

- velocidad
- navegación intuitiva
- legibilidad táctil
- acceso rápido a funciones frecuentes
- consistencia en formularios y estados
- diseño operativo móvil real

### Reglas Android
- detectar si el proyecto usa XML, Jetpack Compose o mixto
- respetar el patrón existente salvo justificación clara
- no mezclar implementaciones innecesariamente
- mantener componentes táctiles, claros y consistentes
- optimizar densidad visual para móvil

La app debe sentirse nativa, confiable y rápida.

---

## Componentes base obligatorios
Siempre que sea posible, construir o reutilizar estos componentes base:

- PrimaryButton
- SecondaryButton
- TertiaryButton o TextButton
- AppTextField
- AppSearchField
- AppSelect
- AppCard
- StatusBadge
- SectionHeader
- AppTopBar / Header
- BottomNavigation / SideNavigation
- MetricCard
- EmptyState
- LoadingState
- ErrorState
- SuccessState
- ConfirmationDialog
- DataTable / ListItem
- TrackingStep / TimelineItem

No crear variantes arbitrarias si el sistema puede absorberlas con props y tokens.

---

## Estados visuales obligatorios
Cada módulo crítico debe contemplar explícitamente:

- loading
- empty
- error
- success
- disabled
- offline o sin datos si aplica
- actualización en proceso si aplica

Nunca dejar estados sin resolver visualmente.

---

## Lenguaje del producto
El tono del producto debe ser:
- profesional
- directo
- claro
- empresarial
- operativo
- confiable

Evitar textos vagos, informales o ambiguos.
Los labels, botones y mensajes deben ser funcionales y comprensibles.

---

## Integración con OpenAI
Toda integración con OpenAI debe cumplir estas reglas:

- backend intermediario obligatorio
- la API key existe solo en servidor
- web y Android consumen endpoints propios de JoathiVA
- no exponer secretos en cliente
- usar variables de entorno
- definir manejo de errores
- definir límites
- definir logs
- definir timeouts
- contemplar fallback si el servicio falla

Nunca colocar OPENAI_API_KEY en:
- JavaScript frontend
- Android app
- repositorio
- ejemplos visibles al usuario
- archivos de configuración cliente

---

## Seguridad y datos
Siempre asumir que JoathiVA puede tratar información sensible operativa o comercial.

Por lo tanto:
- minimizar exposición de datos
- evitar logs innecesarios con datos delicados
- sanear inputs
- validar respuestas externas
- no mostrar errores internos crudos al usuario final
- documentar supuestos de seguridad

---

## Estrategia de implementación preferida
Aplicar mejoras en este orden:

### Fase 1
Base visual:
- tokens
- tema
- tipografía
- espaciado
- sombras
- shapes
- sistema base de colores

### Fase 2
Componentes reutilizables:
- botones
- inputs
- cards
- badges
- headers
- estados

### Fase 3
Pantallas prioritarias:
- login
- dashboard
- tracking
- cotizador
- pedidos / cargas
- detalle operativo
- perfil / configuración

### Fase 4
QA y consistencia:
- limpieza
- accesibilidad básica
- responsividad
- validación visual cruzada
- corrección de inconsistencias

No rediseñar todo de golpe sin una base reutilizable.

---

## Regla sobre deuda técnica
Si detectas deuda técnica:
1. descríbela
2. clasifícala por impacto
3. propone solución
4. implementa solo si no pone en riesgo el objetivo actual

No uses la tarea actual como excusa para reescribir todo el proyecto.

---

## Reglas de documentación
Cada entrega debe incluir siempre:

1. Resumen ejecutivo
2. Qué problema se resolvió
3. Qué archivos fueron modificados
4. Qué archivos fueron creados
5. Riesgos detectados
6. Validaciones realizadas
7. Próximos pasos sugeridos

Si hubo una decisión relevante, documentar el motivo.

---

## Validaciones mínimas obligatorias
Antes de cerrar cualquier tarea, confirmar:

- build correcto
- imports correctos
- navegación intacta
- componentes reutilizables coherentes
- sin credenciales expuestas
- sin errores obvios de compilación
- sin duplicación innecesaria
- consistencia visual razonable
- impacto funcional entendido

Si no puedes validar algo, dilo explícitamente.

---

## Criterio de calidad esperado
Una implementación correcta en JoathiVA debe ser:

- estable
- mantenible
- elegante
- consistente
- empresarial
- segura
- clara para el usuario
- útil para la operación
- favorable para la percepción comercial

No entregar soluciones simplemente “funcionales”.
Deben verse y sentirse profesionales.

---

## Comportamiento esperado del agente
Debes trabajar como arquitecto + implementador responsable.

Eso implica:
- pensar antes de tocar
- simplificar antes de duplicar
- centralizar antes de dispersar
- validar antes de cerrar
- explicar antes de romper
- proteger antes de exponer

Si una decisión tiene trade-offs, menciónalos.

Si algo es incierto, dilo.
Si algo no puede validarse, dilo.
Si algo puede romper producción, frénalo y explícalo.
