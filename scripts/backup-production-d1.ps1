param(
  [string]$OutputRoot = "$env:USERPROFILE\Desktop\norbe-production-backups"
)

$ErrorActionPreference = "Stop"

if ($env:BACKUP_PRODUCTION_D1 -ne "1") {
  Write-Error "Set BACKUP_PRODUCTION_D1=1 to export the production D1 database."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $OutputRoot $timestamp
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$outputFile = Join-Path $backupDir "norbe-t-viste-production-db.sql"

Write-Host "Exporting production D1 database only."
Write-Host "Database: norbe-t-viste-production-db"
Write-Host "Output: $outputFile"

npx wrangler d1 export norbe-t-viste-production-db `
  --remote `
  --env production `
  --config ./apps/api/wrangler.toml `
  --output $outputFile `
  --skip-confirmation

Write-Host "D1 production backup created: $outputFile"
