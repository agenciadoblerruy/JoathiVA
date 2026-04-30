package com.joathiva.transportista.core.network

interface TransportApi {
    suspend fun getMyActiveAssignments(): String
    suspend fun getOperation(operationId: String): String
    suspend fun startOperation(executionId: String, body: String): String
    suspend fun startLoading(executionId: String, body: String): String
    suspend fun finishLoading(executionId: String, body: String): String
    suspend fun startTrip(executionId: String, body: String): String
    suspend fun reportIncident(executionId: String, body: String): String
    suspend fun uploadEvidence(executionId: String, body: String): String
}
