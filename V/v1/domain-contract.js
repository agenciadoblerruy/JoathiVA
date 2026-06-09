export const DOMAIN_VERSION = 3;

export const CRM_STAGES = ["Prospecto", "Calificado", "Propuesta", "Negociacion", "Cierre", "Cliente"];
export const LEAD_SOURCES = ["Referencia", "Web", "WhatsApp", "Llamada", "Evento", "Recontacto"];
export const TASK_PRIORITIES = ["Alta", "Media", "Baja"];
export const TASK_STATUS = ["Pendiente", "En curso", "Hecha"];
export const OPERATION_TYPES = ["Importacion", "Exportacion", "Nacional", "Transito"];
export const OPERATION_WORKFLOW_STATES = [
  "Arribo detectado",
  "Camion pendiente",
  "Documentacion preliminar",
  "Esperando NCM/seguro",
  "DUA recibido",
  "Documentacion definitiva lista",
  "En transito",
  "Devolucion pendiente",
  "Cerrado",
  "En riesgo"
];
export const OPERATION_RISK_LEVELS = ["Bajo", "Medio", "Alto"];
export const OPERATION_CHECKLIST_ITEMS = [
  { key: "avisoArribo", label: "Aviso de arribo" },
  { key: "previsionCamion", label: "Prevision de camion" },
  { key: "facturaCRT", label: "Factura CRT" },
  { key: "borradorCRT", label: "Borrador CRT" },
  { key: "controlDespachantePY", label: "Control documental despachante" },
  { key: "ncm", label: "NCM" },
  { key: "valorSeguro", label: "Valor seguro" },
  { key: "dua", label: "DUA" },
  { key: "micDefinitivo", label: "MIC definitivo" },
  { key: "crtDefinitivo", label: "CRT definitivo" },
  { key: "entregaDocumentalDespachanteUY", label: "Entrega documental despachante UY" }
];
export const TRANSPORT_MODES = ["Terrestre", "Maritimo", "Aereo", "Multimodal"];
export const CURRENCIES = ["USD", "UYU"];
export const COUNTRIES = ["Uruguay", "Brasil", "Paraguay", "Argentina", "Chile", "Otro"];
export const CUSTOMER_TYPES = ["Prospecto", "Activo", "Cliente"];
export const PROVIDER_UNIT_TYPES = [
  {
    key: "sider",
    label: "Sider",
    apertura: "Lateral con lona",
    usoTipico: "Carga paletizada rapida"
  },
  {
    key: "furgon",
    label: "Furgon",
    apertura: "Trasera",
    usoTipico: "Carga seca, alta seguridad"
  },
  {
    key: "plataforma",
    label: "Plataforma",
    apertura: "Abierta",
    usoTipico: "Maquinaria, carga voluminosa"
  },
  {
    key: "cisterna",
    label: "Cisterna",
    apertura: "Superior / valvulas",
    usoTipico: "Liquidos y gases"
  },
  {
    key: "refrigerado",
    label: "Refrigerado",
    apertura: "Trasera",
    usoTipico: "Alimentos, medicinas"
  }
];
export const PROVIDER_UNIT_TYPE_LABELS = PROVIDER_UNIT_TYPES.map((item) => item.label);
export const PROVIDER_AVAILABILITY = ["Disponible", "Reservado", "En viaje", "No disponible"];
export const PROVIDER_COVERAGE_AREAS = {
  america: ["Argentina", "Brasil", "Bolivia", "Chile", "Colombia", "Uruguay", "México", "Estados Unidos"],
  world: ["Europa", "Asia"]
};
export const PROVIDER_COVERAGE_OPTIONS = [
  ...PROVIDER_COVERAGE_AREAS.america,
  ...PROVIDER_COVERAGE_AREAS.world
];

export const QUOTE_DEFAULT_MARGIN = 30;
export const EXTRA_HOURS_USD = 89;
export const CUSTOMS_STAY_USD = 300;
export const IVA_RATE = 0.22;

export const IMPORT_SPLITS = {
  Brasil: { internationalShare: 0.8, nationalShare: 0.2, label: "Brasil -> Uruguay 80/20" },
  Paraguay: { internationalShare: 0.7, nationalShare: 0.3, label: "Paraguay -> Uruguay 70/30" },
  Argentina: { internationalShare: 0.5, nationalShare: 0.5, label: "Argentina -> Uruguay 50/50" },
  Chile: { internationalShare: 0.9, nationalShare: 0.1, label: "Chile -> Uruguay 90/10" }
};

export const FIELD_ALIASES = {
  operation: {
    clientId: "customerId",
    customerId: "clientId",
    dua: "duaNumber",
    duaNumber: "dua"
  }
};

export const ENTITY_CONTRACTS = {
  customer: {
    kind: "customer",
    storageKey: "customers",
    idPrefix: "cus",
    model: {
      required: ["nombre", "empresa", "contactoPrincipal", "ciudad", "pais", "tipoCliente"],
      requiredAnyOf: [["telefono", "email"]],
      optional: [
        "telefono",
        "email",
        "datosGenerales",
        "contactos",
        "historialComercial",
        "cotizacionesAsociadas",
        "incidencias",
        "condicionesPactadas",
        "observacionesClave",
        "archivedAt"
      ],
      relations: [
        { field: "cotizacionesAsociadas", target: "quote", cardinality: "many", kind: "embedded-id-list" },
        { field: "historialComercial", target: "activity", cardinality: "many", kind: "embedded-note-list" },
        { field: "incidencias", target: "activity", cardinality: "many", kind: "embedded-note-list" },
        { field: "crm.customerId", target: "crm", cardinality: "one-to-many", kind: "foreign-key" },
        { field: "quote.customerId", target: "quote", cardinality: "one-to-many", kind: "foreign-key" },
        { field: "task.customerId", target: "task", cardinality: "one-to-many", kind: "foreign-key" },
        { field: "operation.clientId/customerId", target: "operation", cardinality: "one-to-many", kind: "foreign-key-alias" }
      ],
      states: CUSTOMER_TYPES,
      traceability: ["activityLog", "historialComercial", "derived feeds"],
      timestamps: {
        createdAt: "ISO-8601 UTC",
        updatedAt: "ISO-8601 UTC",
        archivedAt: "ISO-8601 UTC|null"
      }
    },
    crud: {
      create: {
        required: ["nombre", "empresa", "contactoPrincipal", "ciudad", "pais", "tipoCliente"],
        requiredAnyOf: [["telefono", "email"]],
        optional: [
          "telefono",
          "email",
          "datosGenerales",
          "contactos",
          "historialComercial",
          "cotizacionesAsociadas",
          "incidencias",
          "condicionesPactadas",
          "observacionesClave"
        ],
        generated: ["id", "createdAt", "updatedAt", "archivedAt"]
      },
      update: {
        required: ["id"],
        optional: [
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
          "archivedAt"
        ],
        preserve: ["createdAt"]
      },
      getById: {
        fields: [
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
        ],
        derived: ["activityFeed", "customerQuotes", "customerTasks", "customerOperations"]
      },
      list: {
        fields: ["id", "nombre", "empresa", "contactoPrincipal", "telefono", "email", "tipoCliente", "ciudad", "pais", "createdAt", "updatedAt", "archivedAt"],
        defaultOrder: "empresa asc",
        excludeArchivedByDefault: true
      },
      archive: {
        supported: true,
        payload: ["id", "archivedAt"]
      },
      unarchive: {
        supported: true,
        payload: ["id", "archivedAt"]
      }
    }
  },
  provider: {
    kind: "provider",
    storageKey: "providers",
    idPrefix: "prv",
    model: {
      required: ["nombre", "tipoUnidad", "configuracion", "apertura", "usoTipico", "pais", "disponibilidad", "rutasCobertura"],
      requiredAnyOf: [["telefono", "email"]],
      optional: [
        "contacto",
        "telefono",
        "email",
        "zona",
        "rutasCobertura",
        "viajes",
        "choferNombre",
        "choferTelefono",
        "choferLicencia",
        "camionPatente",
        "camionMarca",
        "camionModelo",
        "camionAnio",
        "camionTipo",
        "mic",
        "dua",
        "documentosOperativos",
        "observaciones",
        "archivedAt"
      ],
      relations: [
        { field: "quote.proveedor", target: "quote", cardinality: "one-to-many", kind: "text-reference" }
      ],
      states: PROVIDER_AVAILABILITY,
      traceability: ["activityLog", "provider.history"],
      timestamps: {
        createdAt: "ISO-8601 UTC",
        updatedAt: "ISO-8601 UTC",
        archivedAt: "ISO-8601 UTC|null"
      }
    },
    crud: {
      create: {
        required: ["nombre", "tipoUnidad", "configuracion", "apertura", "usoTipico", "pais", "disponibilidad", "rutasCobertura"],
        requiredAnyOf: [["telefono", "email"]],
        optional: [
          "contacto",
          "telefono",
          "email",
          "zona",
          "rutasCobertura",
          "viajes",
          "choferNombre",
          "choferTelefono",
          "choferLicencia",
          "camionPatente",
          "camionMarca",
          "camionModelo",
          "camionAnio",
          "camionTipo",
          "mic",
          "dua",
          "documentosOperativos",
          "observaciones"
        ],
        generated: ["id", "createdAt", "updatedAt", "archivedAt"]
      },
      update: {
        required: ["id"],
        optional: [
          "nombre",
          "contacto",
          "telefono",
          "email",
          "tipoUnidad",
          "configuracion",
          "apertura",
          "usoTipico",
          "zona",
          "rutasCobertura",
          "viajes",
          "choferNombre",
          "choferTelefono",
          "choferLicencia",
          "camionPatente",
          "camionMarca",
          "camionModelo",
          "camionAnio",
          "camionTipo",
          "mic",
          "dua",
          "documentosOperativos",
          "pais",
          "disponibilidad",
          "observaciones",
          "archivedAt"
        ],
        preserve: ["createdAt"]
      },
      getById: {
        fields: [
          "id",
          "nombre",
          "contacto",
          "telefono",
          "email",
          "tipoUnidad",
          "configuracion",
          "apertura",
          "usoTipico",
          "zona",
          "rutasCobertura",
          "viajes",
          "choferNombre",
          "choferTelefono",
          "choferLicencia",
          "camionPatente",
          "camionMarca",
          "camionModelo",
          "camionAnio",
          "camionTipo",
          "mic",
          "dua",
          "documentosOperativos",
          "pais",
          "disponibilidad",
          "observaciones",
          "createdAt",
          "updatedAt",
          "archivedAt"
        ],
        derived: ["providerQuotes", "providerActivityFeed"]
      },
      list: {
        fields: [
          "id",
          "nombre",
          "contacto",
          "telefono",
          "email",
          "tipoUnidad",
          "configuracion",
          "zona",
          "rutasCobertura",
          "pais",
          "disponibilidad",
          "createdAt",
          "updatedAt",
          "archivedAt"
        ],
        defaultOrder: "tipoUnidad asc",
        excludeArchivedByDefault: true
      },
      archive: {
        supported: true,
        payload: ["id", "archivedAt"]
      },
      unarchive: {
        supported: true,
        payload: ["id", "archivedAt"]
      }
    }
  },
  quote: {
    kind: "quote",
    storageKey: "quotes",
    idPrefix: "quo",
    model: {
      required: ["customerId", "origen", "destino", "paisOrigen", "paisDestino", "tipoOperacion", "modoTransporte", "proveedor", "costoProveedor", "margenPct", "moneda"],
      optional: [
        "cliente",
        "gastosAdicionales",
        "seguro",
        "horasExtra",
        "estadiaAduanaDias",
        "tipoCambio",
        "observaciones",
        "calculation",
        "estado",
        "archivedAt"
      ],
      relations: [
        { field: "customerId", target: "customer", cardinality: "many-to-one", kind: "foreign-key" }
      ],
      states: ["Borrador", "Calculada", "Archivada"],
      traceability: ["calculation", "activityLog", "customer.history"],
      timestamps: {
        createdAt: "ISO-8601 UTC",
        updatedAt: "ISO-8601 UTC",
        archivedAt: "ISO-8601 UTC|null"
      },
      derived: ["calculation"]
    },
    crud: {
      create: {
        required: ["customerId", "origen", "destino", "paisOrigen", "paisDestino", "tipoOperacion", "modoTransporte", "proveedor", "costoProveedor", "margenPct", "moneda"],
        optional: ["cliente", "gastosAdicionales", "seguro", "horasExtra", "estadiaAduanaDias", "tipoCambio", "observaciones"],
        generated: ["id", "createdAt", "updatedAt", "calculation", "archivedAt"]
      },
      update: {
        required: ["id"],
        optional: [
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
          "archivedAt"
        ],
        preserve: ["createdAt", "calculation"]
      },
      getById: {
        fields: [
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
          "calculation",
          "estado",
          "createdAt",
          "updatedAt",
          "archivedAt"
        ],
        derived: ["customerFeed", "priceCalculation", "quotedOperations"]
      },
      list: {
        fields: ["id", "customerId", "cliente", "origen", "destino", "paisOrigen", "paisDestino", "tipoOperacion", "modoTransporte", "proveedor", "moneda", "calculation", "createdAt", "updatedAt", "archivedAt"],
        defaultOrder: "updatedAt desc",
        excludeArchivedByDefault: true
      },
      archive: {
        supported: true,
        payload: ["id", "archivedAt"]
      },
      unarchive: {
        supported: true,
        payload: ["id", "archivedAt"]
      }
    }
  },
  task: {
    kind: "task",
    storageKey: "agenda",
    idPrefix: "task",
    model: {
      required: ["customerId", "tarea", "prioridad", "fechaCompromiso", "estado"],
      optional: ["operationId", "cliente", "recordatorio", "observaciones", "archivedAt"],
      relations: [
        { field: "customerId", target: "customer", cardinality: "many-to-one", kind: "foreign-key" },
        { field: "operationId", target: "operation", cardinality: "many-to-one", kind: "foreign-key" }
      ],
      states: TASK_STATUS,
      traceability: ["activityLog", "customer.history", "operation-linked tasks"],
      timestamps: {
        createdAt: "ISO-8601 UTC",
        updatedAt: "ISO-8601 UTC",
        archivedAt: "ISO-8601 UTC|null"
      }
    },
    crud: {
      create: {
        required: ["customerId", "tarea", "prioridad", "fechaCompromiso", "estado"],
        optional: ["operationId", "cliente", "recordatorio", "observaciones"],
        generated: ["id", "createdAt", "updatedAt", "archivedAt"]
      },
      update: {
        required: ["id"],
        optional: ["customerId", "operationId", "cliente", "tarea", "prioridad", "fechaCompromiso", "recordatorio", "estado", "observaciones", "archivedAt"],
        preserve: ["createdAt"]
      },
      getById: {
        fields: ["id", "customerId", "operationId", "cliente", "tarea", "prioridad", "fechaCompromiso", "recordatorio", "estado", "observaciones", "createdAt", "updatedAt", "archivedAt"],
        derived: ["customerLabel", "operationLabel", "taskAlerts"]
      },
      list: {
        fields: ["id", "customerId", "operationId", "cliente", "tarea", "prioridad", "fechaCompromiso", "recordatorio", "estado", "observaciones", "createdAt", "updatedAt", "archivedAt"],
        defaultOrder: "priority/state/date",
        excludeArchivedByDefault: true
      },
      archive: {
        supported: true,
        payload: ["id", "archivedAt"]
      },
      unarchive: {
        supported: true,
        payload: ["id", "archivedAt"]
      }
    }
  },
  activity: {
    kind: "activity",
    storageKey: "activityLog",
    idPrefix: "act",
    model: {
      required: ["at", "type", "label", "tone", "title", "details"],
      optional: ["customerId", "entityKind", "entityId", "operationId", "source", "metadata", "createdAt", "updatedAt"],
      relations: [
        { field: "customerId", target: "customer", cardinality: "many-to-one", kind: "foreign-key" },
        { field: "entityKind/entityId", target: "customer|quote|task|operation", cardinality: "polymorphic", kind: "subject-ref" },
        { field: "operationId", target: "operation", cardinality: "many-to-one", kind: "optional-foreign-key" }
      ],
      states: [],
      traceability: ["append-only event stream"],
      timestamps: {
        at: "ISO-8601 UTC event time",
        createdAt: "ISO-8601 UTC ingest time",
        updatedAt: "ISO-8601 UTC ingest time",
        archivedAt: "not-applicable"
      },
      appendOnly: true
    },
    crud: {
      create: {
        required: ["at", "type", "label", "tone", "title", "details"],
        optional: ["customerId", "entityKind", "entityId", "operationId", "source", "metadata"],
        generated: ["id", "createdAt", "updatedAt"]
      },
      update: {
        supported: false
      },
      getById: {
        fields: ["id", "at", "type", "label", "tone", "title", "details", "customerId", "entityKind", "entityId", "operationId", "source", "metadata", "createdAt", "updatedAt"],
        derived: ["timeline", "customerFeed", "operationFeed"]
      },
      list: {
        fields: ["id", "at", "type", "label", "tone", "title", "details", "customerId", "entityKind", "entityId", "operationId", "source", "createdAt", "updatedAt"],
        defaultOrder: "at desc",
        excludeArchivedByDefault: true
      },
      archive: {
        supported: false
      },
      unarchive: {
        supported: false
      }
    }
  },
  operation: {
    kind: "operation",
    storageKey: "operations",
    idPrefix: "op",
    model: {
      required: ["clientId", "tipoOperacion", "referencia", "contenedor", "origen", "destino", "estadoOperacion", "riesgo"],
      optional: [
        "customerId",
        "dua",
        "duaNumber",
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
        "observaciones",
        "documentChecklist",
        "archivedAt"
      ],
      relations: [
        { field: "clientId/customerId", target: "customer", cardinality: "many-to-one", kind: "foreign-key-alias" },
        { field: "task.operationId", target: "task", cardinality: "one-to-many", kind: "reverse-foreign-key" },
        { field: "activity.entityKind/entityId", target: "activity", cardinality: "one-to-many", kind: "reverse-polymorphic" }
      ],
      states: OPERATION_WORKFLOW_STATES,
      traceability: ["documentChecklist", "operationAlerts", "linked tasks", "activityLog"],
      timestamps: {
        createdAt: "ISO-8601 UTC",
        updatedAt: "ISO-8601 UTC",
        archivedAt: "ISO-8601 UTC|null"
      },
      checklist: OPERATION_CHECKLIST_ITEMS.map((item) => item.key),
      alias: {
        customerId: "clientId",
        duaNumber: "dua"
      }
    },
    crud: {
      create: {
        required: ["clientId", "tipoOperacion", "referencia", "contenedor", "origen", "destino", "estadoOperacion", "riesgo"],
        optional: [
          "customerId",
          "dua",
          "duaNumber",
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
          "observaciones",
          "documentChecklist"
        ],
        generated: ["id", "createdAt", "updatedAt", "archivedAt"]
      },
      update: {
        required: ["id"],
        optional: [
          "clientId",
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
          "archivedAt"
        ],
        preserve: ["createdAt"]
      },
      getById: {
        fields: [
          "id",
          "clientId",
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
        ],
        derived: ["checklistProgress", "alerts", "linkedTasks", "activityFeed"]
      },
      list: {
        fields: [
          "id",
          "clientId",
          "customerId",
          "tipoOperacion",
          "referencia",
          "contenedor",
          "dua",
          "duaNumber",
          "origen",
          "destino",
          "fechaArribo",
          "fechaDevolucion",
          "poloLogistico",
          "providerName",
          "brokerName",
          "fleetStatus",
          "expectedFinishAt",
          "estadoOperacion",
          "riesgo",
          "documentChecklist",
          "createdAt",
          "updatedAt",
          "archivedAt"
        ],
        defaultOrder: "risk/state/date",
        excludeArchivedByDefault: true
      },
      archive: {
        supported: true,
        payload: ["id", "archivedAt"]
      },
      unarchive: {
        supported: true,
        payload: ["id", "archivedAt"]
      }
    }
  }
};

export function getEntityContract(entityKind) {
  return ENTITY_CONTRACTS[entityKind] || null;
}
