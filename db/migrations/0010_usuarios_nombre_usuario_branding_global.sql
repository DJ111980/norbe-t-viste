-- NORBE T VISTE - Login por usuario y branding global simple.
-- El esquema inicial ya contiene nombre_usuario y los campos globales de branding.
-- Esta migracion conserva la normalizacion de datos e indices para bases previas.

UPDATE usuarios
SET nombre_usuario = 'admin'
WHERE nombre_usuario IS NULL
  AND (LOWER(correo) = 'admin@gmail.com' OR LOWER(nombre_completo) = 'admin');

WITH usuarios_base AS (
  SELECT
    id_usuario,
    LOWER(
      REPLACE(
        REPLACE(
          SUBSTR(correo, 1, INSTR(correo, '@') - 1),
          ' ',
          ''
        ),
        '_',
        '-'
      )
    ) AS base_usuario
  FROM usuarios
  WHERE nombre_usuario IS NULL
),
usuarios_ordenados AS (
  SELECT
    id_usuario,
    CASE
      WHEN base_usuario IS NULL OR TRIM(base_usuario) = '' THEN 'usuario'
      ELSE base_usuario
    END AS base_usuario,
    ROW_NUMBER() OVER (
      PARTITION BY CASE
        WHEN base_usuario IS NULL OR TRIM(base_usuario) = '' THEN 'usuario'
        ELSE base_usuario
      END
      ORDER BY id_usuario
    ) AS orden
  FROM usuarios_base
)
UPDATE usuarios
SET nombre_usuario = (
  SELECT
    CASE
      WHEN orden = 1 THEN base_usuario
      ELSE base_usuario || '-' || orden
    END
  FROM usuarios_ordenados
  WHERE usuarios_ordenados.id_usuario = usuarios.id_usuario
)
WHERE nombre_usuario IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_nombre_usuario
ON usuarios (nombre_usuario);

UPDATE configuracion_negocio
SET color_principal = COALESCE(NULLIF(TRIM(color_principal), ''), '#b0181b'),
    actualizado_en = datetime('now');
