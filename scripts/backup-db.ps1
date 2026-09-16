<#
.SYNOPSIS
  Back up the PostgreSQL database with pg_dump and keep the latest N backups.

.EXAMPLE
  .\scripts\backup-db.ps1
  .\scripts\backup-db.ps1 -BackupDir D:\backups\threevo -Keep 30

.NOTES
  DATABASE_URL is read from the environment, or from the .env file when not set.
  Restore: pg_restore --clean --if-exists --no-owner --dbname "<url>" <file>.dump
#>
param(
  [string]$BackupDir = ".\backups",
  [int]$Keep = 14,
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = 'Stop'

$url = $env:DATABASE_URL
if (-not $url -and (Test-Path $EnvFile)) {
  $line = Get-Content $EnvFile | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
  if ($line) { $url = ($line -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"', "'") }
}
if (-not $url) { throw 'DATABASE_URL not found (environment variable or .env file).' }

# pg_dump does not understand Prisma's "?schema=public" parameter.
$url = $url.Split('?')[0]

$pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
if (-not $pgDump) {
  $candidate = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1
  if ($candidate) { $pgDump = $candidate.FullName }
}
if (-not $pgDump) { throw 'pg_dump not found. Install PostgreSQL client tools or add them to PATH.' }

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$file = Join-Path $BackupDir ("threevo_{0}.dump" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

& $pgDump --dbname=$url --format=custom --no-owner --file=$file
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
Write-Host "Backup created: $file"

$old = Get-ChildItem -Path $BackupDir -Filter 'threevo_*.dump' |
  Sort-Object LastWriteTime -Descending | Select-Object -Skip $Keep
foreach ($item in $old) {
  Remove-Item $item.FullName -Force
  Write-Host "Removed old backup: $($item.Name)"
}
