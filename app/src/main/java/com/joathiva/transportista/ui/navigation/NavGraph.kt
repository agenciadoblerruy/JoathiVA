package com.joathiva.transportista.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.joathiva.transportista.ui.screens.*
import com.joathiva.transportista.ui.viewmodel.TransportViewModel

@Composable
fun AppNavGraph(vm: TransportViewModel) {
    val nav = rememberNavController()
    val state by vm.uiState.collectAsState()
    NavHost(navController = nav, startDestination = if (state.loggedIn) "home" else "login") {
        composable("login") { LoginScreen(vm) { nav.navigate("home") { popUpTo("login") { inclusive = true } } } }
        composable("home") { HomeScreen(vm, nav) }
        composable("assignments") { AssignmentsScreen(vm, nav) }
        composable("detail") { OperationDetailScreen(vm, nav) }
        composable("tracking") { TrackingScreen(vm, nav) }
        composable("incident") { IncidentScreen(vm, nav) }
        composable("evidence") { EvidenceScreen(vm, nav) }
        composable("events") { EventsScreen(vm) }
        composable("history") { HistoryScreen(vm) }
        composable("profile") { ProfileScreen(vm) }
    }
}
