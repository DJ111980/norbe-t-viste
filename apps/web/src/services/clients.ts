import { apiRequest } from '../lib/api';
import type { Client, ClientFormValues, CommonStatus } from '../types';

interface ListClientsResponse {
  clientes: Client[];
}

interface ClientResponse {
  cliente: Client;
}

export async function listClients(token: string, buscar: string): Promise<Client[]> {
  const params = new URLSearchParams({ limit: '100', offset: '0' });

  if (buscar.trim()) {
    params.set('buscar', buscar.trim());
  }

  const data = await apiRequest<ListClientsResponse>(`/clientes?${params}`, { token });

  return data.clientes;
}

export async function createClient(token: string, values: ClientFormValues): Promise<Client> {
  const data = await apiRequest<ClientResponse, ClientFormValues>('/clientes', {
    method: 'POST',
    token,
    body: values,
  });

  return data.cliente;
}

export async function updateClient(
  token: string,
  idCliente: string,
  values: ClientFormValues,
): Promise<Client> {
  const data = await apiRequest<ClientResponse, ClientFormValues>(`/clientes/${idCliente}`, {
    method: 'PATCH',
    token,
    body: values,
  });

  return data.cliente;
}

export async function updateClientStatus(
  token: string,
  idCliente: string,
  estado: CommonStatus,
): Promise<Client> {
  const data = await apiRequest<ClientResponse, { estado: CommonStatus }>(
    `/clientes/${idCliente}/estado`,
    {
      method: 'PATCH',
      token,
      body: { estado },
    },
  );

  return data.cliente;
}
