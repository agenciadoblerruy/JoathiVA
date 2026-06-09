const BRAND_STUDIO_STORAGE_KEY = "joathiva-brand-studio-v2";
const BRAND_REFERENCE_MAX_BYTES = 1_250_000;
const BRAND_MEMORY_DB_NAME = "joathiva-brand-studio-memory";
const BRAND_MEMORY_DB_VERSION = 1;
const BRAND_MEMORY_STORE = "documents";
const BRAND_TEXT_FILE_MAX_BYTES = 25_000_000;
const BRAND_ANALYSIS_MAX_CHARS = 180_000;

const sectorOptions = [
  {
    value: "logistica_transporte",
    label: "Logistica y transporte",
    recommendation: "Recomendado cuando la compra depende de confianza, trazabilidad, cumplimiento y capacidad operativa.",
    keywords: ["logistica", "transporte", "carga", "camion", "flota", "aduana", "mercosur", "viaje", "tracking", "despacho", "contenedor"]
  },
  {
    value: "servicios_b2b",
    label: "Servicios B2B",
    recommendation: "Recomendado si el servicio se vende por relacion, diagnostico, propuesta y seguimiento comercial.",
    keywords: ["consultoria", "servicio", "empresa", "b2b", "corporativo", "proveedor", "clientes", "gestion", "operacion"]
  },
  {
    value: "tecnologia_saas",
    label: "Tecnologia / SaaS",
    recommendation: "Recomendado para productos digitales, automatizacion, dashboards, software o plataformas.",
    keywords: ["software", "saas", "app", "plataforma", "automatizacion", "dashboard", "tecnologia", "api", "datos"]
  },
  {
    value: "retail_ecommerce",
    label: "Retail / e-commerce",
    recommendation: "Recomendado para venta directa, catalogo, tienda online, promociones y recompra.",
    keywords: ["tienda", "producto", "catalogo", "ecommerce", "retail", "stock", "envio", "compra", "promocion"]
  },
  {
    value: "industria_manufactura",
    label: "Industria / manufactura",
    recommendation: "Recomendado para procesos productivos, suministro, calidad, eficiencia y capacidad instalada.",
    keywords: ["industria", "manufactura", "fabrica", "produccion", "maquinaria", "calidad", "planta", "insumo"]
  },
  {
    value: "finanzas",
    label: "Finanzas / seguros",
    recommendation: "Recomendado cuando pesan seguridad, confianza, riesgo, asesoramiento y cumplimiento.",
    keywords: ["finanzas", "seguro", "credito", "inversion", "banco", "riesgo", "patrimonio", "contable"]
  },
  {
    value: "salud_bienestar",
    label: "Salud / bienestar",
    recommendation: "Recomendado para servicios donde la autoridad, evidencia y cuidado sostienen la decision.",
    keywords: ["salud", "clinica", "paciente", "bienestar", "medico", "tratamiento", "terapia", "cuidado"]
  },
  {
    value: "educacion",
    label: "Educacion",
    recommendation: "Recomendado para cursos, formacion, capacitacion, instituciones y programas.",
    keywords: ["educacion", "curso", "capacitacion", "formacion", "alumnos", "programa", "academia", "clase"]
  },
  {
    value: "inmobiliario",
    label: "Inmobiliario",
    recommendation: "Recomendado si la decision depende de ubicacion, inversion, confianza y prueba visual.",
    keywords: ["inmobiliaria", "propiedad", "alquiler", "venta", "terreno", "apartamento", "inversion", "obra"]
  },
  {
    value: "gastronomia_turismo",
    label: "Gastronomia / turismo",
    recommendation: "Recomendado para experiencias, reservas, destino, hospitalidad y consumo local.",
    keywords: ["restaurante", "hotel", "turismo", "viaje", "menu", "reserva", "experiencia", "destino"]
  },
  {
    value: "marca_personal",
    label: "Marca personal / consultoria",
    recommendation: "Recomendado cuando el activo principal es una persona, su criterio y su reputacion.",
    keywords: ["mentor", "consultor", "speaker", "personal", "autor", "profesional", "coach", "experto"]
  }
];

const objectiveOptions = [
  {
    value: "generar_leads",
    label: "Generar leads calificados",
    recommendation: "Recomendado si la empresa necesita conversaciones comerciales, cotizaciones o reuniones.",
    keywords: ["leads", "ventas", "cotizacion", "reunion", "clientes", "comercial", "prospectos", "demanda"]
  },
  {
    value: "awareness",
    label: "Aumentar reconocimiento",
    recommendation: "Recomendado si el mercado todavia no entiende bien quien es la empresa o por que existe.",
    keywords: ["visibilidad", "reconocimiento", "marca", "posicionamiento", "conocimiento", "alcance"]
  },
  {
    value: "lanzamiento",
    label: "Lanzar producto o servicio",
    recommendation: "Recomendado cuando hay una oferta nueva y se necesita explicar valor, uso y motivo para probarla.",
    keywords: ["lanzamiento", "nuevo", "presentar", "abrir", "servicio nuevo", "producto nuevo"]
  },
  {
    value: "rebranding",
    label: "Construir identidad de marca",
    recommendation: "Recomendado si no hay identidad, tono, paleta, promesa o sistema visual claro.",
    keywords: ["identidad", "rebranding", "marca nueva", "logo", "paleta", "tono", "sin marca", "imagen"]
  },
  {
    value: "autoridad",
    label: "Posicionarse como autoridad",
    recommendation: "Recomendado para vender confianza, criterio experto, experiencia y procesos diferenciales.",
    keywords: ["autoridad", "experiencia", "casos", "prueba", "confianza", "experto", "contenido", "educar"]
  },
  {
    value: "retencion",
    label: "Fidelizar clientes actuales",
    recommendation: "Recomendado si el foco es recompra, educacion de clientes, upgrades o relacion de largo plazo.",
    keywords: ["retencion", "fidelizar", "recompra", "clientes actuales", "renovar", "postventa"]
  },
  {
    value: "trafico_web",
    label: "Llevar trafico a web o landing",
    recommendation: "Recomendado cuando ya existe una landing clara y se necesita dirigir visitas medibles.",
    keywords: ["web", "landing", "trafico", "sitio", "formulario", "descarga"]
  },
  {
    value: "reclutamiento",
    label: "Atraer talento o aliados",
    recommendation: "Recomendado si el objetivo es sumar choferes, proveedores, franquiciados, distribuidores o equipo.",
    keywords: ["talento", "choferes", "proveedores", "aliados", "equipo", "reclutamiento", "trabajo"]
  }
];

const defaultBrandState = {
  brand: {
    brandName: "JoathiVA Logistics Premium",
    brandCode: "JV-B2B-001",
    industry: "Logistica B2B y transporte internacional",
    personality: "premium B2B, confiable, tecnologica, ordenada",
    visualPromise: "Transmitir control operativo, trazabilidad, velocidad de respuesta y confianza ejecutiva para empresas que mueven carga.",
    primaryColor: "#0E3B2E",
    secondaryColor: "#F2B200",
    accentColor: "#F2B200",
    backgroundColor: "#F8FAFC",
    typography: "Montserrat, Inter o Segoe UI, con titulares firmes y lectura limpia",
    logoRule: "logo visible en esquina inferior derecha, limpio y sin deformar",
    compositionRules: "Composiciones limpias, mucho orden visual, zonas de datos discretas, perspectiva moderna, rutas/logistica/control como senales visuales. Usar luz clara, contraste profesional y espacios de respiracion.",
    negativeRules: "Evitar estetica amateur, exceso de colores, fondos caoticos, textos ilegibles, logos deformados, personajes caricaturescos, camiones genericos de juguete, promesas poco creibles.",
    referenceImageName: "",
    referenceImageDataUrl: ""
  },
  company: {
    companyName: "",
    website: "",
    country: "",
    channels: "",
    offer: "",
    audience: "",
    differentiators: "",
    competitors: "",
    currentSituation: ""
  },
  brief: {
    campaignName: "",
    sector: "",
    objective: "",
    budgetRange: "organico",
    marketScope: "regional",
    mainOffer: "",
    notes: ""
  },
  analysis: null,
  campaigns: [],
  prompts: []
};

let brandStudioState = loadBrandStudioState();
let memoryDocuments = [];
let brandMemoryDbPromise = null;

const baseForm = document.querySelector("#brandBaseForm");
const companyForm = document.querySelector("#companyForm");
const campaignBriefForm = document.querySelector("#campaignBriefForm");
const pieceForm = document.querySelector("#pieceForm");
const promptBank = document.querySelector("#promptBank");
const masterPromptOutput = document.querySelector("#masterPrompt");
const brandJsonOutput = document.querySelector("#brandJsonOutput");
const referenceInput = document.querySelector("#referenceImage");
const referenceName = document.querySelector("[data-reference-name]");
const referencePreview = document.querySelector("[data-reference-preview]");
const importInput = document.querySelector("#brandImportInput");
const sourceTextInput = document.querySelector("#sourceText");
const sourceFilesInput = document.querySelector("#sourceFiles");
const sourceFileStatus = document.querySelector("[data-source-file-status]");
const memoryList = document.querySelector("#memoryList");
const recommendationPanel = document.querySelector("#recommendationPanel");
const analysisOutput = document.querySelector("#analysisOutput");
const campaignOutput = document.querySelector("#campaignOutput");

void bootBrandStudio();

async function bootBrandStudio() {
  hydrateCompanyForm();
  hydrateBriefForm();
  hydrateBrandForm();
  bindBrandStudioEvents();
  await refreshMemoryDocuments();
  renderBrandStudio();
}

function bindBrandStudioEvents() {
  baseForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveBrandFromForm();
    announce("Diseno base guardado.");
  });

  baseForm?.addEventListener("input", () => {
    saveBrandFromForm({ silent: true });
  });

  companyForm?.addEventListener("input", () => {
    saveCompanyFromForm({ silent: true });
  });

  campaignBriefForm?.addEventListener("input", () => {
    saveBriefFromForm({ silent: true });
  });

  referenceInput?.addEventListener("change", handleReferenceImage);
  sourceFilesInput?.addEventListener("change", handleSourceFiles);

  pieceForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveBrandFromForm({ silent: true });
    const prompt = buildPromptFromPiece(new FormData(pieceForm));
    brandStudioState.prompts.unshift(prompt);
    persistBrandStudioState();
    pieceForm.reset();
    renderBrandStudio();
  });

  document.querySelectorAll("[data-save-brand]").forEach((button) => {
    button.addEventListener("click", () => {
      saveBrandFromForm();
      announce("Diseno base guardado.");
    });
  });

  document.querySelectorAll("[data-save-company]").forEach((button) => {
    button.addEventListener("click", () => {
      saveCompanyFromForm();
      announce("Empresa guardada.");
    });
  });

  document.querySelectorAll("[data-run-analysis]").forEach((button) => {
    button.addEventListener("click", () => {
      runCompanyAnalysis();
      announce("Analisis actualizado.");
    });
  });

  document.querySelectorAll("[data-generate-campaigns]").forEach((button) => {
    button.addEventListener("click", () => {
      generateOptimizedCampaigns();
      announce("Dos campanas optimizadas generadas.");
    });
  });

  document.querySelectorAll("[data-build-identity]").forEach((button) => {
    button.addEventListener("click", () => {
      buildIdentityFromAnalysis();
      announce("Identidad base construida.");
    });
  });

  document.querySelectorAll("[data-copy-master]").forEach((button) => {
    button.addEventListener("click", () => copyText(buildMasterPrompt(), "Prompt maestro copiado."));
  });

  document.querySelector("[data-save-source-text]")?.addEventListener("click", saveSourceTextToMemory);
  document.querySelector("[data-clear-memory]")?.addEventListener("click", clearMemoryDocuments);
  document.querySelector("[data-export-brand]")?.addEventListener("click", exportBrandKit);
  document.querySelector("[data-export-campaign-package]")?.addEventListener("click", exportCampaignPackage);
  document.querySelector("[data-import-brand]")?.addEventListener("click", () => importInput?.click());
  document.querySelector("[data-reset-brand]")?.addEventListener("click", resetBrandBase);
  document.querySelector("[data-clear-prompts]")?.addEventListener("click", clearPromptBank);
  document.querySelector("[data-generate-pack]")?.addEventListener("click", generatePromptPack);
  importInput?.addEventListener("change", importBrandKit);

  promptBank?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-prompt-action]");
    if (!button) return;
    const id = button.dataset.promptId;
    const prompt = brandStudioState.prompts.find((item) => item.id === id);

    if (button.dataset.promptAction === "copy" && prompt) {
      copyText(prompt.prompt, "Prompt copiado.");
    }

    if (button.dataset.promptAction === "delete") {
      brandStudioState.prompts = brandStudioState.prompts.filter((item) => item.id !== id);
      persistBrandStudioState();
      renderBrandStudio();
    }
  });

  campaignOutput?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-campaign-action]");
    if (!button) return;
    const campaign = brandStudioState.campaigns.find((item) => item.id === button.dataset.campaignId);
    if (!campaign) return;

    if (button.dataset.campaignAction === "copy-text") {
      copyText(buildCampaignTextFile(campaign), "Texto de campana copiado.");
    }
    if (button.dataset.campaignAction === "copy-brief") {
      copyText(campaign.imageBrief, "Brief visual copiado.");
    }
    if (button.dataset.campaignAction === "download-svg") {
      downloadFile(`${slugify(campaign.name)}.svg`, campaign.imageSvg, "image/svg+xml");
    }
  });
}

function hydrateBrandForm() {
  hydrateForm(baseForm, brandStudioState.brand);
}

function hydrateCompanyForm() {
  hydrateForm(companyForm, brandStudioState.company);
}

function hydrateBriefForm() {
  hydrateForm(campaignBriefForm, brandStudioState.brief);
}

function hydrateForm(form, values) {
  if (!form) return;
  Object.entries(values || {}).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field && field.type !== "file") {
      field.value = value || "";
    }
  });
}

function saveCompanyFromForm(options = {}) {
  if (!companyForm) return;
  const formData = new FormData(companyForm);
  brandStudioState.company = {
    companyName: cleanValue(formData.get("companyName")),
    website: cleanValue(formData.get("website")),
    country: cleanValue(formData.get("country")),
    channels: cleanValue(formData.get("channels")),
    offer: cleanValue(formData.get("offer")),
    audience: cleanValue(formData.get("audience")),
    differentiators: cleanValue(formData.get("differentiators")),
    competitors: cleanValue(formData.get("competitors")),
    currentSituation: cleanValue(formData.get("currentSituation"))
  };
  persistBrandStudioState();
  if (!options.silent) {
    hydrateCompanyForm();
    renderBrandStudio();
  } else {
    renderRecommendation();
    renderBrandJson();
  }
}

function saveBriefFromForm(options = {}) {
  if (!campaignBriefForm) return;
  const formData = new FormData(campaignBriefForm);
  brandStudioState.brief = {
    campaignName: cleanValue(formData.get("campaignName")),
    sector: cleanValue(formData.get("sector")),
    objective: cleanValue(formData.get("objective")),
    budgetRange: cleanValue(formData.get("budgetRange")) || "organico",
    marketScope: cleanValue(formData.get("marketScope")) || "regional",
    mainOffer: cleanValue(formData.get("mainOffer")),
    notes: cleanValue(formData.get("notes"))
  };
  persistBrandStudioState();
  if (!options.silent) {
    hydrateBriefForm();
    renderBrandStudio();
  } else {
    renderRecommendation();
    renderBrandJson();
  }
}

function saveBrandFromForm(options = {}) {
  if (!baseForm) return;
  const previousReference = {
    referenceImageName: brandStudioState.brand.referenceImageName,
    referenceImageDataUrl: brandStudioState.brand.referenceImageDataUrl
  };
  const formData = new FormData(baseForm);
  brandStudioState.brand = {
    brandName: cleanValue(formData.get("brandName")) || getCompanyDisplayName() || defaultBrandState.brand.brandName,
    brandCode: cleanValue(formData.get("brandCode")) || defaultBrandState.brand.brandCode,
    industry: cleanValue(formData.get("industry")),
    personality: cleanValue(formData.get("personality")),
    visualPromise: cleanValue(formData.get("visualPromise")),
    primaryColor: cleanValue(formData.get("primaryColor")) || defaultBrandState.brand.primaryColor,
    secondaryColor: cleanValue(formData.get("secondaryColor")) || defaultBrandState.brand.secondaryColor,
    accentColor: cleanValue(formData.get("accentColor")) || defaultBrandState.brand.accentColor,
    backgroundColor: cleanValue(formData.get("backgroundColor")) || defaultBrandState.brand.backgroundColor,
    typography: cleanValue(formData.get("typography")),
    logoRule: cleanValue(formData.get("logoRule")),
    compositionRules: cleanValue(formData.get("compositionRules")),
    negativeRules: cleanValue(formData.get("negativeRules")),
    ...previousReference
  };
  persistBrandStudioState();
  renderBrandStudio();
  if (!options.silent) {
    hydrateBrandForm();
  }
}

async function handleReferenceImage(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  if (file.size > BRAND_REFERENCE_MAX_BYTES) {
    announce("La referencia supera 1.25 MB. Usa una imagen mas liviana.");
    event.target.value = "";
    return;
  }

  const dataUrl = await fileToDataUrl(file);
  brandStudioState.brand.referenceImageName = file.name;
  brandStudioState.brand.referenceImageDataUrl = dataUrl;
  persistBrandStudioState();
  renderBrandStudio();
}

async function handleSourceFiles(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const saved = [];
  for (const file of files) {
    if (file.size > BRAND_TEXT_FILE_MAX_BYTES) {
      saved.push(`${file.name} omitido por superar 25 MB`);
      continue;
    }
    const content = await readTextFile(file);
    await saveMemoryDocument({
      id: buildId("doc"),
      name: file.name,
      type: file.type || inferTextMime(file.name),
      size: file.size,
      source: "file",
      createdAt: new Date().toISOString(),
      content
    });
    saved.push(file.name);
  }
  event.target.value = "";
  await refreshMemoryDocuments();
  sourceFileStatus.textContent = saved.length ? `Procesado: ${saved.join(", ")}` : "Sin archivos cargados.";
  announce("Memoria actualizada.");
}

async function saveSourceTextToMemory() {
  const content = cleanValue(sourceTextInput?.value);
  if (!content) {
    announce("No hay texto para guardar.");
    return;
  }
  await saveMemoryDocument({
    id: buildId("txt"),
    name: `Texto manual ${formatDate(new Date().toISOString())}`,
    type: "text/plain",
    size: content.length,
    source: "manual",
    createdAt: new Date().toISOString(),
    content
  });
  sourceTextInput.value = "";
  await refreshMemoryDocuments();
  announce("Texto guardado en memoria.");
}

async function clearMemoryDocuments() {
  await clearMemoryStore();
  memoryDocuments = [];
  renderBrandStudio();
  announce("Memoria limpiada.");
}

async function refreshMemoryDocuments() {
  try {
    memoryDocuments = await getAllMemoryDocuments();
  } catch {
    memoryDocuments = [];
    announce("No se pudo abrir la memoria amplia. El resto de la app sigue disponible.");
  }
  renderMemoryList();
  renderSummary(brandStudioState.brand);
}

function renderBrandStudio() {
  const brand = brandStudioState.brand;
  renderPreview(brand);
  renderSummary(brand);
  renderRecommendation();
  renderAnalysis();
  renderCampaigns();
  renderMasterPrompt();
  renderPromptBank();
  renderMemoryList();
  renderBrandJson();
}

function renderPreview(brand) {
  const preview = document.querySelector("[data-preview-stage]");
  if (!preview) return;

  preview.style.setProperty("--preview-primary", brand.primaryColor);
  preview.style.setProperty("--preview-secondary", brand.secondaryColor);
  preview.style.setProperty("--preview-accent", brand.accentColor);
  preview.style.setProperty("--preview-background", brand.backgroundColor);

  setText("[data-preview-brand]", brand.brandName);
  setText("[data-preview-personality]", brand.personality);
  setText("[data-preview-title]", buildPreviewTitle(brand));
  setText("[data-preview-copy]", brand.visualPromise);
  setText("[data-preview-kicker]", brand.industry || "Sistema visual");

  setToken("[data-token-primary]", brand.primaryColor);
  setToken("[data-token-secondary]", brand.secondaryColor);
  setToken("[data-token-accent]", brand.accentColor);
  setToken("[data-token-background]", brand.backgroundColor);

  if (referencePreview) {
    referencePreview.hidden = !brand.referenceImageDataUrl;
    referencePreview.src = brand.referenceImageDataUrl || "";
  }
  const logo = document.querySelector("[data-preview-logo]");
  if (logo) {
    logo.hidden = normalizeText(brand.logoRule).startsWith("sin logo");
  }
  if (referenceName) {
    referenceName.textContent = brand.referenceImageName || "Sin imagen cargada";
  }
}

function renderSummary(brand) {
  setText("[data-brand-summary-name]", brand.brandName);
  setText("[data-brand-summary-code]", `Codigo de marca: ${brand.brandCode}`);
  setText("[data-prompt-count]", String(brandStudioState.prompts.length));
  setText("[data-consistency-score]", `${computeConsistencyScore(brand)}%`);
  setText("[data-memory-count]", String(memoryDocuments.length));
  setText("[data-memory-size]", memoryDocuments.length ? `${formatBytes(memoryDocuments.reduce((sum, item) => sum + Number(item.size || 0), 0))} en memoria local.` : "Sin archivos cargados.");
}

function renderRecommendation() {
  if (!recommendationPanel) return;
  const recommendation = buildRecommendation();
  recommendationPanel.innerHTML = `
    <article class="record-card">
      <strong>Sector recomendado: ${escapeHtml(recommendation.sector.label)}</strong>
      <p>${escapeHtml(recommendation.sector.recommendation)}</p>
      <div class="badge-row">
        <span class="badge">Score ${recommendation.sectorScore}</span>
        <span class="badge warning">${escapeHtml(recommendation.sector.value)}</span>
      </div>
    </article>
    <article class="record-card">
      <strong>Objetivo recomendado: ${escapeHtml(recommendation.objective.label)}</strong>
      <p>${escapeHtml(recommendation.objective.recommendation)}</p>
      <div class="badge-row">
        <span class="badge">Score ${recommendation.objectiveScore}</span>
        <span class="badge warning">${escapeHtml(recommendation.objective.value)}</span>
      </div>
    </article>
    <article class="record-card">
      <strong>Prioridad sugerida</strong>
      <p>${escapeHtml(recommendation.priority)}</p>
    </article>
  `;
}

function renderAnalysis() {
  if (!analysisOutput) return;
  const analysis = brandStudioState.analysis;
  if (!analysis) {
    analysisOutput.innerHTML = `
      <article class="record-card empty-state">
        <strong>Sin analisis todavia.</strong>
        <p>Carga datos de empresa, agrega memoria y ejecuta el analisis para obtener diagnostico y recomendaciones.</p>
      </article>
    `;
    return;
  }

  analysisOutput.innerHTML = `
    <section class="stats-row brand-score-row">
      ${analysis.scores.map((score) => `
        <article class="panel stat-card">
          <span>${escapeHtml(score.label)}</span>
          <strong>${score.value}</strong>
          <small>${escapeHtml(score.note)}</small>
        </article>
      `).join("")}
    </section>
    <section class="content-grid brand-analysis-grid">
      <article class="record-card">
        <strong>Diagnostico ejecutivo</strong>
        <p>${escapeHtml(analysis.executiveSummary)}</p>
      </article>
      <article class="record-card">
        <strong>Identidad de marca</strong>
        <p>${escapeHtml(analysis.identitySummary)}</p>
        <div class="badge-row">
          <span class="badge${analysis.identityNeeded ? " warning" : " success"}">${analysis.identityNeeded ? "Construir identidad" : "Identidad utilizable"}</span>
        </div>
      </article>
      ${renderAnalysisListCard("Fortalezas", analysis.strengths)}
      ${renderAnalysisListCard("Riesgos", analysis.risks)}
      ${renderAnalysisListCard("Oportunidades", analysis.opportunities)}
      ${renderAnalysisListCard("Datos faltantes", analysis.missing)}
    </section>
  `;
}

function renderAnalysisListCard(title, items) {
  return `
    <article class="record-card">
      <strong>${escapeHtml(title)}</strong>
      <ul class="brand-plain-list">
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </article>
  `;
}

function renderCampaigns() {
  if (!campaignOutput) return;
  const campaigns = brandStudioState.campaigns || [];
  if (!campaigns.length) {
    campaignOutput.innerHTML = `
      <article class="record-card empty-state full-width">
        <strong>No hay campanas generadas.</strong>
        <p>Ejecuta el analisis y luego crea dos campanas optimizadas. Cada una tendra texto, hashtags, brief visual e imagen SVG.</p>
      </article>
    `;
    return;
  }

  campaignOutput.innerHTML = campaigns.map((campaign, index) => `
    <article class="record-card brand-campaign-card">
      <div>
        <p class="eyebrow">Opcion ${index + 1}</p>
        <strong>${escapeHtml(campaign.name)}</strong>
        <p>${escapeHtml(campaign.strategy)}</p>
      </div>
      <img class="brand-campaign-image" src="${svgToDataUrl(campaign.imageSvg)}" alt="Imagen generada para ${escapeHtml(campaign.name)}">
      <div class="data-grid">
        <span><strong>Objetivo</strong>${escapeHtml(getObjectiveLabel(campaign.objective))}</span>
        <span><strong>Sector</strong>${escapeHtml(getSectorLabel(campaign.sector))}</span>
        <span><strong>Funnel</strong>${escapeHtml(campaign.funnel)}</span>
        <span><strong>KPI</strong>${escapeHtml(campaign.kpis.join(", "))}</span>
      </div>
      <textarea readonly rows="8">${escapeHtml(buildCampaignTextFile(campaign))}</textarea>
      <div class="brand-inline-actions">
        <button type="button" class="button button-secondary" data-campaign-action="copy-text" data-campaign-id="${escapeHtml(campaign.id)}">Copiar texto</button>
        <button type="button" class="button button-secondary" data-campaign-action="copy-brief" data-campaign-id="${escapeHtml(campaign.id)}">Copiar brief imagen</button>
        <button type="button" class="button button-ghost" data-campaign-action="download-svg" data-campaign-id="${escapeHtml(campaign.id)}">Descargar imagen</button>
      </div>
    </article>
  `).join("");
}

function renderMasterPrompt() {
  if (masterPromptOutput) {
    masterPromptOutput.value = buildMasterPrompt();
  }
}

function renderPromptBank() {
  if (!promptBank) return;
  if (!brandStudioState.prompts.length) {
    const template = document.querySelector("#emptyPromptTemplate");
    promptBank.replaceChildren(template.content.firstElementChild.cloneNode(true));
    return;
  }

  promptBank.innerHTML = brandStudioState.prompts.map((item) => `
    <article class="record-card brand-prompt-card">
      <strong>${escapeHtml(item.name)}</strong>
      <p>${escapeHtml(item.channel)} | ${escapeHtml(item.format)} | ${escapeHtml(formatDate(item.createdAt))}</p>
      <div class="badge-row">
        <span class="badge">${escapeHtml(item.brandCode)}</span>
        <span class="badge warning">${escapeHtml(item.imageType)}</span>
      </div>
      <textarea readonly rows="8">${escapeHtml(item.prompt)}</textarea>
      <div class="brand-inline-actions">
        <button type="button" class="button button-secondary" data-prompt-action="copy" data-prompt-id="${escapeHtml(item.id)}">Copiar prompt</button>
        <button type="button" class="button button-ghost" data-prompt-action="delete" data-prompt-id="${escapeHtml(item.id)}">Eliminar</button>
      </div>
    </article>
  `).join("");
}

function renderMemoryList() {
  if (!memoryList) return;
  if (!memoryDocuments.length) {
    memoryList.innerHTML = `
      <article class="record-card empty-state">
        <strong>Memoria vacia.</strong>
        <p>Agrega textos o archivos para que el analisis tenga mas contexto.</p>
      </article>
    `;
    return;
  }

  memoryList.innerHTML = memoryDocuments.slice(0, 12).map((doc) => `
    <article class="record-card brand-memory-card">
      <strong>${escapeHtml(doc.name)}</strong>
      <p>${escapeHtml(doc.source)} | ${escapeHtml(formatBytes(doc.size || doc.content?.length || 0))} | ${escapeHtml(formatDate(doc.createdAt))}</p>
    </article>
  `).join("");
}

function renderBrandJson() {
  if (!brandJsonOutput) return;
  brandJsonOutput.value = JSON.stringify({
    ...brandStudioState,
    memory: memoryDocuments.map(({ content, ...meta }) => meta)
  }, null, 2);
}

function runCompanyAnalysis() {
  saveCompanyFromForm({ silent: true });
  saveBriefFromForm({ silent: true });
  saveBrandFromForm({ silent: true });
  brandStudioState.analysis = buildCompanyAnalysis();
  persistBrandStudioState();
  renderBrandStudio();
}

function buildCompanyAnalysis() {
  const company = brandStudioState.company;
  const brand = brandStudioState.brand;
  const recommendation = buildRecommendation();
  const corpus = buildCompanyCorpus();
  const sparse = isCompanySparse();
  const hasAudience = cleanValue(company.audience).length > 25;
  const hasOffer = cleanValue(company.offer).length > 25;
  const hasProof = cleanValue(company.differentiators).length > 25 || containsAny(corpus, ["caso", "resultado", "certificacion", "anos", "clientes", "testimonio"]);
  const hasBrand = computeConsistencyScore(brand) >= 78 && !sparse;
  const hasChannels = cleanValue(company.channels).length > 6 || containsAny(corpus, ["linkedin", "instagram", "whatsapp", "web"]);

  const scores = [
    { label: "Claridad", value: scoreFromBooleans([hasOffer, hasAudience, cleanValue(company.currentSituation).length > 20]), note: "Oferta, publico y situacion." },
    { label: "Diferencial", value: scoreFromBooleans([hasProof, cleanValue(company.differentiators).length > 35, cleanValue(company.competitors).length > 8]), note: "Pruebas y contraste competitivo." },
    { label: "Marca", value: computeConsistencyScore(brand), note: "Base visual y verbal." },
    { label: "Memoria", value: Math.min(100, Math.round((buildMemoryCorpus().length / 45000) * 100)), note: "Contexto cargado." },
    { label: "Activacion", value: scoreFromBooleans([hasChannels, cleanValue(brandStudioState.brief.mainOffer).length > 5, cleanValue(brandStudioState.brief.campaignName).length > 5]), note: "Canales, oferta y nombre de campana." }
  ];

  const strengths = [
    hasOffer ? "Existe una descripcion de oferta utilizable para construir mensajes comerciales." : "",
    hasAudience ? "El cliente ideal esta lo bastante definido para segmentar el mensaje." : "",
    hasProof ? "Hay indicios de diferenciales o pruebas que pueden transformarse en autoridad." : "",
    memoryDocuments.length ? `La memoria local tiene ${memoryDocuments.length} fuente(s) para enriquecer el analisis.` : ""
  ].filter(Boolean);

  const risks = [
    !hasOffer ? "La oferta todavia no esta clara; la campana podria quedar generica." : "",
    !hasAudience ? "Falta precisar decisor, industria o dolor del cliente ideal." : "",
    !hasProof ? "Faltan pruebas concretas: resultados, casos, certificaciones, experiencia o testimonios." : "",
    !hasBrand ? "La identidad necesita una base mas completa antes de producir muchas piezas." : "",
    sparse ? "La empresa tiene muy poca informacion; conviene construir identidad inicial antes de pautar." : ""
  ].filter(Boolean);

  const opportunities = [
    `Sector sugerido: ${recommendation.sector.label}. ${recommendation.sector.recommendation}`,
    `Objetivo sugerido: ${recommendation.objective.label}. ${recommendation.objective.recommendation}`,
    buildOpportunityByObjective(recommendation.objective.value),
    buildOpportunityBySector(recommendation.sector.value)
  ].filter(Boolean);

  const missing = [
    !company.companyName ? "Nombre de empresa." : "",
    !company.offer ? "Descripcion clara de producto o servicio." : "",
    !company.audience ? "Cliente ideal y decisor." : "",
    !company.differentiators ? "Diferenciales verificables." : "",
    !company.channels ? "Canales actuales y canal prioritario." : "",
    !brandStudioState.brief.mainOffer ? "Oferta principal o CTA de campana." : ""
  ].filter(Boolean);

  return {
    generatedAt: new Date().toISOString(),
    sector: recommendation.sector.value,
    objective: recommendation.objective.value,
    executiveSummary: sparse
      ? "La empresa esta en fase inicial o con informacion incompleta. La prioridad es construir una identidad minima viable, definir oferta, publico y prueba antes de escalar campanas."
      : `La empresa puede activar una campana orientada a ${recommendation.objective.label.toLowerCase()} en ${recommendation.sector.label.toLowerCase()}, con foco en claridad comercial, prueba y consistencia visual.`,
    identityNeeded: sparse || !hasBrand,
    identitySummary: sparse || !hasBrand
      ? "Conviene generar identidad base: promesa visual, tono, paleta, reglas de composicion y restricciones. El sistema puede construir una version inicial usando el diagnostico."
      : "La identidad base es suficiente para producir piezas consistentes. Se recomienda mantener el prompt maestro como fuente de verdad.",
    scores,
    strengths: strengths.length ? strengths : ["La base todavia es limitada, pero suficiente para iniciar una identidad minima."],
    risks: risks.length ? risks : ["No se detectan riesgos criticos con la informacion actual."],
    opportunities,
    missing: missing.length ? missing : ["No hay datos criticos faltantes para una primera campana."]
  };
}

function buildRecommendation() {
  const corpus = normalizeText(buildCompanyCorpus());
  const sectorScores = sectorOptions.map((option) => ({
    option,
    score: scoreKeywords(corpus, option.keywords)
  })).sort((a, b) => b.score - a.score);
  const objectiveScores = objectiveOptions.map((option) => ({
    option,
    score: scoreKeywords(corpus, option.keywords)
  })).sort((a, b) => b.score - a.score);

  const selectedSector = sectorOptions.find((item) => item.value === brandStudioState.brief.sector);
  const selectedObjective = objectiveOptions.find((item) => item.value === brandStudioState.brief.objective);
  const sector = selectedSector || sectorScores[0]?.option || sectorOptions[1];
  const objective = selectedObjective || inferObjective(objectiveScores[0]?.option);

  return {
    sector,
    objective,
    sectorScore: selectedSector ? "manual" : String(sectorScores[0]?.score || 0),
    objectiveScore: selectedObjective ? "manual" : String(objectiveScores[0]?.score || 0),
    priority: isCompanySparse()
      ? "Primero construir identidad minima viable y luego lanzar una campana simple de reconocimiento o leads."
      : `Crear dos rutas: una de autoridad/confianza y otra de conversion para ${objective.label.toLowerCase()}.`
  };
}

function inferObjective(topObjective) {
  if (isCompanySparse()) return objectiveOptions.find((item) => item.value === "rebranding");
  return topObjective || objectiveOptions.find((item) => item.value === "generar_leads");
}

function generateOptimizedCampaigns() {
  saveCompanyFromForm({ silent: true });
  saveBriefFromForm({ silent: true });
  saveBrandFromForm({ silent: true });
  if (!brandStudioState.analysis) {
    brandStudioState.analysis = buildCompanyAnalysis();
  }

  const recommendation = buildRecommendation();
  const sector = brandStudioState.brief.sector || recommendation.sector.value;
  const objective = brandStudioState.brief.objective || recommendation.objective.value;
  const packageName = getCampaignPackageName(objective);
  const companyName = getCompanyDisplayName();
  const base = {
    sector,
    objective,
    packageName,
    companyName,
    createdAt: new Date().toISOString()
  };

  const campaigns = [
    buildCampaignOption({
      ...base,
      variant: "autoridad",
      name: `${packageName} - Ruta autoridad`,
      strategy: buildAuthorityStrategy(sector, objective),
      angle: "confianza, criterio experto y prueba operativa",
      funnel: "Atraccion + consideracion"
    }),
    buildCampaignOption({
      ...base,
      variant: "conversion",
      name: `${packageName} - Ruta conversion`,
      strategy: buildConversionStrategy(sector, objective),
      angle: "dolor concreto, oferta clara y accion medible",
      funnel: "Consideracion + conversion"
    })
  ];

  brandStudioState.brief.campaignName = packageName;
  brandStudioState.campaigns = campaigns;
  persistBrandStudioState();
  hydrateBriefForm();
  renderBrandStudio();
}

function buildCampaignOption(config) {
  const brand = brandStudioState.brand;
  const company = brandStudioState.company;
  const objectiveLabel = getObjectiveLabel(config.objective);
  const sectorLabel = getSectorLabel(config.sector);
  const offer = cleanValue(brandStudioState.brief.mainOffer) || inferOfferByObjective(config.objective);
  const audience = cleanValue(company.audience) || inferAudienceBySector(config.sector);
  const message = config.variant === "autoridad"
    ? `Cuando ${audience} necesita decidir sin perder control, ${config.companyName} aporta claridad, proceso y respuesta profesional.`
    : `Si ${audience} necesita resolverlo ahora, ${config.companyName} convierte el problema en una accion concreta: ${offer}.`;
  const headline = config.variant === "autoridad"
    ? buildHeadline(config.companyName, config.sector, "autoridad")
    : buildHeadline(config.companyName, config.sector, "conversion");
  const cta = buildCta(config.objective, offer);
  const hashtags = buildHashtags(config.sector, config.objective, brand, company);
  const imageBrief = buildCampaignImageBrief(config, headline, message);
  const campaign = {
    id: buildId("cmp"),
    packageName: config.packageName,
    name: config.name,
    variant: config.variant,
    sector: config.sector,
    objective: config.objective,
    strategy: config.strategy,
    angle: config.angle,
    funnel: config.funnel,
    audience,
    offer,
    headline,
    message,
    cta,
    channels: buildChannels(),
    kpis: buildKpis(config.objective),
    hashtags,
    imageBrief,
    createdAt: config.createdAt
  };
  campaign.imageSvg = buildCampaignSvg(campaign);
  return campaign;
}

function buildCampaignTextFile(campaign) {
  return [
    `# ${campaign.name}`,
    "",
    `Objetivo: ${getObjectiveLabel(campaign.objective)}`,
    `Sector: ${getSectorLabel(campaign.sector)}`,
    `Estrategia: ${campaign.strategy}`,
    `Audiencia: ${campaign.audience}`,
    `Oferta / CTA: ${campaign.offer}`,
    "",
    "## Texto principal",
    campaign.headline,
    "",
    campaign.message,
    "",
    campaign.cta,
    "",
    "## Hashtags",
    campaign.hashtags.join(" "),
    "",
    "## Brief visual",
    campaign.imageBrief,
    "",
    "## KPI",
    campaign.kpis.join(", ")
  ].join("\n");
}

function buildCampaignImageBrief(config, headline, message) {
  return [
    buildMasterPrompt(),
    "",
    `Imagen para campana: ${config.name}.`,
    `Ruta creativa: ${config.variant}.`,
    `Mensaje visual: ${headline}. ${message}`,
    `Sector: ${getSectorLabel(config.sector)}. Objetivo: ${getObjectiveLabel(config.objective)}.`,
    "Crear una pieza premium B2B, con composicion clara, fondo controlado, contraste limpio, senales visuales del sector, espacio para titular y CTA, sin ruido visual."
  ].join("\n");
}

function buildCampaignSvg(campaign) {
  const brand = brandStudioState.brand;
  const width = 1080;
  const height = 1350;
  const title = splitForSvg(campaign.headline, 24, 4);
  const message = splitForSvg(campaign.message, 48, 4);
  const tags = campaign.hashtags.slice(0, 3).join("  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${escapeXml(brand.backgroundColor)}"/>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${escapeXml(brand.primaryColor)}"/>
      <stop offset="64%" stop-color="${escapeXml(brand.primaryColor)}"/>
      <stop offset="100%" stop-color="${escapeXml(brand.secondaryColor)}"/>
    </linearGradient>
    <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse">
      <path d="M 54 0 L 0 0 0 54" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grid)" opacity="0.8"/>
  <circle cx="900" cy="210" r="180" fill="${escapeXml(brand.accentColor)}" opacity="0.22"/>
  <circle cx="160" cy="1120" r="220" fill="${escapeXml(brand.secondaryColor)}" opacity="0.18"/>
  <rect x="72" y="72" width="936" height="1206" rx="34" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
  <text x="110" y="150" fill="rgba(255,255,255,0.78)" font-family="Montserrat, Segoe UI, Arial" font-size="28" font-weight="700" letter-spacing="4">${escapeXml(getSectorLabel(campaign.sector).toUpperCase())}</text>
  ${title.map((line, index) => `<text x="110" y="${280 + index * 88}" fill="#ffffff" font-family="Montserrat, Segoe UI, Arial" font-size="76" font-weight="700">${escapeXml(line)}</text>`).join("")}
  <rect x="110" y="665" width="820" height="4" rx="2" fill="${escapeXml(brand.accentColor)}"/>
  ${message.map((line, index) => `<text x="110" y="${750 + index * 46}" fill="rgba(255,255,255,0.86)" font-family="Montserrat, Segoe UI, Arial" font-size="34" font-weight="600">${escapeXml(line)}</text>`).join("")}
  <g transform="translate(110 990)">
    <rect width="500" height="88" rx="24" fill="${escapeXml(brand.accentColor)}"/>
    <text x="32" y="56" fill="#ffffff" font-family="Montserrat, Segoe UI, Arial" font-size="30" font-weight="700">${escapeXml(campaign.cta.slice(0, 34))}</text>
  </g>
  <text x="110" y="1160" fill="rgba(255,255,255,0.72)" font-family="Montserrat, Segoe UI, Arial" font-size="26" font-weight="700">${escapeXml(tags)}</text>
  <g transform="translate(720 1140)">
    <rect width="240" height="78" rx="18" fill="rgba(255,255,255,0.92)"/>
    <text x="24" y="50" fill="${escapeXml(brand.primaryColor)}" font-family="Montserrat, Segoe UI, Arial" font-size="30" font-weight="700">${escapeXml(brand.brandName.slice(0, 16))}</text>
  </g>
</svg>`;
}

async function exportCampaignPackage() {
  if (!brandStudioState.campaigns.length) {
    generateOptimizedCampaigns();
  }
  const packageName = getCampaignPackageName(brandStudioState.analysis?.objective || brandStudioState.brief.objective || "campana");
  const folderName = slugify(packageName);
  const fileMap = buildCampaignFileMap(packageName);

  if (window.showDirectoryPicker) {
    try {
      const root = await window.showDirectoryPicker({ mode: "readwrite" });
      const campaignDir = await root.getDirectoryHandle(folderName, { create: true });
      for (const file of fileMap) {
        await writeNestedFile(campaignDir, file.path, file.content);
      }
      announce(`Estructura exportada en ${folderName}.`);
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  downloadFile(`${folderName}-estructura.json`, JSON.stringify({
    note: "Tu navegador no permitio crear carpetas directamente. Este JSON contiene la estructura y contenido de archivos.",
    packageName,
    files: fileMap
  }, null, 2), "application/json");
  announce("Estructura exportada como JSON.");
}

function buildCampaignFileMap(packageName) {
  const analysis = brandStudioState.analysis || buildCompanyAnalysis();
  const campaigns = brandStudioState.campaigns.length ? brandStudioState.campaigns : [];
  const files = [
    {
      path: [`${slugify(packageName)}_archivo_madre.json`],
      content: JSON.stringify({
        campaignName: packageName,
        generatedAt: new Date().toISOString(),
        company: brandStudioState.company,
        brief: brandStudioState.brief,
        brand: brandStudioState.brand,
        analysis,
        campaigns: campaigns.map(({ imageSvg, ...campaign }) => campaign),
        memory: memoryDocuments.map(({ content, ...meta }) => meta)
      }, null, 2)
    },
    {
      path: ["00_analisis", "analisis_empresa.md"],
      content: buildAnalysisMarkdown(analysis)
    }
  ];

  campaigns.forEach((campaign, index) => {
    const folder = `${String(index + 1).padStart(2, "0")}_${slugify(campaign.name)}`;
    files.push({
      path: [folder, "texto", "copy_hashtags.md"],
      content: buildCampaignTextFile(campaign)
    });
    files.push({
      path: [folder, "imagen", `${slugify(campaign.name)}.svg`],
      content: campaign.imageSvg
    });
    files.push({
      path: [folder, "imagen", "brief_imagen.txt"],
      content: campaign.imageBrief
    });
  });

  return files;
}

async function writeNestedFile(rootHandle, pathParts, content) {
  let dir = rootHandle;
  for (const part of pathParts.slice(0, -1)) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  const fileHandle = await dir.getFileHandle(pathParts[pathParts.length - 1], { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

function buildAnalysisMarkdown(analysis) {
  return [
    "# Analisis de empresa",
    "",
    `Generado: ${formatDate(analysis.generatedAt)}`,
    "",
    "## Diagnostico ejecutivo",
    analysis.executiveSummary,
    "",
    "## Identidad",
    analysis.identitySummary,
    "",
    "## Scores",
    ...analysis.scores.map((score) => `- ${score.label}: ${score.value}/100 - ${score.note}`),
    "",
    "## Fortalezas",
    ...analysis.strengths.map((item) => `- ${item}`),
    "",
    "## Riesgos",
    ...analysis.risks.map((item) => `- ${item}`),
    "",
    "## Oportunidades",
    ...analysis.opportunities.map((item) => `- ${item}`),
    "",
    "## Datos faltantes",
    ...analysis.missing.map((item) => `- ${item}`)
  ].join("\n");
}

function buildIdentityFromAnalysis() {
  saveCompanyFromForm({ silent: true });
  saveBriefFromForm({ silent: true });
  const recommendation = buildRecommendation();
  const companyName = getCompanyDisplayName();
  const sectorLabel = recommendation.sector.label;
  const sparse = isCompanySparse();
  brandStudioState.brand = {
    ...brandStudioState.brand,
    brandName: companyName,
    brandCode: buildBrandCode(companyName),
    industry: sectorLabel,
    personality: sparse
      ? "clara, confiable, moderna, comercial y facil de reconocer"
      : "premium, confiable, directa, ordenada y orientada a resultados",
    visualPromise: sparse
      ? `Construir una primera percepcion profesional para ${companyName}, explicando que hace, para quien y por que confiar.`
      : `Convertir la propuesta de ${companyName} en una presencia visual coherente, confiable y facil de recordar.`,
    typography: "Montserrat, Inter o Segoe UI, con titulares firmes y textos cortos",
    logoRule: "logo visible en esquina inferior derecha, limpio y sin deformar",
    compositionRules: buildCompositionRules(recommendation.sector.value),
    negativeRules: "Evitar mensajes genericos, exceso de efectos, baja legibilidad, colores fuera de paleta, promesas vacias y piezas sin CTA claro."
  };
  persistBrandStudioState();
  hydrateBrandForm();
  renderBrandStudio();
}

function buildMasterPrompt() {
  const brand = brandStudioState.brand;
  return [
    `IDENTIDAD DE MARCA FIJA: ${brand.brandName} (${brand.brandCode}).`,
    `Industria: ${brand.industry}.`,
    `Personalidad: ${brand.personality}.`,
    `Promesa visual: ${brand.visualPromise}.`,
    `Paleta exacta: primario ${brand.primaryColor}, secundario ${brand.secondaryColor}, acento ${brand.accentColor}, fondo ${brand.backgroundColor}.`,
    `Tipografia sugerida si hay texto editable: ${brand.typography}.`,
    `Regla de logo: ${brand.logoRule}.`,
    `Composicion: ${brand.compositionRules}.`,
    `Restricciones negativas: ${brand.negativeRules}.`,
    brand.referenceImageName ? `Referencia visual local: ${brand.referenceImageName}. Usarla como guia de estilo si el generador permite imagen de referencia.` : "Sin imagen de referencia adjunta.",
    "Mantener siempre la misma direccion de arte, jerarquia visual, criterio de color, nivel de realismo y tono premium entre todas las piezas."
  ].filter(Boolean).join("\n");
}

function buildPromptFromPiece(formData) {
  const brand = brandStudioState.brand;
  const pieceName = cleanValue(formData.get("pieceName")) || "Pieza de marca";
  const format = cleanValue(formData.get("format"));
  const channel = cleanValue(formData.get("channel"));
  const imageType = cleanValue(formData.get("imageType"));
  const topic = cleanValue(formData.get("topic"));
  const message = cleanValue(formData.get("message"));

  return {
    id: buildId("prompt"),
    name: pieceName,
    format,
    channel,
    imageType,
    brandCode: brand.brandCode,
    createdAt: new Date().toISOString(),
    prompt: [
      buildMasterPrompt(),
      "",
      `PIEZA A CREAR: ${pieceName}.`,
      `Canal: ${channel}.`,
      `Formato: ${format}.`,
      `Tipo de imagen: ${imageType}.`,
      `Tema principal: ${topic}.`,
      message ? `Mensaje comercial a transmitir: ${message}.` : "",
      "Crear una imagen final lista para uso comercial, con composicion limpia, sin saturacion visual, sin texto pequeno ilegible y con identidad de marca consistente con el prompt maestro.",
      "Si incluyes texto dentro de la imagen, que sea minimo, claro, de alta legibilidad y alineado al tono de la marca."
    ].filter(Boolean).join("\n")
  };
}

function generatePromptPack() {
  saveBrandFromForm({ silent: true });
  const brand = brandStudioState.brand;
  const pack = [
    {
      pieceName: "Post de confianza operativa",
      format: "4:5, pieza vertical para feed",
      channel: "LinkedIn",
      imageType: "foto realista corporativa con direccion de arte premium",
      topic: "equipo revisando tablero de operaciones y trazabilidad en una interfaz limpia",
      message: "control y visibilidad para operaciones empresariales"
    },
    {
      pieceName: "Banner de seguimiento",
      format: "16:9, banner horizontal",
      channel: "Web",
      imageType: "composicion editorial con datos visuales",
      topic: `${brand.industry} con puntos de control, tablero ejecutivo y senales de eficiencia`,
      message: "seguimiento claro desde el primer contacto hasta el resultado"
    },
    {
      pieceName: "Historia comercial",
      format: "9:16, historia o reel vertical",
      channel: "Instagram",
      imageType: "render 3D limpio de operacion logistica",
      topic: "escena premium con velocidad, orden, servicio y tecnologia",
      message: "respuesta rapida para clientes que necesitan resolver"
    },
    {
      pieceName: "Folleto de servicio",
      format: "A4 vertical, folleto comercial",
      channel: "Presentacion comercial",
      imageType: "mockup comercial de servicio B2B",
      topic: `${brand.industry} con foco en proceso, diferenciacion y decision de compra`,
      message: "una marca preparada para vender y operar mejor"
    }
  ];

  brandStudioState.prompts = pack.map((item) => buildPromptFromPiece(new Map(Object.entries(item)))).concat(brandStudioState.prompts);
  persistBrandStudioState();
  renderBrandStudio();
  announce("Pack de 4 prompts generado.");
}

function exportBrandKit() {
  saveBrandFromForm({ silent: true });
  const blob = new Blob([JSON.stringify({
    ...brandStudioState,
    memory: memoryDocuments.map(({ content, ...meta }) => meta)
  }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(brandStudioState.brand.brandName)}-campaign-kit.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function importBrandKit(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    brandStudioState = normalizeBrandStudioState(parsed);
    persistBrandStudioState();
    hydrateCompanyForm();
    hydrateBriefForm();
    hydrateBrandForm();
    renderBrandStudio();
    announce("Kit importado.");
  } catch {
    announce("No se pudo importar el kit. Revisa que sea un JSON valido.");
  } finally {
    event.target.value = "";
  }
}

function resetBrandBase() {
  brandStudioState.brand = { ...defaultBrandState.brand };
  persistBrandStudioState();
  hydrateBrandForm();
  renderBrandStudio();
  announce("Diseno base restaurado.");
}

function clearPromptBank() {
  brandStudioState.prompts = [];
  persistBrandStudioState();
  renderBrandStudio();
  announce("Banco de prompts limpiado.");
}

function loadBrandStudioState() {
  try {
    const raw = localStorage.getItem(BRAND_STUDIO_STORAGE_KEY) || localStorage.getItem("joathiva-brand-studio-v1");
    if (!raw) return cloneDefaultBrandState();
    return normalizeBrandStudioState(JSON.parse(raw));
  } catch {
    return cloneDefaultBrandState();
  }
}

function persistBrandStudioState() {
  localStorage.setItem(BRAND_STUDIO_STORAGE_KEY, JSON.stringify(brandStudioState));
}

function normalizeBrandStudioState(value) {
  return {
    brand: {
      ...defaultBrandState.brand,
      ...((value && typeof value.brand === "object") ? value.brand : {})
    },
    company: {
      ...defaultBrandState.company,
      ...((value && typeof value.company === "object") ? value.company : {})
    },
    brief: {
      ...defaultBrandState.brief,
      ...((value && typeof value.brief === "object") ? value.brief : {})
    },
    analysis: value?.analysis || null,
    campaigns: Array.isArray(value?.campaigns) ? value.campaigns.filter((item) => item && item.name).slice(0, 12) : [],
    prompts: Array.isArray(value?.prompts) ? value.prompts.filter((item) => item && item.prompt).slice(0, 80) : []
  };
}

function cloneDefaultBrandState() {
  return JSON.parse(JSON.stringify(defaultBrandState));
}

function openMemoryDb() {
  if (brandMemoryDbPromise) return brandMemoryDbPromise;
  brandMemoryDbPromise = new Promise((resolve, reject) => {
    const databaseApi = window.indexedDB;
    if (!databaseApi) {
      reject(new Error("IndexedDB no disponible."));
      return;
    }
    const request = databaseApi.open(BRAND_MEMORY_DB_NAME, BRAND_MEMORY_DB_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BRAND_MEMORY_STORE)) {
        db.createObjectStore(BRAND_MEMORY_STORE, { keyPath: "id" });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
  return brandMemoryDbPromise;
}

async function saveMemoryDocument(documentRecord) {
  const db = await openMemoryDb();
  await runStoreRequest(db, "readwrite", (store) => store.put(documentRecord));
}

async function getAllMemoryDocuments() {
  if (!window.indexedDB) return [];
  const db = await openMemoryDb();
  return await runStoreRequest(db, "readonly", (store) => store.getAll());
}

async function clearMemoryStore() {
  const db = await openMemoryDb();
  await runStoreRequest(db, "readwrite", (store) => store.clear());
}

function runStoreRequest(db, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(BRAND_MEMORY_STORE, mode);
    const store = transaction.objectStore(BRAND_MEMORY_STORE);
    const request = operation(store);
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
    transaction.addEventListener("error", () => reject(transaction.error));
  });
}

function buildCompanyCorpus() {
  return [
    Object.values(brandStudioState.company || {}).join("\n"),
    Object.values(brandStudioState.brief || {}).join("\n"),
    Object.values(brandStudioState.brand || {}).filter((value) => typeof value === "string").join("\n"),
    buildMemoryCorpus()
  ].join("\n").slice(0, BRAND_ANALYSIS_MAX_CHARS);
}

function buildMemoryCorpus() {
  return memoryDocuments.map((doc) => doc.content || "").join("\n\n").slice(0, BRAND_ANALYSIS_MAX_CHARS);
}

function isCompanySparse() {
  const companyText = Object.values(brandStudioState.company || {}).join(" ");
  return cleanValue(companyText).length < 160 && memoryDocuments.length === 0;
}

function scoreKeywords(corpus, keywords) {
  return keywords.reduce((score, keyword) => score + (corpus.includes(normalizeText(keyword)) ? 1 : 0), 0);
}

function scoreFromBooleans(items) {
  return Math.round((items.filter(Boolean).length / items.length) * 100);
}

function containsAny(text, keywords) {
  const normalized = normalizeText(text);
  return keywords.some((keyword) => normalized.includes(normalizeText(keyword)));
}

function computeConsistencyScore(brand) {
  const fields = [
    brand.brandName,
    brand.brandCode,
    brand.industry,
    brand.personality,
    brand.visualPromise,
    brand.primaryColor,
    brand.secondaryColor,
    brand.accentColor,
    brand.backgroundColor,
    brand.typography,
    brand.logoRule,
    brand.compositionRules,
    brand.negativeRules
  ];
  const filled = fields.filter((field) => cleanValue(field).length > 0).length;
  return Math.round((filled / fields.length) * 100);
}

function buildPreviewTitle(brand) {
  const name = brand.brandName.replace(/\s+Logistics Premium$/i, "").trim();
  return `${name || "Marca"} con identidad visual consistente.`;
}

function buildOpportunityByObjective(objective) {
  const map = {
    generar_leads: "Usar una oferta de bajo riesgo: diagnostico, cotizacion, auditoria o reunion breve con formulario simple.",
    awareness: "Priorizar piezas de reconocimiento: problema, promesa, prueba visual y repeticion consistente de marca.",
    lanzamiento: "Ordenar la narrativa en tres pasos: que es, para quien es y por que conviene probarlo ahora.",
    rebranding: "Construir un sistema minimo: promesa, tono, paleta, composicion, mensajes prohibidos y ejemplos de pieza.",
    autoridad: "Publicar criterio experto: errores comunes, checklist, casos, comparativas y decisiones que ahorran riesgo.",
    retencion: "Crear contenido de educacion y uso: mejores practicas, novedades, recordatorios y beneficios por continuidad.",
    trafico_web: "Vincular cada pieza con una landing especifica y medir clic, formulario y tasa de conversion.",
    reclutamiento: "Mostrar cultura, exigencia, beneficios y proceso claro para atraer perfiles compatibles."
  };
  return map[objective] || "";
}

function buildOpportunityBySector(sector) {
  const map = {
    logistica_transporte: "En logistica, la campana debe vender control, trazabilidad, cumplimiento y velocidad de respuesta antes que precio.",
    servicios_b2b: "En servicios B2B, conviene mostrar diagnostico, proceso y prueba para reducir incertidumbre.",
    tecnologia_saas: "En tecnologia, explicar el antes/despues y mostrar datos o pantallas vale mas que promesas generales.",
    retail_ecommerce: "En retail, la fuerza esta en producto, disponibilidad, prueba social y accion inmediata.",
    industria_manufactura: "En industria, priorizar capacidad, calidad, continuidad de suministro y eficiencia.",
    finanzas: "En finanzas, la confianza y el control del riesgo deben aparecer antes del beneficio.",
    salud_bienestar: "En salud, cuidar tono, evidencia y claridad; evitar promesas absolutas.",
    educacion: "En educacion, mostrar transformacion, metodologia y resultados esperables.",
    inmobiliario: "En inmobiliario, usar visuales concretos, ubicacion, seguridad y oportunidad.",
    gastronomia_turismo: "En gastronomia y turismo, vender experiencia, reserva y deseo visual inmediato.",
    marca_personal: "En marca personal, concentrar la campana en criterio, historia y prueba de expertise."
  };
  return map[sector] || "";
}

function buildAuthorityStrategy(sector, objective) {
  if (objective === "rebranding") return "Construir confianza desde una identidad minima viable: promesa clara, tono reconocible y prueba visual consistente.";
  if (sector === "logistica_transporte") return "Demostrar control operativo con mensajes de trazabilidad, cumplimiento, respuesta y visibilidad para decisores.";
  return "Elevar percepcion de valor mostrando criterio experto, proceso claro y pruebas que reduzcan riesgo de compra.";
}

function buildConversionStrategy(sector, objective) {
  if (objective === "reclutamiento") return "Convertir interesados en postulantes o aliados con una propuesta concreta, requisitos claros y proximo paso simple.";
  if (objective === "trafico_web") return "Llevar audiencia a una landing con promesa directa, CTA visible y motivo inmediato para hacer clic.";
  if (objective === "lanzamiento") return "Crear urgencia de prueba explicando beneficio, uso y llamada a accion con baja friccion.";
  return "Transformar dolor detectado en accion medible: consulta, cotizacion, diagnostico, demo o reunion comercial.";
}

function buildHeadline(companyName, sector, variant) {
  if (variant === "autoridad") {
    if (sector === "logistica_transporte") return "Control real para cargas que no pueden fallar";
    if (sector === "tecnologia_saas") return "Datos claros para decidir mas rapido";
    return `${companyName}: confianza antes de la decision`;
  }
  if (sector === "logistica_transporte") return "Cotiza con trazabilidad desde el primer contacto";
  if (sector === "retail_ecommerce") return "Compra simple, entrega clara, respuesta rapida";
  return "Convierte el problema en una accion concreta";
}

function buildCta(objective, offer) {
  const map = {
    generar_leads: `Agenda ${offer}`,
    awareness: "Conoce la propuesta",
    lanzamiento: `Prueba ${offer}`,
    rebranding: "Construyamos la marca",
    autoridad: "Solicita un diagnostico",
    retencion: "Revisa tus beneficios",
    trafico_web: "Ver mas detalles",
    reclutamiento: "Postular o conversar"
  };
  return map[objective] || `Solicita ${offer}`;
}

function inferOfferByObjective(objective) {
  const map = {
    generar_leads: "una reunion de diagnostico",
    awareness: "una presentacion clara de la empresa",
    lanzamiento: "una prueba inicial",
    rebranding: "una identidad minima viable",
    autoridad: "un diagnostico experto",
    retencion: "una mejora de servicio",
    trafico_web: "una visita a la landing",
    reclutamiento: "una conversacion inicial"
  };
  return map[objective] || "una reunion comercial";
}

function inferAudienceBySector(sector) {
  const map = {
    logistica_transporte: "empresas que necesitan mover carga con control",
    servicios_b2b: "decisores B2B que necesitan un proveedor confiable",
    tecnologia_saas: "equipos que necesitan automatizar y decidir con datos",
    retail_ecommerce: "compradores que valoran disponibilidad y respuesta",
    industria_manufactura: "empresas que dependen de continuidad productiva",
    finanzas: "personas o empresas que buscan seguridad y control",
    salud_bienestar: "personas que buscan cuidado profesional",
    educacion: "personas que quieren aprender con metodologia",
    inmobiliario: "personas que evaluan inversion o vivienda",
    gastronomia_turismo: "clientes que buscan una experiencia confiable",
    marca_personal: "audiencias que compran criterio experto"
  };
  return map[sector] || "clientes potenciales con una necesidad activa";
}

function buildChannels() {
  const raw = cleanValue(brandStudioState.company.channels);
  if (raw) return raw.split(",").map((item) => cleanValue(item)).filter(Boolean);
  return ["LinkedIn", "Instagram", "WhatsApp comercial"];
}

function buildKpis(objective) {
  const map = {
    generar_leads: ["leads calificados", "costo por lead", "reuniones agendadas"],
    awareness: ["alcance", "frecuencia", "recordacion"],
    lanzamiento: ["clics", "pruebas", "consultas"],
    rebranding: ["consistencia visual", "alcance", "engagement cualitativo"],
    autoridad: ["guardados", "comentarios", "consultas calificadas"],
    retencion: ["recompra", "respuestas", "uso de beneficio"],
    trafico_web: ["CTR", "visitas landing", "conversion formulario"],
    reclutamiento: ["postulaciones", "contactos validos", "costo por postulante"]
  };
  return map[objective] || ["alcance", "clics", "consultas"];
}

function buildHashtags(sector, objective, brand, company) {
  const base = ["#Marca", "#EstrategiaDigital"];
  const bySector = {
    logistica_transporte: ["#Logistica", "#Transporte", "#ComercioExterior", "#Trazabilidad"],
    servicios_b2b: ["#B2B", "#ServiciosProfesionales", "#GestionComercial"],
    tecnologia_saas: ["#Tecnologia", "#SaaS", "#Automatizacion", "#Datos"],
    retail_ecommerce: ["#Ecommerce", "#Retail", "#VentasOnline"],
    industria_manufactura: ["#Industria", "#Manufactura", "#Produccion"],
    finanzas: ["#Finanzas", "#SeguridadFinanciera", "#GestionDeRiesgo"],
    salud_bienestar: ["#Salud", "#Bienestar", "#CuidadoProfesional"],
    educacion: ["#Educacion", "#Capacitacion", "#Aprendizaje"],
    inmobiliario: ["#Inmobiliario", "#Inversion", "#Propiedades"],
    gastronomia_turismo: ["#Turismo", "#Experiencias", "#Reservas"],
    marca_personal: ["#MarcaPersonal", "#Consultoria", "#Expertise"]
  };
  const byObjective = {
    generar_leads: ["#ClientesPotenciales", "#VentasB2B"],
    awareness: ["#ReconocimientoDeMarca"],
    lanzamiento: ["#Lanzamiento"],
    rebranding: ["#IdentidadDeMarca"],
    autoridad: ["#Autoridad", "#ContenidoDeValor"],
    retencion: ["#Fidelizacion"],
    trafico_web: ["#LandingPage"],
    reclutamiento: ["#Talento", "#Aliados"]
  };
  const brandTag = `#${slugify(company.companyName || brand.brandName).replace(/-/g, "")}`.slice(0, 32);
  return Array.from(new Set([brandTag, ...(bySector[sector] || []), ...(byObjective[objective] || []), ...base])).slice(0, 10);
}

function buildCompositionRules(sector) {
  if (sector === "logistica_transporte") return "Visuales con rutas, tableros, unidades, documentos o mapas; composicion sobria, premium, con sensacion de control y trazabilidad.";
  if (sector === "tecnologia_saas") return "Visuales con interfaces, datos y flujo claro; fondos limpios, profundidad moderada y sensacion de eficiencia.";
  if (sector === "retail_ecommerce") return "Producto claro, jerarquia comercial, contraste alto, espacio para oferta y CTA visible.";
  return "Composiciones limpias, titulares fuertes, zonas visuales ordenadas, contraste profesional y una senal clara de confianza.";
}

function buildBrandCode(companyName) {
  const base = slugify(companyName).split("-").map((part) => part[0]).join("").slice(0, 5).toUpperCase() || "BRAND";
  return `${base}-001`;
}

function getCampaignPackageName(objective) {
  const manual = cleanValue(brandStudioState.brief.campaignName);
  if (manual) return manual;
  const companyName = getCompanyDisplayName();
  const objectiveLabel = getObjectiveLabel(objective || "generar_leads");
  return `${companyName} | ${objectiveLabel}`;
}

function getCompanyDisplayName() {
  return cleanValue(brandStudioState.company.companyName) || cleanValue(brandStudioState.brand.brandName) || "Empresa nueva";
}

function getSectorLabel(value) {
  return sectorOptions.find((item) => item.value === value)?.label || "Sector por definir";
}

function getObjectiveLabel(value) {
  return objectiveOptions.find((item) => item.value === value)?.label || "Objetivo por definir";
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value || "";
}

function setToken(selector, color) {
  const node = document.querySelector(selector);
  if (!node) return;
  node.style.backgroundColor = color;
  node.title = color;
}

function readTextFile(file) {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", reject);
    reader.readAsText(file);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function copyText(text, message) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => announce(message)).catch(() => fallbackCopy(text, message));
    return;
  }
  fallbackCopy(text, message);
}

function fallbackCopy(text, message) {
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
  announce(message);
}

function downloadFile(name, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function announce(message) {
  let toast = document.querySelector(".brand-studio-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "brand-studio-toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(announce.timer);
  announce.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function cleanValue(value) {
  return String(value || "").trim();
}

function normalizeText(value) {
  return cleanValue(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function buildId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function slugify(value) {
  return cleanValue(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "joathiva";
}

function splitForSvg(value, maxLength, maxLines) {
  const words = cleanValue(value).split(/\s+/);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function svgToDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function inferTextMime(name) {
  if (/\.json$/i.test(name)) return "application/json";
  if (/\.csv$/i.test(name)) return "text/csv";
  if (/\.html?$/i.test(name)) return "text/html";
  return "text/plain";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

function escapeXml(value) {
  return escapeHtml(value);
}
