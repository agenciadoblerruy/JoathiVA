package com.joathi.portal

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebResourceErrorCompat
import androidx.webkit.WebResourceRequestCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import com.joathi.portal.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private var _binding: ActivityMainBinding? = null
    private val binding get() = _binding!!

    private lateinit var assetLoader: WebViewAssetLoader
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    
    private var pageLoadStartTime: Long = 0
    private var lastSyncedUrl: String? = null
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null
    private var pendingGeoOrigin: String? = null
    private var gpsTrackingForced = false

    private val filePickerLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = fileChooserCallback ?: return@registerForActivityResult
            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            callback.onReceiveValue(uris ?: emptyArray())
            fileChooserCallback = null
        }

    private val locationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { permissions ->
            val granted =
                permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                    permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true

            pendingGeoCallback?.invoke(pendingGeoOrigin, granted, false)
            if (!granted) {
                Toast.makeText(
                    this,
                    getString(R.string.location_permission_denied),
                    Toast.LENGTH_SHORT
                ).show()
            }
            pendingGeoCallback = null
            pendingGeoOrigin = null
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        _binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        configureWebView()
        bindBottomActions()
        bindBackNavigation()

        binding.swipeRefresh.setOnRefreshListener {
            binding.webView.reload()
        }
        binding.swipeRefresh.setColorSchemeResources(
            R.color.brand_secondary,
            R.color.brand_accent
        )
        binding.swipeRefresh.setProgressBackgroundColorSchemeResource(R.color.surface_soft)

        if (savedInstanceState == null) {
            loadRoute(PORTAL_HOME)
        } else {
            binding.webView.restoreState(savedInstanceState)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        binding.webView.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        applyGpsTrackingMode()
    }

    override fun onDestroy() {
        fileChooserCallback?.onReceiveValue(null)
        fileChooserCallback = null
        binding.webView.destroy()
        _binding = null // Critical: Nullify binding to prevent memory leaks
        super.onDestroy()
    }

    private fun configureWebView() {
        binding.webView.apply {
            setBackgroundColor(getColor(R.color.webview_background))

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                setGeolocationEnabled(true)
                allowContentAccess = true
                allowFileAccess = false
                cacheMode = WebSettings.LOAD_DEFAULT
                loadWithOverviewMode = true
                useWideViewPort = true
                builtInZoomControls = false
                displayZoomControls = false
                mediaPlaybackRequiresUserGesture = true
            }

            addJavascriptInterface(PortalBridge(), "JoathiVAAndroid")

            webViewClient = object : WebViewClientCompat() {
                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest
                ) = assetLoader.shouldInterceptRequest(request.url)

                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest
                ): Boolean = handleExternalNavigation(request.url)

                override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    pageLoadStartTime = System.currentTimeMillis()
                }

                override fun onPageFinished(view: WebView, url: String?) {
                    super.onPageFinished(view, url)
                    val duration = System.currentTimeMillis() - pageLoadStartTime
                    android.util.Log.d("Performance", "Page loaded in ${duration}ms: $url")
                    
                    binding.progressIndicator.visibility = View.GONE
                    binding.swipeRefresh.isRefreshing = false
                    syncBottomBar(url)
                }

                override fun onReceivedError(
                    view: WebView,
                    request: WebResourceRequest,
                    error: WebResourceErrorCompat
                ) {
                    super.onReceivedError(view, request, error)
                    if (request.isForMainFrame) {
                        binding.progressIndicator.visibility = View.GONE
                        binding.swipeRefresh.isRefreshing = false
                        Toast.makeText(
                            this@MainActivity,
                            getString(R.string.portal_load_error),
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    binding.progressIndicator.progress = newProgress
                    binding.progressIndicator.visibility =
                        if (newProgress >= 100) View.GONE else View.VISIBLE
                }

                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = filePathCallback

                    val pickerIntent = try {
                        fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                            addCategory(Intent.CATEGORY_OPENABLE)
                            type = "*/*"
                        }
                    } catch (_: ActivityNotFoundException) {
                        null
                    }

                    if (pickerIntent == null) {
                        fileChooserCallback?.onReceiveValue(null)
                        fileChooserCallback = null
                        Toast.makeText(
                            this@MainActivity,
                            getString(R.string.file_picker_unavailable),
                            Toast.LENGTH_SHORT
                        ).show()
                        return false
                    }

                    return try {
                        filePickerLauncher.launch(pickerIntent)
                        true
                    } catch (_: ActivityNotFoundException) {
                        fileChooserCallback?.onReceiveValue(null)
                        fileChooserCallback = null
                        Toast.makeText(
                            this@MainActivity,
                            getString(R.string.file_picker_unavailable),
                            Toast.LENGTH_SHORT
                        ).show()
                        false
                    }
                }

                override fun onGeolocationPermissionsShowPrompt(
                    origin: String?,
                    callback: GeolocationPermissions.Callback?
                ) {
                    if (hasLocationPermission()) {
                        callback?.invoke(origin, true, false)
                        return
                    }

                    pendingGeoOrigin = origin
                    pendingGeoCallback = callback
                    locationPermissionLauncher.launch(
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        )
                    )
                }
            }
        }
    }

    private fun bindBottomActions() {
        binding.buttonHome.setOnClickListener { loadRoute(PORTAL_HOME) }
        binding.buttonCrm.setOnClickListener { loadRoute(PORTAL_CRM) }
        binding.buttonQuote.setOnClickListener { loadRoute(PORTAL_QUOTE) }
        binding.buttonAgenda.setOnClickListener { loadRoute(PORTAL_AGENDA) }
    }

    /**
     * Synchronizes the bottom navigation bar state with the current URL.
     * Includes a check to avoid redundant view updates if the URL is the same.
     */
    private fun syncBottomBar(url: String?) {
        if (url == null || url == lastSyncedUrl) return
        lastSyncedUrl = url

        val route = when {
            url.contains("#crm") || url.contains("#customer") -> "crm"
            url.contains("#quote") || url.contains("#quotes") -> "quote"
            url.contains("#agenda") -> "agenda"
            else -> "home"
        }

        binding.buttonHome.isChecked = route == "home"
        binding.buttonCrm.isChecked = route == "crm"
        binding.buttonQuote.isChecked = route == "quote"
        binding.buttonAgenda.isChecked = route == "agenda"
    }

    private fun bindBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.webView.canGoBack()) {
                    binding.webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    private fun handleExternalNavigation(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase() ?: return false
        val host = uri.host?.lowercase()

        val isInternalAsset =
            scheme == "https" &&
                host == "appassets.androidplatform.net" &&
                uri.path?.startsWith("/assets/www/") == true

        if (isInternalAsset || scheme == "about") {
            return false
        }

        if (scheme in EXTERNAL_SCHEMES || scheme == "http" || scheme == "https") {
            val intent = Intent(Intent.ACTION_VIEW, uri)
            return try {
                startActivity(intent)
                true
            } catch (_: ActivityNotFoundException) {
                Toast.makeText(
                    this,
                    getString(R.string.external_app_unavailable),
                    Toast.LENGTH_SHORT
                ).show()
                true
            }
        }

        return false
    }

    private fun loadRoute(path: String) {
        binding.webView.loadUrl("$PORTAL_BASE/$path")
    }

    private fun hasLocationPermission(): Boolean {
        val fineGranted =
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED
        val coarseGranted =
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED
        return fineGranted || coarseGranted
    }

    /**
     * Optimizes screen-on state management.
     * Setting this at the window level is more efficient than per-view,
     * reducing layout invalidation overhead.
     */
    private fun applyGpsTrackingMode() {
        if (gpsTrackingForced) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    private inner class PortalBridge {
        @JavascriptInterface
        @Suppress("UNUSED_PARAMETER")
        fun setGpsTrackingEnabled(active: Boolean, _tripId: String?) {
            runOnUiThread {
                gpsTrackingForced = active
                applyGpsTrackingMode()
            }
        }
    }

    companion object {
        private const val PORTAL_BASE =
            "https://appassets.androidplatform.net/assets/www"
        private const val PORTAL_HOME = "v1/index.html"
        private const val PORTAL_CRM = "v1/index.html#crm"
        private const val PORTAL_QUOTE = "v1/index.html#quote"
        private const val PORTAL_AGENDA = "v1/index.html#agenda"

        private val EXTERNAL_SCHEMES = setOf(
            "mailto",
            "tel",
            "sms",
            "smsto",
            "geo",
            "market",
            "whatsapp"
        )
    }
}
