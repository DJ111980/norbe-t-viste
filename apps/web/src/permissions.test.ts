import { describe, expect, it } from 'vitest';
import { canChangeClientStatus, canManageCategories, canManageProviders } from './permissions';

describe('crud permissions', () => {
  it('ADMINISTRADOR puede administrar proveedores y categorias', () => {
    expect(canManageProviders('ADMINISTRADOR')).toBe(true);
    expect(canManageCategories('ADMINISTRADOR')).toBe(true);
  });

  it('VENDEDOR solo consulta proveedores y categorias', () => {
    expect(canManageProviders('VENDEDOR')).toBe(false);
    expect(canManageCategories('VENDEDOR')).toBe(false);
  });

  it('solo ADMINISTRADOR cambia estado de clientes', () => {
    expect(canChangeClientStatus('ADMINISTRADOR')).toBe(true);
    expect(canChangeClientStatus('VENDEDOR')).toBe(false);
  });
});
