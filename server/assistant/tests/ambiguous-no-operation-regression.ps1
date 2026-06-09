param(
  [string]$RepoRoot = "",
  [string]$FixturePath = "",
  [string]$TempDir = "",
  [switch]$KeepTempStores
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
}

if ([string]::IsNullOrWhiteSpace($FixturePath)) {
  $FixturePath = Join-Path $RepoRoot 'server\assistant\fixtures\ambiguous-no-operation.fixture.json'
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

$workDir = Join-Path $TempDir ('joathi-ambiguous-regression-' + [guid]::NewGuid().ToString('N'))
$tempApiStore = Join-Path $workDir 'api-v1-store.json'
$tempAssistantStore = Join-Path $workDir 'assistant-store.json'
$summary = $null
$failed = $false

New-Item -ItemType Directory -Path $workDir -Force | Out-Null

try {
  $apiStoreSource = Join-Path $RepoRoot 'server\data\api-v1-store.json'
  $assistantStoreSource = Join-Path $RepoRoot 'server\data\assistant-store.json'

  Copy-Item -Path $apiStoreSource -Destination $tempApiStore -Force
  Copy-Item -Path $assistantStoreSource -Destination $tempAssistantStore -Force

  . (Join-Path $RepoRoot 'server\api-v1-backend.ps1')
  . (Join-Path $RepoRoot 'server\assistant\assistant-backend.ps1')

  $script:ApiV1StorePath = $tempApiStore
  $script:AssistantStorePath = $tempAssistantStore

  $fixture = Get-Content -Path $FixturePath -Raw | ConvertFrom-Json

  $customerPayload = $fixture.customer
  $customerResponse = Invoke-ApiV1Request -Request ([pscustomobject]@{
    Method = 'POST'
    BodyText = ($customerPayload | ConvertTo-Json -Depth 20)
  }) -Path '/api/v1/customers' -QueryString ''

  Assert-Regression -Condition ([bool]$customerResponse.body.ok) -Message 'No se pudo crear el customer del fixture ambiguo.'
  $customerId = [string]$customerResponse.body.data.id

  function New-FixtureMessagePayload {
    param(
      [object]$Message,
      [string]$CustomerId
    )

    $payload = [ordered]@{}
    foreach ($property in $Message.PSObject.Properties) {
      $payload[$property.Name] = $property.Value
    }
    $payload.customerId = $CustomerId
    return [pscustomobject]$payload
  }

  $message = New-FixtureMessagePayload -Message $fixture.messages[0] -CustomerId $customerId
  $normalized = Get-AssistantCreateNormalizedMessage -Payload $message -SourceKind 'simulated'
  $customerMatch = Get-AssistantCustomerMatch -Message $normalized
  $classification = Get-AssistantClassification -Message $normalized -CustomerMatch $customerMatch
  $plan = Get-AssistantOperationPlan -Message $normalized -CustomerMatch $customerMatch -Classification $classification
  $result = Invoke-AssistantProcessIntake -RawPayload $message -SourceKind 'simulated' -Execute:$true -Force:$true

  $operations = @(Get-AssistantApiV1Items -EntityKind 'operation' -Query @{ customerId = $customerId; limit = 50 })
  $tasks = @(Get-AssistantApiV1Items -EntityKind 'task' -Query @{ customerId = $customerId; limit = 50 })
  $activities = @(Get-AssistantApiV1Items -EntityKind 'activity' -Query @{ customerId = $customerId; limit = 50 })
  $assistantStore = Get-AssistantStore
  $draft = Get-AssistantStoreDraftById -Store $assistantStore -Id ([string]$result.intake.draftId)

  Assert-Regression -Condition ([bool]$result.ok) -Message 'El intake ambiguo no completó correctamente.'
  Assert-Regression -Condition ($operations.Count -eq 0) -Message 'Apareció una operation espuria en el caso ambiguo.'
  Assert-Regression -Condition (-not [bool]$classification.requiresOperation) -Message 'La clasificación ambiguo marcó requiresOperation cuando no correspondía.'
  Assert-Regression -Condition ([string]$classification.caseType -eq [string]$fixture.expected.caseType) -Message 'El caso ambiguo no quedó clasificado como seguimiento comercial.'
  Assert-Regression -Condition ([string]$plan.action -eq 'skip') -Message 'El planner ambiguo intentó escribir operation.'
  Assert-Regression -Condition ($activities.Count -ge 1) -Message 'No se generó activity en el caso ambiguo.'
  Assert-Regression -Condition ($tasks.Count -ge 1) -Message 'No se generó task en el caso ambiguo.'
  Assert-Regression -Condition (-not [string]::IsNullOrWhiteSpace([string]$result.intake.draftId)) -Message 'No se generó draft en el caso ambiguo.'
  Assert-Regression -Condition ($null -ne $draft) -Message 'El draft ambiguo no quedó persistido en el store del asistente.'
  Assert-Regression -Condition ([string]$draft.sourceEmailExternalId -eq [string]$message.externalId) -Message 'El draft ambiguo no quedó vinculado al correo de origen correcto.'
  Assert-Regression -Condition (-not [string]::IsNullOrWhiteSpace([string]$result.intake.customerMatchKind)) -Message 'No se pudo rastrear el match de cliente en el caso ambiguo.'
  Assert-Regression -Condition ([double]$result.intake.customerMatchConfidence -gt 0) -Message 'La confianza de match en el caso ambiguo no fue suficiente.'

  $summary = [pscustomobject]@{
    status = 'pass'
    scenarioId = [string]$fixture.scenarioId
    expected = [pscustomobject]@{
      operationCount = [int]$fixture.expected.operationCount
      taskExpected = [bool]$fixture.expected.taskExpected
      activityExpected = [bool]$fixture.expected.activityExpected
      draftExpected = [bool]$fixture.expected.draftExpected
      caseType = [string]$fixture.expected.caseType
      requiresOperation = [bool]$fixture.expected.requiresOperation
    }
    operationCount = $operations.Count
    operationCreated = ($operations.Count -gt 0)
    ids = [pscustomobject]@{
      customerId = $customerId
      operationIds = @($operations | ForEach-Object { [string]$_.id })
      taskIds = @($tasks | ForEach-Object { [string]$_.id })
      activityIds = @($activities | ForEach-Object { [string]$_.id })
      draftId = [string]$result.intake.draftId
    }
    customerMatch = [pscustomobject]@{
      kind = [string]$result.intake.customerMatchKind
      reason = [string]$result.intake.customerMatchReason
      confidence = [double]$result.intake.customerMatchConfidence
      evidence = $result.intake.customerMatchEvidence
    }
    classification = [pscustomobject]@{
      caseType = [string]$classification.caseType
      requiresOperation = [bool]$classification.requiresOperation
      requiresTask = [bool]$classification.requiresTask
      requiresFollowUp = [bool]$classification.requiresFollowUp
      requiresResponse = [bool]$classification.requiresResponse
    }
    execution = [pscustomobject]@{
      draftStatus = [string]$result.intake.draftStatus
      draftProviderOk = [bool]$result.intake.draftProviderOk
      draftFallbackMode = [string]$result.intake.draftFallbackMode
      taskId = if ($result.intake.execution.task -and $result.intake.execution.task.data) { [string]$result.intake.execution.task.data.id } else { '' }
      activityId = if ($result.intake.execution.activity -and $result.intake.execution.activity.data) { [string]$result.intake.execution.activity.data.id } else { '' }
      operationId = if ($result.intake.execution.operation -and $result.intake.execution.operation.data) { [string]$result.intake.execution.operation.data.id } else { '' }
      notes = @($result.notes)
    }
    validation = [pscustomobject]@{
      noOperationCreated = ($operations.Count -eq 0)
      taskCreated = ($tasks.Count -ge 1)
      activityCreated = ($activities.Count -ge 1)
      draftPersisted = ($null -ne $draft)
      draftSourceMatches = ([string]$draft.sourceEmailExternalId -eq [string]$message.externalId)
    }
    storeIsolation = [pscustomobject]@{
      apiStore = $tempApiStore
      assistantStore = $tempAssistantStore
    }
  }
}
catch {
  $failed = $true
  $summary = [pscustomobject]@{
    status = 'fail'
    error = $_.Exception.Message
    storeIsolation = [pscustomobject]@{
      apiStore = $tempApiStore
      assistantStore = $tempAssistantStore
    }
  }
}
finally {
  if (-not $KeepTempStores) {
    Remove-Item -Path $workDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

$summary | ConvertTo-Json -Depth 20

if ($failed) {
  exit 1
}
