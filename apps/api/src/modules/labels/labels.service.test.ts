import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import { getVariantLabelPreviewHtml } from './labels.service';
import type { LabelVariantRecord } from './labels.types';

const mocks = vi.hoisted(() => ({
  variant: null as LabelVariantRecord | null,
  qrCalls: [] as string[],
}));

vi.mock('./labels.repository', () => ({
  findLabelVariantById: vi.fn(async () => mocks.variant),
}));

vi.mock('./labels.qr', () => ({
  createQrSvg: vi.fn((codigoQr: string) => {
    mocks.qrCalls.push(codigoQr);
    return `<svg data-code="${codigoQr}"></svg>`;
  }),
}));

function buildVariant(overrides: Partial<LabelVariantRecord> = {}): LabelVariantRecord {
  return {
    id_variante: 'var_1',
    codigo_qr: 'NTV-VAR-000001',
    talla: 'm',
    estado: 'ACTIVA',
    estado_producto: 'ACTIVO',
    ...overrides,
  };
}

describe('labels service', () => {
  beforeEach(() => {
    mocks.variant = buildVariant();
    mocks.qrCalls = [];
  });

  it('genera HTML para variante activa', async () => {
    const html = await getVariantLabelPreviewHtml({} as ApiEnv, 'var_1');

    expect(html).toContain('NTV-VAR-000001');
    expect(html).toContain('TALLA M');
    expect(mocks.qrCalls).toEqual(['NTV-VAR-000001']);
  });

  it('permite variante inactiva y producto inactivo para imprimir historial real', async () => {
    mocks.variant = buildVariant({
      estado: 'INACTIVA',
      estado_producto: 'INACTIVO',
      codigo_qr: 'NTV-VAR-000099',
      talla: null,
    });

    const html = await getVariantLabelPreviewHtml({} as ApiEnv, 'var_inactiva');

    expect(html).toContain('NTV-VAR-000099');
    expect(html).toContain('TALLA UNICA');
    expect(mocks.qrCalls).toEqual(['NTV-VAR-000099']);
  });

  it('falla si la variante no existe', async () => {
    mocks.variant = null;

    await expect(getVariantLabelPreviewHtml({} as ApiEnv, 'var_missing')).rejects.toMatchObject({
      code: 'VARIANT_NOT_FOUND',
      status: 404,
    });
  });

  it('falla si la variante no tiene codigo QR', async () => {
    mocks.variant = buildVariant({ codigo_qr: '   ' });

    await expect(getVariantLabelPreviewHtml({} as ApiEnv, 'var_1')).rejects.toMatchObject({
      code: 'VARIANT_QR_CODE_REQUIRED',
      status: 409,
    });
    expect(mocks.qrCalls).toEqual([]);
  });

  it('el QR se crea solo con codigo_qr y no con datos sensibles', async () => {
    mocks.variant = buildVariant({ codigo_qr: 'NTV-VAR-000777', talla: 'xl' });

    await getVariantLabelPreviewHtml({} as ApiEnv, 'var_1');

    expect(mocks.qrCalls).toEqual(['NTV-VAR-000777']);
    expect(mocks.qrCalls[0]).not.toContain('precio');
    expect(mocks.qrCalls[0]).not.toContain('stock');
  });
});
