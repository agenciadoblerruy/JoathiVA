param(
    [int]$Limit = 10,
    [switch]$ApplyCategories,
    [switch]$ApplyMoves,
    [switch]$CreateMissingFolders,
    [switch]$OpenReports,
    [string]$RootFolderName = "HUBSPOT+JOATHIVA+WEB+OUTLOOK"
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Scripts = Join-Path $Root "scripts"
$Output = Join-Path $Root "output"
$BatchId = Get-Date -Format "yyyyMMdd-HHmmss"
$HistoryDir = Join-Path $Output ("history\" + $BatchId)

New-Item -ItemType Directory -Force -Path $Output | Out-Null
New-Item -ItemType Directory -Force -Path $HistoryDir | Out-Null

function Run-Step([string]$Name, [string]$File, [string[]]$ArgsList) {
    Write-Host ""
    Write-Host "== $Name =="
    if (-not (Test-Path $File)) {
        throw "No existe script requerido: $File"
    }

    & powershell -NoProfile -ExecutionPolicy Bypass -File $File @ArgsList
    if ($LASTEXITCODE -ne 0) {
        throw "Fallo el paso: $Name"
    }
}

function Copy-IfExists([string]$RelPath) {
    $src = Join-Path $Output $RelPath
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $HistoryDir (Split-Path $RelPath -Leaf)) -Force
    }
}

Write-Host "=============================================="
Write-Host "Joathi Outlook Batch v0.11"
Write-Host "Root: $Root"
Write-Host "BatchId: $BatchId"
Write-Host "Limit: $Limit"
Write-Host "ApplyCategories: $ApplyCategories"
Write-Host "ApplyMoves: $ApplyMoves"
Write-Host "History: $HistoryDir"
Write-Host "=============================================="

Run-Step "1. Leer y clasificar Outlook local" (Join-Path $Scripts "04_run_outlook_local.ps1") @("-Limit", [string]$Limit)

Run-Step "2. Generar historial, tareas y operaciones JoathiVA" (Join-Path $Scripts "07_generate_joathiva_exports.ps1") @("-BatchId", $BatchId)

Copy-IfExists "summary.md"
Copy-IfExists "classified_messages.json"
Copy-IfExists "folder_moves_suggested.csv"
Copy-IfExists "tasks_suggested.csv"
Copy-IfExists "tasks_for_joathiva.csv"
Copy-IfExists "operations_detected.csv"

if ($ApplyCategories) {
    Run-Step "3. Aplicar categorias en Outlook" (Join-Path $Scripts "05_apply_outlook_categories_local.ps1") @("-Apply")
} else {
    Run-Step "3. Simular categorias en Outlook" (Join-Path $Scripts "05_apply_outlook_categories_local.ps1") @()
}

$moveArgs = @("-RootFolderName", $RootFolderName)
if ($CreateMissingFolders) { $moveArgs += "-CreateMissingFolders" }

Run-Step "4. Simular movimientos" (Join-Path $Scripts "06_move_outlook_local.ps1") $moveArgs
Copy-IfExists "move_simulation_report.csv"

if ($ApplyMoves) {
    $applyMoveArgs = @("-RootFolderName", $RootFolderName, "-Apply")
    if ($CreateMissingFolders) { $applyMoveArgs += "-CreateMissingFolders" }
    Run-Step "5. Mover correos" (Join-Path $Scripts "06_move_outlook_local.ps1") $applyMoveArgs
    Copy-IfExists "move_simulation_report.csv"
} else {
    Write-Host ""
    Write-Host "Movimiento real omitido. Para mover, ejecuta este batch con -ApplyMoves."
}

# Snapshot final despues de todos los pasos.
Copy-IfExists "summary.md"
Copy-IfExists "classified_messages.json"
Copy-IfExists "folder_moves_suggested.csv"
Copy-IfExists "tasks_suggested.csv"
Copy-IfExists "tasks_for_joathiva.csv"
Copy-IfExists "operations_detected.csv"
Copy-IfExists "move_simulation_report.csv"

$manifest = [pscustomobject]@{
    batchId = $BatchId
    createdAt = (Get-Date).ToString("o")
    root = [string]$Root
    limit = $Limit
    applyCategories = [bool]$ApplyCategories
    applyMoves = [bool]$ApplyMoves
    createMissingFolders = [bool]$CreateMissingFolders
    rootFolderName = $RootFolderName
    historyDir = [string]$HistoryDir
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $HistoryDir "manifest.json"), ($manifest | ConvertTo-Json -Depth 10), $Utf8NoBom)

Write-Host ""
Write-Host "=============================================="
Write-Host "Batch terminado"
Write-Host "Historial: $HistoryDir"
Write-Host "Resumen:  $Output\summary.md"
Write-Host "Tareas:   $Output\tasks_for_joathiva.csv"
Write-Host "Ops:      $Output\operations_detected.csv"
Write-Host "Reporte:  $Output\move_simulation_report.csv"
Write-Host "=============================================="

if ($OpenReports) {
    notepad (Join-Path $Output "summary.md")
    notepad (Join-Path $Output "move_simulation_report.csv")
}
