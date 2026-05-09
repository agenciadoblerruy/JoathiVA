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

function Assert-Smoke {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

$workDir = Join-Path $TempDir ('joathi-customer-match-smoke-' + [guid]::NewGuid().ToString('N'))
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

  Assert-Smoke -Condition ([bool]$customerResponse.body.ok) -Message 'No se pudo crear el customer de smoke.'
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

  $seedMessage = New-FixtureMessagePayload -Message $fixture.messages[0] -CustomerId $customerId
  $seedResult = Invoke-AssistantProcessIntake -RawPayload $seedMessage -SourceKind 'simulated' -Execute:$true -Force:$true
  Assert-Smoke -Condition ([bool]$seedResult.ok) -Message 'No se pudo sembrar contexto previo para el smoke.'

  $matchMessage = [pscustomobject]@{
    externalId = 'fixture-match-ctx-001'
    from = 'Operaciones Limpias <alertas@recon-limpia.test>'
    subject = 'Seguimiento PY26000006'
    date = '2026-04-21T18:00:00Z'
    bodyText = 'Seguimiento del mismo caso PY26000006. Mantener avance documental.'
  }

  $normalized = Get-AssistantCreateNormalizedMessage -Payload $matchMessage -SourceKind 'simulated'
  $customerMatch = Get-AssistantCustomerMatch -Message $normalized

  Assert-Smoke -Condition ([bool]$customerMatch.found) -Message 'El matcher no identificó cliente en el smoke contextual.'
  Assert-Smoke -Condition ([string]$customerMatch.customerId -eq $customerId) -Message 'El matcher contextual eligió un cliente distinto.'
  Assert-Smoke -Condition ($customerMatch.matchKind -eq 'heuristic+context') -Message 'El matcher no usó contexto previo como refuerzo.'
  Assert-Smoke -Condition ([double]$customerMatch.confidence -gt 0.7) -Message 'La confianza del match contextual fue insuficiente.'
  Assert-Smoke -Condition ([string]$customerMatch.reason -match 'contexto|referencia|dominio') -Message 'El motivo del match no dejó trazabilidad útil.'

  $summary = [pscustomobject]@{
    status = 'pass'
    scenario = 'customer-match-context-smoke'
    customerId = $customerId
    seedOperationId = if ($seedResult.intake.execution.operation -and $seedResult.intake.execution.operation.data) { [string]$seedResult.intake.execution.operation.data.id } else { '' }
    customerMatch = [pscustomobject]@{
      found = [bool]$customerMatch.found
      matchKind = [string]$customerMatch.matchKind
      reason = [string]$customerMatch.reason
      confidence = [double]$customerMatch.confidence
      customerId = [string]$customerMatch.customerId
      label = [string]$customerMatch.label
      evidence = $customerMatch.evidence
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
