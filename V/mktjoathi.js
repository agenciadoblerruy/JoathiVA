const MEDIA_STUDIO_PACKAGES_KEY = "joathiva-mktjoathi-packages";
const MEDIA_STUDIO_LEGACY_PACKAGES_KEY = "joathiva-media-studio-packages";
const MKTJOATHI_LOGOS_KEY = "joathiva-mktjoathi-logos";
const MEDIA_STUDIO_DEFAULT_PROMPT = "Camion moderno saliendo de un centro logistico al amanecer, equipo de Joathi monitoreando tracking en tiempo real y sensacion de control operativo para una empresa importadora.";
const MKTJOATHI_MAX_LOGO_BYTES = 750 * 1024;

let mediaStudioBusy = false;
let mediaCurrentPackage = null;
let mktjoathiLogoState = loadMktjoathiLogos();

const mediaPlatformCatalog = {
  linkedin: {
    label: "LinkedIn empresa",
    format: "Portrait 4:5 o cuadrado 1:1",
    tone: "Ejecutivo, tecnico y comercial",
    usage: "Autoridad B2B, confianza y apertura de conversaciones con decisores.",
    copyLength: "900 a 1.300 caracteres",
    hashtags: "#Logistica #Transporte #ComercioExterior #Joathi"
  },
  "instagram-feed": {
    label: "Instagram feed",
    format: "Cuadrado 1:1 o portrait 4:5",
    tone: "Directo, visual y recordable",
    usage: "Marca, confianza y recordacion de servicio.",
    copyLength: "450 a 700 caracteres",
    hashtags: "#Logistica #Transporte #Uruguay #JoathiLogistica"
  },
  "instagram-reel": {
    label: "Instagram Reel",
    format: "Vertical 9:16",
    tone: "Agil, humano y operativo",
    usage: "Video corto con gancho fuerte en los primeros 2 segundos.",
    copyLength: "220 a 450 caracteres",
    hashtags: "#Reels #Logistica #TransporteInternacional #Joathi"
  },
  facebook: {
    label: "Facebook",
    format: "Cuadrado 1:1 o horizontal 16:9",
    tone: "Claro, cercano y confiable",
    usage: "Alcance local, prueba de servicio y consultas comerciales.",
    copyLength: "350 a 650 caracteres",
    hashtags: "#Joathi #Transporte #Carga #Logistica"
  },
  stories: {
    label: "Stories",
    format: "Vertical 9:16",
    tone: "Muy breve, accion directa",
    usage: "Mensaje rapido con CTA visible y minimo texto.",
    copyLength: "1 titulo, 1 subtitulo y CTA",
    hashtags: "#Joathi"
  },
  whatsapp: {
    label: "WhatsApp Business",
    format: "Vertical 9:16 o imagen liviana",
    tone: "Comercial, directo y personal",
    usage: "Pieza para enviar a prospectos o estados de WhatsApp.",
    copyLength: "120 a 260 caracteres",
    hashtags: ""
  }
};

const mediaAssetTypeLabels = {
  image: "imagen realista",
  video: "video corto",
  carousel: "carrusel"
};

const mediaFormatCatalog = {
  vertical: {
    label: "Vertical 9:16",
    size: "1080x1920",
    note: "Priorizar accion, sujeto grande y texto minimo."
  },
  square: {
    label: "Cuadrado 1:1",
    size: "1080x1080",
    note: "Buena lectura en feed y piezas comerciales simples."
  },
  portrait: {
    label: "Portrait 4:5",
    size: "1080x1350",
    note: "Recomendado para LinkedIn e Instagram feed."
  },
  landscape: {
    label: "Horizontal 16:9",
    size: "1920x1080",
    note: "Util para web, presentaciones y videos institucionales."
  }
};

const mediaMeasureCatalog = {
  "instagram-feed-square": {
    label: "Instagram Feed cuadrado",
    size: "1080x1080",
    ratio: "1:1"
  },
  "instagram-story": {
    label: "Instagram/Facebook Story",
    size: "1080x1920",
    ratio: "9:16"
  },
  "reel-tiktok-short": {
    label: "Reel/TikTok/Short",
    size: "1080x1920",
    ratio: "9:16"
  },
  "linkedin-post-square": {
    label: "LinkedIn post",
    size: "1200x1200",
    ratio: "1:1"
  },
  "linkedin-horizontal": {
    label: "LinkedIn horizontal",
    size: "1200x627",
    ratio: "1.91:1"
  },
  "meta-horizontal": {
    label: "Facebook/Meta Ads horizontal",
    size: "1200x628",
    ratio: "1.91:1"
  },
  "google-display-horizontal": {
    label: "Google Display horizontal",
    size: "1200x628",
    ratio: "1.91:1"
  },
  "web-hero-desktop": {
    label: "Web hero desktop",
    size: "1920x1080",
    ratio: "16:9"
  },
  "web-hero-ultrawide": {
    label: "Web hero ultrawide",
    size: "2560x1080",
    ratio: "21:9"
  },
  "web-hero-mobile": {
    label: "Web hero mobile",
    size: "1080x1920",
    ratio: "9:16"
  },
  "web-banner-wide": {
    label: "Web banner ancho",
    size: "1600x600",
    ratio: "panoramico"
  },
  "web-section-horizontal": {
    label: "Web sección horizontal",
    size: "1440x700",
    ratio: "web section"
  },
  "card-web-square": {
    label: "Card web cuadrada",
    size: "1080x1080",
    ratio: "1:1"
  },
  "card-web-vertical": {
    label: "Card web vertical",
    size: "1080x1350",
    ratio: "4:5"
  },
  "dashboard-background": {
    label: "Dashboard background",
    size: "1920x1080",
    ratio: "16:9"
  },
  "whatsapp-flyer-vertical": {
    label: "WhatsApp flyer vertical",
    size: "1080x1350",
    ratio: "4:5"
  },
  "email-header": {
    label: "Header email",
    size: "1200x400",
    ratio: "3:1"
  },
  "open-graph-preview": {
    label: "Open Graph preview",
    size: "1200x630",
    ratio: "1.91:1"
  },
  "presentation-slide": {
    label: "Presentación slide",
    size: "1920x1080",
    ratio: "16:9"
  }
};

const mediaDefaultMeasureEntries = [
  mediaMeasureCatalog["instagram-feed-square"],
  {
    label: "Story/Reel",
    size: "1080x1920",
    ratio: "9:16"
  },
  mediaMeasureCatalog["web-hero-desktop"]
];

const mediaWebUseCatalog = {
  "web-hero-main": {
    label: "Hero principal web"
  },
  "web-services-section": {
    label: "Sección de servicios"
  },
  "web-banner-horizontal": {
    label: "Banner horizontal"
  },
  "web-service-card": {
    label: "Card de servicio"
  },
  "web-dashboard-background": {
    label: "Fondo para dashboard"
  },
  "web-contact-page": {
    label: "Imagen para página de contacto"
  },
  "web-quote-page": {
    label: "Imagen para página de cotización"
  },
  "web-suppliers-page": {
    label: "Imagen para proveedores"
  },
  "web-tracking-page": {
    label: "Imagen para tracking / seguimiento"
  },
  "web-email-header": {
    label: "Header para email comercial"
  }
};

const mediaWebDefaultAdaptationIds = [
  "web-hero-mobile",
  "web-banner-wide",
  "open-graph-preview"
];

const mediaObjectiveCatalog = {
  meeting: "concretar una reunion con decisores del prospecto",
  call: "concretar una llamada comercial directa",
  email: "lograr que el prospecto responda por mail",
  sales: "generar ventas o pedidos comerciales concretos",
  "service-presence": "aumentar presencia y destacamiento del servicio logistico",
  "brand-identity": "reforzar identidad de marca, confianza y recordacion",
  lead: "convertir interesados en consultas concretas",
  trust: "instalar confianza antes de pedir cotizacion",
  tracking: "mostrar visibilidad, trazabilidad y control en tiempo real",
  comex: "posicionar importacion, exportacion y coordinacion regional",
  authority: "demostrar criterio profesional ante decisores B2B"
};

const mediaObjectiveCtaCatalog = {
  meeting: "Agenda una reunion para revisar tu operacion.",
  call: "Coordinemos una llamada y vemos tu necesidad.",
  email: "Escribinos por mail y respondemos con una propuesta clara.",
  sales: "Solicita una cotizacion para tu proxima carga.",
  "service-presence": "Conoce como Joathi ordena y acompana cada traslado.",
  "brand-identity": "Descubre una logistica con control, trazabilidad y respuesta."
};

const mediaAudienceCatalog = {
  "logistics-manager": "gerentes de logistica y operaciones que necesitan previsibilidad",
  owner: "direccion y duenos que miran costo, reputacion y continuidad",
  importer: "importadores y exportadores que dependen de tiempos y documentacion",
  broker: "despachantes que coordinan informacion critica con operadores",
  supplier: "proveedores de transporte que valoran orden, rutas y pagos claros"
};

const mediaSceneCatalog = {
  "truck-road": "camion moderno en ruta sudamericana con carga empresarial y clima real",
  warehouse: "centro logistico limpio con muelle, pallets, equipo operativo y unidad lista",
  "control-room": "tablero de control logistico con tracking, mapas y estado de operaciones",
  border: "operacion de frontera y aduana con documentos, camion y coordinacion profesional",
  executive: "reunion ejecutiva revisando indicadores logisticos y decisiones comerciales",
  driver: "chofer profesional junto a unidad limpia, documentacion y actitud confiable"
};

const mediaMarketCatalog = {
  sudamerica: "Sudamerica",
  uruguay: "Uruguay",
  argentina: "Argentina",
  paraguay: "Paraguay",
  brasil: "Brasil",
  chile: "Chile"
};

const mediaVariantFrames = [
  {
    title: "Control ejecutivo",
    visual: "mostrar tablero de seguimiento, mapas y decisiones visibles",
    hook: "Operacion visible antes de que aparezca el problema"
  },
  {
    title: "Confianza operativa",
    visual: "mostrar equipo, unidad y carga con sensacion de respuesta profesional",
    hook: "Cuando la carga importa, la respuesta tambien"
  },
  {
    title: "Velocidad comercial",
    visual: "mostrar salida agil de una unidad y comunicacion clara con el cliente",
    hook: "Cotizar, coordinar y avanzar sin perder tiempo"
  },
  {
    title: "Trazabilidad real",
    visual: "mostrar tracking, ruta y estado actualizado con estetica corporativa",
    hook: "No perseguir novedades: verlas"
  },
  {
    title: "Marca premium B2B",
    visual: "mostrar presencia de marca sobria, moderna y confiable en contexto logistico",
    hook: "Logistica seria para empresas que no pueden improvisar"
  }
];

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page !== "mktjoathi") return;
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;

  // TEMPORAL: acceso publico provisorio para validar mktjoathi sin login.
  // Revertir cuando se decida volver a proteger la herramienta.
  const marketingAllowed = true;

  initMediaStudio();
});

function initMediaStudio() {
  bindMediaStudioActions();
  renderMktjoathiLogos();
  syncMediaMeasureCards();
  syncMediaWebUseCards();
  renderMediaPlatformSpec();
  renderMediaSavedPackages();
  generateMediaPackage();
  renderMediaStatus("mktjoathi listo. Genera el paquete local o mejoralo con IA desde el servidor de JoathiVA.");
}

function bindMediaStudioActions() {
  const form = document.querySelector("#mediaBriefForm");
  const aiButton = document.querySelector("#mediaAiGenerateButton");
  const saveButton = document.querySelector("#mediaSavePackageButton");
  const heroButton = document.querySelector("#mediaHeroGenerateButton");
  const historyGrid = document.querySelector("#mediaSavedPackages");
  const brandLogoInput = document.querySelector("#mktBrandLogoInput");
  const supplierLogoInput = document.querySelector("#mktSupplierLogoInput");
  const clearBrandLogoButton = document.querySelector("#mktClearBrandLogoButton");
  const clearSupplierLogoButton = document.querySelector("#mktClearSupplierLogoButton");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    generateMediaPackage();
  });

  form?.querySelectorAll("select, input, textarea").forEach((field) => {
    field.addEventListener("change", () => {
      syncMediaMeasureCards();
      syncMediaWebUseCards();
      renderMediaPlatformSpec();
    });
  });

  brandLogoInput?.addEventListener("change", async () => {
    await handleMktjoathiLogoFile("brand", brandLogoInput.files?.[0]);
    brandLogoInput.value = "";
  });

  supplierLogoInput?.addEventListener("change", async () => {
    await handleMktjoathiLogoFile("supplier", supplierLogoInput.files?.[0]);
    supplierLogoInput.value = "";
  });

  clearBrandLogoButton?.addEventListener("click", () => {
    clearMktjoathiLogo("brand");
  });

  clearSupplierLogoButton?.addEventListener("click", () => {
    clearMktjoathiLogo("supplier");
  });

  aiButton?.addEventListener("click", async () => {
    await generateMediaPackageWithAi();
  });

  saveButton?.addEventListener("click", () => {
    saveMediaCurrentPackage();
  });

  heroButton?.addEventListener("click", () => {
    const promptField = form?.querySelector("textarea[name='sourcePrompt']");
    if (promptField) {
      promptField.value = MEDIA_STUDIO_DEFAULT_PROMPT;
    }
    generateMediaPackage();
    document.querySelector("#mediaBriefForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll("[data-copy-media-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.querySelector(`#${button.dataset.copyMediaTarget}`);
      if (!target) return;
      await copyMediaText(target.value || "", button);
    });
  });

  historyGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-media-history-action]");
    if (!button) return;

    const packageId = button.dataset.mediaPackageId;
    const action = button.dataset.mediaHistoryAction;
    if (action === "load") {
      loadMediaPackageIntoForm(packageId);
      return;
    }

    if (action === "delete") {
      deleteMediaPackage(packageId);
    }
  });
}

function loadMktjoathiLogos() {
  try {
    const raw = localStorage.getItem(MKTJOATHI_LOGOS_KEY) || "{}";
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveMktjoathiLogos() {
  localStorage.setItem(MKTJOATHI_LOGOS_KEY, JSON.stringify(mktjoathiLogoState || {}));
}

async function handleMktjoathiLogoFile(slot, file) {
  if (!file) return;

  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    renderMediaStatus("Formato no permitido. Usa PNG, JPG o WebP para evitar riesgos con archivos activos.", true);
    return;
  }

  if (file.size > MKTJOATHI_MAX_LOGO_BYTES) {
    renderMediaStatus("El logo supera 750 KB. Optimiza el archivo antes de cargarlo para mantener mktjoathi liviano.", true);
    return;
  }

  try {
    const dataUrl = await readMktjoathiLogoAsDataUrl(file);
    mktjoathiLogoState = {
      ...mktjoathiLogoState,
      [slot]: {
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
        updatedAt: new Date().toISOString()
      }
    };
    saveMktjoathiLogos();
    renderMktjoathiLogos();
    generateMediaPackage();
    renderMediaStatus(`${getMktjoathiLogoLabel(slot)} cargado localmente. No se envio al servidor ni a OpenAI.`);
  } catch {
    renderMediaStatus("No se pudo leer el logo seleccionado.", true);
  }
}

function readMktjoathiLogoAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function clearMktjoathiLogo(slot) {
  if (!mktjoathiLogoState?.[slot]) return;
  delete mktjoathiLogoState[slot];
  saveMktjoathiLogos();
  renderMktjoathiLogos();
  generateMediaPackage();
  renderMediaStatus(`${getMktjoathiLogoLabel(slot)} quitado del navegador.`);
}

function renderMktjoathiLogos() {
  renderMktjoathiLogoSlot("brand", "#mktBrandLogoPreview", "#mktBrandLogoMeta", "PNG, JPG o WebP. Maximo recomendado: 750 KB.");
  renderMktjoathiLogoSlot("supplier", "#mktSupplierLogoPreview", "#mktSupplierLogoMeta", "Usar solo si la pieza debe mostrar al proveedor.");
}

function renderMktjoathiLogoSlot(slot, previewSelector, metaSelector, emptyMeta) {
  const logo = mktjoathiLogoState?.[slot];
  const preview = document.querySelector(previewSelector);
  const meta = document.querySelector(metaSelector);

  if (preview) {
    preview.innerHTML = logo?.dataUrl
      ? `<img src="${mediaEscapeHtml(logo.dataUrl)}" alt="${mediaEscapeHtml(getMktjoathiLogoLabel(slot))}">`
      : "<span>Sin logo cargado</span>";
  }

  if (meta) {
    meta.textContent = logo?.name
      ? `${logo.name} | ${formatMediaFileSize(logo.size)} | guardado localmente`
      : emptyMeta;
  }
}

function getMktjoathiLogoLabel(slot) {
  return slot === "supplier" ? "Logo proveedor" : "Logo Joathi";
}

function getMktjoathiLogoSummary() {
  return ["brand", "supplier"].map((slot) => {
    const logo = mktjoathiLogoState?.[slot];
    if (!logo?.name) return "";
    return `${getMktjoathiLogoLabel(slot)} cargado: ${logo.name} (${formatMediaFileSize(logo.size)})`;
  }).filter(Boolean);
}

function buildMktjoathiLogoInstruction() {
  const hasBrandLogo = Boolean(mktjoathiLogoState?.brand?.name);
  const hasSupplierLogo = Boolean(mktjoathiLogoState?.supplier?.name);

  if (!hasBrandLogo && !hasSupplierLogo) {
    return "Logos: reservar espacio limpio para aplicar el logo Joathi en la edicion final; no inventar logos con IA.";
  }

  const instructions = [
    "Logos: no recrear ni generar logos con IA. Dejar espacio limpio y aplicar manualmente los archivos cargados en mktjoathi durante la edicion final."
  ];

  if (hasBrandLogo) {
    instructions.push(`Usar el archivo cargado como logo Joathi principal: ${mktjoathiLogoState.brand.name}.`);
  }

  if (hasSupplierLogo) {
    instructions.push(`Usar el archivo cargado como logo del proveedor solo en piezas con co-branding aprobado: ${mktjoathiLogoState.supplier.name}.`);
  }

  return instructions.join(" ");
}

function clampMediaPromptCount(value) {
  const parsed = Number.parseInt(String(value || "1"), 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(10, Math.max(1, parsed));
}

function getMediaPromptCount(brief) {
  return clampMediaPromptCount(brief?.promptCount || 1);
}

function getMediaObjectiveText(brief) {
  return mediaObjectiveCatalog[brief.objective] || mediaObjectiveCatalog.meeting;
}

function getMediaObjectiveCta(brief) {
  return String(brief.cta || "").trim() || mediaObjectiveCtaCatalog[brief.objective] || mediaObjectiveCtaCatalog.meeting;
}

function getMediaVariantFrame(index) {
  return mediaVariantFrames[index % mediaVariantFrames.length];
}

function buildMediaIndustryInstruction(brief) {
  const industry = String(brief.targetIndustry || "").trim() || "Importadores y exportadores";
  return `Industria objetivo: ${industry}. Adaptar dolor, escena, lenguaje y prueba visual a esa industria; el prompt base debe reinterpretarse para ese mercado, no usarse generico.`;
}

function getMediaContactItems(brief) {
  return [
    brief.companyWebsite ? `Web: ${brief.companyWebsite}` : "",
    brief.companyEmail ? `Mail: ${brief.companyEmail}` : "",
    brief.companyWhatsapp ? `WhatsApp: ${brief.companyWhatsapp}` : ""
  ].filter(Boolean);
}

function buildMediaContactInstruction(brief) {
  const items = getMediaContactItems(brief);
  if (!items.length) {
    return "Datos de contacto: no hay datos cargados; reservar CTA sin inventar telefono, mail ni web.";
  }

  return `Datos de contacto para CTA final: ${items.join(" | ")}. Usarlos solo como texto de cierre o referencia comercial, sin convertirlos en datos sensibles adicionales.`;
}

function syncMediaMeasureCards() {
  document.querySelectorAll(".mkt-measure-card").forEach((card) => {
    const input = card.querySelector("input[type='checkbox']");
    card.classList.toggle("is-selected", Boolean(input?.checked));
  });
}

function syncMediaWebUseCards() {
  document.querySelectorAll(".mkt-web-use-card").forEach((card) => {
    const input = card.querySelector("input[type='checkbox']");
    card.classList.toggle("is-selected", Boolean(input?.checked));
  });
}

function getMediaLandingDestination(brief) {
  const landing = String(brief?.landingDestination || "").trim();
  return landing || "sin sitio web o landing cargado";
}

function getMediaMeasureEntries(brief) {
  const rawSelected = Array.isArray(brief?.selectedMediaMeasures)
    ? brief.selectedMediaMeasures
    : Array.isArray(brief?.mediaMeasures)
      ? brief.mediaMeasures
      : [];

  const selectedIds = [...new Set(rawSelected.map((value) => String(value || "").trim()).filter(Boolean))];
  const selectedEntries = selectedIds
    .map((id) => mediaMeasureCatalog[id])
    .filter(Boolean);

  return selectedEntries.length ? selectedEntries : mediaDefaultMeasureEntries;
}

function getMediaMeasuresText(brief) {
  return getMediaMeasureEntries(brief)
    .map((entry) => `${entry.label} — ${entry.size} — ${entry.ratio}`)
    .join(" | ");
}

function getMediaWebUseEntries(brief) {
  const rawSelected = Array.isArray(brief?.selectedWebUses)
    ? brief.selectedWebUses
    : Array.isArray(brief?.webUses)
      ? brief.webUses
      : [];

  const selectedIds = [...new Set(rawSelected.map((value) => String(value || "").trim()).filter(Boolean))];
  return selectedIds
    .map((id) => mediaWebUseCatalog[id])
    .filter(Boolean);
}

function getMediaPrimaryWebUseEntry(brief) {
  return getMediaWebUseEntries(brief)[0] || null;
}

function getMediaPrimaryWebMeasureEntry(brief) {
  const selectedIds = Array.isArray(brief?.selectedMediaMeasures)
    ? brief.selectedMediaMeasures.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  const preferredIds = [
    "web-hero-desktop",
    "web-hero-ultrawide",
    "web-hero-mobile",
    "web-banner-wide",
    "web-section-horizontal",
    "card-web-square",
    "card-web-vertical",
    "dashboard-background",
    "email-header",
    "open-graph-preview"
  ];

  for (const id of preferredIds) {
    if (selectedIds.includes(id) && mediaMeasureCatalog[id]) {
      return mediaMeasureCatalog[id];
    }
  }

  const measureEntries = getMediaMeasureEntries(brief);
  const webSpecific = measureEntries.find((entry) => entry?.label && String(entry.label).toLowerCase().includes("web"));
  return webSpecific || mediaMeasureCatalog["web-hero-desktop"] || measureEntries[0] || null;
}

function hasMediaWebMode(brief) {
  if (getMediaWebUseEntries(brief).length > 0) {
    return true;
  }

  const selectedMeasures = Array.isArray(brief?.selectedMediaMeasures) ? brief.selectedMediaMeasures : [];
  const webMeasureIds = new Set([
    "web-hero-desktop",
    "web-hero-ultrawide",
    "web-hero-mobile",
    "web-banner-wide",
    "web-section-horizontal",
    "card-web-square",
    "card-web-vertical",
    "dashboard-background",
    "email-header",
    "open-graph-preview"
  ]);

  return selectedMeasures.some((measureId) => webMeasureIds.has(String(measureId || "").trim()));
}

function buildMediaWebSection(brief) {
  if (!hasMediaWebMode(brief)) {
    return "";
  }

  const primaryUse = getMediaPrimaryWebUseEntry(brief) || mediaWebUseCatalog["web-hero-main"];
  const primaryMeasure = getMediaPrimaryWebMeasureEntry(brief) || mediaMeasureCatalog["web-hero-desktop"];
  const landing = getMediaLandingDestination(brief);
  const objective = "Crear una imagen premium para web corporativa B2B, con espacio limpio para titular, subtítulo y botón CTA";

  return [
    "Uso principal:",
    "Sitio web / landing Joathi",
    "",
    "Tipo de pieza web:",
    primaryUse?.label || "Hero principal web",
    "",
    "Formato principal:",
    `${primaryMeasure?.label || "Web hero desktop"} — ${primaryMeasure?.size || "1920x1080"} — ${primaryMeasure?.ratio || "16:9"}`,
    "",
    "Adaptaciones requeridas:",
    mediaWebDefaultAdaptationIds
      .map((id) => mediaMeasureCatalog[id])
      .filter(Boolean)
      .map((entry) => `- ${entry.label} — ${entry.size} — ${entry.ratio}`)
      .join("\n"),
    "",
    "Sitio web / landing destino:",
    landing,
    "",
    "Objetivo visual:",
    objective
  ].join("\n");
}

function readMediaBrief() {
  const form = document.querySelector("#mediaBriefForm");
  const formData = new FormData(form);
  const selectedMediaMeasures = formData.getAll("mediaMeasures").map((value) => String(value || "").trim()).filter(Boolean);
  const selectedWebUses = formData.getAll("webUses").map((value) => String(value || "").trim()).filter(Boolean);
  return {
    sourcePrompt: String(formData.get("sourcePrompt") || "").trim() || MEDIA_STUDIO_DEFAULT_PROMPT,
    promptCount: clampMediaPromptCount(formData.get("promptCount")),
    targetIndustry: String(formData.get("targetIndustry") || "").trim() || "Importadores y exportadores",
    platform: String(formData.get("platform") || "linkedin"),
    assetType: String(formData.get("assetType") || "image"),
    format: String(formData.get("format") || "vertical"),
    objective: String(formData.get("objective") || "lead"),
    audience: String(formData.get("audience") || "logistics-manager"),
    scene: String(formData.get("scene") || "truck-road"),
    market: String(formData.get("market") || "sudamerica"),
    cta: String(formData.get("cta") || "").trim() || "Solicita una cotizacion con seguimiento real.",
    landingDestination: String(formData.get("landingDestination") || "").trim(),
    companyWebsite: String(formData.get("companyWebsite") || "").trim(),
    companyEmail: String(formData.get("companyEmail") || "").trim(),
    companyWhatsapp: String(formData.get("companyWhatsapp") || "").trim(),
    constraints: String(formData.get("constraints") || "").trim(),
    selectedMediaMeasures,
    selectedWebUses
  };
}

function generateMediaPackage(overrides = {}) {
  const brief = {
    ...readMediaBrief(),
    ...overrides
  };
  const outputs = buildMediaOutputs(brief);
  mediaCurrentPackage = buildMediaPackageRecord(brief, outputs, false);
  writeMediaOutputs(outputs);
  renderMediaPlatformSpec(brief);
  renderMediaReadiness(brief, "Paquete listo para producir", "Revisa restricciones, CTA y formato antes de generar el archivo final.");
  renderMediaStatus("Paquete generado localmente. Puedes copiarlo o pedir mejora con IA si el servidor tiene OpenAI configurado.");
  return mediaCurrentPackage;
}

function buildMediaOutputs(brief) {
  return {
    imagePrompt: buildMediaImagePrompt(brief),
    videoPrompt: buildMediaVideoPrompt(brief),
    caption: buildMediaCaption(brief),
    checklist: buildMediaChecklist(brief)
  };
}

function buildMediaImagePrompt(brief) {
  const count = getMediaPromptCount(brief);
  return Array.from({ length: count }, (_, index) => buildMediaImagePromptVariant(brief, index)).join("\n\n---\n\n");
}

function buildMediaImagePromptVariant(brief, index) {
  const platform = mediaPlatformCatalog[brief.platform] || mediaPlatformCatalog.linkedin;
  const format = mediaFormatCatalog[brief.format] || mediaFormatCatalog.vertical;
  const objective = getMediaObjectiveText(brief);
  const audience = mediaAudienceCatalog[brief.audience] || mediaAudienceCatalog["logistics-manager"];
  const scene = mediaSceneCatalog[brief.scene] || mediaSceneCatalog["truck-road"];
  const market = mediaMarketCatalog[brief.market] || "Sudamerica";
  const variant = getMediaVariantFrame(index);
  const landing = getMediaLandingDestination(brief);
  const measures = getMediaMeasuresText(brief);
  const webSection = buildMediaWebSection(brief);

  return [
    `PROMPT ${index + 1} - ${variant.title}`,
    "Crear una imagen publicitaria hiperrealista para Joathi Logistica.",
    `Escena: ${scene}.`,
    `Angulo de variante: ${variant.hook}. Visual principal: ${variant.visual}.`,
    `Idea base: ${brief.sourcePrompt}.`,
    buildMediaIndustryInstruction(brief),
    `Mercado visual: ${market}, contexto logistico empresarial realista, sin fantasia.`,
    `Objetivo comercial: ${objective}. Audiencia: ${audience}.`,
    `Destino: ${platform.label}. Formato: ${format.label}, entrega sugerida ${format.size}.`,
    `Sitio web / landing destino: ${landing}.`,
    `Medidas y formatos: ${measures}.`,
    webSection,
    buildMediaContactInstruction(brief),
    "Estetica: fotografia documental premium B2B, luz natural, textura real de ruta, metal, asfalto, pallets, documentos y pantallas operativas.",
    "Composicion: sujeto principal claro, espacio limpio para titular corto, sensacion de control, velocidad y trazabilidad.",
    "Marca: usar la nueva identidad Joathi como referencia visual (#0E3B2E, #F2B200, blanco y #1A1A1A), sin deformar el logo oficial ni recrearlo.",
    buildMktjoathiLogoInstruction(),
    "Camara: lente 35mm o 50mm, profundidad de campo natural, alto detalle, contraste corporativo, sin aspecto de stock generico.",
    "No incluir: caricaturas, ilustracion, exceso de texto, marcas de terceros, placas legibles, errores en camiones, manos deformes, logos inventados.",
    brief.constraints ? `Restricciones adicionales: ${brief.constraints}.` : "",
    `CTA visual sugerido: ${getMediaObjectiveCta(brief)}`
  ].filter(Boolean).join("\n");
}

function buildMediaVideoPrompt(brief) {
  const count = getMediaPromptCount(brief);
  return Array.from({ length: count }, (_, index) => buildMediaVideoPromptVariant(brief, index)).join("\n\n---\n\n");
}

function buildMediaVideoPromptVariant(brief, index) {
  const platform = mediaPlatformCatalog[brief.platform] || mediaPlatformCatalog.linkedin;
  const format = mediaFormatCatalog[brief.format] || mediaFormatCatalog.vertical;
  const objective = getMediaObjectiveText(brief);
  const audience = mediaAudienceCatalog[brief.audience] || mediaAudienceCatalog["logistics-manager"];
  const scene = mediaSceneCatalog[brief.scene] || mediaSceneCatalog["truck-road"];
  const variant = getMediaVariantFrame(index);
  const landing = getMediaLandingDestination(brief);
  const measures = getMediaMeasuresText(brief);
  const webSection = buildMediaWebSection(brief);

  return [
    `GUION ${index + 1} - ${variant.title}`,
    `Video corto realista para ${platform.label}. Formato ${format.label} (${format.size}).`,
    `Objetivo: ${objective}. Audiencia: ${audience}.`,
    buildMediaIndustryInstruction(brief),
    buildMediaContactInstruction(brief),
    `Sitio web / landing destino: ${landing}.`,
    `Medidas y formatos: ${measures}.`,
    webSection,
    `Direccion visual: ${scene}. ${brief.sourcePrompt}.`,
    "",
    "Duracion sugerida: 12 a 18 segundos.",
    `Shot 1 (0-3s): gancho visual ${variant.visual}; texto breve: "${variant.hook}".`,
    "Shot 2 (3-7s): detalle realista de tracking, documentos, chofer o coordinacion; transmitir control y trazabilidad sin exagerar.",
    "Shot 3 (7-12s): plano de ruta o equipo operativo resolviendo; mostrar velocidad, orden y soporte.",
    `Shot final: cierre con marca Joathi, promesa \"Tu carga, nuestro compromiso\" y CTA: \"${getMediaObjectiveCta(brief)}\".`,
    "",
    buildMktjoathiLogoInstruction(),
    "Estilo: camara estable, color corporativo, luz natural, movimiento sobrio, nada cartoon, nada futurista exagerado.",
    "Audio sugerido: base moderna, seria y dinamica; voz en off clara si aplica.",
    brief.constraints ? `Evitar: ${brief.constraints}.` : "Evitar logos deformados, marcas de terceros, texto excesivo y promesas no verificables."
  ].join("\n");
}

function buildMediaCaption(brief) {
  const count = getMediaPromptCount(brief);
  return Array.from({ length: count }, (_, index) => buildMediaCaptionVariant(brief, index)).join("\n\n---\n\n");
}

function buildMediaCaptionVariant(brief, index) {
  const platform = mediaPlatformCatalog[brief.platform] || mediaPlatformCatalog.linkedin;
  const objective = getMediaObjectiveText(brief);
  const audience = mediaAudienceCatalog[brief.audience] || mediaAudienceCatalog["logistics-manager"];
  const industry = String(brief.targetIndustry || "Importadores y exportadores").trim();
  const variant = getMediaVariantFrame(index);
  const contactItems = getMediaContactItems(brief);
  const contactLine = contactItems.length ? `\nContacto: ${contactItems.join(" | ")}` : "";
  const landing = getMediaLandingDestination(brief);
  const measures = getMediaMeasuresText(brief);
  const webSection = buildMediaWebSection(brief);

  if (brief.platform === "stories") {
    return [
      `COPY ${index + 1} - ${variant.title}`,
      "Titulo en pantalla: Tu carga no puede quedar sin respuesta.",
      `Subtitulo: Joathi coordina operaciones para ${industry} con control y respuesta.`,
      `Landing: ${landing}`,
      `Medidas: ${measures}`,
      webSection,
      `CTA: ${getMediaObjectiveCta(brief)}`,
      contactLine.trim(),
      "Sticker sugerido: Enviar mensaje"
    ].filter(Boolean).join("\n");
  }

  if (brief.platform === "whatsapp") {
    return [
      `COPY ${index + 1} - ${variant.title}`,
      `Cuando la operacion de ${industry} necesita respuesta, Joathi esta para coordinar y dar visibilidad.`,
      `Servicio pensado para ${audience}.`,
      `Landing: ${landing}`,
      `Medidas: ${measures}`,
      webSection,
      getMediaObjectiveCta(brief),
      contactLine.trim()
    ].filter(Boolean).join("\n");
  }

  return [
    `COPY ${index + 1} - ${variant.title}`,
    `La diferencia entre mover una carga y operar con control se nota cuando aparece la presion en ${industry}.`,
    "",
    `Esta pieza apunta a ${audience} y busca ${objective}.`,
    `En Joathi Logistica trabajamos con seguimiento, coordinacion y respuesta para que la operacion avance con informacion clara. Angulo visual: ${variant.hook}.`,
    `Landing: ${landing}`,
    `Medidas: ${measures}`,
    webSection,
    "",
    `Tu carga, nuestro compromiso. ${getMediaObjectiveCta(brief)}`,
    contactLine,
    platform.hashtags ? `\n${platform.hashtags}` : ""
  ].filter(Boolean).join("\n");
}

function buildMediaChecklist(brief) {
  const platform = mediaPlatformCatalog[brief.platform] || mediaPlatformCatalog.linkedin;
  const format = mediaFormatCatalog[brief.format] || mediaFormatCatalog.vertical;
  const landing = getMediaLandingDestination(brief);
  const measures = getMediaMeasuresText(brief);
  const webSection = buildMediaWebSection(brief);

  return [
    "Checklist antes de publicar",
    `0. Cantidad solicitada: ${getMediaPromptCount(brief)} prompt(s) / variante(s).`,
    `0.1 Industria objetivo: ${brief.targetIndustry || "Importadores y exportadores"}. Confirmar que cada variante hable a ese mercado.`,
    `0.2 Objetivo concreto: ${getMediaObjectiveText(brief)}.`,
    `0.3 Sitio web / landing destino: ${landing}.`,
    `0.4 Medidas y formatos: ${measures}.`,
    webSection,
    `0.5 Datos comerciales: ${getMediaContactItems(brief).join(" | ") || "sin web, mail ni WhatsApp cargados"}.`,
    `1. Exportar en ${format.label} (${format.size}) y revisar nitidez en movil.`,
    `2. Confirmar que el destino sea ${platform.label} y que el copy respete ${platform.copyLength}.`,
    "3. Verificar que no haya patentes, marcas de terceros, datos sensibles ni documentos legibles.",
    `4. Confirmar logos: ${getMktjoathiLogoSummary().join("; ") || "usar logo Joathi aprobado en edicion final"}.`,
    "5. Confirmar que ningun logo este deformado y que la paleta respete JoathiVA.",
    "6. Revisar que la promesa comercial sea defendible: control, seguimiento, coordinacion y respuesta.",
    "7. Validar CTA visible y accionable.",
    "8. Guardar version final y registrar aprendizaje si la pieza se publica desde Growth Lab."
  ].join("\n");
}

function writeMediaOutputs(outputs) {
  setMediaFieldValue("mediaImagePromptOutput", outputs.imagePrompt);
  setMediaFieldValue("mediaVideoPromptOutput", outputs.videoPrompt);
  setMediaFieldValue("mediaCaptionOutput", outputs.caption);
  setMediaFieldValue("mediaChecklistOutput", outputs.checklist);
}

function setMediaFieldValue(id, value) {
  const field = document.querySelector(`#${id}`);
  if (field) field.value = String(value || "");
}

function renderMediaPlatformSpec(sourceBrief = null) {
  const brief = sourceBrief || readMediaBrief();
  const platform = mediaPlatformCatalog[brief.platform] || mediaPlatformCatalog.linkedin;
  const format = mediaFormatCatalog[brief.format] || mediaFormatCatalog.vertical;
  const assetType = mediaAssetTypeLabels[brief.assetType] || "pieza visual";
  const landing = getMediaLandingDestination(brief);
  const measures = getMediaMeasuresText(brief);
  const webUses = getMediaWebUseEntries(brief);
  const node = document.querySelector("#mediaPlatformSpec");
  if (!node) return;

  node.innerHTML = [
    {
      label: "Canal",
      title: platform.label,
      body: platform.usage
    },
    {
      label: "Formato",
      title: `${format.label} | ${format.size}`,
      body: format.note
    },
    {
      label: "Pieza",
      title: assetType,
      body: `Tono recomendado: ${platform.tone}. Copy: ${platform.copyLength}.`
    },
    {
      label: "Estrategia",
      title: `${getMediaPromptCount(brief)} variante(s) | ${brief.targetIndustry || "Industria objetivo"}`,
      body: `Objetivo concreto: ${getMediaObjectiveText(brief)}.`
    },
    {
      label: "Landing",
      title: landing,
      body: "Se incluye en cada prompt y en el checklist."
    },
    {
      label: "Medidas",
      title: measures,
      body: "Seleccion multiple; si no marcas ninguna, el sistema aplica feed, story/reel y hero web."
    },
    {
      label: "Uso web",
      title: webUses.length ? webUses.map((entry) => entry.label).join(" | ") : "Sin selección web",
      body: webUses.length ? "Se activó el modo de prompts para landing y web corporativa." : "Activa el bloque web para obtener el bloque específico de landing."
    }
  ].map((item) => `
    <article class="media-spec-card">
      <span>${mediaEscapeHtml(item.label)}</span>
      <strong>${mediaEscapeHtml(item.title)}</strong>
      <p>${mediaEscapeHtml(item.body)}</p>
    </article>
  `).join("");
}

function renderMediaReadiness(brief, title, text) {
  setMediaText("#mediaReadinessTitle", title);
  setMediaText("#mediaReadinessText", text);
}

async function generateMediaPackageWithAi() {
  if (mediaStudioBusy) return;

  const url = getMediaOpenAiRespondUrl();
  if (!url) {
    renderMediaStatus("No hay backend local disponible. Abre JoathiVA desde el servidor para usar IA.", true);
    return;
  }

  mediaStudioBusy = true;
  renderMediaStatus("Consultando IA desde el backend local de JoathiVA...");

  const brief = readMediaBrief();
  const localOutputs = buildMediaOutputs(brief);
  const aiPrompt = buildMediaAiPrompt(brief);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      body: JSON.stringify({
        ...getMediaAuthPayload(),
        prompt: aiPrompt,
        model: "gpt-5",
        reasoningEffort: "low",
        instructions: "Eres director creativo senior de JoathiVA. Respondes en espanol claro, profesional y comercial. Nunca pidas claves ni incluyas informacion sensible. Genera prompts visuales hiperrealistas para logistica B2B, con tono premium, trazabilidad, control operativo y conversion comercial.",
        context: buildMediaContext(brief)
      })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || `No se pudo consultar IA (HTTP ${response.status}).`);
    }

    const sections = parseMediaAiSections(String(result.outputText || ""));
    const outputs = {
      imagePrompt: sections.imagePrompt || localOutputs.imagePrompt,
      videoPrompt: sections.videoPrompt || localOutputs.videoPrompt,
      caption: sections.caption || localOutputs.caption,
      checklist: sections.checklist || localOutputs.checklist
    };

    mediaCurrentPackage = buildMediaPackageRecord(brief, outputs, true);
    writeMediaOutputs(outputs);
    renderMediaReadiness(brief, "Paquete mejorado con IA", "La IA genero una direccion creativa mas refinada. Revisa datos, promesas y restricciones antes de publicar.");
    renderMediaStatus("Paquete mejorado con IA desde el servidor local. No se expuso ninguna API key en el navegador.");
  } catch (error) {
    mediaCurrentPackage = buildMediaPackageRecord(brief, localOutputs, false);
    writeMediaOutputs(localOutputs);
    renderMediaStatus(error?.message || "No se pudo mejorar con IA. Se conserva el paquete local.", true);
  } finally {
    mediaStudioBusy = false;
  }
}

function buildMediaAiPrompt(brief) {
  const platform = mediaPlatformCatalog[brief.platform] || mediaPlatformCatalog.linkedin;
  const format = mediaFormatCatalog[brief.format] || mediaFormatCatalog.vertical;
  const landing = getMediaLandingDestination(brief);
  const measures = getMediaMeasuresText(brief);
  const webSection = buildMediaWebSection(brief);
  return [
    "Genera un paquete creativo para producir una pieza visual realista de Joathi Logistica.",
    "Devuelve exactamente estas secciones con esos titulos:",
    "PROMPT_IMAGEN:",
    "GUION_VIDEO:",
    "COPY_PUBLICACION:",
    "CHECKLIST:",
    "",
    `Prompt base del usuario: ${brief.sourcePrompt}`,
    `Cantidad de prompts a generar por seccion: ${getMediaPromptCount(brief)}. Cada seccion debe incluir variantes numeradas y diferenciadas.`,
    buildMediaIndustryInstruction(brief),
    `Canal de publicacion: ${platform.label}`,
    `Tipo de pieza: ${mediaAssetTypeLabels[brief.assetType] || brief.assetType}`,
    `Formato: ${format.label} ${format.size}`,
    `Objetivo concreto: ${getMediaObjectiveText(brief)}`,
    `Audiencia: ${mediaAudienceCatalog[brief.audience] || brief.audience}`,
    `Escena: ${mediaSceneCatalog[brief.scene] || brief.scene}`,
    `Mercado: ${mediaMarketCatalog[brief.market] || brief.market}`,
    `Sitio web / landing destino: ${landing}`,
    `Medidas y formatos: ${measures}`,
    webSection,
    `CTA: ${getMediaObjectiveCta(brief)}`,
    buildMediaContactInstruction(brief),
    `Restricciones: ${brief.constraints || "sin restricciones adicionales"}`,
    "",
    "Criterios obligatorios: hiperrealismo, logistica B2B, control operativo, trazabilidad, confianza, claridad comercial, sin estilo infantil, sin promesas imposibles, sin secretos ni datos sensibles.",
    "Los logos locales permanecen en el navegador y no se envian al backend."
  ].join("\n");
}

function buildMediaContext(brief) {
  const platform = mediaPlatformCatalog[brief.platform] || mediaPlatformCatalog.linkedin;
  const landing = getMediaLandingDestination(brief);
  const measures = getMediaMeasuresText(brief);
  const webSection = buildMediaWebSection(brief);
  return [
    "Marca: Joathi Logistica / JoathiVA",
    "Promesa: Tu carga, nuestro compromiso.",
    "Percepcion buscada: confianza, velocidad, control operativo, orden, visibilidad, trazabilidad e imagen premium B2B.",
    "Paleta oficial Joathi: Primary #0E3B2E, Accent #F2B200, White #FFFFFF, Dark #1A1A1A.",
    `Destino elegido: ${platform.label}`,
    `Industria objetivo: ${brief.targetIndustry || "Importadores y exportadores"}.`,
    `Objetivo concreto: ${getMediaObjectiveText(brief)}.`,
    `Cantidad de variantes: ${getMediaPromptCount(brief)}.`,
    `Sitio web / landing destino: ${landing}`,
    `Medidas y formatos: ${measures}`,
    webSection,
    `Datos comerciales: ${getMediaContactItems(brief).join(" | ") || "sin datos comerciales cargados"}.`,
    "Los logos cargados permanecen locales en el navegador y no se adjuntan al backend.",
    "No generar ni solicitar API keys. La respuesta es solo texto operativo para producir la pieza."
  ].join("\n");
}

function parseMediaAiSections(text) {
  return {
    imagePrompt: extractMediaSection(text, "PROMPT_IMAGEN", "GUION_VIDEO"),
    videoPrompt: extractMediaSection(text, "GUION_VIDEO", "COPY_PUBLICACION"),
    caption: extractMediaSection(text, "COPY_PUBLICACION", "CHECKLIST"),
    checklist: extractMediaSection(text, "CHECKLIST", "")
  };
}

function extractMediaSection(text, start, end) {
  const source = String(text || "");
  const startIndex = source.indexOf(`${start}:`);
  if (startIndex < 0) return "";
  const contentStart = startIndex + start.length + 1;
  const endIndex = end ? source.indexOf(`${end}:`, contentStart) : -1;
  const raw = endIndex >= 0 ? source.slice(contentStart, endIndex) : source.slice(contentStart);
  return raw.trim();
}

function getMediaOpenAiRespondUrl() {
  if (typeof getJoathiVaApiUrl === "function") {
    const apiUrl = getJoathiVaApiUrl("/api/openai/respond");
    if (apiUrl) return apiUrl;
  }

  if (/^https?:/i.test(window.location.origin || "")) {
    return "/api/openai/respond";
  }

  return "";
}

function getMediaAuthPayload() {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  return {
    username: user?.username || "",
    password: user?.password || ""
  };
}

function buildMediaPackageRecord(brief, outputs, aiEnhanced) {
  const platform = mediaPlatformCatalog[brief.platform] || mediaPlatformCatalog.linkedin;
  return {
    id: buildMediaId("media"),
    title: buildMediaTitle(brief),
    platform: platform.label,
    assetType: mediaAssetTypeLabels[brief.assetType] || brief.assetType,
    createdAt: new Date().toISOString(),
    aiEnhanced: Boolean(aiEnhanced),
    brandAssets: getMktjoathiLogoSummary(),
    brief,
    outputs
  };
}

function buildMediaTitle(brief) {
  const platform = mediaPlatformCatalog[brief.platform] || mediaPlatformCatalog.linkedin;
  const assetType = mediaAssetTypeLabels[brief.assetType] || brief.assetType;
  const prompt = brief.sourcePrompt.split(/[.!?]/)[0].slice(0, 54).trim();
  return `${platform.label} | ${assetType}${prompt ? ` | ${prompt}` : ""}`;
}

function saveMediaCurrentPackage() {
  if (!mediaCurrentPackage) {
    generateMediaPackage();
  }

  const packages = loadMediaPackages();
  const nextPackage = {
    ...mediaCurrentPackage,
    id: buildMediaId("media"),
    createdAt: new Date().toISOString()
  };
  packages.unshift(nextPackage);
  saveMediaPackages(packages.slice(0, 18));
  renderMediaSavedPackages();
  renderMediaStatus("Paquete guardado en el historial local del navegador.");
}

function loadMediaPackages() {
  try {
    const raw = localStorage.getItem(MEDIA_STUDIO_PACKAGES_KEY) || localStorage.getItem(MEDIA_STUDIO_LEGACY_PACKAGES_KEY) || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMediaPackages(packages) {
  localStorage.setItem(MEDIA_STUDIO_PACKAGES_KEY, JSON.stringify(Array.isArray(packages) ? packages : []));
}

function renderMediaSavedPackages() {
  const node = document.querySelector("#mediaSavedPackages");
  if (!node) return;

  const packages = loadMediaPackages();
  if (!packages.length) {
    node.innerHTML = `
      <article class="media-empty">
        <strong>No hay paquetes guardados.</strong>
        <p>Genera una pieza y guardala para reutilizar prompts, copy o guiones.</p>
      </article>
    `;
    return;
  }

  node.innerHTML = packages.map((item) => `
    <article class="media-history-card">
      <strong>${mediaEscapeHtml(item.title || "Paquete visual")}</strong>
      <p>${mediaEscapeHtml((item.brief?.sourcePrompt || "").slice(0, 130))}${(item.brief?.sourcePrompt || "").length > 130 ? "..." : ""}</p>
      <div class="media-history-meta">
        <span>${mediaEscapeHtml(item.platform || "Canal")}</span>
        <span>${mediaEscapeHtml(item.assetType || "Pieza")}</span>
        <span>${mediaEscapeHtml(item.aiEnhanced ? "IA" : "Local")}</span>
      </div>
      <div class="media-history-actions">
        <button type="button" class="button button-secondary" data-media-history-action="load" data-media-package-id="${mediaEscapeHtml(item.id)}">Cargar</button>
        <button type="button" class="button button-primary" data-media-history-action="delete" data-media-package-id="${mediaEscapeHtml(item.id)}">Eliminar</button>
      </div>
    </article>
  `).join("");
}

function loadMediaPackageIntoForm(packageId) {
  const item = loadMediaPackages().find((entry) => entry.id === packageId);
  if (!item?.brief) return;

  const form = document.querySelector("#mediaBriefForm");
  Object.entries(item.brief).forEach(([name, value]) => {
    const targetName = name === "selectedMediaMeasures"
      ? "mediaMeasures"
      : name === "selectedWebUses"
        ? "webUses"
        : name;
    const fields = form?.querySelectorAll(`[name='${targetName}']`);
    if (!fields?.length) return;

    fields.forEach((field) => {
      if (field.type === "checkbox") {
        const selectedValues = Array.isArray(value) ? value.map((entry) => String(entry || "")) : [];
        field.checked = selectedValues.includes(field.value);
        return;
      }

      if (field.type === "radio") {
        field.checked = String(field.value) === String(value || "");
        return;
      }

      field.value = Array.isArray(value) ? String(value[0] || "") : String(value || "");
    });
  });

  mediaCurrentPackage = item;
  syncMediaMeasureCards();
  writeMediaOutputs(item.outputs || buildMediaOutputs(item.brief));
  renderMediaPlatformSpec(item.brief);
  renderMediaReadiness(item.brief, "Paquete cargado", "Puedes ajustarlo, volver a generar o copiar los bloques actuales.");
  renderMediaStatus("Paquete cargado desde el historial local.");
}

function deleteMediaPackage(packageId) {
  const packages = loadMediaPackages().filter((item) => item.id !== packageId);
  saveMediaPackages(packages);
  renderMediaSavedPackages();
  renderMediaStatus("Paquete eliminado del historial local.");
}

function renderMediaStatus(message, isError = false) {
  const node = document.querySelector("#mediaStudioStatus");
  if (!node) return;
  node.innerHTML = `
    <article class="record-card media-status-card${isError ? " is-error" : ""}">
      <strong>${isError ? "Requiere revision" : "Estado de mktjoathi"}</strong>
      <p>${mediaEscapeHtml(message)}</p>
    </article>
  `;
}

async function copyMediaText(text, button) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const previous = button.textContent;
    button.textContent = "Copiado";
    window.setTimeout(() => {
      button.textContent = previous;
    }, 1200);
  } catch {
  }
}

function setMediaText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = String(value || "");
}

function buildMediaId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatMediaFileSize(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function mediaEscapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

