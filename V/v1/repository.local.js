import {
  DOMAIN_VERSION,
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
  IMPORT_SPLITS,
  ENTITY_CONTRACTS,
  FIELD_ALIASES,
  getEntityContract
} from "./domain-contract.js";

export {
  DOMAIN_VERSION,
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
  IMPORT_SPLITS,
  ENTITY_CONTRACTS,
  FIELD_ALIASES,
  getEntityContract
} from "./domain-contract.js";

const STORAGE_KEY = "joathiva-v1-state";

export const state = loadState();

function createSeedState() {
  const now = "2026-04-21T12:00:00.000Z";
  return {
    version: DOMAIN_VERSION,
    session: {
      active: false,
      userName: "Equipo comercial",
      role: "commercial_ops",
      mode: "local"
    },
    settings: {
      exchangeRateUyu: 1,
      preferredCurrency: "USD",
      syncMode: "local",
      syncBaseUrl: ""
    },
    activityLog: [],
    crm: [
      {
        id: "crm-1001",
        customerId: "cus-1001",
        nombre: "Importadora del Plata",
        empresa: "Importadora del Plata SRL",
        contacto: "Laura Fernandez",
        telefono: "+598 99 111 222",
        email: "logistica@importadoradelplata.com",
        origenLead: "Referencia",
        ejecutivo: "Rodrigo",
        etapa: "Propuesta",
        ultimaInteraccion: "2026-04-21T09:10:00.000Z",
        proximaAccion: "Enviar cotizacion terrestre",
        fechaSeguimiento: "2026-04-22",
        notas: "Busca comparativo Brasil y Argentina para ingreso a Uruguay.",
        estadoCliente: "Prospecto",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "crm-1002",
        customerId: "cus-1002",
        nombre: "AgroSur Export",
        empresa: "AgroSur Export SA",
        contacto: "Mariana Gomez",
        telefono: "+54 11 5555 1212",
        email: "logistica@agrosur.com",
        origenLead: "WhatsApp",
        ejecutivo: "Rodrigo",
        etapa: "Negociacion",
        ultimaInteraccion: "2026-04-21T07:25:00.000Z",
        proximaAccion: "Confirmar cupo y seguro",
        fechaSeguimiento: "2026-04-21",
        notas: "Operacion regional con urgencia de salida.",
        estadoCliente: "Activo",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "crm-1003",
        customerId: "cus-1003",
        nombre: "Frigorifico Central",
        empresa: "Frigorifico Central Ltda",
        contacto: "Nicolas Silva",
        telefono: "+598 98 222 333",
        email: "compras@frigorificocentral.uy",
        origenLead: "Web",
        ejecutivo: "Rodrigo",
        etapa: "Cliente",
        ultimaInteraccion: "2026-04-20T17:40:00.000Z",
        proximaAccion: "Revisar orden de carga semanal",
        fechaSeguimiento: "2026-04-24",
        notas: "Ya opera con condiciones pactadas.",
        estadoCliente: "Cliente",
        createdAt: now,
        updatedAt: now
      }
    ],
    quotes: [
      {
        id: "quo-1001",
        customerId: "cus-1001",
        cliente: "Importadora del Plata",
        origen: "Sao Paulo",
        destino: "Montevideo",
        paisOrigen: "Brasil",
        paisDestino: "Uruguay",
        tipoOperacion: "Importacion",
        modoTransporte: "Terrestre",
        proveedor: "Transporte Sur",
        costoProveedor: 1200,
        gastosAdicionales: 180,
        seguro: 65,
        horasExtra: 2,
        estadiaAduanaDias: 1,
        margenPct: 30,
        moneda: "USD",
        tipoCambio: 1,
        observaciones: "Entrega en deposito fiscal.",
        createdAt: "2026-04-21T10:30:00.000Z",
        calculation: null
      },
      {
        id: "quo-1002",
        customerId: "cus-1002",
        cliente: "AgroSur Export",
        origen: "Asuncion",
        destino: "Montevideo",
        paisOrigen: "Paraguay",
        paisDestino: "Uruguay",
        tipoOperacion: "Importacion",
        modoTransporte: "Multimodal",
        proveedor: "Corredor Rio",
        costoProveedor: 1450,
        gastosAdicionales: 210,
        seguro: 80,
        horasExtra: 0,
        estadiaAduanaDias: 2,
        margenPct: 30,
        moneda: "USD",
        tipoCambio: 1,
        observaciones: "Requiere control documental anticipado.",
        createdAt: "2026-04-21T08:50:00.000Z",
        calculation: null
      }
    ],
    agenda: [
      {
        id: "task-1001",
        customerId: "cus-1001",
        cliente: "Importadora del Plata",
        tarea: "Llamar para validar condiciones comerciales",
        prioridad: "Alta",
        fechaCompromiso: "2026-04-21",
        recordatorio: "2026-04-21T15:00:00.000Z",
        estado: "Pendiente",
        observaciones: "Confirmar plazo y tipo de moneda.",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "task-1002",
        customerId: "cus-1002",
        operationId: "op-1001",
        cliente: "AgroSur Export",
        tarea: "Enviar version final de cotizacion",
        prioridad: "Alta",
        fechaCompromiso: "2026-04-21",
        recordatorio: "2026-04-21T13:30:00.000Z",
        estado: "En curso",
        observaciones: "Quedan pendientes seguro y aduana.",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "task-1003",
        customerId: "cus-1003",
        cliente: "Frigorifico Central",
        tarea: "Revisar agenda de carga semanal",
        prioridad: "Media",
        fechaCompromiso: "2026-04-24",
        recordatorio: "2026-04-24T09:00:00.000Z",
        estado: "Pendiente",
        observaciones: "Coordinacion de unidades y ventanilla.",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "task-1004",
        customerId: "cus-1002",
        operationId: "op-1001",
        cliente: "AgroSur Export",
        tarea: "Confirmar prevision de camion para la operacion PY-2026-041",
        prioridad: "Alta",
        fechaCompromiso: "2026-04-22",
        recordatorio: "2026-04-21T18:00:00.000Z",
        estado: "En curso",
        observaciones: "Coordinar con despachante PY y validar arribo.",
        createdAt: now,
        updatedAt: now
      }
    ],
    operations: [
      {
        id: "op-1001",
        clientId: "cus-1002",
        tipoOperacion: "Exportacion",
        referencia: "PY-2026-041",
        contenedor: "MSCU1234567",
        dua: "",
        origen: "Montevideo",
        destino: "Asuncion",
        fechaArribo: "2026-04-22",
        fechaCarga: "2026-04-21",
        fechaDevolucion: "2026-04-27",
        poloLogistico: "Puerto de Montevideo",
        despachanteUY: "Despachos Rivera",
        despachantePY: "PY Logistica SRL",
        estadoOperacion: "Camion pendiente",
        riesgo: "Medio",
        observaciones: "Salida coordinada con documentacion preliminar.",
        documentChecklist: {
          avisoArribo: true,
          previsionCamion: false,
          facturaCRT: true,
          borradorCRT: true,
          controlDespachantePY: true,
          ncm: false,
          valorSeguro: false,
          dua: false,
          micDefinitivo: false,
          crtDefinitivo: false,
          entregaDocumentalDespachanteUY: false
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: "op-1002",
        clientId: "cus-1003",
        tipoOperacion: "Exportacion",
        referencia: "PY-2026-042",
        contenedor: "TGHU7654321",
        dua: "776201",
        origen: "Paysandu",
        destino: "Ciudad del Este",
        fechaArribo: "2026-04-24",
        fechaCarga: "2026-04-23",
        fechaDevolucion: "2026-04-29",
        poloLogistico: "Polo Norte",
        despachanteUY: "Despacho Central",
        despachantePY: "PY Transit",
        estadoOperacion: "En transito",
        riesgo: "Bajo",
        observaciones: "Documentacion definitiva lista y salida confirmada.",
        documentChecklist: {
          avisoArribo: true,
          previsionCamion: true,
          facturaCRT: true,
          borradorCRT: true,
          controlDespachantePY: true,
          ncm: true,
          valorSeguro: true,
          dua: true,
          micDefinitivo: true,
          crtDefinitivo: true,
          entregaDocumentalDespachanteUY: true
        },
        createdAt: now,
        updatedAt: now
      }
    ],
    customers: [
      {
        id: "cus-1001",
        nombre: "Importadora del Plata",
        empresa: "Importadora del Plata SRL",
        contactoPrincipal: "Laura Fernandez",
        telefono: "+598 99 111 222",
        email: "logistica@importadoradelplata.com",
        tipoCliente: "Prospecto",
        ciudad: "Montevideo",
        pais: "Uruguay",
        datosGenerales: "Importador regional de consumo masivo.",
        contactos: [
          {
            nombre: "Laura Fernandez",
            cargo: "Gerencia de logistica",
            telefono: "+598 99 111 222",
            email: "logistica@importadoradelplata.com"
          }
        ],
        historialComercial: [
          { fecha: "2026-04-19", nota: "Ingreso por referencia comercial." },
          { fecha: "2026-04-21", nota: "Solicito comparativo de rutas." }
        ],
        cotizacionesAsociadas: ["quo-1001"],
        incidencias: [
          { fecha: "2026-04-20", nota: "Pide ajuste de plazo de respuesta." }
        ],
        condicionesPactadas: "Pendiente de cierre",
        observacionesClave: "Requiere velocidad y claridad comercial.",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "cus-1002",
        nombre: "AgroSur Export",
        empresa: "AgroSur Export SA",
        contactoPrincipal: "Mariana Gomez",
        telefono: "+54 11 5555 1212",
        email: "logistica@agrosur.com",
        tipoCliente: "Activo",
        ciudad: "Buenos Aires",
        pais: "Argentina",
        datosGenerales: "Exportador regional con operaciones mixtas.",
        contactos: [
          {
            nombre: "Mariana Gomez",
            cargo: "Coordinacion de comercio exterior",
            telefono: "+54 11 5555 1212",
            email: "logistica@agrosur.com"
          }
        ],
        historialComercial: [
          { fecha: "2026-04-18", nota: "Primera reunion comercial." },
          { fecha: "2026-04-21", nota: "Cotizacion enviada y en revision." }
        ],
        cotizacionesAsociadas: ["quo-1002"],
        incidencias: [],
        condicionesPactadas: "Pago a 30 dias y seguimiento semanal.",
        observacionesClave: "Cliente de volumen con foco en continuidad.",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "cus-1003",
        nombre: "Frigorifico Central",
        empresa: "Frigorifico Central Ltda",
        contactoPrincipal: "Nicolas Silva",
        telefono: "+598 98 222 333",
        email: "compras@frigorificocentral.uy",
        tipoCliente: "Cliente",
        ciudad: "Paysandu",
        pais: "Uruguay",
        datosGenerales: "Planta de frio con agenda recurrente de cargas.",
        contactos: [
          {
            nombre: "Nicolas Silva",
            cargo: "Compras",
            telefono: "+598 98 222 333",
            email: "compras@frigorificocentral.uy"
          }
        ],
        historialComercial: [
          { fecha: "2026-04-12", nota: "Renovacion de condiciones pactadas." },
          { fecha: "2026-04-20", nota: "Coordinacion de agenda semanal." }
        ],
        cotizacionesAsociadas: [],
        incidencias: [
          { fecha: "2026-04-15", nota: "Demora en confirmacion de arribo." }
        ],
        condicionesPactadas: "Servicio recurrente con prioridad de respuesta.",
        observacionesClave: "Cuenta estrategica con carga de frio.",
        createdAt: now,
        updatedAt: now
      }
    ],
    providers: [
      {
        id: "prv-1001",
        nombre: "Transporte Sur",
        contacto: "Carlos Mendez",
        telefono: "+598 99 123 456",
        email: "carlos@transportesur.uy",
        tipoUnidad: "Sider",
        configuracion: "Semirremolque",
        apertura: "Lateral con lona",
        usoTipico: "Carga paletizada rapida",
        zona: "Montevideo / Ruta 1",
        pais: "Uruguay",
        rutasCobertura: ["Uruguay", "Argentina", "Brasil"],
        disponibilidad: "Disponible",
        choferNombre: "Carlos Mendez",
        choferTelefono: "+598 99 123 456",
        choferLicencia: "UY-558841",
        camionPatente: "SBT 1020",
        camionMarca: "Scania",
        camionModelo: "R450",
        camionAnio: "2022",
        camionTipo: "Semi remolque",
        mic: "MIC-2026-001",
        dua: "DUA-2026-001",
        viajes: [
          {
            fecha: "2026-04-18",
            origen: "Montevideo",
            destino: "Sao Paulo",
            estado: "Entregado",
            observaciones: "Incluye MIC y CRT."
          },
          {
            fecha: "2026-04-20",
            origen: "Buenos Aires",
            destino: "Montevideo",
            estado: "En viaje",
            observaciones: "Retorno con carga general."
          }
        ],
        documentosOperativos: [
          { kind: "crt", fileName: "crt-transporte-sur.pdf", fileType: "application/pdf", fileSize: 182342, uploadedAt: now },
          { kind: "e-ticket", fileName: "ticket-transporte-sur.pdf", fileType: "application/pdf", fileSize: 94321, uploadedAt: now }
        ],
        observaciones: "Cobertura regional y respuesta rapida.",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "prv-1002",
        nombre: "Corredor Rio",
        contacto: "Mariana Flores",
        telefono: "+598 98 555 101",
        email: "operaciones@corredorrio.com",
        tipoUnidad: "Furgon",
        configuracion: "Semirremolque",
        apertura: "Trasera",
        usoTipico: "Carga seca, alta seguridad",
        zona: "Montevideo / Canelones",
        pais: "Uruguay",
        rutasCobertura: ["Uruguay", "Argentina"],
        disponibilidad: "Reservado",
        observaciones: "Especialista en cargas sensibles.",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "prv-1003",
        nombre: "Plataforma del Este",
        contacto: "Jorge Alvarez",
        telefono: "+598 97 321 888",
        email: "contacto@plataformadeste.com",
        tipoUnidad: "Plataforma",
        configuracion: "Semirremolque",
        apertura: "Abierta",
        usoTipico: "Maquinaria, carga voluminosa",
        zona: "Punta del Este / Maldonado",
        pais: "Uruguay",
        rutasCobertura: ["Uruguay", "Chile", "Europa"],
        disponibilidad: "Disponible",
        observaciones: "Usos especiales y sobredimensionados.",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "prv-1004",
        nombre: "Logistica Liquidos",
        contacto: "Silvia Pereira",
        telefono: "+54 11 5555 4455",
        email: "operaciones@liquidos.com",
        tipoUnidad: "Cisterna",
        configuracion: "Semirremolque",
        apertura: "Superior / valvulas",
        usoTipico: "Liquidos y gases",
        zona: "Buenos Aires / Frontera",
        pais: "Argentina",
        rutasCobertura: ["Argentina", "Brasil", "Uruguay"],
        disponibilidad: "En viaje",
        observaciones: "Operativa binacional con control sanitario.",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "prv-1005",
        nombre: "Frio Seguro",
        contacto: "Nicolas Silva",
        telefono: "+598 98 222 333",
        email: "frio@frioseguro.uy",
        tipoUnidad: "Refrigerado",
        configuracion: "Semirremolque",
        apertura: "Trasera",
        usoTipico: "Alimentos, medicinas",
        zona: "Paysandu / litoral",
        pais: "Uruguay",
        rutasCobertura: ["Uruguay", "Brasil", "Europa"],
        disponibilidad: "No disponible",
        observaciones: "Ventana de disponibilidad semanal.",
        createdAt: now,
        updatedAt: now
      }
    ]
  };
}

function loadState() {
  const seed = createSeedState();

  if (typeof localStorage === "undefined") {
    return mergeState(seed, seed);
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return mergeState(seed, seed);

  try {
    const parsed = JSON.parse(raw);
    return mergeState(seed, migrateStoredState(parsed));
  } catch {
    return seed;
  }
}

function migrateStoredState(stored) {
  if (!stored || typeof stored !== "object") {
    return stored;
  }

  const migrated = { ...stored };
  const version = Number(migrated.version) || 1;

  if (version < DOMAIN_VERSION) {
    migrated.version = DOMAIN_VERSION;
  }

  return migrated;
}

function mergeState(seed, stored) {
  const merged = {
    ...seed,
    ...stored,
    session: { ...seed.session, ...(stored?.session || {}) },
    settings: { ...seed.settings, ...(stored?.settings || {}) },
    activityLog: Array.isArray(stored?.activityLog) ? stored.activityLog : seed.activityLog,
    crm: Array.isArray(stored?.crm) ? stored.crm : seed.crm,
    quotes: Array.isArray(stored?.quotes) ? stored.quotes : seed.quotes,
    agenda: Array.isArray(stored?.agenda) ? stored.agenda : seed.agenda,
    operations: Array.isArray(stored?.operations) ? stored.operations : seed.operations,
    customers: Array.isArray(stored?.customers) ? stored.customers : seed.customers,
    providers: Array.isArray(stored?.providers) ? stored.providers : seed.providers
  };

  merged.crm = merged.crm.map((record) => normalizeRecord(record, "crm"));
  merged.quotes = merged.quotes.map((record) => {
    const normalized = normalizeRecord(record, "quote");
    normalized.calculation = calculateQuote(normalized);
    return normalized;
  });
  merged.agenda = merged.agenda.map((record) => normalizeRecord(record, "task"));
  merged.operations = merged.operations.map((record) => normalizeOperationRecord(record));
  merged.customers = merged.customers.map((record) => normalizeRecord(record, "customer"));
  merged.providers = merged.providers.map((record) => normalizeProviderRecord(record));
  merged.activityLog = Array.isArray(merged.activityLog) ? merged.activityLog.map((record) => normalizeActivityRecord(record)) : [];

  if (!merged.session.userName) merged.session.userName = seed.session.userName;
  if (!merged.session.role) merged.session.role = seed.session.role;
  if (!merged.settings.exchangeRateUyu) merged.settings.exchangeRateUyu = seed.settings.exchangeRateUyu;
  if (!merged.settings.preferredCurrency) merged.settings.preferredCurrency = seed.settings.preferredCurrency;
  if (!merged.settings.syncMode) merged.settings.syncMode = seed.settings.syncMode;
  if (!merged.settings.syncBaseUrl && merged.settings.syncBaseUrl !== "") merged.settings.syncBaseUrl = seed.settings.syncBaseUrl;
  if (!merged.version || merged.version < seed.version) merged.version = seed.version;

  return merged;
}

function normalizeRecord(record, kind) {
  const base = { ...record };
  if (!base.id) {
    base.id = buildId(kind);
  }
  if (!base.createdAt) {
    base.createdAt = new Date().toISOString();
  }
  if (!base.updatedAt) {
    base.updatedAt = base.createdAt;
  }
  return base;
}

function normalizeOperationChecklist(checklist) {
  const source = checklist && typeof checklist === "object" ? checklist : {};
  return OPERATION_CHECKLIST_ITEMS.reduce((acc, item) => {
    acc[item.key] = Boolean(source[item.key]);
    return acc;
  }, {});
}

function normalizeOperationDocuments(documents) {
  if (!Array.isArray(documents)) return [];
  return documents
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
      id: String(item.id || buildId("doc")),
      operationId: String(item.operationId || ""),
      type: String(item.type || "Otro").trim(),
      fileName: String(item.fileName || "").trim(),
      status: String(item.status || "pendiente").trim(),
      uploadedByUserId: String(item.uploadedByUserId || "").trim(),
      visibleToRoles: Array.isArray(item.visibleToRoles) ? item.visibleToRoles.map(String) : [],
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || item.createdAt || new Date().toISOString()
    }));
}

function normalizeOperationRecord(record) {
  const normalized = normalizeRecord({ ...record }, "operation");
  normalized.clientId = String(normalized.clientId || normalized.customerId || "").trim();
  normalized.customerId = normalized.clientId;
  normalized.tipoOperacion = String(normalized.tipoOperacion || "").trim();
  normalized.referencia = String(normalized.referencia || "").trim();
  normalized.contenedor = String(normalized.contenedor || "").trim();
  normalized.dua = String(normalized.dua || normalized.duaNumber || "").trim();
  normalized.duaNumber = normalized.dua;
  normalized.origen = String(normalized.origen || "").trim();
  normalized.destino = String(normalized.destino || "").trim();
  normalized.fechaArribo = String(normalized.fechaArribo || "").trim();
  normalized.fechaCarga = String(normalized.fechaCarga || "").trim();
  normalized.fechaDevolucion = String(normalized.fechaDevolucion || "").trim();
  normalized.poloLogistico = String(normalized.poloLogistico || "").trim();
  normalized.despachanteUY = String(normalized.despachanteUY || "").trim();
  normalized.despachantePY = String(normalized.despachantePY || "").trim();
  normalized.providerId = String(normalized.providerId || "").trim();
  normalized.providerName = String(normalized.providerName || "").trim();
  normalized.brokerId = String(normalized.brokerId || "").trim();
  normalized.brokerName = String(normalized.brokerName || "").trim();
  normalized.brokerRole = String(normalized.brokerRole || "").trim();
  normalized.responsibleContactId = String(normalized.responsibleContactId || "").trim();
  normalized.responsibleContactName = String(normalized.responsibleContactName || "").trim();
  normalized.responsibleContactPhone = String(normalized.responsibleContactPhone || "").trim();
  normalized.responsibleContactEmail = String(normalized.responsibleContactEmail || "").trim();
  normalized.fleetUnitId = String(normalized.fleetUnitId || "").trim();
  normalized.fleetUnitLabel = String(normalized.fleetUnitLabel || "").trim();
  normalized.fleetLocation = String(normalized.fleetLocation || "").trim();
  normalized.fleetStatus = String(normalized.fleetStatus || "").trim();
  normalized.fleetAvailableAt = String(normalized.fleetAvailableAt || "").trim();
  normalized.expectedFinishAt = String(normalized.expectedFinishAt || "").trim();
  normalized.estadoOperacion = String(normalized.estadoOperacion || "").trim();
  normalized.riesgo = String(normalized.riesgo || "").trim();
  normalized.observaciones = String(normalized.observaciones || "").trim();
  normalized.documentChecklist = normalizeOperationChecklist(normalized.documentChecklist);
  normalized.documents = normalizeOperationDocuments(normalized.documents);
  return normalized;
}

export function saveState() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearSession() {
  state.session = {
    active: false,
    userName: "Equipo comercial",
    role: "commercial_ops",
    mode: "local"
  };
  saveState();
}

export function setSession(sessionPatch) {
  state.session = {
    ...state.session,
    ...sessionPatch,
    active: true
  };
  saveState();
}

export function setSetting(key, value) {
  state.settings = {
    ...state.settings,
    [key]: value
  };
  saveState();
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateBackupStateShape(candidate) {
  const errors = {};
  const payload = candidate && typeof candidate === "object" && candidate.data && typeof candidate.data === "object"
    ? candidate.data
    : candidate;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { payload: null, errors: { _form: "El JSON debe ser un objeto de respaldo JoathiVA." } };
  }

  if (!payload.version) errors.version = "Falta version.";
  if (!payload.session || typeof payload.session !== "object" || Array.isArray(payload.session)) errors.session = "Falta session valida.";
  if (!payload.settings || typeof payload.settings !== "object" || Array.isArray(payload.settings)) errors.settings = "Falta settings valido.";

  ["crm", "customers", "quotes", "agenda", "operations", "activityLog"].forEach((key) => {
    if (!Array.isArray(payload[key])) {
      errors[key] = `Falta coleccion ${key} como array.`;
    }
  });

  if (payload.providers !== undefined && !Array.isArray(payload.providers)) {
    errors.providers = "providers debe ser un array si esta presente.";
  }

  if (payload.providers === undefined) {
    payload.providers = [];
  }

  return { payload, errors };
}

function mergeRecordsById(currentRecords, importedRecords) {
  const merged = new Map();
  (Array.isArray(currentRecords) ? currentRecords : []).forEach((record) => {
    const key = record?.id || buildId("local");
    merged.set(key, record);
  });
  (Array.isArray(importedRecords) ? importedRecords : []).forEach((record) => {
    const key = record?.id || buildId("import");
    merged.set(key, {
      ...(merged.get(key) || {}),
      ...record
    });
  });
  return Array.from(merged.values());
}

function applyImportedState(imported, mode = "merge") {
  if (mode === "replace") {
    state.version = Number(imported.version) || state.version;
    state.session = { ...imported.session };
    state.settings = { ...imported.settings };
    state.crm = [...imported.crm];
    state.customers = [...imported.customers];
    state.providers = [...imported.providers];
    state.quotes = [...imported.quotes];
    state.agenda = [...imported.agenda];
    state.operations = [...imported.operations];
    state.activityLog = [...imported.activityLog];
  } else {
    state.version = Math.max(Number(state.version) || 1, Number(imported.version) || 1);
    state.session = { ...state.session, ...(imported.session || {}) };
    state.settings = { ...state.settings, ...(imported.settings || {}) };
    state.crm = mergeRecordsById(state.crm, imported.crm);
    state.customers = mergeRecordsById(state.customers, imported.customers);
    state.providers = mergeRecordsById(state.providers, imported.providers);
    state.quotes = mergeRecordsById(state.quotes, imported.quotes);
    state.agenda = mergeRecordsById(state.agenda, imported.agenda);
    state.operations = mergeRecordsById(state.operations, imported.operations);
    state.activityLog = mergeRecordsById(state.activityLog, imported.activityLog);
  }

  state.crm = state.crm.map((record) => normalizeRecord(record, "crm"));
  state.customers = state.customers.map((record) => normalizeRecord(record, "customer"));
  state.providers = state.providers.map((record) => normalizeProviderRecord(record));
  state.quotes = state.quotes.map((record) => {
    const normalized = normalizeRecord(record, "quote");
    normalized.calculation = calculateQuote(normalized);
    return normalized;
  });
  state.agenda = state.agenda.map((record) => normalizeRecord(record, "task"));
  state.operations = state.operations.map((record) => normalizeOperationRecord(record));
  state.activityLog = state.activityLog.map((record) => normalizeActivityRecord(record));
}

export function exportLocalBackup() {
  const exportedAt = new Date().toISOString();
  appendActivityEntry({
    type: "backup.exported",
    label: "Backup",
    tone: "info",
    entityKind: "system",
    entityId: "local",
    source: "local-backup",
    title: "Export local generado",
    details: `Respaldo JSON local-first generado ${exportedAt}`
  });
  saveState();

  return {
    version: state.version,
    exportedAt,
    source: "joathiva-v1-local",
    session: deepClone(state.session || {}),
    settings: deepClone(state.settings || {}),
    crm: deepClone(state.crm || []),
    customers: deepClone(state.customers || []),
    providers: deepClone(state.providers || []),
    quotes: deepClone(state.quotes || []),
    agenda: deepClone(state.agenda || []),
    operations: deepClone(state.operations || []),
    activityLog: deepClone(state.activityLog || [])
  };
}

export function importLocalBackup(rawPayload, options = {}) {
  let parsed = rawPayload;
  if (typeof rawPayload === "string") {
    try {
      parsed = JSON.parse(rawPayload);
    } catch {
      return {
        ok: false,
        errors: { _form: "El contenido no es JSON valido." }
      };
    }
  }

  const { payload, errors } = validateBackupStateShape(parsed);
  if (Object.keys(errors).length) {
    return { ok: false, errors };
  }

  const mode = options.mode === "replace" ? "replace" : "merge";
  const countsBefore = {
    crm: state.crm.length,
    customers: state.customers.length,
    providers: state.providers.length,
    quotes: state.quotes.length,
    agenda: state.agenda.length,
    operations: state.operations.length,
    activityLog: state.activityLog.length
  };

  applyImportedState(payload, mode);

  const importedAt = new Date().toISOString();
  appendActivityEntry({
    type: "backup.imported",
    label: "Backup",
    tone: "success",
    entityKind: "system",
    entityId: "local",
    source: "local-backup",
    title: mode === "replace" ? "Backup restaurado" : "Backup importado",
    details: `${mode === "replace" ? "Restauracion" : "Importacion"} JSON local-first ${importedAt}`
  });

  saveState();

  return {
    ok: true,
    mode,
    countsBefore,
    countsAfter: {
      crm: state.crm.length,
      customers: state.customers.length,
      providers: state.providers.length,
      quotes: state.quotes.length,
      agenda: state.agenda.length,
      operations: state.operations.length,
      activityLog: state.activityLog.length
    }
  };
}

function normalizeActivityRecord(record) {
  const base = { ...record };
  if (!base.id) {
    base.id = buildId("act");
  }
  if (!base.at) {
    base.at = new Date().toISOString();
  }
  if (!base.type) {
    base.type = "activity";
  }
  if (!base.label) {
    base.label = "Actividad";
  }
  if (!base.tone) {
    base.tone = "neutral";
  }
  if (!base.source) {
    base.source = "local";
  }
  if (!base.createdAt) {
    base.createdAt = base.at;
  }
  if (!base.updatedAt) {
    base.updatedAt = base.createdAt;
  }
  if (!base.customerId) {
    base.customerId = "";
  }
  if (!base.entityKind) {
    base.entityKind = "";
  }
  if (!base.entityId) {
    base.entityId = "";
  }
  if (!base.title) {
    base.title = base.label;
  }
  if (!base.details) {
    base.details = "";
  }
  return base;
}

function appendActivityEntry(entry) {
  const normalized = normalizeActivityRecord(entry);
  state.activityLog = Array.isArray(state.activityLog) ? state.activityLog : [];
  state.activityLog.unshift(normalized);
  if (state.activityLog.length > 200) {
    state.activityLog = state.activityLog.slice(0, 200);
  }
  return normalized;
}

function appendCustomerHistoryEntry(customerId, note, at = new Date().toISOString()) {
  const customer = getCustomerById(customerId);
  if (!customer || !note) return null;

  const entry = {
    fecha: formatHistoryDate(at),
    nota: String(note).trim(),
    at,
    source: "local"
  };

  customer.historialComercial = Array.isArray(customer.historialComercial) ? customer.historialComercial : [];
  customer.historialComercial.unshift(entry);
  if (customer.historialComercial.length > 40) {
    customer.historialComercial = customer.historialComercial.slice(0, 40);
  }
  customer.updatedAt = at;
  return entry;
}

function hasOpenTaskForOperation(operationId, signature) {
  const normalizedSignature = String(signature || "").toLowerCase();
  return state.agenda.some((task) => (
    task.operationId === operationId
    && task.estado !== "Hecha"
    && String(task.metadata?.autoFollowUpSignature || "").toLowerCase() === normalizedSignature
  ));
}

function createAutomaticOperationFollowUp(operation, config) {
  if (!operation || !operation.id || !config?.signature || !config?.title) return null;
  if (operation.estadoOperacion === "Cerrado") return null;
  if (hasOpenTaskForOperation(operation.id, config.signature)) return null;

  const now = new Date().toISOString();
  const task = normalizeRecord({
    id: buildId("task"),
    customerId: operation.clientId || operation.customerId || "",
    operationId: operation.id,
    cliente: operation.referencia || operation.contenedor || operation.id,
    tarea: config.title,
    prioridad: config.priority || "Media",
    fechaCompromiso: config.dueDate || "",
    estado: "Pendiente",
    recordatorio: config.reminder || "",
    observaciones: config.details || "",
    metadata: {
      autoFollowUp: true,
      autoFollowUpSignature: config.signature,
      source: "operation-action"
    },
    createdAt: now,
    updatedAt: now
  }, "task");

  state.agenda.unshift(task);

  appendActivityEntry({
    type: "task.auto-created",
    label: "Seguimiento",
    tone: task.prioridad === "Alta" ? "danger" : "warning",
    customerId: task.customerId,
    operationId: operation.id,
    entityKind: "task",
    entityId: task.id,
    title: "Seguimiento automatico creado",
    details: `${task.tarea} | ${operation.referencia || operation.contenedor || operation.id}`
  });

  return task;
}

function createAutomaticFollowUpsForOperation(operation, previousOperation = null) {
  if (!operation || operation.estadoOperacion === "Cerrado") return [];

  const created = [];
  const checklist = normalizeOperationChecklist(operation.documentChecklist);
  const previousChecklist = normalizeOperationChecklist(previousOperation?.documentChecklist);
  const stage = operation.estadoOperacion || "";
  const previousStage = previousOperation?.estadoOperacion || "";
  const operationLabel = operation.referencia || operation.contenedor || operation.id;

  const add = (config) => {
    const task = createAutomaticOperationFollowUp(operation, config);
    if (task) created.push(task);
  };

  if (stage === "Camion pendiente" && previousStage !== "Camion pendiente") {
    add({
      signature: "truck-pending",
      title: "Coordinar transporte/proveedor para la operacion",
      priority: "Alta",
      details: `Seguimiento automatico por estado Camion pendiente | ${operationLabel}`
    });
  }

  if (stage === "Esperando NCM/seguro" && (!checklist.ncm || !checklist.valorSeguro)) {
    add({
      signature: "ncm-insurance-missing",
      title: "Solicitar NCM y valor de seguro pendientes",
      priority: "Alta",
      details: `Seguimiento automatico por documentacion preliminar incompleta | ${operationLabel}`
    });
  }

  if (checklist.dua && !previousChecklist.dua && (!checklist.micDefinitivo || !checklist.crtDefinitivo)) {
    add({
      signature: "dua-received-review-mic-crt",
      title: "Revisar MIC/CRT definitivo luego de DUA recibido",
      priority: "Media",
      details: `Seguimiento automatico por DUA recibido | ${operationLabel}`
    });
  }

  const returnAlerts = getOperationAlerts(operation).filter((alert) => (
    alert.type === "return.overdue"
    || alert.type === "return.today"
    || alert.type === "return.due"
  ));

  if (returnAlerts.length) {
    add({
      signature: "return-follow-up",
      title: "Gestionar devolucion de unidad/contenedor",
      priority: returnAlerts.some((alert) => alert.type === "return.overdue") ? "Alta" : "Media",
      dueDate: operation.fechaDevolucion || "",
      details: `Seguimiento automatico por devolucion | ${operationLabel}`
    });
  }

  return created;
}

export function buildId(prefix) {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${stamp}-${random}`;
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value == null || value === "") return 0;
  const normalized = String(value).replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoneyLabel(value, currency = "USD") {
  const number = roundMoney(toNumber(value));
  const locale = currency === "UYU" ? "es-UY" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(number);
}

export function getQuoteSplit({ operationType, originCountry, destinationCountry }) {
  if (operationType === "Importacion" && destinationCountry === "Uruguay") {
    return IMPORT_SPLITS[originCountry] || {
      internationalShare: 1,
      nationalShare: 0,
      label: "Importacion a Uruguay sin regla especifica"
    };
  }

  if (operationType === "Nacional") {
    return {
      internationalShare: 0,
      nationalShare: 1,
      label: "Operacion nacional 100/0"
    };
  }

  if (operationType === "Exportacion") {
    return {
      internationalShare: 1,
      nationalShare: 0,
      label: "Exportacion 100/0"
    };
  }

  return {
    internationalShare: 1,
    nationalShare: 0,
    label: "Regla manual"
  };
}

export function calculateQuote(input) {
  const currency = (input.currency || input.moneda) === "UYU" ? "UYU" : "USD";
  const exchangeRate = Math.max(1, toNumber(input.exchangeRate || input.tipoCambio) || state.settings.exchangeRateUyu || 1);
  const providerCost = roundMoney(toNumber(input.providerCost || input.costoProveedor));
  const additionalExpenses = roundMoney(toNumber(input.additionalExpenses || input.gastosAdicionales));
  const insurance = roundMoney(toNumber(input.insurance || input.seguro));
  const extraHours = roundMoney(toNumber(input.extraHours || input.horasExtra));
  const customsStayDays = roundMoney(toNumber(input.customsStayDays || input.estadiaAduanaDias));
  const marginPct = Math.max(0, toNumber(input.marginPct) || QUOTE_DEFAULT_MARGIN);
  const operationType = input.operationType || input.tipoOperacion || "Importacion";
  const originCountry = input.originCountry || input.paisOrigen || "";
  const destinationCountry = input.destinationCountry || input.paisDestino || "";
  const appliesIva =
    operationType === "Nacional" ||
    (operationType === "Importacion" && destinationCountry === "Uruguay");
  const split = getQuoteSplit({ operationType, originCountry, destinationCountry });
  const fixedRateMultiplier = currency === "UYU" ? exchangeRate : 1;

  const overtimeCost = roundMoney(extraHours * EXTRA_HOURS_USD * fixedRateMultiplier);
  const stayCost = roundMoney(customsStayDays * CUSTOMS_STAY_USD * fixedRateMultiplier);
  const operatingBase = roundMoney(providerCost + additionalExpenses + insurance + overtimeCost + stayCost);
  const internationalBase = roundMoney(operatingBase * split.internationalShare);
  const nationalBase = roundMoney(operatingBase * split.nationalShare);
  const ivaAmount = appliesIva ? roundMoney(nationalBase * IVA_RATE) : 0;
  const subtotalWithTax = roundMoney(operatingBase + ivaAmount);
  const marginAmount = roundMoney(subtotalWithTax * (marginPct / 100));
  const suggestedPrice = roundMoney(subtotalWithTax + marginAmount);

  return {
    currency,
    exchangeRate,
    split,
    appliesIva,
    providerCost,
    additionalExpenses,
    insurance,
    extraHours,
    overtimeCost,
    customsStayDays,
    stayCost,
    operatingBase,
    internationalBase,
    nationalBase,
    ivaAmount,
    subtotalWithTax,
    marginPct,
    marginAmount,
    suggestedPrice,
    fixedRateMultiplier,
    lines: [
      { label: "Costo proveedor", amount: providerCost },
      { label: "Gastos adicionales", amount: additionalExpenses },
      { label: "Seguro", amount: insurance },
      { label: `Horas extra (${extraHours} x ${EXTRA_HOURS_USD} USD)`, amount: overtimeCost },
      { label: `Estadia aduana (${customsStayDays} x ${CUSTOMS_STAY_USD} USD)`, amount: stayCost },
      { label: `Tramo internacional ${Math.round(split.internationalShare * 100)}%`, amount: internationalBase },
      { label: `Tramo nacional ${Math.round(split.nationalShare * 100)}%`, amount: nationalBase },
      { label: appliesIva ? "IVA 22% tramo nacional" : "IVA no aplica", amount: ivaAmount },
      { label: `Margen objetivo ${marginPct}%`, amount: marginAmount }
    ]
  };
}

function isAllowedValue(value, allowed) {
  return Array.isArray(allowed) && allowed.includes(value);
}

function hasValidText(value) {
  return String(value || "").trim().length > 0;
}

function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function isValidDateValue(value) {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

function isValidDateTimeValue(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function formatHistoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function getTodayStartMs() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

function getDateValueMs(dateValue) {
  if (!dateValue) return Number.NaN;
  const date = new Date(`${dateValue}T00:00:00`);
  return date.getTime();
}

function isDateWithinDays(dateValue, maxDays) {
  const value = getDateValueMs(dateValue);
  if (Number.isNaN(value)) return false;
  const diffDays = Math.ceil((value - getTodayStartMs()) / 86_400_000);
  return diffDays >= 0 && diffDays <= maxDays;
}

function isDateDueOrOverdue(dateValue) {
  const value = getDateValueMs(dateValue);
  if (Number.isNaN(value)) return false;
  return value <= getTodayStartMs();
}

function operationStateTone(stateValue) {
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
  return tones[stateValue] || "neutral";
}

function operationRiskTone(riskValue) {
  const tones = {
    Alto: "danger",
    Medio: "warning",
    Bajo: "success"
  };
  return tones[riskValue] || "neutral";
}

function operationSortScore(operation) {
  const stateRank = {
    "En riesgo": 0,
    "Arribo detectado": 1,
    "Camion pendiente": 2,
    "Documentacion preliminar": 3,
    "Esperando NCM/seguro": 4,
    "DUA recibido": 5,
    "Documentacion definitiva lista": 6,
    "En transito": 7,
    "Devolucion pendiente": 8,
    "Cerrado": 9
  };
  const riskRank = { Alto: 0, Medio: 1, Bajo: 2 };
  const dueMs = operation.fechaArribo ? getDateValueMs(operation.fechaArribo) : Number.NaN;
  const due = Number.isNaN(dueMs) ? Number.MAX_SAFE_INTEGER : dueMs;
  return (stateRank[operation.estadoOperacion] ?? 10) * 10_000_000 + (riskRank[operation.riesgo] ?? 3) * 100_000 + due;
}

function getOperationStageIndex(stage) {
  return OPERATION_WORKFLOW_STATES.indexOf(stage);
}

function isOperationStageAtOrAfter(stage, targetStage) {
  const stageIndex = getOperationStageIndex(stage);
  const targetIndex = getOperationStageIndex(targetStage);
  return stageIndex >= 0 && targetIndex >= 0 && stageIndex >= targetIndex;
}

function normalizeProviderUnitType(value) {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.includes("semi sider") || text.includes("semi-sider") || text.includes("semisider")) {
    return "Sider";
  }

  const match = PROVIDER_UNIT_TYPES.find((item) => normalizeText(item.label) === text || normalizeText(item.key) === text);
  return match ? match.label : String(value).trim();
}

function normalizeProviderAvailability(value) {
  const text = normalizeText(value);
  const match = PROVIDER_AVAILABILITY.find((item) => normalizeText(item) === text);
  return match || "Disponible";
}

function normalizeProviderCoverage(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((item) => String(item || "").trim())
        .filter(Boolean);
  return Array.from(new Set(source.filter((item) => PROVIDER_COVERAGE_OPTIONS.includes(item))));
}

function normalizeProviderTrip(trip) {
  const normalized = trip && typeof trip === "object" && !Array.isArray(trip) ? { ...trip } : {};
  normalized.fecha = String(normalized.fecha || normalized.date || "").trim();
  normalized.origen = String(normalized.origen || "").trim();
  normalized.destino = String(normalized.destino || "").trim();
  normalized.estado = String(normalized.estado || normalized.status || "Planificado").trim();
  normalized.observaciones = String(normalized.observaciones || normalized.notes || "").trim();
  normalized.createdAt = String(normalized.createdAt || new Date().toISOString()).trim();
  return normalized;
}

function normalizeProviderDocument(doc) {
  const normalized = doc && typeof doc === "object" && !Array.isArray(doc) ? { ...doc } : {};
  normalized.kind = String(normalized.kind || normalized.type || "").trim();
  normalized.fileName = String(normalized.fileName || normalized.name || "").trim();
  normalized.fileType = String(normalized.fileType || normalized.mimeType || "").trim();
  normalized.fileSize = Number(normalized.fileSize || normalized.size || 0) || 0;
  normalized.uploadedAt = String(normalized.uploadedAt || new Date().toISOString()).trim();
  normalized.dataUrl = String(normalized.dataUrl || normalized.content || "").trim();
  return normalized;
}

function normalizeProviderRecord(record) {
  const normalized = normalizeRecord({ ...record }, "provider");
  normalized.nombre = String(normalized.nombre || "").trim();
  normalized.contacto = String(normalized.contacto || "").trim();
  normalized.telefono = String(normalized.telefono || "").trim();
  normalized.email = String(normalized.email || "").trim();
  normalized.tipoUnidad = normalizeProviderUnitType(normalized.tipoUnidad);
  normalized.configuracion = String(normalized.configuracion || "").trim();
  if (normalizeText(normalized.configuracion).includes("semi sider") || normalizeText(normalized.configuracion).includes("semi-sider")) {
    normalized.configuracion = "Semirremolque";
    normalized.tipoUnidad = "Sider";
  }
  if (!normalized.configuracion && normalized.tipoUnidad === "Sider") {
    normalized.configuracion = "Semirremolque";
  }
  normalized.apertura = String(normalized.apertura || "").trim();
  normalized.usoTipico = String(normalized.usoTipico || "").trim();
  normalized.zona = String(normalized.zona || "").trim();
  normalized.pais = String(normalized.pais || "").trim();
  normalized.rutasCobertura = normalizeProviderCoverage(normalized.rutasCobertura);
  if (!normalized.rutasCobertura.length && PROVIDER_COVERAGE_OPTIONS.includes(normalized.pais)) {
    normalized.rutasCobertura = [normalized.pais];
  }
  normalized.viajes = Array.isArray(normalized.viajes) ? normalized.viajes.map((trip) => normalizeProviderTrip(trip)).filter((trip) => trip.fecha || trip.origen || trip.destino || trip.estado || trip.observaciones) : [];
  normalized.choferNombre = String(normalized.choferNombre || "").trim();
  normalized.choferTelefono = String(normalized.choferTelefono || "").trim();
  normalized.choferLicencia = String(normalized.choferLicencia || "").trim();
  normalized.camionPatente = String(normalized.camionPatente || "").trim();
  normalized.camionMarca = String(normalized.camionMarca || "").trim();
  normalized.camionModelo = String(normalized.camionModelo || "").trim();
  normalized.camionAnio = String(normalized.camionAnio || "").trim();
  normalized.camionTipo = String(normalized.camionTipo || "").trim();
  normalized.mic = String(normalized.mic || "").trim();
  normalized.dua = String(normalized.dua || "").trim();
  normalized.documentosOperativos = Array.isArray(normalized.documentosOperativos) ? normalized.documentosOperativos.map((doc) => normalizeProviderDocument(doc)).filter((doc) => doc.fileName || doc.kind || doc.dataUrl) : [];
  normalized.disponibilidad = normalizeProviderAvailability(normalized.disponibilidad);
  normalized.observaciones = String(normalized.observaciones || "").trim();
  return normalized;
}

export function validateCrmRecord(record) {
  const errors = {};
  const telefono = String(record.telefono || "").trim();
  const email = String(record.email || "").trim();

  if (!hasValidText(record.nombre)) errors.nombre = "Ingresa el nombre del cliente o prospecto.";
  if (!hasValidText(record.empresa)) errors.empresa = "Ingresa la empresa o razon social.";
  if (!hasValidText(record.contacto)) errors.contacto = "Ingresa un contacto principal.";
  if (!telefono && !email) errors.telefono = "Ingresa telefono o email de contacto.";
  if (email && !isValidEmail(email)) errors.email = "Ingresa un email valido.";
  if (!isAllowedValue(record.origenLead, LEAD_SOURCES)) errors.origenLead = "Selecciona el origen del lead.";
  if (!hasValidText(record.ejecutivo)) errors.ejecutivo = "Ingresa el ejecutivo responsable.";
  if (!isAllowedValue(record.etapa, CRM_STAGES)) errors.etapa = "Selecciona una etapa valida.";
  if (!isValidDateTimeValue(record.ultimaInteraccion)) errors.ultimaInteraccion = "Ingresa fecha y hora valida.";
  if (!hasValidText(record.proximaAccion)) errors.proximaAccion = "Define la proxima accion comercial.";
  if (!isValidDateValue(record.fechaSeguimiento)) errors.fechaSeguimiento = "Ingresa una fecha de seguimiento valida.";
  if (!hasValidText(record.estadoCliente)) errors.estadoCliente = "Selecciona un estado de cliente.";
  if (record.estadoCliente && !isAllowedValue(record.estadoCliente, CUSTOMER_TYPES)) errors.estadoCliente = "Selecciona un estado de cliente valido.";

  return errors;
}

export function validateQuoteRecord(record) {
  const errors = {};
  const currency = (record.currency || record.moneda || "USD") === "UYU" ? "UYU" : "USD";
  const exchangeRate = Math.max(1, toNumber(record.exchangeRate || record.tipoCambio) || 0);
  const providerCost = toNumber(record.providerCost || record.costoProveedor);
  const additionalExpenses = toNumber(record.additionalExpenses || record.gastosAdicionales);
  const insurance = toNumber(record.insurance || record.seguro);
  const extraHours = toNumber(record.extraHours || record.horasExtra);
  const customsStayDays = toNumber(record.customsStayDays || record.estadiaAduanaDias);
  const marginPct = toNumber(record.marginPct || record.margenPct);

  if (!hasValidText(record.customerId)) errors.customerId = "Selecciona un cliente.";
  if (!hasValidText(record.origen)) errors.origen = "Ingresa el origen.";
  if (!hasValidText(record.destino)) errors.destino = "Ingresa el destino.";
  if (!isAllowedValue(record.paisOrigen, COUNTRIES)) errors.paisOrigen = "Selecciona un pais de origen valido.";
  if (!isAllowedValue(record.paisDestino, COUNTRIES)) errors.paisDestino = "Selecciona un pais de destino valido.";
  if (!isAllowedValue(record.tipoOperacion, OPERATION_TYPES)) errors.tipoOperacion = "Selecciona un tipo de operacion valido.";
  if (!isAllowedValue(record.modoTransporte, TRANSPORT_MODES)) errors.modoTransporte = "Selecciona un modo de transporte valido.";
  if (!hasValidText(record.proveedor)) errors.proveedor = "Ingresa el proveedor.";
  if (!(providerCost > 0)) errors.costoProveedor = "Ingresa un costo de proveedor mayor a cero.";
  if (additionalExpenses < 0) errors.gastosAdicionales = "Los gastos adicionales no pueden ser negativos.";
  if (insurance < 0) errors.seguro = "El seguro no puede ser negativo.";
  if (extraHours < 0) errors.horasExtra = "Las horas extra no pueden ser negativas.";
  if (customsStayDays < 0) errors.estadiaAduanaDias = "La estadia en aduana no puede ser negativa.";
  if (marginPct < 0 || marginPct > 100) errors.margenPct = "El margen debe estar entre 0 y 100.";
  if (!isAllowedValue(currency, CURRENCIES)) errors.currency = "Selecciona una moneda valida.";
  if (currency === "UYU" && !(exchangeRate > 0)) errors.exchangeRate = "Ingresa un tipo de cambio valido para UYU.";
  if (record.customerId && !getCustomerById(record.customerId)) errors.customerId = "Selecciona un cliente existente.";

  return errors;
}

export function validateTaskRecord(record) {
  const errors = {};

  if (!hasValidText(record.customerId)) errors.customerId = "Selecciona un cliente.";
  if (!hasValidText(record.tarea)) errors.tarea = "Describe la tarea.";
  if (!isAllowedValue(record.prioridad, TASK_PRIORITIES)) errors.prioridad = "Selecciona una prioridad valida.";
  if (!isValidDateValue(record.fechaCompromiso)) errors.fechaCompromiso = "Ingresa una fecha de compromiso valida.";
  if (!isAllowedValue(record.estado, TASK_STATUS)) errors.estado = "Selecciona un estado valido.";
  if (record.recordatorio && !isValidDateTimeValue(record.recordatorio)) errors.recordatorio = "Ingresa una fecha y hora valida para el recordatorio.";
  if (record.customerId && !getCustomerById(record.customerId)) errors.customerId = "Selecciona un cliente existente.";
  if (record.operationId && !getOperationById(record.operationId)) errors.operationId = "Selecciona una operacion existente.";

  return errors;
}

export function validateCustomerRecord(record) {
  const errors = {};
  const telefono = String(record.telefono || "").trim();
  const email = String(record.email || "").trim();

  if (!hasValidText(record.nombre)) errors.nombre = "Ingresa el nombre del cliente.";
  if (!hasValidText(record.empresa)) errors.empresa = "Ingresa la empresa o razon social.";
  if (!hasValidText(record.contactoPrincipal)) errors.contactoPrincipal = "Ingresa un contacto principal.";
  if (!telefono && !email) errors.telefono = "Ingresa telefono o email de contacto.";
  if (email && !isValidEmail(email)) errors.email = "Ingresa un email valido.";
  if (!hasValidText(record.ciudad)) errors.ciudad = "Ingresa la ciudad.";
  if (!hasValidText(record.pais)) errors.pais = "Ingresa el pais.";
  if (!isAllowedValue(record.tipoCliente, CUSTOMER_TYPES)) errors.tipoCliente = "Selecciona un tipo de cliente valido.";

  return errors;
}

export function validateProviderRecord(record) {
  const errors = {};
  const telefono = String(record.telefono || "").trim();
  const email = String(record.email || "").trim();
  const tipoUnidad = normalizeProviderUnitType(record.tipoUnidad);
  const disponibilidad = normalizeProviderAvailability(record.disponibilidad);
  const rutasCobertura = normalizeProviderCoverage(record.rutasCobertura);

  if (!hasValidText(record.nombre)) errors.nombre = "Ingresa el nombre del proveedor.";
  if (!hasValidText(record.contacto)) errors.contacto = "Ingresa un contacto principal.";
  if (!telefono && !email) errors.telefono = "Ingresa telefono o email de contacto.";
  if (email && !isValidEmail(email)) errors.email = "Ingresa un email valido.";
  if (!isAllowedValue(tipoUnidad, PROVIDER_UNIT_TYPE_LABELS)) errors.tipoUnidad = "Selecciona un tipo de unidad valido.";
  if (!hasValidText(record.configuracion)) errors.configuracion = "Ingresa la configuracion de la unidad.";
  if (!rutasCobertura.length) errors.rutasCobertura = "Selecciona al menos una ruta o cobertura.";
  if (rutasCobertura.some((item) => !PROVIDER_COVERAGE_OPTIONS.includes(item))) errors.rutasCobertura = "Selecciona rutas validas.";
  if (!hasValidText(record.apertura)) errors.apertura = "Describe la apertura o acceso.";
  if (!hasValidText(record.usoTipico)) errors.usoTipico = "Describe el uso tipico.";
  if (!hasValidText(record.pais)) errors.pais = "Ingresa el pais.";
  if (!isAllowedValue(disponibilidad, PROVIDER_AVAILABILITY)) errors.disponibilidad = "Selecciona una disponibilidad valida.";
  if (record.pais && !isAllowedValue(record.pais, COUNTRIES)) errors.pais = "Selecciona un pais valido.";

  return errors;
}

export function validateOperationRecord(record) {
  const errors = {};
  const customerId = String(record.clientId || record.customerId || "").trim();

  if (!hasValidText(customerId)) errors.clientId = "Selecciona un cliente.";
  if (!hasValidText(record.tipoOperacion)) errors.tipoOperacion = "Selecciona el tipo de operacion.";
  if (!isAllowedValue(record.tipoOperacion, OPERATION_TYPES)) errors.tipoOperacion = "Selecciona un tipo de operacion valido.";
  if (!hasValidText(record.referencia)) errors.referencia = "Ingresa la referencia de la operacion.";
  if (!hasValidText(record.contenedor)) errors.contenedor = "Ingresa el contenedor.";
  if (!hasValidText(record.origen)) errors.origen = "Ingresa el origen.";
  if (!hasValidText(record.destino)) errors.destino = "Ingresa el destino.";
  if (!isAllowedValue(record.estadoOperacion, OPERATION_WORKFLOW_STATES)) errors.estadoOperacion = "Selecciona un estado valido.";
  if (!isAllowedValue(record.riesgo, OPERATION_RISK_LEVELS)) errors.riesgo = "Selecciona un nivel de riesgo valido.";
  if (record.fechaArribo && !isValidDateValue(record.fechaArribo)) errors.fechaArribo = "Ingresa una fecha de arribo valida.";
  if (record.fechaCarga && !isValidDateValue(record.fechaCarga)) errors.fechaCarga = "Ingresa una fecha de carga valida.";
  if (record.fechaDevolucion && !isValidDateValue(record.fechaDevolucion)) errors.fechaDevolucion = "Ingresa una fecha de devolucion valida.";
  if (customerId && !getCustomerById(customerId)) errors.clientId = "Selecciona un cliente existente.";

  return errors;
}

export function upsertCrmRecord(record) {
  const existing = state.crm.find((item) => item.id === record.id);
  const wasUpdate = Boolean(existing);
  const normalized = normalizeRecord({
    ...record,
    createdAt: record.createdAt || existing?.createdAt || new Date().toISOString(),
    customerId: record.customerId || findCustomerIdByCompany(record.empresa) || buildId("cus"),
    updatedAt: new Date().toISOString()
  }, "crm");

  const index = state.crm.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.crm[index] = { ...state.crm[index], ...normalized };
  } else {
    state.crm.unshift(normalized);
  }

  syncCustomerFromCrm(normalized);
  appendActivityEntry({
    type: wasUpdate ? "crm.updated" : "crm.created",
    label: "CRM",
    tone: "info",
    customerId: normalized.customerId,
    entityKind: "crm",
    entityId: normalized.id,
    title: wasUpdate ? "CRM actualizado" : "CRM creado",
    details: `${normalized.empresa || normalized.nombre || "Sin empresa"} | ${normalized.etapa || "Sin etapa"}`
  });
  saveState();
  return normalized;
}

export function upsertQuoteRecord(record) {
  const existing = state.quotes.find((item) => item.id === record.id);
  const wasUpdate = Boolean(existing);
  const normalized = normalizeRecord({
    ...record,
    createdAt: record.createdAt || existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, "quote");

  const index = state.quotes.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.quotes[index] = { ...state.quotes[index], ...normalized };
  } else {
    state.quotes.unshift(normalized);
  }

  normalized.calculation = calculateQuote(normalized);
  if (index >= 0) {
    state.quotes[index].calculation = normalized.calculation;
  }

  if (existing?.customerId && existing.customerId !== normalized.customerId) {
    const previousCustomer = getCustomerById(existing.customerId);
    if (previousCustomer) {
      previousCustomer.cotizacionesAsociadas = (previousCustomer.cotizacionesAsociadas || []).filter((quoteId) => quoteId !== normalized.id);
      previousCustomer.updatedAt = new Date().toISOString();
    }
  }

  if (normalized.customerId) {
    const customer = getCustomerById(normalized.customerId);
    if (customer) {
      const quotes = new Set(customer.cotizacionesAsociadas || []);
      quotes.add(normalized.id);
      customer.cotizacionesAsociadas = Array.from(quotes);
      customer.updatedAt = new Date().toISOString();
      const calc = normalized.calculation || calculateQuote(normalized);
      appendCustomerHistoryEntry(
        customer.id,
        `${wasUpdate ? "Cotizacion actualizada" : "Cotizacion creada"}: ${formatMoneyLabel(calc.suggestedPrice, calc.currency)} | ${normalized.paisOrigen || "Origen"} -> ${normalized.paisDestino || "Destino"}`,
        normalized.updatedAt
      );
    }
  }

  const calc = normalized.calculation || calculateQuote(normalized);
  appendActivityEntry({
    type: wasUpdate ? "quote.updated" : "quote.created",
    label: "Cotizacion",
    tone: "accent",
    customerId: normalized.customerId,
    entityKind: "quote",
    entityId: normalized.id,
    title: wasUpdate ? "Cotizacion actualizada" : "Cotizacion creada",
    details: `${normalized.paisOrigen || "Origen"} -> ${normalized.paisDestino || "Destino"} | ${formatMoneyLabel(calc.suggestedPrice, calc.currency)}`
  });
  saveState();
  return normalized;
}

export function upsertTaskRecord(record) {
  const existing = state.agenda.find((item) => item.id === record.id);
  const wasUpdate = Boolean(existing);
  const normalized = normalizeRecord({
    ...record,
    createdAt: record.createdAt || existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, "task");

  const index = state.agenda.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.agenda[index] = { ...state.agenda[index], ...normalized };
  } else {
    state.agenda.unshift(normalized);
  }

  if (normalized.customerId) {
    appendCustomerHistoryEntry(
      normalized.customerId,
      `${wasUpdate ? "Tarea actualizada" : "Tarea creada"}: ${normalized.tarea || "Sin detalle"} | ${normalized.estado || "Pendiente"} | ${normalized.fechaCompromiso || "Sin fecha"}`,
      normalized.updatedAt
    );
  }

  appendActivityEntry({
    type: normalized.estado === "Hecha" && wasUpdate ? "task.completed" : wasUpdate ? "task.updated" : "task.created",
    label: "Tarea",
    tone: normalized.estado === "Hecha" ? "success" : normalized.prioridad === "Alta" ? "danger" : "warning",
    customerId: normalized.customerId,
    operationId: normalized.operationId || "",
    entityKind: "task",
    entityId: normalized.id,
    title: normalized.estado === "Hecha" && wasUpdate ? "Tarea completada" : wasUpdate ? "Tarea actualizada" : "Tarea creada",
    details: `${normalized.tarea || "Sin tarea"} | ${normalized.estado || "Pendiente"} | ${normalized.fechaCompromiso || "Sin fecha"}`
  });

  if (normalized.operationId && (!wasUpdate || existing?.operationId !== normalized.operationId)) {
    const operation = getOperationById(normalized.operationId);
    appendActivityEntry({
      type: "task.operation-linked",
      label: "Tarea",
      tone: "info",
      customerId: normalized.customerId,
      operationId: normalized.operationId,
      entityKind: "operation",
      entityId: normalized.operationId,
      title: "Tarea vinculada a operacion",
      details: `${normalized.tarea || "Sin tarea"} | ${operation?.referencia || operation?.contenedor || normalized.operationId}`
    });
  }
  saveState();
  return normalized;
}

export function upsertCustomerRecord(record, options = {}) {
  const existing = state.customers.find((item) => item.id === record.id);
  const wasUpdate = Boolean(existing);
  const normalized = normalizeRecord({
    ...record,
    createdAt: record.createdAt || existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, "customer");

  const index = state.customers.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.customers[index] = { ...state.customers[index], ...normalized };
  } else {
    state.customers.unshift(normalized);
  }

  if (options.historyNote) {
    appendCustomerHistoryEntry(normalized.id, options.historyNote, normalized.updatedAt);
  } else if (!options.skipHistory) {
    appendCustomerHistoryEntry(
      normalized.id,
      `${wasUpdate ? "Ficha actualizada" : "Ficha creada"}: ${normalized.empresa || normalized.nombre || "Cliente"}`,
      normalized.updatedAt
    );
  }

  if (options.logActivity !== false) {
    appendActivityEntry({
      type: wasUpdate ? "customer.updated" : "customer.created",
      label: "Cliente",
      tone: "primary",
      customerId: normalized.id,
      entityKind: "customer",
      entityId: normalized.id,
      title: wasUpdate ? "Ficha de cliente actualizada" : "Ficha de cliente creada",
      details: `${normalized.empresa || normalized.nombre || "Sin nombre"} | ${normalized.tipoCliente || "Sin tipo"}`
    });
  }

  saveState();
  return normalized;
}

export function upsertProviderRecord(record, options = {}) {
  const existing = state.providers.find((item) => item.id === record.id);
  const wasUpdate = Boolean(existing);
  const normalized = normalizeProviderRecord({
    ...record,
    createdAt: record.createdAt || existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const index = state.providers.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.providers[index] = { ...state.providers[index], ...normalized };
  } else {
    state.providers.unshift(normalized);
  }

  if (options.historyNote) {
    appendActivityEntry({
      type: wasUpdate ? "provider.updated" : "provider.created",
      label: "Proveedor",
      tone: "info",
      entityKind: "provider",
      entityId: normalized.id,
      title: wasUpdate ? "Proveedor actualizado" : "Proveedor creado",
      details: `${normalized.nombre || "Sin nombre"} | ${options.historyNote}`
    });
  } else {
    appendActivityEntry({
      type: wasUpdate ? "provider.updated" : "provider.created",
      label: "Proveedor",
      tone: "info",
      entityKind: "provider",
      entityId: normalized.id,
      title: wasUpdate ? "Proveedor actualizado" : "Proveedor creado",
      details: `${normalized.nombre || "Sin nombre"} | ${normalized.tipoUnidad || "Sin tipo"} | ${normalized.configuracion || "Sin configuracion"}`
    });
  }

  saveState();
  return normalized;
}

export function getOperationById(id) {
  return state.operations.find((item) => item.id === id) || null;
}

export function listOperationRecords() {
  return [...state.operations]
    .sort((left, right) => {
      const scoreDiff = operationSortScore(left) - operationSortScore(right);
      if (scoreDiff !== 0) return scoreDiff;
      return (right.updatedAt || "").localeCompare(left.updatedAt || "");
    });
}

export function getOperationChecklistProgress(operation) {
  const checklist = normalizeOperationChecklist(operation?.documentChecklist);
  const completed = OPERATION_CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length;
  const total = OPERATION_CHECKLIST_ITEMS.length;
  return {
    completed,
    total,
    pending: total - completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
    checklist
  };
}

export function getOperationAlerts(operation) {
  if (!operation) return [];

  const alerts = [];
  const checklist = normalizeOperationChecklist(operation.documentChecklist);
  const stage = operation.estadoOperacion || "";
  const isClosed = stage === "Cerrado";
  const todayStart = getTodayStartMs();
  const arrivalMs = getDateValueMs(operation.fechaArribo);
  const returnMs = getDateValueMs(operation.fechaDevolucion);

  if (stage !== "Cerrado" && operation.fechaArribo) {
    if (!Number.isNaN(arrivalMs) && arrivalMs < todayStart) {
      alerts.push({
        type: "arrival.due",
        label: "Arribo vencido",
        tone: "danger",
        title: "Arribo vencido",
        details: `${operation.referencia || operation.contenedor || "Operacion"} | ${operation.fechaArribo}`,
        at: `${operation.fechaArribo}T09:00:00.000Z`,
        operationId: operation.id,
        customerId: operation.clientId || ""
      });
    } else if (!Number.isNaN(arrivalMs) && arrivalMs === todayStart) {
      alerts.push({
        type: "arrival.today",
        label: "Arribo hoy",
        tone: "warning",
        title: "Arribo hoy",
        details: `${operation.referencia || operation.contenedor || "Operacion"} | ${operation.fechaArribo}`,
        at: `${operation.fechaArribo}T09:00:00.000Z`,
        operationId: operation.id,
        customerId: operation.clientId || ""
      });
    } else if (isDateWithinDays(operation.fechaArribo, 3)) {
      alerts.push({
        type: "arrival.due",
        label: "Arribo proximo",
        tone: "warning",
        title: "Arribo proximo",
        details: `${operation.referencia || operation.contenedor || "Operacion"} | ${operation.fechaArribo}`,
        at: `${operation.fechaArribo}T09:00:00.000Z`,
        operationId: operation.id,
        customerId: operation.clientId || ""
      });
    }
  }

  if (!isClosed && isOperationStageAtOrAfter(stage, "Arribo detectado") && !checklist.previsionCamion) {
    alerts.push({
      type: "truck.missing",
      label: "Camion pendiente",
      tone: "warning",
      title: "Falta previsión de camion",
      details: `${operation.referencia || operation.contenedor || "Operacion"} | ${operation.origen || "Origen"} -> ${operation.destino || "Destino"}`,
      at: operation.updatedAt || operation.createdAt || new Date().toISOString(),
      operationId: operation.id,
      customerId: operation.clientId || ""
    });
  }

  if (!isClosed && isOperationStageAtOrAfter(stage, "Documentacion preliminar") && (!checklist.ncm || !checklist.valorSeguro)) {
    alerts.push({
      type: "docs.ncm-insurance",
      label: "NCM / seguro",
      tone: "danger",
      title: "Falta NCM o valor de seguro",
      details: `${operation.referencia || operation.contenedor || "Operacion"} | documentos preliminares incompletos`,
      at: operation.updatedAt || operation.createdAt || new Date().toISOString(),
      operationId: operation.id,
      customerId: operation.clientId || ""
    });
  }

  if (!isClosed && isOperationStageAtOrAfter(stage, "Esperando NCM/seguro") && !checklist.dua) {
    alerts.push({
      type: "docs.dua",
      label: "DUA pendiente",
      tone: "warning",
      title: "Falta DUA",
      details: `${operation.referencia || operation.contenedor || "Operacion"} | avanzar a documentacion definitiva`,
      at: operation.updatedAt || operation.createdAt || new Date().toISOString(),
      operationId: operation.id,
      customerId: operation.clientId || ""
    });
  }

  if (operation.fechaDevolucion && !isClosed) {
    if (!Number.isNaN(returnMs) && returnMs < todayStart) {
      alerts.push({
        type: "return.overdue",
        label: "Devolucion vencida",
        tone: "danger",
        title: "Devolucion vencida",
        details: `${operation.referencia || operation.contenedor || "Operacion"} | ${operation.fechaDevolucion}`,
        at: `${operation.fechaDevolucion}T09:00:00.000Z`,
        operationId: operation.id,
        customerId: operation.clientId || ""
      });
    } else if (!Number.isNaN(returnMs) && returnMs === todayStart) {
      alerts.push({
        type: "return.today",
        label: "Devolucion hoy",
        tone: "warning",
        title: "Devolucion hoy",
        details: `${operation.referencia || operation.contenedor || "Operacion"} | ${operation.fechaDevolucion}`,
        at: `${operation.fechaDevolucion}T09:00:00.000Z`,
        operationId: operation.id,
        customerId: operation.clientId || ""
      });
    } else if (isDateWithinDays(operation.fechaDevolucion, 3)) {
      alerts.push({
        type: "return.due",
        label: "Devolucion proxima",
        tone: "warning",
        title: "Devolucion proxima",
        details: `${operation.referencia || operation.contenedor || "Operacion"} | ${operation.fechaDevolucion}`,
        at: `${operation.fechaDevolucion}T09:00:00.000Z`,
        operationId: operation.id,
        customerId: operation.clientId || ""
      });
    }
  }

  if (!isClosed && (stage === "En riesgo" || operation.riesgo === "Alto")) {
    alerts.push({
      type: "risk.high",
      label: "En riesgo",
      tone: "danger",
      title: "Operacion en riesgo",
      details: `${operation.referencia || operation.contenedor || "Operacion"} | ${operation.riesgo || "Sin riesgo"} | ${operation.observaciones || "Sin observaciones"}`,
      at: operation.updatedAt || operation.createdAt || new Date().toISOString(),
      operationId: operation.id,
      customerId: operation.clientId || ""
    });
  }

  return alerts;
}

export function upsertOperationRecord(record) {
  const existing = state.operations.find((item) => item.id === record.id);
  const wasUpdate = Boolean(existing);
  const normalized = normalizeOperationRecord({
    ...(existing || {}),
    ...record,
    createdAt: record.createdAt || existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const index = state.operations.findIndex((item) => item.id === normalized.id);
  if (index >= 0) {
    state.operations[index] = { ...state.operations[index], ...normalized };
  } else {
    state.operations.unshift(normalized);
  }

  appendActivityEntry({
    type: wasUpdate ? "operation.updated" : "operation.created",
    label: "Operacion",
    tone: normalized.estadoOperacion === "En riesgo" ? "danger" : operationRiskTone(normalized.riesgo),
    customerId: normalized.clientId || "",
    operationId: normalized.id,
    entityKind: "operation",
    entityId: normalized.id,
    title: normalized.referencia || normalized.contenedor || "Operacion",
    details: `${normalized.origen || "Origen"} -> ${normalized.destino || "Destino"} | ${normalized.estadoOperacion || "Sin estado"} | ${normalized.riesgo || "Sin riesgo"}`
  });

  if (wasUpdate && existing?.estadoOperacion !== normalized.estadoOperacion) {
    appendActivityEntry({
      type: normalized.estadoOperacion === "Cerrado" ? "operation.closed" : "operation.status-changed",
      label: "Operacion",
      tone: normalized.estadoOperacion === "Cerrado" ? "success" : normalized.estadoOperacion === "En riesgo" ? "danger" : "info",
      customerId: normalized.clientId || "",
      operationId: normalized.id,
      entityKind: "operation",
      entityId: normalized.id,
      title: normalized.estadoOperacion === "Cerrado" ? "Operacion cerrada" : "Estado de operacion actualizado",
      details: `${existing?.estadoOperacion || "Sin estado"} -> ${normalized.estadoOperacion || "Sin estado"} | ${normalized.referencia || normalized.contenedor || normalized.id}`
    });
  }

  if (wasUpdate) {
    const previousChecklist = normalizeOperationChecklist(existing?.documentChecklist);
    const currentChecklist = normalizeOperationChecklist(normalized.documentChecklist);
    const changedItems = OPERATION_CHECKLIST_ITEMS
      .filter((item) => previousChecklist[item.key] !== currentChecklist[item.key])
      .map((item) => `${item.label}: ${currentChecklist[item.key] ? "completo" : "pendiente"}`);

    if (changedItems.length) {
      appendActivityEntry({
        type: "operation.checklist-updated",
        label: "Checklist",
        tone: "warning",
        customerId: normalized.clientId || "",
        operationId: normalized.id,
        entityKind: "operation",
        entityId: normalized.id,
        title: "Checklist documental actualizado",
        details: changedItems.join(" | ")
      });
    }
  }

  createAutomaticFollowUpsForOperation(normalized, existing);

  saveState();
  return normalized;
}

export function syncCustomerFromCrm(crmRecord) {
  const existing = getCustomerById(crmRecord.customerId) || {
    id: crmRecord.customerId,
    contactos: [],
    historialComercial: [],
    cotizacionesAsociadas: [],
    incidencias: [],
    condicionesPactadas: "",
    observacionesClave: ""
  };

  const primaryContact = {
    nombre: crmRecord.contacto || existing.contactoPrincipal || "",
    cargo: "Contacto principal",
    telefono: crmRecord.telefono || existing.telefono || "",
    email: crmRecord.email || existing.email || ""
  };

  const merged = {
    ...existing,
    id: crmRecord.customerId,
    nombre: crmRecord.nombre || existing.nombre || crmRecord.empresa,
    empresa: crmRecord.empresa || existing.empresa || crmRecord.nombre,
    contactoPrincipal: primaryContact.nombre,
    telefono: primaryContact.telefono,
    email: primaryContact.email,
    tipoCliente: crmRecord.estadoCliente || existing.tipoCliente || "Prospecto",
    ciudad: existing.ciudad || "Montevideo",
    pais: existing.pais || "Uruguay",
    datosGenerales: existing.datosGenerales || "Ficha creada desde CRM V1.",
    contactos: existing.contactos && existing.contactos.length ? existing.contactos : [primaryContact],
    historialComercial: Array.isArray(existing.historialComercial) ? existing.historialComercial : [],
    cotizacionesAsociadas: Array.isArray(existing.cotizacionesAsociadas) ? existing.cotizacionesAsociadas : [],
    incidencias: Array.isArray(existing.incidencias) ? existing.incidencias : [],
    condicionesPactadas: existing.condicionesPactadas || "",
    observacionesClave: crmRecord.notas || existing.observacionesClave || "",
    updatedAt: new Date().toISOString()
  };

  upsertCustomerRecord(merged, {
    skipHistory: true,
    logActivity: false,
    historyNote: `CRM sincronizado: ${crmRecord.etapa || "Sin etapa"} | ${crmRecord.proximaAccion || "Sin proxima accion"}`
  });
  return merged;
}

export function getCrmById(id) {
  return state.crm.find((item) => item.id === id) || null;
}

export function getQuoteById(id) {
  return state.quotes.find((item) => item.id === id) || null;
}

export function getTaskById(id) {
  return state.agenda.find((item) => item.id === id) || null;
}

export function getCustomerById(id) {
  return state.customers.find((item) => item.id === id) || null;
}

export function getProviderById(id) {
  return state.providers.find((item) => item.id === id) || null;
}

export function findCustomerIdByCompany(company) {
  const normalized = normalizeText(company);
  const match = state.customers.find((item) => normalizeText(item.empresa) === normalized || normalizeText(item.nombre) === normalized);
  return match ? match.id : "";
}

export function listCrmRecords() {
  return [...state.crm].sort((left, right) => (right.updatedAt || right.createdAt).localeCompare(left.updatedAt || left.createdAt));
}

export function listQuoteRecords() {
  return [...state.quotes].sort((left, right) => (right.updatedAt || right.createdAt).localeCompare(left.updatedAt || left.createdAt));
}

export function listTaskRecords() {
  return [...state.agenda].sort((left, right) => {
    const leftScore = taskSortScore(left);
    const rightScore = taskSortScore(right);
    return leftScore - rightScore;
  });
}

export function listCustomerRecords() {
  return [...state.customers].sort((left, right) => normalizeText(left.empresa).localeCompare(normalizeText(right.empresa)));
}

export function listProviderRecords() {
  return [...state.providers].sort((left, right) => {
    const typeDiff = normalizeText(left.tipoUnidad).localeCompare(normalizeText(right.tipoUnidad));
    if (typeDiff !== 0) return typeDiff;
    return normalizeText(left.nombre).localeCompare(normalizeText(right.nombre));
  });
}

export function listActivityRecords() {
  return [...state.activityLog].sort((left, right) => (right.at || "").localeCompare(left.at || ""));
}

function toHistoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function mapActivityFromHistory(customer, item, index) {
  return normalizeActivityRecord({
    id: `${customer.id}-history-${index}`,
    type: "history.note",
    label: "Historial",
    tone: "neutral",
    customerId: customer.id,
    entityKind: "customer",
    entityId: customer.id,
    title: item.nota || "Nota comercial",
    details: item.nota || "",
    at: item.at || `${toHistoryDate(item.fecha)}T12:00:00.000Z`,
    source: "history"
  });
}

function mapActivityFromQuote(quote) {
  const calc = quote.calculation || calculateQuote(quote);
  return normalizeActivityRecord({
    id: `${quote.id}-summary`,
    type: "quote.summary",
    label: "Cotizacion",
    tone: "accent",
    customerId: quote.customerId || "",
    entityKind: "quote",
    entityId: quote.id,
    title: `Cotizacion ${formatMoneyLabel(calc.suggestedPrice, calc.currency)}`,
    details: `${quote.paisOrigen || "Origen"} -> ${quote.paisDestino || "Destino"} | ${quote.tipoOperacion || "Operacion"}`,
    at: quote.updatedAt || quote.createdAt || new Date().toISOString(),
    source: "derived"
  });
}

function mapActivityFromTask(task) {
  const operation = task.operationId ? getOperationById(task.operationId) : null;
  return normalizeActivityRecord({
    id: `${task.id}-summary`,
    type: task.estado === "Hecha" ? "task.completed" : "task.summary",
    label: "Tarea",
    tone: task.estado === "Hecha" ? "success" : task.prioridad === "Alta" ? "danger" : "warning",
    customerId: task.customerId || "",
    entityKind: "task",
    entityId: task.id,
    title: task.tarea || "Tarea",
    details: `${task.estado || "Pendiente"} | ${task.fechaCompromiso || "Sin fecha"}${operation ? ` | ${operation.referencia || operation.contenedor || "Operacion"}` : ""}`,
    at: task.updatedAt || task.createdAt || new Date().toISOString(),
    source: "derived"
  });
}

function mapActivityFromCrm(record) {
  return normalizeActivityRecord({
    id: `${record.id}-summary`,
    type: "crm.summary",
    label: "CRM",
    tone: "info",
    customerId: record.customerId || "",
    entityKind: "crm",
    entityId: record.id,
    title: record.proximaAccion || "Seguimiento comercial",
    details: `${record.empresa || record.nombre || "Sin cliente"} | ${record.etapa || "Sin etapa"}`,
    at: record.updatedAt || record.createdAt || new Date().toISOString(),
    source: "derived"
  });
}

export function getCustomerActivityFeed(customerId, limit = 12) {
  const customer = getCustomerById(customerId);
  if (!customer) return [];

  const items = [];
  const logEntries = listActivityRecords().filter((entry) => entry.customerId === customerId || entry.entityId === customerId);
  const historyItems = Array.isArray(customer.historialComercial) ? customer.historialComercial : [];
  items.push(...logEntries);
  items.push(...historyItems.map((item, index) => mapActivityFromHistory(customer, item, index)));
  items.push(...state.crm.filter((record) => record.customerId === customerId).map(mapActivityFromCrm));
  items.push(...state.quotes.filter((quote) => quote.customerId === customerId).map(mapActivityFromQuote));
  items.push(...state.agenda.filter((task) => task.customerId === customerId).map(mapActivityFromTask));

  const seen = new Set();
  return items
    .map((item) => normalizeActivityRecord(item))
    .filter((item) => {
      const key = [item.source, item.type, item.entityKind, item.entityId, item.title, item.details, item.at].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => (right.at || "").localeCompare(left.at || ""))
    .slice(0, limit);
}

export function getOperationActivityFeed(operationId, limit = 12) {
  if (!getOperationById(operationId)) return [];

  const items = listActivityRecords().filter((entry) => (
    entry.operationId === operationId
    || entry.entityId === operationId
    || (entry.entityKind === "operation" && entry.entityId === operationId)
  ));

  const seen = new Set();
  return items
    .map((item) => normalizeActivityRecord(item))
    .filter((item) => {
      const key = [item.source, item.type, item.entityKind, item.entityId, item.title, item.details, item.at].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => (right.at || "").localeCompare(left.at || ""))
    .slice(0, limit);
}

function taskSortScore(task) {
  const priorityScore = { Alta: 0, Media: 1, Baja: 2 }[task.prioridad] ?? 3;
  const statusScore = { Pendiente: 0, "En curso": 1, Hecha: 2 }[task.estado] ?? 3;
  const due = task.fechaCompromiso ? new Date(task.fechaCompromiso).getTime() : Number.MAX_SAFE_INTEGER;
  return priorityScore * 10_000_000 + statusScore * 100_000 + due;
}

export function getDashboardMetrics() {
  const crm = listCrmRecords();
  const quotes = listQuoteRecords();
  const tasks = listTaskRecords();
  const customers = listCustomerRecords();
  const providers = listProviderRecords();
  const operations = listOperationRecords();
  const overdueTasks = tasks.filter((task) => task.estado !== "Hecha" && isDateBeforeToday(task.fechaCompromiso)).length;
  const dueToday = tasks.filter((task) => task.estado !== "Hecha" && isToday(task.fechaCompromiso)).length;
  const openCrm = crm.filter((item) => item.etapa !== "Cliente").length;
  const activeCustomers = customers.filter((item) => item.tipoCliente === "Activo" || item.tipoCliente === "Cliente").length;
  const openOperations = operations.filter((operation) => operation.estadoOperacion !== "Cerrado").length;
  const closedOperations = operations.filter((operation) => operation.estadoOperacion === "Cerrado").length;
  const atRiskOperations = operations.filter((operation) => operation.estadoOperacion === "En riesgo" || operation.riesgo === "Alto").length;
  const operationAlerts = operations
    .flatMap((operation) => getOperationAlerts(operation))
    .sort((left, right) => {
      const toneRank = { danger: 0, warning: 1, info: 2, success: 3, neutral: 4 };
      const toneDiff = (toneRank[left.tone] ?? 4) - (toneRank[right.tone] ?? 4);
      if (toneDiff !== 0) return toneDiff;
      return (left.at || "").localeCompare(right.at || "");
    });
  const pipeline = CRM_STAGES.map((stage) => ({
    stage,
    count: crm.filter((item) => item.etapa === stage).length
  }));

  return {
    crmCount: crm.length,
    openCrm,
    quoteCount: quotes.length,
    taskCount: tasks.filter((task) => task.estado !== "Hecha").length,
    activeCustomers,
    operationCount: operations.length,
    providerCount: providers.length,
    openOperations,
    closedOperations,
    atRiskOperations,
    overdueTasks,
    dueToday,
    operationAlerts,
    pipeline,
    recentQuotes: quotes.slice(0, 4),
    urgentTasks: tasks.filter((task) => task.estado !== "Hecha").slice(0, 5),
    followUps: crm.filter((item) => item.fechaSeguimiento).slice(0, 5)
  };
}

export function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isToday(dateValue) {
  if (!dateValue) return false;
  const date = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isDateBeforeToday(dateValue) {
  if (!dateValue) return false;
  const date = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  return date.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}
