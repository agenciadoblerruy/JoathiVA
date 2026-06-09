param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "daily-pilot.config.json"),
  [switch]$DryRun,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Get-PilotValue {
  param(
    [object]$Object,
    [string]$Name,
    $Default = $null
  )

  if ($null -eq $Object) {
    return $Default
  }

  try {
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
      return $Default
    }

    $value = $property.Value
    if ($null -eq $value) {
      return $Default
    }

    if ($value -is [string] -and [string]::IsNullOrWhiteSpace([string]$value)) {
      return $Default
    }

    return $value
  } catch {
    return $Default
  }
}

function Resolve-PilotPath {
  param(
    [string]$PathValue,
    [string]$BaseDir
  )

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return ""
  }

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return $PathValue
  }

  return [System.IO.Path]::GetFullPath((Join-Path $BaseDir $PathValue))
}

function ConvertTo-MarkdownCell {
  param([object]$Value)

  $text = [string]$Value
  if ($null -eq $text) {
    $text = ""
  }

  $text = $text -replace '\|', '\|'
  $text = $text -replace '\r?\n', ' '
  return $text.Trim()
}

function New-PilotDefaultConfig {
  return [pscustomobject]@{
    enabled = $true
    baseUrl = "http://127.0.0.1:8787"
    mailboxProfileId = "rodrigo"
    mailboxFolder = "INBOX.PILOTO"
    limit = 10
    execute = $true
    force = $true
    allowedCaseTypes = @(
      "caso de operacion Paraguay",
      "solicitud documental",
      "seguimiento comercial"
    )
    pauseFile = "PAUSE"
  }
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

function Get-PilotMailboxSnapshot {
  param(
    [string]$ProfileId,
    [string]$Folder,
    [int]$Limit
  )

  $profilePath = Join-Path (Split-Path -Parent (Split-Path -Parent $pilotRoot)) "data\mailbox-profiles.json"
  if (-not (Test-Path -LiteralPath $profilePath)) {
    throw "No se encontro la configuracion de buzones en $profilePath."
  }

  $profiles = Get-Content -LiteralPath $profilePath -Raw -Encoding UTF8 | ConvertFrom-Json
  $profile = $profiles | Where-Object { [string]$_.id -eq $ProfileId } | Select-Object -First 1
  if (-not $profile) {
    throw "Perfil IMAP no encontrado: $ProfileId"
  }

  $mailboxHost = [string]$profile.host
  $port = [int]$profile.port
  $username = [string]$profile.username
  $password = [string]$profile.password
  if ([string]::IsNullOrWhiteSpace($mailboxHost) -or [string]::IsNullOrWhiteSpace($username) -or [string]::IsNullOrWhiteSpace($password)) {
    throw "El perfil IMAP no tiene host, usuario o contrasena."
  }

  $Limit = [Math]::Max(1, [Math]::Min([int]$Limit, 25))

  $tcpClient = New-Object System.Net.Sockets.TcpClient
  $sslStream = $null

  try {
    $tcpClient.Connect($mailboxHost, $port)
    $sslStream = New-Object System.Net.Security.SslStream($tcpClient.GetStream(), $false)
    $sslStream.ReadTimeout = 15000
    $sslStream.WriteTimeout = 15000
    $sslStream.AuthenticateAsClient($mailboxHost)

    $greeting = Read-ImapLine -Stream $sslStream
    if ([string]::IsNullOrWhiteSpace($greeting) -or $greeting -notlike "* OK*") {
      throw "El servidor IMAP no envio un saludo valido."
    }

    $tagCounter = 1
    [void](Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command ("LOGIN {0} {1}" -f (ConvertTo-ImapQuotedString -Value $username), (ConvertTo-ImapQuotedString -Value $password)) -SafeCommand "LOGIN")
    [void](Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command ("EXAMINE {0}" -f (ConvertTo-ImapQuotedString -Value $Folder)))

    $allResponse = Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command "UID SEARCH ALL"
    $allUids = @(Parse-ImapSearchUids -Response $allResponse)
    $selectedUids = @($allUids | Sort-Object { [int]$_ } -Descending | Select-Object -First $Limit)

    $messages = New-Object System.Collections.Generic.List[object]
    foreach ($uid in $selectedUids) {
      $messages.Add((Get-ImapMessageSummary -Stream $sslStream -TagCounter ([ref]$tagCounter) -Uid $uid)) | Out-Null
    }

    try {
      [void](Invoke-ImapCommand -Stream $sslStream -TagCounter ([ref]$tagCounter) -Command "LOGOUT")
    } catch {
    }

    return [pscustomobject]@{
      ok = $true
      host = $mailboxHost
      folder = $Folder
      username = $username
      messageCount = $allUids.Count
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

function Write-PilotReportFiles {
  param(
    [object]$Report,
    [string]$OutDir
  )

  $dateStamp = Get-Date -Format "yyyy-MM-dd"
  $jsonPath = Join-Path $OutDir ("daily-{0}.json" -f $dateStamp)
  $mdPath = Join-Path $OutDir ("daily-{0}.md" -f $dateStamp)
  $latestJsonPath = Join-Path $OutDir "latest.json"
  $latestMdPath = Join-Path $OutDir "latest.md"

  $json = $Report | ConvertTo-Json -Depth 100
  Set-Content -LiteralPath $jsonPath -Value $json -Encoding UTF8
  Set-Content -LiteralPath $latestJsonPath -Value $json -Encoding UTF8

  $items = @($Report.items)
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("# JoathiVA Assistant Daily Pilot") | Out-Null
  $lines.Add("") | Out-Null
  $lines.Add("- Status: $($Report.status)") | Out-Null
  $lines.Add("- Generated at: $($Report.generatedAt)") | Out-Null
  $lines.Add("- Mailbox profile: $($Report.config.mailboxProfileId)") | Out-Null
  $lines.Add("- Folder: $($Report.config.mailboxFolder)") | Out-Null
  $lines.Add("- Execute: $($Report.config.execute)") | Out-Null
  $lines.Add("- Fetched: $($Report.summary.fetchedCount)") | Out-Null
  $lines.Add("- Processed: $($Report.summary.processedCount)") | Out-Null
  $lines.Add("- Draft exported: $($Report.summary.draftExportedCount)") | Out-Null
  $lines.Add("- Draft fallback local: $($Report.summary.draftLocalCount)") | Out-Null
  $lines.Add("- Draft failed: $($Report.summary.draftFailedCount)") | Out-Null
  $lines.Add("- Operation created: $($Report.summary.operationCreatedCount)") | Out-Null
  $lines.Add("- Operation updated: $($Report.summary.operationUpdatedCount)") | Out-Null
  $lines.Add("- Operation skipped: $($Report.summary.operationSkippedCount)") | Out-Null
  $lines.Add("- Out of scope: $($Report.summary.outOfScopeCount)") | Out-Null
  $lines.Add("") | Out-Null
  $lines.Add("## Items") | Out-Null
  $lines.Add("") | Out-Null
  $lines.Add("| # | Subject | Case | Match | Operation | Task | Draft | Fallback | Review |") | Out-Null
  $lines.Add("| --- | --- | --- | --- | --- | --- | --- | --- | --- |") | Out-Null

  $index = 0
  foreach ($item in $items) {
    $index++
    $subject = ConvertTo-MarkdownCell $item.subject
    $caseType = ConvertTo-MarkdownCell $item.caseType
    $match = ConvertTo-MarkdownCell $item.customerMatchKind
    $operationAction = ConvertTo-MarkdownCell $item.operationAction
    $taskAction = ConvertTo-MarkdownCell $item.taskAction
    $draftAction = ConvertTo-MarkdownCell $item.draftAction
    $fallback = ConvertTo-MarkdownCell $item.draftFallbackMode
    $review = if ($item.allowedCaseType -eq $true) { "ok" } else { "review" }

    $lines.Add("| {0} | {1} | {2} | {3} | {4} | {5} | {6} | {7} | {8} |" -f $index, $subject, $caseType, $match, $operationAction, $taskAction, $draftAction, $fallback, $review) | Out-Null
  }

  $lines.Add("") | Out-Null
  $lines.Add("## Review checklist") | Out-Null
  $lines.Add("") | Out-Null
  $lines.Add("- Match correcto o no") | Out-Null
  $lines.Add("- Operation correcta o no") | Out-Null
  $lines.Add("- Task util o no") | Out-Null
  $lines.Add("- Draft util o no") | Out-Null
  $lines.Add("- Fallback local o provider") | Out-Null

  $markdown = ($lines -join [Environment]::NewLine)
  Set-Content -LiteralPath $mdPath -Value $markdown -Encoding UTF8
  Set-Content -LiteralPath $latestMdPath -Value $markdown -Encoding UTF8

  return [pscustomobject]@{
    json = $jsonPath
    markdown = $mdPath
    latestJson = $latestJsonPath
    latestMarkdown = $latestMdPath
  }
}

$pilotRoot = $PSScriptRoot
$outDir = Join-Path $pilotRoot "out"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$config = New-PilotDefaultConfig
if (Test-Path -LiteralPath $ConfigPath) {
  try {
    $loadedConfig = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($property in @($loadedConfig.PSObject.Properties)) {
      $config | Add-Member -NotePropertyName $property.Name -NotePropertyValue $property.Value -Force
    }
  } catch {
    throw "No se pudo leer la configuracion del piloto en $ConfigPath. $($_.Exception.Message)"
  }
}

$script:config = $config

$pauseFile = Resolve-PilotPath -PathValue ([string](Get-PilotValue -Object $config -Name "pauseFile" -Default "PAUSE")) -BaseDir $pilotRoot
$enabled = [bool](Get-PilotValue -Object $config -Name "enabled" -Default $true)
$baseUrl = [string](Get-PilotValue -Object $config -Name "baseUrl" -Default "http://127.0.0.1:8787").TrimEnd("/")
$mailboxProfileId = [string](Get-PilotValue -Object $config -Name "mailboxProfileId" -Default "rodrigo")
$mailboxFolder = [string](Get-PilotValue -Object $config -Name "mailboxFolder" -Default "INBOX.PILOTO")
$limit = 10
[void][int]::TryParse([string](Get-PilotValue -Object $config -Name "limit" -Default 10), [ref]$limit)
if ($limit -lt 1) { $limit = 1 }
if ($limit -gt 25) { $limit = 25 }

$configExecute = [bool](Get-PilotValue -Object $config -Name "execute" -Default $true)
$execute = if ($DryRun.IsPresent) { $false } else { $configExecute }
$force = if ($Force.IsPresent) { $true } else { [bool](Get-PilotValue -Object $config -Name "force" -Default $true) }
$allowedCaseTypes = @()
foreach ($item in @((Get-PilotValue -Object $config -Name "allowedCaseTypes" -Default @()))) {
  if (-not [string]::IsNullOrWhiteSpace([string]$item)) {
    $allowedCaseTypes += [string]$item
  }
}

$runId = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$generatedAt = (Get-Date).ToUniversalTime().ToString("o")

if (-not $enabled -or (Test-Path -LiteralPath $pauseFile)) {
  $report = [pscustomobject]@{
    runId = $runId
    generatedAt = $generatedAt
    status = "paused"
    reason = if (-not $enabled) { "config-disabled" } else { "pause-file" }
    config = [pscustomobject]@{
      baseUrl = $baseUrl
      mailboxProfileId = $mailboxProfileId
      mailboxFolder = $mailboxFolder
      limit = $limit
      execute = $execute
      force = $force
      allowedCaseTypes = $allowedCaseTypes
      pauseFile = $pauseFile
    }
    summary = [pscustomobject]@{
      fetchedCount = 0
      processedCount = 0
      draftExportedCount = 0
      draftLocalCount = 0
      draftFailedCount = 0
      operationCreatedCount = 0
      operationUpdatedCount = 0
      operationSkippedCount = 0
      outOfScopeCount = 0
      caseTypeCounts = @()
      draftFallbackCounts = @()
    }
    items = @()
    reviewChecklist = @(
      "Match correcto o no",
      "Operation correcta o no",
      "Task util o no",
      "Draft util o no",
      "Fallback local o provider"
    )
  }
  $paths = Write-PilotReportFiles -Report $report -OutDir $outDir
  $report | Add-Member -NotePropertyName paths -NotePropertyValue $paths -Force
  $report | ConvertTo-Json -Depth 100
  return
}

$snapshot = $null
try {
  $snapshot = Get-PilotMailboxSnapshot -ProfileId $mailboxProfileId -Folder $mailboxFolder -Limit $limit
} catch {
  $failureReport = [pscustomobject]@{
    runId = $runId
    generatedAt = $generatedAt
    status = "failed"
    reason = [string]$_.Exception.Message
    config = [pscustomobject]@{
      baseUrl = $baseUrl
      mailboxProfileId = $mailboxProfileId
      mailboxFolder = $mailboxFolder
      limit = $limit
      execute = $execute
      force = $force
      allowedCaseTypes = $allowedCaseTypes
      pauseFile = $pauseFile
    }
    summary = [pscustomobject]@{
      fetchedCount = 0
      processedCount = 0
      draftExportedCount = 0
      draftLocalCount = 0
      draftFailedCount = 0
      operationCreatedCount = 0
      operationUpdatedCount = 0
      operationSkippedCount = 0
      outOfScopeCount = 0
      caseTypeCounts = @()
      draftFallbackCounts = @()
    }
    items = @()
    reviewChecklist = @(
      "Match correcto o no",
      "Operation correcta o no",
      "Task util o no",
      "Draft util o no",
      "Fallback local o provider"
    )
  }
  $paths = Write-PilotReportFiles -Report $failureReport -OutDir $outDir
  $failureReport | Add-Member -NotePropertyName paths -NotePropertyValue $paths -Force
  $failureReport | ConvertTo-Json -Depth 100
  return
}

if (-not $snapshot) {
  throw "No fue posible obtener el snapshot IMAP del piloto."
}

if ([int]$snapshot.fetchedCount -le 0) {
  $emptyReport = [pscustomobject]@{
    runId = $runId
    generatedAt = $generatedAt
    status = "completed"
    config = [pscustomobject]@{
      baseUrl = $baseUrl
      mailboxProfileId = $mailboxProfileId
      mailboxFolder = $mailboxFolder
      limit = $limit
      execute = [bool]$execute
      force = [bool]$force
      allowedCaseTypes = $allowedCaseTypes
      pauseFile = $pauseFile
    }
    summary = [pscustomobject]@{
      fetchedCount = 0
      processedCount = 0
      draftExportedCount = 0
      draftLocalCount = 0
      draftFailedCount = 0
      operationCreatedCount = 0
      operationUpdatedCount = 0
      operationSkippedCount = 0
      outOfScopeCount = 0
      caseTypeCounts = @()
      draftFallbackCounts = @()
    }
    items = @()
    reviewChecklist = @(
      "Match correcto o no",
      "Operation correcta o no",
      "Task util o no",
      "Draft util o no",
      "Fallback local o provider"
    )
  }
  $paths = Write-PilotReportFiles -Report $emptyReport -OutDir $outDir
  $emptyReport | Add-Member -NotePropertyName paths -NotePropertyValue $paths -Force
  $emptyReport | ConvertTo-Json -Depth 100
  return
}

$requestBody = [pscustomobject]@{
  sourceKind = "provider"
  providerKind = "imap"
  execute = [bool]$execute
  force = [bool]$force
  mailboxProfileId = $mailboxProfileId
  mailboxFolder = $mailboxFolder
  messages = @(
    $snapshot.messages | ForEach-Object {
      [pscustomobject]@{
        externalId = [string]$_.uid
        from = [string]$_.from
        subject = [string]$_.subject
        date = [string]$_.date
        preview = [string]$_.preview
      }
    }
  )
}

try {
  $response = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/assistant/v1/intake/provider" -ContentType "application/json; charset=utf-8" -Body ($requestBody | ConvertTo-Json -Depth 20)
} catch {
  $failureReport = [pscustomobject]@{
    runId = $runId
    generatedAt = $generatedAt
    status = "failed"
    reason = [string]$_.Exception.Message
    config = [pscustomobject]@{
      baseUrl = $baseUrl
      mailboxProfileId = $mailboxProfileId
      mailboxFolder = $mailboxFolder
      limit = $limit
      execute = $execute
      force = $force
      allowedCaseTypes = $allowedCaseTypes
      pauseFile = $pauseFile
    }
    summary = [pscustomobject]@{
      fetchedCount = [int]$snapshot.fetchedCount
      processedCount = 0
      draftExportedCount = 0
      draftLocalCount = 0
      draftFailedCount = 0
      operationCreatedCount = 0
      operationUpdatedCount = 0
      operationSkippedCount = 0
      outOfScopeCount = 0
      caseTypeCounts = @()
      draftFallbackCounts = @()
    }
    items = @()
    reviewChecklist = @(
      "Match correcto o no",
      "Operation correcta o no",
      "Task util o no",
      "Draft util o no",
      "Fallback local o provider"
    )
  }
  $paths = Write-PilotReportFiles -Report $failureReport -OutDir $outDir
  $failureReport | Add-Member -NotePropertyName paths -NotePropertyValue $paths -Force
  $failureReport | ConvertTo-Json -Depth 100
  return
}

if (-not $response -or (-not ($response.PSObject.Properties.Name -contains "ok")) -or -not [bool]$response.ok) {
  throw "El backend del asistente no respondio correctamente."
}

$data = $response.data
$items = @($data.items)
$reportItems = New-Object System.Collections.Generic.List[object]
$caseTypeCounter = @{}
$draftExportedCount = 0
$draftLocalCount = 0
$draftFailedCount = 0
$operationCreatedCount = 0
$operationUpdatedCount = 0
$operationSkippedCount = 0
$outOfScopeCount = 0

foreach ($item in $items) {
  $classification = Get-PilotValue -Object $item -Name "classification" -Default $null
  $planned = Get-PilotValue -Object $item -Name "planned" -Default $null
  $execution = Get-PilotValue -Object $item -Name "execution" -Default $null
  $caseType = [string](Get-PilotValue -Object $classification -Name "caseType" -Default "")
  if ([string]::IsNullOrWhiteSpace($caseType)) {
    $caseType = "sin_clasificar"
  }

  if (-not $caseTypeCounter.ContainsKey($caseType)) {
    $caseTypeCounter[$caseType] = 0
  }
  $caseTypeCounter[$caseType]++

  $allowed = $allowedCaseTypes.Count -eq 0 -or ($allowedCaseTypes -contains $caseType)
  if (-not $allowed) {
    $outOfScopeCount++
  }

  $operationAction = [string](Get-PilotValue -Object (Get-PilotValue -Object $planned -Name "operation" -Default $null) -Name "action" -Default "")
  $taskAction = [string](Get-PilotValue -Object (Get-PilotValue -Object $planned -Name "task" -Default $null) -Name "action" -Default "")
  $draftAction = [string](Get-PilotValue -Object (Get-PilotValue -Object $planned -Name "draft" -Default $null) -Name "action" -Default "")
  $draftFallbackMode = [string](Get-PilotValue -Object $item -Name "draftFallbackMode" -Default "")
  $draftStatus = [string](Get-PilotValue -Object $item -Name "draftStatus" -Default "")
  $draftProviderOk = [bool](Get-PilotValue -Object $item -Name "draftProviderOk" -Default $false)
  $draftError = [string](Get-PilotValue -Object $item -Name "draftError" -Default "")
  $executionStatus = [string](Get-PilotValue -Object $execution -Name "status" -Default "")
  $notes = @()
  if ($execution -and ($execution.PSObject.Properties.Name -contains "notes")) {
    $notes = @($execution.notes)
  }

  if ($draftStatus -eq "draft_exported") {
    $draftExportedCount++
  } elseif ($draftStatus -eq "draft_failed") {
    $draftFailedCount++
  } elseif ($draftFallbackMode -eq "local") {
    $draftLocalCount++
  }

  if ($operationAction -eq "create") {
    $operationCreatedCount++
  } elseif ($operationAction -eq "update") {
    $operationUpdatedCount++
  } elseif ($operationAction -eq "skip") {
    $operationSkippedCount++
  }

  $reportItem = [pscustomobject]@{
    id = [string](Get-PilotValue -Object $item -Name "id" -Default "")
    externalId = [string](Get-PilotValue -Object $item -Name "externalId" -Default "")
    from = [string](Get-PilotValue -Object $item -Name "from" -Default "")
    subject = [string](Get-PilotValue -Object $item -Name "subject" -Default "")
    customerMatchKind = [string](Get-PilotValue -Object $item -Name "customerMatchKind" -Default "")
    customerMatchReason = [string](Get-PilotValue -Object $item -Name "customerMatchReason" -Default "")
    customerMatchConfidence = [double](Get-PilotValue -Object $item -Name "customerMatchConfidence" -Default 0)
    classification = $classification
    caseType = $caseType
    requiresOperation = [bool](Get-PilotValue -Object $classification -Name "requiresOperation" -Default $false)
    requiresTask = [bool](Get-PilotValue -Object $classification -Name "requiresTask" -Default $false)
    operationAction = $operationAction
    taskAction = $taskAction
    draftAction = $draftAction
    draftStatus = $draftStatus
    draftFallbackMode = $draftFallbackMode
    draftProviderOk = $draftProviderOk
    draftError = $draftError
    executionStatus = $executionStatus
    notes = $notes
    allowedCaseType = [bool]$allowed
    review = [pscustomobject]@{
      match = "revisar"
      operation = "revisar"
      task = "revisar"
      draft = "revisar"
      fallback = if ($draftFallbackMode) { $draftFallbackMode } else { "n/a" }
    }
  }
  $reportItems.Add($reportItem) | Out-Null
}

$caseTypeCounts = @(
  $caseTypeCounter.GetEnumerator() |
    Sort-Object Key |
    ForEach-Object {
      [pscustomobject]@{
        caseType = [string]$_.Key
        count = [int]$_.Value
      }
    }
)

$status = if ($outOfScopeCount -gt 0) { "needs-review" } else { "completed" }
$report = [pscustomobject]@{
  runId = $runId
  generatedAt = $generatedAt
  status = $status
  config = [pscustomobject]@{
    baseUrl = $baseUrl
    mailboxProfileId = $mailboxProfileId
    mailboxFolder = $mailboxFolder
    limit = $limit
    execute = [bool]$execute
    force = [bool]$force
    allowedCaseTypes = $allowedCaseTypes
    pauseFile = $pauseFile
  }
  summary = [pscustomobject]@{
    fetchedCount = [int](Get-PilotValue -Object $data -Name "fetchedCount" -Default 0)
    processedCount = [int](Get-PilotValue -Object $data -Name "processedCount" -Default 0)
    draftExportedCount = $draftExportedCount
    draftLocalCount = $draftLocalCount
    draftFailedCount = $draftFailedCount
    operationCreatedCount = $operationCreatedCount
    operationUpdatedCount = $operationUpdatedCount
    operationSkippedCount = $operationSkippedCount
    outOfScopeCount = $outOfScopeCount
    caseTypeCounts = $caseTypeCounts
    draftFallbackCounts = @(
      $reportItems |
        Group-Object -Property draftFallbackMode |
        Sort-Object Name |
        ForEach-Object {
          [pscustomobject]@{
            fallbackMode = [string]$_.Name
            count = [int]$_.Count
          }
        }
    )
  }
  items = @($reportItems)
  reviewChecklist = @(
    "Match correcto o no",
    "Operation correcta o no",
    "Task util o no",
    "Draft util o no",
    "Fallback local o provider"
  )
}

$paths = Write-PilotReportFiles -Report $report -OutDir $outDir
$report | Add-Member -NotePropertyName paths -NotePropertyValue $paths -Force

Write-Host ("Daily pilot status: {0}" -f $report.status)
Write-Host ("Processed: {0} | Drafts exported: {1} | Drafts local: {2} | Drafts failed: {3}" -f $report.summary.processedCount, $report.summary.draftExportedCount, $report.summary.draftLocalCount, $report.summary.draftFailedCount)
Write-Host ("Operation created: {0} | updated: {1} | skipped: {2} | out-of-scope: {3}" -f $report.summary.operationCreatedCount, $report.summary.operationUpdatedCount, $report.summary.operationSkippedCount, $report.summary.outOfScopeCount)
Write-Host ("Report JSON: {0}" -f $report.paths.json)
Write-Host ("Report MD: {0}" -f $report.paths.markdown)

$report | ConvertTo-Json -Depth 100
