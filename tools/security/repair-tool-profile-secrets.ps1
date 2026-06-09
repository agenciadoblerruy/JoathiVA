param(
  [string]$RepoRoot = "",
  [string]$ProfilesPath = "",
  [string]$RecoveryProfilesPath = "",
  [string]$SecretsPath = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
}

if ([string]::IsNullOrWhiteSpace($ProfilesPath)) {
  $ProfilesPath = Join-Path $RepoRoot 'server\data\tool-profiles.json'
}

if ([string]::IsNullOrWhiteSpace($RecoveryProfilesPath)) {
  $RecoveryProfilesPath = Join-Path $RepoRoot 'version-23\server\data\tool-profiles.json'
}

if ([string]::IsNullOrWhiteSpace($SecretsPath)) {
  $SecretsPath = Join-Path $RepoRoot 'server\data\tool-secrets.protected.json'
}

function Read-ProfileArray {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return @()
  }

  $doc = Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($doc -is [System.Array]) {
    return @($doc)
  }
  if ($doc.PSObject.Properties.Name -contains "value") {
    return @($doc.value)
  }
  if ($doc) {
    return ,$doc
  }
  return @()
}

$profiles = @(Read-ProfileArray -Path $ProfilesPath)
$recoveryProfiles = @(Read-ProfileArray -Path $RecoveryProfilesPath)
$recoveryById = @{}

foreach ($profile in $recoveryProfiles) {
  $id = ([string]$profile.id).Trim()
  if (-not [string]::IsNullOrWhiteSpace($id)) {
    $recoveryById[$id] = $profile
  }
}

$secrets = @{}
$protectedCount = 0

foreach ($profile in $profiles) {
  $id = ([string]$profile.id).Trim()
  if ([string]::IsNullOrWhiteSpace($id)) {
    continue
  }

  $secretRef = "tool-profile:${id}:password"
  $profile | Add-Member -NotePropertyName "passwordSecretRef" -NotePropertyValue $secretRef -Force
  $profile | Add-Member -NotePropertyName "password" -NotePropertyValue "" -Force

  if (-not $recoveryById.ContainsKey($id)) {
    continue
  }

  $plainPassword = [string]$recoveryById[$id].password
  if ([string]::IsNullOrWhiteSpace($plainPassword)) {
    continue
  }

  $secrets[$secretRef] = [pscustomobject]@{
    protectedValue = ConvertFrom-SecureString (ConvertTo-SecureString $plainPassword -AsPlainText -Force)
    owner = [string]$profile.owner
    profileId = $id
    field = "password"
    protectedBy = "Windows DPAPI CurrentUser"
    updatedAt = (Get-Date).ToString("o")
  }
  $protectedCount += 1
}

Set-Content -LiteralPath $ProfilesPath -Value (ConvertTo-Json -InputObject $profiles -Depth 20) -Encoding UTF8
Set-Content -LiteralPath $SecretsPath -Value (ConvertTo-Json -InputObject $secrets -Depth 20) -Encoding UTF8

Write-Host "Perfiles normalizados: $($profiles.Count)"
Write-Host "Secretos protegidos: $protectedCount"
