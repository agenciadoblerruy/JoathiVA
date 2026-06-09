$script:AssistantRoot = Split-Path -Parent $PSScriptRoot
$script:AssistantStorePath = Join-Path $script:AssistantRoot "data\assistant-store.json"
$script:AssistantSourceKinds = @("simulated", "provider", "mailbox")
$script:AssistantDraftAutoCaseTypes = @(
  "caso de operacion Paraguay",
  "solicitud documental",
  "seguimiento comercial"
)
$script:AssistantCaseTypes = @(
  "informativo",
  "seguimiento comercial",
  "solicitud documental",
  "caso operativo",
  "caso de operacion Paraguay"
)

function Get-AssistantNowIso {
  return (Get-Date).ToUniversalTime().ToString("o")
}

function New-AssistantRecordId {
  param([string]$Prefix)

  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $random = [guid]::NewGuid().ToString("N").Substring(0, 6)
  return "$Prefix-$stamp-$random"
}

function ConvertTo-AssistantArray {
  param([object]$Value)

  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [System.Management.Automation.PSCustomObject] -and $Value.PSObject.Properties.Count -eq 0) {
    return @()
  }

  if ($Value -is [System.Array]) {
    $items = New-Object System.Collections.Generic.List[object]
    foreach ($item in $Value) {
      if ($null -ne $item) {
        $items.Add($item) | Out-Null
      }
    }
    return $items.ToArray()
  }

  return ,$Value
}

function ConvertTo-AssistantDictionary {
  param([object]$Value)

  $dict = @{}
  if ($null -eq $Value) {
    return $dict
  }

  if ($Value -is [System.Collections.IDictionary]) {
    foreach ($key in $Value.Keys) {
      $dict[[string]$key] = $Value[$key]
    }
    return $dict
  }

  foreach ($property in $Value.PSObject.Properties) {
    $dict[$property.Name] = $property.Value
  }

  return $dict
}

function Get-AssistantObjectStringValue {
  param(
    [object]$Value,
    [string]$Name
  )

  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace($Name)) {
    return ""
  }

  try {
    if ($Value -is [System.Collections.IDictionary] -and $Value.Contains($Name)) {
      return [string]$Value[$Name]
    }
  } catch {
  }

  try {
    $property = $Value.PSObject.Properties[$Name]
    if ($property) {
      return [string]$property.Value
    }
  } catch {
  }

  foreach ($containerName in @("items", "data", "record")) {
    try {
      $containerProperty = $Value.PSObject.Properties[$containerName]
      if ($containerProperty) {
        $containerValue = $containerProperty.Value
        if ($null -ne $containerValue) {
          if ($containerValue -is [System.Array]) {
            foreach ($item in @($containerValue)) {
              $nested = Get-AssistantObjectStringValue -Value $item -Name $Name
              if (-not [string]::IsNullOrWhiteSpace($nested)) {
                return $nested
              }
            }
          } else {
            $nested = Get-AssistantObjectStringValue -Value $containerValue -Name $Name
            if (-not [string]::IsNullOrWhiteSpace($nested)) {
              return $nested
            }
          }
        }
      }
    } catch {
    }
  }

  try {
    $direct = $Value.$Name
    if (-not [string]::IsNullOrWhiteSpace([string]$direct)) {
      return [string]$direct
    }
  } catch {
  }

  return ""
}

function Get-AssistantDefaultStore {
  $now = Get-AssistantNowIso
  return [pscustomobject]@{
    version = 2
    generatedAt = $now
    updatedAt = $now
    nextSequence = 1
    intakes = @()
    drafts = @()
  }
}

function Normalize-AssistantStoreShape {
  param([object]$Store)

  $seed = Get-AssistantDefaultStore
  $source = if ($Store) { $Store } else { $seed }
  $version = 0
  $nextSequence = 0
  [void][int]::TryParse([string]$source.version, [ref]$version)
  [void][int]::TryParse([string]$source.nextSequence, [ref]$nextSequence)

  return [pscustomobject]@{
    version = if ($version -lt 2) { 2 } else { $version }
    generatedAt = if ([string]::IsNullOrWhiteSpace([string]$source.generatedAt)) { $seed.generatedAt } else { [string]$source.generatedAt }
    updatedAt = if ([string]::IsNullOrWhiteSpace([string]$source.updatedAt)) { $seed.updatedAt } else { [string]$source.updatedAt }
    nextSequence = if ($nextSequence -lt 1) { 1 } else { $nextSequence }
    intakes = ConvertTo-AssistantArray -Value $source.intakes
    drafts = ConvertTo-AssistantArray -Value $source.drafts
  }
}

function Initialize-AssistantStoreFile {
  if (-not (Test-Path $AssistantStorePath)) {
    Save-AssistantStore -Store (Get-AssistantDefaultStore)
  }
}

function Get-AssistantStore {
  Initialize-AssistantStoreFile

  try {
    $raw = Get-Content -LiteralPath $AssistantStorePath -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) {
      return Get-AssistantDefaultStore
    }

    $parsed = $raw | ConvertFrom-Json
    return Normalize-AssistantStoreShape -Store $parsed
  } catch {
    return Get-AssistantDefaultStore
  }
}

function Save-AssistantStore {
  param([object]$Store)

  $normalized = Normalize-AssistantStoreShape -Store $Store
  $normalized.updatedAt = Get-AssistantNowIso
  $json = $normalized | ConvertTo-Json -Depth 100
  $json = $json -replace '"intakes":\s*\{\s*\}', '"intakes": []'
  $json = $json -replace '"drafts":\s*\{\s*\}', '"drafts": []'
  Set-Content -LiteralPath $AssistantStorePath -Value $json -Encoding UTF8
}

function Get-AssistantQueryString {
  param([hashtable]$Parts)

  $items = New-Object System.Collections.Generic.List[string]
  foreach ($entry in @($Parts.GetEnumerator())) {
    if ($null -eq $entry.Value) {
      continue
    }
    $text = [string]$entry.Value
    if ([string]::IsNullOrWhiteSpace($text)) {
      continue
    }
    $key = [uri]::EscapeDataString([string]$entry.Key)
    $value = [uri]::EscapeDataString($text)
    $items.Add("$key=$value") | Out-Null
  }

  if (-not $items.Count) {
    return ""
  }

  return ($items -join "&")
}

function Get-AssistantExecutionDecision {
  param([object]$Body)

  $mode = ""
  if ($Body -and ($Body.PSObject.Properties.Name -contains "mode")) {
    $mode = ([string]$Body.mode).Trim().ToLowerInvariant()
  }

  if ($mode -eq "dry-run") {
    return [pscustomobject]@{
      execute = $false
      mode = "dry-run"
      source = "mode"
    }
  }

  if ($mode -in @("execute", "commit")) {
    return [pscustomobject]@{
      execute = $true
      mode = "execute"
      source = "mode"
    }
  }

  $execute = $false
  if ($Body) {
    $execute = $Body.execute -eq $true -or $Body.commit -eq $true
  }

  return [pscustomobject]@{
    execute = [bool]$execute
    mode = if ($execute) { "execute" } else { "dry-run" }
    source = if ($execute) { "flag" } else { "default" }
  }
}

function ConvertTo-AssistantNormalizedText {
  param([string]$Text)

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return ""
  }

  $clean = [string]$Text
  $clean = [regex]::Replace($clean, '(?is)<style.*?</style>', ' ')
  $clean = [regex]::Replace($clean, '(?is)<script.*?</script>', ' ')
  $clean = [regex]::Replace($clean, '(?is)<[^>]+>', ' ')
  $clean = [regex]::Replace($clean, '(?im)^\s*>\s?.*$', ' ')
  $clean = [regex]::Replace($clean, '(?im)^--\s*$', ' ')
  $clean = [regex]::Replace($clean, '(?im)^sent from my .+$', ' ')

  try {
    $clean = $clean.Normalize([System.Text.NormalizationForm]::FormD)
    $clean = [regex]::Replace($clean, '\p{Mn}', '')
  } catch {
  }

  $clean = $clean.ToLowerInvariant()
  $clean = [regex]::Replace($clean, '\s+', ' ').Trim()

  if ($clean.Length -gt 5000) {
    return $clean.Substring(0, 4997).Trim() + "..."
  }

  return $clean
}

function Normalize-AssistantBody {
  param(
    [string]$BodyText,
    [string]$BodyHtml,
    [string]$Preview = ""
  )

  $source = if (-not [string]::IsNullOrWhiteSpace($BodyText)) {
    $BodyText
  } elseif (-not [string]::IsNullOrWhiteSpace($BodyHtml)) {
    $BodyHtml
  } else {
    $Preview
  }

  return ConvertTo-AssistantNormalizedText -Text $source
}

function Get-AssistantAutoOperationHint {
  param(
    [string]$Subject,
    [string]$BodyText,
    [string]$BodyNormalized,
    [string]$ActorRole = "",
    [object]$ExistingHint = $null
  )

  $hint = ConvertTo-AssistantDictionary -Value $ExistingHint
  $subjectText = [string]$Subject
  $bodyTextValue = [string]$BodyText
  $normalizedText = ConvertTo-AssistantNormalizedText -Text "$subjectText $bodyTextValue $BodyNormalized"
  $internalContainerReturned = Test-AssistantInternalContainerReturnClosure -Text $normalizedText -ActorRole $ActorRole

  $reference = ""
  foreach ($pattern in @(
    '(?i)\bpy\d{5,10}\b',
    '(?i)\bct\s*\d{3,8}\b',
    '(?i)\bcotmvd\d+\b'
  )) {
    if ($subjectText -match $pattern) {
      $reference = [string]$Matches[0]
      break
    }
    if ($bodyTextValue -match $pattern) {
      $reference = [string]$Matches[0]
      break
    }
    if ($normalizedText -match $pattern) {
      $reference = [string]$Matches[0]
      break
    }
  }
  $subjectHasOperationalCue = $normalizedText -match '\b(paraguay|asuncion|montevideo|murchison|clorinda|bogg|falcon|arribo|camion|contenedor|booking|ncm|dua|mic|devolv|aduana|operacion)\b' -or $subjectText -match '(?i)\bpy\d{5,10}\b|\bct\s*\d{3,8}\b|\bcotmvd\d+\b|\b[a-z]{4}\d{6,8}\b'
  if ([string]::IsNullOrWhiteSpace($reference) -and -not [string]::IsNullOrWhiteSpace($subjectText) -and $subjectHasOperationalCue) {
    $reference = $subjectText.Trim()
    if ($reference.Length -gt 60) {
      $reference = $reference.Substring(0, 60).Trim()
    }
  }

  $booking = Get-AssistantKeywordValueAfter -Text $normalizedText -Keywords @("booking no", "booking nro", "booking number", "booking") -ValuePattern '\b[A-Z]{4}\d{6,8}\b'
  if ([string]::IsNullOrWhiteSpace($booking)) {
    foreach ($pattern in @(
      '(?i)\bbooking(?:\s*(?:no|nro|number))?[^a-z0-9]{0,24}(?<value>[A-Z]{4}\d{6,8})\b',
      '(?i)\bbooking[^a-z0-9]{0,24}(?<value>[A-Z]{4}\d{6,8})\b'
    )) {
      if ($subjectText -match $pattern) {
        $booking = [string]$Matches.value
        break
      }
      if ($bodyTextValue -match $pattern) {
        $booking = [string]$Matches.value
        break
      }
      if ($normalizedText -match $pattern) {
        $booking = [string]$Matches.value
        break
      }
    }
  }

  $contenedor = ""
  $contenedorProvisional = $false
  foreach ($pattern in @(
    '(?i)\b(?<value>[A-Z]{4}\d{6,8})\b\s+\d{2}hc\b',
    '(?i)\b(?<value>[A-Z]{4}\d{6,8})\b\s+\d{2}\s*/\s*\d{2}\s*/\s*\d{4}\b',
    '(?i)\bcontenedor[^a-z0-9]{0,24}(?<value>[A-Z]{4}\d{6,8})\b',
    '(?i)\bcontainer[^a-z0-9]{0,24}(?<value>[A-Z]{4}\d{6,8})\b',
    '(?i)\bunidad[^a-z0-9]{0,24}(?<value>[A-Z]{4}\d{6,8})\b'
  )) {
    if ($bodyTextValue -match $pattern) {
      $contenedor = ([string]$Matches.value).ToUpperInvariant()
      break
    }
    if ([string]::IsNullOrWhiteSpace($contenedor) -and $normalizedText -match $pattern) {
      $contenedor = ([string]$Matches.value).ToUpperInvariant()
      break
    }
  }
  if ([string]::IsNullOrWhiteSpace($contenedor) -and $subjectText -match '(?i)\b[a-z]{4}\d{6,8}\b') {
    $contenedor = ([string]$Matches[0]).ToUpperInvariant()
  } elseif ([string]::IsNullOrWhiteSpace($contenedor) -and $bodyTextValue -match '(?i)\b[a-z]{4}\d{6,8}\b') {
    $firstToken = ([string]$Matches[0]).ToUpperInvariant()
    if ($firstToken -ne ([string]$booking).ToUpperInvariant()) {
      $contenedor = $firstToken
    }
  } elseif ([string]::IsNullOrWhiteSpace($contenedor) -and $normalizedText -match '(?i)\b[a-z]{4}\d{6,8}\b') {
    $firstToken = ([string]$Matches[0]).ToUpperInvariant()
    if ($firstToken -ne ([string]$booking).ToUpperInvariant()) {
      $contenedor = $firstToken
    }
  }

  if ([string]::IsNullOrWhiteSpace($contenedor)) {
    $bookingUpper = ([string]$booking).ToUpperInvariant()
    $tokenCandidates = New-Object System.Collections.Generic.List[string]
    foreach ($tokenText in @($subjectText, $bodyTextValue, $normalizedText)) {
      if ([string]::IsNullOrWhiteSpace($tokenText)) {
        continue
      }
      foreach ($tokenMatch in [regex]::Matches($tokenText, '(?i)\b[a-z]{4}\d{6,8}\b')) {
        $candidateToken = ([string]$tokenMatch.Value).ToUpperInvariant()
        if ([string]::IsNullOrWhiteSpace($candidateToken)) {
          continue
        }
        if (-not [string]::IsNullOrWhiteSpace($bookingUpper) -and $candidateToken -eq $bookingUpper) {
          continue
        }
        if (-not $tokenCandidates.Contains($candidateToken)) {
          $tokenCandidates.Add($candidateToken) | Out-Null
        }
      }
    }
    if ($tokenCandidates.Count -gt 0) {
      $contenedor = [string]$tokenCandidates[0]
    }
  }

  if ([string]::IsNullOrWhiteSpace($contenedor) -and ($normalizedText -match '\bcontenedor(es)?\b' -or $normalizedText -match '\bbooking no\b' -or $normalizedText -match '\bbooking\b' -or $normalizedText -match '\bunidad\b')) {
    $contenedor = "PENDIENTE DE IDENTIFICAR"
    $contenedorProvisional = $true
  }

  $origen = ""
  $destino = ""
  $routeSourceText = ([string]$subjectText + " " + [string]$bodyTextValue + " " + [string]$BodyNormalized)
  $hasMontevideo = $routeSourceText -match '\bmontevideo\b'
  $hasAsuncion = $routeSourceText -match '\basuncion\b'
  $hasParaguaySignals = $routeSourceText -match '\bparaguay\b' -or $routeSourceText -match '\bmurchison\b' -or $routeSourceText -match '\bclorinda\b' -or $routeSourceText -match '\bpy\d{5,10}\b' -or $routeSourceText -match '\bbogg\d+\b' -or $routeSourceText -match '\bfalcon\b'
  if ($routeSourceText -match 'montevideo\s*-\s*asuncion\s*-\s*montevideo') {
    $origen = "Montevideo"
    $destino = "Asuncion"
  } elseif ($routeSourceText -match 'carga en puerto de montevideo' -and ($routeSourceText -match 'descarga en asuncion' -or $hasParaguaySignals)) {
    $origen = "Montevideo"
    $destino = "Asuncion"
  } elseif ($hasMontevideo -and ($hasAsuncion -or $hasParaguaySignals)) {
    $origen = "Montevideo"
    $destino = "Asuncion"
  } elseif ($routeSourceText -match 'ingreso a paraguay por falcon' -or ($hasParaguaySignals -and $hasMontevideo)) {
    $origen = "Montevideo"
    $destino = "Asuncion"
  }
  $routeKey = ""
  $routeLabel = ""
  if (-not [string]::IsNullOrWhiteSpace($origen) -and -not [string]::IsNullOrWhiteSpace($destino)) {
    $routeKey = "{0}|{1}" -f $origen, $destino
    $routeLabel = "{0} -> {1}" -f $origen, $destino
  }

  $fechaMatches = [regex]::Matches("$subjectText $bodyTextValue", '(?<!\d)(\d{2}/\d{2}/\d{4})(?!\d)')
  $fechaArribo = ""
  $fechaCarga = ""
  $fechaDevolucion = ""
  if ($fechaMatches.Count -gt 0) {
    if ($normalizedText -match 'arribo|llegada') {
      $fechaArribo = [string]$fechaMatches[0].Groups[1].Value
    }
    if ($normalizedText -match 'carga') {
      $fechaCarga = [string]$fechaMatches[0].Groups[1].Value
    }
    if ($normalizedText -match 'devolv|devolver|devolucion|retorn') {
      $fechaDevolucion = [string]$fechaMatches[$fechaMatches.Count - 1].Groups[1].Value
    }
  }

  $poloLogistico = ""
  if ($normalizedText -match '\bmurchison\b') {
    $poloLogistico = "MURCHISON"
  } elseif ($normalizedText -match '\bpolo logistico\b') {
    $poloLogistico = "Polo logístico"
  }

  $despachanteUY = ""
  if ($normalizedText -match '\bdespachante uy\b') {
    $despachanteUY = "Despachante UY"
  }

  $despachantePY = ""
  if ($normalizedText -match '\bdespachante py\b') {
    $despachantePY = "Despachante PY"
  }

  $estadoOperacion = ""
  if ($internalContainerReturned) {
    $estadoOperacion = "Cerrado"
  } elseif ($normalizedText -match 'devolv|devolver|devolucion|retorn') {
    $estadoOperacion = "Devolucion pendiente"
  } elseif ($normalizedText -match 'dua') {
    $estadoOperacion = "DUA recibido"
  } elseif ($normalizedText -match 'arribo') {
    $estadoOperacion = "Arribo detectado"
  } elseif ($normalizedText -match 'camion') {
    $estadoOperacion = "Camion pendiente"
  } elseif ($normalizedText -match 'ncm|seguro') {
    $estadoOperacion = "Esperando NCM/seguro"
  }

  $riesgo = ""
  if ($normalizedText -match 'venc|demora|urgent|falta|sin camion|sin ncm|sin dua|riesgo') {
    $riesgo = "Alto"
  } elseif ($normalizedText -match 'pendient|coordinar|revisar') {
    $riesgo = "Medio"
  }

  if ($contenedorProvisional -and [string]::IsNullOrWhiteSpace($riesgo)) {
    $riesgo = "Medio"
  }

  foreach ($entry in @(
    @{ key = "referencia"; value = $reference },
    @{ key = "booking"; value = $booking },
    @{ key = "contenedor"; value = $contenedor },
    @{ key = "origen"; value = $origen },
    @{ key = "destino"; value = $destino },
    @{ key = "routeKey"; value = $routeKey },
    @{ key = "routeLabel"; value = $routeLabel },
    @{ key = "fechaArribo"; value = $fechaArribo },
    @{ key = "fechaCarga"; value = $fechaCarga },
    @{ key = "fechaDevolucion"; value = $fechaDevolucion },
    @{ key = "poloLogistico"; value = $poloLogistico },
    @{ key = "despachanteUY"; value = $despachanteUY },
    @{ key = "despachantePY"; value = $despachantePY },
    @{ key = "estadoOperacion"; value = $estadoOperacion },
    @{ key = "riesgo"; value = $riesgo }
  )) {
    if (-not [string]::IsNullOrWhiteSpace([string]$entry.value)) {
      if (-not $hint.ContainsKey($entry.key) -or [string]::IsNullOrWhiteSpace([string]$hint[$entry.key])) {
        $hint[$entry.key] = [string]$entry.value
      }
    }
  }

  if ($hint.ContainsKey("observaciones") -and [string]::IsNullOrWhiteSpace([string]$hint.observaciones)) {
    $hint.Remove("observaciones") | Out-Null
  }

  if ($internalContainerReturned) {
    if ([string]::IsNullOrWhiteSpace([string]$hint.observaciones)) {
      $hint.observaciones = "Operacion finalizada: Joathi indico que el contenedor fue devuelto."
    } elseif ([string]$hint.observaciones -notmatch 'operacion finalizada') {
      $hint.observaciones = "{0} Operacion finalizada: Joathi indico que el contenedor fue devuelto." -f [string]$hint.observaciones
    }
  }

  if ($contenedorProvisional -and -not $hint.ContainsKey("observaciones")) {
    $hint.observaciones = "Contenedor provisional: el correo no trae un identificador explicito y quedo registrado para seguimiento."
  }
  if (-not [string]::IsNullOrWhiteSpace($booking) -and -not $hint.ContainsKey("observaciones")) {
    $hint.observaciones = "Booking detectado: $booking."
  } elseif (-not [string]::IsNullOrWhiteSpace($booking) -and -not [string]::IsNullOrWhiteSpace([string]$hint.observaciones)) {
    $hint.observaciones = "{0} Booking detectado: {1}." -f [string]$hint.observaciones, $booking
  }

  return [pscustomobject]$hint
}

function Get-AssistantMessageActorProfile {
  param([object]$Message)

  $subjectText = [string]$Message.subject
  $bodyText = [string]$Message.bodyText
  $bodyNormalized = [string]$Message.bodyNormalized
  $fromName = ConvertTo-AssistantNormalizedText -Text ([string]$Message.from.name)
  $fromAddress = ConvertTo-AssistantNormalizedText -Text ([string]$Message.from.address)
  $fromDomainRaw = ([string]$Message.from.domain).Trim().ToLowerInvariant()
  $fromDomain = ConvertTo-AssistantNormalizedText -Text $fromDomainRaw
  $contextText = ConvertTo-AssistantNormalizedText -Text "$subjectText $bodyText $bodyNormalized"
  $reasons = New-Object System.Collections.Generic.List[string]
  $signals = New-Object System.Collections.Generic.List[string]
  $role = "unknown"
  $confidence = 0.35

  $internalRoleSignals = @("joathi", "sistemas", "operaciones", "interna", "interno")
  $providerSignals = @("tradex", "proveedor", "operaciones2@tradex.com.uy")
  $despachantePySignals = @("rfm", "capital", "despachante py", "ncm", "dua", "mic", "crt", "seguro")
  $despachanteUySignals = @("perugia", "despachante uy", "entrega documental", "dua", "mic", "crt", "seguro")
  $paraguayOperationalSignals = @("py", "par", "bogg", "murchison", "clorinda", "asuncion", "arribo", "booking", "contenedor", "eta", "hbl")
  $documentarySignals = @("factura crt", "borrador crt", "factura final", "recibo", "transferencia", "dua", "crt", "mic")

  if (-not [string]::IsNullOrWhiteSpace($fromDomainRaw) -and ($fromDomainRaw -in @("joathilogistica.com", "joathi.com"))) {
    $role = "interno"
    $confidence = 0.98
    $reasons.Add("dominio interno de Joathi") | Out-Null
  } elseif (-not [string]::IsNullOrWhiteSpace($fromDomainRaw) -and ($fromDomainRaw -eq "tradex.com.uy" -or $fromAddress -eq "operaciones2@tradex.com.uy")) {
    $role = "proveedor"
    $confidence = 0.95
    $reasons.Add("proveedor Tradex") | Out-Null
  } elseif (-not [string]::IsNullOrWhiteSpace($fromDomainRaw) -and $fromDomainRaw -eq "rfmcapital.net.py") {
    $role = "despachante_py"
    $confidence = 0.95
    $reasons.Add("despachante PY RFM") | Out-Null
  } elseif (-not [string]::IsNullOrWhiteSpace($fromDomainRaw) -and ($fromDomainRaw -eq "perugialogistica.com" -or $fromDomainRaw -eq "ulglogistics.com.uy")) {
    $hasDocumentaryCue = Test-AssistantKeywordAny -Text $contextText -Keywords $documentarySignals
    $hasOperationalCue = Test-AssistantKeywordAny -Text $contextText -Keywords $paraguayOperationalSignals
    if ($fromDomainRaw -eq "ulglogistics.com.uy") {
      $documentaryScore = Get-AssistantKeywordScore -Text $contextText -Keywords $documentarySignals
      $operationalScore = Get-AssistantKeywordScore -Text $contextText -Keywords $paraguayOperationalSignals
      if ($documentaryScore -gt $operationalScore -and $documentaryScore -gt 0) {
        $role = "despachante_uy"
        $confidence = 0.72
        $reasons.Add("UGL con señales documentales del despachante UY") | Out-Null
      } elseif ($operationalScore -gt 0) {
        $role = "cliente"
        $confidence = 0.78
        $reasons.Add("UGL con señales operativas Paraguay del cliente") | Out-Null
      } else {
        $role = "cliente"
        $confidence = 0.66
        $reasons.Add("UGL tratado como rol contextual; requiere confirmacion por hilo") | Out-Null
      }
    } else {
      $role = "despachante_uy"
      $confidence = 0.92
      $reasons.Add("despachante UY Perugia") | Out-Null
    }
  }

  if ($role -eq "unknown") {
    if (Test-AssistantKeywordAny -Text $contextText -Keywords $internalRoleSignals) {
      $role = "interno"
      $confidence = 0.9
      $reasons.Add("menciones internas en el hilo") | Out-Null
    } elseif (Test-AssistantKeywordAny -Text $contextText -Keywords $providerSignals) {
      $role = "proveedor"
      $confidence = 0.84
      $reasons.Add("menciones de proveedor") | Out-Null
    } elseif (Test-AssistantKeywordAny -Text $contextText -Keywords $despachantePySignals) {
      $role = "despachante_py"
      $confidence = 0.82
      $reasons.Add("menciones de despachante PY") | Out-Null
    } elseif (Test-AssistantKeywordAny -Text $contextText -Keywords $despachanteUySignals) {
      $role = "despachante_uy"
      $confidence = 0.8
      $reasons.Add("menciones de despachante UY") | Out-Null
    } elseif (Test-AssistantKeywordAny -Text $contextText -Keywords $paraguayOperationalSignals) {
      $role = "cliente"
      $confidence = 0.7
      $reasons.Add("señales Paraguay sin actor especifico; se prioriza cliente operativo") | Out-Null
    }
  }

  if ($fromName) {
    $signals.Add("fromName=$fromName") | Out-Null
  }
  if ($fromAddress) {
    $signals.Add("fromAddress=$fromAddress") | Out-Null
  }
  if ($fromDomainRaw) {
    $signals.Add("fromDomain=$fromDomainRaw") | Out-Null
  }
  if (Test-AssistantKeywordAny -Text $contextText -Keywords $paraguayOperationalSignals) {
    $signals.Add("paraguaySignals=present") | Out-Null
  }
  if (Test-AssistantKeywordAny -Text $contextText -Keywords $documentarySignals) {
    $signals.Add("documentarySignals=present") | Out-Null
  }

  return [pscustomobject]@{
    role = [string]$role
    reason = if ($reasons.Count) { ($reasons | Select-Object -Unique) -join "; " } else { "sin evidencia suficiente para inferir rol" }
    confidence = [Math]::Max(0, [Math]::Min(1, [Math]::Round($confidence, 2)))
    evidence = @($signals | Select-Object -Unique)
  }
}

function Get-AssistantParaguayWorkflowProfile {
  param(
    [string]$Subject,
    [string]$BodyText,
    [string]$BodyNormalized,
    [string]$ActorRole = ""
  )

  $text = ConvertTo-AssistantNormalizedText -Text "$Subject $BodyText $BodyNormalized"
  $signals = New-Object System.Collections.Generic.List[string]
  $strongParaguay = $false
  $workflowStage = ""
  $workflowCategory = "informativo"
  $operationState = "Documentacion preliminar"
  $risk = "Bajo"
  $internalContainerReturned = Test-AssistantInternalContainerReturnClosure -Text $text -ActorRole $ActorRole

  foreach ($entry in @(
    @{ signal = "PY"; pattern = '\bpy\d{5,10}\b' },
    @{ signal = "PAR"; pattern = '\b\d{3}par\b|\bpar\b' },
    @{ signal = "BOGG"; pattern = '\bbogg\d+\b' },
    @{ signal = "arribo"; pattern = '\barribo\b|\bllegad|\baviso de llegada\b|\baviso de salida\b' },
    @{ signal = "asuncion"; pattern = '\basuncion\b' },
    @{ signal = "murchison"; pattern = '\bmurchison\b' },
    @{ signal = "booking"; pattern = '\bbooking\b|\bbooking no\b|\bbooking nro\b' },
    @{ signal = "contenedor"; pattern = '\bcontenedor\b|\bunidad\b' },
    @{ signal = "eta"; pattern = '\beta\b' },
    @{ signal = "destino py"; pattern = '\bdestino final py\b|\bdestino py\b' }
  )) {
    if ($text -match $entry.pattern) {
      $signals.Add([string]$entry.signal) | Out-Null
    }
  }

  if ($signals.Count -gt 0) {
    $strongParaguay = $true
  }

  if ($internalContainerReturned) {
    $workflowStage = "cierre operativo"
    $workflowCategory = "cierre operativo"
    $operationState = "Cerrado"
    $risk = "Bajo"
    $signals.Add("stage=cierre_operativo") | Out-Null
  } elseif ($text -match '\bdevolv|\bretorn|\bdevolucion\b') {
    $workflowStage = "devolucion / retorno"
    $workflowCategory = "devolucion / riesgo"
    $operationState = "Devolucion pendiente"
    $risk = "Alto"
    $signals.Add("stage=devolucion") | Out-Null
  } elseif ($text -match 'mic.*crt|crt.*mic|crt definitivo|documentacion definitiva|documentos definitivos') {
    $workflowStage = "MIC / CRT definitivo"
    $workflowCategory = "cierre documental"
    $operationState = "Documentacion definitiva lista"
    $risk = "Bajo"
    $signals.Add("stage=mic_crt_definitivo") | Out-Null
  } elseif ($text -match '\bdua\b|\bpdf del dua\b|\bdua recibido\b|\badjunto dua\b') {
    $workflowStage = "DUA"
    $workflowCategory = "avance de operacion"
    $operationState = "DUA recibido"
    $risk = "Bajo"
    $signals.Add("stage=dua") | Out-Null
  } elseif ($text -match 'factura.*crt|crt.*factura|factura para crt|solicitud de factura.*crt|enviar factura.*crt') {
    $workflowStage = "factura CRT"
    $workflowCategory = "solicitud documental"
    $operationState = "Documentacion preliminar"
    $risk = "Medio"
    $signals.Add("stage=factura_crt") | Out-Null
  } elseif ($text -match 'ncm|seguro|prima de seguro|valor seguro|valor a declarar|aguardamos el crt con valor de seguro') {
    $workflowStage = "espera NCM / seguro"
    $workflowCategory = "solicitud documental"
    $operationState = "Esperando NCM/seguro"
    $risk = "Medio"
    $signals.Add("stage=ncm_seguro") | Out-Null
  } elseif ($text -match 'factura.*crt|crt.*factura|borrador crt|adjunto crt|por favor confirmar si esta ok') {
    $workflowStage = "borrador CRT"
    $workflowCategory = "solicitud documental"
    $operationState = "Documentacion preliminar"
    $risk = "Medio"
    $signals.Add("stage=borrador_crt") | Out-Null
  } elseif ($text -match '\bentrega documental\b|\bdocumentacion entregad|\badjunto transferencia\b|\brecibo\b') {
    $workflowStage = "entrega documental"
    $workflowCategory = "cierre documental"
    $operationState = "Documentacion definitiva lista"
    $risk = "Bajo"
    $signals.Add("stage=entrega_documental") | Out-Null
  } elseif ($text -match 'camion|camión|posicionar|coordinar retiro|prevision de camion|prevision cam') {
    $workflowStage = "pedido de camión"
    $workflowCategory = "caso operativo"
    $operationState = "Camion pendiente"
    $risk = "Medio"
    $signals.Add("stage=pedido_camion") | Out-Null
  } elseif ($text -match 'arribo|llegada|aviso de salida|hbl|eta|booking|contenedor|unidad ingres|destino py|paraguay|asuncion|murchison|bogg') {
    $workflowStage = "aviso de arribo"
    $workflowCategory = "caso operativo"
    $operationState = "Arribo detectado"
    $risk = "Bajo"
    $signals.Add("stage=aviso_arribo") | Out-Null
  } elseif ($text -match 'demora|demoras|costo|costos|riesgo|urgente|falta|sin camion|sin ncm|sin dua|vencid') {
    $workflowStage = "demoras / costos"
    $workflowCategory = "devolucion / riesgo"
    $operationState = "En riesgo"
    $risk = "Alto"
    $signals.Add("stage=riesgo") | Out-Null
  } elseif ($text -match 'seguimiento|cotizacion|precio|presupuesto|reunion|llamada|respuesta|confirmar') {
    $workflowStage = "seguimiento comercial"
    $workflowCategory = "seguimiento comercial"
    $operationState = "Documentacion preliminar"
    $risk = "Bajo"
    $signals.Add("stage=seguimiento_comercial") | Out-Null
  }

  if (-not $workflowStage) {
    $workflowStage = "informativo"
  }

  return [pscustomobject]@{
    workflowStage = [string]$workflowStage
    workflowCategory = [string]$workflowCategory
    operationState = [string]$operationState
    risk = [string]$risk
    strongParaguay = [bool]$strongParaguay
    workflowSignals = @($signals | Select-Object -Unique)
  }
}

function Get-AssistantKeywordValueAfter {
  param(
    [string]$Text,
    [string[]]$Keywords,
    [string]$ValuePattern,
    [int]$Window = 180
  )

  if ([string]::IsNullOrWhiteSpace($Text) -or -not $Keywords -or -not $ValuePattern) {
    return ""
  }

  foreach ($keyword in @($Keywords)) {
    if ([string]::IsNullOrWhiteSpace($keyword)) {
      continue
    }

    $keywordPattern = [regex]::Escape([string]$keyword)
    $match = [regex]::Match($Text, "(?i)$keywordPattern")
    if (-not $match.Success) {
      continue
    }

    $sliceLength = [Math]::Min($Window, $Text.Length - $match.Index)
    if ($sliceLength -le 0) {
      continue
    }

    $slice = $Text.Substring($match.Index, $sliceLength)
    $valueMatch = [regex]::Match($slice, $ValuePattern)
    if ($valueMatch.Success) {
      return [string]$valueMatch.Value
    }
  }

  return ""
}

function Get-AssistantDateOffset {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }

  try {
    return [DateTimeOffset]::Parse($Value, [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::AllowWhiteSpaces)
  } catch {
    return $null
  }
}

function Test-AssistantOperationPlaceholderText {
  param([string]$Value)

  $text = ConvertTo-AssistantNormalizedText -Text $Value
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $true
  }

  return $text.Contains("pendiente de identificar") -or $text.Contains("provisional")
}

function Test-AssistantInternalContainerReturnClosure {
  param(
    [string]$Text,
    [string]$ActorRole = ""
  )

  if ([string]::IsNullOrWhiteSpace($Text) -or [string]::IsNullOrWhiteSpace($ActorRole)) {
    return $false
  }

  if ((ConvertTo-AssistantNormalizedText -Text $ActorRole) -ne "interno") {
    return $false
  }

  $normalizedText = ConvertTo-AssistantNormalizedText -Text $Text
  if ([string]::IsNullOrWhiteSpace($normalizedText)) {
    return $false
  }

  foreach ($pattern in @(
    '\bcontenedor\b.{0,40}\bdevuelt[ao]?\b',
    '\bdevuelt[ao]?\b.{0,40}\bcontenedor\b',
    '\bcontenedor\b.{0,40}\bretornad[ao]?\b',
    '\bretornad[ao]?\b.{0,40}\bcontenedor\b',
    '\bse\s+devolvio\s+el\s+contenedor\b',
    '\bel\s+contenedor\s+fue\s+devuelt[ao]?\b',
    '\bel\s+contenedor\s+fue\s+retornad[ao]?\b',
    '\bcontenedor\s+ya\s+fue\s+devuelt[ao]?\b',
    '\bcontenedor\s+ya\s+fue\s+retornad[ao]?\b',
    '\bdevolvimo?s\s+el\s+contenedor\b'
  )) {
    if ($normalizedText -match $pattern) {
      return $true
    }
  }

  return $false
}

function Get-AssistantOperationStateRank {
  param([string]$State)

  switch ((ConvertTo-AssistantNormalizedText -Text $State)) {
    "cerrado" { return 90 }
    "en riesgo" { return 80 }
    "devolucion pendiente" { return 70 }
    "documentacion definitiva lista" { return 60 }
    "dua recibido" { return 50 }
    "esperando ncm/seguro" { return 40 }
    "arribo detectado" { return 30 }
    "camion pendiente" { return 20 }
    default { return 10 }
  }
}

function Get-AssistantRiskRank {
  param([string]$Risk)

  switch ((ConvertTo-AssistantNormalizedText -Text $Risk)) {
    "alto" { return 3 }
    "medio" { return 2 }
    "bajo" { return 1 }
    default { return 0 }
  }
}

function Test-AssistantOperationProvisional {
  param([object]$Operation)

  if (-not $Operation) {
    return $false
  }

  $container = [string]$Operation.contenedor
  $reference = [string]$Operation.referencia
  $observations = [string]$Operation.observaciones
  $state = [string]$Operation.estadoOperacion

  return (Test-AssistantOperationPlaceholderText -Value $container) -or
    (ConvertTo-AssistantNormalizedText -Text $reference).Contains("operativa ou") -or
    (ConvertTo-AssistantNormalizedText -Text $observations).Contains("provisional") -or
    (ConvertTo-AssistantNormalizedText -Text $state).Contains("documentacion preliminar")
}

function Get-AssistantOperationTemporalScore {
  param(
    [object]$Operation,
    [object]$Message
  )

  if (-not $Operation -or -not $Message) {
    return 0
  }

  $messageDate = Get-AssistantDateOffset -Value ([string]$Message.date)
  if (-not $messageDate) {
    return 0
  }

  $candidateDate = Get-AssistantDateOffset -Value ([string]$Operation.updatedAt)
  if (-not $candidateDate) {
    $candidateDate = Get-AssistantDateOffset -Value ([string]$Operation.createdAt)
  }
  if (-not $candidateDate) {
    return 0
  }

  $days = [Math]::Abs(($messageDate - $candidateDate).TotalDays)
  if ($days -le 1) { return 30 }
  if ($days -le 3) { return 24 }
  if ($days -le 7) { return 18 }
  if ($days -le 14) { return 10 }
  if ($days -le 30) { return 4 }
  return 0
}

function Parse-AssistantEmailAddress {
  param([string]$Value)

  $raw = [string]$Value
  $name = ""
  $address = ""

  if ($raw -match '^(?<name>.*?)[\s]*<(?<address>[^>]+)>$') {
    $name = $Matches.name.Trim()
    $address = $Matches.address.Trim()
  } elseif ($raw -match '^(?<address>[^\s@<>]+@[^\s@<>]+)$') {
    $address = $Matches.address.Trim()
  } else {
    $name = $raw.Trim()
  }

  $domain = ""
  if ($address -match '@(?<domain>.+)$') {
    $domain = $Matches.domain.Trim().ToLowerInvariant()
  }

  return [pscustomobject]@{
    raw = $raw
    name = $name
    address = $address.Trim().ToLowerInvariant()
    domain = $domain
  }
}

function Get-AssistantCreateNormalizedMessage {
  param(
    [object]$Payload,
    [string]$SourceKind = "simulated",
    [string]$ProviderKind = "",
    [string]$MailboxProfileId = "",
    [string]$MailboxFolder = ""
  )

  $input = ConvertTo-AssistantDictionary -Value $Payload
  $rawFrom = if ($input.ContainsKey("from")) { [string]$input.from } else { "" }
  if ([string]::IsNullOrWhiteSpace($rawFrom) -and $input.ContainsKey("fromAddress")) {
    $rawFrom = [string]$input.fromAddress
  }
  if ([string]::IsNullOrWhiteSpace($rawFrom) -and $input.ContainsKey("fromName") -and $input.ContainsKey("fromAddress")) {
    $rawFrom = "{0} <{1}>" -f [string]$input.fromName, [string]$input.fromAddress
  }

  $from = Parse-AssistantEmailAddress -Value $rawFrom
  if ([string]::IsNullOrWhiteSpace($from.address) -and $input.ContainsKey("fromAddress")) {
    $from.address = ([string]$input.fromAddress).Trim().ToLowerInvariant()
  }
  if ([string]::IsNullOrWhiteSpace($from.name) -and $input.ContainsKey("fromName")) {
    $from.name = [string]$input.fromName
  }
  if ([string]::IsNullOrWhiteSpace($from.domain) -and $from.address -match '@(?<domain>.+)$') {
    $from.domain = $Matches.domain.Trim().ToLowerInvariant()
  }

  $subject = if ($input.ContainsKey("subject")) { [string]$input.subject } else { "" }
  $dateValue = if ($input.ContainsKey("date")) { [string]$input.date } elseif ($input.ContainsKey("sentAt")) { [string]$input.sentAt } else { Get-AssistantNowIso }
  $bodyText = if ($input.ContainsKey("bodyText")) { [string]$input.bodyText } elseif ($input.ContainsKey("body")) { [string]$input.body } else { "" }
  $bodyHtml = if ($input.ContainsKey("bodyHtml")) { [string]$input.bodyHtml } else { "" }
  $preview = if ($input.ContainsKey("preview")) { [string]$input.preview } else { "" }
  $bodyNormalized = Normalize-AssistantBody -BodyText $bodyText -BodyHtml $bodyHtml -Preview $preview

  $externalId = if ($input.ContainsKey("externalId")) { [string]$input.externalId } elseif ($input.ContainsKey("messageId")) { [string]$input.messageId } else { "" }
  if ([string]::IsNullOrWhiteSpace($externalId)) {
    $externalId = New-AssistantRecordId -Prefix "msg"
  }

  $dedupeSource = @(
    $SourceKind,
    $MailboxProfileId,
    $MailboxFolder,
    $externalId,
    $from.address,
    $subject,
    $dateValue
  ) -join "|"
  if ([string]::IsNullOrWhiteSpace($dedupeSource)) {
    $dedupeSource = $externalId
  }

  $actorProfile = Get-AssistantMessageActorProfile -Message ([pscustomobject]@{
    subject = $subject
    bodyText = $bodyText
    bodyNormalized = $bodyNormalized
    from = $from
  })
  $taskHint = if ($input.ContainsKey("task") -and $input.task) { ConvertTo-AssistantDictionary -Value $input.task } else { @{} }
  $operationHint = if ($input.ContainsKey("operation") -and $input.operation) { ConvertTo-AssistantDictionary -Value $input.operation } else { @{} }
  $operationHint = Get-AssistantAutoOperationHint -Subject $subject -BodyText $bodyText -BodyNormalized $bodyNormalized -ActorRole ([string]$actorProfile.role) -ExistingHint $operationHint
  $explicitCustomerId = ""
  foreach ($candidate in @("customerId", "clientId")) {
    if ($input.ContainsKey($candidate) -and -not [string]::IsNullOrWhiteSpace([string]$input[$candidate])) {
      $explicitCustomerId = [string]$input[$candidate]
      break
    }
  }

  return [pscustomobject]@{
    id = New-AssistantRecordId -Prefix "ast"
    sourceKind = if ([string]::IsNullOrWhiteSpace($SourceKind)) { "simulated" } else { $SourceKind.Trim().ToLowerInvariant() }
    providerKind = [string]$ProviderKind
    mailboxProfileId = [string]$MailboxProfileId
    mailboxFolder = [string]$MailboxFolder
    externalId = [string]$externalId
    dedupeKey = $dedupeSource
    from = $from
    subject = [string]$subject
    date = [string]$dateValue
    bodyText = [string]$bodyText
    bodyHtml = [string]$bodyHtml
    bodyNormalized = [string]$bodyNormalized
    taskHint = [pscustomobject]$taskHint
    operationHint = [pscustomobject]$operationHint
    actorRole = [string]$actorProfile.role
    actorReason = [string]$actorProfile.reason
    actorConfidence = [double]$actorProfile.confidence
    actorEvidence = $actorProfile.evidence
    customerId = [string]$explicitCustomerId
  }
}

function Invoke-AssistantApiV1Request {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [hashtable]$Query = @{}
  )

  $request = [pscustomobject]@{
    Method = $Method
    BodyText = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 100 } else { "" }
  }

  $queryString = Get-AssistantQueryString -Parts $Query
  return Invoke-ApiV1Request -Request $request -Path $Path -QueryString $queryString
}

function Get-AssistantApiV1Items {
  param(
    [string]$EntityKind,
    [hashtable]$Query = @{}
  )

  $collection = switch ($EntityKind) {
    "customer" { "/api/v1/customers" }
    "task" { "/api/v1/tasks" }
    "activity" { "/api/v1/activities" }
    "operation" { "/api/v1/operations" }
    default { throw "Entidad no soportada: $EntityKind" }
  }

  if (-not $Query.ContainsKey("limit")) {
    $Query.limit = 250
  }

  $response = Invoke-AssistantApiV1Request -Method "GET" -Path $collection -Query $Query
  if (-not $response.body.ok) {
    throw ([string]$response.body.error.message)
  }

  $data = $response.body.data
  if ($data -and ($data.PSObject.Properties.Name -contains "items")) {
    return @($data.items)
  }

  if ($data -is [System.Array]) {
    return @($data)
  }

  if ($data) {
    return @($data)
  }

  return @()
}

function Get-AssistantApiV1RecordById {
  param(
    [string]$EntityKind,
    [string]$Id
  )

  if ([string]::IsNullOrWhiteSpace($Id)) {
    return $null
  }

  $collection = switch ($EntityKind) {
    "customer" { "/api/v1/customers" }
    "task" { "/api/v1/tasks" }
    "activity" { "/api/v1/activities" }
    "operation" { "/api/v1/operations" }
    default { throw "Entidad no soportada: $EntityKind" }
  }

  $response = Invoke-AssistantApiV1Request -Method "GET" -Path "$collection/$Id"
  if (-not $response.body.ok) {
    return $null
  }

  return $response.body.data
}

function Test-AssistantKeywordAny {
  param(
    [string]$Text,
    [string[]]$Keywords
  )

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return $false
  }

  foreach ($keyword in @($Keywords)) {
    if ([string]::IsNullOrWhiteSpace($keyword)) {
      continue
    }
    $escapedKeyword = [regex]::Escape((ConvertTo-AssistantNormalizedText -Text $keyword))
    if (-not [string]::IsNullOrWhiteSpace($escapedKeyword) -and ($Text -match "(?<!\w)$escapedKeyword(?!\w)")) {
      return $true
    }
  }

  return $false
}

function Get-AssistantKeywordScore {
  param(
    [string]$Text,
    [string[]]$Keywords
  )

  if ([string]::IsNullOrWhiteSpace($Text)) {
    return 0
  }

  $score = 0
  foreach ($keyword in @($Keywords)) {
    if ([string]::IsNullOrWhiteSpace($keyword)) {
      continue
    }
    if ($Text.Contains(($keyword).ToLowerInvariant())) {
      $score += 1
    }
  }

  return $score
}

function Get-AssistantCustomerContextTokens {
  param([string]$CustomerId)

  if ([string]::IsNullOrWhiteSpace($CustomerId)) {
    return @()
  }

  $tokens = New-Object System.Collections.Generic.List[string]
  foreach ($entityKind in @("operation", "task", "activity")) {
    $records = @(Get-AssistantApiV1Items -EntityKind $entityKind -Query @{ customerId = $CustomerId; limit = 75 })
    foreach ($record in $records) {
      foreach ($candidate in @(
        $record.referencia,
        $record.booking,
        $record.contenedor,
        $record.origen,
        $record.destino,
        $record.poloLogistico,
        $record.despachanteUY,
        $record.despachantePY,
        $record.estadoOperacion,
        $record.riesgo,
        $record.tarea,
        $record.observaciones,
        $record.title,
        $record.details
      )) {
        $normalizedCandidate = ConvertTo-AssistantNormalizedText -Text ([string]$candidate)
        if ([string]::IsNullOrWhiteSpace($normalizedCandidate)) {
          continue
        }
        if (-not $tokens.Contains($normalizedCandidate)) {
          $tokens.Add($normalizedCandidate) | Out-Null
        }
      }
    }
  }

  return @($tokens)
}

function Get-AssistantCustomerMatch {
  param([object]$Message)

  $customers = @(Get-AssistantApiV1Items -EntityKind "customer" -Query @{ limit = 250 })
  $explicitCustomerId = [string]$Message.customerId
  if (-not [string]::IsNullOrWhiteSpace($explicitCustomerId)) {
    $explicitMatch = $customers | Where-Object { [string]$_.id -eq $explicitCustomerId } | Select-Object -First 1
    if ($explicitMatch) {
      return [pscustomobject]@{
        found = $true
        customerId = [string]$explicitMatch.id
        label = "{0} | {1}" -f [string]$explicitMatch.empresa, [string]$explicitMatch.nombre
        confidence = 1
        reason = "cliente indicado explicitamente"
        matchKind = "explicit"
        customer = $explicitMatch
      }
    }
  }

  $subjectText = ConvertTo-AssistantNormalizedText -Text "$($Message.subject) $($Message.bodyNormalized)"
  $fromName = ConvertTo-AssistantNormalizedText -Text $Message.from.name
  $fromAddress = ConvertTo-AssistantNormalizedText -Text $Message.from.address
  $fromDomain = ([string]$Message.from.domain).Trim().ToLowerInvariant()
  $actorRole = ConvertTo-AssistantNormalizedText -Text $Message.actorRole
  $actorReason = [string]$Message.actorReason
  $messageReferenceTokens = New-Object System.Collections.Generic.List[string]
  foreach ($candidate in @(
    $Message.operationHint.referencia,
    $Message.operationHint.booking,
    $Message.operationHint.contenedor,
    $Message.operationHint.routeKey,
    $Message.operationHint.origen,
    $Message.operationHint.destino
  )) {
    $normalizedCandidate = ConvertTo-AssistantNormalizedText -Text ([string]$candidate)
    if (-not [string]::IsNullOrWhiteSpace($normalizedCandidate) -and -not $messageReferenceTokens.Contains($normalizedCandidate)) {
      $messageReferenceTokens.Add($normalizedCandidate) | Out-Null
    }
  }
  foreach ($pattern in @(
    '\bpy\d{5,10}\b',
    '\bct\s*\d{3,8}\b',
    '\bcotmvd\d+\b',
    '\b[a-z]{4}\d{6,8}\b'
  )) {
    foreach ($tokenSource in @([string]$Message.subject, [string]$Message.bodyText, [string]$Message.bodyNormalized)) {
      if ([string]::IsNullOrWhiteSpace($tokenSource)) {
        continue
      }
      foreach ($match in [regex]::Matches($tokenSource, $pattern)) {
        $normalizedToken = ConvertTo-AssistantNormalizedText -Text ([string]$match.Value)
        if (-not [string]::IsNullOrWhiteSpace($normalizedToken) -and -not $messageReferenceTokens.Contains($normalizedToken)) {
          $messageReferenceTokens.Add($normalizedToken) | Out-Null
        }
      }
    }
  }

  $best = $null
  $bestScore = 0
  $bestIdentityScore = 0
  $bestContextScore = 0
  $runnerUpScore = 0
  $bestReason = ""
  $bestEvidence = New-Object System.Collections.Generic.List[string]
  foreach ($customer in $customers) {
    $identityScore = 0
    $contextScore = 0
    $reasons = New-Object System.Collections.Generic.List[string]
    $identitySignals = 0

    $customerEmails = New-Object System.Collections.Generic.List[string]
    $customerDomains = New-Object System.Collections.Generic.List[string]
    foreach ($candidate in @($customer.email, $customer.contactoPrincipal)) {
      if (-not [string]::IsNullOrWhiteSpace([string]$candidate)) {
        $customerEmails.Add((ConvertTo-AssistantNormalizedText -Text ([string]$candidate))) | Out-Null
      }
    }

    foreach ($contact in @($customer.contactos)) {
      if ($contact.email) {
        $customerEmails.Add((ConvertTo-AssistantNormalizedText -Text ([string]$contact.email))) | Out-Null
      }
    }

    foreach ($candidateEmail in @($customerEmails)) {
      if ([string]::IsNullOrWhiteSpace($candidateEmail)) {
        continue
      }
      if ($candidateEmail -match '@(?<domain>.+)$' -and $Matches.domain) {
        $candidateDomain = $Matches.domain.ToLowerInvariant()
        if (-not $customerDomains.Contains($candidateDomain)) {
          $customerDomains.Add($candidateDomain) | Out-Null
        }
      }
      if ($fromAddress -and $fromAddress -eq $candidateEmail) {
        $identityScore += 120
        $identitySignals += 1
        $reasons.Add("email exacto") | Out-Null
      } elseif ($fromDomain -and $candidateEmail -match '@(?<domain>.+)$' -and $Matches.domain -and $fromDomain -eq $Matches.domain.ToLowerInvariant()) {
        if ($fromDomain -eq "ulglogistics.com.uy") {
          $identityScore += 45
          $reasons.Add("dominio contextual ULG") | Out-Null
        } else {
          $identityScore += 80
          $reasons.Add("dominio coincidente") | Out-Null
        }
        $identitySignals += 1
      }
    }

    if ($fromDomain -and $customerDomains.Contains($fromDomain)) {
      $identityScore += if ($fromDomain -eq "ulglogistics.com.uy") { 8 } else { 10 }
      if ($fromDomain -eq "ulglogistics.com.uy") {
        $reasons.Add("dominio ULG tratado como contexto del hilo") | Out-Null
      } else {
        $reasons.Add("dominio de cliente reconocido") | Out-Null
      }
    }

    foreach ($candidateText in @(
      $customer.empresa,
      $customer.nombre,
      $customer.contactoPrincipal
    )) {
      $normalizedCandidate = ConvertTo-AssistantNormalizedText -Text ([string]$candidateText)
      if ([string]::IsNullOrWhiteSpace($normalizedCandidate)) {
        continue
      }
      if ($fromName -and $fromName.Contains($normalizedCandidate)) {
        $identityScore += 60
        $identitySignals += 1
        $reasons.Add("remitente coincide con nombre") | Out-Null
      }
      if ($subjectText -and $subjectText.Contains($normalizedCandidate)) {
        $identityScore += 65
        $identitySignals += 1
        $reasons.Add("asunto/cuerpo coincide con cliente") | Out-Null
      }
    }

    $customerContextTokens = @()
    if (($identityScore -ge 20 -or $messageReferenceTokens.Count -gt 0) -and $customer.id) {
      $customerContextTokens = @(Get-AssistantCustomerContextTokens -CustomerId ([string]$customer.id))
    }

    if ($customerContextTokens.Count -gt 0 -and $messageReferenceTokens.Count -gt 0) {
      foreach ($messageToken in @($messageReferenceTokens | Select-Object -Unique)) {
        if ([string]::IsNullOrWhiteSpace([string]$messageToken)) {
          continue
        }
        if ($customerContextTokens -contains ([string]$messageToken)) {
          $contextScore += 45
          $reasons.Add("referencia operativa previa coincide: $([string]$messageToken)") | Out-Null
        }
      }
    }

    if ($contextScore -gt 0 -and $identityScore -ge 20) {
      $contextScore += 10
      $reasons.Add("contexto previo refuerza coincidencia") | Out-Null
    }

    if (-not [string]::IsNullOrWhiteSpace($actorRole)) {
      $reasons.Add("rol inferido del remitente: $actorRole") | Out-Null
      if ($actorRole -eq "cliente" -and $identityScore -gt 0) {
        $identityScore += 5
      } elseif ($actorRole -in @("despachante_py", "despachante_uy", "proveedor") -and $identityScore -gt 0) {
        $contextScore += 4
      }
    }

    $score = $identityScore + $contextScore
    if ($score -gt $bestScore) {
      $runnerUpScore = $bestScore
      $bestScore = $score
      $bestIdentityScore = $identityScore
      $bestContextScore = $contextScore
      $best = $customer
      $bestReason = ($reasons | Select-Object -Unique) -join "; "
      $messageRefSummary = @($messageReferenceTokens | Select-Object -Unique) -join ','
      $bestEvidence = New-Object System.Collections.Generic.List[string]
      foreach ($signal in @(
        "identity=$identityScore",
        "context=$contextScore",
        "signals=$identitySignals",
        "messageRefs=$messageRefSummary",
      "actorRole=$actorRole",
      "actorReason=$actorReason"
      )) {
        if (-not [string]::IsNullOrWhiteSpace([string]$signal)) {
          $bestEvidence.Add([string]$signal) | Out-Null
        }
      }
    } elseif ($score -gt $runnerUpScore) {
      $runnerUpScore = $score
    }
  }

  $ambiguous = $false
  if ($best -and $runnerUpScore -gt 0 -and ($bestScore - $runnerUpScore) -lt 10 -and $bestIdentityScore -lt 100) {
    $ambiguous = $true
  }

  if ($null -eq $best -or $bestScore -lt 60 -or $bestIdentityScore -lt 20 -or $ambiguous) {
    return [pscustomobject]@{
      found = $false
      customerId = ""
      label = ""
      confidence = 0
      reason = if ($ambiguous) { "candidatos ambiguos; se evita falso positivo" } else { "no se identifico cliente con confianza suficiente" }
      matchKind = "none"
      customer = $null
      evidence = [pscustomobject]@{
        identityScore = $bestIdentityScore
        contextScore = $bestContextScore
        score = $bestScore
        runnerUpScore = $runnerUpScore
        candidateCount = $customers.Count
        messageReferences = @($messageReferenceTokens | Select-Object -Unique)
        actorRole = $actorRole
        actorReason = $actorReason
      }
    }
  }

  return [pscustomobject]@{
    found = $true
    customerId = [string]$best.id
    label = "{0} | {1}" -f [string]$best.empresa, [string]$best.nombre
    confidence = [Math]::Min(1, [Math]::Round($bestScore / 160, 2))
    reason = if ([string]::IsNullOrWhiteSpace($bestReason)) { "coincidencia comercial" } else { $bestReason }
    matchKind = if ($bestContextScore -gt 0) { "heuristic+context" } else { "heuristic" }
    customer = $best
    evidence = [pscustomobject]@{
      identityScore = $bestIdentityScore
      contextScore = $bestContextScore
      score = $bestScore
      runnerUpScore = $runnerUpScore
      candidateCount = $customers.Count
      messageReferences = @($messageReferenceTokens | Select-Object -Unique)
      signals = @($bestEvidence.ToArray())
      actorRole = $actorRole
      actorReason = $actorReason
    }
  }
}

function Get-AssistantClassification {
  param(
    [object]$Message,
    [object]$CustomerMatch
  )

  $text = ConvertTo-AssistantNormalizedText -Text "$($Message.subject) $($Message.bodyNormalized)"
  $actorRole = [string]$Message.actorRole
  $actorReason = [string]$Message.actorReason
  $workflow = Get-AssistantParaguayWorkflowProfile -Subject $Message.subject -BodyText $Message.bodyText -BodyNormalized $Message.bodyNormalized -ActorRole $actorRole
  $hasQuestion = $Message.bodyText -match '\?'
  $hasUrgent = Test-AssistantKeywordAny -Text $text -Keywords @("urgente", "hoy", "ahora", "asap", "demora", "demoras", "vencid", "bloqueado", "faltan", "falta", "sin camion", "sin ncm", "sin dua")
  $hasCommercial = Test-AssistantKeywordAny -Text $text -Keywords @("cotizacion", "propuesta", "seguimiento", "precio", "presupuesto", "reunion", "llamada", "respuesta", "confirmar")
  $hasDocumentary = Test-AssistantKeywordAny -Text $text -Keywords @("documentacion", "documental", "factura crt", "borrador crt", "factura final", "ncm", "dua", "mic", "seguro", "adjunto", "recibo", "transferencia")
  $hasOperational = Test-AssistantKeywordAny -Text $text -Keywords @("arribo", "camion", "contenedor", "aduana", "despachante", "polo logistico", "devolucion", "carga", "descarga", "operacion", "booking", "hbl", "eta", "murchison", "bogg")
  $hasParaguay = [bool]$workflow.strongParaguay -or (Test-AssistantKeywordAny -Text $text -Keywords @("paraguay", "asuncion", "ciudad del este", "despachante py", "ncm", "dua", "mic", "crt", "py", "par", "bogg", "murchison"))
  $responseSignal = Test-AssistantKeywordAny -Text $text -Keywords @("necesito", "solicito", "por favor", "pueden", "podrian", "confirmar", "enviar", "revisar", "adjunto", "quedamos atentos")
  $requiresResponse = $hasQuestion -or $hasCommercial -or $hasDocumentary -or $hasOperational -or $hasParaguay -or $responseSignal
  $requiresResponseExplicit = $hasQuestion -or $responseSignal
  $requiresFollowUp = $hasCommercial -or $hasDocumentary -or $hasOperational -or $hasParaguay
  $requiresOperation = $hasOperational -or $hasParaguay -or ($Message.operationHint -and ($Message.operationHint.PSObject.Properties.Count -gt 0)) -or [bool]$workflow.strongParaguay
  $requiresTask = $requiresResponse -or $requiresFollowUp -or $requiresOperation

  $caseType = "informativo"
  if ($hasParaguay) {
    $caseType = "caso de operacion Paraguay"
  } elseif ($hasDocumentary) {
    $caseType = "solicitud documental"
  } elseif ($hasOperational) {
    $caseType = "caso operativo"
  } elseif ($hasCommercial) {
    $caseType = "seguimiento comercial"
  }

  $workflowCategory = if (-not [string]::IsNullOrWhiteSpace([string]$workflow.workflowCategory)) { [string]$workflow.workflowCategory } else { "informativo" }
  $workflowStage = if (-not [string]::IsNullOrWhiteSpace([string]$workflow.workflowStage)) { [string]$workflow.workflowStage } else { "informativo" }
  if ($workflowCategory -eq "informativo" -and $caseType -eq "caso de operacion Paraguay") {
    $workflowCategory = "caso operativo"
  }

  $priority = if ($hasUrgent -or $caseType -eq "caso de operacion Paraguay") {
    "Alta"
  } elseif ($requiresFollowUp -or $requiresResponse) {
    "Media"
  } else {
    "Baja"
  }

  $signals = New-Object System.Collections.Generic.List[string]
  if ($caseType) { $signals.Add($caseType) | Out-Null }
  if ($workflowCategory) { $signals.Add($workflowCategory) | Out-Null }
  if ($workflowStage) { $signals.Add($workflowStage) | Out-Null }
  if (-not [string]::IsNullOrWhiteSpace($actorRole)) { $signals.Add("actor:$actorRole") | Out-Null }
  if ($requiresResponse) { $signals.Add("requiere respuesta") | Out-Null }
  if ($requiresFollowUp) { $signals.Add("requiere tarea") | Out-Null }
  if ($requiresOperation) { $signals.Add("requiere crear o actualizar operacion") | Out-Null }

  return [pscustomobject]@{
    caseType = $caseType
    workflowCategory = $workflowCategory
    workflowStage = $workflowStage
    priority = $priority
    requiresResponse = [bool]$requiresResponse
    requiresResponseExplicit = [bool]$requiresResponseExplicit
    requiresFollowUp = [bool]$requiresFollowUp
    requiresOperation = [bool]$requiresOperation
    requiresTask = [bool]$requiresTask
    actorRole = $actorRole
    actorReason = $actorReason
    workflowSignals = @($workflow.workflowSignals)
    signals = @($signals | Select-Object -Unique)
    confidence = if ($hasParaguay -or $hasDocumentary -or $hasOperational -or $hasCommercial) { 0.9 } elseif ($requiresResponse) { 0.72 } else { 0.45 }
  }
}

function Get-AssistantDraftAutoDecision {
  param([object]$Classification)

  $caseType = [string]$Classification.caseType
  $explicitResponse = [bool]$Classification.requiresResponseExplicit
  $eligibleCase = $caseType -in $script:AssistantDraftAutoCaseTypes
  $eligible = $eligibleCase -or $explicitResponse
  $trigger = if ($eligibleCase) {
    $caseType
  } elseif ($explicitResponse) {
    "requiere respuesta explicita"
  } else {
    ""
  }

  return [pscustomobject]@{
    eligible = [bool]$eligible
    trigger = [string]$trigger
    reason = if ($eligibleCase) {
      "caso habilitado: $caseType"
    } elseif ($explicitResponse) {
      "requiere respuesta explicita"
    } else {
      "no requiere borrador automatico"
    }
    mode = if ($eligible) { "auto" } else { "skip" }
    caseType = $caseType
    explicitResponse = [bool]$explicitResponse
  }
}

function Get-AssistantSummary {
  param(
    [object]$Message,
    [object]$CustomerMatch,
    [object]$Classification
  )

  $parts = New-Object System.Collections.Generic.List[string]
  $parts.Add($Classification.caseType) | Out-Null
  if ($CustomerMatch.found) {
    $parts.Add($CustomerMatch.label) | Out-Null
  }
  if (-not [string]::IsNullOrWhiteSpace([string]$Message.subject)) {
    $parts.Add((([string]$Message.subject).Trim())) | Out-Null
  }
  if (-not [string]::IsNullOrWhiteSpace([string]$Message.bodyNormalized)) {
    $preview = [string]$Message.bodyNormalized
    if ($preview.Length -gt 220) {
      $preview = $preview.Substring(0, 217).Trim() + "..."
    }
    $parts.Add($preview) | Out-Null
  }

  return ($parts -join " | ")
}

function Get-AssistantDraftReply {
  param(
    [object]$Message,
    [object]$CustomerMatch,
    [object]$Classification
  )

  $greeting = if ($CustomerMatch.found) {
    "Hola $([string]$CustomerMatch.customer.contactoPrincipal)"
  } else {
    "Hola"
  }

  $workflowStage = [string]$Classification.workflowStage
  $workflowCategory = [string]$Classification.workflowCategory

  switch ($workflowStage) {
    "aviso de arribo" {
      return @(
        $greeting + ",",
        "",
        "Recibido. Quedamos atentos al arribo y a la confirmacion del camion para seguir con la documentacion.",
        "Apenas tengamos la siguiente novedad, te avisamos por este mismo canal.",
        "",
        "Saludos,"
      ) -join "`n"
    }
    "pedido de camión" {
      return @(
        $greeting + ",",
        "",
        "Recibido. Ya dejamos la coordinacion del camion en seguimiento y te avisamos apenas quede confirmada.",
        "",
        "Saludos,"
      ) -join "`n"
    }
    "factura CRT" {
      return @(
        $greeting + ",",
        "",
        "Buen dia. Adjuntamos la factura para CRT. Quedamos atentos a tu confirmacion y a cualquier dato faltante para continuar.",
        "",
        "Saludos,"
      ) -join "`n"
    }
    "borrador CRT" {
      return @(
        $greeting + ",",
        "",
        "Adjuntamos el borrador CRT para revision. Quedamos atentos a tu confirmacion para avanzar con la operativa.",
        "",
        "Saludos,"
      ) -join "`n"
    }
    "espera NCM / seguro" {
      return @(
        $greeting + ",",
        "",
        "Recibido. Quedamos a la espera del NCM y del seguro para continuar con la gestion.",
        "Apenas lo tengas, nos lo compartes por favor.",
        "",
        "Saludos,"
      ) -join "`n"
    }
    "DUA" {
      return @(
        $greeting + ",",
        "",
        "Gracias por el DUA. Lo registramos y seguimos con el control documental de la operativa.",
        "",
        "Saludos,"
      ) -join "`n"
    }
    "MIC / CRT definitivo" {
      return @(
        $greeting + ",",
        "",
        "Adjunto MIC y CRT con seguro. Quedamos atentos a la conformidad para cerrar el circuito documental.",
        "",
        "Saludos,"
      ) -join "`n"
    }
    "entrega documental" {
      return @(
        $greeting + ",",
        "",
        "Documentacion entregada. Quedamos atentos a la recepcion y a cualquier novedad que surja.",
        "",
        "Saludos,"
      ) -join "`n"
    }
    "devolucion / retorno" {
      return @(
        $greeting + ",",
        "",
        "Recibido. Dejamos el caso en seguimiento por la devolucion / retorno y cualquier novedad te la compartimos.",
        "",
        "Saludos,"
      ) -join "`n"
    }
    "demoras / costos" {
      return @(
        $greeting + ",",
        "",
        "Recibido. Dejamos el caso en seguimiento por demoras / costos y te avisamos apenas tengamos novedad.",
        "",
        "Saludos,"
      ) -join "`n"
    }
  }

  switch ($Classification.caseType) {
    "caso de operacion Paraguay" {
      return @(
        $greeting + ",",
        "",
        "Recibido. Estamos revisando la operacion, el arribo y la documentacion para confirmar el siguiente paso sin frenar la gestion.",
        "En cuanto validemos camion, NCM/seguro y DUA, te compartimos la actualizacion.",
        "",
        "Saludos,"
      ) -join "`n"
    }
    "solicitud documental" {
      return @(
        $greeting + ",",
        "",
        "Recibido. Queda en revision la documentacion solicitada y te confirmamos avance apenas tengamos la validacion interna.",
        "Si hace falta un soporte adicional, te lo pedimos por este mismo canal.",
        "",
        "Saludos,"
      ) -join "`n"
    }
    "caso operativo" {
      return @(
        $greeting + ",",
        "",
        "Recibido. Ya dejamos el caso bajo seguimiento operativo para validar arribo, coordinacion y entrega documental.",
        "Te compartimos novedades apenas tengamos confirmacion.",
        "",
        "Saludos,"
      ) -join "`n"
    }
    "seguimiento comercial" {
      return @(
        $greeting + ",",
        "",
        "Gracias por el seguimiento. Estamos revisando la propuesta y te respondemos con la siguiente definicion comercial a la brevedad.",
        "Si quieres, tambien podemos dejar una version ajustada por ruta, plazo o moneda.",
        "",
        "Saludos,"
      ) -join "`n"
    }
    default {
      return @(
        $greeting + ",",
        "",
        "Gracias por la informacion. Queda registrada para seguimiento interno.",
        "",
        "Saludos,"
      ) -join "`n"
    }
  }
}

function ConvertTo-AssistantStringArray {
  param([object]$Value)

  $items = New-Object System.Collections.Generic.List[string]
  foreach ($item in @(ConvertTo-AssistantArray -Value $Value)) {
    $text = ([string]$item).Trim()
    if (-not [string]::IsNullOrWhiteSpace($text)) {
      $items.Add($text) | Out-Null
    }
  }

  return $items.ToArray()
}

function Get-AssistantDraftStatusValues {
  return @(
    "draft_pending_review",
    "draft_exported",
    "draft_failed"
  )
}

function Get-AssistantDraftSubject {
  param(
    [object]$Message,
    [string]$Reference = ""
  )

  $subject = ([string]$Message.subject).Trim()
  if ([string]::IsNullOrWhiteSpace($subject)) {
    return "Seguimiento JoathiVA"
  }

  if ($subject -match '^(?i)re:\s*') {
    return $subject
  }

  if (-not [string]::IsNullOrWhiteSpace($Reference)) {
    return "Re: $Reference - $subject"
  }

  return "Re: $subject"
}

function Get-AssistantDraftRecipients {
  param(
    [object]$Message,
    [object]$CustomerMatch
  )

  $to = New-Object System.Collections.Generic.List[string]
  $cc = New-Object System.Collections.Generic.List[string]

  $senderAddress = ""
  if ($Message.from -and $Message.from.address) {
    $senderAddress = ([string]$Message.from.address).Trim().ToLowerInvariant()
  }
  if (-not [string]::IsNullOrWhiteSpace($senderAddress)) {
    $to.Add($senderAddress) | Out-Null
  } elseif ($CustomerMatch -and $CustomerMatch.found -and $CustomerMatch.customer -and -not [string]::IsNullOrWhiteSpace([string]$CustomerMatch.customer.email)) {
    $to.Add(([string]$CustomerMatch.customer.email).Trim().ToLowerInvariant()) | Out-Null
  }

  return [pscustomobject]@{
    to = $to.ToArray()
    cc = $cc.ToArray()
  }
}

function Get-AssistantDraftProviderCapability {
  param(
    [string]$ProviderKind = "",
    [string]$MailboxProfileId = ""
  )

  $profile = $null
  if (-not [string]::IsNullOrWhiteSpace($MailboxProfileId) -and (Get-Command -Name "Get-MailboxProfile" -ErrorAction SilentlyContinue)) {
    try {
      $profile = Get-MailboxProfile -ProfileId $MailboxProfileId
    } catch {
      $profile = $null
    }
  }

  $kind = ([string]$ProviderKind).Trim().ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($kind) -and $profile) {
    $kind = "imap"
  }
  if ([string]::IsNullOrWhiteSpace($kind)) {
    $kind = "local"
  }

  $supportsProvider = $false
  if ($profile) {
    if (($profile.PSObject.Properties.Name -contains "supportsDrafts" -and [bool]$profile.supportsDrafts) -or -not [string]::IsNullOrWhiteSpace([string]$profile.draftFolder)) {
      $supportsProvider = $true
    }
  }

  if ($kind -in @("mailbox", "imap", "smtp", "corporate-provider") -and $supportsProvider) {
    return [pscustomobject]@{
      providerKind = $kind
      supported = $true
      mode = "provider"
      mailboxProfileId = [string]$MailboxProfileId
      mailboxFolder = if (-not [string]::IsNullOrWhiteSpace([string]$profile.draftFolder)) { [string]$profile.draftFolder } else { "Drafts" }
      reason = "Proveedor de borradores configurado."
    }
  }

  return [pscustomobject]@{
    providerKind = $kind
    supported = $false
    mode = "local-fallback"
    mailboxProfileId = [string]$MailboxProfileId
    mailboxFolder = ""
    reason = "No hay proveedor real de borradores configurado."
  }
}

function ConvertTo-AssistantMimeEncodedWord {
  param([string]$Value)

  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) {
    return ""
  }

  if ($text -match '^[\x20-\x7E]+$') {
    return $text
  }

  return "=?UTF-8?B?{0}?=" -f [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($text))
}

function Get-AssistantDraftMessageDomain {
  param([object]$MailboxProfile)

  $serverHost = ""
  if ($MailboxProfile -and $MailboxProfile.PSObject.Properties.Name -contains "host") {
    $serverHost = ([string]$MailboxProfile.host).Trim().ToLowerInvariant()
  }

  if ([string]::IsNullOrWhiteSpace($serverHost)) {
    return "joathiva.local"
  }

  if ($serverHost -match '^[0-9a-f:.]+$') {
    return "joathiva.local"
  }

  return $serverHost
}

function New-AssistantDraftMessageId {
  param([object]$MailboxProfile)

  $domain = Get-AssistantDraftMessageDomain -MailboxProfile $MailboxProfile
  $token = New-AssistantRecordId -Prefix "msg"
  return "<{0}@{1}>" -f $token, $domain
}

function Get-AssistantDraftAddressHeader {
  param([object[]]$Addresses)

  $items = New-Object System.Collections.Generic.List[string]
  foreach ($address in @($Addresses)) {
    $text = ([string]$address).Trim()
    if (-not [string]::IsNullOrWhiteSpace($text)) {
      $items.Add($text) | Out-Null
    }
  }

  return ($items -join ", ")
}

function Get-AssistantImapMailboxArgument {
  param([string]$FolderName)

  $folder = [string]$FolderName
  if ([string]::IsNullOrWhiteSpace($folder)) {
    return "Drafts"
  }

  if ($folder -match '^[A-Za-z0-9._/-]+$') {
    return $folder
  }

  return ConvertTo-ImapQuotedString -Value $folder
}

function Get-AssistantPythonExecutable {
  $roots = New-Object System.Collections.Generic.List[string]
  if (-not [string]::IsNullOrWhiteSpace($env:LocalAppData)) {
    $roots.Add((Join-Path $env:LocalAppData "Programs\Python")) | Out-Null
  }
  $roots.Add("C:\Program Files\Python") | Out-Null
  $roots.Add("C:\Program Files (x86)\Python") | Out-Null

  foreach ($root in $roots) {
    if ([string]::IsNullOrWhiteSpace($root) -or -not (Test-Path -LiteralPath $root)) {
      continue
    }
    $candidate = Get-ChildItem -LiteralPath $root -Recurse -Filter "python.exe" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'WindowsApps' } | Select-Object -First 1
    if ($candidate -and (Test-Path -LiteralPath $candidate.FullName)) {
      return $candidate.FullName
    }
  }

  $candidates = @("python", "python3", "py")

  foreach ($candidate in $candidates) {
    try {
      $paths = & cmd.exe /c ("where {0}" -f $candidate) 2>$null
      if ($LASTEXITCODE -eq 0 -and $paths) {
        foreach ($path in @($paths)) {
          $text = ([string]$path).Trim()
          if ([string]::IsNullOrWhiteSpace($text)) {
            continue
          }
          if ($text -match 'WindowsApps') {
            continue
          }
          if (Test-Path -LiteralPath $text) {
            return $text
          }
        }
      }
    } catch {
    }
  }

  return ""
}

function Invoke-AssistantPythonDraftExport {
  param(
    [object]$MailboxProfile,
    [string]$Folder,
    [object]$Draft
  )

  $pythonExe = Get-AssistantPythonExecutable
  if ([string]::IsNullOrWhiteSpace($pythonExe)) {
    return $null
  }

  $helperScript = Join-Path $script:AssistantRoot "assistant\mailbox_draft_export.py"
  if (-not (Test-Path -LiteralPath $helperScript)) {
    return $null
  }

  $tempRoot = [System.IO.Path]::GetTempPath()
  $payloadPath = Join-Path $tempRoot ("joathi-imap-payload-{0}.json" -f ([guid]::NewGuid().ToString("N")))
  $stdoutPath = Join-Path $tempRoot ("joathi-imap-stdout-{0}.json" -f ([guid]::NewGuid().ToString("N")))
  $stderrPath = Join-Path $tempRoot ("joathi-imap-stderr-{0}.txt" -f ([guid]::NewGuid().ToString("N")))

  $payload = [pscustomobject]@{
    profile = $MailboxProfile
    draft = $Draft
    folder = $Folder
  }

  Set-Content -LiteralPath $payloadPath -Value ($payload | ConvertTo-Json -Depth 100) -Encoding UTF8

  try {
    $process = Start-Process -FilePath $pythonExe -ArgumentList @($helperScript, $payloadPath) -PassThru -Wait -NoNewWindow -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    $stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw -Encoding UTF8 } else { "" }
    $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw -Encoding UTF8 } else { "" }
    if ([string]::IsNullOrWhiteSpace($stdout)) {
      if (-not [string]::IsNullOrWhiteSpace($stderr)) {
        throw "El proveedor Python no devolvio resultado. Detalle: $stderr"
      }
      throw "El proveedor Python no devolvio resultado."
    }

    $result = $stdout | ConvertFrom-Json
    if (-not $result) {
      if (-not [string]::IsNullOrWhiteSpace($stderr)) {
        throw "El proveedor Python devolvio una respuesta invalida. Detalle: $stderr"
      }
      throw "El proveedor Python devolvio una respuesta invalida."
    }

    if ($process.ExitCode -ne 0 -and (-not $result.ok)) {
      return $result
    }

    return $result
  } finally {
    Remove-Item -LiteralPath $payloadPath -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $stdoutPath -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $stderrPath -ErrorAction SilentlyContinue
  }
}

function New-AssistantDraftMimeMessage {
  param(
    [object]$Draft,
    [object]$MailboxProfile,
    [object]$Capability
  )

  $username = ""
  if ($MailboxProfile -and $MailboxProfile.PSObject.Properties.Name -contains "username") {
    $username = [string]$MailboxProfile.username
  }

  $toHeader = Get-AssistantDraftAddressHeader -Addresses $Draft.to
  $ccHeader = Get-AssistantDraftAddressHeader -Addresses $Draft.cc
  $subjectHeader = ConvertTo-AssistantMimeEncodedWord -Value ([string]$Draft.subject)
  $messageId = New-AssistantDraftMessageId -MailboxProfile $MailboxProfile
  $dateHeader = ([DateTimeOffset]::UtcNow).ToString("r", [System.Globalization.CultureInfo]::InvariantCulture)
  $body = [string]$Draft.bodyDraft
  if ([string]::IsNullOrWhiteSpace($body)) {
    $body = ""
  }
  $body = [regex]::Replace($body, "`r?`n", "`r`n")
  if (-not $body.EndsWith("`r`n")) {
    $body += "`r`n"
  }

  $headers = New-Object System.Collections.Generic.List[string]
  $headers.Add(("From: {0}" -f $username)) | Out-Null
  if (-not [string]::IsNullOrWhiteSpace($toHeader)) {
    $headers.Add(("To: {0}" -f $toHeader)) | Out-Null
  }
  if (-not [string]::IsNullOrWhiteSpace($ccHeader)) {
    $headers.Add(("Cc: {0}" -f $ccHeader)) | Out-Null
  }
  $headers.Add(("Subject: {0}" -f $subjectHeader)) | Out-Null
  $headers.Add(("Date: {0}" -f $dateHeader)) | Out-Null
  $headers.Add(("Message-ID: {0}" -f $messageId)) | Out-Null
  $headers.Add("MIME-Version: 1.0") | Out-Null
  $headers.Add("Content-Type: text/plain; charset=utf-8") | Out-Null
  $headers.Add("Content-Transfer-Encoding: 8bit") | Out-Null
  $headers.Add(("X-Joathi-Assistant-Draft-Id: {0}" -f $Draft.id)) | Out-Null
  if (-not [string]::IsNullOrWhiteSpace([string]$Draft.sourceEmailExternalId)) {
    $headers.Add(("X-Joathi-Source-Email-External-Id: {0}" -f $Draft.sourceEmailExternalId)) | Out-Null
  }
  if (-not [string]::IsNullOrWhiteSpace([string]$Draft.sourceIntakeId)) {
    $headers.Add(("X-Joathi-Source-Intake-Id: {0}" -f $Draft.sourceIntakeId)) | Out-Null
  }
  if (-not [string]::IsNullOrWhiteSpace([string]$Draft.customerId)) {
    $headers.Add(("X-Joathi-Customer-Id: {0}" -f $Draft.customerId)) | Out-Null
  }
  if (-not [string]::IsNullOrWhiteSpace([string]$Draft.operationId)) {
    $headers.Add(("X-Joathi-Operation-Id: {0}" -f $Draft.operationId)) | Out-Null
  }
  if (-not [string]::IsNullOrWhiteSpace([string]$Draft.taskId)) {
    $headers.Add(("X-Joathi-Task-Id: {0}" -f $Draft.taskId)) | Out-Null
  }
  if (-not [string]::IsNullOrWhiteSpace([string]$Draft.activityId)) {
    $headers.Add(("X-Joathi-Activity-Id: {0}" -f $Draft.activityId)) | Out-Null
  }

  $raw = ($headers.ToArray() + @("") + @($body)) -join "`r`n"
  return [pscustomobject]@{
    raw = $raw
    messageId = $messageId
  }
}

function Invoke-AssistantImapAppendDraft {
  param(
    [object]$MailboxProfile,
    [string]$Folder,
    [object]$Draft
  )

  $serverHost = if ($MailboxProfile -and $MailboxProfile.PSObject.Properties.Name -contains "host") { [string]$MailboxProfile.host } else { "" }
  $serverPort = 993
  if ($MailboxProfile -and $MailboxProfile.PSObject.Properties.Name -contains "port") {
    try {
      $serverPort = [int]$MailboxProfile.port
    } catch {
      $serverPort = 993
    }
  }
  $username = if ($MailboxProfile -and $MailboxProfile.PSObject.Properties.Name -contains "username") { [string]$MailboxProfile.username } else { "" }
  $password = if ($MailboxProfile -and $MailboxProfile.PSObject.Properties.Name -contains "password") { [string]$MailboxProfile.password } else { "" }

  if ([string]::IsNullOrWhiteSpace($serverHost) -or [string]::IsNullOrWhiteSpace($username) -or [string]::IsNullOrWhiteSpace($password)) {
    throw "El perfil de buzón no tiene credenciales completas para crear borradores."
  }

  $folderName = if ([string]::IsNullOrWhiteSpace($Folder)) { "Drafts" } else { [string]$Folder }
  $pythonResult = Invoke-AssistantPythonDraftExport -MailboxProfile $MailboxProfile -Folder $folderName -Draft $Draft
  if ($pythonResult -and $pythonResult.ok -and $pythonResult.exported) {
    return $pythonResult
  }

  $mime = New-AssistantDraftMimeMessage -Draft $Draft -MailboxProfile $MailboxProfile
  $messageBytes = [System.Text.Encoding]::UTF8.GetBytes([string]$mime.raw)
  $folderArgument = Get-AssistantImapMailboxArgument -FolderName $folderName

  $tcpClient = New-Object System.Net.Sockets.TcpClient
  $sslStream = $null

  try {
    $tcpClient.Connect($serverHost, $serverPort)
    $sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream(), $false)
    $sslStream.ReadTimeout = 60000
    $sslStream.WriteTimeout = 60000
    $sslStream.AuthenticateAsClient($serverHost)

    $greeting = Read-ImapLine -Stream $sslStream
    if ([string]::IsNullOrWhiteSpace($greeting) -or $greeting -notlike "* OK*") {
      throw "El servidor IMAP no envio un saludo valido."
    }

    $tagCounter = 1
    [void](Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command ("LOGIN {0} {1}" -f (ConvertTo-ImapQuotedString -Value $username), (ConvertTo-ImapQuotedString -Value $password)) -SafeCommand "LOGIN")

    $appendTag = "A{0:0000}" -f $tagCounter
    $tagCounter += 1
    $appendCommand = "$appendTag APPEND $folderArgument {$($messageBytes.Length)}`r`n"
    $appendCommandBytes = [System.Text.Encoding]::ASCII.GetBytes($appendCommand)
    $sslStream.Write($appendCommandBytes, 0, $appendCommandBytes.Length)
    $sslStream.Flush()

    $continuation = Read-ImapLine -Stream $sslStream
    if ([string]::IsNullOrWhiteSpace($continuation) -or $continuation -notmatch '^\+') {
      throw "El servidor IMAP no acepto el literal para APPEND."
    }

    $sslStream.Write($messageBytes, 0, $messageBytes.Length)
    $sslStream.Flush()

    $appendResponse = Read-ImapResponse -Stream $sslStream -Tag $appendTag
    $appendStatus = $appendResponse[$appendResponse.Count - 1].line
    if ($appendStatus -notmatch "^$appendTag OK\b") {
      throw "El servidor IMAP rechazo la creacion del borrador."
    }

    [void](Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command ("EXAMINE {0}" -f $folderArgument))

    $verificationQuery = ConvertTo-ImapQuotedString -Value $mime.messageId
    $verificationResponse = Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command ("UID SEARCH HEADER Message-ID {0}" -f $verificationQuery)
    $uids = @(Parse-ImapSearchUids -Response $verificationResponse)
    if (-not $uids.Count) {
      $verificationResponse = Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command ("UID SEARCH HEADER X-Joathi-Assistant-Draft-Id {0}" -f (ConvertTo-ImapQuotedString -Value ([string]$Draft.id)))
      $uids = @(Parse-ImapSearchUids -Response $verificationResponse)
    }
    if (-not $uids.Count) {
      throw "El borrador se creo, pero no se pudo verificar en el buzón."
    }

    $verificationUid = [string]$uids[0]
    $summary = Get-ImapMessageSummary -Stream $sslStream -TagCounter ([ref]$tagCounter) -Uid $verificationUid

    try {
      [void](Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command "LOGOUT")
    } catch {
    }

    return [pscustomobject]@{
      ok = $true
      exported = $true
      providerKind = "imap"
      draftId = [string]$mime.messageId
      messageId = [string]$mime.messageId
      mailboxUid = [string]$verificationUid
      folder = [string]$folderName
      verified = $true
      verificationUid = [string]$verificationUid
      verificationSummary = $summary
      metadata = [pscustomobject]@{
        host = $serverHost
        port = $serverPort
        username = $username
        folder = [string]$folderName
        messageId = [string]$mime.messageId
        verificationUid = [string]$verificationUid
        verified = $true
        verifiedAt = Get-AssistantNowIso
      }
      reason = ""
    }
  } finally {
    if ($sslStream) {
      $sslStream.Dispose()
    }
    if ($tcpClient) {
      $tcpClient.Dispose()
    }
  }
}

function Invoke-AssistantDraftProviderCreate {
  param(
    [object]$Draft,
    [object]$Capability,
    [string]$MailboxProfileId = ""
  )

  if (-not $Capability -or -not [bool]$Capability.supported) {
    return [pscustomobject]@{
      ok = $false
      supported = $false
      providerKind = if ($Capability) { [string]$Capability.providerKind } else { "local" }
      draftId = ""
      reason = if ($Capability -and -not [string]::IsNullOrWhiteSpace([string]$Capability.reason)) { [string]$Capability.reason } else { "No hay proveedor real de borradores configurado." }
      exported = $false
      metadata = [pscustomobject]@{
        mode = "local-fallback"
      }
    }
  }

  $profile = $null
  if (Get-Command -Name "Get-MailboxProfile" -ErrorAction SilentlyContinue) {
    $profileId = if (-not [string]::IsNullOrWhiteSpace($MailboxProfileId)) { $MailboxProfileId } else { [string]$Capability.mailboxProfileId }
    if (-not [string]::IsNullOrWhiteSpace($profileId)) {
      try {
        $profile = Get-MailboxProfile -ProfileId $profileId
      } catch {
        $profile = $null
      }
    }
  }

  if (-not $profile) {
    return [pscustomobject]@{
      ok = $false
      supported = $true
      providerKind = [string]$Capability.providerKind
      draftId = ""
      reason = "No se encontro el perfil de buzón para exportar el borrador."
      exported = $false
      metadata = [pscustomobject]@{
        mode = "local-fallback"
      }
    }
  }

  $result = Invoke-AssistantImapAppendDraft -MailboxProfile $profile -Folder ([string]$Capability.mailboxFolder) -Draft $Draft
  return [pscustomobject]@{
    ok = [bool]$result.ok
    supported = $true
    providerKind = [string]$Capability.providerKind
    draftId = [string]$result.draftId
    messageId = [string]$result.messageId
    mailboxUid = [string]$result.mailboxUid
    folder = [string]$result.folder
    verified = [bool]$result.verified
    verificationUid = [string]$result.verificationUid
    exported = [bool]$result.exported
    reason = [string]$result.reason
    metadata = $result.metadata
    verificationSummary = $result.verificationSummary
  }
}

function Invoke-AssistantExportDraftToProvider {
  param(
    [object]$Store,
    [object]$Draft,
    [string]$ProviderKind = "",
    [string]$MailboxProfileId = "",
    [string]$MailboxFolder = "",
    [bool]$FailIfUnsupported = $true
  )

  $draftMetadata = ConvertTo-AssistantDictionary -Value $Draft.metadata
  if ([string]::IsNullOrWhiteSpace($ProviderKind) -and $draftMetadata.ContainsKey("providerKind")) {
    $ProviderKind = [string]$draftMetadata.providerKind
  }
  if ([string]::IsNullOrWhiteSpace($MailboxProfileId) -and $draftMetadata.ContainsKey("mailboxProfileId")) {
    $MailboxProfileId = [string]$draftMetadata.mailboxProfileId
  }
  if ([string]::IsNullOrWhiteSpace($MailboxFolder) -and $draftMetadata.ContainsKey("mailboxFolder")) {
    $MailboxFolder = [string]$draftMetadata.mailboxFolder
  }

  $capability = Get-AssistantDraftProviderCapability -ProviderKind $ProviderKind -MailboxProfileId $MailboxProfileId
  if (-not $capability.supported) {
    if ($FailIfUnsupported) {
      $failedDraft = Invoke-AssistantUpdateDraftStatus -Store $Store -Id ([string]$Draft.id) -Status "draft_failed" -FailureReason ([string]$capability.reason) -MetadataPatch ([pscustomobject]@{
        exportMode = "provider"
        fallbackMode = "local"
        providerOk = $false
        providerKind = [string]$capability.providerKind
        providerSupported = $false
        providerReason = [string]$capability.reason
        providerError = [string]$capability.reason
      })
      return [pscustomobject]@{
        ok = $false
        duplicate = $false
        fallbackMode = "local"
        provider = [pscustomobject]@{
          ok = $false
          supported = $false
          providerKind = [string]$capability.providerKind
          reason = [string]$capability.reason
          exported = $false
        }
        draft = $failedDraft
      }
    }

    return [pscustomobject]@{
      ok = $false
      duplicate = $false
      fallbackMode = "local"
      provider = [pscustomobject]@{
        ok = $false
        supported = $false
        providerKind = [string]$capability.providerKind
        reason = [string]$capability.reason
        exported = $false
      }
      draft = $Draft
    }
  }

  try {
    $provider = Invoke-AssistantDraftProviderCreate -Draft $Draft -Capability $capability -MailboxProfileId $MailboxProfileId
    if ($provider -and $provider.ok -and $provider.exported) {
      $draft = Invoke-AssistantUpdateDraftStatus -Store $Store -Id ([string]$Draft.id) -Status "draft_exported" -ReviewedAt (Get-AssistantNowIso) -ProviderDraftId ([string]$provider.draftId) -MetadataPatch ([pscustomobject]@{
        exportMode = "provider"
        fallbackMode = "provider"
        providerOk = $true
        providerKind = [string]$capability.providerKind
        providerDraftId = [string]$provider.draftId
        providerMailboxUid = [string]$provider.mailboxUid
        providerMessageId = [string]$provider.messageId
        providerVerified = [bool]$provider.verified
        providerVerificationUid = [string]$provider.verificationUid
        providerFolder = [string]$provider.folder
        providerMetadata = $provider.metadata
      })
      return [pscustomobject]@{
        ok = $true
        duplicate = $false
        fallbackMode = "provider"
        provider = $provider
        draft = $draft
      }
    }

    $failureReason = if ($provider -and -not [string]::IsNullOrWhiteSpace([string]$provider.reason)) { [string]$provider.reason } else { "No se pudo exportar el borrador al proveedor." }
    $draft = Invoke-AssistantUpdateDraftStatus -Store $Store -Id ([string]$Draft.id) -Status "draft_failed" -FailureReason $failureReason -MetadataPatch ([pscustomobject]@{
      exportMode = "provider"
      fallbackMode = "local"
      providerOk = $false
      providerKind = [string]$capability.providerKind
      providerSupported = $true
      providerReason = $failureReason
      providerError = $failureReason
      providerMetadata = if ($provider) { $provider.metadata } else { $null }
    })
    return [pscustomobject]@{
      ok = $false
      duplicate = $false
      fallbackMode = "local"
      provider = $provider
      draft = $draft
    }
  } catch {
    $draft = Invoke-AssistantUpdateDraftStatus -Store $Store -Id ([string]$Draft.id) -Status "draft_failed" -FailureReason ([string]$_.Exception.Message) -MetadataPatch ([pscustomobject]@{
      exportMode = "provider"
      fallbackMode = "local"
      providerOk = $false
      providerKind = [string]$capability.providerKind
      providerSupported = $true
      providerReason = [string]$_.Exception.Message
      providerError = [string]$_.Exception.Message
    })
    return [pscustomObject]@{
      ok = $false
      duplicate = $false
      fallbackMode = "local"
      provider = [pscustomobject]@{
        ok = $false
        supported = $true
        providerKind = [string]$capability.providerKind
        reason = [string]$_.Exception.Message
        exported = $false
      }
      draft = $draft
    }
  }
}

function Normalize-AssistantDraftRecord {
  param([object]$Draft)

  $source = ConvertTo-AssistantDictionary -Value $Draft
  $status = [string]$source.status
  if ($status -notin (Get-AssistantDraftStatusValues)) {
    $status = "draft_pending_review"
  }

  $record = [pscustomobject]@{
    id = if ([string]::IsNullOrWhiteSpace([string]$source.id)) { New-AssistantRecordId -Prefix "drf" } else { [string]$source.id }
    sourceEmailExternalId = if ([string]::IsNullOrWhiteSpace([string]$source.sourceEmailExternalId)) { [string]$source.sourceIntakeId } else { [string]$source.sourceEmailExternalId }
    sourceIntakeId = if ([string]::IsNullOrWhiteSpace([string]$source.sourceIntakeId)) { "" } else { [string]$source.sourceIntakeId }
    customerId = if ([string]::IsNullOrWhiteSpace([string]$source.customerId)) { "" } else { [string]$source.customerId }
    operationId = if ([string]::IsNullOrWhiteSpace([string]$source.operationId)) { "" } else { [string]$source.operationId }
    taskId = if ([string]::IsNullOrWhiteSpace([string]$source.taskId)) { "" } else { [string]$source.taskId }
    activityId = if ([string]::IsNullOrWhiteSpace([string]$source.activityId)) { "" } else { [string]$source.activityId }
    to = @(ConvertTo-AssistantStringArray -Value $source.to)
    cc = @(ConvertTo-AssistantStringArray -Value $source.cc)
    subject = if ([string]::IsNullOrWhiteSpace([string]$source.subject)) { "" } else { [string]$source.subject }
    summary = if ([string]::IsNullOrWhiteSpace([string]$source.summary)) { "" } else { [string]$source.summary }
    bodyDraft = if ([string]::IsNullOrWhiteSpace([string]$source.bodyDraft)) { "" } else { [string]$source.bodyDraft }
    status = $status
    createdAt = if ([string]::IsNullOrWhiteSpace([string]$source.createdAt)) { Get-AssistantNowIso } else { [string]$source.createdAt }
    updatedAt = if ([string]::IsNullOrWhiteSpace([string]$source.updatedAt)) { Get-AssistantNowIso } else { [string]$source.updatedAt }
    reviewedAt = if ([string]::IsNullOrWhiteSpace([string]$source.reviewedAt)) { $null } else { [string]$source.reviewedAt }
    exportedAt = if ([string]::IsNullOrWhiteSpace([string]$source.exportedAt)) { $null } else { [string]$source.exportedAt }
    failedAt = if ([string]::IsNullOrWhiteSpace([string]$source.failedAt)) { $null } else { [string]$source.failedAt }
    failureReason = if ([string]::IsNullOrWhiteSpace([string]$source.failureReason)) { "" } else { [string]$source.failureReason }
    metadata = if ($source.ContainsKey("metadata") -and $source.metadata) { $source.metadata } else { [pscustomobject]@{} }
  }

  return $record
}

function Get-AssistantStoreDraftsArray {
  param([object]$Store)

  if (-not $Store -or -not $Store.drafts) {
    return @()
  }

  return ConvertTo-AssistantArray -Value $Store.drafts
}

function Get-AssistantStoreDraftIndex {
  param(
    [object]$Store,
    [string]$SourceEmailExternalId
  )

  if (-not $Store -or [string]::IsNullOrWhiteSpace($SourceEmailExternalId)) {
    return -1
  }

  $records = @(Get-AssistantStoreDraftsArray -Store $Store)
  for ($index = 0; $index -lt $records.Count; $index += 1) {
    if ([string]$records[$index].sourceEmailExternalId -eq $SourceEmailExternalId) {
      return $index
    }
  }

  return -1
}

function Get-AssistantStoreDraftById {
  param(
    [object]$Store,
    [string]$Id
  )

  if ([string]::IsNullOrWhiteSpace($Id)) {
    return $null
  }

  return (Get-AssistantStoreDraftsArray -Store $Store) | Where-Object { [string]$_.id -eq $Id } | Select-Object -First 1
}

function Get-AssistantStoreDraftBySourceEmailExternalId {
  param(
    [object]$Store,
    [string]$SourceEmailExternalId
  )

  if ([string]::IsNullOrWhiteSpace($SourceEmailExternalId)) {
    return $null
  }

  return (Get-AssistantStoreDraftsArray -Store $Store) | Where-Object { [string]$_.sourceEmailExternalId -eq $SourceEmailExternalId } | Select-Object -First 1
}

function Save-AssistantDraftRecord {
  param(
    [object]$Store,
    [object]$Record
  )

  $normalized = Normalize-AssistantDraftRecord -Draft $Record
  $records = New-Object System.Collections.Generic.List[object]
  foreach ($item in @(Get-AssistantStoreDraftsArray -Store $Store)) {
    if ($null -ne $item) {
      $records.Add($item) | Out-Null
    }
  }

  $index = Get-AssistantStoreDraftIndex -Store $Store -SourceEmailExternalId ([string]$normalized.sourceEmailExternalId)
  if ($index -ge 0) {
    $records[$index] = $normalized
  } else {
    $records.Add($normalized) | Out-Null
  }

  $Store.drafts = $records.ToArray()
  Save-AssistantStore -Store $Store
  return $normalized
}

function Get-AssistantDraftSummaryItem {
  param([object]$Record)

  return [pscustomobject]@{
    id = [string]$Record.id
    sourceEmailExternalId = [string]$Record.sourceEmailExternalId
    sourceIntakeId = [string]$Record.sourceIntakeId
    customerId = [string]$Record.customerId
    operationId = [string]$Record.operationId
    taskId = [string]$Record.taskId
    activityId = [string]$Record.activityId
    to = @($Record.to)
    cc = @($Record.cc)
    subject = [string]$Record.subject
    summary = [string]$Record.summary
    status = [string]$Record.status
    createdAt = [string]$Record.createdAt
    updatedAt = [string]$Record.updatedAt
    reviewedAt = [string]$Record.reviewedAt
    draftEligible = if ($Record.planned -and $Record.planned.draft) { [bool]$Record.planned.draft.eligible } else { $false }
    draftTrigger = if ($Record.planned -and $Record.planned.draft -and -not [string]::IsNullOrWhiteSpace([string]$Record.planned.draft.trigger)) { [string]$Record.planned.draft.trigger } else { "" }
    draftProviderOk = if ($Record.execution -and $Record.execution.draft -and $Record.execution.draft.provider -and ($Record.execution.draft.provider.PSObject.Properties.Name -contains "ok")) { [bool]$Record.execution.draft.provider.ok } else { $false }
    draftFallbackMode = if ($Record.execution -and $Record.execution.draft -and -not [string]::IsNullOrWhiteSpace([string]$Record.execution.draft.fallbackMode)) { [string]$Record.execution.draft.fallbackMode } elseif ($Record.planned -and $Record.planned.draft -and -not [string]::IsNullOrWhiteSpace([string]$Record.planned.draft.providerMode)) { [string]$Record.planned.draft.providerMode } else { "" }
    draftError = if ($Record.execution -and $Record.execution.draft -and $Record.execution.draft.provider -and -not [bool]$Record.execution.draft.provider.ok -and -not [string]::IsNullOrWhiteSpace([string]$Record.execution.draft.provider.reason)) { [string]$Record.execution.draft.provider.reason } else { "" }
    executionMode = if ($Record.execution -and -not [string]::IsNullOrWhiteSpace([string]$Record.execution.mode)) { [string]$Record.execution.mode } else { "" }
  }
}

function Get-AssistantDraftsList {
  param([hashtable]$Query = @{})

  $store = Get-AssistantStore
  $records = @(Get-AssistantStoreDraftsArray -Store $store)

  if (-not [string]::IsNullOrWhiteSpace([string]$Query.q)) {
    $needle = ConvertTo-AssistantNormalizedText -Text ([string]$Query.q)
    $records = @($records | Where-Object {
      $recipientText = ([string[]]@($_.to) -join ' ')
      $haystack = ConvertTo-AssistantNormalizedText -Text ("$($_.subject) $($_.summary) $($_.bodyDraft) $recipientText $($_.sourceEmailExternalId)")
      $haystack.Contains($needle)
    })
  }

  if (-not [string]::IsNullOrWhiteSpace([string]$Query.status)) {
    $records = @($records | Where-Object { [string]$_.status -eq ([string]$Query.status).Trim() })
  }

  foreach ($field in @("customerId", "operationId", "taskId")) {
    if (-not [string]::IsNullOrWhiteSpace([string]$Query[$field])) {
      $needleValue = ([string]$Query[$field]).Trim()
      $records = @($records | Where-Object { ([string]$_.PSObject.Properties[$field].Value).Trim() -eq $needleValue })
    }
  }

  $limit = 50
  [void][int]::TryParse([string]$Query.limit, [ref]$limit)
  if ($limit -lt 1) { $limit = 50 }
  if ($limit -gt 250) { $limit = 250 }

  $cursor = 0
  [void][int]::TryParse([string]$Query.cursor, [ref]$cursor)
  if ($cursor -lt 0) { $cursor = 0 }

  $sorted = @($records | Sort-Object -Property @{ Expression = { [string]$_.updatedAt }; Descending = $true }, @{ Expression = { [string]$_.createdAt }; Descending = $true })
  if ($sorted.Count -eq 1 -and $null -eq $sorted[0]) {
    $sorted = @()
  }
  $page = @($sorted | Select-Object -Skip $cursor -First $limit)
  if ($page.Count -eq 1 -and $null -eq $page[0]) {
    $page = @()
  }
  $nextCursor = if (($cursor + $page.Count) -lt $sorted.Count) { $cursor + $page.Count } else { $null }

  return [pscustomobject]@{
    items = @($page | ForEach-Object { Get-AssistantDraftSummaryItem -Record $_ })
    count = $page.Count
    limit = $limit
    cursor = $cursor
    nextCursor = $nextCursor
    hasMore = [bool]($null -ne $nextCursor)
    totalCount = $sorted.Count
  }
}

function Get-AssistantDraftByIdResponse {
  param([string]$Id)

  $store = Get-AssistantStore
  $record = Get-AssistantStoreDraftById -Store $store -Id $Id
  if (-not $record) {
    return $null
  }

  return $record
}

function Invoke-AssistantUpdateDraftStatus {
  param(
    [object]$Store,
    [string]$Id,
    [string]$Status,
    [string]$ReviewedAt = "",
    [string]$FailureReason = "",
    [string]$ProviderDraftId = "",
    [object]$MetadataPatch = $null
  )

  $existing = Get-AssistantStoreDraftById -Store $Store -Id $Id
  if (-not $existing) {
    return $null
  }

  $payload = ConvertTo-AssistantDictionary -Value $existing
  $payload.status = $Status
  $payload.updatedAt = Get-AssistantNowIso

  if (-not [string]::IsNullOrWhiteSpace($ReviewedAt)) {
    $payload.reviewedAt = [string]$ReviewedAt
  } elseif ($Status -eq "draft_exported" -and [string]::IsNullOrWhiteSpace([string]$payload.reviewedAt)) {
    $payload.reviewedAt = Get-AssistantNowIso
  }

  if ($Status -eq "draft_exported") {
    $payload.exportedAt = Get-AssistantNowIso
    $payload.failedAt = $null
    $payload.failureReason = ""
  } elseif ($Status -eq "draft_failed") {
    $payload.failedAt = Get-AssistantNowIso
    $payload.exportedAt = $null
    $payload.failureReason = [string]$FailureReason
  }

  if (-not [string]::IsNullOrWhiteSpace($ProviderDraftId)) {
    if (-not ($payload.ContainsKey("metadata"))) {
      $payload.metadata = [pscustomobject]@{}
    }
    $meta = ConvertTo-AssistantDictionary -Value $payload.metadata
    $meta.providerDraftId = [string]$ProviderDraftId
    $payload.metadata = [pscustomobject]$meta
  }

  if ($MetadataPatch) {
    if (-not ($payload.ContainsKey("metadata"))) {
      $payload.metadata = [pscustomobject]@{}
    }
    $meta = ConvertTo-AssistantDictionary -Value $payload.metadata
    foreach ($key in $MetadataPatch.PSObject.Properties.Name) {
      $meta[$key] = $MetadataPatch.$key
    }
    $payload.metadata = [pscustomobject]$meta
  }

  $normalized = Normalize-AssistantDraftRecord -Draft ([pscustomobject]$payload)
  $records = @(Get-AssistantStoreDraftsArray -Store $Store)
  $index = -1
  for ($i = 0; $i -lt $records.Count; $i += 1) {
    if ([string]$records[$i].id -eq $Id) {
      $index = $i
      break
    }
  }
  if ($index -lt 0) {
    return $null
  }

  $records[$index] = $normalized
  $Store.drafts = $records
  Save-AssistantStore -Store $Store
  return $normalized
}

function Invoke-AssistantLinkDraftActivity {
  param(
    [object]$Store,
    [string]$DraftId,
    [string]$ActivityId = ""
  )

  if ([string]::IsNullOrWhiteSpace($DraftId) -or [string]::IsNullOrWhiteSpace($ActivityId)) {
    return $null
  }

  $existing = Get-AssistantStoreDraftById -Store $Store -Id $DraftId
  if (-not $existing) {
    return $null
  }

  $payload = ConvertTo-AssistantDictionary -Value $existing
  $payload.activityId = $ActivityId
  if (-not ($payload.ContainsKey("metadata"))) {
    $payload.metadata = [pscustomobject]@{}
  }
  $meta = ConvertTo-AssistantDictionary -Value $payload.metadata
  $meta.activityId = $ActivityId
  $payload.metadata = [pscustomobject]$meta
  $payload.updatedAt = Get-AssistantNowIso
  $normalized = Normalize-AssistantDraftRecord -Draft ([pscustomobject]$payload)

  $records = @(Get-AssistantStoreDraftsArray -Store $Store)
  for ($i = 0; $i -lt $records.Count; $i += 1) {
    if ([string]$records[$i].id -eq $DraftId) {
      $records[$i] = $normalized
      $Store.drafts = $records
      Save-AssistantStore -Store $Store
      return $normalized
    }
  }

  return $null
}

function Invoke-AssistantCreateDraftFromContext {
  param(
    [object]$Context,
    [bool]$AttemptProviderExport = $false,
    [string]$ProviderKind = "",
    [string]$MailboxProfileId = "",
    [string]$MailboxFolder = "",
    [bool]$Force = $false
  )

  $store = Get-AssistantStore
  $sourceEmailExternalId = [string]$Context.sourceEmailExternalId
  if ([string]::IsNullOrWhiteSpace($sourceEmailExternalId)) {
    $sourceEmailExternalId = [string]$Context.externalId
  }

  $existing = Get-AssistantStoreDraftBySourceEmailExternalId -Store $store -SourceEmailExternalId $sourceEmailExternalId
  if ($existing -and -not $Force) {
    $existingMetadata = ConvertTo-AssistantDictionary -Value $existing.metadata
    $existingStatus = [string]$existing.status
    $existingProviderOk = $false
    if ($existingMetadata.ContainsKey("providerOk")) {
      $existingProviderOk = [bool]$existingMetadata.providerOk
    }
    if ($AttemptProviderExport -and $existingStatus -eq "draft_pending_review" -and -not $existingProviderOk) {
      $exported = Invoke-AssistantExportDraftToProvider -Store $store -Draft $existing -ProviderKind $ProviderKind -MailboxProfileId $MailboxProfileId -MailboxFolder $MailboxFolder -FailIfUnsupported:$true
      return [pscustomobject]@{
        ok = [bool]$exported.ok
        duplicate = $true
        draft = $exported.draft
        provider = $exported.provider
        fallbackMode = [string]$exported.fallbackMode
      }
    }

    return [pscustomobject]@{
      ok = $true
      duplicate = $true
      draft = $existing
      provider = $null
      fallbackMode = "existing"
    }
  }

  $message = if ($Context.message) { $Context.message } else { $Context }
  $classification = if ($Context.classification) { $Context.classification } else { [pscustomobject]@{} }
  $customerMatch = if ($Context.customerMatch) { $Context.customerMatch } else { [pscustomobject]@{ found = $false } }
  $summary = [string]$Context.summary
  $draftReply = [string]$Context.draftReply
  $taskId = if (-not [string]::IsNullOrWhiteSpace([string]$Context.taskId)) { [string]$Context.taskId } else { "" }
  $operationId = if (-not [string]::IsNullOrWhiteSpace([string]$Context.operationId)) { [string]$Context.operationId } else { "" }
  $operationReference = if (-not [string]::IsNullOrWhiteSpace([string]$Context.operationReference)) { [string]$Context.operationReference } else { "" }
  $recipients = Get-AssistantDraftRecipients -Message $message -CustomerMatch $customerMatch
  $referenceForSubject = if (-not [string]::IsNullOrWhiteSpace($operationReference)) { $operationReference } elseif (-not [string]::IsNullOrWhiteSpace($operationId)) { $operationId } else { "" }
  $subject = Get-AssistantDraftSubject -Message $message -Reference $referenceForSubject

  $baseDraft = [pscustomobject]@{
    id = if ($existing) { [string]$existing.id } else { New-AssistantRecordId -Prefix "drf" }
    sourceEmailExternalId = $sourceEmailExternalId
    sourceIntakeId = [string]$Context.sourceIntakeId
    customerId = if ($customerMatch -and $customerMatch.found) { [string]$customerMatch.customerId } else { [string]$Context.customerId }
    operationId = $operationId
    taskId = $taskId
    activityId = ""
    to = $recipients.to
    cc = $recipients.cc
    subject = $subject
    summary = $summary
    bodyDraft = $draftReply
    status = "draft_pending_review"
    createdAt = if ($existing -and $existing.createdAt) { [string]$existing.createdAt } else { Get-AssistantNowIso }
    updatedAt = Get-AssistantNowIso
    reviewedAt = if ($existing -and $existing.reviewedAt) { [string]$existing.reviewedAt } else { $null }
    metadata = [pscustomobject]@{
      assistantVersion = 1
      sourceKind = [string]$Context.sourceKind
      providerKind = [string]$Context.providerKind
      mailboxProfileId = [string]$MailboxProfileId
      mailboxFolder = [string]$MailboxFolder
      sourceIntakeId = [string]$Context.sourceIntakeId
      sourceEmailExternalId = $sourceEmailExternalId
      customerMatch = $customerMatch
      classification = $classification
      taskId = $taskId
      operationId = $operationId
      operationReference = $operationReference
      summary = $summary
      draftReply = $draftReply
      providerCapability = (Get-AssistantDraftProviderCapability -ProviderKind $ProviderKind -MailboxProfileId $MailboxProfileId)
      exportAttempted = [bool]$AttemptProviderExport
      exportMode = "local"
      providerOk = $false
      fallbackMode = "local"
      providerError = ""
    }
  }

  $draft = Normalize-AssistantDraftRecord -Draft $baseDraft
  $draft = Save-AssistantDraftRecord -Store $store -Record $draft
  $provider = $null
  if ($AttemptProviderExport) {
    $exported = Invoke-AssistantExportDraftToProvider -Store $store -Draft $draft -ProviderKind $ProviderKind -MailboxProfileId $MailboxProfileId -MailboxFolder $MailboxFolder -FailIfUnsupported:$true
    $provider = $exported.provider
    $draft = $exported.draft
  }

  $stored = Save-AssistantDraftRecord -Store $store -Record $draft
  return [pscustomobject]@{
    ok = $true
    duplicate = [bool]$existing
    fallbackMode = if ($AttemptProviderExport) { if ($provider -and $provider.ok -and $provider.exported) { "provider" } else { "local" } } else { "local" }
    provider = $provider
    draft = $stored
  }
}

function Get-AssistantDraftContextFromIntakeRecord {
  param([object]$IntakeRecord)

  if (-not $IntakeRecord) {
    return $null
  }

  $taskId = ""
  if ($IntakeRecord.execution -and $IntakeRecord.execution.task -and $IntakeRecord.execution.task.ok -and $IntakeRecord.execution.task.data -and $IntakeRecord.execution.task.data.id) {
    $taskId = [string]$IntakeRecord.execution.task.data.id
  } elseif ($IntakeRecord.planned -and $IntakeRecord.planned.task -and $IntakeRecord.planned.task.payload -and $IntakeRecord.planned.task.payload.id) {
    $taskId = [string]$IntakeRecord.planned.task.payload.id
  }

  $operationId = ""
  $operationReference = ""
  if ($IntakeRecord.execution -and $IntakeRecord.execution.operation -and $IntakeRecord.execution.operation.ok -and $IntakeRecord.execution.operation.data -and $IntakeRecord.execution.operation.data.id) {
    $operationId = [string]$IntakeRecord.execution.operation.data.id
    $operationReference = if (-not [string]::IsNullOrWhiteSpace([string]$IntakeRecord.execution.operation.data.referencia)) { [string]$IntakeRecord.execution.operation.data.referencia } else { "" }
  } elseif ($IntakeRecord.planned -and $IntakeRecord.planned.operation -and $IntakeRecord.planned.operation.payload -and $IntakeRecord.planned.operation.payload.id) {
    $operationId = [string]$IntakeRecord.planned.operation.payload.id
    $operationReference = if (-not [string]::IsNullOrWhiteSpace([string]$IntakeRecord.planned.operation.payload.referencia)) { [string]$IntakeRecord.planned.operation.payload.referencia } else { "" }
  }

  return [pscustomobject]@{
    sourceEmailExternalId = [string]$IntakeRecord.externalId
    sourceIntakeId = [string]$IntakeRecord.id
    sourceKind = [string]$IntakeRecord.sourceKind
    providerKind = [string]$IntakeRecord.providerKind
    mailboxProfileId = [string]$IntakeRecord.mailboxProfileId
    mailboxFolder = [string]$IntakeRecord.mailboxFolder
    externalId = [string]$IntakeRecord.externalId
    message = [pscustomobject]@{
      externalId = [string]$IntakeRecord.externalId
      from = if ($IntakeRecord.from -and $IntakeRecord.from.raw) { [string]$IntakeRecord.from.raw } else { "" }
      subject = [string]$IntakeRecord.subject
      date = [string]$IntakeRecord.date
      bodyText = if (-not [string]::IsNullOrWhiteSpace([string]$IntakeRecord.bodyNormalized)) { [string]$IntakeRecord.bodyNormalized } else { [string]$IntakeRecord.summary }
    }
    customerId = [string]$IntakeRecord.customerId
    customerMatch = $IntakeRecord.customerMatch
    classification = $IntakeRecord.classification
    summary = [string]$IntakeRecord.summary
    draftReply = [string]$IntakeRecord.draftReply
    taskId = $taskId
    operationId = $operationId
    operationReference = $operationReference
  }
}

function Invoke-AssistantCreateDraftFromIntakeRecord {
  param(
    [object]$IntakeRecord,
    [bool]$AttemptProviderExport = $false,
    [string]$ProviderKind = "",
    [string]$MailboxProfileId = "",
    [string]$MailboxFolder = "",
    [bool]$Force = $false
  )

  $context = Get-AssistantDraftContextFromIntakeRecord -IntakeRecord $IntakeRecord
  if (-not $context) {
    return [pscustomobject]@{
      ok = $false
      duplicate = $false
      reason = "No fue posible construir el contexto del borrador."
      draft = $null
      provider = $null
      fallbackMode = "local"
    }
  }

  return Invoke-AssistantCreateDraftFromContext -Context $context -AttemptProviderExport:$AttemptProviderExport -ProviderKind $ProviderKind -MailboxProfileId $MailboxProfileId -MailboxFolder $MailboxFolder -Force:$Force
}

function Get-AssistantTaskPlan {
  param(
    [object]$Message,
    [object]$CustomerMatch,
    [object]$Classification,
    [object]$ExistingOperation = $null
  )

  if (-not $Classification.requiresTask -or -not $CustomerMatch.found) {
    return [pscustomobject]@{
      action = "skip"
      canWrite = $false
      reason = if (-not $Classification.requiresTask) { "no requiere tarea" } else { "no se identifico cliente" }
      payload = $null
      existing = $null
    }
  }

  $subject = if (-not [string]::IsNullOrWhiteSpace([string]$Message.subject)) { [string]$Message.subject } else { "Seguimiento asistente operativo" }
  $reference = if ($Message.operationHint -and -not [string]::IsNullOrWhiteSpace([string]$Message.operationHint.referencia)) { [string]$Message.operationHint.referencia } elseif ($ExistingOperation -and -not [string]::IsNullOrWhiteSpace([string]$ExistingOperation.referencia)) { [string]$ExistingOperation.referencia } else { "" }
  $operationId = if ($ExistingOperation) { [string]$ExistingOperation.id } elseif ($Message.operationHint -and -not [string]::IsNullOrWhiteSpace([string]$Message.operationHint.operationId)) { [string]$Message.operationHint.operationId } else { "" }
  $existingTasks = @(Get-AssistantApiV1Items -EntityKind "task" -Query @{ customerId = $CustomerMatch.customerId; operationId = $operationId; limit = 250 })
  $normalizedTitle = ConvertTo-AssistantNormalizedText -Text $subject
  if (-not [string]::IsNullOrWhiteSpace($reference)) {
    $normalizedTitle = "$normalizedTitle $((ConvertTo-AssistantNormalizedText -Text $reference))"
  }

  $existingTask = $existingTasks | Where-Object {
    $candidate = ConvertTo-AssistantNormalizedText -Text ([string]$_.tarea)
    if ([string]::IsNullOrWhiteSpace($candidate)) {
      return $false
    }
    if (-not [string]::IsNullOrWhiteSpace($reference) -and $candidate.Contains((ConvertTo-AssistantNormalizedText -Text $reference))) {
      return $true
    }
    return $candidate.Contains($normalizedTitle) -or $normalizedTitle.Contains($candidate)
  } | Select-Object -First 1

  $dueDate = if ($Message.taskHint -and -not [string]::IsNullOrWhiteSpace([string]$Message.taskHint.fechaCompromiso)) {
    [string]$Message.taskHint.fechaCompromiso
  } else {
    (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd")
  }
  $reminder = if ($Message.taskHint -and -not [string]::IsNullOrWhiteSpace([string]$Message.taskHint.recordatorio)) {
    [string]$Message.taskHint.recordatorio
  } elseif ($Classification.priority -eq "Alta") {
    (Get-Date).ToUniversalTime().AddHours(4).ToString("o")
  } else {
    ""
  }
  $status = if ($Message.taskHint -and -not [string]::IsNullOrWhiteSpace([string]$Message.taskHint.estado)) {
    [string]$Message.taskHint.estado
  } elseif ($Classification.priority -eq "Alta") {
    "En curso"
  } else {
    "Pendiente"
  }
  $priority = if ($Message.taskHint -and -not [string]::IsNullOrWhiteSpace([string]$Message.taskHint.prioridad)) {
    [string]$Message.taskHint.prioridad
  } else {
    $Classification.priority
  }
  $taskText = if ($Message.taskHint -and -not [string]::IsNullOrWhiteSpace([string]$Message.taskHint.tarea)) {
    [string]$Message.taskHint.tarea
  } elseif (-not [string]::IsNullOrWhiteSpace($Message.subject)) {
    "Seguimiento: $($Message.subject)"
  } else {
    "Seguimiento asistente operativo"
  }
  $notes = Get-AssistantSummary -Message $Message -CustomerMatch $CustomerMatch -Classification $Classification

  $payload = [pscustomobject]@{
    id = ""
    customerId = $CustomerMatch.customerId
    cliente = $CustomerMatch.customer.empresa
    operationId = $operationId
    tarea = $taskText
    prioridad = $priority
    fechaCompromiso = $dueDate
    recordatorio = $reminder
    estado = $status
    observaciones = $notes
  }

  if ($existingTask) {
    $payload.id = [string]$existingTask.id
    return [pscustomobject]@{
      action = "update"
      canWrite = $true
      reason = "tarea existente detectada"
      payload = $payload
      existing = $existingTask
    }
  }

  return [pscustomobject]@{
    action = "create"
    canWrite = $true
    reason = "tarea sugerida por clasificacion"
    payload = $payload
    existing = $null
  }
}

function Get-AssistantOperationPlan {
  param(
    [object]$Message,
    [object]$CustomerMatch,
    [object]$Classification
  )

  if (-not $Classification.requiresOperation -or -not $CustomerMatch.found) {
    return [pscustomobject]@{
      action = "skip"
      canWrite = $false
      reason = if (-not $Classification.requiresOperation) { "no requiere operacion" } else { "no se identifico cliente" }
      payload = $null
      existing = $null
      warnings = @()
      reconciliation = [pscustomobject]@{
        matched = $false
        provisional = $false
        score = 0
        reasons = @()
        changes = @()
      }
    }
  }

  $hint = ConvertTo-AssistantDictionary -Value $Message.operationHint
  $normalizedText = ConvertTo-AssistantNormalizedText -Text "$([string]$Message.subject) $([string]$Message.bodyNormalized)"
  $workflow = Get-AssistantParaguayWorkflowProfile -Subject $Message.subject -BodyText $Message.bodyText -BodyNormalized $Message.bodyNormalized
  $matchThreshold = if ($CustomerMatch.found) { 50 } else { 55 }
  $booking = if ($hint.ContainsKey("booking") -and -not [string]::IsNullOrWhiteSpace([string]$hint.booking)) { [string]$hint.booking } else { "" }
  $reference = if ($hint.ContainsKey("referencia") -and -not [string]::IsNullOrWhiteSpace([string]$hint.referencia)) { [string]$hint.referencia } elseif (-not [string]::IsNullOrWhiteSpace([string]$booking)) { [string]$booking } elseif (-not [string]::IsNullOrWhiteSpace([string]$Message.subject)) { ([string]$Message.subject).Substring(0, [Math]::Min(32, ([string]$Message.subject).Length)).Trim() } else { "" }
  $contenedor = if ($hint.ContainsKey("contenedor") -and -not [string]::IsNullOrWhiteSpace([string]$hint.contenedor)) { [string]$hint.contenedor } else { "" }
  $origen = if ($hint.ContainsKey("origen") -and -not [string]::IsNullOrWhiteSpace([string]$hint.origen)) { [string]$hint.origen } else { "" }
  $destino = if ($hint.ContainsKey("destino") -and -not [string]::IsNullOrWhiteSpace([string]$hint.destino)) { [string]$hint.destino } else { "" }
  $routeKey = if ($hint.ContainsKey("routeKey") -and -not [string]::IsNullOrWhiteSpace([string]$hint.routeKey)) { [string]$hint.routeKey } elseif (-not [string]::IsNullOrWhiteSpace($origen) -and -not [string]::IsNullOrWhiteSpace($destino)) { "{0}|{1}" -f $origen, $destino } else { "" }
  $tipoOperacion = if (-not [string]::IsNullOrWhiteSpace([string]$hint.tipoOperacion)) {
    [string]$hint.tipoOperacion
  } elseif (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("exportacion", "salida", "embarque", "paraguay")) {
    "Exportacion"
  } elseif (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("importacion", "ingreso", "arribo")) {
    "Importacion"
  } else {
    "Transito"
  }
  if ($tipoOperacion -notin @("Importacion", "Exportacion", "Nacional", "Transito")) {
    $tipoOperacion = "Transito"
  }

  $existingOperations = @(Get-AssistantApiV1Items -EntityKind "operation" -Query @{ customerId = $CustomerMatch.customerId; q = "$booking $reference $contenedor $origen $destino"; limit = 250 })
  if (-not $existingOperations.Count) {
    $existingOperations = @(Get-AssistantApiV1Items -EntityKind "operation" -Query @{ customerId = $CustomerMatch.customerId; limit = 250 })
  }

  $bestOperation = $null
  $bestScore = -1
  $bestReasons = New-Object System.Collections.Generic.List[string]
  foreach ($candidate in $existingOperations) {
    if (-not $candidate) {
      continue
    }
    if ($candidate.archivedAt -and -not [string]::IsNullOrWhiteSpace([string]$candidate.archivedAt)) {
      continue
    }

    $candidateReference = ConvertTo-AssistantNormalizedText -Text ([string]$candidate.referencia)
    $candidateContainer = ConvertTo-AssistantNormalizedText -Text ([string]$candidate.contenedor)
    $candidateObservations = ConvertTo-AssistantNormalizedText -Text ([string]$candidate.observaciones)
    $candidateOrigin = ConvertTo-AssistantNormalizedText -Text ([string]$candidate.origen)
    $candidateDestination = ConvertTo-AssistantNormalizedText -Text ([string]$candidate.destino)
    $candidateRouteKey = ""
    if (-not [string]::IsNullOrWhiteSpace($candidateOrigin) -and -not [string]::IsNullOrWhiteSpace($candidateDestination)) {
      $candidateRouteKey = "{0}|{1}" -f $candidateOrigin, $candidateDestination
    }
    $candidateChecklist = ConvertTo-AssistantDictionary -Value $candidate.documentChecklist
    $candidateProvisional = Test-AssistantOperationProvisional -Operation $candidate
    $candidateHasRoute = -not [string]::IsNullOrWhiteSpace($candidateRouteKey)

    $score = 0
    $reasons = New-Object System.Collections.Generic.List[string]

    $needleBooking = ConvertTo-AssistantNormalizedText -Text $booking
    $needleReference = ConvertTo-AssistantNormalizedText -Text $reference
    $needleContainer = ConvertTo-AssistantNormalizedText -Text $contenedor
    $needleRouteKey = ConvertTo-AssistantNormalizedText -Text $routeKey

    if (-not [string]::IsNullOrWhiteSpace($needleBooking)) {
      if ($candidateReference -eq $needleBooking -or $candidateReference.Contains($needleBooking) -or $candidateObservations.Contains($needleBooking)) {
        $score += 120
        $reasons.Add("booking coincide") | Out-Null
      }
    }

    if (-not [string]::IsNullOrWhiteSpace($needleReference)) {
      if ($candidateReference -eq $needleReference -or $candidateReference.Contains($needleReference) -or $candidateObservations.Contains($needleReference)) {
        $score += 85
        $reasons.Add("referencia coincide") | Out-Null
      }
    }

    if (-not [string]::IsNullOrWhiteSpace($needleContainer)) {
      if ($candidateContainer -eq $needleContainer) {
        $score += 120
        $reasons.Add("contenedor coincide") | Out-Null
      } elseif ($candidateProvisional -and (Test-AssistantOperationPlaceholderText -Value $candidateContainer)) {
        $score += 45
        $reasons.Add("contenedor provisional disponible") | Out-Null
      }
    }

    if (-not [string]::IsNullOrWhiteSpace($needleRouteKey) -and -not [string]::IsNullOrWhiteSpace($candidateRouteKey) -and $candidateRouteKey -eq $needleRouteKey) {
      $score += 35
      $reasons.Add("ruta coincide") | Out-Null
    } elseif ($candidateProvisional -and -not [string]::IsNullOrWhiteSpace($needleRouteKey) -and -not [string]::IsNullOrWhiteSpace($candidateRouteKey)) {
      $score += 18
      $reasons.Add("ruta provisional compatible") | Out-Null
    } elseif ($candidateProvisional -and $candidateHasRoute -and -not [string]::IsNullOrWhiteSpace($needleBooking) -and -not [string]::IsNullOrWhiteSpace($needleContainer)) {
      $score += 16
      $reasons.Add("ruta provisional compatible por booking y contenedor") | Out-Null
    } elseif ($candidateProvisional -and $candidateHasRoute -and (-not [string]::IsNullOrWhiteSpace($booking) -or -not [string]::IsNullOrWhiteSpace($contenedor)) -and ($normalizedText -match '\bparaguay\b' -or $normalizedText -match '\bmurchison\b' -or $normalizedText -match '\bclorinda\b' -or $normalizedText -match '\bpy\d{5,10}\b' -or $normalizedText -match '\bbogg\d+\b' -or $normalizedText -match '\bfalcon\b')) {
      $score += 14
      $reasons.Add("ruta paraguay compatible") | Out-Null
    }

    $score += Get-AssistantOperationTemporalScore -Operation $candidate -Message $Message
    if ($candidateProvisional) {
      $score += 12
      $reasons.Add("operacion provisional") | Out-Null
    }

    foreach ($rule in @(
      @{ keyword = "arribo"; field = "avisoArribo" },
      @{ keyword = "camion"; field = "previsionCamion" },
      @{ keyword = "dua"; field = "dua" },
      @{ keyword = "ncm"; field = "ncm" },
      @{ keyword = "seguro"; field = "valorSeguro" },
      @{ keyword = "mic"; field = "micDefinitivo" },
      @{ keyword = "crt"; field = "crtDefinitivo" }
    )) {
      if ($normalizedText.Contains([string]$rule.keyword) -and $candidateChecklist.ContainsKey([string]$rule.field) -and [bool]$candidateChecklist[[string]$rule.field]) {
        $score += 3
      }
    }

    if ($score -gt $bestScore) {
      $bestScore = $score
      $bestOperation = $candidate
      $bestReasons = $reasons
    }
  }

  $documentChecklist = if ($hint.documentChecklist -and $hint.documentChecklist.Count -gt 0) {
    ConvertTo-AssistantDictionary -Value $hint.documentChecklist
  } else {
    @{}
  }

  $defaultChecklist = [ordered]@{
    avisoArribo = $false
    previsionCamion = $false
    facturaCRT = $false
    borradorCRT = $false
    controlDespachantePY = $false
    ncm = $false
    valorSeguro = $false
    dua = $false
    micDefinitivo = $false
    crtDefinitivo = $false
    entregaDocumentalDespachanteUY = $false
  }

  foreach ($key in @($defaultChecklist.Keys)) {
    if ($documentChecklist.ContainsKey($key)) {
      $defaultChecklist[$key] = [bool]$documentChecklist[$key]
    }
  }

  if (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("arribo", "llegada")) { $defaultChecklist.avisoArribo = $true }
  if (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("camion", "camion pendiente", "prevision", "camion a coordinar")) { $defaultChecklist.previsionCamion = $true }
  if (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("factura crt")) { $defaultChecklist.facturaCRT = $true }
  if (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("borrador crt")) { $defaultChecklist.borradorCRT = $true }
  if (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("despachante py", "control py")) { $defaultChecklist.controlDespachantePY = $true }
  if (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("ncm")) { $defaultChecklist.ncm = $true }
  if (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("seguro", "valor seguro")) { $defaultChecklist.valorSeguro = $true }
  if (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("dua")) { $defaultChecklist.dua = $true }
  if (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("mic definitivo", "mic")) { $defaultChecklist.micDefinitivo = $true }
  if (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("crt definitivo", "crt final")) { $defaultChecklist.crtDefinitivo = $true }
  if (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("despachante uy", "entrega documental")) { $defaultChecklist.entregaDocumentalDespachanteUY = $true }

  if ($bestOperation -and $bestOperation.documentChecklist) {
    $existingChecklist = ConvertTo-AssistantDictionary -Value $bestOperation.documentChecklist
    foreach ($key in @($defaultChecklist.Keys)) {
      if ($existingChecklist.ContainsKey($key) -and [bool]$existingChecklist[$key]) {
        $defaultChecklist[$key] = $true
      }
    }
  }

  $detectedState = if (-not [string]::IsNullOrWhiteSpace([string]$hint.estadoOperacion)) {
    [string]$hint.estadoOperacion
  } elseif (-not [string]::IsNullOrWhiteSpace([string]$workflow.operationState)) {
    [string]$workflow.operationState
  } elseif (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("dua", "ncm", "seguro")) {
    "Esperando NCM/seguro"
  } elseif (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("arribo")) {
    "Arribo detectado"
  } elseif (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("camion")) {
    "Camion pendiente"
  } elseif (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("devolucion")) {
    "Devolucion pendiente"
  } else {
    "Documentacion preliminar"
  }

  if ($detectedState -notin @(
      "Arribo detectado",
      "Camion pendiente",
      "Documentacion preliminar",
      "Esperando NCM/seguro",
      "DUA recibido",
      "Documentacion definitiva lista",
      "En transito",
      "Devolucion pendiente",
      "Cerrado",
      "En riesgo"
    )) {
    $detectedState = "Documentacion preliminar"
  }

  $detectedRisk = if (-not [string]::IsNullOrWhiteSpace([string]$hint.riesgo)) {
    [string]$hint.riesgo
  } elseif (-not [string]::IsNullOrWhiteSpace([string]$workflow.risk)) {
    [string]$workflow.risk
  } elseif (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("vencid", "demora", "urgente", "falta", "sin camion", "sin ncm", "sin dua", "riesgo")) {
    "Alto"
  } elseif (Test-AssistantKeywordAny -Text $normalizedText -Keywords @("pendiente", "coordinar", "revisar")) {
    "Medio"
  } else {
    "Bajo"
  }

  $existingOperation = $bestOperation
  $existingProvisional = [bool]($existingOperation -and (Test-AssistantOperationProvisional -Operation $existingOperation))
  $matchedOperationId = ""
  $existingOperationId = Get-AssistantObjectStringValue -Value $existingOperation -Name "id"
  $bestOperationId = Get-AssistantObjectStringValue -Value $bestOperation -Name "id"
  if (-not [string]::IsNullOrWhiteSpace($existingOperationId)) {
    $matchedOperationId = $existingOperationId
  } elseif (-not [string]::IsNullOrWhiteSpace($bestOperationId)) {
    $matchedOperationId = $bestOperationId
  }
  $existingState = if ($existingOperation) { [string]$existingOperation.estadoOperacion } else { "" }
  $existingRisk = if ($existingOperation) { [string]$existingOperation.riesgo } else { "" }
  $existingStateRank = Get-AssistantOperationStateRank -State $existingState
  $newStateRank = Get-AssistantOperationStateRank -State $detectedState
  $stateToUse = if ($existingOperation -and $existingStateRank -ge $newStateRank) { $existingState } else { $detectedState }
  $riskToUse = if ($existingOperation -and (Get-AssistantRiskRank -Risk $existingRisk) -ge (Get-AssistantRiskRank -Risk $detectedRisk)) { $existingRisk } else { $detectedRisk }
  if ([string]::IsNullOrWhiteSpace([string]$stateToUse)) {
    $stateToUse = "Documentacion preliminar"
  }
  if ([string]::IsNullOrWhiteSpace([string]$riskToUse)) {
    $riskToUse = "Bajo"
  }

  $referenceToUse = if (-not [string]::IsNullOrWhiteSpace($booking) -and (-not $existingOperation -or $existingProvisional -or [string]::IsNullOrWhiteSpace([string]$existingOperation.referencia))) {
    $booking
  } elseif (-not [string]::IsNullOrWhiteSpace($reference)) {
    if (-not $existingOperation -or $existingProvisional -or [string]::IsNullOrWhiteSpace([string]$existingOperation.referencia)) {
      $reference
    } else {
      [string]$existingOperation.referencia
    }
  } elseif ($existingOperation) {
    [string]$existingOperation.referencia
  } else {
    $reference
  }

  $containerToUse = if (-not [string]::IsNullOrWhiteSpace($contenedor) -and (-not $existingOperation -or $existingProvisional -or (Test-AssistantOperationPlaceholderText -Value ([string]$existingOperation.contenedor)))) {
    $contenedor
  } elseif ($existingOperation) {
    [string]$existingOperation.contenedor
  } else {
    $contenedor
  }

  $originToUse = if (-not [string]::IsNullOrWhiteSpace($origen) -and (-not $existingOperation -or $existingProvisional -or [string]::IsNullOrWhiteSpace([string]$existingOperation.origen))) {
    $origen
  } elseif ($existingOperation -and -not [string]::IsNullOrWhiteSpace([string]$existingOperation.origen)) {
    [string]$existingOperation.origen
  } else {
    ""
  }

  $destinationToUse = if (-not [string]::IsNullOrWhiteSpace($destino) -and (-not $existingOperation -or $existingProvisional -or [string]::IsNullOrWhiteSpace([string]$existingOperation.destino))) {
    $destino
  } elseif ($existingOperation -and -not [string]::IsNullOrWhiteSpace([string]$existingOperation.destino)) {
    [string]$existingOperation.destino
  } else {
    ""
  }

  $baseObservaciones = if ($existingOperation -and -not [string]::IsNullOrWhiteSpace([string]$existingOperation.observaciones)) {
    [string]$existingOperation.observaciones
  } elseif (-not [string]::IsNullOrWhiteSpace([string]$hint.observaciones)) {
    [string]$hint.observaciones
  } else {
    Get-AssistantSummary -Message $Message -CustomerMatch $CustomerMatch -Classification (Get-AssistantClassification -Message $Message -CustomerMatch $CustomerMatch)
  }

  $reconciliationNotes = New-Object System.Collections.Generic.List[string]
  if ($existingOperation) {
    if ($existingProvisional -and -not [string]::IsNullOrWhiteSpace($booking)) {
      $reconciliationNotes.Add("referencia provisional reemplazada por booking $booking") | Out-Null
    }
    if ($existingProvisional -and -not [string]::IsNullOrWhiteSpace($contenedor) -and (Test-AssistantOperationPlaceholderText -Value ([string]$existingOperation.contenedor))) {
      $reconciliationNotes.Add("contenedor reemplazado: $([string]$existingOperation.contenedor) -> $contenedor") | Out-Null
    }
    if ($existingProvisional -and -not [string]::IsNullOrWhiteSpace($originToUse) -and [string]$existingOperation.origen -ne $originToUse) {
      $reconciliationNotes.Add("origen completado: $([string]$existingOperation.origen) -> $originToUse") | Out-Null
    }
    if ($existingProvisional -and -not [string]::IsNullOrWhiteSpace($destinationToUse) -and [string]$existingOperation.destino -ne $destinationToUse) {
      $reconciliationNotes.Add("destino completado: $([string]$existingOperation.destino) -> $destinationToUse") | Out-Null
    }
    if (-not [string]::IsNullOrWhiteSpace($stateToUse) -and [string]$existingState -ne $stateToUse -and (Get-AssistantOperationStateRank -State $stateToUse) -ge (Get-AssistantOperationStateRank -State $existingState)) {
      $reconciliationNotes.Add("estado actualizado: $existingState -> $stateToUse") | Out-Null
    }
    if (-not [string]::IsNullOrWhiteSpace($riskToUse) -and [string]$existingRisk -ne $riskToUse -and (Get-AssistantRiskRank -Risk $riskToUse) -ge (Get-AssistantRiskRank -Risk $existingRisk)) {
      $reconciliationNotes.Add("riesgo actualizado: $existingRisk -> $riskToUse") | Out-Null
    }
    $checklistChanges = New-Object System.Collections.Generic.List[string]
    foreach ($key in @($defaultChecklist.Keys)) {
      $before = $false
      if ($existingOperation.documentChecklist) {
        $existingChecklist = ConvertTo-AssistantDictionary -Value $existingOperation.documentChecklist
        if ($existingChecklist.ContainsKey($key)) {
          $before = [bool]$existingChecklist[$key]
        }
      }
      $after = [bool]$defaultChecklist[$key]
      if (-not $before -and $after) {
        $checklistChanges.Add($key) | Out-Null
      }
    }
    if ($checklistChanges.Count) {
      $reconciliationNotes.Add("checklist completado: $($checklistChanges -join ', ')") | Out-Null
    }
  } elseif (-not [string]::IsNullOrWhiteSpace($booking)) {
    $reconciliationNotes.Add("booking detectado: $booking") | Out-Null
  }

  $payload = [pscustomobject]@{
    id = $matchedOperationId
    customerId = $CustomerMatch.customerId
    clientId = $CustomerMatch.customerId
    tipoOperacion = $tipoOperacion
    referencia = $referenceToUse
    contenedor = $containerToUse
    origen = $originToUse
    destino = $destinationToUse
    fechaArribo = if (-not [string]::IsNullOrWhiteSpace([string]$hint.fechaArribo)) { [string]$hint.fechaArribo } elseif ($existingOperation) { [string]$existingOperation.fechaArribo } else { "" }
    fechaCarga = if (-not [string]::IsNullOrWhiteSpace([string]$hint.fechaCarga)) { [string]$hint.fechaCarga } elseif ($existingOperation) { [string]$existingOperation.fechaCarga } else { "" }
    fechaDevolucion = if (-not [string]::IsNullOrWhiteSpace([string]$hint.fechaDevolucion)) { [string]$hint.fechaDevolucion } elseif ($existingOperation) { [string]$existingOperation.fechaDevolucion } else { "" }
    poloLogistico = if (-not [string]::IsNullOrWhiteSpace([string]$hint.poloLogistico)) { [string]$hint.poloLogistico } elseif ($existingOperation) { [string]$existingOperation.poloLogistico } else { "" }
    despachanteUY = if (-not [string]::IsNullOrWhiteSpace([string]$hint.despachanteUY)) { [string]$hint.despachanteUY } elseif ($existingOperation) { [string]$existingOperation.despachanteUY } else { "" }
    despachantePY = if (-not [string]::IsNullOrWhiteSpace([string]$hint.despachantePY)) { [string]$hint.despachantePY } elseif ($existingOperation) { [string]$existingOperation.despachantePY } else { "" }
    estadoOperacion = $stateToUse
    riesgo = $riskToUse
    observaciones = if (-not [string]::IsNullOrWhiteSpace($baseObservaciones)) { $baseObservaciones } else { Get-AssistantSummary -Message $Message -CustomerMatch $CustomerMatch -Classification (Get-AssistantClassification -Message $Message -CustomerMatch $CustomerMatch) }
    documentChecklist = [pscustomobject]$defaultChecklist
  }

  $warnings = New-Object System.Collections.Generic.List[string]
  $allowProvisionalCreate = (-not $existingOperation) -and ($Classification.caseType -eq "caso de operacion Paraguay") -and (-not [string]::IsNullOrWhiteSpace([string]$payload.referencia)) -and (-not [string]::IsNullOrWhiteSpace([string]$payload.origen)) -and (-not [string]::IsNullOrWhiteSpace([string]$payload.destino))
  if (-not $existingOperation) {
    if ([string]::IsNullOrWhiteSpace([string]$payload.referencia)) {
      $warnings.Add("la operacion no puede escribirse automaticamente sin referencia") | Out-Null
    }
    if ([string]::IsNullOrWhiteSpace([string]$payload.contenedor) -and -not $allowProvisionalCreate) {
      $warnings.Add("la operacion no puede escribirse automaticamente sin contenedor") | Out-Null
    }
    if ([string]::IsNullOrWhiteSpace([string]$payload.origen) -or [string]::IsNullOrWhiteSpace([string]$payload.destino)) {
      $warnings.Add("la operacion no puede escribirse automaticamente sin origen y destino") | Out-Null
    }
  }

  $canWrite = if ($existingOperation) { $true } else { -not $warnings.Count }
  $shouldPromoteReconciliation = $existingOperation -and $existingProvisional -and $reconciliation.score -ge $matchThreshold
  $action = if (-not [string]::IsNullOrWhiteSpace($matchedOperationId)) { "update" } elseif ($shouldPromoteReconciliation) { "update" } elseif ($canWrite) { "create" } else { "review" }

  if ($reconciliationNotes.Count -and [string]::IsNullOrWhiteSpace([string]$payload.observaciones)) {
    $payload.observaciones = ($reconciliationNotes -join " | ")
  } elseif ($reconciliationNotes.Count) {
    $payload.observaciones = "{0} | Reconciliacion: {1}" -f [string]$payload.observaciones, ($reconciliationNotes -join "; ")
  }

  if ($bestScore -lt $matchThreshold -and -not $allowProvisionalCreate) {
    if (-not $existingOperation) {
      return [pscustomobject]@{
        action = "review"
        canWrite = $false
        reason = "faltan datos operativos suficientes"
        payload = $null
        existing = $null
        warnings = @("no se pudo asegurar una operacion unica")
        reconciliation = [pscustomobject]@{
          matched = $false
          provisional = $false
          score = $bestScore
          reasons = @($bestReasons)
          changes = @()
        }
      }
    }
  }

  $reconciliation = [pscustomobject]@{
    matched = [bool]$existingOperation
    provisional = [bool]$existingProvisional
    score = $bestScore
    reasons = @($bestReasons)
    changes = @($reconciliationNotes)
    operationId = [string]$matchedOperationId
    reference = [string]$payload.referencia
    contenedorAnterior = if ($existingOperation) { [string]$existingOperation.contenedor } else { "" }
    contenedorNuevo = [string]$payload.contenedor
    routeKey = [string]$routeKey
  }

  return [pscustomobject]@{
    action = $action
    canWrite = $canWrite
    reason = if ($existingOperation -and $reconciliation.changes.Count) { "operacion provisional reconciliada" } elseif ($existingOperation) { "operacion existente detectada" } elseif ($canWrite) { "operacion sugerida por clasificacion" } else { "faltan datos operativos obligatorios" }
    payload = $payload
    existing = $existingOperation
    warnings = @($warnings)
    reconciliation = $reconciliation
  }
}

function Resolve-AssistantOperationPlanId {
  param(
    [object]$OperationPlan,
    [object]$Message,
    [object]$CustomerMatch
  )

  if (-not $OperationPlan -or -not $OperationPlan.action -or $OperationPlan.action -ne "update") {
    return ""
  }

  if ($OperationPlan.payload -and -not [string]::IsNullOrWhiteSpace([string]$OperationPlan.payload.id)) {
    return [string]$OperationPlan.payload.id
  }

  $operationPlanId = Get-AssistantObjectStringValue -Value $OperationPlan.payload -Name "id"
  if (-not [string]::IsNullOrWhiteSpace($operationPlanId)) {
    return $operationPlanId
  }

  if (-not $CustomerMatch -or -not $CustomerMatch.found) {
    return ""
  }

  $needles = New-Object System.Collections.Generic.List[string]
  foreach ($value in @(
    $OperationPlan.payload.referencia,
    $OperationPlan.payload.contenedor,
    $OperationPlan.payload.origen,
    $OperationPlan.payload.destino
  )) {
    if (-not [string]::IsNullOrWhiteSpace([string]$value)) {
      $needles.Add([string]$value) | Out-Null
    }
  }
  if ($Message.operationHint) {
    foreach ($value in @(
      $Message.operationHint.booking,
      $Message.operationHint.referencia,
      $Message.operationHint.contenedor,
      $Message.operationHint.routeKey
    )) {
      if (-not [string]::IsNullOrWhiteSpace([string]$value)) {
        $needles.Add([string]$value) | Out-Null
      }
    }
  }

  $queryText = ($needles | Select-Object -Unique) -join " "
  $candidates = @(Get-AssistantApiV1Items -EntityKind "operation" -Query @{ customerId = $CustomerMatch.customerId; q = $queryText; limit = 250 })
  if (-not $candidates.Count) {
    $candidates = @(Get-AssistantApiV1Items -EntityKind "operation" -Query @{ customerId = $CustomerMatch.customerId; limit = 250 })
  }

  $bestCandidate = $candidates | Where-Object { $_ -and -not [string]::IsNullOrWhiteSpace([string]$_.id) } | Sort-Object `
    @{ Expression = { if (Test-AssistantOperationProvisional -Operation $_) { 1 } else { 0 } }; Descending = $true }, `
    @{ Expression = { [string]$_.updatedAt }; Descending = $true }, `
    @{ Expression = { [string]$_.createdAt }; Descending = $true } | Select-Object -First 1

  if ($bestCandidate) {
    return [string]$bestCandidate.id
  }

  return ""
}

function Get-AssistantActivityPayload {
  param(
    [object]$Message,
    [object]$CustomerMatch,
    [object]$Classification,
    [string]$Summary,
    [string]$DraftReply,
    [object]$TaskResult = $null,
    [object]$OperationResult = $null,
    [object]$DraftResult = $null,
    [object]$OperationPlan = $null
  )

  $taskBody = if ($TaskResult -and $TaskResult.body) { $TaskResult.body } else { $null }
  $operationBody = if ($OperationResult -and $OperationResult.body) { $OperationResult.body } else { $null }
  $draftBody = if ($DraftResult -and $DraftResult.draft) { $DraftResult.draft } elseif ($DraftResult -and $DraftResult.body -and $DraftResult.body.data) { $DraftResult.body.data } else { $null }

  $tone = switch ($Classification.priority) {
    "Alta" { "danger" }
    "Media" { "warning" }
    default { "info" }
  }

  $entityKind = ""
  $entityId = ""
  if ($operationBody -and $operationBody.ok -and $operationBody.data -and $operationBody.data.id) {
    $entityKind = "operation"
    $entityId = [string]$operationBody.data.id
  } elseif ($taskBody -and $taskBody.ok -and $taskBody.data -and $taskBody.data.id) {
    $entityKind = "task"
    $entityId = [string]$taskBody.data.id
  } elseif ($CustomerMatch.found) {
    $entityKind = "customer"
    $entityId = [string]$CustomerMatch.customerId
  }

  $details = New-Object System.Collections.Generic.List[string]
  $details.Add($Summary) | Out-Null
  if ($CustomerMatch -and $CustomerMatch.found) {
    $details.Add("Cliente: $([string]$CustomerMatch.label)") | Out-Null
    if (-not [string]::IsNullOrWhiteSpace([string]$CustomerMatch.reason)) {
      $details.Add("Match cliente: $([string]$CustomerMatch.reason)") | Out-Null
    }
  }
  $details.Add("Prioridad: $($Classification.priority)") | Out-Null
  if ($Classification.signals.Count) {
    $details.Add("Señales: $($Classification.signals -join ', ')") | Out-Null
  }
  if ($taskBody -and $taskBody.ok -and $taskBody.data -and $taskBody.data.id) {
    $details.Add("Tarea: $([string]$taskBody.data.id)") | Out-Null
  }
  if ($operationBody -and $operationBody.ok -and $operationBody.data -and $operationBody.data.id) {
    $details.Add("Operacion: $([string]$operationBody.data.id)") | Out-Null
  }
  if ($OperationPlan -and $OperationPlan.reconciliation -and $OperationPlan.reconciliation.changes -and @($OperationPlan.reconciliation.changes).Count) {
    $details.Add("Reconciliacion operativa: $(@($OperationPlan.reconciliation.changes) -join '; ')") | Out-Null
  }
  if ($draftBody -and $draftBody.id) {
    $details.Add("Borrador: $([string]$draftBody.id)") | Out-Null
    $details.Add("Estado borrador: $([string]$draftBody.status)") | Out-Null
  }

  return [pscustomobject]@{
    at = if (-not [string]::IsNullOrWhiteSpace([string]$Message.date)) { [string]$Message.date } else { Get-AssistantNowIso }
    type = "assistant.email.processed"
    label = "Asistente operativo"
    tone = $tone
    title = if (-not [string]::IsNullOrWhiteSpace([string]$Message.subject)) { [string]$Message.subject } else { $Classification.caseType }
    details = ($details -join " | ")
    customerId = if ($CustomerMatch.found) { [string]$CustomerMatch.customerId } else { "" }
    entityKind = $entityKind
    entityId = $entityId
    operationId = if ($operationBody -and $operationBody.ok -and $operationBody.data -and $operationBody.data.id) { [string]$operationBody.data.id } else { "" }
    draftId = if ($draftBody -and $draftBody.id) { [string]$draftBody.id } else { "" }
    draftStatus = if ($draftBody -and $draftBody.status) { [string]$draftBody.status } else { "" }
    source = "assistant"
    metadata = [pscustomobject]@{
      assistantVersion = 1
      sourceKind = [string]$Message.sourceKind
      providerKind = [string]$Message.providerKind
      mailboxProfileId = [string]$Message.mailboxProfileId
      mailboxFolder = [string]$Message.mailboxFolder
      externalId = [string]$Message.externalId
      dedupeKey = [string]$Message.dedupeKey
      classification = $Classification
      customerMatch = $CustomerMatch
      summary = $Summary
      draftReply = $DraftReply
      draftId = if ($draftBody -and $draftBody.id) { [string]$draftBody.id } else { "" }
      draftStatus = if ($draftBody -and $draftBody.status) { [string]$draftBody.status } else { "" }
      operationReconciliation = if ($OperationPlan -and $OperationPlan.reconciliation) { $OperationPlan.reconciliation } else { $null }
    }
  }
}

function Get-AssistantManifest {
  return [pscustomobject]@{
    ok = $true
    assistantVersion = 1
    backend = "local-first"
    sourceKinds = $script:AssistantSourceKinds
    executionModes = @("dry-run", "execute", "commit")
    supportedEntities = @("task", "activity", "operation", "draft")
    contract = [pscustomobject]@{
      normalizedMessage = @(
        "id",
        "externalId",
        "from",
        "subject",
        "date",
        "bodyNormalized",
        "customerId",
        "caseType",
        "priority",
        "requiresResponse",
        "requiresFollowUp",
        "requiresOperation",
        "requiresTask"
      )
      integrations = @("task", "activity", "operation", "draft")
      providerCompatibility = @("imap", "smtp", "corporate-provider-envelope")
    }
    routes = @(
      "/api/assistant/v1/health",
      "/api/assistant/v1/manifest",
      "/api/assistant/v1/intake",
      "/api/assistant/v1/intake/simulate",
      "/api/assistant/v1/intake/provider",
      "/api/assistant/v1/intake/mailbox",
      "/api/assistant/v1/drafts",
      "/api/assistant/v1/drafts/{id}",
      "/api/assistant/v1/drafts/{id}/exported",
      "/api/assistant/v1/drafts/{id}/failed",
      "/api/assistant/v1/intakes",
      "/api/assistant/v1/intakes/{id}"
    )
    storage = "backend-only"
    notes = @(
      "No autorrespuesta automatica.",
      "No se guardan credenciales en frontend.",
      "Activity es append-only y sirve como trazabilidad de correo.",
      "El rol del remitente y el workflow Paraguay se infieren por contexto del hilo y señales operativas.",
      "Los drafts se guardan local-first y no se envian automaticamente."
    )
  }
}

function Get-AssistantIntakeSummaryItem {
  param([object]$Record)

  return [pscustomobject]@{
    id = [string]$Record.id
    externalId = [string]$Record.externalId
    sourceKind = [string]$Record.sourceKind
    from = [string]$Record.from.raw
    subject = [string]$Record.subject
    date = [string]$Record.date
    customerId = [string]$Record.customerId
    caseType = [string]$Record.classification.caseType
    workflowCategory = if ($Record.classification -and ($Record.classification.PSObject.Properties.Name -contains "workflowCategory")) { [string]$Record.classification.workflowCategory } else { "" }
    workflowStage = if ($Record.classification -and ($Record.classification.PSObject.Properties.Name -contains "workflowStage")) { [string]$Record.classification.workflowStage } else { "" }
    actorRole = if ($Record.classification -and ($Record.classification.PSObject.Properties.Name -contains "actorRole")) { [string]$Record.classification.actorRole } else { "" }
    actorReason = if ($Record.classification -and ($Record.classification.PSObject.Properties.Name -contains "actorReason")) { [string]$Record.classification.actorReason } else { "" }
    priority = [string]$Record.classification.priority
    requiresResponse = [bool]$Record.classification.requiresResponse
    requiresFollowUp = [bool]$Record.classification.requiresFollowUp
    requiresOperation = [bool]$Record.classification.requiresOperation
    requiresTask = [bool]$Record.classification.requiresTask
    draftId = [string]$Record.draftId
    draftStatus = [string]$Record.draftStatus
    executionStatus = [string]$Record.execution.status
    executionMode = if ($Record.execution -and -not [string]::IsNullOrWhiteSpace([string]$Record.execution.mode)) { [string]$Record.execution.mode } else { "" }
    draftEligible = if ($Record.planned -and $Record.planned.draft) { [bool]$Record.planned.draft.eligible } else { $false }
    draftTrigger = if ($Record.planned -and $Record.planned.draft -and -not [string]::IsNullOrWhiteSpace([string]$Record.planned.draft.trigger)) { [string]$Record.planned.draft.trigger } else { "" }
    draftReason = if ($Record.planned -and $Record.planned.draft -and -not [string]::IsNullOrWhiteSpace([string]$Record.planned.draft.reason)) { [string]$Record.planned.draft.reason } else { "" }
    draftProviderOk = if ($Record.execution -and $Record.execution.draft -and $Record.execution.draft.provider -and ($Record.execution.draft.provider.PSObject.Properties.Name -contains "ok")) { [bool]$Record.execution.draft.provider.ok } else { $false }
    draftFallbackMode = if ($Record.execution -and $Record.execution.draft -and -not [string]::IsNullOrWhiteSpace([string]$Record.execution.draft.fallbackMode)) { [string]$Record.execution.draft.fallbackMode } elseif ($Record.planned -and $Record.planned.draft -and -not [string]::IsNullOrWhiteSpace([string]$Record.planned.draft.providerMode)) { [string]$Record.planned.draft.providerMode } else { "" }
    draftError = if ($Record.execution -and $Record.execution.draft -and $Record.execution.draft.provider -and ($Record.execution.draft.provider.PSObject.Properties.Name -contains "reason") -and -not [bool]$Record.execution.draft.provider.ok) { [string]$Record.execution.draft.provider.reason } else { "" }
    customerMatchKind = if ($Record.customerMatch) { [string]$Record.customerMatch.matchKind } else { "" }
    customerMatchReason = if ($Record.customerMatch) { [string]$Record.customerMatch.reason } else { "" }
    customerMatchConfidence = if ($Record.customerMatch -and ($Record.customerMatch.PSObject.Properties.Name -contains "confidence")) { [double]$Record.customerMatch.confidence } else { 0 }
    customerMatchEvidence = if ($Record.customerMatch -and $Record.customerMatch.evidence) { $Record.customerMatch.evidence } else { $null }
    createdAt = [string]$Record.createdAt
    updatedAt = [string]$Record.updatedAt
  }
}

function Get-AssistantStoreIntakeIndex {
  param(
    [object]$Store,
    [string]$DedupeKey
  )

  if (-not $Store -or [string]::IsNullOrWhiteSpace($DedupeKey)) {
    return -1
  }

  $records = ConvertTo-AssistantArray -Value $Store.intakes
  for ($index = 0; $index -lt $records.Count; $index += 1) {
    if ([string]$records[$index].dedupeKey -eq $DedupeKey) {
      return $index
    }
  }

  return -1
}

function Get-AssistantStoreIntakeById {
  param(
    [object]$Store,
    [string]$Id
  )

  if ([string]::IsNullOrWhiteSpace($Id)) {
    return $null
  }

  return (ConvertTo-AssistantArray -Value $Store.intakes) | Where-Object { [string]$_.id -eq $Id } | Select-Object -First 1
}

function Get-AssistantStoreIntakeByDedupeKey {
  param(
    [object]$Store,
    [string]$DedupeKey
  )

  if ([string]::IsNullOrWhiteSpace($DedupeKey)) {
    return $null
  }

  return (ConvertTo-AssistantArray -Value $Store.intakes) | Where-Object { [string]$_.dedupeKey -eq $DedupeKey } | Select-Object -First 1
}

function Save-AssistantIntakeRecord {
  param(
    [object]$Store,
    [object]$Record
  )

  $records = New-Object System.Collections.Generic.List[object]
  foreach ($item in @(ConvertTo-AssistantArray -Value $Store.intakes)) {
    if ($null -ne $item) {
      $records.Add($item) | Out-Null
    }
  }
  $index = Get-AssistantStoreIntakeIndex -Store $Store -DedupeKey ([string]$Record.dedupeKey)
  if ($index -ge 0) {
    $records[$index] = $Record
  } else {
    $records.Add($Record) | Out-Null
  }

  $Store.intakes = $records.ToArray()
  Save-AssistantStore -Store $Store
}

function Invoke-AssistantProcessIntake {
  param(
    [object]$RawPayload,
    [string]$SourceKind = "simulated",
    [string]$ProviderKind = "",
    [string]$MailboxProfileId = "",
    [string]$MailboxFolder = "",
    [bool]$Execute = $false,
    [bool]$Force = $false
  )

  $normalized = Get-AssistantCreateNormalizedMessage -Payload $RawPayload -SourceKind $SourceKind -ProviderKind $ProviderKind -MailboxProfileId $MailboxProfileId -MailboxFolder $MailboxFolder
  $store = Get-AssistantStore
  $existing = Get-AssistantStoreIntakeByDedupeKey -Store $store -DedupeKey $normalized.dedupeKey
  if (-not $existing) {
    $existing = Get-AssistantStoreIntakeById -Store $store -Id $normalized.id
  }

  if ($existing -and -not $Force) {
    $existingExecuted = $false
    if ($existing.execution -and ($existing.execution.PSObject.Properties.Name -contains "executed")) {
      $existingExecuted = [bool]$existing.execution.executed
    }
    if ($Execute -and -not $existingExecuted) {
      $normalized.id = [string]$existing.id
    } else {
      return [pscustomobject]@{
        ok = $true
        duplicate = $true
        intake = $existing
        summary = [string]$existing.summary
        draftReply = [string]$existing.draftReply
        execute = [bool]$Execute
        mode = if ($Execute) { "execute" } else { "dry-run" }
        reason = if ($existingExecuted) { "ingreso ya procesado" } else { "ingreso ya registrado en dry-run" }
      }
    }
  }

  $customerMatch = Get-AssistantCustomerMatch -Message $normalized
  $classification = Get-AssistantClassification -Message $normalized -CustomerMatch $customerMatch
  $draftPolicy = Get-AssistantDraftAutoDecision -Classification $classification
  $summary = Get-AssistantSummary -Message $normalized -CustomerMatch $customerMatch -Classification $classification
  $draftReply = Get-AssistantDraftReply -Message $normalized -CustomerMatch $customerMatch -Classification $classification
  $taskPlan = Get-AssistantTaskPlan -Message $normalized -CustomerMatch $customerMatch -Classification $classification
  $operationPlan = Get-AssistantOperationPlan -Message $normalized -CustomerMatch $customerMatch -Classification $classification

  $taskResult = $null
  $operationResult = $null
  $draftResult = $null
  $activityResult = $null
  $executionNotes = New-Object System.Collections.Generic.List[string]

  if ($Execute) {
    if ($operationPlan.canWrite -and $operationPlan.action -eq "update" -and [string]::IsNullOrWhiteSpace([string]$operationPlan.payload.id)) {
      $resolvedOperationId = Resolve-AssistantOperationPlanId -OperationPlan $operationPlan -Message $normalized -CustomerMatch $customerMatch
      if (-not [string]::IsNullOrWhiteSpace($resolvedOperationId)) {
        $operationPlan.payload.id = $resolvedOperationId
        if ($operationPlan.reconciliation) {
          $operationPlan.reconciliation.operationId = $resolvedOperationId
        }
      }
    }

    if ($operationPlan.canWrite) {
      try {
        if ($operationPlan.action -eq "update" -and $operationPlan.payload.id) {
          $operationResult = Invoke-AssistantApiV1Request -Method "PATCH" -Path "/api/v1/operations/$($operationPlan.payload.id)" -Body $operationPlan.payload
        } else {
          $operationResult = Invoke-AssistantApiV1Request -Method "POST" -Path "/api/v1/operations" -Body $operationPlan.payload
        }
        if (-not $operationResult.body.ok) {
          $executionNotes.Add("operation_error: $([string]$operationResult.body.error.message)") | Out-Null
        }
      } catch {
        $executionNotes.Add("operation_error: $([string]$_.Exception.Message)") | Out-Null
      }
    } elseif ($operationPlan.warnings.Count) {
      foreach ($warning in @($operationPlan.warnings)) {
        $executionNotes.Add([string]$warning) | Out-Null
      }
    }

    if ($operationPlan.reconciliation -and $operationPlan.reconciliation.changes -and @($operationPlan.reconciliation.changes).Count) {
      $executionNotes.Add("operation_reconciliada: $(@($operationPlan.reconciliation.changes) -join '; ')") | Out-Null
    }

    if ($taskPlan.canWrite) {
      try {
        if ($operationResult -and $operationResult.body.ok -and $operationResult.body.data -and $operationResult.body.data.id) {
          $taskPlan.payload.operationId = [string]$operationResult.body.data.id
        }
        if ($taskPlan.action -eq "update" -and $taskPlan.payload.id) {
          $taskResult = Invoke-AssistantApiV1Request -Method "PATCH" -Path "/api/v1/tasks/$($taskPlan.payload.id)" -Body $taskPlan.payload
        } else {
          $taskResult = Invoke-AssistantApiV1Request -Method "POST" -Path "/api/v1/tasks" -Body $taskPlan.payload
        }
        if (-not $taskResult.body.ok) {
          $executionNotes.Add("task_error: $([string]$taskResult.body.error.message)") | Out-Null
        }
      } catch {
        $executionNotes.Add("task_error: $([string]$_.Exception.Message)") | Out-Null
      }
    }
  }

  if ($Execute -and $draftPolicy.eligible) {
    try {
      $draftContext = [pscustomobject]@{
        sourceEmailExternalId = [string]$normalized.externalId
        sourceIntakeId = [string]$normalized.id
        sourceKind = [string]$normalized.sourceKind
        providerKind = [string]$normalized.providerKind
        mailboxProfileId = [string]$normalized.mailboxProfileId
        mailboxFolder = [string]$normalized.mailboxFolder
        externalId = [string]$normalized.externalId
        message = $normalized
        customerId = if ($customerMatch.found) { [string]$customerMatch.customerId } else { "" }
        customerMatch = $customerMatch
        classification = $classification
        summary = $summary
        draftReply = $draftReply
        taskId = if ($taskResult -and $taskResult.body -and $taskResult.body.ok -and $taskResult.body.data -and $taskResult.body.data.id) { [string]$taskResult.body.data.id } else { "" }
        operationId = if ($operationResult -and $operationResult.body -and $operationResult.body.ok -and $operationResult.body.data -and $operationResult.body.data.id) { [string]$operationResult.body.data.id } else { "" }
        operationReference = if ($operationResult -and $operationResult.body -and $operationResult.body.ok -and $operationResult.body.data -and -not [string]::IsNullOrWhiteSpace([string]$operationResult.body.data.referencia)) { [string]$operationResult.body.data.referencia } elseif (-not [string]::IsNullOrWhiteSpace([string]$operationPlan.payload.referencia)) { [string]$operationPlan.payload.referencia } else { "" }
      }
      $draftResult = Invoke-AssistantCreateDraftFromContext -Context $draftContext -AttemptProviderExport:$Execute -ProviderKind ([string]$normalized.providerKind) -MailboxProfileId ([string]$normalized.mailboxProfileId) -MailboxFolder ([string]$normalized.mailboxFolder) -Force:$Force
      if (-not $draftResult.ok) {
        $executionNotes.Add("draft_error: $([string]$draftResult.reason)") | Out-Null
      }
    } catch {
      $executionNotes.Add("draft_error: $([string]$_.Exception.Message)") | Out-Null
    }
  } elseif ($Execute) {
    $executionNotes.Add("draft_skip: $($draftPolicy.reason)") | Out-Null
  } elseif ($draftPolicy.eligible) {
    $executionNotes.Add("draft_preview: $($draftPolicy.reason)") | Out-Null
  }

  if ($Execute) {
    try {
      $activityPayload = Get-AssistantActivityPayload -Message $normalized -CustomerMatch $customerMatch -Classification $classification -Summary $summary -DraftReply $draftReply -TaskResult $taskResult -OperationResult $operationResult -DraftResult $draftResult -OperationPlan $operationPlan
      $activityResult = Invoke-AssistantApiV1Request -Method "POST" -Path "/api/v1/activities" -Body $activityPayload
      if (-not $activityResult.body.ok) {
        $executionNotes.Add("activity_error: $([string]$activityResult.body.error.message)") | Out-Null
      } elseif ($draftResult -and $draftResult.draft -and $draftResult.draft.id -and $activityResult.body.data -and $activityResult.body.data.id) {
        try {
          $store = Get-AssistantStore
          $updatedDraft = Invoke-AssistantLinkDraftActivity -Store $store -DraftId ([string]$draftResult.draft.id) -ActivityId ([string]$activityResult.body.data.id)
          if ($updatedDraft) {
            $draftResult = [pscustomobject]@{
              ok = $draftResult.ok
              duplicate = $draftResult.duplicate
              fallbackMode = $draftResult.fallbackMode
              provider = $draftResult.provider
              draft = $updatedDraft
            }
          }
        } catch {
          $executionNotes.Add("draft_link_error: $([string]$_.Exception.Message)") | Out-Null
        }
      }
    } catch {
      $executionNotes.Add("activity_error: $([string]$_.Exception.Message)") | Out-Null
    }
  }

  $record = [pscustomobject]@{
    id = $normalized.id
    sourceKind = $normalized.sourceKind
    providerKind = $normalized.providerKind
    mailboxProfileId = $normalized.mailboxProfileId
    mailboxFolder = $normalized.mailboxFolder
    externalId = $normalized.externalId
    dedupeKey = $normalized.dedupeKey
    from = $normalized.from
    subject = $normalized.subject
    date = $normalized.date
    bodyNormalized = $normalized.bodyNormalized
    taskHint = $normalized.taskHint
    operationHint = $normalized.operationHint
    customerId = if ($customerMatch.found) { $customerMatch.customerId } else { "" }
    customerMatch = $customerMatch
    customerMatchKind = if ($customerMatch) { [string]$customerMatch.matchKind } else { "" }
    customerMatchReason = if ($customerMatch) { [string]$customerMatch.reason } else { "" }
    customerMatchConfidence = if ($customerMatch -and ($customerMatch.PSObject.Properties.Name -contains "confidence")) { [double]$customerMatch.confidence } else { 0 }
    customerMatchEvidence = if ($customerMatch -and $customerMatch.evidence) { $customerMatch.evidence } else { $null }
    classification = $classification
    summary = $summary
    draftReply = $draftReply
    draftId = if ($draftResult -and $draftResult.draft -and $draftResult.draft.id) { [string]$draftResult.draft.id } else { "" }
    draftStatus = if ($draftResult -and $draftResult.draft -and $draftResult.draft.status) { [string]$draftResult.draft.status } else { "" }
    draftSourceEmailExternalId = if ($draftResult -and $draftResult.draft -and $draftResult.draft.sourceEmailExternalId) { [string]$draftResult.draft.sourceEmailExternalId } else { [string]$normalized.externalId }
    draftEligible = [bool]$draftPolicy.eligible
    draftTrigger = [string]$draftPolicy.trigger
    draftReason = [string]$draftPolicy.reason
    draftProviderOk = if ($draftResult -and $draftResult.provider -and ($draftResult.provider.PSObject.Properties.Name -contains "ok")) { [bool]$draftResult.provider.ok } else { $false }
    draftFallbackMode = if ($draftResult -and -not [string]::IsNullOrWhiteSpace([string]$draftResult.fallbackMode)) { [string]$draftResult.fallbackMode } elseif ($Execute -and $draftPolicy.eligible) { "local" } elseif ($draftPolicy.eligible) { "preview" } else { "skip" }
    draftError = if ($draftResult -and $draftResult.provider -and ($draftResult.provider.PSObject.Properties.Name -contains "reason") -and -not [bool]$draftResult.provider.ok) { [string]$draftResult.provider.reason } else { "" }
    planned = [pscustomobject]@{
      task = $taskPlan
      operation = $operationPlan
      draft = [pscustomobject]@{
        action = if ($draftPolicy.eligible) { if ($Execute) { "create" } else { "preview" } } else { "skip" }
        canWrite = [bool]($Execute -and $draftPolicy.eligible)
        status = if ($draftResult -and $draftResult.draft -and $draftResult.draft.status) { [string]$draftResult.draft.status } elseif ($draftPolicy.eligible) { "draft_pending_review" } else { "skipped" }
        providerMode = if ($draftResult) { [string]$draftResult.fallbackMode } elseif ($Execute -and $draftPolicy.eligible) { "local" } elseif ($draftPolicy.eligible) { "preview" } else { "skip" }
        eligible = [bool]$draftPolicy.eligible
        trigger = [string]$draftPolicy.trigger
        reason = [string]$draftPolicy.reason
        mode = if ($Execute) { "execute" } else { "dry-run" }
      }
      activity = [pscustomobject]@{
        action = "create"
        canWrite = $Execute
      }
    }
    execution = [pscustomobject]@{
      executed = [bool]$Execute
      status = if ($Execute) { if ($executionNotes.Count) { "partial" } else { "completed" } } else { "dry-run" }
      task = if ($taskResult) { $taskResult.body } else { $null }
      operation = if ($operationResult) { $operationResult.body } else { $null }
      draft = if ($draftResult) {
        [pscustomobject]@{
          ok = $draftResult.ok
          duplicate = $draftResult.duplicate
          fallbackMode = $draftResult.fallbackMode
          provider = $draftResult.provider
          providerOk = if ($draftResult.provider -and ($draftResult.provider.PSObject.Properties.Name -contains "ok")) { [bool]$draftResult.provider.ok } else { $false }
          error = if ($draftResult.provider -and ($draftResult.provider.PSObject.Properties.Name -contains "reason") -and -not [bool]$draftResult.provider.ok) { [string]$draftResult.provider.reason } else { "" }
          draft = $draftResult.draft
        }
      } else {
        $null
      }
      activity = if ($activityResult) { $activityResult.body } else { $null }
      operationReconciliation = if ($operationPlan -and $operationPlan.reconciliation) { $operationPlan.reconciliation } else { $null }
      notes = @($executionNotes)
      mode = if ($Execute) { "execute" } else { "dry-run" }
    }
    createdAt = if ($existing -and $existing.createdAt) { [string]$existing.createdAt } else { Get-AssistantNowIso }
    updatedAt = Get-AssistantNowIso
  }

  $storeRecord = $record
  $store = Get-AssistantStore
  Save-AssistantIntakeRecord -Store $store -Record $storeRecord

  return [pscustomobject]@{
    ok = $true
    sourceKind = $normalized.sourceKind
    execute = [bool]$Execute
    mode = if ($Execute) { "execute" } else { "dry-run" }
    duplicate = $false
    intake = $storeRecord
  }
}

function Invoke-AssistantProcessBatch {
  param(
    [object[]]$Items,
    [string]$SourceKind = "simulated",
    [string]$ProviderKind = "",
    [string]$MailboxProfileId = "",
    [string]$MailboxFolder = "",
    [bool]$Execute = $false,
    [bool]$Force = $false
  )

  $results = New-Object System.Collections.Generic.List[object]
  $normalizedItems = @($Items | Where-Object { $null -ne $_ })
  foreach ($item in $normalizedItems) {
    $results.Add((Invoke-AssistantProcessIntake -RawPayload $item -SourceKind $SourceKind -ProviderKind $ProviderKind -MailboxProfileId $MailboxProfileId -MailboxFolder $MailboxFolder -Execute:$Execute -Force:$Force)) | Out-Null
  }

  return [pscustomobject]@{
    ok = $true
    count = $results.Count
    items = $results.ToArray()
    mode = if ($Execute) { "execute" } else { "dry-run" }
  }
}

function Get-AssistantIntakesList {
  param(
    [hashtable]$Query = @{}
  )

  $store = Get-AssistantStore
  $records = ConvertTo-AssistantArray -Value $store.intakes

  if (-not [string]::IsNullOrWhiteSpace([string]$Query.q)) {
    $needle = ConvertTo-AssistantNormalizedText -Text ([string]$Query.q)
    $records = @($records | Where-Object {
      $haystack = ConvertTo-AssistantNormalizedText -Text ("$($_.subject) $($_.from.raw) $($_.summary) $($_.classification.caseType)")
      $haystack.Contains($needle)
    })
  }

  $limit = 50
  [void][int]::TryParse([string]$Query.limit, [ref]$limit)
  if ($limit -lt 1) { $limit = 50 }
  if ($limit -gt 250) { $limit = 250 }

  $cursor = 0
  [void][int]::TryParse([string]$Query.cursor, [ref]$cursor)
  if ($cursor -lt 0) { $cursor = 0 }

  $sorted = @($records | Sort-Object -Property @{ Expression = { [string]$_.updatedAt }; Descending = $true }, @{ Expression = { [string]$_.createdAt }; Descending = $true })
  if ($sorted.Count -eq 1 -and $null -eq $sorted[0]) {
    $sorted = @()
  }
  $page = @($sorted | Select-Object -Skip $cursor -First $limit)
  if ($page.Count -eq 1 -and $null -eq $page[0]) {
    $page = @()
  }
  $nextCursor = if (($cursor + $page.Count) -lt $sorted.Count) { $cursor + $page.Count } else { $null }

  return [pscustomobject]@{
    items = @($page | ForEach-Object { Get-AssistantIntakeSummaryItem -Record $_ })
    count = $page.Count
    limit = $limit
    cursor = $cursor
    nextCursor = $nextCursor
    hasMore = [bool]($null -ne $nextCursor)
    totalCount = $sorted.Count
  }
}

function Get-AssistantIntakeByIdResponse {
  param([string]$Id)

  $store = Get-AssistantStore
  $record = Get-AssistantStoreIntakeById -Store $store -Id $Id
  if (-not $record) {
    return $null
  }

  return $record
}

function New-AssistantResponse {
  param(
    [int]$StatusCode = 200,
    [string]$ReasonPhrase = "OK",
    [object]$Data = $null,
    [object]$Meta = $null
  )

  return [pscustomobject]@{
    statusCode = $StatusCode
    reasonPhrase = $ReasonPhrase
    body = [pscustomobject]@{
      ok = $true
      assistantVersion = 1
      data = $Data
      meta = if ($Meta) { $Meta } else { [pscustomobject]@{} }
    }
  }
}

function New-AssistantErrorResponse {
  param(
    [int]$StatusCode = 400,
    [string]$ReasonPhrase = "Bad Request",
    [string]$Code = "VALIDATION_ERROR",
    [string]$Message = "No fue posible completar la operacion.",
    [object]$Details = $null
  )

  return [pscustomobject]@{
    statusCode = $StatusCode
    reasonPhrase = $ReasonPhrase
    body = [pscustomobject]@{
      ok = $false
      assistantVersion = 1
      error = [pscustomobject]@{
        code = $Code
        message = $Message
        details = $Details
      }
    }
  }
}

function Get-AssistantRequestBody {
  param([object]$Request)

  if (Get-Command -Name "Get-JsonRequestBody" -ErrorAction SilentlyContinue) {
    return Get-JsonRequestBody -Request $Request
  }

  if ([string]::IsNullOrWhiteSpace([string]$Request.BodyText)) {
    throw "Body JSON vacio."
  }

  try {
    return $Request.BodyText | ConvertFrom-Json
  } catch {
    throw "Body JSON invalido."
  }
}

function Invoke-AssistantRequest {
  param(
    [object]$Request,
    [string]$Path,
    [string]$QueryString
  )

  $method = ([string]$Request.Method).Trim().ToUpperInvariant()

  if ($Path -eq "/api/assistant/v1" -or $Path -eq "/api/assistant/v1/") {
    if ($method -ne "GET") {
      return New-AssistantErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
    }
    return New-AssistantResponse -Data (Get-AssistantManifest) -Meta ([pscustomobject]@{ source = "assistant-backend" })
  }

  if ($Path -eq "/api/assistant/v1/health") {
    if ($method -ne "GET") {
      return New-AssistantErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
    }

    $store = Get-AssistantStore
    return New-AssistantResponse -Data ([pscustomobject]@{
      ok = $true
      server = "JoathiVA Assistant v1"
      timestamp = Get-AssistantNowIso
      store = [pscustomobject]@{
        version = $store.version
        nextSequence = $store.nextSequence
        intakeCount = (ConvertTo-AssistantArray -Value $store.intakes).Count
        draftCount = (ConvertTo-AssistantArray -Value $store.drafts).Count
      }
    }) -Meta ([pscustomobject]@{ source = "assistant-backend" })
  }

  if ($Path -eq "/api/assistant/v1/manifest") {
    if ($method -ne "GET") {
      return New-AssistantErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
    }
    return New-AssistantResponse -Data (Get-AssistantManifest) -Meta ([pscustomobject]@{ source = "assistant-backend" })
  }

  if ($Path -eq "/api/assistant/v1/drafts" -and $method -eq "GET") {
    $parsedQuery = @{}
    if (-not [string]::IsNullOrWhiteSpace($QueryString)) {
      foreach ($part in ($QueryString -split "&")) {
        if ([string]::IsNullOrWhiteSpace($part)) {
          continue
        }
        $pair = $part -split "=", 2
        $key = [System.Uri]::UnescapeDataString(([string]$pair[0]).Replace("+", " "))
        $value = ""
        if ($pair.Count -gt 1) {
          $value = [System.Uri]::UnescapeDataString(([string]$pair[1]).Replace("+", " "))
        }
        $parsedQuery[$key] = $value
      }
    }
    return New-AssistantResponse -Data (Get-AssistantDraftsList -Query $parsedQuery) -Meta ([pscustomobject]@{ source = "assistant-backend" })
  }

  if ($Path -eq "/api/assistant/v1/drafts" -and $method -eq "POST") {
    try {
      $body = Get-AssistantRequestBody -Request $Request
    } catch {
      return New-AssistantErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -Message $_.Exception.Message
    }

    $attemptExport = $body.attemptExport -eq $true -or $body.export -eq $true
    $providerKind = [string]$body.providerKind
    $mailboxProfileId = [string]$body.mailboxProfileId
    $mailboxFolder = [string]$body.mailboxFolder
    $force = $body.force -eq $true

    try {
      if (-not [string]::IsNullOrWhiteSpace([string]$body.intakeId) -or -not [string]::IsNullOrWhiteSpace([string]$body.sourceEmailExternalId)) {
        $store = Get-AssistantStore
        $intake = $null
        if (-not [string]::IsNullOrWhiteSpace([string]$body.intakeId)) {
          $intake = Get-AssistantStoreIntakeById -Store $store -Id ([string]$body.intakeId)
        }
        if (-not $intake -and -not [string]::IsNullOrWhiteSpace([string]$body.sourceEmailExternalId)) {
          $intake = Get-AssistantStoreIntakeByDedupeKey -Store $store -DedupeKey ([string]$body.sourceEmailExternalId)
          if (-not $intake) {
            $intake = (ConvertTo-AssistantArray -Value $store.intakes) | Where-Object { [string]$_.externalId -eq ([string]$body.sourceEmailExternalId) } | Select-Object -First 1
          }
        }
        if (-not $intake) {
          return New-AssistantErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -Code "NOT_FOUND" -Message "No se encontro el ingreso procesado."
        }

        $draftResult = Invoke-AssistantCreateDraftFromIntakeRecord -IntakeRecord $intake -AttemptProviderExport:$attemptExport -ProviderKind $providerKind -MailboxProfileId $mailboxProfileId -MailboxFolder $mailboxFolder -Force:$force
        if (-not $draftResult.ok) {
          return New-AssistantErrorResponse -StatusCode 500 -ReasonPhrase "Internal Server Error" -Message $draftResult.reason
        }

        $draftCopy = $draftResult.draft
        if ($draftCopy) {
          try {
            $draftCopy = $draftCopy | ConvertTo-Json -Depth 100 | ConvertFrom-Json
          } catch {
          }
        }

        return New-AssistantResponse -StatusCode 201 -ReasonPhrase "Created" -Data ([pscustomobject]@{
          ok = $true
          duplicate = [bool]$draftResult.duplicate
          fallbackMode = [string]$draftResult.fallbackMode
          provider = $draftResult.provider
          draftId = if ($draftCopy -and $draftCopy.id) { [string]$draftCopy.id } else { [string]$draftResult.draft.id }
          draftStatus = if ($draftCopy -and $draftCopy.status) { [string]$draftCopy.status } else { [string]$draftResult.draft.status }
          draft = if ($draftCopy) { Get-AssistantDraftSummaryItem -Record $draftCopy } else { $null }
        }) -Meta ([pscustomobject]@{ source = "assistant-backend" })
      }

      if ($body.message) {
        $sourceKind = if (-not [string]::IsNullOrWhiteSpace([string]$body.sourceKind)) { ([string]$body.sourceKind).Trim().ToLowerInvariant() } else { "simulated" }
        $processed = Invoke-AssistantProcessIntake -RawPayload $body.message -SourceKind $sourceKind -ProviderKind $providerKind -MailboxProfileId $mailboxProfileId -MailboxFolder $mailboxFolder -Execute:$false -Force:$force
        if (-not $processed.ok) {
          return New-AssistantErrorResponse -StatusCode 500 -ReasonPhrase "Internal Server Error" -Message "No fue posible procesar el mensaje."
        }
        $draftFromIntake = $null
        if ($processed.intake -and $processed.intake.draftId) {
          $store = Get-AssistantStore
          $draftFromIntake = Get-AssistantStoreDraftById -Store $store -Id ([string]$processed.intake.draftId)
        }
        if (-not $draftFromIntake) {
          $store = Get-AssistantStore
          $draftFromIntake = Get-AssistantStoreDraftBySourceEmailExternalId -Store $store -SourceEmailExternalId ([string]$processed.intake.externalId)
        }
        $draftCopy = $draftFromIntake
        if ($draftCopy) {
          try {
            $draftCopy = $draftCopy | ConvertTo-Json -Depth 100 | ConvertFrom-Json
          } catch {
          }
        }
        return New-AssistantResponse -StatusCode 201 -ReasonPhrase "Created" -Data ([pscustomobject]@{
          ok = $true
          duplicate = [bool]$processed.duplicate
          fallbackMode = "local"
          provider = $null
          draftId = if ($draftCopy -and $draftCopy.id) { [string]$draftCopy.id } else { [string]$processed.intake.draftId }
          draftStatus = if ($draftCopy -and $draftCopy.status) { [string]$draftCopy.status } else { [string]$processed.intake.draftStatus }
          draft = if ($draftCopy) { Get-AssistantDraftSummaryItem -Record $draftCopy } else { $null }
          intake = $processed.intake
        }) -Meta ([pscustomobject]@{ source = "assistant-backend" })
      }

      return New-AssistantErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -Message "Debes indicar intakeId, sourceEmailExternalId o message."
    } catch {
      return New-AssistantErrorResponse -StatusCode 500 -ReasonPhrase "Internal Server Error" -Message ([string]$_.Exception.Message)
    }
  }

  if ($Path -match "^/api/assistant/v1/drafts/(?<id>[^/]+)$" -and $method -eq "GET") {
    $record = Get-AssistantDraftByIdResponse -Id $Matches.id
    if (-not $record) {
      return New-AssistantErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -Code "NOT_FOUND" -Message "No se encontro el borrador."
    }
    return New-AssistantResponse -Data $record -Meta ([pscustomobject]@{ source = "assistant-backend" })
  }

  if ($Path -match "^/api/assistant/v1/drafts/(?<id>[^/]+)/(?<action>exported|failed)$" -and $method -eq "POST") {
    try {
      $body = Get-AssistantRequestBody -Request $Request
    } catch {
      return New-AssistantErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -Message $_.Exception.Message
    }

    $store = Get-AssistantStore
    $attemptProviderExport = $false
    if ($body -and ($body.PSObject.Properties.Name -contains "attemptProviderExport")) {
      $attemptProviderExport = [bool]$body.attemptProviderExport
    }
    if ($body -and ($body.PSObject.Properties.Name -contains "exportMode") -and ([string]$body.exportMode).Trim().ToLowerInvariant() -eq "provider") {
      $attemptProviderExport = $true
    }
    if ($body -and ($body.PSObject.Properties.Name -contains "providerKind") -and -not [string]::IsNullOrWhiteSpace([string]$body.providerKind)) {
      $attemptProviderExport = $true
    }
    if ($body -and ($body.PSObject.Properties.Name -contains "mailboxProfileId") -and -not [string]::IsNullOrWhiteSpace([string]$body.mailboxProfileId)) {
      $attemptProviderExport = $true
    }

    if ($Matches.action -eq "exported" -and $attemptProviderExport) {
      $draft = Get-AssistantStoreDraftById -Store $store -Id $Matches.id
      if (-not $draft) {
        return New-AssistantErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -Code "NOT_FOUND" -Message "No se encontro el borrador."
      }

      $providerResult = Invoke-AssistantExportDraftToProvider -Store $store -Draft $draft -ProviderKind ([string]$body.providerKind) -MailboxProfileId ([string]$body.mailboxProfileId) -MailboxFolder ([string]$body.mailboxFolder) -FailIfUnsupported:$true
      if ($providerResult -and $providerResult.draft) {
        return New-AssistantResponse -Data ([pscustomobject]@{
          ok = [bool]$providerResult.ok
          provider = $providerResult.provider
          draft = $providerResult.draft
          fallbackMode = [string]$providerResult.fallbackMode
        }) -Meta ([pscustomobject]@{ source = "assistant-backend" })
      }
    }

    $status = if ($Matches.action -eq "exported") { "draft_exported" } else { "draft_failed" }
    $updatedDraft = Invoke-AssistantUpdateDraftStatus -Store $store -Id $Matches.id -Status $status -ReviewedAt ([string]$body.reviewedAt) -FailureReason ([string]$body.failureReason) -ProviderDraftId ([string]$body.providerDraftId) -MetadataPatch ([pscustomobject]@{
      providerKind = [string]$body.providerKind
      note = [string]$body.note
      exportMode = if ($attemptProviderExport) { "provider" } else { "manual" }
    })
    if (-not $updatedDraft) {
      return New-AssistantErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -Code "NOT_FOUND" -Message "No se encontro el borrador."
    }
    return New-AssistantResponse -Data ([pscustomobject]@{
      ok = $true
      draft = $updatedDraft
    }) -Meta ([pscustomobject]@{ source = "assistant-backend" })
  }

  if ($Path -eq "/api/assistant/v1/intakes" -and $method -eq "GET") {
    $parsedQuery = @{}
    if (-not [string]::IsNullOrWhiteSpace($QueryString)) {
      foreach ($part in ($QueryString -split "&")) {
        if ([string]::IsNullOrWhiteSpace($part)) {
          continue
        }
        $pair = $part -split "=", 2
        $key = [System.Uri]::UnescapeDataString(([string]$pair[0]).Replace("+", " "))
        $value = ""
        if ($pair.Count -gt 1) {
          $value = [System.Uri]::UnescapeDataString(([string]$pair[1]).Replace("+", " "))
        }
        $parsedQuery[$key] = $value
      }
    }
    return New-AssistantResponse -Data (Get-AssistantIntakesList -Query $parsedQuery) -Meta ([pscustomobject]@{ source = "assistant-backend" })
  }

  if ($Path -match "^/api/assistant/v1/intakes/(?<id>[^/]+)$" -and $method -eq "GET") {
    $record = Get-AssistantIntakeByIdResponse -Id $Matches.id
    if (-not $record) {
      return New-AssistantErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -Code "NOT_FOUND" -Message "No se encontro el ingreso."
    }
    return New-AssistantResponse -Data $record -Meta ([pscustomobject]@{ source = "assistant-backend" })
  }

  if ($Path -eq "/api/assistant/v1/intake" -or $Path -eq "/api/assistant/v1/intake/simulate" -or $Path -eq "/api/assistant/v1/intake/provider" -or $Path -eq "/api/assistant/v1/intake/mailbox") {
    if ($method -ne "POST") {
      return New-AssistantErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
    }

    try {
      $body = Get-AssistantRequestBody -Request $Request
    } catch {
      return New-AssistantErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -Message $_.Exception.Message
    }

    $executionDecision = Get-AssistantExecutionDecision -Body $body
    $execute = [bool]$executionDecision.execute
    $executionMode = [string]$executionDecision.mode
    $force = $body.force -eq $true

    if ($Path -eq "/api/assistant/v1/intake/mailbox") {
      $profileId = ([string]$body.profile).Trim()
      $mailboxProfile = Get-MailboxProfile -ProfileId $profileId
      $username = if ($mailboxProfile) { ([string]$mailboxProfile.username).Trim() } else { ([string]$body.username).Trim() }
      $password = if ($mailboxProfile) { [string]$mailboxProfile.password } else { [string]$body.password }
      $imapHost = if ($mailboxProfile) { ([string]$mailboxProfile.host).Trim() } else { ([string]$body.host).Trim() }
      $folder = if ([string]::IsNullOrWhiteSpace([string]$body.folder)) {
        if ($mailboxProfile) { ([string]$mailboxProfile.folder).Trim() } else { "INBOX" }
      } else {
        ([string]$body.folder).Trim()
      }
      if ([string]::IsNullOrWhiteSpace($folder)) {
        $folder = "INBOX"
      }
      $port = if ($mailboxProfile) { [int]$mailboxProfile.port } else { 0 }
      $limit = 5
      if (-not $mailboxProfile) {
        [void][int]::TryParse([string]$body.port, [ref]$port)
      }
      [void][int]::TryParse([string]$body.limit, [ref]$limit)
      if ($limit -lt 1) { $limit = 5 }
      if ($limit -gt 25) { $limit = 25 }

      if ([string]::IsNullOrWhiteSpace($username) -or [string]::IsNullOrWhiteSpace($password) -or [string]::IsNullOrWhiteSpace($imapHost)) {
        return New-AssistantErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -Message "Debes indicar correo, contrasena y servidor IMAP."
      }

      if ($port -lt 1 -or $port -gt 65535) {
        return New-AssistantErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -Message "El puerto IMAP no es valido."
      }

      try {
        $snapshot = Get-ImapMailboxSnapshot -ServerHost $imapHost -Port $port -Username $username -Password $password -Folder $folder -Limit $limit
      } catch {
        return New-AssistantErrorResponse -StatusCode 502 -ReasonPhrase "Bad Gateway" -Message ([string]$_.Exception.Message)
      }

      $items = New-Object System.Collections.Generic.List[object]
      foreach ($message in @($snapshot.messages)) {
        $items.Add((Invoke-AssistantProcessIntake -RawPayload ([pscustomobject]@{
          externalId = [string]$message.uid
          from = [string]$message.from
          subject = [string]$message.subject
          date = [string]$message.date
          preview = [string]$message.preview
        }) -SourceKind "mailbox" -ProviderKind "imap" -MailboxProfileId $profileId -MailboxFolder $folder -Execute:$execute -Force:$force)) | Out-Null
      }

      return New-AssistantResponse -StatusCode 200 -Data ([pscustomobject]@{
        sourceKind = "mailbox"
        providerKind = "imap"
        profileId = $profileId
        folder = $folder
        fetchedCount = @($snapshot.messages).Count
        processedCount = $items.Count
        execute = [bool]$execute
        mode = $executionMode
        items = $items.ToArray()
      }) -Meta ([pscustomobject]@{ source = "assistant-backend" })
    }

    $sourceKind = if (-not [string]::IsNullOrWhiteSpace([string]$body.sourceKind)) {
      ([string]$body.sourceKind).Trim().ToLowerInvariant()
    } else {
      switch ($Path) {
        "/api/assistant/v1/intake/provider" { "provider" }
        default { "simulated" }
      }
    }

    if ($sourceKind -notin $script:AssistantSourceKinds) {
      return New-AssistantErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -Message "sourceKind no soportado."
    }

    $items = if ($body.messages) {
      @($body.messages)
    } elseif ($body.message) {
      @($body.message)
    } else {
      @($body)
    }

    return New-AssistantResponse -Data (Invoke-AssistantProcessBatch -Items $items -SourceKind $sourceKind -ProviderKind ([string]$body.providerKind) -MailboxProfileId ([string]$body.mailboxProfileId) -MailboxFolder ([string]$body.mailboxFolder) -Execute:$execute -Force:$force) -Meta ([pscustomobject]@{ source = "assistant-backend" })
  }

  return New-AssistantErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -Code "NOT_FOUND" -Message "Ruta no encontrada."
}
