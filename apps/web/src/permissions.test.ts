import { describe, expect, it } from 'vitest';
import {
  canChangeClientStatus,
  canCancelSales,
  canManageCategories,
  canManageEntryLots,
  canManageInventory,
  canManageProducts,
  canManageProviders,
  canManageVariants,
} from './permissions';

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

  it('solo ADMINISTRADOR administra productos y variantes', () => {
    expect(canManageProducts('ADMINISTRADOR')).toBe(true);
    expect(canManageVariants('ADMINISTRADOR')).toBe(true);
    expect(canManageProducts('VENDEDOR')).toBe(false);
    expect(canManageVariants('VENDEDOR')).toBe(false);
  });

  it('solo ADMINISTRADOR administra inventario y lotes', () => {
    expect(canManageInventory('ADMINISTRADOR')).toBe(true);
    expect(canManageEntryLots('ADMINISTRADOR')).toBe(true);
    expect(canManageInventory('VENDEDOR')).toBe(false);
    expect(canManageEntryLots('VENDEDOR')).toBe(false);
  });

  it('solo ADMINISTRADOR anula ventas', () => {
    expect(canCancelSales('ADMINISTRADOR')).toBe(true);
    expect(canCancelSales('VENDEDOR')).toBe(false);
  });
});
