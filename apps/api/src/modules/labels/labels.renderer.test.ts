import { describe, expect, it } from 'vitest';
import {
  normalizeLabelSize,
  renderLabelsPageHtml,
  renderVariantLabelHtml,
} from './labels.renderer';

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
    expect(html).toContain('<img class="logo-image"');
    expect(html).toContain('src="data:image/png;base64,');
    expect(html).toContain('<svg viewBox="0 0 21 21">');
    expect(html).toContain('NTV-VAR-000001');
    expect(html).toContain('TALLA M');
    expect(html).toContain('<header class="title">NORBE T VISTE</header>');
    expect(html).toContain('<section class="visuals"');
    expect(html).toContain('<section class="details"');
    expect(html).toContain('grid-template-rows: 6mm 23mm 5mm');
    expect(html).toContain('grid-template-columns: 1fr 1fr');
    expect(html).toContain('width: 21mm');
    expect(html).not.toContain('Escanea para consultar la variante');
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

  it('renderiza una pagina con varias etiquetas HTML imprimibles', () => {
    const html = renderLabelsPageHtml([
      {
        codigoQr: 'NTV-VAR-000001',
        talla: 'TALLA M',
        qrSvg: '<svg data-code="NTV-VAR-000001"></svg>',
      },
      {
        codigoQr: 'NTV-VAR-000002',
        talla: 'TALLA L',
        qrSvg: '<svg data-code="NTV-VAR-000002"></svg>',
      },
    ]);
    const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<title>NORBE T VISTE - Etiquetas QR</title>');
    expect(html).toContain('class="labels-pages"');
    expect(html).not.toContain('class="labels-grid"');
    expect(style).not.toContain('flex-wrap');
    expect(style).not.toMatch(/size:\s*A4\b/i);
    expect(style).not.toMatch(/size:\s*letter\b/i);
    expect(html.match(/class="label"/g)).toHaveLength(2);
    expect(html.match(/class="visuals"/g)).toHaveLength(2);
    expect(html.match(/class="details"/g)).toHaveLength(2);
    expect(html.match(/class="logo-image"/g)).toHaveLength(2);
    expect(html).toContain('src="data:image/png;base64,');
    expect(html.match(/<svg/g)).toHaveLength(2);
    expect(html).toContain('NTV-VAR-000001');
    expect(html).toContain('NTV-VAR-000002');
    expect(html).toContain('TALLA M');
    expect(html).toContain('TALLA L');
    expect(html).toContain('size: 60mm 40mm');
    expect(html).toContain('width: 60mm');
    expect(html).toContain('height: 40mm');
    expect(html).toContain('break-after: page');
    expect(html).toContain('page-break-after: always');
    expect(html).toContain('@media print');
    expect(html).not.toContain('Escanea para consultar la variante');
    expect(html.toLowerCase()).not.toContain('precio');
    expect(html.toLowerCase()).not.toContain('stock');
    expect(html.toLowerCase()).not.toContain('proveedor');
    expect(html.toLowerCase()).not.toContain('descripcion');
    expect(html.toLowerCase()).not.toContain('cliente');
  });
});
