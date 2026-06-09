const STORAGE_KEY = "rutavuelta-state";
const STANDARD_RATE_USD_PER_KM = 1.65;

const seedState = {
  drivers: [
    {
      id: "drv-1",
      name: "Carlos Mendez",
      company: "TransAndes Cargo",
      phone: "+598 99 123 456",
      email: "carlos@transandes.com",
      originCity: "Montevideo",
      originCountry: "Uruguay",
      truckType: "Semi remolque",
      capacityM3: 86,
      maxWeightKg: 28000,
      permits: "Mercosur, carga general",
      licenseImage: null,
      createdAt: "2026-04-14T10:00:00.000Z"
    }
  ],
  trips: [
    {
      id: "trp-1",
      driverId: "drv-1",
      currentLocation: "Santiago, Chile",
      returnDestination: "Montevideo, Uruguay",
      availableDate: "2026-04-18",
      availableM3: 72,
      availableWeightKg: 22000,
      distanceKm: 1850,
      minimumRevenue: 950,
      notes: "Acepta pallets y carga general.",
      createdAt: "2026-04-14T10:30:00.000Z"
    }
  ],
  requests: [
    {
      id: "req-1",
      company: "AgroSur Export",
      contactName: "Maria Gomez",
      contactEmail: "logistica@agrosur.com",
      contactPhone: "+54 11 5555 1212",
      origin: "Santiago, Chile",
      destination: "Montevideo, Uruguay",
      readyDate: "2026-04-17",
      distanceKm: 1850,
      weightKg: 12000,
      volumeM3: 34,
      cargoType: "Palletizada",
      budget: 2500,
      description: "22 pallets de alimento seco.",
      createdAt: "2026-04-14T11:00:00.000Z"
    }
  ]
};

let state = loadState();

const driverForm = document.querySelector("#driverForm");
const tripForm = document.querySelector("#tripForm");
const requestForm = document.querySelector("#requestForm");
const tripDriverSelect = document.querySelector("#tripDriverSelect");
const licenseInput = document.querySelector("#licenseImage");
const licensePreview = document.querySelector("#licensePreview");
const emptyStateTemplate = document.querySelector("#emptyStateTemplate");

const dashboardEls = {
  driversCount: document.querySelector("#driversCount"),
  tripsCount: document.querySelector("#tripsCount"),
  requestsCount: document.querySelector("#requestsCount"),
  potentialSavings: document.querySelector("#potentialSavings"),
  heroTraditional: document.querySelector("#heroTraditional"),
  heroBackhaul: document.querySelector("#heroBackhaul"),
  heroSavings: document.querySelector("#heroSavings")
};

const containers = {
  matches: document.querySelector("#matchesContainer"),
  drivers: document.querySelector("#driversContainer"),
  trips: document.querySelector("#tripsContainer"),
  requests: document.querySelector("#requestsContainer")
};

boot();

function boot() {
  populateDriverSelect();
  renderLicensePreview(null);
  bindEvents();
  render();
}

function bindEvents() {
  licenseInput.addEventListener("change", handleLicensePreview);

  driverForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(driverForm);
    const licenseFile = formData.get("licenseImage");
    const licenseImage = await fileToDataUrl(licenseFile);

    const driver = {
      id: buildId("drv"),
      name: formData.get("name").trim(),
      company: formData.get("company").trim(),
      phone: formData.get("phone").trim(),
      email: formData.get("email").trim(),
      originCity: formData.get("originCity").trim(),
      originCountry: formData.get("originCountry").trim(),
      truckType: formData.get("truckType"),
      capacityM3: Number(formData.get("capacityM3")),
      maxWeightKg: Number(formData.get("maxWeightKg")),
      permits: formData.get("permits").trim(),
      licenseImage,
      createdAt: new Date().toISOString()
    };

    state.drivers.unshift(driver);
    persistState();
    driverForm.reset();
    renderLicensePreview(null);
    populateDriverSelect(driver.id);
    render();
  });

  tripForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(tripForm);

    const trip = {
      id: buildId("trp"),
      driverId: formData.get("driverId"),
      currentLocation: formData.get("currentLocation").trim(),
      returnDestination: formData.get("returnDestination").trim(),
      availableDate: formData.get("availableDate"),
      availableM3: Number(formData.get("availableM3")),
      availableWeightKg: Number(formData.get("availableWeightKg")),
      distanceKm: Number(formData.get("distanceKm")),
      minimumRevenue: Number(formData.get("minimumRevenue")),
      notes: formData.get("notes").trim(),
      createdAt: new Date().toISOString()
    };

    state.trips.unshift(trip);
    persistState();
    tripForm.reset();
    populateDriverSelect();
    render();
  });

  requestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(requestForm);

    const request = {
      id: buildId("req"),
      company: formData.get("company").trim(),
      contactName: formData.get("contactName").trim(),
      contactEmail: formData.get("contactEmail").trim(),
      contactPhone: formData.get("contactPhone").trim(),
      origin: formData.get("origin").trim(),
      destination: formData.get("destination").trim(),
      readyDate: formData.get("readyDate"),
      distanceKm: Number(formData.get("distanceKm")),
      weightKg: Number(formData.get("weightKg")),
      volumeM3: Number(formData.get("volumeM3")),
      cargoType: formData.get("cargoType"),
      budget: Number(formData.get("budget")),
      description: formData.get("description").trim(),
      createdAt: new Date().toISOString()
    };

    state.requests.unshift(request);
    persistState();
    requestForm.reset();
    render();
    containers.matches.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function handleLicensePreview(event) {
  const [file] = event.target.files;
  if (!file) {
    renderLicensePreview(null);
    return;
  }

  fileToDataUrl(file).then(renderLicensePreview);
}

function populateDriverSelect(selectedId = "") {
  const options = ['<option value="">Seleccionar chofer</option>'];
  state.drivers.forEach((driver) => {
    const selected = selectedId === driver.id ? " selected" : "";
    options.push(
      `<option value="${driver.id}"${selected}>${escapeHtml(driver.name)} | ${escapeHtml(driver.company)} | ${escapeHtml(driver.originCity)}, ${escapeHtml(driver.originCountry)}</option>`
    );
  });
  tripDriverSelect.innerHTML = options.join("");
}

function render() {
  renderDashboard();
  renderDrivers();
  renderTrips();
  renderRequests();
  renderMatches();
}

function renderDashboard() {
  const matches = computeAllMatches();
  const potentialSavings = matches.reduce((sum, match) => sum + Math.max(0, match.standardQuote - match.backhaulQuote), 0);

  dashboardEls.driversCount.textContent = state.drivers.length;
  dashboardEls.tripsCount.textContent = state.trips.length;
  dashboardEls.requestsCount.textContent = state.requests.length;
  dashboardEls.potentialSavings.textContent = formatCurrency(potentialSavings);

  const featuredMatch = matches[0];
  if (!featuredMatch) {
    dashboardEls.heroTraditional.textContent = formatCurrency(0);
    dashboardEls.heroBackhaul.textContent = formatCurrency(0);
    dashboardEls.heroSavings.textContent = "0%";
    return;
  }

  dashboardEls.heroTraditional.textContent = formatCurrency(featuredMatch.standardQuote);
  dashboardEls.heroBackhaul.textContent = formatCurrency(featuredMatch.backhaulQuote);
  dashboardEls.heroSavings.textContent = `${Math.round(featuredMatch.savingsPct)}%`;
}

function renderDrivers() {
  if (!state.drivers.length) {
    containers.drivers.replaceChildren(emptyStateTemplate.content.firstElementChild.cloneNode(true));
    return;
  }

  containers.drivers.innerHTML = state.drivers.map((driver) => `
    <article class="record-card">
      <strong>${escapeHtml(driver.name)}</strong>
      <p>${escapeHtml(driver.company)} | ${escapeHtml(driver.originCity)}, ${escapeHtml(driver.originCountry)}</p>
      <div class="record-grid">
        <span><strong>Camion</strong>${escapeHtml(driver.truckType)}</span>
        <span><strong>Capacidad</strong>${driver.capacityM3} m3</span>
        <span><strong>Peso maximo</strong>${formatNumber(driver.maxWeightKg)} kg</span>
        <span><strong>Contacto</strong>${escapeHtml(driver.phone)}</span>
      </div>
      <div class="pill-row">
        <span class="pill">Libreta cargada</span>
        ${driver.permits ? `<span class="pill alert">${escapeHtml(driver.permits)}</span>` : ""}
      </div>
    </article>
  `).join("");
}

function renderTrips() {
  if (!state.trips.length) {
    containers.trips.replaceChildren(emptyStateTemplate.content.firstElementChild.cloneNode(true));
    return;
  }

  containers.trips.innerHTML = state.trips.map((trip) => {
    const driver = state.drivers.find((item) => item.id === trip.driverId);
    return `
      <article class="record-card">
        <strong>${escapeHtml(driver?.name || "Chofer no encontrado")}</strong>
        <p>${escapeHtml(trip.currentLocation)} hacia ${escapeHtml(trip.returnDestination)}</p>
        <div class="record-grid">
          <span><strong>Fecha</strong>${formatDate(trip.availableDate)}</span>
          <span><strong>Espacio</strong>${trip.availableM3} m3</span>
          <span><strong>Peso libre</strong>${formatNumber(trip.availableWeightKg)} kg</span>
          <span><strong>Minimo</strong>${formatCurrency(trip.minimumRevenue)}</span>
        </div>
        ${trip.notes ? `<p class="muted">${escapeHtml(trip.notes)}</p>` : ""}
      </article>
    `;
  }).join("");
}

function renderRequests() {
  if (!state.requests.length) {
    containers.requests.replaceChildren(emptyStateTemplate.content.firstElementChild.cloneNode(true));
    return;
  }

  containers.requests.innerHTML = state.requests.map((request) => `
    <article class="record-card">
      <strong>${escapeHtml(request.company)}</strong>
      <p>${escapeHtml(request.origin)} hacia ${escapeHtml(request.destination)}</p>
      <div class="record-grid">
        <span><strong>Fecha lista</strong>${formatDate(request.readyDate)}</span>
        <span><strong>Tipo</strong>${escapeHtml(request.cargoType)}</span>
        <span><strong>Peso</strong>${formatNumber(request.weightKg)} kg</span>
        <span><strong>Volumen</strong>${request.volumeM3} m3</span>
        <span><strong>Presupuesto</strong>${formatCurrency(request.budget)}</span>
        <span><strong>Distancia</strong>${formatNumber(request.distanceKm)} km</span>
      </div>
    </article>
  `).join("");
}

function renderMatches() {
  const matches = computeAllMatches();
  if (!matches.length) {
    containers.matches.replaceChildren(emptyStateTemplate.content.firstElementChild.cloneNode(true));
    return;
  }

  containers.matches.innerHTML = matches.map((match) => `
    <article class="match-card">
      <div class="match-score">Score ${match.score}</div>
      <strong>${escapeHtml(match.request.company)} con ${escapeHtml(match.driver.name)}</strong>
      <p>${escapeHtml(match.trip.currentLocation)} -> ${escapeHtml(match.trip.returnDestination)} | ${escapeHtml(match.request.cargoType)}</p>
      <div class="match-price">${formatCurrency(match.backhaulQuote)}</div>
      <p class="match-savings">Ahorro estimado: ${formatCurrency(match.standardQuote - match.backhaulQuote)} (${Math.round(match.savingsPct)}%)</p>
      <div class="match-grid">
        <span><strong>Tarifa tradicional</strong>${formatCurrency(match.standardQuote)}</span>
        <span><strong>Minimo del chofer</strong>${formatCurrency(match.trip.minimumRevenue)}</span>
        <span><strong>Uso de espacio</strong>${Math.round(match.volumeFit * 100)}%</span>
        <span><strong>Uso de peso</strong>${Math.round(match.weightFit * 100)}%</span>
        <span><strong>Fecha compatible</strong>${formatDate(match.trip.availableDate)}</span>
        <span><strong>Presupuesto cliente</strong>${formatCurrency(match.request.budget)}</span>
      </div>
      <div class="pill-row">
        <span class="pill">${match.withinBudget ? "Dentro del presupuesto" : "Requiere negociar"}</span>
        <span class="pill alert">${match.destinationMatch ? "Destino alineado" : "Ruta parcial"}</span>
      </div>
    </article>
  `).join("");
}

function computeAllMatches() {
  const matches = [];

  state.requests.forEach((request) => {
    state.trips.forEach((trip) => {
      const driver = state.drivers.find((item) => item.id === trip.driverId);
      if (!driver) {
        return;
      }
      if (request.volumeM3 > trip.availableM3 || request.weightKg > trip.availableWeightKg) {
        return;
      }

      const destinationMatch = normalizeText(request.destination) === normalizeText(trip.returnDestination);
      const originMatch = normalizeText(request.origin) === normalizeText(trip.currentLocation);
      const readyDateDelta = Math.abs(daysBetween(request.readyDate, trip.availableDate));
      const dateScore = readyDateDelta <= 1 ? 20 : readyDateDelta <= 3 ? 12 : 4;
      const routeScore = (destinationMatch ? 30 : 12) + (originMatch ? 20 : 8);
      const volumeFit = request.volumeM3 / trip.availableM3;
      const weightFit = request.weightKg / trip.availableWeightKg;
      const utilization = Math.max(volumeFit, weightFit);
      const capacityScore = Math.round(utilization * 30);
      const standardQuote = roundMoney(request.distanceKm * STANDARD_RATE_USD_PER_KM);
      const backhaulBase = standardQuote * (0.42 + utilization * 0.18);
      const backhaulQuote = Math.max(trip.minimumRevenue, roundMoney(backhaulBase));

      matches.push({
        request,
        trip,
        driver,
        score: Math.min(99, routeScore + dateScore + capacityScore),
        volumeFit,
        weightFit,
        standardQuote,
        backhaulQuote: roundMoney(backhaulQuote),
        withinBudget: backhaulQuote <= request.budget,
        destinationMatch,
        savingsPct: standardQuote > 0 ? ((standardQuote - backhaulQuote) / standardQuote) * 100 : 0
      });
    });
  });

  return matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.backhaulQuote - b.backhaulQuote;
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
      return structuredClone(seedState);
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error("No se pudo cargar el estado local", error);
    return structuredClone(seedState);
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderLicensePreview(imageSrc) {
  if (!imageSrc) {
    licensePreview.innerHTML = "<span>La imagen se guarda localmente para este MVP.</span>";
    return;
  }
  licensePreview.innerHTML = `<img src="${imageSrc}" alt="Vista previa de libreta de conducir">`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof File)) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function roundMoney(value) {
  return Math.round(value);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-UY").format(value || 0);
}

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function daysBetween(firstDate, secondDate) {
  const first = new Date(`${firstDate}T00:00:00`);
  const second = new Date(`${secondDate}T00:00:00`);
  return Math.round((first - second) / 86400000);
}

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
