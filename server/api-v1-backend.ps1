$script:ApiV1StorePath = Join-Path $PSScriptRoot "data\api-v1-store.json"
$script:ApiV1MailboxProfilesPath = Join-Path $PSScriptRoot "data\mailbox-profiles.json"
$script:ApiV1GeneratedDocumentsRoot = Join-Path $PSScriptRoot "data\generated-documents"
$script:ApiV1SupportedEntities = @("customer", "quote", "task", "activity", "operation", "provider", "document", "mailoutbox")
$script:ApiV1RouteEntityMap = @{
  customers = "customer"
  quotes = "quote"
  tasks = "task"
  activities = "activity"
  operations = "operation"
  providers = "provider"
  documents = "document"
  mailoutbox = "mailoutbox"
}
$script:ApiV1OperationChecklistKeys = @(
  "avisoArribo",
  "previsionCamion",
  "facturaCRT",
  "borradorCRT",
  "controlDespachantePY",
  "ncm",
  "valorSeguro",
  "dua",
  "micDefinitivo",
  "crtDefinitivo",
  "entregaDocumentalDespachanteUY"
)

function Get-ApiV1NowIso {
  return (Get-Date).ToUniversalTime().ToString("o")
}

function ConvertTo-ApiV1Array {
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

function ConvertTo-ApiV1Dictionary {
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

function ConvertFrom-ApiV1QueryString {
  param([string]$QueryString)

  $query = @{}
  if ([string]::IsNullOrWhiteSpace($QueryString)) {
    return $query
  }

  foreach ($part in ($QueryString -split "&")) {
    if ([string]::IsNullOrWhiteSpace($part)) {
      continue
    }

    $pair = $part -split "=", 2
    $key = [System.Uri]::UnescapeDataString(([string]$pair[0]).Replace("+", " "))
    if ([string]::IsNullOrWhiteSpace($key)) {
      continue
    }

    $value = ""
    if ($pair.Count -gt 1) {
      $value = [System.Uri]::UnescapeDataString(([string]$pair[1]).Replace("+", " "))
    }

    if ($query.ContainsKey($key)) {
      if ($query[$key] -is [System.Array]) {
        $query[$key] = @($query[$key]) + $value
      } else {
        $query[$key] = @($query[$key], $value)
      }
      continue
    }

    $query[$key] = $value
  }

  return $query
}

function New-ApiV1RecordId {
  param([string]$Prefix)

  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $random = [guid]::NewGuid().ToString("N").Substring(0, 6)
  return "$Prefix-$stamp-$random"
}

function Get-ApiV1SerializedSummary {
  param([object]$Value)

  if ($null -eq $Value) {
    return ""
  }

  try {
    $text = $Value | ConvertTo-Json -Depth 8 -Compress
    if ([string]::IsNullOrWhiteSpace($text)) {
      return ""
    }
    return [string]$text
  } catch {
    return [string]$Value
  }
}

function ConvertTo-ApiV1NormalizedText {
  param([object]$Value)

  if ($null -eq $Value) {
    return ""
  }

  $text = [string]$Value
  if ([string]::IsNullOrWhiteSpace($text)) {
    return ""
  }

  return $text.Trim()
}

function Get-ApiV1PythonExecutable {
  foreach ($candidate in @("python3", "python")) {
    $command = Get-Command -Name $candidate -ErrorAction SilentlyContinue
    if ($command -and $command.Source) {
      return [string]$command.Source
    }
    if ($command -and $command.Path) {
      return [string]$command.Path
    }
  }

  return ""
}

function Invoke-ApiV1PythonHelper {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptPath,

    [Parameter(Mandatory = $true)]
    [object]$Payload
  )

  $pythonExe = Get-ApiV1PythonExecutable
  if ([string]::IsNullOrWhiteSpace($pythonExe)) {
    return [pscustomobject]@{
      ok = $false
      reason = "No se encontro un ejecutable de Python disponible."
      stdout = ""
      stderr = ""
      exitCode = -1
    }
  }

  if (-not (Test-Path -LiteralPath $ScriptPath)) {
    return [pscustomobject]@{
      ok = $false
      reason = "No se encontro el helper solicitado."
      stdout = ""
      stderr = ""
      exitCode = -1
    }
  }

  $tempRoot = [System.IO.Path]::GetTempPath()
  $payloadPath = Join-Path $tempRoot ("joathiva-payload-{0}.json" -f ([guid]::NewGuid().ToString("N")))
  $stdoutPath = Join-Path $tempRoot ("joathiva-stdout-{0}.json" -f ([guid]::NewGuid().ToString("N")))
  $stderrPath = Join-Path $tempRoot ("joathiva-stderr-{0}.txt" -f ([guid]::NewGuid().ToString("N")))
  Set-Content -LiteralPath $payloadPath -Value ($Payload | ConvertTo-Json -Depth 100) -Encoding UTF8

  try {
    $process = Start-Process -FilePath $pythonExe -ArgumentList @($ScriptPath, $payloadPath) -PassThru -Wait -NoNewWindow -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    $stdout = if (Test-Path -LiteralPath $stdoutPath) { Get-Content -LiteralPath $stdoutPath -Raw -Encoding UTF8 } else { "" }
    $stderr = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw -Encoding UTF8 } else { "" }

    $result = $null
    if (-not [string]::IsNullOrWhiteSpace($stdout)) {
      try {
        $result = $stdout | ConvertFrom-Json
      } catch {
        $result = $null
      }
    }

    return [pscustomobject]@{
      ok = [bool]($process.ExitCode -eq 0 -and $result -and $result.ok)
      exitCode = $process.ExitCode
      stdout = $stdout
      stderr = $stderr
      result = $result
      reason = if ($result -and $result.reason) { [string]$result.reason } elseif (-not [string]::IsNullOrWhiteSpace($stderr)) { [string]$stderr } else { "" }
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      exitCode = -1
      stdout = ""
      stderr = [string]$_.Exception.Message
      result = $null
      reason = [string]$_.Exception.Message
    }
  } finally {
    foreach ($path in @($payloadPath, $stdoutPath, $stderrPath)) {
      try {
        if (Test-Path -LiteralPath $path) {
          Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
        }
      } catch {
      }
    }
  }
}

function Get-ApiV1MailboxProfiles {
  if (-not (Test-Path -LiteralPath $script:ApiV1MailboxProfilesPath)) {
    return @()
  }

  try {
    $raw = Get-Content -LiteralPath $script:ApiV1MailboxProfilesPath -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) {
      return @()
    }
    $parsed = $raw | ConvertFrom-Json
    return @(ConvertTo-ApiV1Array -Value $parsed)
  } catch {
    return @()
  }
}

function Get-ApiV1MailboxProfile {
  param([string]$ProfileId = "")

  $profiles = Get-ApiV1MailboxProfiles
  if (-not $profiles.Count) {
    return $null
  }

  $normalizedId = ([string]$ProfileId).Trim().ToLowerInvariant()
  if (-not [string]::IsNullOrWhiteSpace($normalizedId)) {
    foreach ($profile in $profiles) {
      $candidateId = ([string]$profile.id).Trim().ToLowerInvariant()
      if ($candidateId -eq $normalizedId) {
        return $profile
      }
    }
  }

  return $profiles | Select-Object -First 1
}

function Get-ApiV1MimeTypeFromPath {
  param([string]$Path)

  $extension = [string]([System.IO.Path]::GetExtension([string]$Path)).ToLowerInvariant()
  switch ($extension) {
    ".pdf" { return "application/pdf" }
    ".docx" { return "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
    ".doc" { return "application/msword" }
    ".html" { return "text/html" }
    ".htm" { return "text/html" }
    ".json" { return "application/json" }
    default { return "application/octet-stream" }
  }
}

function Get-ApiV1ExportFileEntries {
  param([object]$Files)

  $source = ConvertTo-ApiV1Dictionary -Value $Files
  if (-not $source.Count) {
    return @()
  }

  $orderedKeys = @("pdf", "docx", "html", "manifest")
  $entries = @()

  foreach ($key in $orderedKeys) {
    if (-not $source.ContainsKey($key) -or -not $source[$key]) {
      continue
    }

    $entry = ConvertTo-ApiV1Dictionary -Value $source[$key]
    $path = [string]$entry.path
    $name = if (-not [string]::IsNullOrWhiteSpace([string]$entry.name)) { [string]$entry.name } elseif (-not [string]::IsNullOrWhiteSpace($path)) { [System.IO.Path]::GetFileName($path) } else { "" }
    $mimeType = if (-not [string]::IsNullOrWhiteSpace([string]$entry.mimeType)) { [string]$entry.mimeType } elseif (-not [string]::IsNullOrWhiteSpace($path)) { Get-ApiV1MimeTypeFromPath -Path $path } else { "application/octet-stream" }
    $entries += [pscustomobject]@{
      kind = [string]$key
      path = $path
      name = $name
      mimeType = $mimeType
      exists = [bool]$entry.exists
    }
  }

  foreach ($key in $source.Keys) {
    $kind = [string]$key
    if ($orderedKeys -contains $kind) {
      continue
    }

    $entry = ConvertTo-ApiV1Dictionary -Value $source[$key]
    $path = [string]$entry.path
    if ([string]::IsNullOrWhiteSpace($path) -and [string]::IsNullOrWhiteSpace([string]$entry.name)) {
      continue
    }

    $name = if (-not [string]::IsNullOrWhiteSpace([string]$entry.name)) { [string]$entry.name } elseif (-not [string]::IsNullOrWhiteSpace($path)) { [System.IO.Path]::GetFileName($path) } else { "$kind" }
    $mimeType = if (-not [string]::IsNullOrWhiteSpace([string]$entry.mimeType)) { [string]$entry.mimeType } elseif (-not [string]::IsNullOrWhiteSpace($path)) { Get-ApiV1MimeTypeFromPath -Path $path } else { "application/octet-stream" }
    $entries += [pscustomobject]@{
      kind = $kind
      path = $path
      name = $name
      mimeType = $mimeType
      exists = if ($entry.ContainsKey("exists")) { [bool]$entry.exists } else { $false }
    }
  }

  return @($entries)
}

function Get-ApiV1PrimaryExportFile {
  param([object[]]$Files)

  if (-not $Files) {
    return $null
  }

  foreach ($kind in @("pdf", "docx", "html", "manifest")) {
    $candidate = $Files | Where-Object { [string]$_.kind -eq $kind } | Select-Object -First 1
    if ($candidate) {
      return $candidate
    }
  }

  return $Files | Select-Object -First 1
}

function Get-ApiV1ExportAttachments {
  param([object[]]$Files)

  $attachments = @()
  foreach ($file in (ConvertTo-ApiV1Array -Value $Files)) {
    $entry = ConvertTo-ApiV1Dictionary -Value $file
    $kind = [string]$entry.kind
    if ([string]::IsNullOrWhiteSpace([string]$entry.path) -or $kind -eq "manifest") {
      continue
    }
    if ($entry.ContainsKey("exists") -and -not [bool]$entry.exists) {
      continue
    }
    $attachments += [pscustomobject]@{
      path = [string]$entry.path
      filePath = [string]$entry.path
      localPath = [string]$entry.path
      name = if (-not [string]::IsNullOrWhiteSpace([string]$entry.name)) { [string]$entry.name } else { [System.IO.Path]::GetFileName([string]$entry.path) }
      fileName = if (-not [string]::IsNullOrWhiteSpace([string]$entry.name)) { [string]$entry.name } else { [System.IO.Path]::GetFileName([string]$entry.path) }
      mimeType = if (-not [string]::IsNullOrWhiteSpace([string]$entry.mimeType)) { [string]$entry.mimeType } else { Get-ApiV1MimeTypeFromPath -Path ([string]$entry.path) }
      contentType = if (-not [string]::IsNullOrWhiteSpace([string]$entry.mimeType)) { [string]$entry.mimeType } else { Get-ApiV1MimeTypeFromPath -Path ([string]$entry.path) }
      kind = $kind
      source = "document-export"
    }
  }

  return @($attachments)
}

function Get-ApiV1MailOutboxAttachments {
  param(
    [object]$Store,
    [object]$Existing,
    [object]$Incoming
  )

  $incomingDict = ConvertTo-ApiV1Dictionary -Value $Incoming
  $existingDict = ConvertTo-ApiV1Dictionary -Value $Existing
  $attachments = @()
  $warnings = @()

  $incomingAttachments = @(ConvertTo-ApiV1Array -Value $incomingDict.attachments)
  if ($incomingAttachments.Count) {
    foreach ($attachment in $incomingAttachments) {
      $entry = ConvertTo-ApiV1Dictionary -Value $attachment
      $path = [string]($entry.path)
      if ([string]::IsNullOrWhiteSpace($path)) {
        $warnings += "attachment without path"
        continue
      }
      $attachments += [pscustomobject]@{
        path = $path
        filePath = if (-not [string]::IsNullOrWhiteSpace([string]$entry.filePath)) { [string]$entry.filePath } else { $path }
        localPath = if (-not [string]::IsNullOrWhiteSpace([string]$entry.localPath)) { [string]$entry.localPath } else { $path }
        name = if (-not [string]::IsNullOrWhiteSpace([string]$entry.name)) { [string]$entry.name } elseif (-not [string]::IsNullOrWhiteSpace([string]$entry.fileName)) { [string]$entry.fileName } else { [System.IO.Path]::GetFileName($path) }
        fileName = if (-not [string]::IsNullOrWhiteSpace([string]$entry.fileName)) { [string]$entry.fileName } elseif (-not [string]::IsNullOrWhiteSpace([string]$entry.name)) { [string]$entry.name } else { [System.IO.Path]::GetFileName($path) }
        mimeType = if (-not [string]::IsNullOrWhiteSpace([string]$entry.mimeType)) { [string]$entry.mimeType } elseif (-not [string]::IsNullOrWhiteSpace([string]$entry.contentType)) { [string]$entry.contentType } else { Get-ApiV1MimeTypeFromPath -Path $path }
        contentType = if (-not [string]::IsNullOrWhiteSpace([string]$entry.contentType)) { [string]$entry.contentType } elseif (-not [string]::IsNullOrWhiteSpace([string]$entry.mimeType)) { [string]$entry.mimeType } else { Get-ApiV1MimeTypeFromPath -Path $path }
        kind = if (-not [string]::IsNullOrWhiteSpace([string]$entry.kind)) { [string]$entry.kind } else { "attachment" }
        source = if (-not [string]::IsNullOrWhiteSpace([string]$entry.source)) { [string]$entry.source } else { "manual" }
      }
    }
  }

  if (-not $attachments.Count) {
    $existingAttachments = @(ConvertTo-ApiV1Array -Value $existingDict.attachments)
    foreach ($attachment in $existingAttachments) {
      $entry = ConvertTo-ApiV1Dictionary -Value $attachment
      $path = [string]$entry.path
      if ([string]::IsNullOrWhiteSpace($path)) {
        continue
      }
      $attachments += [pscustomobject]@{
        path = $path
        filePath = if (-not [string]::IsNullOrWhiteSpace([string]$entry.filePath)) { [string]$entry.filePath } else { $path }
        localPath = if (-not [string]::IsNullOrWhiteSpace([string]$entry.localPath)) { [string]$entry.localPath } else { $path }
        name = if (-not [string]::IsNullOrWhiteSpace([string]$entry.name)) { [string]$entry.name } elseif (-not [string]::IsNullOrWhiteSpace([string]$entry.fileName)) { [string]$entry.fileName } else { [System.IO.Path]::GetFileName($path) }
        fileName = if (-not [string]::IsNullOrWhiteSpace([string]$entry.fileName)) { [string]$entry.fileName } elseif (-not [string]::IsNullOrWhiteSpace([string]$entry.name)) { [string]$entry.name } else { [System.IO.Path]::GetFileName($path) }
        mimeType = if (-not [string]::IsNullOrWhiteSpace([string]$entry.mimeType)) { [string]$entry.mimeType } elseif (-not [string]::IsNullOrWhiteSpace([string]$entry.contentType)) { [string]$entry.contentType } else { Get-ApiV1MimeTypeFromPath -Path $path }
        contentType = if (-not [string]::IsNullOrWhiteSpace([string]$entry.contentType)) { [string]$entry.contentType } elseif (-not [string]::IsNullOrWhiteSpace([string]$entry.mimeType)) { [string]$entry.mimeType } else { Get-ApiV1MimeTypeFromPath -Path $path }
        kind = if (-not [string]::IsNullOrWhiteSpace([string]$entry.kind)) { [string]$entry.kind } else { "attachment" }
        source = if (-not [string]::IsNullOrWhiteSpace([string]$entry.source)) { [string]$entry.source } else { "existing" }
      }
    }
  }

  $documentId = if (-not [string]::IsNullOrWhiteSpace([string]$incomingDict.documentId)) { [string]$incomingDict.documentId } else { [string]$existingDict.documentId }
  if (-not $attachments.Count -and -not [string]::IsNullOrWhiteSpace($documentId)) {
    $document = Get-ApiV1EntityRecordById -Store $Store -EntityKind "document" -Id $documentId
    if ($document) {
      $resolvedDocumentAttachments = Get-ApiV1ExportAttachments -Files $document.exportFiles
      if ($resolvedDocumentAttachments.Count) {
        $attachments += $resolvedDocumentAttachments
      } else {
        $warnings += "document without export files: $documentId"
      }
    } else {
      $warnings += "document not found: $documentId"
    }
  }

  return [pscustomobject]@{
    attachments = @($attachments)
    warnings = @($warnings)
  }
}

function Update-ApiV1ProviderSummaries {
  param([object]$ProviderRecord)

  $payload = ConvertTo-ApiV1Dictionary -Value $ProviderRecord
  $payload.routes = ConvertTo-ApiV1Array -Value $payload.routes
  $payload.trips = ConvertTo-ApiV1Array -Value $payload.trips
  $payload.documents = ConvertTo-ApiV1Array -Value $payload.documents
  $payload.routesSummary = Get-ApiV1SerializedSummary -Value $payload.routes
  $payload.coverageSummary = if (-not [string]::IsNullOrWhiteSpace([string]$payload.zona)) { [string]$payload.zona } else { Get-ApiV1SerializedSummary -Value $payload.routes }
  $payload.tripsSummary = Get-ApiV1SerializedSummary -Value $payload.trips
  $payload.documentsSummary = Get-ApiV1SerializedSummary -Value $payload.documents
  $payload.operationalSummary = Get-ApiV1SerializedSummary -Value ([pscustomobject]@{
    chofer = $payload.chofer
    driver = $payload.driver
    camion = $payload.camion
    truck = $payload.truck
    mic = $payload.mic
    dua = $payload.dua
    crt = $payload.crt
  })
  return [pscustomobject]$payload
}

function Get-ApiV1RequestBody {
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

function Get-ApiV1DefaultStore {
  $now = Get-ApiV1NowIso
  return [pscustomobject]@{
    version = 1
    generatedAt = $now
    updatedAt = $now
    nextSequence = 1
    entities = [pscustomobject]@{
      customer = @()
      quote = @()
      task = @()
      activity = @()
      operation = @()
      provider = @()
      document = @()
      mailoutbox = @()
    }
    changes = @()
  }
}

function Normalize-ApiV1StoreShape {
  param([object]$Store)

  $seed = Get-ApiV1DefaultStore
  $source = if ($Store) { $Store } else { $seed }
  $version = 0
  $nextSequence = 0
  [void][int]::TryParse([string]$source.version, [ref]$version)
  [void][int]::TryParse([string]$source.nextSequence, [ref]$nextSequence)

  $normalized = [pscustomobject]@{
    version = $version
    generatedAt = if ([string]::IsNullOrWhiteSpace([string]$source.generatedAt)) { $seed.generatedAt } else { [string]$source.generatedAt }
    updatedAt = if ([string]::IsNullOrWhiteSpace([string]$source.updatedAt)) { $seed.updatedAt } else { [string]$source.updatedAt }
    nextSequence = $nextSequence
    entities = [pscustomobject]@{
      customer = ConvertTo-ApiV1Array -Value $source.entities.customer
      quote = ConvertTo-ApiV1Array -Value $source.entities.quote
      task = ConvertTo-ApiV1Array -Value $source.entities.task
      activity = ConvertTo-ApiV1Array -Value $source.entities.activity
      operation = ConvertTo-ApiV1Array -Value $source.entities.operation
      provider = ConvertTo-ApiV1Array -Value $source.entities.provider
      document = ConvertTo-ApiV1Array -Value $source.entities.document
      mailoutbox = ConvertTo-ApiV1Array -Value $source.entities.mailoutbox
    }
    changes = ConvertTo-ApiV1Array -Value $source.changes
  }

  if ($normalized.version -lt 1) {
    $normalized.version = 1
  }

  if ($normalized.nextSequence -lt 1) {
    $normalized.nextSequence = 1
  }

  return $normalized
}

function Initialize-ApiV1StoreFile {
  if (-not (Test-Path $ApiV1StorePath)) {
    Save-ApiV1Store -Store (Get-ApiV1DefaultStore)
  }
}

function Get-ApiV1Store {
  Initialize-ApiV1StoreFile

  try {
    $raw = Get-Content -LiteralPath $ApiV1StorePath -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($raw)) {
      return Get-ApiV1DefaultStore
    }

    $parsed = $raw | ConvertFrom-Json
    return Normalize-ApiV1StoreShape -Store $parsed
  } catch {
    return Get-ApiV1DefaultStore
  }
}

function Save-ApiV1Store {
  param([object]$Store)

  $normalized = Normalize-ApiV1StoreShape -Store $Store
  $normalized.updatedAt = Get-ApiV1NowIso
  $json = $normalized | ConvertTo-Json -Depth 100
  $json = $json -replace '"customer":\s*\{\s*\}', '"customer": []'
  $json = $json -replace '"quote":\s*\{\s*\}', '"quote": []'
  $json = $json -replace '"task":\s*\{\s*\}', '"task": []'
  $json = $json -replace '"activity":\s*\{\s*\}', '"activity": []'
  $json = $json -replace '"operation":\s*\{\s*\}', '"operation": []'
  $json = $json -replace '"provider":\s*\{\s*\}', '"provider": []'
  $json = $json -replace '"document":\s*\{\s*\}', '"document": []'
  $json = $json -replace '"mailoutbox":\s*\{\s*\}', '"mailoutbox": []'
  $json = $json -replace '"changes":\s*\{\s*\}', '"changes": []'
  Set-Content -LiteralPath $ApiV1StorePath -Value $json -Encoding UTF8
}

function Get-ApiV1EntityConfig {
  param([string]$EntityKind)

  switch ($EntityKind) {
    "customer" {
      return @{
        entityKind = "customer"
        storageKey = "customer"
        idPrefix = "cus"
        supportsArchive = $true
        appendOnly = $false
        required = @("nombre", "empresa", "contactoPrincipal", "ciudad", "pais", "tipoCliente")
        requiredAnyOf = @(@("telefono", "email"))
        relationFields = @()
        searchFields = @("nombre", "empresa", "contactoPrincipal", "telefono", "email", "ciudad", "pais", "tipoCliente", "datosGenerales", "condicionesPactadas", "observacionesClave")
        sortField = "empresa"
        sortDescending = $false
      }
    }
    "quote" {
      return @{
        entityKind = "quote"
        storageKey = "quote"
        idPrefix = "quo"
        supportsArchive = $true
        appendOnly = $false
        required = @("customerId", "origen", "destino", "paisOrigen", "paisDestino", "tipoOperacion", "modoTransporte", "proveedor", "costoProveedor", "margenPct", "moneda")
        requiredAnyOf = @()
        relationFields = @("customerId", "providerId")
        searchFields = @(
          "cliente",
          "origen",
          "destino",
          "paisOrigen",
          "paisDestino",
          "tipoOperacion",
          "modoTransporte",
          "proveedor",
          "providerId",
          "providerName",
          "providerStatus",
          "providerRequestedAt",
          "providerReceivedAt",
          "providerConfirmedAt",
          "providerRequestCount",
          "providerResponseCount",
          "providerOptionCount",
          "providerSelectedProviderId",
          "providerSelectedProviderName",
          "providerComparisonSummary",
          "observaciones",
          "moneda",
          "providerWorkflowSummary"
        )
        sortField = "updatedAt"
        sortDescending = $true
      }
    }
    "task" {
      return @{
        entityKind = "task"
        storageKey = "task"
        idPrefix = "task"
        supportsArchive = $true
        appendOnly = $false
        required = @("customerId", "tarea", "prioridad", "fechaCompromiso", "estado")
        requiredAnyOf = @()
        relationFields = @("customerId", "operationId")
        searchFields = @("cliente", "tarea", "prioridad", "estado", "observaciones", "customerId", "operationId")
        sortField = "updatedAt"
        sortDescending = $true
      }
    }
    "activity" {
      return @{
        entityKind = "activity"
        storageKey = "activity"
        idPrefix = "act"
        supportsArchive = $false
        appendOnly = $true
        required = @("at", "type", "label", "tone", "title", "details")
        requiredAnyOf = @()
        relationFields = @("customerId", "operationId")
        searchFields = @("label", "title", "details", "type", "source", "entityKind", "entityId", "customerId", "operationId")
        sortField = "at"
        sortDescending = $true
      }
    }
    "operation" {
      return @{
        entityKind = "operation"
        storageKey = "operation"
        idPrefix = "op"
        supportsArchive = $true
        appendOnly = $false
        required = @("customerId", "tipoOperacion", "referencia", "contenedor", "origen", "destino", "estadoOperacion", "riesgo")
        requiredAnyOf = @(@("customerId", "clientId"))
        relationFields = @("customerId")
        searchFields = @("referencia", "contenedor", "tipoOperacion", "origen", "destino", "poloLogistico", "despachanteUY", "despachantePY", "estadoOperacion", "riesgo", "observaciones", "customerId", "clientId")
        sortField = "updatedAt"
        sortDescending = $true
      }
    }
    "provider" {
      return @{
        entityKind = "provider"
        storageKey = "provider"
        idPrefix = "prov"
        supportsArchive = $true
        appendOnly = $false
        required = @("nombre", "contacto", "tipoUnidad", "configuracion")
        requiredAnyOf = @(@("telefono", "email"))
        relationFields = @("customerId")
        searchFields = @(
          "nombre",
          "razonSocial",
          "contacto",
          "telefono",
          "email",
          "tipoUnidad",
          "configuracion",
          "apertura",
          "usoTipico",
          "zona",
          "pais",
          "disponibilidad",
          "observaciones",
          "routesSummary",
          "tripsSummary",
          "documentsSummary",
          "operationalSummary",
          "coverageSummary"
        )
        sortField = "updatedAt"
        sortDescending = $true
      }
    }
    "document" {
      return @{
        entityKind = "document"
        storageKey = "document"
        idPrefix = "doc"
        supportsArchive = $true
        appendOnly = $false
        required = @("title", "documentType", "format", "status")
        requiredAnyOf = @(@("quoteId", "customerId", "providerId", "operationId"))
        relationFields = @("quoteId", "customerId", "providerId", "operationId")
        searchFields = @(
          "title",
          "documentType",
          "format",
          "status",
          "exportStatus",
          "fileName",
          "mimeType",
          "quoteId",
          "customerId",
          "providerId",
          "operationId",
          "recipient",
          "subject",
          "exportFormat",
          "exportBasePath",
          "exportFileCount",
          "exportReady",
          "exportSummary",
          "exportWarnings",
          "exportRelations",
          "exportCapabilities",
          "exportFiles",
          "contentText"
        )
        sortField = "updatedAt"
        sortDescending = $true
      }
    }
    "mailoutbox" {
      return @{
        entityKind = "mailoutbox"
        storageKey = "mailoutbox"
        idPrefix = "mail"
        supportsArchive = $true
        appendOnly = $false
        required = @("recipient", "subject", "body", "status")
        requiredAnyOf = @(@("documentId", "quoteId", "customerId", "providerId", "operationId"))
        relationFields = @("documentId", "quoteId", "customerId", "providerId", "operationId")
        searchFields = @(
          "recipient",
          "subject",
          "body",
          "status",
          "channel",
          "mailboxProfileId",
          "documentId",
          "quoteId",
          "customerId",
          "providerId",
          "operationId",
          "deliveryStatus",
          "providerKind",
          "attachmentSummary",
          "attachmentCount",
          "attachmentWarnings",
          "attachments",
          "providerMetadata"
        )
        sortField = "updatedAt"
        sortDescending = $true
      }
    }
    default {
      return $null
    }
  }
}

function Get-ApiV1EntityRecords {
  param(
    [object]$Store,
    [string]$EntityKind
  )

  if (-not $Store -or -not $Store.entities) {
    return @()
  }

  $records = $Store.entities.$EntityKind
  return ConvertTo-ApiV1Array -Value $records
}

function Set-ApiV1EntityRecords {
  param(
    [object]$Store,
    [string]$EntityKind,
    [object[]]$Records
  )

  $Store.entities.$EntityKind = @($Records)
}

function Get-ApiV1RecordIndex {
  param(
    [object[]]$Records,
    [string]$Id
  )

  if (-not $Records -or [string]::IsNullOrWhiteSpace($Id)) {
    return -1
  }

  for ($i = 0; $i -lt $Records.Count; $i++) {
    if ([string]$Records[$i].id -and ([string]$Records[$i].id).Trim() -eq $Id.Trim()) {
      return $i
    }
  }

  return -1
}

function Get-ApiV1EntityRecordById {
  param(
    [object]$Store,
    [string]$EntityKind,
    [string]$Id
  )

  if ([string]::IsNullOrWhiteSpace($Id)) {
    return $null
  }

  return Get-ApiV1EntityRecords -Store $Store -EntityKind $EntityKind |
    Where-Object { ([string]$_.id).Trim() -eq $Id.Trim() } |
    Select-Object -First 1
}

function Get-ApiV1ChecklistObject {
  param([object]$Checklist)

  $source = ConvertTo-ApiV1Dictionary -Value $Checklist
  $normalized = @{}

  foreach ($key in $script:ApiV1OperationChecklistKeys) {
    $normalized[$key] = [bool]$source[$key]
  }

  return [pscustomobject]$normalized
}

function Normalize-ApiV1Record {
  param(
    [string]$EntityKind,
    [object]$Record,
    [object]$ExistingRecord = $null
  )

  $config = Get-ApiV1EntityConfig -EntityKind $EntityKind
  if (-not $config) {
    throw "Entidad no soportada: $EntityKind"
  }

  $source = ConvertTo-ApiV1Dictionary -Value $Record
  $existing = ConvertTo-ApiV1Dictionary -Value $ExistingRecord

  if ([string]::IsNullOrWhiteSpace([string]$source.id) -and -not [string]::IsNullOrWhiteSpace([string]$existing.id)) {
    $source.id = [string]$existing.id
  }

  if ([string]::IsNullOrWhiteSpace([string]$source.id)) {
    $source.id = New-ApiV1RecordId -Prefix $config.idPrefix
  }

  if ($EntityKind -eq "operation") {
    $customerId = [string]$source.customerId
    if ([string]::IsNullOrWhiteSpace($customerId)) {
      $customerId = [string]$source.clientId
    }
    if ([string]::IsNullOrWhiteSpace($customerId)) {
      $customerId = [string]$existing.customerId
    }
    if ([string]::IsNullOrWhiteSpace($customerId)) {
      $customerId = [string]$existing.clientId
    }
    $customerId = $customerId.Trim()
    $source.customerId = $customerId
    $source.clientId = $customerId
  }

  if ($EntityKind -eq "activity" -and [string]::IsNullOrWhiteSpace([string]$source.at)) {
    $source.at = if (-not [string]::IsNullOrWhiteSpace([string]$existing.at)) { [string]$existing.at } else { Get-ApiV1NowIso }
  }

  if ([string]::IsNullOrWhiteSpace([string]$source.createdAt)) {
    $source.createdAt = if (-not [string]::IsNullOrWhiteSpace([string]$existing.createdAt)) { [string]$existing.createdAt } else { Get-ApiV1NowIso }
  }

  if ($EntityKind -eq "activity") {
    if ([string]::IsNullOrWhiteSpace([string]$source.updatedAt)) {
      $source.updatedAt = if (-not [string]::IsNullOrWhiteSpace([string]$existing.updatedAt)) { [string]$existing.updatedAt } else { [string]$source.createdAt }
    }
  } elseif ([string]::IsNullOrWhiteSpace([string]$source.updatedAt)) {
    $source.updatedAt = Get-ApiV1NowIso
  }

  if ($config.supportsArchive) {
    if (-not $source.ContainsKey("archivedAt")) {
      $source.archivedAt = if ($existing.ContainsKey("archivedAt")) { $existing.archivedAt } else { $null }
    } elseif ($null -eq $source.archivedAt) {
      $source.archivedAt = $null
    }
  } else {
    $source.Remove("archivedAt") | Out-Null
  }

  switch ($EntityKind) {
    "customer" {
      foreach ($field in @("nombre", "empresa", "contactoPrincipal", "telefono", "email", "tipoCliente", "ciudad", "pais", "datosGenerales", "condicionesPactadas", "observacionesClave")) {
        if ($source.ContainsKey($field) -and $null -ne $source[$field]) {
          $source[$field] = ([string]$source[$field]).Trim()
        }
      }
    }
    "quote" {
      foreach ($field in @("customerId", "providerId", "cliente", "origen", "destino", "paisOrigen", "paisDestino", "tipoOperacion", "modoTransporte", "proveedor", "providerName", "providerStatus", "providerRequestedAt", "providerReceivedAt", "providerConfirmedAt", "providerSelectedProviderId", "providerSelectedProviderName", "providerRequestMessage", "providerResponseMessage", "observaciones", "estado", "moneda")) {
        if ($source.ContainsKey($field) -and $null -ne $source[$field]) {
          $source[$field] = ([string]$source[$field]).Trim()
        }
      }

      if ([string]::IsNullOrWhiteSpace([string]$source.providerName) -and -not [string]::IsNullOrWhiteSpace([string]$source.proveedor)) {
        $source.providerName = [string]$source.proveedor
      }

      if ([string]::IsNullOrWhiteSpace([string]$source.providerStatus)) {
        if (-not [string]::IsNullOrWhiteSpace([string]$source.providerConfirmedAt)) {
          $source.providerStatus = "confirmed"
        } elseif (-not [string]::IsNullOrWhiteSpace([string]$source.providerReceivedAt)) {
          $source.providerStatus = "received"
        } elseif (-not [string]::IsNullOrWhiteSpace([string]$source.providerRequestedAt)) {
          $source.providerStatus = "requested"
        } else {
          $source.providerStatus = "draft"
        }
      }

      $source.providerWorkflow = Get-ApiV1QuoteProviderWorkflow -Quote ([pscustomobject]$source)
      $source.providerWorkflowSummary = Get-ApiV1SerializedSummary -Value $source.providerWorkflow
      $source.providerRequestCount = [int]($source.providerWorkflow.requests.Count)
      $source.providerResponseCount = [int]($source.providerWorkflow.responses.Count)
      $source.providerOptionCount = [int]($source.providerWorkflow.options.Count)
    }
    "task" {
      foreach ($field in @("customerId", "operationId", "cliente", "tarea", "prioridad", "fechaCompromiso", "recordatorio", "estado", "observaciones")) {
        if ($source.ContainsKey($field) -and $null -ne $source[$field]) {
          $source[$field] = ([string]$source[$field]).Trim()
        }
      }
    }
    "activity" {
      foreach ($field in @("at", "type", "label", "tone", "title", "details", "customerId", "entityKind", "entityId", "operationId", "source")) {
        if ($source.ContainsKey($field) -and $null -ne $source[$field]) {
          $source[$field] = ([string]$source[$field]).Trim()
        }
      }
      if ($source.ContainsKey("metadata") -and $source.metadata) {
        $source.metadata = $source.metadata
      }
    }
    "operation" {
      foreach ($field in @("customerId", "clientId", "tipoOperacion", "referencia", "contenedor", "origen", "destino", "fechaArribo", "fechaCarga", "fechaDevolucion", "poloLogistico", "despachanteUY", "despachantePY", "estadoOperacion", "riesgo", "observaciones")) {
        if ($source.ContainsKey($field) -and $null -ne $source[$field]) {
          $source[$field] = ([string]$source[$field]).Trim()
        }
      }
      $source.documentChecklist = Get-ApiV1ChecklistObject -Checklist $source.documentChecklist
    }
    "provider" {
      foreach ($field in @("nombre", "razonSocial", "contacto", "telefono", "email", "tipoUnidad", "tipoCamion", "configuracion", "configuracionUnidad", "apertura", "usoTipico", "zona", "pais", "disponibilidad", "observaciones")) {
        if ($source.ContainsKey($field) -and $null -ne $source[$field]) {
          $source[$field] = ConvertTo-ApiV1NormalizedText -Value $source[$field]
        }
      }

      if ([string]::IsNullOrWhiteSpace([string]$source.nombre)) {
        $source.nombre = if (-not [string]::IsNullOrWhiteSpace([string]$source.razonSocial)) { [string]$source.razonSocial } else { [string]$existing.nombre }
      }
      if ([string]::IsNullOrWhiteSpace([string]$source.contacto)) {
        $source.contacto = if (-not [string]::IsNullOrWhiteSpace([string]$source.contactoPrincipal)) { [string]$source.contactoPrincipal } else { [string]$existing.contacto }
      }
      if ([string]::IsNullOrWhiteSpace([string]$source.tipoUnidad)) {
        $source.tipoUnidad = if (-not [string]::IsNullOrWhiteSpace([string]$source.tipoCamion)) { [string]$source.tipoCamion } else { [string]$existing.tipoUnidad }
      }
      if ([string]::IsNullOrWhiteSpace([string]$source.configuracion)) {
        $source.configuracion = if (-not [string]::IsNullOrWhiteSpace([string]$source.configuracionUnidad)) { [string]$source.configuracionUnidad } else { [string]$existing.configuracion }
      }

      $normalizedType = [string]$source.tipoUnidad
      $normalizedConfig = [string]$source.configuracion
      if ($normalizedType.Trim().ToLowerInvariant() -in @("semi sider", "semisider", "semi-sider")) {
        $normalizedType = "Sider"
        if ([string]::IsNullOrWhiteSpace($normalizedConfig)) {
          $normalizedConfig = "Semirremolque"
        }
      }
      if ($normalizedConfig.Trim().ToLowerInvariant() -eq "semi sider") {
        $normalizedConfig = "Semirremolque"
      }
      if ($normalizedConfig.Trim().ToLowerInvariant() -eq "semirremolque" -and [string]::IsNullOrWhiteSpace($normalizedType)) {
        $normalizedType = "Sider"
      }

      $source.tipoUnidad = $normalizedType
      $source.configuracion = $normalizedConfig

      if ($source.ContainsKey("routes") -and $source.routes) {
        $source.routes = ConvertTo-ApiV1Array -Value $source.routes
      } elseif ($source.ContainsKey("coverage") -and $source.coverage) {
        $source.routes = ConvertTo-ApiV1Array -Value $source.coverage
      } elseif ($source.ContainsKey("cobertura") -and $source.cobertura) {
        $source.routes = ConvertTo-ApiV1Array -Value $source.cobertura
      } elseif ($source.ContainsKey("rutas") -and $source.rutas) {
        $source.routes = ConvertTo-ApiV1Array -Value $source.rutas
      } elseif ($existing.ContainsKey("routes")) {
        $source.routes = ConvertTo-ApiV1Array -Value $existing.routes
      }

      if ($source.ContainsKey("trips") -and $source.trips) {
        $source.trips = ConvertTo-ApiV1Array -Value $source.trips
      } elseif ($existing.ContainsKey("trips")) {
        $source.trips = ConvertTo-ApiV1Array -Value $existing.trips
      }

      if ($source.ContainsKey("documents") -and $source.documents) {
        $source.documents = ConvertTo-ApiV1Array -Value $source.documents
      } elseif ($existing.ContainsKey("documents")) {
        $source.documents = ConvertTo-ApiV1Array -Value $existing.documents
      }

      $source.routesSummary = Get-ApiV1SerializedSummary -Value $source.routes
      $source.coverageSummary = if (-not [string]::IsNullOrWhiteSpace([string]$source.zona)) { [string]$source.zona } else { Get-ApiV1SerializedSummary -Value $source.routes }
      $source.tripsSummary = Get-ApiV1SerializedSummary -Value $source.trips
      $source.documentsSummary = Get-ApiV1SerializedSummary -Value $source.documents
      $source.operationalSummary = Get-ApiV1SerializedSummary -Value ([pscustomobject]@{
        chofer = $source.chofer
        driver = $source.driver
        camion = $source.camion
        truck = $source.truck
        mic = $source.mic
        dua = $source.dua
        crt = $source.crt
      })
    }
    "document" {
      foreach ($field in @("title", "documentType", "format", "status", "fileName", "mimeType", "contentText", "recipient", "subject", "body", "exportFormat", "exportStatus", "sourceKind", "sourceId", "templateId", "storageKind")) {
        if ($source.ContainsKey($field) -and $null -ne $source[$field]) {
          $source[$field] = ConvertTo-ApiV1NormalizedText -Value $source[$field]
        }
      }

      if ([string]::IsNullOrWhiteSpace([string]$source.documentType) -and -not [string]::IsNullOrWhiteSpace([string]$source.type)) {
        $source.documentType = [string]$source.type
      }
      if ([string]::IsNullOrWhiteSpace([string]$source.format) -and -not [string]::IsNullOrWhiteSpace([string]$source.exportFormat)) {
        $source.format = [string]$source.exportFormat
      }
      if ([string]::IsNullOrWhiteSpace([string]$source.exportFormat)) {
        $source.exportFormat = if ([string]::IsNullOrWhiteSpace([string]$source.format)) { "editable" } else { [string]$source.format }
      }
      if ([string]::IsNullOrWhiteSpace([string]$source.status)) {
        if (-not [string]::IsNullOrWhiteSpace([string]$source.sentAt)) {
          $source.status = "sent"
        } elseif (-not [string]::IsNullOrWhiteSpace([string]$source.exportedAt)) {
          $source.status = "exported"
        } else {
          $source.status = "draft"
        }
      }
      if ([string]::IsNullOrWhiteSpace([string]$source.mimeType)) {
        $source.mimeType = if ($source.exportFormat -match "pdf") { "application/pdf" } elseif ($source.exportFormat -match "word|docx") { "application/vnd.openxmlformats-officedocument.wordprocessingml.document" } else { "text/plain" }
      }

      $source.exportFiles = ConvertTo-ApiV1Array -Value $source.exportFiles
      $source.exportWarnings = ConvertTo-ApiV1Array -Value $source.exportWarnings
      $source.exportRelations = if ($source.exportRelations) { ConvertTo-ApiV1Dictionary -Value $source.exportRelations } else { @{} }
      $source.exportCapabilities = if ($source.exportCapabilities) { ConvertTo-ApiV1Dictionary -Value $source.exportCapabilities } else { @{} }
      $source.exportSummary = if ($source.exportSummary) { ConvertTo-ApiV1Dictionary -Value $source.exportSummary } else { @{} }
      $source.exportFileCount = if ($source.exportFileCount) { [int]$source.exportFileCount } elseif ($source.exportFiles) { @($source.exportFiles).Count } else { 0 }
      $source.exportReady = if ($null -ne $source.exportReady) { [bool]$source.exportReady } else { [bool]($source.exportFileCount -gt 0 -and ($source.exportStatus -eq "exported")) }
      $source.exportBasePath = ConvertTo-ApiV1NormalizedText -Value $source.exportBasePath

      foreach ($field in @("quoteId", "customerId", "providerId", "operationId", "entityKind", "entityId")) {
        if ($source.ContainsKey($field) -and $null -ne $source[$field]) {
          $source[$field] = ConvertTo-ApiV1NormalizedText -Value $source[$field]
        }
      }

      $source.relationSummary = Get-ApiV1SerializedSummary -Value ([pscustomobject]@{
        quoteId = $source.quoteId
        customerId = $source.customerId
        providerId = $source.providerId
        operationId = $source.operationId
        entityKind = $source.entityKind
        entityId = $source.entityId
      })
    }
    "mailoutbox" {
      foreach ($field in @("recipient", "subject", "body", "bodyHtml", "status", "channel", "deliveryStatus", "providerKind", "quoteId", "customerId", "providerId", "operationId", "documentId", "mailboxProfileId", "folder", "messageId", "mailboxUid", "verificationUid", "exportError")) {
        if ($source.ContainsKey($field) -and $null -ne $source[$field]) {
          $source[$field] = ConvertTo-ApiV1NormalizedText -Value $source[$field]
        }
      }

      if ([string]::IsNullOrWhiteSpace([string]$source.channel)) {
        $source.channel = "email"
      }
      if ([string]::IsNullOrWhiteSpace([string]$source.status)) {
        $source.status = "queued"
      }
      if ([string]::IsNullOrWhiteSpace([string]$source.deliveryStatus)) {
        $source.deliveryStatus = [string]$source.status
      }
      if ([string]::IsNullOrWhiteSpace([string]$source.queuedAt) -and [string]$source.status -eq "queued") {
        $source.queuedAt = Get-ApiV1NowIso
      }
      if ([string]::IsNullOrWhiteSpace([string]$source.sentAt) -and [string]$source.status -eq "sent") {
        $source.sentAt = Get-ApiV1NowIso
      }

      $source.attachments = ConvertTo-ApiV1Array -Value $source.attachments
      $source.attachmentWarnings = ConvertTo-ApiV1Array -Value $source.attachmentWarnings
      $source.attachmentCount = if ($source.attachmentCount) { [int]$source.attachmentCount } elseif ($source.attachments) { @($source.attachments).Count } else { 0 }
      $source.attachmentSummary = Get-ApiV1SerializedSummary -Value (ConvertTo-ApiV1Array -Value $source.attachments)
      $source.relationSummary = Get-ApiV1SerializedSummary -Value ([pscustomobject]@{
        documentId = $source.documentId
        quoteId = $source.quoteId
        customerId = $source.customerId
        providerId = $source.providerId
        operationId = $source.operationId
      })
    }
  }

  if ($EntityKind -eq "operation" -and [string]::IsNullOrWhiteSpace([string]$source.customerId)) {
    $source.customerId = [string]$source.clientId
  }

  return [pscustomobject]$source
}

function Test-ApiV1TextMatch {
  param(
    [object]$Record,
    [string[]]$Fields,
    [string]$Query
  )

  if ([string]::IsNullOrWhiteSpace($Query)) {
    return $true
  }

  $needle = $Query.Trim().ToLowerInvariant()
  foreach ($field in $Fields) {
    $value = [string]$Record.$field
    if (-not [string]::IsNullOrWhiteSpace($value) -and $value.ToLowerInvariant().Contains($needle)) {
      return $true
    }
  }

  return $false
}

function Test-ApiV1DateFilter {
  param(
    [string]$Value,
    [string]$Minimum = "",
    [string]$Maximum = ""
  )

  if (-not [string]::IsNullOrWhiteSpace($Minimum) -and ([string]$Value).Trim() -lt $Minimum.Trim()) {
    return $false
  }

  if (-not [string]::IsNullOrWhiteSpace($Maximum) -and ([string]$Value).Trim() -gt $Maximum.Trim()) {
    return $false
  }

  return $true
}

function Test-ApiV1RecordFilters {
  param(
    [string]$EntityKind,
    [object]$Record,
    [hashtable]$Query
  )

  $config = Get-ApiV1EntityConfig -EntityKind $EntityKind
  if (-not $config) {
    return $false
  }

  $archived = [bool]($Query.archived -match "^(1|true|yes|on)$")
  if ($EntityKind -ne "activity" -and -not $archived -and -not [string]::IsNullOrWhiteSpace([string]$Record.archivedAt)) {
    return $false
  }

  if (-not (Test-ApiV1TextMatch -Record $Record -Fields $config.searchFields -Query ([string]$Query.q))) {
    return $false
  }

  switch ($EntityKind) {
    "customer" {
      if (-not [string]::IsNullOrWhiteSpace([string]$Query.tipoCliente) -and ([string]$Record.tipoCliente).Trim() -ne ([string]$Query.tipoCliente).Trim()) {
        return $false
      }
    }
    "quote" {
      foreach ($field in @("customerId", "providerId", "providerStatus", "paisOrigen", "paisDestino", "tipoOperacion", "moneda")) {
        if (-not [string]::IsNullOrWhiteSpace([string]$Query[$field]) -and ([string]$Record.$field).Trim() -ne ([string]$Query[$field]).Trim()) {
          return $false
        }
      }
    }
    "task" {
      foreach ($field in @("customerId", "operationId", "estado", "prioridad")) {
        if (-not [string]::IsNullOrWhiteSpace([string]$Query[$field]) -and ([string]$Record.$field).Trim() -ne ([string]$Query[$field]).Trim()) {
          return $false
        }
      }

      if (-not [string]::IsNullOrWhiteSpace([string]$Query["dueBefore"]) -and ([string]$Record.fechaCompromiso).Trim() -gt ([string]$Query["dueBefore"]).Trim()) {
        return $false
      }
      if (-not [string]::IsNullOrWhiteSpace([string]$Query["dueAfter"]) -and ([string]$Record.fechaCompromiso).Trim() -lt ([string]$Query["dueAfter"]).Trim()) {
        return $false
      }
    }
    "activity" {
      foreach ($field in @("customerId", "operationId", "entityKind", "entityId", "source")) {
        if (-not [string]::IsNullOrWhiteSpace([string]$Query[$field]) -and ([string]$Record.$field).Trim() -ne ([string]$Query[$field]).Trim()) {
          return $false
        }
      }
      if (-not [string]::IsNullOrWhiteSpace([string]$Query["since"]) -and ([string]$Record.at).Trim() -lt ([string]$Query["since"]).Trim()) {
        return $false
      }
      if (-not [string]::IsNullOrWhiteSpace([string]$Query["until"]) -and ([string]$Record.at).Trim() -gt ([string]$Query["until"]).Trim()) {
        return $false
      }
    }
    "operation" {
      foreach ($field in @("customerId", "tipoOperacion", "estadoOperacion", "riesgo")) {
        if (-not [string]::IsNullOrWhiteSpace([string]$Query[$field]) -and ([string]$Record.$field).Trim() -ne ([string]$Query[$field]).Trim()) {
          return $false
        }
      }

      if (-not [string]::IsNullOrWhiteSpace([string]$Query.dueBefore)) {
        $candidate = if (-not [string]::IsNullOrWhiteSpace([string]$Record.fechaDevolucion)) { [string]$Record.fechaDevolucion } else { [string]$Record.fechaArribo }
        if ($candidate.Trim() -gt ([string]$Query.dueBefore).Trim()) {
          return $false
        }
      }
      if (-not [string]::IsNullOrWhiteSpace([string]$Query.dueAfter)) {
        $candidate = if (-not [string]::IsNullOrWhiteSpace([string]$Record.fechaDevolucion)) { [string]$Record.fechaDevolucion } else { [string]$Record.fechaArribo }
        if ($candidate.Trim() -lt ([string]$Query.dueAfter).Trim()) {
          return $false
        }
      }
    }
    "provider" {
      foreach ($field in @("tipoUnidad", "configuracion", "pais", "disponibilidad")) {
        if (-not [string]::IsNullOrWhiteSpace([string]$Query[$field]) -and ([string]$Record.$field).Trim() -ne ([string]$Query[$field]).Trim()) {
          return $false
        }
      }
    }
    "document" {
      foreach ($field in @("documentType", "format", "status", "quoteId", "customerId", "providerId", "operationId")) {
        if (-not [string]::IsNullOrWhiteSpace([string]$Query[$field]) -and ([string]$Record.$field).Trim() -ne ([string]$Query[$field]).Trim()) {
          return $false
        }
      }
    }
    "mailoutbox" {
      foreach ($field in @("status", "recipient", "documentId", "quoteId", "customerId", "providerId", "operationId")) {
        if (-not [string]::IsNullOrWhiteSpace([string]$Query[$field]) -and ([string]$Record.$field).Trim() -ne ([string]$Query[$field]).Trim()) {
          return $false
        }
      }
    }
  }

  return $true
}

function Get-ApiV1ValidationErrors {
  param(
    [string]$EntityKind,
    [object]$Record,
    [object]$Store = $null,
    [string]$Action = "create"
  )

  $config = Get-ApiV1EntityConfig -EntityKind $EntityKind
  $errors = @{}
  if (-not $config) {
    $errors.entityKind = "Entidad no soportada."
    return $errors
  }

  $source = ConvertTo-ApiV1Dictionary -Value $Record

  if ($Action -eq "update" -and [string]::IsNullOrWhiteSpace([string]$source.id)) {
    $errors.id = "Debes indicar el id."
  }

  foreach ($field in $config.required) {
    if ($EntityKind -eq "operation" -and $field -eq "customerId") {
      continue
    }
    if ([string]::IsNullOrWhiteSpace([string]$source[$field])) {
      $errors[$field] = "Campo obligatorio."
    }
  }

  $requiredAnyOfGroups = @()
  if ($config.requiredAnyOf) {
    $flatValues = @($config.requiredAnyOf)
    $containsNestedGroup = $false
    foreach ($candidate in $flatValues) {
      if ($candidate -is [System.Array]) {
        $containsNestedGroup = $true
        break
      }
    }

    if ($containsNestedGroup) {
      $requiredAnyOfGroups = @($config.requiredAnyOf)
    } elseif ($flatValues.Count -gt 0) {
      $requiredAnyOfGroups = ,$flatValues
    }
  }

  foreach ($group in $requiredAnyOfGroups) {
    $groupFields = if ($group -is [System.Array]) { @($group) } else { @([string]$group) }
    $hasValue = $false
    foreach ($field in $groupFields) {
      if (-not [string]::IsNullOrWhiteSpace([string]$source[$field])) {
        $hasValue = $true
        break
      }
    }
    if (-not $hasValue) {
      $label = (($groupFields | ForEach-Object { [string]$_ }) -join " o ")
      $errors[$groupFields[0]] = "Debes indicar al menos uno de: $label."
    }
  }

  if ($EntityKind -in @("quote", "task", "operation")) {
    $customerId = [string]$source.customerId
    if ($EntityKind -eq "operation" -and [string]::IsNullOrWhiteSpace($customerId)) {
      $customerId = [string]$source.clientId
    }
    if ([string]::IsNullOrWhiteSpace($customerId)) {
      $errors.customerId = "Selecciona un cliente."
    } elseif ($Store -and -not (Get-ApiV1EntityRecordById -Store $Store -EntityKind "customer" -Id $customerId)) {
      $errors.customerId = "Selecciona un cliente existente."
    }
  }

  if ($EntityKind -eq "quote" -and -not [string]::IsNullOrWhiteSpace([string]$source.providerId)) {
    if ($Store -and -not (Get-ApiV1EntityRecordById -Store $Store -EntityKind "provider" -Id ([string]$source.providerId))) {
      $errors.providerId = "Selecciona un proveedor existente."
    }
  }

  if ($EntityKind -eq "task") {
    if (-not [string]::IsNullOrWhiteSpace([string]$source.operationId) -and -not (Get-ApiV1EntityRecordById -Store $Store -EntityKind "operation" -Id ([string]$source.operationId))) {
      $errors.operationId = "Selecciona una operacion existente."
    }
  }

  if ($EntityKind -eq "provider") {
    if ([string]::IsNullOrWhiteSpace([string]$source.tipoUnidad)) {
      $errors.tipoUnidad = "Debes indicar el tipo de unidad."
    }
    if ([string]::IsNullOrWhiteSpace([string]$source.configuracion)) {
      $errors.configuracion = "Debes indicar la configuracion."
    }
  }

  if ($EntityKind -eq "document") {
    foreach ($field in @("quoteId", "customerId", "providerId", "operationId")) {
      if (-not [string]::IsNullOrWhiteSpace([string]$source[$field])) {
        if ($Store -and -not (Get-ApiV1EntityRecordById -Store $Store -EntityKind ($field -replace "Id$","") -Id ([string]$source[$field]))) {
          $errors[$field] = "Selecciona un registro existente."
        }
      }
    }
  }

  if ($EntityKind -eq "mailoutbox") {
    foreach ($field in @("documentId", "quoteId", "customerId", "providerId", "operationId")) {
      if (-not [string]::IsNullOrWhiteSpace([string]$source[$field])) {
        $entityKind = switch ($field) {
          "documentId" { "document" }
          "quoteId" { "quote" }
          "customerId" { "customer" }
          "providerId" { "provider" }
          "operationId" { "operation" }
        }
        if ($Store -and -not (Get-ApiV1EntityRecordById -Store $Store -EntityKind $entityKind -Id ([string]$source[$field]))) {
          $errors[$field] = "Selecciona un registro existente."
        }
      }
    }
  }

  if ($EntityKind -eq "operation" -and -not [string]::IsNullOrWhiteSpace([string]$source.clientId)) {
    $source.customerId = [string]$source.clientId
  }

  return $errors
}

function New-ApiV1Response {
  param(
    [int]$StatusCode = 200,
    [string]$ReasonPhrase = "OK",
    [string]$EntityKind = "",
    [string]$Action = "",
    [object]$Data = $null,
    [object]$Meta = $null
  )

  return [pscustomobject]@{
    statusCode = $StatusCode
    reasonPhrase = $ReasonPhrase
    body = [pscustomobject]@{
      ok = $true
      apiVersion = "v1"
      domainVersion = 3
      entityKind = $EntityKind
      action = $Action
      data = $Data
      meta = if ($Meta) { $Meta } else { [pscustomobject]@{} }
    }
  }
}

function New-ApiV1ErrorResponse {
  param(
    [int]$StatusCode = 400,
    [string]$ReasonPhrase = "Bad Request",
    [string]$EntityKind = "",
    [string]$Action = "",
    [string]$Code = "VALIDATION_ERROR",
    [string]$Message = "No fue posible completar la operacion.",
    [hashtable]$FieldErrors = @{},
    [object]$Details = $null
  )

  return [pscustomobject]@{
    statusCode = $StatusCode
    reasonPhrase = $ReasonPhrase
    body = [pscustomobject]@{
      ok = $false
      error = [pscustomobject]@{
        code = $Code
        message = $Message
        fieldErrors = [pscustomobject]$FieldErrors
        entityKind = $EntityKind
        action = $Action
        details = $Details
      }
    }
  }
}

function Add-ApiV1Change {
  param(
    [object]$Store,
    [string]$EntityKind,
    [string]$Action,
    [object]$Record
  )

  $seq = [int]$Store.nextSequence
  if ($seq -lt 1) {
    $seq = 1
  }
  $Store.nextSequence = $seq + 1

  $snapshot = if ($Record) { $Record } else { $null }
  $change = [pscustomobject]@{
    seq = $seq
    entityKind = $EntityKind
    action = $Action
    id = [string]$Record.id
    at = Get-ApiV1NowIso
    record = $snapshot
  }

  $Store.changes = @($Store.changes) + $change
  return $change
}

function Get-ApiV1SortedRecords {
  param(
    [string]$EntityKind,
    [object[]]$Records
  )

  if (-not $Records -or @($Records).Count -eq 0) {
    return @()
  }

  switch ($EntityKind) {
    "customer" {
      $sorted = @($Records | Sort-Object -Property @{ Expression = { [string]$_.empresa }; Descending = $false }, @{ Expression = { [string]$_.nombre }; Descending = $false })
      if ($sorted.Count -eq 1 -and $null -eq $sorted[0]) { return @() }
      return $sorted
    }
    "activity" {
      $sorted = @($Records | Sort-Object -Property @{ Expression = { [string]$_.at }; Descending = $true }, @{ Expression = { [string]$_.updatedAt }; Descending = $true })
      if ($sorted.Count -eq 1 -and $null -eq $sorted[0]) { return @() }
      return $sorted
    }
    default {
      $sorted = @($Records | Sort-Object -Property @{ Expression = { [string]$_.updatedAt }; Descending = $true }, @{ Expression = { [string]$_.createdAt }; Descending = $true })
      if ($sorted.Count -eq 1 -and $null -eq $sorted[0]) { return @() }
      return $sorted
    }
  }
}

function Get-ApiV1PagedRecords {
  param(
    [string]$EntityKind,
    [object[]]$Records,
    [hashtable]$Query
  )

  $limit = 50
  [void][int]::TryParse([string]$Query.limit, [ref]$limit)
  if ($limit -lt 1) { $limit = 50 }
  if ($limit -gt 250) { $limit = 250 }

  $cursor = 0
  [void][int]::TryParse([string]$Query.cursor, [ref]$cursor)
  if ($cursor -lt 0) { $cursor = 0 }

  $page = @($Records | Select-Object -Skip $cursor -First $limit)
  if ($page.Count -eq 1 -and $null -eq $page[0]) {
    $page = @()
  }
  $nextCursor = if (($cursor + $page.Count) -lt $Records.Count) { $cursor + $page.Count } else { $null }

  return [pscustomobject]@{
    items = $page
    count = $page.Count
    limit = $limit
    cursor = $cursor
    nextCursor = $nextCursor
    hasMore = [bool]($null -ne $nextCursor)
  }
}

function Invoke-ApiV1CreateRecord {
  param(
    [object]$Store,
    [string]$EntityKind,
    [object]$Record
  )

  $config = Get-ApiV1EntityConfig -EntityKind $EntityKind
  $errors = Get-ApiV1ValidationErrors -EntityKind $EntityKind -Record $Record -Store $Store -Action "create"
  if ($errors.Count -gt 0) {
    return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind $EntityKind -Action "create" -Message "Validacion fallida." -FieldErrors $errors
  }

  $normalized = Normalize-ApiV1Record -EntityKind $EntityKind -Record $Record
  if (Get-ApiV1EntityRecordById -Store $Store -EntityKind $EntityKind -Id ([string]$normalized.id)) {
    return New-ApiV1ErrorResponse -StatusCode 409 -ReasonPhrase "Conflict" -EntityKind $EntityKind -Action "create" -Code "CONFLICT" -Message "Ya existe un registro con ese id." -Details @{ id = [string]$normalized.id }
  }

  $records = @(Get-ApiV1EntityRecords -Store $Store -EntityKind $EntityKind) + $normalized
  Set-ApiV1EntityRecords -Store $Store -EntityKind $EntityKind -Records $records
  $change = Add-ApiV1Change -Store $Store -EntityKind $EntityKind -Action "create" -Record $normalized
  Save-ApiV1Store -Store $Store

  return New-ApiV1Response -StatusCode 201 -ReasonPhrase "Created" -EntityKind $EntityKind -Action "create" -Data $normalized -Meta ([pscustomobject]@{ change = $change; source = "api-v1" })
}

function Invoke-ApiV1UpdateRecord {
  param(
    [object]$Store,
    [string]$EntityKind,
    [string]$Id,
    [object]$Record
  )

  if ([string]::IsNullOrWhiteSpace($Id)) {
    return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind $EntityKind -Action "update" -Message "Debes indicar el id."
  }

  $existing = Get-ApiV1EntityRecordById -Store $Store -EntityKind $EntityKind -Id $Id
  if (-not $existing) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind $EntityKind -Action "update" -Code "NOT_FOUND" -Message "No se encontro el registro."
  }

  $merged = ConvertTo-ApiV1Dictionary -Value $existing
  $incoming = ConvertTo-ApiV1Dictionary -Value $Record
  foreach ($key in $incoming.Keys) {
    if ($key -eq "createdAt") {
      continue
    }
    $merged[$key] = $incoming[$key]
  }
  $merged.id = $Id
  $normalized = Normalize-ApiV1Record -EntityKind $EntityKind -Record ([pscustomobject]$merged) -ExistingRecord $existing
  $errors = Get-ApiV1ValidationErrors -EntityKind $EntityKind -Record $normalized -Store $Store -Action "update"
  if ($errors.Count -gt 0) {
    return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind $EntityKind -Action "update" -Message "Validacion fallida." -FieldErrors $errors
  }

  $records = @(Get-ApiV1EntityRecords -Store $Store -EntityKind $EntityKind)
  $index = Get-ApiV1RecordIndex -Records $records -Id $Id
  if ($index -lt 0) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind $EntityKind -Action "update" -Code "NOT_FOUND" -Message "No se encontro el registro."
  }

  $records[$index] = $normalized
  Set-ApiV1EntityRecords -Store $Store -EntityKind $EntityKind -Records $records
  $change = Add-ApiV1Change -Store $Store -EntityKind $EntityKind -Action "update" -Record $normalized
  Save-ApiV1Store -Store $Store

  return New-ApiV1Response -EntityKind $EntityKind -Action "update" -Data $normalized -Meta ([pscustomobject]@{ change = $change; source = "api-v1" })
}

function Invoke-ApiV1ArchiveRecord {
  param(
    [object]$Store,
    [string]$EntityKind,
    [string]$Id,
    [bool]$Archived = $true
  )

  $existing = Get-ApiV1EntityRecordById -Store $Store -EntityKind $EntityKind -Id $Id
  if (-not $existing) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind $EntityKind -Action $(if ($Archived) { "archive" } else { "unarchive" }) -Code "NOT_FOUND" -Message "No se encontro el registro."
  }

  $payload = ConvertTo-ApiV1Dictionary -Value $existing
  $payload.archivedAt = if ($Archived) { Get-ApiV1NowIso } else { $null }
  $normalized = Normalize-ApiV1Record -EntityKind $EntityKind -Record ([pscustomobject]$payload) -ExistingRecord $existing
  $records = @(Get-ApiV1EntityRecords -Store $Store -EntityKind $EntityKind)
  $index = Get-ApiV1RecordIndex -Records $records -Id $Id
  if ($index -lt 0) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind $EntityKind -Action $(if ($Archived) { "archive" } else { "unarchive" }) -Code "NOT_FOUND" -Message "No se encontro el registro."
  }

  $records[$index] = $normalized
  Set-ApiV1EntityRecords -Store $Store -EntityKind $EntityKind -Records $records
  $change = Add-ApiV1Change -Store $Store -EntityKind $EntityKind -Action $(if ($Archived) { "archive" } else { "unarchive" }) -Record $normalized
  Save-ApiV1Store -Store $Store

  return New-ApiV1Response -EntityKind $EntityKind -Action $(if ($Archived) { "archive" } else { "unarchive" }) -Data $normalized -Meta ([pscustomobject]@{ change = $change; source = "api-v1" })
}

function Invoke-ApiV1ExportDocument {
  param(
    [object]$Store,
    [string]$Id,
    [object]$Body
  )

  $existing = Get-ApiV1EntityRecordById -Store $Store -EntityKind "document" -Id $Id
  if (-not $existing) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind "document" -Action "export" -Code "NOT_FOUND" -Message "No se encontro el documento."
  }

  $incoming = ConvertTo-ApiV1Dictionary -Value $Body
  $exportFormat = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.exportFormat)) { [string]$incoming.exportFormat } elseif (-not [string]::IsNullOrWhiteSpace([string]$existing.exportFormat)) { [string]$existing.exportFormat } elseif (-not [string]::IsNullOrWhiteSpace([string]$existing.format)) { [string]$existing.format } else { "bundle" }
  $payload = [pscustomobject]@{
    document = $existing
    customer = if (-not [string]::IsNullOrWhiteSpace([string]$existing.customerId)) { Get-ApiV1EntityRecordById -Store $Store -EntityKind "customer" -Id ([string]$existing.customerId) } else { $null }
    quote = if (-not [string]::IsNullOrWhiteSpace([string]$existing.quoteId)) { Get-ApiV1EntityRecordById -Store $Store -EntityKind "quote" -Id ([string]$existing.quoteId) } else { $null }
    provider = if (-not [string]::IsNullOrWhiteSpace([string]$existing.providerId)) { Get-ApiV1EntityRecordById -Store $Store -EntityKind "provider" -Id ([string]$existing.providerId) } else { $null }
    operation = if (-not [string]::IsNullOrWhiteSpace([string]$existing.operationId)) { Get-ApiV1EntityRecordById -Store $Store -EntityKind "operation" -Id ([string]$existing.operationId) } else { $null }
    outputDir = $script:ApiV1GeneratedDocumentsRoot
    exportFormat = $exportFormat
  }

  $helperScript = Join-Path $PSScriptRoot "integrations\commercial_document_export.py"
  $helperResult = Invoke-ApiV1PythonHelper -ScriptPath $helperScript -Payload $payload
  if (-not $helperResult.ok -or -not $helperResult.result) {
    return New-ApiV1ErrorResponse -StatusCode 502 -ReasonPhrase "Bad Gateway" -EntityKind "document" -Action "export" -Code "EXPORT_FAILED" -Message "No se pudo generar el documento comercial." -Details ([pscustomobject]@{
      reason = $helperResult.reason
      stdout = $helperResult.stdout
      stderr = $helperResult.stderr
    })
  }

  $result = $helperResult.result
  $exportFiles = @(Get-ApiV1ExportFileEntries -Files $result.files)
  $primaryExportFile = Get-ApiV1PrimaryExportFile -Files $exportFiles
  $updatedPayload = ConvertTo-ApiV1Dictionary -Value $existing
  $updatedPayload.exportFormat = [string]$result.exportFormat
  $updatedPayload.exportStatus = "exported"
  $updatedPayload.exportedAt = [string]$result.createdAt
  $updatedPayload.renderedAt = [string]$result.createdAt
  $updatedPayload.status = "exported"
  $updatedPayload.fileName = if ($primaryExportFile) { [string]$primaryExportFile.name } else { [string]$updatedPayload.fileName }
  $updatedPayload.mimeType = if ($primaryExportFile) { [string]$primaryExportFile.mimeType } else { [string]$updatedPayload.mimeType }
  $updatedPayload.contentText = [string]$result.contentText
  $updatedPayload.exportFiles = $exportFiles
  $updatedPayload.exportSummary = ConvertTo-ApiV1Dictionary -Value $result.summary
  $updatedPayload.exportRelations = ConvertTo-ApiV1Dictionary -Value $result.relations
  $updatedPayload.exportCapabilities = ConvertTo-ApiV1Dictionary -Value $result.capabilities
  $updatedPayload.exportWarnings = @(ConvertTo-ApiV1Array -Value $result.warnings)
  $updatedPayload.exportFileCount = [int]$result.fileCount
  $updatedPayload.exportReady = [bool](-not $result.missingFiles -or @($result.missingFiles).Count -eq 0)
  $updatedPayload.exportBasePath = [string]$result.basePath
  $normalized = Normalize-ApiV1Record -EntityKind "document" -Record ([pscustomobject]$updatedPayload) -ExistingRecord $existing

  $records = @(Get-ApiV1EntityRecords -Store $Store -EntityKind "document")
  $index = Get-ApiV1RecordIndex -Records $records -Id $Id
  if ($index -lt 0) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind "document" -Action "export" -Code "NOT_FOUND" -Message "No se encontro el documento."
  }

  $records[$index] = $normalized
  Set-ApiV1EntityRecords -Store $Store -EntityKind "document" -Records $records
  $change = Add-ApiV1Change -Store $Store -EntityKind "document" -Action "export" -Record $normalized
  Save-ApiV1Store -Store $Store

  return New-ApiV1Response -EntityKind "document" -Action "export" -Data $normalized -Meta ([pscustomobject]@{
    change = $change
    source = "api-v1"
    exportFormat = $normalized.exportFormat
    exportStatus = $normalized.exportStatus
    files = $normalized.exportFiles
    relations = $normalized.exportRelations
    capabilities = $normalized.exportCapabilities
    warnings = $normalized.exportWarnings
    fileCount = $normalized.exportFileCount
    ready = [bool]$normalized.exportReady
  })
}

function Invoke-ApiV1SendMailOutbox {
  param(
    [object]$Store,
    [string]$Id,
    [object]$Body
  )

  $existing = Get-ApiV1EntityRecordById -Store $Store -EntityKind "mailoutbox" -Id $Id
  if (-not $existing) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind "mailoutbox" -Action "send" -Code "NOT_FOUND" -Message "No se encontro el correo en cola."
  }

  $incoming = ConvertTo-ApiV1Dictionary -Value $Body
  $profileId = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.mailboxProfileId)) { [string]$incoming.mailboxProfileId } elseif (-not [string]::IsNullOrWhiteSpace([string]$existing.mailboxProfileId)) { [string]$existing.mailboxProfileId } elseif (-not [string]::IsNullOrWhiteSpace([string]$incoming.providerKind)) { [string]$incoming.providerKind } else { "rodrigo" }
  $profile = Get-ApiV1MailboxProfile -ProfileId $profileId
  $attachmentBundle = Get-ApiV1MailOutboxAttachments -Store $Store -Existing $existing -Incoming $incoming

  $payloadDraft = [pscustomobject]@{
    id = [string]$existing.id
    to = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.recipient)) { @(([string]$incoming.recipient)) } elseif ($existing.to) { @(ConvertTo-ApiV1Array -Value $existing.to) } else { @([string]$existing.recipient) }
    cc = if ($incoming.ContainsKey("cc")) { @(ConvertTo-ApiV1Array -Value $incoming.cc) } elseif ($existing.cc) { @(ConvertTo-ApiV1Array -Value $existing.cc) } else { @() }
    subject = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.subject)) { [string]$incoming.subject } elseif (-not [string]::IsNullOrWhiteSpace([string]$existing.subject)) { [string]$existing.subject } else { "JoathiVA" }
    bodyDraft = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.body)) { [string]$incoming.body } elseif (-not [string]::IsNullOrWhiteSpace([string]$existing.bodyHtml)) { [string]$existing.bodyHtml } else { [string]$existing.body }
    messageId = if (-not [string]::IsNullOrWhiteSpace([string]$existing.messageId)) { [string]$existing.messageId } else { "<mailoutbox-{0}@joathiva.local>" -f ([guid]::NewGuid().ToString("N")) }
    sourceIntakeId = [string]$existing.id
    customerId = [string]$existing.customerId
    operationId = [string]$existing.operationId
    taskId = [string]$existing.taskId
    activityId = [string]$existing.activityId
    attachments = $attachmentBundle.attachments
  }

  $helperResult = $null
  if ($profile) {
    $helperScript = Join-Path $PSScriptRoot "assistant\mailbox_draft_export.py"
    $helperPayload = [pscustomobject]@{
      profile = $profile
      draft = $payloadDraft
      folder = if (-not [string]::IsNullOrWhiteSpace([string]$profile.draftFolder)) { [string]$profile.draftFolder } else { "Drafts" }
    }
    $helperResult = Invoke-ApiV1PythonHelper -ScriptPath $helperScript -Payload $helperPayload
  }

  $payload = ConvertTo-ApiV1Dictionary -Value $existing
  $payload.lastAttemptAt = Get-ApiV1NowIso
  $payload.queuedAt = if ([string]::IsNullOrWhiteSpace([string]$payload.queuedAt)) { Get-ApiV1NowIso } else { [string]$payload.queuedAt }
  if (-not [string]::IsNullOrWhiteSpace([string]$incoming.recipient)) {
    $payload.recipient = [string]$incoming.recipient
  }
  if (-not [string]::IsNullOrWhiteSpace([string]$incoming.subject)) {
    $payload.subject = [string]$incoming.subject
  }
  if (-not [string]::IsNullOrWhiteSpace([string]$incoming.body)) {
    $payload.body = [string]$incoming.body
  }
  if (-not [string]::IsNullOrWhiteSpace([string]$incoming.bodyHtml)) {
    $payload.bodyHtml = [string]$incoming.bodyHtml
  }
  if ($profile) {
    if (-not [string]::IsNullOrWhiteSpace([string]$profile.id)) {
      $payload.mailboxProfileId = [string]$profile.id
    }
    $payload.channel = "imap-draft"
    if ($helperResult -and $helperResult.ok -and $helperResult.result) {
      $draftResult = $helperResult.result
      $payload.status = "exported"
      $payload.deliveryStatus = "draft_exported"
      $payload.providerKind = [string]$draftResult.providerKind
      $payload.messageId = [string]$draftResult.messageId
      $payload.mailboxUid = [string]$draftResult.mailboxUid
      $payload.folder = [string]$draftResult.folder
      $payload.exportedAt = Get-ApiV1NowIso
      $payload.verificationUid = [string]$draftResult.verificationUid
      $payload.verified = [bool]$draftResult.verified
      $payload.providerMetadata = $draftResult.metadata
      $payload.attachments = $attachmentBundle.attachments
      $payload.attachmentWarnings = @($attachmentBundle.warnings) + @(ConvertTo-ApiV1Array -Value $draftResult.attachmentWarnings)
      $payload.attachmentCount = if ($draftResult.attachmentCount) { [int]$draftResult.attachmentCount } elseif ($attachmentBundle.attachments) { @($attachmentBundle.attachments).Count } else { 0 }
    } else {
      $payload.status = "draft_failed"
      $payload.deliveryStatus = "draft_failed"
      $payload.providerKind = "imap"
      $payload.exportError = if ($helperResult) { [string]$helperResult.reason } else { "No se pudo encontrar un proveedor de correo configurado." }
      $payload.attachments = $attachmentBundle.attachments
      $payload.attachmentWarnings = $attachmentBundle.warnings
      $payload.attachmentCount = if ($attachmentBundle.attachments) { @($attachmentBundle.attachments).Count } else { 0 }
    }
  } else {
    $payload.status = "queued-local"
    $payload.deliveryStatus = "local-fallback"
    $payload.providerKind = "local"
    $payload.exportError = "No hay un perfil de correo configurado."
    $payload.attachments = $attachmentBundle.attachments
    $payload.attachmentWarnings = $attachmentBundle.warnings
    $payload.attachmentCount = if ($attachmentBundle.attachments) { @($attachmentBundle.attachments).Count } else { 0 }
  }

  $normalized = Normalize-ApiV1Record -EntityKind "mailoutbox" -Record ([pscustomobject]$payload) -ExistingRecord $existing

  $records = @(Get-ApiV1EntityRecords -Store $Store -EntityKind "mailoutbox")
  $index = Get-ApiV1RecordIndex -Records $records -Id $Id
  if ($index -lt 0) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind "mailoutbox" -Action "send" -Code "NOT_FOUND" -Message "No se encontro el correo en cola."
  }

  $records[$index] = $normalized
  Set-ApiV1EntityRecords -Store $Store -EntityKind "mailoutbox" -Records $records
  $change = Add-ApiV1Change -Store $Store -EntityKind "mailoutbox" -Action "send" -Record $normalized
  Save-ApiV1Store -Store $Store

  return New-ApiV1Response -EntityKind "mailoutbox" -Action "send" -Data $normalized -Meta ([pscustomobject]@{
    change = $change
    source = "api-v1"
    deliveryStatus = $normalized.deliveryStatus
    providerKind = $normalized.providerKind
    helper = if ($helperResult) { $helperResult.result } else { $null }
    attachmentCount = $normalized.attachmentCount
    attachments = $normalized.attachments
  })
}

function Get-ApiV1QuoteProviderWorkflow {
  param([object]$Quote)

  $source = ConvertTo-ApiV1Dictionary -Value $Quote
  $workflow = ConvertTo-ApiV1Dictionary -Value $source.providerWorkflow
  $workflow.providerId = if ([string]::IsNullOrWhiteSpace([string]$workflow.providerId)) { [string]$source.providerId } else { [string]$workflow.providerId }
  $workflow.providerName = if ([string]::IsNullOrWhiteSpace([string]$workflow.providerName)) { [string]$source.providerName } elseif (-not [string]::IsNullOrWhiteSpace([string]$source.providerName)) { [string]$source.providerName } else { [string]$source.proveedor }
  $workflow.status = if ([string]::IsNullOrWhiteSpace([string]$workflow.status)) { if (-not [string]::IsNullOrWhiteSpace([string]$source.providerStatus)) { [string]$source.providerStatus } else { "draft" } } else { [string]$workflow.status }
  $workflow.requestedAt = if ([string]::IsNullOrWhiteSpace([string]$workflow.requestedAt)) { [string]$source.providerRequestedAt } else { [string]$workflow.requestedAt }
  $workflow.receivedAt = if ([string]::IsNullOrWhiteSpace([string]$workflow.receivedAt)) { [string]$source.providerReceivedAt } else { [string]$workflow.receivedAt }
  $workflow.confirmedAt = if ([string]::IsNullOrWhiteSpace([string]$workflow.confirmedAt)) { [string]$source.providerConfirmedAt } else { [string]$workflow.confirmedAt }
  $workflow.requests = ConvertTo-ApiV1Array -Value $workflow.requests
  $workflow.responses = ConvertTo-ApiV1Array -Value $workflow.responses
  $workflow.options = ConvertTo-ApiV1Array -Value $workflow.options
  $workflow.comparison = if ($workflow.comparison) { ConvertTo-ApiV1Dictionary -Value $workflow.comparison } else { @{} }
  $workflow.confirmation = if ($workflow.confirmation) { ConvertTo-ApiV1Dictionary -Value $workflow.confirmation } else { @{} }
  $workflow.summary = Get-ApiV1SerializedSummary -Value ([pscustomobject]@{
    providerId = $workflow.providerId
    providerName = $workflow.providerName
    status = $workflow.status
    requestedAt = $workflow.requestedAt
    receivedAt = $workflow.receivedAt
    confirmedAt = $workflow.confirmedAt
    requestCount = $workflow.requests.Count
    responseCount = $workflow.responses.Count
    optionCount = $workflow.options.Count
  })

  return [pscustomobject]$workflow
}

function Get-ApiV1ProviderLinkedQuotes {
  param(
    [object]$Store,
    [string]$ProviderId
  )

  if ([string]::IsNullOrWhiteSpace($ProviderId)) {
    return @()
  }

  $providerQuotes = @()
  $providerQuotesSource = @(Get-ApiV1EntityRecords -Store $Store -EntityKind "quote") | Sort-Object updatedAt -Descending
  foreach ($quote in $providerQuotesSource) {
    $workflow = Get-ApiV1QuoteProviderWorkflow -Quote $quote
    $quoteProviderId = [string]$quote.providerId
    if ([string]$quoteProviderId -eq $ProviderId -or [string]$workflow.providerId -eq $ProviderId -or [string]$workflow.confirmation.providerId -eq $ProviderId) {
      $providerQuotes += [pscustomobject]@{
        id = [string]$quote.id
        quote = $quote
        workflow = $workflow
        providerStatus = [string]$workflow.status
        requestedAt = [string]$workflow.requestedAt
        receivedAt = [string]$workflow.receivedAt
        confirmedAt = [string]$workflow.confirmedAt
      }
    }
  }

  return $providerQuotes
}

function Invoke-ApiV1QuoteProviderFlow {
  param(
    [object]$Store,
    [string]$Id,
    [string]$Method,
    [object]$Body
  )

  $existing = Get-ApiV1EntityRecordById -Store $Store -EntityKind "quote" -Id $Id
  if (-not $existing) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind "quote" -Action "provider" -Code "NOT_FOUND" -Message "No se encontro la cotizacion."
  }

  $incoming = ConvertTo-ApiV1Dictionary -Value $Body
  if ($Method -eq "GET") {
    $workflow = Get-ApiV1QuoteProviderWorkflow -Quote $existing
    $providerId = if (-not [string]::IsNullOrWhiteSpace([string]$workflow.providerId)) { [string]$workflow.providerId } else { [string]$existing.providerId }
    $provider = if (-not [string]::IsNullOrWhiteSpace($providerId)) { Get-ApiV1EntityRecordById -Store $Store -EntityKind "provider" -Id $providerId } else { $null }
    return New-ApiV1Response -EntityKind "quote" -Action "provider" -Data ([pscustomobject]@{
      quote = $existing
      workflow = $workflow
      provider = $provider
      providerQuotes = if (-not [string]::IsNullOrWhiteSpace($providerId)) { Get-ApiV1ProviderLinkedQuotes -Store $Store -ProviderId $providerId } else { @() }
    }) -Meta ([pscustomobject]@{ source = "api-v1" })
  }

  $action = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.action)) { ([string]$incoming.action).Trim().ToLowerInvariant() } else { "request" }
  $payload = ConvertTo-ApiV1Dictionary -Value $existing
  $workflow = Get-ApiV1QuoteProviderWorkflow -Quote $existing
  $providerId = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.providerId)) { [string]$incoming.providerId } elseif (-not [string]::IsNullOrWhiteSpace([string]$workflow.providerId)) { [string]$workflow.providerId } else { [string]$payload.providerId }
  $provider = if (-not [string]::IsNullOrWhiteSpace($providerId)) { Get-ApiV1EntityRecordById -Store $Store -EntityKind "provider" -Id $providerId } else { $null }
  $providerName = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.providerName)) { [string]$incoming.providerName } elseif ($provider) { if (-not [string]::IsNullOrWhiteSpace([string]$provider.nombre)) { [string]$provider.nombre } elseif (-not [string]::IsNullOrWhiteSpace([string]$provider.razonSocial)) { [string]$provider.razonSocial } else { [string]$provider.displayName } } elseif (-not [string]::IsNullOrWhiteSpace([string]$workflow.providerName)) { [string]$workflow.providerName } else { [string]$payload.providerName }
  $now = Get-ApiV1NowIso

  if ($action -in @("request", "receive", "confirm") -and [string]::IsNullOrWhiteSpace($providerId)) {
    return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind "quote" -Action "provider" -Code "VALIDATION_ERROR" -Message "Debes indicar un proveedor."
  }

  if ($action -in @("request", "receive", "confirm") -and -not $provider) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind "quote" -Action "provider" -Code "NOT_FOUND" -Message "No se encontro el proveedor indicado."
  }

  switch ($action) {
    "request" {
      $requestRecord = [pscustomobject]@{
        id = New-ApiV1RecordId -Prefix "qpr"
        at = $now
        action = "request"
        providerId = $providerId
        providerName = $providerName
        requestedBy = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.requestedBy)) { [string]$incoming.requestedBy } else { [string]$payload.providerRequestedBy }
        message = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.requestMessage)) { [string]$incoming.requestMessage } else { [string]$incoming.message }
        status = "requested"
      }
      $workflow.requests = @($workflow.requests + $requestRecord)
      $workflow.providerId = $providerId
      $workflow.providerName = $providerName
      $workflow.status = "requested"
      $workflow.requestedAt = $now
      $payload.providerId = $providerId
      $payload.providerName = $providerName
      $payload.providerStatus = "requested"
      $payload.providerRequestedAt = $now
      $payload.providerRequestedBy = $requestRecord.requestedBy
      $payload.providerRequestMessage = $requestRecord.message
    }
    "receive" {
      $responseRecord = [pscustomobject]@{
        id = New-ApiV1RecordId -Prefix "qps"
        at = $now
        action = "receive"
        providerId = $providerId
        providerName = $providerName
        rate = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.rate)) { [string]$incoming.rate } else { [string]$incoming.amount }
        currency = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.currency)) { [string]$incoming.currency } else { [string]$payload.moneda }
        eta = [string]$incoming.eta
        leadTime = [string]$incoming.leadTime
        notes = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.notes)) { [string]$incoming.notes } else { [string]$incoming.message }
        attachmentId = [string]$incoming.attachmentId
        status = "received"
      }
      $workflow.responses = @($workflow.responses + $responseRecord)
      $workflow.providerId = $providerId
      $workflow.providerName = $providerName
      $workflow.status = "received"
      $workflow.receivedAt = $now
      $payload.providerId = $providerId
      $payload.providerName = $providerName
      $payload.providerStatus = "received"
      $payload.providerReceivedAt = $now
      $payload.providerResponseAt = $now
      $payload.providerResponseMessage = $responseRecord.notes
      $payload.providerResponseRate = $responseRecord.rate
      $payload.providerResponseCurrency = $responseRecord.currency
    }
    "compare" {
      $incomingOptions = @()
      if ($incoming.ContainsKey("options")) {
        $incomingOptions = ConvertTo-ApiV1Array -Value $incoming.options
      } elseif ($incoming.ContainsKey("responses")) {
        $incomingOptions = ConvertTo-ApiV1Array -Value $incoming.responses
      } elseif ($incoming.ContainsKey("providerOptions")) {
        $incomingOptions = ConvertTo-ApiV1Array -Value $incoming.providerOptions
      } else {
        $incomingOptions = ConvertTo-ApiV1Array -Value $workflow.responses
      }

      $normalizedOptions = @()
      foreach ($option in $incomingOptions) {
        $optionPayload = ConvertTo-ApiV1Dictionary -Value $option
        if ([string]::IsNullOrWhiteSpace([string]$optionPayload.id)) {
          $optionPayload.id = New-ApiV1RecordId -Prefix "qpo"
        }
        if ([string]::IsNullOrWhiteSpace([string]$optionPayload.providerId) -and -not [string]::IsNullOrWhiteSpace($providerId)) {
          $optionPayload.providerId = $providerId
        }
        if ([string]::IsNullOrWhiteSpace([string]$optionPayload.providerName) -and -not [string]::IsNullOrWhiteSpace($providerName)) {
          $optionPayload.providerName = $providerName
        }
        if ([string]::IsNullOrWhiteSpace([string]$optionPayload.currency)) {
          $optionPayload.currency = [string]$payload.moneda
        }
        if ([string]::IsNullOrWhiteSpace([string]$optionPayload.status)) {
          $optionPayload.status = "received"
        }
        if ([string]::IsNullOrWhiteSpace([string]$optionPayload.at)) {
          $optionPayload.at = $now
        }
        $normalizedOptions += [pscustomobject]$optionPayload
      }

      $bestOption = $null
      $bestRate = [decimal]::MaxValue
      foreach ($option in $normalizedOptions) {
        $candidate = [decimal]0
        $rateText = if (-not [string]::IsNullOrWhiteSpace([string]$option.rate)) { [string]$option.rate } elseif (-not [string]::IsNullOrWhiteSpace([string]$option.amount)) { [string]$option.amount } elseif (-not [string]::IsNullOrWhiteSpace([string]$option.price)) { [string]$option.price } else { [string]$option.cost }
        if (-not [string]::IsNullOrWhiteSpace($rateText) -and [decimal]::TryParse($rateText, [ref]$candidate)) {
          if ($candidate -lt $bestRate) {
            $bestRate = $candidate
            $bestOption = $option
          }
        }
      }

      $comparison = [pscustomobject]@{
        id = if (-not [string]::IsNullOrWhiteSpace([string]$workflow.comparison.id)) { [string]$workflow.comparison.id } else { New-ApiV1RecordId -Prefix "qcm" }
        at = $now
        action = "compare"
        providerId = $providerId
        providerName = $providerName
        options = $normalizedOptions
        optionsCount = $normalizedOptions.Count
        bestProviderId = if ($bestOption) { [string]$bestOption.providerId } else { "" }
        bestProviderName = if ($bestOption) { [string]$bestOption.providerName } else { "" }
        bestRate = if ($bestOption) { [string]$bestRate } else { "" }
        note = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.note)) { [string]$incoming.note } else { [string]$incoming.notes }
        selectedProviderId = [string]$incoming.selectedProviderId
        selectedProviderName = [string]$incoming.selectedProviderName
      }

      $workflow.options = $normalizedOptions
      $workflow.comparison = $comparison
      $workflow.providerId = if (-not [string]::IsNullOrWhiteSpace($providerId)) { $providerId } else { [string]$workflow.providerId }
      $workflow.providerName = if (-not [string]::IsNullOrWhiteSpace($providerName)) { $providerName } else { [string]$workflow.providerName }
      $workflow.status = "compared"
      $workflow.comparedAt = $now
      $payload.providerId = $workflow.providerId
      $payload.providerName = $workflow.providerName
      $payload.providerStatus = "compared"
      $payload.providerComparedAt = $now
      $payload.providerComparisonSummary = Get-ApiV1SerializedSummary -Value $comparison
      $payload.providerOptionCount = $normalizedOptions.Count
      if (-not [string]::IsNullOrWhiteSpace([string]$comparison.bestProviderId)) {
        $payload.providerSelectedProviderId = [string]$comparison.bestProviderId
      }
      if (-not [string]::IsNullOrWhiteSpace([string]$comparison.bestProviderName)) {
        $payload.providerSelectedProviderName = [string]$comparison.bestProviderName
      }
    }
    "confirm" {
      $selectedProviderId = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.providerId)) { [string]$incoming.providerId } elseif (-not [string]::IsNullOrWhiteSpace([string]$incoming.selectedProviderId)) { [string]$incoming.selectedProviderId } elseif (-not [string]::IsNullOrWhiteSpace([string]$workflow.providerId)) { [string]$workflow.providerId } else { [string]$payload.providerId }
      $selectedProvider = if (-not [string]::IsNullOrWhiteSpace($selectedProviderId)) { Get-ApiV1EntityRecordById -Store $Store -EntityKind "provider" -Id $selectedProviderId } else { $null }
      $selectedProviderName = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.providerName)) { [string]$incoming.providerName } elseif ($selectedProvider) { if (-not [string]::IsNullOrWhiteSpace([string]$selectedProvider.nombre)) { [string]$selectedProvider.nombre } elseif (-not [string]::IsNullOrWhiteSpace([string]$selectedProvider.razonSocial)) { [string]$selectedProvider.razonSocial } else { [string]$selectedProvider.displayName } } elseif (-not [string]::IsNullOrWhiteSpace([string]$workflow.providerName)) { [string]$workflow.providerName } else { [string]$payload.providerName }
      $confirmation = [pscustomobject]@{
        id = if (-not [string]::IsNullOrWhiteSpace([string]$workflow.confirmation.id)) { [string]$workflow.confirmation.id } else { New-ApiV1RecordId -Prefix "qcf" }
        at = $now
        action = "confirm"
        providerId = $selectedProviderId
        providerName = $selectedProviderName
        confirmedBy = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.confirmedBy)) { [string]$incoming.confirmedBy } else { [string]$incoming.requestedBy }
        note = if (-not [string]::IsNullOrWhiteSpace([string]$incoming.note)) { [string]$incoming.note } else { [string]$incoming.notes }
      }
      $workflow.confirmation = $confirmation
      $workflow.providerId = $selectedProviderId
      $workflow.providerName = $selectedProviderName
      $workflow.status = "confirmed"
      $workflow.confirmedAt = $now
      $payload.providerId = $selectedProviderId
      $payload.providerName = $selectedProviderName
      $payload.providerStatus = "confirmed"
      $payload.providerConfirmedAt = $now
      $payload.providerSelectedProviderId = $selectedProviderId
      $payload.providerSelectedProviderName = $selectedProviderName
      $payload.providerConfirmationNote = $confirmation.note
      $payload.providerConfirmedBy = $confirmation.confirmedBy
    }
    default {
      return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind "quote" -Action "provider" -Code "VALIDATION_ERROR" -Message "Debes indicar una accion valida: request, receive, compare o confirm."
    }
  }

  $workflow.summary = Get-ApiV1SerializedSummary -Value ([pscustomobject]@{
    providerId = $workflow.providerId
    providerName = $workflow.providerName
    status = $workflow.status
    requestedAt = $workflow.requestedAt
    receivedAt = $workflow.receivedAt
    comparedAt = [string]$payload.providerComparedAt
    confirmedAt = $workflow.confirmedAt
    requestCount = $workflow.requests.Count
    responseCount = $workflow.responses.Count
    optionCount = $workflow.options.Count
  })

  $payload.providerWorkflow = $workflow
  $payload.providerWorkflowSummary = $workflow.summary
  $payload.providerRequestCount = $workflow.requests.Count
  $payload.providerResponseCount = $workflow.responses.Count
  $payload.providerOptionCount = $workflow.options.Count
  $payload.providerStatus = if (-not [string]::IsNullOrWhiteSpace([string]$payload.providerStatus)) { [string]$payload.providerStatus } else { [string]$workflow.status }
  $normalized = Normalize-ApiV1Record -EntityKind "quote" -Record ([pscustomobject]$payload) -ExistingRecord $existing

  $records = @(Get-ApiV1EntityRecords -Store $Store -EntityKind "quote")
  $index = Get-ApiV1RecordIndex -Records $records -Id $Id
  if ($index -lt 0) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind "quote" -Action "provider" -Code "NOT_FOUND" -Message "No se encontro la cotizacion."
  }

  $records[$index] = $normalized
  Set-ApiV1EntityRecords -Store $Store -EntityKind "quote" -Records $records
  $change = Add-ApiV1Change -Store $Store -EntityKind "quote" -Action "provider" -Record $normalized
  Save-ApiV1Store -Store $Store

  $linkedProviderId = if (-not [string]::IsNullOrWhiteSpace([string]$normalized.providerId)) { [string]$normalized.providerId } else { [string]$normalized.providerWorkflow.providerId }
  $linkedProvider = if (-not [string]::IsNullOrWhiteSpace($linkedProviderId)) { Get-ApiV1EntityRecordById -Store $Store -EntityKind "provider" -Id $linkedProviderId } else { $null }

  return New-ApiV1Response -EntityKind "quote" -Action "provider" -Data ([pscustomobject]@{
    quote = $normalized
    workflow = $normalized.providerWorkflow
    provider = $linkedProvider
    providerQuotes = if (-not [string]::IsNullOrWhiteSpace($linkedProviderId)) { Get-ApiV1ProviderLinkedQuotes -Store $Store -ProviderId $linkedProviderId } else { @() }
  }) -Meta ([pscustomobject]@{
    change = $change
    source = "api-v1"
    providerStatus = $normalized.providerStatus
  })
}

function Get-ApiV1ProviderResourcePrefix {
  param([string]$Resource)

  switch ($Resource) {
    "routes" { return "rte" }
    "trips" { return "tri" }
    "documents" { return "pdoc" }
    default { return "pwr" }
  }
}

function Normalize-ApiV1ProviderResourceItem {
  param(
    [string]$Resource,
    [object]$Item,
    [int]$Index = 0
  )

  if ($Item -is [string]) {
    $payload = @{ label = ConvertTo-ApiV1NormalizedText -Value $Item }
  } else {
    $payload = ConvertTo-ApiV1Dictionary -Value $Item
  }

  $prefix = Get-ApiV1ProviderResourcePrefix -Resource $Resource
  if ([string]::IsNullOrWhiteSpace([string]$payload.id)) {
    $payload.id = New-ApiV1RecordId -Prefix $prefix
  }

  if ([string]::IsNullOrWhiteSpace([string]$payload.createdAt)) {
    $payload.createdAt = Get-ApiV1NowIso
  }
  $payload.updatedAt = Get-ApiV1NowIso

  switch ($Resource) {
    "routes" {
      foreach ($field in @("label", "route", "name", "country", "countryCode", "region", "continent", "notes", "coverageType", "description")) {
        if ($payload.ContainsKey($field) -and $null -ne $payload[$field]) {
          $payload[$field] = ConvertTo-ApiV1NormalizedText -Value $payload[$field]
        }
      }

      if ([string]::IsNullOrWhiteSpace([string]$payload.label)) {
        $payload.label = if (-not [string]::IsNullOrWhiteSpace([string]$payload.name)) { [string]$payload.name } elseif (-not [string]::IsNullOrWhiteSpace([string]$payload.route)) { [string]$payload.route } elseif (-not [string]::IsNullOrWhiteSpace([string]$payload.country)) { [string]$payload.country } else { "Ruta $($Index + 1)" }
      }

      if ([string]::IsNullOrWhiteSpace([string]$payload.region) -and -not [string]::IsNullOrWhiteSpace([string]$payload.country)) {
        $americaCountries = @("Argentina", "Brasil", "Bolivia", "Chile", "Colombia", "Uruguay", "México", "Mexico", "Estados Unidos", "United States")
        if ($americaCountries -contains [string]$payload.country) {
          $payload.region = "América"
        } else {
          $payload.region = "Resto del mundo"
        }
      }
    }
    "trips" {
      foreach ($field in @("driverId", "vehicleId", "status", "trackingStatus", "currentLocation", "originCountry", "destinationCountry", "returnDestination", "availableDate", "availableM3", "availableWeightKg", "priceUsd", "cargoType", "notes")) {
        if ($payload.ContainsKey($field) -and $null -ne $payload[$field]) {
          $payload[$field] = ConvertTo-ApiV1NormalizedText -Value $payload[$field]
        }
      }
    }
    "documents" {
      foreach ($field in @("title", "documentType", "format", "status", "fileName", "mimeType", "contentText", "exportFormat", "exportStatus", "sourceKind", "sourceId", "recipient", "subject")) {
        if ($payload.ContainsKey($field) -and $null -ne $payload[$field]) {
          $payload[$field] = ConvertTo-ApiV1NormalizedText -Value $payload[$field]
        }
      }
    }
  }

  return [pscustomobject]$payload
}

function Invoke-ApiV1ProviderResourceRequest {
  param(
    [object]$Store,
    [string]$Id,
    [string]$Resource,
    [string]$Method,
    [object]$Body
  )

  $existing = Get-ApiV1EntityRecordById -Store $Store -EntityKind "provider" -Id $Id
  if (-not $existing) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind "provider" -Action $Resource -Code "NOT_FOUND" -Message "No se encontro el proveedor."
  }

  $payload = ConvertTo-ApiV1Dictionary -Value $existing
  $payload.routes = ConvertTo-ApiV1Array -Value $payload.routes
  $payload.trips = ConvertTo-ApiV1Array -Value $payload.trips
  $payload.documents = ConvertTo-ApiV1Array -Value $payload.documents

  if ($Resource -eq "quotes" -and $Method -ne "GET") {
    return New-ApiV1ErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -EntityKind "provider" -Action "quotes" -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
  }

  if ($Method -eq "GET") {
    if ($Resource -eq "quotes") {
      $providerQuotes = Get-ApiV1ProviderLinkedQuotes -Store $Store -ProviderId ([string]$existing.id)
      return New-ApiV1Response -EntityKind "provider" -Action "quotes" -Data ([pscustomobject]@{
        providerId = [string]$existing.id
        resource = "quotes"
        items = $providerQuotes
        count = $providerQuotes.Count
        provider = $existing
      }) -Meta ([pscustomobject]@{ source = "api-v1" })
    }

    if ($Resource -eq "operational") {
      return New-ApiV1Response -EntityKind "provider" -Action "operational" -Data ([pscustomobject]@{
        providerId = [string]$existing.id
        resource = "operational"
        provider = $existing
        operational = [pscustomobject]@{
          chofer = $existing.chofer
          driver = $existing.driver
          camion = $existing.camion
          truck = $existing.truck
          mic = $existing.mic
          dua = $existing.dua
          crt = $existing.crt
        }
      }) -Meta ([pscustomobject]@{ source = "api-v1" })
    }

    $currentItems = ConvertTo-ApiV1Array -Value $payload[$Resource]
    return New-ApiV1Response -EntityKind "provider" -Action $Resource -Data ([pscustomobject]@{
      providerId = [string]$existing.id
      resource = $Resource
      items = $currentItems
      count = $currentItems.Count
      provider = $existing
    }) -Meta ([pscustomobject]@{ source = "api-v1" })
  }

  if ($Resource -eq "operational") {
    $incoming = ConvertTo-ApiV1Dictionary -Value $Body
    foreach ($field in @("chofer", "driver", "camion", "truck", "mic", "dua", "crt")) {
      if ($incoming.ContainsKey($field) -and $null -ne $incoming[$field]) {
        $payload[$field] = ConvertTo-ApiV1NormalizedText -Value $incoming[$field]
      }
    }

    foreach ($field in @("driverId", "vehicleId", "driverName", "truckPlate", "truckBrand", "truckModel", "truckYear", "truckType", "truckNotes", "operationalNotes")) {
      if ($incoming.ContainsKey($field) -and $null -ne $incoming[$field]) {
        $payload[$field] = ConvertTo-ApiV1NormalizedText -Value $incoming[$field]
      }
    }

    $normalized = Normalize-ApiV1Record -EntityKind "provider" -Record ([pscustomobject]$payload) -ExistingRecord $existing
    $records = @(Get-ApiV1EntityRecords -Store $Store -EntityKind "provider")
    $index = Get-ApiV1RecordIndex -Records $records -Id $Id
    if ($index -lt 0) {
      return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind "provider" -Action "operational" -Code "NOT_FOUND" -Message "No se encontro el proveedor."
    }

    $records[$index] = $normalized
    Set-ApiV1EntityRecords -Store $Store -EntityKind "provider" -Records $records
    $change = Add-ApiV1Change -Store $Store -EntityKind "provider" -Action "operational" -Record $normalized
    Save-ApiV1Store -Store $Store

    return New-ApiV1Response -EntityKind "provider" -Action "operational" -Data ([pscustomobject]@{
      providerId = [string]$normalized.id
      resource = "operational"
      provider = $normalized
      operational = [pscustomobject]@{
        chofer = $normalized.chofer
        driver = $normalized.driver
        camion = $normalized.camion
        truck = $normalized.truck
        mic = $normalized.mic
        dua = $normalized.dua
        crt = $normalized.crt
      }
    }) -Meta ([pscustomobject]@{
      change = $change
      source = "api-v1"
    })
  }

  $incoming = ConvertTo-ApiV1Dictionary -Value $Body
  $currentItems = ConvertTo-ApiV1Array -Value $payload[$Resource]
  $incomingItems = @()

  if ($incoming.ContainsKey("items")) {
    $incomingItems = ConvertTo-ApiV1Array -Value $incoming.items
  } elseif ($incoming.ContainsKey($Resource)) {
    $incomingItems = ConvertTo-ApiV1Array -Value $incoming[$Resource]
  } elseif ($Body -is [System.Array]) {
    $incomingItems = ConvertTo-ApiV1Array -Value $Body
  } elseif ($Body -and ($Body.PSObject.Properties.Count -gt 0)) {
    $incomingItems = @($Body)
  }

  $normalizedItems = @()
  $index = 0
  foreach ($item in $incomingItems) {
    $normalizedItems += Normalize-ApiV1ProviderResourceItem -Resource $Resource -Item $item -Index $index
    $index += 1
  }

  if ($Method -eq "POST") {
    $currentItems = @($currentItems + $normalizedItems)
  } else {
    $currentItems = @($normalizedItems)
  }

  $updatedItems = ConvertTo-ApiV1Array -Value $currentItems

  $payload[$Resource] = $currentItems
  $normalized = Normalize-ApiV1Record -EntityKind "provider" -Record ([pscustomobject]$payload) -ExistingRecord $existing
  $records = @(Get-ApiV1EntityRecords -Store $Store -EntityKind "provider")
  $recordIndex = Get-ApiV1RecordIndex -Records $records -Id $Id
  if ($recordIndex -lt 0) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind "provider" -Action $Resource -Code "NOT_FOUND" -Message "No se encontro el proveedor."
  }

  $records[$recordIndex] = $normalized
  Set-ApiV1EntityRecords -Store $Store -EntityKind "provider" -Records $records
  $change = Add-ApiV1Change -Store $Store -EntityKind "provider" -Action $Resource -Record $normalized
  Save-ApiV1Store -Store $Store

  return New-ApiV1Response -EntityKind "provider" -Action $Resource -Data ([pscustomobject]@{
    providerId = [string]$normalized.id
    resource = $Resource
    items = $updatedItems
    count = $updatedItems.Count
    provider = $normalized
  }) -Meta ([pscustomobject]@{
    change = $change
    source = "api-v1"
  })
}

function Invoke-ApiV1GetRecord {
  param(
    [object]$Store,
    [string]$EntityKind,
    [string]$Id
  )

  $record = Get-ApiV1EntityRecordById -Store $Store -EntityKind $EntityKind -Id $Id
  if (-not $record) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind $EntityKind -Action "getById" -Code "NOT_FOUND" -Message "No se encontro el registro."
  }

  return New-ApiV1Response -EntityKind $EntityKind -Action "getById" -Data $record -Meta ([pscustomobject]@{ source = "api-v1" })
}

function Invoke-ApiV1ListRecords {
  param(
    [object]$Store,
    [string]$EntityKind,
    [hashtable]$Query
  )

  $records = Get-ApiV1EntityRecords -Store $Store -EntityKind $EntityKind
  $filtered = @()
  foreach ($record in $records) {
    if (Test-ApiV1RecordFilters -EntityKind $EntityKind -Record $record -Query $Query) {
      $filtered += $record
    }
  }

  $config = Get-ApiV1EntityConfig -EntityKind $EntityKind
  $sorted = Get-ApiV1SortedRecords -EntityKind $EntityKind -Records $filtered
  $page = Get-ApiV1PagedRecords -EntityKind $EntityKind -Records $sorted -Query $Query
  $meta = [pscustomobject]@{
    source = "api-v1"
    cursor = $page.cursor
    limit = $page.limit
    nextCursor = $page.nextCursor
    hasMore = $page.hasMore
    count = $page.count
    sortField = $config.sortField
    sortDescending = $config.sortDescending
  }

  return New-ApiV1Response -EntityKind $EntityKind -Action "list" -Data $page -Meta $meta
}

function Invoke-ApiV1Changes {
  param(
    [object]$Store,
    [string]$EntityKind,
    [hashtable]$Query
  )

  $cursor = 0
  [void][int]::TryParse([string]$Query.cursor, [ref]$cursor)
  if ($cursor -lt 0) { $cursor = 0 }

  $limit = 50
  [void][int]::TryParse([string]$Query.limit, [ref]$limit)
  if ($limit -lt 1) { $limit = 50 }
  if ($limit -gt 250) { $limit = 250 }

  $items = @()
  foreach ($change in @($Store.changes)) {
    if ([int]$change.seq -le $cursor) {
      continue
    }
    if ($EntityKind -and [string]$change.entityKind -ne $EntityKind) {
      continue
    }
    $items += $change
    if ($items.Count -ge $limit) {
      break
    }
  }

  $nextCursor = if ($items.Count) { [int]$items[-1].seq } else { $cursor }
  $meta = [pscustomobject]@{
    source = "api-v1"
    cursor = $cursor
    nextCursor = $nextCursor
    limit = $limit
    hasMore = [bool]($items.Count -ge $limit -and ($Store.changes | Where-Object { [int]$_.seq -gt $nextCursor -and ($EntityKind -eq "" -or [string]$_.entityKind -eq $EntityKind) }).Count -gt 0)
    count = $items.Count
  }

  return New-ApiV1Response -EntityKind $EntityKind -Action "changes" -Data ([pscustomobject]@{ items = $items; cursor = $cursor; nextCursor = $nextCursor; hasMore = $meta.hasMore; count = $items.Count }) -Meta $meta
}

function Invoke-ApiV1Sync {
  param(
    [object]$Store,
    [string]$EntityKind,
    [object]$Body
  )

  $requestBody = ConvertTo-ApiV1Dictionary -Value $Body
  $results = @()
  $created = 0
  $updated = 0
  $archived = 0
  $unarchived = 0
  $skipped = 0

  if ($EntityKind -eq "activity") {
    $records = ConvertTo-ApiV1Array -Value $requestBody.records
    if (-not $records.Count) {
      $records = ConvertTo-ApiV1Array -Value $requestBody.upserts
    }

    foreach ($item in $records) {
      $existing = Get-ApiV1EntityRecordById -Store $Store -EntityKind $EntityKind -Id ([string]$item.id)
      if ($existing) {
        $results += [pscustomobject]@{
          ok = $true
          id = [string]$existing.id
          action = "skipped"
          record = $existing
        }
        $skipped += 1
        continue
      }

      $response = Invoke-ApiV1CreateRecord -Store $Store -EntityKind $EntityKind -Record $item
      if (-not $response.body.ok) {
        $results += [pscustomobject]@{
          ok = $false
          id = [string]$item.id
          action = "create"
          error = $response.body.error
        }
        $skipped += 1
        continue
      }

      $results += [pscustomobject]@{
        ok = $true
        id = [string]$response.body.data.id
        action = "created"
        record = $response.body.data
      }
      $created += 1
    }

    Save-ApiV1Store -Store $Store
    return New-ApiV1Response -EntityKind $EntityKind -Action "sync" -Data ([pscustomobject]@{
      items = $results
      counts = [pscustomobject]@{
        created = $created
        updated = $updated
        archived = $archived
        unarchived = $unarchived
        skipped = $skipped
      }
      nextCursor = [int]$Store.nextSequence
      cursor = $requestBody.cursor
    }) -Meta ([pscustomobject]@{ source = "api-v1"; mode = "append-only" })
  }

  foreach ($item in ConvertTo-ApiV1Array -Value $requestBody.upserts) {
    $existing = Get-ApiV1EntityRecordById -Store $Store -EntityKind $EntityKind -Id ([string]$item.id)
    if ($existing) {
      $response = Invoke-ApiV1UpdateRecord -Store $Store -EntityKind $EntityKind -Id ([string]$existing.id) -Record $item
      if ($response.body.ok) {
        $results += [pscustomobject]@{
          ok = $true
          id = [string]$response.body.data.id
          action = "updated"
          record = $response.body.data
        }
        $updated += 1
      } else {
        $results += [pscustomobject]@{
          ok = $false
          id = [string]$item.id
          action = "update"
          error = $response.body.error
        }
        $skipped += 1
      }
      continue
    }

    $response = Invoke-ApiV1CreateRecord -Store $Store -EntityKind $EntityKind -Record $item
    if ($response.body.ok) {
      $results += [pscustomobject]@{
        ok = $true
        id = [string]$response.body.data.id
        action = "created"
        record = $response.body.data
      }
      $created += 1
    } else {
      $results += [pscustomobject]@{
        ok = $false
        id = [string]$item.id
        action = "create"
        error = $response.body.error
      }
      $skipped += 1
    }
  }

  foreach ($item in ConvertTo-ApiV1Array -Value $requestBody.archives) {
    $id = [string]$item.id
    if ([string]::IsNullOrWhiteSpace($id)) {
      $skipped += 1
      $results += [pscustomobject]@{ ok = $false; action = "archive"; error = @{ code = "VALIDATION_ERROR"; message = "Debes indicar el id." } }
      continue
    }
    $response = Invoke-ApiV1ArchiveRecord -Store $Store -EntityKind $EntityKind -Id $id -Archived $true
    if ($response.body.ok) {
      $archived += 1
      $results += [pscustomobject]@{ ok = $true; id = $id; action = "archived"; record = $response.body.data }
    } else {
      $skipped += 1
      $results += [pscustomobject]@{ ok = $false; id = $id; action = "archive"; error = $response.body.error }
    }
  }

  foreach ($item in ConvertTo-ApiV1Array -Value $requestBody.unarchives) {
    $id = [string]$item.id
    if ([string]::IsNullOrWhiteSpace($id)) {
      $skipped += 1
      $results += [pscustomobject]@{ ok = $false; action = "unarchive"; error = @{ code = "VALIDATION_ERROR"; message = "Debes indicar el id." } }
      continue
    }
    $response = Invoke-ApiV1ArchiveRecord -Store $Store -EntityKind $EntityKind -Id $id -Archived $false
    if ($response.body.ok) {
      $unarchived += 1
      $results += [pscustomobject]@{ ok = $true; id = $id; action = "unarchived"; record = $response.body.data }
    } else {
      $skipped += 1
      $results += [pscustomobject]@{ ok = $false; id = $id; action = "unarchive"; error = $response.body.error }
    }
  }

  Save-ApiV1Store -Store $Store
  return New-ApiV1Response -EntityKind $EntityKind -Action "sync" -Data ([pscustomobject]@{
    items = $results
    counts = [pscustomobject]@{
      created = $created
      updated = $updated
      archived = $archived
      unarchived = $unarchived
      skipped = $skipped
    }
    nextCursor = [int]$Store.nextSequence
    cursor = $requestBody.cursor
  }) -Meta ([pscustomobject]@{ source = "api-v1"; mode = "batch" })
}

function Invoke-ApiV1Request {
  param(
    [object]$Request,
    [string]$Path,
    [string]$QueryString
  )

  $method = ([string]$Request.Method).Trim().ToUpperInvariant()
  $store = Get-ApiV1Store
  $query = ConvertFrom-ApiV1QueryString -QueryString $QueryString

  if ($Path -eq "/api/v1" -or $Path -eq "/api/v1/") {
    if ($method -ne "GET") {
      return New-ApiV1ErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -EntityKind "" -Action "manifest" -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
    }

    $entities = @{}
    foreach ($entityKind in $script:ApiV1SupportedEntities) {
      $config = Get-ApiV1EntityConfig -EntityKind $entityKind
      $entities[$entityKind] = [pscustomobject]@{
        entityKind = $entityKind
        idPrefix = $config.idPrefix
        supportsArchive = $config.supportsArchive
        appendOnly = $config.appendOnly
        required = $config.required
        searchFields = $config.searchFields
        sortField = $config.sortField
        sortDescending = $config.sortDescending
      }
    }

    return New-ApiV1Response -EntityKind "" -Action "manifest" -Data ([pscustomobject]@{
      version = 1
      generatedAt = $store.generatedAt
      updatedAt = $store.updatedAt
      nextSequence = $store.nextSequence
      entities = $entities
    }) -Meta ([pscustomobject]@{ source = "api-v1" })
  }

  if ($Path -eq "/api/v1/health") {
    if ($method -ne "GET") {
      return New-ApiV1ErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -EntityKind "" -Action "health" -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
    }
    return New-ApiV1Response -EntityKind "" -Action "health" -Data ([pscustomobject]@{
      ok = $true
      server = "JoathiVA API v1"
      timestamp = Get-ApiV1NowIso
      store = [pscustomobject]@{
        version = $store.version
        nextSequence = $store.nextSequence
      }
    }) -Meta ([pscustomobject]@{ source = "api-v1" })
  }

  if ($Path -notmatch "^/api/v1/(?<collection>customers|quotes|tasks|activities|operations|providers|documents|mailoutbox)(?:/(?<tail>.*))?$") {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind "" -Action "" -Code "NOT_FOUND" -Message "Ruta no encontrada."
  }

  $collection = [string]$Matches.collection
  $tail = [string]$Matches.tail
  $entityKind = $script:ApiV1RouteEntityMap[$collection]
  $config = Get-ApiV1EntityConfig -EntityKind $entityKind

  if (-not $config) {
    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind $entityKind -Action "" -Code "NOT_FOUND" -Message "Entidad no encontrada."
  }

  if ([string]::IsNullOrWhiteSpace($tail)) {
    switch ($method) {
      "GET" {
        return Invoke-ApiV1ListRecords -Store $store -EntityKind $entityKind -Query $query
      }
      "POST" {
        try {
          $body = Get-ApiV1RequestBody -Request $Request
        } catch {
          return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind $entityKind -Action "create" -Message $_.Exception.Message
        }
        return Invoke-ApiV1CreateRecord -Store $store -EntityKind $entityKind -Record $body
      }
      default {
        return New-ApiV1ErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -EntityKind $entityKind -Action "list" -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
      }
    }
  }

  if ($tail -eq "changes") {
    if ($method -ne "GET") {
      return New-ApiV1ErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -EntityKind $entityKind -Action "changes" -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
    }
    return Invoke-ApiV1Changes -Store $store -EntityKind $entityKind -Query $query
  }

  if ($tail -eq "sync") {
    if ($method -ne "POST") {
      return New-ApiV1ErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -EntityKind $entityKind -Action "sync" -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
    }
    try {
      $body = Get-ApiV1RequestBody -Request $Request
    } catch {
      return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind $entityKind -Action "sync" -Message $_.Exception.Message
    }
    return Invoke-ApiV1Sync -Store $store -EntityKind $entityKind -Body $body
  }

  if ($tail -match "^(?<id>[^/]+)/(?<action>export|send)$") {
    if ($method -ne "POST") {
      return New-ApiV1ErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -EntityKind $entityKind -Action $Matches.action -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
    }

    try {
      $body = Get-ApiV1RequestBody -Request $Request
    } catch {
      return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind $entityKind -Action $Matches.action -Message $_.Exception.Message
    }

    if ($entityKind -eq "document" -and $Matches.action -eq "export") {
      return Invoke-ApiV1ExportDocument -Store $store -Id $Matches.id -Body $body
    }

    if ($entityKind -eq "mailoutbox" -and $Matches.action -eq "send") {
      return Invoke-ApiV1SendMailOutbox -Store $store -Id $Matches.id -Body $body
    }

    return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind $entityKind -Action $Matches.action -Code "NOT_FOUND" -Message "Accion no disponible para esta entidad."
  }

  if ($tail -match "^(?<id>[^/]+)/(?<action>archive|unarchive)$") {
    if ($method -ne "POST") {
      return New-ApiV1ErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -EntityKind $entityKind -Action $Matches.action -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
    }
    return Invoke-ApiV1ArchiveRecord -Store $store -EntityKind $entityKind -Id $Matches.id -Archived ($Matches.action -eq "archive")
  }

  if ($entityKind -eq "quote" -and $tail -match "^(?<id>[^/]+)/provider$") {
    if ($method -eq "GET" -or $method -eq "POST" -or $method -eq "PATCH" -or $method -eq "PUT") {
      try {
        $body = if ($method -eq "GET") { $null } else { Get-ApiV1RequestBody -Request $Request }
      } catch {
        return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind $entityKind -Action "provider" -Message $_.Exception.Message
      }
      return Invoke-ApiV1QuoteProviderFlow -Store $store -Id $Matches.id -Method $method -Body $body
    }
    return New-ApiV1ErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -EntityKind $entityKind -Action "provider" -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
  }

  if ($entityKind -eq "provider" -and $tail -match "^(?<id>[^/]+)/(?<resource>routes|trips|documents|operational|quotes)$") {
    $resource = [string]$Matches.resource
    switch ($method) {
      "GET" {
        return Invoke-ApiV1ProviderResourceRequest -Store $store -Id $Matches.id -Resource $resource -Method $method -Body $null
      }
      "POST" {
        try {
          $body = Get-ApiV1RequestBody -Request $Request
        } catch {
          return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind $entityKind -Action $resource -Message $_.Exception.Message
        }
        return Invoke-ApiV1ProviderResourceRequest -Store $store -Id $Matches.id -Resource $resource -Method $method -Body $body
      }
      "PATCH" {
        try {
          $body = Get-ApiV1RequestBody -Request $Request
        } catch {
          return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind $entityKind -Action $resource -Message $_.Exception.Message
        }
        return Invoke-ApiV1ProviderResourceRequest -Store $store -Id $Matches.id -Resource $resource -Method $method -Body $body
      }
      "PUT" {
        try {
          $body = Get-ApiV1RequestBody -Request $Request
        } catch {
          return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind $entityKind -Action $resource -Message $_.Exception.Message
        }
        return Invoke-ApiV1ProviderResourceRequest -Store $store -Id $Matches.id -Resource $resource -Method $method -Body $body
      }
      default {
        return New-ApiV1ErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -EntityKind $entityKind -Action $resource -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
      }
    }
  }

  if ($method -eq "GET" -or $method -eq "PATCH" -or $method -eq "PUT") {
    if ($tail -notmatch "^[^/]+$") {
      return New-ApiV1ErrorResponse -StatusCode 404 -ReasonPhrase "Not Found" -EntityKind $entityKind -Action "getById" -Code "NOT_FOUND" -Message "Ruta no encontrada."
    }

    $id = $tail
    switch ($method) {
      "GET" {
        return Invoke-ApiV1GetRecord -Store $store -EntityKind $entityKind -Id $id
      }
      "PATCH" {
        try {
          $body = Get-ApiV1RequestBody -Request $Request
        } catch {
          return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind $entityKind -Action "update" -Message $_.Exception.Message
        }
        return Invoke-ApiV1UpdateRecord -Store $store -EntityKind $entityKind -Id $id -Record $body
      }
      "PUT" {
        try {
          $body = Get-ApiV1RequestBody -Request $Request
        } catch {
          return New-ApiV1ErrorResponse -StatusCode 400 -ReasonPhrase "Bad Request" -EntityKind $entityKind -Action "update" -Message $_.Exception.Message
        }
        return Invoke-ApiV1UpdateRecord -Store $store -EntityKind $entityKind -Id $id -Record $body
      }
    }
  }

  return New-ApiV1ErrorResponse -StatusCode 405 -ReasonPhrase "Method Not Allowed" -EntityKind $entityKind -Action "" -Code "NOT_IMPLEMENTED" -Message "Metodo no permitido."
}
