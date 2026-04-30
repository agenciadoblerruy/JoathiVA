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
    suspend fun history() = listOf("OP-2026-001 completada", "OP-2026-000 completada")
    fun events() = events.toList()

    suspend fun startOperation(gpsEnabled: Boolean): Result<Unit> {
        if (!gpsEnabled) return Result.failure(IllegalStateException("GPS requerido"))
        detail = detail.copy(execution = detail.execution.copy(executionStatus = ExecutionStatus.OPERATION_STARTED, activeTrackingSessionId = "trk-1"))
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
        addEvent("issue_reported", "Incidencia: $type")
    }

    suspend fun uploadEvidence(type: String, comment: String) {
        addEvent("evidence_uploaded", "Evidencia subida: $type")
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
        val assignment = TransportOperationAssignment("asg-1", "op-1", "provider-1", "driver-1", "truck-42", "assigned")
        val execution = TransportExecution("exe-1", "op-1", "asg-1", ExecutionStatus.NOT_STARTED, null)
        val route = RoutePlan("route-1", "op-1", "exe-1", "Centro de distribución Norte", 42.0, 80, "2026-04-30T17:00:00Z")
        return TransportOperationDetailDto("op-1", assignment, execution, route, listOf(TransportChecklistItem("ck-1", "op-1", "exe-1", "task", "Verificar precintos", "pending")), listOf(TransportDocumentAccess("doc-1", "op-1", "remito", "Remito digital", true)))
    }
}
