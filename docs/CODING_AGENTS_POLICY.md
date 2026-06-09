# Política operativa de agentes Codex - JoathiVA

## Objetivo
Permitir trabajo paralelo entre dos agentes Codex sin superposición, pérdida de cambios ni conflictos innecesarios.

## Agentes
- agente desktop: `agencia.doblerruy`
- agente web: `rhernand14`

## Regla principal
Ningún agente debe modificar en paralelo el mismo archivo que el otro agente tenga reservado.

## Principios
1. Una rama por agente y por tarea
2. Un bloque de archivos reservado por tarea
3. No editar el mismo archivo en paralelo
4. Merges pequeños y frecuentes
5. Documentar siempre qué está “en curso”
6. No reescribir arquitectura sin acuerdo previo
7. No borrar ni revertir trabajo del otro agente
8. Si hay conflicto, prevalece el archivo reservado en la bitácora activa

## Clasificación de áreas
### Área desktop
Backend, integraciones, scripts, PowerShell, Lucía, Outlook assistant, Android, QA técnico, rutas dinámicas, auth.

### Área web
Frontend `V/v1`, perfiles, dashboards, cotizador UI, provider UI, commercial_ops UI, documentación funcional, copy, layout y UX.

## Regla de exclusión
Si un archivo está en “WIP” para un agente, el otro agente no puede modificarlo hasta que:
- el primero cierre tarea
- o se libere explícitamente

## Regla de prompts
Todo prompt enviado a Codex debe indicar:
- agente
- rama objetivo
- archivos permitidos
- archivos prohibidos
- alcance exacto
- instrucción explícita de no tocar trabajo paralelo

## Regla de seguridad
No usar “refactor global”, “cleanup general”, “reorganizar todo”, “alinear todo el proyecto” si el otro agente está trabajando en paralelo.

## Regla de integración
Antes de integrar cambios:
1. revisar bitácora
2. revisar archivos reservados
3. hacer merge chico
4. actualizar estado
