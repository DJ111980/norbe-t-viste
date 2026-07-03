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
  canCancelCreditPayments,
  canCancelIndependentCredits,
  canCreateSaleReturns,
  canManageCreditAdjustments,
  canManageOldDebts,
  canRegisterCreditPayments,
  canViewGeneralPortfolio,
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

  it('aplica permisos de creditos y cartera por rol', () => {
    expect(canViewGeneralPortfolio('ADMINISTRADOR')).toBe(true);
    expect(canViewGeneralPortfolio('VENDEDOR')).toBe(false);
    expect(canManageOldDebts('ADMINISTRADOR')).toBe(true);
    expect(canManageOldDebts('VENDEDOR')).toBe(false);
    expect(canRegisterCreditPayments('ADMINISTRADOR')).toBe(true);
    expect(canRegisterCreditPayments('VENDEDOR')).toBe(true);
    expect(canManageCreditAdjustments('ADMINISTRADOR')).toBe(true);
    expect(canManageCreditAdjustments('VENDEDOR')).toBe(false);
    expect(canCancelCreditPayments('ADMINISTRADOR')).toBe(true);
    expect(canCancelCreditPayments('VENDEDOR')).toBe(false);
    expect(canCancelIndependentCredits('ADMINISTRADOR')).toBe(true);
    expect(canCancelIndependentCredits('VENDEDOR')).toBe(false);
  });

  it('solo ADMINISTRADOR registra devoluciones de venta', () => {
    expect(canCreateSaleReturns('ADMINISTRADOR')).toBe(true);
    expect(canCreateSaleReturns('VENDEDOR')).toBe(false);
  });
});
