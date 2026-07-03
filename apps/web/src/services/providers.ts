import { apiRequest } from '../lib/api';
import type { CommonStatus, Provider, ProviderFormValues } from '../types';

interface ListProvidersResponse {
  proveedores: Provider[];
}

interface ProviderResponse {
  proveedor: Provider;
}

export async function listProviders(token: string, buscar: string): Promise<Provider[]> {
  const params = new URLSearchParams({ limit: '100', offset: '0' });

  if (buscar.trim()) {
    params.set('buscar', buscar.trim());
  }

  const data = await apiRequest<ListProvidersResponse>(`/proveedores?${params}`, { token });

  return data.proveedores;
}

export async function createProvider(token: string, values: ProviderFormValues): Promise<Provider> {
  const data = await apiRequest<ProviderResponse, ProviderFormValues>('/proveedores', {
    method: 'POST',
    token,
    body: values,
  });

  return data.proveedor;
}

export async function updateProvider(
  token: string,
  idProveedor: string,
  values: ProviderFormValues,
): Promise<Provider> {
  const data = await apiRequest<ProviderResponse, ProviderFormValues>(
    `/proveedores/${idProveedor}`,
    {
      method: 'PATCH',
      token,
      body: values,
    },
  );

  return data.proveedor;
}

export async function updateProviderStatus(
  token: string,
  idProveedor: string,
  estado: CommonStatus,
): Promise<Provider> {
  const data = await apiRequest<ProviderResponse, { estado: CommonStatus }>(
    `/proveedores/${idProveedor}/estado`,
    {
      method: 'PATCH',
      token,
      body: { estado },
    },
  );

  return data.proveedor;
}
