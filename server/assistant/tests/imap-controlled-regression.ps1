param(
  [string]$RepoRoot = "",
  [string]$MailboxProfileId = 'demo',
  [string]$TempDir = "",
  [switch]$KeepTempStores,
  [switch]$KeepMailboxFolder
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
}

if ([string]::IsNullOrWhiteSpace($TempDir)) {
  $TempDir = [System.IO.Path]::GetTempPath()
}

function Assert-Regression {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

function Convert-ToWslPath {
  param([string]$Path)

  $normalized = ([string]$Path).Replace('\', '/')
  if ($normalized -match '^[A-Za-z]:/') {
    $drive = $normalized.Substring(0, 1).ToLowerInvariant()
    $rest = $normalized.Substring(3)
    return "/mnt/$drive/$rest"
  }

  return $normalized
}

function Invoke-MailboxControl {
  param(
    [string]$Command,
    [string[]]$Arguments
  )

  foreach ($candidate in @('python3', 'python')) {
    $cmd = Get-Command -Name $candidate -ErrorAction SilentlyContinue
    if ($cmd) {
      $output = & $cmd.Source $script:MailboxControlScript $Command @Arguments 2>&1
      return ($output | Out-String)
    }
  }

  $wslScript = Convert-ToWslPath -Path $script:MailboxControlScript
  $outFile = Join-Path $TempDir ('mailbox-control-' + [guid]::NewGuid().ToString('N') + '.json')
  $errFile = Join-Path $TempDir ('mailbox-control-' + [guid]::NewGuid().ToString('N') + '.err')
  $wslExe = Join-Path $env:SystemRoot 'System32\wsl.exe'
  $argumentList = @('python3', $wslScript, $Command) + @($Arguments)
  $process = Start-Process -FilePath $wslExe -ArgumentList $argumentList -NoNewWindow -Wait -PassThru -RedirectStandardOutput $outFile -RedirectStandardError $errFile
  $exitCode = [int]$process.ExitCode

  try {
    $stdout = if (Test-Path -LiteralPath $outFile) { Get-Content -LiteralPath $outFile -Raw -Encoding UTF8 } else { "" }
    $stderr = if (Test-Path -LiteralPath $errFile) { Get-Content -LiteralPath $errFile -Raw -Encoding UTF8 } else { "" }
  } finally {
    Remove-Item -LiteralPath $outFile, $errFile -Force -ErrorAction SilentlyContinue
  }

  if ($exitCode -ne 0) {
    throw "Mailbox control exited with code $exitCode. $stderr"
  }

  if ([string]::IsNullOrWhiteSpace($stdout)) {
    throw "Mailbox control produced no output. $stderr"
  }

  return $stdout
}

function Get-StoreCounts {
  param([string]$Path)

  function Get-CountValue {
    param([object]$Value)

    if ($null -eq $Value) {
      return 0
    }

    if ($Value -is [System.Array]) {
      return @($Value | Where-Object { $null -ne $_ }).Count
    }

    if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
      $items = New-Object System.Collections.Generic.List[object]
      foreach ($item in $Value) {
        if ($null -ne $item) {
          $items.Add($item) | Out-Null
        }
      }
      return $items.Count
    }

    return 1
  }

  if (-not (Test-Path -LiteralPath $Path)) {
    return [pscustomobject]@{
      customer = 0
      quote = 0
      task = 0
      activity = 0
      operation = 0
      intakes = 0
      drafts = 0
    }
  }

  $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return [pscustomobject]@{
      customer = 0
      quote = 0
      task = 0
      activity = 0
      operation = 0
      intakes = 0
      drafts = 0
    }
  }

  try {
    $parsed = $raw | ConvertFrom-Json
  } catch {
    return [pscustomobject]@{
      customer = 0
      quote = 0
      task = 0
      activity = 0
      operation = 0
      intakes = 0
      drafts = 0
    }
  }

  return [pscustomobject]@{
    customer = Get-CountValue -Value $parsed.entities.customer
    quote = Get-CountValue -Value $parsed.entities.quote
    task = Get-CountValue -Value $parsed.entities.task
    activity = Get-CountValue -Value $parsed.entities.activity
    operation = Get-CountValue -Value $parsed.entities.operation
    intakes = Get-CountValue -Value $parsed.intakes
    drafts = Get-CountValue -Value $parsed.drafts
  }
}

function Get-NestedValue {
  param(
    [object]$Value,
    [string[]]$Path
  )

  $current = $Value
  foreach ($segment in @($Path)) {
    if ($null -eq $current) {
      return $null
    }
    try {
      if ($current -is [System.Collections.IDictionary] -and $current.Contains($segment)) {
        $current = $current[$segment]
        continue
      }
      $prop = $current.PSObject.Properties[$segment]
      if ($prop) {
        $current = $prop.Value
        continue
      }
    } catch {
      return $null
    }
    return $null
  }

  return $current
}

function Get-MailboxProfiles {
  $raw = Get-Content -LiteralPath (Join-Path $RepoRoot 'server\data\mailbox-profiles.json') -Raw -Encoding UTF8
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

$workDir = Join-Path $TempDir ('joathi-imap-regression-' + [guid]::NewGuid().ToString('N'))
$tempApiStore = Join-Path $workDir 'api-v1-store.json'
$tempAssistantStore = Join-Path $workDir 'assistant-store.json'
$seedScript = Join-Path $RepoRoot 'server\assistant\tests\imap-mailbox-control.py'
$script:MailboxControlScript = $seedScript
$mainApiStore = Join-Path $RepoRoot 'server\data\api-v1-store.json'
$mainAssistantStore = Join-Path $RepoRoot 'server\data\assistant-store.json'
$summary = $null
$failed = $false
$seed = $null
$cleanup = $null
$cleanupError = $null
$mainApiBefore = Get-StoreCounts -Path $mainApiStore
$mainAssistantBefore = Get-StoreCounts -Path $mainAssistantStore
  New-Item -ItemType Directory -Path $workDir -Force | Out-Null

try {
  Copy-Item -LiteralPath $mainApiStore -Destination $tempApiStore -Force
  Copy-Item -LiteralPath $mainAssistantStore -Destination $tempAssistantStore -Force

  . (Join-Path $RepoRoot 'server\api-v1-backend.ps1')
  . (Join-Path $RepoRoot 'server\assistant\assistant-backend.ps1')

  $script:ApiV1StorePath = $tempApiStore
  $script:AssistantStorePath = $tempAssistantStore

  $reconFixture = Get-Content -LiteralPath (Join-Path $RepoRoot 'server\assistant\fixtures\reconciliation-clean.fixture.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $noopFixture = Get-Content -LiteralPath (Join-Path $RepoRoot 'server\assistant\fixtures\no-operation-clean.fixture.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $controlledFixtures = [pscustomobject]@{
    customerMailbox = if ($reconFixture.signals -and $reconFixture.signals.customerMailbox) { [string]$reconFixture.signals.customerMailbox } else { '' }
    providerMailbox = if ($reconFixture.signals -and $reconFixture.signals.providerMailbox) { [string]$reconFixture.signals.providerMailbox } else { '' }
    usage = if ($reconFixture.signals -and $reconFixture.signals.usage) { [string]$reconFixture.signals.usage } else { '' }
  }

  foreach ($customerPayload in @($reconFixture.customer, $noopFixture.customer)) {
    $customerResponse = Invoke-ApiV1Request -Request ([pscustomobject]@{
      Method = 'POST'
      BodyText = ($customerPayload | ConvertTo-Json -Depth 20)
    }) -Path '/api/v1/customers' -QueryString ''

    Assert-Regression -Condition ([bool]$customerResponse.body.ok) -Message 'No se pudo crear un customer de prueba en el store temporal.'
  }

  $seedJson = Invoke-MailboxControl -Command 'seed' -Arguments @('--profile-id', $MailboxProfileId)
  $seed = $seedJson | ConvertFrom-Json
  Assert-Regression -Condition ([bool]$seed.ok) -Message 'No se pudo sembrar el buzón controlado.'
  Assert-Regression -Condition (-not [string]::IsNullOrWhiteSpace([string]$seed.folder)) -Message 'La siembra no devolvio una carpeta valida.'
  Assert-Regression -Condition ($seed.messages.Count -ge 3) -Message 'La siembra no devolvio suficientes mensajes.'

  $results = New-Object System.Collections.Generic.List[object]
  foreach ($message in @($seed.messages)) {
    $payload = [pscustomobject]@{
      externalId = [string]$message.uid
      from = [string]$message.from
      subject = [string]$message.subject
      date = [string]$message.date
      bodyText = [string]$message.bodyText
      preview = [string]$message.preview
    }

    $result = Invoke-AssistantProcessIntake -RawPayload $payload -SourceKind 'mailbox' -ProviderKind 'imap' -MailboxProfileId $MailboxProfileId -MailboxFolder ([string]$seed.folder) -Execute:$true -Force:$true
    Assert-Regression -Condition ([bool]$result.ok) -Message "No se pudo procesar el mensaje $([string]$message.caseId)."

    $intake = $result.intake
    $results.Add([pscustomobject]@{
      caseId = [string]$message.caseId
      mailboxUid = [string]$message.uid
      customerMatchKind = [string]$intake.customerMatchKind
      customerMatchReason = [string]$intake.customerMatchReason
      customerMatchConfidence = [double]$intake.customerMatchConfidence
      customerMatchEvidence = $intake.customerMatchEvidence
      classification = $intake.classification
      operationId = [string](Get-NestedValue -Value $intake -Path @('execution', 'operation', 'data', 'id'))
      taskId = [string](Get-NestedValue -Value $intake -Path @('execution', 'task', 'data', 'id'))
      activityId = [string](Get-NestedValue -Value $intake -Path @('execution', 'activity', 'data', 'id'))
      draftId = [string](Get-NestedValue -Value $intake -Path @('execution', 'draft', 'draft', 'id'))
      draftStatus = [string]$intake.draftStatus
      draftProviderOk = [bool]$intake.draftProviderOk
      draftFallbackMode = [string]$intake.draftFallbackMode
      draftError = [string]$intake.draftError
      operationAction = [string](Get-NestedValue -Value $intake -Path @('planned', 'operation', 'action'))
      taskAction = [string](Get-NestedValue -Value $intake -Path @('planned', 'task', 'action'))
      operationReconciliation = Get-NestedValue -Value $intake -Path @('execution', 'operationReconciliation')
    }) | Out-Null
  }

  $items = @($results.ToArray())
  $reconItems = @($items | Where-Object { $_.caseId -in @('fixture-py-001', 'fixture-py-002') })
  $sameOperation = $false
  if ($reconItems.Count -ge 2) {
    $sameOperation = (-not [string]::IsNullOrWhiteSpace([string]$reconItems[0].operationId)) -and ([string]$reconItems[0].operationId -eq [string]$reconItems[1].operationId)
  }

  $operationCount = @(Get-ApiV1EntityRecords -Store (Get-ApiV1Store) -EntityKind 'operation').Count
  $mainApiAfter = Get-StoreCounts -Path $mainApiStore
  $mainAssistantAfter = Get-StoreCounts -Path $mainAssistantStore

  Assert-Regression -Condition $sameOperation -Message 'El flujo Paraguay no reuso la misma operation entre correos.'
  Assert-Regression -Condition ($operationCount -eq 1) -Message 'El store temporal no quedo con una sola operation.'
  Assert-Regression -Condition (($mainApiBefore.customer -eq $mainApiAfter.customer) -and ($mainApiBefore.task -eq $mainApiAfter.task) -and ($mainApiBefore.activity -eq $mainApiAfter.activity) -and ($mainApiBefore.operation -eq $mainApiAfter.operation)) -Message 'El store principal de API fue modificado.'
  Assert-Regression -Condition (($mainAssistantBefore.intakes -eq $mainAssistantAfter.intakes) -and ($mainAssistantBefore.drafts -eq $mainAssistantAfter.drafts)) -Message 'El store principal del asistente fue modificado.'
  Assert-Regression -Condition (@($items | Where-Object { $_.caseId -eq 'fixture-py-001' }).Count -eq 1) -Message 'No quedo exactamente un resultado para el primer correo.'
  Assert-Regression -Condition (@($items | Where-Object { $_.caseId -eq 'fixture-py-002' }).Count -eq 1) -Message 'No quedo exactamente un resultado para el segundo correo.'
  Assert-Regression -Condition (@($items | Where-Object { $_.caseId -eq 'fixture-nop-001' }).Count -eq 1) -Message 'No quedo exactamente un resultado para el caso informativo.'
  Assert-Regression -Condition ([string](@($items | Where-Object { $_.caseId -eq 'fixture-py-001' } | Select-Object -First 1).operationAction) -eq 'create') -Message 'El primer caso no creó operación provisional.'
  Assert-Regression -Condition ([string](@($items | Where-Object { $_.caseId -eq 'fixture-py-002' } | Select-Object -First 1).operationAction) -eq 'update') -Message 'El segundo caso no reconcilió por PATCH.'
  Assert-Regression -Condition ([string](@($items | Where-Object { $_.caseId -eq 'fixture-nop-001' } | Select-Object -First 1).operationAction) -eq 'skip') -Message 'El caso informativo intentó crear operation.'

  if (-not $KeepMailboxFolder) {
    try {
      $cleanupJson = Invoke-MailboxControl -Command 'cleanup' -Arguments @('--profile-id', $MailboxProfileId, '--folder', ([string]$seed.folder))
      $cleanup = $cleanupJson | ConvertFrom-Json
      Assert-Regression -Condition ([bool]$cleanup.ok) -Message 'La limpieza del folder temporal del buzón fallo.'
      Assert-Regression -Condition ([bool]$cleanup.deleted) -Message "No se pudo eliminar el folder temporal: $([string]$cleanup.reason)"
    } catch {
      $cleanupError = [string]$_.Exception.Message
      throw
    }
  }

  $summary = [pscustomobject]@{
    status = 'pass'
    scenarioId = 'imap-controlled-regression'
    expected = [pscustomobject]@{
      sameOperation = $true
      operationCount = 1
      noOperationCase = 'fixture-nop-001'
    }
    seed = [pscustomobject]@{
      profileId = [string]$seed.profileId
      folder = [string]$seed.folder
      transport = [string]$seed.transport
      messageCount = [int]$seed.messageCount
    }
    controlledFixtures = $controlledFixtures
    sameOperation = [bool]$sameOperation
    operationCount = [int]$operationCount
    cases = $items
    mailboxCleanup = [pscustomobject]@{
      attempted = [bool](-not $KeepMailboxFolder)
      deleted = if ($cleanup) { [bool]$cleanup.deleted } else { $false }
      folder = if ($cleanup) { [string]$cleanup.folder } elseif ($seed) { [string]$seed.folder } else { '' }
      transport = if ($cleanup) { [string]$cleanup.transport } else { '' }
      reason = if ($cleanup) { [string]$cleanup.reason } else { '' }
    }
    storeIsolation = [pscustomobject]@{
      tempApiStore = $tempApiStore
      tempAssistantStore = $tempAssistantStore
      mainApiBefore = $mainApiBefore
      mainApiAfter = $mainApiAfter
      mainAssistantBefore = $mainAssistantBefore
      mainAssistantAfter = $mainAssistantAfter
    }
  }
}
catch {
  $failed = $true
  $summary = [pscustomobject]@{
    status = 'fail'
    error = [string]$_.Exception.Message
    cleanupError = [string]$cleanupError
    storeIsolation = [pscustomobject]@{
      tempApiStore = $tempApiStore
      tempAssistantStore = $tempAssistantStore
      mainApiBefore = $mainApiBefore
      mainAssistantBefore = $mainAssistantBefore
    }
  }
}
finally {
  if (-not $KeepTempStores) {
    Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

$summary | ConvertTo-Json -Depth 100

if ($failed) {
  exit 1
}
