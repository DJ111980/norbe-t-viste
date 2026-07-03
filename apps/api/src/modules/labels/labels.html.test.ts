import { describe, expect, it } from 'vitest';
import { normalizeLabelSize, renderVariantLabelHtml } from './labels.html';

describe('labels html', () => {
  it('renderiza una etiqueta HTML imprimible de 60mm por 40mm', () => {
    const html = renderVariantLabelHtml({
      codigoQr: 'NTV-VAR-000001',
      talla: 'TALLA M',
      qrSvg: '<svg viewBox="0 0 21 21"><path d="M0 0h1v1H0z"/></svg>',
    });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<title>NORBE T VISTE - Etiqueta QR</title>');
    expect(html).toContain('@page');
    expect(html).toContain('size: 60mm 40mm');
    expect(html).toContain('width: 60mm');
    expect(html).toContain('height: 40mm');
    expect(html).toContain('@media print');
    expect(html).toContain('NORBE T VISTE');
    expect(html).toContain('LOGO');
    expect(html).toContain('<svg viewBox="0 0 21 21">');
    expect(html).toContain('NTV-VAR-000001');
    expect(html).toContain('TALLA M');
  });

  it('no expone precio, stock, proveedor, descripcion ni datos de cliente', () => {
    const html = renderVariantLabelHtml({
      codigoQr: 'NTV-VAR-000001',
      talla: 'TALLA UNICA',
      qrSvg: '<svg></svg>',
    }).toLowerCase();

    expect(html).not.toContain('precio');
    expect(html).not.toContain('stock');
    expect(html).not.toContain('proveedor');
    expect(html).not.toContain('descripcion');
    expect(html).not.toContain('cliente');
  });

  it('escapa codigo visible y talla visible', () => {
    const html = renderVariantLabelHtml({
      codigoQr: '<script>alert(1)</script>',
      talla: 'TALLA "M"',
      qrSvg: '<svg></svg>',
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('TALLA &quot;M&quot;');
    expect(html).not.toContain('<script>');
  });

  it('normaliza la talla visible', () => {
    expect(normalizeLabelSize('m')).toBe('TALLA M');
    expect(normalizeLabelSize('')).toBe('TALLA UNICA');
    expect(normalizeLabelSize(null)).toBe('TALLA UNICA');
  });
});
