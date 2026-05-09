package com.joathiva.transportista.data.repository

import com.joathiva.transportista.core.model.*
import kotlinx.coroutines.delay
import java.time.Instant
import java.util.UUID

class TransportRepository {
    private val events = mutableListOf<TransportEvent>()
    private var detail = fakeDetail()

    suspend fun login(username: String, password: String): Boolean { delay(250); return username.isNotBlank() && password.isNotBlank() }
    suspend fun assignments() = listOf(detail.assignment)
    suspend fun operationDetail(operationId: String) = detail
    suspend fun history() = listOf("OP-JVA-2026-039 completada · Entrega sin incidencias", "OP-JVA-2026-038 completada · Evidencia validada")
    fun events() = events.toList()

    suspend fun startOperation(gpsEnabled: Boolean): Result<Unit> {
        if (!gpsEnabled) return Result.failure(IllegalStateException("GPS requerido"))
        detail = detail.copy(execution = detail.execution.copy(executionStatus = ExecutionStatus.OPERATION_STARTED, activeTrackingSessionId = "TRK-JVA-041"))
        addEvent("operation_started", "Operación iniciada")
        addEvent("gps_tracking_started", "Tracking GPS iniciado")
        return Result.success(Unit)
    }

    suspend fun startLoading() = transition(ExecutionStatus.OPERATION_STARTED, ExecutionStatus.LOADING, "loading_started", "Carga iniciada")
    suspend fun finishLoading() = transition(ExecutionStatus.LOADING, ExecutionStatus.LOADED, "loading_finished", "Carga finalizada")
    suspend fun startTrip() = transition(ExecutionStatus.LOADED, ExecutionStatus.IN_TRANSIT, "trip_started", "Viaje iniciado")
    suspend fun arrive() = transition(ExecutionStatus.IN_TRANSIT, ExecutionStatus.ARRIVED, "arrival_detected", "Llegada confirmada")
    suspend fun startUnloading() = transition(ExecutionStatus.ARRIVED, ExecutionStatus.UNLOADING, "unloading_started", "Descarga iniciada")
    suspend fun finishUnloading() = transition(ExecutionStatus.UNLOADING, ExecutionStatus.UNLOADED, "unloading_finished", "Descarga finalizada")
    suspend fun finishOperation() = transition(ExecutionStatus.UNLOADED, ExecutionStatus.COMPLETED, "operation_finished", "Operación finalizada")

    suspend fun reportIncident(type: String, comment: String) {
        val suffix = comment.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""
        addEvent("issue_reported", "Incidencia: $type$suffix")
    }

    suspend fun uploadEvidence(type: String, comment: String) {
        val suffix = comment.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""
        addEvent("evidence_uploaded", "Evidencia subida: $type$suffix")
    }

    private fun addEvent(code: String, title: String) {
        events.add(TransportEvent(UUID.randomUUID().toString(), detail.operationId, detail.execution.id, code, title, Instant.now().toString()))
    }

    private suspend fun transition(from: ExecutionStatus, to: ExecutionStatus, code: String, title: String): Result<Unit> {
        if (detail.execution.executionStatus != from) return Result.failure(IllegalStateException("Transición inválida"))
        detail = detail.copy(execution = detail.execution.copy(executionStatus = to))
        addEvent(code, title)
        return Result.success(Unit)
    }

    private fun fakeDetail(): TransportOperationDetailDto {
        val operationId = "OP-JVA-2026-041"
        val assignmentId = "ASG-JVA-041"
        val executionId = "EXE-JVA-041"
        val assignment = TransportOperationAssignment(
            id = assignmentId,
            operationId = operationId,
            providerId = "PROV-ANDES-LOG",
            driverId = "DRV-RODRIGO-H",
            vehicleId = "TRACTO-VA-247",
            assignmentStatus = "assigned"
        )
        val execution = TransportExecution(executionId, operationId, assignmentId, ExecutionStatus.NOT_STARTED, null)
        val route = RoutePlan(
            id = "RTE-JVA-041",
            operationId = operationId,
            executionId = executionId,
            destinationLabel = "Centro de Distribución Norte · Andén 4",
            distanceKmEstimated = 42.7,
            durationMinEstimated = 78,
            etaEstimatedAt = "2026-05-07T16:30:00Z"
        )
        val checklist = listOf(
            TransportChecklistItem("CK-JVA-041-1", operationId, executionId, "task", "Verificar precintos", "pending"),
            TransportChecklistItem("CK-JVA-041-2", operationId, executionId, "document", "Confirmar remito digital", "pending"),
            TransportChecklistItem("CK-JVA-041-3", operationId, executionId, "safety", "Validar EPP y estado de unidad", "pending")
        )
        val documents = listOf(
            TransportDocumentAccess("DOC-JVA-041-1", operationId, "remito", "Remito digital", true),
            TransportDocumentAccess("DOC-JVA-041-2", operationId, "orden", "Orden de transporte", true)
        )
        return TransportOperationDetailDto(operationId, assignment, execution, route, checklist, documents)
    }
}
