# Backup y restauracion

## Backup D1

Usar:

```powershell
$env:BACKUP_PRODUCTION_D1="1"
.\scripts\backup-production-d1.ps1
```

El archivo SQL debe guardarse fuera del repo.

## Backup R2

Usar:

```powershell
$env:BACKUP_PRODUCTION_R2="1"
.\scripts\backup-production-r2.ps1
```

La version actual de Wrangler no lista todos los objetos R2 con `object list`; el script guarda
las keys referenciadas por D1 y notas para descargar objetos puntuales.

## Restauracion

Seguir `scripts/restore-production-notes.md`. Restaurar primero en un entorno controlado cuando
sea posible.

## No commitear

- Backups SQL.
- Objetos R2 descargados.
- Archivos DPAPI.
- Archivos `.env`.
- Secrets.
