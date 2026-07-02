import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { toPublicClient } from './clients.mapper';
import * as clientsRepository from './clients.repository';
import type {
  CreateClientInput,
  ListClientsFilters,
  PublicClient,
  UpdateClientInput,
  UpdateClientStatusInput,
} from './clients.types';

function createClientId(): string {
  return `cli_${crypto.randomUUID()}`;
}

async function ensureClientExists(env: ApiEnv, idCliente: string) {
  const client = await clientsRepository.findClientById(env, idCliente);

  if (!client) {
    throw new ApiError('CLIENT_NOT_FOUND', 'El cliente no existe.', 404);
  }

  return client;
}

async function ensureDocumentIsAvailable(
  env: ApiEnv,
  documento: string | null | undefined,
  currentClientId?: string,
): Promise<void> {
  if (!documento) {
    return;
  }

  const existingClient = await clientsRepository.findClientByDocument(env, documento);

  if (existingClient && existingClient.id_cliente !== currentClientId) {
    // El documento identifica formalmente al cliente; el telefono no se bloquea
    // porque en el negocio pueden existir numeros familiares compartidos.
    throw new ApiError(
      'CLIENT_DOCUMENT_ALREADY_EXISTS',
      'Ya existe un cliente con ese documento.',
      409,
    );
  }
}

export async function listClients(
  env: ApiEnv,
  filters: ListClientsFilters,
): Promise<PublicClient[]> {
  const clients = await clientsRepository.listClients(env, filters);

  return clients.map(toPublicClient);
}

export async function getClient(env: ApiEnv, idCliente: string): Promise<PublicClient> {
  return toPublicClient(await ensureClientExists(env, idCliente));
}

export async function createClient(
  env: ApiEnv,
  auth: AuthContext,
  input: CreateClientInput,
): Promise<PublicClient> {
  await ensureDocumentIsAvailable(env, input.documento);

  return toPublicClient(
    await clientsRepository.createClient(env, createClientId(), input, auth.user.id_usuario),
  );
}

export async function updateClient(
  env: ApiEnv,
  auth: AuthContext,
  idCliente: string,
  input: UpdateClientInput,
): Promise<PublicClient> {
  await ensureClientExists(env, idCliente);
  await ensureDocumentIsAvailable(env, input.documento, idCliente);

  return toPublicClient(
    await clientsRepository.updateClient(env, idCliente, input, auth.user.id_usuario),
  );
}

export async function updateClientStatus(
  env: ApiEnv,
  auth: AuthContext,
  idCliente: string,
  input: UpdateClientStatusInput,
): Promise<PublicClient> {
  await ensureClientExists(env, idCliente);

  // Los clientes no se eliminan: cambiar estado conserva historial y permite que
  // ventas, creditos o abonos futuros sigan apuntando al mismo cliente.
  return toPublicClient(
    await clientsRepository.updateClientStatus(env, idCliente, input.estado, auth.user.id_usuario),
  );
}
