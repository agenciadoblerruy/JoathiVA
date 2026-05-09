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
  $FixturePath = Join-Path $RepoRoot 'server\assistant\fixtures\reconciliation-clean.fixture.json'
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

$workDir = Join-Path $TempDir ('joathi-reconcile-regression-' + [guid]::NewGuid().ToString('N'))
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

  Assert-Regression -Condition ([bool]$customerResponse.body.ok) -Message 'No se pudo crear el customer del fixture.'
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

  $message1 = New-FixtureMessagePayload -Message $fixture.messages[0] -CustomerId $customerId
  $message2 = New-FixtureMessagePayload -Message $fixture.messages[1] -CustomerId $customerId

  $normalized1 = Get-AssistantCreateNormalizedMessage -Payload $message1 -SourceKind 'simulated'
  $customerMatch1 = Get-AssistantCustomerMatch -Message $normalized1
  $classification1 = Get-AssistantClassification -Message $normalized1 -CustomerMatch $customerMatch1
  $plan1 = Get-AssistantOperationPlan -Message $normalized1 -CustomerMatch $customerMatch1 -Classification $classification1
  $result1 = Invoke-AssistantProcessIntake -RawPayload $message1 -SourceKind 'simulated' -Execute:$true -Force:$true

  $opsAfter1 = @(Get-AssistantApiV1Items -EntityKind 'operation' -Query @{ customerId = $customerId; limit = 50 })
  $tasksAfter1 = @(Get-AssistantApiV1Items -EntityKind 'task' -Query @{ customerId = $customerId; limit = 50 })
  $activitiesAfter1 = @(Get-AssistantApiV1Items -EntityKind 'activity' -Query @{ customerId = $customerId; limit = 50 })

  $normalized2 = Get-AssistantCreateNormalizedMessage -Payload $message2 -SourceKind 'simulated'
  $customerMatch2 = Get-AssistantCustomerMatch -Message $normalized2
  $classification2 = Get-AssistantClassification -Message $normalized2 -CustomerMatch $customerMatch2
  $plan2 = Get-AssistantOperationPlan -Message $normalized2 -CustomerMatch $customerMatch2 -Classification $classification2
  $result2 = Invoke-AssistantProcessIntake -RawPayload $message2 -SourceKind 'simulated' -Execute:$true -Force:$true

  $opsAfter2 = @(Get-AssistantApiV1Items -EntityKind 'operation' -Query @{ customerId = $customerId; limit = 50 })
  $tasksAfter2 = @(Get-AssistantApiV1Items -EntityKind 'task' -Query @{ customerId = $customerId; limit = 50 })
  $activitiesAfter2 = @(Get-AssistantApiV1Items -EntityKind 'activity' -Query @{ customerId = $customerId; limit = 50 })
  $latestActivity = if ($activitiesAfter2.Count -gt 0) { $activitiesAfter2 | Select-Object -First 1 } else { $null }
  $assistantStore = Get-AssistantStore
  $firstDraft = Get-AssistantStoreDraftById -Store $assistantStore -Id ([string]$result1.intake.draftId)
  $secondDraft = Get-AssistantStoreDraftById -Store $assistantStore -Id ([string]$result2.intake.draftId)
  $draftsAfter2 = @(Get-AssistantStoreDraftsArray -Store $assistantStore)

  Assert-Regression -Condition ($plan1.action -eq 'create') -Message 'El primer correo no generó action=create.'
  Assert-Regression -Condition ($plan2.action -eq 'update') -Message 'El segundo correo no generó action=update.'
  Assert-Regression -Condition ($opsAfter1.Count -eq 1) -Message 'La primera pasada no dejó exactamente una operación.'
  Assert-Regression -Condition ($opsAfter2.Count -eq 1) -Message 'La segunda pasada no dejó exactamente una operación.'
  Assert-Regression -Condition (($opsAfter1.Count -eq 1) -and ($opsAfter2.Count -eq 1)) -Message 'operationCount esperado no se cumplió.'
  Assert-Regression -Condition ([string]$opsAfter1[0].id -eq [string]$opsAfter2[0].id) -Message 'La reconciliación no reusó la misma operación.'
  Assert-Regression -Condition ([string]$opsAfter2[0].contenedor -eq [string]$fixture.expected.container) -Message 'El contenedor no fue reemplazado por el valor real.'
  Assert-Regression -Condition ([bool]$result2.intake.execution.executed) -Message 'La segunda pasada no ejecutó el patch sobre la operación.'
  Assert-Regression -Condition ($tasksAfter2.Count -ge 1) -Message 'No quedó ninguna tarea asociada al customer.'
  Assert-Regression -Condition ($activitiesAfter2.Count -ge 1) -Message 'No quedó ninguna actividad asociada al customer.'
  Assert-Regression -Condition (($null -ne $latestActivity) -and ([string]$latestActivity.operationId -eq [string]$opsAfter2[0].id)) -Message 'La actividad más reciente no quedó ligada a la operación reconciliada.'
  Assert-Regression -Condition (-not [string]::IsNullOrWhiteSpace([string]$result1.intake.customerMatchKind)) -Message 'No se pudo rastrear el match de cliente en el primer correo.'
  Assert-Regression -Condition ([double]$result1.intake.customerMatchConfidence -gt 0) -Message 'La confianza de match del primer correo no fue suficiente.'
  Assert-Regression -Condition (-not [string]::IsNullOrWhiteSpace([string]$result2.intake.customerMatchKind)) -Message 'No se pudo rastrear el match de cliente en el segundo correo.'
  Assert-Regression -Condition ([double]$result2.intake.customerMatchConfidence -gt 0) -Message 'La confianza de match del segundo correo no fue suficiente.'
  Assert-Regression -Condition (($null -ne $firstDraft) -and ($null -ne $secondDraft)) -Message 'No quedaron drafts persistidos en el store del asistente.'
  Assert-Regression -Condition ([string]$firstDraft.sourceEmailExternalId -eq [string]$message1.externalId) -Message 'El primer draft no quedó vinculado al correo origen correcto.'
  Assert-Regression -Condition ([string]$secondDraft.sourceEmailExternalId -eq [string]$message2.externalId) -Message 'El segundo draft no quedó vinculado al correo origen correcto.'
  Assert-Regression -Condition ($draftsAfter2.Count -ge 2) -Message 'No quedaron al menos dos drafts persistidos.'
  Assert-Regression -Condition ($result1.intake.draftId -and $result2.intake.draftId) -Message 'No se pudieron obtener draftId para una o ambas pasadas.'
  Assert-Regression -Condition ($result1.intake.execution.task.data.id -and $result2.intake.execution.task.data.id) -Message 'No se pudo confirmar task en una o ambas pasadas.'
  Assert-Regression -Condition ($result1.intake.execution.activity.data.id -and $result2.intake.execution.activity.data.id) -Message 'No se pudo confirmar activity en una o ambas pasadas.'

  $summary = [pscustomobject]@{
    status = 'pass'
    scenarioId = [string]$fixture.scenarioId
    expected = [pscustomobject]@{
      sameOperation = [bool]$fixture.expected.sameOperation
      container = [string]$fixture.expected.container
    }
    sameOperation = [bool]([string]$opsAfter1[0].id -eq [string]$opsAfter2[0].id)
    operationCount = $opsAfter2.Count
    ids = [pscustomobject]@{
      customerId = $customerId
      operationId = [string]$opsAfter2[0].id
      taskIds = @($tasksAfter2 | ForEach-Object { [string]$_.id })
      activityIds = @($activitiesAfter2 | ForEach-Object { [string]$_.id })
      draftIds = @(
        [string]$result1.intake.draftId,
        [string]$result2.intake.draftId
      ) | Where-Object { $_ }
    }
  firstPass = [pscustomobject]@{
      planAction = [string]$plan1.action
      draftId = [string]$result1.intake.draftId
      draftStatus = [string]$result1.intake.draftStatus
      taskCount = $tasksAfter1.Count
      activityCount = $activitiesAfter1.Count
      taskId = [string]$result1.intake.execution.task.data.id
      activityId = [string]$result1.intake.execution.activity.data.id
      operationId = [string]$result1.intake.execution.operation.data.id
      operationExecuted = [bool]$result1.intake.execution.executed
      customerMatchKind = [string]$result1.intake.customerMatchKind
      customerMatchReason = [string]$result1.intake.customerMatchReason
      customerMatchConfidence = [double]$result1.intake.customerMatchConfidence
    }
    secondPass = [pscustomobject]@{
      planAction = [string]$plan2.action
      draftId = [string]$result2.intake.draftId
      draftStatus = [string]$result2.intake.draftStatus
      taskCount = $tasksAfter2.Count
      activityCount = $activitiesAfter2.Count
      taskId = [string]$result2.intake.execution.task.data.id
      activityId = [string]$result2.intake.execution.activity.data.id
      operationId = [string]$result2.intake.execution.operation.data.id
      operationExecuted = [bool]$result2.intake.execution.executed
      contenedor = [string]$opsAfter2[0].contenedor
      reference = [string]$opsAfter2[0].referencia
      customerMatchKind = [string]$result2.intake.customerMatchKind
      customerMatchReason = [string]$result2.intake.customerMatchReason
      customerMatchConfidence = [double]$result2.intake.customerMatchConfidence
    }
    validation = [pscustomobject]@{
      sameOperation = [bool]([string]$opsAfter1[0].id -eq [string]$opsAfter2[0].id)
      operationCount = $opsAfter2.Count
      provisionalReplaced = ([string]$opsAfter2[0].contenedor -eq [string]$fixture.expected.container)
      firstAction = [string]$plan1.action
      secondAction = [string]$plan2.action
      draftCount = $draftsAfter2.Count
      firstDraftStatus = [string]$firstDraft.status
      secondDraftStatus = [string]$secondDraft.status
      firstNotes = @($result1.notes)
      secondNotes = @($result2.notes)
      latestActivityLinked = (($null -ne $latestActivity) -and ([string]$latestActivity.operationId -eq [string]$opsAfter2[0].id))
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
