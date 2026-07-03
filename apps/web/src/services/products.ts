import { apiRequest } from '../lib/api';
import type { Product, ProductFormValues, ProductStatus } from '../types';

interface ListProductsResponse {
  productos: Product[];
}

interface ProductResponse {
  producto: Product;
}

export interface ProductFilters {
  buscar?: string;
  categoria?: string;
  estado?: ProductStatus | '';
}

export async function listProducts(token: string, filters: ProductFilters): Promise<Product[]> {
  const params = new URLSearchParams({ limit: '100', offset: '0' });

  if (filters.buscar?.trim()) params.set('buscar', filters.buscar.trim());
  if (filters.categoria?.trim()) params.set('categoria', filters.categoria.trim());
  if (filters.estado) params.set('estado', filters.estado);

  const data = await apiRequest<ListProductsResponse>(`/productos?${params}`, { token });

  return data.productos;
}

export async function createProduct(token: string, values: ProductFormValues): Promise<Product> {
  const data = await apiRequest<ProductResponse, ProductFormValues>('/productos', {
    method: 'POST',
    token,
    body: values,
  });

  return data.producto;
}

export async function updateProduct(
  token: string,
  idProducto: string,
  values: ProductFormValues,
): Promise<Product> {
  const data = await apiRequest<ProductResponse, ProductFormValues>(`/productos/${idProducto}`, {
    method: 'PATCH',
    token,
    body: values,
  });

  return data.producto;
}

export async function updateProductStatus(
  token: string,
  idProducto: string,
  estado: ProductStatus,
): Promise<Product> {
  const data = await apiRequest<ProductResponse, { estado: ProductStatus }>(
    `/productos/${idProducto}/estado`,
    {
      method: 'PATCH',
      token,
      body: { estado },
    },
  );

  return data.producto;
}
