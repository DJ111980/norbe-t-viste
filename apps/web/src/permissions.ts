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
