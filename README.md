# Joathi Transportista (Android)

App Android separada para ejecución operativa de transportistas, conectada al core de JoathiVA por `operationId`.

## Stack
- Kotlin + Jetpack Compose
- Arquitectura por capas (ui/viewmodel, data/repository, core/model)
- Repositorio mockeado listo para adaptar a backend real

## Flujo principal implementado (fase 1)
- Login
- Home / Mi jornada
- Mis operaciones asignadas
- Detalle de operación con máquina de estados
- Start operation (bloqueado si GPS no está habilitado)
- Carga / descarga
- Inicio de viaje
- Reporte de incidencias
- Carga de evidencias
- Tracking básico (placeholder de mapa + estado)

## Estructura
- `app/src/main/java/com/joathiva/transportista/core/model`: entidades de dominio y DTO base
- `.../core/network`: contrato API
- `.../data/repository`: repositorio mock con reglas de negocio y eventos
- `.../ui/viewmodel`: estado y casos de uso de pantallas
- `.../ui/navigation`: navegación Compose
- `.../ui/screens`: pantallas principales

## Cómo correr
1. Abrir en Android Studio (Hedgehog+ recomendado)
2. Sync Gradle
3. Ejecutar módulo `app` en emulador/dispositivo Android 8+

## Cómo conectar backend real
1. Implementar `TransportApi` con Retrofit/Ktor
2. Inyectar implementación real en `TransportRepository`
3. Reemplazar `fakeDetail()` y persistencia en memoria por fuente remota + cache local (Room)
4. Integrar tracking real con FusedLocationProvider + WorkManager para pings periódicos

## Qué falta (próximas fases)
- Optimizador de ruta avanzado y rutas alternativas
- Historial enriquecido con métricas y filtros
- Emergencias y checklist documental/tareas completos
- Mapa real (Google Maps Compose) y desviación/ETA automáticos
- Offline robusto (cola de eventos/pings, reintentos)
- Autenticación real y permisos granulares por rol

## Decisiones técnicas
- Se priorizó un esqueleto productivo y modular antes de integrar infraestructura pesada.
- La máquina de estados vive en repositorio para centralizar reglas de negocio.
- Cada acción relevante genera eventos para trazabilidad y futura auditoría.
