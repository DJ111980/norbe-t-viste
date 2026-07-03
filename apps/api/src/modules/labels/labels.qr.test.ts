import { describe, expect, it } from 'vitest';
import { createQrSvg } from './labels.qr';

describe('labels qr', () => {
  it('genera un SVG QR inline desde el codigo interno', () => {
    const svg = createQrSvg('NTV-VAR-000001');

    expect(svg.trim().startsWith('<svg')).toBe(true);
    expect(svg).toContain('path');
    expect(svg).not.toContain('precio');
    expect(svg).not.toContain('stock');
    expect(svg).not.toContain('proveedor');
  });
});
