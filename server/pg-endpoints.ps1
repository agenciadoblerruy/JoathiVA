# pg-endpoints.ps1 - Endpoints /api/pg/* para JoathiVA

function Handle-PgRequest {
  param([string]$Method, [string]$Path)

  if (-not $Path.StartsWith("/api/pg")) { return $null }

  $p = $Path.TrimEnd("/")

  if ($p -eq "/api/pg/health" -and $Method -eq "GET") {
    $ok = Test-PgConnection
    return @{ ok = $ok; source = "postgresql" }
  }
  if ($p -eq "/api/pg/customers" -and $Method -eq "GET") {
    return @{ ok = $true; data = @(Get-PgCustomers) }
  }
  if ($p -match "^/api/pg/customers/(.+)$" -and $Method -eq "GET") {
    $item = Get-PgCustomer -Id $Matches[1]
    if ($null -eq $item) { return @{ ok = $false; error = "Not found" } }
    return @{ ok = $true; data = $item }
  }
  if ($p -eq "/api/pg/operations" -and $Method -eq "GET") {
    return @{ ok = $true; data = @(Get-PgOperations) }
  }
  if ($p -match "^/api/pg/operations/(.+)$" -and $Method -eq "GET") {
    $item = Get-PgOperation -Id $Matches[1]
    if ($null -eq $item) { return @{ ok = $false; error = "Not found" } }
    return @{ ok = $true; data = $item }
  }
  if ($p -eq "/api/pg/providers" -and $Method -eq "GET") {
    return @{ ok = $true; data = @(Get-PgProviders) }
  }
  if ($p -eq "/api/pg/brokers" -and $Method -eq "GET") {
    return @{ ok = $true; data = @(Get-PgBrokers) }
  }
  if ($p -eq "/api/pg/activity" -and $Method -eq "GET") {
    return @{ ok = $true; data = @(Get-PgActivityLog) }
  }

  return $null
}
