param(
    [switch]$Apply,
    [switch]$CleanJoathiOnly,
    [int]$RetryDelayMs = 1000
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$InputFile = Join-Path $Root "output\classified_messages.json"

if (-not (Test-Path $InputFile)) {
    throw "No existe classified_messages.json. Primero ejecuta scripts\04_run_outlook_local.ps1"
}

$data = Get-Content $InputFile -Raw | ConvertFrom-Json

$outlook = New-Object -ComObject Outlook.Application
$ns = $outlook.GetNamespace("MAPI")

function Split-Categories([string]$cats) {
    if ([string]::IsNullOrWhiteSpace($cats)) { return @() }

    return @(
        $cats -split "\s*[,;]\s*" |
        ForEach-Object { $_.Trim() } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
}

function Ensure-Category([string]$name) {
    if ([string]::IsNullOrWhiteSpace($name)) { return }

    try {
        $exists = $false
        foreach ($cat in $ns.Categories) {
            if ($cat.Name -eq $name) {
                $exists = $true
                break
            }
        }

        if (-not $exists) {
            $ns.Categories.Add($name) | Out-Null
        }
    } catch {
        Write-Host "Aviso: no pude crear/verificar categoria individual: $name"
    }
}

function Open-Mail([string]$id) {
    try {
        return $ns.GetItemFromID($id)
    } catch {
        return $null
    }
}

function Build-Categories($mail, $m) {
    # Outlook en espaÃ±ol puede devolver categorÃ­as separadas por ; aunque se hayan guardado con coma.
    # Limpiamos todas las categorÃ­as Joathi previas para evitar duplicados y dejamos intactas las categorÃ­as no-Joathi.
    $existingRaw = @()
    if ($null -ne $mail -and -not [string]::IsNullOrWhiteSpace($mail.Categories)) {
        $existingRaw = Split-Categories ([string]$mail.Categories)
    }

    $keep = @(
        $existingRaw |
        Where-Object {
            ($_ -notmatch "^Joathi($|\s|-|;|,)") -and
            ($_ -notmatch "^Joathi Folder") -and
            ($_ -notmatch "^Joathi\s+-")
        }
    )

    if ($CleanJoathiOnly) {
        return @($keep | Select-Object -Unique)
    }

    $newCats = New-Object System.Collections.Generic.List[string]
    $newCats.Add("Joathi")
    $newCats.Add("Joathi - " + $m.joathi.priority.ToUpperInvariant())
    $newCats.Add("Joathi Folder - " + $m.joathi.suggestedFolder.Replace("/", " - "))

    foreach ($label in $m.joathi.labels) {
        if (-not [string]::IsNullOrWhiteSpace($label)) {
            $newCats.Add([string]$label)
        }
    }

    return @($keep + $newCats | Select-Object -Unique)
}

function Save-With-Retry($id, $m) {
    $applied = $false

    for ($attempt = 1; $attempt -le 4 -and -not $applied; $attempt++) {
        try {
            if ($attempt -gt 1) {
                Start-Sleep -Milliseconds $RetryDelayMs
            }

            $mail = Open-Mail $id
            if ($null -eq $mail) {
                throw "No pude abrir/reabrir el correo."
            }

            $final = Build-Categories $mail $m

            foreach ($cat in $final) {
                Ensure-Category $cat
            }

            # Usamos coma al guardar; si Outlook lo muestra con punto y coma, el prÃ³ximo parseo lo entiende igual.
            $mail.Categories = ($final -join ", ")
            $mail.Save()

            Write-Host "Aplicado:" ($final -join " | ")
            $applied = $true
        } catch {
            Write-Host "Intento $attempt fallÃ³:" $_.Exception.Message

            if ($attempt -eq 4) {
                Write-Host "No aplicado. Outlook sigue diciendo que el mensaje fue modificado o bloqueado. Lo salto para no frenar el lote."
            }
        }
    }
}

foreach ($m in $data) {
    if ([string]::IsNullOrWhiteSpace($m.id)) {
        continue
    }

    $mail = Open-Mail $m.id

    if ($null -eq $mail) {
        Write-Host ""
        Write-Host "No pude abrir correo:" $m.subject
        continue
    }

    $previewCats = Build-Categories $mail $m

    Write-Host ""
    Write-Host "Correo:" $m.subject
    if ($CleanJoathiOnly) {
        Write-Host "Accion: limpiar categorias Joathi duplicadas y conservar no-Joathi."
    }
    Write-Host "Categorias finales:" ($previewCats -join " | ")

    if (-not $Apply) {
        Write-Host "Simulacion. Usa -Apply para escribir en Outlook."
        continue
    }

    Save-With-Retry $m.id $m
}
