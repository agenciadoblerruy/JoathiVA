param(
  [string]$RepoRoot = "",
  [string]$OutputDir = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $RepoRoot 'tools\lucia_export\data\lucia_public_export'
}

$manifests = Join-Path $OutputDir "manifests"
$rawFtp = Join-Path $OutputDir "raw\ftp_dua_diarios_xml"
$rawCkan = Join-Path $OutputDir "raw\catalogodatos_dna"

New-Item -ItemType Directory -Force -Path $manifests, $rawFtp, $rawCkan | Out-Null

$ftpRoot = @"
source,path,is_dir,size_bytes,source_url,raw_listing
ftp_dua_diarios_xml,2026,true,,ftp://ftp.aduanas.gub.uy/DUA%20Diarios%20XML/2026,2026-05-02 00:00AM <DIR> 2026
"@

$ftpFiles = @"
source,year,filename,size_bytes,status,local_path,source_url,raw_listing
ftp_dua_diarios_xml,2026,DD2026001.xml,0,dry-run,$OutputDir\raw\ftp_dua_diarios_xml\2026\DD2026001.xml,ftp://ftp.aduanas.gub.uy/DUA%20Diarios%20XML/2026/DD2026001.xml,2026-05-02 00:00AM 0 DD2026001.xml
"@

$catalogPackages = @"
source,package_name,title,notes,source_url,raw_json
catalogodatos_dna,package-demo,Paquete demo,Referencia local,https://catalogodatos.gub.uy,{}
"@

$catalogResources = @"
source,resource_name,title,format,source_url,raw_json
catalogodatos_dna,resource-demo,Recurso demo,csv,https://catalogodatos.gub.uy,{}
"@

Set-Content -LiteralPath (Join-Path $manifests "ftp_root_manifest.csv") -Value $ftpRoot -Encoding UTF8
Set-Content -LiteralPath (Join-Path $manifests "ftp_files_manifest.csv") -Value $ftpFiles -Encoding UTF8
Set-Content -LiteralPath (Join-Path $manifests "catalogodatos_packages_manifest.csv") -Value $catalogPackages -Encoding UTF8
Set-Content -LiteralPath (Join-Path $manifests "catalogodatos_resources_manifest.csv") -Value $catalogResources -Encoding UTF8

Write-Host "Demo Lucia export generated at $OutputDir"
