$ErrorActionPreference = "Stop"

$Root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$Scripts = Join-Path $Root "scripts"
$Target = Join-Path $Scripts "05_apply_outlook_categories_local.ps1"

New-Item -ItemType Directory -Force -Path $Scripts | Out-Null

$Code = @'
param(
    [switch]$Apply
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

function Ensure-Category($name) {
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
        Write-Host "No pude crear/verificar categoria: $name"
    }
}

foreach ($m in $data) {
    if ([string]::IsNullOrWhiteSpace($m.id)) {
        continue
    }

    $mail = $null

    try {
        $mail = $ns.GetItemFromID($m.id)
    } catch {
        Write-Host "No pude abrir correo:" $m.subject
        continue
    }

    if ($null -eq $mail) {
        continue
    }

    $newCats = New-Object System.Collections.Generic.List[string]
    $newCats.Add("Joathi")
    $newCats.Add("Joathi - " + $m.joathi.priority.ToUpper())
    $newCats.Add("Joathi Folder - " + $m.joathi.suggestedFolder.Replace("/", " - "))

    foreach ($label in $m.joathi.labels) {
        if (-not [string]::IsNullOrWhiteSpace($label)) {
            $newCats.Add([string]$label)
        }
    }

    $existing = @()
    if (-not [string]::IsNullOrWhiteSpace($mail.Categories)) {
        $existing = @($mail.Categories -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    }

    $final = @($existing + $newCats | Select-Object -Unique)

    foreach ($cat in $final) {
        Ensure-Category $cat
    }

    Write-Host ""
    Write-Host "Correo:" $m.subject
    Write-Host "Categorias:" ($final -join ", ")

    if ($Apply) {
        $mail.Categories = ($final -join ", ")
        $mail.Save()
        Write-Host "Aplicado."
    } else {
        Write-Host "Simulacion. Usa -Apply para escribir en Outlook."
    }
}

'@

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($Target, $Code, $Utf8NoBom)

Write-Host "[OK] Creado:" $Target
Write-Host "Existe:" (Test-Path $Target)
Get-Item $Target | Select-Object FullName,Length
