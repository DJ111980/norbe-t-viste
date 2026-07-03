import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import type {
  EntryLotDetailRecord,
  EntryLotRecord,
  ProviderForEntryLot,
  VariantForEntryLotDetail,
} from './entry-lots.types';

const mocks = vi.hoisted(() => ({
  lots: new Map<string, EntryLotRecord>(),
  details: new Map<string, EntryLotDetailRecord>(),
  providers: new Map<string, ProviderForEntryLot>(),
  variants: new Map<string, VariantForEntryLotDetail>(),
  movementCalls: 0,
  movementInputs: [] as Array<{
    stockAntes: number;
    stockDespues: number;
    cantidad: number;
    motivo?: string;
  }>,
}));

vi.mock('./entry-lots.repository', () => ({
  listEntryLots: vi.fn(async () => Array.from(mocks.lots.values())),
  findEntryLotById: vi.fn(async (_env: ApiEnv, idLote: string) => mocks.lots.get(idLote) ?? null),
  findEntryLotDetails: vi.fn(async (_env: ApiEnv, idLote: string) =>
    Array.from(mocks.details.values()).filter((detail) => detail.id_lote === idLote),
  ),
  findEntryLotDetailById: vi.fn(async (_env: ApiEnv, idLote: string, idDetalle: string) => {
    const detail = mocks.details.get(idDetalle);
    return detail?.id_lote === idLote ? detail : null;
  }),
  findProviderForEntryLot: vi.fn(
    async (_env: ApiEnv, idProveedor: string) => mocks.providers.get(idProveedor) ?? null,
  ),
  findVariantForEntryLotDetail: vi.fn(
    async (_env: ApiEnv, idVariante: string) => mocks.variants.get(idVariante) ?? null,
  ),
  createEntryLot: vi.fn(
    async (
      _env: ApiEnv,
      idLote: string,
      numeroLote: string,
      input,
      userId: string,
    ): Promise<EntryLotRecord> => {
      const lot = buildLot({
        id_lote: idLote,
        numero_lote: numeroLote,
        id_proveedor: input.idProveedor,
        creado_por: userId,
        actualizado_por: userId,
        fecha_lote: input.fechaLote,
        numero_factura_proveedor: input.numeroFactura,
        observaciones: input.observaciones,
      });
      mocks.lots.set(idLote, lot);
      return lot;
    },
  ),
  updateEntryLot: vi.fn(
    async (_env: ApiEnv, idLote: string, input, userId: string): Promise<EntryLotRecord> => {
      const lot = mocks.lots.get(idLote);
      if (!lot) throw new Error('missing lot');
      const updatedLot = {
        ...lot,
        id_proveedor: input.idProveedor !== undefined ? input.idProveedor : lot.id_proveedor,
        numero_factura_proveedor:
          input.numeroFactura !== undefined ? input.numeroFactura : lot.numero_factura_proveedor,
        fecha_lote: input.fechaLote !== undefined ? input.fechaLote : lot.fecha_lote,
        observaciones: input.observaciones !== undefined ? input.observaciones : lot.observaciones,
        actualizado_por: userId,
      };
      mocks.lots.set(idLote, updatedLot);
      return updatedLot;
    },
  ),
  createEntryLotDetail: vi.fn(
    async (_env: ApiEnv, idDetalle: string, idLote: string, input, subtotal: number) => {
      const detail = buildDetail({
        id_detalle_lote: idDetalle,
        id_lote: idLote,
        id_variante: input.idVariante,
        cantidad: input.cantidad,
        costo_unitario: input.costoUnitario,
        subtotal,
        cantidad_etiquetas_qr: input.cantidadEtiquetasQr ?? input.cantidad,
      });
      mocks.details.set(idDetalle, detail);
      return detail;
    },
  ),
  updateEntryLotDetail: vi.fn(
    async (_env: ApiEnv, idLote: string, idDetalle: string, input, subtotal: number) => {
      const detail = mocks.details.get(idDetalle);
      if (!detail || detail.id_lote !== idLote) throw new Error('missing detail');
      const updatedDetail = {
        ...detail,
        cantidad: input.cantidad ?? detail.cantidad,
        costo_unitario: input.costoUnitario ?? detail.costo_unitario,
        precio_venta_sugerido: input.precioVentaSugerido ?? detail.precio_venta_sugerido,
        cantidad_etiquetas_qr: input.cantidadEtiquetasQr ?? detail.cantidad_etiquetas_qr,
        observaciones: input.observaciones ?? detail.observaciones,
        subtotal,
      };
      mocks.details.set(idDetalle, updatedDetail);
      return updatedDetail;
    },
  ),
  deleteEntryLotDetail: vi.fn(async (_env: ApiEnv, _idLote: string, idDetalle: string) => {
    mocks.details.delete(idDetalle);
  }),
  confirmEntryLot: vi.fn(async (_env: ApiEnv, idLote: string, userId: string, movements) => {
    for (const movement of movements) {
      const variant = mocks.variants.get(movement.idVariante);
      if (variant && mocks.lots.get(idLote)?.estado_lote === 'BORRADOR') {
        variant.stock_actual += movement.cantidad;
        mocks.movementCalls += 1;
        mocks.movementInputs.push({
          stockAntes: movement.stockAntes,
          stockDespues: movement.stockDespues,
          cantidad: movement.cantidad,
        });
      }
    }

    const lot = mocks.lots.get(idLote);
    if (lot?.estado_lote === 'BORRADOR') {
      mocks.lots.set(idLote, {
        ...lot,
        estado_lote: 'CONFIRMADO',
        confirmado_por: userId,
        confirmado_en: '2026-07-02 10:00:00',
        actualizado_por: userId,
      });
    }
  }),
  cancelEntryLot: vi.fn(
    async (_env: ApiEnv, idLote: string, userId: string, motivo: string, movements) => {
      for (const movement of movements) {
        const variant = mocks.variants.get(movement.idVariante);
        if (variant && mocks.lots.get(idLote)?.estado_lote === 'CONFIRMADO') {
          variant.stock_actual -= movement.cantidad;
          mocks.movementCalls += 1;
          mocks.movementInputs.push({
            stockAntes: movement.stockAntes,
            stockDespues: movement.stockDespues,
            cantidad: movement.cantidad,
            motivo: movement.motivo,
          });
        }
      }

      const lot = mocks.lots.get(idLote);
      if (lot?.estado_lote === 'BORRADOR' || lot?.estado_lote === 'CONFIRMADO') {
        mocks.lots.set(idLote, {
          ...lot,
          estado_lote: 'ANULADO',
          anulado_por: userId,
          anulado_en: '2026-07-02 10:00:00',
          motivo_anulacion: motivo,
          actualizado_por: userId,
        });
      }
    },
  ),
}));

const {
  cancelEntryLot,
  confirmEntryLot,
  createEntryLot,
  createEntryLotDetail,
  deleteEntryLotDetail,
  listEntryLots,
  updateEntryLot,
  updateEntryLotDetail,
} = await import('./entry-lots.service');

const env = {} as ApiEnv;
const adminAuth = { user: { id_usuario: 'usr_admin', rol: 'ADMINISTRADOR' } } as AuthContext;
const sellerAuth = { user: { id_usuario: 'usr_seller', rol: 'VENDEDOR' } } as AuthContext;

function buildLot(overrides: Partial<EntryLotRecord> = {}): EntryLotRecord {
  return {
    id_lote: 'lot_1',
    id_proveedor: null,
    nombre_proveedor: null,
    estado_proveedor: null,
    creado_por: 'usr_admin',
    actualizado_por: 'usr_admin',
    confirmado_por: null,
    confirmado_en: null,
    anulado_por: null,
    anulado_en: null,
    motivo_anulacion: null,
    numero_lote: 'NTV-LOT-1',
    tipo_lote: 'COMPRA',
    fecha_lote: '2026-07-02',
    numero_factura_proveedor: null,
    numero_guia_envio: null,
    modo_envio: null,
    empresa_transportadora: null,
    costo_envio: 0,
    total_compra: 0,
    estado_lote: 'BORRADOR',
    observaciones: null,
    creado_en: '2026-07-02',
    actualizado_en: '2026-07-02',
    cantidad_detalles: 0,
    total_estimado: 0,
    ...overrides,
  };
}

function buildDetail(overrides: Partial<EntryLotDetailRecord> = {}): EntryLotDetailRecord {
  return {
    id_detalle_lote: 'det_1',
    id_lote: 'lot_1',
    id_variante: 'var_1',
    cantidad: 1,
    costo_unitario: 5000,
    precio_venta_sugerido: 10000,
    subtotal: 5000,
    cantidad_etiquetas_qr: 1,
    observaciones: null,
    creado_en: '2026-07-02',
    actualizado_en: '2026-07-02',
    sku: 'SKU-1',
    codigo_qr: 'NTV-VAR-000001',
    talla: 'M',
    color: 'Azul',
    estado_variante: 'ACTIVA',
    stock_actual: 7,
    id_producto: 'prd_1',
    nombre_producto: 'Blusa',
    estado_producto: 'ACTIVO',
    ...overrides,
  };
}

describe('entry lots service', () => {
  beforeEach(() => {
    mocks.lots = new Map([['lot_1', buildLot()]]);
    mocks.details = new Map();
    mocks.providers = new Map([
      [
        'prv_activo',
        { id_proveedor: 'prv_activo', nombre_proveedor: 'Moda Cali', estado: 'ACTIVO' },
      ],
      [
        'prv_inactivo',
        { id_proveedor: 'prv_inactivo', nombre_proveedor: 'Moda Cerrada', estado: 'INACTIVO' },
      ],
    ]);
    mocks.variants = new Map([
      [
        'var_1',
        {
          id_variante: 'var_1',
          estado: 'ACTIVA',
          stock_actual: 7,
          id_producto: 'prd_1',
          nombre_producto: 'Blusa',
          estado_producto: 'ACTIVO',
        },
      ],
      [
        'var_inactiva',
        {
          id_variante: 'var_inactiva',
          estado: 'INACTIVA',
          stock_actual: 2,
          id_producto: 'prd_1',
          nombre_producto: 'Blusa',
          estado_producto: 'ACTIVO',
        },
      ],
      [
        'var_producto_inactivo',
        {
          id_variante: 'var_producto_inactivo',
          estado: 'ACTIVA',
          stock_actual: 2,
          id_producto: 'prd_inactivo',
          nombre_producto: 'Producto viejo',
          estado_producto: 'INACTIVO',
        },
      ],
    ]);
    mocks.movementCalls = 0;
    mocks.movementInputs = [];
  });

  it('crea lote en BORRADOR con proveedor activo y sin proveedor', async () => {
    const withProvider = await createEntryLot(env, adminAuth, {
      idProveedor: 'prv_activo',
      numeroFactura: 'FAC-1',
      fechaLote: '2026-07-02',
      observaciones: null,
    });
    const withoutProvider = await createEntryLot(env, adminAuth, {
      idProveedor: null,
      numeroFactura: null,
      fechaLote: '2026-07-02',
      observaciones: null,
    });

    expect(withProvider.estadoLote).toBe('BORRADOR');
    expect(withProvider.idProveedor).toBe('prv_activo');
    expect(withoutProvider.idProveedor).toBeNull();
  });

  it('rechaza proveedor inexistente o inactivo', async () => {
    await expect(
      createEntryLot(env, adminAuth, {
        idProveedor: 'missing',
        numeroFactura: null,
        fechaLote: '2026-07-02',
        observaciones: null,
      }),
    ).rejects.toMatchObject({ code: 'PROVIDER_NOT_FOUND' });

    await expect(
      createEntryLot(env, adminAuth, {
        idProveedor: 'prv_inactivo',
        numeroFactura: null,
        fechaLote: '2026-07-02',
        observaciones: null,
      }),
    ).rejects.toMatchObject({ code: 'PROVIDER_INACTIVE' });
  });

  it('edita lote solo en BORRADOR', async () => {
    expect(
      (
        await updateEntryLot(env, adminAuth, 'lot_1', {
          numeroFactura: 'FAC-2',
        })
      ).numeroFactura,
    ).toBe('FAC-2');

    mocks.lots.set(
      'lot_confirmado',
      buildLot({ id_lote: 'lot_confirmado', estado_lote: 'CONFIRMADO' }),
    );
    await expect(
      updateEntryLot(env, adminAuth, 'lot_confirmado', { observaciones: 'x' }),
    ).rejects.toMatchObject({ code: 'ENTRY_LOT_ALREADY_CONFIRMED' });

    mocks.lots.set('lot_anulado', buildLot({ id_lote: 'lot_anulado', estado_lote: 'ANULADO' }));
    await expect(
      updateEntryLot(env, adminAuth, 'lot_anulado', { observaciones: 'x' }),
    ).rejects.toMatchObject({
      code: 'ENTRY_LOT_CANCELLED',
    });
  });

  it('agrega detalle valido, calcula subtotal y no modifica stock ni movimientos', async () => {
    const stockAntes = mocks.variants.get('var_1')?.stock_actual;
    const detail = await createEntryLotDetail(env, adminAuth, 'lot_1', {
      idVariante: 'var_1',
      cantidad: 3,
      costoUnitario: 5000,
      precioVentaSugerido: 10000,
      cantidadEtiquetasQr: undefined,
      observaciones: null,
    });

    expect(detail.subtotal).toBe(15000);
    expect(detail.cantidadEtiquetasQr).toBe(3);
    expect(mocks.variants.get('var_1')?.stock_actual).toBe(stockAntes);
    expect(mocks.movementCalls).toBe(0);
  });

  it('rechaza variante inexistente, variante inactiva y producto inactivo', async () => {
    await expect(
      createEntryLotDetail(env, adminAuth, 'lot_1', {
        idVariante: 'missing',
        cantidad: 1,
        costoUnitario: 1,
        precioVentaSugerido: 0,
        observaciones: null,
      }),
    ).rejects.toMatchObject({ code: 'VARIANT_NOT_FOUND' });

    await expect(
      createEntryLotDetail(env, adminAuth, 'lot_1', {
        idVariante: 'var_inactiva',
        cantidad: 1,
        costoUnitario: 1,
        precioVentaSugerido: 0,
        observaciones: null,
      }),
    ).rejects.toMatchObject({ code: 'VARIANT_INACTIVE' });

    await expect(
      createEntryLotDetail(env, adminAuth, 'lot_1', {
        idVariante: 'var_producto_inactivo',
        cantidad: 1,
        costoUnitario: 1,
        precioVentaSugerido: 0,
        observaciones: null,
      }),
    ).rejects.toMatchObject({ code: 'PRODUCT_INACTIVE' });
  });

  it('edita detalle recalculando subtotal y elimina detalle solo en BORRADOR', async () => {
    mocks.details.set('det_1', buildDetail());

    const updated = await updateEntryLotDetail(env, adminAuth, 'lot_1', 'det_1', {
      cantidad: 4,
    });

    expect(updated.subtotal).toBe(20000);

    await deleteEntryLotDetail(env, 'lot_1', 'det_1');

    expect(mocks.details.has('det_1')).toBe(false);
  });

  it('rechaza modificar detalles de lote confirmado o anulado', async () => {
    mocks.lots.set(
      'lot_confirmado',
      buildLot({ id_lote: 'lot_confirmado', estado_lote: 'CONFIRMADO' }),
    );
    mocks.lots.set('lot_anulado', buildLot({ id_lote: 'lot_anulado', estado_lote: 'ANULADO' }));

    await expect(
      createEntryLotDetail(env, adminAuth, 'lot_confirmado', {
        idVariante: 'var_1',
        cantidad: 1,
        costoUnitario: 1,
        precioVentaSugerido: 0,
        observaciones: null,
      }),
    ).rejects.toMatchObject({ code: 'ENTRY_LOT_ALREADY_CONFIRMED' });

    await expect(deleteEntryLotDetail(env, 'lot_anulado', 'det_1')).rejects.toMatchObject({
      code: 'ENTRY_LOT_CANCELLED',
    });
  });

  it('vendedor lista sin costos', async () => {
    mocks.lots.set('lot_1', buildLot({ cantidad_detalles: 1, total_estimado: 5000 }));

    const lots = await listEntryLots(env, sellerAuth, {
      limit: 50,
      offset: 0,
    });

    expect(lots[0]?.totalEstimado).toBeNull();
  });

  it('confirma lote valido, aumenta stock y crea movimientos LOTE_ENTRADA', async () => {
    mocks.details.set('det_1', buildDetail({ id_detalle_lote: 'det_1', cantidad: 3 }));
    mocks.details.set(
      'det_2',
      buildDetail({
        id_detalle_lote: 'det_2',
        id_variante: 'var_1',
        cantidad: 2,
        subtotal: 10000,
      }),
    );

    const result = await confirmEntryLot(env, adminAuth, 'lot_1');

    expect(result).toMatchObject({
      id_lote: 'lot_1',
      estado_lote: 'CONFIRMADO',
      detalles_procesados: 2,
      movimientos_creados: 2,
      total_unidades_ingresadas: 5,
    });
    expect(mocks.lots.get('lot_1')?.estado_lote).toBe('CONFIRMADO');
    expect(mocks.lots.get('lot_1')?.confirmado_por).toBe('usr_admin');
    expect(mocks.lots.get('lot_1')?.confirmado_en).toBeTruthy();
    expect(mocks.variants.get('var_1')?.stock_actual).toBe(12);
    expect(mocks.movementCalls).toBe(2);
    expect(mocks.movementInputs).toEqual([
      { stockAntes: 7, stockDespues: 10, cantidad: 3 },
      { stockAntes: 10, stockDespues: 12, cantidad: 2 },
    ]);
  });

  it('rechaza confirmar lote vacio, inexistente, confirmado o anulado', async () => {
    await expect(confirmEntryLot(env, adminAuth, 'lot_1')).rejects.toMatchObject({
      code: 'EMPTY_ENTRY_LOT',
    });
    await expect(confirmEntryLot(env, adminAuth, 'missing')).rejects.toMatchObject({
      code: 'ENTRY_LOT_NOT_FOUND',
    });

    mocks.lots.set(
      'lot_confirmado',
      buildLot({ id_lote: 'lot_confirmado', estado_lote: 'CONFIRMADO' }),
    );
    await expect(confirmEntryLot(env, adminAuth, 'lot_confirmado')).rejects.toMatchObject({
      code: 'ENTRY_LOT_ALREADY_CONFIRMED',
    });

    mocks.lots.set('lot_anulado', buildLot({ id_lote: 'lot_anulado', estado_lote: 'ANULADO' }));
    await expect(confirmEntryLot(env, adminAuth, 'lot_anulado')).rejects.toMatchObject({
      code: 'ENTRY_LOT_CANCELLED',
    });
  });

  it('rechaza confirmar con variante o producto inactivo', async () => {
    mocks.details.set('det_inactiva', buildDetail({ estado_variante: 'INACTIVA' }));

    await expect(confirmEntryLot(env, adminAuth, 'lot_1')).rejects.toMatchObject({
      code: 'VARIANT_INACTIVE',
    });

    mocks.details.set(
      'det_producto_inactivo',
      buildDetail({ id_detalle_lote: 'det_producto_inactivo', estado_producto: 'INACTIVO' }),
    );
    mocks.details.delete('det_inactiva');

    await expect(confirmEntryLot(env, adminAuth, 'lot_1')).rejects.toMatchObject({
      code: 'PRODUCT_INACTIVE',
    });
  });

  it('anula lote BORRADOR sin modificar stock ni crear movimientos', async () => {
    const result = await cancelEntryLot(env, adminAuth, 'lot_1', {
      motivo: 'Error al registrar el lote',
    });

    expect(result).toMatchObject({
      id_lote: 'lot_1',
      estado_lote: 'ANULADO',
      detalles_procesados: 0,
      movimientos_creados: 0,
      total_unidades_reversadas: 0,
    });
    expect(mocks.lots.get('lot_1')?.estado_lote).toBe('ANULADO');
    expect(mocks.lots.get('lot_1')?.anulado_por).toBe('usr_admin');
    expect(mocks.lots.get('lot_1')?.motivo_anulacion).toBe('Error al registrar el lote');
    expect(mocks.variants.get('var_1')?.stock_actual).toBe(7);
    expect(mocks.movementCalls).toBe(0);
  });

  it('anula lote CONFIRMADO con stock suficiente y crea movimientos de reversa', async () => {
    mocks.lots.set('lot_1', buildLot({ estado_lote: 'CONFIRMADO' }));
    mocks.details.set('det_1', buildDetail({ id_detalle_lote: 'det_1', cantidad: 3 }));
    mocks.details.set(
      'det_2',
      buildDetail({
        id_detalle_lote: 'det_2',
        id_variante: 'var_1',
        cantidad: 2,
      }),
    );

    const result = await cancelEntryLot(env, adminAuth, 'lot_1', {
      motivo: 'Error al registrar el lote',
    });

    expect(result).toMatchObject({
      estado_lote: 'ANULADO',
      detalles_procesados: 2,
      movimientos_creados: 2,
      total_unidades_reversadas: 5,
    });
    expect(mocks.variants.get('var_1')?.stock_actual).toBe(2);
    expect(mocks.movementInputs).toEqual([
      {
        stockAntes: 7,
        stockDespues: 4,
        cantidad: 3,
        motivo: 'ANULACION_LOTE_ENTRADA: Error al registrar el lote',
      },
      {
        stockAntes: 4,
        stockDespues: 2,
        cantidad: 2,
        motivo: 'ANULACION_LOTE_ENTRADA: Error al registrar el lote',
      },
    ]);
  });

  it('bloquea anulacion de lote CONFIRMADO si el stock no alcanza y no modifica nada', async () => {
    mocks.lots.set('lot_1', buildLot({ estado_lote: 'CONFIRMADO' }));
    mocks.details.set('det_1', buildDetail({ cantidad: 8 }));

    await expect(
      cancelEntryLot(env, adminAuth, 'lot_1', {
        motivo: 'Error al registrar el lote',
      }),
    ).rejects.toMatchObject({ code: 'LOTE_NO_ANULABLE_STOCK_INSUFICIENTE' });

    expect(mocks.lots.get('lot_1')?.estado_lote).toBe('CONFIRMADO');
    expect(mocks.variants.get('var_1')?.stock_actual).toBe(7);
    expect(mocks.movementCalls).toBe(0);
  });

  it('rechaza anular lote inexistente o ya anulado', async () => {
    await expect(
      cancelEntryLot(env, adminAuth, 'missing', {
        motivo: 'Error',
      }),
    ).rejects.toMatchObject({ code: 'ENTRY_LOT_NOT_FOUND' });

    mocks.lots.set('lot_anulado', buildLot({ id_lote: 'lot_anulado', estado_lote: 'ANULADO' }));

    await expect(
      cancelEntryLot(env, adminAuth, 'lot_anulado', {
        motivo: 'Error',
      }),
    ).rejects.toMatchObject({ code: 'LOTE_YA_ANULADO' });
  });
});
