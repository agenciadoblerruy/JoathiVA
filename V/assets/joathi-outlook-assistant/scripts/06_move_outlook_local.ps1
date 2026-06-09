param(
    [switch]$Apply,
    [switch]$CreateMissingFolders,
    [string]$RootFolderName = "HUBSPOT+JOATHIVA+WEB+OUTLOOK",
    [int]$RetryDelayMs = 1000
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$InputFile = Join-Path $Root "output\classified_messages.json"
$ReportFile = Join-Path $Root "output\move_simulation_report.csv"

if (-not (Test-Path $InputFile)) {
    throw "No existe classified_messages.json. Primero ejecuta scripts\04_run_outlook_local.ps1"
}

$data = Get-Content $InputFile -Raw | ConvertFrom-Json

$outlook = New-Object -ComObject Outlook.Application
$ns = $outlook.GetNamespace("MAPI")

function Normalize-Name([string]$s) {
    return ([string]$s).Trim().ToLowerInvariant()
}

function Find-Folder-Recursive($folder, [string]$name) {
    if ((Normalize-Name $folder.Name) -eq (Normalize-Name $name)) {
        return $folder
    }

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
        if ((Normalize-Name $child.Name) -eq (Normalize-Name $name)) {
            return $child
        }
    }

    if ($Create) {
        return $parent.Folders.Add($name)
    }

    return $null
}

function Resolve-Destination-Folder([string]$relativePath) {
    $rootFolder = Find-Root-Folder $RootFolderName

    if ($null -eq $rootFolder) {
        throw "No encontre la carpeta raiz '$RootFolderName' en Outlook."
    }

    $current = $rootFolder
    $parts = @($relativePath -split "/" | ForEach-Object { $_.Trim() } | Where-Object { $_ })

    foreach ($part in $parts) {
        $next = Get-Or-Create-Child $current $part -Create:$CreateMissingFolders
        if ($null -eq $next) {
            return $null
        }
        $current = $next
    }

    return $current
}

function Open-Mail([string]$id) {
    try {
        return $ns.GetItemFromID($id)
    } catch {
        return $null
    }
}


function Get-Guarded-Destination([string]$subject, [string]$destPath) {
    $s = ([string]$subject).ToLowerInvariant()
    $isOperationalSubject =
        ($s -match "planta ensenada|camion|cami[oÃƒÂ³]n|carga|terrestre|paraguay|bogg|\bzc\s*\d+|\bct\s*\d+|\bpy\d+|sm6") -and
        ($s -notmatch "resumen semanal|actualizaciones de productos|wp mail smtp|unlock more control|revista transporte|confirma el correo|confirmar el correo")

    if ($isOperationalSubject) {
        return "03_OPERACIONES/01_ABIERTAS"
    }

    return $destPath
}

function CsvEscape($v) {
    $s = [string]$v
    return '"' + $s.Replace('"','""') + '"'
}

$report = @()
$report += "subject,priority,destination,status"

Write-Host "== Joathi Outlook mover local =="
Write-Host "Root destino:" $RootFolderName
Write-Host "Apply:" $Apply
Write-Host "CreateMissingFolders:" $CreateMissingFolders
Write-Host ""

foreach ($m in $data) {
    $subject = [string]$m.subject
    $priority = [string]$m.joathi.priority
    $destPath = Get-Guarded-Destination ([string]$m.subject) ([string]$m.joathi.suggestedFolder)

    if ([string]::IsNullOrWhiteSpace($m.id)) {
        Write-Host "SIN ID:" $subject
        $report += @((CsvEscape $subject), (CsvEscape $priority), (CsvEscape $destPath), (CsvEscape "sin_id")) -join ","
        continue
    }

    $destFolder = Resolve-Destination-Folder $destPath

    if ($null -eq $destFolder) {
        Write-Host "NO EXISTE DESTINO:" $destPath " | " $subject
        $report += @((CsvEscape $subject), (CsvEscape $priority), (CsvEscape $destPath), (CsvEscape "destino_no_existe")) -join ","
        continue
    }

    Write-Host "Correo:" $subject
    Write-Host "Destino:" $RootFolderName "/" $destPath

    if (-not $Apply) {
        Write-Host "Simulacion. No movido."
        Write-Host ""
        $report += @((CsvEscape $subject), (CsvEscape $priority), (CsvEscape $destPath), (CsvEscape "simulado")) -join ","
        continue
    }

    $moved = $false

    for ($attempt = 1; $attempt -le 4 -and -not $moved; $attempt++) {
        try {
            if ($attempt -gt 1) {
                Start-Sleep -Milliseconds $RetryDelayMs
            }

            $mail = Open-Mail ([string]$m.id)
            if ($null -eq $mail) {
                throw "No pude abrir/reabrir el correo."
            }

            $mail.Move($destFolder) | Out-Null
            Write-Host "Movido."
            Write-Host ""
            $report += @((CsvEscape $subject), (CsvEscape $priority), (CsvEscape $destPath), (CsvEscape "movido")) -join ","
            $moved = $true
        } catch {
            Write-Host "Intento $attempt fallo:" $_.Exception.Message

            if ($attempt -eq 4) {
                Write-Host "No movido. Outlook lo mantiene bloqueado o ya no esta en la ubicacion esperada."
                Write-Host ""
                $report += @((CsvEscape $subject), (CsvEscape $priority), (CsvEscape $destPath), (CsvEscape "no_movido_bloqueado")) -join ","
            }
        }
    }
}

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($ReportFile, ($report -join "`r`n"), $Utf8NoBom)

Write-Host "Reporte:" $ReportFile

if (-not $Apply) {
    Write-Host ""
    Write-Host "Modo simulacion completo. Para mover de verdad usa -Apply."
}
