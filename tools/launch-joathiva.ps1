param(
  [int]$Port = 8787,
  [string]$Path = "",
  [string]$Hash = ""
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ServerScript = Join-Path $ProjectRoot "server\joathiva-server.ps1"
$BaseUrl = "http://localhost:$Port/"
$HealthUrl = "$BaseUrl/api/health"
$TargetUrl = $BaseUrl

function Test-JoathiServer {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    return [int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 500
  } catch {
    return $false
  }
}

if (-not (Test-Path $ServerScript -PathType Leaf)) {
  throw "No se encontro el servidor JoathiVA en $ServerScript"
}

if ($Path) {
  $cleanPath = $Path.TrimStart("/")
  if ($cleanPath) {
    $TargetUrl = $BaseUrl + $cleanPath
  }
}

if ($Hash) {
  $cleanHash = $Hash.TrimStart("#")
  if ($cleanHash) {
    $TargetUrl = $TargetUrl.TrimEnd("/") + "/#" + $cleanHash
  }
}

if (-not (Test-JoathiServer -Url $HealthUrl)) {
  Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $ServerScript,
    "-Port",
    [string]$Port
  ) -WindowStyle Minimized

  $deadline = (Get-Date).AddSeconds(15)
  while ((Get-Date) -lt $deadline) {
    if (Test-JoathiServer -Url $HealthUrl) {
      break
    }
    Start-Sleep -Milliseconds 500
  }
}

Start-Process $TargetUrl
