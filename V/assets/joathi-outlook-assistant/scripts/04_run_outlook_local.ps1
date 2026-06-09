param(
    [int]$Limit = 10
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Output = Join-Path $Root "output"
New-Item -ItemType Directory -Force -Path $Output | Out-Null

function Fold([string]$s) {
    if ([string]::IsNullOrWhiteSpace($s)) { return "" }
    $d = $s.Normalize([Text.NormalizationForm]::FormD)
    return ([regex]::Replace($d, "\p{Mn}", "")).ToLowerInvariant()
}

function CsvEscape($v) {
    $s = [string]$v
    return '"' + $s.Replace('"','""') + '"'
}

function Classify($m) {
    $raw = "$($m.subject) $($m.from) $($m.bodyPreview)"
    $text = Fold $raw

    $priority = "baja"
    $folder = "00_PENDIENTE_TRIAGE"
    $action = "Revisar y clasificar manualmente."
    $labels = New-Object System.Collections.Generic.List[string]

    $isMicrosoft = $text -match "microsoft account|new app.*connected|security alert|account security|microsoft"
    $isRealEstate = $text -match "apartamento|punta del este|inmobiliaria|usd\s*205|reciclado"
    $isMarketing = $text -match "resumen semanal de actualizaciones|actualizaciones de productos|wp mail smtp|unlock more control|revista transporte carretero|confirma el correo electronico de tu negocio|confirmar el correo electronico de tu negocio"
    $isCritical = $text -match "urgente|critico|bloqueado|riesgo|vencido|para hoy|hoy mismo|miercoles\s*06/05/2026"
    $isOperation = ($text -match "planta ensenada|camion|carga|terrestre|paraguay|bogg|\bzc\s*\d+|\bct\s*\d+|\bpy\d+|sm6|aduana|despacho|embarque|eta|liberacion|\bctl\s*\d+|\bfob\b|\bcbm\b|shenzhen|bookshop") -and (-not $isMarketing)
    $isCrtMic = ($text -match "\bcrt\b|\bmic\b|\bmic[-\s]?dta\b|\bcrt/mic\b") -and ($text -match "adjunto|envio|enviar|falta|faltante|documento|documentacion|escaneo|firmado|corregir|correccion|pendiente") -and ($text -notmatch "microsoft|miercoles")
    $isDua = ($text -match "\bdua\b") -and ($text -match "adjunto|envio|enviar|falta|faltante|documento|documentacion|escaneo|firmado|corregir|correccion|pendiente")
    $isInvoice = ($text -match "factura|invoice|pago|cobro|recibo") -and ($text -match "adjunto|envio|enviar|falta|faltante|documento|documentacion|escaneo|firmado|corregir|correccion|pendiente|pagar|abonado")
    $isQuote = $text -match "cotizacion|presupuesto|tarifa|precio|quote"
    $isFollow = $text -match "seguimiento|follow up|respuesta pendiente|reitero|consulta estado|aguardo|quedo atento"
    $isUlg = $text -match "ulg logistics|\bulg\b"

    if ($isRealEstate -or $isMarketing) {
        $priority = "baja"
        $folder = "00_PENDIENTE_TRIAGE"
        $labels.Add("Joathi - No Joathi")
        $action = "Correo no operativo. Revisar si corresponde archivar o crear carpeta 99_NO_JOATHI."
    }
    elseif ($isMicrosoft) {
        $priority = "media"
        $folder = "07_INTERNO_JOATHI"
        $labels.Add("Joathi - Interno")
        $labels.Add("Joathi - Seguridad")
        $action = "Revisar alerta de seguridad Microsoft. Confirmar si la app conectada fue autorizada."
    }
    elseif ($isCritical) {
        $priority = "alta"
        $folder = "08_PENDIENTES_CRITICOS"
        $labels.Add("Joathi - Urgente")
        $action = "Revisar primero y definir respuesta inmediata."
    }

    # Regla principal v0.9:
    # Si es operacion activa, la carpeta principal debe ser operaciones,
    # aunque mencione cliente, DUA, factura o pago.
    if ($isOperation -and $folder -ne "08_PENDIENTES_CRITICOS" -and -not $isMicrosoft -and -not $isRealEstate -and -not $isMarketing) {
        if ($priority -eq "baja") { $priority = "media" }
        $folder = "03_OPERACIONES/01_ABIERTAS"
        $labels.Add("Joathi - Operaciones")
        $action = "Crear tarea operativa y dar seguimiento."
    }

    if ($isQuote -and $folder -ne "08_PENDIENTES_CRITICOS" -and -not $isOperation) {
        if ($priority -eq "baja") { $priority = "media" }
        $folder = "04_COMERCIAL/01_COTIZACIONES_NUEVAS"
        $labels.Add("Joathi - Cotizacion")
        $action = "Preparar o revisar cotizacion."
    }

    if ($isFollow -and $folder -ne "08_PENDIENTES_CRITICOS" -and -not $isOperation) {
        if ($priority -eq "baja") { $priority = "media" }
        $folder = "04_COMERCIAL/02_EN_SEGUIMIENTO"
        $labels.Add("Joathi - Seguimiento")
        $action = "Hacer seguimiento y responder estado."
    }

    if ($isDua -and -not $isOperation) {
        if ($priority -eq "baja") { $priority = "media" }
        $folder = "05_DOCUMENTACION/01_DUA"
        $labels.Add("Joathi - Documento")
        $action = "Revisar documentacion DUA."
    }

    if ($isCrtMic -and -not $isOperation) {
        if ($priority -eq "baja") { $priority = "media" }
        $folder = "05_DOCUMENTACION/02_CRT_MIC"
        $labels.Add("Joathi - Documento")
        $action = "Revisar CRT/MIC."
    }

    if ($isInvoice -and -not $isOperation) {
        if ($priority -eq "baja") { $priority = "media" }
        $folder = "05_DOCUMENTACION/03_FACTURAS"
        $labels.Add("Joathi - Pago")
        $action = "Revisar factura/pago y registrar seguimiento."
    }

    if ($isUlg) {
        $labels.Add("Joathi - Cliente ULG")
        if (-not $isOperation -and $folder -eq "00_PENDIENTE_TRIAGE") {
            if ($priority -eq "baja") { $priority = "media" }
            $folder = "02_CLIENTES/Cliente - ULG Logistics"
        }
    }

    $uniqueLabels = @($labels | Select-Object -Unique)

    return [pscustomobject]@{
        id = $m.id
        subject = $m.subject
        from = $m.from
        receivedDateTime = $m.receivedDateTime
        bodyPreview = $m.bodyPreview
        joathi = [pscustomobject]@{
            priority = $priority
            labels = $uniqueLabels
            suggestedFolder = $folder
            suggestedAction = $action
        }
    }
}

Write-Host "== Leyendo Outlook local =="

$outlook = New-Object -ComObject Outlook.Application
$ns = $outlook.GetNamespace("MAPI")
$inbox = $ns.GetDefaultFolder(6)
$items = $inbox.Items
$items.Sort("[ReceivedTime]", $true)

$messages = @()
$count = 0

for ($i = 1; $i -le $items.Count -and $count -lt $Limit; $i++) {
    $mail = $items.Item($i)
    if ($null -eq $mail) { continue }
    if ($mail.MessageClass -notlike "IPM.Note*") { continue }

    $body = [string]$mail.Body
    if ($body.Length -gt 700) { $preview = $body.Substring(0,700) } else { $preview = $body }

    $received = ""
    try { $received = $mail.ReceivedTime.ToString("o") } catch {}

    $messages += [pscustomobject]@{
        id = [string]$mail.EntryID
        subject = [string]$mail.Subject
        from = "$($mail.SenderName) <$($mail.SenderEmailAddress)>"
        receivedDateTime = $received
        bodyPreview = $preview
    }

    $count++
}

$class = @()
foreach ($m in $messages) { $class += Classify $m }

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $Output "classified_messages.json"), ($class | ConvertTo-Json -Depth 20), $utf8NoBom)

$moves = @()
$moves += "receivedDateTime,from,subject,priority,suggestedFolder,labels"

$tasks = @()
$tasks += "receivedDateTime,from,subject,priority,action"

foreach ($m in $class) {
    $moves += @(
        CsvEscape $m.receivedDateTime
        CsvEscape $m.from
        CsvEscape $m.subject
        CsvEscape $m.joathi.priority
        CsvEscape $m.joathi.suggestedFolder
        CsvEscape (($m.joathi.labels) -join "; ")
    ) -join ","

    $tasks += @(
        CsvEscape $m.receivedDateTime
        CsvEscape $m.from
        CsvEscape $m.subject
        CsvEscape $m.joathi.priority
        CsvEscape $m.joathi.suggestedAction
    ) -join ","
}

[System.IO.File]::WriteAllText((Join-Path $Output "folder_moves_suggested.csv"), ($moves -join "`r`n"), $utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $Output "tasks_suggested.csv"), ($tasks -join "`r`n"), $utf8NoBom)

$alta = @($class | Where-Object { $_.joathi.priority -eq "alta" }).Count
$media = @($class | Where-Object { $_.joathi.priority -eq "media" }).Count
$baja = @($class | Where-Object { $_.joathi.priority -eq "baja" }).Count

$summary = @()
$summary += "# Resumen Joathi Outlook Assistant LOCAL v0.10"
$summary += ""
$summary += "Procesados: $($class.Count)"
$summary += "Clasificados: $($class.Count)"
$summary += "Alta: $alta"
$summary += "Media: $media"
$summary += "Baja: $baja"
$summary += ""
$summary += "## Carpetas sugeridas"
$summary += ""

$class | Group-Object { $_.joathi.suggestedFolder } | Sort-Object Count -Descending | ForEach-Object {
    $summary += "- $($_.Name): $($_.Count)"
}

$summary += ""
$summary += "## Acciones sugeridas"
$summary += ""

foreach ($m in $class) {
    $summary += "- [$($m.joathi.priority)] $($m.subject) -> $($m.joathi.suggestedAction)"
}

[System.IO.File]::WriteAllText((Join-Path $Output "summary.md"), ($summary -join "`r`n"), $utf8NoBom)

Write-Host "Procesados:" $class.Count
Write-Host "Salida:" $Output
Write-Host "Resumen:" (Join-Path $Output "summary.md")
