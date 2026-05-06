package com.joathiva.transportista.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.joathiva.transportista.core.model.ExecutionStatus
import com.joathiva.transportista.core.model.TransportEvent
import com.joathiva.transportista.core.model.TransportOperationDetailDto
import com.joathiva.transportista.data.repository.TransportRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TransportUiState(
    val loggedIn: Boolean = false,
    val detail: TransportOperationDetailDto? = null,
    val gpsEnabled: Boolean = false,
    val message: String? = null,
    val history: List<String> = emptyList(),
    val events: List<TransportEvent> = emptyList()
)

class TransportViewModel(private val repo: TransportRepository = TransportRepository()) : ViewModel() {
    private val _uiState = MutableStateFlow(TransportUiState())
    val uiState: StateFlow<TransportUiState> = _uiState.asStateFlow()

    fun login(user: String, pass: String) = viewModelScope.launch {
        if (repo.login(user, pass)) {
            _uiState.value = _uiState.value.copy(
                loggedIn = true,
                detail = repo.operationDetail("OP-JVA-2026-041"),
                history = repo.history(),
                events = repo.events(),
                message = "Sesión iniciada"
            )
        } else {
            _uiState.value = _uiState.value.copy(message = "Ingresa usuario y clave")
        }
    }

    fun setGpsEnabled(enabled: Boolean) { _uiState.value = _uiState.value.copy(gpsEnabled = enabled) }
    fun clearMessage() { _uiState.value = _uiState.value.copy(message = null) }

    fun startOperation() = exec { repo.startOperation(_uiState.value.gpsEnabled) }
    fun startLoading() = exec { repo.startLoading() }
    fun finishLoading() = exec { repo.finishLoading() }
    fun startTrip() = exec { repo.startTrip() }
    fun arrive() = exec { repo.arrive() }
    fun startUnloading() = exec { repo.startUnloading() }
    fun finishUnloading() = exec { repo.finishUnloading() }
    fun finishOperation() = exec { repo.finishOperation() }

    fun reportIncident(type: String, comment: String) = viewModelScope.launch { repo.reportIncident(type, comment); refresh("Incidencia reportada") }
    fun uploadEvidence(type: String, comment: String) = viewModelScope.launch { repo.uploadEvidence(type, comment); refresh("Evidencia cargada") }

    private fun exec(block: suspend () -> Result<Unit>) = viewModelScope.launch {
        val result = block()
        if (result.isFailure) refresh(result.exceptionOrNull()?.message ?: "Error") else refresh("Acción realizada")
    }

    private suspend fun refresh(message: String) {
        _uiState.value = _uiState.value.copy(
            detail = repo.operationDetail("OP-JVA-2026-041"),
            events = repo.events(),
            message = message
        )
    }

    fun currentStatus(): ExecutionStatus? = _uiState.value.detail?.execution?.executionStatus
}
