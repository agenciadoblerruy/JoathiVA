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
  $FixturePath = Join-Path $RepoRoot 'server\assistant\fixtures\internal-container-return.fixture.json'
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

$workDir = Join-Path $TempDir ('joathi-internal-return-regression-' + [guid]::NewGuid().ToString('N'))
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

  Assert-Regression -Condition ([bool]$customerResponse.body.ok) -Message 'No se pudo crear el customer del fixture de cierre interno.'
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
  $firstDraft = if ($result1.intake.draftId) { Get-AssistantStoreDraftById -Store $assistantStore -Id ([string]$result1.intake.draftId) } else { $null }
  $secondDraft = if ($result2.intake.draftId) { Get-AssistantStoreDraftById -Store $assistantStore -Id ([string]$result2.intake.draftId) } else { $null }

  Assert-Regression -Condition ([bool]$result1.ok) -Message 'El primer intake no completó correctamente.'
  Assert-Regression -Condition ([bool]$result2.ok) -Message 'El segundo intake no completó correctamente.'
  Assert-Regression -Condition ([string]$plan1.action -eq 'create') -Message 'El primer correo no quedó como create.'
  Assert-Regression -Condition ([string]$plan2.action -eq 'update') -Message 'El correo interno de cierre no quedó como update.'
  Assert-Regression -Condition ([string]$normalized2.operationHint.estadoOperacion -eq [string]$fixture.expected.finalState) -Message 'El hint de operación no cerró la operativa.'
  Assert-Regression -Condition ([string]$classification2.workflowStage -eq [string]$fixture.expected.finalWorkflowStage) -Message 'La clasificación no marcó cierre operativo.'
  Assert-Regression -Condition ([string]$classification2.workflowCategory -eq [string]$fixture.expected.finalWorkflowCategory) -Message 'La clasificación no quedó como cierre operativo.'
  Assert-Regression -Condition ([string]$classification2.actorRole -eq 'interno') -Message 'El remitente interno no quedó identificado como interno.'
  Assert-Regression -Condition ($opsAfter1.Count -eq 1) -Message 'La primera pasada no dejó exactamente una operación.'
  Assert-Regression -Condition ($opsAfter2.Count -eq 1) -Message 'La segunda pasada no dejó exactamente una operación.'
  Assert-Regression -Condition ([string]$opsAfter1[0].id -eq [string]$opsAfter2[0].id) -Message 'El cierre interno no reutilizó la misma operación.'
  Assert-Regression -Condition ([string]$opsAfter2[0].estadoOperacion -eq [string]$fixture.expected.finalState) -Message 'La operación no quedó cerrada.'
  Assert-Regression -Condition ([string]$opsAfter2[0].contenedor -eq [string]$fixture.expected.finalContainer) -Message 'El contenedor no se mantuvo en la operación.'
  Assert-Regression -Condition ([string]$opsAfter2[0].observaciones -match 'operacion finalizada') -Message 'La operación no dejó trazabilidad del cierre.'
  Assert-Regression -Condition ($tasksAfter2.Count -ge 1) -Message 'No quedó ninguna tarea asociada al customer.'
  Assert-Regression -Condition ($activitiesAfter2.Count -ge 1) -Message 'No quedó ninguna actividad asociada al customer.'
  Assert-Regression -Condition (($null -ne $latestActivity) -and ([string]$latestActivity.operationId -eq [string]$opsAfter2[0].id)) -Message 'La última actividad no quedó ligada a la operación cerrada.'
  Assert-Regression -Condition (($null -ne $firstDraft) -or (-not [string]::IsNullOrWhiteSpace([string]$result1.intake.draftId))) -Message 'El primer correo no generó ni persistió draft.'
  Assert-Regression -Condition ([string]$result2.intake.execution.operation.data.estadoOperacion -eq [string]$fixture.expected.finalState) -Message 'La ejecución del segundo correo no devolvió la operación cerrada.'

  $summary = [pscustomobject]@{
    status = 'pass'
    scenarioId = [string]$fixture.scenarioId
    expected = [pscustomobject]@{
      sameOperation = [bool]$fixture.expected.sameOperation
      operationCount = [int]$fixture.expected.operationCount
      finalState = [string]$fixture.expected.finalState
      finalWorkflowStage = [string]$fixture.expected.finalWorkflowStage
      finalWorkflowCategory = [string]$fixture.expected.finalWorkflowCategory
      finalContainer = [string]$fixture.expected.finalContainer
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
      workflowStage = [string]$classification1.workflowStage
      workflowCategory = [string]$classification1.workflowCategory
      operationHintState = [string]$normalized1.operationHint.estadoOperacion
      operationId = [string]$result1.intake.execution.operation.data.id
      draftId = [string]$result1.intake.draftId
    }
    secondPass = [pscustomobject]@{
      planAction = [string]$plan2.action
      workflowStage = [string]$classification2.workflowStage
      workflowCategory = [string]$classification2.workflowCategory
      operationHintState = [string]$normalized2.operationHint.estadoOperacion
      operationId = [string]$result2.intake.execution.operation.data.id
      draftId = [string]$result2.intake.draftId
      container = [string]$opsAfter2[0].contenedor
      state = [string]$opsAfter2[0].estadoOperacion
      customerMatchKind = [string]$result2.intake.customerMatchKind
      customerMatchReason = [string]$result2.intake.customerMatchReason
      customerMatchConfidence = [double]$result2.intake.customerMatchConfidence
    }
    validation = [pscustomobject]@{
      sameOperation = [bool]([string]$opsAfter1[0].id -eq [string]$opsAfter2[0].id)
      operationCount = $opsAfter2.Count
      closedState = ([string]$opsAfter2[0].estadoOperacion -eq [string]$fixture.expected.finalState)
      workflowClosed = (([string]$classification2.workflowStage -eq [string]$fixture.expected.finalWorkflowStage) -and ([string]$classification2.workflowCategory -eq [string]$fixture.expected.finalWorkflowCategory))
      finalContainer = ([string]$opsAfter2[0].contenedor -eq [string]$fixture.expected.finalContainer)
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
