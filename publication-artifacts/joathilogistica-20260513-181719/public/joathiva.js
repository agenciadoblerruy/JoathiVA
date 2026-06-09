const JOATHIVA_DOC_MAX_SIZE = 1_500_000;
const JOATHIVA_SERVER_URL_KEY = "joathiva-server-url";
const JOATHIVA_SERVER_SYNC_INTERVAL_MS = 15000;
const JOATHIVA_GPS_STALE_MS = 25000;
const JOATHIVA_GPS_WATCHDOG_INTERVAL_MS = 12000;
const JOATHIVA_GPS_RECOVERY_DELAY_MS = 2500;
const JOATHIVA_SUPPORT_PHONE = "+59897971122";
const JOATHIVA_SUPPORT_EMAIL = "rhernandez@joathilogistica.com";
let joathiVaWatchId = null;
let joathiVaActiveTripId = null;
let joathiVaSelectedTripId = null;
let joathiVaSelectedRequestId = null;
let joathiVaSelectedBrokerRequestId = null;
let joathiVaSyncTimer = null;
let joathiVaPollTimer = null;
let joathiVaGpsWatchdogTimer = null;
let joathiVaGpsRecoveryTimer = null;
let joathiVaWakeLockSentinel = null;
let joathiVaApplyingRemoteState = false;
let joathiVaLastSyncHash = "";

document.addEventListener("DOMContentLoaded", () => {
  applyJoathiVaBranding();
  injectJoathiVaStatusBar();
  enhanceJoathiVaPortal();
  bindJoathiVaRefreshEvents();
  initJoathiVaServerSync();
  updateJoathiVaConnectivity();
  document.addEventListener("visibilitychange", handleJoathiVaVisibilityChange);
  window.addEventListener("online", updateJoathiVaConnectivity);
  window.addEventListener("offline", updateJoathiVaConnectivity);
  syncGpsKeepAliveState();
});

function bindJoathiVaRefreshEvents() {
  window.addEventListener("joathiva:state-change", enhanceJoathiVaPortal);
  window.addEventListener("joathiva:session-change", enhanceJoathiVaPortal);
  window.addEventListener("joathiva:form-saved", enhanceJoathiVaPortal);
  window.addEventListener("joathiva:state-change", scheduleServerStatePush);
}

function enhanceJoathiVaPortal() {
  applyJoathiVaBranding();
  injectJoathiVaStatusBar();
  renderJoathiVaNotificationCenter();
  renderJoathiVaSupportDock();
  enhanceTripPricingCopy();

  const page = document.body.dataset.page;
  if (page === "trips") {
    renderProviderTrackingControls();
    resumeDriverTrackingIfNeeded();
  }
  if (page === "admin") {
    renderAdminTrackingHub();
    renderAdminLuciaReference();
  }
  if (page === "home") {
    bindPublicTrackingSearch();
    renderHomeQuickHub();
    renderClientTrackingHub();
    renderBrokerWorkspace();
  }
  if (page === "login") {
    renderLoginCopy();
  }
  renderServerConfigCard();
  syncGpsKeepAliveState();
}

function applyJoathiVaBranding() {
  document.title = document.title.replace(/Joathi Logistica/gi, "JoathiVA").replace(/Portal Joathi/gi, "JoathiVA");

  document.querySelectorAll(".brand img, .login-brand img").forEach((image) => {
    image.alt = "JoathiVA";
  });

  document.querySelectorAll(".brand strong").forEach((node) => {
    node.textContent = "JoathiVA";
  });

  document.querySelectorAll(".brand span").forEach((node) => {
    if (normalizeText(node.textContent).includes("administracion")) return;
    node.textContent = "Control operacional y trazabilidad";
  });

  const homeEyebrow = document.querySelector(".hero-copy .eyebrow");
  if (homeEyebrow) {
    homeEyebrow.textContent = "JoathiVA";
  }

  const loginTitle = document.querySelector(".login-brand h1");
  if (loginTitle) {
    loginTitle.textContent = "JoathiVA";
  }

  document.querySelectorAll("input[name='company']").forEach((input) => {
    if (normalizeText(input.placeholder).includes("joathi")) {
      input.placeholder = "JoathiVA";
    }
  });
}

function injectJoathiVaStatusBar() {
  const shell = document.querySelector(".portal-shell, .login-shell");
  if (!shell) return;

  let bar = shell.querySelector(".joathiva-statusbar");
  if (!bar) {
    bar = document.createElement("section");
    bar.className = "joathiva-statusbar";
    shell.prepend(bar);
  }

  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const activeTrips = getTrips().filter((trip) => trip.trackingStatus === "active").length;

  bar.innerHTML = `
    <div class="joathiva-status-copy">
      <strong>JoathiVA</strong>
      <span>${user ? `${escapeHtml(user.displayName)} | ${escapeHtml(getRoleLabel(user.role))}` : "Acceso invitado"}</span>
    </div>
    <div class="joathiva-status-pills">
      <span class="joathiva-pill ${navigator.onLine ? "is-online" : "is-offline"}">${navigator.onLine ? "En linea" : "Sin conexion"}</span>
      <span class="joathiva-pill">${activeTrips} GPS activos</span>
      <span class="joathiva-pill">${getDocuments().length} documentos</span>
    </div>
  `;
}

function updateJoathiVaConnectivity() {
  const badge = document.querySelector(".joathiva-statusbar .joathiva-pill");
  if (!badge) return;
  badge.textContent = navigator.onLine ? "En linea" : "Sin conexion";
  badge.classList.toggle("is-online", navigator.onLine);
  badge.classList.toggle("is-offline", !navigator.onLine);
}

function initJoathiVaServerSync() {
  syncStateFromServer(true);
  if (joathiVaPollTimer) {
    window.clearInterval(joathiVaPollTimer);
  }
  joathiVaPollTimer = window.setInterval(() => syncStateFromServer(false), JOATHIVA_SERVER_SYNC_INTERVAL_MS);
}

function renderServerConfigCard() {
  const page = document.body.dataset.page;
  if (!["home", "login"].includes(page)) return;

  const host = document.querySelector(".login-shell") || document.querySelector(".portal-shell");
  if (!host) return;

  let panel = document.querySelector("#joathivaServerPanel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "joathivaServerPanel";
    panel.className = "panel joathiva-server-panel";
    if (page === "login") {
      const loginShell = document.querySelector(".login-shell");
      loginShell?.appendChild(panel);
    } else {
      const stack = document.querySelector(".page-stack");
      stack?.prepend(panel);
    }
  }

  const currentUrl = getJoathiVaServerBaseUrl() || "";
  panel.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Servidor</p>
      <h2>Backend local de esta PC</h2>
      <p>Usa la misma maquina como servidor HTTP. En esta PC funciona con <code>http://localhost:8787</code>. Desde otro movil debes indicar la IP local de esta computadora.</p>
    </div>
    <form id="joathivaServerConfigForm" class="form-grid">
      <label class="full-width">
        URL base del servidor
        <input name="serverUrl" type="url" value="${escapeHtml(currentUrl)}" placeholder="http://localhost:8787">
      </label>
      <button type="submit" class="button button-secondary">Guardar servidor</button>
      <button type="button" class="button button-primary" data-joathiva-test-server>Probar conexion</button>
    </form>
    <div class="stack-list" id="joathivaServerStatus"></div>
  `;

  const form = panel.querySelector("#joathivaServerConfigForm");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const url = normalizeServerUrl(String(formData.get("serverUrl") || ""));
    if (url) {
      localStorage.setItem(JOATHIVA_SERVER_URL_KEY, url);
    } else {
      localStorage.removeItem(JOATHIVA_SERVER_URL_KEY);
    }
    setServerStatus(url ? `Servidor configurado: ${url}` : "Sin servidor configurado. Se usa solo almacenamiento local.", !url);
    syncStateFromServer(true);
  });

  panel.querySelector("[data-joathiva-test-server]")?.addEventListener("click", async () => {
    const ok = await pingJoathiVaServer();
    const target = getJoathiVaServerBaseUrl();
    setServerStatus(ok ? `Conexion correcta con ${target}.` : `No se pudo conectar con ${target || "el servidor configurado"}.`, !ok);
  });
}

function renderJoathiVaNotificationCenter() {
  const shell = document.querySelector(".portal-shell");
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  let panel = document.querySelector("#joathivaNotificationCenter");

  if (!shell || !user || user.role === "client") {
    panel?.remove();
    return;
  }

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "joathivaNotificationCenter";
    panel.className = "panel joathiva-notification-panel";
    const statusBar = shell.querySelector(".joathiva-statusbar");
    if (statusBar) {
      statusBar.insertAdjacentElement("afterend", panel);
    } else {
      shell.prepend(panel);
    }
  }

  const notifications = getVisibleNotifications(user).slice(0, 6);
  panel.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Notificaciones</p>
      <h2>Alertas operativas</h2>
      <p>JoathiVA centraliza las novedades de carga, viaje, llegada, descarga y finalizacion para todas las partes involucradas.</p>
    </div>
    <div class="stack-list">
      ${notifications.length ? notifications.map(renderNotificationCard).join("") : `
        <article class="record-card">
          <strong>Sin alertas recientes</strong>
          <p>Las novedades del viaje apareceran aqui en cuanto el chofer registre una nueva etapa de la operacion.</p>
        </article>
      `}
    </div>
  `;
}

function renderJoathiVaSupportDock() {
  const host = document.querySelector(".page-stack") || document.querySelector(".login-shell") || document.querySelector(".portal-shell");
  if (!host) return;

  let panel = document.querySelector("#joathivaSupportDock");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "joathivaSupportDock";
    panel.className = "panel joathiva-support-panel";
    host.appendChild(panel);
  }

  panel.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Mesa de ayuda</p>
      <h2>Soporte de operaciones</h2>
      <p>Ante cualquier incidencia durante la carga, el viaje, la descarga o la facturacion, JoathiVA deja el soporte visible en cada pantalla.</p>
    </div>
    <div class="data-grid">
      <span><strong>Telefono</strong><a href="tel:${JOATHIVA_SUPPORT_PHONE}">${escapeHtml(JOATHIVA_SUPPORT_PHONE)}</a></span>
      <span><strong>Email</strong><a href="mailto:${JOATHIVA_SUPPORT_EMAIL}">${escapeHtml(JOATHIVA_SUPPORT_EMAIL)}</a></span>
    </div>
    <div class="hero-actions">
      <a class="button button-primary" href="tel:${JOATHIVA_SUPPORT_PHONE}">Llamar a soporte</a>
      <a class="button button-secondary" href="mailto:${JOATHIVA_SUPPORT_EMAIL}">Escribir a soporte</a>
    </div>
  `;
}

function getVisibleNotifications(user) {
  const notifications = typeof getNotifications === "function" ? getNotifications() : [];
  return notifications.filter((notification) => {
    const roleAllowed = !Array.isArray(notification.audienceRoles) || !notification.audienceRoles.length || notification.audienceRoles.includes(user.role);
    const userAllowed = !Array.isArray(notification.audienceUserIds) || !notification.audienceUserIds.length || notification.audienceUserIds.includes(user.id);
    return roleAllowed && userAllowed;
  });
}

function renderNotificationCard(notification) {
  const trip = typeof getTrip === "function" ? getTrip(notification.tripId) : null;
  const relatedRequests = getRequests().filter((request) => Array.isArray(notification.requestIds) && notification.requestIds.includes(request.id));
  const customerNames = [...new Set(relatedRequests.map((request) => {
    const customer = typeof getUser === "function" ? getUser(request.userId) : null;
    return customer?.displayName || "";
  }).filter(Boolean))];

  return `
    <article class="record-card">
      <strong>${escapeHtml(notification.title || "Notificacion operativa")}</strong>
      <p>${escapeHtml(notification.message || "")}</p>
      <div class="data-grid">
        <span><strong>Momento</strong>${escapeHtml(formatDateTime(notification.createdAt))}</span>
        <span><strong>Viaje</strong>${escapeHtml(trip ? `${trip.currentLocation} -> ${trip.returnDestination}` : "Sin viaje")}</span>
        <span><strong>Clientes</strong>${escapeHtml(customerNames.join(", ") || "Sin cliente asignado")}</span>
        <span><strong>Estado</strong>${escapeHtml(notification.status || "Informado")}</span>
      </div>
    </article>
  `;
}

function setServerStatus(message, isWarning = false) {
  const container = document.querySelector("#joathivaServerStatus");
  if (!container) return;
  container.innerHTML = `
    <article class="record-card">
      <strong>${isWarning ? "Estado del servidor" : "Servidor listo"}</strong>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}

function getJoathiVaServerBaseUrl() {
  const stored = normalizeServerUrl(localStorage.getItem(JOATHIVA_SERVER_URL_KEY) || "");
  const origin = window.location.origin || "";
  const isHttpPage = /^https?:\/\//i.test(origin);
  const isAppAssets = origin.includes("appassets.androidplatform.net");

  if (isHttpPage && !isAppAssets) {
    return origin.replace(/\/$/, "");
  }

  return stored;
}

function normalizeServerUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function getJoathiVaApiUrl(path) {
  const base = getJoathiVaServerBaseUrl();
  if (!base) return "";
  return `${base}${path}`;
}

async function pingJoathiVaServer() {
  const url = getJoathiVaApiUrl("/api/health");
  if (!url) {
    return false;
  }

  try {
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

async function syncStateFromServer(showStatus) {
  const url = getJoathiVaApiUrl("/api/state");
  if (!url) {
    if (showStatus) {
      setServerStatus("Sin servidor configurado. JoathiVA sigue trabajando en modo local.", true);
    }
    return;
  }

  try {
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const remoteState = await response.json();
    const nextHash = JSON.stringify(remoteState);
    if (nextHash === joathiVaLastSyncHash) {
      if (showStatus) {
        setServerStatus(`Sincronizado con ${getJoathiVaServerBaseUrl()}.`);
      }
      return;
    }

    joathiVaApplyingRemoteState = true;
    state = migrateState(remoteState);
    joathiVaLastSyncHash = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, joathiVaLastSyncHash);
    rerenderStateFromRemote();
    if (showStatus) {
      setServerStatus(`Estado cargado desde ${getJoathiVaServerBaseUrl()}.`);
    }
  } catch {
    if (showStatus) {
      setServerStatus(`No se pudo leer el backend en ${getJoathiVaServerBaseUrl()}. Se mantiene el modo local.`, true);
    }
  } finally {
    joathiVaApplyingRemoteState = false;
  }
}

function scheduleServerStatePush() {
  if (joathiVaApplyingRemoteState) return;
  const url = getJoathiVaApiUrl("/api/state");
  if (!url) return;

  if (joathiVaSyncTimer) {
    window.clearTimeout(joathiVaSyncTimer);
  }

  joathiVaSyncTimer = window.setTimeout(() => {
    pushStateToServer().catch(() => {
      setServerStatus(`No se pudo guardar en ${getJoathiVaServerBaseUrl()}. Los cambios siguen guardados localmente.`, true);
    });
  }, 600);
}

async function pushStateToServer() {
  const url = getJoathiVaApiUrl("/api/state");
  if (!url) return;

  const payload = JSON.stringify(state);
  joathiVaLastSyncHash = payload;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: payload
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

function rerenderStateFromRemote() {
  const page = document.body.dataset.page;
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;

  if (page === "home") {
    decorateLayout(page, user);
    renderHomeTrips(user);
    renderStats();
    if (user?.role === "client") {
      populateTripSelect(document.querySelector("#requestTripSelect"));
      if (typeof bindClientRequestForm === "function") {
        bindClientRequestForm(document.querySelector("#requestForm"));
      }
      renderClientRequests(user);
      renderBillingSummary(null);
    }
  }

  if (page === "drivers") {
    renderDrivers(document.querySelector("#driversList"));
  }

  if (page === "vehicles") {
    populateDriverSelect(document.querySelector("#vehicleDriverSelect"));
    renderVehicles(document.querySelector("#vehiclesList"));
  }

  if (page === "trips") {
    populateDriverSelect(document.querySelector("#tripDriverSelect"));
    populateVehicleSelect(document.querySelector("#tripVehicleSelect"));
    renderProviderTrips(document.querySelector("#tripsList"));
  }

  if (page === "admin") {
    renderAdminStats();
    renderAdminDatabase();
    bindAdminForms();
  }

  enhanceJoathiVaPortal();
}

function renderLoginCopy() {
  const lede = document.querySelector(".login-panel .lede");
  if (lede) {
    lede.textContent = "Ingresa a JoathiVA para coordinar viajes, seguimiento GPS, documentos y control comercial desde una sola operacion.";
  }
}

function enhanceTripPricingCopy() {
  const tripForm = document.querySelector("#tripForm");
  if (!tripForm) return;

  const priceInput = tripForm.querySelector("input[name='priceUsd']");
  const label = priceInput?.closest("label");
  if (label && !label.dataset.joathivaUpdated) {
    const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (textNode) {
      textNode.textContent = "Costo proveedor del viaje (USD)";
    }
    priceInput.placeholder = "2400";
    label.dataset.joathivaUpdated = "true";
  }

  let note = tripForm.querySelector(".joathiva-business-note");
  if (!note) {
    note = document.createElement("article");
    note.className = "record-card joathiva-business-note full-width";
    note.innerHTML = `
      <strong>Modelo comercial JoathiVA</strong>
      <p>El proveedor define su costo neto. JoathiVA calcula automaticamente el precio al cliente y la comision del 33,3% sobre lo facturado antes de IVA.</p>
    `;
    tripForm.prepend(note);
  }
}

function renderProviderTrackingControls() {
  const list = document.querySelector("#tripsList");
  if (!list) return;

  getTrips().forEach((trip) => {
    const card = list.querySelector(`[data-trip-id="${trip.id}"]`);
    if (!card) return;

    let controls = card.querySelector(".joathiva-trip-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "joathiva-trip-controls";
      card.appendChild(controls);
    }

    const location = trip.liveLocation;
    const timeline = normalizeOperationTimeline(trip.operationTimeline);
    const lastUpdate = location?.updatedAt ? formatDateTime(location.updatedAt) : "Sin ubicacion";
    const canOpenMap = location ? `<a class="button button-secondary" href="${buildGoogleMapsUrl(location)}" target="_blank" rel="noopener">Abrir mapa</a>` : "";
    const canStartOperation = !timeline.loadingStartedAt;
    const canStartTrip = Boolean(timeline.loadingStartedAt) && !timeline.tripStartedAt;
    const canMarkArrival = Boolean(timeline.tripStartedAt) && !timeline.arrivalAt;
    const canFinishUnload = Boolean(timeline.arrivalAt) && !timeline.unloadingCompletedAt;

    controls.innerHTML = `
      <div class="joathiva-inline-meta">
        <span><strong>Tracking</strong>${escapeHtml(getTrackingStatusLabel(trip))}</span>
        <span><strong>Ultima senal</strong>${escapeHtml(lastUpdate)}</span>
      </div>
      <div class="data-grid">
        <span><strong>Tiempo de carga</strong>${formatDateTimeOrPending(timeline.loadingStartedAt)}</span>
        <span><strong>Comienzo de viaje</strong>${formatDateTimeOrPending(timeline.tripStartedAt)}</span>
        <span><strong>Tiempo de llegada</strong>${formatDateTimeOrPending(timeline.arrivalAt)}</span>
        <span><strong>Tiempo de descarga</strong>${formatDateTimeOrPending(timeline.unloadingCompletedAt)}</span>
      </div>
      <div class="badge-row">
        <span class="badge">${timeline.loadingStartedLocation ? `GPS carga ${escapeHtml(String(timeline.loadingStartedLocation.lat))}, ${escapeHtml(String(timeline.loadingStartedLocation.lng))}` : "GPS inicial pendiente"}</span>
        ${trip.endedAt ? `<span class="badge warning">Fin ${escapeHtml(formatDateTime(trip.endedAt))}</span>` : ""}
      </div>
      <div class="hero-actions joathiva-action-row">
        ${canStartOperation ? `<button type="button" class="button button-primary" data-joathiva-start="${trip.id}">Comenzar operacion + GPS</button>` : ""}
        ${canStartTrip ? `<button type="button" class="button button-secondary" data-joathiva-begin-trip="${trip.id}">Comienzo de viaje</button>` : ""}
        ${canMarkArrival ? `<button type="button" class="button button-secondary" data-joathiva-arrival="${trip.id}">Registrar llegada</button>` : ""}
        ${canFinishUnload ? `<button type="button" class="button button-primary" data-joathiva-unload="${trip.id}">Finalizar descarga</button>` : ""}
        ${trip.trackingStatus === "active" ? `<button type="button" class="button button-secondary" data-joathiva-refresh="${trip.id}">Actualizar GPS</button>` : ""}
        ${canOpenMap}
      </div>
    `;
  });

  list.querySelectorAll("[data-joathiva-start]").forEach((button) => {
    button.onclick = () => startTripTracking(button.dataset.joathivaStart);
  });
  list.querySelectorAll("[data-joathiva-refresh]").forEach((button) => {
    button.onclick = () => refreshTripLocation(button.dataset.joathivaRefresh);
  });
  list.querySelectorAll("[data-joathiva-begin-trip]").forEach((button) => {
    button.onclick = () => markTripMilestone(button.dataset.joathivaBeginTrip, "tripStartedAt");
  });
  list.querySelectorAll("[data-joathiva-arrival]").forEach((button) => {
    button.onclick = () => markTripMilestone(button.dataset.joathivaArrival, "arrivalAt");
  });
  list.querySelectorAll("[data-joathiva-unload]").forEach((button) => {
    button.onclick = () => finalizeTripOperation(button.dataset.joathivaUnload);
  });
}

async function startTripTracking(tripId) {
  const trip = getTrip(tripId);
  if (!trip) return;
  if (!navigator.geolocation) {
    window.alert("Este dispositivo no admite geolocalizacion.");
    return;
  }
  if (joathiVaActiveTripId && joathiVaActiveTripId !== tripId) {
    window.alert("Ya hay un viaje compartiendo GPS desde este dispositivo. Finalizalo antes de iniciar otro.");
    return;
  }

  const previousState = {
    status: trip.status,
    trackingStatus: trip.trackingStatus,
    driverShareConsent: trip.driverShareConsent,
    startedAt: trip.startedAt,
    endedAt: trip.endedAt,
    operationTimeline: { ...normalizeOperationTimeline(trip.operationTimeline) }
  };

  trip.status = "Cargando";
  trip.trackingStatus = "active";
  trip.driverShareConsent = true;
  trip.startedAt = trip.startedAt || new Date().toISOString();
  trip.operationTimeline = normalizeOperationTimeline(trip.operationTimeline);
  trip.operationTimeline.loadingStartedAt = trip.operationTimeline.loadingStartedAt || new Date().toISOString();
  trip.endedAt = null;

  try {
    await enableTripTrackingLocks(tripId);
    const position = await captureCurrentTripPosition({
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000
    });
    writeTripLocation(tripId, position, "loading-started");
    startTripWatch(tripId);
  } catch (error) {
    trip.status = previousState.status;
    trip.trackingStatus = previousState.trackingStatus;
    trip.driverShareConsent = previousState.driverShareConsent;
    trip.startedAt = previousState.startedAt;
    trip.endedAt = previousState.endedAt;
    trip.operationTimeline = previousState.operationTimeline;
    persistState();
    releaseTripTrackingLocks();
    handleTripLocationError(tripId, error, "loading-started", true);
  }
}

function finalizeTripOperation(tripId) {
  const trip = getTrip(tripId);
  if (!trip) return;
  const hadUnload = Boolean(normalizeOperationTimeline(trip.operationTimeline).unloadingCompletedAt);
  const hadCompletion = Boolean(normalizeOperationTimeline(trip.operationTimeline).completedAt);

  trip.operationTimeline = normalizeOperationTimeline(trip.operationTimeline);
  trip.operationTimeline.unloadingCompletedAt = trip.operationTimeline.unloadingCompletedAt || new Date().toISOString();
  trip.operationTimeline.completedAt = trip.operationTimeline.completedAt || new Date().toISOString();
  trip.status = "Finalizado";
  trip.trackingStatus = "completed";
  trip.endedAt = new Date().toISOString();
  syncRequestsForTrip(trip.id);
  if (!hadUnload && typeof createOperationNotification === "function") {
    createOperationNotification(trip.id, "unloading_completed");
  }
  if (!hadCompletion && typeof createOperationNotification === "function") {
    createOperationNotification(trip.id, "operation_completed");
  }
  releaseTripTrackingLocks();
  persistState();
  rerenderTripViews();
}

function resumeDriverTrackingIfNeeded() {
  syncGpsKeepAliveState();
}

function startTripWatch(tripId) {
  if (!navigator.geolocation) return;

  joathiVaActiveTripId = tripId;
  if (joathiVaWatchId !== null) {
    navigator.geolocation.clearWatch(joathiVaWatchId);
  }

  joathiVaWatchId = navigator.geolocation.watchPosition(
    (position) => {
      writeTripLocation(tripId, position);
    },
    (error) => {
      handleTripLocationError(tripId, error, "watch");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000
    }
  );
}

function refreshTripLocation(tripId, reason = "manual-update", shouldAlert = true) {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      writeTripLocation(tripId, position, reason);
    },
    (error) => {
      handleTripLocationError(tripId, error, reason, shouldAlert);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000
    }
  );
}

async function markTripMilestone(tripId, fieldName) {
  const trip = getTrip(tripId);
  if (!trip) return;

  trip.operationTimeline = normalizeOperationTimeline(trip.operationTimeline);
  const alreadySet = Boolean(trip.operationTimeline[fieldName]);
  trip.operationTimeline[fieldName] = trip.operationTimeline[fieldName] || new Date().toISOString();

  if (fieldName === "tripStartedAt") {
    trip.status = "En curso";
  }
  if (fieldName === "arrivalAt") {
    trip.status = "Arribado";
  }

  syncRequestsForTrip(trip.id);
  if (!alreadySet && typeof createOperationNotification === "function") {
    const eventType = fieldName === "tripStartedAt" ? "trip_started" : fieldName === "arrivalAt" ? "arrival_registered" : "";
    if (eventType) {
      createOperationNotification(trip.id, eventType);
    }
  }
  persistState();
  rerenderTripViews();

  if (!alreadySet && fieldName === "tripStartedAt" && typeof createTripAvailabilityNotification === "function") {
    await createTripAvailabilityNotification(trip.id);
    persistState();
    rerenderTripViews();
  }
}

function writeTripLocation(tripId, position, reason = "watch") {
  const trip = getTrip(tripId);
  if (!trip) return;

  const point = {
    lat: Number(position.coords.latitude.toFixed(6)),
    lng: Number(position.coords.longitude.toFixed(6)),
    accuracy: Math.round(position.coords.accuracy || 0),
    heading: position.coords.heading ?? null,
    speed: position.coords.speed ?? null,
    updatedAt: new Date().toISOString()
  };

  trip.liveLocation = point;
  trip.trackingStatus = "active";
  trip.driverShareConsent = true;
  trip.operationTimeline = normalizeOperationTimeline(trip.operationTimeline);
  const shouldCreateLoadingNotification = reason === "loading-started" && !trip.operationTimeline.loadingStartedLocation;
  if (reason === "loading-started" && !trip.operationTimeline.loadingStartedLocation) {
    trip.operationTimeline.loadingStartedLocation = point;
  }
  trip.trackingHistory = Array.isArray(trip.trackingHistory) ? trip.trackingHistory : [];
  trip.trackingHistory.unshift(point);
  trip.trackingHistory = trip.trackingHistory.slice(0, 60);
  syncRequestsForTrip(trip.id);
  if (shouldCreateLoadingNotification && typeof createOperationNotification === "function") {
    createOperationNotification(trip.id, "loading_started");
  }
  persistState();
  rerenderTripViews();
}

function rerenderTripViews() {
  if (document.querySelector("#tripsList")) {
    renderProviderTrips(document.querySelector("#tripsList"));
    renderProviderTrackingControls();
  }
  if (document.querySelector("#availableTrips")) {
    renderHomeTrips(typeof getCurrentUser === "function" ? getCurrentUser() : null);
  }
  if (document.body.dataset.page === "admin") {
    renderAdminTrackingHub();
  }
  if (document.body.dataset.page === "home") {
    renderHomeQuickHub();
    renderClientTrackingHub();
    renderBrokerWorkspace();
  }
}

function syncGpsKeepAliveState() {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const activeTrip = getTrips().find((trip) => trip.trackingStatus === "active");

  if (!activeTrip || user?.role !== "provider") {
    releaseTripTrackingLocks();
    return;
  }

  enableTripTrackingLocks(activeTrip.id)
    .then(() => {
      if (joathiVaWatchId === null || joathiVaActiveTripId !== activeTrip.id) {
        startTripWatch(activeTrip.id);
      }
      const lastUpdateAge = getTripLocationAgeMs(activeTrip);
      if (lastUpdateAge === null || lastUpdateAge > JOATHIVA_GPS_STALE_MS) {
        refreshTripLocation(activeTrip.id, "gps-reconnect", false);
      }
    })
    .catch(() => {
      startTripWatch(activeTrip.id);
    });
}

function getTripLocationAgeMs(trip) {
  const updatedAt = trip?.liveLocation?.updatedAt;
  if (!updatedAt) return null;
  return Date.now() - new Date(updatedAt).getTime();
}

function handleJoathiVaVisibilityChange() {
  if (document.visibilityState !== "visible") return;
  if (!getTrips().some((trip) => trip.trackingStatus === "active")) return;
  void requestJoathiVaWakeLock();
}

function captureCurrentTripPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function enableTripTrackingLocks(tripId) {
  joathiVaActiveTripId = tripId;
  await requestJoathiVaWakeLock();
  setNativeGpsTrackingEnabled(true, tripId);
  ensureGpsWatchdog();
}

function releaseTripTrackingLocks() {
  if (joathiVaWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(joathiVaWatchId);
  }
  joathiVaWatchId = null;
  joathiVaActiveTripId = null;
  clearJoathiVaGpsRecovery();
  clearJoathiVaGpsWatchdog();
  releaseJoathiVaWakeLock();
  setNativeGpsTrackingEnabled(false);
}

function ensureGpsWatchdog() {
  if (joathiVaGpsWatchdogTimer !== null) return;

  joathiVaGpsWatchdogTimer = window.setInterval(() => {
    const activeTrip = getTrips().find((trip) => trip.trackingStatus === "active");
    if (!activeTrip) {
      releaseTripTrackingLocks();
      return;
    }

    joathiVaActiveTripId = activeTrip.id;
    setNativeGpsTrackingEnabled(true, activeTrip.id);

    if (joathiVaWatchId === null) {
      startTripWatch(activeTrip.id);
    }

    const lastUpdateAge = getTripLocationAgeMs(activeTrip);
    if (lastUpdateAge === null || lastUpdateAge > JOATHIVA_GPS_STALE_MS) {
      refreshTripLocation(activeTrip.id, "gps-watchdog", false);
    }
  }, JOATHIVA_GPS_WATCHDOG_INTERVAL_MS);
}

function clearJoathiVaGpsWatchdog() {
  if (joathiVaGpsWatchdogTimer === null) return;
  window.clearInterval(joathiVaGpsWatchdogTimer);
  joathiVaGpsWatchdogTimer = null;
}

function clearJoathiVaGpsRecovery() {
  if (joathiVaGpsRecoveryTimer === null) return;
  window.clearTimeout(joathiVaGpsRecoveryTimer);
  joathiVaGpsRecoveryTimer = null;
}

function scheduleTripLocationRecovery(tripId) {
  clearJoathiVaGpsRecovery();
  const trip = getTrip(tripId);
  if (!trip || trip.trackingStatus !== "active") return;

  joathiVaGpsRecoveryTimer = window.setTimeout(() => {
    joathiVaGpsRecoveryTimer = null;
    const activeTrip = getTrip(tripId);
    if (!activeTrip || activeTrip.trackingStatus !== "active") return;
    startTripWatch(tripId);
    refreshTripLocation(tripId, "gps-retry", false);
  }, JOATHIVA_GPS_RECOVERY_DELAY_MS);
}

function handleTripLocationError(tripId, error, reason, shouldAlert = false) {
  if (shouldAlert) {
    const baseMessage = reason === "loading-started"
      ? "No se pudo fijar el GPS al iniciar la operacion."
      : "No fue posible actualizar la ubicacion del viaje.";
    window.alert(`${baseMessage} Revisa permisos de ubicacion y manten la app abierta.`);
  }

  const trip = getTrip(tripId);
  if (!trip || trip.trackingStatus !== "active") {
    console.warn("JoathiVA GPS", reason, error);
    return;
  }

  scheduleTripLocationRecovery(tripId);
  console.warn("JoathiVA GPS", reason, error);
}

async function requestJoathiVaWakeLock() {
  if (!("wakeLock" in navigator) || joathiVaWakeLockSentinel) return;

  try {
    joathiVaWakeLockSentinel = await navigator.wakeLock.request("screen");
    joathiVaWakeLockSentinel.addEventListener("release", () => {
      joathiVaWakeLockSentinel = null;
    });
  } catch {
    joathiVaWakeLockSentinel = null;
  }
}

function releaseJoathiVaWakeLock() {
  if (!joathiVaWakeLockSentinel) return;
  joathiVaWakeLockSentinel.release().catch(() => {});
  joathiVaWakeLockSentinel = null;
}

function setNativeGpsTrackingEnabled(active, tripId = "") {
  try {
    if (window.JoathiVAAndroid && typeof window.JoathiVAAndroid.setGpsTrackingEnabled === "function") {
      window.JoathiVAAndroid.setGpsTrackingEnabled(Boolean(active), String(tripId || ""));
    }
  } catch {
    // Ignorado fuera de Android o si el bridge aun no esta disponible.
  }
}

function renderAdminTrackingHub() {
  const main = document.querySelector("body[data-page='admin'] .page-stack");
  if (!main) return;

  let section = document.querySelector("#joathiva-admin-tracking");
  if (!section) {
    section = document.createElement("section");
    section.id = "joathiva-admin-tracking";
    section.className = "content-grid joathiva-admin-grid";
    const anchor = main.querySelector(".stats-row");
    if (anchor) {
      main.insertBefore(section, anchor);
    } else {
      main.prepend(section);
    }
  }

  const trips = getTrips().filter((trip) => trip.startedAt || trip.liveLocation || trip.trackingStatus === "active");
  const selectedTrip = resolveSelectedTrip(trips);

  section.innerHTML = `
    <article class="panel joathiva-map-panel">
      <div class="panel-heading">
        <p class="eyebrow">Mapa en tiempo real</p>
        <h2>Seguimiento maestro de camiones</h2>
        <p>Visualiza viajes iniciados, ultima posicion GPS y el momento exacto de la ultima senal.</p>
      </div>
      ${renderSelectedTripMap(selectedTrip)}
    </article>
    <article class="panel">
      <div class="panel-heading">
        <p class="eyebrow">Flota viva</p>
        <h2>Camiones con ubicacion</h2>
      </div>
      <div class="stack-list">
        ${trips.length ? trips.map(renderAdminTrackingCard).join("") : `
          <article class="record-card">
            <strong>No hay camiones compartiendo ubicacion.</strong>
            <p>Cuando un proveedor inicie un viaje desde JoathiVA, el panel maestro mostrara aqui la senal GPS del movil.</p>
          </article>
        `}
      </div>
    </article>
    <article class="panel">
      <div class="panel-heading">
        <p class="eyebrow">Facturacion</p>
        <h2>Clientes a facturar y recibos proveedor</h2>
        <p>Cuando el chofer finaliza la operacion, JoathiVA habilita el listado de cliente a facturar y el recibo de pago al proveedor.</p>
      </div>
      <div class="stack-list">
        ${renderAdminSettlementCards()}
      </div>
    </article>
    <article class="panel">
      <div class="panel-heading">
        <p class="eyebrow">Cumplimiento</p>
        <h2>Panel maestro de cumplimiento aduanero</h2>
        <p>Operaciones incompletas, observaciones y faltantes de documentacion con foco ejecutivo.</p>
      </div>
      ${renderCompliancePanel()}
    </article>
  `;

  section.querySelectorAll("[data-joathiva-focus-trip]").forEach((button) => {
    button.onclick = () => {
      joathiVaSelectedTripId = button.dataset.joathivaFocusTrip;
      renderAdminTrackingHub();
    };
  });
}

function renderSelectedTripMap(trip) {
  if (!trip?.liveLocation) {
    return `
      <article class="record-card">
        <strong>Mapa pendiente</strong>
        <p>Selecciona un viaje con GPS o espera a que el chofer comparta su ubicacion desde el inicio del viaje.</p>
      </article>
    `;
  }

  return `
    <div class="joathiva-map-frame-wrap">
      <iframe
        class="joathiva-map-frame"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        src="${buildMapEmbedUrl(trip.liveLocation)}"
        title="Mapa en tiempo real"></iframe>
    </div>
    <div class="record-card joathiva-map-summary">
      <strong>${escapeHtml(trip.currentLocation)} -> ${escapeHtml(trip.returnDestination)}</strong>
      <p>${escapeHtml(getTrackingStatusLabel(trip))}</p>
      <div class="data-grid">
        <span><strong>Ultima senal</strong>${escapeHtml(formatDateTime(trip.liveLocation.updatedAt))}</span>
        <span><strong>Precision</strong>${escapeHtml(String(trip.liveLocation.accuracy || 0))} m</span>
        <span><strong>Latitud</strong>${escapeHtml(String(trip.liveLocation.lat))}</span>
        <span><strong>Longitud</strong>${escapeHtml(String(trip.liveLocation.lng))}</span>
        <span><strong>Carga</strong>${formatDateTimeOrPending(trip.operationTimeline?.loadingStartedAt)}</span>
        <span><strong>Comienzo viaje</strong>${formatDateTimeOrPending(trip.operationTimeline?.tripStartedAt)}</span>
        <span><strong>Llegada</strong>${formatDateTimeOrPending(trip.operationTimeline?.arrivalAt)}</span>
        <span><strong>Descarga</strong>${formatDateTimeOrPending(trip.operationTimeline?.unloadingCompletedAt)}</span>
      </div>
      <div class="hero-actions">
        <a class="button button-secondary" href="${buildGoogleMapsUrl(trip.liveLocation)}" target="_blank" rel="noopener">Abrir en Google Maps</a>
      </div>
    </div>
  `;
}

function renderAdminTrackingCard(trip) {
  const driver = typeof getDriver === "function" ? getDriver(trip.driverId) : null;
  const selected = trip.id === joathiVaSelectedTripId;
  return `
    <article class="record-card ${selected ? "joathiva-selected-card" : ""}">
      <strong>${escapeHtml(driver?.name || "Chofer")} | ${escapeHtml(trip.currentLocation)} -> ${escapeHtml(trip.returnDestination)}</strong>
      <p>${escapeHtml(getTrackingStatusLabel(trip))}</p>
      <div class="data-grid">
        <span><strong>Inicio</strong>${trip.startedAt ? escapeHtml(formatDateTime(trip.startedAt)) : "Pendiente"}</span>
        <span><strong>Ultima senal</strong>${trip.liveLocation?.updatedAt ? escapeHtml(formatDateTime(trip.liveLocation.updatedAt)) : "Sin GPS"}</span>
      </div>
      <div class="hero-actions">
        <button type="button" class="button button-primary" data-joathiva-focus-trip="${trip.id}">Ver mapa</button>
      </div>
    </article>
  `;
}

function renderCompliancePanel() {
  const requests = getRequests();
  const docs = getDocuments();
  const operational = getLuciaOperationalData();
  const operationalItems = Array.isArray(operational.items) ? operational.items : [];
  const items = requests.map((request) => {
    const requestDocs = docs.filter((doc) => doc.requestId === request.id);
    const missing = [];
    if (!request.customsHsCode) missing.push("HS/NCM");
    if (!request.customsDeclarationNumber && !request.customsDeclarationStatus) missing.push("Declaracion");
    if (!request.customsObservation && !request.observaciones) missing.push("Observacion");
    if (!requestDocs.some((doc) => /factura/i.test(String(doc.type || "")))) missing.push("Factura");
    if (!requestDocs.some((doc) => /permiso|cert/i.test(String(doc.type || "")))) missing.push("Certificado");
    if (!requestDocs.some((doc) => /bulto|packing/i.test(String(doc.type || "")))) missing.push("Bultos");
    const highRisk = !request.customsHsCode || !request.customsDeclarationNumber || missing.length >= 4;
    const warningRisk = !highRisk && missing.length > 0;
    return { request, missing, requestDocs, highRisk, warningRisk };
  }).filter((item) => item.missing.length || String(item.request.customsObservation || item.request.observaciones || "").trim());
  const criticalCount = items.filter((item) => item.highRisk).length;
  const warningCount = items.filter((item) => item.warningRisk).length;
  const okCount = Math.max(0, requests.length - items.length);

  return `
    <div class="stack-list">
      <article class="record-card">
        <strong>${escapeHtml(String(items.length))} operaciones con incumplimientos o observaciones</strong>
        <p>${escapeHtml(String(requests.length))} pedidos, ${escapeHtml(String(getTrips().length))} viajes, ${escapeHtml(String(docs.length))} documentos y ${escapeHtml(String(operational.itemCount || operationalItems.length))} items ETL.</p>
        <div class="badge-row">
          <span class="badge warning">${escapeHtml(String(criticalCount))} criticas</span>
          <span class="badge">${escapeHtml(String(warningCount))} en seguimiento</span>
          <span class="badge success">${escapeHtml(String(okCount))} ok</span>
        </div>
      </article>
      <article class="record-card">
        <strong>ETL Lucía operativo</strong>
        <p>${escapeHtml(String(operational.ftp?.fileCount || 0))} archivos FTP, ${escapeHtml(String(operational.catalog?.packageCount || 0))} paquetes CKAN y ${escapeHtml(String(operational.catalog?.resourceCount || 0))} recursos catalogados.</p>
        <p>Ultima corrida: ${escapeHtml(operational.generatedAt || "Sin fecha")}</p>
        <div class="badge-row">
          <span class="badge">FTP ${escapeHtml(String(operational.ftp?.fileCount || 0))}</span>
          <span class="badge">CKAN ${escapeHtml(String(operational.catalog?.resourceCount || 0))}</span>
          <span class="badge">ETL ${escapeHtml(String(operational.itemCount || operationalItems.length))}</span>
        </div>
      </article>
      ${items.length ? items.slice(0, 6).map((item) => `
        <article class="record-card">
          <strong>${escapeHtml(item.request.cargoDescription || item.request.id)}</strong>
          <p>${escapeHtml(item.missing.length ? `Faltan: ${item.missing.join(", ")}` : "Sin faltantes detectados")}</p>
          <div class="badge-row">
            <span class="badge ${item.highRisk ? "warning" : "success"}">${item.highRisk ? "Critica" : "Seguimiento"}</span>
            ${item.missing.slice(0, 4).map((field) => `<span class="badge warning">${escapeHtml(field)}</span>`).join("")}
          </div>
          <div class="hero-actions">
            <a class="button button-secondary" href="#admin-operations-board">Ir a operaciones</a>
            <a class="button button-primary" href="#admin-operations-board">Abrir caso</a>
          </div>
        </article>
      `).join("") : `
        <article class="record-card">
          <strong>Sin incidencias visibles</strong>
          <p>No se detectan faltantes documentales en las operaciones activas.</p>
        </article>
      `}
      ${operationalItems.length ? operationalItems.slice(0, 4).map((entry) => `
        <article class="record-card">
          <strong>${escapeHtml(entry.label || entry.kind || "ETL")}</strong>
          <p>${escapeHtml(entry.value || entry.localPath || "Dato normalizado")}</p>
          <div class="badge-row">
            <span class="badge">${escapeHtml(entry.kind || "item")}</span>
            <span class="badge">${escapeHtml(entry.status || "available")}</span>
          </div>
        </article>
      `).join("") : ""}
    </div>
  `;
}

function renderHomeQuickHub() {
  const home = document.querySelector("body[data-page='home'] .page-stack");
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!home || !user || user.role !== "provider") return;

  let section = document.querySelector("#joathiva-provider-hub");
  if (!section) {
    section = document.createElement("section");
    section.id = "joathiva-provider-hub";
    section.className = "content-grid";
    const anchor = home.querySelector(".cta-grid");
    if (anchor) {
      home.insertBefore(section, anchor);
    } else {
      home.appendChild(section);
    }
  }

  const activeTrips = getTrips().filter((trip) => trip.trackingStatus === "active");
  const receiptRequests = getRequests().filter((request) => request.invoiceRecord?.providerReceipt?.generatedAt);
  const requestedTrips = getProviderRequestedTrips();
  section.innerHTML = `
    <article class="panel">
      <div class="panel-heading">
        <p class="eyebrow">Operacion movil</p>
        <h2>Centro rapido JoathiVA</h2>
      </div>
      <div class="data-grid">
        <span><strong>GPS activos</strong>${activeTrips.length}</span>
        <span><strong>Documentos</strong>${getDocuments().length}</span>
        <span><strong>Viajes</strong>${getTrips().length}</span>
        <span><strong>Pedidos</strong>${getRequests().length}</span>
      </div>
      <div class="hero-actions">
        <a href="viajes.html" class="button button-primary">Gestionar viajes</a>
        <a href="transportes.html" class="button button-secondary">Cargar documentos</a>
      </div>
    </article>
    <article class="panel">
      <div class="panel-heading">
        <p class="eyebrow">Tracking</p>
        <h2>Seguimiento activo</h2>
      </div>
      <div class="stack-list">
        ${activeTrips.length ? activeTrips.map((trip) => `
          <article class="record-card">
            <strong>${escapeHtml(trip.currentLocation)} -> ${escapeHtml(trip.returnDestination)}</strong>
            <p>${trip.liveLocation?.updatedAt ? `Ultima senal ${escapeHtml(formatDateTime(trip.liveLocation.updatedAt))}` : "Esperando primera ubicacion"}</p>
          </article>
        `).join("") : `
          <article class="record-card">
            <strong>No hay viajes compartiendo GPS.</strong>
            <p>Desde la pantalla de viajes el chofer puede iniciar el viaje y compartir la ubicacion del movil en tiempo real.</p>
          </article>
        `}
      </div>
    </article>
    <article class="panel">
      <div class="panel-heading">
        <p class="eyebrow">Recibos</p>
        <h2>Liquidaciones proveedor</h2>
      </div>
      <div class="stack-list">
        ${receiptRequests.length ? receiptRequests.slice(0, 4).map(renderProviderReceiptCard).join("") : `
          <article class="record-card">
            <strong>Sin recibos generados</strong>
            <p>El recibo para el proveedor aparecera aqui cuando el chofer cierre una operacion completa.</p>
          </article>
        `}
      </div>
    </article>
    <article class="panel">
      <div class="panel-heading">
        <p class="eyebrow">Solicitudes</p>
        <h2>Viajes solicitados por clientes</h2>
        <p>El proveedor ve en un solo panel los pedidos ya solicitados por clientes sobre los viajes publicados.</p>
      </div>
      <div class="stack-list">
        ${requestedTrips.length ? requestedTrips.slice(0, 6).map(renderProviderRequestedTripCard).join("") : `
          <article class="record-card">
            <strong>Sin viajes solicitados</strong>
            <p>Cuando un cliente confirme un pedido sobre uno de tus viajes, el detalle aparecera aqui.</p>
          </article>
        `}
      </div>
    </article>
  `;
}

function bindPublicTrackingSearch() {
  const form = document.querySelector("#publicTrackingForm");
  const result = document.querySelector("#publicTrackingResult");
  if (!form || !result || form.dataset.joathivaBound === "true") return;

  form.dataset.joathivaBound = "true";
  renderPublicTrackingResult("", result);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    renderPublicTrackingResult(String(formData.get("query") || ""), result);
  });
}

function renderPublicTrackingResult(rawQuery, container) {
  const query = normalizeText(rawQuery);
  const trips = getTrips()
    .filter((trip) => {
      if (!query) return trip.trackingStatus === "active" || trip.status === "Disponible";
      const vehicle = typeof getVehicle === "function" ? getVehicle(trip.vehicleId) : null;
      const searchable = [
        trip.id,
        trip.currentLocation,
        trip.originCountry,
        trip.returnDestination,
        trip.destinationCountry,
        trip.status,
        trip.trackingStatus,
        vehicle?.plate,
        vehicle?.brand,
        vehicle?.model
      ].map(normalizeText).join(" ");
      return searchable.includes(query);
    })
    .slice(0, 3);

  if (!trips.length) {
    container.innerHTML = `
      <article class="record-card joathiva-tracking-result-card">
        <strong>Sin coincidencias visibles</strong>
        <p>El portal no encontro un viaje publico con ese dato. Ingresa al portal de usuario para revisar operaciones asignadas a tu cuenta.</p>
      </article>
    `;
    return;
  }

  container.innerHTML = trips.map(renderPublicTrackingCard).join("");
}

function renderPublicTrackingCard(trip) {
  const vehicle = typeof getVehicle === "function" ? getVehicle(trip.vehicleId) : null;
  const location = trip.liveLocation;
  const lastSignal = location?.updatedAt ? formatDateTime(location.updatedAt) : "GPS pendiente";
  const mapAction = location ? `<a class="button button-secondary" href="${buildGoogleMapsUrl(location)}" target="_blank" rel="noopener">Abrir mapa</a>` : "";

  return `
    <article class="record-card joathiva-tracking-result-card">
      <strong>${escapeHtml(trip.currentLocation)} -> ${escapeHtml(trip.returnDestination)}</strong>
      <p>${escapeHtml(vehicle?.plate ? `Unidad ${vehicle.plate}` : "Unidad pendiente")} | ${escapeHtml(getTrackingStatusLabel(trip))}</p>
      <div class="data-grid">
        <span><strong>Estado</strong>${escapeHtml(trip.status || "Disponible")}</span>
        <span><strong>Ultima senal</strong>${escapeHtml(lastSignal)}</span>
        <span><strong>Espacio</strong>${escapeHtml(formatNumber(trip.availableM3 || 0))} m3</span>
        <span><strong>Peso</strong>${escapeHtml(formatNumber(trip.availableWeightKg || 0))} kg</span>
      </div>
      <div class="hero-actions">
        ${mapAction}
        <a href="login.html" class="button button-ghost">Ver detalle en portal</a>
      </div>
    </article>
  `;
}

function getProviderRequestedTrips() {
  return getRequests()
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function renderProviderRequestedTripCard(request) {
  const trip = typeof getTrip === "function" ? getTrip(request.tripId) : null;
  const customer = typeof getUser === "function" ? getUser(request.userId) : null;
  const timeline = normalizeOperationTimeline(trip?.operationTimeline);
  return `
    <article class="record-card">
      <strong>${escapeHtml(request.cargoDescription || "Viaje solicitado")}</strong>
      <p>${escapeHtml(customer?.company || customer?.displayName || "Cliente")} | ${escapeHtml(trip ? `${trip.currentLocation} -> ${trip.returnDestination}` : "Sin viaje asignado")}</p>
      <div class="data-grid">
        <span><strong>Cliente</strong>${escapeHtml(customer?.displayName || "Pendiente")}</span>
        <span><strong>Solicitado</strong>${escapeHtml(formatDateTime(request.createdAt))}</span>
        <span><strong>Estado</strong>${escapeHtml(trip ? getTrackingStatusLabel(trip) : "Pendiente")}</span>
        <span><strong>Peso</strong>${escapeHtml(formatNumber(request.weightKg || 0))} kg</span>
        <span><strong>Volumen</strong>${escapeHtml(formatNumber(request.volumeM3 || 0))} m3</span>
        <span><strong>Total</strong>${formatCurrency(request.billing?.total || 0)}</span>
        <span><strong>Carga</strong>${formatDateTimeOrPending(timeline.loadingStartedAt)}</span>
        <span><strong>Viaje</strong>${formatDateTimeOrPending(timeline.tripStartedAt)}</span>
      </div>
    </article>
  `;
}

function renderClientTrackingHub() {
  const home = document.querySelector("body[data-page='home'] .page-stack");
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!home || !user || user.role !== "client") return;

  let section = document.querySelector("#joathiva-client-hub");
  if (!section) {
    section = document.createElement("section");
    section.id = "joathiva-client-hub";
    section.className = "page-stack joathiva-client-hub";
    const anchor = document.querySelector("#solicitar-traslado");
    if (anchor) {
      anchor.insertAdjacentElement("beforebegin", section);
    } else {
      home.appendChild(section);
    }
  }

  const requests = getRequests().filter((request) => request.userId === user.id);
  const selectedRequest = resolveSelectedRequest(requests);
  const clientOriginProviders = getClientOriginProviderOptions(user, selectedRequest);
  const availabilityNotifications = getVisibleNotifications(user)
    .filter((notification) => notification.eventType === "incoming_capacity_alert")
    .slice(0, 5);

  section.innerHTML = `
    ${renderClientPortalSummary(requests, selectedRequest)}
    <div class="content-grid joathiva-client-top-grid">
      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Portal de cliente</p>
          <h2>Traslados y cargas en seguimiento</h2>
          <p>Selecciona una operacion para revisar estado, hitos, documentos y ultima ubicacion GPS disponible.</p>
        </div>
        <div class="stack-list joathiva-request-selector">
          ${requests.length ? requests.map((request) => renderClientRequestFocusCard(request, selectedRequest?.id)).join("") : `
            <article class="record-card">
              <strong>Sin traslados activos</strong>
              <p>Cuando contrates un transporte, JoathiVA mostrara aqui el estado operativo y su seguimiento.</p>
            </article>
          `}
        </div>
        <div class="hero-actions">
          <a href="#solicitar-traslado" class="button button-accent">Solicitar traslado</a>
        </div>
      </article>
      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Disponibilidad</p>
          <h2>Notificaciones de viajes disponibles</h2>
          <p>${escapeHtml(clientOriginProviders.originLabel ? `JoathiVA detecta unidades en viaje hacia ${clientOriginProviders.originLabel}.` : "Activa tu ubicacion para recibir alertas cuando un camion este arribando a tu zona.")}</p>
        </div>
        <div class="stack-list">
          ${availabilityNotifications.length ? availabilityNotifications.map(renderClientAvailabilityNotificationCard).join("") : renderClientOriginProviderList(clientOriginProviders)}
        </div>
      </article>
    </div>
    <article class="panel joathiva-map-panel joathiva-client-map-stage">
      <div class="panel-heading">
        <p class="eyebrow">Mapa</p>
        <h2>Transportes contratados por ti</h2>
        <p>Visualiza en el mapa los transportes que ya reservaste y la ultima posicion compartida por cada chofer.</p>
      </div>
      <div class="stack-list joathiva-request-selector">
        ${renderClientTransportMapBoard(requests, selectedRequest?.id)}
      </div>
    </article>
    <div class="content-grid joathiva-client-bottom-grid">
      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Perfil</p>
          <h2>Ficha operativa del cliente</h2>
          <p>Completa tu informacion comercial y fiscal a medida que operas. JoathiVA usa estos datos para alertas, traslados y facturacion.</p>
        </div>
        ${renderClientOperationalProfile(user)}
      </article>
      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Repositorio</p>
          <h2>Documentacion del traslado</h2>
          <p>Sube permisos de aduana, declaratoria, factura y otros respaldos asociados a tus operaciones.</p>
        </div>
        ${renderDocumentUploadForm(requests, selectedRequest)}
        <div class="stack-list joathiva-doc-list">
          ${renderClientDocuments(requests, user.id)}
        </div>
      </article>
      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Facturacion</p>
          <h2>Datos de facturacion del cliente</h2>
          <p>Las referencias de cobro y la informacion fiscal quedan visibles abajo del tablero operativo.</p>
        </div>
        <div class="stack-list">
          ${renderClientInvoiceCards(requests, selectedRequest)}
        </div>
      </article>
    </div>
  `;

  section.querySelectorAll("[data-joathiva-focus-request]").forEach((button) => {
    button.onclick = () => {
      joathiVaSelectedRequestId = button.dataset.joathivaFocusRequest;
      renderClientTrackingHub();
    };
  });

  const form = section.querySelector("#joathivaDocumentForm");
  if (form) {
    bindUploadFields(form);
    form.addEventListener("submit", handleJoathiVaDocumentUpload);
  }

  section.querySelector("#joathivaClientProfileForm")?.addEventListener("submit", handleClientOperationalProfileSave);
}

function renderClientPortalSummary(requests, selectedRequest) {
  const selectedTrip = selectedRequest ? getTrip(selectedRequest.tripId) : null;
  const activeRequests = requests.filter((request) => {
    const trip = getTrip(request.tripId);
    return trip && !["Finalizado", "Entregado"].includes(String(trip.status || ""));
  });
  const delayedRequests = requests.filter((request) => {
    const trip = getTrip(request.tripId);
    return normalizeText(trip?.status).includes("retras");
  });
  const gpsTrips = requests
    .map((request) => getTrip(request.tripId))
    .filter((trip) => trip?.liveLocation);
  const clientDocuments = getDocuments().filter((doc) => requests.some((request) => request.id === doc.requestId));

  return `
    <section class="panel joathiva-client-command">
      <div class="panel-heading">
        <p class="eyebrow">Dashboard cliente</p>
        <h2>Control de operaciones contratadas</h2>
        <p>${escapeHtml(selectedTrip ? `Foco actual: ${selectedTrip.currentLocation} -> ${selectedTrip.returnDestination}` : "Cuando solicites un traslado, el tablero mostrara estado, GPS, documentos e historial.")}</p>
      </div>
      <div class="joathiva-client-metrics">
        <article class="record-card joathiva-client-metric">
          <span class="badge">Total</span>
          <strong>${requests.length}</strong>
          <p>Traslados solicitados</p>
        </article>
        <article class="record-card joathiva-client-metric">
          <span class="badge success">En curso</span>
          <strong>${activeRequests.length}</strong>
          <p>Operaciones abiertas</p>
        </article>
        <article class="record-card joathiva-client-metric">
          <span class="badge">GPS</span>
          <strong>${gpsTrips.length}</strong>
          <p>Unidades con senal</p>
        </article>
        <article class="record-card joathiva-client-metric">
          <span class="badge warning">Alertas</span>
          <strong>${delayedRequests.length}</strong>
          <p>Retrasos detectados</p>
        </article>
        <article class="record-card joathiva-client-metric">
          <span class="badge">Docs</span>
          <strong>${clientDocuments.length}</strong>
          <p>Archivos vinculados</p>
        </article>
      </div>
    </section>
  `;
}

function renderClientOperationalProfile(user) {
  const profileLocation = user?.profileLocation || {};
  const favoriteRoutes = Array.isArray(user?.favoriteRoutes) ? user.favoriteRoutes : [];
  const completionItems = [
    Boolean(user?.company),
    Boolean(user?.legalName),
    Boolean(user?.documentNumber),
    Boolean(user?.email),
    Boolean(user?.phone),
    Boolean(profileLocation.city || profileLocation.country),
    Boolean(favoriteRoutes.length)
  ];
  const completionPercent = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);

  return `
    <div class="stack-list">
      <article class="record-card">
        <strong>Perfil operativo ${completionPercent}% completo</strong>
        <p>${escapeHtml(profileLocation.label || [profileLocation.city, profileLocation.country].filter(Boolean).join(", ") || "Ubicacion pendiente")} | ${user.notificationsEnabled ? "Alertas activas" : "Alertas pausadas"}</p>
        <div class="badge-row">
          <span class="badge">Origen base ${escapeHtml(user.notificationOrigin || profileLocation.label || "Pendiente")}</span>
          <span class="badge warning">Favoritos ${escapeHtml(String(favoriteRoutes.length))}</span>
        </div>
      </article>
      <form id="joathivaClientProfileForm" class="form-grid">
        <label>
          Empresa
          <input name="company" type="text" value="${escapeHtml(user.company || "")}" placeholder="Empresa o nombre comercial">
        </label>
        <label>
          Razon social
          <input name="legalName" type="text" value="${escapeHtml(user.legalName || "")}" placeholder="Razon social completa">
        </label>
        <label>
          Tipo de documento
          <select name="documentType">
            <option value="">Seleccionar</option>
            <option value="ci"${user.documentType === "ci" ? " selected" : ""}>Documento de identidad</option>
            <option value="rut"${user.documentType === "rut" ? " selected" : ""}>RUT</option>
          </select>
        </label>
        <label>
          Numero de documento
          <input name="documentNumber" type="text" value="${escapeHtml(user.documentNumber || "")}" placeholder="Documento o RUT">
        </label>
        <label>
          Email operativo
          <input name="email" type="email" value="${escapeHtml(user.email || "")}" placeholder="correo@empresa.com">
        </label>
        <label>
          Telefono operativo
          <input name="phone" type="text" value="${escapeHtml(user.phone || "")}" placeholder="+598 99 000 000">
        </label>
        <label>
          Origen base
          <input name="notificationOrigin" type="text" value="${escapeHtml(user.notificationOrigin || profileLocation.label || "")}" placeholder="Ciudad o zona donde recibes carga">
        </label>
        <label>
          Destino objetivo
          <input name="notificationDestination" type="text" value="${escapeHtml(user.notificationDestination || "")}" placeholder="Corredor o destino principal">
        </label>
        <label class="full-width">
          Corredores favoritos
          <textarea name="favoriteRoutes" rows="3" placeholder="Ejemplo: Montevideo, Uruguay&#10;Corrientes, Argentina">${escapeHtml(favoriteRoutes.join("\n"))}</textarea>
        </label>
        <p class="form-note full-width">La ciudad y el pais se capturan desde tu dispositivo. Los corredores favoritos sirven como apoyo si no hay geolocalizacion disponible.</p>
        <button type="submit" class="button button-primary">Guardar ficha operativa</button>
      </form>
    </div>
  `;
}

function handleClientOperationalProfileSave(event) {
  event.preventDefault();
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user || user.role !== "client") return;

  const formData = new FormData(event.currentTarget);
  user.company = String(formData.get("company") || "").trim();
  user.legalName = String(formData.get("legalName") || "").trim();
  user.documentType = String(formData.get("documentType") || "").trim();
  user.documentNumber = String(formData.get("documentNumber") || "").trim();
  user.email = String(formData.get("email") || "").trim();
  user.phone = String(formData.get("phone") || "").trim();
  user.notificationOrigin = String(formData.get("notificationOrigin") || "").trim();
  user.notificationDestination = String(formData.get("notificationDestination") || "").trim();
  if (typeof normalizeFavoriteRoutes === "function") {
    user.favoriteRoutes = normalizeFavoriteRoutes(String(formData.get("favoriteRoutes") || ""));
  }
  user.notificationsEnabled = true;

  persistState();
  renderClientTrackingHub();
}

function renderClientAvailabilityNotificationCard(notification) {
  const trip = typeof getTrip === "function" ? getTrip(notification.tripId) : null;
  return `
    <article class="record-card">
      <strong>${escapeHtml(notification.title || "Viaje disponible")}</strong>
      <p>${escapeHtml(notification.message || "Hay una unidad en camino que podria servir a tu operacion.")}</p>
      <div class="data-grid">
        <span><strong>Ruta</strong>${escapeHtml(trip ? `${trip.currentLocation} -> ${trip.returnDestination}` : "En camino")}</span>
        <span><strong>Inicio</strong>${escapeHtml(formatDateTime(notification.createdAt))}</span>
        <span><strong>Espacio</strong>${escapeHtml(formatNumber(trip?.availableM3 || 0))} m3</span>
        <span><strong>Peso</strong>${escapeHtml(formatNumber(trip?.availableWeightKg || 0))} kg</span>
      </div>
      <div class="hero-actions">
        <a href="#solicitar-traslado" class="button button-secondary">Reservar traslado</a>
      </div>
    </article>
  `;
}

function renderClientTransportMapBoard(requests, selectedRequestId) {
  if (!requests.length) {
    return `
      <article class="record-card">
        <strong>Mapa pendiente</strong>
        <p>Todavia no hay transportes contratados para mostrar sobre el mapa.</p>
      </article>
    `;
  }

  return requests
    .slice()
    .sort((left, right) => {
      if (left.id === selectedRequestId) return -1;
      if (right.id === selectedRequestId) return 1;
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    })
    .map((request) => renderClientTransportMapCard(request, request.id === selectedRequestId))
    .join("");
}

function renderClientTransportMapCard(request, selected) {
  const trip = getTrip(request.tripId);
  const invoice = request.invoiceRecord || {};
  if (!trip?.liveLocation) {
    return `
      <article class="record-card ${selected ? "joathiva-selected-card" : ""}">
        <strong>${escapeHtml(request.cargoDescription || "Traslado")}</strong>
        <p>${escapeHtml(trip ? `${trip.currentLocation} -> ${trip.returnDestination}` : "Sin viaje asignado")}</p>
        <div class="data-grid">
          <span><strong>Estado</strong>${escapeHtml(trip ? getTrackingStatusLabel(trip) : "Pendiente")}</span>
          <span><strong>Inicio viaje</strong>${formatDateTimeOrPending(invoice.operationTimeline?.tripStartedAt)}</span>
        </div>
        ${trip ? renderClientTripTimeline(trip) : ""}
      </article>
    `;
  }

  return `
    <article class="record-card joathiva-map-card ${selected ? "joathiva-selected-card" : ""}">
      <strong>${escapeHtml(request.cargoDescription || "Traslado")}</strong>
      <p>${escapeHtml(trip.currentLocation)} -> ${escapeHtml(trip.returnDestination)}</p>
      <div class="joathiva-map-frame-wrap">
        <iframe
          class="joathiva-map-frame"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          src="${buildMapEmbedUrl(trip.liveLocation)}"
          title="Seguimiento de transporte contratado"></iframe>
      </div>
      <div class="data-grid">
        <span><strong>Ultima senal</strong>${escapeHtml(formatDateTime(trip.liveLocation.updatedAt))}</span>
        <span><strong>Precision</strong>${escapeHtml(String(trip.liveLocation.accuracy || 0))} m</span>
        <span><strong>Estado</strong>${escapeHtml(getTrackingStatusLabel(trip))}</span>
        <span><strong>Pago</strong>${escapeHtml(invoice.paymentStatusLabel || "Pendiente")}</span>
      </div>
      ${renderClientTripTimeline(trip)}
      <div class="hero-actions">
        <a class="button button-secondary" href="${buildGoogleMapsUrl(trip.liveLocation)}" target="_blank" rel="noopener">Abrir mapa</a>
      </div>
    </article>
  `;
}

function renderClientTripTimeline(trip) {
  const timeline = normalizeOperationTimeline(trip.operationTimeline);
  const steps = [
    { key: "loadingStartedAt", label: "Carga", value: timeline.loadingStartedAt },
    { key: "tripStartedAt", label: "En transito", value: timeline.tripStartedAt },
    { key: "arrivalAt", label: "Arribo", value: timeline.arrivalAt },
    { key: "unloadingCompletedAt", label: "Descarga", value: timeline.unloadingCompletedAt },
    { key: "completedAt", label: "Entregado", value: timeline.completedAt }
  ];
  const firstPendingIndex = steps.findIndex((step) => !step.value);

  return `
    <div class="joathiva-status-timeline" aria-label="Estado operativo del traslado">
      ${steps.map((step, index) => {
        const done = Boolean(step.value);
        const active = !done && index === firstPendingIndex;
        return `
          <span class="joathiva-status-step ${done ? "is-done" : ""} ${active ? "is-active" : ""}">
            <strong>${escapeHtml(step.label)}</strong>
            <span>${done ? escapeHtml(formatDateTime(step.value)) : "Pendiente"}</span>
          </span>
        `;
      }).join("")}
    </div>
  `;
}

function renderBrokerWorkspace() {
  const home = document.querySelector("body[data-page='home'] .page-stack");
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!home || !user || user.role !== "broker") return;

  const host = document.querySelector("#brokerWorkspace");
  if (!host) return;

  const requests = getRequests()
    .slice()
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  const docs = getDocuments()
    .slice()
    .sort((left, right) => new Date(right.uploadedAt || 0).getTime() - new Date(left.uploadedAt || 0).getTime());
  const selectedRequest = resolveSelectedBrokerRequest(requests);
  const selectedDocs = selectedRequest ? docs.filter((doc) => doc.requestId === selectedRequest.id) : [];
  const summary = getBrokerOperationsSummary(requests, docs);
  const notifications = getVisibleNotifications(user)
    .filter((notification) => ["loading_started", "trip_started", "arrival_registered", "unloading_completed", "operation_completed"].includes(notification.eventType))
    .slice(0, 4);

  host.innerHTML = `
    <article class="panel joathiva-broker-overview">
      <div class="panel-heading">
        <p class="eyebrow">Despachante</p>
        <h2>Centro aduanero JoathiVA</h2>
        <p>Clasificacion arancelaria, gestion documental, declaracion aduanera, coordinacion logistica, asesoramiento legal y representacion en un mismo tablero.</p>
      </div>
      <div class="joathiva-broker-stat-grid">
        <article class="record-card joathiva-broker-stat">
          <strong>${escapeHtml(String(summary.totalOperations))}</strong>
          <p>Operaciones activas del broker</p>
        </article>
        <article class="record-card joathiva-broker-stat">
          <strong>${escapeHtml(String(summary.classificationPending))}</strong>
          <p>Clasificaciones arancelarias pendientes</p>
        </article>
        <article class="record-card joathiva-broker-stat">
          <strong>${escapeHtml(String(summary.documentPending))}</strong>
          <p>Operaciones con documentos incompletos</p>
        </article>
        <article class="record-card joathiva-broker-stat">
          <strong>${escapeHtml(String(summary.declarationPending))}</strong>
          <p>Declaraciones o numeraciones por completar</p>
        </article>
        <article class="record-card joathiva-broker-stat">
          <strong>${escapeHtml(String(summary.logisticsInMotion))}</strong>
          <p>Operaciones con viaje en movimiento</p>
        </article>
        <article class="record-card joathiva-broker-stat">
          <strong>${escapeHtml(String(summary.legalPending))}</strong>
          <p>Representacion o validacion legal pendientes</p>
        </article>
      </div>
    </article>
    <div class="content-grid joathiva-broker-top-grid">
      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Perfil</p>
          <h2>Ficha operativa del despachante</h2>
          <p>JoathiVA guarda lo minimo al alta y deja que el estudio aduanero complete su perfil operativo a medida que empieza a despachar.</p>
        </div>
        ${renderBrokerOperationalProfile(user, summary)}
      </article>
      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Sistema clave</p>
          <h2>Informacion util para el despacho</h2>
          <p>Estos son los datos que conviene capturar en JoathiVA para que el despachante evite errores, demoras y costos innecesarios.</p>
        </div>
        ${renderBrokerCriticalDataGuide()}
      </article>
      <article class="panel joathiva-lucia-panel">
        <div class="panel-heading">
          <p class="eyebrow">Sistema Lucia</p>
          <h2>Codigos arancelarios publicos</h2>
          <p>Referencia local de capitulos arancelarios publicada por DNA para apoyar la clasificacion inicial. La partida exacta debe validarse en la consulta oficial.</p>
        </div>
        ${renderLuciaArancelReference()}
        ${renderLuciaSmartSearchPanel()}
      </article>
    </div>
    <div class="content-grid joathiva-broker-work-grid">
      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Operaciones</p>
          <h2>Cola de trabajo aduanera</h2>
          <p>Selecciona una operacion para completar HS/NCM, declaracion, regimen, permisos y observaciones del despacho.</p>
        </div>
        <div class="stack-list">
          ${requests.length ? requests.map((request) => renderBrokerOperationCard(request, request.id === selectedRequest?.id, docs)).join("") : `
            <article class="record-card">
              <strong>Sin operaciones aduaneras</strong>
              <p>Cuando existan pedidos y viajes asociados, el despachante podra verlos y gestionarlos aqui.</p>
            </article>
          `}
        </div>
      </article>
      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Mesa de trabajo</p>
          <h2>${escapeHtml(selectedRequest?.cargoDescription || "Operacion sin seleccionar")}</h2>
          <p>${escapeHtml(selectedRequest ? "Completa la informacion critica del despacho y deja visible lo que falta para liberar la operacion." : "Selecciona una operacion para abrir su control aduanero.")}</p>
        </div>
        ${selectedRequest ? renderBrokerOperationWorkbench(selectedRequest, selectedDocs) : `
          <article class="record-card">
            <strong>Sin operacion seleccionada</strong>
            <p>Elige una operacion del panel izquierdo para trabajar clasificacion, declaracion y documentacion.</p>
          </article>
        `}
      </article>
    </div>
    <div class="content-grid joathiva-broker-bottom-grid">
      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Repositorio</p>
          <h2>Documentos por operacion</h2>
          <p>${escapeHtml(selectedRequest ? `Vista enfocada en ${selectedRequest.cargoDescription || "la operacion seleccionada"}.` : "Consulta facturas, permisos, declaratorias y respaldos asociados a cada traslado.")}</p>
        </div>
        <div class="stack-list">
          ${renderBrokerDocumentBoard(docs, selectedRequest)}
        </div>
      </article>
      <article class="panel">
        <div class="panel-heading">
          <p class="eyebrow">Transporte internacional</p>
          <h2>Funciones clave del proveedor logistico</h2>
          <p>Esto es lo que el proveedor debe cumplir para que el despachante tenga visibilidad, respaldo documental y una frontera fluida.</p>
        </div>
        ${renderBrokerTransportPartnerPanel(requests, notifications)}
      </article>
    </div>
  `;

  host.querySelectorAll("[data-joathiva-broker-request]").forEach((button) => {
    button.onclick = () => {
      joathiVaSelectedBrokerRequestId = button.dataset.joathivaBrokerRequest;
      renderBrokerWorkspace();
    };
  });

  host.querySelector("#joathivaBrokerProfileForm")?.addEventListener("submit", handleBrokerOperationalProfileSave);
  host.querySelector("#joathivaBrokerWorkbenchForm")?.addEventListener("submit", handleBrokerOperationWorkbenchSave);
  bindLuciaArancelReference(host);
  bindLuciaSmartSearch(host);
}

function renderAdminLuciaReference() {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const stack = document.querySelector("body[data-page='admin'] .page-stack");
  if (!stack || user?.role !== "master") {
    document.querySelector("#adminLuciaReferencePanel")?.remove();
    return;
  }

  let panel = document.querySelector("#adminLuciaReferencePanel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "adminLuciaReferencePanel";
    panel.className = "panel joathiva-lucia-admin-panel";
    const operationsPanel = document.querySelector("#admin-operations-board");
    if (operationsPanel) {
      operationsPanel.insertAdjacentElement("afterend", panel);
    } else {
      stack.appendChild(panel);
    }
  }

  panel.innerHTML = `
    <div class="panel-heading">
      <p class="eyebrow">Sistema Lucia</p>
      <h2>Acceso maestro y tablas de referencia</h2>
      <p>Proveedores y despachantes ingresan a Lucia con sus usuarios propios. El maestro puede abrir el sistema oficial desde aqui y consultar las tablas importadas sin guardar contrasenas en JoathiVA.</p>
    </div>
    <article class="record-card joathiva-business-note">
      <strong>Acceso local protegido</strong>
      <p>Si este equipo va a operar Lucia de forma habitual, guarda aqui la sesion local. El usuario queda visible y la clave se protege en el servidor local, no en el navegador.</p>
      <form class="form-grid" data-lucia-settings-form>
        <label>
          Usuario Lucia
          <input name="username" type="text" placeholder="usuario@empresa o usuario web comun" autocomplete="off">
        </label>
        <label>
          Clave Lucia
          <input name="password" type="password" placeholder="Clave local protegida" autocomplete="new-password">
        </label>
        <label class="full-width">
          URL del menu
          <input name="menuUrl" type="url" value="https://aplicaciones.aduanas.gub.uy/LuciaXMenuNuevo/Globales.Menues.Inicio.aspx">
        </label>
        <div class="hero-actions full-width">
          <button type="submit" class="button button-accent">Guardar acceso local</button>
          <button type="button" class="button button-secondary" data-lucia-settings-clear>Limpiar acceso</button>
        </div>
      </form>
      <div class="stack-list" data-lucia-settings-status></div>
    </article>
    <article class="record-card joathiva-business-note">
      <strong>Ruta segura de acceso</strong>
      <div class="stack-list">
        <article class="record-card">
          <strong>1. Abrir el menu oficial</strong>
          <p>Usa el enlace autenticado de Lucía desde esta pantalla para entrar en la sesion oficial del navegador local.</p>
        </article>
        <article class="record-card">
          <strong>2. Autenticacion propia</strong>
          <p>El usuario web comun o el usuario maestro debe autenticar su propia sesion. JoathiVA no captura ni reenvia contrasenas.</p>
        </article>
        <article class="record-card">
          <strong>3. Consulta operativa</strong>
          <p>Apoya la clasificacion, tabla de referencia y validacion manual contra la pantalla oficial antes de numerar o presentar una operacion.</p>
        </article>
      </div>
    </article>
    <article class="record-card joathiva-business-note">
      <strong>Importador de exportaciones Lucía</strong>
      <p>Este bloque toma el export publico generado por el exportador local y lo indexa dentro de JoathiVA para consulta, auditoria y trazabilidad.</p>
      <form class="form-grid" data-lucia-import-form>
        <label class="full-width">
          Carpeta de exportacion
          <input name="sourceDir" type="text" value="C:\\Joathi\\tools\\lucia_export\\data\\lucia_public_export" autocomplete="off">
        </label>
        <div class="hero-actions full-width">
          <button type="submit" class="button button-accent">Importar exportaciones</button>
          <button type="button" class="button button-secondary" data-lucia-import-refresh>Actualizar estado</button>
        </div>
      </form>
      <div class="stack-list" data-lucia-import-status></div>
    </article>
    ${renderLuciaArancelReference()}
    ${renderLuciaSmartSearchPanel()}
  `;

  bindLuciaArancelReference(panel);
  bindLuciaSettings(panel);
  bindLuciaImport(panel);
  bindLuciaSmartSearch(panel);
}

function resolveSelectedBrokerRequest(requests) {
  if (!requests.length) {
    joathiVaSelectedBrokerRequestId = null;
    return null;
  }

  const selected = requests.find((request) => request.id === joathiVaSelectedBrokerRequestId) || requests[0];
  joathiVaSelectedBrokerRequestId = selected?.id || null;
  return selected;
}

function getBrokerOperationsSummary(requests, docs) {
  return requests.reduce((summary, request) => {
    const trip = typeof getTrip === "function" ? getTrip(request.tripId) : null;
    const timeline = normalizeOperationTimeline(trip?.operationTimeline);
    const docSummary = getBrokerRequestDocumentSummary(request, docs);
    const declarationReady = Boolean(request.customsDeclarationNumber || request.customsDeclarationStatus || docSummary.hasDeclaration);
    const legalReady = Boolean(request.customsRepresentationStatus && request.customsLegalStatus);

    summary.totalOperations += 1;
    if (!request.customsHsCode) summary.classificationPending += 1;
    if (docSummary.missing.length) summary.documentPending += 1;
    if (!declarationReady) summary.declarationPending += 1;
    if (timeline.tripStartedAt && !timeline.completedAt) summary.logisticsInMotion += 1;
    if (!legalReady) summary.legalPending += 1;
    return summary;
  }, {
    totalOperations: 0,
    classificationPending: 0,
    documentPending: 0,
    declarationPending: 0,
    logisticsInMotion: 0,
    legalPending: 0
  });
}

function renderBrokerOperationalProfile(user, summary) {
  const specialties = Array.isArray(user?.customsSpecialties) ? user.customsSpecialties : [];
  const systems = Array.isArray(user?.customsSystems) ? user.customsSystems : [];
  const regimes = Array.isArray(user?.customsRegimes) ? user.customsRegimes : [];
  const completionItems = [
    Boolean(user?.company),
    Boolean(user?.customsRegistryNumber),
    Boolean(user?.customsPrimaryOffice),
    Boolean(user?.customsJurisdiction),
    Boolean(user?.email),
    Boolean(user?.phone),
    Boolean(specialties.length),
    Boolean(systems.length),
    Boolean(regimes.length),
    Boolean(user?.customsRepresentationScope)
  ];
  const completionPercent = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);

  return `
    <div class="stack-list joathiva-broker-profile">
      <article class="record-card">
        <strong>Perfil profesional ${completionPercent}% completo</strong>
        <p>${escapeHtml(user.customsPrimaryOffice || "Aduana principal pendiente")} | ${escapeHtml(user.customsJurisdiction || "Jurisdiccion pendiente")}</p>
        <div class="badge-row">
          <span class="badge">Registro ${escapeHtml(user.customsRegistryNumber || "Pendiente")}</span>
          <span class="badge warning">Especialidades ${escapeHtml(String(specialties.length))}</span>
          <span class="badge success">Operaciones ${escapeHtml(String(summary.totalOperations))}</span>
        </div>
      </article>
      <form id="joathivaBrokerProfileForm" class="form-grid">
        <label>
          Estudio / empresa
          <input name="company" type="text" value="${escapeHtml(user.company || "")}" placeholder="Nombre comercial del estudio">
        </label>
        <label>
          Registro de despachante
          <input name="customsRegistryNumber" type="text" value="${escapeHtml(user.customsRegistryNumber || "")}" placeholder="Numero de registro habilitado">
        </label>
        <label>
          Aduana principal
          <input name="customsPrimaryOffice" type="text" value="${escapeHtml(user.customsPrimaryOffice || "")}" placeholder="Ejemplo: Aduana de Montevideo">
        </label>
        <label>
          Jurisdiccion
          <input name="customsJurisdiction" type="text" value="${escapeHtml(user.customsJurisdiction || "")}" placeholder="Zona o corredores que gestionas">
        </label>
        <label>
          Email operativo
          <input name="email" type="email" value="${escapeHtml(user.email || "")}" placeholder="aduana@empresa.com">
        </label>
        <label>
          Telefono operativo
          <input name="phone" type="text" value="${escapeHtml(user.phone || "")}" placeholder="+598 99 000 000">
        </label>
        <label class="full-width">
          Alcance de representacion
          <input name="customsRepresentationScope" type="text" value="${escapeHtml(user.customsRepresentationScope || "")}" placeholder="Representacion ante Aduana, VUCE y otros organismos">
        </label>
        <label>
          Especialidades
          <textarea name="customsSpecialties" rows="3" placeholder="Importacion&#10;Exportacion&#10;Transito internacional">${escapeHtml(specialties.join("\n"))}</textarea>
        </label>
        <label>
          Sistemas que operas
          <textarea name="customsSystems" rows="3" placeholder="Sistema Lucia&#10;VUCE&#10;MIC / CRT">${escapeHtml(systems.join("\n"))}</textarea>
        </label>
        <label class="full-width">
          Regimenes que trabajas
          <textarea name="customsRegimes" rows="2" placeholder="General, transito, admision temporaria">${escapeHtml(regimes.join("\n"))}</textarea>
        </label>
        <label class="full-width">
          Notas legales / operativas
          <textarea name="customsLegalNotes" rows="3" placeholder="Alcance del asesoramiento, observaciones regulatorias, restricciones frecuentes">${escapeHtml(user.customsLegalNotes || "")}</textarea>
        </label>
        <p class="form-note full-width">JoathiVA puede empezar con un alta simple y luego completar la ficha del despachante segun la operacion real, los organismos y los regimenes que utiliza.</p>
        <button type="submit" class="button button-primary">Guardar ficha del despachante</button>
      </form>
    </div>
  `;
}

function handleBrokerOperationalProfileSave(event) {
  event.preventDefault();
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user || user.role !== "broker") return;

  const formData = new FormData(event.currentTarget);
  user.company = String(formData.get("company") || "").trim();
  user.email = String(formData.get("email") || "").trim();
  user.phone = String(formData.get("phone") || "").trim();
  user.customsRegistryNumber = String(formData.get("customsRegistryNumber") || "").trim();
  user.customsPrimaryOffice = String(formData.get("customsPrimaryOffice") || "").trim();
  user.customsJurisdiction = String(formData.get("customsJurisdiction") || "").trim();
  user.customsRepresentationScope = String(formData.get("customsRepresentationScope") || "").trim();
  user.customsLegalNotes = String(formData.get("customsLegalNotes") || "").trim();
  if (typeof normalizeBrokerEntryList === "function") {
    user.customsSpecialties = normalizeBrokerEntryList(String(formData.get("customsSpecialties") || ""));
    user.customsSystems = normalizeBrokerEntryList(String(formData.get("customsSystems") || ""));
    user.customsRegimes = normalizeBrokerEntryList(String(formData.get("customsRegimes") || ""));
  }
  user.notificationsEnabled = true;

  persistState();
  renderBrokerWorkspace();
}

function renderBrokerCriticalDataGuide() {
  return `
    <div class="stack-list">
      <div class="joathiva-guide-grid">
        <article class="record-card">
          <strong>Clasificacion arancelaria</strong>
          <p>Codigo HS/NCM, descripcion comercial, valor declarado, pais de origen e Incoterm para definir aranceles, impuestos y restricciones.</p>
        </article>
        <article class="record-card">
          <strong>Gestion documental</strong>
          <p>Factura comercial, certificado de origen, permisos, declaratoria, packing y respaldos por organismo o frontera.</p>
        </article>
        <article class="record-card">
          <strong>Declaracion aduanera</strong>
          <p>Numero de declaracion, regimen aplicado, aduana interviniente, canal de control y estado dentro del sistema aduanero.</p>
        </article>
        <article class="record-card">
          <strong>Coordinacion logistica</strong>
          <p>Chofer, unidad, punto de carga, frontera, deposito, ETA, hitos del viaje y estado fisico del despacho.</p>
        </article>
        <article class="record-card">
          <strong>Asesoramiento legal</strong>
          <p>Notas regulatorias, restricciones no arancelarias, tributos, licencias y regimenes especiales aplicables.</p>
        </article>
        <article class="record-card">
          <strong>Representacion</strong>
          <p>Registro del despachante, alcance ante Aduana y organismos publicos, responsables y trazabilidad de la gestion.</p>
        </article>
      </div>
      <article class="record-card joathiva-business-note">
        <strong>Informacion que conviene capturar en JoathiVA</strong>
        <div class="badge-row">
          <span class="badge">HS / NCM</span>
          <span class="badge">Incoterm</span>
          <span class="badge">Pais de origen</span>
          <span class="badge">Aduana</span>
          <span class="badge">Regimen</span>
          <span class="badge">Declaracion</span>
          <span class="badge">Permisos</span>
          <span class="badge">Certificados</span>
          <span class="badge">ETA / frontera</span>
          <span class="badge">Representacion</span>
        </div>
      </article>
    </div>
  `;
}

function getLuciaArancelChapters() {
  return Array.isArray(window.JOATHIVA_LUCIA_ARANCEL_CHAPTERS) ? window.JOATHIVA_LUCIA_ARANCEL_CHAPTERS : [];
}

function getLuciaArancelSource() {
  return window.JOATHIVA_LUCIA_ARANCEL_SOURCE || {
    name: "Sistema Lucia - Codigos Arancelarios",
    url: "https://luciapub.aduanas.gub.uy/LuciapubX/DatoBasico.Arancel.HPUDBAr2Public.aspx",
    authenticatedMenuUrl: "https://aplicaciones.aduanas.gub.uy/LuciaXMenuNuevo/Globales.Menues.Inicio.aspx",
    capturedAt: "",
    note: ""
  };
}

function renderLuciaArancelReference() {
  const chapters = getLuciaArancelChapters();
  const source = getLuciaArancelSource();
  const visibleChapters = chapters.slice(0, 12);

  return `
    <div class="stack-list joathiva-lucia-reference" data-lucia-arancel-reference>
      <article class="record-card joathiva-business-note">
        <strong>${escapeHtml(String(chapters.length))} capitulos arancelarios disponibles</strong>
        <p>Fuente: ${escapeHtml(source.name)}${source.capturedAt ? ` | Captura ${escapeHtml(source.capturedAt)}` : ""}. JoathiVA conserva esta referencia para trazabilidad operativa y consulta rapida del despachante.</p>
      </article>
      <form class="form-grid joathiva-lucia-filter-form" data-lucia-arancel-form>
        <label>
          Buscar capitulo
          <input name="luciaArancelQuery" type="search" placeholder="Ej: vehiculos, alimentos, 87">
        </label>
        <label>
          Seleccionar capitulo
          <select name="luciaArancelCode">
            <option value="">Seleccionar</option>
            ${chapters.map((chapter) => `<option value="${escapeHtml(chapter.code)}">${escapeHtml(chapter.code)} | ${escapeHtml(chapter.description)}</option>`).join("")}
          </select>
        </label>
        <button type="button" class="button button-secondary" data-lucia-arancel-clear>Limpiar filtro</button>
        <a class="button button-primary" href="${escapeHtml(source.url)}" target="_blank" rel="noopener">Abrir consulta publica</a>
        <a class="button button-accent" href="${escapeHtml(source.authenticatedMenuUrl || source.url)}" target="_blank" rel="noopener">Abrir Sistema Lucia</a>
      </form>
      <div class="joathiva-lucia-results" data-lucia-arancel-results>
        ${visibleChapters.map(renderLuciaArancelChapterCard).join("")}
      </div>
      <p class="form-note">La pantalla oficial usa captcha para la busqueda de partidas y el menu autenticado requiere tu usuario web comun. JoathiVA no guarda credenciales ni automatiza ese acceso.</p>
      ${renderLuciaTablesReference()}
    </div>
  `;
}

function renderLuciaArancelChapterCard(chapter) {
  return `
    <article class="record-card joathiva-lucia-chapter-card" data-lucia-code="${escapeHtml(chapter.code)}">
      <strong>Capitulo ${escapeHtml(chapter.code)}</strong>
      <p>${escapeHtml(chapter.description)}</p>
      <div class="hero-actions">
        <button type="button" class="button button-secondary" data-lucia-use-chapter="${escapeHtml(chapter.code)}">Usar como base HS/NCM</button>
      </div>
    </article>
  `;
}

function filterLuciaArancelChapters(form) {
  const formData = new FormData(form);
  const query = normalizeText(String(formData.get("luciaArancelQuery") || ""));
  const selectedCode = String(formData.get("luciaArancelCode") || "").trim();
  const chapters = getLuciaArancelChapters();

  return chapters.filter((chapter) => {
    const matchesCode = !selectedCode || chapter.code === selectedCode;
    const haystack = normalizeText(`${chapter.code} ${chapter.description}`);
    const matchesQuery = !query || haystack.includes(query);
    return matchesCode && matchesQuery;
  });
}

function renderLuciaArancelResults(host) {
  const form = host.querySelector("[data-lucia-arancel-form]");
  const results = host.querySelector("[data-lucia-arancel-results]");
  if (!form || !results) return;

  const chapters = filterLuciaArancelChapters(form);
  results.innerHTML = chapters.length
    ? chapters.slice(0, 24).map(renderLuciaArancelChapterCard).join("")
    : `
      <article class="record-card">
        <strong>Sin coincidencias</strong>
        <p>Ajusta la busqueda o abre la consulta oficial para validar la nomenclatura completa.</p>
      </article>
    `;
  bindLuciaArancelUseButtons(host);
}

function bindLuciaArancelReference(scope = document) {
  scope.querySelectorAll("[data-lucia-arancel-reference]").forEach((host) => {
    const form = host.querySelector("[data-lucia-arancel-form]");
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";
    form.addEventListener("input", () => renderLuciaArancelResults(host));
    form.addEventListener("change", () => renderLuciaArancelResults(host));
    host.querySelector("[data-lucia-arancel-clear]")?.addEventListener("click", () => {
      form.reset();
      renderLuciaArancelResults(host);
    });
    bindLuciaArancelUseButtons(host);
    bindLuciaReferenceTables(host);
  });
}

function bindLuciaArancelUseButtons(scope = document) {
  scope.querySelectorAll("[data-lucia-use-chapter]").forEach((button) => {
    button.onclick = () => {
      const code = String(button.dataset.luciaUseChapter || "").trim();
      const input = document.querySelector("#joathivaBrokerWorkbenchForm input[name='customsHsCode']");
      if (!input || !code) return;
      const current = String(input.value || "").trim();
      input.value = current && !current.startsWith(code) ? `${code} ${current}` : (current || code);
      input.focus();
    };
  });
}

function getLuciaReferenceData() {
  return window.JOATHIVA_LUCIA_REFERENCE_DATA || {
    source: {},
    tables: [],
    tableCount: 0,
    rowCount: 0
  };
}

function getLuciaSmartSearchData() {
  return window.JOATHIVA_LUCIA_SMART_SEARCH_DATA || {
    generatedAt: "",
    entryCount: 0,
    entries: []
  };
}

function getLuciaOperationalData() {
  return window.JOATHIVA_LUCIA_OPERATIONAL_DATA || {
    generatedAt: "",
    exportDir: "",
    ftp: { rootCount: 0, fileCount: 0 },
    catalog: { packageCount: 0, resourceCount: 0 },
    packageMetadata: [],
    items: [],
    itemCount: 0
  };
}

function getLuciaFavorites() {
  try {
    const raw = localStorage.getItem("joathiva-lucia-favorites");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setLuciaFavorites(values) {
  localStorage.setItem("joathiva-lucia-favorites", JSON.stringify([...new Set(values)].slice(0, 40)));
}

function toggleLuciaFavorite(entryKey) {
  const favorites = getLuciaFavorites();
  if (favorites.includes(entryKey)) {
    setLuciaFavorites(favorites.filter((item) => item !== entryKey));
    return;
  }
  favorites.unshift(entryKey);
  setLuciaFavorites(favorites);
}

function searchLuciaSmartEntries({ query = "", tableId = "", favoritesOnly = false } = {}) {
  const data = getLuciaSmartSearchData();
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const favorites = new Set(getLuciaFavorites());
  const q = normalizeText(query);

  return entries.filter((entry) => {
    if (favoritesOnly && !favorites.has(entry.key)) return false;
    if (tableId && entry.tableId !== tableId) return false;
    if (!q) return true;
    const haystack = normalizeText([entry.label, entry.value, ...(entry.aliases || [])].join(" "));
    return haystack.includes(q);
  }).slice(0, 24);
}

function renderLuciaSmartSearchEntryCard(entry) {
  const favorites = new Set(getLuciaFavorites());
  const isFavorite = favorites.has(entry.key);
  return `
    <article class="record-card joathiva-lucia-smart-card">
      <strong>${escapeHtml(entry.label)}</strong>
      <p>${escapeHtml(entry.value || "Sin descripcion")} | ${escapeHtml(entry.tableTitle || "Tabla Lucia")}</p>
      <div class="badge-row">
        <span class="badge">${escapeHtml(entry.kind || "item")}</span>
        <span class="badge">${escapeHtml(entry.source || "local")}</span>
      </div>
      <div class="hero-actions">
        <button type="button" class="button button-secondary" data-lucia-favorite-toggle="${escapeHtml(entry.key)}">${isFavorite ? "Quitar favorito" : "Favorito"}</button>
      </div>
    </article>
  `;
}

function renderLuciaSmartSearchPanel() {
  const data = getLuciaReferenceData();
  const tables = Array.isArray(data.tables) ? data.tables : [];
  const smartData = getLuciaSmartSearchData();
  const favorites = getLuciaFavorites();
  const entries = searchLuciaSmartEntries();
  return `
    <section class="joathiva-lucia-smart-panel" data-lucia-smart-panel>
      <div class="panel-heading panel-divider">
        <p class="eyebrow">Centro Lucía</p>
        <h2>Buscador inteligente y favoritos</h2>
        <p>${escapeHtml(String(smartData.entryCount || 0))} referencias indexadas desde tablas y capitulos publicos. Favoritos: ${escapeHtml(String(favorites.length))}.</p>
      </div>
      <form class="form-grid joathiva-lucia-filter-form" data-lucia-smart-form>
        <label class="full-width">
          Busqueda global
          <input name="luciaSmartQuery" type="search" placeholder="CIF, banco, bulto, contenedor, observacion, 40 pies">
        </label>
        <label>
          Tabla
          <select name="luciaSmartTable">
            <option value="">Todas</option>
            ${tables.map((table) => `<option value="${escapeHtml(table.id)}">${escapeHtml(table.title)}</option>`).join("")}
          </select>
        </label>
        <label>
          Favoritos
          <select name="luciaSmartFavorites">
            <option value="all">Todos</option>
            <option value="only">Solo favoritos</option>
          </select>
        </label>
        <div class="hero-actions full-width">
          <button type="button" class="button button-secondary" data-lucia-smart-clear>Limpiar</button>
          <a class="button button-primary" href="${escapeHtml(getLuciaArancelSource().authenticatedMenuUrl || getLuciaArancelSource().url)}" target="_blank" rel="noopener">Abrir Sistema Lucia</a>
        </div>
      </form>
      <div class="stack-list">
        <article class="record-card joathiva-business-note">
          <strong>Acceso rapido</strong>
          <p>Usa este buscador para ubicar codigos, tablas, equivalencias y referencias operativas sin salir del panel.</p>
        </article>
        <div class="joathiva-lucia-smart-results" data-lucia-smart-results>
          ${entries.length ? entries.map(renderLuciaSmartSearchEntryCard).join("") : `
            <article class="record-card"><strong>Sin resultados</strong><p>Prueba con otro termino o cambia la tabla seleccionada.</p></article>
          `}
        </div>
      </div>
    </section>
  `;
}

function renderLuciaSmartSearchResults(host) {
  const form = host.querySelector("[data-lucia-smart-form]");
  const results = host.querySelector("[data-lucia-smart-results]");
  if (!form || !results) return;
  const formData = new FormData(form);
  const query = String(formData.get("luciaSmartQuery") || "");
  const tableId = String(formData.get("luciaSmartTable") || "").trim();
  const favoritesOnly = String(formData.get("luciaSmartFavorites") || "all") === "only";
  const entries = searchLuciaSmartEntries({ query, tableId, favoritesOnly });
  results.innerHTML = entries.length ? entries.map(renderLuciaSmartSearchEntryCard).join("") : `
    <article class="record-card"><strong>Sin coincidencias</strong><p>Ajusta el criterio o cambia el filtro de tabla.</p></article>
  `;
  bindLuciaSmartSearchButtons(host);
}

function bindLuciaSmartSearchButtons(scope = document) {
  scope.querySelectorAll("[data-lucia-favorite-toggle]").forEach((button) => {
    button.onclick = () => {
      toggleLuciaFavorite(String(button.dataset.luciaFavoriteToggle || ""));
      const panel = button.closest("[data-lucia-smart-panel]");
      if (panel) renderLuciaSmartSearchResults(panel);
    };
  });
}

function bindLuciaSmartSearch(scope = document) {
  scope.querySelectorAll("[data-lucia-smart-panel]").forEach((host) => {
    const form = host.querySelector("[data-lucia-smart-form]");
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";
    form.addEventListener("input", () => renderLuciaSmartSearchResults(host));
    form.addEventListener("change", () => renderLuciaSmartSearchResults(host));
    host.querySelector("[data-lucia-smart-clear]")?.addEventListener("click", () => {
      form.reset();
      renderLuciaSmartSearchResults(host);
    });
    bindLuciaSmartSearchButtons(host);
  });
}

function renderLuciaTablesReference() {
  const data = getLuciaReferenceData();
  const tables = Array.isArray(data.tables) ? data.tables : [];
  if (!tables.length) {
    return `
      <article class="record-card">
        <strong>Tablas generales sin cargar</strong>
        <p>Cuando se carguen archivos XLSX de Lucia, JoathiVA mostrara aqui las tablas de codigos y equivalencias.</p>
      </article>
    `;
  }

  return `
    <section class="joathiva-lucia-table-reference" data-lucia-table-reference>
      <div class="panel-heading panel-divider">
        <p class="eyebrow">Tablas generales</p>
        <h2>Codigos operativos importados</h2>
        <p>${escapeHtml(String(data.tableCount || tables.length))} tablas y ${escapeHtml(String(data.rowCount || 0))} registros cargados desde archivos XLSX locales.</p>
      </div>
      <form class="form-grid joathiva-lucia-filter-form" data-lucia-table-form>
        <label>
          Buscar codigo o descripcion
          <input name="luciaTableQuery" type="search" placeholder="Ej: CIF, contenedor, bulto, banco, observacion">
        </label>
        <label>
          Tabla
          <select name="luciaTableId">
            <option value="">Todas las tablas</option>
            ${tables.map((table) => `<option value="${escapeHtml(table.id)}">${escapeHtml(table.title)} (${escapeHtml(String(table.rowCount || 0))})</option>`).join("")}
          </select>
        </label>
        <button type="button" class="button button-secondary" data-lucia-table-clear>Limpiar tablas</button>
      </form>
      <div class="joathiva-lucia-table-results" data-lucia-table-results>
        ${renderLuciaTableOverviewCards(tables)}
      </div>
      <p class="form-note">Estas tablas son referencia operativa local. Para presentar o numerar operaciones, valida siempre contra el Sistema Lucia oficial y el usuario habilitado correspondiente.</p>
    </section>
  `;
}

function renderLuciaTableOverviewCards(tables) {
  return tables.slice(0, 12).map((table) => `
    <article class="record-card joathiva-lucia-table-card">
      <strong>${escapeHtml(table.title)}</strong>
      <p>${escapeHtml(table.sourceFile || "Archivo local")} | ${escapeHtml(String(table.rowCount || 0))} registros</p>
      <div class="badge-row">
        ${(Array.isArray(table.columns) ? table.columns : []).slice(0, 5).map((column) => `<span class="badge">${escapeHtml(column)}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

function filterLuciaTableRows(form) {
  const data = getLuciaReferenceData();
  const tables = Array.isArray(data.tables) ? data.tables : [];
  const formData = new FormData(form);
  const query = normalizeText(String(formData.get("luciaTableQuery") || ""));
  const selectedTableId = String(formData.get("luciaTableId") || "").trim();
  const filteredTables = tables.filter((table) => !selectedTableId || table.id === selectedTableId);

  if (!query && !selectedTableId) {
    return { mode: "overview", tables };
  }

  const rows = [];
  filteredTables.forEach((table) => {
    const tableRows = Array.isArray(table.rows) ? table.rows : [];
    tableRows.forEach((row) => {
      const haystack = normalizeText(`${table.title} ${table.sourceFile} ${Object.values(row || {}).join(" ")}`);
      if (!query || haystack.includes(query)) {
        rows.push({ table, row });
      }
    });
  });

  return { mode: "rows", rows };
}

function renderLuciaTableRowCard(item) {
  const entries = Object.entries(item.row || {}).filter(([, value]) => String(value ?? "").trim() !== "");
  return `
    <article class="record-card joathiva-lucia-table-card">
      <strong>${escapeHtml(item.table.title)}</strong>
      <p>${escapeHtml(item.table.sourceFile || "Archivo local")}</p>
      <div class="data-grid">
        ${entries.slice(0, 8).map(([key, value]) => `<span><strong>${escapeHtml(key)}</strong>${escapeHtml(String(value))}</span>`).join("")}
      </div>
    </article>
  `;
}

function renderLuciaTableResults(host) {
  const form = host.querySelector("[data-lucia-table-form]");
  const results = host.querySelector("[data-lucia-table-results]");
  if (!form || !results) return;

  const filtered = filterLuciaTableRows(form);
  if (filtered.mode === "overview") {
    results.innerHTML = renderLuciaTableOverviewCards(filtered.tables);
    return;
  }

  results.innerHTML = filtered.rows.length
    ? filtered.rows.slice(0, 40).map(renderLuciaTableRowCard).join("")
    : `
      <article class="record-card">
        <strong>Sin coincidencias</strong>
        <p>Ajusta la busqueda o selecciona otra tabla de referencia.</p>
      </article>
    `;
}

function bindLuciaReferenceTables(scope = document) {
  scope.querySelectorAll("[data-lucia-table-reference]").forEach((host) => {
    const form = host.querySelector("[data-lucia-table-form]");
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";
    form.addEventListener("input", () => renderLuciaTableResults(host));
    form.addEventListener("change", () => renderLuciaTableResults(host));
    host.querySelector("[data-lucia-table-clear]")?.addEventListener("click", () => {
      form.reset();
      renderLuciaTableResults(host);
    });
  });
}

function getLuciaSettingsApiUrl() {
  if (typeof getJoathiVaApiUrl === "function") {
    const apiUrl = getJoathiVaApiUrl("/api/lucia/settings");
    if (apiUrl) return apiUrl;
  }

  if (/^https?:/i.test(window.location.origin || "")) {
    return "/api/lucia/settings";
  }

  return "";
}

async function loadLuciaSettings(form) {
  const url = getLuciaSettingsApiUrl();
  if (!url || !form) return;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({ peek: true })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) return;
    form.username.value = data.username || "";
    form.menuUrl.value = data.menuUrl || form.menuUrl.value;
    const status = form.closest("[data-lucia-settings-form]")?.parentElement?.querySelector("[data-lucia-settings-status]");
    if (status) {
      status.innerHTML = `
        <article class="record-card">
          <strong>Estado actual</strong>
          <p>${escapeHtml(data.enabled ? "Acceso local habilitado" : "Sin acceso local guardado")} ${data.updatedAt ? `| Actualizado ${escapeHtml(data.updatedAt)}` : ""}</p>
          <p>${escapeHtml(data.usernameHint ? `Usuario ${data.usernameHint}` : "Usuario no configurado")}${data.hasPassword ? " | Clave protegida" : ""}</p>
        </article>
      `;
    }
  } catch {
  }
}

function bindLuciaSettings(scope = document) {
  scope.querySelectorAll("[data-lucia-settings-form]").forEach((form) => {
    if (form.dataset.bound === "true") return;
    form.dataset.bound = "true";
    loadLuciaSettings(form);

    const status = form.closest(".record-card")?.querySelector("[data-lucia-settings-status]");
    const clearButton = form.querySelector("[data-lucia-settings-clear]");
    clearButton?.addEventListener("click", async () => {
      const url = getLuciaSettingsApiUrl();
      if (!url) return;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          cache: "no-store",
          body: JSON.stringify({
            username: "",
            password: "",
            menuUrl: form.menuUrl.value || "",
            clearPassword: true
          })
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.ok) throw new Error(result?.error || "No se pudo limpiar el acceso.");
        await loadLuciaSettings(form);
      } catch (error) {
        if (status) {
          status.innerHTML = `
            <article class="record-card">
              <strong>Error</strong>
              <p>${escapeHtml(error?.message || "No se pudo limpiar el acceso.")}</p>
            </article>
          `;
        }
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const url = getLuciaSettingsApiUrl();
      if (!url) return;

      const formData = new FormData(form);
      const payload = {
        username: String(formData.get("username") || "").trim(),
        password: String(formData.get("password") || ""),
        menuUrl: String(formData.get("menuUrl") || "").trim()
      };

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          cache: "no-store",
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.ok) throw new Error(result?.error || "No se pudo guardar el acceso.");
        form.password.value = "";
        await loadLuciaSettings(form);
      } catch (error) {
        if (status) {
          status.innerHTML = `
            <article class="record-card">
              <strong>Error</strong>
              <p>${escapeHtml(error?.message || "No se pudo guardar el acceso.")}</p>
            </article>
          `;
        }
      }
    });
  });
}

function getLuciaImportApiUrl() {
  if (typeof getJoathiVaApiUrl === "function") {
    const apiUrl = getJoathiVaApiUrl("/api/lucia/import");
    if (apiUrl) return apiUrl;
  }
  if (/^https?:/i.test(window.location.origin || "")) {
    return "/api/lucia/import";
  }
  return "";
}

async function loadLuciaImportStatus(host) {
  const status = host.querySelector("[data-lucia-import-status]");
  const url = getLuciaImportApiUrl();
  if (!status || !url) return;

  try {
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) throw new Error(data?.error || "No se pudo leer el estado.");
    const state = data.state || {};
    status.innerHTML = `
      <article class="record-card">
        <strong>Estado actual</strong>
        <p>${escapeHtml(state.sourceDir ? `Origen: ${state.sourceDir}` : "Sin importaciones guardadas")} ${state.updatedAt ? `| Actualizado ${escapeHtml(state.updatedAt)}` : ""}</p>
        <p>${escapeHtml(String(state.importCount || 0))} registros indexados | ${escapeHtml(String(state.fileCount || 0))} filas de manifiesto</p>
      </article>
    `;
  } catch (error) {
    status.innerHTML = `
      <article class="record-card">
        <strong>Error</strong>
        <p>${escapeHtml(error?.message || "No se pudo leer el estado.")}</p>
      </article>
    `;
  }
}

function bindLuciaImport(scope = document) {
  scope.querySelectorAll("[data-lucia-import-form]").forEach((form) => {
    if (form.dataset.bound === "true") return;
    form.dataset.bound = "true";
    const host = form.closest(".record-card") || form.parentElement;
    loadLuciaImportStatus(host);

    host.querySelector("[data-lucia-import-refresh]")?.addEventListener("click", () => loadLuciaImportStatus(host));

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const url = getLuciaImportApiUrl();
      const status = host.querySelector("[data-lucia-import-status]");
      if (!url || !status) return;

      const formData = new FormData(form);
      const payload = {
        sourceDir: String(formData.get("sourceDir") || "").trim()
      };

      status.innerHTML = `
        <article class="record-card">
          <strong>Importando</strong>
          <p>Procesando exportaciones publicas de Lucía en esta PC.</p>
        </article>
      `;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          cache: "no-store",
          body: JSON.stringify(payload)
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok) throw new Error(data?.error || "No se pudo importar.");
        status.innerHTML = `
          <article class="record-card">
            <strong>Importacion completada</strong>
            <p>${escapeHtml(String(data.packageCount || 0))} paquetes y ${escapeHtml(String(data.fileCount || 0))} archivos indexados.</p>
          </article>
        `;
      } catch (error) {
        status.innerHTML = `
          <article class="record-card">
            <strong>Error</strong>
            <p>${escapeHtml(error?.message || "No se pudo importar.")}</p>
          </article>
        `;
      }
    });
  });
}

function renderBrokerOperationCard(request, selected, docs) {
  const trip = typeof getTrip === "function" ? getTrip(request.tripId) : null;
  const customer = typeof getUser === "function" ? getUser(request.userId) : null;
  const invoice = request.invoiceRecord || {};
  const docSummary = getBrokerRequestDocumentSummary(request, docs);
  const completionPercent = getBrokerRequestCompletionPercent(request, docSummary);
  const declarationLabel = request.customsDeclarationNumber || request.customsDeclarationStatus || (docSummary.hasDeclaration ? "Declaratoria cargada" : "Pendiente");
  return `
    <article class="record-card ${selected ? "joathiva-selected-card" : ""}">
      <strong>${escapeHtml(request.cargoDescription || "Operacion")}</strong>
      <p>${escapeHtml(customer?.company || customer?.displayName || "Cliente")} | ${escapeHtml(trip ? `${trip.currentLocation} -> ${trip.returnDestination}` : "Sin viaje")}</p>
      <div class="badge-row">
        <span class="badge${request.customsHsCode ? " success" : " error"}">HS ${escapeHtml(request.customsHsCode || "Pendiente")}</span>
        <span class="badge${docSummary.missing.length ? " warning" : " success"}">Docs ${escapeHtml(String(docSummary.requestDocs.length))}</span>
        <span class="badge${declarationLabel === "Pendiente" ? " warning" : " success"}">${escapeHtml(declarationLabel)}</span>
      </div>
      <div class="data-grid">
        <span><strong>Cliente</strong>${escapeHtml(customer?.displayName || "Pendiente")}</span>
        <span><strong>Estado viaje</strong>${escapeHtml(trip ? getTrackingStatusLabel(trip) : "Pendiente")}</span>
        <span><strong>Incoterm</strong>${escapeHtml(request.customsIncoterm || "Pendiente")}</span>
        <span><strong>Regimen</strong>${escapeHtml(request.customsRegime || "Pendiente")}</span>
        <span><strong>Carga</strong>${formatDateTimeOrPending(invoice.operationTimeline?.loadingStartedAt)}</span>
        <span><strong>Inicio viaje</strong>${formatDateTimeOrPending(invoice.operationTimeline?.tripStartedAt)}</span>
        <span><strong>Aduana</strong>${escapeHtml(request.customsDestinationCustoms || "Pendiente")}</span>
        <span><strong>Avance</strong>${escapeHtml(String(completionPercent))}%</span>
        <span><strong>Total</strong>${formatCurrency(request.billing?.total || 0)}</span>
        <span><strong>Facturacion</strong>${escapeHtml(invoice.paymentStatusLabel || "Pendiente")}</span>
      </div>
      <div class="hero-actions">
        <button type="button" class="button ${selected ? "button-primary" : "button-secondary"}" data-joathiva-broker-request="${request.id}">${selected ? "Operacion abierta" : "Gestionar operacion"}</button>
      </div>
    </article>
  `;
}

function getBrokerRequestDocumentSummary(request, docs) {
  const requestDocs = docs.filter((doc) => doc.requestId === request.id);
  const hasInvoice = requestDocs.some((doc) => isBrokerDocumentMatch(doc, ["factura", "invoice"]));
  const hasDeclaration = requestDocs.some((doc) => isBrokerDocumentMatch(doc, ["declaratoria", "declaracion", "dua"]));
  const hasPermit = requestDocs.some((doc) => isBrokerDocumentMatch(doc, ["permiso", "certificado", "origen", "licencia"]));
  const missing = [];

  if (!hasInvoice) missing.push("Factura comercial");
  if (!hasDeclaration) missing.push("Declaracion aduanera");
  if (!hasPermit) missing.push("Permisos / certificados");

  return {
    requestDocs,
    hasInvoice,
    hasDeclaration,
    hasPermit,
    missing
  };
}

function isBrokerDocumentMatch(doc, keywords) {
  const haystack = normalizeText(`${doc?.documentType || ""} ${doc?.fileName || ""}`);
  return keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
}

function getBrokerRequestCompletionPercent(request, docSummary) {
  const checkpoints = [
    Boolean(request.customsHsCode),
    Boolean(request.customsIncoterm),
    Boolean(request.customsOriginCountry),
    Boolean(request.customsDestinationCustoms),
    Boolean(request.customsRegime),
    Boolean(request.customsDeclarationNumber || request.customsDeclarationStatus || docSummary.hasDeclaration),
    Boolean(request.customsRepresentationStatus),
    Boolean(request.customsLegalStatus),
    !docSummary.missing.length
  ];
  return Math.round((checkpoints.filter(Boolean).length / checkpoints.length) * 100);
}

function renderBrokerOperationWorkbench(request, docs) {
  const trip = typeof getTrip === "function" ? getTrip(request.tripId) : null;
  const customer = typeof getUser === "function" ? getUser(request.userId) : null;
  const invoice = request.invoiceRecord || {};
  const docSummary = getBrokerRequestDocumentSummary(request, docs);
  const checklist = [
    {
      title: "Clasificacion arancelaria",
      ready: Boolean(request.customsHsCode),
      detail: request.customsHsCode || "Falta HS / NCM"
    },
    {
      title: "Gestion documental",
      ready: !docSummary.missing.length,
      detail: docSummary.missing.length ? `Faltan ${docSummary.missing.join(", ")}` : "Documentacion base cargada"
    },
    {
      title: "Declaracion aduanera",
      ready: Boolean(request.customsDeclarationNumber || request.customsDeclarationStatus || docSummary.hasDeclaration),
      detail: request.customsDeclarationNumber || request.customsDeclarationStatus || "Pendiente"
    },
    {
      title: "Coordinacion logistica",
      ready: Boolean(invoice.operationTimeline?.tripStartedAt || invoice.operationTimeline?.loadingStartedAt),
      detail: invoice.operationTimeline?.tripStartedAt ? "Viaje iniciado y visible" : "Esperando hito operativo"
    },
    {
      title: "Asesoramiento legal",
      ready: Boolean(request.customsLegalStatus),
      detail: request.customsLegalStatus || "Pendiente"
    },
    {
      title: "Representacion",
      ready: Boolean(request.customsRepresentationStatus),
      detail: request.customsRepresentationStatus || "Pendiente"
    }
  ];

  return `
    <div class="stack-list joathiva-broker-workbench">
      <article class="record-card">
        <strong>${escapeHtml(customer?.company || customer?.displayName || "Cliente")} | ${escapeHtml(trip ? `${trip.currentLocation} -> ${trip.returnDestination}` : "Sin viaje")}</strong>
        <p>${escapeHtml(request.notes || "Sin observaciones del cliente. Usa esta mesa para completar el control aduanero de la operacion.")}</p>
        <div class="data-grid">
          <span><strong>Cliente</strong>${escapeHtml(customer?.displayName || "Pendiente")}</span>
          <span><strong>Pais origen</strong>${escapeHtml(request.customsOriginCountry || trip?.originCountry || "Pendiente")}</span>
          <span><strong>Aduana</strong>${escapeHtml(request.customsDestinationCustoms || "Pendiente")}</span>
          <span><strong>Total operacion</strong>${formatCurrency(request.billing?.total || 0)}</span>
          <span><strong>Carga</strong>${formatDateTimeOrPending(invoice.operationTimeline?.loadingStartedAt)}</span>
          <span><strong>Inicio viaje</strong>${formatDateTimeOrPending(invoice.operationTimeline?.tripStartedAt)}</span>
        </div>
      </article>
      <div class="joathiva-checklist">
        ${checklist.map((item) => `
          <article class="record-card">
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.detail)}</p>
            <span class="badge${item.ready ? " success" : " warning"}">${item.ready ? "Listo" : "Pendiente"}</span>
          </article>
        `).join("")}
      </div>
      <form id="joathivaBrokerWorkbenchForm" class="form-grid" data-request-id="${request.id}">
        <label>
          Codigo arancelario HS / NCM
          <input name="customsHsCode" type="text" value="${escapeHtml(request.customsHsCode || "")}" placeholder="Ejemplo: 8704.21.90">
        </label>
        <label>
          Incoterm
          <input name="customsIncoterm" type="text" value="${escapeHtml(request.customsIncoterm || "")}" placeholder="EXW, FOB, CIF, DDP">
        </label>
        <label>
          Pais de origen de la mercaderia
          <input name="customsOriginCountry" type="text" value="${escapeHtml(request.customsOriginCountry || trip?.originCountry || "")}" placeholder="Pais de origen">
        </label>
        <label>
          Aduana / punto de control
          <input name="customsDestinationCustoms" type="text" value="${escapeHtml(request.customsDestinationCustoms || "")}" placeholder="Aduana interviniente o frontera">
        </label>
        <label>
          Regimen aduanero
          <input name="customsRegime" type="text" value="${escapeHtml(request.customsRegime || "")}" placeholder="General, transito, admision temporaria">
        </label>
        <label>
          Numero de declaracion
          <input name="customsDeclarationNumber" type="text" value="${escapeHtml(request.customsDeclarationNumber || "")}" placeholder="Numero o referencia de la declaracion">
        </label>
        <label>
          Estado de declaracion
          <select name="customsDeclarationStatus">
            ${renderBrokerSelectOptions([
              { value: "", label: "Seleccionar" },
              { value: "pendiente", label: "Pendiente" },
              { value: "en_preparacion", label: "En preparacion" },
              { value: "presentada", label: "Presentada" },
              { value: "oficializada", label: "Oficializada" },
              { value: "liberada", label: "Liberada" }
            ], request.customsDeclarationStatus)}
          </select>
        </label>
        <label>
          Estado de representacion
          <select name="customsRepresentationStatus">
            ${renderBrokerSelectOptions([
              { value: "", label: "Seleccionar" },
              { value: "pendiente", label: "Pendiente" },
              { value: "validada", label: "Validada" },
              { value: "activa", label: "Activa" }
            ], request.customsRepresentationStatus)}
          </select>
        </label>
        <label>
          Estado legal / regulatorio
          <select name="customsLegalStatus">
            ${renderBrokerSelectOptions([
              { value: "", label: "Seleccionar" },
              { value: "pendiente", label: "Pendiente" },
              { value: "en_revision", label: "En revision" },
              { value: "observado", label: "Observado" },
              { value: "validado", label: "Validado" }
            ], request.customsLegalStatus)}
          </select>
        </label>
        <label class="full-width">
          Permisos, certificados y observaciones
          <textarea name="customsPermitsNotes" rows="3" placeholder="Permisos sanitarios, certificados de origen, licencias, notas de frontera">${escapeHtml(request.customsPermitsNotes || "")}</textarea>
        </label>
        <label class="full-width">
          Notas internas del despachante
          <textarea name="customsBrokerNotes" rows="3" placeholder="Observaciones operativas, riesgos, faltantes o coordinaciones pendientes">${escapeHtml(request.customsBrokerNotes || "")}</textarea>
        </label>
        <p class="form-note full-width">Con estos datos JoathiVA puede cruzar clasificacion, documentacion, declaracion, seguimiento y coordinacion con el transporte internacional.</p>
        <button type="submit" class="button button-primary">Guardar control aduanero</button>
      </form>
    </div>
  `;
}

function handleBrokerOperationWorkbenchSave(event) {
  event.preventDefault();
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user || user.role !== "broker") return;

  const form = event.currentTarget;
  const request = getRequests().find((item) => item.id === form.dataset.requestId);
  if (!request) return;

  const formData = new FormData(form);
  request.customsHsCode = String(formData.get("customsHsCode") || "").trim();
  request.customsIncoterm = String(formData.get("customsIncoterm") || "").trim();
  request.customsOriginCountry = String(formData.get("customsOriginCountry") || "").trim();
  request.customsDestinationCustoms = String(formData.get("customsDestinationCustoms") || "").trim();
  request.customsRegime = String(formData.get("customsRegime") || "").trim();
  request.customsDeclarationNumber = String(formData.get("customsDeclarationNumber") || "").trim();
  request.customsDeclarationStatus = String(formData.get("customsDeclarationStatus") || "").trim();
  request.customsRepresentationStatus = String(formData.get("customsRepresentationStatus") || "").trim();
  request.customsLegalStatus = String(formData.get("customsLegalStatus") || "").trim();
  request.customsPermitsNotes = String(formData.get("customsPermitsNotes") || "").trim();
  request.customsBrokerNotes = String(formData.get("customsBrokerNotes") || "").trim();

  persistState();
  renderBrokerWorkspace();
}

function renderBrokerSelectOptions(options, selectedValue) {
  return options.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === selectedValue ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
}

function renderBrokerDocumentBoard(docs, selectedRequest) {
  const relevantDocs = selectedRequest ? docs.filter((doc) => doc.requestId === selectedRequest.id) : docs;
  if (!relevantDocs.length) {
    return `
      <article class="record-card">
        <strong>Sin documentos cargados</strong>
        <p>Los respaldos subidos por clientes o por la operacion apareceran aqui para control aduanero.</p>
      </article>
    `;
  }

  return relevantDocs.slice(0, 8).map((doc) => renderBrokerDocumentCard(doc)).join("");
}

function renderBrokerDocumentCard(doc) {
  const request = getRequests().find((item) => item.id === doc.requestId);
  const owner = typeof getUser === "function" ? getUser(doc.ownerUserId) : null;
  const trip = request ? getTrip(request.tripId) : null;
  const customer = request ? getUser(request.userId) : null;
  return `
    <article class="record-card">
      <strong>${escapeHtml(doc.documentType || "Documento")}</strong>
      <p>${escapeHtml(doc.fileName || "Archivo")} | ${escapeHtml(request?.cargoDescription || "Traslado")}</p>
      <div class="data-grid">
        <span><strong>Operacion</strong>${escapeHtml(trip ? `${trip.currentLocation} -> ${trip.returnDestination}` : "Sin viaje")}</span>
        <span><strong>Cliente</strong>${escapeHtml(customer?.company || customer?.displayName || "Pendiente")}</span>
        <span><strong>Subido por</strong>${escapeHtml(owner?.displayName || "Usuario")}</span>
        <span><strong>Fecha</strong>${escapeHtml(formatDateTime(doc.uploadedAt))}</span>
      </div>
      <div class="hero-actions">
        <a class="button button-secondary" href="${doc.dataUrl}" download="${escapeHtml(doc.fileName)}">Descargar</a>
      </div>
    </article>
  `;
}

function renderBrokerTransportPartnerPanel(requests, notifications) {
  const inMotion = requests
    .filter((request) => {
      const trip = getTrip(request.tripId);
      return Boolean(normalizeOperationTimeline(trip?.operationTimeline).tripStartedAt);
    })
    .slice(0, 2)
    .map((request) => {
      const trip = getTrip(request.tripId);
      return `
        <article class="record-card">
          <strong>${escapeHtml(request.cargoDescription || "Operacion en curso")}</strong>
          <p>${escapeHtml(trip ? `${trip.currentLocation} -> ${trip.returnDestination}` : "Sin ruta")}</p>
          <div class="data-grid">
            <span><strong>Chofer</strong>${escapeHtml(getDriver(trip?.driverId)?.name || "Pendiente")}</span>
            <span><strong>Unidad</strong>${escapeHtml(getVehicle(trip?.vehicleId)?.plate || "Pendiente")}</span>
          </div>
        </article>
      `;
    });

  return `
    <div class="stack-list">
      ${notifications.length ? notifications.map((notification) => `
        <article class="record-card">
          <strong>${escapeHtml(notification.title || "Hito operativo")}</strong>
          <p>${escapeHtml(notification.message || "El transporte reporto una novedad operativa.")}</p>
          <span class="badge">${escapeHtml(formatDateTime(notification.createdAt))}</span>
        </article>
      `).join("") : `
        <article class="record-card">
          <strong>Sin alertas recientes</strong>
          <p>Cuando el chofer registre hitos del viaje, el despachante los vera aqui para coordinar aduana, frontera y entrega.</p>
        </article>
      `}
      ${inMotion.join("")}
      <div class="joathiva-guide-grid">
        <article class="record-card">
          <strong>Planificacion y capacidad</strong>
          <p>Definir corredor, cupo disponible, equipo asignado y tiempos para que la carga sea ofrecida con anticipacion.</p>
        </article>
        <article class="record-card">
          <strong>Documentacion del transporte</strong>
          <p>MIC, CRT, seguro, habilitaciones, dominio, unidad y respaldos del chofer siempre listos para inspeccion.</p>
        </article>
        <article class="record-card">
          <strong>Tracking y ETA</strong>
          <p>Compartir GPS, comienzo de viaje, llegada, desvio y demoras para que cliente y despachante reaccionen a tiempo.</p>
        </article>
        <article class="record-card">
          <strong>Frontera, deposito y entrega</strong>
          <p>Coordinar carga, descarga, deposito, cruce fronterizo, incidencias y cierre documental de la operacion.</p>
        </article>
      </div>
    </div>
  `;
}

async function handleJoathiVaDocumentUpload(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user) return;

  const formData = new FormData(form);
  const requestId = String(formData.get("requestId") || "");
  const documentType = String(formData.get("documentType") || "").trim();
  const file = formData.get("documentFile");

  if (!(file instanceof File) || !file.name) {
    window.alert("Debes adjuntar un archivo para el repositorio.");
    return;
  }

  if (file.size > JOATHIVA_DOC_MAX_SIZE) {
    window.alert("El archivo supera el limite local de 1,5 MB para este MVP sin servidor.");
    return;
  }

  const dataUrl = await readFileAsDataUrl(file);
  state.documents = Array.isArray(state.documents) ? state.documents : [];
  state.documents.unshift({
    id: buildId("doc"),
    requestId,
    ownerUserId: user.id,
    documentType,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    dataUrl
  });
  persistState();
  form.reset();
  renderClientTrackingHub();
}

function renderClientDocuments(requests, userId) {
  const requestIds = new Set(requests.map((request) => request.id));
  const docs = getDocuments().filter((doc) => doc.ownerUserId === userId && requestIds.has(doc.requestId));

  if (!docs.length) {
    return `
      <article class="record-card">
        <strong>Repositorio vacio</strong>
        <p>Los archivos que subas desde JoathiVA quedaran visibles aqui para consulta rapida del usuario.</p>
      </article>
    `;
  }

  return docs.map((doc) => {
    const request = requests.find((item) => item.id === doc.requestId);
    return `
      <article class="record-card">
        <strong>${escapeHtml(doc.documentType)}</strong>
        <p>${escapeHtml(doc.fileName)} | ${request ? escapeHtml(request.cargoDescription) : "Traslado"}</p>
        <div class="data-grid">
          <span><strong>Subido</strong>${escapeHtml(formatDateTime(doc.uploadedAt))}</span>
          <span><strong>Tamano</strong>${escapeHtml(formatNumber(Math.round((doc.size || 0) / 1024)))} KB</span>
        </div>
        <div class="hero-actions">
          <a class="button button-secondary" href="${doc.dataUrl}" download="${escapeHtml(doc.fileName)}">Descargar</a>
        </div>
      </article>
    `;
  }).join("");
}

function renderDocumentUploadForm(requests, selectedRequest) {
  if (!requests.length) {
    return "";
  }

  return `
    <form id="joathivaDocumentForm" class="form-grid">
      <label>
        Traslado
        <select name="requestId" required>
          ${requests.map((request) => `<option value="${request.id}"${selectedRequest?.id === request.id ? " selected" : ""}>${escapeHtml(request.cargoDescription)} | ${escapeHtml(formatDate(request.createdAt.slice(0, 10)))}</option>`).join("")}
        </select>
      </label>
      <label>
        Tipo de documento
        <select name="documentType" required>
          <option value="">Seleccionar</option>
          <option>Permiso de aduana</option>
          <option>Declaratoria</option>
          <option>Factura</option>
          <option>Remito</option>
          <option>Otro</option>
        </select>
      </label>
      <label class="full-width upload-field">
        <span>Archivo</span>
        <input id="joathivaDocumentFile" name="documentFile" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" required>
        <label for="joathivaDocumentFile" class="button button-secondary upload-button">Adjuntar documento</label>
        <small data-file-name>Sin archivo seleccionado</small>
      </label>
      <button type="submit" class="button button-primary">Guardar en repositorio</button>
    </form>
  `;
}

function renderAdminSettlementCards() {
  const readyRequests = getRequests().filter((request) => request.invoiceRecord?.customerBillingList?.generatedAt || request.invoiceRecord?.providerReceipt?.generatedAt);
  if (!readyRequests.length) {
    return `
      <article class="record-card">
        <strong>Sin operaciones finalizadas</strong>
        <p>La cola de facturacion y los recibos del proveedor se generaran cuando un chofer marque la finalizacion completa del viaje.</p>
      </article>
    `;
  }

  return readyRequests.slice(0, 6).map((request) => {
    const invoice = request.invoiceRecord || {};
    const customer = invoice.customerBillingList || {};
    const receipt = invoice.providerReceipt || {};
    return `
      <article class="record-card">
        <strong>${escapeHtml(request.cargoDescription || "Pedido finalizado")}</strong>
        <div class="data-grid">
          <span><strong>Cliente</strong>${escapeHtml(customer.displayName || "Pendiente")}</span>
          <span><strong>Documento</strong>${escapeHtml(customer.documentLabel || "Pendiente")}</span>
          <span><strong>Total cliente</strong>${formatCurrency(customer.total || 0)}</span>
          <span><strong>Factura</strong>${escapeHtml(customer.invoiceNumber || "Pendiente")}</span>
          <span><strong>Proveedor</strong>${escapeHtml(receipt.providerDisplayName || "Pendiente")}</span>
          <span><strong>Recibo</strong>${escapeHtml(receipt.receiptNumber || "Pendiente")}</span>
          <span><strong>Monto proveedor</strong>${formatCurrency(receipt.amount || 0)}</span>
          <span><strong>Banco</strong>${escapeHtml(receipt.bankName || "Pendiente")}</span>
          <span><strong>Generado</strong>${formatDateTimeOrPending(customer.generatedAt || receipt.generatedAt)}</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderProviderReceiptCard(request) {
  const receipt = request.invoiceRecord?.providerReceipt || {};
  return `
    <article class="record-card">
      <strong>${escapeHtml(request.cargoDescription || "Operacion")}</strong>
      <div class="data-grid">
        <span><strong>Recibo</strong>${escapeHtml(receipt.receiptNumber || "Pendiente")}</span>
        <span><strong>Monto</strong>${formatCurrency(receipt.amount || 0)}</span>
        <span><strong>Estado</strong>${escapeHtml(receipt.statusLabel || "Pendiente")}</span>
        <span><strong>Generado</strong>${formatDateTimeOrPending(receipt.generatedAt)}</span>
        <span><strong>Banco</strong>${escapeHtml(receipt.bankName || "Pendiente")}</span>
        <span><strong>Cuenta</strong>${escapeHtml(receipt.bankAccountNumber || "Pendiente")}</span>
      </div>
    </article>
  `;
}

function renderClientInvoiceCards(requests, selectedRequest) {
  const scopedRequests = selectedRequest ? [selectedRequest] : requests;
  const readyRequests = scopedRequests.filter((request) => request.invoiceRecord?.customerBillingList?.generatedAt);

  if (!readyRequests.length) {
    return `
      <article class="record-card">
        <strong>Sin referencia de factura</strong>
        <p>Cuando la operacion quede finalizada, aqui veras el cliente a facturar, el total y la referencia comercial de JoathiVA.</p>
      </article>
    `;
  }

  return readyRequests.map((request) => {
    const customer = request.invoiceRecord?.customerBillingList || {};
    return `
      <article class="record-card">
        <strong>${escapeHtml(customer.invoiceNumber || "Factura JoathiVA")}</strong>
        <p>${escapeHtml(customer.company || customer.displayName || "Cliente")}</p>
        <div class="data-grid">
          <span><strong>Razon social</strong>${escapeHtml(customer.legalName || "Pendiente")}</span>
          <span><strong>Documento</strong>${escapeHtml(customer.documentLabel || "Pendiente")}</span>
          <span><strong>Email</strong>${escapeHtml(customer.email || "Pendiente")}</span>
          <span><strong>Telefono</strong>${escapeHtml(customer.phone || "Pendiente")}</span>
          <span><strong>Subtotal</strong>${formatCurrency(customer.customerSubtotal || 0)}</span>
          <span><strong>IVA</strong>${formatCurrency(customer.iva || 0)}</span>
          <span><strong>Total</strong>${formatCurrency(customer.total || 0)}</span>
          <span><strong>GPS carga</strong>${escapeHtml(customer.loadingStartedLocationLabel || "Pendiente")}</span>
        </div>
      </article>
    `;
  }).join("");
}

function getProviderDestinationRequests() {
  const providerTrips = getTrips();
  if (!providerTrips.length) return [];

  const corridorKeys = new Set(providerTrips.map((trip) => {
    return `${normalizeText(trip.returnDestination)}|${normalizeText(trip.destinationCountry)}`;
  }));

  return getRequests().filter((request) => {
    const trip = typeof getTrip === "function" ? getTrip(request.tripId) : null;
    if (!trip) return false;
    const key = `${normalizeText(trip.returnDestination)}|${normalizeText(trip.destinationCountry)}`;
    return corridorKeys.has(key);
  });
}

function renderProviderDemandCard(request) {
  const trip = typeof getTrip === "function" ? getTrip(request.tripId) : null;
  const customer = typeof getUser === "function" ? getUser(request.userId) : null;
  return `
    <article class="record-card">
      <strong>${escapeHtml(request.cargoDescription || "Pedido cliente")}</strong>
      <p>${escapeHtml(customer?.company || customer?.displayName || "Cliente")} | ${escapeHtml(trip?.returnDestination || "Destino")}, ${escapeHtml(trip?.destinationCountry || "")}</p>
      <div class="data-grid">
        <span><strong>Solicitado</strong>${escapeHtml(formatDateTime(request.createdAt))}</span>
        <span><strong>Total</strong>${formatCurrency(request.billing?.total || 0)}</span>
        <span><strong>Peso</strong>${escapeHtml(formatNumber(request.weightKg || 0))} kg</span>
        <span><strong>Volumen</strong>${escapeHtml(formatNumber(request.volumeM3 || 0))} m3</span>
        <span><strong>Cobro</strong>${escapeHtml(request.invoiceRecord?.paymentStatusLabel || "Pendiente")}</span>
        <span><strong>Ruta</strong>${escapeHtml(trip ? `${trip.currentLocation} -> ${trip.returnDestination}` : "Pendiente")}</span>
      </div>
    </article>
  `;
}

function getClientOriginProviderOptions(user, selectedRequest) {
  const favoriteRoutes = Array.isArray(user?.favoriteRoutes) ? user.favoriteRoutes : [];
  const originLabel = [user?.profileLocation?.city, user?.profileLocation?.country].filter(Boolean).join(", ") || String(user?.notificationOrigin || "").trim() || favoriteRoutes[0] || "";
  const selectedTrip = selectedRequest ? getTrip(selectedRequest.tripId) : null;
  const selectedTripDestination = selectedTrip ? [selectedTrip.returnDestination, selectedTrip.destinationCountry].filter(Boolean).join(", ") : "";

  const trips = getTrips()
    .filter((trip) => {
      if (trip.trackingStatus === "completed" || trip.status === "Finalizado") return false;
      const timeline = normalizeOperationTimeline(trip.operationTimeline);
      if (!timeline.tripStartedAt) return false;
      if (typeof isTripNearUser === "function" && isTripNearUser(trip, user)) return true;

      const destinationTerms = normalizeText([trip.returnDestination, trip.destinationCountry].filter(Boolean).join(" "));
      const fallbackTerms = normalizeText(selectedTripDestination || originLabel);
      return Boolean(destinationTerms && fallbackTerms && (destinationTerms.includes(fallbackTerms) || fallbackTerms.includes(destinationTerms)));
    })
    .sort((left, right) => {
      const leftActive = left.trackingStatus === "active" ? 1 : 0;
      const rightActive = right.trackingStatus === "active" ? 1 : 0;
      if (leftActive !== rightActive) return rightActive - leftActive;
      return new Date(normalizeOperationTimeline(right.operationTimeline).tripStartedAt || right.availableDate).getTime() -
        new Date(normalizeOperationTimeline(left.operationTimeline).tripStartedAt || left.availableDate).getTime();
    });

  return {
    originLabel,
    trips
  };
}

function renderClientOriginProviderList(originState) {
  if (!originState.originLabel) {
    return `
      <article class="record-card">
        <strong>Ubicacion pendiente</strong>
        <p>Permite la ubicacion del dispositivo para que JoathiVA te avise cuando un camion vaya a arribar a tu zona.</p>
      </article>
    `;
  }

  if (!originState.trips.length) {
    return `
      <article class="record-card">
        <strong>Sin camiones arribando por ahora</strong>
        <p>Hoy no hay unidades con viaje iniciado hacia ${escapeHtml(originState.originLabel)}.</p>
      </article>
    `;
  }

  return originState.trips.map(renderClientOriginProviderCard).join("");
}

function renderClientOriginProviderCard(trip) {
  const driver = typeof getDriver === "function" ? getDriver(trip.driverId) : null;
  const vehicle = typeof getVehicle === "function" ? getVehicle(trip.vehicleId) : null;
  const provider = typeof state !== "undefined" ? state.users.find((user) => user.role === "provider") : null;
  const timeline = normalizeOperationTimeline(trip.operationTimeline);

  return `
    <article class="record-card">
      <strong>Tienes algo que enviar, un camion estara arribando en algunas horas</strong>
      <p>${escapeHtml(driver?.name || "Chofer")} | ${escapeHtml(trip.currentLocation)} -> ${escapeHtml(trip.returnDestination)}</p>
      <div class="data-grid">
        <span><strong>Operador</strong>${escapeHtml(driver?.company || provider?.company || "Proveedor operativo")}</span>
        <span><strong>Unidad</strong>${escapeHtml(vehicle?.plate || "Pendiente")}</span>
        <span><strong>Inicio viaje</strong>${formatDateTimeOrPending(timeline.tripStartedAt)}</span>
        <span><strong>Estado</strong>${escapeHtml(getTrackingStatusLabel(trip))}</span>
        <span><strong>Espacio</strong>${escapeHtml(formatNumber(trip.availableM3 || 0))} m3</span>
        <span><strong>Peso</strong>${escapeHtml(formatNumber(trip.availableWeightKg || 0))} kg</span>
        <span><strong>Ultima senal</strong>${escapeHtml(trip.liveLocation?.updatedAt ? formatDateTime(trip.liveLocation.updatedAt) : "Sin GPS activo")}</span>
      </div>
      <div class="hero-actions">
        <a href="#solicitar-traslado" class="button button-secondary">Solicitar traslado</a>
      </div>
    </article>
  `;
}

function renderClientTrackingMap(request, trip) {
  if (!request || !trip?.liveLocation) {
    return `
      <article class="record-card">
        <strong>Mapa pendiente</strong>
        <p>Selecciona un pedido con viaje iniciado para ver la ubicacion compartida por el chofer.</p>
      </article>
    `;
  }

  return `
    <div class="joathiva-map-frame-wrap">
      <iframe
        class="joathiva-map-frame"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        src="${buildMapEmbedUrl(trip.liveLocation)}"
        title="Seguimiento de mercaderia"></iframe>
    </div>
    <div class="record-card joathiva-map-summary">
      <strong>${escapeHtml(request.cargoDescription)}</strong>
      <p>${escapeHtml(getTrackingStatusLabel(trip))} | ${escapeHtml(request.invoiceRecord?.paymentFlow || "El cliente le paga a JoathiVA")}</p>
      <div class="data-grid">
        <span><strong>Ultima senal</strong>${escapeHtml(formatDateTime(trip.liveLocation.updatedAt))}</span>
        <span><strong>Precision</strong>${escapeHtml(String(trip.liveLocation.accuracy || 0))} m</span>
        <span><strong>Carga</strong>${formatDateTimeOrPending(request.invoiceRecord?.operationTimeline?.loadingStartedAt)}</span>
        <span><strong>Comienzo viaje</strong>${formatDateTimeOrPending(request.invoiceRecord?.operationTimeline?.tripStartedAt)}</span>
        <span><strong>Llegada</strong>${formatDateTimeOrPending(request.invoiceRecord?.operationTimeline?.arrivalAt)}</span>
        <span><strong>Descarga</strong>${formatDateTimeOrPending(request.invoiceRecord?.operationTimeline?.unloadingCompletedAt)}</span>
        <span><strong>Cobro</strong>${escapeHtml(request.invoiceRecord?.paymentStatusLabel || "Pendiente de entrega")}</span>
        <span><strong>Pago proveedor</strong>${escapeHtml(request.invoiceRecord?.settlementStatusLabel || "Pendiente")}</span>
      </div>
      <div class="hero-actions">
        <a class="button button-secondary" href="${buildGoogleMapsUrl(trip.liveLocation)}" target="_blank" rel="noopener">Abrir mapa</a>
      </div>
    </div>
  `;
}

function renderClientRequestFocusCard(request, selectedRequestId) {
  const trip = getTrip(request.tripId);
  const selected = request.id === selectedRequestId;
  return `
    <article class="record-card ${selected ? "joathiva-selected-card" : ""}">
      <strong>${escapeHtml(request.cargoDescription || "Traslado contratado")}</strong>
      <p>${trip ? escapeHtml(`${trip.currentLocation} -> ${trip.returnDestination}`) : "Sin viaje asignado"}</p>
      <div class="data-grid">
        <span><strong>Estado</strong>${trip ? escapeHtml(getTrackingStatusLabel(trip)) : "Sin viaje"}</span>
        <span><strong>Total</strong>${formatCurrency(request.billing?.total || 0)}</span>
      </div>
      <div class="hero-actions">
        <button type="button" class="button button-primary" data-joathiva-focus-request="${request.id}">Ver en mapa</button>
      </div>
    </article>
  `;
}

function resolveSelectedTrip(trips) {
  if (!trips.length) return null;
  if (!joathiVaSelectedTripId || !trips.some((trip) => trip.id === joathiVaSelectedTripId)) {
    joathiVaSelectedTripId = trips[0].id;
  }
  return trips.find((trip) => trip.id === joathiVaSelectedTripId) || trips[0];
}

function resolveSelectedRequest(requests) {
  if (!requests.length) return null;
  if (!joathiVaSelectedRequestId || !requests.some((request) => request.id === joathiVaSelectedRequestId)) {
    joathiVaSelectedRequestId = requests[0].id;
  }
  return requests.find((request) => request.id === joathiVaSelectedRequestId) || requests[0];
}

function buildMapEmbedUrl(location) {
  const lat = Number(location.lat || 0);
  const lng = Number(location.lng || 0);
  const bbox = [lng - 0.08, lat - 0.05, lng + 0.08, lat + 0.05].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
}

function buildGoogleMapsUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.lat},${location.lng}`)}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getTrips() {
  return Array.isArray(state?.trips) ? state.trips : [];
}

function getRequests() {
  return Array.isArray(state?.requests) ? state.requests : [];
}

function getDocuments() {
  return Array.isArray(state?.documents) ? state.documents : [];
}

function getNotifications() {
  return Array.isArray(state?.notifications) ? state.notifications : [];
}
