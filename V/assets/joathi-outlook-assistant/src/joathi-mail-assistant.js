const fs = require("fs");
const path = require("path");

function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

function readJson(file) {
  return JSON.parse(stripBom(fs.readFileSync(file, "utf8")));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf("--" + name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function normalizeGraphMessage(m) {
  const from =
    m.from && m.from.emailAddress
      ? `${m.from.emailAddress.name || ""} <${m.from.emailAddress.address || ""}>`.trim()
      : "";

  return {
    id: m.id || "",
    source: "microsoft_graph",
    subject: m.subject || "",
    from,
    receivedDateTime: m.receivedDateTime || "",
    bodyPreview: m.bodyPreview || "",
    hasAttachments: !!m.hasAttachments,
    categories: Array.isArray(m.categories) ? m.categories : [],
    parentFolderId: m.parentFolderId || ""
  };
}

function loadMessages(input) {
  if (!fs.existsSync(input)) {
    throw new Error("No existe input: " + input);
  }

  const stat = fs.statSync(input);

  if (stat.isDirectory()) {
    const files = fs.readdirSync(input).filter(f => f.toLowerCase().endsWith(".json"));
    let out = [];
    for (const f of files) {
      const parsed = readJson(path.join(input, f));
      out = out.concat(extractMessages(parsed));
    }
    return out;
  }

  const parsed = readJson(input);
  return extractMessages(parsed);
}

function extractMessages(parsed) {
  if (Array.isArray(parsed)) return parsed.map(normalizeGraphMessage);

  if (parsed && Array.isArray(parsed.value)) {
    return parsed.value.map(normalizeGraphMessage);
  }

  if (parsed && parsed.id && parsed.subject) {
    return [normalizeGraphMessage(parsed)];
  }

  return [];
}

function containsAny(text, words) {
  const t = text.toLowerCase();
  return words.some(w => t.includes(w.toLowerCase()));
}

function classify(message) {
  const text = `${message.subject} ${message.from} ${message.bodyPreview}`.toLowerCase();

  const labels = [];
  let priority = "baja";
  let suggestedFolder = "00_PENDIENTE_TRIAGE";
  let action = "Revisar y clasificar manualmente.";

  if (containsAny(text, ["urgente", "critico", "crítico", "vencido", "hoy", "riesgo", "bloqueado"])) {
    labels.push("Joathi - Urgente");
    priority = "alta";
    suggestedFolder = "08_PENDIENTES_CRITICOS";
    action = "Revisar primero y definir respuesta inmediata.";
  }

  if (containsAny(text, ["cotizacion", "cotización", "presupuesto", "tarifa", "precio", "quote"])) {
    labels.push("Joathi - Cotizacion");
    if (priority !== "alta") priority = "media";
    suggestedFolder = "04_COMERCIAL/01_COTIZACIONES_NUEVAS";
    action = "Preparar o revisar cotizacion.";
  }

  if (containsAny(text, ["seguimiento", "follow up", "respuesta pendiente", "reitero", "consulta estado"])) {
    labels.push("Joathi - Seguimiento");
    if (priority !== "alta") priority = "media";
    suggestedFolder = "04_COMERCIAL/02_EN_SEGUIMIENTO";
    action = "Hacer seguimiento y responder estado.";
  }

  if (containsAny(text, ["dua"])) {
    labels.push("Joathi - Documento");
    if (priority !== "alta") priority = "media";
    suggestedFolder = "05_DOCUMENTACION/01_DUA";
    action = "Revisar documentacion DUA.";
  }

  if (containsAny(text, ["crt", "mic"])) {
    labels.push("Joathi - Documento");
    if (priority !== "alta") priority = "media";
    suggestedFolder = "05_DOCUMENTACION/02_CRT_MIC";
    action = "Revisar CRT/MIC.";
  }

  if (containsAny(text, ["factura", "invoice", "pago", "cobro", "recibo"])) {
    labels.push("Joathi - Pago");
    if (priority !== "alta") priority = "media";
    suggestedFolder = "05_DOCUMENTACION/03_FACTURAS";
    action = "Revisar factura/pago y registrar seguimiento.";
  }

  if (containsAny(text, ["eta", "liberacion", "liberación", "despacho", "embarque", "aduana", "operacion", "operación"])) {
    labels.push("Joathi - Tarea");
    if (priority !== "alta") priority = "media";
    suggestedFolder = "03_OPERACIONES/01_ABIERTAS";
    action = "Crear tarea operativa y dar seguimiento.";
  }

  if (containsAny(text, ["ulg logistics", "ulg"])) {
    labels.push("Joathi - Cliente ULG");
    suggestedFolder = "02_CLIENTES/Cliente - ULG Logistics";
  }

  if (containsAny(text, ["proveedor", "despachante", "transportista", "carrier"])) {
    labels.push("Joathi - Proveedor");
    if (suggestedFolder === "00_PENDIENTE_TRIAGE") {
      suggestedFolder = "06_PROVEEDORES_Y_DESPACHANTES";
    }
  }

  if (containsAny(text, ["joathi", "joathiva"])) {
    labels.push("Joathi - Interno");
    if (suggestedFolder === "00_PENDIENTE_TRIAGE") {
      suggestedFolder = "07_INTERNO_JOATHI";
    }
  }

  if (containsAny(text, ["responder", "confirmar", "favor", "por favor", "aguardo", "quedo atento"])) {
    labels.push("Joathi - Responder");
    if (priority === "baja") priority = "media";
    if (action === "Revisar y clasificar manualmente.") {
      action = "Preparar respuesta.";
    }
  }

  const uniqueLabels = [...new Set(labels)];

  return {
    ...message,
    joathi: {
      priority,
      labels: uniqueLabels,
      suggestedFolder,
      suggestedAction: action,
      summary: message.bodyPreview ? message.bodyPreview.slice(0, 240) : message.subject
    }
  };
}

function csvEscape(v) {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function writeOutputs(messages, output) {
  ensureDir(output);

  const classified = messages.map(classify);

  fs.writeFileSync(
    path.join(output, "classified_messages.json"),
    JSON.stringify(classified, null, 2),
    "utf8"
  );

  fs.writeFileSync(
    path.join(output, "email_records.json"),
    JSON.stringify(messages, null, 2),
    "utf8"
  );

  const moves = [
    "receivedDateTime,from,subject,priority,suggestedFolder,labels"
  ];

  const tasks = [
    "receivedDateTime,from,subject,priority,action"
  ];

  for (const m of classified) {
    moves.push([
      m.receivedDateTime,
      m.from,
      m.subject,
      m.joathi.priority,
      m.joathi.suggestedFolder,
      m.joathi.labels.join("; ")
    ].map(csvEscape).join(","));

    tasks.push([
      m.receivedDateTime,
      m.from,
      m.subject,
      m.joathi.priority,
      m.joathi.suggestedAction
    ].map(csvEscape).join(","));
  }

  fs.writeFileSync(path.join(output, "folder_moves_suggested.csv"), moves.join("\n"), "utf8");
  fs.writeFileSync(path.join(output, "tasks_suggested.csv"), tasks.join("\n"), "utf8");

  const high = classified.filter(m => m.joathi.priority === "alta").length;
  const med = classified.filter(m => m.joathi.priority === "media").length;
  const low = classified.filter(m => m.joathi.priority === "baja").length;

  const folders = {};
  for (const m of classified) {
    folders[m.joathi.suggestedFolder] = (folders[m.joathi.suggestedFolder] || 0) + 1;
  }

  let md = "";
  md += "# Resumen Joathi Outlook Assistant\n\n";
  md += `Procesados: ${classified.length}\n`;
  md += `Clasificados: ${classified.length}\n`;
  md += `Alta: ${high}\n`;
  md += `Media: ${med}\n`;
  md += `Baja: ${low}\n\n`;

  md += "## Carpetas sugeridas\n\n";
  for (const [folder, count] of Object.entries(folders)) {
    md += `- ${folder}: ${count}\n`;
  }

  md += "\n## Acciones sugeridas\n\n";
  for (const m of classified.slice(0, 25)) {
    md += `- [${m.joathi.priority}] ${m.subject || "(sin asunto)"} -> ${m.joathi.suggestedAction}\n`;
  }

  fs.writeFileSync(path.join(output, "summary.md"), md, "utf8");

  return classified;
}

function main() {
  const input = arg("input", path.join(process.cwd(), "output", "graph_messages.json"));
  const output = arg("output", path.join(process.cwd(), "output"));
  const limit = Number(arg("limit", "50"));

  let messages = loadMessages(input);

  if (Number.isFinite(limit) && limit > 0) {
    messages = messages.slice(0, limit);
  }

  const classified = writeOutputs(messages, output);

  console.log(JSON.stringify({
    processed: messages.length,
    classified: classified.length,
    output
  }, null, 2));
}

try {
  main();
} catch (err) {
  console.error("[Joathi Outlook Assistant]", err.message);
  process.exit(1);
}