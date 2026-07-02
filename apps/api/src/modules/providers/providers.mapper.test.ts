import { describe, expect, it } from 'vitest';
import { toPublicProvider } from './providers.mapper';
import type { ProviderRecord } from './providers.types';

function createProviderRecord(overrides: Partial<ProviderRecord> = {}): ProviderRecord {
  return {
    id_proveedor: 'prv_1',
    nombre_proveedor: 'Moda Cali',
    tipo_documento: null,
    numero_documento: null,
    nombre_contacto: null,
    telefono_principal: null,
    telefono_secundario: null,
    correo: null,
    ciudad: null,
    direccion: null,
    pais: null,
    modo_envio: null,
    empresa_transportadora: null,
    tiempo_entrega_estimado: null,
    forma_pago: null,
    cuenta_pago: null,
    notas: null,
    estado: 'ACTIVO',
    creado_en: '2026-01-01 00:00:00',
    actualizado_en: '2026-01-01 00:00:00',
    creado_por: 'usr_admin',
    actualizado_por: 'usr_admin',
    fecha_ultimo_lote: null,
    nombre_normalizado: 'moda cali',
    ...overrides,
  };
}

describe('providers mapper', () => {
  it('mapper no expone campos innecesarios', () => {
    const publicProvider = toPublicProvider(createProviderRecord());

    expect(publicProvider).not.toHaveProperty('nombre_normalizado');
    expect(publicProvider).not.toHaveProperty('nombreNormalizado');
    expect(publicProvider).not.toHaveProperty('inventario');
  });
});
