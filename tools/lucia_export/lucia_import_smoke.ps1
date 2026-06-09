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

$demoScript = Join-Path $PSScriptRoot "create_lucia_export_demo.ps1"
if (-not (Test-Path -LiteralPath $demoScript)) {
  throw "No se encontro el script demo en $demoScript"
}

& $demoScript -OutputDir $OutputDir | Out-Null

$health = Invoke-RestMethod -Uri "$ServerUrl/api/health" -Method Get -TimeoutSec 10
if (-not $health.ok) {
  throw "El servidor local no responde correctamente."
}

$import = Invoke-RestMethod -Uri "$ServerUrl/api/lucia/import" -Method Post -ContentType "application/json" -Body (@{ sourceDir = $OutputDir } | ConvertTo-Json) -TimeoutSec 20
if (-not $import.ok) {
  throw "La importacion de Lucia no fue exitosa."
}

$state = Invoke-RestMethod -Uri "$ServerUrl/api/lucia/import" -Method Get -TimeoutSec 10
if (-not $state.ok) {
  throw "No se pudo leer el estado de importacion."
}

[pscustomobject]@{
  healthOk = [bool]$health.ok
  importOk = [bool]$import.ok
  stateOk = [bool]$state.ok
  sourceDir = [string]$state.state.sourceDir
  importCount = [int]$state.state.importCount
  packageCount = [int]$state.state.packageCount
  fileCount = [int]$state.state.fileCount
} | ConvertTo-Json -Depth 4
