#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..", "..");
const launcher = path.join(__dirname, "joathiva-launcher.js");
const outDir = path.join(root, "dist", "windows");
const pkgCmd = process.platform === "win32" ? "npx.cmd" : "npx";

const outputs = [
  "JoathiVA.exe",
  "JoathiVA-Server.exe",
  "JoathiVA-StopServer.exe",
  "JoathiVA-ServerConsole.exe",
  "JoathiVA-MktJoathi.exe",
  "JoathiVA-Deploy.exe",
  "JoathiVA-Rollback.exe",
  "LuciaExportPublicData.exe",
  "LuciaBuildSmartSearch.exe",
  "LuciaBuildReference.exe",
  "LuciaBuildOperational.exe",
  "LuciaCreateDemo.exe",
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(source, target) {
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    return true;
  }
  return false;
}

ensureDir(outDir);

for (const name of outputs) {
  const target = path.join(outDir, name);
  console.log(`Building ${name}`);
  execFileSync(pkgCmd, ["pkg", "--targets", "node18-win-x64", "--output", target, launcher], {
    cwd: path.join(root, "tools", "windows-launchers"),
    stdio: "inherit",
  });
}

const luciaZcSource = path.join(root, "tools", "lucia_export", "LuciaZCGenerator.exe");
const luciaZcTarget = path.join(outDir, "LuciaZCGenerator.exe");
if (copyIfExists(luciaZcSource, luciaZcTarget)) {
  console.log("Copied LuciaZCGenerator.exe");
} else {
  console.warn("LuciaZCGenerator.exe no estaba disponible para copiar.");
}

console.log(`Listo: ${outDir}`);
