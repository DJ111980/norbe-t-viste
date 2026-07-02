-- NORBE T VISTE - Auditoria y soporte futuro de reportes para clientes.

-- La auditoria permite saber que usuario registro al cliente. Esto es importante
-- porque vendedores y administradores podran crear clientes desde operacion diaria.
ALTER TABLE clientes
ADD COLUMN creado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

-- Guarda quien hizo la ultima actualizacion del cliente. La logica del backend
-- validara permisos antes de escribir este campo.
ALTER TABLE clientes
ADD COLUMN actualizado_por TEXT REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;

-- Se deja preparado para ventas futuras. No representa deuda ni saldo: las deudas
-- se manejaran en creditos, abonos y ajustes, no directamente en clientes.
ALTER TABLE clientes
ADD COLUMN fecha_ultima_compra TEXT;

CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes (documento);
CREATE INDEX IF NOT EXISTS idx_clientes_correo ON clientes (correo);
CREATE INDEX IF NOT EXISTS idx_clientes_estado_nombre ON clientes (estado, nombre_completo);
CREATE INDEX IF NOT EXISTS idx_clientes_fecha_ultima_compra ON clientes (fecha_ultima_compra);
