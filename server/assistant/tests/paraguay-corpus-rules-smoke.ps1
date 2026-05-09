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
  $FixturePath = Join-Path $RepoRoot 'server\assistant\fixtures\paraguay-corpus-rules.fixture.json'
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

$workDir = Join-Path $TempDir ('joathi-paraguay-corpus-rules-' + [guid]::NewGuid().ToString('N'))
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

  $customerIds = New-Object System.Collections.Generic.List[string]
  foreach ($customer in @($fixture.customers)) {
    $customerResponse = Invoke-ApiV1Request -Request ([pscustomobject]@{
      Method = 'POST'
      BodyText = ($customer | ConvertTo-Json -Depth 20)
    }) -Path '/api/v1/customers' -QueryString ''

    Assert-Regression -Condition ([bool]$customerResponse.body.ok) -Message 'No se pudo crear un customer del fixture Paraguay.'
    $customerIds.Add([string]$customerResponse.body.data.id) | Out-Null
  }

  $caseResults = New-Object System.Collections.Generic.List[object]

  foreach ($case in @($fixture.cases)) {
    try {
      $messagePayload = [ordered]@{}
      foreach ($property in $case.message.PSObject.Properties) {
        $messagePayload[$property.Name] = $property.Value
      }

      $normalized = Get-AssistantCreateNormalizedMessage -Payload ([pscustomobject]$messagePayload) -SourceKind 'simulated'
      $customerMatch = Get-AssistantCustomerMatch -Message $normalized
      $classification = Get-AssistantClassification -Message $normalized -CustomerMatch $customerMatch
      $draftDecision = Get-AssistantDraftAutoDecision -Classification $classification
      $draftReply = Get-AssistantDraftReply -Message $normalized -CustomerMatch $customerMatch -Classification $classification
      $taskPlan = Get-AssistantTaskPlan -Message $normalized -CustomerMatch $customerMatch -Classification $classification
      $operationPlan = Get-AssistantOperationPlan -Message $normalized -CustomerMatch $customerMatch -Classification $classification

      $expectedCustomerId = [string]$customerIds[[int]$case.customerIndex]
      Assert-Regression -Condition ([string]$customerMatch.customerId -eq $expectedCustomerId) -Message ("El match de cliente no coincide para el caso {0}." -f [string]$case.id)
      Assert-Regression -Condition ([bool]$customerMatch.found) -Message ("No se encontro customer para el caso {0}." -f [string]$case.id)
      Assert-Regression -Condition (-not [string]::IsNullOrWhiteSpace([string]$classification.actorRole)) -Message ("No se pudo inferir rol para el caso {0}." -f [string]$case.id)
      Assert-Regression -Condition ([string]$classification.workflowStage -eq [string]$case.expected.workflowStage) -Message ("Workflow stage inesperado para el caso {0}." -f [string]$case.id)
      Assert-Regression -Condition ([string]$classification.caseType -eq [string]$case.expected.caseType) -Message ("Case type inesperado para el caso {0}." -f [string]$case.id)
      Assert-Regression -Condition ([string]$classification.actorRole -eq [string]$case.expected.actorRole) -Message ("Actor role inesperado para el caso {0}." -f [string]$case.id)
      Assert-Regression -Condition ([bool]$classification.requiresOperation -eq [bool]$case.expected.requiresOperation) -Message ("requiresOperation no coincide para el caso {0}." -f [string]$case.id)
      Assert-Regression -Condition ([string]$operationPlan.action -eq [string]$case.expected.planAction) -Message ("Operation plan inesperado para el caso {0}." -f [string]$case.id)
      Assert-Regression -Condition ([string]$taskPlan.action -eq [string]$case.expected.taskAction) -Message ("Task plan inesperado para el caso {0}." -f [string]$case.id)
      Assert-Regression -Condition ([bool]$draftDecision.eligible -eq [bool]$case.expected.draftEligible) -Message ("Draft eligibility no coincide para el caso {0}." -f [string]$case.id)

      if ($case.expected.psobject.Properties.Name -contains 'draftContains' -and -not [string]::IsNullOrWhiteSpace([string]$case.expected.draftContains)) {
        Assert-Regression -Condition ($draftReply.ToLowerInvariant().Contains(([string]$case.expected.draftContains).ToLowerInvariant())) -Message ("El borrador no contiene la frase esperada para el caso {0}." -f [string]$case.id)
      }

      if ([string]$case.expected.planAction -eq 'create') {
        Assert-Regression -Condition ($operationPlan.action -eq 'create') -Message ("El caso {0} no quedó como create." -f [string]$case.id)
        Assert-Regression -Condition (-not [string]::IsNullOrWhiteSpace([string]$draftReply)) -Message ("El caso {0} no genero borrador." -f [string]$case.id)
      } elseif ([string]$case.expected.planAction -eq 'review') {
        Assert-Regression -Condition ($operationPlan.action -eq 'review') -Message ("El caso {0} no quedó como review." -f [string]$case.id)
        Assert-Regression -Condition (-not [string]::IsNullOrWhiteSpace([string]$draftReply)) -Message ("El caso {0} no genero borrador." -f [string]$case.id)
      } else {
        Assert-Regression -Condition ($operationPlan.action -eq 'skip') -Message ("El caso {0} no debio planear operacion." -f [string]$case.id)
      }

      $caseResults.Add([pscustomobject]@{
        id = [string]$case.id
        customerId = [string]$customerMatch.customerId
        customerLabel = [string]$customerMatch.label
        customerMatchKind = [string]$customerMatch.matchKind
        customerMatchReason = [string]$customerMatch.reason
        customerMatchConfidence = [double]$customerMatch.confidence
        customerMatchEvidence = $customerMatch.evidence
        actorRole = [string]$classification.actorRole
        actorReason = [string]$classification.actorReason
        workflowStage = [string]$classification.workflowStage
        caseType = [string]$classification.caseType
        priority = [string]$classification.priority
        requiresOperation = [bool]$classification.requiresOperation
        requiresTask = [bool]$classification.requiresTask
        draftEligible = [bool]$draftDecision.eligible
        draftReason = [string]$draftDecision.reason
        draftReply = [string]$draftReply
        taskPlanAction = [string]$taskPlan.action
        operationPlanAction = [string]$operationPlan.action
        operationPlanReason = [string]$operationPlan.reason
        operationReference = if ($operationPlan.payload) { [string]$operationPlan.payload.referencia } else { "" }
        operationContainer = if ($operationPlan.payload) { [string]$operationPlan.payload.contenedor } else { "" }
      }) | Out-Null
    } catch {
      throw ("Caso {0}: {1}" -f [string]$case.id, [string]$_.Exception.Message)
    }
  }

  $caseArray = New-Object System.Collections.Generic.List[object]
  foreach ($caseResult in $caseResults) {
    $caseArray.Add($caseResult) | Out-Null
  }
  $operationCreatePlans = 0
  $operationSkipPlans = 0
  $taskCreatePlans = 0
  $draftEligibleCases = 0
  foreach ($caseResult in $caseArray) {
    if ([string]$caseResult.operationPlanAction -eq 'create') { $operationCreatePlans += 1 }
    if ([string]$caseResult.operationPlanAction -eq 'skip') { $operationSkipPlans += 1 }
    if ([string]$caseResult.taskPlanAction -eq 'create') { $taskCreatePlans += 1 }
    if ([bool]$caseResult.draftEligible) { $draftEligibleCases += 1 }
  }
  $summary = [pscustomobject]@{
    status = 'pass'
    scenarioId = [string]$fixture.scenarioId
    caseCount = $caseArray.Count
    counts = [pscustomobject]@{
      operationCreatePlans = $operationCreatePlans
      operationSkipPlans = $operationSkipPlans
      taskCreatePlans = $taskCreatePlans
      draftEligibleCases = $draftEligibleCases
    }
    casesJson = ($caseArray | ConvertTo-Json -Depth 20)
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
    scriptStackTrace = $_.ScriptStackTrace
    positionMessage = $_.InvocationInfo.PositionMessage
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
