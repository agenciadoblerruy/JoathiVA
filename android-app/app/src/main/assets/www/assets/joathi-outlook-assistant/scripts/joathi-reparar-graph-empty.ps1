param(
  [string]$Root = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$Ps1 = Join-Path $Root 'scripts\03_run_mail_assistant.ps1'
$Js  = Join-Path $Root 'src\joathi-mail-assistant.js'

if (-not (Test-Path $Ps1)) { throw "No encuentro $Ps1. Ejecuta este parche desde la raiz de joathi-outlook-assistant o usa -Root." }
if (-not (Test-Path $Js)) { throw "No encuentro $Js. Ejecuta este parche desde la raiz de joathi-outlook-assistant o usa -Root." }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $Ps1 "$Ps1.bak-$stamp" -Force
Copy-Item $Js "$Js.bak-$stamp" -Force
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$newGraphFunction = @'
function Write-JsonNoBom {
  param([string]$Path, $Value)
  if ($Value -is [string]) {
    $json = $Value
  } else {
    $json = $Value | ConvertTo-Json -Depth 20
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $json, $utf8NoBom)
}

function Get-GraphValueCount {
  param($Response)
  try {
    if ($Response -is [string]) {
      $obj = $Response | ConvertFrom-Json
    } else {
      $obj = $Response
    }
    if ($null -eq $obj.value) { return 0 }
    return @($obj.value).Count
  } catch {
    return -1
  }
}

function Get-GraphMessages {
  param([string]$MailFolder, [int]$Top, [string]$OutputFile)
  Ensure-GraphModule
  Import-Module Microsoft.Graph.Authentication -ErrorAction Stop

  $scopes = @('Mail.ReadWrite', 'MailboxSettings.ReadWrite')
  Connect-MgGraph -Scopes $scopes -NoWelcome | Out-Null

  $select = 'id,subject,from,receivedDateTime,bodyPreview,hasAttachments,internetMessageId,categories,parentFolderId'
  $folderCandidates = New-Object System.Collections.Generic.List[string]
  if ($MailFolder) { $folderCandidates.Add($MailFolder) | Out-Null }
  if ($MailFolder -eq 'Inbox') { $folderCandidates.Add('inbox') | Out-Null }
  if ($MailFolder -eq 'Bandeja de entrada') { $folderCandidates.Add('inbox') | Out-Null }

  foreach ($candidate in ($folderCandidates | Select-Object -Unique)) {
    try {
      $encodedFolder = [uri]::EscapeDataString($candidate)
      $uri = "https://graph.microsoft.com/v1.0/me/mailFolders/$encodedFolder/messages?`$top=$Top&`$orderby=receivedDateTime desc&`$select=$select"
      Write-Host "Graph GET: $uri"
      $response = Invoke-MgGraphRequest -Method GET -Uri $uri
      $count = Get-GraphValueCount -Response $response
      Write-Host "Graph mensajes en '$candidate': $count"
      if ($count -gt 0) {
        Write-JsonNoBom -Path $OutputFile -Value $response
        return $OutputFile
      }
    } catch {
      Write-Warning "No pude leer la carpeta '$candidate': $($_.Exception.Message)"
    }
  }

  # Fallback: lista mensajes recientes de todo el buzon. Sirve cuando el id/nombre de carpeta no coincide.
  $uri = "https://graph.microsoft.com/v1.0/me/messages?`$top=$Top&`$orderby=receivedDateTime desc&`$select=$select"
  Write-Host "Graph fallback GET: $uri"
  $response = Invoke-MgGraphRequest -Method GET -Uri $uri
  $count = Get-GraphValueCount -Response $response
  Write-Host "Graph mensajes fallback /me/messages: $count"
  Write-JsonNoBom -Path $OutputFile -Value $response
  return $OutputFile
}

function Ensure-OutlookCategories {
'@

$psText = [System.IO.File]::ReadAllText($Ps1)
$psText2 = [regex]::Replace($psText, '(?s)function Get-GraphMessages \{.*?\r?\n\}\r?\n\r?\nfunction Ensure-OutlookCategories \{', $newGraphFunction, 1)
if ($psText2 -eq $psText) { throw 'No pude reemplazar Get-GraphMessages en el PS1. El archivo tiene una forma inesperada.' }
[System.IO.File]::WriteAllText($Ps1, $psText2, $Utf8NoBom)

$newJsReader = @'
function parseMaybeJsonString(value) {
  if (typeof value !== 'string') return value;
  const clean = stripBom(value).trim();
  if (!clean) return value;
  if (clean.startsWith('{') || clean.startsWith('[')) {
    try { return JSON.parse(clean); } catch (_) { return value; }
  }
  return value;
}

function graphPayloadToMessages(payload) {
  let current = parseMaybeJsonString(payload);

  // Invoke-MgGraphRequest can be serialized as an object, a string containing JSON,
  // or occasionally inside a response/body/content wrapper depending on module version.
  for (let i = 0; i < 4; i += 1) {
    current = parseMaybeJsonString(current);
    if (Array.isArray(current)) return current;
    if (!current || typeof current !== 'object') return [];
    if (Array.isArray(current.value)) return current.value;
    if (current.body) { current = current.body; continue; }
    if (current.content) { current = current.content; continue; }
    if (current.ResponseBody) { current = current.ResponseBody; continue; }
    if (current.responseBody) { current = current.responseBody; continue; }
    break;
  }
  return [];
}

function readRecordsFromGraphJson(inputFile, limit) {
  const payload = loadJson(inputFile);
  const arr = graphPayloadToMessages(payload);
  if (arr.length === 0) {
    console.warn(`[Joathi Outlook Assistant] Graph JSON sin mensajes procesables. Archivo: ${inputFile}`);
  }
  return arr.slice(0, limit).map(graphMessageToRecord);
}

function normalizeLooseRecord(item, filePath) {
'@

$jsText = [System.IO.File]::ReadAllText($Js)
$jsText2 = [regex]::Replace($jsText, '(?s)function readRecordsFromGraphJson\(inputFile, limit\) \{.*?\r?\n\}\r?\n\r?\nfunction normalizeLooseRecord\(item, filePath\) \{', $newJsReader, 1)
if ($jsText2 -eq $jsText) { throw 'No pude reemplazar readRecordsFromGraphJson en el JS. El archivo tiene una forma inesperada.' }
[System.IO.File]::WriteAllText($Js, $jsText2, $Utf8NoBom)

Remove-Item (Join-Path $Root 'output\graph_messages.json') -Force -ErrorAction SilentlyContinue
Write-Host '[OK] Parche Graph empty/fallback aplicado.'
Write-Host "Backups: $Ps1.bak-$stamp y $Js.bak-$stamp"
