import {
  state,
  saveState,
  setSession,
  clearSession,
  setSetting,
  exportLocalBackup,
  importLocalBackup,
  CRM_STAGES,
  LEAD_SOURCES,
  TASK_PRIORITIES,
  TASK_STATUS,
  OPERATION_TYPES,
  OPERATION_WORKFLOW_STATES,
  OPERATION_RISK_LEVELS,
  OPERATION_CHECKLIST_ITEMS,
  TRANSPORT_MODES,
  CURRENCIES,
  COUNTRIES,
  CUSTOMER_TYPES,
  PROVIDER_UNIT_TYPES,
  PROVIDER_UNIT_TYPE_LABELS,
  PROVIDER_AVAILABILITY,
  PROVIDER_COVERAGE_AREAS,
  PROVIDER_COVERAGE_OPTIONS,
  QUOTE_DEFAULT_MARGIN,
  EXTRA_HOURS_USD,
  CUSTOMS_STAY_USD,
  IVA_RATE,
  calculateQuote,
  validateCrmRecord,
  validateQuoteRecord,
  validateTaskRecord,
  validateCustomerRecord,
  validateProviderRecord,
  validateOperationRecord,
  upsertCrmRecord,
  upsertQuoteRecord,
  upsertTaskRecord,
  upsertOperationRecord,
  upsertCustomerRecord,
  upsertProviderRecord,
  getCrmById,
  getQuoteById,
  getTaskById,
  getOperationById,
  getCustomerById,
  getProviderById,
  listCrmRecords,
  listQuoteRecords,
  listTaskRecords,
  listOperationRecords,
  listCustomerRecords,
  listProviderRecords,
  getCustomerActivityFeed,
  getOperationChecklistProgress,
  getOperationAlerts,
  getOperationActivityFeed,
  getDashboardMetrics,
  normalizeText,
  roundMoney,
  toNumber
} from "./core.js";

const appMain = document.getElementById("appMain");
const appNav = document.getElementById("appNav");
const headerContext = document.getElementById("headerContext");
const shellStatus = document.getElementById("shellStatus");

const BASE_NAV_ITEMS = [
  { route: "home", label: "Inicio" },
  { route: "crm", label: "CRM" },
  { route: "quote", label: "Cotizador" },
  { route: "agenda", label: "Agenda" },
  { route: "operations", label: "Operaciones" },
  { route: "providers", label: "Proveedores" },
  { route: "customer", label: "Cliente" },
  { route: "menu", label: "Menu" }
];

const PROVIDER_PORTAL_NAV_ITEMS = [
  { route: "home", label: "Inicio" },
  { route: "provider", label: "Perfil" },
  { route: "menu", label: "Menu" }
];

const uiState = {
  crmStage: "all",
  crmQuery: "",
  agendaFilter: "all",
  quoteCurrencyFilter: "all",
  quoteCustomerFilter: "all",
  quoteQuery: "",
  operationQuery: "",
  operationStateFilter: "all",
  operationRiskFilter: "all",
  operationCustomerId: "",
  customerId: "",
  customerQuery: "",
  providerQuery: "",
  providerConfigQuery: "",
  providerTypeFilter: "all",
  providerAvailabilityFilter: "all",
  providerPortalId: "",
  providerTripFeedback: null,
  providerUploadFeedback: null,
  backupFeedback: null,
  quoteDraft: createDefaultQuoteDraft(),
  taskOperationId: "",
  taskCustomerId: ""
};

boot();

function boot() {
  if (!location.hash) {
    location.hash = state.session.active ? "#home" : "#access";
  }

  bindGlobalEvents();
  renderApp();
}

function bindGlobalEvents() {
  window.addEventListener("hashchange", renderApp);
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("submit", handleDocumentSubmit);
  document.addEventListener("input", handleDocumentInput);
  document.addEventListener("change", handleDocumentChange);
}

function handleDocumentClick(event) {
  const target = event.target.closest("[data-route], [data-action]");
  if (!target) return;

  const route = target.getAttribute("data-route");
  if (route) {
    event.preventDefault();
    navigate(route);
    return;
  }

  const action = target.getAttribute("data-action");
  if (!action) return;

  event.preventDefault();
  switch (action) {
    case "enter-app":
      const selectedRole = target.getAttribute("data-role") || "commercial_ops";
      setSession({
        userName: selectedRole === "provider" ? "Proveedor" : "Equipo comercial",
        role: selectedRole
      });
      navigate("home");
      break;
    case "logout":
      clearSession();
      navigate("access");
      break;
    case "crm-filter":
      uiState.crmStage = target.getAttribute("data-value") || "all";
      renderApp(false);
      break;
    case "agenda-filter":
      uiState.agendaFilter = target.getAttribute("data-value") || "all";
      renderApp(false);
      break;
    case "quote-currency-filter":
      uiState.quoteCurrencyFilter = target.getAttribute("data-value") || "all";
      renderApp(false);
      break;
    case "quote-customer-filter":
      uiState.quoteCustomerFilter = target.getAttribute("data-value") || "all";
      renderApp(false);
      break;
    case "operation-state-filter":
      uiState.operationStateFilter = target.getAttribute("data-value") || "all";
      renderApp(false);
      break;
    case "operation-risk-filter":
      uiState.operationRiskFilter = target.getAttribute("data-value") || "all";
      renderApp(false);
      break;
    case "mark-task-done":
      markTaskDone(target.getAttribute("data-id"));
      break;
    case "new-operation-for-client":
      uiState.operationCustomerId = target.getAttribute("data-customer-id") || "";
      navigate("operations/new");
      break;
    case "new-task-for-operation": {
      const operationId = target.getAttribute("data-operation-id") || "";
      const operation = getOperationById(operationId);
      uiState.taskOperationId = operationId;
      uiState.taskCustomerId = operation?.clientId || "";
      navigate("agenda");
      break;
    }
    case "export-backup":
      exportBackupJson();
      break;
    case "clear-backup-feedback":
      uiState.backupFeedback = null;
      renderApp(false);
      break;
    default:
      break;
  }
}

function handleDocumentSubmit(event) {
  const form = event.target.closest("form");
  if (!form) return;

  const formKind = form.getAttribute("data-form");
  if (!formKind) return;

  event.preventDefault();

  switch (formKind) {
    case "crm":
      saveCrmForm(form);
      break;
    case "quote":
      saveQuoteForm(form);
      break;
    case "task":
      saveTaskForm(form);
      break;
    case "operation":
      saveOperationForm(form);
      break;
    case "customer":
      saveCustomerForm(form);
      break;
    case "provider":
      saveProviderForm(form);
      break;
    case "provider-ops":
      saveProviderOperationalForm(form);
      break;
    case "provider-trip":
      saveProviderTripForm(form);
      break;
    case "backup-import":
      importBackupForm(form);
      break;
    default:
      break;
  }
}

function handleDocumentInput(event) {
  if (event.target instanceof HTMLElement) {
    clearFieldError(event.target);
  }

  const form = event.target.closest("form[data-form='quote']");
  if (form) {
    syncQuoteDraftFromForm(form);
    updateQuotePreview(form);
    return;
  }

  const crmSearch = event.target.closest("[data-search='crm']");
  if (crmSearch) {
    uiState.crmQuery = crmSearch.value;
    renderApp(false);
    return;
  }

  const quoteSearch = event.target.closest("[data-search='quote']");
  if (quoteSearch) {
    uiState.quoteQuery = quoteSearch.value;
    renderApp(false);
    return;
  }

  const operationSearch = event.target.closest("[data-search='operation']");
  if (operationSearch) {
    uiState.operationQuery = operationSearch.value;
    renderApp(false);
    return;
  }

  const customerSearch = event.target.closest("[data-search='customer']");
  if (customerSearch) {
    uiState.customerQuery = customerSearch.value;
    renderApp(false);
    return;
  }

  const providerSearch = event.target.closest("[data-search='provider']");
  if (providerSearch) {
    uiState.providerQuery = providerSearch.value;
    renderApp(false);
    return;
  }

  const providerConfigSearch = event.target.closest("[data-search='provider-config']");
  if (providerConfigSearch) {
    uiState.providerConfigQuery = providerConfigSearch.value;
    renderApp(false);
  }
}

function handleDocumentChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  clearFieldError(target);

  if (target.matches("[data-select='customer']")) {
    const id = target.value || "";
    uiState.customerId = id;
    navigate(id ? `customer/${id}` : "customer");
    return;
  }

  if (target.matches("[data-select='provider-type']")) {
    uiState.providerTypeFilter = target.value || "all";
    renderApp(false);
    return;
  }

  if (target.matches("[data-select='provider-availability']")) {
    uiState.providerAvailabilityFilter = target.value || "all";
    renderApp(false);
    return;
  }

  if (target.matches("[data-select='provider-portal']")) {
    uiState.providerPortalId = target.value || "";
    navigate(uiState.providerPortalId ? `provider/${uiState.providerPortalId}` : "provider");
    return;
  }

  if (target.matches("[data-provider-upload]")) {
    if (target.files && target.files[0]) {
      saveProviderUploadFile(target);
    }
    return;
  }

  if (target.matches("[data-field='task-operation']")) {
    const operationId = target.value || "";
    const operation = getOperationById(operationId);
    uiState.taskOperationId = operationId;
    uiState.taskCustomerId = operation?.clientId || "";
    const form = target.closest("form");
    if (form) {
      const customerSelect = form.querySelector("[name='customerId']");
      if (customerSelect instanceof HTMLSelectElement && operation?.clientId) {
        customerSelect.value = operation.clientId;
      }
    }
    return;
  }

  if (target.matches("[data-field='quote-currency']")) {
    uiState.quoteDraft.currency = target.value || "USD";
    if (target.value === "UYU") {
      uiState.quoteDraft.exchangeRate = uiState.quoteDraft.exchangeRate || state.settings.exchangeRateUyu || 1;
    } else {
      uiState.quoteDraft.exchangeRate = 1;
    }
    updateQuotePreview(target.closest("form"));
    return;
  }

  if (target.matches("[data-field='quote-exchange-rate']")) {
    state.settings.exchangeRateUyu = Math.max(1, toNumber(target.value) || 1);
    setSetting("exchangeRateUyu", state.settings.exchangeRateUyu);
    updateQuotePreview(target.closest("form"));
  }
}

function renderApp(renderShell = true) {
  const route = resolveRoute();

  if (!state.session.active && route.name !== "access") {
    if (location.hash !== "#access") {
      location.hash = "#access";
    }
    if (renderShell) {
      renderShellFrame("access");
      appMain.innerHTML = renderAccessScreen();
    }
    return;
  }

  if (renderShell) {
    renderShellFrame(route.name);
  }

  appMain.innerHTML = renderRoute(route);

  if (route.name === "quote" || route.name === "quote-detail") {
    updateQuotePreview(document.querySelector("form[data-form='quote']"));
  }
}

function isCommercialOpsRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "commercial_ops" || normalized === "comercial" || normalized === "comercial operativo";
}

function isProviderRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "provider" || normalized === "proveedor";
}

function getSessionRoleLabel(role) {
  if (isCommercialOpsRole(role)) return "Comercial operativo";
  if (isProviderRole(role)) return "Proveedor";
  return String(role || "Acceso inicial");
}

function getNavItems() {
  if (isProviderRole(state.session.role)) {
    return PROVIDER_PORTAL_NAV_ITEMS;
  }
  return BASE_NAV_ITEMS;
}

function renderShellFrame(routeName) {
  const currentBase = getRouteBase(routeName);
  const navItems = getNavItems();

  appNav.innerHTML = navItems.map(({ route, label }) => {
    const active = currentBase === route;
    return `<button type="button" class="nav-link${active ? " is-active" : ""}" data-route="${escapeHtml(route)}">${escapeHtml(label)}</button>`;
  }).join("");

  const metrics = getDashboardMetrics();
  const sessionLabel = state.session.active
    ? `${state.session.userName} | ${getSessionRoleLabel(state.session.role)}`
    : "Acceso inicial";

  headerContext.innerHTML = [
    `<span class="status-chip status-chip--primary">${escapeHtml(sessionLabel)}</span>`,
    `<span class="status-chip">${metrics.crmCount} CRM</span>`,
    `<span class="status-chip">${metrics.quoteCount} cotizaciones</span>`,
    `<span class="status-chip">${metrics.taskCount} tareas abiertas</span>`,
    `<span class="status-chip">${metrics.operationCount || 0} operaciones</span>`,
    `<span class="status-chip">${metrics.providerCount || 0} proveedores</span>`
  ].join("");

  shellStatus.innerHTML = `
    <span><strong>Fuente editable:</strong> V</span>
    <span><strong>Bundle Android:</strong> assets/www derivado</span>
    <span><strong>Persistencia:</strong> localStorage</span>
    <span><strong>Estado:</strong> ${navigator.onLine ? "en linea" : "sin conexion"}</span>
  `;

  document.title = `JoathiVA V1 | ${getRouteTitle(routeName)}`;
}

function renderRoute(route) {
  switch (route.name) {
    case "access":
      return renderAccessScreen();
    case "home":
      return renderHomeScreen();
    case "crm":
      return renderCrmListScreen();
    case "crm-new":
      return renderCrmFormScreen();
    case "crm-edit":
      return renderCrmFormScreen(route.id);
    case "crm-detail":
      return renderCrmDetailScreen(route.id);
    case "quote":
      return renderQuoteFormScreen();
    case "quote-edit":
      return renderQuoteFormScreen(route.id);
    case "quote-detail":
      return renderQuoteDetailScreen(route.id);
    case "quotes":
      return renderQuotesHistoryScreen();
    case "agenda":
      return renderAgendaScreen();
    case "agenda-edit":
      return renderAgendaScreen(route.id);
    case "agenda-detail":
      return renderTaskDetailScreen(route.id);
    case "operations":
      return renderOperationsScreen();
    case "operations-new":
      return renderOperationFormScreen();
    case "operations-edit":
      return renderOperationFormScreen(route.id);
    case "operations-detail":
      return renderOperationDetailScreen(route.id);
    case "providers":
      return renderProvidersScreen();
    case "providers-new":
      return renderProviderFormScreen();
    case "providers-edit":
      return renderProviderFormScreen(route.id);
    case "providers-detail":
      return renderProviderDetailScreen(route.id);
    case "provider":
      return renderProviderPortalScreen(route.id);
    case "customer":
      return renderCustomerScreen(route.id);
    case "menu":
      return renderMenuScreen();
    default:
      return renderNotFoundScreen();
  }
}

function renderAccessScreen() {
  return `
    <section class="page">
      <div class="page-hero">
        <div class="hero-copy">
          <p class="eyebrow">Acceso inicial</p>
          <h1>Operacion comercial con control real.</h1>
          <p>
            JoathiVA V1 centraliza CRM, cotizaciones, agenda, proveedores y ficha de cliente en una experiencia premium,
            limpia y pensada para vender mas con menos friccion.
          </p>
          <div class="hero-actions">
            <button type="button" class="btn btn--accent" data-action="enter-app" data-role="commercial_ops">Entrar al perfil comercial operativo</button>
            <button type="button" class="btn btn--secondary" data-action="enter-app" data-role="provider">Entrar al perfil proveedor</button>
            <button type="button" class="btn btn--secondary" data-route="menu">Ver menu</button>
          </div>
        </div>
        <div class="surface-card surface-card--dark">
          <div class="stack">
            <div class="detail-stat">
              <strong>Foco comercial</strong>
              <span>Respuesta rapida, cotizacion clara y seguimiento confiable.</span>
            </div>
            <div class="detail-stat">
              <strong>Base reusable</strong>
              <span>Arquitectura web modular preparada para Android y futura extension iOS.</span>
            </div>
            <div class="detail-stat">
              <strong>Operacion ordenada</strong>
              <span>Datos persistentes en localStorage y bundle Android derivado desde V.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderHomeScreen() {
  const metrics = getDashboardMetrics();
  if (isCommercialOpsRole(state.session.role)) {
    return renderCommercialOpsScreen(metrics);
  }
  if (isProviderRole(state.session.role)) {
    return renderProviderPortalScreen(metrics);
  }
  const latestTask = metrics.urgentTasks[0];
  const latestQuote = metrics.recentQuotes[0];

  return `
    <section class="page">
      <div class="page-hero">
        <div class="hero-copy">
          <p class="eyebrow">Dashboard ejecutivo</p>
          <h1>Control comercial y operativo en una sola vista.</h1>
          <p>
            La primera capa de JoathiVA V1 prioriza velocidad de respuesta, seguimiento y trazabilidad
            para que el equipo comercial trabaje con mas claridad.
          </p>
          <div class="hero-actions">
            ${routeButton("Nuevo prospecto", "crm/new", "primary")}
            ${routeButton("Nueva cotizacion", "quote", "accent")}
            ${routeButton("Abrir agenda", "agenda", "secondary")}
            ${routeButton("Operaciones", "operations", "secondary")}
          </div>
        </div>
        <div class="surface-card surface-card--dark">
          <div class="stack">
            <div class="detail-stat">
              <strong>${metrics.crmCount} oportunidades en CRM</strong>
              <span>${metrics.activeCustomers} clientes activos y ${metrics.openCrm} prospectos abiertos.</span>
            </div>
            <div class="detail-stat">
              <strong>${metrics.quoteCount} cotizaciones registradas</strong>
              <span>Margen objetivo base: ${QUOTE_DEFAULT_MARGIN}% con reglas Uruguay incluidas.</span>
            </div>
            <div class="detail-stat">
              <strong>${metrics.taskCount} tareas pendientes</strong>
              <span>${metrics.overdueTasks} vencidas y ${metrics.dueToday} con compromiso para hoy.</span>
            </div>
            <div class="detail-stat">
              <strong>${metrics.operationCount || 0} operaciones activas</strong>
              <span>${metrics.atRiskOperations || 0} en riesgo y ${metrics.openOperations || 0} expedientes abiertos.</span>
            </div>
          </div>
        </div>
      </div>

      ${renderMetricGrid([
        { label: "Prospectos abiertos", value: metrics.openCrm, meta: "Etapas previas a cierre." },
        { label: "Cotizaciones", value: metrics.quoteCount, meta: "Historial comercial disponible." },
        { label: "Tareas abiertas", value: metrics.taskCount, meta: "Seguimiento y recordatorios." },
        { label: "Clientes activos", value: metrics.activeCustomers, meta: "Cuentas con continuidad." },
        { label: "Operaciones", value: metrics.operationCount || 0, meta: `${metrics.atRiskOperations || 0} en riesgo y control documental.` }
      ])}

      <div class="split-layout">
        <section class="surface-card">
          ${sectionHeader("Pipeline", "Etapas comerciales activas", "Vista rapida del avance por cada oportunidad.")}
          <div class="detail-grid">
            ${metrics.pipeline.map((item) => `
              <article class="detail-card">
                <div class="list-item__title">
                  <strong>${escapeHtml(item.stage)}</strong>
                  ${badge(String(item.count), item.count ? "info" : "neutral")}
                </div>
                <p>${item.count ? "Oportunidades vivas en esta etapa." : "Sin registros en esta etapa."}</p>
              </article>
            `).join("")}
          </div>
        </section>

        <section class="surface-card">
          ${sectionHeader("Siguientes acciones", "Lo que requiere atencion ahora", "Menos friccion, mas velocidad operativa.")}
          <div class="timeline">
            ${metrics.urgentTasks.length ? metrics.urgentTasks.map(renderTaskSummaryItem).join("") : emptyState("Sin tareas pendientes", "Todo esta en orden por ahora.")}
          </div>
          ${latestQuote ? `
            <div class="alert alert--info">
              <strong>Ultima cotizacion</strong>
              <p>${escapeHtml(latestQuote.cliente || latestQuote.empresa || "Sin cliente")} - ${escapeHtml(latestQuote.paisOrigen || "")} a ${escapeHtml(latestQuote.paisDestino || "")}.</p>
              ${routeButton("Ver historial", "quotes", "secondary")}
            </div>
          ` : ""}
          ${latestTask ? `
            <div class="alert alert--warning">
              <strong>Proxima tarea</strong>
              <p>${escapeHtml(latestTask.tarea)} - ${escapeHtml(latestTask.fechaCompromiso || "")}.</p>
              ${routeButton("Abrir tarea", `agenda/${latestTask.id}`, "secondary")}
            </div>
          ` : ""}
          ${metrics.operationAlerts?.[0] ? renderAlertCard(metrics.operationAlerts[0]) : ""}
        </section>
      </div>
    </section>
  `;
}

function renderCrmListScreen() {
  const records = filterCrmRecords();
  const selected = records[0] || listCrmRecords()[0] || null;

  return `
    <section class="page">
      <div class="section-title">
        <div>
          <p class="eyebrow">CRM comercial</p>
          <h2>Listado de oportunidades</h2>
          <p class="section-copy">Orden de trabajo para vender mas, responder mas rapido y no perder seguimiento.</p>
        </div>
        <div class="btn-row">
          ${routeButton("Nuevo prospecto", "crm/new", "primary")}
          ${routeButton("Ver menu", "menu", "secondary")}
        </div>
      </div>

      <div class="surface-card">
        <div class="filters-row">
          <input
            class="searchbar"
            data-search="crm"
            type="search"
            placeholder="Buscar cliente, empresa, contacto o proxima accion"
            value="${escapeHtml(uiState.crmQuery)}"
          >
          <div class="filters">
            ${filterChip("crm-filter", "all", "Todos", uiState.crmStage === "all")}
            ${CRM_STAGES.map((stage) => filterChip("crm-filter", stage, stage, uiState.crmStage === stage)).join("")}
          </div>
        </div>
      </div>

      <div class="split-layout">
        <section class="table-shell">
          <div class="table-toolbar">
            <div>
              <strong>${records.length} oportunidades</strong>
              <div class="section-copy">Registro vivo para el equipo comercial.</div>
            </div>
            ${routeButton("Nuevo", "crm/new", "accent")}
          </div>
          ${renderCrmTable(records)}
        </section>

        <section class="surface-card">
          ${selected ? renderCrmSummaryCard(selected) : emptyState("Sin oportunidades", "Crea el primer prospecto para empezar a trabajar el CRM.")}
        </section>
      </div>
    </section>
  `;
}

function renderCrmFormScreen(id = "") {
  const record = id ? getCrmById(id) : null;
  if (id && !record) {
    return renderNotFoundScreen("No encontramos ese CRM para editar.");
  }
  const defaults = buildCrmFormModel(record);
  const isEditing = Boolean(record?.id);

  return `
    <section class="page">
      <div class="section-title">
        <div>
          <p class="eyebrow">CRM</p>
          <h2>${isEditing ? "Editar prospecto / cliente" : "Nuevo prospecto / cliente"}</h2>
          <p class="section-copy">${isEditing ? "Actualiza el registro sin duplicar y conserva el historial comercial." : "Captura rapida para no perder contexto comercial ni el hilo del seguimiento."}</p>
        </div>
        <div class="btn-row">
          ${routeButton("Volver al listado", "crm", "secondary")}
          ${isEditing ? routeButton("Ver detalle", `crm/${record.id}`, "ghost") : ""}
          ${routeButton("Abrir agenda", "agenda", "ghost")}
        </div>
      </div>

      <div class="split-layout">
        <section class="surface-card">
          <form class="form-grid" data-form="crm">
            <input type="hidden" name="id" value="${escapeHtml(defaults.id)}">
            <input type="hidden" name="createdAt" value="${escapeHtml(defaults.createdAt)}">
            <input type="hidden" name="customerId" value="${escapeHtml(defaults.customerId)}">

            ${field("Nombre cliente/prospecto", "nombre", defaults.nombre, "Nombre visible en el CRM", "6")}
            ${field("Empresa", "empresa", defaults.empresa, "Razon social o nombre comercial", "6")}
            ${field("Contacto", "contacto", defaults.contacto, "Persona de referencia", "6")}
            ${field("Telefono", "telefono", defaults.telefono, "Numero principal de contacto", "6")}
            ${field("Email", "email", defaults.email, "Correo de contacto", "6")}
            ${selectField("Origen del lead", "origenLead", LEAD_SOURCES, defaults.origenLead, "6")}
            ${field("Ejecutivo responsable", "ejecutivo", defaults.ejecutivo, "Quien sigue la oportunidad", "6")}
            ${selectField("Etapa / pipeline", "etapa", CRM_STAGES, defaults.etapa, "6")}
            ${field("Ultima interaccion", "ultimaInteraccion", defaults.ultimaInteraccion, "Fecha y hora", "6", "datetime-local")}
            ${field("Proxima accion", "proximaAccion", defaults.proximaAccion, "Siguiente paso comercial", "6")}
            ${field("Fecha de seguimiento", "fechaSeguimiento", defaults.fechaSeguimiento, "Cuando vuelve a tocar", "6", "date")}
            ${selectField("Estado cliente", "estadoCliente", CUSTOMER_TYPES, defaults.estadoCliente, "6")}
            ${textareaField("Notas", "notas", defaults.notas, "Contexto clave para responder mejor", "12")}

            <div class="field field--full">
              <div class="btn-row">
                <button type="submit" class="btn btn--primary">${isEditing ? "Guardar cambios" : "Guardar prospecto"}</button>
                ${routeButton("Cancelar", "crm", "secondary")}
              </div>
            </div>
          </form>
        </section>

        <aside class="surface-card">
          ${sectionHeader("Ficha rapida", "Impacto de la oportunidad", "Resumen comercial para ejecutar sin ruido.")}
          <div class="stack">
            <div class="detail-stat">
              <strong>${isEditing ? "Edicion activa" : "Nuevo registro"}</strong>
              <span>${isEditing ? "Se conservara la ficha de cliente y el historial vinculado." : "Se creara ficha de cliente asociada al guardar."}</span>
            </div>
            <div class="detail-stat">
              <strong>Seguimiento</strong>
              <span>La proxima accion debe quedar visible desde el inicio.</span>
            </div>
            <div class="detail-stat">
              <strong>Objetivo</strong>
              <span>Responder mas rapido y vender con mas orden.</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderCrmDetailScreen(id) {
  const record = getCrmById(id);
  if (!record) return renderNotFoundScreen("No encontramos esa oportunidad.");
  const customer = getCustomerById(record.customerId);
  const customerQuotes = customer ? listQuoteRecords().filter((quote) => quote.customerId === customer.id) : [];
  const customerTasks = customer ? listTaskRecords().filter((task) => task.customerId === customer.id) : [];

  return `
    <section class="page">
      <div class="page-hero">
        <div class="hero-copy">
          <p class="eyebrow">CRM detalle</p>
          <h1>${escapeHtml(record.nombre)}</h1>
          <p>${escapeHtml(record.empresa)} | ${escapeHtml(record.contacto)} | ${escapeHtml(record.proximaAccion || "Sin proxima accion")}</p>
          <div class="hero-actions">
            ${routeButton("Editar CRM", `crm/edit/${record.id}`, "accent")}
            ${routeButton("Nueva cotizacion", "quote", "primary")}
            <button type="button" class="btn btn--secondary" data-action="new-operation-for-client" data-customer-id="${escapeHtml(record.customerId || "")}">Nueva operacion</button>
            ${routeButton("Abrir cliente", `customer/${record.customerId}`, "secondary")}
            ${routeButton("Volver", "crm", "ghost")}
          </div>
        </div>
        <div class="surface-card surface-card--dark">
          <div class="stack">
            ${detailStat("Etapa", record.etapa)}
            ${detailStat("Ultima interaccion", formatDateTime(record.ultimaInteraccion))}
            ${detailStat("Seguimiento", record.fechaSeguimiento || "Sin fecha")}
          </div>
        </div>
      </div>

      <div class="split-layout">
        <section class="surface-card">
          ${sectionHeader("Datos comerciales", "Trazabilidad completa", "Vista de trabajo para equipo comercial y direccion.")}
          <div class="detail-grid">
            ${miniDetail("Contacto", record.contacto)}
            ${miniDetail("Telefono", record.telefono)}
            ${miniDetail("Email", record.email)}
            ${miniDetail("Origen lead", record.origenLead)}
            ${miniDetail("Ejecutivo", record.ejecutivo)}
            ${miniDetail("Estado cliente", record.estadoCliente)}
          </div>
          <div class="alert alert--info">
            <strong>Notas</strong>
            <p>${escapeHtml(record.notas || "Sin notas")}</p>
          </div>
        </section>

        <aside class="surface-card">
          ${sectionHeader("Relacion", "Cliente y actividad", "Lo que ya existe vinculado a esta oportunidad.")}
          <div class="stack">
            ${customer ? `
              <div class="detail-stat">
                <strong>${escapeHtml(customer.empresa)}</strong>
                <span>${escapeHtml(customer.condicionesPactadas || "Sin condiciones pactadas")}</span>
              </div>
            ` : emptyState("Sin ficha de cliente", "Aun no hay ficha asociada.")}

            <div class="detail-stat">
              <strong>${customerQuotes.length} cotizaciones asociadas</strong>
              <span>Historial comercial relacionado.</span>
            </div>

            <div class="detail-stat">
              <strong>${customerTasks.length} tareas vinculadas</strong>
              <span>Seguimiento y recordatorios.</span>
            </div>
          </div>
        </aside>
      </div>

      <div class="detail-grid">
        <section class="surface-card">
          ${sectionHeader("Cotizaciones relacionadas", "Historial por cliente", "Comparativo rapido para vender con criterio.")}
          ${customerQuotes.length ? renderQuoteTable(customerQuotes) : emptyState("Sin cotizaciones", "No hay cotizaciones enlazadas a esta oportunidad.")}
        </section>
        <section class="surface-card">
          ${sectionHeader("Tareas relacionadas", "Seguimiento activo", "Lo que aun debe cerrarse o confirmarse.")}
          <div class="timeline">
            ${customerTasks.length ? customerTasks.map(renderTaskSummaryItem).join("") : emptyState("Sin tareas", "No hay acciones pendientes ligadas a este cliente.")}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderQuoteFormScreen(id = "") {
  const quoteRecord = id ? getQuoteById(id) : null;
  if (id && !quoteRecord) {
    return renderNotFoundScreen("No encontramos esa cotizacion para editar.");
  }
  const customerOptions = listCustomerRecords();
  if (!quoteRecord && uiState.quoteDraft?.id) {
    uiState.quoteDraft = createDefaultQuoteDraft();
  }
  const draft = quoteRecord ? buildQuoteDraftFromRecord(quoteRecord) : uiState.quoteDraft;
  uiState.quoteDraft = draft;
  const currentCalculation = calculateQuote(draft);
  const isEditing = Boolean(quoteRecord?.id);

  return `
    <section class="page">
      <div class="section-title">
        <div>
          <p class="eyebrow">Cotizador base</p>
          <h2>${isEditing ? "Editar cotizacion comercial" : "Nueva cotizacion comercial"}</h2>
          <p class="section-copy">${isEditing ? "Actualiza una cotizacion existente, recalcula y conserva el historial comercial." : "Estructura de facturacion con IVA sobre tramo nacional y margen objetivo configurable."}</p>
        </div>
        <div class="btn-row">
          ${routeButton("Historial", "quotes", "secondary")}
          ${isEditing ? routeButton("Ver detalle", `quote/${quoteRecord.id}`, "ghost") : ""}
          ${routeButton("Agenda", "agenda", "ghost")}
        </div>
      </div>

      <div class="split-layout">
        <section class="surface-card">
          <form class="form-grid" data-form="quote">
            <input type="hidden" name="id" value="${escapeHtml(draft.id || "")}">
            <input type="hidden" name="createdAt" value="${escapeHtml(draft.createdAt || "")}">
            ${selectField("Cliente", "customerId", customerOptions, draft.customerId || "", "6")}
            ${field("Origen", "origen", draft.origen || "", "Ciudad o puerto origen", "6")}
            ${field("Destino", "destino", draft.destino || "", "Ciudad o puerto destino", "6")}
            ${selectField("Pais origen", "paisOrigen", COUNTRIES, draft.paisOrigen || "Brasil", "6")}
            ${selectField("Pais destino", "paisDestino", COUNTRIES, draft.paisDestino || "Uruguay", "6")}
            ${selectField("Tipo de operacion", "tipoOperacion", OPERATION_TYPES, draft.tipoOperacion || "Importacion", "6")}
            ${selectField("Modo de transporte", "modoTransporte", TRANSPORT_MODES, draft.modoTransporte || "Terrestre", "6")}
            ${field("Proveedor", "proveedor", draft.proveedor || "", "Nombre del operador o carrier", "6")}
            ${field("Costo proveedor", "costoProveedor", draft.costoProveedor || "", "Costo base en la moneda elegida", "6", "number")}
            ${field("Gastos adicionales", "gastosAdicionales", draft.gastosAdicionales || "", "Peajes, handling, coordinacion", "4", "number")}
            ${field("Seguro", "seguro", draft.seguro || "", "Seguro de mercaderia", "4", "number")}
            ${field("Horas extra", "horasExtra", draft.horasExtra || 0, "Carga o descarga", "4", "number")}
            ${field("Estadia aduana dias", "estadiaAduanaDias", draft.estadiaAduanaDias || 0, "Dias facturables", "4", "number")}
            ${field("Margen objetivo %", "margenPct", draft.margenPct || QUOTE_DEFAULT_MARGIN, "Margen general", "4", "number")}
            ${selectField("Moneda", "currency", CURRENCIES, draft.currency || "USD", "4")}
            ${field("Tipo de cambio USD/UYU", "exchangeRate", draft.exchangeRate || state.settings.exchangeRateUyu || 1, "Usar solo si cotizas en UYU", "4", "number")}
            ${textareaField("Observaciones", "observaciones", draft.observaciones || "", "Notas para la oferta", "12")}
            <div class="field field--full">
              <div class="btn-row">
                <button type="submit" class="btn btn--primary">${isEditing ? "Guardar cambios" : "Guardar cotizacion"}</button>
                ${routeButton("Ver historial", "quotes", "secondary")}
              </div>
            </div>
          </form>
        </section>

        <aside class="quote-preview" data-quote-preview>
          ${renderQuotePreview(currentCalculation, draft)}
        </aside>
      </div>

      <section class="surface-card">
        ${sectionHeader(isEditing ? "Cotizacion vinculada" : "Historial reciente", isEditing ? "Registro actual y relacion comercial" : "Cotizaciones guardadas", isEditing ? "Este registro se actualiza sin duplicarse y mantiene su trazabilidad." : "Rapido acceso al registro comercial mas reciente.")}
        ${renderQuoteTable(listQuoteRecords().slice(0, 5))}
      </section>
    </section>
  `;
}

function renderQuoteDetailScreen(id) {
  const record = getQuoteById(id);
  if (!record) return renderNotFoundScreen("No encontramos esa cotizacion.");
  const calculation = record.calculation || calculateQuote(record);

  return `
    <section class="page">
      <div class="page-hero">
        <div class="hero-copy">
          <p class="eyebrow">Cotizacion guardada</p>
          <h1>${escapeHtml(record.cliente)}</h1>
          <p>${escapeHtml(record.paisOrigen)} a ${escapeHtml(record.paisDestino)} | ${escapeHtml(record.tipoOperacion)} | ${escapeHtml(record.modoTransporte)}</p>
          <div class="hero-actions">
            ${routeButton("Editar cotizacion", `quote/edit/${record.id}`, "accent")}
            ${routeButton("Nueva cotizacion", "quote", "primary")}
            ${routeButton("Ver historial", "quotes", "secondary")}
            ${routeButton("Abrir cliente", `customer/${record.customerId}`, "ghost")}
          </div>
        </div>
        <div class="surface-card surface-card--dark">
          <div class="stack">
            ${detailStat("Precio sugerido", formatMoney(calculation.suggestedPrice, calculation.currency))}
            ${detailStat("Margen", `${calculation.marginPct}%`)}
            ${detailStat("Regla", calculation.split.label)}
          </div>
        </div>
      </div>

      <div class="split-layout">
        <section class="surface-card">
          ${sectionHeader("Estructura de facturacion", "Detalle calculado", "Uso comercial y operativo para explicarle al cliente el criterio de precio.")}
          ${renderQuotePreview(calculation, record)}
        </section>

        <aside class="surface-card">
          ${sectionHeader("Datos de la oferta", "Resumen general", "Lo que se debe revisar antes de enviar.")}
          <div class="stack">
            ${miniDetail("Proveedor", record.proveedor)}
            ${miniDetail("Costo proveedor", formatMoney(record.costoProveedor, record.moneda))}
            ${miniDetail("Gastos adicionales", formatMoney(record.gastosAdicionales, record.moneda))}
            ${miniDetail("Seguro", formatMoney(record.seguro, record.moneda))}
            ${miniDetail("Observaciones", record.observaciones || "Sin observaciones")}
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderQuotesHistoryScreen() {
  const quotes = filterQuotesRecords();

  return `
    <section class="page">
      <div class="section-title">
        <div>
          <p class="eyebrow">Historial de cotizaciones</p>
          <h2>Registro comercial completo</h2>
          <p class="section-copy">Control de margen, moneda y criterio de facturacion en un solo lugar.</p>
        </div>
        <div class="btn-row">
          ${routeButton("Nueva cotizacion", "quote", "primary")}
          ${routeButton("Menu", "menu", "secondary")}
        </div>
      </div>

      <div class="surface-card">
        <div class="filters-row">
          <input
            class="searchbar"
            data-search="quote"
            type="search"
            placeholder="Buscar cliente, proveedor, ruta o tipo de operacion"
            value="${escapeHtml(uiState.quoteQuery)}"
          >
          <div class="filters">
            ${filterChip("quote-currency-filter", "all", "Todas", uiState.quoteCurrencyFilter === "all")}
            ${CURRENCIES.map((currency) => filterChip("quote-currency-filter", currency, currency, uiState.quoteCurrencyFilter === currency)).join("")}
          </div>
          <div class="filters">
            ${filterChip("quote-customer-filter", "all", "Todos los clientes", uiState.quoteCustomerFilter === "all")}
            ${listCustomerRecords().slice(0, 4).map((customer) => filterChip("quote-customer-filter", customer.id, customer.nombre, uiState.quoteCustomerFilter === customer.id)).join("")}
          </div>
        </div>
      </div>

      <div class="split-layout">
        <section class="table-shell">
          <div class="table-toolbar">
            <div>
              <strong>${quotes.length} cotizaciones</strong>
              <div class="section-copy">Busqueda por cliente, proveedor y ruta.</div>
            </div>
            ${routeButton("Nueva cotizacion", "quote", "accent")}
          </div>
          ${renderQuoteTable(quotes)}
        </section>
        <aside class="surface-card">
          ${sectionHeader("Reglas activas", "Base comercial V1", "La cotizacion usa splits y cargos fijos definidos para Uruguay.")}
          <div class="stack">
            ${miniDetail("Brasil -> Uruguay", "80% internacional / 20% nacional")}
            ${miniDetail("Operativa internacional", "Caso piloto Paraguay / rutas regionales")}
            ${miniDetail("Argentina -> Uruguay", "50% internacional / 50% nacional")}
            ${miniDetail("Chile -> Uruguay", "90% internacional / 10% nacional")}
            ${miniDetail("Horas extra", `${EXTRA_HOURS_USD} USD`)}
            ${miniDetail("Estadia aduana", `${CUSTOMS_STAY_USD} USD / dia`)}
            ${miniDetail("IVA nacional", `${Math.round(IVA_RATE * 100)}%`)}
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderOperationsScreen() {
  const operations = filterOperationRecords();
  const selected = operations[0] || null;
  const metrics = getDashboardMetrics();

  return `
    <section class="page">
      <div class="section-title">
        <div>
          <p class="eyebrow">Operaciones / Expedientes</p>
          <h2>Flujo real de contenedores y control documental</h2>
          <p class="section-copy">Seguimiento local-first para arribo, camión, NCM, DUA, devolucion y trazabilidad por cliente.</p>
        </div>
        <div class="btn-row">
          ${routeButton("Nueva operacion", "operations/new", "primary")}
          ${routeButton("Menu", "menu", "secondary")}
        </div>
      </div>

      ${renderMetricGrid([
        { label: "Operaciones activas", value: metrics.openOperations || 0, meta: "Expedientes abiertos y en seguimiento." },
        { label: "En riesgo", value: metrics.atRiskOperations || 0, meta: "Atencion prioritaria por estado o riesgo." },
        { label: "Alertas vigentes", value: metrics.operationAlerts?.length || 0, meta: "Arribo, camión, DUA y devolucion." },
        { label: "Cerradas", value: metrics.closedOperations || 0, meta: "Expedientes ya finalizados." }
      ])}

      <div class="surface-card">
        <div class="filters-row">
          <input
            class="searchbar"
            data-search="operation"
            type="search"
            placeholder="Buscar referencia, DUA, contenedor, cliente, origen, destino o despachante"
            value="${escapeHtml(uiState.operationQuery)}"
          >
          <div class="filters">
            ${filterChip("operation-state-filter", "all", "Todas", uiState.operationStateFilter === "all")}
            ${OPERATION_WORKFLOW_STATES.map((state) => filterChip("operation-state-filter", state, state, uiState.operationStateFilter === state)).join("")}
          </div>
          <div class="filters">
            ${filterChip("operation-risk-filter", "all", "Todos los riesgos", uiState.operationRiskFilter === "all")}
            ${OPERATION_RISK_LEVELS.map((risk) => filterChip("operation-risk-filter", risk, risk, uiState.operationRiskFilter === risk)).join("")}
          </div>
        </div>
      </div>

      <div class="split-layout">
        <section class="table-shell">
          <div class="table-toolbar">
            <div>
              <strong>${operations.length} operaciones</strong>
              <div class="section-copy">Control por cliente, referencia, estado y riesgo.</div>
            </div>
            ${routeButton("Nueva operacion", "operations/new", "accent")}
          </div>
          ${renderOperationTable(operations)}
        </section>

        <aside class="surface-card">
          ${selected ? renderOperationSummaryCard(selected) : emptyState("Sin operaciones", "Crea el primer expediente para empezar a seguir el flujo.")}
          ${sectionHeader("Alertas", "Seguimiento inmediato", "Lo que requiere atencion hoy por arribo, documentos o devolucion.")}
          <div class="stack">
            ${metrics.operationAlerts?.length ? metrics.operationAlerts.slice(0, 4).map((alert) => renderAlertCard(alert)).join("") : emptyState("Sin alertas", "No hay alertas activas por ahora.")}
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderOperationFormScreen(id = "") {
  const operationRecord = id ? getOperationById(id) : null;
  if (id && !operationRecord) {
    return renderNotFoundScreen("No encontramos esa operacion para editar.");
  }

  const defaults = buildOperationFormModel(operationRecord);
  const isEditing = Boolean(operationRecord?.id);
  const customerOptions = listCustomerRecords();
  const operationHint = uiState.operationCustomerId && !isEditing
    ? getCustomerById(uiState.operationCustomerId)
    : null;
  const customerLabel = operationHint ? operationHint.empresa || operationHint.nombre : "";
  const checklistProgress = getOperationChecklistProgress(operationRecord || defaults);

  return `
    <section class="page">
      <div class="section-title">
        <div>
          <p class="eyebrow">Operaciones / Expedientes</p>
          <h2>${isEditing ? "Editar operacion" : "Nueva operacion"}</h2>
          <p class="section-copy">${isEditing ? "Actualiza el expediente sin duplicar y conserva la trazabilidad completa." : "Alta rapida para seguir expedientes logisticos con control documental y alertas."}</p>
        </div>
        <div class="btn-row">
          ${routeButton("Volver al listado", "operations", "secondary")}
          ${isEditing ? routeButton("Ver detalle", `operations/${operationRecord.id}`, "ghost") : ""}
          ${routeButton("Abrir agenda", "agenda", "ghost")}
        </div>
      </div>

      <div class="split-layout">
        <section class="surface-card">
          ${operationHint ? `
            <div class="alert alert--info">
              <strong>Cliente preseleccionado</strong>
              <p>${escapeHtml(customerLabel)}. Puedes ajustar el cliente antes de guardar.</p>
            </div>
          ` : ""}
          <form class="form-grid" data-form="operation">
            <input type="hidden" name="id" value="${escapeHtml(defaults.id)}">
            <input type="hidden" name="createdAt" value="${escapeHtml(defaults.createdAt)}">
            ${selectField("Cliente", "clientId", customerOptions, defaults.clientId || uiState.operationCustomerId || "", "6", "Seleccionar cliente")}
            ${selectField("Tipo de operacion", "tipoOperacion", OPERATION_TYPES, defaults.tipoOperacion || "Exportacion", "6")}
            ${field("Referencia", "referencia", defaults.referencia || "", "Referencia operativa", "6")}
            ${field("DUA", "dua", defaults.dua || "", "Numero DUA si ya fue recibido", "6")}
            ${field("Contenedor", "contenedor", defaults.contenedor || "", "Codigo del contenedor", "6")}
            ${field("Origen", "origen", defaults.origen || "", "Origen del flujo", "6")}
            ${field("Destino", "destino", defaults.destino || "", "Destino del flujo", "6")}
            ${field("Fecha de arribo", "fechaArribo", defaults.fechaArribo || "", "Fecha prevista o detectada", "4", "date")}
            ${field("Fecha de carga", "fechaCarga", defaults.fechaCarga || "", "Fecha de carga", "4", "date")}
            ${field("Fecha de devolucion", "fechaDevolucion", defaults.fechaDevolucion || "", "Fecha de devolucion o cierre", "4", "date")}
            ${field("Polo logistico", "poloLogistico", defaults.poloLogistico || "", "Base o punto logistico", "6")}
            ${field("Despachante origen / local", "despachanteUY", defaults.despachanteUY || "", "Despachante / broker local o de origen", "6")}
            ${field("Despachante responsable", "despachantePY", defaults.despachantePY || "", "Despachante / broker de la operacion", "6")}
            ${selectField("Estado de operacion", "estadoOperacion", OPERATION_WORKFLOW_STATES, defaults.estadoOperacion || "Arribo detectado", "6")}
            ${selectField("Riesgo", "riesgo", OPERATION_RISK_LEVELS, defaults.riesgo || "Bajo", "6")}
            ${textareaField("Observaciones", "observaciones", defaults.observaciones || "", "Notas de control y seguimiento", "12")}

            <div class="field field--full">
              <div class="section-title">
                <div>
                  <p class="eyebrow">Checklist documental</p>
                  <h3>Control de documentos por operacion</h3>
                </div>
                <p class="section-copy">Marca lo que ya fue confirmado. La persistencia queda local-first y reusable para backend despues.</p>
              </div>
              <div class="checklist-grid">
                ${OPERATION_CHECKLIST_ITEMS.map((item) => checklistItem(item, defaults.documentChecklist?.[item.key])).join("")}
              </div>
            </div>

            <div class="field field--full">
              <div class="btn-row">
                <button type="submit" class="btn btn--primary">${isEditing ? "Guardar cambios" : "Guardar operacion"}</button>
                ${routeButton("Cancelar", "operations", "secondary")}
              </div>
            </div>
          </form>
        </section>

        <aside class="surface-card">
          ${sectionHeader("Control rapido", "Estado de la operacion", "Resumen operativo para validar antes de cerrar cambios.")}
          <div class="stack">
            ${detailStat("Estado", defaults.estadoOperacion || "Sin estado")}
            ${detailStat("Riesgo", defaults.riesgo || "Sin riesgo")}
            ${detailStat("Checklist", `${checklistProgress.completed}/${checklistProgress.total}`)}
            ${detailStat("Cliente", customerLabel || "Sin cliente")}
          </div>
          ${operationRecord ? `
            <div class="alert alert--info">
              <strong>Operacion actual</strong>
              <p>${escapeHtml(operationRecord.referencia || operationRecord.contenedor || "Sin referencia")} | ${escapeHtml(operationRecord.origen || "")} -> ${escapeHtml(operationRecord.destino || "")}</p>
              ${routeButton("Ver detalle", `operations/${operationRecord.id}`, "secondary")}
            </div>
          ` : ""}
        </aside>
      </div>
    </section>
  `;
}

function renderOperationDetailScreen(id) {
  const operation = getOperationById(id);
  if (!operation) return renderNotFoundScreen("No encontramos esa operacion.");
  const customer = getCustomerById(operation.clientId);
  const checklistProgress = getOperationChecklistProgress(operation);
  const alerts = getOperationAlerts(operation);
  const linkedTasks = listTaskRecords().filter((task) => task.operationId === operation.id);
  const activity = getOperationActivityFeed(operation.id);

  return `
    <section class="page">
      <div class="page-hero">
        <div class="hero-copy">
          <p class="eyebrow">Ficha de operacion</p>
          <h1>${escapeHtml(operation.referencia || operation.contenedor || "Operacion")}</h1>
          <p>${escapeHtml(customer?.empresa || customer?.nombre || "Sin cliente")} | ${escapeHtml(operation.origen || "")} -> ${escapeHtml(operation.destino || "")} | ${escapeHtml(operation.estadoOperacion)}</p>
          <div class="hero-actions">
            ${routeButton("Editar operacion", `operations/edit/${operation.id}`, "accent")}
            <button type="button" class="btn btn--secondary" data-action="new-task-for-operation" data-operation-id="${escapeHtml(operation.id)}">Crear tarea asociada</button>
            ${customer ? routeButton("Abrir cliente", `customer/${customer.id}`, "primary") : ""}
            ${routeButton("Volver", "operations", "ghost")}
          </div>
        </div>
        <div class="surface-card surface-card--dark">
          <div class="stack">
            ${detailStat("Estado", operation.estadoOperacion)}
            ${detailStat("Riesgo", operation.riesgo)}
            ${detailStat("Checklist", `${checklistProgress.completed}/${checklistProgress.total} completos`)}
            ${detailStat("Proxima devolucion", operation.fechaDevolucion || "Sin fecha")}
          </div>
        </div>
      </div>

      <div class="split-layout">
        <section class="surface-card">
          ${sectionHeader("Datos operativos", "Cabecera y control", "Datos clave para el seguimiento diario y la trazabilidad comercial.")}
          <div class="detail-grid">
            ${miniDetail("Cliente", customer?.empresa || customer?.nombre || "Sin cliente")}
            ${miniDetail("Tipo", operation.tipoOperacion)}
            ${miniDetail("Contenedor", operation.contenedor)}
            ${miniDetail("Referencia", operation.referencia)}
            ${miniDetail("DUA", operation.dua || "Sin DUA")}
            ${miniDetail("Origen", operation.origen)}
            ${miniDetail("Destino", operation.destino)}
            ${miniDetail("Arribo", operation.fechaArribo || "Sin fecha")}
            ${miniDetail("Carga", operation.fechaCarga || "Sin fecha")}
            ${miniDetail("Devolucion", operation.fechaDevolucion || "Sin fecha")}
            ${miniDetail("Polo logistico", operation.poloLogistico || "Sin dato")}
            ${miniDetail("Despachante origen / local", operation.despachanteUY || "Sin dato")}
            ${miniDetail("Despachante responsable", operation.despachantePY || "Sin dato")}
          </div>
          <div class="alert alert--info">
            <strong>Observaciones</strong>
            <p>${escapeHtml(operation.observaciones || "Sin observaciones")}</p>
          </div>
        </section>

        <aside class="surface-card">
          ${sectionHeader("Alertas", "Puntos de atencion", "Lo que requiere seguimiento por fecha, documentos o riesgo.")}
          <div class="stack">
            ${alerts.length ? alerts.map((alert) => renderAlertCard(alert)).join("") : emptyState("Sin alertas", "La operacion no tiene alertas activas.")}
          </div>
        </aside>
      </div>

      <div class="detail-grid">
        <section class="surface-card">
          ${sectionHeader("Checklist documental", "Estado de documentos", "Control de avance por cada documento requerido.")}
          <div class="detail-grid">
            ${OPERATION_CHECKLIST_ITEMS.map((item) => {
              const checked = checklistProgress.checklist[item.key];
              return miniDetail(item.label, checked ? "Completo" : "Pendiente");
            }).join("")}
          </div>
        </section>
        <section class="surface-card">
          ${sectionHeader("Tareas asociadas", "Agenda vinculada", "Compromisos creados para esta operacion.")}
          <div class="timeline">
            ${linkedTasks.length ? linkedTasks.map(renderTaskSummaryItem).join("") : emptyState("Sin tareas", "No hay tareas asociadas a esta operacion.")}
          </div>
        </section>
      </div>

      <section class="surface-card">
        ${sectionHeader("Actividad", "Trazabilidad de la operacion", "Historial local-first con cambios, tareas y estado actual.")}
        <div class="timeline">
          ${activity.length ? activity.map(renderActivityItem).join("") : emptyState("Sin actividad", "Aun no hay actividad registrada para esta operacion.")}
        </div>
      </section>
    </section>
  `;
}

function renderAgendaScreen(id = "") {
  const taskRecord = id ? getTaskById(id) : null;
  if (id && !taskRecord) {
    return renderNotFoundScreen("No encontramos esa tarea para editar.");
  }
  const defaults = buildTaskFormModel(taskRecord);
  const isEditing = Boolean(taskRecord?.id);
  const tasks = filterTasksRecords();
  const operationOptions = listOperationRecords().map((operation) => {
    const customer = getCustomerById(operation.clientId);
    return {
      id: operation.id,
      label: `${operation.referencia || operation.contenedor || operation.id} | ${operation.contenedor || "Sin contenedor"}${customer ? ` | ${customer.empresa || customer.nombre}` : ""}`
    };
  });
  const metrics = getDashboardMetrics();

  return `
    <section class="page">
      <div class="section-title">
        <div>
          <p class="eyebrow">Agenda de seguimiento</p>
          <h2>${isEditing ? "Editar tarea" : "Tareas y compromisos"}</h2>
          <p class="section-copy">${isEditing ? "Actualiza la tarea sin duplicar y conserva su trazabilidad." : "Mantiene visible lo que hay que responder, confirmar o cerrar con cada cliente."}</p>
        </div>
        <div class="btn-row">
          ${routeButton("Nuevo prospecto", "crm/new", "secondary")}
          ${isEditing ? routeButton("Volver a agenda", "agenda", "primary") : ""}
          ${routeButton("Menu", "menu", "ghost")}
        </div>
      </div>

      <div class="surface-card">
        <div class="filters-row">
          <div class="filters">
            ${filterChip("agenda-filter", "all", "Todas", uiState.agendaFilter === "all")}
            ${TASK_STATUS.map((status) => filterChip("agenda-filter", status, status, uiState.agendaFilter === status)).join("")}
          </div>
          <div class="btn-row">
            ${badge(`${tasks.length} tareas`, "info")}
            ${badge(`${metrics.overdueTasks} vencidas`, metrics.overdueTasks ? "danger" : "neutral")}
          </div>
        </div>
      </div>

      <div class="split-layout">
        <section class="surface-card">
          ${sectionHeader(isEditing ? "Editar tarea" : "Nueva tarea", isEditing ? "Actualizar seguimiento" : "Crear seguimiento", isEditing ? "Ajusta estado, prioridad y fechas sin duplicar el registro." : "Deja la proxima accion definida desde el primer momento.")}
          ${uiState.taskOperationId && !isEditing ? `
            <div class="alert alert--info">
              <strong>Tarea vinculada a operacion</strong>
              <p>${escapeHtml((getOperationById(uiState.taskOperationId) || {}).referencia || "Operacion seleccionada")}</p>
            </div>
          ` : ""}
          <form class="form-grid" data-form="task">
            <input type="hidden" name="id" value="${escapeHtml(defaults.id)}">
            <input type="hidden" name="createdAt" value="${escapeHtml(defaults.createdAt)}">
            ${selectField("Cliente", "customerId", listCustomerRecords(), defaults.customerId || "", "6")}
            ${selectField("Operacion vinculada", "operationId", operationOptions, defaults.operationId || "", "6", "Sin operacion")}
            ${field("Tarea", "tarea", defaults.tarea, "Accion a realizar", "6")}
            ${selectField("Prioridad", "prioridad", TASK_PRIORITIES, defaults.prioridad || "Alta", "6")}
            ${field("Fecha compromiso", "fechaCompromiso", defaults.fechaCompromiso || "", "Fecha de entrega", "6", "date")}
            ${selectField("Estado", "estado", TASK_STATUS, defaults.estado || "Pendiente", "6")}
            ${field("Recordatorio", "recordatorio", defaults.recordatorio || "", "Fecha y hora", "6", "datetime-local")}
            ${textareaField("Observaciones", "observaciones", defaults.observaciones || "", "Notas del seguimiento", "12")}
            <div class="field field--full">
              <div class="btn-row">
                <button type="submit" class="btn btn--primary">${isEditing ? "Guardar cambios" : "Guardar tarea"}</button>
                ${isEditing ? routeButton("Ver detalle", `agenda/${defaults.id}`, "secondary") : ""}
              </div>
            </div>
          </form>
        </section>

        <section class="surface-card">
          ${sectionHeader("Lista de tareas", "Seguimiento vivo", "Orden por prioridad, fecha y estado.")}
          <div class="timeline">
            ${tasks.length ? tasks.map(renderTaskSummaryItem).join("") : emptyState("Sin tareas", "No hay tareas para mostrar.")}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderTaskDetailScreen(id) {
  const task = getTaskById(id);
  if (!task) return renderNotFoundScreen("No encontramos esa tarea.");
  const customer = task.customerId ? getCustomerById(task.customerId) : null;
  const operation = task.operationId ? getOperationById(task.operationId) : null;

  return `
    <section class="page">
      <div class="page-hero">
      <div class="hero-copy">
          <p class="eyebrow">Detalle de tarea</p>
          <h1>${escapeHtml(task.tarea)}</h1>
          <p>${escapeHtml(task.cliente || customer?.empresa || "Sin cliente")} | ${escapeHtml(task.prioridad)} | ${escapeHtml(task.estado)}</p>
          <div class="hero-actions">
            ${routeButton("Editar tarea", `agenda/edit/${task.id}`, "accent")}
            ${routeButton("Volver a agenda", "agenda", "primary")}
            ${routeButton("Abrir cliente", customer ? `customer/${customer.id}` : "customer", "secondary")}
            ${operation ? routeButton("Abrir operacion", `operations/${operation.id}`, "ghost") : ""}
            <button type="button" class="btn btn--accent" data-action="mark-task-done" data-id="${escapeHtml(task.id)}">Marcar hecha</button>
          </div>
        </div>
        <div class="surface-card surface-card--dark">
          <div class="stack">
            ${detailStat("Fecha compromiso", task.fechaCompromiso || "Sin fecha")}
            ${detailStat("Recordatorio", formatDateTime(task.recordatorio))}
            ${detailStat("Prioridad", task.prioridad)}
            ${detailStat("Operacion", operation?.referencia || "Sin operacion")}
          </div>
        </div>
      </div>

      <div class="split-layout">
        <section class="surface-card">
          ${sectionHeader("Ficha de seguimiento", "Estado operativo", "Una tarea clara evita friccion y olvidos.")}
          <div class="detail-grid">
            ${miniDetail("Cliente", task.cliente || customer?.empresa || "")}
            ${miniDetail("Estado", task.estado)}
            ${miniDetail("Prioridad", task.prioridad)}
            ${miniDetail("Compromiso", task.fechaCompromiso || "")}
            ${miniDetail("Recordatorio", formatDateTime(task.recordatorio))}
            ${miniDetail("Operacion", operation ? `${operation.referencia || operation.contenedor || "Operacion"} | ${operation.estadoOperacion}` : "Sin operacion")}
          </div>
          <div class="alert alert--info">
            <strong>Observaciones</strong>
            <p>${escapeHtml(task.observaciones || "Sin observaciones")}</p>
          </div>
        </section>

        <aside class="surface-card">
          ${sectionHeader("Acciones", "Siguiente paso", "Cierra o reprograma segun el estado real.")}
          <div class="stack">
            ${routeButton("Crear cotizacion", "quote", "primary")}
            ${routeButton("Abrir CRM", "crm", "secondary")}
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderCustomerScreen(id = "") {
  const customers = listCustomerRecords();
  const customerId = id || uiState.customerId || customers[0]?.id || "";
  const customer = getCustomerById(customerId) || customers[0] || null;

  if (!customer) {
    return renderNotFoundScreen("No hay clientes cargados.");
  }

  const crmRecord = listCrmRecords().find((item) => item.customerId === customer.id) || null;
  const quotes = listQuoteRecords().filter((quote) => quote.customerId === customer.id);
  const tasks = listTaskRecords().filter((task) => task.customerId === customer.id);
  const operations = listOperationRecords().filter((operation) => operation.clientId === customer.id);
  const activity = getCustomerActivityFeed(customer.id);

  return `
    <section class="page">
      <div class="section-title">
        <div>
          <p class="eyebrow">Ficha de cliente</p>
          <h2>${escapeHtml(customer.empresa)}</h2>
          <p class="section-copy">Vision consolidada para operar, vender y responder con contexto completo.</p>
        </div>
        <div class="btn-row">
          ${routeButton("Abrir CRM", crmRecord ? `crm/${crmRecord.id}` : "crm", "primary")}
          ${routeButton("Nueva cotizacion", "quote", "accent")}
          <button type="button" class="btn btn--secondary" data-action="new-operation-for-client" data-customer-id="${escapeHtml(customer.id)}">Nueva operacion</button>
          ${routeButton("Menu", "menu", "secondary")}
        </div>
      </div>

      <div class="surface-card">
        <div class="detail-grid">
          <div class="detail-card">
            <span class="field__label">Seleccionar cliente</span>
            <select class="field__control" data-select="customer">
              ${customers.map((item) => `<option value="${escapeHtml(item.id)}"${item.id === customer.id ? " selected" : ""}>${escapeHtml(item.empresa)}</option>`).join("")}
            </select>
          </div>
          <div class="btn-row btn-row--end">
            ${badge(`${quotes.length} cotizaciones`, "info")}
            ${badge(`${tasks.length} tareas`, tasks.some((task) => task.estado !== "Hecha") ? "warning" : "success")}
            ${badge(`${operations.length} operaciones`, operations.some((operation) => operation.estadoOperacion !== "Cerrado") ? "warning" : "success")}
          </div>
        </div>
      </div>

      <div class="split-layout">
        <section class="surface-card">
          ${sectionHeader("Datos generales", "Identidad y contacto", "Todo lo necesario para responder sin volver a buscar.")}
          <form class="form-grid" data-form="customer">
            <input type="hidden" name="id" value="${escapeHtml(customer.id)}">
            ${field("Nombre", "nombre", customer.nombre || "", "Nombre corto", "6")}
            ${field("Empresa", "empresa", customer.empresa || "", "Razon social o marca", "6")}
            ${field("Contacto principal", "contactoPrincipal", customer.contactoPrincipal || "", "Persona de referencia", "6")}
            ${field("Telefono", "telefono", customer.telefono || "", "Contacto principal", "6")}
            ${field("Email", "email", customer.email || "", "Correo principal", "6")}
            ${field("Ciudad", "ciudad", customer.ciudad || "", "Ciudad base", "3")}
            ${field("Pais", "pais", customer.pais || "", "Pais base", "3")}
            ${selectField("Tipo cliente", "tipoCliente", CUSTOMER_TYPES, customer.tipoCliente || "Prospecto", "3")}
            ${textareaField("Datos generales", "datosGenerales", customer.datosGenerales || "", "Resumen de negocio", "12")}
            ${textareaField("Condiciones pactadas", "condicionesPactadas", customer.condicionesPactadas || "", "Acuerdos comerciales", "12")}
            ${textareaField("Observaciones clave", "observacionesClave", customer.observacionesClave || "", "Puntos criticos", "12")}
            <div class="field field--full">
              <button type="submit" class="btn btn--primary">Guardar ficha</button>
            </div>
          </form>
        </section>

        <aside class="surface-card">
          ${sectionHeader("Resumen operativo", "Contexto comercial", "Relacion directa con CRM, cotizaciones y tareas.")}
          <div class="stack">
            ${detailStat("Contacto principal", customer.contactoPrincipal || "Sin contacto")}
            ${detailStat("Seguimiento", crmRecord?.proximaAccion || "Sin accion pendiente")}
            ${detailStat("Actividad", `${activity.length} eventos`)}
            ${detailStat("Condiciones", customer.condicionesPactadas || "Sin condiciones")}
            ${detailStat("Operaciones", `${operations.length} expedientes`)}
          </div>
          <div class="detail-card">
            <h4>Contactos</h4>
            <div class="timeline">
              ${customer.contactos?.length ? customer.contactos.map((contact) => `
                <article class="timeline-item">
                  <div class="timeline-item__title">
                    <strong>${escapeHtml(contact.nombre)}</strong>
                    ${badge(contact.cargo || "Contacto", "neutral")}
                  </div>
                  <div class="timeline-item__meta">${escapeHtml(contact.telefono || "")} | ${escapeHtml(contact.email || "")}</div>
                </article>
              `).join("") : emptyState("Sin contactos", "No hay contactos registrados.")}
            </div>
          </div>
        </aside>
      </div>

      <div class="detail-grid">
        <section class="surface-card">
          ${sectionHeader("Actividad reciente", "Seguimiento consolidado", "Cotizaciones, tareas, CRM y notas comerciales del cliente.")}
          <div class="timeline">
            ${activity.length ? activity.map(renderActivityItem).join("") : emptyState("Sin actividad", "Todavia no hay movimientos cargados para este cliente.")}
          </div>
        </section>

        <section class="surface-card">
          ${sectionHeader("Cotizaciones asociadas", "Ofertas previas", "Comparativo y continuidad comercial.")}
          ${quotes.length ? renderQuoteTable(quotes) : emptyState("Sin cotizaciones", "Todavia no hay cotizaciones asociadas.")}
        </section>
      </div>

      <div class="detail-grid">
        <section class="surface-card">
          ${sectionHeader("Incidencias", "Casos abiertos o previos", "Sirve para no repetir errores y entender prioridades.")}
          <div class="timeline">
            ${customer.incidencias?.length ? customer.incidencias.map((item) => `
              <article class="timeline-item">
                <div class="timeline-item__title">
                  <strong>${escapeHtml(item.fecha)}</strong>
                  ${badge("Incidencia", "warning")}
                </div>
                <div class="timeline-item__meta">${escapeHtml(item.nota)}</div>
              </article>
            `).join("") : emptyState("Sin incidencias", "No se registran incidencias relevantes.")}
          </div>
        </section>

        <section class="surface-card">
          ${sectionHeader("Tareas vinculadas", "Agenda del cliente", "Seguimiento operativo asociado a esta cuenta.")}
          <div class="timeline">
            ${tasks.length ? tasks.map(renderTaskSummaryItem).join("") : emptyState("Sin tareas", "No hay tareas ligadas a este cliente.")}
          </div>
        </section>
      </div>

      <section class="surface-card">
        ${sectionHeader("Operaciones relacionadas", "Expedientes por cliente", "Control directo de los workflows que dependen de esta cuenta.")}
        <div class="timeline">
          ${operations.length ? operations.map(renderOperationSummaryItem).join("") : emptyState("Sin operaciones", "No hay expedientes asociados a este cliente.")}
        </div>
      </section>
    </section>
  `;
}

function renderMenuScreen() {
  const metrics = getDashboardMetrics();
  if (isProviderRole(state.session.role)) {
    const activeProvider = getActiveProviderRecord();
    return `
      <section class="page">
        <div class="page-hero">
          <div class="hero-copy">
            <p class="eyebrow">Menu proveedor</p>
            <h1>Acceso operativo del proveedor.</h1>
            <p>Menu reducido para responder cotizaciones, revisar perfil y volver al inicio sin entrar en módulos internos.</p>
            <div class="hero-actions">
              ${routeButton("Inicio", "home", "primary")}
              ${routeButton("Perfil proveedor", "provider", "secondary")}
              ${routeButton("Cotizador", "quote", "accent")}
            </div>
          </div>
          <div class="surface-card surface-card--dark">
            <div class="stack">
              ${detailStat("Cotizaciones", `${metrics.quoteCount} registros`)}
              ${detailStat("Viajes", `${activeProvider?.viajes?.length || 0} visibles`)}
              ${detailStat("Documentos", `${activeProvider?.documentosOperativos?.length || 0} adjuntos`)}
            </div>
          </div>
        </div>

        <div class="menu-grid">
          ${menuCard("Inicio", "Portada con cotizaciones, viajes y carga documental.", "home")}
          ${menuCard("Perfil proveedor", "Datos de cobertura, operativa y adjuntos.", "provider")}
          ${menuCard("Cotizador", "Responde o revisa cotizaciones disponibles.", "quote")}
          ${menuCard("Historial", "Cotizaciones guardadas y seguimiento comercial.", "quotes")}
        </div>
      </section>
    `;
  }
  return `
    <section class="page">
      <div class="page-hero">
        <div class="hero-copy">
          <p class="eyebrow">Menu principal</p>
          <h1>Navegacion clara para equipo comercial y operativo.</h1>
          <p>Este es el punto de entrada del producto. La estructura queda lista para reutilizar en iOS sin rehacer la logica central.</p>
          <div class="hero-actions">
            ${routeButton("Inicio", "home", "primary")}
            ${routeButton("CRM", "crm", "secondary")}
            ${routeButton("Cotizador", "quote", "accent")}
            ${routeButton("Operaciones", "operations", "secondary")}
            ${routeButton("Proveedores", "providers", "secondary")}
          </div>
        </div>
        <div class="surface-card surface-card--dark">
          <div class="stack">
            ${detailStat("CRM", `${metrics.crmCount} registros`)}
            ${detailStat("Cotizaciones", `${metrics.quoteCount} registros`)}
            ${detailStat("Agenda", `${metrics.taskCount} tareas abiertas`)}
            ${detailStat("Operaciones", `${metrics.operationCount || 0} expedientes`)}
            ${detailStat("Proveedores", `${metrics.providerCount || 0} registros`)}
          </div>
        </div>
      </div>

      <div class="menu-grid">
        ${menuCard("Dashboard", "Vista ejecutiva con pipeline, tareas y accesos rapidos.", "home")}
        ${menuCard("CRM", "Listado, detalle y alta de prospectos o clientes.", "crm")}
        ${menuCard("Cotizador", "Reglas de facturacion, margen y seguimiento de ofertas.", "quote")}
        ${menuCard("Agenda", "Seguimiento de tareas y recordatorios diarios.", "agenda")}
        ${menuCard("Operaciones", "Expedientes, checklist documental y alertas de arribo.", "operations")}
        ${menuCard("Proveedores", "Catalogo por tipo de unidad, alta y edicion.", "providers")}
        ${menuCard("Ficha de cliente", "Datos, contactos, historial y condiciones pactadas.", "customer")}
        ${menuCard("Historial", "Comparativo de cotizaciones guardadas por cliente.", "quotes")}
      </div>

      <div class="detail-grid">
        <section class="surface-card">
          ${sectionHeader("Arquitectura", "Base reusable", "Pensada para Android hoy e iOS despues con el menor retrabajo posible.")}
          <div class="stack">
            ${miniDetail("Fuente editable", "C:\\Joathi\\version-24\\V")}
            ${miniDetail("Salida derivada", "android-app/app/src/main/assets/www")}
            ${miniDetail("Sync", "tools/sync-web-to-android-assets.ps1")}
            ${miniDetail("Persistencia", "localStorage local")}
          </div>
        </section>
        <section class="surface-card">
          ${sectionHeader("Reglas activas", "Cotizador Uruguay", "Las reglas ya quedan incorporadas en el calculo base.")}
          <div class="stack">
            ${miniDetail("Brasil -> Uruguay", "80% internacional / 20% nacional")}
            ${miniDetail("Operativa internacional", "Caso piloto Paraguay / rutas regionales")}
            ${miniDetail("Argentina -> Uruguay", "50% internacional / 50% nacional")}
            ${miniDetail("Chile -> Uruguay", "90% internacional / 10% nacional")}
          </div>
        </section>
      </div>

      ${renderBackupSection()}
    </section>
  `;
}

function renderCommercialOpsScreen(metrics = getDashboardMetrics()) {
  const pendingTasks = listTaskRecords().filter((task) => task.estado !== "Hecha").slice(0, 6);
  const recentQuotes = metrics.recentQuotes.slice(0, 3);
  const customerCards = renderCommercialCustomerCards();
  const providerCards = renderCommercialProviderCards();

  return `
    <section class="page">
      <div class="page-hero">
        <div class="hero-copy">
          <p class="eyebrow">Perfil comercial operativo</p>
          <h1>Seguimiento comercial, cotizacion y proveedores en una sola pantalla.</h1>
          <p>
            Este perfil prioriza checklist, cotizador, seguimiento de clientes y proveedores clasificados por tipo de unidad.
            La operacion queda a mano sin abrir pantallas innecesarias.
          </p>
          <div class="hero-actions">
            ${routeButton("Nueva cotizacion", "quote", "accent")}
            ${routeButton("Alta cliente", "crm/new", "secondary")}
            ${routeButton("Abrir clientes", "crm", "primary")}
            ${routeButton("Abrir proveedores", "providers", "secondary")}
            ${routeButton("Abrir agenda", "agenda", "ghost")}
          </div>
        </div>
        <div class="surface-card surface-card--dark">
          <div class="stack">
            ${detailStat("Clientes", `${metrics.activeCustomers} activos y ${metrics.openCrm} prospectos`)}
            ${detailStat("Proveedores", `${metrics.providerCount || 0} registros por tipo de unidad`)}
            ${detailStat("Tareas", `${metrics.taskCount} abiertas, ${metrics.overdueTasks} vencidas`)}
            ${detailStat("Cotizaciones", `${metrics.quoteCount} registradas`)}
          </div>
        </div>
      </div>

      ${renderMetricGrid([
        { label: "Clientes activos", value: metrics.activeCustomers, meta: "Seguimiento y continuidad comercial." },
        { label: "Tareas abiertas", value: metrics.taskCount, meta: `${metrics.overdueTasks} vencidas y ${metrics.dueToday} para hoy.` },
        { label: "Cotizaciones", value: metrics.quoteCount, meta: "Cotizador y registro reciente." },
        { label: "Proveedores", value: metrics.providerCount || 0, meta: "Clasificados por tipoUnidad." }
      ])}

      <div class="split-layout">
        <section class="surface-card">
          ${sectionHeader("Checklist", "Tareas pendientes", "Formato checklist para ver lo que sigue abierto y cerrarlo desde el mismo panel.")}
          <div class="timeline">
            ${pendingTasks.length ? pendingTasks.map(renderChecklistTaskItem).join("") : emptyState("Sin tareas abiertas", "No hay pendientes activos.")}
          </div>
        </section>

        <section class="surface-card">
          ${sectionHeader("Cotizador", "Acceso directo y historial reciente", "Abre cotizador o revisa las ultimas ofertas guardadas.")}
          <div class="stack">
            ${recentQuotes.length ? recentQuotes.map(renderRecentQuoteCard).join("") : emptyState("Sin cotizaciones", "Todavia no hay cotizaciones registradas.")}
          </div>
          <div class="hero-actions">
            ${routeButton("Abrir cotizador", "quote", "primary")}
            ${routeButton("Ver historial", "quotes", "secondary")}
          </div>
        </section>
      </div>

      <div class="detail-grid">
        <section class="surface-card">
          ${sectionHeader("Clientes", "Buscador y seguimiento", "Busca clientes y abre su ficha, CRM o edicion sin perder contexto.")}
          <div class="filters-row">
            <input
              class="searchbar"
              data-search="customer"
              type="search"
              placeholder="Buscar cliente, empresa, contacto o proxima accion"
              value="${escapeHtml(uiState.customerQuery)}"
            >
            <div class="btn-row">
              ${routeButton("Buscar en CRM", "crm", "secondary")}
              ${routeButton("Alta cliente", "crm/new", "accent")}
            </div>
          </div>
          <div class="stack">
            ${customerCards.length ? customerCards : emptyState("Sin coincidencias", "No hay clientes que coincidan con el buscador.")}
          </div>
        </section>

        <section class="surface-card">
          ${sectionHeader("Proveedores", "Buscador y clasificacion", "Agrupados por tipo de unidad con acceso a alta y edicion.")}
          <div class="filters-row">
            <input
              class="searchbar"
              data-search="provider"
              type="search"
              placeholder="Buscar proveedor, contacto, zona o configuracion"
              value="${escapeHtml(uiState.providerQuery)}"
            >
            <input
              class="searchbar"
              data-search="provider-config"
              type="search"
              placeholder="Filtrar por configuracion"
              value="${escapeHtml(uiState.providerConfigQuery)}"
            >
            <select class="field__control" data-select="provider-type">
              <option value="all"${uiState.providerTypeFilter === "all" ? " selected" : ""}>Todos los tipos</option>
              ${PROVIDER_UNIT_TYPES.map((item) => `<option value="${escapeHtml(item.label)}"${uiState.providerTypeFilter === item.label ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
            </select>
            <select class="field__control" data-select="provider-availability">
              <option value="all"${uiState.providerAvailabilityFilter === "all" ? " selected" : ""}>Todas las disponibilidades</option>
              ${PROVIDER_AVAILABILITY.map((item) => `<option value="${escapeHtml(item)}"${uiState.providerAvailabilityFilter === item ? " selected" : ""}>${escapeHtml(item)}</option>`).join("")}
            </select>
          </div>
          <div class="stack">
            ${providerCards.length ? providerCards : emptyState("Sin coincidencias", "No hay proveedores que coincidan con el filtro.")}
          </div>
          <div class="hero-actions">
            ${routeButton("Abrir proveedores", "providers", "primary")}
            ${routeButton("Alta proveedor", "providers/new", "accent")}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderProvidersScreen() {
  const providers = filterProviderRecords();
  const selected = providers[0] || null;
  const grouped = groupProvidersByTypeUnit(providers);

  return `
    <section class="page">
      <div class="section-title">
        <div>
          <p class="eyebrow">Proveedores</p>
          <h2>Catalogo operativo por tipo de unidad</h2>
          <p class="section-copy">Busqueda, clasificacion y acceso rapido a alta o edicion sin salir del flujo comercial.</p>
        </div>
        <div class="btn-row">
          ${routeButton("Alta proveedor", "providers/new", "primary")}
          ${routeButton("Ir al home", "home", "secondary")}
        </div>
      </div>

      <div class="surface-card">
        <div class="filters-row">
          <input
            class="searchbar"
            data-search="provider"
            type="search"
            placeholder="Buscar proveedor, contacto, zona o configuracion"
            value="${escapeHtml(uiState.providerQuery)}"
          >
          <input
            class="searchbar"
            data-search="provider-config"
            type="search"
            placeholder="Filtrar por configuracion"
            value="${escapeHtml(uiState.providerConfigQuery)}"
          >
          <select class="field__control" data-select="provider-type">
            <option value="all"${uiState.providerTypeFilter === "all" ? " selected" : ""}>Todos los tipos</option>
            ${PROVIDER_UNIT_TYPES.map((item) => `<option value="${escapeHtml(item.label)}"${uiState.providerTypeFilter === item.label ? " selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
          </select>
          <select class="field__control" data-select="provider-availability">
            <option value="all"${uiState.providerAvailabilityFilter === "all" ? " selected" : ""}>Todas las disponibilidades</option>
            ${PROVIDER_AVAILABILITY.map((item) => `<option value="${escapeHtml(item)}"${uiState.providerAvailabilityFilter === item ? " selected" : ""}>${escapeHtml(item)}</option>`).join("")}
          </select>
        </div>
      </div>

      ${renderMetricGrid([
        { label: "Sider", value: providers.filter((provider) => provider.tipoUnidad === "Sider").length, meta: "Carga paletizada rapida." },
        { label: "Furgon", value: providers.filter((provider) => provider.tipoUnidad === "Furgon").length, meta: "Carga seca y segura." },
        { label: "Plataforma", value: providers.filter((provider) => provider.tipoUnidad === "Plataforma").length, meta: "Maquinaria y volumen." },
        { label: "Cisterna / Refrigerado", value: providers.filter((provider) => ["Cisterna", "Refrigerado"].includes(provider.tipoUnidad)).length, meta: "Liquidos, gases y frio." }
      ])}

      <div class="split-layout">
        <section class="surface-card">
          ${sectionHeader("Listado", "Proveedores agrupados por tipo de unidad", "La vista respeta la separacion entre tipoUnidad y configuracion.")}
          <div class="stack">
            ${grouped.length ? grouped.map((group) => `
              <article class="detail-card">
                <div class="list-item__title">
                  <strong>${escapeHtml(group.type.label)}</strong>
                  <span class="badge badge--info">${escapeHtml(String(group.records.length))}</span>
                </div>
                <p>${escapeHtml(group.type.apertura)} | ${escapeHtml(group.type.usoTipico)}</p>
                <div class="stack">
                  ${group.records.map((provider) => renderProviderCompactCard(provider)).join("")}
                </div>
              </article>
            `).join("") : emptyState("Sin coincidencias", "No hay proveedores que coincidan con la busqueda.")}
          </div>
        </section>

        <aside class="surface-card">
          ${selected ? renderProviderSummaryCard(selected) : emptyState("Sin proveedores", "Crea el primero para empezar el catalogo.")}
          <div class="hero-actions">
            ${routeButton("Nuevo proveedor", "providers/new", "primary")}
            ${routeButton("Editar seleccionado", selected ? `providers/edit/${selected.id}` : "providers/new", "secondary")}
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderProviderSummaryCard(provider) {
  return `
    <div class="detail-card">
      <div class="list-item__title">
        <strong>${escapeHtml(provider.nombre)}</strong>
        <span class="badge badge--${provider.disponibilidad === "Disponible" ? "success" : provider.disponibilidad === "En viaje" ? "warning" : "neutral"}">${escapeHtml(provider.disponibilidad)}</span>
      </div>
      <p>${escapeHtml(provider.tipoUnidad)} | ${escapeHtml(provider.configuracion)}</p>
      <div class="timeline">
        ${miniDetail("Contacto", provider.contacto || "Sin contacto")}
        ${miniDetail("Telefono", provider.telefono || "Sin telefono")}
        ${miniDetail("Email", provider.email || "Sin email")}
        ${miniDetail("Apertura", provider.apertura || "Sin dato")}
        ${miniDetail("Uso tipico", provider.usoTipico || "Sin dato")}
        ${miniDetail("Zona", provider.zona || "Sin zona")}
        ${miniDetail("Pais", provider.pais || "Sin pais")}
        ${miniDetail("Cobertura", Array.isArray(provider.rutasCobertura) && provider.rutasCobertura.length ? provider.rutasCobertura.join(", ") : "Sin cobertura")}
        ${miniDetail("Chofer", provider.choferNombre || "Sin chofer")}
        ${miniDetail("Camion", provider.camionPatente || provider.camionMarca || "Sin camion")}
        ${miniDetail("MIC", provider.mic || "Sin MIC")}
        ${miniDetail("DUA", provider.dua || "Sin DUA")}
      </div>
      <div class="alert alert--info">
        <strong>Observaciones</strong>
        <p>${escapeHtml(provider.observaciones || "Sin observaciones")}</p>
      </div>
    </div>
  `;
}

function renderProviderFormScreen(id = "") {
  const providerRecord = id ? getProviderById(id) : null;
  if (id && !providerRecord) {
    return renderNotFoundScreen("No encontramos ese proveedor para editar.");
  }

  const defaults = buildProviderFormModel(providerRecord);
  const isEditing = Boolean(providerRecord?.id);

  return `
    <section class="page">
      <div class="section-title">
        <div>
          <p class="eyebrow">Proveedores</p>
          <h2>${isEditing ? "Editar proveedor" : "Nuevo proveedor"}</h2>
          <p class="section-copy">${isEditing ? "Actualiza el registro sin perder trazabilidad ni clasificacion." : "Alta de proveedor separando tipo de unidad y configuracion del vehiculo."}</p>
        </div>
        <div class="btn-row">
          ${routeButton("Volver a proveedores", "providers", "secondary")}
          ${isEditing ? routeButton("Ver detalle", `providers/${defaults.id}`, "ghost") : ""}
        </div>
      </div>

      <div class="split-layout">
        <section class="surface-card">
          <form class="form-grid" data-form="provider">
            <input type="hidden" name="id" value="${escapeHtml(defaults.id)}">
            <input type="hidden" name="createdAt" value="${escapeHtml(defaults.createdAt)}">
            ${field("Nombre proveedor", "nombre", defaults.nombre || "", "Nombre comercial", "6")}
            ${field("Contacto", "contacto", defaults.contacto || "", "Contacto principal", "6")}
            ${field("Telefono", "telefono", defaults.telefono || "", "Telefono principal", "6")}
            ${field("Email", "email", defaults.email || "", "Correo principal", "6")}
            ${selectField("Tipo de unidad", "tipoUnidad", PROVIDER_UNIT_TYPE_LABELS, defaults.tipoUnidad || "Sider", "6")}
            ${field("Configuracion", "configuracion", defaults.configuracion || "Semirremolque", "Semirremolque, rigido u otra", "6")}
            ${field("Apertura / acceso", "apertura", defaults.apertura || "", "Lateral, trasera, superior...", "6")}
            ${field("Uso tipico", "usoTipico", defaults.usoTipico || "", "Descripcion operativa", "6")}
            ${field("Zona", "zona", defaults.zona || "", "Area, corredor o ciudad", "6")}
            ${selectField("Pais", "pais", COUNTRIES, defaults.pais || "Uruguay", "6")}
            ${selectField("Disponibilidad", "disponibilidad", PROVIDER_AVAILABILITY, defaults.disponibilidad || "Disponible", "6")}
            <div class="field field--full">
              <span class="field__label">Rutas / cobertura</span>
              ${renderCoverageChecklist(defaults.rutasCobertura || [])}
              <span class="field__hint">Selecciona al menos una cobertura. Semirremolque se modela en configuracion, no como tipo principal.</span>
            </div>
            ${textareaField("Observaciones", "observaciones", defaults.observaciones || "", "Notas internas", "12")}
            <div class="field field--full">
              <div class="btn-row">
                <button type="submit" class="btn btn--primary">${isEditing ? "Guardar cambios" : "Guardar proveedor"}</button>
                ${routeButton("Cancelar", "providers", "secondary")}
              </div>
            </div>
          </form>
        </section>

        <aside class="surface-card">
          ${sectionHeader("Clasificacion", "Modelo consistente", "Separacion entre tipoUnidad y configuracion para evitar mezclar la familia con la unidad.")}
          <div class="stack">
            ${detailStat("Tipo de unidad", defaults.tipoUnidad || "Sin tipo")}
            ${detailStat("Configuracion", defaults.configuracion || "Sin configuracion")}
            ${detailStat("Disponibilidad", defaults.disponibilidad || "Sin disponibilidad")}
            ${detailStat("Pais", defaults.pais || "Sin pais")}
            <div class="detail-card">
              <h4>Cobertura actual</h4>
              <p>${renderCoverageChips(defaults.rutasCobertura || [])}</p>
            </div>
          </div>
          <div class="alert alert--info">
            <strong>Regla aplicada</strong>
            <p>Si llega un valor como "Semi sider", se corrige automaticamente a tipoUnidad Sider con configuracion Semirremolque.</p>
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderProviderDetailScreen(id) {
  const provider = getProviderById(id);
  if (!provider) return renderNotFoundScreen("No encontramos ese proveedor.");

  const providerName = normalizeText(provider.nombre);
  const relatedQuotes = listQuoteRecords().filter((quote) => {
    const quoteProvider = normalizeText(quote.proveedor);
    return quoteProvider.includes(providerName) || providerName.includes(quoteProvider);
  });
  const relatedActivity = listActivityRecords().filter((item) => normalizeText(item.details).includes(providerName) || (item.entityKind === "provider" && item.entityId === provider.id));

  return `
    <section class="page">
      <div class="page-hero">
        <div class="hero-copy">
          <p class="eyebrow">Proveedor</p>
          <h1>${escapeHtml(provider.nombre)}</h1>
          <p>${escapeHtml(provider.tipoUnidad)} | ${escapeHtml(provider.configuracion)} | ${escapeHtml(provider.disponibilidad)}</p>
          <div class="hero-actions">
            ${routeButton("Editar proveedor", `providers/edit/${provider.id}`, "accent")}
            ${routeButton("Volver a proveedores", "providers", "primary")}
            ${routeButton("Alta proveedor", "providers/new", "secondary")}
          </div>
        </div>
        <div class="surface-card surface-card--dark">
          <div class="stack">
            ${detailStat("Apertura", provider.apertura || "Sin dato")}
            ${detailStat("Uso tipico", provider.usoTipico || "Sin dato")}
            ${detailStat("Zona", provider.zona || "Sin dato")}
            ${detailStat("Pais", provider.pais || "Sin dato")}
          </div>
        </div>
      </div>

      <div class="split-layout">
        <section class="surface-card">
          ${sectionHeader("Ficha del proveedor", "Datos completos", "Clasificacion correcta, contacto y disponibilidad.")}
          ${renderProviderSummaryCard(provider)}
        </section>

        <aside class="surface-card">
          ${sectionHeader("Relacion comercial", "Cotizaciones y actividad", "Referencia rapida para seguir el proveedor en el flujo comercial.")}
          <div class="stack">
            ${detailStat("Cotizaciones vinculadas", String(relatedQuotes.length))}
            ${detailStat("Actividad relacionada", String(relatedActivity.length))}
          </div>
          <div class="hero-actions">
            ${routeButton("Abrir cotizador", "quote", "primary")}
            ${routeButton("Buscar clientes", "crm", "secondary")}
          </div>
        </aside>
      </div>

      <div class="detail-grid">
        <section class="surface-card">
          ${sectionHeader("Cotizaciones", "Uso comercial", "Referencias donde aparece este proveedor como carrier u operador.")}
          <div class="stack">
            ${relatedQuotes.length ? relatedQuotes.map(renderRecentQuoteCard).join("") : emptyState("Sin cotizaciones", "Aun no hay cotizaciones vinculadas a este proveedor.")}
          </div>
        </section>
        <section class="surface-card">
          ${sectionHeader("Actividad", "Trazabilidad local", "Cambios y eventos asociados al proveedor.")}
          <div class="timeline">
            ${relatedActivity.length ? relatedActivity.slice(0, 8).map(renderActivityItem).join("") : emptyState("Sin actividad", "Todavia no hay eventos registrados.")}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderProviderPortalScreen(idOrMetrics = "") {
  let metrics = getDashboardMetrics();
  let routeId = "";
  if (idOrMetrics && typeof idOrMetrics === "object") {
    metrics = idOrMetrics;
  } else {
    routeId = String(idOrMetrics || "");
  }

  const providers = listProviderRecords();
  const provider = getActiveProviderRecord(routeId);

  if (!provider) {
    return renderNotFoundScreen("No hay proveedores cargados.");
  }

  uiState.providerPortalId = provider.id;
  const quoteAlerts = getProviderQuoteAlerts(provider);
  const trips = Array.isArray(provider.viajes) ? provider.viajes : [];
  const documents = Array.isArray(provider.documentosOperativos) ? provider.documentosOperativos : [];
  const operationalDefaults = buildProviderOperationalFormModel(provider);
  const tripDefaults = buildProviderTripFormModel(provider);

  return `
    <section class="page">
      <div class="page-hero">
        <div class="hero-copy">
          <p class="eyebrow">Perfil proveedor</p>
          <h1>${escapeHtml(provider.nombre)}</h1>
          <p>
            Portal operativo para responder cotizaciones, registrar viajes, cargar documentos y mantener datos del chofer,
            camión y documentación MIC/DUA sin salir del flujo.
          </p>
          <div class="hero-actions">
            ${linkButton("Responder por correo", "mailto:cotizaciones@joathilogistica.com?subject=Cotizacion%20disponible&body=Revisar%20cotizaciones%20disponibles", "accent")}
            ${routeButton("Editar perfil", `providers/edit/${provider.id}`, "primary")}
            ${routeButton("Ver catálogo", "providers", "secondary")}
          </div>
        </div>
        <div class="surface-card surface-card--dark">
          <div class="stack">
            ${detailStat("Cobertura", `${Array.isArray(provider.rutasCobertura) ? provider.rutasCobertura.length : 0} rutas`)}
            ${detailStat("Viajes", `${trips.length} registros`)}
            ${detailStat("Documentos", `${documents.length} archivos`)}
            ${detailStat("Cotizaciones", `${quoteAlerts.length} disponibles`)}
          </div>
        </div>
      </div>

      <div class="surface-card">
        <div class="section-title">
          <div>
            <p class="eyebrow">Proveedor activo</p>
            <h3>Seleccionar perfil operativo</h3>
          </div>
          <p class="section-copy">El selector permite alternar entre registros de proveedor sin duplicar vistas.</p>
        </div>
        <select class="field__control" data-select="provider-portal">
          ${providers.map((item) => `<option value="${escapeHtml(item.id)}"${item.id === provider.id ? " selected" : ""}>${escapeHtml(item.nombre)}</option>`).join("")}
        </select>
      </div>

      ${(uiState.providerUploadFeedback || uiState.providerTripFeedback) ? `
        <div class="detail-grid">
          ${uiState.providerUploadFeedback ? `
            <div class="alert alert--${escapeHtml(uiState.providerUploadFeedback.tone || "info")}">
              <strong>${escapeHtml(uiState.providerUploadFeedback.title || "Estado")}</strong>
              <p>${escapeHtml(uiState.providerUploadFeedback.details || "")}</p>
            </div>
          ` : ""}
          ${uiState.providerTripFeedback ? `
            <div class="alert alert--${escapeHtml(uiState.providerTripFeedback.tone || "info")}">
              <strong>${escapeHtml(uiState.providerTripFeedback.title || "Estado")}</strong>
              <p>${escapeHtml(uiState.providerTripFeedback.details || "")}</p>
            </div>
          ` : ""}
        </div>
      ` : ""}

      <div class="detail-grid">
        <section class="surface-card">
          ${sectionHeader("Perfil base", "Datos generales y cobertura", "La ficha principal se mantiene separada de la operativa diaria.")}
          <div class="stack">
            ${renderProviderSummaryCard(provider)}
            <div class="detail-card">
              <h4>Cobertura activa</h4>
              <p>${renderCoverageChips(provider.rutasCobertura || [])}</p>
            </div>
          </div>
        </section>

        <section class="surface-card">
          ${sectionHeader("Cotizaciones", "Alertas disponibles", "Entradas que pueden responderse por correo desde el mismo portal.")}
          <div class="stack">
            ${quoteAlerts.length ? quoteAlerts.slice(0, 6).map((quote) => renderProviderQuoteAlertCard(provider, quote)).join("") : emptyState("Sin alertas", "No hay cotizaciones vinculadas a este proveedor.")}
          </div>
          <div class="alert alert--info">
            <strong>Correo de respuesta</strong>
            <p>Las respuestas salen por <strong>cotizaciones@joathilogistica.com</strong> con un enlace mailto listo para usar.</p>
          </div>
        </section>
      </div>

      <div class="detail-grid">
        <section class="surface-card">
          ${sectionHeader("Operativa", "Chofer, camión, MIC y DUA", "Datos de operación para el flujo diario del proveedor.")}
          <form class="form-grid" data-form="provider-ops">
            <input type="hidden" name="id" value="${escapeHtml(provider.id)}">
            ${field("Chofer", "choferNombre", operationalDefaults.choferNombre || "", "Nombre del chofer", "6")}
            ${field("Telefono chofer", "choferTelefono", operationalDefaults.choferTelefono || "", "Contacto directo", "6")}
            ${field("Licencia chofer", "choferLicencia", operationalDefaults.choferLicencia || "", "Numero de licencia", "6")}
            ${field("Patente", "camionPatente", operationalDefaults.camionPatente || "", "Matricula del camion", "6")}
            ${field("Marca", "camionMarca", operationalDefaults.camionMarca || "", "Marca del camion", "4")}
            ${field("Modelo", "camionModelo", operationalDefaults.camionModelo || "", "Modelo del camion", "4")}
            ${field("Anio", "camionAnio", operationalDefaults.camionAnio || "", "Anio", "4")}
            ${field("Tipo camion", "camionTipo", operationalDefaults.camionTipo || "", "Semi remolque, rigido, etc.", "6")}
            ${field("MIC", "mic", operationalDefaults.mic || "", "Numero MIC", "6")}
            ${field("DUA", "dua", operationalDefaults.dua || "", "Numero DUA", "6")}
            <div class="field field--full">
              <div class="btn-row">
                <button type="submit" class="btn btn--primary">Guardar operativa</button>
              </div>
            </div>
          </form>
        </section>

        <section class="surface-card">
          ${sectionHeader("Historial", "Viajes visibles", "Movimientos recientes y alta rapida de un viaje nuevo.")}
          <div class="timeline">
            ${trips.length ? trips.map(renderProviderTripItem).join("") : emptyState("Sin viajes", "Aun no hay viajes registrados para este proveedor.")}
          </div>
          <form class="form-grid" data-form="provider-trip">
            <input type="hidden" name="providerId" value="${escapeHtml(provider.id)}">
            ${field("Fecha", "fecha", tripDefaults.fecha || "", "Fecha del viaje", "4", "date")}
            ${field("Origen", "origen", tripDefaults.origen || "", "Ciudad origen", "4")}
            ${field("Destino", "destino", tripDefaults.destino || "", "Ciudad destino", "4")}
            ${field("Estado", "estado", tripDefaults.estado || "Planificado", "Planificado, en viaje, entregado", "6")}
            ${textareaField("Observaciones", "observaciones", tripDefaults.observaciones || "", "Notas del viaje", "12")}
            <div class="field field--full">
              <button type="submit" class="btn btn--secondary">Agregar viaje</button>
            </div>
          </form>
        </section>
      </div>

      <div class="detail-grid">
        <section class="surface-card">
          ${sectionHeader("Documentos", "Carga de e-ticket, factura y CRT", "Adjuntos persistidos localmente para el seguimiento operativo.")}
          <div class="stack">
            <label class="field">
              <span class="field__label">E-ticket / factura</span>
              <input class="field__control" type="file" accept=".pdf,.png,.jpg,.jpeg" data-provider-upload="e-ticket" data-provider-id="${escapeHtml(provider.id)}">
            </label>
            <label class="field">
              <span class="field__label">CRT</span>
              <input class="field__control" type="file" accept=".pdf,.png,.jpg,.jpeg" data-provider-upload="crt" data-provider-id="${escapeHtml(provider.id)}">
            </label>
            ${documents.length ? documents.map(renderProviderDocumentItem).join("") : emptyState("Sin adjuntos", "Aun no hay documentos cargados.")}
          </div>
          <div class="alert alert--warning">
            <strong>Persistencia local</strong>
            <p>Los archivos quedan en el almacenamiento local del navegador. Es funcional para demo y operativa liviana, no para intercambio pesado.</p>
          </div>
        </section>

        <section class="surface-card">
          ${sectionHeader("Resumen", "Contacto y cobertura", "Accesos rapidos y referencia visible del perfil.")}
          <div class="stack">
            ${detailStat("Contacto", provider.contacto || "Sin contacto")}
            ${detailStat("Telefono", provider.telefono || "Sin telefono")}
            ${detailStat("Email", provider.email || "Sin email")}
            ${detailStat("Pais", provider.pais || "Sin pais")}
            ${detailStat("Correo comercial", "cotizaciones@joathilogistica.com")}
          </div>
          <div class="hero-actions">
            ${routeButton("Editar general", `providers/edit/${provider.id}`, "accent")}
            ${routeButton("Abrir proveedores", "providers", "primary")}
          </div>
        </section>
      </div>
    </section>
  `;
}

function getActiveProviderRecord(id = "") {
  const providers = listProviderRecords();
  return (
    (id ? getProviderById(id) : null) ||
    (uiState.providerPortalId ? getProviderById(uiState.providerPortalId) : null) ||
    providers[0] ||
    null
  );
}

function buildProviderOperationalFormModel(provider = null) {
  return {
    id: provider?.id || "",
    choferNombre: provider?.choferNombre || "",
    choferTelefono: provider?.choferTelefono || "",
    choferLicencia: provider?.choferLicencia || "",
    camionPatente: provider?.camionPatente || "",
    camionMarca: provider?.camionMarca || "",
    camionModelo: provider?.camionModelo || "",
    camionAnio: provider?.camionAnio || "",
    camionTipo: provider?.camionTipo || "",
    mic: provider?.mic || "",
    dua: provider?.dua || ""
  };
}

function buildProviderTripFormModel(provider = null) {
  return {
    providerId: provider?.id || "",
    fecha: "",
    origen: "",
    destino: "",
    estado: "Planificado",
    observaciones: ""
  };
}

function getProviderQuoteAlerts(provider) {
  const providerName = normalizeText(provider?.nombre);
  return listQuoteRecords().filter((quote) => {
    const quoteProvider = normalizeText(quote.proveedor);
    return quoteProvider.includes(providerName) || providerName.includes(quoteProvider);
  });
}

function buildProviderReplyMailto(provider, quote) {
  const subject = `Cotizacion disponible - ${provider?.nombre || "Proveedor"}`;
  const body = [
    `Hola,`,
    "",
    `Respondemos la cotizacion vinculada a ${provider?.nombre || "este proveedor"}.`,
    `Cliente: ${quote?.cliente || quote?.empresa || "Sin cliente"}`,
    `Origen: ${quote?.origen || "Sin origen"} | Destino: ${quote?.destino || "Sin destino"}`,
    `Operacion: ${quote?.tipoOperacion || "Sin operacion"}`,
    "",
    "Saludos,"
  ].join("\n");
  return `mailto:cotizaciones@joathilogistica.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function renderProviderQuoteAlertCard(provider, quote) {
  const calc = quote.calculation || calculateQuote(quote);
  return `
    <article class="record-card">
      <strong>${escapeHtml(quote.cliente || quote.empresa || "Sin cliente")}</strong>
      <p>${escapeHtml(quote.origen || "Sin origen")} -> ${escapeHtml(quote.destino || "Sin destino")} | ${escapeHtml(quote.tipoOperacion || "Operacion")}</p>
      <div class="data-grid">
        <span><strong>Proveedor</strong>${escapeHtml(quote.proveedor || provider.nombre)}</span>
        <span><strong>Moneda</strong>${escapeHtml(quote.moneda || "USD")}</span>
        <span><strong>Sugerido</strong>${escapeHtml(formatMoney(calc.suggestedPrice, calc.currency))}</span>
      </div>
      <div class="hero-actions">
        ${linkButton("Responder por email", buildProviderReplyMailto(provider, quote), "secondary")}
        ${routeButton("Abrir cotizacion", `quote/${quote.id}`, "ghost")}
      </div>
    </article>
  `;
}

function renderProviderTripItem(trip) {
  return `
    <article class="timeline-item">
      <div class="timeline-item__title">
        <strong>${escapeHtml(trip.fecha || "Sin fecha")}</strong>
        ${badge(trip.estado || "Planificado", trip.estado === "Entregado" ? "success" : trip.estado === "En viaje" ? "warning" : "info")}
      </div>
      <div class="timeline-item__meta">${escapeHtml(trip.origen || "Sin origen")} -> ${escapeHtml(trip.destino || "Sin destino")}</div>
      <div class="timeline-item__meta">${escapeHtml(trip.observaciones || "Sin observaciones")}</div>
    </article>
  `;
}

function renderProviderDocumentItem(doc) {
  return `
    <article class="list-item">
      <div class="list-item__title">
        <strong>${escapeHtml(doc.fileName || doc.kind || "Documento")}</strong>
        ${badge(doc.kind || "archivo", "info")}
      </div>
      <div class="list-item__meta">
        ${escapeHtml(doc.fileType || "Sin tipo")} | ${escapeHtml(String(Math.max(0, Math.round((doc.fileSize || 0) / 1024))))} KB | ${escapeHtml(formatDateTime(doc.uploadedAt || ""))}
      </div>
    </article>
  `;
}

function filterProviderRecords() {
  const query = normalizeText(uiState.providerQuery);
  const configQuery = normalizeText(uiState.providerConfigQuery);
  return listProviderRecords().filter((provider) => {
    const typeMatch = uiState.providerTypeFilter === "all" || provider.tipoUnidad === uiState.providerTypeFilter;
    const availabilityMatch = uiState.providerAvailabilityFilter === "all" || provider.disponibilidad === uiState.providerAvailabilityFilter;
    const queryMatch = !query || [
      provider.nombre,
      provider.contacto,
      provider.telefono,
      provider.email,
      provider.tipoUnidad,
      provider.configuracion,
      Array.isArray(provider.rutasCobertura) ? provider.rutasCobertura.join(", ") : "",
      provider.apertura,
      provider.usoTipico,
      provider.zona,
      provider.pais,
      provider.choferNombre,
      provider.choferTelefono,
      provider.choferLicencia,
      provider.camionPatente,
      provider.camionMarca,
      provider.camionModelo,
      provider.camionTipo,
      provider.mic,
      provider.dua,
      provider.disponibilidad,
      provider.observaciones
    ].some((value) => normalizeText(value).includes(query));
    const configMatch = !configQuery || normalizeText(provider.configuracion).includes(configQuery);
    return typeMatch && availabilityMatch && queryMatch && configMatch;
  });
}

function groupProvidersByTypeUnit(providers) {
  return PROVIDER_UNIT_TYPES.map((type) => ({
    type,
    records: providers.filter((provider) => provider.tipoUnidad === type.label)
  })).filter((group) => group.records.length);
}

function buildProviderFormModel(provider = null) {
  return {
    id: provider?.id || "",
    createdAt: provider?.createdAt || "",
    nombre: provider?.nombre || "",
    contacto: provider?.contacto || "",
    telefono: provider?.telefono || "",
    email: provider?.email || "",
    tipoUnidad: provider?.tipoUnidad || "Sider",
    configuracion: provider?.configuracion || "Semirremolque",
    apertura: provider?.apertura || "",
    usoTipico: provider?.usoTipico || "",
    zona: provider?.zona || "",
    pais: provider?.pais || "Uruguay",
    disponibilidad: provider?.disponibilidad || "Disponible",
    rutasCobertura: Array.isArray(provider?.rutasCobertura) ? provider.rutasCobertura : [],
    observaciones: provider?.observaciones || ""
  };
}

function renderCoverageChecklist(selected = []) {
  const selectedSet = new Set(Array.isArray(selected) ? selected : []);
  return `
    <div class="stack">
      <div class="detail-card">
        <h4>América</h4>
        <div class="stack">
          ${PROVIDER_COVERAGE_AREAS.america.map((item) => `
            <label class="check-item">
              <input type="checkbox" name="rutasCobertura" value="${escapeHtml(item)}"${selectedSet.has(item) ? " checked" : ""}>
              <span>
                <strong>${escapeHtml(item)}</strong>
                <small>Ruta o cobertura comercial</small>
              </span>
            </label>
          `).join("")}
        </div>
      </div>
      <div class="detail-card">
        <h4>Resto del mundo</h4>
        <div class="stack">
          ${PROVIDER_COVERAGE_AREAS.world.map((item) => `
            <label class="check-item">
              <input type="checkbox" name="rutasCobertura" value="${escapeHtml(item)}"${selectedSet.has(item) ? " checked" : ""}>
              <span>
                <strong>${escapeHtml(item)}</strong>
                <small>Ruta o cobertura comercial</small>
              </span>
            </label>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderCoverageChips(rutas = []) {
  const list = Array.isArray(rutas) ? rutas : [];
  if (!list.length) return `<span class="badge badge--neutral">Sin cobertura definida</span>`;
  return list.map((item) => badge(item, "info")).join(" ");
}

function renderChecklistTaskItem(task) {
  const customer = task.customerId ? getCustomerById(task.customerId) : null;
  const operation = task.operationId ? getOperationById(task.operationId) : null;
  return `
    <article class="timeline-item">
      <div class="timeline-item__title">
        <label class="check-item" style="display:flex;align-items:flex-start;gap:10px;">
          <input type="checkbox" disabled>
          <span>
            <strong>${escapeHtml(task.tarea)}</strong>
            <small>${escapeHtml(customer?.empresa || task.cliente || "Sin cliente")}</small>
          </span>
        </label>
        <span class="badge ${task.prioridad === "Alta" ? "badge--warning" : task.prioridad === "Media" ? "badge--info" : "badge--neutral"}">${escapeHtml(task.prioridad)}</span>
      </div>
      <div class="timeline-item__meta">
        ${escapeHtml(task.cliente || customer?.empresa || "Sin cliente")} | ${escapeHtml(task.fechaCompromiso || "Sin fecha")}
        ${task.recordatorio ? ` | ${escapeHtml(formatDateTime(task.recordatorio))}` : ""}
        ${operation ? ` | ${escapeHtml(operation.referencia || operation.contenedor || "Operacion")}` : ""}
      </div>
      <div class="hero-actions">
        <button type="button" class="btn btn--primary" data-action="mark-task-done" data-id="${escapeHtml(task.id)}">Marcar hecha</button>
        ${routeButton("Abrir agenda", "agenda", "secondary")}
        ${routeButton("Abrir cliente", customer ? `customer/${customer.id}` : "customer", "ghost")}
      </div>
    </article>
  `;
}

function renderRecentQuoteCard(quote) {
  const calc = quote.calculation || calculateQuote(quote);
  return `
    <article class="record-card">
      <strong>${escapeHtml(quote.cliente || quote.empresa || "Sin cliente")}</strong>
      <p>${escapeHtml(quote.paisOrigen || "Origen")} -> ${escapeHtml(quote.paisDestino || "Destino")} | ${escapeHtml(quote.proveedor || "Sin proveedor")}</p>
      <div class="data-grid">
        <span><strong>Moneda</strong>${escapeHtml(calc.currency)}</span>
        <span><strong>Sugerido</strong>${escapeHtml(formatMoney(calc.suggestedPrice, calc.currency))}</span>
        <span><strong>Operacion</strong>${escapeHtml(quote.tipoOperacion || "Sin operacion")}</span>
      </div>
      <div class="hero-actions">
        ${routeButton("Abrir", `quote/${quote.id}`, "secondary")}
      </div>
    </article>
  `;
}

function renderCommercialCustomerCards() {
  const query = normalizeText(uiState.customerQuery);
  const customers = listCustomerRecords()
    .filter((customer) => {
      if (!query) return true;
      return [
        customer.nombre,
        customer.empresa,
        customer.contactoPrincipal,
        customer.telefono,
        customer.email,
        customer.ciudad,
        customer.pais,
        customer.observacionesClave
      ].some((value) => normalizeText(value).includes(query));
    })
    .slice(0, 6);

  return customers.map((customer) => {
    const activity = getCustomerActivityFeed(customer.id)[0];
    const task = listTaskRecords().find((item) => item.customerId === customer.id && item.estado !== "Hecha") || null;
    const crm = listCrmRecords().find((item) => item.customerId === customer.id) || null;
    return `
      <article class="record-card">
        <strong>${escapeHtml(customer.empresa || customer.nombre)}</strong>
        <p>${escapeHtml(customer.contactoPrincipal || "Sin contacto")} | ${escapeHtml(customer.ciudad || "Sin ciudad")} - ${escapeHtml(customer.pais || "Sin pais")}</p>
        <div class="data-grid">
          <span><strong>Ultima actividad</strong>${escapeHtml(activity ? formatDateTime(activity.at) : "Sin actividad")}</span>
          <span><strong>Tarea pendiente</strong>${escapeHtml(task ? task.tarea : "Sin tarea pendiente")}</span>
          <span><strong>Seguimiento</strong>${escapeHtml(crm?.proximaAccion || "Sin proxima accion")}</span>
          <span><strong>Estado</strong>${escapeHtml(customer.tipoCliente || "Sin estado")}</span>
        </div>
        <div class="hero-actions">
          ${routeButton("Abrir cliente", `customer/${customer.id}`, "secondary")}
          ${routeButton("Editar cliente", `customer/${customer.id}`, "ghost")}
        </div>
      </article>
    `;
  });
}

function renderCommercialProviderCards() {
  const query = normalizeText(uiState.providerQuery);
  const configQuery = normalizeText(uiState.providerConfigQuery);
  const providers = listProviderRecords().filter((provider) => {
    const typeMatch = uiState.providerTypeFilter === "all" || provider.tipoUnidad === uiState.providerTypeFilter;
    const availabilityMatch = uiState.providerAvailabilityFilter === "all" || provider.disponibilidad === uiState.providerAvailabilityFilter;
    const queryMatch = !query || [
      provider.nombre,
      provider.contacto,
      provider.telefono,
      provider.email,
      provider.tipoUnidad,
      provider.configuracion,
      Array.isArray(provider.rutasCobertura) ? provider.rutasCobertura.join(", ") : "",
      provider.apertura,
      provider.usoTipico,
      provider.zona,
      provider.pais,
      provider.choferNombre,
      provider.choferTelefono,
      provider.choferLicencia,
      provider.camionPatente,
      provider.camionMarca,
      provider.camionModelo,
      provider.camionTipo,
      provider.mic,
      provider.dua,
      provider.disponibilidad,
      provider.observaciones
    ].some((value) => normalizeText(value).includes(query));
    const configMatch = !configQuery || normalizeText(provider.configuracion).includes(configQuery);
    return typeMatch && availabilityMatch && queryMatch && configMatch;
  });

  const groups = PROVIDER_UNIT_TYPES.map((type) => ({
    ...type,
    records: providers.filter((provider) => provider.tipoUnidad === type.label)
  })).filter((group) => group.records.length);

  return groups.map((group) => `
    <article class="detail-card">
      <div class="list-item__title">
        <strong>${escapeHtml(group.label)}</strong>
        <span class="badge badge--info">${escapeHtml(String(group.records.length))}</span>
      </div>
      <p>${escapeHtml(group.apertura)} | ${escapeHtml(group.usoTipico)}</p>
      <div class="stack">
        ${group.records.slice(0, 3).map((provider) => renderProviderCompactCard(provider)).join("")}
      </div>
    </article>
  `).join("");
}

function renderProviderCompactCard(provider) {
  return `
    <article class="list-item">
      <div class="list-item__title">
        <strong>${escapeHtml(provider.nombre)}</strong>
        <span class="badge badge--${provider.disponibilidad === "Disponible" ? "success" : provider.disponibilidad === "En viaje" ? "warning" : "neutral"}">${escapeHtml(provider.disponibilidad)}</span>
      </div>
      <div class="list-item__meta">
        ${escapeHtml(provider.contacto || "Sin contacto")} | ${escapeHtml(provider.zona || "Sin zona")} | ${escapeHtml(provider.configuracion || "Sin configuracion")}
      </div>
      <div class="list-item__meta">${escapeHtml(Array.isArray(provider.rutasCobertura) && provider.rutasCobertura.length ? provider.rutasCobertura.join(", ") : "Sin cobertura definida")}</div>
      <div class="hero-actions">
        ${routeButton("Abrir proveedor", `providers/${provider.id}`, "secondary")}
        ${routeButton("Editar", `providers/edit/${provider.id}`, "ghost")}
      </div>
    </article>
  `;
}

function renderBackupSection() {
  const feedback = uiState.backupFeedback;
  return `
    <section class="surface-card">
      ${sectionHeader("Backup local", "Export/import JSON", "Respaldo local-first de CRM, clientes, cotizaciones, agenda, operaciones, actividad y configuracion.")}
      ${feedback ? `
        <div class="alert alert--${escapeHtml(feedback.tone || "info")}">
          <strong>${escapeHtml(feedback.title || "Backup")}</strong>
          <p>${escapeHtml(feedback.details || "")}</p>
          <button type="button" class="btn btn--ghost" data-action="clear-backup-feedback">Ocultar</button>
        </div>
      ` : ""}
      <div class="detail-grid">
        <div class="detail-card">
          <strong>Exportar</strong>
          <p>Descarga un JSON con version, session, settings, crm, customers, quotes, agenda, operations y activityLog.</p>
	<button type="button" class="btn btn--primary" data-action="export-backup">Exportar JSON local</button>
        </div>
        <form class="form-grid detail-card" data-form="backup-import">
          <input type="hidden" name="mode" value="merge">
          ${textareaField("JSON de respaldo", "backupJson", "", "Pega aqui el JSON exportado desde JoathiVA V1.", "12")}
          <label class="field" data-span="12">
            <span class="field__label">Modo de importacion</span>
            <select class="field__control" name="importMode">
              <option value="merge">Importar fusionando por ID, sin borrar datos existentes</option>
              <option value="replace">Restaurar reemplazando colecciones locales</option>
            </select>
            <span class="field__hint">La restauracion requiere confirmacion explicita para evitar perdida accidental.</span>
          </label>
          <label class="field" data-span="12">
            <span class="field__label">Confirmacion para restaurar</span>
            <span class="field__hint">
              <input type="checkbox" name="confirmReplace" value="yes">
              Confirmo que quiero reemplazar datos locales si elijo restaurar.
            </span>
          </label>
          <div class="field field--full">
            <div class="btn-row">
              <button type="submit" class="btn btn--accent">Validar e importar</button>
            </div>
          </div>
        </form>
      </div>
    </section>
  `;
}

function renderNotFoundScreen(message = "No encontramos la pantalla solicitada.") {
  return `
    <section class="page">
      <div class="empty-state">
        <strong>Pantalla no disponible</strong>
        <p>${escapeHtml(message)}</p>
        <div class="btn-row">
          ${routeButton("Ir al inicio", "home", "primary")}
          ${routeButton("Abrir menu", "menu", "secondary")}
        </div>
      </div>
    </section>
  `;
}

function renderMetricGrid(items) {
  return `
    <section class="kpi-grid">
      ${items.map((item) => `
        <article class="metric-card">
          <span class="metric-card__label">${escapeHtml(item.label)}</span>
          <div class="metric-card__value">${escapeHtml(String(item.value))}</div>
          <span class="metric-card__meta">${escapeHtml(item.meta)}</span>
        </article>
      `).join("")}
    </section>
  `;
}

function renderCrmTable(records) {
  if (!records.length) {
    return emptyState("Sin oportunidades", "Ajusta filtros o crea un nuevo prospecto.");
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Contacto</th>
            <th>Etapa</th>
            <th>Proxima accion</th>
            <th>Seguimiento</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((record, index) => `
            <tr class="${index === 0 ? "is-selected" : ""}">
              <td>
                <button type="button" class="btn btn--text" data-route="crm/${escapeHtml(record.id)}">
                  <span class="table-cell-stack">
                    <strong>${escapeHtml(record.nombre)}</strong>
                    <span>${escapeHtml(record.empresa)}</span>
                  </span>
                </button>
              </td>
              <td>
                <div class="table-cell-stack">
                  <strong>${escapeHtml(record.contacto)}</strong>
                  <span>${escapeHtml(record.telefono)}</span>
                  <span>${escapeHtml(record.email)}</span>
                </div>
              </td>
              <td>${badge(record.etapa, stageTone(record.etapa))}</td>
              <td>${escapeHtml(record.proximaAccion || "Sin accion")}</td>
              <td>${escapeHtml(record.fechaSeguimiento || "Sin fecha")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCrmSummaryCard(record) {
  return `
    <div class="detail-card">
      <div class="list-item__title">
        <strong>${escapeHtml(record.nombre)}</strong>
        ${badge(record.etapa, stageTone(record.etapa))}
      </div>
      <p>${escapeHtml(record.empresa)}</p>
      <div class="timeline">
        ${miniDetail("Contacto", record.contacto)}
        ${miniDetail("Telefono", record.telefono)}
        ${miniDetail("Email", record.email)}
        ${miniDetail("Proxima accion", record.proximaAccion || "Sin accion")}
        ${miniDetail("Seguimiento", record.fechaSeguimiento || "Sin fecha")}
      </div>
      <div class="btn-row">
        ${routeButton("Abrir detalle", `crm/${record.id}`, "secondary")}
        ${routeButton("Nueva cotizacion", "quote", "accent")}
      </div>
    </div>
  `;
}

function renderQuoteTable(records) {
  if (!records.length) {
    return emptyState("Sin cotizaciones", "No hay cotizaciones que coincidan con el filtro.");
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Ruta</th>
            <th>Operacion</th>
            <th>Moneda</th>
            <th>Precio sugerido</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((quote) => {
            const calc = quote.calculation || calculateQuote(quote);
            return `
              <tr>
                <td>
                  <button type="button" class="btn btn--text" data-route="quote/${escapeHtml(quote.id)}">
                    <span class="table-cell-stack">
                      <strong>${escapeHtml(quote.cliente || quote.empresa || "Sin cliente")}</strong>
                      <span>${escapeHtml(quote.proveedor || "Sin proveedor")}</span>
                    </span>
                  </button>
                </td>
                <td>${escapeHtml(quote.paisOrigen || "")} -> ${escapeHtml(quote.paisDestino || "")}</td>
                <td>${badge(quote.tipoOperacion || "Importacion", quoteTone(quote.tipoOperacion))}</td>
                <td>${escapeHtml(calc.currency)}</td>
                <td><strong>${escapeHtml(formatMoney(calc.suggestedPrice, calc.currency))}</strong></td>
                <td>${escapeHtml(formatDate(quote.createdAt))}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTaskSummaryItem(task) {
  const customer = task.customerId ? getCustomerById(task.customerId) : null;
  const operation = task.operationId ? getOperationById(task.operationId) : null;
  return `
    <article class="timeline-item">
      <div class="timeline-item__title">
        <strong>${escapeHtml(task.tarea)}</strong>
        ${badge(task.prioridad, priorityTone(task.prioridad))}
      </div>
      <div class="timeline-item__meta">
        ${escapeHtml(task.cliente || customer?.empresa || "Sin cliente")} | ${escapeHtml(task.estado)} | ${escapeHtml(task.fechaCompromiso || "Sin fecha")}${operation ? ` | ${escapeHtml(operation.referencia || operation.contenedor || "Operacion")}` : ""}
      </div>
      <div class="btn-row">
        ${routeButton("Abrir", `agenda/${task.id}`, "secondary")}
        ${routeButton("Editar", `agenda/edit/${task.id}`, "ghost")}
        ${routeButton("Cliente", customer ? `customer/${customer.id}` : "customer", "ghost")}
        ${operation ? routeButton("Operacion", `operations/${operation.id}`, "ghost") : ""}
      </div>
    </article>
  `;
}

function getOperationCustomerLabel(operation) {
  const customer = operation?.clientId ? getCustomerById(operation.clientId) : null;
  return customer?.empresa || customer?.nombre || operation?.clientId || "Sin cliente";
}

function getOperationReferenceLabel(operation) {
  return operation?.referencia || operation?.contenedor || operation?.id || "Operacion";
}

function buildOperationChecklistModel(checklist = {}) {
  return OPERATION_CHECKLIST_ITEMS.reduce((acc, item) => {
    acc[item.key] = Boolean(checklist[item.key]);
    return acc;
  }, {});
}

function buildOperationFormModel(operation = null) {
  return {
    id: operation?.id || "",
    createdAt: operation?.createdAt || "",
    clientId: operation?.clientId || (!operation && uiState.operationCustomerId) || "",
    tipoOperacion: operation?.tipoOperacion || "Exportacion",
    referencia: operation?.referencia || "",
    contenedor: operation?.contenedor || "",
    dua: operation?.dua || operation?.duaNumber || "",
    origen: operation?.origen || "",
    destino: operation?.destino || "",
    fechaArribo: formatDateInputValue(operation?.fechaArribo || ""),
    fechaCarga: formatDateInputValue(operation?.fechaCarga || ""),
    fechaDevolucion: formatDateInputValue(operation?.fechaDevolucion || ""),
    poloLogistico: operation?.poloLogistico || "",
    despachanteUY: operation?.despachanteUY || "",
    despachantePY: operation?.despachantePY || "",
    estadoOperacion: operation?.estadoOperacion || "Arribo detectado",
    riesgo: operation?.riesgo || "Bajo",
    observaciones: operation?.observaciones || "",
    documentChecklist: buildOperationChecklistModel(operation?.documentChecklist)
  };
}

function filterOperationRecords() {
  const query = normalizeText(uiState.operationQuery);
  return listOperationRecords().filter((operation) => {
    const stateMatch = uiState.operationStateFilter === "all" || operation.estadoOperacion === uiState.operationStateFilter;
    const riskMatch = uiState.operationRiskFilter === "all" || operation.riesgo === uiState.operationRiskFilter;
    const customer = operation.clientId ? getCustomerById(operation.clientId) : null;
    const queryMatch = !query || [
      operation.referencia,
      operation.contenedor,
      operation.dua,
      operation.duaNumber,
      operation.origen,
      operation.destino,
      operation.poloLogistico,
      operation.despachanteUY,
      operation.despachantePY,
      operation.estadoOperacion,
      operation.riesgo,
      operation.observaciones,
      customer?.empresa,
      customer?.nombre
    ].some((value) => normalizeText(value).includes(query));
    return stateMatch && riskMatch && queryMatch;
  });
}

function renderOperationTable(records) {
  if (!records.length) {
    return emptyState("Sin operaciones", "Ajusta filtros o crea un nuevo expediente.");
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Referencia</th>
            <th>Ruta</th>
            <th>Estado</th>
            <th>Riesgo</th>
            <th>Checklist</th>
            <th>Fechas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((operation, index) => {
            const customerLabel = getOperationCustomerLabel(operation);
            const progress = getOperationChecklistProgress(operation);
            return `
              <tr class="${index === 0 ? "is-selected" : ""}">
                <td>
                  <div class="table-cell-stack">
                    <strong>${escapeHtml(customerLabel)}</strong>
                    <span>${escapeHtml(operation.tipoOperacion || "Operacion")}</span>
                  </div>
                </td>
                <td>
                  <div class="table-cell-stack">
                    <strong>${escapeHtml(getOperationReferenceLabel(operation))}</strong>
                    <span>${escapeHtml(operation.dua ? `DUA ${operation.dua}` : operation.contenedor || "Sin contenedor")}</span>
                  </div>
                </td>
                <td>
                  <div class="table-cell-stack">
                    <strong>${escapeHtml(operation.origen || "Origen")} -> ${escapeHtml(operation.destino || "Destino")}</strong>
                    <span>${escapeHtml(operation.poloLogistico || "Sin polo logístico")}</span>
                  </div>
                </td>
                <td>${badge(operation.estadoOperacion || "Sin estado", operationStateTone(operation.estadoOperacion))}</td>
                <td>${badge(operation.riesgo || "Sin riesgo", operationRiskTone(operation.riesgo))}</td>
                <td>${badge(`${progress.completed}/${progress.total}`, progress.percent === 100 ? "success" : progress.completed > 0 ? "warning" : "neutral")}</td>
                <td>
                  <div class="table-cell-stack">
                    <span>${escapeHtml(operation.fechaArribo || "Sin arribo")}</span>
                    <span>${escapeHtml(operation.fechaDevolucion || "Sin devolucion")}</span>
                  </div>
                </td>
                <td>
                  <div class="btn-row">
                    ${routeButton("Abrir", `operations/${operation.id}`, "secondary")}
                    ${routeButton("Editar", `operations/edit/${operation.id}`, "ghost")}
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderOperationSummaryCard(operation) {
  const customerLabel = getOperationCustomerLabel(operation);
  const progress = getOperationChecklistProgress(operation);
  const alerts = getOperationAlerts(operation);
  return `
    <div class="detail-card">
      <div class="list-item__title">
        <strong>${escapeHtml(getOperationReferenceLabel(operation))}</strong>
        ${badge(operation.estadoOperacion || "Sin estado", operationStateTone(operation.estadoOperacion))}
      </div>
      <p>${escapeHtml(customerLabel)} | ${escapeHtml(operation.origen || "Origen")} -> ${escapeHtml(operation.destino || "Destino")}</p>
      <div class="timeline">
        ${miniDetail("Contenedor", operation.contenedor || "Sin contenedor")}
        ${miniDetail("DUA", operation.dua || "Sin DUA")}
        ${miniDetail("Riesgo", operation.riesgo || "Sin riesgo")}
        ${miniDetail("Checklist", `${progress.completed}/${progress.total} completos`)}
        ${miniDetail("Devolucion", operation.fechaDevolucion || "Sin fecha")}
      </div>
      <div class="stack">
        ${alerts.slice(0, 2).map((alert) => renderAlertCard(alert, false)).join("")}
      </div>
      <div class="btn-row">
        ${routeButton("Abrir detalle", `operations/${operation.id}`, "secondary")}
        ${routeButton("Editar operacion", `operations/edit/${operation.id}`, "accent")}
      </div>
    </div>
  `;
}

function renderOperationSummaryItem(operation) {
  const customerLabel = getOperationCustomerLabel(operation);
  const progress = getOperationChecklistProgress(operation);
  return `
    <article class="timeline-item">
      <div class="timeline-item__title">
        <strong>${escapeHtml(getOperationReferenceLabel(operation))}</strong>
        ${badge(operation.riesgo || "Sin riesgo", operationRiskTone(operation.riesgo))}
      </div>
      <div class="timeline-item__meta">
        ${escapeHtml(customerLabel)} | ${escapeHtml(operation.estadoOperacion || "Sin estado")} | ${escapeHtml(operation.dua ? `DUA ${operation.dua}` : operation.contenedor || "Sin contenedor")} | ${progress.completed}/${progress.total} docs
      </div>
      <div class="btn-row">
        ${routeButton("Abrir", `operations/${operation.id}`, "secondary")}
        ${routeButton("Editar", `operations/edit/${operation.id}`, "ghost")}
      </div>
    </article>
  `;
}

function renderAlertCard(alert, showAction = true) {
  const tone = alert?.tone || "neutral";
  const action = showAction && alert?.operationId ? routeButton("Abrir operacion", `operations/${alert.operationId}`, "secondary") : "";
  return `
    <article class="alert alert--${escapeHtml(tone)}">
      <div class="list-item__title">
        <strong>${escapeHtml(alert?.title || alert?.label || "Alerta")}</strong>
        ${badge(alert?.label || "Alerta", tone)}
      </div>
      <p>${escapeHtml(alert?.details || "Sin detalle")}</p>
      ${action}
    </article>
  `;
}

function checklistItem(item, checked = false) {
  return `
    <label class="check-item">
      <input type="checkbox" name="${escapeHtml(item.key)}"${checked ? " checked" : ""}>
      <span>
        <strong>${escapeHtml(item.label)}</strong>
        <small>${checked ? "Confirmado" : "Pendiente"}</small>
      </span>
    </label>
  `;
}

function renderQuotePreview(calculation, draft) {
  return `
    <div class="detail-card">
      <div class="list-item__title">
        <strong>Previsualizacion</strong>
        ${badge(calculation.split.label, calculation.appliesIva ? "info" : "neutral")}
      </div>
      <p>${escapeHtml(draft.origen || "Origen")} -> ${escapeHtml(draft.destino || "Destino")} | ${escapeHtml(calculation.currency)}</p>
      <div class="timeline">
        ${calculation.lines.map((line) => `
          <div class="quote-line">
            <span>${escapeHtml(line.label)}</span>
            <strong>${escapeHtml(formatMoney(line.amount, calculation.currency))}</strong>
          </div>
        `).join("")}
      </div>
      <div class="quote-line">
        <span>IVA</span>
        <strong>${escapeHtml(formatMoney(calculation.ivaAmount, calculation.currency))}</strong>
      </div>
      <div class="quote-total">
        <strong>Precio sugerido</strong>
        <strong>${escapeHtml(formatMoney(calculation.suggestedPrice, calculation.currency))}</strong>
      </div>
      <div class="alert alert--info">
        <strong>Nota</strong>
        <p>El tipo de cambio solo se usa para convertir los cargos fijos USD cuando la moneda elegida es UYU.</p>
      </div>
    </div>
  `;
}

function saveCrmForm(form) {
  const data = new FormData(form);
  const record = {
    id: String(data.get("id") || "") || undefined,
    createdAt: String(data.get("createdAt") || "") || undefined,
    customerId: String(data.get("customerId") || ""),
    nombre: String(data.get("nombre") || "").trim(),
    empresa: String(data.get("empresa") || "").trim(),
    contacto: String(data.get("contacto") || "").trim(),
    telefono: String(data.get("telefono") || "").trim(),
    email: String(data.get("email") || "").trim(),
    origenLead: String(data.get("origenLead") || "Referencia"),
    ejecutivo: String(data.get("ejecutivo") || state.session.userName || "Equipo comercial"),
    etapa: String(data.get("etapa") || "Prospecto"),
    ultimaInteraccion: String(data.get("ultimaInteraccion") || new Date().toISOString()),
    proximaAccion: String(data.get("proximaAccion") || "").trim(),
    fechaSeguimiento: String(data.get("fechaSeguimiento") || ""),
    notas: String(data.get("notas") || "").trim(),
    estadoCliente: String(data.get("estadoCliente") || "Prospecto")
  };

  const errors = validateCrmRecord(record);
  if (Object.keys(errors).length) {
    showFormErrors(form, errors);
    return;
  }

  clearFormErrors(form);
  const saved = upsertCrmRecord(record);
  uiState.customerId = saved.customerId;
  uiState.crmQuery = saved.nombre;
  navigate(`crm/${saved.id}`);
}

function saveQuoteForm(form) {
  const data = new FormData(form);
  syncQuoteDraftFromForm(form);
  const calculation = calculateQuote(uiState.quoteDraft);
  const customer = getCustomerById(String(data.get("customerId") || uiState.quoteDraft.customerId || ""));
  const isEditing = Boolean(String(data.get("id") || ""));
  const record = {
    id: String(data.get("id") || "") || undefined,
    createdAt: String(data.get("createdAt") || "") || undefined,
    customerId: String(data.get("customerId") || uiState.quoteDraft.customerId || customer?.id || ""),
    cliente: customer?.nombre || customer?.empresa || String(data.get("customerId") || ""),
    origen: String(data.get("origen") || "").trim(),
    destino: String(data.get("destino") || "").trim(),
    paisOrigen: String(data.get("paisOrigen") || "Brasil"),
    paisDestino: String(data.get("paisDestino") || "Uruguay"),
    tipoOperacion: String(data.get("tipoOperacion") || "Importacion"),
    modoTransporte: String(data.get("modoTransporte") || "Terrestre"),
    proveedor: String(data.get("proveedor") || "").trim(),
    costoProveedor: roundMoney(toNumber(data.get("costoProveedor"))),
    gastosAdicionales: roundMoney(toNumber(data.get("gastosAdicionales"))),
    seguro: roundMoney(toNumber(data.get("seguro"))),
    horasExtra: roundMoney(toNumber(data.get("horasExtra"))),
    estadiaAduanaDias: roundMoney(toNumber(data.get("estadiaAduanaDias"))),
    margenPct: roundMoney(toNumber(data.get("margenPct")) || QUOTE_DEFAULT_MARGIN),
    moneda: String(data.get("currency") || "USD"),
    tipoCambio: roundMoney(toNumber(data.get("exchangeRate")) || 1),
    observaciones: String(data.get("observaciones") || "").trim(),
    calculation,
    updatedAt: new Date().toISOString()
  };

  const errors = validateQuoteRecord(record);
  if (Object.keys(errors).length) {
    showFormErrors(form, errors);
    return;
  }

  clearFormErrors(form);
  const saved = upsertQuoteRecord(record);
  uiState.quoteDraft = createDefaultQuoteDraft();
  setSetting("preferredCurrency", record.moneda);
  navigate(isEditing ? `quote/${saved.id}` : "quotes");
}

function saveTaskForm(form) {
  const data = new FormData(form);
  const operationId = String(data.get("operationId") || "");
  const linkedOperation = operationId ? getOperationById(operationId) : null;
  const customerId = linkedOperation?.clientId || String(data.get("customerId") || "");
  const customer = getCustomerById(customerId) || (linkedOperation?.clientId ? getCustomerById(linkedOperation.clientId) : null);
  const record = {
    id: String(data.get("id") || "") || undefined,
    createdAt: String(data.get("createdAt") || "") || undefined,
    customerId,
    operationId,
    cliente: customer?.empresa || String(customerId || ""),
    tarea: String(data.get("tarea") || "").trim(),
    prioridad: String(data.get("prioridad") || "Alta"),
    fechaCompromiso: String(data.get("fechaCompromiso") || ""),
    recordatorio: String(data.get("recordatorio") || ""),
    estado: String(data.get("estado") || "Pendiente"),
    observaciones: String(data.get("observaciones") || "").trim()
  };

  const errors = validateTaskRecord(record);
  if (Object.keys(errors).length) {
    showFormErrors(form, errors);
    return;
  }

  clearFormErrors(form);
  const saved = upsertTaskRecord(record);
  uiState.taskOperationId = "";
  uiState.taskCustomerId = "";
  navigate(`agenda/${saved.id}`);
}

function saveOperationForm(form) {
  const data = new FormData(form);
  const clientId = String(data.get("clientId") || "");
  const documentChecklist = Object.fromEntries(OPERATION_CHECKLIST_ITEMS.map((item) => [item.key, data.has(item.key)]));
  const record = {
    id: String(data.get("id") || "") || undefined,
    createdAt: String(data.get("createdAt") || "") || undefined,
    clientId,
    tipoOperacion: String(data.get("tipoOperacion") || "Exportacion"),
    referencia: String(data.get("referencia") || "").trim(),
    contenedor: String(data.get("contenedor") || "").trim(),
    dua: String(data.get("dua") || "").trim(),
    origen: String(data.get("origen") || "").trim(),
    destino: String(data.get("destino") || "").trim(),
    fechaArribo: String(data.get("fechaArribo") || ""),
    fechaCarga: String(data.get("fechaCarga") || ""),
    fechaDevolucion: String(data.get("fechaDevolucion") || ""),
    poloLogistico: String(data.get("poloLogistico") || "").trim(),
    despachanteUY: String(data.get("despachanteUY") || "").trim(),
    despachantePY: String(data.get("despachantePY") || "").trim(),
    estadoOperacion: String(data.get("estadoOperacion") || "Arribo detectado"),
    riesgo: String(data.get("riesgo") || "Bajo"),
    observaciones: String(data.get("observaciones") || "").trim(),
    documentChecklist
  };

  const errors = validateOperationRecord(record);
  if (Object.keys(errors).length) {
    showFormErrors(form, errors);
    return;
  }

  clearFormErrors(form);
  const saved = upsertOperationRecord(record);
  uiState.operationCustomerId = "";
  navigate(`operations/${saved.id}`);
}

function saveCustomerForm(form) {
  const data = new FormData(form);
  const record = {
    id: String(data.get("id") || ""),
    nombre: String(data.get("nombre") || "").trim(),
    empresa: String(data.get("empresa") || "").trim(),
    contactoPrincipal: String(data.get("contactoPrincipal") || "").trim(),
    telefono: String(data.get("telefono") || "").trim(),
    email: String(data.get("email") || "").trim(),
    tipoCliente: String(data.get("tipoCliente") || "").trim(),
    ciudad: String(data.get("ciudad") || "").trim(),
    pais: String(data.get("pais") || "").trim(),
    datosGenerales: String(data.get("datosGenerales") || "").trim(),
    condicionesPactadas: String(data.get("condicionesPactadas") || "").trim(),
    observacionesClave: String(data.get("observacionesClave") || "").trim()
  };

  const merged = {
    ...getCustomerById(record.id),
    ...record
  };
  const errors = validateCustomerRecord(merged);
  if (Object.keys(errors).length) {
    showFormErrors(form, errors);
    return;
  }

  clearFormErrors(form);
  const saved = upsertCustomerRecord(merged, {
    historyNote: `Ficha actualizada: ${merged.empresa || merged.nombre || "Cliente"}`
  });
  navigate(`customer/${saved.id}`);
}

function saveProviderForm(form) {
  const data = new FormData(form);
  const record = {
    id: String(data.get("id") || ""),
    nombre: String(data.get("nombre") || "").trim(),
    contacto: String(data.get("contacto") || "").trim(),
    telefono: String(data.get("telefono") || "").trim(),
    email: String(data.get("email") || "").trim(),
    tipoUnidad: String(data.get("tipoUnidad") || "").trim(),
    configuracion: String(data.get("configuracion") || "").trim(),
    apertura: String(data.get("apertura") || "").trim(),
    usoTipico: String(data.get("usoTipico") || "").trim(),
    zona: String(data.get("zona") || "").trim(),
    pais: String(data.get("pais") || "").trim(),
    disponibilidad: String(data.get("disponibilidad") || "").trim(),
    rutasCobertura: data.getAll("rutasCobertura").map((item) => String(item || "").trim()).filter(Boolean),
    observaciones: String(data.get("observaciones") || "").trim()
  };

  const merged = {
    ...(getProviderById(record.id) || {}),
    ...record
  };
  const wasUpdate = Boolean(record.id && getProviderById(record.id));

  const errors = validateProviderRecord(merged);
  if (Object.keys(errors).length) {
    showFormErrors(form, errors);
    return;
  }

  clearFormErrors(form);
  const saved = upsertProviderRecord(merged, {
    historyNote: `${wasUpdate ? "Ficha actualizada" : "Ficha creada"}: ${merged.nombre || "Proveedor"}`
  });
  navigate(`providers/${saved.id}`);
}

function saveProviderOperationalForm(form) {
  const data = new FormData(form);
  const id = String(data.get("id") || "").trim();
  const provider = getProviderById(id);
  if (!provider) {
    showFormErrors(form, { _form: "No encontramos el proveedor seleccionado." });
    return;
  }

  const merged = {
    ...provider,
    choferNombre: String(data.get("choferNombre") || "").trim(),
    choferTelefono: String(data.get("choferTelefono") || "").trim(),
    choferLicencia: String(data.get("choferLicencia") || "").trim(),
    camionPatente: String(data.get("camionPatente") || "").trim(),
    camionMarca: String(data.get("camionMarca") || "").trim(),
    camionModelo: String(data.get("camionModelo") || "").trim(),
    camionAnio: String(data.get("camionAnio") || "").trim(),
    camionTipo: String(data.get("camionTipo") || "").trim(),
    mic: String(data.get("mic") || "").trim(),
    dua: String(data.get("dua") || "").trim()
  };

  clearFormErrors(form);
  upsertProviderRecord(merged, {
    historyNote: "Datos operativos actualizados"
  });
  uiState.providerUploadFeedback = {
    tone: "success",
    title: "Operativa guardada",
    details: `${merged.nombre || "Proveedor"} actualizado con chofer, camion, MIC y DUA.`
  };
  renderApp(false);
}

function saveProviderTripForm(form) {
  const data = new FormData(form);
  const providerId = String(data.get("providerId") || "").trim();
  const provider = getProviderById(providerId);
  if (!provider) {
    showFormErrors(form, { _form: "No encontramos el proveedor seleccionado." });
    return;
  }

  const trip = {
    fecha: String(data.get("fecha") || "").trim(),
    origen: String(data.get("origen") || "").trim(),
    destino: String(data.get("destino") || "").trim(),
    estado: String(data.get("estado") || "Planificado").trim(),
    observaciones: String(data.get("observaciones") || "").trim()
  };

  if (!trip.fecha || !trip.origen || !trip.destino) {
    showFormErrors(form, {
      fecha: "Completa la fecha.",
      origen: "Completa el origen.",
      destino: "Completa el destino."
    });
    return;
  }

  const merged = {
    ...provider,
    viajes: [trip, ...(Array.isArray(provider.viajes) ? provider.viajes : [])]
  };

  clearFormErrors(form);
  upsertProviderRecord(merged, {
    historyNote: `Viaje agregado ${trip.origen} -> ${trip.destino}`
  });
  uiState.providerTripFeedback = {
    tone: "success",
    title: "Viaje agregado",
    details: `${trip.origen} -> ${trip.destino} registrado en el historial.`
  };
  form.reset();
  renderApp(false);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

async function saveProviderUploadFile(target) {
  const providerId = String(target.getAttribute("data-provider-id") || "").trim();
  const kind = String(target.getAttribute("data-provider-upload") || "").trim();
  const provider = getProviderById(providerId);
  const file = target.files && target.files[0];
  if (!provider || !kind || !file) return;

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const documentRecord = {
      kind,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size || 0,
      uploadedAt: new Date().toISOString(),
      dataUrl
    };

    const merged = {
      ...provider,
      documentosOperativos: [documentRecord, ...(Array.isArray(provider.documentosOperativos) ? provider.documentosOperativos : [])]
    };

    upsertProviderRecord(merged, {
      historyNote: `Archivo cargado: ${kind} | ${file.name}`
    });
    uiState.providerUploadFeedback = {
      tone: "success",
      title: "Archivo cargado",
      details: `${kind}: ${file.name}`
    };
    target.value = "";
    renderApp(false);
  } catch (error) {
    uiState.providerUploadFeedback = {
      tone: "danger",
      title: "Error de carga",
      details: error?.message || "No se pudo procesar el archivo."
    };
    renderApp(false);
  }
}

function exportBackupJson() {
  const backup = exportLocalBackup();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const fileName = `joathiva-v1-backup-${stamp}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  uiState.backupFeedback = {
    tone: "success",
    title: "Export generado",
    details: `${fileName} incluye ${backup.customers.length} clientes, ${backup.providers.length} proveedores, ${backup.operations.length} operaciones y ${backup.activityLog.length} actividades.`
  };
  renderApp(false);
}

function importBackupForm(form) {
  const data = new FormData(form);
  const backupJson = String(data.get("backupJson") || "").trim();
  const mode = String(data.get("importMode") || "merge");
  const confirmReplace = data.get("confirmReplace") === "yes";

  if (!backupJson) {
    showFormErrors(form, { backupJson: "Pega el JSON de respaldo antes de importar." });
    return;
  }

  if (mode === "replace" && !confirmReplace) {
    showFormErrors(form, { confirmReplace: "Confirma explicitamente la restauracion con reemplazo." });
    return;
  }

  if (mode === "replace" && !window.confirm("Esta restauracion reemplaza colecciones locales por el contenido del JSON. ¿Continuar?")) {
    return;
  }

  const result = importLocalBackup(backupJson, { mode });
  if (!result.ok) {
    showFormErrors(form, result.errors || { _form: "No se pudo importar el respaldo." });
    return;
  }

  clearFormErrors(form);
  form.reset();
  uiState.backupFeedback = {
    tone: "success",
    title: result.mode === "replace" ? "Backup restaurado" : "Backup importado",
    details: `Operaciones: ${result.countsBefore.operations} -> ${result.countsAfter.operations}. Clientes: ${result.countsBefore.customers} -> ${result.countsAfter.customers}. Proveedores: ${result.countsBefore.providers} -> ${result.countsAfter.providers}. Actividad: ${result.countsBefore.activityLog} -> ${result.countsAfter.activityLog}.`
  };
  renderApp(false);
}

function markTaskDone(id) {
  const task = getTaskById(id);
  if (!task) return;
  upsertTaskRecord({
    ...task,
    estado: "Hecha"
  });
  navigate("agenda");
}

function syncQuoteDraftFromForm(form) {
  if (!form) return;
  const data = new FormData(form);
  uiState.quoteDraft = {
    ...uiState.quoteDraft,
    customerId: String(data.get("customerId") || uiState.quoteDraft.customerId || ""),
    origen: String(data.get("origen") || uiState.quoteDraft.origen || ""),
    destino: String(data.get("destino") || uiState.quoteDraft.destino || ""),
    paisOrigen: String(data.get("paisOrigen") || uiState.quoteDraft.paisOrigen || "Brasil"),
    paisDestino: String(data.get("paisDestino") || uiState.quoteDraft.paisDestino || "Uruguay"),
    tipoOperacion: String(data.get("tipoOperacion") || uiState.quoteDraft.tipoOperacion || "Importacion"),
    modoTransporte: String(data.get("modoTransporte") || uiState.quoteDraft.modoTransporte || "Terrestre"),
    proveedor: String(data.get("proveedor") || uiState.quoteDraft.proveedor || ""),
    costoProveedor: String(data.get("costoProveedor") || uiState.quoteDraft.costoProveedor || 0),
    gastosAdicionales: String(data.get("gastosAdicionales") || uiState.quoteDraft.gastosAdicionales || 0),
    seguro: String(data.get("seguro") || uiState.quoteDraft.seguro || 0),
    horasExtra: String(data.get("horasExtra") || uiState.quoteDraft.horasExtra || 0),
    estadiaAduanaDias: String(data.get("estadiaAduanaDias") || uiState.quoteDraft.estadiaAduanaDias || 0),
    margenPct: String(data.get("margenPct") || uiState.quoteDraft.margenPct || QUOTE_DEFAULT_MARGIN),
    currency: String(data.get("currency") || uiState.quoteDraft.currency || "USD"),
    exchangeRate: String(data.get("exchangeRate") || uiState.quoteDraft.exchangeRate || 1),
    observaciones: String(data.get("observaciones") || uiState.quoteDraft.observaciones || "")
  };
}

function updateQuotePreview(form) {
  const preview = document.querySelector("[data-quote-preview]");
  if (!preview || !form) return;
  syncQuoteDraftFromForm(form);
  const calculation = calculateQuote(uiState.quoteDraft);
  preview.innerHTML = renderQuotePreview(calculation, uiState.quoteDraft);
}

function navigate(route) {
  if (!route) return;
  const normalized = route.startsWith("#") ? route : `#${route}`;
  if (!state.session.active && !normalized.startsWith("#access")) {
    location.hash = "#access";
    return;
  }
  location.hash = normalized;
}

function resolveRoute() {
  const raw = location.hash.replace(/^#/, "").trim();
  const source = raw || (state.session.active ? "home" : "access");
  const normalized = source.replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  const [section, maybeId, maybeTail] = segments;

  if (!section || section === "home") {
    return { name: "home" };
  }

  if (section === "access" || section === "login") {
    return { name: "access" };
  }

  if (section === "menu") {
    return { name: "menu" };
  }

  if (section === "crm") {
    if (maybeId === "new") return { name: "crm-new" };
    if (maybeId === "edit" && maybeTail) return { name: "crm-edit", id: stripQuery(maybeTail) };
    if (maybeId) return { name: "crm-detail", id: stripQuery(maybeId) };
    return { name: "crm" };
  }

  if (section === "quote") {
    if (maybeId === "new") return { name: "quote" };
    if (maybeId === "edit" && maybeTail) return { name: "quote-edit", id: stripQuery(maybeTail) };
    if (maybeId) return { name: "quote-detail", id: stripQuery(maybeId) };
    return { name: "quote" };
  }

  if (section === "quotes") {
    return { name: "quotes" };
  }

  if (section === "agenda") {
    if (maybeId === "new") return { name: "agenda" };
    if (maybeId === "edit" && maybeTail) return { name: "agenda-edit", id: stripQuery(maybeTail) };
    if (maybeId) return { name: "agenda-detail", id: stripQuery(maybeId) };
    return { name: "agenda" };
  }

  if (section === "operations") {
    if (maybeId === "new") return { name: "operations-new" };
    if (maybeId === "edit" && maybeTail) return { name: "operations-edit", id: stripQuery(maybeTail) };
    if (maybeId) return { name: "operations-detail", id: stripQuery(maybeId) };
    return { name: "operations" };
  }

  if (section === "providers") {
    if (maybeId === "new") return { name: "providers-new" };
    if (maybeId === "edit" && maybeTail) return { name: "providers-edit", id: stripQuery(maybeTail) };
    if (maybeId) return { name: "providers-detail", id: stripQuery(maybeId) };
    return { name: "providers" };
  }

  if (section === "provider") {
    if (maybeId) return { name: "provider", id: stripQuery(maybeId) };
    return { name: "provider" };
  }

  if (section === "customer") {
    if (maybeId) return { name: "customer", id: stripQuery(maybeId) };
    return { name: "customer" };
  }

  return { name: "home" };
}

function stripQuery(value) {
  return String(value || "").split("?")[0];
}

function getRouteBase(routeName) {
  if (routeName.startsWith("crm")) return "crm";
  if (routeName.startsWith("quote") || routeName === "quotes") return "quote";
  if (routeName.startsWith("agenda")) return "agenda";
  if (routeName.startsWith("operations")) return "operations";
  if (routeName.startsWith("providers")) return "providers";
  if (routeName.startsWith("provider")) return "provider";
  if (routeName.startsWith("customer")) return "customer";
  if (routeName === "menu") return "menu";
  return "home";
}

function getRouteTitle(routeName) {
  const titles = {
    access: "Acceso",
    home: "Dashboard",
    crm: "CRM",
    "crm-new": "Nuevo prospecto",
    "crm-edit": "Editar CRM",
    "crm-detail": "CRM detalle",
    quote: "Cotizador",
    "quote-edit": "Editar cotizacion",
    "quote-detail": "Cotizacion",
    quotes: "Historial",
    agenda: "Agenda",
    "agenda-edit": "Editar tarea",
    "agenda-detail": "Detalle tarea",
    operations: "Operaciones",
    "operations-new": "Nueva operacion",
    "operations-edit": "Editar operacion",
    "operations-detail": "Ficha de operacion",
    providers: "Proveedores",
    "providers-new": "Nuevo proveedor",
    "providers-edit": "Editar proveedor",
    "providers-detail": "Proveedor",
    provider: "Perfil proveedor",
    customer: "Ficha de cliente",
    menu: "Menu"
  };
  return titles[routeName] || "JoathiVA";
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatDateTime(value) {
  if (!value) return "Sin registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDateInputValue(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function formatDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatMoney(value, currency = "USD") {
  const number = roundMoney(toNumber(value));
  const locale = currency === "UYU" ? "es-UY" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(number);
}

function sectionHeader(eyebrow, title, copy) {
  return `
    <div class="section-title">
      <div>
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h3>${escapeHtml(title)}</h3>
      </div>
      <p class="section-copy">${escapeHtml(copy)}</p>
    </div>
  `;
}

function badge(label, tone = "neutral") {
  return `<span class="badge badge--${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}

function routeButton(label, route, variant = "secondary") {
  return `<button type="button" class="btn btn--${escapeHtml(variant)}" data-route="${escapeHtml(route)}">${escapeHtml(label)}</button>`;
}

function linkButton(label, href, variant = "secondary") {
  return `<a class="btn btn--${escapeHtml(variant)}" href="${escapeHtml(href)}" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function filterChip(action, value, label, active = false) {
  return `<button type="button" class="nav-link${active ? " is-active" : ""}" data-action="${escapeHtml(action)}" data-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
}

function field(label, name, value = "", hint = "", span = "6", type = "text") {
  const extraFieldAttr = name === "exchangeRate" ? ' data-field="quote-exchange-rate"' : "";
  return `
    <label class="field" data-span="${escapeHtml(span)}">
      <span class="field__label">${escapeHtml(label)}</span>
      <input class="field__control" name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(hint)}"${extraFieldAttr}>
      ${hint ? `<span class="field__hint">${escapeHtml(hint)}</span>` : ""}
    </label>
  `;
}

function textareaField(label, name, value = "", hint = "", span = "12") {
  return `
    <label class="field" data-span="${escapeHtml(span)}">
      <span class="field__label">${escapeHtml(label)}</span>
      <textarea class="field__control" name="${escapeHtml(name)}" placeholder="${escapeHtml(hint)}">${escapeHtml(value)}</textarea>
      ${hint ? `<span class="field__hint">${escapeHtml(hint)}</span>` : ""}
    </label>
  `;
}

function selectField(label, name, options, selected = "", span = "6", emptyLabel = "") {
  const list = Array.isArray(options) ? options : [];
  const allowEmpty = name === "customerId" || Boolean(emptyLabel);
  const selectDataField = name === "currency" ? ' data-field="quote-currency"' : name === "operationId" ? ' data-field="task-operation"' : "";
  return `
    <label class="field" data-span="${escapeHtml(span)}">
      <span class="field__label">${escapeHtml(label)}</span>
      <select class="field__control" name="${escapeHtml(name)}"${selectDataField}>
        ${allowEmpty ? `<option value="">${escapeHtml(emptyLabel || (name === "customerId" ? "Seleccionar cliente" : "Sin seleccion"))}</option>` : ""}
        ${list.map((item) => {
          const value = item.id ?? item;
          const text = item.empresa || item.nombre || item.label || item;
          const isSelected = String(value) === String(selected) || String(text) === String(selected);
          return `<option value="${escapeHtml(value)}"${isSelected ? " selected" : ""}>${escapeHtml(text)}</option>`;
        }).join("")}
      </select>
    </label>
  `;
}

function emptyState(title, copy) {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p></div>`;
}

function detailStat(label, value) {
  return `<div class="detail-stat"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
}

function miniDetail(label, value) {
  return `
    <article class="list-item">
      <div class="list-item__title">
        <strong>${escapeHtml(label)}</strong>
      </div>
      <div class="list-item__meta">${escapeHtml(value || "Sin dato")}</div>
    </article>
  `;
}

function renderActivityItem(item) {
  return `
    <article class="timeline-item">
      <div class="timeline-item__title">
        <strong>${escapeHtml(item.title || item.label || "Actividad")}</strong>
        ${badge(item.label || "Actividad", item.tone || "neutral")}
      </div>
      <div class="timeline-item__meta">${escapeHtml(item.details || "Sin detalle")}</div>
      <div class="timeline-item__meta">${escapeHtml(formatDateTime(item.at || ""))}</div>
    </article>
  `;
}

function menuCard(title, copy, route) {
  return `
    <article class="menu-card">
      <div class="menu-card__title">
        <strong>${escapeHtml(title)}</strong>
        ${badge(getRouteTitle(route), "info")}
      </div>
      <p class="menu-card__copy">${escapeHtml(copy)}</p>
      ${routeButton("Abrir", route, "secondary")}
    </article>
  `;
}

function quoteTone(operationType) {
  if (operationType === "Importacion") return "info";
  if (operationType === "Exportacion") return "accent";
  if (operationType === "Nacional") return "success";
  return "neutral";
}

function stageTone(stage) {
  const tones = {
    Prospecto: "warning",
    Calificado: "info",
    Propuesta: "info",
    Negociacion: "accent",
    Cierre: "success",
    Cliente: "success"
  };
  return tones[stage] || "neutral";
}

function operationStateTone(state) {
  const tones = {
    "Arribo detectado": "info",
    "Camion pendiente": "warning",
    "Documentacion preliminar": "warning",
    "Esperando NCM/seguro": "warning",
    "DUA recibido": "info",
    "Documentacion definitiva lista": "success",
    "En transito": "info",
    "Devolucion pendiente": "warning",
    "Cerrado": "success",
    "En riesgo": "danger"
  };
  return tones[state] || "neutral";
}

function operationRiskTone(risk) {
  const tones = {
    Alto: "danger",
    Medio: "warning",
    Bajo: "success"
  };
  return tones[risk] || "neutral";
}

function priorityTone(priority) {
  const tones = { Alta: "danger", Media: "warning", Baja: "neutral" };
  return tones[priority] || "neutral";
}

function createDefaultQuoteDraft() {
  return {
    customerId: "",
    origen: "",
    destino: "",
    paisOrigen: "Brasil",
    paisDestino: "Uruguay",
    tipoOperacion: "Importacion",
    modoTransporte: "Terrestre",
    proveedor: "",
    costoProveedor: "",
    gastosAdicionales: "",
    seguro: "",
    horasExtra: 0,
    estadiaAduanaDias: 0,
    margenPct: QUOTE_DEFAULT_MARGIN,
    currency: state.settings.preferredCurrency || "USD",
    exchangeRate: state.settings.exchangeRateUyu || 1,
    observaciones: ""
  };
}

function buildTaskFormModel(task = null) {
  const linkedOperation = !task && uiState.taskOperationId ? getOperationById(uiState.taskOperationId) : null;
  return {
    id: task?.id || "",
    createdAt: task?.createdAt || "",
    customerId: task?.customerId || linkedOperation?.clientId || "",
    operationId: task?.operationId || (!task && uiState.taskOperationId) || "",
    tarea: task?.tarea || "",
    prioridad: task?.prioridad || "Alta",
    fechaCompromiso: formatDateInputValue(task?.fechaCompromiso || ""),
    recordatorio: formatDateTimeLocalValue(task?.recordatorio || ""),
    estado: task?.estado || "Pendiente",
    observaciones: task?.observaciones || ""
  };
}

function buildCrmFormModel(record = null) {
  return {
    id: record?.id || "",
    customerId: record?.customerId || "",
    nombre: record?.nombre || "",
    empresa: record?.empresa || "",
    contacto: record?.contacto || "",
    telefono: record?.telefono || "",
    email: record?.email || "",
    origenLead: record?.origenLead || "Referencia",
    ejecutivo: record?.ejecutivo || state.session.userName || "Equipo comercial",
    etapa: record?.etapa || "Prospecto",
    ultimaInteraccion: formatDateTimeLocalValue(record?.ultimaInteraccion || new Date().toISOString()),
    proximaAccion: record?.proximaAccion || "",
    fechaSeguimiento: formatDateInputValue(record?.fechaSeguimiento || ""),
    notas: record?.notas || "",
    estadoCliente: record?.estadoCliente || "Prospecto",
    createdAt: record?.createdAt || ""
  };
}

function buildQuoteDraftFromRecord(record = null) {
  if (!record) {
    return createDefaultQuoteDraft();
  }

  return {
    customerId: record.customerId || "",
    origen: record.origen || "",
    destino: record.destino || "",
    paisOrigen: record.paisOrigen || "Brasil",
    paisDestino: record.paisDestino || "Uruguay",
    tipoOperacion: record.tipoOperacion || "Importacion",
    modoTransporte: record.modoTransporte || "Terrestre",
    proveedor: record.proveedor || "",
    costoProveedor: record.costoProveedor ?? record.providerCost ?? "",
    gastosAdicionales: record.gastosAdicionales ?? record.additionalExpenses ?? "",
    seguro: record.seguro ?? record.insurance ?? "",
    horasExtra: record.horasExtra ?? record.extraHours ?? 0,
    estadiaAduanaDias: record.estadiaAduanaDias ?? record.customsStayDays ?? 0,
    margenPct: record.margenPct ?? record.marginPct ?? QUOTE_DEFAULT_MARGIN,
    currency: record.moneda || record.currency || state.settings.preferredCurrency || "USD",
    exchangeRate: record.tipoCambio || record.exchangeRate || state.settings.exchangeRateUyu || 1,
    observaciones: record.observaciones || record.notes || "",
    id: record.id || "",
    createdAt: record.createdAt || ""
  };
}

function filterCrmRecords() {
  const query = normalizeText(uiState.crmQuery);
  return listCrmRecords().filter((record) => {
    const stageMatch = uiState.crmStage === "all" || record.etapa === uiState.crmStage;
    const queryMatch = !query || [
      record.nombre,
      record.empresa,
      record.contacto,
      record.email,
      record.telefono,
      record.proximaAccion,
      record.notas
    ].some((value) => normalizeText(value).includes(query));
    return stageMatch && queryMatch;
  });
}

function filterQuotesRecords() {
  const query = normalizeText(uiState.quoteQuery);
  return listQuoteRecords().filter((quote) => {
    const currencyMatch = uiState.quoteCurrencyFilter === "all" || quote.moneda === uiState.quoteCurrencyFilter;
    const customerMatch = uiState.quoteCustomerFilter === "all" || quote.customerId === uiState.quoteCustomerFilter;
    const queryMatch = !query || [
      quote.cliente,
      quote.empresa,
      quote.proveedor,
      quote.origen,
      quote.destino,
      quote.paisOrigen,
      quote.paisDestino,
      quote.tipoOperacion,
      quote.observaciones
    ].some((value) => normalizeText(value).includes(query));
    return currencyMatch && customerMatch && queryMatch;
  });
}

function filterTasksRecords() {
  return listTaskRecords().filter((task) => {
    if (uiState.agendaFilter === "all") return true;
    return task.estado === uiState.agendaFilter;
  });
}

function clearFieldError(target) {
  if (!(target instanceof HTMLElement)) return;
  const field = target.closest(".field");
  if (!field) return;
  field.classList.remove("has-error");
  field.querySelectorAll(".field__error").forEach((node) => node.remove());
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    target.removeAttribute("aria-invalid");
  }
}

function clearFormErrors(form) {
  if (!form) return;
  form.querySelectorAll("[data-form-feedback]").forEach((node) => node.remove());
  form.querySelectorAll(".field").forEach((field) => {
    field.classList.remove("has-error");
    field.querySelectorAll(".field__error").forEach((node) => node.remove());
    const control = field.querySelector(".field__control");
    if (control) {
      control.removeAttribute("aria-invalid");
    }
  });
}

function showFormErrors(form, errors) {
  if (!form) return;
  clearFormErrors(form);

  const entries = Object.entries(errors || {});
  if (!entries.length) return;

  const summary = document.createElement("div");
  summary.className = "form-feedback form-feedback--error";
  summary.setAttribute("data-form-feedback", "");
  summary.innerHTML = `
    <strong>Revisa la informacion</strong>
    <p>${escapeHtml(errors._form || "Hay campos obligatorios o valores invalidos.")}</p>
  `;
  form.prepend(summary);

  entries.forEach(([name, message]) => {
    if (name === "_form") return;
    const control = form.querySelector(`[name="${name}"]`);
    if (!control) return;
    control.setAttribute("aria-invalid", "true");
    const field = control.closest(".field");
    if (!field) return;
    field.classList.add("has-error");
    let error = field.querySelector(".field__error");
    if (!error) {
      error = document.createElement("span");
      error.className = "field__error";
      field.appendChild(error);
    }
    error.textContent = String(message);
  });

  const firstInvalid = form.querySelector("[aria-invalid='true']");
  if (firstInvalid && typeof firstInvalid.focus === "function") {
    firstInvalid.focus();
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
