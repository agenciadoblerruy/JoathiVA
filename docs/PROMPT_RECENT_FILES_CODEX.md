# Prompt para Codex: ver y trabajar con archivos recientes

Trabaja sobre JoathiVA en el repositorio actual.

## Objetivo
Quiero que primero identifiques los archivos más recientes y relevantes del proyecto, y que trabajes solamente sobre esos archivos o sobre los que dependan directamente de ellos.

## Instrucciones
1. Revisa los archivos modificados recientemente en el repo o en el árbol de trabajo actual.
2. Prioriza archivos fuente reales, no artefactos generados.
3. Excluye de la revisión, salvo que se indique lo contrario:
   - `build/`
   - `intermediates/`
   - `.gradle/`
   - `__pycache__/`
   - `lint/`
   - outputs generados
   - caches
4. Clasifica los archivos recientes en:
   - fuente viva
   - documentación activa
   - script activo
   - artefacto generado
   - no tocar
5. Trabaja solo sobre:
   - archivos recientes que sean fuente viva
   - o archivos directamente relacionados que deban ajustarse para completar la tarea
6. No expandas el alcance sin necesidad.
7. No toques archivos reservados a otro agente si aparecen en `docs/governance/WORK_IN_PROGRESS.md`.
8. Si detectas trabajo paralelo, convive con él y limita tu cambio.
9. Indica siempre:
   - qué archivos recientes encontraste
   - cuáles elegiste tocar
   - cuáles descartaste por ser artefactos o por estar reservados

## Reglas de priorización
- Prioridad 1: archivos recientes y fuente viva
- Prioridad 2: dependencias directas de esos archivos
- Prioridad 3: documentación activa relacionada
- No tocar artefactos generados salvo que sean la única fuente real

## Entregable obligatorio
Devuelve en este orden:
1. resumen corto
2. lista de archivos recientes detectados
3. clasificación de cada archivo
4. archivos elegidos para trabajar
5. archivos descartados y por qué
6. cambios realizados
7. riesgos detectados
8. pendiente para segunda pasada

## Regla final
Haz cambios mínimos, seguros y compatibles.
No rehagas el proyecto.
Trabaja sobre lo reciente y relevante.
