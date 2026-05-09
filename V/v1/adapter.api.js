import {
  DOMAIN_VERSION,
  ENTITY_CONTRACTS,
  FIELD_ALIASES,
  getEntityContract,
  OPERATION_CHECKLIST_ITEMS
} from "./domain-contract.js";

export const API_VERSION = "v1";
export const API_BASE_PATH = "/api/v1";
export const API_ENVELOPE_VERSION = 1;
export const API_DEFAULT_LIMIT = 50;

export const API_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",
  SYNC_CONFLICT: "SYNC_CONFLICT",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  TRANSPORT_UNAVAILABLE: "TRANSPORT_UNAVAILABLE",
  UNKNOWN: "UNKNOWN"
};

export const ENTITY_SYNC_ORDER = ["customer", "operation", "quote", "task", "activity"];

export const API_ENTITY_PATHS = {
  customer: "/customers",
  quote: "/quotes",
  task: "/tasks",
  activity: "/activities",
  operation: "/operations"
};

export const SYNC_DIRECTIONS = {
  customer: "bidirectional",
  quote: "bidirectional",
  task: "bidirectional",
  activity: "append-only",
  operation: "bidirectional"
};

const CUSTOMER_WRITE_FIELDS = [
  "id",
  "nombre",
  "empresa",
  "contactoPrincipal",
  "telefono",
  "email",
  "tipoCliente",
  "ciudad",
  "pais",
  "datosGenerales",
  "contactos",
  "historialComercial",
  "cotizacionesAsociadas",
  "incidencias",
  "condicionesPactadas",
  "observacionesClave",
  "createdAt",
  "updatedAt",
  "archivedAt"
];

const QUOTE_WRITE_FIELDS = [
  "id",
  "customerId",
  "cliente",
  "origen",
  "destino",
  "paisOrigen",
  "paisDestino",
  "tipoOperacion",
  "modoTransporte",
  "proveedor",
  "costoProveedor",
  "gastosAdicionales",
  "seguro",
  "horasExtra",
  "estadiaAduanaDias",
  "margenPct",
  "moneda",
  "tipoCambio",
  "observaciones",
  "estado",
  "createdAt",
  "updatedAt",
  "archivedAt"
];

const TASK_WRITE_FIELDS = [
  "id",
  "customerId",
  "operationId",
  "cliente",
  "tarea",
  "prioridad",
  "fechaCompromiso",
  "recordatorio",
  "estado",
  "observaciones",
  "createdAt",
  "updatedAt",
  "archivedAt"
];

const ACTIVITY_WRITE_FIELDS = [
  "id",
  "at",
  "type",
  "label",
  "tone",
  "title",
  "details",
  "customerId",
  "entityKind",
  "entityId",
  "operationId",
  "source",
  "metadata",
  "createdAt",
  "updatedAt"
];

const OPERATION_WRITE_FIELDS = [
  "id",
  "customerId",
  "tipoOperacion",
  "referencia",
  "contenedor",
  "dua",
  "duaNumber",
  "origen",
  "destino",
  "fechaArribo",
  "fechaCarga",
  "fechaDevolucion",
  "poloLogistico",
  "despachanteUY",
  "despachantePY",
  "providerId",
  "providerName",
  "brokerId",
  "brokerName",
  "brokerRole",
  "responsibleContactId",
  "responsibleContactName",
  "responsibleContactPhone",
  "responsibleContactEmail",
  "fleetUnitId",
  "fleetUnitLabel",
  "fleetLocation",
  "fleetStatus",
  "fleetAvailableAt",
  "expectedFinishAt",
  "documents",
  "estadoOperacion",
  "riesgo",
  "observaciones",
  "documentChecklist",
  "createdAt",
  "updatedAt",
  "archivedAt"
];

const ENTITY_SYNC_CONFIG = {
  customer: {
    entityKind: "customer",
    syncDirection: SYNC_DIRECTIONS.customer,
    localIdPrefix: "cus-",
    canonicalIdField: "id",
    localAliasFields: [],
    apiAliasFields: [],
    writeFields: CUSTOMER_WRITE_FIELDS,
    sourceOfTruthFields: CUSTOMER_WRITE_FIELDS,
    derivedFields: [],
    listFilters: ["q", "tipoCliente", "updatedAfter", "archived", "limit", "cursor"],
    endpoints: {
      collection: "/customers",
      item: "/customers/{id}",
      changes: "/customers/changes",
      sync: "/customers/sync",
      archive: "/customers/{id}/archive",
      unarchive: "/customers/{id}/unarchive"
    },
    methods: {
      create: "POST",
      update: "PATCH",
      getById: "GET",
      list: "GET",
      archive: "POST",
      unarchive: "POST",
      changes: "GET",
      sync: "POST"
    },
    supportsArchive: true,
    supportsUpdate: true,
    supportsDelete: false,
    supportsSync: true,
    conflictPolicy: "last-write-wins-by-updatedAt",
    timestampPolicy: {
      createdAt: "immutable-origin",
      updatedAt: "sync-cursor",
      archivedAt: "soft-delete-marker"
    }
  },
  quote: {
    entityKind: "quote",
    syncDirection: SYNC_DIRECTIONS.quote,
    localIdPrefix: "quo-",
    canonicalIdField: "id",
    localAliasFields: [],
    apiAliasFields: [],
    writeFields: QUOTE_WRITE_FIELDS,
    sourceOfTruthFields: QUOTE_WRITE_FIELDS,
    derivedFields: ["calculation"],
    listFilters: ["q", "customerId", "paisOrigen", "paisDestino", "tipoOperacion", "moneda", "updatedAfter", "archived", "limit", "cursor"],
    endpoints: {
      collection: "/quotes",
      item: "/quotes/{id}",
      changes: "/quotes/changes",
      sync: "/quotes/sync",
      archive: "/quotes/{id}/archive",
      unarchive: "/quotes/{id}/unarchive"
    },
    methods: {
      create: "POST",
      update: "PATCH",
      getById: "GET",
      list: "GET",
      archive: "POST",
      unarchive: "POST",
      changes: "GET",
      sync: "POST"
    },
    supportsArchive: true,
    supportsUpdate: true,
    supportsDelete: false,
    supportsSync: true,
    conflictPolicy: "last-write-wins-by-updatedAt",
    timestampPolicy: {
      createdAt: "immutable-origin",
      updatedAt: "sync-cursor",
      archivedAt: "soft-delete-marker"
    }
  },
  task: {
    entityKind: "task",
    syncDirection: SYNC_DIRECTIONS.task,
    localIdPrefix: "task-",
    canonicalIdField: "id",
    localAliasFields: [],
    apiAliasFields: [],
    writeFields: TASK_WRITE_FIELDS,
    sourceOfTruthFields: TASK_WRITE_FIELDS,
    derivedFields: [],
    listFilters: ["q", "customerId", "operationId", "estado", "prioridad", "dueBefore", "dueAfter", "updatedAfter", "archived", "limit", "cursor"],
    endpoints: {
      collection: "/tasks",
      item: "/tasks/{id}",
      changes: "/tasks/changes",
      sync: "/tasks/sync",
      archive: "/tasks/{id}/archive",
      unarchive: "/tasks/{id}/unarchive"
    },
    methods: {
      create: "POST",
      update: "PATCH",
      getById: "GET",
      list: "GET",
      archive: "POST",
      unarchive: "POST",
      changes: "GET",
      sync: "POST"
    },
    supportsArchive: true,
    supportsUpdate: true,
    supportsDelete: false,
    supportsSync: true,
    conflictPolicy: "last-write-wins-by-updatedAt",
    timestampPolicy: {
      createdAt: "immutable-origin",
      updatedAt: "sync-cursor",
      archivedAt: "soft-delete-marker"
    }
  },
  activity: {
    entityKind: "activity",
    syncDirection: SYNC_DIRECTIONS.activity,
    localIdPrefix: "act-",
    canonicalIdField: "id",
    localAliasFields: [],
    apiAliasFields: [],
    writeFields: ACTIVITY_WRITE_FIELDS,
    sourceOfTruthFields: ACTIVITY_WRITE_FIELDS,
    derivedFields: [],
    listFilters: ["q", "customerId", "operationId", "entityKind", "entityId", "source", "since", "until", "limit", "cursor"],
    endpoints: {
      collection: "/activities",
      item: "/activities/{id}",
      changes: "/activities/changes",
      sync: "/activities/sync"
    },
    methods: {
      create: "POST",
      update: "NONE",
      getById: "GET",
      list: "GET",
      archive: "NONE",
      unarchive: "NONE",
      changes: "GET",
      sync: "POST"
    },
    supportsArchive: false,
    supportsUpdate: false,
    supportsDelete: false,
    supportsSync: true,
    appendOnly: true,
    conflictPolicy: "append-only",
    timestampPolicy: {
      at: "immutable-event-time",
      createdAt: "ingest-time",
      updatedAt: "ingest-time"
    }
  },
  operation: {
    entityKind: "operation",
    syncDirection: SYNC_DIRECTIONS.operation,
    localIdPrefix: "op-",
    canonicalIdField: "id",
    localAliasFields: ["clientId"],
    apiAliasFields: ["customerId"],
    writeFields: OPERATION_WRITE_FIELDS,
    sourceOfTruthFields: OPERATION_WRITE_FIELDS,
    derivedFields: ["checklistProgress", "alerts"],
    listFilters: ["q", "customerId", "dua", "duaNumber", "providerId", "brokerId", "tipoOperacion", "estadoOperacion", "riesgo", "dueBefore", "dueAfter", "updatedAfter", "archived", "limit", "cursor"],
    endpoints: {
      collection: "/operations",
      item: "/operations/{id}",
      changes: "/operations/changes",
      sync: "/operations/sync",
      archive: "/operations/{id}/archive",
      unarchive: "/operations/{id}/unarchive"
    },
    methods: {
      create: "POST",
      update: "PATCH",
      getById: "GET",
      list: "GET",
      archive: "POST",
      unarchive: "POST",
      changes: "GET",
      sync: "POST"
    },
    supportsArchive: true,
    supportsUpdate: true,
    supportsDelete: false,
    supportsSync: true,
    foreignKeyAlias: {
      local: "clientId",
      api: "customerId"
    },
    operationChecklistKeys: OPERATION_CHECKLIST_ITEMS.map((item) => item.key),
    conflictPolicy: "last-write-wins-by-updatedAt",
    timestampPolicy: {
      createdAt: "immutable-origin",
      updatedAt: "sync-cursor",
      archivedAt: "soft-delete-marker"
    }
  }
};

function cloneRecord(record) {
  return record && typeof record === "object" ? { ...record } : {};
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stripUndefined(record) {
  return Object.fromEntries(
    Object.entries(record || {}).filter(([, value]) => value !== undefined)
  );
}

function pickFields(record, fields) {
  const source = cloneRecord(record);
  const selection = {};
  for (const field of fields || []) {
    if (source[field] !== undefined) {
      selection[field] = source[field];
    }
  }
  return selection;
}

function copyStrategyConfig(entityKind, config) {
  return {
    entityKind,
    contract: getEntityContract(entityKind),
    syncDirection: config.syncDirection,
    localIdPrefix: config.localIdPrefix,
    canonicalIdField: config.canonicalIdField,
    localAliasFields: [...(config.localAliasFields || [])],
    apiAliasFields: [...(config.apiAliasFields || [])],
    writeFields: [...(config.writeFields || [])],
    sourceOfTruthFields: [...(config.sourceOfTruthFields || [])],
    derivedFields: [...(config.derivedFields || [])],
    listFilters: [...(config.listFilters || [])],
    endpoints: { ...(config.endpoints || {}) },
    methods: { ...(config.methods || {}) },
    supportsArchive: Boolean(config.supportsArchive),
    supportsUpdate: Boolean(config.supportsUpdate),
    supportsDelete: Boolean(config.supportsDelete),
    supportsSync: Boolean(config.supportsSync),
    appendOnly: Boolean(config.appendOnly),
    conflictPolicy: config.conflictPolicy || "last-write-wins",
    timestampPolicy: { ...(config.timestampPolicy || {}) },
    foreignKeyAlias: config.foreignKeyAlias ? { ...config.foreignKeyAlias } : null,
    operationChecklistKeys: [...(config.operationChecklistKeys || [])],
    fieldAliases: { ...(FIELD_ALIASES[entityKind] || {}) },
    idStrategy: config.idStrategy || "client-generated",
    responseShape: config.responseShape || "envelope"
  };
}

function getEntityConfig(entityKind) {
  return ENTITY_SYNC_CONFIG[entityKind] || null;
}

export function getEntitySyncStrategy(entityKind) {
  const config = getEntityConfig(entityKind);
  if (!config) {
    return null;
  }
  return copyStrategyConfig(entityKind, config);
}

export function getEntityEndpoints(entityKind) {
  const strategy = getEntitySyncStrategy(entityKind);
  if (!strategy) {
    return null;
  }

  return {
    basePath: API_BASE_PATH,
    collection: strategy.endpoints.collection,
    item: strategy.endpoints.item,
    changes: strategy.endpoints.changes || null,
    sync: strategy.endpoints.sync || null,
    archive: strategy.endpoints.archive || null,
    unarchive: strategy.endpoints.unarchive || null,
    collectionUrl: `${API_BASE_PATH}${strategy.endpoints.collection}`,
    itemUrl: `${API_BASE_PATH}${strategy.endpoints.item}`,
    changesUrl: strategy.endpoints.changes ? `${API_BASE_PATH}${strategy.endpoints.changes}` : null,
    syncUrl: strategy.endpoints.sync ? `${API_BASE_PATH}${strategy.endpoints.sync}` : null,
    archiveUrl: strategy.endpoints.archive ? `${API_BASE_PATH}${strategy.endpoints.archive}` : null,
    unarchiveUrl: strategy.endpoints.unarchive ? `${API_BASE_PATH}${strategy.endpoints.unarchive}` : null
  };
}

export function getEntitySyncFilters(entityKind) {
  const strategy = getEntitySyncStrategy(entityKind);
  return strategy ? [...strategy.listFilters] : [];
}

function normalizeOperationChecklist(checklist) {
  const source = Array.isArray(checklist)
    ? checklist.reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {})
    : isPlainObject(checklist)
      ? checklist
      : {};

  return OPERATION_CHECKLIST_ITEMS.reduce((acc, item) => {
    acc[item.key] = Boolean(source[item.key]);
    return acc;
  }, {});
}

function applyOperationAliases(record, direction = "toApi") {
  const payload = cloneRecord(record);
  const customerId = String(
    direction === "toApi"
      ? payload.clientId || payload.customerId || ""
      : payload.customerId || payload.clientId || ""
  ).trim();

  if (direction === "toApi") {
    if (customerId) {
      payload.customerId = customerId;
    }
    delete payload.clientId;
    return payload;
  }

  if (customerId) {
    payload.customerId = customerId;
    payload.clientId = customerId;
  }
  return payload;
}

function normalizeListQuery(entityKind, query = {}) {
  const strategy = getEntitySyncStrategy(entityKind);
  if (!strategy) {
    return {};
  }

  const allowed = new Set([...strategy.listFilters, "sort", "order"]);
  const normalized = {};

  for (const [key, value] of Object.entries(query || {})) {
    if (!allowed.has(key)) {
      continue;
    }
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (key === "limit") {
      const limit = Number(value);
      normalized.limit = Number.isFinite(limit) && limit > 0 ? Math.trunc(limit) : API_DEFAULT_LIMIT;
      continue;
    }
    if (typeof value === "string") {
      normalized[key] = value.trim();
      continue;
    }
    normalized[key] = value;
  }

  if (!normalized.limit) {
    normalized.limit = API_DEFAULT_LIMIT;
  }

  return normalized;
}

function replacePathParams(path, params = {}) {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, encodeURIComponent(String(value))),
    path
  );
}

function buildQueryString(query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      params.set(key, value.join(","));
      continue;
    }
    params.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function getActionMethod(strategy, action) {
  if (action === "sync") {
    return "POST";
  }
  if (action === "changes") {
    return "GET";
  }
  return strategy.methods[action] || "POST";
}

function getActionEndpoint(strategy, action, resourceId) {
  switch (action) {
    case "create":
    case "list":
      return strategy.endpoints.collection;
    case "getById":
    case "update":
      return replacePathParams(strategy.endpoints.item, { id: resourceId });
    case "archive":
      return replacePathParams(strategy.endpoints.archive || strategy.endpoints.item, { id: resourceId });
    case "unarchive":
      return replacePathParams(strategy.endpoints.unarchive || strategy.endpoints.item, { id: resourceId });
    case "changes":
      return strategy.endpoints.changes || strategy.endpoints.collection;
    case "sync":
      return strategy.endpoints.sync || strategy.endpoints.collection;
    default:
      throw new Error(`Unsupported API action: ${action}`);
  }
}

function decorateWriteBody(entityKind, action, body, options = {}) {
  const strategy = getEntitySyncStrategy(entityKind);
  const payload = cloneRecord(body);
  const now = options.now || new Date().toISOString();

  if (action === "create") {
    if (entityKind === "activity") {
      if (!payload.at) {
        payload.at = now;
      }
      if (!payload.createdAt) {
        payload.createdAt = payload.at;
      }
      if (!payload.updatedAt) {
        payload.updatedAt = payload.createdAt;
      }
    } else {
      if (!payload.createdAt) {
        payload.createdAt = now;
      }
      if (!payload.updatedAt) {
        payload.updatedAt = payload.createdAt;
      }
      if (strategy?.supportsArchive && payload.archivedAt === undefined) {
        payload.archivedAt = null;
      }
    }
  } else if (action === "update") {
    if (!payload.updatedAt) {
      payload.updatedAt = now;
    }
  } else if (action === "archive") {
    payload.archivedAt = payload.archivedAt ?? now;
    payload.updatedAt = payload.updatedAt || now;
  } else if (action === "unarchive") {
    payload.archivedAt = null;
    payload.updatedAt = payload.updatedAt || now;
  }

  return stripUndefined(payload);
}

function normalizeSyncPushBody(entityKind, changes = {}, options = {}) {
  const strategy = getEntitySyncStrategy(entityKind);
  const source = isPlainObject(changes) ? changes : { records: Array.isArray(changes) ? changes : [] };
  const now = options.now || new Date().toISOString();

  if (strategy?.appendOnly) {
    const records = Array.isArray(source.records)
      ? source.records
      : Array.isArray(source.upserts)
        ? source.upserts
        : [];

    return {
      entityKind,
      mode: "push",
      baseVersion: DOMAIN_VERSION,
      cursor: source.cursor || options.cursor || null,
      source: options.source || "local-first",
      records: records.map((record) => decorateWriteBody(entityKind, "create", toApiPayload(entityKind, record), { now }))
    };
  }

  const upserts = Array.isArray(source.upserts)
    ? source.upserts
    : Array.isArray(source.records)
      ? source.records
      : [];
  const archives = Array.isArray(source.archives) ? source.archives : [];
  const unarchives = Array.isArray(source.unarchives) ? source.unarchives : [];

  return {
    entityKind,
    mode: "push",
    baseVersion: DOMAIN_VERSION,
    cursor: source.cursor || options.cursor || null,
    source: options.source || "local-first",
    upserts: upserts.map((record) => {
      const payload = decorateWriteBody(entityKind, "update", toApiPayload(entityKind, record), { now });
      if (payload.createdAt === undefined) {
        payload.createdAt = record?.createdAt || now;
      }
      if (payload.archivedAt === undefined && strategy?.supportsArchive) {
        payload.archivedAt = record?.archivedAt ?? null;
      }
      return stripUndefined(payload);
    }),
    archives: archives.map((entry) => {
      const payload = cloneRecord(entry);
      if (!payload.id && payload.recordId) {
        payload.id = payload.recordId;
      }
      if (payload.archivedAt === undefined || payload.archivedAt === "") {
        payload.archivedAt = now;
      }
      return pickFields(payload, ["id", "archivedAt", "updatedAt"]);
    }),
    unarchives: unarchives.map((entry) => {
      const payload = cloneRecord(entry);
      if (!payload.id && payload.recordId) {
        payload.id = payload.recordId;
      }
      payload.archivedAt = null;
      return pickFields(payload, ["id", "archivedAt", "updatedAt"]);
    })
  };
}

export function toApiPayload(entityKind, record) {
  const strategy = getEntitySyncStrategy(entityKind);
  const payload = cloneRecord(record);

  if (!strategy) {
    return stripUndefined(payload);
  }

  if (entityKind === "operation") {
    const mapped = applyOperationAliases(payload, "toApi");
    Object.assign(payload, mapped);
    if (payload.documentChecklist !== undefined) {
      payload.documentChecklist = normalizeOperationChecklist(payload.documentChecklist);
    }
  }

  return stripUndefined(pickFields(payload, strategy.writeFields));
}

export function fromApiPayload(entityKind, payload) {
  const strategy = getEntitySyncStrategy(entityKind);
  const record = cloneRecord(payload);

  if (!strategy) {
    return stripUndefined(record);
  }

  if (entityKind === "operation") {
    const mapped = applyOperationAliases(record, "fromApi");
    Object.assign(record, mapped);
    if (record.documentChecklist !== undefined) {
      record.documentChecklist = normalizeOperationChecklist(record.documentChecklist);
    }
  }

  return stripUndefined(record);
}

export function buildApiEnvelope(entityKind, action, record = {}, options = {}) {
  const strategy = getEntitySyncStrategy(entityKind);
  if (!strategy) {
    throw new Error(`Unsupported entityKind: ${entityKind}`);
  }

  const basePath = options.basePath || API_BASE_PATH;
  const resourceId = options.id || record?.id || null;
  const endpoint = getActionEndpoint(strategy, action, resourceId);
  const method = getActionMethod(strategy, action);
  const query = action === "list" || action === "changes"
    ? normalizeListQuery(entityKind, options.query || record?.query || {})
    : null;
  let body = null;

  if (action === "create" || action === "update") {
    body = decorateWriteBody(entityKind, action, toApiPayload(entityKind, record), options);
  } else if (action === "archive" || action === "unarchive") {
    const baseBody = toApiPayload(entityKind, record);
    body = decorateWriteBody(entityKind, action, baseBody, options);
    if (!body.id && resourceId) {
      body.id = resourceId;
    }
  } else if (action === "sync") {
    body = normalizeSyncPushBody(entityKind, record, options);
  }

  const path = `${basePath}${endpoint}`;
  const url = `${path}${query ? buildQueryString(query) : ""}`;
  const headers = {
    Accept: "application/json",
    "X-Joathi-Api-Version": API_VERSION,
    "X-Joathi-Domain-Version": String(DOMAIN_VERSION)
  };

  if (body !== null) {
    headers["Content-Type"] = "application/json";
  }
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = String(options.idempotencyKey);
  }

  return {
    apiVersion: API_VERSION,
    envelopeVersion: API_ENVELOPE_VERSION,
    domainVersion: DOMAIN_VERSION,
    entityKind,
    action,
    basePath,
    endpoint,
    path,
    url,
    method,
    headers,
    query,
    body,
    contract: strategy.contract,
    sync: {
      direction: strategy.syncDirection,
      supportsArchive: strategy.supportsArchive,
      supportsUpdate: strategy.supportsUpdate,
      supportsDelete: strategy.supportsDelete,
      supportsSync: strategy.supportsSync,
      appendOnly: strategy.appendOnly,
      conflictPolicy: strategy.conflictPolicy
    },
    fields: {
      write: [...strategy.writeFields],
      sourceOfTruth: [...strategy.sourceOfTruthFields],
      derived: [...strategy.derivedFields]
    },
    metadata: {
      source: options.source || "local-first",
      requestId: options.requestId || null,
      cursor: options.cursor || null,
      limit: query?.limit || options.limit || API_DEFAULT_LIMIT,
      aliasMap: strategy.fieldAliases,
      timestampPolicy: strategy.timestampPolicy
    },
    request: {
      method,
      path,
      url,
      headers,
      query,
      body
    }
  };
}

export function buildApiSuccessEnvelope(data = null, options = {}) {
  const count = Array.isArray(data)
    ? data.length
    : isPlainObject(data)
      ? 1
      : 0;

  return {
    ok: true,
    data,
    meta: {
      apiVersion: API_VERSION,
      envelopeVersion: API_ENVELOPE_VERSION,
      domainVersion: DOMAIN_VERSION,
      entityKind: options.entityKind || null,
      action: options.action || null,
      requestId: options.requestId || null,
      cursor: options.cursor || null,
      limit: options.limit || null,
      count,
      hasMore: options.hasMore ?? null,
      source: options.source || "api"
    },
    pagination: options.pagination || null,
    warnings: options.warnings || []
  };
}

export function normalizeApiError(error, options = {}) {
  const status = Number(
    error?.status ||
      error?.response?.status ||
      error?.httpStatus ||
      options.status ||
      0
  ) || 0;
  const code = String(
    error?.code ||
      error?.response?.data?.error?.code ||
      error?.response?.data?.code ||
      options.code ||
      (status === 404
        ? API_ERROR_CODES.NOT_FOUND
        : status === 409
          ? API_ERROR_CODES.CONFLICT
          : status === 401
            ? API_ERROR_CODES.UNAUTHORIZED
            : status === 403
              ? API_ERROR_CODES.FORBIDDEN
              : status === 429
                ? API_ERROR_CODES.RATE_LIMITED
                : status === 501
                  ? API_ERROR_CODES.NOT_IMPLEMENTED
        : status >= 500
          ? API_ERROR_CODES.UNKNOWN
          : API_ERROR_CODES.VALIDATION_ERROR)
  ).toUpperCase();
  const message = String(
    error?.message ||
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      options.message ||
      "No se pudo completar la operacion."
  );
  const details = error?.details || error?.response?.data?.error?.details || options.details || null;
  const fieldErrors = error?.fieldErrors || error?.response?.data?.error?.fieldErrors || details?.fieldErrors || null;

  return {
    ok: false,
    code,
    status,
    message,
    retryable: options.retryable ?? [408, 429, 500, 502, 503, 504].includes(status),
    entityKind: options.entityKind || error?.entityKind || null,
    action: options.action || error?.action || null,
    details,
    fieldErrors
  };
}

export function buildApiErrorEnvelope(error, options = {}) {
  return {
    ok: false,
    error: normalizeApiError(error, options),
    meta: {
      apiVersion: API_VERSION,
      envelopeVersion: API_ENVELOPE_VERSION,
      domainVersion: DOMAIN_VERSION,
      entityKind: options.entityKind || null,
      action: options.action || null,
      requestId: options.requestId || null,
      source: options.source || "api"
    }
  };
}

export function buildSyncManifest(options = {}) {
  const basePath = options.basePath || API_BASE_PATH;
  const generatedAt = options.generatedAt || new Date().toISOString();
  const entities = {};

  for (const entityKind of ENTITY_SYNC_ORDER) {
    const strategy = getEntitySyncStrategy(entityKind);
    if (!strategy) {
      continue;
    }

    entities[entityKind] = {
      entityKind,
      syncDirection: strategy.syncDirection,
      idStrategy: strategy.idStrategy,
      localIdPrefix: strategy.localIdPrefix,
      canonicalIdField: strategy.canonicalIdField,
      fieldAliases: strategy.fieldAliases,
      endpoints: getEntityEndpoints(entityKind),
      methods: { ...strategy.methods },
      listFilters: [...strategy.listFilters],
      writeFields: [...strategy.writeFields],
      sourceOfTruthFields: [...strategy.sourceOfTruthFields],
      derivedFields: [...strategy.derivedFields],
      supportsArchive: strategy.supportsArchive,
      supportsUpdate: strategy.supportsUpdate,
      supportsDelete: strategy.supportsDelete,
      supportsSync: strategy.supportsSync,
      appendOnly: strategy.appendOnly,
      conflictPolicy: strategy.conflictPolicy,
      timestampPolicy: { ...strategy.timestampPolicy },
      checklistKeys: [...strategy.operationChecklistKeys],
      contract: strategy.contract
        ? {
            kind: strategy.contract.kind,
            storageKey: strategy.contract.storageKey,
            idPrefix: strategy.contract.idPrefix,
            required: [...(strategy.contract.crud?.create?.required || [])],
            optional: [...(strategy.contract.model?.optional || [])],
            states: [...(strategy.contract.model?.states || [])],
            relations: [...(strategy.contract.model?.relations || [])]
          }
        : null
    };
  }

  return {
    apiVersion: API_VERSION,
    envelopeVersion: API_ENVELOPE_VERSION,
    domainVersion: DOMAIN_VERSION,
    basePath,
    generatedAt,
    syncOrder: [...ENTITY_SYNC_ORDER],
    entities
  };
}

export function buildSyncPullEnvelope(entityKind, query = {}, options = {}) {
  const strategy = getEntitySyncStrategy(entityKind);
  if (!strategy) {
    throw new Error(`Unsupported entityKind: ${entityKind}`);
  }

  const normalizedQuery = normalizeListQuery(entityKind, {
    ...query,
    cursor: query.cursor || options.cursor,
    limit: query.limit || options.limit || API_DEFAULT_LIMIT
  });

  return buildApiEnvelope(entityKind, "changes", {}, {
    ...options,
    query: normalizedQuery
  });
}

export function buildSyncPushEnvelope(entityKind, changes = {}, options = {}) {
  const strategy = getEntitySyncStrategy(entityKind);
  if (!strategy) {
    throw new Error(`Unsupported entityKind: ${entityKind}`);
  }

  return buildApiEnvelope(entityKind, "sync", changes, {
    ...options,
    source: options.source || "local-first",
    query: null
  });
}

function hasOwnOption(options, key) {
  return Object.prototype.hasOwnProperty.call(options || {}, key);
}

function joinUrl(baseUrl, requestPath) {
  const path = String(requestPath || "").trim();
  if (!path) {
    throw new Error("Missing request path.");
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const trimmedBase = String(baseUrl || "").trim();
  if (trimmedBase) {
    const normalizedBase = trimmedBase.endsWith("/") ? trimmedBase : `${trimmedBase}/`;
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return new URL(normalizedPath, normalizedBase).toString();
  }

  if (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin !== "null") {
    return new URL(path, window.location.origin).toString();
  }

  return path;
}

function parseResponseBody(response, text) {
  if (!text) {
    return null;
  }

  const contentType = String(response?.headers?.get?.("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function createFetchTransport(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return createNoopTransport({
      basePath: options.baseUrl || API_BASE_PATH,
      reason: "fetch-unavailable"
    });
  }

  const baseUrl = hasOwnOption(options, "baseUrl") ? options.baseUrl : "";
  const defaultHeaders = { ...(options.headers || {}) };
  const credentials = options.credentials || "same-origin";
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : 0;

  return {
    kind: "fetch",
    ready: true,
    baseUrl,
    describe() {
      return {
        kind: "fetch",
        ready: true,
        baseUrl
      };
    },
    async request(envelope = {}) {
      const url = joinUrl(baseUrl, envelope.url || envelope.path || envelope.endpoint || envelope.request?.url || envelope.request?.path);
      const method = String(envelope.method || envelope.request?.method || "GET").toUpperCase();
      const headers = {
        Accept: "application/json",
        ...defaultHeaders,
        ...(envelope.headers || {})
      };
      const bodyValue = envelope.body ?? envelope.request?.body ?? null;
      const shouldSendBody = bodyValue !== null && bodyValue !== undefined && method !== "GET" && method !== "HEAD";
      const controller = timeoutMs > 0 ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

      try {
        const response = await fetchImpl(url, {
          method,
          headers,
          credentials,
          signal: controller ? controller.signal : options.signal || undefined,
          body: shouldSendBody ? JSON.stringify(bodyValue) : undefined
        });
        const text = await response.text();
        const parsed = parseResponseBody(response, text);

        if (!response.ok) {
          throw normalizeApiError(
            {
              status: response.status,
              message: parsed?.error?.message || parsed?.message || response.statusText || "HTTP error",
              code: parsed?.error?.code || parsed?.code,
              details: parsed?.error?.details || parsed?.details || parsed,
              fieldErrors: parsed?.error?.fieldErrors || parsed?.fieldErrors || null
            },
            {
              entityKind: envelope.entityKind || envelope.request?.entityKind || null,
              action: envelope.action || envelope.request?.action || null,
              status: response.status
            }
          );
        }

        return parsed;
      } catch (error) {
        if (error?.name === "AbortError") {
          throw normalizeApiError(
            {
              status: 408,
              code: API_ERROR_CODES.TRANSPORT_UNAVAILABLE,
              message: "La solicitud excedio el tiempo de espera."
            },
            {
              entityKind: envelope.entityKind || null,
              action: envelope.action || null,
              retryable: true
            }
          );
        }

        if (error && error.code && error.status) {
          throw error;
        }

        throw normalizeApiError(
          {
            status: 503,
            code: API_ERROR_CODES.TRANSPORT_UNAVAILABLE,
            message: error?.message || "No fue posible conectar con el backend."
          },
          {
            entityKind: envelope.entityKind || null,
            action: envelope.action || null,
            details: { baseUrl, url }
          }
        );
      } finally {
        if (timer) {
          clearTimeout(timer);
        }
      }
    },
    async send(envelope) {
      return this.request(envelope);
    },
    async dispatch(envelope) {
      return this.request(envelope);
    },
    async fetch(envelope) {
      return this.request(envelope);
    }
  };
}

function buildTransportUnavailableError(context = {}) {
  const error = new Error(
    `Transport not configured for ${context.entityKind || "api"}${context.action ? `:${context.action}` : ""}.`
  );
  error.code = API_ERROR_CODES.TRANSPORT_UNAVAILABLE;
  error.status = 501;
  error.retryable = false;
  error.entityKind = context.entityKind || null;
  error.action = context.action || null;
  error.details = context.details || null;
  return error;
}

function shouldUseFetchTransport(options = {}) {
  const mode = String(options.transportMode || "").trim().toLowerCase();
  return mode === "api" || mode === "sync" || mode === "remote" || mode === "http" || hasOwnOption(options, "baseUrl");
}

function resolveTransport(options = {}, basePath = API_BASE_PATH, entityKind = null) {
  if (options.transport) {
    return options.transport;
  }

  if (shouldUseFetchTransport(options)) {
    return createFetchTransport({
      baseUrl: options.baseUrl,
      headers: options.headers,
      timeoutMs: options.timeoutMs,
      credentials: options.credentials,
      fetchImpl: options.fetchImpl,
      reason: options.reason,
      entityKind
    });
  }

  return createNoopTransport({
    basePath,
    entityKind,
    reason: options.reason || "backend-not-configured"
  });
}

export function createNoopTransport(options = {}) {
  const basePath = options.basePath || API_BASE_PATH;
  const reason = options.reason || "backend-not-configured";

  const fail = async (envelope = {}) => {
    throw buildTransportUnavailableError({
      entityKind: envelope.entityKind || options.entityKind || null,
      action: envelope.action || options.action || null,
      details: { reason, basePath, request: envelope.request || envelope }
    });
  };

  return {
    kind: "noop",
    ready: false,
    basePath,
    reason,
    describe() {
      return {
        kind: "noop",
        ready: false,
        basePath,
        reason
      };
    },
    async request(envelope) {
      return fail(envelope);
    },
    async send(envelope) {
      return fail(envelope);
    },
    async dispatch(envelope) {
      return fail(envelope);
    },
    async fetch(envelope) {
      return fail(envelope);
    }
  };
}

function dispatchTransportRequest(transport, envelope) {
  const handler =
    transport?.request ||
    transport?.send ||
    transport?.dispatch ||
    transport?.fetch;

  if (typeof handler !== "function") {
    return Promise.reject(buildTransportUnavailableError({
      entityKind: envelope?.entityKind || null,
      action: envelope?.action || null,
      details: { reason: "transport-missing" }
    }));
  }

  return handler.call(transport, envelope);
}

function createEntityAdapter(entityKind, options = {}) {
  const basePath = options.basePath || API_BASE_PATH;
  const transport = resolveTransport(options, basePath, entityKind);

  return {
    entityKind,
    basePath,
    transport,
    describe() {
      return getEntitySyncStrategy(entityKind);
    },
    getSyncStrategy() {
      return getEntitySyncStrategy(entityKind);
    },
    getEndpoints() {
      return getEntityEndpoints(entityKind);
    },
    getFilters() {
      return getEntitySyncFilters(entityKind);
    },
    buildCreate(record, extra = {}) {
      return buildApiEnvelope(entityKind, "create", record, { basePath, ...extra });
    },
    buildUpdate(id, record = {}, extra = {}) {
      return buildApiEnvelope(entityKind, "update", record, { basePath, id, ...extra });
    },
    buildGetById(id, extra = {}) {
      return buildApiEnvelope(entityKind, "getById", {}, { basePath, id, ...extra });
    },
    buildList(query = {}, extra = {}) {
      return buildApiEnvelope(entityKind, "list", {}, { basePath, query, ...extra });
    },
    buildArchive(id, archivedAt = null, extra = {}) {
      return buildApiEnvelope(entityKind, "archive", { id, archivedAt }, { basePath, id, ...extra });
    },
    buildUnarchive(id, extra = {}) {
      return buildApiEnvelope(entityKind, "unarchive", { id, archivedAt: null }, { basePath, id, ...extra });
    },
    buildChanges(query = {}, extra = {}) {
      return buildSyncPullEnvelope(entityKind, query, { basePath, ...extra });
    },
    buildSyncPull(query = {}, extra = {}) {
      return buildSyncPullEnvelope(entityKind, query, { basePath, ...extra });
    },
    buildSyncPush(changes = {}, extra = {}) {
      return buildSyncPushEnvelope(entityKind, changes, { basePath, ...extra });
    },
    toApiPayload(record) {
      return toApiPayload(entityKind, record);
    },
    fromApiPayload(payload) {
      return fromApiPayload(entityKind, payload);
    },
    request(envelope) {
      return dispatchTransportRequest(transport, envelope);
    },
    send(envelope) {
      return dispatchTransportRequest(transport, envelope);
    },
    dispatch(envelope) {
      return dispatchTransportRequest(transport, envelope);
    },
    fetch(envelope) {
      return dispatchTransportRequest(transport, envelope);
    }
  };
}

export function createCustomerApiAdapter(options = {}) {
  return createEntityAdapter("customer", options);
}

export function createQuoteApiAdapter(options = {}) {
  return createEntityAdapter("quote", options);
}

export function createTaskApiAdapter(options = {}) {
  return createEntityAdapter("task", options);
}

export function createActivityApiAdapter(options = {}) {
  return createEntityAdapter("activity", options);
}

export function createOperationApiAdapter(options = {}) {
  return createEntityAdapter("operation", options);
}

export function createApiAdapter(options = {}) {
  const basePath = options.basePath || API_BASE_PATH;
  const transport = resolveTransport(options, basePath);
  const entities = Object.fromEntries(
    ENTITY_SYNC_ORDER.map((entityKind) => [entityKind, createEntityAdapter(entityKind, { ...options, basePath, transport })])
  );

  return {
    apiVersion: API_VERSION,
    envelopeVersion: API_ENVELOPE_VERSION,
    domainVersion: DOMAIN_VERSION,
    basePath,
    transport,
    manifest: buildSyncManifest({ basePath }),
    describe(entityKind) {
      return getEntitySyncStrategy(entityKind);
    },
    getEntitySyncStrategy,
    getEntityEndpoints,
    getEntitySyncFilters,
    getManifest() {
      return buildSyncManifest({ basePath });
    },
    buildApiEnvelope(entityKind, action, record = {}, extra = {}) {
      return buildApiEnvelope(entityKind, action, record, { basePath, ...extra });
    },
    buildSyncPullEnvelope(entityKind, query = {}, extra = {}) {
      return buildSyncPullEnvelope(entityKind, query, { basePath, ...extra });
    },
    buildSyncPushEnvelope(entityKind, changes = {}, extra = {}) {
      return buildSyncPushEnvelope(entityKind, changes, { basePath, ...extra });
    },
    buildApiSuccessEnvelope,
    buildApiErrorEnvelope,
    normalizeApiError,
    createEntityApiAdapter(entityKind, extra = {}) {
      return createEntityAdapter(entityKind, { ...options, ...extra, basePath, transport });
    },
    createCustomerApiAdapter(extra = {}) {
      return createEntityAdapter("customer", { ...options, ...extra, basePath, transport });
    },
    createQuoteApiAdapter(extra = {}) {
      return createEntityAdapter("quote", { ...options, ...extra, basePath, transport });
    },
    createTaskApiAdapter(extra = {}) {
      return createEntityAdapter("task", { ...options, ...extra, basePath, transport });
    },
    createActivityApiAdapter(extra = {}) {
      return createEntityAdapter("activity", { ...options, ...extra, basePath, transport });
    },
    createOperationApiAdapter(extra = {}) {
      return createEntityAdapter("operation", { ...options, ...extra, basePath, transport });
    },
    toApiPayload(entityKind, record) {
      return toApiPayload(entityKind, record);
    },
    fromApiPayload(entityKind, payload) {
      return fromApiPayload(entityKind, payload);
    },
    request(envelope) {
      return dispatchTransportRequest(transport, envelope);
    },
    send(envelope) {
      return dispatchTransportRequest(transport, envelope);
    },
    dispatch(envelope) {
      return dispatchTransportRequest(transport, envelope);
    },
    fetch(envelope) {
      return dispatchTransportRequest(transport, envelope);
    },
    customer: entities.customer,
    quote: entities.quote,
    task: entities.task,
    activity: entities.activity,
    operation: entities.operation,
    entities
  };
}
