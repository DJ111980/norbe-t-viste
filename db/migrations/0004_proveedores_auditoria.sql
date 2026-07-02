-- Auditoria de proveedores:
-- Estos campos permiten saber que usuario creo o actualizo por ultima vez cada proveedor.
-- En D1/SQLite se pueden agregar columnas con REFERENCES mientras permitan NULL;
-- por eso se dejan opcionales y con ON DELETE SET NULL para conservar el proveedor
-- aunque el usuario auditor ya no exista.
ALTER TABLE proveedores
ADD COLUMN creado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE proveedores
ADD COLUMN actualizado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

-- Preparado para el modulo de lotes:
-- fecha_ultimo_lote se actualizara cuando se registren lotes_entrada asociados
-- al proveedor. Todavia no se implementa logica de productos, lotes ni inventario
-- porque esta migracion solo prepara la base de datos.
ALTER TABLE proveedores
ADD COLUMN fecha_ultimo_lote TEXT;

-- Control de duplicados por nombre:
-- nombre_normalizado se usara desde el backend con la regla:
-- trim, minusculas y espacios multiples reducidos a uno.
-- Esto evita duplicar proveedores por nombre exacto normalizado sin bloquear
-- telefonos, ciudades o contactos repetidos, que son datos flexibles del negocio.
ALTER TABLE proveedores
ADD COLUMN nombre_normalizado TEXT;

-- Backfill defensivo para instalaciones que ya tengan proveedores.
-- La logica completa de normalizacion vivira en el backend; esta expresion cubre
-- los casos comunes de mayusculas, espacios al inicio/final y espacios repetidos.
UPDATE proveedores
SET nombre_normalizado = lower(
  trim(
    replace(
      replace(
        replace(
          replace(nombre_proveedor, char(9), ' '),
          '  ',
          ' '
        ),
        '  ',
        ' '
      ),
      '  ',
      ' '
    )
  )
)
WHERE nombre_normalizado IS NULL;

CREATE INDEX IF NOT EXISTS idx_proveedores_estado_nombre
ON proveedores (estado, nombre_proveedor);

CREATE INDEX IF NOT EXISTS idx_proveedores_ciudad
ON proveedores (ciudad);

CREATE INDEX IF NOT EXISTS idx_proveedores_telefono_principal
ON proveedores (telefono_principal);

CREATE INDEX IF NOT EXISTS idx_proveedores_modo_envio
ON proveedores (modo_envio);

CREATE INDEX IF NOT EXISTS idx_proveedores_fecha_ultimo_lote
ON proveedores (fecha_ultimo_lote);

CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_nombre_normalizado_unique
ON proveedores (nombre_normalizado)
WHERE nombre_normalizado IS NOT NULL;
