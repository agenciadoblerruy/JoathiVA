param(
  [string]$RepoRoot = "",
  [string]$ProfilesPath = "",
  [string]$SecretsPath = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
}

if ([string]::IsNullOrWhiteSpace($ProfilesPath)) {
  $ProfilesPath = Join-Path $RepoRoot 'server\data\tool-profiles.json'
}

if ([string]::IsNullOrWhiteSpace($SecretsPath)) {
  $SecretsPath = Join-Path $RepoRoot 'server\data\tool-secrets.protected.json'
}

function ConvertTo-PlainArray {
  param([object]$Value)

  if ($null -eq $Value) {
    return @()
  }
  if ($Value -is [System.Array]) {
    return @($Value)
  }
  return ,$Value
}

function ConvertTo-Hashtable {
  param([object]$Value)

  $hash = @{}
  if ($null -eq $Value) {
    return $hash
  }
  foreach ($property in $Value.PSObject.Properties) {
    $hash[$property.Name] = $property.Value
  }
  return $hash
}

if (-not (Test-Path -LiteralPath $ProfilesPath)) {
  throw "No se encontro $ProfilesPath"
}

$profilesRaw = Get-Content -LiteralPath $ProfilesPath -Raw -Encoding UTF8
$profiles = ConvertTo-PlainArray ($profilesRaw | ConvertFrom-Json)

$secrets = @{}
if (Test-Path -LiteralPath $SecretsPath) {
  $secretsRaw = Get-Content -LiteralPath $SecretsPath -Raw -Encoding UTF8
  if (-not [string]::IsNullOrWhiteSpace($secretsRaw)) {
    $secrets = ConvertTo-Hashtable ($secretsRaw | ConvertFrom-Json)
  }
}

$migrated = 0
foreach ($profile in $profiles) {
  $id = ([string]$profile.id).Trim()
  if ([string]::IsNullOrWhiteSpace($id)) {
    continue
  }

  $plainPassword = [string]$profile.password
  if ([string]::IsNullOrWhiteSpace($plainPassword)) {
    continue
  }

  $secretRef = ([string]$profile.passwordSecretRef).Trim()
  if ([string]::IsNullOrWhiteSpace($secretRef)) {
    $secretRef = "tool-profile:${id}:password"
  }

  $protectedValue = ConvertFrom-SecureString (ConvertTo-SecureString $plainPassword -AsPlainText -Force)
  $secrets[$secretRef] = [pscustomobject]@{
    protectedValue = $protectedValue
    owner = [string]$profile.owner
    profileId = $id
    field = "password"
    protectedBy = "Windows DPAPI CurrentUser"
    updatedAt = (Get-Date).ToString("o")
  }

  if ($profile.PSObject.Properties.Name -notcontains "passwordSecretRef") {
    $profile | Add-Member -NotePropertyName "passwordSecretRef" -NotePropertyValue $secretRef
  } else {
    $profile.passwordSecretRef = $secretRef
  }
  $profile.password = ""
  $migrated += 1
}

$profilesJson = $profiles | ConvertTo-Json -Depth 20
Set-Content -LiteralPath $ProfilesPath -Value $profilesJson -Encoding UTF8

$secretsDir = Split-Path -Parent $SecretsPath
if (-not (Test-Path -LiteralPath $secretsDir)) {
  New-Item -ItemType Directory -Path $secretsDir -Force | Out-Null
}
$secretsJson = $secrets | ConvertTo-Json -Depth 20
Set-Content -LiteralPath $SecretsPath -Value $secretsJson -Encoding UTF8

Write-Host "Perfiles procesados: $($profiles.Count)"
Write-Host "Secretos migrados: $migrated"
Write-Host "Archivo de perfiles: $ProfilesPath"
Write-Host "Almacen protegido: $SecretsPath"
