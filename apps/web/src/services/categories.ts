import { apiRequest } from '../lib/api';
import type { Category, CategoryFormValues, CategoryStatus } from '../types';

interface ListCategoriesResponse {
  categorias: Category[];
}

interface CategoryResponse {
  categoria: Category;
}

export async function listCategories(token: string, buscar: string): Promise<Category[]> {
  const params = new URLSearchParams({ limit: '100', offset: '0' });

  if (buscar.trim()) {
    params.set('buscar', buscar.trim());
  }

  const data = await apiRequest<ListCategoriesResponse>(`/categorias?${params}`, { token });

  return data.categorias;
}

export async function createCategory(token: string, values: CategoryFormValues): Promise<Category> {
  const data = await apiRequest<CategoryResponse, CategoryFormValues>('/categorias', {
    method: 'POST',
    token,
    body: values,
  });

  return data.categoria;
}

export async function updateCategory(
  token: string,
  idCategoria: string,
  values: CategoryFormValues,
): Promise<Category> {
  const data = await apiRequest<CategoryResponse, CategoryFormValues>(
    `/categorias/${idCategoria}`,
    {
      method: 'PATCH',
      token,
      body: values,
    },
  );

  return data.categoria;
}

export async function updateCategoryStatus(
  token: string,
  idCategoria: string,
  estado: CategoryStatus,
): Promise<Category> {
  const data = await apiRequest<CategoryResponse, { estado: CategoryStatus }>(
    `/categorias/${idCategoria}/estado`,
    {
      method: 'PATCH',
      token,
      body: { estado },
    },
  );

  return data.categoria;
}
