import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { toPublicProvider } from './providers.mapper';
import * as providersRepository from './providers.repository';
import type {
  CreateProviderInput,
  ListProvidersFilters,
  PublicProvider,
  UpdateProviderInput,
  UpdateProviderStatusInput,
} from './providers.types';

function createProviderId(): string {
  return `prv_${crypto.randomUUID()}`;
}

async function ensureProviderExists(env: ApiEnv, idProveedor: string) {
  const provider = await providersRepository.findProviderById(env, idProveedor);

  if (!provider) {
    throw new ApiError('PROVIDER_NOT_FOUND', 'El proveedor no existe.', 404);
  }

  return provider;
}

async function ensureNormalizedNameIsAvailable(
  env: ApiEnv,
  nombreNormalizado: string | undefined,
  currentProviderId?: string,
): Promise<void> {
  if (!nombreNormalizado) {
    return;
  }

  const existingProvider = await providersRepository.findProviderByNormalizedName(
    env,
    nombreNormalizado,
  );

  if (existingProvider && existingProvider.id_proveedor !== currentProviderId) {
    // El nombre normalizado evita duplicar el mismo proveedor escrito con
    // mayusculas o espacios distintos. Telefono, ciudad y documento no se
    // bloquean porque pueden repetirse o estar incompletos en compras reales.
    throw new ApiError(
      'PROVIDER_NAME_ALREADY_EXISTS',
      'Ya existe un proveedor con ese nombre.',
      409,
    );
  }
}

export async function listProviders(
  env: ApiEnv,
  filters: ListProvidersFilters,
): Promise<PublicProvider[]> {
  const providers = await providersRepository.listProviders(env, filters);

  return providers.map(toPublicProvider);
}

export async function getProvider(env: ApiEnv, idProveedor: string): Promise<PublicProvider> {
  return toPublicProvider(await ensureProviderExists(env, idProveedor));
}

export async function createProvider(
  env: ApiEnv,
  auth: AuthContext,
  input: CreateProviderInput,
): Promise<PublicProvider> {
  await ensureNormalizedNameIsAvailable(env, input.nombreNormalizado);

  return toPublicProvider(
    await providersRepository.createProvider(env, createProviderId(), input, auth.user.id_usuario),
  );
}

export async function updateProvider(
  env: ApiEnv,
  auth: AuthContext,
  idProveedor: string,
  input: UpdateProviderInput,
): Promise<PublicProvider> {
  await ensureProviderExists(env, idProveedor);
  await ensureNormalizedNameIsAvailable(env, input.nombreNormalizado, idProveedor);

  return toPublicProvider(
    await providersRepository.updateProvider(env, idProveedor, input, auth.user.id_usuario),
  );
}

export async function updateProviderStatus(
  env: ApiEnv,
  auth: AuthContext,
  idProveedor: string,
  input: UpdateProviderStatusInput,
): Promise<PublicProvider> {
  await ensureProviderExists(env, idProveedor);

  // Los proveedores no se eliminan porque los lotes futuros podran referenciarlos.
  // fecha_ultimo_lote tampoco se toca aqui: le corresponde al modulo de lotes.
  return toPublicProvider(
    await providersRepository.updateProviderStatus(
      env,
      idProveedor,
      input.estado,
      auth.user.id_usuario,
    ),
  );
}
