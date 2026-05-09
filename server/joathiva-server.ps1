param(
  [int]$Port = 8787
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ServerRootCandidates = @(
  (Join-Path $ProjectRoot "V"),
  (Join-Path $ProjectRoot "android-app\app\src\main\assets\www"),
  $ProjectRoot
)
$ServerRoot = $ServerRootCandidates | Where-Object { Test-Path $_ -PathType Container } | Select-Object -First 1
$DataDir = Join-Path $PSScriptRoot "data"
$DbPath = Join-Path $DataDir "joathiva-db.json"
$MailboxProfilesPath = Join-Path $DataDir "mailbox-profiles.json"
$ToolProfilesPath = Join-Path $DataDir "tool-profiles.json"
$ToolSecretsPath = Join-Path $DataDir "tool-secrets.protected.json"
$LuciaSettingsPath = Join-Path $DataDir "lucia-settings.json"
$LuciaSecretsPath = Join-Path $DataDir "lucia-secrets.protected.json"
$LuciaImportsPath = Join-Path $DataDir "lucia-imports.json"
$OpenAiSettingsPath = Join-Path $DataDir "openai-settings.json"
$ExternalManagementWorkbookId = "1nnv6VTlu0EENM5b2Uzxiq9JOa3fl4icBAC_M4vLZXWg"
$ExternalManagementWorkbookName = "JHOATHIVA"
$ExternalManagementWorkbookUrl = "https://docs.google.com/spreadsheets/d/$ExternalManagementWorkbookId/edit?usp=sharing"
$ExternalManagementWorkbookExportBaseUrl = "https://docs.google.com/spreadsheets/d/$ExternalManagementWorkbookId/gviz/tq?tqx=out:csv"
$ExternalManagementCacheTtlSeconds = 20
$ExternalManagementSyncIntervalSeconds = 20
$script:ExternalManagementCache = $null
if ($null -eq $script:PortalSessions -or -not ($script:PortalSessions -is [hashtable])) {
  $script:PortalSessions = @{}
}

if (-not $ServerRoot) {
  throw "No se encontro una carpeta valida para servir la interfaz web."
}

$ServerRoot = [System.IO.Path]::GetFullPath($ServerRoot)

if (-not (Test-Path $DataDir)) {
  New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
}

if (-not (Test-Path $DbPath)) {
  throw "No se encontró la base JSON en $DbPath"
}

if (-not (Test-Path $MailboxProfilesPath)) {
  Set-Content -LiteralPath $MailboxProfilesPath -Value "[]" -Encoding UTF8
}

if (-not (Test-Path $ToolProfilesPath)) {
  Set-Content -LiteralPath $ToolProfilesPath -Value "[]" -Encoding UTF8
}

if (-not (Test-Path $ToolSecretsPath)) {
  Set-Content -LiteralPath $ToolSecretsPath -Value "{}" -Encoding UTF8
}

if (-not (Test-Path $LuciaSettingsPath)) {
  Set-Content -LiteralPath $LuciaSettingsPath -Value (@{
    enabled = $false
    menuUrl = "https://aplicaciones.aduanas.gub.uy/LuciaXMenuNuevo/Globales.Menues.Inicio.aspx"
    username = ""
    passwordSecretRef = ""
    updatedAt = ""
  } | ConvertTo-Json -Depth 10) -Encoding UTF8
}

if (-not (Test-Path $LuciaSecretsPath)) {
  Set-Content -LiteralPath $LuciaSecretsPath -Value "{}" -Encoding UTF8
}

if (-not (Test-Path $LuciaImportsPath)) {
  Set-Content -LiteralPath $LuciaImportsPath -Value (@{
    updatedAt = ""
    sourceDir = ""
    importCount = 0
    packages = @()
    files = @()
  } | ConvertTo-Json -Depth 10) -Encoding UTF8
}

if (-not (Test-Path $OpenAiSettingsPath)) {
  Set-Content -LiteralPath $OpenAiSettingsPath -Value (@{
    apiKey = ""
    model = "gpt-5"
    reasoningEffort = "low"
    instructions = "Eres el asistente interno de JoathiVA. Responde siempre en espanol claro, orientado a logistica, transporte, comercio exterior, growth B2B y ejecucion comercial. Prioriza propuestas accionables, tono ejecutivo y foco en Sudamerica."
  } | ConvertTo-Json -Depth 10) -Encoding UTF8
}

function Get-MimeType {
  param([string]$Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".svg" { "image/svg+xml" }
    ".ico" { "image/x-icon" }
    ".pdf" { "application/pdf" }
    ".txt" { "text/plain; charset=utf-8" }
    default { "application/octet-stream" }
  }
}

function Get-DbState {
  $raw = Get-Content -LiteralPath $DbPath -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return @{}
  }
  return $raw | ConvertFrom-Json
}

function Save-DbState {
  param([object]$State)

  $json = $State | ConvertTo-Json -Depth 100
  Set-Content -LiteralPath $DbPath -Value $json -Encoding UTF8
}

function Get-JsonRequestBody {
  param([object]$Request)

  if ([string]::IsNullOrWhiteSpace($Request.BodyText)) {
    throw "Body JSON vacio."
  }

  try {
    return $Request.BodyText | ConvertFrom-Json
  } catch {
    throw "Body JSON invalido."
  }
}

. (Join-Path $PSScriptRoot "api-v1-backend.ps1")
. (Join-Path $PSScriptRoot "assistant\assistant-backend.ps1")

function Get-MailboxProfiles {
  $raw = Get-Content -LiteralPath $MailboxProfilesPath -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return @()
  }

  try {
    $parsed = $raw | ConvertFrom-Json
    if ($parsed -is [System.Array]) {
      return @($parsed)
    }
    if ($parsed) {
      return @($parsed)
    }
  } catch {
  }

  return @()
}

function Get-MailboxProfile {
  param([string]$ProfileId)

  if ([string]::IsNullOrWhiteSpace($ProfileId)) {
    return $null
  }

  return Get-MailboxProfiles | Where-Object { ([string]$_.id).Trim().ToLowerInvariant() -eq $ProfileId.Trim().ToLowerInvariant() } | Select-Object -First 1
}

function Get-ToolProfiles {
  $raw = Get-Content -LiteralPath $ToolProfilesPath -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return @()
  }

  try {
    $parsed = $raw | ConvertFrom-Json
    if ($parsed -is [System.Array]) {
      return @($parsed)
    }
    if ($parsed) {
      return @($parsed)
    }
  } catch {
  }

  return @()
}

function Get-ToolSecrets {
  if (-not (Test-Path $ToolSecretsPath)) {
    return @{}
  }

  $raw = Get-Content -LiteralPath $ToolSecretsPath -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return @{}
  }

  try {
    return ConvertTo-ApiV1Dictionary ($raw | ConvertFrom-Json)
  } catch {
    return @{}
  }
}

function Get-LuciaSecrets {
  if (-not (Test-Path $LuciaSecretsPath)) {
    return @{}
  }

  $raw = Get-Content -LiteralPath $LuciaSecretsPath -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return @{}
  }

  try {
    return ConvertTo-ApiV1Dictionary ($raw | ConvertFrom-Json)
  } catch {
    return @{}
  }
}

function Get-DefaultLuciaSettings {
  return [pscustomobject]@{
    enabled = $false
    menuUrl = "https://aplicaciones.aduanas.gub.uy/LuciaXMenuNuevo/Globales.Menues.Inicio.aspx"
    username = ""
    passwordSecretRef = ""
    updatedAt = ""
  }
}

function Get-LuciaSettings {
  $defaults = Get-DefaultLuciaSettings
  $raw = Get-Content -LiteralPath $LuciaSettingsPath -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $defaults
  }

  try {
    $parsed = $raw | ConvertFrom-Json
    return [pscustomobject]@{
      enabled = [bool]$parsed.enabled
      menuUrl = if ([string]::IsNullOrWhiteSpace([string]$parsed.menuUrl)) { [string]$defaults.menuUrl } else { [string]$parsed.menuUrl }
      username = [string]$parsed.username
      passwordSecretRef = [string]$parsed.passwordSecretRef
      updatedAt = [string]$parsed.updatedAt
    }
  } catch {
    return $defaults
  }
}

function Save-LuciaSettings {
  param([object]$Settings)

  $payload = [pscustomobject]@{
    enabled = [bool]$Settings.enabled
    menuUrl = [string]$Settings.menuUrl
    username = [string]$Settings.username
    passwordSecretRef = [string]$Settings.passwordSecretRef
    updatedAt = if ([string]::IsNullOrWhiteSpace([string]$Settings.updatedAt)) { (Get-Date).ToString("o") } else { [string]$Settings.updatedAt }
  }

  $json = $payload | ConvertTo-Json -Depth 10
  Set-Content -LiteralPath $LuciaSettingsPath -Value $json -Encoding UTF8
}

function Get-LuciaPasswordHint {
  param([string]$Password)

  $clean = [string]$Password
  if ([string]::IsNullOrWhiteSpace($clean)) {
    return ""
  }

  if ($clean.Length -le 4) {
    return ("*" * $clean.Length)
  }

  return "{0}..." -f $clean.Substring(0, 2)
}

function Get-LuciaPublicSettings {
  $settings = Get-LuciaSettings
  $secrets = Get-LuciaSecrets
  $secretRef = [string]$settings.passwordSecretRef
  $passwordHint = ""
  if (-not [string]::IsNullOrWhiteSpace($secretRef) -and $secrets.ContainsKey($secretRef)) {
    $passwordHint = Get-LuciaPasswordHint -Password (ConvertFrom-ProtectedSecretValue -ProtectedValue ([string]$secrets[$secretRef].protectedValue))
  }

  return [pscustomobject]@{
    ok = $true
    enabled = [bool]$settings.enabled
    menuUrl = [string]$settings.menuUrl
    username = [string]$settings.username
    usernameHint = if ([string]::IsNullOrWhiteSpace([string]$settings.username)) { "" } else { if ($settings.username.Length -le 2) { "*" * $settings.username.Length } else { "{0}..." -f $settings.username.Substring(0, 2) } }
    hasPassword = -not [string]::IsNullOrWhiteSpace($passwordHint)
    passwordHint = $passwordHint
    updatedAt = [string]$settings.updatedAt
  }
}

function Get-LuciaImportState {
  $defaults = [pscustomobject]@{
    updatedAt = ""
    sourceDir = ""
    importCount = 0
    packageCount = 0
    fileCount = 0
  }

  $raw = Get-Content -LiteralPath $LuciaImportsPath -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $defaults
  }

  try {
    $parsed = $raw | ConvertFrom-Json
    return [pscustomobject]@{
      updatedAt = [string]$parsed.updatedAt
      sourceDir = [string]$parsed.sourceDir
      importCount = [int]$parsed.importCount
      packageCount = [int]$parsed.packageCount
      fileCount = [int]$parsed.fileCount
    }
  } catch {
    return $defaults
  }
}

function Save-LuciaImportState {
  param([object]$State)

  $payload = [pscustomobject]@{
    updatedAt = [string]$State.updatedAt
    sourceDir = [string]$State.sourceDir
    importCount = [int]$State.importCount
    packageCount = [int]$State.packageCount
    fileCount = [int]$State.fileCount
  }

  Set-Content -LiteralPath $LuciaImportsPath -Value ($payload | ConvertTo-Json -Depth 20) -Encoding UTF8
}

function Resolve-LuciaImportRoot {
  param([string]$RequestedPath)

  $defaultRoot = Join-Path $ProjectRoot "tools\lucia_export\data\lucia_public_export"
  $candidates = @(
    $RequestedPath,
    $defaultRoot,
    (Join-Path $DataDir "lucia_public_export")
  )
  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace([string]$candidate)) {
      continue
    }
    try {
      $full = [System.IO.Path]::GetFullPath($candidate)
      if (Test-Path -LiteralPath $full -PathType Container) {
        return $full
      }
    } catch {
    }
  }
  return $null
}

function Import-LuciaPublicExports {
  param([string]$SourceDir)

  $root = Resolve-LuciaImportRoot -RequestedPath $SourceDir
  if (-not $root) {
    return @{
      ok = $false
      error = "No se encontro una carpeta valida de exportacion Lucia."
    }
  }

  $manifestDir = Join-Path $root "manifests"
  if (-not (Test-Path -LiteralPath $manifestDir -PathType Container)) {
    return @{
      ok = $false
      error = "La carpeta no contiene el subdirectorio manifests."
    }
  }

  $manifestFiles = @(
    "ftp_root_manifest.csv",
    "ftp_files_manifest.csv",
    "catalogodatos_packages_manifest.csv",
    "catalogodatos_resources_manifest.csv"
  )

  $packageCount = 0
  $fileCount = 0
  foreach ($fileName in $manifestFiles) {
    $manifestPath = Join-Path $manifestDir $fileName
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
      continue
    }

    $rows = @(Import-Csv -LiteralPath $manifestPath -ErrorAction Stop)
    foreach ($row in $rows) {
      $item = [pscustomobject]@{
        sourceManifest = $fileName
        data = $row
      }
      if ($fileName -eq "catalogodatos_packages_manifest.csv") {
        $packageCount += 1
      } else {
        $fileCount += 1
      }
    }
  }

  $state = [pscustomobject]@{
    updatedAt = (Get-Date).ToString("o")
    sourceDir = $root
    importCount = $fileCount + $packageCount
    packageCount = $packageCount
    fileCount = $fileCount
  }
  Save-LuciaImportState -State $state

  return @{
    ok = $true
    updatedAt = $state.updatedAt
    sourceDir = $state.sourceDir
    packageCount = $packageCount
    fileCount = $fileCount
    importCount = $state.importCount
  }
}

function ConvertFrom-ProtectedSecretValue {
  param([string]$ProtectedValue)

  if ([string]::IsNullOrWhiteSpace($ProtectedValue)) {
    return ""
  }

  try {
    $secure = ConvertTo-SecureString $ProtectedValue
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
      return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  } catch {
    return ""
  }
}

function Resolve-ToolProfilePassword {
  param(
    [object]$Profile,
    [hashtable]$Secrets
  )

  $inlinePassword = [string]$Profile.password
  if (-not [string]::IsNullOrWhiteSpace($inlinePassword)) {
    return $inlinePassword
  }

  $secretRef = [string]$Profile.passwordSecretRef
  if ([string]::IsNullOrWhiteSpace($secretRef) -or -not $Secrets.ContainsKey($secretRef)) {
    return ""
  }

  $entry = $Secrets[$secretRef]
  return ConvertFrom-ProtectedSecretValue -ProtectedValue ([string]$entry.protectedValue)
}

function Get-DefaultOpenAiSettings {
  return [pscustomobject]@{
    apiKey = ""
    model = "gpt-5"
    reasoningEffort = "low"
    instructions = "Eres el asistente interno de JoathiVA. Responde siempre en espanol claro, orientado a logistica, transporte, comercio exterior, growth B2B y ejecucion comercial. Prioriza propuestas accionables, tono ejecutivo y foco en Sudamerica."
  }
}

function Get-OpenAiSettings {
  $defaults = Get-DefaultOpenAiSettings
  $raw = Get-Content -LiteralPath $OpenAiSettingsPath -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $defaults
  }

  try {
    $parsed = $raw | ConvertFrom-Json
    return [pscustomobject]@{
      apiKey = [string]$parsed.apiKey
      model = if ([string]::IsNullOrWhiteSpace([string]$parsed.model)) { [string]$defaults.model } else { [string]$parsed.model }
      reasoningEffort = if ([string]::IsNullOrWhiteSpace([string]$parsed.reasoningEffort)) { [string]$defaults.reasoningEffort } else { [string]$parsed.reasoningEffort }
      instructions = if ([string]::IsNullOrWhiteSpace([string]$parsed.instructions)) { [string]$defaults.instructions } else { [string]$parsed.instructions }
    }
  } catch {
    return $defaults
  }
}

function Save-OpenAiSettings {
  param([object]$Settings)

  $payload = [pscustomobject]@{
    apiKey = [string]$Settings.apiKey
    model = [string]$Settings.model
    reasoningEffort = [string]$Settings.reasoningEffort
    instructions = [string]$Settings.instructions
  }

  $json = $payload | ConvertTo-Json -Depth 10
  Set-Content -LiteralPath $OpenAiSettingsPath -Value $json -Encoding UTF8
}

function Get-OpenAiApiKeyHint {
  param([string]$ApiKey)

  $clean = [string]$ApiKey
  if ([string]::IsNullOrWhiteSpace($clean)) {
    return ""
  }

  if ($clean.Length -le 8) {
    return ("*" * $clean.Length)
  }

  return "{0}...{1}" -f $clean.Substring(0, 4), $clean.Substring($clean.Length - 4)
}

function Get-OpenAiPublicSettings {
  $settings = Get-OpenAiSettings
  return [pscustomobject]@{
    ok = $true
    connected = -not [string]::IsNullOrWhiteSpace([string]$settings.apiKey)
    apiKeyHint = Get-OpenAiApiKeyHint -ApiKey ([string]$settings.apiKey)
    model = [string]$settings.model
    reasoningEffort = [string]$settings.reasoningEffort
    instructions = [string]$settings.instructions
  }
}

function Normalize-OpenAiConversation {
  param([object]$Conversation)

  $items = @()
  if ($Conversation -is [System.Array]) {
    $items = @($Conversation)
  } elseif ($Conversation) {
    $items = @($Conversation)
  }

  $normalized = New-Object System.Collections.Generic.List[object]
  foreach ($item in $items) {
    $role = ([string]$item.role).Trim().ToLowerInvariant()
    $content = ([string]$item.content).Trim()
    if ([string]::IsNullOrWhiteSpace($content)) {
      continue
    }
    if ($role -notin @("user", "assistant")) {
      continue
    }

    $normalized.Add([pscustomobject]@{
      role = $role
      content = $content
    }) | Out-Null
  }

  return @($normalized)
}

function Get-OpenAiResponseText {
  param([object]$Response)

  if ($Response -and -not [string]::IsNullOrWhiteSpace([string]$Response.output_text)) {
    return [string]$Response.output_text
  }

  $chunks = New-Object System.Collections.Generic.List[string]
  foreach ($output in @($Response.output)) {
    foreach ($content in @($output.content)) {
      $textValue = [string]$content.text
      if (-not [string]::IsNullOrWhiteSpace($textValue)) {
        $chunks.Add($textValue) | Out-Null
      }
    }
  }

  return ($chunks -join "`n").Trim()
}

function Get-OpenAiErrorMessage {
  param([object]$ErrorRecord)

  $details = [string]$ErrorRecord.ErrorDetails.Message
  if (-not [string]::IsNullOrWhiteSpace($details)) {
    try {
      $parsed = $details | ConvertFrom-Json
      $apiMessage = [string]$parsed.error.message
      if (-not [string]::IsNullOrWhiteSpace($apiMessage)) {
        return $apiMessage
      }
    } catch {
      return $details
    }
  }

  $message = [string]$ErrorRecord.Exception.Message
  if (-not [string]::IsNullOrWhiteSpace($message)) {
    return $message
  }

  return "No fue posible consultar OpenAI."
}

function Invoke-OpenAiTextResponse {
  param(
    [string]$ApiKey,
    [string]$Model,
    [string]$ReasoningEffort,
    [string]$Instructions,
    [string]$WorkspaceContext,
    [object]$Conversation,
    [string]$Prompt
  )

  if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    throw "Debes guardar una API key de OpenAI para usar ChatGPT dentro de JoathiVA."
  }

  if ([string]::IsNullOrWhiteSpace($Prompt)) {
    throw "Debes indicar un mensaje para el asistente."
  }

  $inputMessages = New-Object System.Collections.Generic.List[object]
  if (-not [string]::IsNullOrWhiteSpace($WorkspaceContext)) {
    $inputMessages.Add([pscustomobject]@{
      role = "developer"
      content = "Contexto actual de JoathiVA:`n$WorkspaceContext"
    }) | Out-Null
  }

  foreach ($message in @(Normalize-OpenAiConversation -Conversation $Conversation)) {
    $inputMessages.Add($message) | Out-Null
  }

  $inputMessages.Add([pscustomobject]@{
    role = "user"
    content = $Prompt.Trim()
  }) | Out-Null

  $payload = [ordered]@{
    model = if ([string]::IsNullOrWhiteSpace($Model)) { "gpt-5" } else { $Model.Trim() }
    instructions = [string]$Instructions
    input = @($inputMessages)
  }

  if (-not [string]::IsNullOrWhiteSpace($ReasoningEffort) -and $ReasoningEffort.Trim().ToLowerInvariant() -ne "none") {
    $payload.reasoning = @{
      effort = $ReasoningEffort.Trim().ToLowerInvariant()
    }
  }

  try {
    $response = Invoke-RestMethod -Method Post -Uri "https://api.openai.com/v1/responses" -Headers @{
      Authorization = "Bearer $ApiKey"
    } -ContentType "application/json" -Body ($payload | ConvertTo-Json -Depth 30)
  } catch {
    throw (Get-OpenAiErrorMessage -ErrorRecord $_)
  }

  $outputText = Get-OpenAiResponseText -Response $response
  if ([string]::IsNullOrWhiteSpace($outputText)) {
    throw "OpenAI respondio sin texto util."
  }

  return [pscustomobject]@{
    ok = $true
    id = [string]$response.id
    model = [string]$response.model
    outputText = $outputText
  }
}

function New-ExternalManagementWebClient {
  $webClient = New-Object System.Net.WebClient
  $webClient.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) JoathiVA/1.0")
  return $webClient
}

function Get-ExternalManagementWorkbookHtml {
  $webClient = New-ExternalManagementWebClient

  try {
    return $webClient.DownloadString($ExternalManagementWorkbookUrl)
  } finally {
    $webClient.Dispose()
  }
}

function Get-ExternalManagementWorkbookTabs {
  $html = Get-ExternalManagementWorkbookHtml
  $pattern = '\[21350203,"\[(\d+),0,\\"([^\\"]+)\\",\[\{\\"1\\":\[\[0,0,\\"([^\\"]+)\\"'
  $matches = [regex]::Matches($html, $pattern)

  if (-not $matches.Count) {
    throw "No se pudieron descubrir las hojas visibles del workbook."
  }

  $tabs = foreach ($match in $matches) {
    [pscustomobject]@{
      index = [int]$match.Groups[1].Value
      gid = [string]$match.Groups[2].Value
      name = [string]$match.Groups[3].Value
    }
  }

  return @(
    $tabs |
      Sort-Object index |
      Group-Object gid |
      ForEach-Object { $_.Group | Select-Object -First 1 }
  )
}

function Get-ExternalManagementSheetCsv {
  param([string]$Gid)

  if ([string]::IsNullOrWhiteSpace($Gid)) {
    throw "No se recibio un gid valido para exportar la hoja."
  }

  $sheetUrl = "$ExternalManagementWorkbookExportBaseUrl&gid=$([uri]::EscapeDataString($Gid))"
  $webClient = New-ExternalManagementWebClient

  try {
    return $webClient.DownloadString($sheetUrl)
  } finally {
    $webClient.Dispose()
  }
}

function Get-ExternalManagementContentHash {
  param([string]$Text)

  if ($null -eq $Text) {
    return ""
  }

  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes([string]$Text)
    $hashBytes = $sha.ComputeHash($bytes)
    return [System.BitConverter]::ToString($hashBytes).Replace("-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Get-ExternalManagementWorkbookHash {
  param([object[]]$Sheets)

  $parts = @($Sheets) | ForEach-Object {
    $name = [string]$_.name
    $hash = [string]$_.contentHash
    "$name`:$hash"
  }

  return Get-ExternalManagementContentHash -Text ($parts -join "|")
}

function Get-ExternalManagementRowCount {
  param([string]$CsvText)

  if ([string]::IsNullOrWhiteSpace($CsvText)) {
    return 0
  }

  return @($CsvText -split "\r?\n").Count
}

function New-ExternalManagementSnapshotResponse {
  param(
    [object]$Snapshot,
    [bool]$Cached = $false,
    [bool]$Stale = $false,
    [string]$Warning = ""
  )

  $mergedWarning = @([string]$Snapshot.warning, [string]$Warning) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

  return [pscustomobject]@{
    ok = $true
    source = "Google Sheets"
    workbookName = $ExternalManagementWorkbookName
    workbookUrl = $ExternalManagementWorkbookUrl
    workbookHash = Get-ExternalManagementWorkbookHash -Sheets @($Snapshot.sheets)
    fetchedAt = ([datetime]$Snapshot.fetchedAt).ToString("o")
    cached = $Cached
    stale = $Stale
    warning = ($mergedWarning -join " ")
    syncIntervalSeconds = $ExternalManagementSyncIntervalSeconds
    sheetCount = @($Snapshot.sheets).Count
    sheets = @($Snapshot.sheets)
  }
}

function Get-ExternalManagementSnapshot {
  param([bool]$ForceRefresh = $false)

  $now = Get-Date
  $cache = $script:ExternalManagementCache

  if (-not $ForceRefresh -and $cache -and $cache.fetchedAt) {
    $age = ($now - [datetime]$cache.fetchedAt).TotalSeconds
    if ($age -lt $ExternalManagementCacheTtlSeconds) {
      return New-ExternalManagementSnapshotResponse -Snapshot $cache -Cached $true -Stale $false
    }
  }

  try {
    $tabs = Get-ExternalManagementWorkbookTabs
    $sheetSnapshots = @()
    $failedSheets = @()

    foreach ($tab in $tabs) {
      $sheetUrl = "$ExternalManagementWorkbookExportBaseUrl&gid=$([uri]::EscapeDataString($tab.gid))"

      try {
        $csvText = Get-ExternalManagementSheetCsv -Gid $tab.gid
        $sheetSnapshots += [pscustomobject]@{
          ok = $true
          index = [int]$tab.index
          gid = [string]$tab.gid
          name = [string]$tab.name
          csvText = [string]$csvText
          rowCount = Get-ExternalManagementRowCount -CsvText $csvText
          contentHash = Get-ExternalManagementContentHash -Text $csvText
          sourceUrl = $sheetUrl
        }
      } catch {
        $safeMessage = [string]$_.Exception.Message
        if ([string]::IsNullOrWhiteSpace($safeMessage)) {
          $safeMessage = "No se pudo exportar la hoja."
        }

        $failedSheets += [string]$tab.name
        $sheetSnapshots += [pscustomobject]@{
          ok = $false
          index = [int]$tab.index
          gid = [string]$tab.gid
          name = [string]$tab.name
          csvText = ""
          rowCount = 0
          contentHash = ""
          sourceUrl = $sheetUrl
          error = $safeMessage
        }
      }
    }

    if (-not $sheetSnapshots.Count) {
      throw "El workbook no devolvio hojas utilizables."
    }

    $snapshot = [pscustomobject]@{
      fetchedAt = Get-Date
      warning = if ($failedSheets.Count) { "No se pudieron leer $($failedSheets.Count) hojas: $($failedSheets -join ', ')." } else { "" }
      sheets = @($sheetSnapshots)
    }

    $script:ExternalManagementCache = $snapshot
    return New-ExternalManagementSnapshotResponse -Snapshot $snapshot -Cached $false -Stale $false
  } catch {
    if ($cache -and $cache.sheets) {
      return New-ExternalManagementSnapshotResponse -Snapshot $cache -Cached $true -Stale $true -Warning "No se pudo refrescar el workbook. Se muestra la ultima copia disponible en cache."
    }

    throw
  }
}

function Get-PortalUserByCredentials {
  param(
    [string]$Username,
    [string]$Password
  )

  if ([string]::IsNullOrWhiteSpace($Username) -or [string]::IsNullOrWhiteSpace($Password)) {
    return $null
  }

  $normalizedUsername = $Username.Trim().ToLowerInvariant()
  $state = Get-DbState
  foreach ($user in @($state.users)) {
    $candidateUsername = ([string]$user.username).Trim().ToLowerInvariant()
    $candidateEmail = ([string]$user.email).Trim().ToLowerInvariant()
    $candidatePassword = [string]$user.password
    if (($candidateUsername -eq $normalizedUsername -or $candidateEmail -eq $normalizedUsername) -and $candidatePassword -eq $Password) {
      return $user
    }
  }

  return $null
}

function New-PortalSessionToken {
  $bytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }

  return ([Convert]::ToBase64String($bytes).TrimEnd([char[]]"=")).Replace("+", "-").Replace("/", "_")
}

function ConvertTo-PortalPermissionMap {
  param([object]$Permissions)

  $map = @{}
  if ($null -eq $Permissions) {
    return $map
  }

  if ($Permissions -is [System.Collections.IDictionary]) {
    foreach ($key in $Permissions.Keys) {
      $map[[string]$key] = [bool]$Permissions[$key]
    }
    return $map
  }

  foreach ($property in $Permissions.PSObject.Properties) {
    $map[$property.Name] = [bool]$property.Value
  }

  return $map
}

function Get-PortalSessionUserSummary {
  param([object]$User)

  if (-not $User) {
    return $null
  }

  return [pscustomobject]@{
    id = [string]$User.id
    username = [string]$User.username
    role = [string]$User.role
    displayName = [string]$User.displayName
    email = [string]$User.email
    jobTitle = [string]$User.jobTitle
    mainScreen = [string]$User.mainScreen
    permissions = ConvertTo-PortalPermissionMap -Permissions $User.permissions
  }
}

function New-PortalSession {
  param(
    [object]$User,
    [int]$TtlMinutes = 480
  )

  if (-not $User) {
    throw "No se recibio un usuario valido para iniciar sesion."
  }

  if ($TtlMinutes -lt 1) {
    $TtlMinutes = 480
  }

  $userSummary = Get-PortalSessionUserSummary -User $User
  $sessionToken = New-PortalSessionToken
  $expiresAt = (Get-Date).AddMinutes($TtlMinutes)
  $session = [pscustomobject]@{
    userId = [string]$User.id
    username = [string]$User.username
    role = [string]$User.role
    displayName = $userSummary.displayName
    jobTitle = $userSummary.jobTitle
    mainScreen = $userSummary.mainScreen
    permissions = $userSummary.permissions
    createdAt = (Get-Date).ToString("o")
    expiresAt = $expiresAt.ToString("o")
  }

  $script:PortalSessions[$sessionToken] = $session

  return [pscustomobject]@{
    sessionToken = $sessionToken
    userId = $session.userId
    username = $session.username
    role = $session.role
    displayName = $session.displayName
    jobTitle = $session.jobTitle
    mainScreen = $session.mainScreen
    permissions = $session.permissions
    expiresAt = $session.expiresAt
  }
}

function Get-PortalUserBySessionToken {
  param([string]$SessionToken)

  if ([string]::IsNullOrWhiteSpace($SessionToken)) {
    return $null
  }

  $token = $SessionToken.Trim()
  if (-not $script:PortalSessions.ContainsKey($token)) {
    return $null
  }

  $session = $script:PortalSessions[$token]
  try {
    $expiresAt = [datetime]$session.expiresAt
    if ($expiresAt -lt (Get-Date)) {
      $script:PortalSessions.Remove($token)
      return $null
    }
  } catch {
    $script:PortalSessions.Remove($token)
    return $null
  }

  $sessionUserId = ([string]$session.userId).Trim().ToLowerInvariant()
  $sessionUsername = ([string]$session.username).Trim().ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($sessionUserId) -and [string]::IsNullOrWhiteSpace($sessionUsername)) {
    return $null
  }

  $state = Get-DbState
  foreach ($user in @($state.users)) {
    $candidateUserId = ([string]$user.id).Trim().ToLowerInvariant()
    $candidateUsername = ([string]$user.username).Trim().ToLowerInvariant()
    if ((-not [string]::IsNullOrWhiteSpace($sessionUserId) -and $candidateUserId -eq $sessionUserId) -or
        (-not [string]::IsNullOrWhiteSpace($sessionUsername) -and $candidateUsername -eq $sessionUsername)) {
      return $user
    }
  }

  return $null
}

function Write-AuthErrorResponse {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Response,

        [int]$StatusCode = 401,

        [string]$Message = "Authentication required"
    )

    $Response.StatusCode = $StatusCode
    $Response.ContentType = "application/json"

    $payload = @{
        ok = $false
        error = $Message
    } | ConvertTo-Json -Depth 8

    $buffer = [System.Text.Encoding]::UTF8.GetBytes($payload)
    $Response.OutputStream.Write($buffer, 0, $buffer.Length)
    $Response.OutputStream.Close()
}

function Assert-PortalAuthenticatedUser {
    param(
        [object]$Request,
        [Parameter(Mandatory = $true)]
        [object]$Response,
        [object]$RequestBody
    )

    $portalUser = Get-PortalUserFromRequestBody -RequestBody $RequestBody

    if (-not $portalUser) {
        Write-AuthErrorResponse -Response $Response -StatusCode 401 -Message "Invalid or missing portal session"
        return $null
    }

    return $portalUser
}

function Assert-PortalRole {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Response,

        [Parameter(Mandatory = $true)]
        [object]$PortalUser,

        [Parameter(Mandatory = $true)]
        [string[]]$AllowedRoles
    )

    if (-not $PortalUser) {
        Write-AuthErrorResponse -Response $Response -StatusCode 401 -Message "Authentication required"
        return $false
    }

    if (-not $AllowedRoles -or $AllowedRoles.Count -eq 0) {
        Write-AuthErrorResponse -Response $Response -StatusCode 403 -Message "No portal roles allowed"
        return $false
    }

    $role = [string]$PortalUser.role

    if (-not $role -or ($AllowedRoles -notcontains $role)) {
        Write-AuthErrorResponse -Response $Response -StatusCode 403 -Message "Forbidden"
        return $false
    }

    return $true
}

function Get-PortalUserFromRequestBody {
  param([object]$Body)

  if (-not $Body) {
    return $null
  }

  $sessionToken = ([string]$Body.sessionToken).Trim()
  if (-not [string]::IsNullOrWhiteSpace($sessionToken)) {
    return Get-PortalUserBySessionToken -SessionToken $sessionToken
  }

  return $null
}

function Get-ToolProfilesForUser {
  param([object]$User)

  if (-not $User -or ([string]$User.role).Trim().ToLowerInvariant() -ne "master") {
    return @()
  }

  $normalizedUsername = ([string]$User.username).Trim().ToLowerInvariant()
  if ([string]::IsNullOrWhiteSpace($normalizedUsername)) {
    return @()
  }

  $secrets = Get-ToolSecrets
  return @(Get-ToolProfiles | Where-Object {
    ([string]$_.owner).Trim().ToLowerInvariant() -eq $normalizedUsername
  } | ForEach-Object {
    [pscustomobject]@{
      id = [string]$_.id
      owner = [string]$_.owner
      label = [string]$_.label
      toolKey = [string]$_.toolKey
      target = [string]$_.target
      username = [string]$_.username
      password = Resolve-ToolProfilePassword -Profile $_ -Secrets $secrets
      passwordSecretRef = [string]$_.passwordSecretRef
      authMode = [string]$_.authMode
      usernameLabel = [string]$_.usernameLabel
      passwordLabel = [string]$_.passwordLabel
      note = [string]$_.note
    }
  })
}

function Open-AllowedTools {
  param([object[]]$Tools)

  $catalog = @{
    "chatgpt" = @{ key = "chatgpt"; label = "ChatGPT"; target = "https://chatgpt.com/" }
    "canva" = @{ key = "canva"; label = "Canva"; target = "https://www.canva.com/login" }
    "firefly" = @{ key = "firefly"; label = "Adobe Firefly"; target = "https://firefly.adobe.com/" }
    "linkedin" = @{ key = "linkedin"; label = "LinkedIn"; target = "https://www.linkedin.com/login" }
    "meta-business-suite" = @{ key = "meta-business-suite"; label = "Meta Business Suite"; target = "https://business.facebook.com/latest/home" }
  }

  $opened = New-Object System.Collections.Generic.List[object]
  foreach ($item in @($Tools | Where-Object { $_ })) {
    $toolKey = ([string]$item).Trim().ToLowerInvariant()
    if (-not $catalog.ContainsKey($toolKey)) {
      continue
    }

    $entry = $catalog[$toolKey]
    Start-Process $entry.target | Out-Null
    $opened.Add([pscustomobject]@{
      key = $entry.key
      label = $entry.label
      target = $entry.target
    })
  }

  return $opened
}

function ConvertTo-ImapQuotedString {
  param([string]$Value)

  $escaped = ([string]$Value).Replace("\", "\\").Replace('"', '\"')
  return '"' + $escaped + '"'
}

function Read-StreamExact {
  param(
    [System.IO.Stream]$Stream,
    [int]$Count
  )

  $buffer = New-Object byte[] $Count
  $offset = 0

  while ($offset -lt $Count) {
    $read = $Stream.Read($buffer, $offset, $Count - $offset)
    if ($read -le 0) {
      throw "La conexion con el servidor IMAP se interrumpio."
    }
    $offset += $read
  }

  return $buffer
}

function Read-ImapLine {
  param([System.IO.Stream]$Stream)

  $bytes = New-Object System.Collections.Generic.List[byte]

  while ($true) {
    $chunk = New-Object byte[] 1
    $read = $Stream.Read($chunk, 0, 1)
    if ($read -le 0) {
      if ($bytes.Count -eq 0) {
        return $null
      }
      break
    }

    $bytes.Add($chunk[0])

    if ($bytes.Count -ge 2 -and $bytes[$bytes.Count - 2] -eq 13 -and $bytes[$bytes.Count - 1] -eq 10) {
      break
    }
  }

  $array = $bytes.ToArray()
  if ($array.Length -ge 2 -and $array[$array.Length - 2] -eq 13 -and $array[$array.Length - 1] -eq 10) {
    return [System.Text.Encoding]::ASCII.GetString($array, 0, $array.Length - 2)
  }

  return [System.Text.Encoding]::ASCII.GetString($array)
}

function Read-ImapResponse {
  param(
    [System.IO.Stream]$Stream,
    [string]$Tag
  )

  $entries = New-Object System.Collections.Generic.List[object]

  while ($true) {
    $line = Read-ImapLine -Stream $Stream
    if ($null -eq $line) {
      throw "No hubo respuesta completa del servidor IMAP."
    }

    $entry = [ordered]@{
      line = $line
      literal = $null
    }

    if ($line -match '\{(\d+)\}$') {
      $literalLength = [int]$Matches[1]
      $literalBytes = Read-StreamExact -Stream $Stream -Count $literalLength
      $entry.literal = [System.Text.Encoding]::UTF8.GetString($literalBytes)
    }

    $entries.Add([pscustomobject]$entry)

    if ($Tag -and $line.StartsWith("$Tag ")) {
      break
    }
  }

  return $entries
}

function Invoke-ImapCommand {
  param(
    [System.IO.Stream]$Stream,
    [ref]$TagCounter,
    [string]$Command,
    [string]$SafeCommand = ""
  )

  $tag = "A{0:0000}" -f $TagCounter.Value
  $TagCounter.Value += 1

  $payload = [System.Text.Encoding]::ASCII.GetBytes("$tag $Command`r`n")
  $Stream.Write($payload, 0, $payload.Length)
  $Stream.Flush()

  $response = Read-ImapResponse -Stream $Stream -Tag $tag
  $statusLine = $response[$response.Count - 1].line

  if ($statusLine -notmatch "^$tag OK\b") {
    $details = ($response | ForEach-Object { $_.line }) -join " | "
    $commandLabel = if ([string]::IsNullOrWhiteSpace($SafeCommand)) {
      (($Command -split '\s+', 2)[0] | Where-Object { $_ } | Select-Object -First 1)
    } else {
      $SafeCommand
    }
    throw "Fallo IMAP en '$commandLabel': $details"
  }

  return $response
}

function Parse-ImapSearchUids {
  param([object[]]$Response)

  foreach ($entry in $Response) {
    if ($entry.line -match '^\* SEARCH\s*(.*)$') {
      $raw = $Matches[1].Trim()
      if ([string]::IsNullOrWhiteSpace($raw)) {
        return @()
      }

      return @($raw -split '\s+' | Where-Object { $_ -match '^\d+$' })
    }
  }

  return @()
}

function Convert-FromQuotedPrintable {
  param([string]$Value)

  $text = ([string]$Value).Replace("_", " ")
  $buffer = New-Object System.IO.MemoryStream

  for ($index = 0; $index -lt $text.Length; $index += 1) {
    if ($text[$index] -eq "=" -and $index + 2 -lt $text.Length) {
      $hex = $text.Substring($index + 1, 2)
      if ($hex -match '^[0-9A-Fa-f]{2}$') {
        $buffer.WriteByte([Convert]::ToByte($hex, 16))
        $index += 2
        continue
      }
    }

    $buffer.WriteByte([byte][char]$text[$index])
  }

  return $buffer.ToArray()
}

function Decode-Rfc2047Text {
  param([string]$Value)

  return [regex]::Replace([string]$Value, '=\?([^?]+)\?([bBqQ])\?([^?]*)\?=', {
    param($match)

    $charset = $match.Groups[1].Value
    $transfer = $match.Groups[2].Value.ToUpperInvariant()
    $payload = $match.Groups[3].Value

    try {
      $encoding = [System.Text.Encoding]::GetEncoding($charset)
    } catch {
      $encoding = [System.Text.Encoding]::UTF8
    }

    try {
      if ($transfer -eq "B") {
        return $encoding.GetString([Convert]::FromBase64String($payload))
      }

      return $encoding.GetString((Convert-FromQuotedPrintable -Value $payload))
    } catch {
      return $match.Value
    }
  })
}

function Parse-EmailHeaders {
  param([string]$RawHeaders)

  $headers = @{}
  $normalized = [regex]::Replace([string]$RawHeaders, "`r?`n[ `t]+", " ")

  foreach ($line in ($normalized -split "`r?`n")) {
    if ($line -match '^([^:]+):\s*(.*)$') {
      $name = $Matches[1].Trim().ToLowerInvariant()
      $value = Decode-Rfc2047Text -Value $Matches[2].Trim()
      if (-not $headers.ContainsKey($name)) {
        $headers[$name] = $value
      }
    }
  }

  return $headers
}

function Convert-ImapDateToIso {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }

  try {
    return ([System.DateTimeOffset]::Parse($Value, [System.Globalization.CultureInfo]::InvariantCulture)).ToString("o")
  } catch {
    return [string]$Value
  }
}

function Normalize-EmailPreview {
  param([string]$RawText)

  if ([string]::IsNullOrWhiteSpace($RawText)) {
    return ""
  }

  $text = [string]$RawText
  $text = [regex]::Replace($text, '(?is)<style.*?</style>', ' ')
  $text = [regex]::Replace($text, '(?is)<script.*?</script>', ' ')
  $text = [regex]::Replace($text, '(?is)<[^>]+>', ' ')
  $text = [regex]::Replace($text, '(?im)^Content-[A-Za-z\-]+:.*$', ' ')
  $text = [regex]::Replace($text, '(?im)^--.*$', ' ')
  $text = [regex]::Replace($text, '(?m)^[A-Za-z0-9+/]{40,}={0,2}$', ' ')
  $text = [regex]::Replace($text, '\s+', ' ').Trim()

  if ($text.Length -gt 280) {
    return $text.Substring(0, 277).Trim() + "..."
  }

  return $text
}

function Get-ImapFetchLine {
  param([object[]]$Response)

  foreach ($entry in $Response) {
    if ($entry.line -match '^\* .* FETCH \(') {
      return $entry.line
    }
  }

  return ""
}

function Get-ImapMessageSummary {
  param(
    [System.IO.Stream]$Stream,
    [ref]$TagCounter,
    [string]$Uid
  )

  $headerResponse = Invoke-ImapCommand -Stream $Stream -TagCounter $TagCounter -Command ("UID FETCH {0} (UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[HEADER.FIELDS (DATE FROM SUBJECT)])" -f $Uid)
  $fetchLine = Get-ImapFetchLine -Response $headerResponse
  $headerLiteral = ($headerResponse | Where-Object { $_.literal } | Select-Object -First 1).literal
  $headers = Parse-EmailHeaders -RawHeaders $headerLiteral

  $isUnread = $true
  if ($fetchLine -match 'FLAGS \(([^)]*)\)') {
    $isUnread = $Matches[1] -notmatch '\\Seen'
  }

  $size = 0
  if ($fetchLine -match 'RFC822\.SIZE (\d+)') {
    $size = [int]$Matches[1]
  }

  $internalDate = ""
  if ($fetchLine -match 'INTERNALDATE "([^"]+)"') {
    $internalDate = Convert-ImapDateToIso -Value $Matches[1]
  }

  $preview = ""
  try {
    $bodyResponse = Invoke-ImapCommand -Stream $Stream -TagCounter $TagCounter -Command ("UID FETCH {0} (BODY.PEEK[TEXT]<0.1800>)" -f $Uid)
    $bodyLiteral = ($bodyResponse | Where-Object { $_.literal } | Select-Object -First 1).literal
    $preview = Normalize-EmailPreview -RawText $bodyLiteral
  } catch {
    $preview = ""
  }

  $fromValue = if ($headers.ContainsKey("from") -and -not [string]::IsNullOrWhiteSpace([string]$headers["from"])) {
    [string]$headers["from"]
  } else {
    "Remitente no disponible"
  }
  $subjectValue = if ($headers.ContainsKey("subject") -and -not [string]::IsNullOrWhiteSpace([string]$headers["subject"])) {
    [string]$headers["subject"]
  } else {
    "(sin asunto)"
  }
  $dateValue = if ($headers.ContainsKey("date")) {
    [string]$headers["date"]
  } else {
    ""
  }

  return [pscustomobject]@{
    uid = [string]$Uid
    from = $fromValue
    subject = $subjectValue
    date = Convert-ImapDateToIso -Value $dateValue
    internalDate = $internalDate
    preview = $preview
    isUnread = $isUnread
    size = $size
  }
}

function Get-ImapMailboxSnapshot {
  param(
    [string]$ServerHost,
    [int]$Port,
    [string]$Username,
    [string]$Password,
    [string]$Folder = "INBOX",
    [int]$Limit = 12
  )

  $tcpClient = New-Object System.Net.Sockets.TcpClient
  $sslStream = $null

  try {
    $tcpClient.Connect($ServerHost, $Port)
    $sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream(), $false)
    $sslStream.ReadTimeout = 15000
    $sslStream.WriteTimeout = 15000
    $sslStream.AuthenticateAsClient($ServerHost)

    $greeting = Read-ImapLine -Stream $sslStream
    if ([string]::IsNullOrWhiteSpace($greeting) -or $greeting -notlike "* OK*") {
      throw "El servidor IMAP no envio un saludo valido."
    }

    $tagCounter = 1
    [void](Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command ("LOGIN {0} {1}" -f (ConvertTo-ImapQuotedString -Value $Username), (ConvertTo-ImapQuotedString -Value $Password)) -SafeCommand "LOGIN")
    [void](Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command ("EXAMINE {0}" -f (ConvertTo-ImapQuotedString -Value $Folder)))

    $allResponse = Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command "UID SEARCH ALL"
    $unseenResponse = Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command "UID SEARCH UNSEEN"

    $allUids = @(Parse-ImapSearchUids -Response $allResponse)
    $unseenUids = @(Parse-ImapSearchUids -Response $unseenResponse)
    $selectedUids = @($allUids | Sort-Object { [int]$_ } -Descending | Select-Object -First $Limit)

    $messages = New-Object System.Collections.Generic.List[object]
    foreach ($uid in $selectedUids) {
      $messages.Add((Get-ImapMessageSummary -Stream $sslStream -TagCounter ([ref]$tagCounter) -Uid $uid))
    }

    try {
      [void](Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command "LOGOUT")
    } catch {
    }

    return [pscustomobject]@{
      ok = $true
      host = $ServerHost
      folder = $Folder
      username = $Username
      messageCount = $allUids.Count
      unreadCount = $unseenUids.Count
      fetchedCount = $messages.Count
      messages = $messages
      fetchedAt = (Get-Date).ToString("o")
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

function Resolve-StaticPath {
  param([string]$RawPath)

  $relativePath = if ([string]::IsNullOrWhiteSpace($RawPath) -or $RawPath -eq "/") {
    "index.html"
  } else {
    $RawPath.TrimStart("/") -replace "/", "\"
  }

  $combined = Join-Path $ServerRoot $relativePath
  $fullPath = [System.IO.Path]::GetFullPath($combined)
  $rootPath = [System.IO.Path]::GetFullPath($ServerRoot)

  if (-not $fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }

  if ((Test-Path $fullPath) -and (Get-Item $fullPath).PSIsContainer) {
    $fullPath = Join-Path $fullPath "index.html"
  }

  return $fullPath
}

function Wait-TcpClientData {
  param(
    [System.Net.Sockets.TcpClient]$Client,
    [int]$TimeoutMs = 1500
  )

  if (-not $Client) {
    return $true
  }

  $deadline = [DateTime]::UtcNow.AddMilliseconds($TimeoutMs)
  while ($Client.Connected -and $Client.Available -le 0 -and [DateTime]::UtcNow -lt $deadline) {
    Start-Sleep -Milliseconds 25
  }

  return $Client.Available -gt 0
}

function Read-HttpRequest {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [System.Net.Sockets.TcpClient]$Client
  )

  $buffer = New-Object byte[] 8192
  $requestBytes = New-Object System.Collections.Generic.List[byte]
  $headerTerminator = [byte[]](13, 10, 13, 10)
  $headerEnd = -1

  while ($headerEnd -lt 0) {
    if ($Client -and $Client.Available -le 0 -and -not (Wait-TcpClientData -Client $Client)) {
      return $null
    }

    try {
      $read = $Stream.Read($buffer, 0, $buffer.Length)
    } catch [System.IO.IOException] {
      return $null
    }

    if ($read -le 0) {
      return $null
    }

    for ($i = 0; $i -lt $read; $i += 1) {
      $requestBytes.Add($buffer[$i])
    }

    for ($i = 0; $i -le $requestBytes.Count - 4; $i += 1) {
      if ($requestBytes[$i] -eq $headerTerminator[0] -and
          $requestBytes[$i + 1] -eq $headerTerminator[1] -and
          $requestBytes[$i + 2] -eq $headerTerminator[2] -and
          $requestBytes[$i + 3] -eq $headerTerminator[3]) {
        $headerEnd = $i + 4
        break
      }
    }
  }

  $allBytes = $requestBytes.ToArray()
  $headerText = [System.Text.Encoding]::ASCII.GetString($allBytes, 0, $headerEnd)
  $lines = $headerText -split "`r`n"
  $requestLine = $lines[0]
  $parts = $requestLine.Split(" ")
  $method = if ($parts.Length -gt 0) { $parts[0] } else { "GET" }
  $path = if ($parts.Length -gt 1) { $parts[1] } else { "/" }

  $headers = @{}
  foreach ($line in $lines[1..($lines.Length - 1)]) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $separatorIndex = $line.IndexOf(":")
    if ($separatorIndex -lt 0) { continue }
    $key = $line.Substring(0, $separatorIndex).Trim().ToLowerInvariant()
    $value = $line.Substring($separatorIndex + 1).Trim()
    $headers[$key] = $value
  }

  $contentLength = 0
  if ($headers.ContainsKey("content-length")) {
    [void][int]::TryParse($headers["content-length"], [ref]$contentLength)
  }

  $bodyBytes = New-Object byte[] $contentLength
  $alreadyBuffered = $allBytes.Length - $headerEnd
  if ($alreadyBuffered -gt 0) {
    [Array]::Copy($allBytes, $headerEnd, $bodyBytes, 0, [Math]::Min($alreadyBuffered, $contentLength))
  }

  $offset = [Math]::Min($alreadyBuffered, $contentLength)
  while ($offset -lt $contentLength) {
    if ($Client -and $Client.Available -le 0 -and -not (Wait-TcpClientData -Client $Client)) {
      return $null
    }

    try {
      $read = $Stream.Read($bodyBytes, $offset, $contentLength - $offset)
    } catch [System.IO.IOException] {
      return $null
    }

    if ($read -le 0) { break }
    $offset += $read
  }

  return @{
    Method = $method
    Path = $path
    Headers = $headers
    BodyBytes = $bodyBytes
    BodyText = [System.Text.Encoding]::UTF8.GetString($bodyBytes)
  }
}

function Write-HttpResponse {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$ReasonPhrase,
    [byte[]]$BodyBytes,
    [string]$ContentType = "text/plain; charset=utf-8"
  )

  if (-not $BodyBytes) {
    $BodyBytes = [byte[]]::new(0)
  }

  $headerText = @(
    "HTTP/1.1 $StatusCode $ReasonPhrase",
    "Content-Type: $ContentType",
    "Content-Length: $($BodyBytes.Length)",
    "Connection: close",
    "Access-Control-Allow-Origin: *",
    "Access-Control-Allow-Methods: GET,PUT,PATCH,POST,OPTIONS",
    "Access-Control-Allow-Headers: Content-Type, Authorization, Idempotency-Key, X-Joathi-Api-Version, X-Joathi-Domain-Version",
    "Cache-Control: no-store",
    "",
    ""
  ) -join "`r`n"

  $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($headerText)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($BodyBytes.Length -gt 0) {
    $Stream.Write($BodyBytes, 0, $BodyBytes.Length)
  }
}

function Write-JsonResponse {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [object]$Body,
    [int]$StatusCode = 200,
    [string]$ReasonPhrase = "OK"
  )

  $json = $Body | ConvertTo-Json -Depth 100
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  Write-HttpResponse -Stream $Stream -StatusCode $StatusCode -ReasonPhrase $ReasonPhrase -BodyBytes $bytes -ContentType "application/json; charset=utf-8"
}

function Write-TextResponse {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [string]$Text,
    [int]$StatusCode = 200,
    [string]$ReasonPhrase = "OK",
    [string]$ContentType = "text/plain; charset=utf-8"
  )

  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  Write-HttpResponse -Stream $Stream -StatusCode $StatusCode -ReasonPhrase $ReasonPhrase -BodyBytes $bytes -ContentType $ContentType
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
$listener.Server.SetSocketOption([System.Net.Sockets.SocketOptionLevel]::Socket, [System.Net.Sockets.SocketOptionName]::ReuseAddress, $true)
$listener.Start()

Write-Host "JoathiVA server activo en:"
Write-Host " - http://localhost:$Port/"
try {
  $ipv4List = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
    Where-Object { $_.IPAddress -notlike "169.254*" -and $_.IPAddress -ne "127.0.0.1" } |
    Select-Object -ExpandProperty IPAddress -Unique
  foreach ($ip in $ipv4List) {
    Write-Host " - http://$ip`:$Port/"
  }
} catch {
}
Write-Host "Sirviendo archivos desde $ServerRoot"
Write-Host "Persistencia JSON en $DbPath"

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 5000
      $client.SendTimeout = 5000
      $stream = $client.GetStream()
      $stream.ReadTimeout = 5000
      $stream.WriteTimeout = 5000
      $request = Read-HttpRequest -Stream $stream -Client $client
      if (-not $request) {
        continue
      }

      if ($request.Method -eq "OPTIONS") {
        Write-HttpResponse -Stream $stream -StatusCode 204 -ReasonPhrase "No Content" -BodyBytes ([byte[]]::new(0))
        continue
      }

      $rawPath = [string]$request.Path
      $path = ($rawPath -split "\?")[0]
      $query = if ($rawPath -match "\?(.*)$") { [string]$Matches[1] } else { "" }

      if ($path -eq "/api/health") {
        Write-JsonResponse -Stream $stream -Body @{
          ok = $true
          server = "JoathiVA PowerShell"
          port = $Port
          serverRoot = $ServerRoot
          timestamp = (Get-Date).ToString("o")
        }
        continue
      }

      if ($path -eq "/api/portal/session" -and $request.Method -eq "POST") {
        try {
          $body = Get-JsonRequestBody -Request $request
        } catch {
          Write-JsonResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body @{
            ok = $false
            error = $_.Exception.Message
          }
          continue
        }

        $username = ([string]$body.username).Trim()
        $password = [string]$body.password
        $user = Get-PortalUserByCredentials -Username $username -Password $password
        if (-not $user) {
          Write-AuthErrorResponse -Stream $stream -StatusCode 401 -ReasonPhrase "Unauthorized" -Error "Credenciales invalidas."
          continue
        }

        $session = New-PortalSession -User $user
        $userContext = Get-PortalSessionUserSummary -User $user
        Write-JsonResponse -Stream $stream -Body @{
          ok = $true
          session = $session
          user = $userContext
        }
        continue
      }

      if ($path -eq "/api/state" -and $request.Method -eq "GET") {
        Write-JsonResponse -Stream $stream -Body (Get-DbState)
        continue
      }

      if ($path -eq "/api/state" -and $request.Method -eq "PUT") {
        if ([string]::IsNullOrWhiteSpace($request.BodyText)) {
          Write-JsonResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body @{ ok = $false; error = "Body JSON vacio." }
          continue
        }

        $state = $request.BodyText | ConvertFrom-Json
        Save-DbState -State $state
        Write-JsonResponse -Stream $stream -Body @{
          ok = $true
          savedAt = (Get-Date).ToString("o")
        }
        continue
      }

      if ($path -eq "/api/external-management" -and $request.Method -eq "GET") {
        $forceRefresh = $query -match "(^|&)refresh=1(&|$)"

        try {
          $snapshot = Get-ExternalManagementSnapshot -ForceRefresh:$forceRefresh
          Write-JsonResponse -Stream $stream -Body $snapshot
        } catch {
          $safeMessage = [string]$_.Exception.Message
          if ([string]::IsNullOrWhiteSpace($safeMessage)) {
            $safeMessage = "No fue posible consultar la hoja externa."
          }

          Write-JsonResponse -Stream $stream -StatusCode 502 -ReasonPhrase "Bad Gateway" -Body @{
            ok = $false
            error = $safeMessage
          }
        }
        continue
      }

      if ($path -eq "/api/mailbox/inbox" -and $request.Method -eq "POST") {
        try {
          $body = Get-JsonRequestBody -Request $request
        } catch {
          Write-JsonResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body @{
            ok = $false
            error = $_.Exception.Message
          }
          continue
        }

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
        $limit = 12
        if (-not $mailboxProfile) {
          [void][int]::TryParse([string]$body.port, [ref]$port)
        }
        [void][int]::TryParse([string]$body.limit, [ref]$limit)

        if ([string]::IsNullOrWhiteSpace($username) -or [string]::IsNullOrWhiteSpace($password) -or [string]::IsNullOrWhiteSpace($imapHost)) {
          Write-JsonResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body @{
            ok = $false
            error = "Debes indicar correo, contrasena y servidor IMAP."
          }
          continue
        }

        if ($port -lt 1 -or $port -gt 65535) {
          Write-JsonResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body @{
            ok = $false
            error = "El puerto IMAP no es valido."
          }
          continue
        }

        if ($limit -lt 1) {
          $limit = 12
        }
        if ($limit -gt 25) {
          $limit = 25
        }

        try {
          $snapshot = Get-ImapMailboxSnapshot -ServerHost $imapHost -Port $port -Username $username -Password $password -Folder $folder -Limit $limit
          Write-JsonResponse -Stream $stream -Body $snapshot
        } catch {
          $safeMessage = [string]$_.Exception.Message
          if ([string]::IsNullOrWhiteSpace($safeMessage)) {
            $safeMessage = "No fue posible consultar la casilla IMAP."
          }
          Write-JsonResponse -Stream $stream -StatusCode 500 -ReasonPhrase "Internal Server Error" -Body @{
            ok = $false
            error = $safeMessage
          }
        }
        continue
      }

      if ($path -eq "/api/tools/profiles" -and $request.Method -eq "POST") {
        try {
          $body = Get-JsonRequestBody -Request $request
        } catch {
          Write-JsonResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body @{
            ok = $false
            error = $_.Exception.Message
          }
          continue
        }

        $auth = Assert-PortalAuthenticatedUser -Body $body -ErrorMessage "Sesion del portal invalida o vencida."
        if (-not $auth.ok) {
          Write-AuthErrorResponse -Stream $stream -StatusCode $auth.statusCode -ReasonPhrase $auth.reasonPhrase -Error $auth.error
          continue
        }
        $user = $auth.user

        $profiles = Get-ToolProfilesForUser -User $user
        if (-not $profiles.Count) {
          Write-JsonResponse -Stream $stream -StatusCode 403 -ReasonPhrase "Forbidden" -Body @{
            ok = $false
            error = "Este usuario no tiene accesos operativos configurados."
          }
          continue
        }

        $items = @($profiles | ForEach-Object {
          [pscustomobject]@{
            id = [string]$_.id
            label = [string]$_.label
            toolKey = [string]$_.toolKey
            target = [string]$_.target
            username = [string]$_.username
            password = [string]$_.password
            authMode = [string]$_.authMode
            usernameLabel = [string]$_.usernameLabel
            passwordLabel = [string]$_.passwordLabel
            note = [string]$_.note
          }
        })

        Write-JsonResponse -Stream $stream -Body @{
          ok = $true
          owner = [string]$user.username
          count = $items.Count
          profiles = $items
        }
        continue
      }

      if ($path -eq "/api/lucia/settings" -and $request.Method -eq "GET") {
        Write-JsonResponse -Stream $stream -Body (Get-LuciaPublicSettings)
        continue
      }

      if ($path -eq "/api/lucia/settings" -and $request.Method -eq "POST") {
        try {
          $body = Get-JsonRequestBody -Request $request
        } catch {
          Write-JsonResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body @{
            ok = $false
            error = $_.Exception.Message
          }
          continue
        }

        if ($body.peek -eq $true) {
          Write-JsonResponse -Stream $stream -Body (Get-LuciaPublicSettings)
          continue
        }

        $username = ([string]$body.username).Trim()
        $menuUrl = ([string]$body.menuUrl).Trim()
        $password = [string]$body.password
        $settings = Get-LuciaSettings
        $secrets = Get-LuciaSecrets

        if (-not [string]::IsNullOrWhiteSpace($menuUrl)) {
          $settings.menuUrl = $menuUrl
        }
        $settings.enabled = $true
        $settings.username = $username

        if ($body.clearPassword -eq $true) {
          if (-not [string]::IsNullOrWhiteSpace([string]$settings.passwordSecretRef) -and $secrets.ContainsKey([string]$settings.passwordSecretRef)) {
            $secrets.Remove([string]$settings.passwordSecretRef)
          }
          $settings.passwordSecretRef = ""
        } elseif (-not [string]::IsNullOrWhiteSpace($password)) {
          $secretRef = "lucia:password"
          $secrets[$secretRef] = [pscustomobject]@{
            protectedValue = ConvertFrom-SecureString (ConvertTo-SecureString $password -AsPlainText -Force)
            owner = "lucia"
            profileId = "menu"
            field = "password"
            protectedBy = "Windows DPAPI CurrentUser"
            updatedAt = (Get-Date).ToString("o")
          }
          $settings.passwordSecretRef = $secretRef
        }

        $settings.updatedAt = (Get-Date).ToString("o")
        Save-LuciaSettings -Settings $settings
        Set-Content -LiteralPath $LuciaSecretsPath -Value (($secrets | ConvertTo-Json -Depth 20)) -Encoding UTF8
        Write-JsonResponse -Stream $stream -Body (Get-LuciaPublicSettings)
        continue
      }

      if ($path -eq "/api/lucia/import" -and $request.Method -eq "GET") {
        Write-JsonResponse -Stream $stream -Body @{
          ok = $true
          state = Get-LuciaImportState
        }
        continue
      }

      if ($path -eq "/api/lucia/import" -and $request.Method -eq "POST") {
        try {
          $body = Get-JsonRequestBody -Request $request
        } catch {
          Write-JsonResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body @{
            ok = $false
            error = $_.Exception.Message
          }
          continue
        }

        $sourceDir = ([string]$body.sourceDir).Trim()
        $root = Resolve-LuciaImportRoot -RequestedPath $sourceDir
        if (-not $root) {
          Write-TextResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -ContentType "application/json; charset=utf-8" -Text '{"ok":false,"error":"No se encontro una carpeta valida de exportacion Lucia."}'
          continue
        }

        $manifestDir = Join-Path $root "manifests"
        if (-not (Test-Path -LiteralPath $manifestDir -PathType Container)) {
          Write-TextResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -ContentType "application/json; charset=utf-8" -Text '{"ok":false,"error":"La carpeta no contiene el subdirectorio manifests."}'
          continue
        }

        $manifestCount = @(Get-ChildItem -LiteralPath $manifestDir -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -eq ".csv" }).Count
        $state = [pscustomobject]@{
          updatedAt = (Get-Date).ToString("o")
          sourceDir = $root
          importCount = [int]$manifestCount
          packageCount = if (Test-Path -LiteralPath (Join-Path $manifestDir "catalogodatos_packages_manifest.csv") -PathType Leaf) { 1 } else { 0 }
          fileCount = if (Test-Path -LiteralPath (Join-Path $manifestDir "ftp_files_manifest.csv") -PathType Leaf) { 1 } else { 0 }
        }
        Save-LuciaImportState -State $state
        $responseJson = ([pscustomobject]@{
          ok = $true
          updatedAt = $state.updatedAt
          sourceDir = $state.sourceDir
          importCount = $state.importCount
          packageCount = $state.packageCount
          fileCount = $state.fileCount
        } | ConvertTo-Json -Depth 10)
        Write-TextResponse -Stream $stream -ContentType "application/json; charset=utf-8" -Text $responseJson
        continue
      }

      if ($path -eq "/api/openai/settings" -and $request.Method -eq "POST") {
        try {
          $body = Get-JsonRequestBody -Request $request
        } catch {
          Write-JsonResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body @{
            ok = $false
            error = $_.Exception.Message
          }
          continue
        }

        $auth = Assert-PortalAuthenticatedUser -Body $body -ErrorMessage "Debes autenticarte como maestro para configurar ChatGPT."
        if (-not $auth.ok) {
          Write-AuthErrorResponse -Stream $stream -StatusCode $auth.statusCode -ReasonPhrase $auth.reasonPhrase -Error $auth.error
          continue
        }
        $roleCheck = Assert-PortalRole -User $auth.user -Roles @("master") -StatusCode 401 -ReasonPhrase "Unauthorized" -ErrorMessage "Debes autenticarte como maestro para configurar ChatGPT."
        if (-not $roleCheck.ok) {
          Write-AuthErrorResponse -Stream $stream -StatusCode $roleCheck.statusCode -ReasonPhrase $roleCheck.reasonPhrase -Error $roleCheck.error
          continue
        }
        $user = $roleCheck.user

        $currentSettings = Get-OpenAiSettings
        $nextSettings = [pscustomobject]@{
          apiKey = [string]$currentSettings.apiKey
          model = if ([string]::IsNullOrWhiteSpace([string]$body.model)) { [string]$currentSettings.model } else { ([string]$body.model).Trim() }
          reasoningEffort = if ([string]::IsNullOrWhiteSpace([string]$body.reasoningEffort)) { [string]$currentSettings.reasoningEffort } else { ([string]$body.reasoningEffort).Trim().ToLowerInvariant() }
          instructions = if ([string]::IsNullOrWhiteSpace([string]$body.instructions)) { [string]$currentSettings.instructions } else { ([string]$body.instructions).Trim() }
        }

        if ($body.clearApiKey -eq $true) {
          $nextSettings.apiKey = ""
        } elseif (-not [string]::IsNullOrWhiteSpace([string]$body.apiKey)) {
          $nextSettings.apiKey = ([string]$body.apiKey).Trim()
        }

        Save-OpenAiSettings -Settings $nextSettings
        Write-JsonResponse -Stream $stream -Body (Get-OpenAiPublicSettings)
        continue
      }

      if ($path -eq "/api/openai/respond" -and $request.Method -eq "POST") {
        try {
          $body = Get-JsonRequestBody -Request $request
        } catch {
          Write-JsonResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body @{
            ok = $false
            error = $_.Exception.Message
          }
          continue
        }

        $prompt = ([string]$body.prompt).Trim()
        if ([string]::IsNullOrWhiteSpace($prompt)) {
          Write-JsonResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body @{
            ok = $false
            error = "Debes indicar un mensaje para el asistente."
          }
          continue
        }

        $settings = Get-OpenAiSettings
        $auth = Assert-PortalAuthenticatedUser -Body $body -ErrorMessage "Debes autenticarte como maestro para usar ChatGPT en JoathiVA."
        if (-not $auth.ok) {
          Write-AuthErrorResponse -Stream $stream -StatusCode $auth.statusCode -ReasonPhrase $auth.reasonPhrase -Error $auth.error
          continue
        }
        $roleCheck = Assert-PortalRole -User $auth.user -Roles @("master") -StatusCode 401 -ReasonPhrase "Unauthorized" -ErrorMessage "Debes autenticarte como maestro para usar ChatGPT en JoathiVA."
        if (-not $roleCheck.ok) {
          Write-AuthErrorResponse -Stream $stream -StatusCode $roleCheck.statusCode -ReasonPhrase $roleCheck.reasonPhrase -Error $roleCheck.error
          continue
        }
        $user = $roleCheck.user

        $apiKey = if (-not [string]::IsNullOrWhiteSpace([string]$body.apiKey)) { ([string]$body.apiKey).Trim() } else { [string]$settings.apiKey }
        $model = if (-not [string]::IsNullOrWhiteSpace([string]$body.model)) { ([string]$body.model).Trim() } else { [string]$settings.model }
        $reasoningEffort = if (-not [string]::IsNullOrWhiteSpace([string]$body.reasoningEffort)) { ([string]$body.reasoningEffort).Trim().ToLowerInvariant() } else { [string]$settings.reasoningEffort }
        $instructions = if (-not [string]::IsNullOrWhiteSpace([string]$body.instructions)) { ([string]$body.instructions).Trim() } else { [string]$settings.instructions }
        $workspaceContext = ([string]$body.context).Trim()

        try {
          $result = Invoke-OpenAiTextResponse -ApiKey $apiKey -Model $model -ReasoningEffort $reasoningEffort -Instructions $instructions -WorkspaceContext $workspaceContext -Conversation $body.conversation -Prompt $prompt
          Write-JsonResponse -Stream $stream -Body @{
            ok = $true
            id = [string]$result.id
            model = [string]$result.model
            outputText = [string]$result.outputText
          }
        } catch {
          Write-JsonResponse -Stream $stream -StatusCode 502 -ReasonPhrase "Bad Gateway" -Body @{
            ok = $false
            error = [string]$_.Exception.Message
          }
        }
        continue
      }

      if ($path -match "^/api/assistant/v1(?:/|$)") {
        try {
          $assistantResponse = Invoke-AssistantRequest -Request $request -Path $path -QueryString $query
          Write-JsonResponse -Stream $stream -StatusCode $assistantResponse.statusCode -ReasonPhrase $assistantResponse.reasonPhrase -Body $assistantResponse.body
        } catch {
          Write-JsonResponse -Stream $stream -StatusCode 500 -ReasonPhrase "Internal Server Error" -Body @{
            ok = $false
            error = [string]$_.Exception.Message
          }
        }
        continue
      }

      if ($path -match "^/api/v1(?:/|$)") {
        try {
          $apiV1Response = Invoke-ApiV1Request -Request $request -Path $path -QueryString $query
          Write-JsonResponse -Stream $stream -StatusCode $apiV1Response.statusCode -ReasonPhrase $apiV1Response.reasonPhrase -Body $apiV1Response.body
        } catch {
          Write-JsonResponse -Stream $stream -StatusCode 500 -ReasonPhrase "Internal Server Error" -Body @{
            ok = $false
            error = [string]$_.Exception.Message
          }
        }
        continue
      }

      if ($path -eq "/api/tools/open" -and $request.Method -eq "POST") {
        try {
          $body = Get-JsonRequestBody -Request $request
        } catch {
          Write-JsonResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body @{
            ok = $false
            error = $_.Exception.Message
          }
          continue
        }

        $tools = @()
        if ($body.tools -is [System.Array]) {
          $tools = @($body.tools)
        } elseif ($body.tools) {
          $tools = @($body.tools)
        }

        if (-not $tools.Count) {
          Write-JsonResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body @{
            ok = $false
            error = "Debes indicar al menos un programa permitido para abrir."
          }
          continue
        }

        try {
          $opened = Open-AllowedTools -Tools $tools
          if (-not $opened.Count) {
            throw "No habia programas validos para abrir."
          }
          Write-JsonResponse -Stream $stream -Body @{
            ok = $true
            opened = $opened
            openedCount = $opened.Count
          }
        } catch {
          Write-JsonResponse -Stream $stream -StatusCode 500 -ReasonPhrase "Internal Server Error" -Body @{
            ok = $false
            error = [string]$_.Exception.Message
          }
        }
        continue
      }

      $staticPath = Resolve-StaticPath -RawPath $path
      if (-not $staticPath -or -not (Test-Path $staticPath -PathType Leaf)) {
        Write-TextResponse -Stream $stream -StatusCode 404 -ReasonPhrase "Not Found" -Text "No encontrado."
        continue
      }

      $bytes = [System.IO.File]::ReadAllBytes($staticPath)
      Write-HttpResponse -Stream $stream -StatusCode 200 -ReasonPhrase "OK" -BodyBytes $bytes -ContentType (Get-MimeType -Path $staticPath)
    } catch {
      try {
        Write-JsonResponse -Stream $stream -StatusCode 500 -ReasonPhrase "Internal Server Error" -Body @{
          ok = $false
          error = $_.Exception.Message
        }
      } catch {
      }
    } finally {
      if ($stream) { $stream.Dispose() }
      $client.Dispose()
    }
  }
} finally {
  $listener.Stop()
}
