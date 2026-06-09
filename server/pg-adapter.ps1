# pg-adapter.ps1 - Adaptador PostgreSQL para JoathiVA
# Ejecuta consultas via psql y devuelve objetos PowerShell

$script:PgHost     = "127.0.0.1"
$script:PgPort     = "5432"
$script:PgDb       = "joathi_db"
$script:PgUser     = "joathi"
$script:PgPassword = "joathi2026"

function Invoke-PgQuery {
  param([string]$Sql)
  $env:PGPASSWORD = $script:PgPassword
  $result = & psql -h $script:PgHost -p $script:PgPort -U $script:PgUser -d $script:PgDb -t -A -F "`t" -c $Sql 2>&1
  $env:PGPASSWORD = ""
  return $result
}

function Invoke-PgJson {
  param([string]$Sql)
  $env:PGPASSWORD = $script:PgPassword
  $wrapped = "SELECT json_agg(q) FROM ($Sql) q"
  $result = & psql -h $script:PgHost -p $script:PgPort -U $script:PgUser -d $script:PgDb -t -A -c $wrapped 2>&1
  $env:PGPASSWORD = ""
  if ([string]::IsNullOrWhiteSpace($result) -or $result -eq "" -or $result -eq $null) {
    return @()
  }
  try {
    $parsed = $result | ConvertFrom-Json
    if ($null -eq $parsed) { return @() }
    return $parsed
  } catch {
    return @()
  }
}

function Get-PgCustomers {
  return Invoke-PgJson "SELECT id, name, email, phone, city, country, status, notes, created_at, updated_at FROM customers ORDER BY name"
}

function Get-PgCustomer {
  param([string]$Id)
  $safe = $Id -replace "'","''"
  $rows = Invoke-PgJson "SELECT id, name, email, phone, city, country, status, notes, raw_data, created_at, updated_at FROM customers WHERE id = '$safe' LIMIT 1"
  return $rows | Select-Object -First 1
}

function Get-PgOperations {
  return Invoke-PgJson "SELECT o.id, o.status, o.operation_type, o.reference, o.container, o.dua, o.origin, o.destination, o.arrival_date, o.risk, o.notes, c.name as customer_name, p.name as provider_name, b.name as broker_name, o.created_at, o.updated_at FROM operations o LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN providers p ON p.id = o.provider_id LEFT JOIN brokers b ON b.id = o.broker_id ORDER BY o.created_at DESC"
}

function Get-PgOperation {
  param([string]$Id)
  $safe = $Id -replace "'","''"
  $rows = Invoke-PgJson "SELECT o.*, c.name as customer_name, p.name as provider_name, b.name as broker_name FROM operations o LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN providers p ON p.id = o.provider_id LEFT JOIN brokers b ON b.id = o.broker_id WHERE o.id = '$safe' LIMIT 1"
  return $rows | Select-Object -First 1
}

function Get-PgProviders {
  return Invoke-PgJson "SELECT id, name, email, phone, status, notes, created_at FROM providers ORDER BY name"
}

function Get-PgBrokers {
  return Invoke-PgJson "SELECT id, name, email, phone, company, country, role, status, created_at FROM brokers ORDER BY name"
}

function Get-PgActivityLog {
  param([string]$OperationId = "", [string]$CustomerId = "")
  if ($OperationId) {
    $safe = $OperationId -replace "'","''"
    return Invoke-PgJson "SELECT id, entity_type, entity_id, action, label, tone, details, source, created_at FROM activity_log WHERE operation_id = '$safe' ORDER BY created_at DESC"
  }
  if ($CustomerId) {
    $safe = $CustomerId -replace "'","''"
    return Invoke-PgJson "SELECT id, entity_type, entity_id, action, label, tone, details, source, created_at FROM activity_log WHERE customer_id = '$safe' ORDER BY created_at DESC"
  }
  return Invoke-PgJson "SELECT id, entity_type, entity_id, action, label, tone, details, source, created_at FROM activity_log ORDER BY created_at DESC LIMIT 100"
}

function Test-PgConnection {
  try {
    $result = Invoke-PgQuery "SELECT 1"
    return $result -contains "1"
  } catch {
    return $false
  }
}
