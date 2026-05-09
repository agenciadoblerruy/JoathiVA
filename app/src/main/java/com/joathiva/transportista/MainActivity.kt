package com.joathiva.transportista

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import com.joathiva.transportista.ui.navigation.AppNavGraph
import com.joathiva.transportista.ui.viewmodel.TransportViewModel

class MainActivity : ComponentActivity() {
    private val vm = TransportViewModel()
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { Surface(color = MaterialTheme.colorScheme.background) { AppNavGraph(vm) } }
    }
}
