# Modulos

## Backend

- Auth: login, JWT y usuario actual.
- Branding: datos de marca y logo desde R2.
- Clientes: CRUD y estados.
- Proveedores: CRUD y estados.
- Categorias: CRUD y estados.
- Productos: producto base sin stock.
- Variantes: talla, color, precio, QR y stock consultivo.
- Lotes de entrada: ingreso formal de inventario.
- Inventario: consulta y ajustes controlados.
- Ventas: CONTADO, CREDITO y MIXTA.
- Creditos: deudas, abonos, ajustes y anulaciones.
- Cartera: consultas financieras.
- Devoluciones: devoluciones parciales.
- Etiquetas: preview HTML imprimible 2.25 x 1.25.
- Reportes: ventas, inventario, movimientos, cartera, devoluciones y lotes.
- Usuarios: gestion de usuarios y avatar.

## Frontend

Cada pantalla consume servicios de `apps/web/src/services`. Las respuestas de
error se normalizan en el cliente API para mostrar mensajes consistentes.
