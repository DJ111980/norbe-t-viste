$ErrorActionPreference = "Stop"

if ($env:CLEAN_PRODUCTION_DEMO_DATA -ne "1") {
  Write-Error "Set CLEAN_PRODUCTION_DEMO_DATA=1 to clean production demo data."
}

$database = "norbe-t-viste-production-db"
$bucket = "norbe-t-viste-production-assets"

Write-Host "Production cleanup requested."
Write-Host "Database: $database"
Write-Host "Bucket: $bucket"
Write-Host "This script does not touch staging, local D1 or Cloudflare resources."

Write-Host "Cleanup summary:"
$summaryQueries = [ordered]@{
  categorias_demo = "SELECT COUNT(*) AS total FROM categorias WHERE nombre_categoria LIKE '%Verificacion%' OR descripcion LIKE '%validacion%';"
  proveedores_demo = "SELECT COUNT(*) AS total FROM proveedores WHERE nombre_proveedor LIKE '%Proveedor%' OR nombre_contacto LIKE '%Validacion%' OR correo LIKE 'proveedor.%@norbetviste.local';"
  productos_demo = "SELECT COUNT(*) AS total FROM productos WHERE nombre_producto LIKE '%Producto%' OR descripcion LIKE '%validacion%';"
  variantes_demo = "SELECT COUNT(*) AS total FROM variantes_producto WHERE id_producto IN (SELECT id_producto FROM productos WHERE nombre_producto LIKE '%Producto%' OR descripcion LIKE '%validacion%');"
  lotes_demo = "SELECT COUNT(*) AS total FROM lotes_entrada WHERE numero_factura_proveedor LIKE 'PROD%' OR observaciones LIKE '%validacion%';"
  clientes_demo = "SELECT COUNT(*) AS total FROM clientes WHERE nombre_completo LIKE '%Cliente%' OR documento LIKE 'PROD%';"
  ventas_demo = "SELECT COUNT(*) AS total FROM ventas WHERE observaciones LIKE '%validacion%';"
  creditos_demo = "SELECT COUNT(*) AS total FROM creditos_clientes WHERE id_cliente IN (SELECT id_cliente FROM clientes WHERE nombre_completo LIKE '%Cliente%' OR documento LIKE 'PROD%');"
  devoluciones_demo = "SELECT COUNT(*) AS total FROM devoluciones_ventas WHERE motivo LIKE '%validacion%';"
  usuarios_vendedor_demo = "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'VENDEDOR' AND (nombre_usuario LIKE 'vend%' OR correo LIKE 'vendedor.%@norbetviste.local');"
}

foreach ($item in $summaryQueries.Keys) {
  Write-Host "- $item"
  npx wrangler d1 execute $database --remote --env production --config ./apps/api/wrangler.toml --command $summaryQueries[$item]
}

$imageSql = @"
SELECT imagen_principal AS key
FROM productos
WHERE imagen_principal IS NOT NULL
  AND (nombre_producto LIKE '%Producto%' OR descripcion LIKE '%validacion%')
UNION
SELECT imagen_variante AS key
FROM variantes_producto
WHERE imagen_variante IS NOT NULL
  AND id_producto IN (SELECT id_producto FROM productos WHERE nombre_producto LIKE '%Producto%' OR descripcion LIKE '%validacion%');
"@

$imageJson = npx wrangler d1 execute $database --remote --env production --config ./apps/api/wrangler.toml --json --command $imageSql | Out-String
$imageResult = $imageJson | ConvertFrom-Json
$imageKeys = @()
foreach ($block in $imageResult) {
  foreach ($row in $block.results) {
    if ($row.key) {
      $imageKeys += $row.key
    }
  }
}

if ($imageKeys.Count -eq 0) {
  $matches = [regex]::Matches($imageJson, '"key"\s*:\s*"([^"]+)"')
  foreach ($match in $matches) {
    $imageKeys += $match.Groups[1].Value
  }
}

Write-Host "R2 demo objects referenced by D1: $($imageKeys.Count)"
foreach ($key in $imageKeys) {
  Write-Host " - $key"
}

Write-Host "Administrators that should remain:"
npx wrangler d1 execute $database --remote --env production --config ./apps/api/wrangler.toml --command "SELECT nombre_usuario, correo, rol, estado FROM usuarios WHERE rol = 'ADMINISTRADOR' ORDER BY nombre_usuario;"

$cleanupSql = @"
PRAGMA foreign_keys = OFF;

DELETE FROM detalle_devoluciones_ventas
WHERE id_devolucion IN (
  SELECT id_devolucion FROM devoluciones_ventas WHERE motivo LIKE '%validacion%'
);

DELETE FROM devoluciones_ventas
WHERE motivo LIKE '%validacion%';

DELETE FROM abonos_creditos
WHERE id_credito IN (
  SELECT id_credito FROM creditos_clientes
  WHERE id_cliente IN (SELECT id_cliente FROM clientes WHERE nombre_completo LIKE '%Cliente%' OR documento LIKE 'PROD%')
);

DELETE FROM ajustes_creditos
WHERE id_credito IN (
  SELECT id_credito FROM creditos_clientes
  WHERE id_cliente IN (SELECT id_cliente FROM clientes WHERE nombre_completo LIKE '%Cliente%' OR documento LIKE 'PROD%')
);

DELETE FROM detalle_creditos
WHERE id_credito IN (
  SELECT id_credito FROM creditos_clientes
  WHERE id_cliente IN (SELECT id_cliente FROM clientes WHERE nombre_completo LIKE '%Cliente%' OR documento LIKE 'PROD%')
);

DELETE FROM creditos_clientes
WHERE id_cliente IN (SELECT id_cliente FROM clientes WHERE nombre_completo LIKE '%Cliente%' OR documento LIKE 'PROD%');

DELETE FROM pagos_ventas
WHERE id_venta IN (SELECT id_venta FROM ventas WHERE observaciones LIKE '%validacion%');

DELETE FROM detalle_ventas
WHERE id_venta IN (SELECT id_venta FROM ventas WHERE observaciones LIKE '%validacion%');

DELETE FROM ventas
WHERE observaciones LIKE '%validacion%';

DELETE FROM movimientos_inventario
WHERE id_variante IN (
  SELECT id_variante FROM variantes_producto
  WHERE id_producto IN (SELECT id_producto FROM productos WHERE nombre_producto LIKE '%Producto%' OR descripcion LIKE '%validacion%')
)
OR (
  referencia_tipo = 'LOTE_ENTRADA'
  AND referencia_id IN (
    SELECT id_lote FROM lotes_entrada WHERE numero_factura_proveedor LIKE 'PROD%' OR observaciones LIKE '%validacion%'
  )
);

DELETE FROM detalle_lotes_entrada
WHERE id_lote IN (
  SELECT id_lote FROM lotes_entrada WHERE numero_factura_proveedor LIKE 'PROD%' OR observaciones LIKE '%validacion%'
);

DELETE FROM lotes_entrada
WHERE numero_factura_proveedor LIKE 'PROD%' OR observaciones LIKE '%validacion%';

DELETE FROM variantes_producto
WHERE id_producto IN (SELECT id_producto FROM productos WHERE nombre_producto LIKE '%Producto%' OR descripcion LIKE '%validacion%');

DELETE FROM imagenes_productos
WHERE id_producto IN (SELECT id_producto FROM productos WHERE nombre_producto LIKE '%Producto%' OR descripcion LIKE '%validacion%');

DELETE FROM productos
WHERE nombre_producto LIKE '%Producto%' OR descripcion LIKE '%validacion%';

DELETE FROM categorias
WHERE nombre_categoria LIKE '%Verificacion%' OR descripcion LIKE '%validacion%';

DELETE FROM proveedores
WHERE nombre_proveedor LIKE '%Proveedor%' OR nombre_contacto LIKE '%Validacion%' OR correo LIKE 'proveedor.%@norbetviste.local';

DELETE FROM clientes
WHERE nombre_completo LIKE '%Cliente%' OR documento LIKE 'PROD%';

DELETE FROM usuarios
WHERE rol = 'VENDEDOR' AND (nombre_usuario LIKE 'vend%' OR correo LIKE 'vendedor.%@norbetviste.local');

PRAGMA foreign_keys = ON;
"@

$tempSql = Join-Path $env:TEMP "norbe-clean-production-demo-data.sql"
$cleanupSql | Out-File -Encoding UTF8 $tempSql

Write-Host "Deleting demo rows from production D1."
npx wrangler d1 execute $database --remote --env production --config ./apps/api/wrangler.toml --file $tempSql
Remove-Item -LiteralPath $tempSql -Force

foreach ($key in $imageKeys) {
  Write-Host "Deleting R2 demo object: $key"
  npx wrangler r2 object delete "$bucket/$key" --remote --force
}

Write-Host "Production demo data cleanup completed."
