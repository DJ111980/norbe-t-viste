# Diseno de etiqueta QR para variantes

Este documento registra la decision visual aprobada para la primera prueba de impresion de etiquetas adhesivas de NORBE T VISTE.

## Tamano de etiqueta

- Diseno recomendado: 2.205 x 1.575 in.
- Tamano real aproximado: 60 mm x 40 mm.
- Orientacion: horizontal.
- Margen seguro minimo: 2 mm.
- Margen seguro ideal: 3 mm.

## Distribucion visual aprobada

El titulo debe ir centrado en la parte superior. El logo queda a la izquierda, el QR a la derecha, la talla abajo a la izquierda y el codigo visible de la variante abajo a la derecha.

```text
┌──────────────────────────────────────────────┐
│              NORBE T VISTE                   │
│                                              │
│   [       LOGO       ]    [       QR      ]  │
│   [       LOGO       ]    [       QR      ]  │
│                                              │
│   TALLA M                  NTV-VAR-000001    │
└──────────────────────────────────────────────┘
```

## Contenido obligatorio

- Nombre del negocio: NORBE T VISTE.
- Logo del negocio.
- QR de la variante.
- Talla visible, por ejemplo: TALLA M.
- Codigo visible de la variante, por ejemplo: NTV-VAR-000001.

## Contenido excluido

La etiqueta no debe incluir por ahora:

- Precio.
- Stock.
- Proveedor.
- Descripcion larga.
- Datos del cliente.
- Datos completos del producto.
- Informacion de inventario.

## Reglas del QR

El QR debe codificar solamente el `codigo_qr` de la variante.

Ejemplo:

```text
NTV-VAR-000001
```

El QR no debe contener:

- Precio.
- Stock.
- Nombre completo del producto.
- Proveedor.
- Datos internos sensibles.
- Informacion completa de inventario.

El QR es por variante, no por unidad fisica. Una misma variante conserva el mismo codigo QR.

## Tamano recomendado del QR

- Tamano recomendado: 22 mm x 22 mm.
- Tamano minimo practico: 18 mm x 18 mm.
- Debe mantener zona blanca suficiente alrededor para facilitar el escaneo.
- El QR tiene prioridad visual sobre los textos secundarios.

## Tamano recomendado del logo

- Ancho recomendado: 18 mm a 22 mm.
- Altura maxima recomendada: 18 mm a 20 mm.
- El logo debe mantenerse legible, pero sin competir visualmente con el QR.

## Datos minimos necesarios

Desde base de datos:

- `codigo_qr` de la variante.
- `talla` de la variante.
- `id_variante`, si se necesita trazabilidad interna durante la generacion.

Desde configuracion o assets del proyecto:

- Nombre del negocio: NORBE T VISTE.
- Logo oficial desde la carpeta `img`.
- Tamano de etiqueta.
- Cantidad de etiquetas a imprimir.

## Recomendacion futura de implementacion

La implementacion real debe hacerse por fases:

1. Vista previa de etiqueta antes de imprimir.
2. Impresion individual por variante.
3. Impresion por lote para varias variantes.
4. HTML imprimible como primer formato, para ajustar margenes rapidamente.
5. PDF como formato posterior, cuando el layout de impresion ya este validado.

No se implementa todavia generacion de imagen QR, PDF, frontend, R2 ni modulo completo de etiquetas en esta fase.
