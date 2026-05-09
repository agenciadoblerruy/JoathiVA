package com.joathiva.transportista.core.model

enum class ExecutionStatus { NOT_STARTED, OPERATION_STARTED, LOADING, LOADED, IN_TRANSIT, ARRIVED, UNLOADING, UNLOADED, COMPLETED, PAUSED, INCIDENT, EMERGENCY }

data class TransportOperationAssignment(val id: String, val operationId: String, val providerId: String, val driverId: String, val vehicleId: String, val assignmentStatus: String)

data class TransportExecution(val id: String, val operationId: String, val assignmentId: String, val executionStatus: ExecutionStatus, val activeTrackingSessionId: String?)

data class TransportChecklistItem(val id: String, val operationId: String, val executionId: String, val checklistType: String, val label: String, val status: String)

data class TransportDocumentAccess(val id: String, val operationId: String, val category: String, val label: String, val visibleToDriver: Boolean)

data class RoutePlan(val id: String, val operationId: String, val executionId: String, val destinationLabel: String, val distanceKmEstimated: Double, val durationMinEstimated: Int, val etaEstimatedAt: String)

data class TransportEvent(val id: String, val operationId: String, val executionId: String?, val code: String, val title: String, val happenedAt: String)

data class TransportIncident(val id: String, val operationId: String, val executionId: String, val incidentType: String, val comment: String)

data class TransportEvidence(val id: String, val operationId: String, val executionId: String, val evidenceType: String, val fileName: String, val comment: String)

data class TransportOperationDetailDto(
    val operationId: String,
    val assignment: TransportOperationAssignment,
    val execution: TransportExecution,
    val routePlan: RoutePlan,
    val checklist: List<TransportChecklistItem>,
    val documents: List<TransportDocumentAccess>
)
