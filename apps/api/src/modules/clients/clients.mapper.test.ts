import { describe, expect, it } from 'vitest';
import { toPublicClient } from './clients.mapper';
import type { ClientRecord } from './clients.types';

function createClientRecord(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id_cliente: 'cli_1',
    nombre_completo: 'Maria Perez',
    documento: null,
    telefono: null,
    telefono_secundario: null,
    direccion: null,
    ciudad: null,
    correo: null,
    observaciones: null,
    estado: 'ACTIVO',
    creado_en: '2026-01-01 00:00:00',
    actualizado_en: '2026-01-01 00:00:00',
    creado_por: 'usr_admin',
    actualizado_por: 'usr_admin',
    fecha_ultima_compra: null,
    ...overrides,
  };
}

describe('clients mapper', () => {
  it('mapper no expone campos innecesarios', () => {
    const publicClient = toPublicClient(createClientRecord());

    expect(publicClient).not.toHaveProperty('saldo');
    expect(publicClient).not.toHaveProperty('deuda');
    expect(publicClient).not.toHaveProperty('credito');
  });
});
