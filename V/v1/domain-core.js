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

let domainResolvers = {
  getCustomerById: () => null,
  getOperationById: () => null,
  getExchangeRateUyu: () => 1
};

export function bindDomainResolvers(resolvers = {}) {
  domainResolvers = {
    ...domainResolvers,
    ...resolvers
  };
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

export function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
  const explicitExchangeRate = toNumber(input.exchangeRate || input.tipoCambio);
  const exchangeRate = explicitExchangeRate > 0
    ? Math.max(1, explicitExchangeRate)
    : Math.max(1, toNumber(domainResolvers.getExchangeRateUyu?.()) || 1);
  const providerCost = roundMoney(toNumber(input.providerCost || input.costoProveedor));
  const additionalExpenses = roundMoney(toNumber(input.additionalExpenses || input.gastosAdicionales));
  const insurance = roundMoney(toNumber(input.insurance || input.seguro));
  const extraHours = roundMoney(toNumber(input.extraHours || input.horasExtra));
  const customsStayDays = roundMoney(toNumber(input.customsStayDays || input.estadiaAduanaDias));
  const marginPct = Math.max(0, toNumber(input.marginPct || input.margenPct) || QUOTE_DEFAULT_MARGIN);
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

export function normalizeRecord(record, kind) {
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

export function normalizeActivityRecord(record) {
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

export function normalizeOperationChecklist(checklist) {
  const source = checklist && typeof checklist === "object" ? checklist : {};
  return OPERATION_CHECKLIST_ITEMS.reduce((acc, item) => {
    acc[item.key] = Boolean(source[item.key]);
    return acc;
  }, {});
}

export function normalizeOperationRecord(record) {
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
  normalized.documents = Array.isArray(normalized.documents) ? normalized.documents : [];
  return normalized;
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

function getOperationStageIndex(stage) {
  return OPERATION_WORKFLOW_STATES.indexOf(stage);
}

function isOperationStageAtOrAfter(stage, targetStage) {
  const stageIndex = getOperationStageIndex(stage);
  const targetIndex = getOperationStageIndex(targetStage);
  return stageIndex >= 0 && targetIndex >= 0 && stageIndex >= targetIndex;
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
  if (record.customerId && !domainResolvers.getCustomerById(record.customerId)) errors.customerId = "Selecciona un cliente existente.";

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
  if (record.customerId && !domainResolvers.getCustomerById(record.customerId)) errors.customerId = "Selecciona un cliente existente.";
  if (record.operationId && !domainResolvers.getOperationById(record.operationId)) errors.operationId = "Selecciona una operacion existente.";

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

export function validateProviderRecord(record) {
  const errors = {};
  const telefono = String(record.telefono || "").trim();
  const email = String(record.email || "").trim();
  const tipoUnidad = normalizeProviderUnitType(record.tipoUnidad);
  const disponibilidad = normalizeProviderAvailability(record.disponibilidad);
  const rutasCobertura = Array.isArray(record.rutasCobertura)
    ? record.rutasCobertura
    : String(record.rutasCobertura || "")
        .split(",")
        .map((item) => String(item || "").trim())
        .filter(Boolean);

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
  if (customerId && !domainResolvers.getCustomerById(customerId)) errors.clientId = "Selecciona un cliente existente.";

  return errors;
}

export function taskSortScore(task) {
  const priorityScore = { Alta: 0, Media: 1, Baja: 2 }[task.prioridad] ?? 3;
  const statusScore = { Pendiente: 0, "En curso": 1, Hecha: 2 }[task.estado] ?? 3;
  const due = task.fechaCompromiso ? new Date(task.fechaCompromiso).getTime() : Number.MAX_SAFE_INTEGER;
  return priorityScore * 10_000_000 + statusScore * 100_000 + due;
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
    at: item.at || `${formatHistoryDate(item.fecha)}T12:00:00.000Z`,
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
  const operation = task.operationId ? domainResolvers.getOperationById(task.operationId) : null;
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
