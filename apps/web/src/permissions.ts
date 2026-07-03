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
