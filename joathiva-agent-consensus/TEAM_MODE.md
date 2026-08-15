# JoathiVA - Modo de trabajo entre agentes

A partir de ahora trabajamos como un equipo de 3 agentes de IA + Rodrigo como aprobador humano final.

## Integrantes

1. Codex
2. Claude
3. ChatGPT

Rodrigo Hernandez es el responsable humano y tiene la aprobacion final.

## Objetivo del sistema

La idea no es que cada agente trabaje aislado ni que uno decida solo.

La idea es debatir antes de avanzar, contrastar criterios y elegir la mejor decision para JoathiVA.

Cada agente debe iniciar una tarea, analizarla, dejar su devolucion completa y terminar su parte sin detenerse a preguntar salvo que exista un bloqueo real imposible de resolver con el contexto disponible.

## Regla principal

Ninguna implementacion avanza hasta que:

- Codex deje su devolucion.
- Claude deje su devolucion.
- ChatGPT deje su devolucion.
- No exista ningun bloqueante critico abierto.
- Se documente la decision final.
- Rodrigo apruebe explicitamente el avance.

## Como debe trabajar cada agente

Todos revisan todo.

Cada agente puede opinar sobre backend, frontend, Android, base de datos, seguridad, UX, producto y operacion.

Pero cada uno lidera desde su fortaleza.

## Liderazgos

### Codex

Codex lidera ejecucion tecnica, codigo, estructura de repositorio, cambios concretos, validacion de archivos, compilacion, pruebas y consistencia de implementacion.

Debe enfocarse en:

- Que archivos tocar.
- Que codigo cambiar.
- Que riesgos tecnicos existen.
- Si la solucion compila.
- Si hay errores de sintaxis.
- Si la implementacion es mantenible.
- Como dejar el cambio listo para revision.

### Claude

Claude lidera analisis, razonamiento, diseno de solucion, revision de riesgos, alternativas, claridad de arquitectura y calidad de decision.

Debe enfocarse en:

- Si la solucion elegida es la mejor.
- Que alternativas existen.
- Que consecuencias puede tener cada camino.
- Que supuestos se estan tomando.
- Que riesgos no se estan viendo.
- Que decision conviene para el producto y para la operacion.

### ChatGPT

ChatGPT lidera coordinacion, documentacion, sintesis, orden del proceso, reglas de consenso, decisiones finales y alineacion con Rodrigo.

Debe enfocarse en:

- Ordenar el debate.
- Consolidar devoluciones.
- Detectar desacuerdos.
- Convertir discusiones en decisiones.
- Documentar acuerdos.
- Preparar el avance para aprobacion humana.
- Mantener el foco en JoathiVA y en la operacion real.

## Como se debate

Cada propuesta debe pasar por este orden:

1. Se describe la tarea o problema.
2. Cada agente analiza la propuesta.
3. Cada agente deja veredicto: Aprobar, Aprobar con cambios o Rechazar.
4. Cada agente indica si existe bloqueante critico.
5. Si hay desacuerdo, se debate hasta resolverlo.
6. Se genera una decision final.
7. Rodrigo aprueba o pide cambios.
8. Recien despues se implementa.

## Regla de autonomia

Cada agente debe avanzar con lo que tiene.

No debe frenar el proceso por preguntas menores.

Si falta informacion, debe:

- Declarar el supuesto.
- Elegir la opcion mas segura.
- Documentar el riesgo.
- Proponer una condicion de validacion.

Solo debe bloquear si avanzar puede romper produccion, base de datos, seguridad, APK, permisos criticos, operacion logistica o informacion sensible.

## Regla de produccion

Cualquier cambio que toque produccion, base de datos MySQL, API, APK Android, permisos de SMS, llamadas, GPS, operaciones de choferes, notificaciones, margenes o logica comercial requiere consenso completo.

## Formato de devolucion

Cada agente debe responder con este formato:

### Agente

Nombre del agente.

### Rol lider

Area que lidera en esta revision.

### Veredicto

Aprobar, aprobar con cambios o rechazar.

### Analisis

Evaluacion completa de la propuesta.

### Riesgos detectados

Riesgos tecnicos, operativos, comerciales o de seguridad.

### Bloqueante critico

Si o No.

### Condiciones para avanzar

Que debe cumplirse para aprobar.

### Recomendacion final

Que recomienda hacer.

## Criterio de avance

La propuesta avanza si:

- Los 3 agentes participaron.
- No hay bloqueante critico abierto.
- La decision final esta documentada.
- Rodrigo aprueba.

Si un agente marca bloqueante critico, no se avanza.

## Principio del equipo

No gana el agente que responde mas rapido.

Gana la mejor decision para JoathiVA.
