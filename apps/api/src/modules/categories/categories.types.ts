import type { UserRole } from '../auth/auth.types';

export type CategoryStatus = 'ACTIVA' | 'INACTIVA';

export interface CategoryRecord {
  id_categoria: string;
  nombre_categoria: string;
  descripcion: string | null;
  estado: CategoryStatus;
  creado_en: string;
  actualizado_en: string;
  creado_por: string | null;
  actualizado_por: string | null;
  nombre_normalizado: string | null;
}

export interface PublicCategory {
  idCategoria: string;
  nombreCategoria: string;
  descripcion: string | null;
  estado: CategoryStatus;
  creadoEn: string;
  actualizadoEn: string;
  creadoPor: string | null;
  actualizadoPor: string | null;
}

export interface CreateCategoryInput {
  nombreCategoria: string;
  nombreNormalizado: string;
  descripcion: string | null;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export interface UpdateCategoryStatusInput {
  estado: CategoryStatus;
}

export interface ListCategoriesFilters {
  buscar?: string;
  estado?: CategoryStatus;
  limit: number;
  offset: number;
}

export interface CategoryAccess {
  rol: UserRole;
}
