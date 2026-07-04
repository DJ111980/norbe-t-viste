import type { UserRole } from './types';

export function canManageProviders(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canManageCategories(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canChangeClientStatus(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canManageProducts(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canManageVariants(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canManageInventory(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canManageEntryLots(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canCancelSales(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canViewGeneralPortfolio(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canManageOldDebts(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canRegisterCreditPayments(role: UserRole): boolean {
  return role === 'ADMINISTRADOR' || role === 'VENDEDOR';
}

export function canManageCreditAdjustments(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canCancelCreditPayments(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canCancelIndependentCredits(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canCreateSaleReturns(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canViewSensitiveReports(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canManageBranding(role: UserRole): boolean {
  return role === 'ADMINISTRADOR';
}

export function canUseLabels(role: UserRole): boolean {
  return role === 'ADMINISTRADOR' || role === 'VENDEDOR';
}
