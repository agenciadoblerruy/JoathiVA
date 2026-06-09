#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const EXE_NAME = path.basename(process.execPath).toLowerCase();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStartDir() {
  return path.dirname(process.execPath);
}

function findProjectRoot(startDir) {
  let current = startDir;
  for (;;) {
    const serverScript = path.join(current, "server", "joathiva-server.ps1");
    const webIndex = path.join(current, "V", "index.html");
    if (fs.existsSync(serverScript) && fs.existsSync(webIndex)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error("No se pudo localizar la raiz del proyecto JoathiVA.");
    }
    current = parent;
  }
}

function detectMode() {
  if (EXE_NAME.includes("stopserver") || EXE_NAME.includes("stop-server")) return "stop-server";
  if (EXE_NAME.includes("serverconsole") || EXE_NAME.includes("server-console")) return "server-console";
  if (EXE_NAME.includes("rollback")) return "rollback";
  if (EXE_NAME.includes("deploy")) return "deploy";
  if (EXE_NAME.includes("console")) return "console";
  if (EXE_NAME.includes("mkt")) return "mkt";
  if (EXE_NAME.includes("luciaexport") || EXE_NAME.includes("exportpublic")) return "lucia-export";
  if (EXE_NAME.includes("smartsearch")) return "lucia-smart-search";
  if (EXE_NAME.includes("reference")) return "lucia-reference";
  if (EXE_NAME.includes("operational")) return "lucia-operational";
  if (EXE_NAME.includes("createdemo") || EXE_NAME.includes("create-demo") || EXE_NAME.includes("demo")) return "lucia-demo";
  if (EXE_NAME.includes("server")) return "server";
  return "app";
}

function openUrl(url) {
  const child = spawn("cmd", ["/c", "start", "", url], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

function openPowerShellConsole(rootDir) {
  spawn("powershell.exe", [
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    `Set-Location '${rootDir.replace(/'/g, "''")}'`,
  ], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  }).unref();
}

function runPowerShellScript(scriptPath, args = [], options = {}) {
  const child = spawn("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    scriptPath,
    ...args,
  ], {
    stdio: options.stdio || "inherit",
    windowsHide: false,
    cwd: options.cwd || path.dirname(scriptPath),
  });
  return child;
}

function findPythonExecutable() {
  const candidates = ["py.exe", "python.exe", "python3.exe", "python"];
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ["--version"], { stdio: "ignore" });
    if (probe.status === 0) {
      return candidate;
    }
  }
  throw new Error("No se encontro Python en PATH. Instala Python o usa el launcher de PowerShell equivalente.");
}

function runPythonScript(scriptPath, args = [], options = {}) {
  const python = options.python || findPythonExecutable();
  const child = spawn(python, [scriptPath, ...args], {
    stdio: options.stdio || "inherit",
    windowsHide: false,
    cwd: options.cwd || path.dirname(scriptPath),
  });
  return child;
}

async function waitForHealth(url, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (response.ok || (response.status >= 200 && response.status < 500)) {
        return true;
      }
    } catch (error) {
      // ignore and retry
    }
    await sleep(500);
  }
  return false;
}

function parseArgs(argv) {
  const options = { port: undefined, path: undefined, hash: undefined, serverUrl: undefined, outputDir: undefined, snapshotId: undefined, keepSnapshots: undefined, passthrough: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--port" && next) {
      options.port = Number(next);
      index += 1;
      continue;
    }
    if (arg === "--path" && next) {
      options.path = next;
      index += 1;
      continue;
    }
    if (arg === "--hash" && next) {
      options.hash = next;
      index += 1;
      continue;
    }
    if (arg === "--server-url" && next) {
      options.serverUrl = next;
      index += 1;
      continue;
    }
    if (arg === "--output-dir" && next) {
      options.outputDir = next;
      index += 1;
      continue;
    }
    if (arg === "--snapshot-id" && next) {
      options.snapshotId = next;
      index += 1;
      continue;
    }
    if (arg === "--keep-snapshots" && next) {
      options.keepSnapshots = Number(next);
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    options.passthrough.push(arg);
  }
  return options;
}

function showHelp(mode) {
  const lines = [
    "JoathiVA Windows launcher",
    `Modo detectado: ${mode}`,
    "",
    "Opciones comunes:",
    "  --port <numero>",
    "  --path <ruta>",
    "  --hash <hash>",
    "  --server-url <url>",
    "  --output-dir <ruta>",
    "  --snapshot-id <id>",
    "  --keep-snapshots <n>",
  ];
  console.log(lines.join("\n"));
}

async function main() {
  const mode = detectMode();
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp(mode);
    return;
  }

  const projectRoot = findProjectRoot(getStartDir());
  const serverScript = path.join(projectRoot, "server", "joathiva-server.ps1");

  if (mode === "server-console") {
    openPowerShellConsole(projectRoot);
    return;
  }

  if (mode === "deploy" || mode === "rollback") {
    const script = path.join(projectRoot, "tools", "deploy", "joathiva-deploy.ps1");
    const deployArgs = ["-Action", mode === "deploy" ? "Deploy" : "Rollback"];
    if (args.snapshotId) {
      deployArgs.push("-SnapshotId", args.snapshotId);
    }
    if (Number.isFinite(args.keepSnapshots) && args.keepSnapshots > 0) {
      deployArgs.push("-KeepSnapshots", String(args.keepSnapshots));
    }
    deployArgs.push(...args.passthrough);
    const child = runPowerShellScript(script, deployArgs);
    child.on("exit", (code) => process.exit(code || 0));
    return;
  }

  if (mode === "stop-server") {
    const scriptPath = serverScript.replace(/\\/g, "\\\\");
    const command = [
      "$scriptPath = [System.IO.Path]::GetFullPath('" + scriptPath + "');",
      "Get-CimInstance Win32_Process |",
      "Where-Object { ($_.CommandLine -like ('*' + $scriptPath + '*')) -or ($_.CommandLine -like '*joathiva-server.ps1*') } |",
      "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
    ].join(" ");
    const child = spawn("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      command,
    ], {
      stdio: "inherit",
      windowsHide: false,
    });
    child.on("exit", (code) => process.exit(code || 0));
    return;
  }

  if (mode === "server") {
    const port = String(args.port || 8787);
    const healthUrl = `http://127.0.0.1:${port}/api/health`;
    const alreadyRunning = await waitForHealth(healthUrl, 1500);
    if (!alreadyRunning) {
      const child = runPowerShellScript(serverScript, ["-Port", port]);
      child.on("exit", (code) => process.exit(code || 0));
    }
    return;
  }

  if (mode === "mkt") {
    const port = String(args.port || 8796);
    const healthUrl = `http://127.0.0.1:${port}/api/health`;
    const alreadyRunning = await waitForHealth(healthUrl, 1500);
    let child = null;
    if (!alreadyRunning) {
      child = runPowerShellScript(serverScript, ["-Port", port]);
      await waitForHealth(healthUrl);
    }
    const target = `http://127.0.0.1:${port}/${(args.path || "mktjoathi.html").replace(/^\/+/, "")}`;
    openUrl(target);
    if (child) {
      child.on("exit", (code) => process.exit(code || 0));
    }
    return;
  }

  if (mode === "lucia-export") {
    const script = path.join(projectRoot, "tools", "lucia_export", "export_lucia_public_data.py");
    const child = runPythonScript(script, args.passthrough);
    child.on("exit", (code) => process.exit(code || 0));
    return;
  }

  if (mode === "lucia-smart-search") {
    const script = path.join(projectRoot, "tools", "lucia_export", "build_lucia_smart_search_data.py");
    const child = runPythonScript(script, args.passthrough);
    child.on("exit", (code) => process.exit(code || 0));
    return;
  }

  if (mode === "lucia-reference") {
    const script = path.join(projectRoot, "tools", "lucia_export", "build_lucia_reference_data.py");
    const child = runPythonScript(script, args.passthrough);
    child.on("exit", (code) => process.exit(code || 0));
    return;
  }

  if (mode === "lucia-operational") {
    const script = path.join(projectRoot, "tools", "lucia_export", "build_lucia_operational_dataset.py");
    const child = runPythonScript(script, args.passthrough);
    child.on("exit", (code) => process.exit(code || 0));
    return;
  }

  if (mode === "lucia-demo") {
    const script = path.join(projectRoot, "tools", "lucia_export", "create_lucia_export_demo.ps1");
    const demoArgs = [];
    demoArgs.push("-OutputDir", args.outputDir || path.join(projectRoot, "tools", "lucia_export", "data", "lucia_public_export"));
    demoArgs.push("-ServerUrl", args.serverUrl || "http://127.0.0.1:8787");
    demoArgs.push(...args.passthrough);
    const child = runPowerShellScript(script, demoArgs);
    child.on("exit", (code) => process.exit(code || 0));
    return;
  }

  const port = String(args.port || 8787);
  const healthUrl = `http://127.0.0.1:${port}/api/health`;
  const alreadyRunning = await waitForHealth(healthUrl, 1500);
  let child = null;
  if (!alreadyRunning) {
    child = runPowerShellScript(serverScript, ["-Port", port]);
    await waitForHealth(healthUrl);
  }

  const targetPath = (args.path || "").replace(/^\/+/, "");
  const targetHash = (args.hash || "").replace(/^#/, "");
  let target = `http://127.0.0.1:${port}/`;
  if (targetPath) {
    target += targetPath;
  }
  if (targetHash) {
    target = target.replace(/\/?$/, "/") + "#" + targetHash;
  }
  openUrl(target);
  if (child) {
    child.on("exit", (code) => process.exit(code || 0));
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
