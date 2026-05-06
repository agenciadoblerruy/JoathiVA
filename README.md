# Joathi Transportista (Android)

App Android separada para ejecución operativa de transportistas, conectada al core de JoathiVA por `operationId`.

## Stack
- Kotlin + Jetpack Compose
- Arquitectura por capas (ui/viewmodel, data/repository, core/model)
- Repositorio mockeado listo para adaptar a backend real
- Workflow de GitHub Actions para validar `:app:assembleDebug`

## Flujo principal implementado (fase 1)
- Login demo con validación de usuario y clave no vacíos
- Home / Mi jornada
- Mis operaciones asignadas
- Detalle de operación con máquina de estados
- Start operation bloqueado si GPS demo no está habilitado
- Carga / descarga
- Inicio de viaje y confirmación de llegada
- Reporte de incidencias
- Carga de evidencias demo
- Tracking básico con datos de ruta y tracking session
- Bitácora de eventos generados por acciones críticas

## Operación demo
- Operación: `OP-JVA-2026-041`
- Unidad: `TRACTO-VA-247`
- Destino: Centro de Distribución Norte · Andén 4
- Tracking session: `TRK-JVA-041`

## Estructura
- `app/src/main/java/com/joathiva/transportista/core/model`: entidades de dominio y DTO base
- `.../core/network`: contrato API
- `.../data/repository`: repositorio mock con reglas de negocio y eventos
- `.../ui/viewmodel`: estado y casos de uso de pantallas
- `.../ui/navigation`: navegación Compose
- `.../ui/screens`: pantallas principales
- `docs/POC_JOATHIVA_TRANSPORTISTA.md`: guion y checklist de demo

## Cómo correr localmente
1. Abrir en Android Studio Hedgehog+.
2. Sync Gradle.
3. Ejecutar módulo `app` en emulador/dispositivo Android 8+.
4. Login: usar cualquier usuario y clave no vacíos.

## Validación CI
El workflow `.github/workflows/android-build.yml` ejecuta:

```bash
gradle :app:assembleDebug --stacktrace
```

## Cómo conectar backend real
1. Implementar `TransportApi` con Retrofit/Ktor.
2. Inyectar implementación real en `TransportRepository`.
3. Reemplazar `fakeDetail()` y persistencia en memoria por fuente remota + cache local (Room).
4. Integrar tracking real con FusedLocationProvider + WorkManager para pings periódicos.
5. Persistir eventos, incidencias y evidencias contra backend real.

## Qué falta (próximas fases)
- Optimizador de ruta avanzado y rutas alternativas
- Historial enriquecido con métricas y filtros
- Emergencias y checklist documental/tareas completos
- Mapa real con Google Maps Compose y desviación/ETA automáticos
- Offline robusto con cola de eventos/pings y reintentos
- Autenticación real y permisos granulares por rol
- Cámara real y subida de archivos para evidencias
- Pruebas unitarias de máquina de estados y pruebas UI Compose

## Decisiones técnicas
- Se priorizó un esqueleto productivo y modular antes de integrar infraestructura pesada.
- La máquina de estados vive en repositorio para centralizar reglas de negocio.
- Cada acción relevante genera eventos para trazabilidad y futura auditoría.
- La POC valida flujo operativo y experiencia móvil; el backend completo queda fuera del alcance de demo.
