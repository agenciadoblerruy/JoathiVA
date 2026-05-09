package com.joathiva.transportista.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.joathiva.transportista.ui.viewmodel.TransportViewModel

@Composable fun LoginScreen(vm: TransportViewModel, onSuccess: () -> Unit) {
    val st by vm.uiState.collectAsState()
    var u by remember { mutableStateOf("") }
    var p by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Joathi Transportista", style = MaterialTheme.typography.headlineSmall)
        Text("POC JoathiVA · ejecución móvil del transportista")
        OutlinedTextField(u, { u = it }, label = { Text("Usuario") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(p, { p = it }, label = { Text("Clave") }, modifier = Modifier.fillMaxWidth())
        Button(
            onClick = {
                vm.login(u, p)
                if (u.isNotBlank() && p.isNotBlank()) onSuccess()
            },
            modifier = Modifier.fillMaxWidth()
        ) { Text("Ingresar") }
        st.message?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
    }
}

@Composable fun HomeScreen(vm: TransportViewModel, nav: NavController) {
    val st by vm.uiState.collectAsState()
    val d = st.detail
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Mi jornada", style = MaterialTheme.typography.headlineSmall)
        Text("Operación: ${d?.operationId}")
        Text("Estado: ${d?.execution?.executionStatus}")
        Text("Destino: ${d?.routePlan?.destinationLabel}")
        Text("ETA: ${d?.routePlan?.etaEstimatedAt}")
        Text("Eventos generados: ${st.events.size}")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button({ nav.navigate("assignments") }) { Text("Operaciones") }
            Button({ nav.navigate("detail") }) { Text("Detalle") }
        }
        Button(onClick = { nav.navigate("tracking") }, modifier = Modifier.fillMaxWidth()) { Text("Viaje en curso") }
        Button(onClick = { nav.navigate("events") }, modifier = Modifier.fillMaxWidth()) { Text("Bitácora de eventos") }
    }
}

@Composable fun AssignmentsScreen(vm: TransportViewModel, nav: NavController) {
    val d by vm.uiState.collectAsState()
    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Mis operaciones asignadas", style = MaterialTheme.typography.headlineSmall)
        d.detail?.let {
            Card(Modifier.fillMaxWidth().padding(top = 8.dp)) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Operación ${it.operationId}", fontWeight = FontWeight.Bold)
                    Text("Unidad ${it.assignment.vehicleId}")
                    Text("Destino ${it.routePlan.destinationLabel}")
                    Button({ nav.navigate("detail") }) { Text("Abrir") }
                }
            }
        }
    }
}

@Composable fun OperationDetailScreen(vm: TransportViewModel, nav: NavController) {
    val st by vm.uiState.collectAsState()
    val status = st.detail?.execution?.executionStatus
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Text("Detalle de operación", style = MaterialTheme.typography.headlineSmall); Text("Estado actual: $status") }
        item { Row { Checkbox(st.gpsEnabled, { vm.setGpsEnabled(it) }); Text("GPS habilitado para demo") } }
        item { BigAction("Iniciar operación") { vm.startOperation() } }
        item { BigAction("Iniciar carga") { vm.startLoading() } }
        item { BigAction("Finalizar carga") { vm.finishLoading() } }
        item { BigAction("Iniciar viaje") { vm.startTrip() } }
        item { BigAction("Confirmar llegada") { vm.arrive() } }
        item { BigAction("Iniciar descarga") { vm.startUnloading() } }
        item { BigAction("Finalizar descarga") { vm.finishUnloading() } }
        item { BigAction("Finalizar operación") { vm.finishOperation() } }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button({ nav.navigate("incident") }) { Text("Reportar problema") }
                Button({ nav.navigate("evidence") }) { Text("Evidencias") }
            }
        }
        item { Button({ nav.navigate("events") }, modifier = Modifier.fillMaxWidth()) { Text("Ver bitácora") } }
        st.message?.let { item { Text(it, color = MaterialTheme.colorScheme.primary) } }
    }
}

@Composable fun TrackingScreen(vm: TransportViewModel, nav: NavController) {
    val st by vm.uiState.collectAsState()
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Viaje en curso", style = MaterialTheme.typography.headlineSmall)
        Text("Mapa demo: la integración con Google Maps Compose queda preparada para la siguiente fase.")
        Text("Distancia estimada: ${st.detail?.routePlan?.distanceKmEstimated} km")
        Text("Duración estimada: ${st.detail?.routePlan?.durationMinEstimated} min")
        Text("Tracking session: ${st.detail?.execution?.activeTrackingSessionId ?: "sin iniciar"}")
        Button({ nav.navigate("incident") }, modifier = Modifier.fillMaxWidth()) { Text("Reportar problema") }
        Button({ nav.navigate("evidence") }, modifier = Modifier.fillMaxWidth()) { Text("Cargar evidencia") }
    }
}

@Composable fun IncidentScreen(vm: TransportViewModel, nav: NavController) {
    var type by remember { mutableStateOf("demora en acceso") }
    var comment by remember { mutableStateOf("Demora de 20 minutos por control de ingreso") }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Reportar problema", style = MaterialTheme.typography.headlineSmall)
        OutlinedTextField(type, { type = it }, label = { Text("Tipo") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(comment, { comment = it }, label = { Text("Comentario") }, modifier = Modifier.fillMaxWidth())
        Button({ vm.reportIncident(type, comment); nav.popBackStack() }, modifier = Modifier.fillMaxWidth()) { Text("Enviar") }
    }
}

@Composable fun EvidenceScreen(vm: TransportViewModel, nav: NavController) {
    var type by remember { mutableStateOf("foto de remito") }
    var comment by remember { mutableStateOf("Remito firmado por recepción") }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Evidencias", style = MaterialTheme.typography.headlineSmall)
        Text("Captura demo: la cámara real se conectará con ActivityResultContracts.TakePicture.")
        OutlinedTextField(type, { type = it }, label = { Text("Tipo evidencia") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(comment, { comment = it }, label = { Text("Comentario") }, modifier = Modifier.fillMaxWidth())
        Button({ vm.uploadEvidence(type, comment); nav.popBackStack() }, modifier = Modifier.fillMaxWidth()) { Text("Subir evidencia") }
    }
}

@Composable fun EventsScreen(vm: TransportViewModel) {
    val st by vm.uiState.collectAsState()
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Text("Bitácora de eventos", style = MaterialTheme.typography.headlineSmall) }
        if (st.events.isEmpty()) {
            item { Text("Aún no hay eventos. Ejecuta acciones de la operación para generar trazabilidad.") }
        } else {
            items(st.events.asReversed()) { event ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(event.code, fontWeight = FontWeight.Bold)
                        Text(event.title)
                        Text(event.happenedAt, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

@Composable fun HistoryScreen(vm: TransportViewModel) {
    val st by vm.uiState.collectAsState()
    LazyColumn(Modifier.fillMaxSize().padding(16.dp)) { items(st.history) { Text(it) } }
}

@Composable fun ProfileScreen(vm: TransportViewModel) {
    val st by vm.uiState.collectAsState()
    Column(Modifier.fillMaxSize().padding(16.dp)) { Text("Perfil"); Text("GPS: ${if (st.gpsEnabled) "activo" else "inactivo"}") }
}

@Composable fun BigAction(label: String, onClick: () -> Unit) = Button(onClick, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(label) }
