param(
  [string]$RepoRoot = "",
  [string]$FixturePath = "",
  [string]$TempDir = "",
  [string]$MailboxProfileId = 'rodrigo',
  [switch]$KeepTempStores,
  [switch]$KeepMailboxFolder
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
}

if ([string]::IsNullOrWhiteSpace($FixturePath)) {
  $FixturePath = Join-Path $RepoRoot 'server\assistant\fixtures\imap-real-3case.fixture.json'
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
  $resolvedArguments = New-Object System.Collections.Generic.List[string]
  foreach ($argument in @($Arguments)) {
    if ([string]::IsNullOrWhiteSpace([string]$argument)) {
      $resolvedArguments.Add([string]$argument) | Out-Null
      continue
    }
    if ([string]$argument -match '^[A-Za-z]:\\') {
      $resolvedArguments.Add((Convert-ToWslPath -Path ([string]$argument))) | Out-Null
    } else {
      $resolvedArguments.Add([string]$argument) | Out-Null
    }
  }
  $argumentList = @('python3', $wslScript, $Command) + @($resolvedArguments.ToArray())
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

$workDir = Join-Path $TempDir ('joathi-3case-imap-regression-' + [guid]::NewGuid().ToString('N'))
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

  $fixture = Get-Content -LiteralPath $FixturePath -Raw -Encoding UTF8 | ConvertFrom-Json

  $customerResponse = Invoke-ApiV1Request -Request ([pscustomobject]@{
    Method = 'POST'
    BodyText = ($fixture.customer | ConvertTo-Json -Depth 20)
  }) -Path '/api/v1/customers' -QueryString ''

  Assert-Regression -Condition ([bool]$customerResponse.body.ok) -Message 'No se pudo crear el customer del fixture 3-casos.'
  $customerId = [string]$customerResponse.body.data.id

  $seedJson = Invoke-MailboxControl -Command 'seed' -Arguments @('--profile-id', $MailboxProfileId, '--scenario-file', $FixturePath)
  $seed = $seedJson | ConvertFrom-Json
  Assert-Regression -Condition ([bool]$seed.ok) -Message 'No se pudo sembrar el buzón controlado.'
  Assert-Regression -Condition ($seed.messages.Count -ge 3) -Message 'La siembra no devolvio tres mensajes.'

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
      from = [string]$message.from
      subject = [string]$message.subject
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
      operationAction = [string](Get-NestedValue -Value $intake -Path @('planned', 'operation', 'action'))
      taskAction = [string](Get-NestedValue -Value $intake -Path @('planned', 'task', 'action'))
      operationReconciliation = Get-NestedValue -Value $intake -Path @('execution', 'operationReconciliation')
    }) | Out-Null
  }

  $items = @($results.ToArray())
  $case1 = @($items | Where-Object { $_.caseId -eq 'real-py-001' } | Select-Object -First 1)
  $case2 = @($items | Where-Object { $_.caseId -eq 'real-py-002' } | Select-Object -First 1)
  $case3 = @($items | Where-Object { $_.caseId -eq 'real-info-001' } | Select-Object -First 1)

  Assert-Regression -Condition ($items.Count -eq 3) -Message 'No quedaron exactamente tres resultados.'
  Assert-Regression -Condition ($case1.Count -eq 1) -Message 'No quedo un resultado para el caso 1.'
  Assert-Regression -Condition ($case2.Count -eq 1) -Message 'No quedo un resultado para el caso 2.'
  Assert-Regression -Condition ($case3.Count -eq 1) -Message 'No quedo un resultado para el caso 3.'

  $opsAfter = @(Get-AssistantApiV1Items -EntityKind 'operation' -Query @{ customerId = $customerId; limit = 50 })
  $tasksAfter = @(Get-AssistantApiV1Items -EntityKind 'task' -Query @{ customerId = $customerId; limit = 50 })
  $activitiesAfter = @(Get-AssistantApiV1Items -EntityKind 'activity' -Query @{ customerId = $customerId; limit = 50 })
  $assistantStore = Get-AssistantStore
  $draftsAfter = @(Get-AssistantStoreDraftsArray -Store $assistantStore)
  $mainApiAfter = Get-StoreCounts -Path $mainApiStore
  $mainAssistantAfter = Get-StoreCounts -Path $mainAssistantStore

  $sameOperation = ($case1[0].operationId -eq $case2[0].operationId) -and (-not [string]::IsNullOrWhiteSpace([string]$case1[0].operationId))
  $operationCount = $opsAfter.Count

  Assert-Regression -Condition $sameOperation -Message 'El caso 2 no reconcilio la misma operation que el caso 1.'
  Assert-Regression -Condition ($operationCount -eq 1) -Message 'El store temporal no quedo con una sola operation.'
  Assert-Regression -Condition ([string]$case1[0].operationAction -eq 'create') -Message 'El caso 1 no creo la operation provisional.'
  Assert-Regression -Condition ([string]$case2[0].operationAction -eq 'update') -Message 'El caso 2 no hizo PATCH sobre la misma operation.'
  Assert-Regression -Condition ([string]$case3[0].operationAction -eq 'skip') -Message 'El caso 3 intento crear operation.'
  Assert-Regression -Condition ([string]$case3[0].operationId -eq '') -Message 'El caso 3 dejo un operationId espurio.'
  Assert-Regression -Condition ([string]$case1[0].draftStatus -eq 'draft_exported') -Message 'El caso 1 no exporto el draft al buzón real.'
  Assert-Regression -Condition ([string]$case2[0].draftStatus -eq 'draft_exported') -Message 'El caso 2 no exporto el draft al buzón real.'
  Assert-Regression -Condition ([string]$case3[0].draftStatus -eq 'draft_exported') -Message 'El caso 3 no exporto el draft al buzón real.'
  Assert-Regression -Condition (($mainApiBefore.customer -eq $mainApiAfter.customer) -and ($mainApiBefore.task -eq $mainApiAfter.task) -and ($mainApiBefore.activity -eq $mainApiAfter.activity) -and ($mainApiBefore.operation -eq $mainApiAfter.operation)) -Message 'El store principal de API fue modificado.'
  Assert-Regression -Condition (($mainAssistantBefore.intakes -eq $mainAssistantAfter.intakes) -and ($mainAssistantBefore.drafts -eq $mainAssistantAfter.drafts)) -Message 'El store principal del asistente fue modificado.'

  if (-not $KeepMailboxFolder) {
    $cleanupJson = Invoke-MailboxControl -Command 'cleanup' -Arguments @('--profile-id', $MailboxProfileId, '--folder', ([string]$seed.folder))
    $cleanup = $cleanupJson | ConvertFrom-Json
    Assert-Regression -Condition ([bool]$cleanup.ok) -Message 'La limpieza del folder temporal del buzón fallo.'
    Assert-Regression -Condition ([bool]$cleanup.deleted) -Message "No se pudo eliminar el folder temporal: $([string]$cleanup.reason)"
  }

  $summary = [pscustomobject]@{
    status = 'pass'
    scenarioId = [string]$fixture.scenarioId
    expected = [pscustomobject]@{
      sameOperation = [bool]$fixture.expected.sameOperation
      operationCount = [int]$fixture.expected.operationCount
    }
    seed = [pscustomobject]@{
      profileId = [string]$seed.profileId
      folder = [string]$seed.folder
      transport = [string]$seed.transport
      messageCount = [int]$seed.messageCount
      scenarioId = [string]$seed.scenarioId
    }
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
    totals = [pscustomobject]@{
      operations = $opsAfter.Count
      tasks = $tasksAfter.Count
      activities = $activitiesAfter.Count
      drafts = $draftsAfter.Count
    }
  }
}
catch {
  $failed = $true
  $summary = [pscustomobject]@{
    status = 'fail'
    error = [string]$_.Exception.Message
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
