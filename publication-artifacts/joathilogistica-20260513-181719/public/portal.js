const STORAGE_KEY = "joathiva-state";
const SESSION_KEY = "joathiva-session";
const LEGACY_STORAGE_KEY = "joathi-portal-state";
const LEGACY_SESSION_KEY = "joathi-portal-session";
const IVA_RATE = 0.22;
const EXTRA_WAIT_USD = 85;
const FRONTIER_STAY_USD = 200;
const JOATHIVA_COMMISSION_RATE = 0.333;
const CLIENT_TRIP_ALERT_RADIUS_KM = 50;
const GOOGLE_IDENTITY_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const GOOGLE_SIGNIN_META_NAME = "google-signin-client_id";
const REVERSE_GEOCODE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const SEARCH_GEOCODE_ENDPOINT = "https://nominatim.openstreetmap.org/search";

let googleIdentityScriptPromise = null;
let adminExternalSyncState = {
  intervalId: 0,
  inFlight: false,
  bound: false,
  lastWorkbookHash: "",
  lastFetchedAt: "",
  syncIntervalSeconds: 20
};
let adminWorkbookAiState = {
  settingsLoaded: false,
  connected: false,
  apiKeyHint: "",
  model: "gpt-5",
  busy: false,
  workbook: null,
  workbookFetchedAt: "",
  analysisText: "",
  analysisPrompt: ""
};

const ADMIN_WORKBOOK_AI_QUICK_PROMPTS = [
  {
    id: "prioridades",
    label: "Prioridades de hoy",
    prompt: "Analiza el workbook operativo actual y dime las 5 prioridades concretas de hoy para Rodrigo. Ordenalas por urgencia y explica por que."
  },
  {
    id: "cobros",
    label: "Cobros pendientes",
    prompt: "Revisa el workbook operativo y arma un plan de accion sobre cobros pendientes, facturas cliente faltantes y operaciones que deberian destrabarse hoy."
  },
  {
    id: "riesgos",
    label: "Riesgos operativos",
    prompt: "Detecta los principales riesgos operativos y comerciales del workbook actual. Quiero riesgos, impacto probable y accion sugerida para cada uno."
  },
  {
    id: "resumen",
    label: "Resumen ejecutivo",
    prompt: "Dame un resumen ejecutivo del workbook actual para direccion. Quiero panorama general, alertas criticas y tres decisiones sugeridas."
  }
];

const ROLE_ACCESS_DEFAULTS = {
  master: {
    marketing: true,
    userAdmin: true,
    clientCrud: true,
    providerCrud: true,
    operativeCrud: true,
    quoteCrud: true,
    accountingDashboard: true,
    billingDashboard: true,
    collections: true,
    payments: true,
    deleteRecords: true
  },
  ops_finance: {
    marketing: false,
    userAdmin: false,
    clientCrud: false,
    providerCrud: false,
    operativeCrud: true,
    quoteCrud: false,
    accountingDashboard: true,
    billingDashboard: true,
    collections: true,
    payments: true,
    deleteRecords: false
  },
  billing_admin: {
    marketing: false,
    userAdmin: false,
    clientCrud: false,
    providerCrud: false,
    operativeCrud: false,
    quoteCrud: false,
    accountingDashboard: true,
    billingDashboard: true,
    collections: true,
    payments: true,
    deleteRecords: false
  },
  provider: {
    marketing: false,
    userAdmin: false,
    clientCrud: false,
    providerCrud: false,
    operativeCrud: true,
    quoteCrud: false,
    accountingDashboard: false,
    billingDashboard: false,
    collections: false,
    payments: false,
    deleteRecords: false
  },
  broker: {
    marketing: false,
    userAdmin: false,
    clientCrud: false,
    providerCrud: false,
    operativeCrud: true,
    quoteCrud: false,
    accountingDashboard: false,
    billingDashboard: false,
    collections: false,
    payments: false,
    deleteRecords: false
  },
  client: {
    marketing: false,
    userAdmin: false,
    clientCrud: false,
    providerCrud: false,
    operativeCrud: false,
    quoteCrud: false,
    accountingDashboard: false,
    billingDashboard: false,
    collections: false,
    payments: false,
    deleteRecords: false
  }
};

function getDefaultRoleAccess(role) {
  return {
    ...(ROLE_ACCESS_DEFAULTS.client || {}),
    ...(ROLE_ACCESS_DEFAULTS[String(role || "").trim()] || {})
  };
}

function normalizeUserPermissions(user = {}) {
  user = user || {};
  return {
    ...getDefaultRoleAccess(user.role),
    ...((user && typeof user.permissions === "object" && !Array.isArray(user.permissions)) ? user.permissions : {})
  };
}

function getDefaultJobTitle(role) {
  if (role === "master") return "Direccion";
  if (role === "ops_finance") return "Administrativo, Operativo y Contable";
  if (role === "billing_admin") return "Facturacion / Administracion";
  if (role === "provider") return "Proveedor";
  if (role === "broker") return "Despachante";
  if (role === "client") return "Cliente";
  return "";
}

function getDefaultMainScreen(role) {
  if (role === "master") return "Indicadores";
  if (role === "ops_finance") return "Indicadores de seguimiento, facturacion, cobro y pago";
  if (role === "billing_admin") return "Indicadores de facturacion pendiente y cobros";
  return "";
}

function canAccessMarketing(user) {
  return Boolean(normalizeUserPermissions(user).marketing);
}

function canAccessAccountingDashboard(user) {
  return Boolean(normalizeUserPermissions(user).accountingDashboard);
}

const seedState = {
  users: [
    {
      id: "usr-master",
      username: "maestro",
      password: "Maestro2026!",
      displayName: "Administrador Maestro",
      role: "master",
      company: "JoathiVA",
      legalName: "JoathiVA Logistica SAS",
      documentType: "rut",
      documentNumber: "219999990012",
      email: "rhernandez@joathilogistica.com",
      phone: "+59897971122",
      termsAccepted: true,
      notificationsEnabled: false,
      notificationOrigin: "",
      notificationDestination: "",
      bankAccountHolder: "",
      bankName: "",
      bankAccountType: "",
      bankAccountNumber: "",
      bankSwift: ""
    },
    {
      id: "usr-master-rodrigo",
      username: "rodrigo",
      password: "1899",
      displayName: "Rodrigo",
      role: "master",
      mailboxAccess: true,
      company: "JoathiVA",
      legalName: "JoathiVA Logistica SAS",
      documentType: "rut",
      documentNumber: "219999990012",
      email: "rodrigo@joathilogistica.com",
      phone: "+59897971122",
      termsAccepted: true,
      notificationsEnabled: false,
      notificationOrigin: "",
      notificationDestination: "",
      bankAccountHolder: "",
      bankName: "",
      bankAccountType: "",
      bankAccountNumber: "",
      bankSwift: ""
    },
    {
      id: "usr-provider",
      username: "admin",
      password: "Joathi2026!",
      displayName: "Admin Maestro",
      role: "master",
      company: "JoathiVA",
      legalName: "JoathiVA Logistica SAS",
      documentType: "rut",
      documentNumber: "219999990012",
      email: "admin@joathilogistica.com",
      phone: "+598 99 000 000",
      termsAccepted: true,
      notificationsEnabled: false,
      notificationOrigin: "",
      notificationDestination: "",
      bankAccountHolder: "",
      bankName: "",
      bankAccountType: "",
      bankAccountNumber: "",
      bankSwift: ""
    },
    {
      id: "usr-directora-valeria",
      username: "valeria@joathilogistica.com",
      password: "Valeria2026!",
      displayName: "Valeria Zugasti",
      jobTitle: "Directora",
      mainScreen: "Indicadores",
      role: "master",
      mailboxAccess: true,
      company: "JoathiVA",
      legalName: "JoathiVA Logistica SAS",
      documentType: "rut",
      documentNumber: "219999990012",
      email: "valeria@joathilogistica.com",
      phone: "+598 99 000 001",
      termsAccepted: true,
      notificationsEnabled: false,
      notificationOrigin: "",
      notificationDestination: "",
      bankAccountHolder: "",
      bankName: "",
      bankAccountType: "",
      bankAccountNumber: "",
      bankSwift: "",
      permissions: {
        marketing: false,
        userAdmin: true,
        clientCrud: true,
        providerCrud: true,
        operativeCrud: true,
        quoteCrud: true,
        accountingDashboard: true,
        billingDashboard: true,
        collections: true,
        payments: true,
        deleteRecords: true
      }
    },
    {
      id: "usr-gimena",
      username: "gimena@joathilogistica.com",
      password: "Gimena2026!",
      displayName: "Gimena",
      jobTitle: "Administrativo, Operativo y Contable",
      mainScreen: "Indicadores de seguimiento, facturacion, cobro y pago",
      role: "ops_finance",
      company: "JoathiVA",
      legalName: "JoathiVA Logistica SAS",
      documentType: "rut",
      documentNumber: "219999990012",
      email: "gimena@joathilogistica.com",
      phone: "+598 99 000 002",
      termsAccepted: true,
      notificationsEnabled: false,
      notificationOrigin: "",
      notificationDestination: "",
      bankAccountHolder: "",
      bankName: "",
      bankAccountType: "",
      bankAccountNumber: "",
      bankSwift: "",
      permissions: {
        marketing: false,
        userAdmin: false,
        clientCrud: false,
        providerCrud: false,
        operativeCrud: true,
        quoteCrud: false,
        accountingDashboard: true,
        billingDashboard: true,
        collections: true,
        payments: true,
        deleteRecords: false
      }
    },
    {
      id: "usr-andrea",
      username: "administracion@joathilogistica.com",
      password: "Andrea2026!",
      displayName: "Andrea",
      jobTitle: "Facturación / Administración",
      mainScreen: "Indicadores de facturacion pendiente y cobros",
      role: "billing_admin",
      company: "JoathiVA",
      legalName: "JoathiVA Logistica SAS",
      documentType: "rut",
      documentNumber: "219999990012",
      email: "administracion@joathilogistica.com",
      phone: "+598 99 000 003",
      termsAccepted: true,
      notificationsEnabled: false,
      notificationOrigin: "",
      notificationDestination: "",
      bankAccountHolder: "",
      bankName: "",
      bankAccountType: "",
      bankAccountNumber: "",
      bankSwift: "",
      permissions: {
        marketing: false,
        userAdmin: false,
        clientCrud: false,
        providerCrud: false,
        operativeCrud: false,
        quoteCrud: false,
        accountingDashboard: true,
        billingDashboard: true,
        collections: true,
        payments: true,
        deleteRecords: false
      }
    },
    {
      id: "usr-provider-ops",
      username: "proveedor",
      password: "Proveedor2026!",
      displayName: "Operaciones JoathiVA",
      role: "provider",
      company: "JoathiVA",
      legalName: "JoathiVA Logistica SAS",
      documentType: "rut",
      documentNumber: "219999990012",
      email: "operaciones@joathi.com",
      phone: "+598 99 000 000",
      termsAccepted: true,
      notificationsEnabled: true,
      notificationOrigin: "Brasil",
      notificationDestination: "Uruguay",
      bankAccountHolder: "JoathiVA Logistica SAS",
      bankName: "Banco Republica",
      bankAccountType: "Cuenta corriente USD",
      bankAccountNumber: "001234567890",
      bankSwift: "BROUUYMM"
    },
    {
      id: "usr-client",
      username: "cliente",
      password: "Cliente2026!",
      displayName: "Cliente Demo",
      role: "client",
      company: "Importadora Demo",
      legalName: "Importadora Demo SRL",
      documentType: "rut",
      documentNumber: "210000110019",
      email: "logistica@cliente.com",
      phone: "+598 98 111 111",
      termsAccepted: true,
      notificationsEnabled: false,
      notificationOrigin: "",
      notificationDestination: "",
      bankAccountHolder: "",
      bankName: "",
      bankAccountType: "",
      bankAccountNumber: "",
      bankSwift: ""
    },
      {
        id: "usr-broker",
        username: "despachante",
        password: "Despachante2026!",
        displayName: "Despachante Demo",
      role: "broker",
      company: "Estudio Aduanero Demo",
      legalName: "Estudio Aduanero Demo SAS",
      documentType: "rut",
      documentNumber: "219999880017",
      email: "aduana@despachante.com",
      phone: "+598 97 222 333",
      termsAccepted: true,
        notificationsEnabled: true,
        notificationOrigin: "Brasil",
        notificationDestination: "Uruguay",
        customsRegistryNumber: "DNA-UY-4587",
        customsJurisdiction: "Montevideo y corredores regionales",
        customsPrimaryOffice: "Aduana de Montevideo",
        customsSpecialties: ["Importacion", "Exportacion", "Transito internacional"],
        customsSystems: ["Sistema Lucia", "VUCE", "MIC / CRT"],
        customsRegimes: ["General", "Transito", "Admision temporaria"],
        customsRepresentationScope: "Representacion ante Aduana y organismos publicos para cargas internacionales.",
        customsLegalNotes: "Control documental, clasificacion arancelaria y coordinacion de frontera.",
        bankAccountHolder: "",
        bankName: "",
        bankAccountType: "",
        bankAccountNumber: "",
        bankSwift: ""
    }
  ],
  drivers: [
    {
      id: "drv-1",
      name: "Carlos Mendez",
      company: "JoathiVA",
      phone: "+598 99 123 456",
      email: "carlos@joathi.com",
      originCity: "Montevideo",
      originCountry: "Uruguay",
      licenseNumber: "UY-558841",
      experience: "8 anos en transporte internacional",
      licenseImageName: "libreta-carlos.jpg"
    }
  ],
  vehicles: [
    {
      id: "veh-1",
      driverId: "drv-1",
      plate: "SBT 1020",
      brand: "Scania",
      model: "R450",
      type: "Semi remolque",
      year: 2022,
      capacityM3: 86,
      maxWeightKg: 28000,
      ownershipDocName: "libreta-propiedad.pdf",
      insuranceDocName: "seguro-vigente.pdf",
      notes: "Unidad habilitada para corredor Mercosur."
    }
  ],
  trips: [
    {
      id: "trp-1",
      driverId: "drv-1",
      vehicleId: "veh-1",
      currentLocation: "Sao Paulo",
      originCountry: "Brasil",
      returnDestination: "Montevideo",
      destinationCountry: "Uruguay",
      availableDate: "2026-04-18",
      status: "Disponible",
      availableM3: 60,
      availableWeightKg: 18000,
      priceUsd: 2400,
      cargoType: "Carga general y palletizada",
      notes: "Incluye MIC y CRT.",
      trackingStatus: "pending",
      driverShareConsent: false,
      startedAt: null,
      endedAt: null,
      liveLocation: null,
      trackingHistory: [],
      operationTimeline: {
        loadingStartedAt: null,
        loadingStartedLocation: null,
        tripStartedAt: null,
        arrivalAt: null,
        unloadingCompletedAt: null,
        completedAt: null
      }
    }
  ],
  requests: [],
  documents: [],
  notifications: [],
  successCases: []
};

let state = loadState();

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  bindUploadFields(document);
  if (page === "login") {
    initLoginPage();
    return;
  }

  const user = getCurrentUser();
  if (!["home", "terms"].includes(page) && !user) {
    window.location.href = "login.html";
    return;
  }

  decorateLayout(page, user);
  initCollapsiblePanels(document);

  if (page === "home") initHomePage(user);
  if (page === "admin") initAdminPage(user);
  if (page === "mailbox") initMailboxPage(user);
  if (page === "drivers") initDriversPage(user);
  if (page === "vehicles") initVehiclesPage(user);
  if (page === "trips") initTripsPage(user);
});

function initLoginPage() {
  const currentUser = getCurrentUser();
  if (currentUser) {
    window.location.href = getLandingRoute(currentUser);
    return;
  }

  initGoogleAuthButtons();
  const form = document.querySelector("#loginForm");
  const error = document.querySelector("#loginError");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const loginIdentifier = String(formData.get("username") || "").trim();
    const loginSecret = String(formData.get("password") || "");
    const user = findUserForCredentials(loginIdentifier, loginSecret);

    if (!user) {
      if (error) error.textContent = "Credenciales invalidas.";
      error.hidden = false;
      return;
    }

    const serverSession = await requestPortalServerSession(loginIdentifier, loginSecret);
    if (serverSession && !serverSession.ok) {
      if (error) error.textContent = serverSession.error || "No fue posible iniciar sesion en el servidor local.";
      error.hidden = false;
      return;
    }

    startSession(user.id, serverSession?.session || null);
    window.location.href = getLandingRoute(user);
  });
}

function getPortalSessionApiUrl() {
  if (typeof getJoathiVaApiUrl === "function") {
    const apiUrl = getJoathiVaApiUrl("/api/portal/session");
    if (apiUrl) return apiUrl;
  }

  if (/^https?:/i.test(window.location.origin || "")) {
    return "/api/portal/session";
  }

  return "";
}

async function requestPortalServerSession(identifier, password) {
  const url = getPortalSessionApiUrl();
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        username: identifier,
        password
      })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      return {
        ok: false,
        error: result?.error || `No fue posible iniciar sesion en el servidor local (HTTP ${response.status}).`
      };
    }

    return {
      ok: true,
      session: result.session || null
    };
  } catch {
    return null;
  }
}

function initHomePage(user) {
  if (user?.role === "master") {
    window.location.href = "admin.html";
    return;
  }

  void ensureUserOperationalProfile(user);
  toggleHomeByRole(user);
  initPublicTrackingForm();
  initQuoteCalculatorForm();
  initSupportForm();
  renderHomeTrips(user);
  renderStats();
  renderAccountingDashboard(user);

  if (!user) {
    initRegisterForm();
    return;
  }

  if (user.role === "client") {
    initClientWorkspace(user);
    return;
  }

  if (user.role === "provider") {
    showElements("[data-provider-only]", true);
  }

  if (user.role === "broker") {
    showElements("[data-broker-only]", true);
  }
}

function decorateLayout(page, user) {
  document.querySelectorAll("[data-user-name]").forEach((node) => {
    node.textContent = user ? `${user.displayName} | ${getUserTitle(user)}` : "";
  });

  document.querySelectorAll("[data-nav]").forEach((node) => {
    if (node.dataset.nav === page) node.classList.add("active");
  });

  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      clearSession();
      window.location.href = "index.html";
    });
  });

  document.querySelectorAll("[data-session-box]").forEach((box) => {
    box.hidden = !user;
  });

  showElements("[data-provider-only]", user?.role === "provider");
  showElements("[data-client-only]", user?.role === "client");
  showElements("[data-broker-only]", user?.role === "broker");
  showElements("[data-master-only]", user?.role === "master");
  showElements("[data-marketing-only]", canAccessMarketing(user));
  showElements("[data-accounting-only]", canAccessAccountingDashboard(user));
  showElements("[data-mailbox-only]", canUseAdminMailbox(user));
  showElements("[data-rodrigo-master-only]", canUseRodrigoManagementSheet(user));
  showElements("[data-guest-only]", !user);
}

function renderHomeTrips(user) {
  const container = document.querySelector("#availableTrips");
  const trips = state.trips.filter((trip) => {
    if (["Confirmado", "Finalizado", "En curso", "Sin cupo"].includes(trip.status)) return false;
    return Number(trip.availableM3 || 0) > 0 && Number(trip.availableWeightKg || 0) > 0;
  });

  renderCollection(container, trips, (trip) => {
    const driver = getDriver(trip.driverId);
    const vehicle = getVehicle(trip.vehicleId);
    const docsReady = Boolean(vehicle?.ownershipDocName && vehicle?.insuranceDocName);
    const pricing = computeCommercialBreakdown(trip.priceUsd);
    const showAccountingPrices = canAccessAccountingDashboard(user);
    const showProviderPrice = user?.role === "provider" || showAccountingPrices;
    const showClientPrice = user?.role === "client" || !user || showAccountingPrices;

    return `
      <article class="trip-card" data-trip-id="${trip.id}">
        <strong>${escapeHtml(trip.currentLocation)}, ${escapeHtml(trip.originCountry)} -> ${escapeHtml(trip.returnDestination)}, ${escapeHtml(trip.destinationCountry)}</strong>
        <p>${escapeHtml(driver?.name || "Chofer pendiente")} | ${escapeHtml(vehicle?.plate || "Unidad pendiente")}</p>
        <div class="data-grid">
          <span><strong>Fecha</strong>${formatDate(trip.availableDate)}</span>
          <span><strong>Estado</strong>${escapeHtml(trip.status)}</span>
          <span><strong>Espacio</strong>${formatNumber(trip.availableM3)} m3</span>
          <span><strong>Peso</strong>${formatNumber(trip.availableWeightKg)} kg</span>
          <span><strong>Carga</strong>${escapeHtml(trip.cargoType)}</span>
          <span><strong>Servicio</strong>MIC + CRT + 2h/2h</span>
          ${showProviderPrice ? `<span><strong>Costo proveedor</strong>${formatCurrency(pricing.providerSubtotal)}</span>` : ""}
          ${showClientPrice ? `<span><strong>Precio cliente</strong>${formatCurrency(pricing.customerSubtotal)}</span>` : ""}
        </div>
        <div class="badge-row">
          <span class="badge">${docsReady ? "Documentacion completa" : "Documentacion pendiente"}</span>
          <span class="badge warning">${escapeHtml(driver?.originCity || "Base no definida")}, ${escapeHtml(driver?.originCountry || "")}</span>
          <span class="badge">${getTrackingStatusLabel(trip)}</span>
        </div>
      </article>
    `;
  });

  initHomeCarousel(container);
}

function renderStats() {
  setText("#statTrips", state.trips.length);
  setText("#statDrivers", state.drivers.length);
  setText("#statVehicles", state.vehicles.length);
  setText("#statRoutes", countRoutes());
}

function renderAccountingDashboard(user) {
  const container = document.querySelector("#roleIndicatorsGrid");
  const title = document.querySelector("#roleIndicatorsTitle");
  const subtitle = document.querySelector("#roleIndicatorsSubtitle");
  const section = document.querySelector("#roleIndicators");
  if (!container || !section) return;

  if (!canAccessAccountingDashboard(user)) {
    section.hidden = true;
    container.innerHTML = "";
    return;
  }

  section.hidden = false;
  if (title) title.textContent = String(user?.mainScreen || getDefaultMainScreen(user?.role) || "Indicadores");
  if (subtitle) subtitle.textContent = `${getUserTitle(user)} | visión rápida de seguimiento, facturación, cobro y pago.`;

  const requests = Array.isArray(state.requests) ? state.requests : [];
  const activeRequests = requests.filter((request) => !Boolean(request.invoiceRecord?.operationTimeline?.completedAt));
  const pendingBilling = requests.filter((request) => Number(request.billing?.customerSubtotal || 0) > 0 && !String(request.clientInvoice || "").trim());
  const pendingCollections = requests.filter((request) => request.paymentStatus !== "habilitado_cobro");
  const readyToSettle = requests.filter((request) => request.settlementStatus === "habilitado_pago_proveedor");
  const completedOperations = requests.filter((request) => Boolean(request.invoiceRecord?.operationTimeline?.completedAt));

  const cards = user?.role === "billing_admin" ? [
    { label: "Facturacion pendiente", value: pendingBilling.length, note: "Documentos por emitir o corregir" },
    { label: "Cobros pendientes", value: pendingCollections.length, note: "Cargos que todavia requieren seguimiento" },
    { label: "Pagos listos", value: readyToSettle.length, note: "Liquidaciones a proveedor habilitadas" },
    { label: "Operaciones cerradas", value: completedOperations.length, note: "Casos finalizados y trazables" }
  ] : [
    { label: "Seguimiento activo", value: activeRequests.length, note: "Operaciones abiertas o en revision" },
    { label: "Facturacion pendiente", value: pendingBilling.length, note: "Documentos por emitir o corregir" },
    { label: "Cobros pendientes", value: pendingCollections.length, note: "Cargos que todavia requieren seguimiento" },
    { label: "Pagos listos", value: readyToSettle.length, note: "Liquidaciones a proveedor habilitadas" }
  ];

  container.innerHTML = cards.map((card) => `
    <article class="panel stat-card">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(String(card.value))}</strong>
      <small>${escapeHtml(card.note)}</small>
    </article>
  `).join("");
}

function initPublicTrackingForm() {
  const form = document.querySelector("#publicTrackingForm");
  const input = form?.querySelector("input[name='query']");
  const result = document.querySelector("#publicTrackingResult");
  if (!form || !input || !result || form.dataset.joathivaBound === "true") {
    if (form && input && result) {
      renderPublicTrackingResult(result, String(input.value || ""));
    }
    return;
  }

  const update = () => renderPublicTrackingResult(result, String(input.value || ""));
  input.addEventListener("input", update);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    update();
  });

  form.dataset.joathivaBound = "true";
  update();
}

function renderPublicTrackingResult(container, query) {
  if (!container) return;

  const normalized = normalizeText(query);
  const matches = state.trips.filter((trip) => {
    if (!normalized) return true;
    const driver = getDriver(trip.driverId);
    const vehicle = getVehicle(trip.vehicleId);
    const haystack = [
      trip.id,
      trip.currentLocation,
      trip.returnDestination,
      trip.originCountry,
      trip.destinationCountry,
      trip.status,
      trip.cargoType,
      driver?.name,
      vehicle?.plate
    ].map(normalizeText).join(" ");
    return haystack.includes(normalized);
  }).slice(0, 3);

  if (!matches.length) {
    container.innerHTML = `
      <article class="record-card">
        <strong>Sin coincidencias</strong>
        <p>Probá con una ciudad, matrícula o estado de viaje.</p>
      </article>
    `;
    return;
  }

  container.innerHTML = matches.map((trip) => {
    const driver = getDriver(trip.driverId);
    const vehicle = getVehicle(trip.vehicleId);
    return `
      <article class="record-card">
        <strong>${escapeHtml(trip.currentLocation)} → ${escapeHtml(trip.returnDestination)}</strong>
        <p>${escapeHtml(driver?.name || "Chofer pendiente")} | ${escapeHtml(vehicle?.plate || "Unidad pendiente")}</p>
        <div class="badge-row">
          <span class="badge">${escapeHtml(trip.status)}</span>
          <span class="badge warning">${escapeHtml(trip.cargoType || "Carga general")}</span>
          <span class="badge">${escapeHtml(formatNumber(trip.availableWeightKg || 0))} kg</span>
        </div>
      </article>
    `;
  }).join("");
}

function initQuoteCalculatorForm() {
  const form = document.querySelector("#quoteForm");
  const result = document.querySelector("#quoteResult");
  if (!form || !result || form.dataset.joathivaBound === "true") {
    if (form && result) {
      renderQuoteEstimate(result, readQuoteFormData(form));
    }
    return;
  }

  const update = () => renderQuoteEstimate(result, readQuoteFormData(form));
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    update();
    dispatchJoathiVaEvent("joathiva:quote-calculated", readQuoteFormData(form));
  });

  form.dataset.joathivaBound = "true";
  update();
}

function readQuoteFormData(form) {
  const formData = new FormData(form);
  return {
    origin: String(formData.get("origin") || "").trim(),
    destination: String(formData.get("destination") || "").trim(),
    cargoType: String(formData.get("cargoType") || "general"),
    weightKg: Math.max(0, Number(formData.get("weightKg") || 0)),
    declaredValue: Math.max(0, Number(formData.get("declaredValue") || 0))
  };
}

function buildQuoteEstimate(data) {
  const cargoMultipliers = {
    general: 1,
    perecedera: 1.14,
    peligrosa: 1.28,
    voluminosa: 1.1,
    documentaria: 0.88
  };

  const routeText = normalizeText(`${data.origin} ${data.destination}`);
  const crossBorder = /(brasil|uruguay|argentina|chile|paraguay|peru|bolivia|colombia|mexico|sao paulo|montevideo)/.test(routeText);
  const routeBase = crossBorder ? 190 : 120;
  const cargoMultiplier = cargoMultipliers[data.cargoType] || 1;
  const baseFreight = 210;
  const handling = 95;
  const weightCharge = Math.max(0, data.weightKg * 0.028);
  const routeCharge = routeBase + Math.min(220, Math.max(0, (data.origin.length + data.destination.length) * 3));
  const cargoCharge = (baseFreight + routeCharge + handling + weightCharge) * cargoMultiplier;
  const insurance = data.declaredValue * 0.0045;
  const subtotal = cargoCharge + insurance;
  const platformFee = subtotal * 0.12;
  const total = subtotal + platformFee;

  return {
    origin: data.origin || "Origen pendiente",
    destination: data.destination || "Destino pendiente",
    cargoType: data.cargoType,
    weightKg: data.weightKg,
    declaredValue: data.declaredValue,
    routeCharge,
    weightCharge,
    cargoCharge,
    insurance,
    platformFee,
    total,
    serviceWindow: crossBorder ? "48-72 h" : "24-48 h"
  };
}

function renderQuoteEstimate(container, data) {
  if (!container) return;

  const estimate = buildQuoteEstimate(data);
  const typeLabel = {
    general: "Carga general",
    perecedera: "Perecedera",
    peligrosa: "Peligrosa",
    voluminosa: "Voluminosa",
    documentaria: "Documentaria"
  }[estimate.cargoType] || "Carga general";

  container.innerHTML = `
    <article class="quote-result-card">
      <div>
        <span class="eyebrow">Resultado estimado</span>
        <strong class="quote-total">${formatCurrency(estimate.total)}</strong>
        <p>${escapeHtml(estimate.origin)} → ${escapeHtml(estimate.destination)}</p>
      </div>
      <div class="badge-row">
        <span class="badge">${escapeHtml(typeLabel)}</span>
        <span class="badge warning">${escapeHtml(formatNumber(estimate.weightKg || 0))} kg</span>
        <span class="badge">${escapeHtml(estimate.serviceWindow)}</span>
      </div>
      <div class="quote-breakdown">
        <div class="quote-breakdown-row"><span>Base operativa</span><strong>${formatCurrency(210)}</strong></div>
        <div class="quote-breakdown-row"><span>Ruta</span><strong>${formatCurrency(estimate.routeCharge)}</strong></div>
        <div class="quote-breakdown-row"><span>Peso</span><strong>${formatCurrency(estimate.weightCharge)}</strong></div>
        <div class="quote-breakdown-row"><span>Manejo</span><strong>${formatCurrency(95)}</strong></div>
        <div class="quote-breakdown-row"><span>Seguro / valor estimado</span><strong>${formatCurrency(estimate.insurance)}</strong></div>
        <div class="quote-breakdown-row"><span>Gestión JoathiVA</span><strong>${formatCurrency(estimate.platformFee)}</strong></div>
      </div>
      <p class="muted">Estimación visual sin compromiso. El valor final puede variar por ruta, disponibilidad y documentación.</p>
    </article>
  `;
}

function initSupportForm() {
  const form = document.querySelector("#contactForm");
  const result = document.querySelector("#contactResult");
  if (!form || !result || form.dataset.joathivaBound === "true") {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();

    result.innerHTML = `
      <article class="record-card">
        <strong>Consulta preparada</strong>
        <p>${escapeHtml(name)} | ${escapeHtml(subject)}</p>
        <p>Tu mensaje quedó listo para seguimiento: ${escapeHtml(message.slice(0, 160))}${message.length > 160 ? "..." : ""}</p>
      </article>
    `;

    form.reset();
    dispatchJoathiVaEvent("joathiva:support-request", { name, subject, message });
  });

  form.dataset.joathivaBound = "true";
}

function initDriversPage(user) {
  ensureProvider(user);

  const form = document.querySelector("#driverForm");
  const list = document.querySelector("#driversList");
  renderDrivers(list);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    state.drivers.unshift({
      id: buildId("drv"),
      name: String(formData.get("name")).trim(),
      company: String(formData.get("company")).trim(),
      phone: String(formData.get("phone")).trim(),
      email: String(formData.get("email")).trim(),
      originCity: String(formData.get("originCity")).trim(),
      originCountry: String(formData.get("originCountry")).trim(),
      licenseNumber: String(formData.get("licenseNumber")).trim(),
      experience: String(formData.get("experience")).trim(),
      licenseImageName: await serializeFileName(formData.get("licenseImage"))
    });
    persistState();
    form.reset();
    renderDrivers(list);
    dispatchJoathiVaEvent("joathiva:form-saved", { formId: "driverForm" });
  });
}

function initVehiclesPage(user) {
  ensureProvider(user);

  const form = document.querySelector("#vehicleForm");
  const list = document.querySelector("#vehiclesList");
  const driverSelect = document.querySelector("#vehicleDriverSelect");

  populateDriverSelect(driverSelect);
  renderVehicles(list);

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    state.vehicles.unshift({
      id: buildId("veh"),
      driverId: String(formData.get("driverId")),
      plate: String(formData.get("plate")).trim(),
      brand: String(formData.get("brand")).trim(),
      model: String(formData.get("model")).trim(),
      type: String(formData.get("type")),
      year: Number(formData.get("year")),
      capacityM3: Number(formData.get("capacityM3")),
      maxWeightKg: Number(formData.get("maxWeightKg")),
      ownershipDocName: await serializeFileName(formData.get("ownershipDoc")),
      insuranceDocName: await serializeFileName(formData.get("insuranceDoc")),
      notes: String(formData.get("notes") || "").trim()
    });
    persistState();
    form.reset();
    populateDriverSelect(driverSelect);
    renderVehicles(list);
    dispatchJoathiVaEvent("joathiva:form-saved", { formId: "vehicleForm" });
  });
}

function initTripsPage(user) {
  ensureProvider(user);

  const form = document.querySelector("#tripForm");
  const list = document.querySelector("#tripsList");
  const driverSelect = document.querySelector("#tripDriverSelect");
  const vehicleSelect = document.querySelector("#tripVehicleSelect");

  populateDriverSelect(driverSelect);
  populateVehicleSelect(vehicleSelect);
  renderProviderTrips(list);

  driverSelect?.addEventListener("change", () => {
    populateVehicleSelect(vehicleSelect, driverSelect.value);
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    state.trips.unshift({
      id: buildId("trp"),
      driverId: String(formData.get("driverId")),
      vehicleId: String(formData.get("vehicleId")),
      currentLocation: String(formData.get("currentLocation")).trim(),
      originCountry: String(formData.get("originCountry")).trim(),
      returnDestination: String(formData.get("returnDestination")).trim(),
      destinationCountry: String(formData.get("destinationCountry")).trim(),
      availableDate: String(formData.get("availableDate")),
      status: String(formData.get("status")),
      availableM3: Number(formData.get("availableM3")),
      availableWeightKg: Number(formData.get("availableWeightKg")),
      priceUsd: Number(formData.get("priceUsd")),
      cargoType: String(formData.get("cargoType")).trim(),
      notes: String(formData.get("notes") || "").trim(),
      trackingStatus: "pending",
      driverShareConsent: false,
      startedAt: null,
      endedAt: null,
      liveLocation: null,
      trackingHistory: [],
      operationTimeline: createEmptyOperationTimeline()
    });
    persistState();
    form.reset();
    populateDriverSelect(driverSelect);
    populateVehicleSelect(vehicleSelect);
    renderProviderTrips(list);
    dispatchJoathiVaEvent("joathiva:form-saved", { formId: "tripForm" });
  });
}

function initRegisterForm() {
  const form = document.querySelector("#registerForm");
  if (!form) return;

  initGoogleAuthButtons();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const role = String(formData.get("role") || "");
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    if (!role) {
      window.alert("Debes seleccionar el perfil que vas a crear.");
      return;
    }

    if (!password) {
      window.alert("Define una contrasena o utiliza el acceso con Google.");
      return;
    }

    if (formData.get("termsAccepted") !== "on") {
      window.alert("Debes aceptar los terminos y condiciones para crear el acceso.");
      return;
    }

    if (findUserByEmail(email)) {
      window.alert("Ya existe un perfil registrado con ese correo.");
      return;
    }

    const profileLocation = await captureUserProfileLocation();
    const user = buildBasicUserRecord({
      displayName: String(formData.get("displayName") || "").trim(),
      role,
      company: String(formData.get("company") || "").trim(),
      email,
      phone: String(formData.get("phone") || "").trim(),
      password,
      termsAccepted: true,
      authProvider: "password",
      profileLocation,
      existingUsers: state.users
    });

    state.users.unshift(user);
    persistState();
    startSession(user.id);
    dispatchJoathiVaEvent("joathiva:form-saved", { formId: "registerForm" });
    window.location.href = getLandingRoute(user);
  });
}

function initClientWorkspace(user) {
  showElements("[data-client-only]", true);

  const form = document.querySelector("#requestForm");
  const select = document.querySelector("#requestTripSelect");
  populateTripSelect(select);
  bindClientRequestForm(form);
  renderClientRequests(user);
  renderBillingSummary(null);

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const trip = getTrip(String(formData.get("tripId")));
    if (!trip) return;
    const reservationMode = String(formData.get("reservationMode") || "partial");
    const reservedVolumeM3 = reservationMode === "full" ? Number(trip.availableM3 || 0) : Number(formData.get("volumeM3"));
    const reservedWeightKg = reservationMode === "full" ? Number(trip.availableWeightKg || 0) : Number(formData.get("weightKg"));

    if (!reservedVolumeM3 || !reservedWeightKg || reservedVolumeM3 < 0 || reservedWeightKg < 0) {
      window.alert("Indica un volumen y un peso validos para reservar el traslado.");
      return;
    }

    if (reservedVolumeM3 > Number(trip.availableM3 || 0) || reservedWeightKg > Number(trip.availableWeightKg || 0)) {
      window.alert("La reserva supera la capacidad disponible del viaje publicado.");
      return;
    }

    const billing = computeBilling({
      trip,
      loadingHours: Number(formData.get("loadingHours")),
      unloadingHours: Number(formData.get("unloadingHours")),
      frontierStay: String(formData.get("frontierStay")) === "yes"
    });

      const request = {
        id: buildId("req"),
        ...getDefaultRequestCustomsData(),
        userId: user.id,
        tripId: trip.id,
        reservationMode,
        cargoDescription: String(formData.get("cargoDescription")).trim(),
        weightKg: reservedWeightKg,
      volumeM3: reservedVolumeM3,
      reservedWeightKg,
      reservedVolumeM3,
      loadingHours: Number(formData.get("loadingHours")),
      unloadingHours: Number(formData.get("unloadingHours")),
      frontierStay: String(formData.get("frontierStay")) === "yes",
      notes: String(formData.get("notes") || "").trim(),
      createdAt: new Date().toISOString(),
      billing,
      paymentStatus: "pendiente_entrega",
      settlementStatus: "pendiente_pago_cliente"
    };
    request.invoiceRecord = buildInvoiceRecord(trip, billing, request, state);
    state.requests.unshift(request);
    applyTripCapacityReservation(trip, request);

    persistState();
    form.reset();
    populateTripSelect(select);
    syncClientRequestFormState(form);
    renderBillingSummary(billing);
    renderClientRequests(user);
    dispatchJoathiVaEvent("joathiva:form-saved", { formId: "requestForm" });
  });
}

function bindAdminSuccessCaseForm(form, user) {
  if (!form) return;

  if (form.dataset.joathivaBound === "true") {
    populateAdminSuccessCaseUserOptions(form);
    syncAdminSuccessCaseUserDefaults(form);
    return;
  }

  populateAdminSuccessCaseUserOptions(form);
  form.querySelector("select[name='userId']")?.addEventListener("change", () => {
    syncAdminSuccessCaseUserDefaults(form);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const selectedUserId = String(formData.get("userId") || "").trim();
    const successCase = {
      id: buildId("case"),
      userId: selectedUserId,
      createdByUserId: user?.id || "",
      createdByName: user?.displayName || user?.username || "Maestro",
      contactName: String(formData.get("contactName") || "").trim(),
      contactRole: String(formData.get("contactRole") || "").trim(),
      company: String(formData.get("company") || "").trim(),
      industry: String(formData.get("industry") || "").trim(),
      serviceUsed: String(formData.get("serviceUsed") || "").trim(),
      operationScope: String(formData.get("operationScope") || "").trim(),
      challenge: String(formData.get("challenge") || "").trim(),
      solution: String(formData.get("solution") || "").trim(),
      results: String(formData.get("results") || "").trim(),
      metrics: String(formData.get("metrics") || "").trim(),
      quote: String(formData.get("quote") || "").trim(),
      evidenceLink: String(formData.get("evidenceLink") || "").trim(),
      allowPublishName: formData.get("allowPublishName") === "on",
      allowPublishCompany: formData.get("allowPublishCompany") === "on",
      allowPublishLogo: formData.get("allowPublishLogo") === "on",
      status: String(formData.get("status") || "aprobado").trim() || "aprobado",
      createdAt: new Date().toISOString()
    };

    if (!successCase.contactName || !successCase.contactRole || !successCase.company || !successCase.industry || !successCase.serviceUsed || !successCase.operationScope || !successCase.challenge || !successCase.solution || !successCase.results) {
      window.alert("Completa los campos principales del caso de exito antes de enviarlo.");
      return;
    }

    state.successCases = Array.isArray(state.successCases) ? state.successCases : [];
    state.successCases.unshift(successCase);
    persistState();
    form.reset();
    populateAdminSuccessCaseUserOptions(form);
    syncAdminSuccessCaseUserDefaults(form);
    renderAdminStats();
    renderAdminSuccessCases();
    dispatchJoathiVaEvent("joathiva:form-saved", { formId: "adminSuccessCaseForm" });
  });

  form.dataset.joathivaBound = "true";
  syncAdminSuccessCaseUserDefaults(form);
}

function populateAdminSuccessCaseUserOptions(form) {
  const select = form?.querySelector("select[name='userId']");
  if (!select) return;

  const currentValue = String(select.value || "");
  const clientOptions = state.users
    .filter((item) => item.role === "client")
    .sort((left, right) => String(left.displayName || "").localeCompare(String(right.displayName || "")))
    .map((item) => {
      const company = item.company || item.legalName || "Sin empresa";
      return `<option value="${escapeAttribute(item.id)}">${escapeHtml(item.displayName || item.username || "Cliente")} | ${escapeHtml(company)}</option>`;
    })
    .join("");

  select.innerHTML = `
    <option value="">Caso interno / sin asociar</option>
    ${clientOptions}
  `;

  select.value = currentValue && state.users.some((item) => item.id === currentValue && item.role === "client")
    ? currentValue
    : "";
}

function syncAdminSuccessCaseUserDefaults(form) {
  if (!form) return;
  const selectedUser = getUser(String(form.querySelector("select[name='userId']")?.value || ""));
  if (!selectedUser) return;

  const contactNameInput = form.querySelector("input[name='contactName']");
  const companyInput = form.querySelector("input[name='company']");
  if (contactNameInput && !contactNameInput.value.trim()) {
    contactNameInput.value = selectedUser.displayName || "";
  }
  if (companyInput && !companyInput.value.trim()) {
    companyInput.value = selectedUser.company || selectedUser.legalName || "";
  }
}

function bindClientRequestForm(form) {
  if (!form || form.dataset.joathivaBound === "true") {
    syncClientRequestFormState(form);
    return;
  }

  const update = () => syncClientRequestFormState(form);
  form.querySelector("#requestTripSelect")?.addEventListener("change", update);
  form.querySelector("#requestReservationMode")?.addEventListener("change", update);
  form.dataset.joathivaBound = "true";
  update();
}

function syncClientRequestFormState(form) {
  if (!form) return;
  const trip = getTrip(String(form.querySelector("#requestTripSelect")?.value || ""));
  const reservationMode = String(form.querySelector("#requestReservationMode")?.value || "partial");
  const volumeInput = form.querySelector("input[name='volumeM3']");
  const weightInput = form.querySelector("input[name='weightKg']");
  const helper = form.querySelector("[data-reservation-helper]");

  if (!trip) {
    if (volumeInput) volumeInput.disabled = false;
    if (weightInput) weightInput.disabled = false;
    if (helper) {
      helper.innerHTML = `
        <strong>Capacidad disponible</strong>
        <p>Selecciona un viaje para ver el espacio y el peso que todavia quedan libres.</p>
      `;
    }
    return;
  }

  if (reservationMode === "full") {
    if (volumeInput) {
      volumeInput.value = String(trip.availableM3 || 0);
      volumeInput.disabled = true;
    }
    if (weightInput) {
      weightInput.value = String(trip.availableWeightKg || 0);
      weightInput.disabled = true;
    }
  } else {
    if (volumeInput) {
      volumeInput.disabled = false;
      if (!Number(volumeInput.value)) {
        volumeInput.value = String(trip.availableM3 || 0);
      }
    }
    if (weightInput) {
      weightInput.disabled = false;
      if (!Number(weightInput.value)) {
        weightInput.value = String(trip.availableWeightKg || 0);
      }
    }
  }

  if (helper) {
    helper.innerHTML = `
      <strong>${reservationMode === "full" ? "Reserva del camion completo" : "Reserva parcial disponible"}</strong>
      <p>Quedan ${escapeHtml(formatNumber(trip.availableM3 || 0))} m3 y ${escapeHtml(formatNumber(trip.availableWeightKg || 0))} kg para este corredor.</p>
    `;
  }
}

function applyTripCapacityReservation(trip, request) {
  if (!trip || !request) return;
  trip.availableM3 = roundCapacity(Number(trip.availableM3 || 0) - Number(request.reservedVolumeM3 || request.volumeM3 || 0), 1);
  trip.availableWeightKg = roundCapacity(Number(trip.availableWeightKg || 0) - Number(request.reservedWeightKg || request.weightKg || 0), 0);

  if (trip.availableM3 <= 0 || trip.availableWeightKg <= 0) {
    trip.availableM3 = Math.max(0, trip.availableM3);
    trip.availableWeightKg = Math.max(0, trip.availableWeightKg);
    trip.status = "Sin cupo";
  }
}

function roundCapacity(value, decimals) {
  const factor = 10 ** decimals;
  return Math.max(0, Math.round(Number(value || 0) * factor) / factor);
}

function initAdminPage(user) {
  ensureMaster(user);
  renderAdminStats();
  renderAdminDatabase();
  renderAdminSuccessCases();
  bindAdminSuccessCaseForm(document.querySelector("#adminSuccessCaseForm"), user);
  bindAdminForms();
  bindUserImportForm();
  initAdminExternalBoard(user);
}

function initMailboxPage(user) {
  ensureMaster(user);
  if (!canUseAdminMailbox(user)) {
    window.location.href = "admin.html";
    throw new Error("Acceso restringido");
  }
  initAdminMailbox(user, { autoLoad: true });
}

function renderAdminStats() {
  setText("#adminUsersCount", state.users.length);
  setText("#adminDriversCount", state.drivers.length);
  setText("#adminVehiclesCount", state.vehicles.length);
  setText("#adminTripsCount", state.trips.length);
  setText("#adminRequestsCount", state.requests.length);
  setText("#adminSuccessCasesCount", Array.isArray(state.successCases) ? state.successCases.length : 0);
  renderAdminOperationsBoard();
  renderAdminRequestSpotlight();
}

function renderAdminDatabase() {
  renderCollection(document.querySelector("#adminUsersList"), state.users, renderAdminUserCard);
  renderCollection(document.querySelector("#adminDriversList"), state.drivers, renderAdminDriverCard);
  renderCollection(document.querySelector("#adminVehiclesList"), state.vehicles, renderAdminVehicleCard);
  renderCollection(document.querySelector("#adminTripsList"), state.trips, renderAdminTripCard);
  renderCollection(document.querySelector("#adminRequestsList"), state.requests, renderAdminRequestCard);
}

function renderAdminOperationsBoard() {
  const stagesNode = document.querySelector("#adminOperationStages");
  const financeNode = document.querySelector("#adminOperationFinance");
  if (!stagesNode || !financeNode) return;

  const summary = getAdminOperationsSummary();
  const stageCards = [
    { label: "Pedidos de cliente", value: summary.clientOrders, note: "Solicitudes registradas por clientes" },
    { label: "Viaje disponible", value: summary.availableTrips, note: "Viajes publicados aun libres" },
    { label: "Viaje aceptado", value: summary.acceptedTrips, note: "Pedido asignado y pendiente de salida" },
    { label: "Viajes en curso", value: summary.inProgressTrips, note: "Operaciones con viaje iniciado" },
    { label: "Viajes finalizados", value: summary.completedTrips, note: "Entregas cerradas y liquidadas" }
  ];

  stagesNode.innerHTML = stageCards.map((card) => `
    <article class="panel stat-card">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(String(card.value))}</strong>
      <small>${escapeHtml(card.note)}</small>
    </article>
  `).join("");

  financeNode.innerHTML = `
    <article class="record-card">
      <strong>Precio de venta</strong>
      <p>${formatCurrency(summary.salesTotal)}</p>
      <div class="data-grid">
        <span><strong>Operaciones</strong>${escapeHtml(String(summary.clientOrders))}</span>
        <span><strong>Facturacion cliente</strong>${formatCurrency(summary.invoiceTotal)}</span>
      </div>
    </article>
    <article class="record-card">
      <strong>Costo proveedor</strong>
      <p>${formatCurrency(summary.providerCostTotal)}</p>
      <div class="data-grid">
        <span><strong>Liquidaciones</strong>${escapeHtml(String(summary.completedTrips))}</span>
        <span><strong>Base proveedor</strong>${formatCurrency(summary.providerCostTotal)}</span>
      </div>
    </article>
    <article class="record-card">
      <strong>Ganancia JoathiVA</strong>
      <p>${formatCurrency(summary.platformGainTotal)}</p>
      <div class="data-grid">
        <span><strong>Margen comercial</strong>${escapeHtml(summary.marginLabel)}</span>
        <span><strong>Sin IVA</strong>${formatCurrency(summary.salesTotal - summary.providerCostTotal)}</span>
      </div>
    </article>
  `;
}

function renderAdminRequestSpotlight() {
  const node = document.querySelector("#adminRequestsSpotlight");
  if (!node) return;

  const requests = Array.isArray(state.requests) ? state.requests : [];
  const activeRequests = requests.filter((request) => !Boolean(request.invoiceRecord?.operationTimeline?.completedAt));
  const readyToCharge = requests.filter((request) => request.paymentStatus === "habilitado_cobro");
  const readyToSettle = requests.filter((request) => request.settlementStatus === "habilitado_pago_proveedor");
  const latestRequests = requests.slice(0, 3);

  node.innerHTML = `
    <article class="record-card admin-request-kpis">
      <strong>Pedidos en foco</strong>
      <div class="data-grid">
        <span><strong>Activos</strong>${formatNumber(activeRequests.length)}</span>
        <span><strong>Listos para cobrar</strong>${formatNumber(readyToCharge.length)}</span>
        <span><strong>Listos para pagar</strong>${formatNumber(readyToSettle.length)}</span>
        <span><strong>Total historico</strong>${formatNumber(requests.length)}</span>
      </div>
      <div class="hero-actions">
        <a href="#admin-requests" class="button button-accent">Ir a la base de pedidos</a>
      </div>
    </article>
    <article class="record-card admin-request-latest">
      <strong>Ultimos pedidos cargados</strong>
      <div class="stack-list">
        ${latestRequests.length ? latestRequests.map((request) => `
          <article class="record-card admin-request-mini-card">
            <strong>${escapeHtml(request.cargoDescription || "Pedido sin descripcion")}</strong>
            <p>${escapeHtml(formatDate(request.createdAt || new Date().toISOString()))} | ${escapeHtml(getPaymentStatusLabel(request.paymentStatus))}</p>
            <div class="data-grid">
              <span><strong>Cliente</strong>${escapeHtml(getUser(request.userId)?.displayName || "Sin cliente")}</span>
              <span><strong>Total</strong>${request.billing ? formatCurrency(request.billing.total) : "Sin total"}</span>
            </div>
          </article>
        `).join("") : `
          <article class="record-card admin-request-mini-card">
            <strong>Sin pedidos todavia</strong>
            <p>Cuando entren solicitudes de clientes, apareceran aqui para triage rapido.</p>
          </article>
        `}
      </div>
    </article>
  `;
}

function renderAdminSuccessCases() {
  const summaryNode = document.querySelector("#adminSuccessCasesSummary");
  const listNode = document.querySelector("#adminSuccessCasesList");
  if (!summaryNode || !listNode) return;

  const successCases = Array.isArray(state.successCases) ? state.successCases.slice() : [];
  const orderedCases = successCases.sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
  const publishableCases = orderedCases.filter((item) => item.allowPublishName || item.allowPublishCompany).length;
  const logoReadyCases = orderedCases.filter((item) => item.allowPublishLogo).length;
  const pendingCases = orderedCases.filter((item) => item.status === "pendiente_revision").length;

  summaryNode.innerHTML = `
    <article class="panel stat-card">
      <span>Total</span>
      <strong>${escapeHtml(formatNumber(orderedCases.length))}</strong>
      <small>Casos cargados desde Maestro</small>
    </article>
    <article class="panel stat-card">
      <span>Pendientes</span>
      <strong>${escapeHtml(formatNumber(pendingCases))}</strong>
      <small>Casos que aun requieren criterio comercial</small>
    </article>
    <article class="panel stat-card">
      <span>Publicables</span>
      <strong>${escapeHtml(formatNumber(publishableCases))}</strong>
      <small>Autorizan difusion con nombre o empresa</small>
    </article>
    <article class="panel stat-card">
      <span>Logo habilitado</span>
      <strong>${escapeHtml(formatNumber(logoReadyCases))}</strong>
      <small>Casos con permiso de marca o logo</small>
    </article>
  `;

  if (!orderedCases.length) {
    listNode.innerHTML = `
      <article class="record-card success-case-card">
        <strong>Sin casos cargados</strong>
        <p>Cuando Rodrigo cargue un caso de exito desde Maestro, quedara disponible aqui para usarlo en ventas y contenido.</p>
      </article>
    `;
    return;
  }

  listNode.innerHTML = orderedCases.map(renderAdminSuccessCaseCard).join("");
}

function canUseRodrigoManagementSheet(user) {
  return Boolean(user?.role === "master" && normalizeText(user?.username) === "rodrigo");
}

function initAdminExternalBoard(user) {
  const section = document.querySelector("#admin-external-board");
  if (!section) return;

  if (!canUseRodrigoManagementSheet(user)) {
    stopAdminExternalAutoSync();
    section.remove();
    return;
  }

  if (section.dataset.externalBound !== "true") {
    document.querySelector("#adminExternalRefreshButton")?.addEventListener("click", () => {
      void loadAdminExternalBoard(true, { silent: false, reason: "manual" });
    });
    section.dataset.externalBound = "true";
  }

  bindAdminExternalAi(user);
  void loadAdminExternalAiSettings(user);
  renderAdminExternalAiOutput();
  bindAdminExternalAutoSync();
  scheduleAdminExternalAutoSync(adminExternalSyncState.syncIntervalSeconds);
  void loadAdminExternalBoard(false, { silent: false, reason: "initial" });
}

function getAdminExternalApiUrl(forceRefresh = false) {
  let url = "";
  if (typeof getJoathiVaApiUrl === "function") {
    url = getJoathiVaApiUrl("/api/external-management");
  } else if (/^https?:/i.test(window.location.origin || "")) {
    url = "/api/external-management";
  }

  if (!url) return "";
  return forceRefresh ? `${url}?refresh=1` : url;
}

function stopAdminExternalAutoSync() {
  if (adminExternalSyncState.intervalId) {
    window.clearInterval(adminExternalSyncState.intervalId);
    adminExternalSyncState.intervalId = 0;
  }
}

function scheduleAdminExternalAutoSync(intervalSeconds = adminExternalSyncState.syncIntervalSeconds) {
  const normalizedInterval = Math.max(10, Number(intervalSeconds) || 20);
  adminExternalSyncState.syncIntervalSeconds = normalizedInterval;
  stopAdminExternalAutoSync();
  adminExternalSyncState.intervalId = window.setInterval(() => {
    if (document.hidden || adminExternalSyncState.inFlight) return;
    void loadAdminExternalBoard(false, { silent: true, reason: "interval" });
  }, normalizedInterval * 1000);
}

function bindAdminExternalAutoSync() {
  if (adminExternalSyncState.bound) return;

  const syncNow = () => {
    if (document.hidden) return;
    void loadAdminExternalBoard(false, { silent: true, reason: "wake" });
  };

  document.addEventListener("visibilitychange", syncNow);
  window.addEventListener("focus", syncNow);
  adminExternalSyncState.bound = true;
}

async function loadAdminExternalBoard(forceRefresh = false, options = {}) {
  const { silent = false } = options;
  const url = getAdminExternalApiUrl(forceRefresh);
  if (!url) {
    adminWorkbookAiState.workbook = null;
    renderAdminExternalStatus("No hay backend local disponible para leer el workbook de gestion. Abre JoathiVA desde el servidor HTTP de esta PC.", true);
    renderAdminExternalSummary([]);
    renderAdminExternalWorkbook([]);
    renderAdminExternalAiOutput();
    return;
  }

  if (adminExternalSyncState.inFlight) {
    return;
  }

  adminExternalSyncState.inFlight = true;

  const refreshButton = document.querySelector("#adminExternalRefreshButton");
  const originalLabel = refreshButton?.textContent || "";
  if (refreshButton && !silent) {
    refreshButton.disabled = true;
    refreshButton.textContent = forceRefresh ? "Refrescando..." : "Sincronizando...";
  }

  if (!silent) {
    renderAdminExternalStatus(forceRefresh ? "Refrescando el workbook operativo de Google Sheets..." : "Cargando el workbook operativo de Google Sheets...");
  }

  try {
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || `No se pudo cargar el workbook externo (HTTP ${response.status}).`);
    }

    const workbook = buildAdminExternalWorkbook(result);
    const workbookHash = String(result?.workbookHash || "");
    const hasChanged = Boolean(forceRefresh || !adminExternalSyncState.lastWorkbookHash || (workbookHash && workbookHash !== adminExternalSyncState.lastWorkbookHash));
    const syncIntervalSeconds = Math.max(10, Number(result?.syncIntervalSeconds || adminExternalSyncState.syncIntervalSeconds || 20));

    if (syncIntervalSeconds !== adminExternalSyncState.syncIntervalSeconds || !adminExternalSyncState.intervalId) {
      scheduleAdminExternalAutoSync(syncIntervalSeconds);
    }

    if (hasChanged) {
      renderAdminExternalSummary(workbook.summaryCards);
      renderAdminExternalWorkbook(workbook.sheets);
      adminExternalSyncState.lastWorkbookHash = workbookHash;
      adminExternalSyncState.lastFetchedAt = String(result?.fetchedAt || "");
      adminWorkbookAiState.workbook = workbook;
      adminWorkbookAiState.workbookFetchedAt = String(result?.fetchedAt || "");
      adminWorkbookAiState.analysisText = "";
      adminWorkbookAiState.analysisPrompt = "";
      renderAdminExternalAiOutput();
    }

    if (hasChanged || !silent || result?.stale || result?.warning || workbook.failedCount) {
      renderAdminExternalStatus(
        buildAdminExternalStatusMessage(result, workbook),
        Boolean(result.stale || workbook.failedCount)
      );
    }
  } catch (error) {
    adminWorkbookAiState.workbook = null;
    renderAdminExternalStatus(error?.message || "No fue posible sincronizar el workbook de gestion.", true);
    renderAdminExternalAiOutput();
  } finally {
    adminExternalSyncState.inFlight = false;
    if (refreshButton && !silent) {
      refreshButton.disabled = false;
      refreshButton.textContent = originalLabel;
    }
  }
}

function bindAdminExternalAi(user) {
  const form = document.querySelector("#adminExternalAiForm");
  const quickActionsNode = document.querySelector("#adminExternalAiQuickActions");
  const copyButton = document.querySelector("#adminExternalAiCopyButton");

  if (!form || form.dataset.aiBound === "true") {
    renderAdminExternalAiQuickActions();
    return;
  }

  renderAdminExternalAiQuickActions();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = String(form.querySelector("textarea[name='prompt']")?.value || "").trim();
    await requestAdminExternalAiAnalysis(user, prompt);
  });

  quickActionsNode?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-admin-ai-prompt]");
    if (!button) return;
    const promptId = button.dataset.adminAiPrompt;
    const preset = ADMIN_WORKBOOK_AI_QUICK_PROMPTS.find((item) => item.id === promptId);
    if (!preset) return;
    const promptField = form.querySelector("textarea[name='prompt']");
    if (promptField) {
      promptField.value = preset.prompt;
    }
    await requestAdminExternalAiAnalysis(user, preset.prompt);
  });

  copyButton?.addEventListener("click", async () => {
    if (!adminWorkbookAiState.analysisText) return;
    try {
      await navigator.clipboard.writeText(adminWorkbookAiState.analysisText);
      const previous = copyButton.textContent;
      copyButton.textContent = "Copiado";
      window.setTimeout(() => {
        copyButton.textContent = previous;
      }, 1200);
    } catch {
    }
  });

  form.dataset.aiBound = "true";
}

function renderAdminExternalAiQuickActions() {
  const node = document.querySelector("#adminExternalAiQuickActions");
  if (!node) return;

  node.innerHTML = ADMIN_WORKBOOK_AI_QUICK_PROMPTS.map((item) => `
    <button type="button" class="button button-secondary" data-admin-ai-prompt="${escapeHtml(item.id)}">${escapeHtml(item.label)}</button>
  `).join("");
}

function getAdminOpenAiSettingsApiUrl() {
  let url = "";
  if (typeof getJoathiVaApiUrl === "function") {
    url = getJoathiVaApiUrl("/api/openai/settings");
  } else if (/^https?:/i.test(window.location.origin || "")) {
    url = "/api/openai/settings";
  }

  return url || "";
}

function getAdminOpenAiRespondApiUrl() {
  let url = "";
  if (typeof getJoathiVaApiUrl === "function") {
    url = getJoathiVaApiUrl("/api/openai/respond");
  } else if (/^https?:/i.test(window.location.origin || "")) {
    url = "/api/openai/respond";
  }

  return url || "";
}

async function loadAdminExternalAiSettings(user = getCurrentUser()) {
  const url = getAdminOpenAiSettingsApiUrl();
  if (!url) {
    renderAdminExternalAiStatus("No hay backend local disponible para leer la configuracion de ChatGPT.", true);
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        sessionToken: getPortalSessionToken()
      })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || `No se pudo leer la configuracion de ChatGPT (HTTP ${response.status}).`);
    }

    adminWorkbookAiState.settingsLoaded = true;
    adminWorkbookAiState.connected = Boolean(result.connected);
    adminWorkbookAiState.apiKeyHint = String(result.apiKeyHint || "");
    adminWorkbookAiState.model = String(result.model || "gpt-5");
    renderAdminExternalAiStatus(
      adminWorkbookAiState.connected
        ? "ChatGPT listo para analizar el workbook operativo."
        : "ChatGPT aun no tiene API key cargada. Configuralo desde Growth Lab para habilitar el analisis."
    );
  } catch (error) {
    adminWorkbookAiState.settingsLoaded = false;
    adminWorkbookAiState.connected = false;
    renderAdminExternalAiStatus(error?.message || "No se pudo leer la configuracion de ChatGPT.", true);
  }
}

function renderAdminExternalAiStatus(message, isWarning = false) {
  const node = document.querySelector("#adminExternalAiStatus");
  if (!node) return;

  const summary = adminWorkbookAiState.connected
    ? `Modelo ${adminWorkbookAiState.model}${adminWorkbookAiState.apiKeyHint ? ` | ${adminWorkbookAiState.apiKeyHint}` : ""}`
    : "Sin API key local guardada";

  node.innerHTML = `
    <article class="record-card admin-external-status${isWarning ? " is-warning" : ""}">
      <strong>${isWarning ? "Analisis IA requiere revision" : "Analisis IA operativo"}</strong>
      <p>${escapeHtml(message)}</p>
      <small>${escapeHtml(summary)}</small>
    </article>
  `;
}

function renderAdminExternalAiOutput() {
  const node = document.querySelector("#adminExternalAiOutput");
  if (!node) return;

  if (!adminWorkbookAiState.workbook) {
    node.innerHTML = `
      <article class="record-card admin-external-ai-empty">
        <strong>Esperando workbook</strong>
        <p>Cuando el workbook termine de sincronizar, podras pedir prioridades, riesgos o resumen ejecutivo a ChatGPT.</p>
      </article>
    `;
    return;
  }

  if (!adminWorkbookAiState.analysisText) {
    node.innerHTML = `
      <article class="record-card admin-external-ai-empty">
        <strong>Sin analisis todavia</strong>
        <p>Usa un disparador rapido o escribe una consulta manual. El contexto tomara alertas, operaciones y el resumen actual del workbook.</p>
      </article>
    `;
    return;
  }

  const analyzedAt = adminWorkbookAiState.analysisPrompt
    ? `Consulta: ${adminWorkbookAiState.analysisPrompt}`
    : "Analisis generado";

  node.innerHTML = `
    <article class="record-card admin-external-ai-response">
      <strong>Respuesta de ChatGPT</strong>
      <p>${escapeHtml(analyzedAt)}</p>
      <div class="admin-external-ai-copy">${escapeHtml(adminWorkbookAiState.analysisText).replace(/\n/g, "<br>")}</div>
    </article>
  `;
}

function collectAdminExternalAiAlerts(workbook) {
  if (!workbook) return [];

  return (Array.isArray(workbook.sheets) ? workbook.sheets : [])
    .flatMap((sheet) => (Array.isArray(sheet.alerts) ? sheet.alerts.map((alert) => ({ ...alert, sheetName: sheet.name })) : []))
    .sort((left, right) => getAdminExternalSeverityRank(right.severity) - getAdminExternalSeverityRank(left.severity))
    .slice(0, 12);
}

function collectAdminExternalAiRecords(workbook) {
  if (!workbook) return [];

  return (Array.isArray(workbook.sheets) ? workbook.sheets : [])
    .flatMap((sheet) => (Array.isArray(sheet.records) ? sheet.records.map((record) => ({ ...record, sheetName: sheet.name })) : []))
    .slice(0, 12);
}

function formatAdminExternalAiMeta(meta) {
  const list = Array.isArray(meta) ? meta : [];
  return list
    .map((item) => `${item.label}: ${item.value}`)
    .filter(Boolean)
    .join(" | ");
}

function buildAdminExternalAiContext() {
  const workbook = adminWorkbookAiState.workbook;
  if (!workbook) {
    return "El workbook operativo todavia no esta sincronizado en JoathiVA.";
  }

  const summary = (Array.isArray(workbook.summaryCards) ? workbook.summaryCards : [])
    .map((card) => `- ${card.label}: ${card.value} (${card.note})`)
    .join("\n");
  const alerts = collectAdminExternalAiAlerts(workbook)
    .map((item) => `- [${String(item.severity || "warning").toUpperCase()}] ${item.sheetName}: ${item.title}. ${item.body}${item.meta ? ` | ${formatAdminExternalAiMeta(item.meta)}` : ""}`)
    .join("\n");
  const records = collectAdminExternalAiRecords(workbook)
    .map((item) => `- ${item.sheetName}: ${item.title}${item.subtitle ? ` | ${item.subtitle}` : ""}${item.meta ? ` | ${formatAdminExternalAiMeta(item.meta)}` : ""}`)
    .join("\n");

  return [
    "Contexto: workbook operativo de JoathiVA visible en Maestro para Rodrigo.",
    `Ultima lectura del workbook: ${adminWorkbookAiState.workbookFetchedAt ? formatDateTime(adminWorkbookAiState.workbookFetchedAt) : "sin fecha"}.`,
    "Resumen actual:",
    summary || "- Sin resumen disponible.",
    "Alertas priorizadas:",
    alerts || "- Sin alertas activas.",
    "Filas y operaciones destacadas:",
    records || "- Sin filas destacadas."
  ].join("\n\n");
}

async function requestAdminExternalAiAnalysis(user, prompt) {
  const cleanPrompt = String(prompt || "").trim();
  if (!cleanPrompt) {
    renderAdminExternalAiStatus("Escribe una consulta concreta para analizar el workbook con ChatGPT.", true);
    return;
  }

  if (!adminWorkbookAiState.workbook) {
    renderAdminExternalAiStatus("Primero debe sincronizarse el workbook para poder analizarlo.", true);
    return;
  }

  if (adminWorkbookAiState.busy) {
    return;
  }

  const url = getAdminOpenAiRespondApiUrl();
  if (!url) {
    renderAdminExternalAiStatus("No hay backend local disponible para consultar ChatGPT.", true);
    return;
  }

  adminWorkbookAiState.busy = true;
  renderAdminExternalAiStatus("Analizando workbook con ChatGPT...");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        sessionToken: getPortalSessionToken(),
        prompt: cleanPrompt,
        context: buildAdminExternalAiContext()
      })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || `No se pudo completar el analisis (HTTP ${response.status}).`);
    }

    adminWorkbookAiState.analysisPrompt = cleanPrompt;
    adminWorkbookAiState.analysisText = String(result.outputText || result.output || "").trim();
    if (result.model) {
      adminWorkbookAiState.model = String(result.model);
    }
    renderAdminExternalAiOutput();
    renderAdminExternalAiStatus("Analisis listo. Revisa la salida y copiala si quieres usarla en direccion, ventas u operacion.");
  } catch (error) {
    renderAdminExternalAiStatus(error?.message || "No se pudo analizar el workbook con ChatGPT.", true);
  } finally {
    adminWorkbookAiState.busy = false;
  }
}

function buildAdminExternalStatusMessage(result, snapshot) {
  const fetchedAt = result?.fetchedAt ? formatDateTime(result.fetchedAt) : "sin fecha";
  const syncIntervalSeconds = Math.max(10, Number(result?.syncIntervalSeconds || adminExternalSyncState.syncIntervalSeconds || 20));
  const base = `Workbook sincronizado. ${formatNumber(snapshot.sheets.length)} hojas detectadas, ${formatNumber(snapshot.populatedCount)} con datos y ${formatNumber(snapshot.totalAlerts)} alertas priorizadas.`;
  const duplicateMessage = snapshot.duplicatePairs.length
    ? `Se detectaron ${formatNumber(snapshot.duplicatePairs.length)} vistas duplicadas.`
    : "";
  const failureMessage = snapshot.failedCount
    ? `${formatNumber(snapshot.failedCount)} hojas no se pudieron leer en esta pasada.`
    : "";
  const autoSyncMessage = `JoathiVA replica cambios automaticamente cada ${formatNumber(syncIntervalSeconds)} segundos mientras esta abierto.`;
  if (result?.warning) {
    return `${base} ${duplicateMessage} ${failureMessage} ${autoSyncMessage} ${result.warning} Ultima lectura: ${fetchedAt}.`
      .replace(/\s+/g, " ")
      .trim();
  }

  return `${base} ${duplicateMessage} ${failureMessage} ${autoSyncMessage} Ultima lectura: ${fetchedAt}${result?.cached ? " desde cache" : ""}.`
    .replace(/\s+/g, " ")
    .trim();
}

const ADMIN_EXTERNAL_MONTH_LABELS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre"
];

function buildAdminExternalWorkbook(result) {
  const sheets = Array.isArray(result?.sheets)
    ? result.sheets.map((entry, index) => analyzeAdminExternalSheet(entry, index))
    : [];

  const hashGroups = new Map();
  sheets.forEach((sheet) => {
    if (!sheet.ok || !sheet.contentHash || sheet.rowCount <= 0) return;
    const current = hashGroups.get(sheet.contentHash) || [];
    current.push(sheet);
    hashGroups.set(sheet.contentHash, current);
  });

  const duplicatePairs = [];
  hashGroups.forEach((group) => {
    if (group.length <= 1) return;
    const primary = group[0];
    group.slice(1).forEach((sheet) => {
      sheet.duplicateOf = primary.name;
      duplicatePairs.push(`${sheet.name} = ${primary.name}`);
    });
  });

  const populatedCount = sheets.filter((sheet) => sheet.ok && sheet.rowCount > 0).length;
  const emptyCount = sheets.filter((sheet) => sheet.ok && sheet.rowCount === 0).length;
  const failedCount = sheets.filter((sheet) => !sheet.ok).length;
  const totalAlerts = sheets.reduce((sum, sheet) => sum + sheet.alerts.length, 0);
  const urgentAlerts = sheets.reduce(
    (sum, sheet) => sum + sheet.alerts.filter((alert) => alert.severity === "urgent").length,
    0
  );

  return {
    sheets,
    populatedCount,
    emptyCount,
    failedCount,
    totalAlerts,
    urgentAlerts,
    duplicatePairs,
    summaryCards: [
      { label: "Hojas detectadas", value: formatNumber(sheets.length), note: "Pestanas visibles en Google Sheets" },
      { label: "Con datos", value: formatNumber(populatedCount), note: "Hojas con filas utilizables" },
      { label: "Alertas activas", value: formatNumber(totalAlerts), note: "Pendientes priorizados en todo el libro" },
      { label: "Alertas urgentes", value: formatNumber(urgentAlerts), note: "Casos para revisar hoy" },
      { label: "Duplicadas o vacias", value: formatNumber(duplicatePairs.length + emptyCount), note: failedCount ? `${formatNumber(failedCount)} hojas con error de lectura` : "Sin errores de lectura" }
    ]
  };
}

function analyzeAdminExternalSheet(entry, index) {
  const base = {
    ok: Boolean(entry?.ok),
    name: String(entry?.name || `Hoja ${index + 1}`),
    gid: String(entry?.gid || ""),
    type: "generic",
    typeLabel: "Hoja",
    description: "Vista generica de la hoja integrada.",
    rowCount: Number(entry?.rowCount || 0),
    contentHash: String(entry?.contentHash || ""),
    summaryCards: [],
    detailCards: [],
    alerts: [],
    records: [],
    recordsTitle: "Filas destacadas",
    recordsEyebrow: "Detalle",
    detailTitle: "Resumen",
    alertTitle: "Alertas",
    emptyMessage: "",
    duplicateOf: "",
    sourceUrl: String(entry?.sourceUrl || ""),
    error: String(entry?.error || "")
  };

  if (!base.ok) {
    base.type = "error";
    base.typeLabel = "Hoja con error";
    base.description = "No se pudo exportar esta hoja desde Google Sheets.";
    base.summaryCards = [
      { label: "Estado", value: "Error", note: "La exportacion de esta hoja fallo" },
      { label: "Filas", value: "0", note: "Sin contenido disponible" },
      { label: "GID", value: base.gid || "Sin gid", note: "Identificador de la pestana" }
    ];
    base.alerts = [{
      severity: "urgent",
      title: "No se pudo leer la hoja",
      body: base.error || "Google Sheets no devolvio contenido para esta pestana.",
      meta: [
        { label: "Hoja", value: base.name },
        { label: "GID", value: base.gid || "Sin gid" }
      ]
    }];
    base.emptyMessage = "Esta hoja no pudo integrarse en esta sincronizacion.";
    return base;
  }

  const parsedRows = parseCsv(String(entry?.csvText || ""));
  const meaningfulRows = parsedRows.filter((columns) => Array.isArray(columns) && columns.some((value) => String(value || "").trim()));

  if (!meaningfulRows.length) {
    base.type = "empty";
    base.typeLabel = "Hoja vacia";
    base.description = "La pestana existe en Google Sheets, pero no devuelve filas con datos utilizables.";
    base.summaryCards = [
      { label: "Estado", value: "Sin datos", note: "No hay filas exportables" },
      { label: "Filas", value: "0", note: "La hoja esta disponible pero vacia" },
      { label: "GID", value: base.gid || "Sin gid", note: "Identificador de la pestana" }
    ];
    base.emptyMessage = "No se encontraron filas con datos en esta hoja.";
    return base;
  }

  const header = meaningfulRows[0] || [];
  const sheetType = detectAdminExternalSheetType(header);

  if (sheetType === "operations") return analyzeAdminExternalOperationsSheet(base, meaningfulRows);
  if (sheetType === "expenses") return analyzeAdminExternalExpenseSheet(base, meaningfulRows);
  if (sheetType === "petro") return analyzeAdminExternalPetroSheet(base, meaningfulRows);
  return analyzeAdminExternalGenericSheet(base, meaningfulRows);
}

function detectAdminExternalSheetType(headerRow) {
  const normalizedHeader = (Array.isArray(headerRow) ? headerRow : []).map((value) => normalizeText(value));
  const headerText = normalizedHeader.join(" ");

  if (normalizedHeader.includes("responsable") && normalizedHeader.includes("cliente") && normalizedHeader.includes("proveedor")) {
    return "operations";
  }
  if (headerText.includes("mes operativa") && headerText.includes("fact dua")) {
    return "petro";
  }
  if (headerText.includes("gastos") || (headerText.includes("mesuales pesos") && headerText.includes("dolares"))) {
    return "expenses";
  }
  return "generic";
}

function parseAdminExternalCsv(text) {
  const rows = parseCsv(text);
  return parseAdminExternalCsvRows(rows);
}

function parseAdminExternalCsvRows(rows) {
  if (rows.length <= 1) return [];

  const carry = {};
  return rows
    .slice(1)
    .map((columns, index) => normalizeAdminExternalRow(columns, index, carry))
    .filter(Boolean);
}

function normalizeAdminExternalRow(columns, index, carry) {
  const cells = Array.isArray(columns) ? columns : [];
  const meaningful = cells.slice(0, 26).some((value) => String(value || "").trim());
  if (!meaningful) return null;

  const row = {
    line: index + 2,
    responsible: getAdminExternalCell(cells, 0),
    billingDateRaw: getAdminExternalCell(cells, 1),
    client: getAdminExternalCell(cells, 2),
    operation: getAdminExternalCell(cells, 3),
    mode: getAdminExternalCell(cells, 4),
    origin: getAdminExternalCell(cells, 5),
    destination: getAdminExternalCell(cells, 6),
    reference: getAdminExternalCell(cells, 7),
    units: getAdminExternalCell(cells, 8),
    transportType: getAdminExternalCell(cells, 9),
    currency: getAdminExternalCell(cells, 10),
    freight: getAdminExternalCell(cells, 11),
    saleIva: getAdminExternalCell(cells, 12),
    various: getAdminExternalCell(cells, 13),
    dispatch: getAdminExternalCell(cells, 14),
    insurance: getAdminExternalCell(cells, 15),
    saleTotal: getAdminExternalCell(cells, 16),
    clientInvoice: getAdminExternalCell(cells, 17),
    clientReceipt: getAdminExternalCell(cells, 18),
    margin: getAdminExternalCell(cells, 19),
    purchase: getAdminExternalCell(cells, 20),
    purchaseIva: getAdminExternalCell(cells, 21),
    purchaseTotal: getAdminExternalCell(cells, 22),
    provider: getAdminExternalCell(cells, 23),
    providerInvoice: getAdminExternalCell(cells, 24),
    providerReceipt: getAdminExternalCell(cells, 25)
  };

  [
    "responsible",
    "billingDateRaw",
    "client",
    "operation",
    "mode",
    "origin",
    "destination",
    "reference",
    "units",
    "transportType",
    "currency",
    "provider"
  ].forEach((key) => {
    if (row[key]) {
      carry[key] = row[key];
    } else if (carry[key]) {
      row[key] = carry[key];
    }
  });

  row.currencyCode = getAdminExternalCurrencyCode(row.currency);
  row.billingDateIso = parseAdminExternalDate(row.billingDateRaw);
  row.billingDateLabel = row.billingDateIso ? formatDate(row.billingDateIso) : (row.billingDateRaw || "Sin fecha");
  row.ageDays = getAdminExternalAgeDays(row.billingDateIso);
  row.transportModeLabel = row.mode || "Sin modo transporte";
  row.transportTypeLabel = row.transportType || "Sin tipo transporte";
  row.referenceLabel = row.reference || "Sin nombre de operativa";
  row.saleTotalValue = parseAdminExternalNumber(row.saleTotal);
  row.purchaseTotalValue = parseAdminExternalNumber(row.purchaseTotal);
  row.marginValue = parseAdminExternalNumber(row.margin);
  row.freightValue = parseAdminExternalNumber(row.freight);
  row.saleIvaValue = parseAdminExternalNumber(row.saleIva);
  row.variousValue = parseAdminExternalNumber(row.various);
  row.dispatchValue = parseAdminExternalNumber(row.dispatch);
  row.insuranceValue = parseAdminExternalNumber(row.insurance);
  row.saleValue = parseAdminExternalNumber(row.freight) + parseAdminExternalNumber(row.saleIva) + parseAdminExternalNumber(row.various) + parseAdminExternalNumber(row.dispatch) + parseAdminExternalNumber(row.insurance);
  row.purchaseValue = parseAdminExternalNumber(row.purchase);
  row.isRodrigo = normalizeText(row.responsible).includes("rodri");
  row.alerts = buildAdminExternalAlerts(row);
  return row;
}

function getAdminExternalCell(cells, index) {
  return String(cells[index] || "").trim();
}

function parseAdminExternalNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return 0;

  const normalized = raw
    .replace(/\s+/g, "")
    .replace(/\$(?=\d)/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,(?=\d)/g, ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseAdminExternalDate(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];
  return `${year}-${month}-${day}`;
}

function parseAdminExternalShortDate(value, fallbackYear = new Date().getFullYear()) {
  const fullDate = parseAdminExternalDate(value);
  if (fullDate) return fullDate;

  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  return `${fallbackYear}-${month}-${day}`;
}

function extractAdminExternalMonthLabel(value) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  const found = ADMIN_EXTERNAL_MONTH_LABELS.find((item) => normalized.includes(item));
  return found ? found.toUpperCase() : "";
}

function getAdminExternalAgeDays(dateIso) {
  if (!dateIso) return 0;
  const current = new Date();
  const target = new Date(`${dateIso}T00:00:00`);
  const diff = current.getTime() - target.getTime();
  return diff > 0 ? Math.floor(diff / 86400000) : 0;
}

function getAdminExternalCurrencyCode(value) {
  const normalized = normalizeText(value);
  if (normalized.includes("peso")) return "UYU";
  if (normalized.includes("dolar")) return "USD";
  return "USD";
}

function buildAdminExternalAlerts(row) {
  const alerts = [];
  const overdue = row.ageDays >= 30;

  if (row.saleTotalValue > 0 && !row.clientInvoice) {
    alerts.push({
      severity: overdue ? "urgent" : "warning",
      title: "Factura cliente faltante",
      body: "La venta ya esta registrada, pero no aparece comprobante FAC."
    });
  }

  if (row.saleTotalValue > 0 && !row.clientReceipt) {
    alerts.push({
      severity: overdue ? "urgent" : "warning",
      title: "Cobro pendiente",
      body: "La operacion no muestra recibo del cliente."
    });
  }

  if (row.purchaseTotalValue > 0 && !row.providerInvoice) {
    alerts.push({
      severity: overdue ? "urgent" : "warning",
      title: "Factura proveedor faltante",
      body: "Hay compra cargada, pero no figura factura del proveedor."
    });
  }

  if (row.purchaseTotalValue > 0 && !row.providerReceipt) {
    alerts.push({
      severity: overdue ? "urgent" : "warning",
      title: "Recibo proveedor faltante",
      body: "La liquidacion al proveedor no tiene recibo asociado."
    });
  }

  if (row.marginValue <= 0 && (row.saleTotalValue > 0 || row.purchaseTotalValue > 0)) {
    alerts.push({
      severity: "urgent",
      title: "Margen comprometido",
      body: "El margen de esta linea es cero o negativo."
    });
  }

  if (!row.client || !row.reference || (row.purchaseTotalValue > 0 && !row.provider)) {
    alerts.push({
      severity: "warning",
      title: "Operacion incompleta",
      body: "Faltan datos clave de cliente, nombre de operativa del cliente o proveedor para seguimiento."
    });
  }

  return alerts;
}

function buildAdminExternalSnapshot(rows) {
  const scopedRows = rows.filter((row) => row.isRodrigo);
  const activeRows = scopedRows.length ? scopedRows : rows;
  const operations = activeRows
    .slice()
    .sort((left, right) => String(right.billingDateIso || "").localeCompare(String(left.billingDateIso || "")))
    .slice(0, 8);

  const alerts = activeRows
    .flatMap((row) => row.alerts.map((alert) => ({ ...alert, row })))
    .sort((left, right) => {
      const severityDiff = getAdminExternalSeverityRank(right.severity) - getAdminExternalSeverityRank(left.severity);
      if (severityDiff !== 0) return severityDiff;
      return (right.row.ageDays || 0) - (left.row.ageDays || 0);
    })
    .slice(0, 10);

  const pendingCollections = activeRows.filter((row) => row.saleTotalValue > 0 && !row.clientReceipt).length;
  const providerPending = activeRows.filter((row) => row.purchaseTotalValue > 0 && (!row.providerInvoice || !row.providerReceipt)).length;
  const urgentAlerts = alerts.filter((alert) => alert.severity === "urgent").length;
  const negativeMargins = activeRows.filter((row) => row.marginValue <= 0 && (row.saleTotalValue > 0 || row.purchaseTotalValue > 0)).length;

  const moneyByCurrency = summarizeAdminExternalCurrency(activeRows);

  return {
    operations,
    alerts,
    scopeLabel: scopedRows.length ? "scope Rodrigo" : "scope general",
    summaryCards: [
      { label: "Movimientos de Rodrigo", value: formatNumber(activeRows.length), note: "Lineas heredadas desde la hoja de gestion" },
      { label: "Alertas urgentes", value: formatNumber(urgentAlerts), note: "Prioridad alta para revisar hoy" },
      { label: "Cobros pendientes", value: formatNumber(pendingCollections), note: "Ventas sin recibo de cliente" },
      { label: "Soporte proveedor", value: formatNumber(providerPending), note: "Factura o recibo proveedor faltante" },
      { label: "Margen comprometido", value: formatNumber(negativeMargins), note: "Lineas con margen cero o negativo" }
    ],
    financeCards: moneyByCurrency.map((item) => ({
      title: `Totales ${item.currencyCode}`,
      sale: formatAdminExternalMoney(item.saleTotal, item.currencyCode),
      purchase: formatAdminExternalMoney(item.purchaseTotal, item.currencyCode),
      margin: formatAdminExternalMoney(item.marginTotal, item.currencyCode)
    }))
  };
}

function analyzeAdminExternalOperationsSheet(base, rows) {
  const normalizedRows = parseAdminExternalCsvRows(rows);
  const snapshot = buildAdminExternalSnapshot(normalizedRows);

  return {
    ...base,
    type: "operations",
    typeLabel: "Operaciones",
    description: snapshot.scopeLabel === "scope Rodrigo"
      ? "Lectura operativa filtrada por responsable Rodrigo."
      : "La hoja no trae lineas exclusivas para Rodrigo; se muestra el scope general de operaciones.",
    rowCount: normalizedRows.length,
    summaryCards: snapshot.summaryCards,
    detailTitle: "Totales y foco",
    detailCards: [
      ...snapshot.financeCards.map((card) => ({
        title: card.title,
        lines: [
          { label: "Venta", value: card.sale },
          { label: "Compra", value: card.purchase },
          { label: "Margen", value: card.margin }
        ]
      })),
      {
        title: "Lectura de columnas",
        lines: [
          { label: "Modo transporte", value: "Aereo, terrestre o maritimo" },
          { label: "Tipo transporte", value: "Carreta, sider, porta contenedores o furgon" },
          { label: "Operativa cliente", value: "La referencia es el nombre de la operativa del cliente" }
        ]
      },
      {
        title: "Costos del proveedor",
        lines: [
          { label: "Flete", value: "Costo cotizado del proveedor" },
          { label: "IVA", value: "Cotizacion del proveedor mas tramos nacionales si es importacion" },
          { label: "Varios", value: "Canal rojo, estadias y horas extra de carga/descarga" }
        ]
      }
    ],
    alertTitle: "Alertas prioritarias",
    alerts: snapshot.alerts.map((item) => ({
      severity: item.severity,
      title: item.title,
      body: item.body,
      meta: [
        { label: "Cliente", value: item.row.client || "Sin cliente" },
        { label: "Operativa cliente", value: item.row.referenceLabel },
        { label: "Modo transporte", value: item.row.transportModeLabel },
        { label: "Fecha", value: item.row.billingDateLabel },
        { label: "Responsable", value: item.row.responsible || "Sin responsable" }
      ]
    })),
    recordsTitle: "Ultimos movimientos asignados",
    recordsEyebrow: "Operaciones",
    records: snapshot.operations.map((row) => ({
      title: `${row.client || "Sin cliente"} | ${row.referenceLabel}`,
      subtitle: `${row.transportModeLabel} | ${row.transportTypeLabel} | ${row.origin || "Sin origen"} -> ${row.destination || "Sin destino"}`,
      meta: [
        { label: "Fecha", value: row.billingDateLabel },
        { label: "Operacion", value: row.operation || "Sin operacion" },
        { label: "Modo transporte", value: row.transportModeLabel },
        { label: "Tipo transporte", value: row.transportTypeLabel },
        { label: "Operativa cliente", value: row.referenceLabel },
        { label: "Flete proveedor", value: formatAdminExternalMoney(row.freightValue, row.currencyCode) },
        { label: "IVA proveedor + tramo nacional", value: formatAdminExternalMoney(row.saleIvaValue, row.currencyCode) },
        { label: "Gastos varios", value: formatAdminExternalMoney(row.variousValue, row.currencyCode) },
        { label: "Responsable", value: row.responsible || "Sin responsable" },
        { label: "Venta", value: formatAdminExternalMoney(row.saleTotalValue, row.currencyCode) },
        { label: "Compra", value: formatAdminExternalMoney(row.purchaseTotalValue, row.currencyCode) },
        { label: "Margen", value: formatAdminExternalMoney(row.marginValue, row.currencyCode) },
        { label: "Proveedor", value: row.provider || "Sin proveedor" }
      ],
      badges: [
        row.clientInvoice ? { label: `FAC ${row.clientInvoice}` } : { label: "FAC pendiente", tone: "warning" },
        row.clientReceipt ? { label: `Recibo ${row.clientReceipt}` } : { label: "Cobro pendiente", tone: "warning" },
        row.providerInvoice ? { label: `Fact prov ${row.providerInvoice}` } : { label: "Fact prov pendiente", tone: "warning" },
        row.providerReceipt ? { label: `Rec prov ${row.providerReceipt}` } : { label: "Rec prov pendiente", tone: "warning" }
      ]
    }))
  };
}

function analyzeAdminExternalExpenseSheet(base, rows) {
  const header = rows[0] || [];
  let currentPeriod = extractAdminExternalMonthLabel(header[0]) || String(header[0] || "").trim() || "Sin periodo";
  const items = [];

  rows.slice(1).forEach((columns, index) => {
    const concept = getAdminExternalCell(columns, 0);
    const pesosRaw = getAdminExternalCell(columns, 1);
    const dollarsRaw = getAdminExternalCell(columns, 2);
    const pesosValue = parseAdminExternalNumber(pesosRaw);
    const dollarsValue = parseAdminExternalNumber(dollarsRaw);
    const hasAmount = pesosValue > 0 || dollarsValue > 0;
    const monthLabel = extractAdminExternalMonthLabel(concept);

    if (concept && !pesosRaw && !dollarsRaw && monthLabel) {
      currentPeriod = monthLabel;
      return;
    }

    if (!concept && normalizeText(dollarsRaw) === "dolares") return;
    if (!concept && !hasAmount) return;

    items.push({
      line: index + 2,
      period: currentPeriod || "Sin periodo",
      concept: concept || "Sin concepto",
      pesosValue,
      dollarsValue,
      pending: !hasAmount,
      pesosLabel: pesosValue ? formatAdminExternalMoney(pesosValue, "UYU") : "-",
      dollarsLabel: dollarsValue ? formatAdminExternalMoney(dollarsValue, "USD") : "-"
    });
  });

  const periods = new Set(items.map((item) => item.period).filter(Boolean));
  const pendingItems = items.filter((item) => item.pending);
  const totalPesos = items.reduce((sum, item) => sum + item.pesosValue, 0);
  const totalDollars = items.reduce((sum, item) => sum + item.dollarsValue, 0);
  const rankedItems = items
    .slice()
    .sort((left, right) => {
      if (left.pending !== right.pending) return left.pending ? -1 : 1;
      const rightScore = right.pesosValue + (right.dollarsValue * 1000);
      const leftScore = left.pesosValue + (left.dollarsValue * 1000);
      return rightScore - leftScore;
    })
    .slice(0, 8);

  return {
    ...base,
    type: "expenses",
    typeLabel: "Gastos",
    description: "Control de gastos mensuales en pesos y dolares, con foco en importes pendientes de completar.",
    rowCount: items.length,
    summaryCards: [
      { label: "Conceptos", value: formatNumber(items.length), note: "Filas operativas detectadas en gastos" },
      { label: "Periodos", value: formatNumber(periods.size), note: "Meses o bloques activos en la hoja" },
      { label: "Pendientes", value: formatNumber(pendingItems.length), note: "Filas sin importe declarado" },
      { label: "Total UYU", value: formatAdminExternalMoney(totalPesos, "UYU"), note: "Gasto acumulado en pesos" },
      { label: "Total USD", value: formatAdminExternalMoney(totalDollars, "USD"), note: "Gasto acumulado en dolares" }
    ],
    detailTitle: "Totales y control",
    detailCards: [
      {
        title: "Totales UYU",
        lines: [
          { label: "Gasto acumulado", value: formatAdminExternalMoney(totalPesos, "UYU") },
          { label: "Conceptos con cargo", value: formatNumber(items.filter((item) => item.pesosValue > 0).length) }
        ]
      },
      {
        title: "Totales USD",
        lines: [
          { label: "Gasto acumulado", value: formatAdminExternalMoney(totalDollars, "USD") },
          { label: "Conceptos con cargo", value: formatNumber(items.filter((item) => item.dollarsValue > 0).length) }
        ]
      },
      {
        title: "Pendientes",
        lines: [
          { label: "Filas sin importe", value: formatNumber(pendingItems.length) },
          { label: "Periodos activos", value: formatNumber(periods.size) }
        ]
      }
    ],
    alertTitle: "Alertas de gastos",
    alerts: pendingItems.slice(0, 8).map((item) => ({
      severity: "warning",
      title: "Gasto sin importe",
      body: "La fila existe en la hoja, pero no tiene monto cargado en pesos ni en dolares.",
      meta: [
        { label: "Concepto", value: item.concept },
        { label: "Periodo", value: item.period },
        { label: "Linea", value: String(item.line) }
      ]
    })),
    recordsTitle: "Conceptos destacados",
    recordsEyebrow: "Gastos",
    records: rankedItems.map((item) => ({
      title: item.concept,
      subtitle: `Periodo ${item.period}`,
      meta: [
        { label: "Pesos", value: item.pesosLabel },
        { label: "Dolares", value: item.dollarsLabel },
        { label: "Linea", value: String(item.line) }
      ],
      badges: item.pending ? [{ label: "Importe pendiente", tone: "warning" }] : []
    })),
    emptyMessage: items.length ? "" : "La hoja de gastos no devuelve filas operativas con concepto e importes."
  };
}

function analyzeAdminExternalPetroSheet(base, rows) {
  let currentPeriod = extractAdminExternalMonthLabel((rows[0] || [])[0]) || "Sin periodo";
  let currentGroup = "";
  const items = [];

  rows.slice(1).forEach((columns, index) => {
    const periodCell = getAdminExternalCell(columns, 0);
    const dua = getAdminExternalCell(columns, 1);
    const loadDateRaw = getAdminExternalCell(columns, 2);
    const zc = getAdminExternalCell(columns, 3);
    const truckCount = parseAdminExternalNumber(getAdminExternalCell(columns, 4));
    const usdValue = parseAdminExternalNumber(getAdminExternalCell(columns, 5));
    const invoice = getAdminExternalCell(columns, 6);
    const receipt = getAdminExternalCell(columns, 7);
    const hasDetails = Boolean(dua || loadDateRaw || zc || truckCount || usdValue || invoice || receipt);
    const monthLabel = extractAdminExternalMonthLabel(periodCell);

    if (periodCell && !hasDetails) {
      if (monthLabel) {
        currentPeriod = monthLabel;
        currentGroup = "";
      } else {
        currentGroup = periodCell;
      }
      return;
    }

    if (!periodCell && !hasDetails) return;

    const effectivePeriod = monthLabel || currentPeriod || "Sin periodo";
    if (monthLabel) currentPeriod = monthLabel;

    const loadDateIso = parseAdminExternalShortDate(loadDateRaw);
    const item = {
      line: index + 2,
      period: effectivePeriod,
      group: currentGroup || "Sin frente",
      dua,
      loadDateIso,
      loadDateLabel: loadDateIso ? formatDate(loadDateIso) : (loadDateRaw || "Sin fecha"),
      zc,
      truckCount,
      usdValue,
      invoice,
      receipt,
      ageDays: getAdminExternalAgeDays(loadDateIso),
      pendingInvoice: usdValue > 0 && !invoice,
      pendingReceipt: usdValue > 0 && !receipt,
      pendingDua: usdValue > 0 && !dua
    };

    if (!(item.dua || item.zc || item.truckCount || item.usdValue || item.invoice || item.receipt)) return;
    items.push(item);
  });

  const alerts = items
    .flatMap((item) => {
      const severity = item.ageDays >= 14 ? "urgent" : "warning";
      const issueList = [];
      if (item.pendingReceipt) {
        issueList.push({
          severity,
          title: "Recibo pendiente",
          body: "La linea PETRO ya tiene movimiento en USD, pero no aparece recibo asociado.",
          meta: [
            { label: "Periodo", value: item.period },
            { label: "ZC", value: item.zc || "Sin ZC" },
            { label: "Fecha", value: item.loadDateLabel },
            { label: "Frente", value: item.group }
          ]
        });
      }
      if (item.pendingInvoice) {
        issueList.push({
          severity,
          title: "Factura pendiente",
          body: "La operativa PETRO no muestra numero de factura emitida.",
          meta: [
            { label: "Periodo", value: item.period },
            { label: "ZC", value: item.zc || "Sin ZC" },
            { label: "USD", value: formatAdminExternalMoney(item.usdValue, "USD") },
            { label: "Frente", value: item.group }
          ]
        });
      }
      if (item.pendingDua) {
        issueList.push({
          severity: "warning",
          title: "FACT DUA faltante",
          body: "La fila no tiene FACT DUA cargada para la operativa.",
          meta: [
            { label: "Periodo", value: item.period },
            { label: "Fecha", value: item.loadDateLabel },
            { label: "Frente", value: item.group }
          ]
        });
      }
      return issueList;
    })
    .sort((left, right) => getAdminExternalSeverityRank(right.severity) - getAdminExternalSeverityRank(left.severity))
    .slice(0, 10);

  const totalsByPeriod = new Map();
  items.forEach((item) => {
    const key = item.period || "Sin periodo";
    const current = totalsByPeriod.get(key) || { period: key, usdValue: 0, truckCount: 0, count: 0 };
    current.usdValue += item.usdValue;
    current.truckCount += item.truckCount;
    current.count += 1;
    totalsByPeriod.set(key, current);
  });

  const totalUsd = items.reduce((sum, item) => sum + item.usdValue, 0);
  const totalTrucks = items.reduce((sum, item) => sum + item.truckCount, 0);
  const missingInvoices = items.filter((item) => item.pendingInvoice).length;
  const missingReceipts = items.filter((item) => item.pendingReceipt).length;
  const records = items
    .slice()
    .sort((left, right) => String(right.loadDateIso || "").localeCompare(String(left.loadDateIso || "")))
    .slice(0, 8);

  return {
    ...base,
    type: "petro",
    typeLabel: "PETRO",
    description: "Seguimiento de la operativa PETRO: DUA, fecha de carga, camiones, factura y recibo.",
    rowCount: items.length,
    summaryCards: [
      { label: "Lineas PETRO", value: formatNumber(items.length), note: "Filas con actividad detectada" },
      { label: "Camiones", value: formatNumber(totalTrucks), note: "Cantidad total cargada en la hoja" },
      { label: "USD total", value: formatAdminExternalMoney(totalUsd, "USD"), note: "Facturacion o referencia economica" },
      { label: "Facturas pendientes", value: formatNumber(missingInvoices), note: "Filas sin numero de factura" },
      { label: "Recibos pendientes", value: formatNumber(missingReceipts), note: "Filas sin recibo asociado" }
    ],
    detailTitle: "Totales por periodo",
    detailCards: Array.from(totalsByPeriod.values())
      .sort((left, right) => String(left.period).localeCompare(String(right.period)))
      .slice(0, 6)
      .map((item) => ({
        title: item.period,
        lines: [
          { label: "Lineas", value: formatNumber(item.count) },
          { label: "Camiones", value: formatNumber(item.truckCount) },
          { label: "USD", value: formatAdminExternalMoney(item.usdValue, "USD") }
        ]
      })),
    alertTitle: "Alertas PETRO",
    alerts,
    recordsTitle: "Ultimos movimientos PETRO",
    recordsEyebrow: "PETRO",
    records: records.map((item) => ({
      title: `${item.period} | ${item.zc || "Sin ZC"}`,
      subtitle: `${item.dua || "Sin FACT DUA"} | ${item.group}`,
      meta: [
        { label: "Fecha", value: item.loadDateLabel },
        { label: "Camiones", value: formatNumber(item.truckCount) },
        { label: "USD", value: formatAdminExternalMoney(item.usdValue, "USD") },
        { label: "Factura", value: item.invoice || "Pendiente" }
      ],
      badges: [
        item.receipt ? { label: `Recibo ${item.receipt}` } : { label: "Recibo pendiente", tone: "warning" },
        item.invoice ? { label: `Fact ${item.invoice}` } : { label: "Factura pendiente", tone: "warning" },
        item.dua ? { label: "FACT DUA ok" } : { label: "FACT DUA faltante", tone: "warning" }
      ]
    })),
    emptyMessage: items.length ? "" : "La hoja PETRO no devolvio filas con actividad utilizable."
  };
}

function analyzeAdminExternalGenericSheet(base, rows) {
  const header = rows[0] || [];
  const dataRows = rows.slice(1).filter((columns) => Array.isArray(columns) && columns.some((value) => String(value || "").trim()));
  const normalizedHeaders = header
    .map((value, index) => String(value || "").trim() || `Columna ${index + 1}`)
    .slice(0, 6);

  return {
    ...base,
    type: "generic",
    typeLabel: "Hoja generica",
    description: "La hoja no coincide con una plantilla conocida, asi que se muestra en modo generico.",
    rowCount: dataRows.length,
    summaryCards: [
      { label: "Filas", value: formatNumber(dataRows.length), note: "Registros con contenido utilizable" },
      { label: "Columnas", value: formatNumber(header.length), note: "Encabezados detectados" },
      { label: "GID", value: base.gid || "Sin gid", note: "Identificador de la pestana" }
    ],
    detailTitle: "Columnas detectadas",
    detailCards: normalizedHeaders.length
      ? [{
        title: "Encabezados",
        lines: normalizedHeaders.map((value, index) => ({
          label: `Col ${index + 1}`,
          value
        }))
      }]
      : [],
    alertTitle: "Alertas",
    alerts: [],
    recordsTitle: "Filas destacadas",
    recordsEyebrow: "Preview",
    records: dataRows.slice(0, 6).map((columns, rowIndex) => ({
      title: `${base.name} | fila ${rowIndex + 2}`,
      subtitle: "Vista previa de hoja no clasificada",
      meta: columns
        .map((value, columnIndex) => ({
          label: normalizedHeaders[columnIndex] || `Col ${columnIndex + 1}`,
          value: String(value || "").trim() || "-"
        }))
        .filter((item) => item.value !== "-")
        .slice(0, 6),
      badges: []
    })),
    emptyMessage: dataRows.length ? "" : "La hoja solo contiene encabezados o filas vacias."
  };
}

function summarizeAdminExternalCurrency(rows) {
  const totals = new Map();
  rows.forEach((row) => {
    const key = row.currencyCode || "USD";
    const current = totals.get(key) || { currencyCode: key, saleTotal: 0, purchaseTotal: 0, marginTotal: 0 };
    current.saleTotal += Number(row.saleTotalValue || 0);
    current.purchaseTotal += Number(row.purchaseTotalValue || 0);
    current.marginTotal += Number(row.marginValue || 0);
    totals.set(key, current);
  });

  return Array.from(totals.values()).sort((left, right) => left.currencyCode.localeCompare(right.currencyCode));
}

function getAdminExternalSeverityRank(value) {
  return value === "urgent" ? 2 : 1;
}

function formatAdminExternalMoney(value, currencyCode) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: currencyCode || "USD",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function renderAdminExternalStatus(message, isWarning = false) {
  const node = document.querySelector("#adminExternalStatus");
  if (!node) return;

  if (!message) {
    node.innerHTML = "";
    return;
  }

  node.innerHTML = `
    <article class="record-card admin-external-status${isWarning ? " is-warning" : ""}">
      <strong>${isWarning ? "Atencion sobre el workbook" : "Workbook integrado"}</strong>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}

function renderAdminExternalSummary(cards) {
  const node = document.querySelector("#adminExternalSummary");
  if (!node) return;

  if (!Array.isArray(cards) || !cards.length) {
    node.innerHTML = "";
    return;
  }

  node.innerHTML = cards.map((card) => `
    <article class="panel stat-card">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.value)}</strong>
      <small>${escapeHtml(card.note)}</small>
    </article>
  `).join("");
}

function renderAdminExternalFinance(cards) {
  const node = document.querySelector("#adminExternalFinance");
  if (!node) return;

  if (!Array.isArray(cards) || !cards.length) {
    node.innerHTML = `
      <article class="record-card admin-external-finance-card">
        <strong>Sin totales disponibles</strong>
        <p>Cuando la hoja tenga movimientos monetarios asignados a Rodrigo, apareceran aqui.</p>
      </article>
    `;
    return;
  }

  node.innerHTML = cards.map((card) => `
    <article class="record-card admin-external-finance-card">
      <strong>${escapeHtml(card.title)}</strong>
      <div class="data-grid">
        <span><strong>Venta</strong>${escapeHtml(card.sale)}</span>
        <span><strong>Compra</strong>${escapeHtml(card.purchase)}</span>
        <span><strong>Margen</strong>${escapeHtml(card.margin)}</span>
      </div>
    </article>
  `).join("");
}

function renderAdminExternalAlerts(alerts) {
  const node = document.querySelector("#adminExternalAlerts");
  if (!node) return;

  if (!Array.isArray(alerts) || !alerts.length) {
    node.innerHTML = `
      <article class="record-card admin-external-alert">
        <strong>Sin alertas prioritarias</strong>
        <p>La hoja no muestra pendientes criticos para Rodrigo en este momento.</p>
      </article>
    `;
    return;
  }

  node.innerHTML = alerts.map((item) => `
    <article class="record-card admin-external-alert is-${escapeHtml(item.severity)}">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.body)}</p>
      <div class="data-grid">
        <span><strong>Cliente</strong>${escapeHtml(item.row.client || "Sin cliente")}</span>
        <span><strong>Operativa cliente</strong>${escapeHtml(item.row.referenceLabel || item.row.reference || "Sin nombre de operativa")}</span>
        <span><strong>Modo transporte</strong>${escapeHtml(item.row.transportModeLabel || item.row.mode || "Sin modo transporte")}</span>
        <span><strong>Fecha</strong>${escapeHtml(item.row.billingDateLabel)}</span>
        <span><strong>Responsable</strong>${escapeHtml(item.row.responsible || "Sin responsable")}</span>
      </div>
    </article>
  `).join("");
}

function renderAdminExternalOperations(rows) {
  const node = document.querySelector("#adminExternalOperations");
  if (!node) return;

  if (!Array.isArray(rows) || !rows.length) {
    node.innerHTML = `
      <article class="record-card admin-external-operation">
        <strong>Sin operaciones visibles</strong>
        <p>No se encontraron lineas operativas asignadas a Rodrigo en la hoja integrada.</p>
      </article>
    `;
    return;
  }

  node.innerHTML = rows.map((row) => `
    <article class="record-card admin-external-operation">
      <strong>${escapeHtml(row.client || "Sin cliente")} | ${escapeHtml(row.referenceLabel || row.reference || "Sin nombre de operativa")}</strong>
      <p>${escapeHtml(row.transportModeLabel || row.mode || "Sin modo transporte")} | ${escapeHtml(row.transportTypeLabel || row.transportType || "Sin tipo transporte")} | ${escapeHtml(row.origin || "Sin origen")} -> ${escapeHtml(row.destination || "Sin destino")}</p>
      <div class="data-grid">
        <span><strong>Fecha</strong>${escapeHtml(row.billingDateLabel)}</span>
        <span><strong>Operacion</strong>${escapeHtml(row.operation || "Sin operacion")}</span>
        <span><strong>Flete proveedor</strong>${escapeHtml(formatAdminExternalMoney(row.freightValue ?? parseAdminExternalNumber(row.freight), row.currencyCode))}</span>
        <span><strong>IVA proveedor + tramo nacional</strong>${escapeHtml(formatAdminExternalMoney(row.saleIvaValue ?? parseAdminExternalNumber(row.saleIva), row.currencyCode))}</span>
        <span><strong>Gastos varios</strong>${escapeHtml(formatAdminExternalMoney(row.variousValue ?? parseAdminExternalNumber(row.various), row.currencyCode))}</span>
        <span><strong>Responsable</strong>${escapeHtml(row.responsible || "Sin responsable")}</span>
        <span><strong>Venta</strong>${escapeHtml(formatAdminExternalMoney(row.saleTotalValue, row.currencyCode))}</span>
        <span><strong>Compra</strong>${escapeHtml(formatAdminExternalMoney(row.purchaseTotalValue, row.currencyCode))}</span>
        <span><strong>Margen</strong>${escapeHtml(formatAdminExternalMoney(row.marginValue, row.currencyCode))}</span>
        <span><strong>Proveedor</strong>${escapeHtml(row.provider || "Sin proveedor")}</span>
      </div>
      <div class="badge-row">
        ${row.clientInvoice ? `<span class="badge">FAC ${escapeHtml(row.clientInvoice)}</span>` : `<span class="badge warning">FAC pendiente</span>`}
        ${row.clientReceipt ? `<span class="badge">Recibo ${escapeHtml(row.clientReceipt)}</span>` : `<span class="badge warning">Cobro pendiente</span>`}
        ${row.providerInvoice ? `<span class="badge">Fact prov ${escapeHtml(row.providerInvoice)}</span>` : `<span class="badge warning">Fact prov pendiente</span>`}
        ${row.providerReceipt ? `<span class="badge">Rec prov ${escapeHtml(row.providerReceipt)}</span>` : `<span class="badge warning">Rec prov pendiente</span>`}
      </div>
    </article>
  `).join("");
}

function renderAdminExternalWorkbook(sheets) {
  const node = document.querySelector("#adminExternalWorkbook");
  if (!node) return;

  if (!Array.isArray(sheets) || !sheets.length) {
    node.innerHTML = `
      <article class="record-card admin-external-sheet-empty">
        <strong>Sin hojas integradas</strong>
        <p>Cuando Google Sheets devuelva pestanas visibles, apareceran aqui con sus alertas y resumen.</p>
      </article>
    `;
    return;
  }

  node.innerHTML = sheets.map((sheet) => renderAdminExternalSheet(sheet)).join("");
}

function renderAdminExternalSheet(sheet) {
  const summaryHtml = Array.isArray(sheet.summaryCards) && sheet.summaryCards.length
    ? `
      <div class="stats-row admin-external-sheet-summary">
        ${sheet.summaryCards.map((card) => `
          <article class="panel stat-card">
            <span>${escapeHtml(card.label)}</span>
            <strong>${escapeHtml(card.value)}</strong>
            <small>${escapeHtml(card.note)}</small>
          </article>
        `).join("")}
      </div>
    `
    : "";

  const detailHtml = `
    <div class="content-grid admin-external-sheet-grid">
      <article class="record-card admin-external-sheet-column">
        <strong>${escapeHtml(sheet.detailTitle || "Resumen")}</strong>
        <div class="stack-list">
          ${renderAdminExternalDetailCards(
            sheet.detailCards,
            "Sin resumen adicional",
            "Esta hoja no necesita un bloque extra de totales o agrupadores."
          )}
        </div>
      </article>
      <article class="record-card admin-external-sheet-column">
        <strong>${escapeHtml(sheet.alertTitle || "Alertas")}</strong>
        <div class="stack-list">
          ${renderAdminExternalAlertCards(
            sheet.alerts,
            "Sin alertas prioritarias",
            "No se detectaron pendientes criticos en esta hoja."
          )}
        </div>
      </article>
    </div>
  `;

  const recordsHtml = `
    <div class="panel-heading panel-divider">
      <p class="eyebrow">${escapeHtml(sheet.recordsEyebrow || "Detalle")}</p>
      <h2>${escapeHtml(sheet.recordsTitle || "Filas destacadas")}</h2>
    </div>
    <div class="stack-list">
      ${renderAdminExternalRecordCards(
        sheet.records,
        "Sin filas para mostrar",
        sheet.emptyMessage || "Esta hoja no devuelve filas detalladas para la vista ejecutiva."
      )}
    </div>
  `;

  return `
    <article class="panel admin-external-sheet${sheet.ok ? "" : " is-warning"}">
      <div class="admin-external-sheet-head">
        <div>
          <p class="eyebrow">${escapeHtml(sheet.typeLabel)}</p>
          <h3>${escapeHtml(sheet.name)}</h3>
          <p>${escapeHtml(sheet.description)}</p>
        </div>
        <div class="badge-row admin-external-badges">
          <span class="badge">${escapeHtml(`${formatNumber(sheet.rowCount)} filas`)}</span>
          ${sheet.gid ? `<span class="badge">gid ${escapeHtml(sheet.gid)}</span>` : ""}
          ${sheet.duplicateOf ? `<span class="badge warning">Replica de ${escapeHtml(sheet.duplicateOf)}</span>` : ""}
        </div>
      </div>
      ${summaryHtml}
      ${detailHtml}
      ${recordsHtml}
    </article>
  `;
}

function renderAdminExternalDetailCards(cards, emptyTitle, emptyBody) {
  if (!Array.isArray(cards) || !cards.length) {
    return `
      <article class="record-card admin-external-finance-card">
        <strong>${escapeHtml(emptyTitle)}</strong>
        <p>${escapeHtml(emptyBody)}</p>
      </article>
    `;
  }

  return cards.map((card) => `
    <article class="record-card admin-external-finance-card">
      <strong>${escapeHtml(card.title)}</strong>
      ${renderAdminExternalMeta(card.lines)}
      ${card.note ? `<p>${escapeHtml(card.note)}</p>` : ""}
    </article>
  `).join("");
}

function renderAdminExternalAlertCards(alerts, emptyTitle, emptyBody) {
  if (!Array.isArray(alerts) || !alerts.length) {
    return `
      <article class="record-card admin-external-alert">
        <strong>${escapeHtml(emptyTitle)}</strong>
        <p>${escapeHtml(emptyBody)}</p>
      </article>
    `;
  }

  return alerts.map((item) => `
    <article class="record-card admin-external-alert is-${escapeHtml(item.severity || "warning")}">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.body)}</p>
      ${renderAdminExternalMeta(item.meta)}
    </article>
  `).join("");
}

function renderAdminExternalRecordCards(records, emptyTitle, emptyBody) {
  if (!Array.isArray(records) || !records.length) {
    return `
      <article class="record-card admin-external-operation">
        <strong>${escapeHtml(emptyTitle)}</strong>
        <p>${escapeHtml(emptyBody)}</p>
      </article>
    `;
  }

  return records.map((item) => `
    <article class="record-card admin-external-operation">
      <strong>${escapeHtml(item.title)}</strong>
      ${item.subtitle ? `<p>${escapeHtml(item.subtitle)}</p>` : ""}
      ${renderAdminExternalMeta(item.meta)}
      ${Array.isArray(item.badges) && item.badges.length ? `
        <div class="badge-row">
          ${item.badges.map((badge) => `<span class="badge${badge.tone === "warning" ? " warning" : ""}">${escapeHtml(badge.label)}</span>`).join("")}
        </div>
      ` : ""}
    </article>
  `).join("");
}

function renderAdminExternalMeta(items) {
  const list = Array.isArray(items) ? items.filter((item) => item && item.label && item.value) : [];
  if (!list.length) return "";

  return `
    <div class="data-grid">
      ${list.map((item) => `<span><strong>${escapeHtml(item.label)}</strong>${escapeHtml(item.value)}</span>`).join("")}
    </div>
  `;
}

function getAdminOperationsSummary() {
  const requests = Array.isArray(state.requests) ? state.requests : [];
  const trips = Array.isArray(state.trips) ? state.trips : [];

  const clientOrders = requests.length;
  const availableTrips = trips.filter((trip) => normalizeText(trip.status) === "disponible").length;
  const acceptedTrips = requests.filter((request) => {
    const trip = getTrip(request.tripId);
    if (!trip) return false;
    const timeline = normalizeOperationTimeline(trip.operationTimeline);
    return !timeline.tripStartedAt && !timeline.completedAt;
  }).length;
  const inProgressTrips = requests.filter((request) => {
    const trip = getTrip(request.tripId);
    if (!trip) return false;
    const timeline = normalizeOperationTimeline(trip.operationTimeline);
    return Boolean(timeline.tripStartedAt) && !timeline.completedAt;
  }).length;
  const completedTrips = requests.filter((request) => {
    const trip = getTrip(request.tripId);
    if (!trip) return false;
    return Boolean(normalizeOperationTimeline(trip.operationTimeline).completedAt);
  }).length;

  const salesTotal = roundCurrency(requests.reduce((accumulator, request) => accumulator + Number(request.billing?.customerSubtotal || 0), 0));
  const invoiceTotal = roundCurrency(requests.reduce((accumulator, request) => accumulator + Number(request.billing?.total || 0), 0));
  const providerCostTotal = roundCurrency(requests.reduce((accumulator, request) => accumulator + Number(request.billing?.providerSubtotal || 0), 0));
  const platformGainTotal = roundCurrency(requests.reduce((accumulator, request) => accumulator + Number(request.billing?.platformCommission || 0), 0));
  const marginRatio = salesTotal > 0 ? (platformGainTotal / salesTotal) * 100 : 0;

  return {
    clientOrders,
    availableTrips,
    acceptedTrips,
    inProgressTrips,
    completedTrips,
    salesTotal,
    invoiceTotal,
    providerCostTotal,
    platformGainTotal,
    marginLabel: `${marginRatio.toFixed(1)}%`
  };
}

function bindAdminForms() {
  document.querySelectorAll(".admin-edit-form").forEach((form) => {
    form.addEventListener("submit", handleAdminSave);
    form.querySelectorAll("[data-notify-toggle]").forEach((toggle) => {
      toggle.addEventListener("change", () => syncAdminNotificationFields(form));
    });
    form.querySelectorAll("select[name='role']").forEach((select) => {
      select.addEventListener("change", () => syncAdminProviderBankFields(form));
    });
    syncAdminNotificationFields(form);
    syncAdminProviderBankFields(form);
  });
}

function bindUserImportForm() {
  const form = document.querySelector("#userImportForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const importRole = String(formData.get("importRole") || "");
    const file = formData.get("importFile");
    if (!(file instanceof File) || !file.name) {
      window.alert("Debes adjuntar un archivo CSV.");
      return;
    }

    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) {
      window.alert("El archivo no contiene filas validas.");
      return;
    }

    const expectedHeaders = [
      "displayName",
      "username",
      "password",
      "company",
      "legalName",
      "documentType",
      "documentNumber",
      "email",
      "phone",
      "notificationsEnabled",
      "notificationOrigin",
      "notificationDestination",
      "bankAccountHolder",
      "bankName",
      "bankAccountType",
      "bankAccountNumber",
      "bankSwift"
    ];

    const headerRow = rows[0];
    const sameHeaders = expectedHeaders.every((header, index) => headerRow[index] === header);
    if (!sameHeaders) {
      window.alert("El archivo no cumple con el formato requerido.");
      return;
    }

    const dataRows = rows.slice(1);
    let importedCount = 0;

    dataRows.forEach((row) => {
      if (!row.some((cell) => cell.trim())) return;
      const user = mapImportedUser(row, importRole);
      if (!user) return;
      if (state.users.some((existing) => existing.username === user.username)) return;
      state.users.unshift(user);
      importedCount += 1;
    });

    persistState();
    renderAdminStats();
    renderAdminDatabase();
    populateAdminSuccessCaseUserOptions(document.querySelector("#adminSuccessCaseForm"));
    bindAdminForms();
    form.reset();
    bindUploadFields(form);
    window.alert(`Importacion completada. Registros agregados: ${importedCount}.`);
  });
}

function canUseAdminMailbox(user) {
  return Boolean(user?.role === "master" && (user?.mailboxAccess === true || normalizeText(user?.username) === "rodrigo"));
}

function initAdminMailbox(user, options = {}) {
  const section = document.querySelector("#admin-mailbox");
  if (!section) return;

  if (!canUseAdminMailbox(user)) {
    section.remove();
    return;
  }

  const form = section.querySelector("#adminMailboxForm");
  if (!form) return;

  const usesProfile = Boolean(form.querySelector("input[name='profile']")?.value);
  renderAdminMailboxStatus(
    usesProfile
      ? "La bandeja de Rodrigo esta lista para consultarse. Actualiza para refrescar correos y prioridades."
      : "Ingresa la contrasena de la cuenta y actualiza la bandeja para consultar el correo asignado a Rodrigo."
  );
  renderAdminMailboxSummary(null);
  renderAdminMailboxList([]);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadAdminMailbox(form);
  });

  document.querySelector("#adminMailboxClearButton")?.addEventListener("click", () => {
    const passwordField = form.querySelector("input[name='password']");
    if (passwordField) {
      passwordField.value = "";
    }
    renderAdminMailboxStatus("Vista limpiada. Puedes volver a refrescar la bandeja cuando quieras.");
    renderAdminMailboxSummary(null);
    renderAdminMailboxList([]);
  });

  if (options.autoLoad) {
    void loadAdminMailbox(form);
  }
}

function getAdminMailboxApiUrl() {
  if (typeof getJoathiVaApiUrl === "function") {
    const apiUrl = getJoathiVaApiUrl("/api/mailbox/inbox");
    if (apiUrl) return apiUrl;
  }

  if (/^https?:/i.test(window.location.origin || "")) {
    return "/api/mailbox/inbox";
  }

  return "";
}

function readAdminMailboxForm(form) {
  const formData = new FormData(form);
  return {
    profile: String(formData.get("profile") || "").trim(),
    username: String(formData.get("username") || "").trim(),
    password: String(formData.get("password") || ""),
    host: String(formData.get("host") || "").trim(),
    port: Number(formData.get("port") || 0),
    folder: String(formData.get("folder") || "INBOX").trim() || "INBOX",
    limit: Number(formData.get("limit") || 12)
  };
}

async function loadAdminMailbox(form) {
  const payload = readAdminMailboxForm(form);
  if (!payload.profile && !payload.password) {
    renderAdminMailboxStatus("Debes ingresar la contrasena de la cuenta antes de consultar la bandeja.", true);
    return;
  }

  const url = getAdminMailboxApiUrl();
  if (!url) {
    renderAdminMailboxStatus("No hay backend local disponible para consultar IMAP. Abre el panel desde el servidor HTTP de esta PC.", true);
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  const clearButton = document.querySelector("#adminMailboxClearButton");
  const originalLabel = submitButton?.textContent || "";

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Consultando...";
  }
  if (clearButton) {
    clearButton.disabled = true;
  }

  renderAdminMailboxStatus(`Consultando ${payload.folder} en ${payload.host}...`);

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
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || `No se pudo consultar la casilla IMAP (HTTP ${response.status}).`);
    }

    renderAdminMailboxStatus(`Bandeja actualizada. Se cargaron ${formatNumber(result.fetchedCount || 0)} correos de ${result.folder || payload.folder}.`);
    renderAdminMailboxSummary(result);
    renderAdminMailboxList(Array.isArray(result.messages) ? result.messages : []);
  } catch (error) {
    renderAdminMailboxSummary(null);
    renderAdminMailboxList([]);
    renderAdminMailboxStatus(error?.message || "No fue posible consultar la casilla IMAP.", true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
    if (clearButton) {
      clearButton.disabled = false;
    }
  }
}

function renderAdminMailboxStatus(message, isError = false) {
  const node = document.querySelector("#adminMailboxStatus");
  if (!node) return;

  if (!message) {
    node.innerHTML = "";
    return;
  }

  node.innerHTML = `
    <article class="record-card admin-mailbox-status-card${isError ? " is-error" : ""}">
      <strong>${isError ? "Estado de conexion" : "Estado de bandeja"}</strong>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
}

function renderAdminMailboxSummary(snapshot) {
  const node = document.querySelector("#adminMailboxSummary");
  if (!node) return;

  if (!snapshot?.ok) {
    node.innerHTML = "";
    return;
  }

  const cards = [
    {
      label: "Total en carpeta",
      value: formatNumber(snapshot.messageCount || 0),
      note: snapshot.folder || "INBOX"
    },
    {
      label: "Sin leer",
      value: formatNumber(snapshot.unreadCount || 0),
      note: "Pendientes en la carpeta actual"
    },
    {
      label: "Correos cargados",
      value: formatNumber(snapshot.fetchedCount || 0),
      note: snapshot.host || "Servidor IMAP"
    },
    {
      label: "Ultima actualizacion",
      value: formatDateTime(snapshot.fetchedAt),
      note: snapshot.username || "Cuenta de correo"
    }
  ];

  node.innerHTML = cards.map((card) => `
    <article class="panel stat-card">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.value)}</strong>
      <small>${escapeHtml(card.note)}</small>
    </article>
  `).join("");
}

function renderAdminMailboxList(messages) {
  const node = document.querySelector("#adminMailboxList");
  if (!node) return;

  if (!Array.isArray(messages) || !messages.length) {
    node.innerHTML = `
      <article class="record-card admin-mailbox-message">
        <strong>Bandeja sin datos cargados</strong>
        <p>Cuando consultes la casilla, aqui veras remitente, asunto y accion a tomar en una vista compacta.</p>
      </article>
    `;
    return;
  }

  node.innerHTML = `
    <article class="record-card mailbox-compact-board">
      <div class="mailbox-compact-head">
        <span>Remitente</span>
        <span>Asunto</span>
        <span>Accion a tomar</span>
      </div>
      ${messages.map((message) => {
        const action = inferMailboxAction(message);
        const sentAt = message.date || message.internalDate || "";
        return `
          <div class="mailbox-compact-row${message.isUnread ? " is-unread" : ""}">
            <div class="mailbox-compact-cell">
              <strong>${escapeHtml(message.from || "Remitente no disponible")}</strong>
              <small>${escapeHtml(formatDateTime(sentAt))}</small>
            </div>
            <div class="mailbox-compact-cell">
              <strong>${escapeHtml(message.subject || "(sin asunto)")}</strong>
              <small>${escapeHtml(message.preview || "Sin vista previa disponible.")}</small>
            </div>
            <div class="mailbox-compact-cell">
              <span class="mailbox-action-pill${action.urgent ? " is-urgent" : ""}">${escapeHtml(action.label)}</span>
              <small>${escapeHtml(action.reason)}</small>
            </div>
          </div>
        `;
      }).join("")}
    </article>
  `;
}

function inferMailboxAction(message) {
  const signature = normalizeText([message?.from, message?.subject, message?.preview].filter(Boolean).join(" "));

  if (/(cotiz|quote|presupuesto|propuesta|tarifa|pricing|licitacion)/.test(signature)) {
    return {
      label: "Responder comercial",
      reason: "Consulta vinculada a cotizacion o propuesta.",
      urgent: true
    };
  }

  if (/(factura|invoice|cobro|pago|payment|transferencia|recibo)/.test(signature)) {
    return {
      label: "Derivar a administracion",
      reason: "Tema financiero o documental.",
      urgent: false
    };
  }

  if (/(tracking|seguimiento|estado|demora|urgente|arribo|entrega|embarque|booking|carga)/.test(signature)) {
    return {
      label: "Responder operativo",
      reason: "Necesita estado de operacion o confirmacion.",
      urgent: true
    };
  }

  if (/(linkedin|meta|facebook|instagram|lead|reunion|meeting)/.test(signature)) {
    return {
      label: "Hacer seguimiento",
      reason: "Puede convertirse en conversacion comercial.",
      urgent: Boolean(message?.isUnread)
    };
  }

  if (message?.isUnread) {
    return {
      label: "Leer y clasificar",
      reason: "Correo nuevo sin priorizacion clara todavia.",
      urgent: false
    };
  }

  return {
    label: "Seguir o archivar",
    reason: "No muestra una accion urgente inmediata.",
    urgent: false
  };
}

function handleAdminSave(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const category = form.dataset.category;
  const recordId = form.dataset.id;
  const formData = new FormData(form);

  if (category === "users") {
    const user = state.users.find((item) => item.id === recordId);
    if (!user) return;
    const notificationsEnabled = formData.get("notificationsEnabled") === "on";
    const role = String(formData.get("role")).trim();
    const jobTitle = String(formData.get("jobTitle") || "").trim();
    const mainScreen = String(formData.get("mainScreen") || "").trim();
    const bankingDetails = extractBankingDetails(formData);
    const permissions = normalizeUserPermissions(role === user.role ? user : { role });
    Object.assign(user, {
      displayName: String(formData.get("displayName")).trim(),
      username: String(formData.get("username")).trim(),
      password: String(formData.get("password")).trim(),
      role,
      company: String(formData.get("company")).trim(),
      legalName: String(formData.get("legalName")).trim(),
      documentType: String(formData.get("documentType")).trim(),
      documentNumber: String(formData.get("documentNumber")).trim(),
      email: String(formData.get("email")).trim(),
      phone: String(formData.get("phone")).trim(),
      jobTitle: jobTitle || getDefaultJobTitle(role),
      mainScreen: mainScreen || getDefaultMainScreen(role),
      termsAccepted: formData.get("termsAccepted") === "on",
      notificationsEnabled,
      notificationOrigin: notificationsEnabled ? String(formData.get("notificationOrigin")).trim() : "",
      notificationDestination: notificationsEnabled ? String(formData.get("notificationDestination")).trim() : "",
      ...getDefaultBankingData(),
      ...(role === "provider" ? bankingDetails : {}),
      permissions
    });
  }

  if (category === "drivers") {
    const driver = state.drivers.find((item) => item.id === recordId);
    if (!driver) return;
    Object.assign(driver, {
      name: String(formData.get("name")).trim(),
      company: String(formData.get("company")).trim(),
      phone: String(formData.get("phone")).trim(),
      email: String(formData.get("email")).trim(),
      originCity: String(formData.get("originCity")).trim(),
      originCountry: String(formData.get("originCountry")).trim(),
      licenseNumber: String(formData.get("licenseNumber")).trim(),
      experience: String(formData.get("experience")).trim(),
      licenseImageName: String(formData.get("licenseImageName")).trim()
    });
  }

  if (category === "vehicles") {
    const vehicle = state.vehicles.find((item) => item.id === recordId);
    if (!vehicle) return;
    Object.assign(vehicle, {
      driverId: String(formData.get("driverId")).trim(),
      plate: String(formData.get("plate")).trim(),
      brand: String(formData.get("brand")).trim(),
      model: String(formData.get("model")).trim(),
      type: String(formData.get("type")).trim(),
      year: Number(formData.get("year")),
      capacityM3: Number(formData.get("capacityM3")),
      maxWeightKg: Number(formData.get("maxWeightKg")),
      ownershipDocName: String(formData.get("ownershipDocName")).trim(),
      insuranceDocName: String(formData.get("insuranceDocName")).trim(),
      notes: String(formData.get("notes")).trim()
    });
  }

  if (category === "trips") {
    const trip = state.trips.find((item) => item.id === recordId);
    if (!trip) return;
    Object.assign(trip, {
      driverId: String(formData.get("driverId")).trim(),
      vehicleId: String(formData.get("vehicleId")).trim(),
      currentLocation: String(formData.get("currentLocation")).trim(),
      originCountry: String(formData.get("originCountry")).trim(),
      returnDestination: String(formData.get("returnDestination")).trim(),
      destinationCountry: String(formData.get("destinationCountry")).trim(),
      availableDate: String(formData.get("availableDate")).trim(),
      status: String(formData.get("status")).trim(),
      availableM3: Number(formData.get("availableM3")),
      availableWeightKg: Number(formData.get("availableWeightKg")),
      priceUsd: Number(formData.get("priceUsd")),
      cargoType: String(formData.get("cargoType")).trim(),
      notes: String(formData.get("notes")).trim()
    });
    trip.operationTimeline = normalizeOperationTimeline(trip.operationTimeline);
    syncRequestsForTrip(trip.id);
  }

  if (category === "requests") {
    const request = state.requests.find((item) => item.id === recordId);
    if (!request) return;
    request.userId = String(formData.get("userId")).trim();
    request.tripId = String(formData.get("tripId")).trim();
    request.cargoDescription = String(formData.get("cargoDescription")).trim();
    request.weightKg = Number(formData.get("weightKg"));
    request.volumeM3 = Number(formData.get("volumeM3"));
    request.reservationMode = request.reservationMode || "partial";
    request.reservedWeightKg = request.weightKg;
    request.reservedVolumeM3 = request.volumeM3;
    request.loadingHours = Number(formData.get("loadingHours"));
    request.unloadingHours = Number(formData.get("unloadingHours"));
    request.frontierStay = formData.get("frontierStay") === "on";
    request.notes = String(formData.get("notes")).trim();
    const trip = getTrip(request.tripId);
    if (trip) {
      request.billing = computeBilling({
        trip,
        loadingHours: request.loadingHours,
        unloadingHours: request.unloadingHours,
        frontierStay: request.frontierStay
      });
      request.invoiceRecord = buildInvoiceRecord(trip, request.billing, request, state);
    }
  }

  persistState();
  renderAdminStats();
  renderAdminDatabase();
  bindAdminForms();
}

function bindUploadFields(scope) {
  scope.querySelectorAll(".upload-field input[type='file']").forEach((input) => {
    input.onchange = () => {
      const container = input.closest(".upload-field");
      const label = container?.querySelector("[data-file-name]");
      if (!label) return;
      const fileName = input.files?.[0]?.name || "Sin archivo seleccionado";
      label.textContent = fileName;
    };
  });
}

function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((line) => line.trim());
  if (!lines.length) return [];
  const separator = detectCsvSeparator(lines[0]);
  return lines.map((line) => parseCsvLine(line, separator));
}

function detectCsvSeparator(line) {
  const semicolons = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsvLine(line, separator) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === separator && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function mapImportedUser(row, importRole) {
  const [
    displayName,
    username,
    password,
    company,
    legalName,
    documentType,
    documentNumber,
    email,
    phone,
    notificationsEnabled,
    notificationOrigin,
    notificationDestination,
    bankAccountHolder,
    bankName,
    bankAccountType,
    bankAccountNumber,
    bankSwift
  ] = row;

  if (!displayName || !username || !password) return null;

  const wantsNotifications = normalizeText(notificationsEnabled) === "true" || notificationsEnabled === "1" || normalizeText(notificationsEnabled) === "si";

  return {
    id: buildId("usr"),
    username: username.trim(),
    password: password.trim(),
    displayName: displayName.trim(),
    role: importRole,
    company: (company || "").trim(),
    legalName: (legalName || "").trim(),
    documentType: (documentType || "").trim(),
    documentNumber: (documentNumber || "").trim(),
    email: (email || "").trim(),
    phone: (phone || "").trim(),
    jobTitle: getDefaultJobTitle(importRole),
    mainScreen: getDefaultMainScreen(importRole),
    termsAccepted: true,
    notificationsEnabled: wantsNotifications,
    notificationOrigin: wantsNotifications ? (notificationOrigin || "").trim() : "",
    notificationDestination: wantsNotifications ? (notificationDestination || "").trim() : "",
    permissions: getDefaultRoleAccess(importRole),
    ...getDefaultBankingData(),
    ...(importRole === "provider" ? {
      bankAccountHolder: (bankAccountHolder || "").trim(),
      bankName: (bankName || "").trim(),
      bankAccountType: (bankAccountType || "").trim(),
      bankAccountNumber: (bankAccountNumber || "").trim(),
      bankSwift: (bankSwift || "").trim()
    } : {})
  };
}

function renderAdminUserCard(user) {
  return `
    <article class="record-card admin-card">
      <strong>${escapeHtml(user.displayName)}</strong>
      <p>${escapeHtml(user.company)} | ${escapeHtml(user.jobTitle || getRoleLabel(user.role))}</p>
      <form class="form-grid admin-edit-form" data-category="users" data-id="${user.id}">
        <label>
          Nombre
          <input name="displayName" type="text" value="${escapeHtml(user.displayName)}" required>
        </label>
        <label>
          Cargo
          <input name="jobTitle" type="text" value="${escapeHtml(user.jobTitle || "")}" placeholder="Directora, Administrativo...">
        </label>
        <label>
          Pantalla principal
          <input name="mainScreen" type="text" value="${escapeHtml(user.mainScreen || "")}" placeholder="Indicadores, seguimiento...">
        </label>
        <label>
          Rol
          <select name="role" required>
            ${renderSelectOptions(["master", "ops_finance", "billing_admin", "provider", "broker", "client"], user.role, true)}
          </select>
        </label>
        <label>
          Usuario
          <input name="username" type="text" value="${escapeHtml(user.username)}" required>
        </label>
        <label>
          Contraseña
          <input name="password" type="text" value="${escapeHtml(getLegacyPortalUserPassword(user))}" required>
        </label>
        <label>
          Empresa
          <input name="company" type="text" value="${escapeHtml(user.company)}" required>
        </label>
        <label>
          Razon social
          <input name="legalName" type="text" value="${escapeHtml(user.legalName || "")}" required>
        </label>
        <label>
          Tipo documento
          <select name="documentType" required>
            ${renderSelectOptions(["ci", "rut"], user.documentType)}
          </select>
        </label>
        <label>
          Documento
          <input name="documentNumber" type="text" value="${escapeHtml(user.documentNumber || "")}" required>
        </label>
        <label>
          Email
          <input name="email" type="email" value="${escapeHtml(user.email)}" required>
        </label>
        <label>
          Telefono
          <input name="phone" type="text" value="${escapeHtml(user.phone)}" required>
        </label>
        <div class="form-grid full-width admin-provider-bank-fields">
          <label>
            Titular cuenta
            <input name="bankAccountHolder" type="text" value="${escapeHtml(user.bankAccountHolder || "")}">
          </label>
          <label>
            Banco
            <input name="bankName" type="text" value="${escapeHtml(user.bankName || "")}">
          </label>
          <label>
            Tipo de cuenta
            <input name="bankAccountType" type="text" value="${escapeHtml(user.bankAccountType || "")}">
          </label>
          <label>
            Numero de cuenta
            <input name="bankAccountNumber" type="text" value="${escapeHtml(user.bankAccountNumber || "")}">
          </label>
          <label class="full-width">
            SWIFT / ABA / referencia bancaria
            <input name="bankSwift" type="text" value="${escapeHtml(user.bankSwift || "")}">
          </label>
        </div>
        <label class="full-width checkbox-field">
          <span>Acepto terminos y condiciones</span>
          <input name="termsAccepted" type="checkbox" ${user.termsAccepted ? "checked" : ""}>
        </label>
        <label class="full-width checkbox-field">
          <span>Notificaciones activas</span>
          <input name="notificationsEnabled" data-notify-toggle type="checkbox" ${user.notificationsEnabled ? "checked" : ""}>
        </label>
        <div class="form-grid full-width admin-notification-fields">
          <label>
            Origen
            <input name="notificationOrigin" type="text" value="${escapeHtml(user.notificationOrigin || "")}">
          </label>
          <label>
            Destino
            <input name="notificationDestination" type="text" value="${escapeHtml(user.notificationDestination || "")}">
          </label>
        </div>
        <button type="submit" class="button button-primary">Guardar usuario</button>
      </form>
    </article>
  `;
}

function renderAdminDriverCard(driver) {
  return `
    <article class="record-card admin-card">
      <strong>${escapeHtml(driver.name)}</strong>
      <p>${escapeHtml(driver.company)} | ${escapeHtml(driver.originCity)}, ${escapeHtml(driver.originCountry)}</p>
      <form class="form-grid admin-edit-form" data-category="drivers" data-id="${driver.id}">
        <label><span>Nombre</span><input name="name" type="text" value="${escapeHtml(driver.name)}" required></label>
        <label><span>Empresa</span><input name="company" type="text" value="${escapeHtml(driver.company)}" required></label>
        <label><span>Telefono</span><input name="phone" type="text" value="${escapeHtml(driver.phone)}" required></label>
        <label><span>Email</span><input name="email" type="email" value="${escapeHtml(driver.email)}" required></label>
        <label><span>Ciudad</span><input name="originCity" type="text" value="${escapeHtml(driver.originCity)}" required></label>
        <label><span>Pais</span><input name="originCountry" type="text" value="${escapeHtml(driver.originCountry)}" required></label>
        <label><span>Libreta</span><input name="licenseNumber" type="text" value="${escapeHtml(driver.licenseNumber)}" required></label>
        <label><span>Experiencia</span><input name="experience" type="text" value="${escapeHtml(driver.experience)}" required></label>
        <label class="full-width"><span>Documento cargado</span><input name="licenseImageName" type="text" value="${escapeHtml(driver.licenseImageName || "")}"></label>
        <button type="submit" class="button button-primary">Guardar chofer</button>
      </form>
    </article>
  `;
}

function renderAdminVehicleCard(vehicle) {
  return `
    <article class="record-card admin-card">
      <strong>${escapeHtml(vehicle.plate)} | ${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}</strong>
      <p>${escapeHtml(vehicle.type)}</p>
      <form class="form-grid admin-edit-form" data-category="vehicles" data-id="${vehicle.id}">
        <label><span>Chofer</span><select name="driverId">${renderEntityOptions(state.drivers, vehicle.driverId, "name")}</select></label>
        <label><span>Matricula</span><input name="plate" type="text" value="${escapeHtml(vehicle.plate)}" required></label>
        <label><span>Marca</span><input name="brand" type="text" value="${escapeHtml(vehicle.brand)}" required></label>
        <label><span>Modelo</span><input name="model" type="text" value="${escapeHtml(vehicle.model)}" required></label>
        <label><span>Tipo</span><input name="type" type="text" value="${escapeHtml(vehicle.type)}" required></label>
        <label><span>Ano</span><input name="year" type="number" value="${vehicle.year}" required></label>
        <label><span>Capacidad</span><input name="capacityM3" type="number" step="0.1" value="${vehicle.capacityM3}" required></label>
        <label><span>Peso maximo</span><input name="maxWeightKg" type="number" step="100" value="${vehicle.maxWeightKg}" required></label>
        <label><span>Propiedad</span><input name="ownershipDocName" type="text" value="${escapeHtml(vehicle.ownershipDocName || "")}"></label>
        <label><span>Seguro</span><input name="insuranceDocName" type="text" value="${escapeHtml(vehicle.insuranceDocName || "")}"></label>
        <label class="full-width"><span>Notas</span><textarea name="notes" rows="3">${escapeHtml(vehicle.notes || "")}</textarea></label>
        <button type="submit" class="button button-primary">Guardar transporte</button>
      </form>
    </article>
  `;
}

function renderAdminTripCard(trip) {
  const pricing = computeCommercialBreakdown(trip.priceUsd);
  const timeline = normalizeOperationTimeline(trip.operationTimeline);
  return `
    <article class="record-card admin-card">
      <strong>${escapeHtml(trip.currentLocation)}, ${escapeHtml(trip.originCountry)} -> ${escapeHtml(trip.returnDestination)}, ${escapeHtml(trip.destinationCountry)}</strong>
      <p>${escapeHtml(trip.status)} | Costo proveedor ${formatCurrency(pricing.providerSubtotal)} | Cliente ${formatCurrency(pricing.customerSubtotal)}</p>
      <div class="data-grid">
        <span><strong>Carga</strong>${formatDateTimeOrPending(timeline.loadingStartedAt)}</span>
        <span><strong>Comienzo viaje</strong>${formatDateTimeOrPending(timeline.tripStartedAt)}</span>
        <span><strong>Llegada</strong>${formatDateTimeOrPending(timeline.arrivalAt)}</span>
        <span><strong>Descarga</strong>${formatDateTimeOrPending(timeline.unloadingCompletedAt)}</span>
      </div>
      <form class="form-grid admin-edit-form" data-category="trips" data-id="${trip.id}">
        <label><span>Chofer</span><select name="driverId">${renderEntityOptions(state.drivers, trip.driverId, "name")}</select></label>
        <label><span>Transporte</span><select name="vehicleId">${renderEntityOptions(state.vehicles, trip.vehicleId, "plate")}</select></label>
        <label><span>Ubicacion actual</span><input name="currentLocation" type="text" value="${escapeHtml(trip.currentLocation)}" required></label>
        <label><span>Pais origen</span><input name="originCountry" type="text" value="${escapeHtml(trip.originCountry)}" required></label>
        <label><span>Destino</span><input name="returnDestination" type="text" value="${escapeHtml(trip.returnDestination)}" required></label>
        <label><span>Pais destino</span><input name="destinationCountry" type="text" value="${escapeHtml(trip.destinationCountry)}" required></label>
        <label><span>Fecha</span><input name="availableDate" type="date" value="${escapeHtml(trip.availableDate)}" required></label>
        <label><span>Estado</span><input name="status" type="text" value="${escapeHtml(trip.status)}" required></label>
        <label><span>Espacio</span><input name="availableM3" type="number" step="0.1" value="${trip.availableM3}" required></label>
        <label><span>Peso</span><input name="availableWeightKg" type="number" step="100" value="${trip.availableWeightKg}" required></label>
        <label><span>Costo proveedor</span><input name="priceUsd" type="number" step="1" value="${trip.priceUsd}" required></label>
        <label><span>Tipo carga</span><input name="cargoType" type="text" value="${escapeHtml(trip.cargoType)}" required></label>
        <label class="full-width"><span>Notas</span><textarea name="notes" rows="3">${escapeHtml(trip.notes || "")}</textarea></label>
        <button type="submit" class="button button-primary">Guardar viaje</button>
      </form>
    </article>
  `;
}

function renderAdminRequestCard(request) {
  const invoice = request.invoiceRecord || {};
  return `
    <article class="record-card admin-card">
      <strong>${escapeHtml(request.cargoDescription || "Pedido")}</strong>
      <p>${request.billing ? formatCurrency(request.billing.total) : "Sin total calculado"}</p>
      <div class="data-grid">
        <span><strong>Cobro cliente</strong>${escapeHtml(invoice.paymentStatusLabel || getPaymentStatusLabel(request.paymentStatus))}</span>
        <span><strong>Pago proveedor</strong>${escapeHtml(invoice.settlementStatusLabel || getSettlementStatusLabel(request.settlementStatus))}</span>
        <span><strong>Carga</strong>${formatDateTimeOrPending(invoice.operationTimeline?.loadingStartedAt)}</span>
        <span><strong>Inicio viaje</strong>${formatDateTimeOrPending(invoice.operationTimeline?.tripStartedAt)}</span>
        <span><strong>Llegada</strong>${formatDateTimeOrPending(invoice.operationTimeline?.arrivalAt)}</span>
        <span><strong>Descarga</strong>${formatDateTimeOrPending(invoice.operationTimeline?.unloadingCompletedAt)}</span>
      </div>
      ${renderInvoiceCheckpointSummary(invoice)}
      <form class="form-grid admin-edit-form" data-category="requests" data-id="${request.id}">
        <label><span>Usuario</span><select name="userId">${renderEntityOptions(state.users, request.userId, "displayName")}</select></label>
        <label><span>Viaje</span><select name="tripId">${renderEntityOptions(state.trips, request.tripId, "currentLocation")}</select></label>
        <label><span>Mercaderia</span><input name="cargoDescription" type="text" value="${escapeHtml(request.cargoDescription || "")}" required></label>
        <label><span>Peso</span><input name="weightKg" type="number" step="100" value="${request.weightKg || 0}" required></label>
        <label><span>Volumen</span><input name="volumeM3" type="number" step="0.1" value="${request.volumeM3 || 0}" required></label>
        <label><span>Horas carga</span><input name="loadingHours" type="number" step="0.5" value="${request.loadingHours || 0}" required></label>
        <label><span>Horas descarga</span><input name="unloadingHours" type="number" step="0.5" value="${request.unloadingHours || 0}" required></label>
        <label class="checkbox-field"><span>Frontera</span><input name="frontierStay" type="checkbox" ${request.frontierStay ? "checked" : ""}></label>
        <label class="full-width"><span>Notas</span><textarea name="notes" rows="3">${escapeHtml(request.notes || "")}</textarea></label>
        <button type="submit" class="button button-primary">Guardar pedido</button>
      </form>
    </article>
  `;
}

function renderDrivers(container) {
  renderCollection(container, state.drivers, (driver) => `
    <article class="record-card">
      <strong>${escapeHtml(driver.name)}</strong>
      <p>${escapeHtml(driver.company)} | ${escapeHtml(driver.originCity)}, ${escapeHtml(driver.originCountry)}</p>
      <div class="data-grid">
        <span><strong>Contacto</strong>${escapeHtml(driver.phone)}</span>
        <span><strong>Email</strong>${escapeHtml(driver.email)}</span>
        <span><strong>Libreta</strong>${escapeHtml(driver.licenseNumber)}</span>
        <span><strong>Experiencia</strong>${escapeHtml(driver.experience)}</span>
      </div>
      <div class="badge-row">
        <span class="badge">Documento: ${escapeHtml(driver.licenseImageName || "Sin archivo")}</span>
      </div>
    </article>
  `);
}

function renderVehicles(container) {
  renderCollection(container, state.vehicles, (vehicle) => {
    const driver = getDriver(vehicle.driverId);
    return `
      <article class="record-card">
        <strong>${escapeHtml(vehicle.plate)} | ${escapeHtml(vehicle.brand)} ${escapeHtml(vehicle.model)}</strong>
        <p>${escapeHtml(vehicle.type)} | Chofer: ${escapeHtml(driver?.name || "Sin asignar")}</p>
        <div class="data-grid">
          <span><strong>Ano</strong>${vehicle.year}</span>
          <span><strong>Capacidad</strong>${formatNumber(vehicle.capacityM3)} m3</span>
          <span><strong>Peso maximo</strong>${formatNumber(vehicle.maxWeightKg)} kg</span>
          <span><strong>Base</strong>${escapeHtml(driver?.originCity || "Sin base")}</span>
        </div>
        <div class="badge-row">
          <span class="badge">Propiedad: ${escapeHtml(vehicle.ownershipDocName)}</span>
          <span class="badge warning">Seguro: ${escapeHtml(vehicle.insuranceDocName)}</span>
        </div>
      </article>
    `;
  });
}

function renderProviderTrips(container) {
  renderCollection(container, state.trips, (trip) => {
    const driver = getDriver(trip.driverId);
    const vehicle = getVehicle(trip.vehicleId);
    const pricing = computeCommercialBreakdown(trip.priceUsd);
    const relatedRequests = state.requests.filter((request) => request.tripId === trip.id);
    return `
      <article class="record-card" data-trip-id="${trip.id}">
        <strong>${escapeHtml(trip.currentLocation)}, ${escapeHtml(trip.originCountry)} -> ${escapeHtml(trip.returnDestination)}, ${escapeHtml(trip.destinationCountry)}</strong>
        <p>${escapeHtml(driver?.name || "Chofer pendiente")} | ${escapeHtml(vehicle?.plate || "Unidad pendiente")}</p>
        <div class="data-grid">
          <span><strong>Fecha</strong>${formatDate(trip.availableDate)}</span>
          <span><strong>Estado</strong>${escapeHtml(trip.status)}</span>
          <span><strong>Espacio</strong>${formatNumber(trip.availableM3)} m3</span>
          <span><strong>Peso</strong>${formatNumber(trip.availableWeightKg)} kg</span>
          <span><strong>Costo proveedor</strong>${formatCurrency(pricing.providerSubtotal)}</span>
          <span><strong>Precio cliente</strong>${formatCurrency(pricing.customerSubtotal)}</span>
          <span><strong>Comision JoathiVA</strong>${formatCurrency(pricing.platformCommission)}</span>
          <span><strong>Servicio</strong>MIC + CRT + 2h/2h</span>
        </div>
        <div class="badge-row">
          <span class="badge">${getTrackingStatusLabel(trip)}</span>
          <span class="badge warning">Pedidos clientes ${relatedRequests.length}</span>
        </div>
      </article>
    `;
  });
}

function renderClientRequests(user) {
  const container = document.querySelector("#requestsList");
  const requests = state.requests.filter((request) => request.userId === user.id);
  if (!container) return;

  if (!requests.length) {
    const emptyState = document.querySelector("#emptyStateTemplate");
    container.replaceChildren(emptyState.content.firstElementChild.cloneNode(true));
    return;
  }

  const finalizedRequests = requests.filter((request) => Boolean(request.invoiceRecord?.operationTimeline?.completedAt));
  const requestedRequests = requests.filter((request) => !finalizedRequests.some((item) => item.id === request.id));

  container.innerHTML = `
    ${renderClientHistorySection("Traslados solicitados", "Solicitudes en curso, con cobro y seguimiento todavia abiertos.", requestedRequests)}
    ${renderClientHistorySection("Traslados finalizados", "Operaciones cerradas con entrega completa, lista de facturacion y referencias historicas.", finalizedRequests)}
  `;
}

function renderClientSuccessCases(user) {
  const summaryNode = document.querySelector("#clientSuccessCasesSummary");
  const listNode = document.querySelector("#clientSuccessCasesList");
  if (!summaryNode || !listNode) return;

  const successCases = (Array.isArray(state.successCases) ? state.successCases : [])
    .filter((item) => item.userId === user?.id)
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));

  const publishableCases = successCases.filter((item) => item.allowPublishName || item.allowPublishCompany).length;
  const logoReadyCases = successCases.filter((item) => item.allowPublishLogo).length;

  summaryNode.innerHTML = `
    <article class="panel stat-card">
      <span>Enviados</span>
      <strong>${escapeHtml(formatNumber(successCases.length))}</strong>
      <small>Plantillas compartidas con Joathi</small>
    </article>
    <article class="panel stat-card">
      <span>Publicables</span>
      <strong>${escapeHtml(formatNumber(publishableCases))}</strong>
      <small>Con permiso de nombre o empresa</small>
    </article>
    <article class="panel stat-card">
      <span>Logo</span>
      <strong>${escapeHtml(formatNumber(logoReadyCases))}</strong>
      <small>Casos con autorizacion de marca</small>
    </article>
  `;

  if (!successCases.length) {
    listNode.innerHTML = `
      <article class="record-card success-case-card">
        <strong>Sin casos enviados</strong>
        <p>Cuando completes la plantilla, tu caso quedara guardado aqui para seguimiento y revision comercial.</p>
      </article>
    `;
    return;
  }

  listNode.innerHTML = successCases.map(renderClientSuccessCaseCard).join("");
}

function renderClientHistorySection(title, description, requests) {
  return `
    <section class="joathiva-history-group">
      <div class="panel-divider">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="stack-list">
        ${requests.length ? requests.map(renderClientRequestHistoryCard).join("") : `
          <article class="record-card">
            <strong>Sin registros</strong>
            <p>No hay traslados en esta categoria por el momento.</p>
          </article>
        `}
      </div>
    </section>
  `;
}

function renderClientRequestHistoryCard(request) {
  const trip = getTrip(request.tripId);
  const invoice = request.invoiceRecord || {};
  const reservationLabel = request.reservationMode === "full" ? "Camion completo" : "Espacio parcial";
  return `
    <article class="record-card" data-request-id="${request.id}">
      <strong>${escapeHtml(request.cargoDescription)}</strong>
      <p>${escapeHtml(trip?.currentLocation || "")} -> ${escapeHtml(trip?.returnDestination || "")}</p>
      <div class="data-grid">
        <span><strong>Fecha</strong>${formatDate(request.createdAt.slice(0, 10))}</span>
        <span><strong>Reserva</strong>${escapeHtml(reservationLabel)}</span>
        <span><strong>Volumen</strong>${escapeHtml(formatNumber(request.reservedVolumeM3 || request.volumeM3 || 0))} m3</span>
        <span><strong>Peso</strong>${escapeHtml(formatNumber(request.reservedWeightKg || request.weightKg || 0))} kg</span>
        <span><strong>Total</strong>${formatCurrency(request.billing.total)}</span>
        <span><strong>IVA</strong>${formatCurrency(request.billing.iva)}</span>
        <span><strong>Proveedor</strong>${formatCurrency(request.billing.providerSubtotal)}</span>
        <span><strong>JoathiVA</strong>${formatCurrency(request.billing.platformCommission)}</span>
        <span><strong>Cobro</strong>${escapeHtml(invoice.paymentStatusLabel || getPaymentStatusLabel(request.paymentStatus))}</span>
        <span><strong>Liquidacion</strong>${escapeHtml(invoice.settlementStatusLabel || getSettlementStatusLabel(request.settlementStatus))}</span>
        <span><strong>Regla</strong>${escapeHtml(request.billing.ruleLabel)}</span>
      </div>
      <div class="badge-row">
        <span class="badge">${trip ? getTrackingStatusLabel(trip) : "Sin viaje"}</span>
      </div>
      ${renderClientInvoiceSnapshot(invoice)}
    </article>
  `;
}

function renderClientSuccessCaseCard(item) {
  return `
    <article class="record-card success-case-card">
      <strong>${escapeHtml(item.company || "Sin empresa")} | ${escapeHtml(item.serviceUsed || "Sin servicio")}</strong>
      <p>${escapeHtml(item.operationScope || "Sin operativa")} | Estado ${escapeHtml(getSuccessCaseStatusLabel(item.status))}</p>
      <div class="data-grid">
        <span><strong>Contacto</strong>${escapeHtml(item.contactName || "Sin contacto")}</span>
        <span><strong>Cargo</strong>${escapeHtml(item.contactRole || "Sin cargo")}</span>
        <span><strong>Industria</strong>${escapeHtml(item.industry || "Sin industria")}</span>
        <span><strong>Enviado</strong>${escapeHtml(item.createdAt ? formatDate(String(item.createdAt).slice(0, 10)) : "Sin fecha")}</span>
      </div>
      <div class="stack-list success-case-copy">
        <article class="record-card">
          <strong>Antes de Joathi</strong>
          <p>${escapeHtml(item.challenge || "Sin detalle")}</p>
        </article>
        <article class="record-card">
          <strong>Que resolvio Joathi</strong>
          <p>${escapeHtml(item.solution || "Sin detalle")}</p>
        </article>
        <article class="record-card">
          <strong>Resultado logrado</strong>
          <p>${escapeHtml(item.results || "Sin resultado cargado")}</p>
          ${item.metrics ? `<p><strong>Metricas:</strong> ${escapeHtml(item.metrics)}</p>` : ""}
          ${item.quote ? `<blockquote class="success-case-quote">"${escapeHtml(item.quote)}"</blockquote>` : ""}
        </article>
      </div>
      ${renderSuccessCasePermissionBadges(item)}
    </article>
  `;
}

function renderAdminSuccessCaseCard(item) {
  const owner = getUser(item.userId);
  return `
    <article class="record-card success-case-card">
      <strong>${escapeHtml(item.company || "Sin empresa")} | ${escapeHtml(item.serviceUsed || "Sin servicio")}</strong>
      <p>${escapeHtml(item.operationScope || "Sin operativa")} | ${escapeHtml(getSuccessCaseStatusLabel(item.status))}</p>
      <div class="data-grid">
        <span><strong>Cliente portal</strong>${escapeHtml(owner?.displayName || "Caso interno")}</span>
        <span><strong>Contacto</strong>${escapeHtml(item.contactName || "Sin contacto")}</span>
        <span><strong>Cargo</strong>${escapeHtml(item.contactRole || "Sin cargo")}</span>
        <span><strong>Industria</strong>${escapeHtml(item.industry || "Sin industria")}</span>
        <span><strong>Enviado</strong>${escapeHtml(item.createdAt ? formatDate(String(item.createdAt).slice(0, 10)) : "Sin fecha")}</span>
        <span><strong>Servicio</strong>${escapeHtml(item.serviceUsed || "Sin servicio")}</span>
        <span><strong>Cargado por</strong>${escapeHtml(item.createdByName || "Maestro")}</span>
      </div>
      <div class="stack-list success-case-copy">
        <article class="record-card">
          <strong>Problema inicial</strong>
          <p>${escapeHtml(item.challenge || "Sin detalle")}</p>
        </article>
        <article class="record-card">
          <strong>Solucion aplicada</strong>
          <p>${escapeHtml(item.solution || "Sin detalle")}</p>
        </article>
        <article class="record-card">
          <strong>Resultado comercial</strong>
          <p>${escapeHtml(item.results || "Sin resultado cargado")}</p>
          ${item.metrics ? `<p><strong>Metricas:</strong> ${escapeHtml(item.metrics)}</p>` : ""}
          ${item.quote ? `<blockquote class="success-case-quote">"${escapeHtml(item.quote)}"</blockquote>` : ""}
          ${item.evidenceLink ? `<p><strong>Evidencia:</strong> <a href="${escapeAttribute(item.evidenceLink)}" target="_blank" rel="noopener">${escapeHtml(item.evidenceLink)}</a></p>` : ""}
        </article>
      </div>
      ${renderSuccessCasePermissionBadges(item)}
    </article>
  `;
}

function renderSuccessCasePermissionBadges(item) {
  const badges = [
    { label: getSuccessCaseStatusLabel(item.status) },
    item.allowPublishName ? { label: "Publicable con nombre" } : { label: "Sin nombre", tone: "warning" },
    item.allowPublishCompany ? { label: "Publicable con empresa" } : { label: "Sin empresa", tone: "warning" },
    item.allowPublishLogo ? { label: "Logo autorizado" } : { label: "Sin logo", tone: "warning" }
  ];

  return `
    <div class="badge-row">
      ${badges.map((badge) => `<span class="badge${badge.tone === "warning" ? " warning" : ""}">${escapeHtml(badge.label)}</span>`).join("")}
    </div>
  `;
}

function getSuccessCaseStatusLabel(status) {
  if (status === "aprobado") return "Aprobado";
  if (status === "archivado") return "Archivado";
  return "Pendiente de revision";
}

function renderInvoiceCheckpointSummary(invoice) {
  const customer = invoice.customerBillingList;
  const receipt = invoice.providerReceipt;
  if (!customer && !receipt) return "";

  return `
    <div class="panel-divider joathiva-doc-summary">
      ${customer ? `
        <div class="record-card">
          <strong>Lista cliente a facturar</strong>
          <div class="data-grid">
            <span><strong>Cliente</strong>${escapeHtml(customer.displayName)}</span>
            <span><strong>Empresa</strong>${escapeHtml(customer.company)}</span>
            <span><strong>Razon social</strong>${escapeHtml(customer.legalName)}</span>
            <span><strong>Documento</strong>${escapeHtml(customer.documentLabel)}</span>
            <span><strong>Email</strong>${escapeHtml(customer.email || "Pendiente")}</span>
            <span><strong>Telefono</strong>${escapeHtml(customer.phone || "Pendiente")}</span>
            <span><strong>Subtotal cliente</strong>${formatCurrency(customer.customerSubtotal)}</span>
            <span><strong>IVA</strong>${formatCurrency(customer.iva)}</span>
            <span><strong>Total a facturar</strong>${formatCurrency(customer.total)}</span>
            <span><strong>Generada</strong>${formatDateTimeOrPending(customer.generatedAt)}</span>
            <span><strong>Carga + GPS</strong>${escapeHtml(customer.loadingStartedLocationLabel || "Pendiente")}</span>
            <span><strong>Operacion</strong>${escapeHtml(customer.operationReference)}</span>
          </div>
        </div>
      ` : ""}
      ${receipt ? `
        <div class="record-card">
          <strong>Recibo proveedor</strong>
          <div class="data-grid">
            <span><strong>Proveedor</strong>${escapeHtml(receipt.providerDisplayName)}</span>
            <span><strong>Empresa</strong>${escapeHtml(receipt.company)}</span>
            <span><strong>Chofer</strong>${escapeHtml(receipt.driverName || "Pendiente")}</span>
            <span><strong>Unidad</strong>${escapeHtml(receipt.vehiclePlate || "Pendiente")}</span>
            <span><strong>Monto a liquidar</strong>${formatCurrency(receipt.amount)}</span>
            <span><strong>Estado</strong>${escapeHtml(receipt.statusLabel)}</span>
            <span><strong>Recibo</strong>${escapeHtml(receipt.receiptNumber)}</span>
            <span><strong>Generado</strong>${formatDateTimeOrPending(receipt.generatedAt)}</span>
            <span><strong>Banco</strong>${escapeHtml(receipt.bankName || "Pendiente")}</span>
            <span><strong>Cuenta</strong>${escapeHtml(receipt.bankAccountNumber || "Pendiente")}</span>
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

function renderClientInvoiceSnapshot(invoice) {
  const customer = invoice.customerBillingList;
  if (!customer) return "";

  return `
    <div class="panel-divider joathiva-doc-summary">
      <div class="data-grid">
        <span><strong>Factura JoathiVA</strong>${escapeHtml(customer.invoiceNumber)}</span>
        <span><strong>Pago</strong>${escapeHtml(invoice.paymentStatusLabel || "Pendiente")}</span>
        <span><strong>Total</strong>${formatCurrency(customer.total)}</span>
        <span><strong>GPS carga</strong>${escapeHtml(customer.loadingStartedLocationLabel || "Pendiente")}</span>
      </div>
    </div>
  `;
}

function renderBillingSummary(billing) {
  const container = document.querySelector("#billingSummary");
  if (!container) return;

  if (!billing) {
    container.innerHTML = `
      <article class="record-card">
        <strong>Resumen pendiente</strong>
        <p>Se calculara base, adicionales, IVA y total al generar el traslado.</p>
      </article>
    `;
    return;
  }

  container.innerHTML = `
    <article class="record-card">
      <strong>Total estimado ${formatCurrency(billing.total)}</strong>
      <p>${escapeHtml(billing.ruleLabel)}</p>
      <div class="data-grid">
        <span><strong>Costo proveedor</strong>${formatCurrency(billing.basePrice)}</span>
        <span><strong>Carga extra</strong>${formatCurrency(billing.loadingExtra)}</span>
        <span><strong>Descarga extra</strong>${formatCurrency(billing.unloadingExtra)}</span>
        <span><strong>Frontera</strong>${formatCurrency(billing.frontierExtra)}</span>
        <span><strong>Subtotal proveedor</strong>${formatCurrency(billing.providerSubtotal)}</span>
        <span><strong>Comision JoathiVA</strong>${formatCurrency(billing.platformCommission)}</span>
        <span><strong>Subtotal cliente</strong>${formatCurrency(billing.customerSubtotal)}</span>
        <span><strong>Exento</strong>${formatCurrency(billing.exemptAmount)}</span>
        <span><strong>Gravado</strong>${formatCurrency(billing.taxableAmount)}</span>
        <span><strong>IVA</strong>${formatCurrency(billing.iva)}</span>
      </div>
      <div class="badge-row">
        <span class="badge">Comision JoathiVA 33,3%</span>
        <span class="badge warning">2 horas de carga y descarga sin costo</span>
      </div>
    </article>
  `;
}

function computeBilling({ trip, loadingHours, unloadingHours, frontierStay }) {
  const basePrice = Number(trip.priceUsd || 0);
  const loadingExtra = loadingHours > 2 ? EXTRA_WAIT_USD : 0;
  const unloadingExtra = unloadingHours > 2 ? EXTRA_WAIT_USD : 0;
  const frontierExtra = frontierStay ? FRONTIER_STAY_USD : 0;
  const providerSubtotal = basePrice + loadingExtra + unloadingExtra + frontierExtra;
  const commercialBreakdown = computeCommercialBreakdown(providerSubtotal);
  const customerSubtotal = commercialBreakdown.customerSubtotal;

  let exemptAmount = 0;
  let taxableAmount = 0;
  let iva = 0;
  let ruleLabel = "Operacion internacional no parametrizada: revisar manualmente";

  if (trip.destinationCountry === "Uruguay" && trip.originCountry === "Brasil") {
    exemptAmount = customerSubtotal * 0.8;
    taxableAmount = customerSubtotal * 0.2;
    iva = taxableAmount * IVA_RATE;
    ruleLabel = "Importacion Brasil -> Uruguay: 80% exento y 20% + IVA";
  } else if (trip.destinationCountry === "Uruguay" && trip.originCountry === "Argentina") {
    exemptAmount = customerSubtotal * 0.5;
    taxableAmount = customerSubtotal * 0.5;
    iva = taxableAmount * IVA_RATE;
    ruleLabel = "Importacion Argentina -> Uruguay: 50% exento y 50% + IVA";
  } else if (trip.destinationCountry === "Uruguay" && trip.originCountry === "Paraguay") {
    exemptAmount = customerSubtotal * 0.7;
    taxableAmount = customerSubtotal * 0.3;
    iva = taxableAmount * IVA_RATE;
    ruleLabel = "Importacion Paraguay -> Uruguay: 70% exento y 30% + IVA";
  } else if (trip.originCountry === "Uruguay" && trip.destinationCountry !== "Uruguay") {
    exemptAmount = customerSubtotal;
    ruleLabel = "Exportacion desde Uruguay: sin IVA";
  } else if (trip.originCountry === "Uruguay" && trip.destinationCountry === "Uruguay") {
    taxableAmount = customerSubtotal;
    iva = taxableAmount * IVA_RATE;
    ruleLabel = "Traslado dentro de Uruguay: total + IVA";
  } else {
    exemptAmount = customerSubtotal;
  }

  return {
    basePrice,
    loadingExtra,
    unloadingExtra,
    frontierExtra,
    providerSubtotal,
    platformCommission: commercialBreakdown.platformCommission,
    customerSubtotal,
    exemptAmount,
    taxableAmount,
    iva,
    total: customerSubtotal + iva,
    ruleLabel
  };
}

function computeCommercialBreakdown(providerSubtotal) {
  const safeProviderSubtotal = Number(providerSubtotal || 0);
  const divisor = 1 - JOATHIVA_COMMISSION_RATE;
  const customerSubtotal = divisor > 0 ? roundCurrency(safeProviderSubtotal / divisor) : safeProviderSubtotal;
  const platformCommission = Math.max(0, roundCurrency(customerSubtotal - safeProviderSubtotal));

  return {
    providerSubtotal: safeProviderSubtotal,
    customerSubtotal,
    platformCommission
  };
}

function renderCollection(container, items, renderItem) {
  if (!container) return;
  if (!items.length) {
    const emptyState = document.querySelector("#emptyStateTemplate");
    container.replaceChildren(emptyState.content.firstElementChild.cloneNode(true));
    return;
  }
  container.innerHTML = items.map(renderItem).join("");
}

function initHomeCarousel(container) {
  const controls = document.querySelector("[data-carousel-controls]");
  const prevButton = document.querySelector("[data-carousel-prev]");
  const nextButton = document.querySelector("[data-carousel-next]");

  if (!container || !controls || !prevButton || !nextButton) return;

  const hasScrollableCards = container.children.length > 1;
  controls.hidden = !hasScrollableCards;
  if (!hasScrollableCards) return;

  const updateButtons = () => {
    const maxScroll = container.scrollWidth - container.clientWidth - 4;
    prevButton.disabled = container.scrollLeft <= 4;
    nextButton.disabled = container.scrollLeft >= maxScroll;
  };

  prevButton.onclick = () => {
    container.scrollBy({ left: -container.clientWidth * 0.9, behavior: "smooth" });
  };

  nextButton.onclick = () => {
    container.scrollBy({ left: container.clientWidth * 0.9, behavior: "smooth" });
  };

  container.onscroll = updateButtons;
  window.requestAnimationFrame(updateButtons);
}

function bindNotificationPreferences(form) {
  const checkbox = form.querySelector("#notificationsEnabled");
  const container = form.querySelector("#notificationPreferences");
  const inputs = container ? Array.from(container.querySelectorAll("input")) : [];
  if (!checkbox || !container) return;

  const sync = () => {
    const enabled = checkbox.checked;
    container.hidden = !enabled;
    inputs.forEach((input) => {
      input.disabled = !enabled;
      input.required = enabled;
      if (!enabled) input.value = "";
    });
  };

  checkbox.addEventListener("change", sync);
  sync();
}

function bindProviderBankFields(form) {
  const roleSelect = form.querySelector("select[name='role']");
  const container = form.querySelector("#providerBankingFields");
  const inputs = container ? Array.from(container.querySelectorAll("input")) : [];
  if (!roleSelect || !container) return;

  const sync = () => {
    const enabled = roleSelect.value === "provider";
    container.hidden = !enabled;
    inputs.forEach((input) => {
      input.disabled = !enabled;
      input.required = enabled;
      if (!enabled) input.value = "";
    });
  };

  roleSelect.addEventListener("change", sync);
  sync();
}

function syncAdminNotificationFields(form) {
  const checkbox = form.querySelector("[data-notify-toggle]");
  const fields = form.querySelector(".admin-notification-fields");
  const inputs = fields ? Array.from(fields.querySelectorAll("input")) : [];
  if (!checkbox || !fields) return;

  const enabled = checkbox.checked;
  fields.hidden = !enabled;
  inputs.forEach((input) => {
    input.disabled = !enabled;
    input.required = enabled;
  });
}

function syncAdminProviderBankFields(form) {
  const roleSelect = form.querySelector("select[name='role']");
  const fields = form.querySelector(".admin-provider-bank-fields");
  const inputs = fields ? Array.from(fields.querySelectorAll("input")) : [];
  if (!roleSelect || !fields) return;

  const enabled = roleSelect.value === "provider";
  fields.hidden = !enabled;
  inputs.forEach((input) => {
    input.disabled = !enabled;
    input.required = enabled;
    if (!enabled) input.value = "";
  });
}

function populateDriverSelect(select, selectedId = "") {
  if (!select) return;
  const options = ['<option value="">Seleccionar chofer</option>'];
  state.drivers.forEach((driver) => {
    const selected = selectedId === driver.id ? " selected" : "";
    options.push(`<option value="${driver.id}"${selected}>${escapeHtml(driver.name)} | ${escapeHtml(driver.originCity)}, ${escapeHtml(driver.originCountry)}</option>`);
  });
  select.innerHTML = options.join("");
}

function populateVehicleSelect(select, driverId = "", selectedId = "") {
  if (!select) return;
  const filtered = driverId ? state.vehicles.filter((vehicle) => vehicle.driverId === driverId) : state.vehicles;
  const options = ['<option value="">Seleccionar transporte</option>'];
  filtered.forEach((vehicle) => {
    const selected = selectedId === vehicle.id ? " selected" : "";
    options.push(`<option value="${vehicle.id}"${selected}>${escapeHtml(vehicle.plate)} | ${escapeHtml(vehicle.type)}</option>`);
  });
  select.innerHTML = options.join("");
}

function populateTripSelect(select) {
  if (!select) return;
  const options = ['<option value="">Seleccionar viaje</option>'];
  state.trips.filter((trip) => {
    if (["Confirmado", "Finalizado", "En curso", "Sin cupo"].includes(trip.status)) return false;
    return Number(trip.availableM3 || 0) > 0 && Number(trip.availableWeightKg || 0) > 0;
  }).forEach((trip) => {
    options.push(`<option value="${trip.id}">${escapeHtml(trip.currentLocation)}, ${escapeHtml(trip.originCountry)} -> ${escapeHtml(trip.returnDestination)}, ${escapeHtml(trip.destinationCountry)} | ${escapeHtml(formatNumber(trip.availableM3))} m3 | ${escapeHtml(formatNumber(trip.availableWeightKg))} kg</option>`);
  });
  select.innerHTML = options.join("");
}

function ensureProvider(user) {
  if (!user || user.role !== "provider") {
    window.location.href = user?.role === "master" ? "admin.html" : "index.html";
    throw new Error("Acceso restringido");
  }
}

function ensureMaster(user) {
  if (!user || user.role !== "master") {
    window.location.href = "index.html";
    throw new Error("Acceso restringido");
  }
}

function startSession(userId, serverSession = null) {
  const session = {
    userId,
    loggedAt: new Date().toISOString()
  };

  if (serverSession?.sessionToken) {
    session.sessionToken = String(serverSession.sessionToken);
    session.serverUserId = String(serverSession.userId || "");
    session.serverUsername = String(serverSession.username || "");
    session.serverRole = String(serverSession.role || "");
    session.expiresAt = String(serverSession.expiresAt || "");
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(LEGACY_SESSION_KEY);
  dispatchJoathiVaEvent("joathiva:session-change", { userId });
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY);
  dispatchJoathiVaEvent("joathiva:session-change", { userId: null });
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || localStorage.getItem(LEGACY_SESSION_KEY) || "null";
    const session = JSON.parse(raw);
    if (session && raw !== "null") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.removeItem(LEGACY_SESSION_KEY);
    }
    return session;
  } catch {
    return null;
  }
}

function getPortalSessionToken() {
  const session = getSession();
  return String(session?.sessionToken || "");
}

function getCurrentUser() {
  const session = getSession();
  return state.users.find((user) => user.id === session?.userId) || null;
}

function getDriver(id) {
  return state.drivers.find((driver) => driver.id === id);
}

function getVehicle(id) {
  return state.vehicles.find((vehicle) => vehicle.id === id);
}

function getTrip(id) {
  return state.trips.find((trip) => trip.id === id);
}

function getUser(id) {
  return state.users.find((user) => user.id === id);
}

function getNotifications() {
  return Array.isArray(state.notifications) ? state.notifications : [];
}

function countRoutes() {
  return new Set(state.trips.map((trip) => `${normalizeText(trip.currentLocation)}-${normalizeText(trip.returnDestination)}`)).size;
}

function dispatchJoathiVaEvent(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function showElements(selector, visible) {
  document.querySelectorAll(selector).forEach((node) => {
    node.hidden = !visible;
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
      return cloneSeed();
    }
    const parsed = JSON.parse(raw);
    const migrated = migrateState(parsed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return migrated;
  } catch {
    return cloneSeed();
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  dispatchJoathiVaEvent("joathiva:state-change");
}

function cloneSeed() {
  return JSON.parse(JSON.stringify(seedState));
}

function migrateState(parsed) {
  const base = cloneSeed();
  const stateCandidate = {
    ...base,
    ...parsed,
    users: Array.isArray(parsed?.users) ? parsed.users : base.users,
    drivers: Array.isArray(parsed?.drivers) ? parsed.drivers : base.drivers,
    vehicles: Array.isArray(parsed?.vehicles) ? parsed.vehicles : base.vehicles,
    trips: Array.isArray(parsed?.trips) ? parsed.trips : base.trips,
    requests: Array.isArray(parsed?.requests) ? parsed.requests : base.requests,
    documents: Array.isArray(parsed?.documents) ? parsed.documents : base.documents,
    notifications: Array.isArray(parsed?.notifications) ? parsed.notifications : base.notifications,
    successCases: Array.isArray(parsed?.successCases) ? parsed.successCases : base.successCases
  };

  stateCandidate.trips = stateCandidate.trips.map((trip) => ({
    trackingStatus: "pending",
    driverShareConsent: false,
    startedAt: null,
    endedAt: null,
    liveLocation: null,
    trackingHistory: [],
    operationTimeline: createEmptyOperationTimeline(),
    destinationGeo: getDefaultResolvedPlace(),
    ...trip,
    destinationGeo: {
      ...getDefaultResolvedPlace(),
      ...(trip.destinationGeo || {})
    }
  }));

  stateCandidate.users = stateCandidate.users.map((user, index, users) => ensureOperationalUserDefaults({
    ...getDefaultBankingData(),
    ...getDefaultUserOperationalData(),
    ...user,
    profileLocation: {
      ...getDefaultProfileLocation(),
      ...(user.profileLocation || {})
    }
  }, users.slice(0, index)));

  stateCandidate.requests = stateCandidate.requests.map((request) => {
    const trip = stateCandidate.trips.find((item) => item.id === request.tripId);
    const billing = request.billing || (trip ? computeBilling({
      trip,
      loadingHours: Number(request.loadingHours || 0),
      unloadingHours: Number(request.unloadingHours || 0),
      frontierStay: Boolean(request.frontierStay)
    }) : null);

    return {
      ...getDefaultRequestCustomsData(),
      reservationMode: request.reservationMode || "partial",
      reservedWeightKg: Number(request.reservedWeightKg || request.weightKg || 0),
      reservedVolumeM3: Number(request.reservedVolumeM3 || request.volumeM3 || 0),
      paymentStatus: request.paymentStatus || "pendiente_entrega",
      settlementStatus: request.settlementStatus || "pendiente_pago_cliente",
      ...request,
      billing,
      invoiceRecord: trip && billing ? buildInvoiceRecord(trip, billing, request, stateCandidate) : (request.invoiceRecord || null)
    };
  });

  const requiredUsers = [
    "maestro",
    "rodrigo",
    "admin",
    "valeria@joathilogistica.com",
    "gimena@joathilogistica.com",
    "administracion@joathilogistica.com",
    "proveedor",
    "cliente",
    "despachante"
  ].map((username) => seedState.users.find((user) => user.username === username)).filter(Boolean);

  requiredUsers.forEach((requiredUser) => {
    const existingIndex = stateCandidate.users.findIndex((user) => {
      const existingUsername = normalizeText(user.username);
      const existingEmail = normalizeText(user.email);
      const requiredUsername = normalizeText(requiredUser.username);
      const requiredEmail = normalizeText(requiredUser.email);
      return existingUsername === requiredUsername || existingEmail === requiredEmail || existingUsername === requiredEmail || existingEmail === requiredUsername;
    });

    if (existingIndex === -1) {
      stateCandidate.users.unshift(ensureOperationalUserDefaults({
        ...getDefaultBankingData(),
        ...getDefaultUserOperationalData(),
        ...requiredUser,
        profileLocation: {
          ...getDefaultProfileLocation(),
          ...(requiredUser.profileLocation || {})
        }
      }, stateCandidate.users));
      return;
    }

    const existingUser = stateCandidate.users[existingIndex];
    stateCandidate.users[existingIndex] = ensureOperationalUserDefaults({
      ...getDefaultBankingData(),
      ...getDefaultUserOperationalData(),
      ...existingUser,
      ...requiredUser,
      profileLocation: {
        ...getDefaultProfileLocation(),
        ...(existingUser.profileLocation || {}),
        ...(requiredUser.profileLocation || {})
      }
    }, stateCandidate.users.filter((_, index) => index !== existingIndex));
  });

  return stateCandidate;
}

function serializeFileName(file) {
  return Promise.resolve(file instanceof File ? file.name : "");
}

function createEmptyOperationTimeline() {
  return {
    loadingStartedAt: null,
    loadingStartedLocation: null,
    tripStartedAt: null,
    arrivalAt: null,
    unloadingCompletedAt: null,
    completedAt: null
  };
}

function normalizeOperationTimeline(value) {
  return {
    ...createEmptyOperationTimeline(),
    ...(value || {})
  };
}

function buildInvoiceRecord(trip, billing, request = null, context = null) {
  const timeline = normalizeOperationTimeline(trip?.operationTimeline);
  const users = Array.isArray(context?.users) ? context.users : state.users;
  const drivers = Array.isArray(context?.drivers) ? context.drivers : state.drivers;
  const vehicles = Array.isArray(context?.vehicles) ? context.vehicles : state.vehicles;
  const client = request ? users.find((user) => user.id === request.userId) || null : null;
  const provider = users.find((user) => user.role === "provider") || null;
  const driver = drivers.find((item) => item.id === trip?.driverId) || null;
  const vehicle = vehicles.find((item) => item.id === trip?.vehicleId) || null;
  const invoiceNumber = `FAC-${String(request?.id || trip?.id || "JOA").replace(/[^a-z0-9]/gi, "").toUpperCase()}`;
  const receiptNumber = `REC-${String(request?.id || trip?.id || "JOA").replace(/[^a-z0-9]/gi, "").toUpperCase()}`;
  const generatedAt = timeline.completedAt || null;
  return {
    operationTimeline: timeline,
    paymentFlow: "El cliente le paga a JoathiVA y JoathiVA liquida al proveedor.",
    paymentStatusLabel: getPaymentStatusLabel(timeline.completedAt ? "habilitado_cobro" : "pendiente_entrega"),
    settlementStatusLabel: getSettlementStatusLabel(timeline.completedAt ? "habilitado_pago_proveedor" : "pendiente_pago_cliente"),
    clientChargeAt: timeline.completedAt,
    providerSettlementAt: timeline.completedAt,
    providerSubtotal: billing?.providerSubtotal || 0,
    clientSubtotal: billing?.customerSubtotal || 0,
    total: billing?.total || 0,
    customerBillingList: {
      invoiceNumber,
      generatedAt,
      displayName: client?.displayName || "Cliente pendiente",
      company: client?.company || "",
      legalName: client?.legalName || "",
      documentLabel: buildDocumentLabel(client),
      documentType: client?.documentType || "",
      documentNumber: client?.documentNumber || "",
      email: client?.email || "",
      phone: client?.phone || "",
      cargoDescription: request?.cargoDescription || trip?.cargoType || "",
      originLabel: formatRouteOrigin(trip),
      destinationLabel: formatRouteDestination(trip),
      customerSubtotal: billing?.customerSubtotal || 0,
      iva: billing?.iva || 0,
      total: billing?.total || 0,
      loadingStartedLocationLabel: formatLocationLabel(timeline.loadingStartedLocation),
      operationReference: `${formatRouteOrigin(trip)} -> ${formatRouteDestination(trip)}`
    },
    providerReceipt: {
      receiptNumber,
      generatedAt,
      providerDisplayName: provider?.displayName || provider?.company || "Proveedor",
      company: provider?.company || driver?.company || "",
      documentLabel: buildDocumentLabel(provider),
      email: provider?.email || "",
      phone: provider?.phone || driver?.phone || "",
      driverName: driver?.name || "",
      vehiclePlate: vehicle?.plate || "",
      bankAccountHolder: provider?.bankAccountHolder || "",
      bankName: provider?.bankName || "",
      bankAccountType: provider?.bankAccountType || "",
      bankAccountNumber: provider?.bankAccountNumber || "",
      bankSwift: provider?.bankSwift || "",
      amount: billing?.providerSubtotal || 0,
      statusLabel: timeline.completedAt ? "Recibo generado y habilitado para pago" : "Pendiente de finalizacion"
    }
  };
}

function syncRequestsForTrip(tripId) {
  const trip = getTrip(tripId);
  if (!trip) return;

  state.requests.forEach((request) => {
    if (request.tripId !== tripId) return;

    request.billing = computeBilling({
      trip,
      loadingHours: Number(request.loadingHours || 0),
      unloadingHours: Number(request.unloadingHours || 0),
      frontierStay: Boolean(request.frontierStay)
    });

    const completed = Boolean(normalizeOperationTimeline(trip.operationTimeline).completedAt);
    request.paymentStatus = completed ? "habilitado_cobro" : "pendiente_entrega";
    request.settlementStatus = completed ? "habilitado_pago_proveedor" : "pendiente_pago_cliente";
    request.invoiceRecord = buildInvoiceRecord(trip, request.billing, request, state);
  });
}

function createOperationNotification(tripId, eventType) {
  const trip = getTrip(tripId);
  if (!trip) return null;

  const timeline = normalizeOperationTimeline(trip.operationTimeline);
  const requests = state.requests.filter((request) => request.tripId === tripId);
  const driver = getDriver(trip.driverId);
  const clientUsers = requests.map((request) => getUser(request.userId)).filter(Boolean);
  const masterUsers = state.users.filter((user) => user.role === "master");
  const providerUsers = state.users.filter((user) => user.role === "provider");
  const brokerUsers = state.users.filter((user) => user.role === "broker");
  const audienceUserIds = [...new Set([...masterUsers, ...providerUsers, ...brokerUsers, ...clientUsers].map((user) => user.id))];
  const eventConfig = getOperationEventConfig(eventType, timeline);
  if (!eventConfig) return null;

  state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
  const notification = {
    id: buildId("ntf"),
    tripId,
    requestIds: requests.map((request) => request.id),
    audienceRoles: ["master", "provider", "broker", "client"],
    audienceUserIds,
    eventType,
    title: eventConfig.title,
    message: `${driver?.name || "Chofer"} | ${formatRouteOrigin(trip)} -> ${formatRouteDestination(trip)} | ${eventConfig.description}`,
    createdAt: eventConfig.createdAt,
    status: "pending"
  };

  state.notifications.unshift(notification);
  state.notifications = state.notifications.slice(0, 120);
  return notification;
}

function getOperationEventConfig(eventType, timeline) {
  const createdAt = timeline.completedAt || timeline.unloadingCompletedAt || timeline.arrivalAt || timeline.tripStartedAt || timeline.loadingStartedAt || new Date().toISOString();
  const operationDate = formatDateTime(createdAt);

  if (eventType === "loading_started") {
    return {
      title: "Carga iniciada",
      description: `Se registro el tiempo de carga y el GPS inicial a las ${operationDate}.`,
      createdAt: timeline.loadingStartedAt || createdAt
    };
  }
  if (eventType === "trip_started") {
    return {
      title: "Comienzo de viaje registrado",
      description: `El chofer indico comienzo de viaje a las ${operationDate}.`,
      createdAt: timeline.tripStartedAt || createdAt
    };
  }
  if (eventType === "arrival_registered") {
    return {
      title: "Llegada registrada",
      description: `La llegada al destino fue reportada a las ${operationDate}.`,
      createdAt: timeline.arrivalAt || createdAt
    };
  }
  if (eventType === "unloading_completed") {
    return {
      title: "Descarga registrada",
      description: `La descarga quedo registrada a las ${operationDate}.`,
      createdAt: timeline.unloadingCompletedAt || createdAt
    };
  }
  if (eventType === "operation_completed") {
    return {
      title: "Operacion finalizada",
      description: `Se habilito el cobro al cliente y el recibo del proveedor a las ${operationDate}.`,
      createdAt: timeline.completedAt || createdAt
    };
  }
  return null;
}

function buildDocumentLabel(user) {
  if (!user?.documentType && !user?.documentNumber) return "Pendiente";
  return `${String(user.documentType || "").toUpperCase()} ${user.documentNumber || ""}`.trim();
}

function formatRouteOrigin(trip) {
  return [trip?.currentLocation, trip?.originCountry].filter(Boolean).join(", ");
}

function formatRouteDestination(trip) {
  return [trip?.returnDestination, trip?.destinationCountry].filter(Boolean).join(", ");
}

function formatLocationLabel(location) {
  if (!location?.lat || !location?.lng) return "";
  return `${location.lat}, ${location.lng}${location.accuracy ? ` | +/- ${location.accuracy} m` : ""}`;
}

function getDefaultProfileLocation() {
  return {
    lat: null,
    lng: null,
    accuracy: null,
    city: "",
    country: "",
    countryCode: "",
    label: "",
    capturedAt: null
  };
}

function getDefaultResolvedPlace() {
  return {
    lat: null,
    lng: null,
    city: "",
    country: "",
    countryCode: "",
    label: "",
    resolvedAt: null
  };
}

function getDefaultBrokerOperationalData() {
  return {
    customsRegistryNumber: "",
    customsJurisdiction: "",
    customsPrimaryOffice: "",
    customsSpecialties: [],
    customsSystems: [],
    customsRegimes: [],
    customsRepresentationScope: "",
    customsLegalNotes: ""
  };
}

function getDefaultRequestCustomsData() {
  return {
    customsHsCode: "",
    customsIncoterm: "",
    customsOriginCountry: "",
    customsDestinationCustoms: "",
    customsRegime: "",
    customsDeclarationNumber: "",
    customsDeclarationStatus: "",
    customsRepresentationStatus: "",
    customsLegalStatus: "",
    customsPermitsNotes: "",
    customsBrokerNotes: ""
  };
}

function getDefaultUserOperationalData() {
  return {
    authProvider: "password",
    googleSub: "",
    avatarUrl: "",
    notificationsEnabled: false,
    notificationOrigin: "",
    notificationDestination: "",
    favoriteRoutes: [],
    profileLocation: getDefaultProfileLocation(),
    ...getDefaultBrokerOperationalData()
  };
}

function ensureOperationalUserDefaults(user, existingUsers = []) {
  const profileLocation = {
    ...getDefaultProfileLocation(),
    ...(user.profileLocation || {})
  };
  const displayName = String(user.displayName || "").trim();
  const company = String(user.company || "").trim() || displayName;
  const email = String(user.email || "").trim();
  const jobTitle = String(user.jobTitle || "").trim() || getDefaultJobTitle(user.role);
  const mainScreen = String(user.mainScreen || "").trim() || getDefaultMainScreen(user.role);
  const notificationOrigin = String(user.notificationOrigin || "").trim() || profileLocation.label || [profileLocation.city, profileLocation.country].filter(Boolean).join(", ");
  return {
    ...getDefaultUserOperationalData(),
    ...user,
    company,
    legalName: String(user.legalName || "").trim() || company || displayName,
    username: String(user.username || "").trim() || buildUniqueUsername(email || displayName || "usuario", existingUsers),
    authProvider: String(user.authProvider || (user.googleSub ? "google" : "password")),
    notificationsEnabled: typeof user.notificationsEnabled === "boolean" ? user.notificationsEnabled : user.role === "client" || user.role === "broker",
    notificationOrigin,
    favoriteRoutes: normalizeFavoriteRoutes(user.favoriteRoutes),
    profileLocation,
    jobTitle,
    mainScreen,
    permissions: normalizeUserPermissions(user),
    customsRegistryNumber: String(user.customsRegistryNumber || "").trim(),
    customsJurisdiction: String(user.customsJurisdiction || "").trim(),
    customsPrimaryOffice: String(user.customsPrimaryOffice || "").trim(),
    customsSpecialties: normalizeBrokerEntryList(user.customsSpecialties),
    customsSystems: normalizeBrokerEntryList(user.customsSystems),
    customsRegimes: normalizeBrokerEntryList(user.customsRegimes),
    customsRepresentationScope: String(user.customsRepresentationScope || "").trim(),
    customsLegalNotes: String(user.customsLegalNotes || "").trim()
  };
}

function buildBasicUserRecord({
  displayName,
  role,
  company,
  email,
  phone,
  password,
  termsAccepted,
  authProvider,
  profileLocation,
  googleSub = "",
  avatarUrl = "",
  jobTitle = "",
  mainScreen = "",
  permissions = null,
  existingUsers = []
}) {
  const safeLocation = {
    ...getDefaultProfileLocation(),
    ...(profileLocation || {})
  };
  const normalizedName = String(displayName || "").trim();
  const normalizedCompany = String(company || "").trim() || normalizedName;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const username = buildUniqueUsername(normalizedEmail || normalizedName || "usuario", existingUsers);
  const locationLabel = safeLocation.label || [safeLocation.city, safeLocation.country].filter(Boolean).join(", ");
  return ensureOperationalUserDefaults({
    id: buildId("usr"),
    username,
    password: String(password || ""),
    displayName: normalizedName,
    role,
    company: normalizedCompany,
    legalName: normalizedCompany,
    documentType: "",
    documentNumber: "",
    email: normalizedEmail,
    phone: String(phone || "").trim(),
    termsAccepted: Boolean(termsAccepted),
    notificationsEnabled: role === "client" || role === "broker",
    notificationOrigin: role === "client" ? locationLabel : "",
    notificationDestination: "",
    authProvider: authProvider || "password",
    googleSub: googleSub || "",
    avatarUrl: avatarUrl || "",
    profileLocation: safeLocation,
    jobTitle: String(jobTitle || "").trim() || getDefaultJobTitle(role),
    mainScreen: String(mainScreen || "").trim() || getDefaultMainScreen(role),
    permissions: permissions && typeof permissions === "object" ? permissions : getDefaultRoleAccess(role),
    ...getDefaultBankingData()
  });
}

function findUserForCredentials(identifier, password) {
  const normalized = normalizeText(identifier);
  return state.users.find((user) => {
    const usernameMatch = normalizeText(user.username) === normalized;
    const emailMatch = normalizeText(user.email) === normalized;
    return (usernameMatch || emailMatch) && getLegacyPortalUserPassword(user) === String(password || "");
  }) || null;
}

function getLegacyPortalUserPassword(user) {
  return String((user || {})["password"] || "");
}

function findUserByEmail(email) {
  if (!String(email || "").trim()) return null;
  const normalized = normalizeText(email);
  return state.users.find((user) => normalizeText(user.email) === normalized) || null;
}

function normalizeFavoriteRoutes(value) {
  const rawValues = Array.isArray(value) ? value : parseFavoriteRoutesInput(String(value || ""));
  return [...new Set(rawValues.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 8);
}

function normalizeBrokerEntryList(value) {
  const rawValues = Array.isArray(value) ? value : parseBrokerEntryInput(String(value || ""));
  return [...new Set(rawValues.map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 8);
}

function parseFavoriteRoutesInput(value) {
  return String(value || "")
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBrokerEntryInput(value) {
  return String(value || "")
    .split(/\r?\n|,|;|\//)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildUniqueUsername(rawValue, existingUsers = []) {
  const base = String(rawValue || "usuario")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "usuario";

  let candidate = base;
  let sequence = 1;
  while (existingUsers.some((user) => normalizeText(user.username) === normalizeText(candidate))) {
    sequence += 1;
    candidate = `${base}.${sequence}`;
  }
  return candidate;
}

function captureBrowserPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalizacion no disponible"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 12000,
      ...options
    });
  });
}

async function captureUserProfileLocation() {
  try {
    const position = await captureBrowserPosition();
    const coords = position.coords || {};
    const reverse = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);
    return {
      lat: Number(coords.latitude || 0),
      lng: Number(coords.longitude || 0),
      accuracy: Number(coords.accuracy || 0),
      city: reverse.city,
      country: reverse.country,
      countryCode: reverse.countryCode,
      label: reverse.label || formatCoordinatesLabel(coords.latitude, coords.longitude),
      capturedAt: new Date().toISOString()
    };
  } catch {
    return getDefaultProfileLocation();
  }
}

async function reverseGeocodeCoordinates(lat, lng) {
  if (!lat || !lng) return getDefaultResolvedPlace();
  try {
    const url = `${REVERSE_GEOCODE_ENDPOINT}?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`;
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "es"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    const address = payload.address || {};
    const city = address.city || address.town || address.village || address.municipality || address.county || "";
    const country = address.country || "";
    return {
      lat: Number(lat),
      lng: Number(lng),
      city,
      country,
      countryCode: String(address.country_code || "").toUpperCase(),
      label: [city, country].filter(Boolean).join(", "),
      resolvedAt: new Date().toISOString()
    };
  } catch {
    return {
      ...getDefaultResolvedPlace(),
      lat: Number(lat),
      lng: Number(lng),
      label: formatCoordinatesLabel(lat, lng),
      resolvedAt: new Date().toISOString()
    };
  }
}

async function geocodePlace(query) {
  if (!String(query || "").trim()) return getDefaultResolvedPlace();
  try {
    const url = `${SEARCH_GEOCODE_ENDPOINT}?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "es"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const [payload] = await response.json();
    if (!payload) {
      return getDefaultResolvedPlace();
    }
    const address = payload.address || {};
    const city = address.city || address.town || address.village || address.municipality || payload.name || "";
    const country = address.country || "";
    return {
      lat: Number(payload.lat || 0),
      lng: Number(payload.lon || 0),
      city,
      country,
      countryCode: String(address.country_code || "").toUpperCase(),
      label: [city, country].filter(Boolean).join(", "),
      resolvedAt: new Date().toISOString()
    };
  } catch {
    return getDefaultResolvedPlace();
  }
}

async function resolveTripDestinationLocation(trip) {
  if (!trip) return getDefaultResolvedPlace();
  trip.destinationGeo = {
    ...getDefaultResolvedPlace(),
    ...(trip.destinationGeo || {})
  };
  if (trip.destinationGeo.lat && trip.destinationGeo.lng) {
    return trip.destinationGeo;
  }
  const resolved = await geocodePlace([trip.returnDestination, trip.destinationCountry].filter(Boolean).join(", "));
  trip.destinationGeo = {
    ...trip.destinationGeo,
    ...resolved
  };
  return trip.destinationGeo;
}

function calculateDistanceKm(origin, destination) {
  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) return Number.POSITIVE_INFINITY;
  const earthRadiusKm = 6371;
  const dLat = toRadians(Number(destination.lat) - Number(origin.lat));
  const dLng = toRadians(Number(destination.lng) - Number(origin.lng));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(Number(origin.lat))) * Math.cos(toRadians(Number(destination.lat))) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function toRadians(value) {
  return value * (Math.PI / 180);
}

function formatCoordinatesLabel(lat, lng) {
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
}

function isTripNearUser(trip, user, radiusKm = CLIENT_TRIP_ALERT_RADIUS_KM) {
  const profileLocation = user?.profileLocation || {};
  if (profileLocation.lat && profileLocation.lng && trip?.destinationGeo?.lat && trip?.destinationGeo?.lng) {
    return calculateDistanceKm(profileLocation, trip.destinationGeo) <= radiusKm;
  }

  const destinationLabel = normalizeText([trip?.returnDestination, trip?.destinationCountry].filter(Boolean).join(" "));
  const userLabel = normalizeText([
    user?.profileLocation?.city,
    user?.profileLocation?.country,
    user?.notificationOrigin
  ].filter(Boolean).join(" "));
  const routeMatchesBaseLocation = Boolean(destinationLabel && userLabel && (destinationLabel.includes(userLabel) || userLabel.includes(destinationLabel)));
  if (routeMatchesBaseLocation) return true;

  return normalizeFavoriteRoutes(user?.favoriteRoutes).some((route) => {
    const normalizedRoute = normalizeText(route);
    return Boolean(normalizedRoute && destinationLabel && (destinationLabel.includes(normalizedRoute) || normalizedRoute.includes(destinationLabel)));
  });
}

async function createTripAvailabilityNotification(tripId) {
  const trip = getTrip(tripId);
  if (!trip) return null;

  const timeline = normalizeOperationTimeline(trip.operationTimeline);
  if (!timeline.tripStartedAt) return null;

  state.notifications = Array.isArray(state.notifications) ? state.notifications : [];
  const alreadyExists = state.notifications.find((notification) => notification.tripId === tripId && notification.eventType === "incoming_capacity_alert");
  if (alreadyExists) {
    return alreadyExists;
  }

  const destinationGeo = await resolveTripDestinationLocation(trip);
  const nearbyClients = state.users
    .filter((user) => user.role === "client" && user.notificationsEnabled !== false)
    .filter((user) => isTripNearUser(trip, user, CLIENT_TRIP_ALERT_RADIUS_KM));

  if (!nearbyClients.length) {
    return null;
  }

  const driver = getDriver(trip.driverId);
  const notification = {
    id: buildId("ntf"),
    tripId,
    requestIds: [],
    audienceRoles: ["client"],
    audienceUserIds: nearbyClients.map((user) => user.id),
    eventType: "incoming_capacity_alert",
    title: "Tienes algo que enviar, un camion estara arribando en algunas horas",
    message: `${driver?.name || "Un chofer"} inicio ruta hacia ${formatRouteDestination(trip)}. Si necesitas enviar carga, ya puedes solicitar traslado para reservar hasta ${formatNumber(trip.availableM3 || 0)} m3.`,
    createdAt: timeline.tripStartedAt,
    status: "pending",
    destinationLocation: destinationGeo
  };

  state.notifications.unshift(notification);
  state.notifications = state.notifications.slice(0, 120);
  return notification;
}

async function ensureUserOperationalProfile(user) {
  if (!user || user.profileLocation?.lat || sessionStorage.getItem(`joathiva-geo-${user.id}`)) {
    return user?.profileLocation || getDefaultProfileLocation();
  }

  sessionStorage.setItem(`joathiva-geo-${user.id}`, "1");
  const profileLocation = await captureUserProfileLocation();
  if (!profileLocation.lat || !profileLocation.lng) {
    return user.profileLocation || getDefaultProfileLocation();
  }

  user.profileLocation = {
    ...getDefaultProfileLocation(),
    ...profileLocation
  };
  if (user.role === "client" && !user.notificationOrigin) {
    user.notificationOrigin = user.profileLocation.label || [user.profileLocation.city, user.profileLocation.country].filter(Boolean).join(", ");
    user.notificationsEnabled = true;
  }
  persistState();
  return user.profileLocation;
}

function getGoogleClientId() {
  return String(
    document.querySelector(`meta[name='${GOOGLE_SIGNIN_META_NAME}']`)?.getAttribute("content") ||
    window.JOATHIVA_GOOGLE_CLIENT_ID ||
    ""
  ).trim();
}

function loadGoogleIdentityScript() {
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;
  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src='${GOOGLE_IDENTITY_SCRIPT_URL}']`);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      if (window.google?.accounts?.id) resolve(window.google);
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return googleIdentityScriptPromise;
}

function renderGoogleAuthPlaceholder(container, message) {
  container.innerHTML = `
    <div class="google-auth-placeholder">
      <strong>Google Sign-In</strong>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

async function initGoogleAuthButtons() {
  const containers = Array.from(document.querySelectorAll("[data-google-auth]"));
  if (!containers.length) return;

  const clientId = getGoogleClientId();
  if (!clientId) {
    containers.forEach((container) => renderGoogleAuthPlaceholder(container, "Configura el Client ID OAuth de Google para habilitar este acceso."));
    return;
  }

  try {
    await loadGoogleIdentityScript();
    if (!window.google?.accounts?.id) {
      throw new Error("Google Identity Services no disponible");
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredentialResponse
    });

    containers.forEach((container) => {
      container.innerHTML = "";
      window.google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        shape: "pill",
        width: 320,
        text: "continue_with",
        logo_alignment: "left"
      });
    });
  } catch {
    containers.forEach((container) => renderGoogleAuthPlaceholder(container, "No se pudo cargar Google en este momento. Intenta nuevamente con conexion disponible."));
  }
}

async function handleGoogleCredentialResponse(response) {
  const payload = decodeGoogleCredential(response?.credential);
  if (!payload?.email) {
    window.alert("No fue posible validar el acceso con Google.");
    return;
  }

  if (document.body.dataset.page === "login") {
    await handleGoogleLogin(payload);
    return;
  }

  await handleGoogleRegister(payload);
}

function decodeGoogleCredential(credential) {
  try {
    const [, payload] = String(credential || "").split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = window.atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

async function handleGoogleLogin(payload) {
  let user = state.users.find((item) => item.googleSub === payload.sub) || findUserByEmail(payload.email);
  if (!user) {
    const profileLocation = await captureUserProfileLocation();
    user = buildBasicUserRecord({
      displayName: payload.name || payload.email,
      role: "client",
      company: payload.name || payload.email,
      email: payload.email,
      phone: "",
      password: "",
      termsAccepted: true,
      authProvider: "google",
      googleSub: payload.sub,
      avatarUrl: payload.picture || "",
      profileLocation,
      existingUsers: state.users
    });
    state.users.unshift(user);
  } else {
    user.googleSub = payload.sub;
    user.authProvider = "google";
    user.avatarUrl = payload.picture || user.avatarUrl || "";
    user = ensureOperationalUserDefaults(user);
  }

  persistState();
  startSession(user.id);
  window.location.href = getLandingRoute(user);
}

async function handleGoogleRegister(payload) {
  const form = document.querySelector("#registerForm");
  const role = String(form?.querySelector("select[name='role']")?.value || "client");
  if (!role) {
    window.alert("Selecciona primero el perfil a crear.");
    return;
  }

  const termsAccepted = form?.querySelector("input[name='termsAccepted']")?.checked;
  if (!termsAccepted) {
    window.alert("Debes aceptar los terminos y condiciones para continuar con Google.");
    return;
  }

  const existing = state.users.find((item) => item.googleSub === payload.sub) || findUserByEmail(payload.email);
  if (existing) {
    existing.googleSub = payload.sub;
    existing.authProvider = "google";
    existing.avatarUrl = payload.picture || existing.avatarUrl || "";
    persistState();
    startSession(existing.id);
    window.location.href = getLandingRoute(existing);
    return;
  }

  const profileLocation = await captureUserProfileLocation();
  const user = buildBasicUserRecord({
    displayName: String(form?.querySelector("input[name='displayName']")?.value || payload.name || payload.email).trim(),
    role,
    company: String(form?.querySelector("input[name='company']")?.value || payload.name || "").trim(),
    email: payload.email,
    phone: String(form?.querySelector("input[name='phone']")?.value || "").trim(),
    password: "",
    termsAccepted: true,
    authProvider: "google",
    googleSub: payload.sub,
    avatarUrl: payload.picture || "",
    profileLocation,
    existingUsers: state.users
  });

  state.users.unshift(user);
  persistState();
  startSession(user.id);
  window.location.href = getLandingRoute(user);
}

function getDefaultBankingData() {
  return {
    bankAccountHolder: "",
    bankName: "",
    bankAccountType: "",
    bankAccountNumber: "",
    bankSwift: ""
  };
}

function extractBankingDetails(formData) {
  return {
    bankAccountHolder: String(formData.get("bankAccountHolder") || "").trim(),
    bankName: String(formData.get("bankName") || "").trim(),
    bankAccountType: String(formData.get("bankAccountType") || "").trim(),
    bankAccountNumber: String(formData.get("bankAccountNumber") || "").trim(),
    bankSwift: String(formData.get("bankSwift") || "").trim()
  };
}

function hasRequiredProviderBanking(bankingDetails) {
  return Boolean(bankingDetails.bankAccountHolder && bankingDetails.bankName && bankingDetails.bankAccountNumber);
}

function getTrackingStatusLabel(trip) {
  if (trip?.trackingStatus === "active") return "GPS en vivo";
  if (trip?.trackingStatus === "completed") return "Viaje finalizado";
  if (trip?.trackingStatus === "paused") return "GPS pausado";
  return "Pendiente de inicio";
}

function getPaymentStatusLabel(status) {
  if (status === "habilitado_cobro") return "Cobro habilitado por entrega finalizada";
  return "Pendiente de entrega";
}

function getSettlementStatusLabel(status) {
  if (status === "habilitado_pago_proveedor") return "Pago a proveedor habilitado";
  return "Pendiente de pago cliente";
}

function buildId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getLandingRoute(user) {
  return user.role === "master" ? "admin.html" : "index.html";
}

function getRoleLabel(role) {
  if (role === "master") return "Maestro";
  if (role === "ops_finance") return "Operativo y contable";
  if (role === "billing_admin") return "Facturacion / Administracion";
  if (role === "provider") return "Proveedor";
  if (role === "broker") return "Despachante";
  return "Cliente";
}

function getUserTitle(user) {
  return String(user?.jobTitle || "").trim() || getRoleLabel(user?.role);
}

function renderSelectOptions(values, selectedValue, titleCase = false) {
  return values.map((value) => {
    const selected = value === selectedValue ? " selected" : "";
    const label = titleCase ? getRoleLabel(value) : value.toUpperCase();
    return `<option value="${value}"${selected}>${escapeHtml(label)}</option>`;
  }).join("");
}

function renderEntityOptions(items, selectedId, labelKey) {
  return items.map((item) => {
    const selected = item.id === selectedId ? " selected" : "";
    return `<option value="${item.id}"${selected}>${escapeHtml(item[labelKey] || item.id)}</option>`;
  }).join("");
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
  if (!value) return "Pendiente";
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDateTimeOrPending(value) {
  return value ? formatDateTime(value) : "Pendiente";
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-UY").format(value || 0);
}

function formatFileSize(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${Math.round(bytes)} B`;
}

function roundCurrency(value) {
  return Math.round(Number(value || 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function initCollapsiblePanels(root = document) {
  root.querySelectorAll("[data-collapsible-panel]").forEach((panel, index) => {
    if (panel.dataset.collapsibleBound === "true") return;

    const heading = Array.from(panel.children).find((child) => child.classList?.contains("panel-heading"));
    if (!heading) return;

    const content = document.createElement("div");
    content.className = "collapsible-panel-body";
    content.id = panel.id ? `${panel.id}-content` : `collapsible-panel-${index + 1}`;

    const siblings = Array.from(panel.children).filter((child) => child !== heading);
    siblings.forEach((child) => content.appendChild(child));

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "collapsible-panel-toggle";
    toggle.setAttribute("aria-controls", content.id);

    const indicator = document.createElement("span");
    indicator.className = "collapsible-panel-indicator";
    indicator.innerHTML = `
      <span data-panel-label>Ocultar</span>
      <span class="collapsible-panel-chevron" aria-hidden="true"></span>
    `;

    toggle.appendChild(heading);
    toggle.appendChild(indicator);
    toggle.addEventListener("click", () => {
      setCollapsiblePanelState(panel, content, toggle, panel.dataset.panelCollapsed === "true");
    });

    panel.appendChild(toggle);
    panel.appendChild(content);
    panel.dataset.collapsibleBound = "true";

    const shouldOpen = panel.dataset.panelOpen !== "false";
    setCollapsiblePanelState(panel, content, toggle, shouldOpen);
  });
}

function setCollapsiblePanelState(panel, content, toggle, isOpen) {
  panel.dataset.panelCollapsed = isOpen ? "false" : "true";
  panel.classList.toggle("is-collapsed", !isOpen);
  content.hidden = !isOpen;
  toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  const label = toggle.querySelector("[data-panel-label]");
  if (label) {
    label.textContent = isOpen ? "Ocultar" : "Desplegar";
  }
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = String(value);
}

function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function toggleHomeByRole(user) {
  showElements("[data-provider-only]", user?.role === "provider");
  showElements("[data-client-only]", user?.role === "client");
  showElements("[data-broker-only]", user?.role === "broker");
  showElements("[data-master-only]", user?.role === "master");
  showElements("[data-marketing-only]", canAccessMarketing(user));
  showElements("[data-accounting-only]", canAccessAccountingDashboard(user));
  showElements("[data-mailbox-only]", canUseAdminMailbox(user));
  showElements("[data-guest-only]", !user);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
