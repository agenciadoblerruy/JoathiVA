param(
    [string]$BatchId = $(Get-Date -Format "yyyyMMdd-HHmmss")
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Output = Join-Path $Root "output"
$InputFile = Join-Path $Output "classified_messages.json"
$HistoryDir = Join-Path $Output ("history\" + $BatchId)

if (-not (Test-Path $InputFile)) {
    throw "No existe classified_messages.json. Primero ejecuta scripts\04_run_outlook_local.ps1"
}

New-Item -ItemType Directory -Force -Path $Output | Out-Null
New-Item -ItemType Directory -Force -Path $HistoryDir | Out-Null

$data = Get-Content $InputFile -Raw | ConvertFrom-Json

function Fold([string]$s) {
    if ([string]::IsNullOrWhiteSpace($s)) { return "" }
    $d = $s.Normalize([Text.NormalizationForm]::FormD)
    return ([regex]::Replace($d, "\p{Mn}", "")).ToLowerInvariant()
}

function CsvEscape($v) {
    $s = [string]$v
    return '"' + $s.Replace('"','""') + '"'
}

function Get-OperationKey([string]$subject) {
    $s = [string]$subject

    $patterns = @(
        "PY\d+",
        "BOGG\d+",
        "CTL\s*\d+",
        "\bCT\s*\d+",
        "\bZC\s*\d+",
        "EPUET\d+",
        "COTMVD\d+",
        "C\d+/\d+"
    )

    foreach ($p in $patterns) {
        $m = [regex]::Match($s, $p, "IgnoreCase")
        if ($m.Success) {
            return ($m.Value -replace "\s+", " ").Trim().ToUpperInvariant()
        }
    }

    $base = $s -replace "^(RE|FW|FWD):\s*", ""
    $base = $base -replace "\s+", " "
    if ($base.Length -gt 80) { return $base.Substring(0,80) }
    return $base
}

function Get-TaskType($m) {
    $folder = [string]$m.joathi.suggestedFolder
    $labels = @($m.joathi.labels) -join "; "

    if ($folder -match "03_OPERACIONES") { return "Operacion" }
    if ($folder -match "08_PENDIENTES_CRITICOS") { return "Urgente" }
    if ($folder -match "07_INTERNO") { return "Interno/Seguridad" }
    if ($folder -match "05_DOCUMENTACION") { return "Documentacion" }
    if ($folder -match "04_COMERCIAL") { return "Comercial" }
    if ($labels -match "Pago") { return "Pago" }
    return "Triage"
}

function Is-Operation($m) {
    $subject = Fold ([string]$m.subject)
    $body = Fold ([string]$m.bodyPreview)
    $folder = [string]$m.joathi.suggestedFolder

    $patterns = "planta ensenada|camion|carga|terrestre|paraguay|bogg|\bzc\s*\d+|\bct\s*\d+|\bpy\d+|sm6|aduana|despacho|embarque|eta|liberacion|\bctl\s*\d+|\bfob\b|\bcbm\b|shenzhen|bookshop|epuet|cotmvd|transporte"

    if ($folder -match "03_OPERACIONES") { return $true }
    return (($subject + " " + $body) -match $patterns)
}

function Get-RouteHints($m) {
    $text = Fold ("$($m.subject) $($m.bodyPreview)")
    $hints = New-Object System.Collections.Generic.List[string]

    foreach ($pair in @(
        @("Paraguay", "paraguay"),
        @("Chile", "chile"),
        @("Planta Ensenada", "planta ensenada"),
        @("Terrestre", "terrestre"),
        @("Shenzhen", "shenzhen"),
        @("FOB", "\bfob\b"),
        @("CBM", "\bcbm\b"),
        @("Bookshop", "bookshop"),
        @("Transporte", "transporte")
    )) {
        if ($text -match $pair[1]) { $hints.Add($pair[0]) }
    }

    return (@($hints | Select-Object -Unique) -join "; ")
}

$tasks = @()
$tasks += "batchId,receivedDateTime,priority,taskType,subject,from,suggestedFolder,suggestedAction,status,sourceMessageId"

$operations = @()
$operations += "batchId,operationKey,subject,from,receivedDateTime,priority,routeHints,clientHints,suggestedFolder,sourceMessageId"

foreach ($m in $data) {
    $taskType = Get-TaskType $m
    $status = if ([string]$m.joathi.priority -eq "alta") { "prioritario" } else { "pendiente" }

    $tasks += @(
        CsvEscape $BatchId
        CsvEscape $m.receivedDateTime
        CsvEscape $m.joathi.priority
        CsvEscape $taskType
        CsvEscape $m.subject
        CsvEscape $m.from
        CsvEscape $m.joathi.suggestedFolder
        CsvEscape $m.joathi.suggestedAction
        CsvEscape $status
        CsvEscape $m.id
    ) -join ","

    if (Is-Operation $m) {
        $clientHints = ""
        $labels = @($m.joathi.labels) -join "; "
        if ($labels -match "ULG") { $clientHints = "ULG Logistics" }

        $operations += @(
            CsvEscape $BatchId
            CsvEscape (Get-OperationKey ([string]$m.subject))
            CsvEscape $m.subject
            CsvEscape $m.from
            CsvEscape $m.receivedDateTime
            CsvEscape $m.joathi.priority
            CsvEscape (Get-RouteHints $m)
            CsvEscape $clientHints
            CsvEscape $m.joathi.suggestedFolder
            CsvEscape $m.id
        ) -join ","
    }
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $Output "tasks_for_joathiva.csv"), ($tasks -join "`r`n"), $Utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $Output "operations_detected.csv"), ($operations -join "`r`n"), $Utf8NoBom)

# Copia de historial del lote.
foreach ($file in @(
    "summary.md",
    "classified_messages.json",
    "folder_moves_suggested.csv",
    "tasks_suggested.csv",
    "tasks_for_joathiva.csv",
    "operations_detected.csv"
)) {
    $src = Join-Path $Output $file
    if (Test-Path $src) {
        Copy-Item $src (Join-Path $HistoryDir $file) -Force
    }
}

$manifest = [pscustomobject]@{
    batchId = $BatchId
    createdAt = (Get-Date).ToString("o")
    classifiedCount = @($data).Count
    tasksCount = [Math]::Max(0, $tasks.Count - 1)
    operationsCount = [Math]::Max(0, $operations.Count - 1)
}

[System.IO.File]::WriteAllText((Join-Path $HistoryDir "manifest.json"), ($manifest | ConvertTo-Json -Depth 10), $Utf8NoBom)

Write-Host "Exports JoathiVA generados."
Write-Host "BatchId:" $BatchId
Write-Host "Historial:" $HistoryDir
Write-Host "Tareas:" (Join-Path $Output "tasks_for_joathiva.csv")
Write-Host "Operaciones:" (Join-Path $Output "operations_detected.csv")
