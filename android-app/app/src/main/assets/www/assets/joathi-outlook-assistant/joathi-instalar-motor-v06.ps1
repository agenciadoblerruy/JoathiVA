param(
    [string]$Root = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = [System.IO.Path]::GetFullPath($PSScriptRoot)
}

Set-Location $Root

$Js = Join-Path $Root "src\joathi-mail-assistant-v06.js"
$Code = @'
const fs = require("fs");
const path = require("path");

function stripBom(value) {
  return String(value || "").replace(/^\uFEFF/, "");
}

function readJson(file) {
  return JSON.parse(stripBom(fs.readFileSync(file, "utf8")));
}

function arg(name, fallback = null) {
  const i = process.argv.indexOf("--" + name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function fold(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeMessage(m) {
  const from =
    m.from && m.from.emailAddress
      ? `${m.from.emailAddress.name || ""} <${m.from.emailAddress.address || ""}>`.trim()
      : String(m.from || "");

  return {
    id: m.id || "",
    source: "outlook_local",
    subject: m.subject || "",
    from,
    receivedDateTime: m.receivedDateTime || "",
    bodyPreview: m.bodyPreview || "",
    hasAttachments: !!m.hasAttachments,
    categories: Array.isArray(m.categories) ? m.categories : [],
    parentFolderId: m.parentFolderId || ""
  };
}

function extractMessages(parsed) {
  if (Array.isArray(parsed)) return parsed.map(normalizeMessage);
  if (parsed && Array.isArray(parsed.value)) return parsed.value.map(normalizeMessage);
  if (parsed && parsed.id) return [normalizeMessage(parsed)];
  return [];
}

function loadMessages(input) {
  if (!fs.existsSync(input)) throw new Error("No existe input: " + input);
  const stat = fs.statSync(input);
  if (stat.isDirectory()) {
    let out = [];
    for (const f of fs.readdirSync(input).filter(x => x.toLowerCase().endsWith(".json"))) {
      out = out.concat(extractMessages(readJson(path.join(input, f))));
    }
    return out;
  }
  return extractMessages(readJson(input));
}

function classify(message) {
  const raw = `${message.subject} ${message.from} ${message.bodyPreview}`;
  const text = fold(raw);

  let priority = "baja";
  let folder = "00_PENDIENTE_TRIAGE";
  let action = "Revisar y clasificar manualmente.";
  const labels = [];

  const microsoft = /microsoft account|new app.*connected|security alert|account security|microsoft/i.test(text);
  const realEstate = /apartamento|punta del este|inmobiliaria|usd\s*205|reciclado/i.test(text);
  const critical = /urgente|critico|bloqueado|riesgo|vencido|para hoy|hoy mismo|miercoles\s*06\/05\/2026/i.test(text);
  const operation = /planta ensenada|camion|carga|terrestre|paraguay|bogg|\bzc\s*\d+|\bct\s*\d+|\bpy\d+|sm6|aduana|despacho|embarque|eta|liberacion/i.test(text);
  const quote = /cotizacion|presupuesto|tarifa|precio|quote/i.test(text);
  const follow = /seguimiento|follow up|respuesta pendiente|reitero|consulta estado|aguardo|quedo atento/i.test(text);
  const dua = /\bdua\b/i.test(text);
  const crtMic = /\bcrt\b|\bmic\b|\bmic[-\s]?dta\b|\bcrt\/mic\b/i.test(text) && !/microsoft|miercoles/i.test(text);
  const invoice = /factura|invoice|pago|cobro|recibo/i.test(text);
  const ulg = /ulg logistics|\bulg\b/i.test(text);
  const supplier = /proveedor|despachante|transportista|carrier/i.test(text);
  const internalJoathi = /joathi|joathiva/i.test(text);

  if (realEstate) {
    priority = "baja";
    folder = "00_PENDIENTE_TRIAGE";
    labels.push("Joathi - No Joathi");
    action = "Correo no operativo. Revisar si corresponde archivar o crear carpeta 99_NO_JOATHI.";
  } else if (microsoft) {
    priority = "media";
    folder = "07_INTERNO_JOATHI";
    labels.push("Joathi - Interno", "Joathi - Seguridad");
    action = "Revisar alerta de seguridad Microsoft. Confirmar si la app conectada fue autorizada.";
  } else if (critical) {
    priority = "alta";
    folder = "08_PENDIENTES_CRITICOS";
    labels.push("Joathi - Urgente");
    action = "Revisar primero y definir respuesta inmediata.";
  }

  if (operation && folder !== "08_PENDIENTES_CRITICOS" && !realEstate && !microsoft) {
    priority = priority === "baja" ? "media" : priority;
    folder = "03_OPERACIONES/01_ABIERTAS";
    labels.push("Joathi - Operaciones");
    action = "Crear tarea operativa y dar seguimiento.";
  }

  if (quote && folder !== "08_PENDIENTES_CRITICOS") {
    priority = priority === "baja" ? "media" : priority;
    folder = "04_COMERCIAL/01_COTIZACIONES_NUEVAS";
    labels.push("Joathi - Cotizacion");
    action = "Preparar o revisar cotizacion.";
  }

  if (follow && folder !== "08_PENDIENTES_CRITICOS") {
    priority = priority === "baja" ? "media" : priority;
    folder = "04_COMERCIAL/02_EN_SEGUIMIENTO";
    labels.push("Joathi - Seguimiento");
    action = "Hacer seguimiento y responder estado.";
  }

  if (dua) {
    priority = priority === "baja" ? "media" : priority;
    folder = "05_DOCUMENTACION/01_DUA";
    labels.push("Joathi - Documento");
    action = "Revisar documentacion DUA.";
  }

  if (crtMic && !microsoft) {
    priority = priority === "baja" ? "media" : priority;
    folder = "05_DOCUMENTACION/02_CRT_MIC";
    labels.push("Joathi - Documento");
    action = "Revisar CRT/MIC.";
  }

  if (invoice) {
    priority = priority === "baja" ? "media" : priority;
    folder = "05_DOCUMENTACION/03_FACTURAS";
    labels.push("Joathi - Pago");
    action = "Revisar factura/pago y registrar seguimiento.";
  }

  if (ulg) {
    priority = priority === "baja" ? "media" : priority;
    folder = "02_CLIENTES/Cliente - ULG Logistics";
    labels.push("Joathi - Cliente ULG");
  }

  if (supplier && folder === "00_PENDIENTE_TRIAGE") {
    priority = "media";
    folder = "06_PROVEEDORES_Y_DESPACHANTES";
    labels.push("Joathi - Proveedor");
  }

  if (internalJoathi && folder === "00_PENDIENTE_TRIAGE") {
    folder = "07_INTERNO_JOATHI";
    labels.push("Joathi - Interno");
  }

  return {
    ...message,
    joathi: {
      priority,
      labels: [...new Set(labels)],
      suggestedFolder: folder,
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

  fs.writeFileSync(path.join(output, "classified_messages.json"), JSON.stringify(classified, null, 2), "utf8");
  fs.writeFileSync(path.join(output, "email_records.json"), JSON.stringify(messages, null, 2), "utf8");

  const moves = ["receivedDateTime,from,subject,priority,suggestedFolder,labels"];
  const tasks = ["receivedDateTime,from,subject,priority,action"];

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
  md += "# Resumen Joathi Outlook Assistant v0.6\n\n";
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
  if (Number.isFinite(limit) && limit > 0) messages = messages.slice(0, limit);

  const classified = writeOutputs(messages, output);
  console.log(JSON.stringify({ version: "v0.6", processed: messages.length, classified: classified.length, output }, null, 2));
}

try {
  main();
} catch (err) {
  console.error("[Joathi Outlook Assistant v0.6]", err.message);
  process.exit(1);
}
'@

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($Js, $Code, $Utf8NoBom)

Write-Host "[OK] Creado motor alternativo: $Js"
Write-Host "Ahora ejecuta:"
Write-Host 'node ".\src\joathi-mail-assistant-v06.js" --input ".\output\graph_messages.json" --output ".\output" --limit 10'
