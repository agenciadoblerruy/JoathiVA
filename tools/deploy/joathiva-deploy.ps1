param(
  [ValidateSet("Deploy", "Rollback", "Status")]
  [string]$Action = "Deploy",

  [string]$SnapshotId = "",

  [ValidateRange(1, 50)]
  [int]$KeepSnapshots = 10
)

$ErrorActionPreference = "Stop"

$ScriptRoot = Split-Path -Parent $PSScriptRoot
$ProjectRoot = Split-Path -Parent $ScriptRoot
$BundleRoot = Join-Path $ProjectRoot "dist\windows"
$SnapshotRoot = Join-Path $ProjectRoot "dist\deploy-snapshots"
$LauncherRoot = Join-Path $ProjectRoot "tools\windows-launchers"
$ReleaseManifestPath = Join-Path $BundleRoot "deploy-manifest.json"
$LatestSnapshotPath = Join-Path $SnapshotRoot "latest.txt"

$TrackedPaths = @(
  "VERSION-ACTUAL.txt",
  "server\joathiva-server.ps1",
  "server\api-v1-backend.ps1",
  "server\assistant\assistant-backend.ps1",
  "tools\launch-joathiva.ps1",
  "tools\windows-launchers\package.json",
  "tools\windows-launchers\joathiva-launcher.js",
  "tools\windows-launchers\build-windows-exes.js",
  "dist\windows"
)

function Join-ProjectPath {
  param([Parameter(Mandatory = $true)][string]$RelativePath)

  return Join-Path $ProjectRoot ($RelativePath -replace "/", "\")
}

function Ensure-ParentDirectory {
  param([Parameter(Mandatory = $true)][string]$Path)

  $parent = Split-Path -Parent $Path
  if ($parent -and -not (Test-Path -LiteralPath $parent -PathType Container)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
}

function Get-VersionLabel {
  $versionFile = Join-ProjectPath "VERSION-ACTUAL.txt"
  if (-not (Test-Path -LiteralPath $versionFile -PathType Leaf)) {
    return "unknown"
  }

  $value = (Get-Content -LiteralPath $versionFile -Raw -Encoding UTF8).Trim()
  if ([string]::IsNullOrWhiteSpace($value)) {
    return "unknown"
  }

  return $value
}

function New-SnapshotId {
  $version = Get-VersionLabel
  $safeVersion = ($version -replace "[^a-zA-Z0-9._-]", "_")
  return "$(Get-Date -Format 'yyyyMMdd-HHmmss')-$safeVersion"
}

function Get-PathHashRecord {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$RelativePath,
    [Parameter(Mandatory = $true)][string]$Kind
  )

  $record = [ordered]@{
    path = $RelativePath -replace "\\", "/"
    kind = $Kind
    present = $false
    size = 0
    sha256 = ""
  }

  if ($Kind -eq "directory") {
    if (Test-Path -LiteralPath $Path -PathType Container) {
      $record.present = $true
      $fileCount = @(Get-ChildItem -LiteralPath $Path -File -Recurse -Force -ErrorAction SilentlyContinue).Count
      $record.size = $fileCount
    }
    return [pscustomobject]$record
  }

  if (Test-Path -LiteralPath $Path -PathType Leaf) {
    $file = Get-Item -LiteralPath $Path
    $record.present = $true
    $record.size = [int64]$file.Length
    $record.sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
  }

  return [pscustomobject]$record
}

function Get-SnapshotPath {
  param([Parameter(Mandatory = $true)][string]$SnapshotId)

  return Join-Path $SnapshotRoot $SnapshotId
}

function Get-LatestSnapshotId {
  if (Test-Path -LiteralPath $LatestSnapshotPath -PathType Leaf) {
    $candidate = (Get-Content -LiteralPath $LatestSnapshotPath -Raw -Encoding UTF8).Trim()
    if ($candidate) {
      return $candidate
    }
  }

  if (-not (Test-Path -LiteralPath $SnapshotRoot -PathType Container)) {
    return ""
  }

  $latest = Get-ChildItem -LiteralPath $SnapshotRoot -Directory -Force -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($latest) {
    return $latest.Name
  }

  return ""
}

function Get-DeploymentSnapshots {
  if (-not (Test-Path -LiteralPath $SnapshotRoot -PathType Container)) {
    return @()
  }

  return @(Get-ChildItem -LiteralPath $SnapshotRoot -Directory -Force -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending)
}

function Prune-DeploymentSnapshots {
  param(
    [Parameter(Mandatory = $true)][int]$KeepSnapshots,
    [string]$PreserveSnapshotId = ""
  )

  $snapshots = Get-DeploymentSnapshots
  if (-not $snapshots.Count) {
    return [pscustomobject]@{
      kept = @()
      removed = @()
    }
  }

  $kept = @()
  $removed = @()
  $index = 0

  foreach ($snapshot in $snapshots) {
    $index += 1
    $shouldKeep = $index -le $KeepSnapshots -or ([string]$snapshot.Name -eq $PreserveSnapshotId)
    if ($shouldKeep) {
      $kept += $snapshot.Name
      continue
    }

    Remove-Item -LiteralPath $snapshot.FullName -Recurse -Force
    $removed += $snapshot.Name
  }

  return [pscustomobject]@{
    kept = $kept
    removed = $removed
  }
}

function Copy-TrackedItemToSnapshot {
  param(
    [Parameter(Mandatory = $true)][string]$RelativePath,
    [Parameter(Mandatory = $true)][string]$SnapshotPath
  )

  $sourcePath = Join-ProjectPath $RelativePath
  $snapshotItemPath = Join-Path $SnapshotPath ($RelativePath -replace "/", "\")

  if (Test-Path -LiteralPath $sourcePath -PathType Container) {
    Ensure-ParentDirectory -Path $snapshotItemPath
    if (Test-Path -LiteralPath $snapshotItemPath -PathType Container) {
      Remove-Item -LiteralPath $snapshotItemPath -Recurse -Force
    }
    Copy-Item -LiteralPath $sourcePath -Destination $snapshotItemPath -Recurse -Force
    return "directory"
  }

  if (Test-Path -LiteralPath $sourcePath -PathType Leaf) {
    Ensure-ParentDirectory -Path $snapshotItemPath
    Copy-Item -LiteralPath $sourcePath -Destination $snapshotItemPath -Force
    return "file"
  }

  return "missing"
}

function New-DeploymentSnapshot {
  $snapshotId = New-SnapshotId
  $snapshotPath = Get-SnapshotPath -SnapshotId $snapshotId

  if (-not (Test-Path -LiteralPath $SnapshotRoot -PathType Container)) {
    New-Item -ItemType Directory -Path $SnapshotRoot -Force | Out-Null
  }

  if (Test-Path -LiteralPath $snapshotPath -PathType Container) {
    Remove-Item -LiteralPath $snapshotPath -Recurse -Force
  }

  New-Item -ItemType Directory -Path $snapshotPath -Force | Out-Null

  $items = @()
  foreach ($relativePath in $TrackedPaths) {
    $sourcePath = Join-ProjectPath $relativePath
    $kind = if (Test-Path -LiteralPath $sourcePath -PathType Container) { "directory" } else { "file" }
    $copyState = Copy-TrackedItemToSnapshot -RelativePath $relativePath -SnapshotPath $snapshotPath
    $items += Get-PathHashRecord -Path $sourcePath -RelativePath $relativePath -Kind $kind
    if ($copyState -eq "missing") {
      Write-Host "[deploy] Aviso: no existe $relativePath y no se incluyo en el snapshot."
    }
  }

  $snapshotManifest = [ordered]@{
    version = Get-VersionLabel
    snapshotId = $snapshotId
    createdAt = (Get-Date).ToString("o")
    projectRoot = $ProjectRoot
    trackedItems = $items
  }

  $snapshotManifestPath = Join-Path $snapshotPath "snapshot-manifest.json"
  $snapshotManifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $snapshotManifestPath -Encoding UTF8
  Set-Content -LiteralPath $LatestSnapshotPath -Value $snapshotId -Encoding UTF8

  return [pscustomobject]@{
    snapshotId = $snapshotId
    snapshotPath = $snapshotPath
    manifestPath = $snapshotManifestPath
    version = Get-VersionLabel
  }
}

function Restore-DeploymentSnapshot {
  param(
    [string]$RequestedSnapshotId = ""
  )

  $snapshotId = $RequestedSnapshotId
  if ([string]::IsNullOrWhiteSpace($snapshotId)) {
    $snapshotId = Get-LatestSnapshotId
  }

  if ([string]::IsNullOrWhiteSpace($snapshotId)) {
    throw "No hay snapshot disponible para restaurar."
  }

  $snapshotPath = Get-SnapshotPath -SnapshotId $snapshotId
  if (-not (Test-Path -LiteralPath $snapshotPath -PathType Container)) {
    throw "No existe el snapshot $snapshotId."
  }

  $manifestPath = Join-Path $snapshotPath "snapshot-manifest.json"
  $manifest = $null
  if (Test-Path -LiteralPath $manifestPath -PathType Leaf) {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
  }

  $items = if ($manifest -and $manifest.trackedItems) { @($manifest.trackedItems) } else { @() }
  if (-not $items.Count) {
    foreach ($relativePath in $TrackedPaths) {
      $sourcePath = Join-Path $snapshotPath ($relativePath -replace "/", "\")
      $kind = if (Test-Path -LiteralPath $sourcePath -PathType Container) { "directory" } else { "file" }
      $items += [pscustomobject]@{
        path = $relativePath -replace "\\", "/"
        kind = $kind
      }
    }
  }

  foreach ($item in $items) {
    $relativePath = [string]$item.path
    $kind = [string]$item.kind
    $sourcePath = Join-Path $snapshotPath ($relativePath -replace "/", "\")
    $targetPath = Join-ProjectPath $relativePath

    if ($kind -eq "directory") {
      if (Test-Path -LiteralPath $targetPath -PathType Container) {
        Remove-Item -LiteralPath $targetPath -Recurse -Force
      }
      if (Test-Path -LiteralPath $sourcePath -PathType Container) {
        Ensure-ParentDirectory -Path $targetPath
        Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Recurse -Force
      }
      continue
    }

    if (Test-Path -LiteralPath $targetPath -PathType Leaf) {
      Remove-Item -LiteralPath $targetPath -Force
    }
    if (Test-Path -LiteralPath $sourcePath -PathType Leaf) {
      Ensure-ParentDirectory -Path $targetPath
      Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
    }
  }

  return [pscustomobject]@{
    snapshotId = $snapshotId
    snapshotPath = $snapshotPath
    manifestPath = $manifestPath
  }
}

function Write-ReleaseManifest {
  param(
    [Parameter(Mandatory = $true)][string]$SnapshotId
  )

  $bundleFiles = @()
  if (Test-Path -LiteralPath $BundleRoot -PathType Container) {
    $bundleFiles = Get-ChildItem -LiteralPath $BundleRoot -File -Recurse -Force | Sort-Object FullName | ForEach-Object {
      $relativePath = $_.FullName.Substring($BundleRoot.Length).TrimStart('\', '/')
      [pscustomobject]@{
        path = $relativePath -replace "\\", "/"
        size = [int64]$_.Length
        sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
      }
    }
  }

  $manifest = [ordered]@{
    version = Get-VersionLabel
    builtAt = (Get-Date).ToString("o")
    snapshotId = $SnapshotId
    nodeVersion = ""
    bundleRoot = "dist/windows"
    files = @($bundleFiles)
  }

  try {
    $manifest.nodeVersion = ((& node --version) | Select-Object -First 1).Trim()
  } catch {
    $manifest.nodeVersion = ""
  }

  Ensure-ParentDirectory -Path $ReleaseManifestPath
  $manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $ReleaseManifestPath -Encoding UTF8
}

function Invoke-Deploy {
  $snapshot = $null
  $pushed = $false

  try {
    $snapshot = New-DeploymentSnapshot
    Push-Location $LauncherRoot
    $pushed = $true

    & node build-windows-exes.js
    if ($LASTEXITCODE -ne 0) {
      throw "El bundle de Windows fallo con codigo $LASTEXITCODE."
    }

    Write-ReleaseManifest -SnapshotId $snapshot.snapshotId
    $retention = Prune-DeploymentSnapshots -KeepSnapshots $KeepSnapshots -PreserveSnapshotId $snapshot.snapshotId
    Write-Host "[deploy] Bundle generado con exito."
    Write-Host "[deploy] Snapshot previo: $($snapshot.snapshotId)"
    Write-Host "[deploy] Manifest: $ReleaseManifestPath"
    if ($retention.removed.Count) {
      Write-Host "[deploy] Snapshots eliminados: $($retention.removed -join ', ')"
    }
  } catch {
    if ($snapshot) {
      Write-Warning "[deploy] Fallo la publicacion. Se restaura el snapshot $($snapshot.snapshotId)."
      Restore-DeploymentSnapshot -RequestedSnapshotId $snapshot.snapshotId | Out-Null
    } else {
      Write-Warning "[deploy] Fallo la publicacion antes de crear el snapshot."
    }
    throw
  } finally {
    if ($pushed) {
      Pop-Location
    }
  }
}

function Show-Status {
  $latestSnapshotId = Get-LatestSnapshotId
  $status = [ordered]@{
    version = Get-VersionLabel
    releaseManifest = (Test-Path -LiteralPath $ReleaseManifestPath -PathType Leaf)
    latestSnapshotId = $latestSnapshotId
    latestSnapshotPath = if ($latestSnapshotId) { Get-SnapshotPath -SnapshotId $latestSnapshotId } else { "" }
    keepSnapshots = $KeepSnapshots
    snapshotCount = @(Get-DeploymentSnapshots).Count
  }

  $status | ConvertTo-Json -Depth 8
}

switch ($Action) {
  "Deploy" { Invoke-Deploy }
  "Rollback" { Restore-DeploymentSnapshot -RequestedSnapshotId $SnapshotId | ConvertTo-Json -Depth 8 }
  "Status" { Show-Status }
}
