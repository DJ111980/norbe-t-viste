param(
  [string]$OutputRoot = "$env:USERPROFILE\Desktop\norbe-production-backups"
)

$ErrorActionPreference = "Stop"

if ($env:BACKUP_PRODUCTION_R2 -ne "1") {
  Write-Error "Set BACKUP_PRODUCTION_R2=1 to create the production R2 reference backup."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $OutputRoot $timestamp
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$keysFile = Join-Path $backupDir "r2-production-known-keys.json"
$notesFile = Join-Path $backupDir "r2-production-notes.txt"

$query = @"
SELECT imagen_principal AS key, 'producto' AS origen
FROM productos
WHERE imagen_principal IS NOT NULL
UNION ALL
SELECT imagen_variante AS key, 'variante' AS origen
FROM variantes_producto
WHERE imagen_variante IS NOT NULL
UNION ALL
SELECT logo_imagen AS key, 'branding' AS origen
FROM configuracion_negocio
WHERE logo_imagen IS NOT NULL
UNION ALL
SELECT avatar_key AS key, 'usuario' AS origen
FROM usuarios
WHERE avatar_key IS NOT NULL
ORDER BY origen, key;
"@

Write-Host "Listing production R2 keys referenced by D1."
npx wrangler d1 execute norbe-t-viste-production-db `
  --remote `
  --env production `
  --config ./apps/api/wrangler.toml `
  --json `
  --command $query | Out-File -Encoding UTF8 $keysFile

@"
Production R2 bucket: norbe-t-viste-production-assets

This Wrangler version does not provide an object list command.
The JSON file in this folder stores all R2 keys currently referenced by D1.

To download one referenced object manually:
npx wrangler r2 object get norbe-t-viste-production-assets/<key> --remote --file <local-file>

To delete one referenced demo object manually:
npx wrangler r2 object delete norbe-t-viste-production-assets/<key> --remote --force

Never run these commands against staging while cleaning production.
"@ | Out-File -Encoding UTF8 $notesFile

Write-Host "R2 reference backup created: $keysFile"
Write-Host "R2 notes created: $notesFile"
