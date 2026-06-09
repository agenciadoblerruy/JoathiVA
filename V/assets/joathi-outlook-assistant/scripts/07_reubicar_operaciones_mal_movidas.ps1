param(
    [switch]$Apply,
    [switch]$CreateMissingFolders,
    [string]$RootFolderName = "HUBSPOT+JOATHIVA+WEB+OUTLOOK",
    [int]$MaxPerFolder = 500
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Output = Join-Path $Root "output"
$ReportFile = Join-Path $Output ("reubicacion_operaciones_report_" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".csv")

New-Item -ItemType Directory -Force -Path $Output | Out-Null

$outlook = New-Object -ComObject Outlook.Application
$ns = $outlook.GetNamespace("MAPI")

function Fold([string]$s) {
    if ([string]::IsNullOrWhiteSpace($s)) { return "" }
    $d = $s.Normalize([Text.NormalizationForm]::FormD)
    return ([regex]::Replace($d, "\p{Mn}", "")).ToLowerInvariant()
}

function Normalize-Name([string]$s) {
    return ([string]$s).Trim().ToLowerInvariant()
}

function CsvEscape($v) {
    $s = [string]$v
    return '"' + $s.Replace('"','""') + '"'
}

function Find-Folder-Recursive($folder, [string]$name) {
    if ((Normalize-Name $folder.Name) -eq (Normalize-Name $name)) { return $folder }
    foreach ($child in $folder.Folders) {
        $found = Find-Folder-Recursive $child $name
        if ($null -ne $found) { return $found }
    }
    return $null
}

function Find-Root-Folder([string]$name) {
    foreach ($storeRoot in $ns.Folders) {
        $found = Find-Folder-Recursive $storeRoot $name
        if ($null -ne $found) { return $found }
    }
    return $null
}

function Get-Or-Create-Child($parent, [string]$name, [switch]$Create) {
    foreach ($child in $parent.Folders) {
        if ((Normalize-Name $child.Name) -eq (Normalize-Name $name)) { return $child }
    }
    if ($Create) { return $parent.Folders.Add($name) }
    return $null
}

function Resolve-Relative-Folder($rootFolder, [string]$relativePath) {
    $current = $rootFolder
    foreach ($part in @($relativePath -split "/" | ForEach-Object { $_.Trim() } | Where-Object { $_ })) {
        $next = Get-Or-Create-Child $current $part -Create:$CreateMissingFolders
        if ($null -eq $next) { return $null }
        $current = $next
    }
    return $current
}

function Is-Operational-Mail($mail) {
    $subject = Fold ([string]$mail.Subject)
    $body = ""
    try {
        $body = Fold ([string]$mail.Body)
        if ($body.Length -gt 1500) { $body = $body.Substring(0,1500) }
    } catch {}

    $text = "$subject $body"

    $isMarketing = $text -match "resumen semanal de actualizaciones|actualizaciones de productos|wp mail smtp|unlock more control|revista transporte carretero|confirma el correo electronico|confirmar el correo electronico|seo que conoces"
    if ($isMarketing) { return $false }

    return $text -match "planta ensenada|camion|carga|terrestre|paraguay|bogg|\bzc\s*\d+|\bct\s*\d+|\bpy\d+|sm6|aduana|despacho|embarque|eta|liberacion|\bctl\s*\d+|\bfob\b|\bcbm\b|shenzhen|bookshop|epuet|cotmvd|transporte"
}

function Get-Folder-Path($folder) {
    try { return [string]$folder.FolderPath } catch { return [string]$folder.Name }
}

function Scan-Folder($folder, $destFolder, [System.Collections.Generic.List[object]]$rows) {
    $folderPath = Get-Folder-Path $folder

    # No escanear destino operacional ni criticos/interno.
    if ($folderPath -match "\\03_OPERACIONES(\\|$)") { return }
    if ($folderPath -match "\\08_PENDIENTES_CRITICOS(\\|$)") { return }
    if ($folderPath -match "\\07_INTERNO_JOATHI(\\|$)") { return }

    $items = $null
    try { $items = $folder.Items } catch { $items = $null }

    if ($null -ne $items) {
        $count = [Math]::Min($items.Count, $MaxPerFolder)
        for ($i = $count; $i -ge 1; $i--) {
            $mail = $null
            try { $mail = $items.Item($i) } catch { $mail = $null }

            if ($null -eq $mail) { continue }
            if ($mail.MessageClass -notlike "IPM.Note*") { continue }

            if (Is-Operational-Mail $mail) {
                $subject = [string]$mail.Subject
                $status = "simulado"

                Write-Host "Operacion detectada fuera de operaciones:" $subject
                Write-Host "Desde:" $folderPath
                Write-Host "Hacia:" (Get-Folder-Path $destFolder)

                if ($Apply) {
                    try {
                        $mail.Move($destFolder) | Out-Null
                        $status = "movido"
                        Write-Host "Movido."
                    } catch {
                        $status = "error: " + $_.Exception.Message
                        Write-Host "No movido:" $_.Exception.Message
                    }
                } else {
                    Write-Host "Simulacion. No movido."
                }

                $rows.Add([pscustomobject]@{
                    subject = $subject
                    fromFolder = $folderPath
                    toFolder = Get-Folder-Path $destFolder
                    status = $status
                }) | Out-Null

                Write-Host ""
            }
        }
    }

    foreach ($child in $folder.Folders) {
        Scan-Folder $child $destFolder $rows
    }
}

$rootFolder = Find-Root-Folder $RootFolderName
if ($null -eq $rootFolder) {
    throw "No encontre la carpeta raiz '$RootFolderName' en Outlook."
}

$destFolder = Resolve-Relative-Folder $rootFolder "03_OPERACIONES/01_ABIERTAS"
if ($null -eq $destFolder) {
    throw "No encontre destino 03_OPERACIONES/01_ABIERTAS. Usa -CreateMissingFolders si queres crearlo."
}

Write-Host "== Reubicar operaciones mal clasificadas =="
Write-Host "Root:" $RootFolderName
Write-Host "Destino:" (Get-Folder-Path $destFolder)
Write-Host "Apply:" $Apply
Write-Host ""

$rows = New-Object System.Collections.Generic.List[object]
Scan-Folder $rootFolder $destFolder $rows

$lines = @()
$lines += "subject,fromFolder,toFolder,status"
foreach ($r in $rows) {
    $lines += @(
        CsvEscape $r.subject
        CsvEscape $r.fromFolder
        CsvEscape $r.toFolder
        CsvEscape $r.status
    ) -join ","
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($ReportFile, ($lines -join "`r`n"), $Utf8NoBom)

Write-Host "Reporte:" $ReportFile
Write-Host "Detectados:" $rows.Count

if (-not $Apply) {
    Write-Host "Modo simulacion. Para reubicar de verdad usa -Apply."
}
