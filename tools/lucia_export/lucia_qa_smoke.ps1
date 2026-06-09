param(
  [string]$RepoRoot = "",
  [string]$OutputDir = "",
  [string]$ServerUrl = "http://127.0.0.1:8787"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $RepoRoot 'tools\lucia_export\data\lucia_public_export'
}

$importSmoke = Join-Path $PSScriptRoot "lucia_import_smoke.ps1"
$alertSmoke = Join-Path $PSScriptRoot "lucia_alerts_smoke.mjs"

if (-not (Test-Path -LiteralPath $importSmoke)) {
  throw "No se encontro el smoke de importacion en $importSmoke"
}

if (-not (Test-Path -LiteralPath $alertSmoke)) {
  throw "No se encontro el smoke de alertas en $alertSmoke"
}

& $importSmoke -OutputDir $OutputDir -ServerUrl $ServerUrl | Out-Host
if (-not $?) {
  throw "El smoke de importacion fallo."
}

$nodeExe = "C:\Users\tperl\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if (-not (Test-Path -LiteralPath $nodeExe)) {
  throw "No se encontro el runtime de Node en $nodeExe"
}

$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if ([string]::IsNullOrWhiteSpace($nodeExe)) {
  $nodeExe = "C:\Users\tperl\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
}

if (-not (Test-Path -LiteralPath $nodeExe)) {
  throw "No se encontro Node en $nodeExe"
}

& $nodeExe (Join-Path $PSScriptRoot "lucia_alerts_smoke.mjs")
if (-not $?) {
  throw "El smoke de alertas fallo."
}

Write-Host "ok: true"
