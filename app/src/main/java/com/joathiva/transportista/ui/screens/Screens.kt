package com.joathiva.transportista.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.joathiva.transportista.core.model.ExecutionStatus
import com.joathiva.transportista.ui.viewmodel.TransportViewModel

@Composable fun LoginScreen(vm: TransportViewModel, onSuccess: () -> Unit) { var u by remember { mutableStateOf("") }; var p by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Joathi Transportista", style = MaterialTheme.typography.headlineSmall)
        OutlinedTextField(u, { u = it }, label = { Text("Usuario") })
        OutlinedTextField(p, { p = it }, label = { Text("Clave") })
        Button(onClick = { vm.login(u, p); onSuccess() }, modifier = Modifier.fillMaxWidth()) { Text("Ingresar") }
    }}

@Composable fun HomeScreen(vm: TransportViewModel, nav: NavController) { val st by vm.uiState.collectAsState(); val d = st.detail
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Mi jornada", style = MaterialTheme.typography.headlineSmall)
        Text("Estado: ${d?.execution?.executionStatus}")
        Text("Destino: ${d?.routePlan?.destinationLabel}")
        Text("ETA: ${d?.routePlan?.etaEstimatedAt}")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Button({ nav.navigate("assignments") }) { Text("Operaciones") }; Button({ nav.navigate("detail") }) { Text("Detalle") } }
        Button(onClick = { nav.navigate("tracking") }, modifier = Modifier.fillMaxWidth()) { Text("Viaje en curso") }
    }}

@Composable fun AssignmentsScreen(vm: TransportViewModel, nav: NavController) { val d by vm.uiState.collectAsState()
    Column(Modifier.fillMaxSize().padding(16.dp)) { Text("Mis operaciones asignadas")
        d.detail?.let { Card(Modifier.fillMaxWidth().padding(top = 8.dp)) { Column(Modifier.padding(12.dp)) { Text("Operación ${it.operationId}"); Text("Unidad ${it.assignment.vehicleId}"); Button({ nav.navigate("detail") }) { Text("Abrir") } } } }
    }}

@Composable fun OperationDetailScreen(vm: TransportViewModel, nav: NavController) { val st by vm.uiState.collectAsState(); val status = st.detail?.execution?.executionStatus
    LazyColumn(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Text("Detalle de operación") ; Text("Estado actual: $status") }
        item { Row { Checkbox(st.gpsEnabled, { vm.setGpsEnabled(it) }); Text("GPS habilitado") } }
        item { BigAction("Iniciar operación") { vm.startOperation() } }
        item { BigAction("Iniciar carga") { vm.startLoading() } }
        item { BigAction("Finalizar carga") { vm.finishLoading() } }
        item { BigAction("Iniciar viaje") { vm.startTrip() } }
        item { BigAction("Confirmar llegada") { vm.arrive() } }
        item { BigAction("Iniciar descarga") { vm.startUnloading() } }
        item { BigAction("Finalizar descarga") { vm.finishUnloading() } }
        item { BigAction("Finalizar operación") { vm.finishOperation() } }
        item { Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { Button({ nav.navigate("incident") }) { Text("Reportar problema") }; Button({ nav.navigate("evidence") }) { Text("Evidencias") } } }
        st.message?.let { item { Text(it, color = MaterialTheme.colorScheme.primary) } }
    }}

@Composable fun TrackingScreen(vm: TransportViewModel, nav: NavController) { val st by vm.uiState.collectAsState()
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Viaje en curso")
        Text("Mapa: placeholder (integrar Google Maps SDK)")
        Text("Distancia estimada: ${st.detail?.routePlan?.distanceKmEstimated} km")
        Button({ nav.navigate("incident") }, modifier = Modifier.fillMaxWidth()) { Text("Reportar problema") }
        Button({ nav.navigate("evidence") }, modifier = Modifier.fillMaxWidth()) { Text("Cargar evidencia") }
    }}

@Composable fun IncidentScreen(vm: TransportViewModel, nav: NavController) { var type by remember { mutableStateOf("tráfico") }; var comment by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Reportar problema"); OutlinedTextField(type, { type = it }, label = { Text("Tipo") }); OutlinedTextField(comment, { comment = it }, label = { Text("Comentario") })
        Button({ vm.reportIncident(type, comment); nav.popBackStack() }, modifier = Modifier.fillMaxWidth()) { Text("Enviar") }
    }}

@Composable fun EvidenceScreen(vm: TransportViewModel, nav: NavController) { var type by remember { mutableStateOf("foto") }; var comment by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("Evidencias"); Text("Cámara: placeholder (integrar ActivityResultContracts.TakePicture)")
        OutlinedTextField(type, { type = it }, label = { Text("Tipo evidencia") }); OutlinedTextField(comment, { comment = it }, label = { Text("Comentario") })
        Button({ vm.uploadEvidence(type, comment); nav.popBackStack() }, modifier = Modifier.fillMaxWidth()) { Text("Subir evidencia") }
    }}

@Composable fun HistoryScreen(vm: TransportViewModel) { val st by vm.uiState.collectAsState(); LazyColumn(Modifier.fillMaxSize().padding(16.dp)) { items(st.history) { Text(it) } } }
@Composable fun ProfileScreen(vm: TransportViewModel) { val st by vm.uiState.collectAsState(); Column(Modifier.fillMaxSize().padding(16.dp)) { Text("Perfil"); Text("GPS: ${if (st.gpsEnabled) "activo" else "inactivo"}") } }
@Composable fun BigAction(label: String, onClick: () -> Unit) = Button(onClick, modifier = Modifier.fillMaxWidth().height(52.dp)) { Text(label) }
