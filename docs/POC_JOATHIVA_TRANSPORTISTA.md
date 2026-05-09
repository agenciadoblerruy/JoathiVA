# POC JoathiVA Transportista

Fecha objetivo: jueves 7 de mayo de 2026

## Objetivo

Demostrar que JoathiVA puede guiar la ejecucion operativa de un transportista de punta a punta, con maquina de estados y bitacora de eventos.

## Mensaje ejecutivo

JoathiVA valida el flujo operativo del transportista: asignacion, inicio con control de GPS demo, carga, viaje, llegada, descarga, cierre, incidencias, evidencias y bitacora. La app queda preparada para conectar backend real mediante la capa TransportApi.

## Demo de 5 minutos

1. Abrir app Joathi Transportista.
2. Iniciar sesion con usuario y clave no vacios.
3. Mostrar Home con operacion OP-JVA-2026-041.
4. Abrir operaciones asignadas y explicar unidad, destino y ETA.
5. Entrar al detalle de operacion.
6. Intentar iniciar sin GPS y mostrar bloqueo GPS requerido.
7. Activar GPS habilitado para demo.
8. Ejecutar inicio, carga, viaje, llegada, descarga y cierre.
9. Reportar incidencia demo.
10. Cargar evidencia demo.
11. Abrir Bitacora de eventos y explicar trazabilidad.

## Criterios de exito

- La app compila en Android Studio o mediante el workflow Android Build.
- La navegacion no se rompe durante el flujo completo.
- La operacion llega a estado COMPLETED.
- La bitacora muestra eventos generados por acciones criticas.
- La presentacion diferencia POC, mock controlado y backend real futuro.

## Guion sugerido

Esta POC muestra la experiencia movil del transportista dentro de JoathiVA. La app guia al usuario por una maquina de estados: inicio, carga, viaje, llegada, descarga y cierre. Cada accion critica genera un evento visible en la bitacora, lo que da trazabilidad operativa y base para auditoria, alertas, SLA y monitoreo. Hoy usamos datos mock controlados para validar flujo y UX. La arquitectura separa modelos, repositorio, ViewModel, navegacion, UI y contrato API para conectar backend real sin rehacer la experiencia.
