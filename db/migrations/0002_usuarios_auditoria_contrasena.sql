-- NORBE T VISTE - Auditoria y control de contrasena para usuarios.

-- Permite marcar usuarios creados o reiniciados por un administrador para que
-- cambien su contrasena temporal en un flujo controlado futuro.
ALTER TABLE usuarios
ADD COLUMN debe_cambiar_contrasena INTEGER NOT NULL DEFAULT 1 CHECK (debe_cambiar_contrasena IN (0, 1));

-- Guarda cuando se actualizo por ultima vez la contrasena. Es opcional porque
-- los usuarios existentes pueden venir de una migracion o carga inicial.
ALTER TABLE usuarios
ADD COLUMN contrasena_actualizada_en TEXT;

-- Registra que administrador creo el usuario. Esta referencia ayuda a auditoria
-- sin exponer datos sensibles ni depender de una ruta publica de registro.
ALTER TABLE usuarios
ADD COLUMN creado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;
