import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import type {
  CreateProviderInput,
  ListProvidersFilters,
  ProviderRecord,
  ProviderStatus,
  UpdateProviderInput,
} from './providers.types';

const mocks = vi.hoisted(() => ({
  providers: new Map<string, ProviderRecord>(),
  normalizedNameIndex: new Map<string, string>(),
  lastUpdatedBy: '',
  lastFilters: null as ListProvidersFilters | null,
}));

vi.mock('./providers.repository', () => ({
  listProviders: vi.fn(async (_env: ApiEnv, filters: ListProvidersFilters) => {
    mocks.lastFilters = filters;
    return [...mocks.providers.values()];
  }),
  findProviderById: vi.fn(
    async (_env: ApiEnv, idProveedor: string) => mocks.providers.get(idProveedor) ?? null,
  ),
  findProviderByNormalizedName: vi.fn(async (_env: ApiEnv, nombreNormalizado: string) => {
    const idProveedor = mocks.normalizedNameIndex.get(nombreNormalizado);
    return idProveedor ? (mocks.providers.get(idProveedor) ?? null) : null;
  }),
  createProvider: vi.fn(
    async (_env: ApiEnv, idProveedor: string, input: CreateProviderInput, userId: string) => {
      const provider = createProviderRecord({
        id_proveedor: idProveedor,
        nombre_proveedor: input.nombreProveedor,
        nombre_normalizado: input.nombreNormalizado,
        tipo_documento: input.tipoDocumento,
        numero_documento: input.numeroDocumento,
        nombre_contacto: input.nombreContacto,
        telefono_principal: input.telefonoPrincipal,
        telefono_secundario: input.telefonoSecundario,
        correo: input.correo,
        ciudad: input.ciudad,
        direccion: input.direccion,
        pais: input.pais,
        modo_envio: input.modoEnvio,
        empresa_transportadora: input.empresaTransportadora,
        tiempo_entrega_estimado: input.tiempoEntregaEstimado,
        forma_pago: input.formaPago,
        cuenta_pago: input.cuentaPago,
        notas: input.notas,
        creado_por: userId,
        actualizado_por: userId,
      });
      mocks.providers.set(idProveedor, provider);
      mocks.normalizedNameIndex.set(input.nombreNormalizado, idProveedor);
      return provider;
    },
  ),
  updateProvider: vi.fn(
    async (_env: ApiEnv, idProveedor: string, input: UpdateProviderInput, userId: string) => {
      const provider = mocks.providers.get(idProveedor);
      if (!provider) throw new Error('missing mock provider');
      if (input.nombreProveedor !== undefined) provider.nombre_proveedor = input.nombreProveedor;
      if (input.nombreNormalizado !== undefined) {
        if (provider.nombre_normalizado) {
          mocks.normalizedNameIndex.delete(provider.nombre_normalizado);
        }
        provider.nombre_normalizado = input.nombreNormalizado;
        mocks.normalizedNameIndex.set(input.nombreNormalizado, idProveedor);
      }
      if (input.telefonoPrincipal !== undefined)
        provider.telefono_principal = input.telefonoPrincipal;
      if (input.ciudad !== undefined) provider.ciudad = input.ciudad;
      if (input.numeroDocumento !== undefined) provider.numero_documento = input.numeroDocumento;
      provider.actualizado_por = userId;
      mocks.lastUpdatedBy = userId;
      return provider;
    },
  ),
  updateProviderStatus: vi.fn(
    async (_env: ApiEnv, idProveedor: string, estado: ProviderStatus, userId: string) => {
      const provider = mocks.providers.get(idProveedor);
      if (!provider) throw new Error('missing mock provider');
      provider.estado = estado;
      provider.actualizado_por = userId;
      mocks.lastUpdatedBy = userId;
      return provider;
    },
  ),
}));

const { createProvider, listProviders, updateProvider, updateProviderStatus } =
  await import('./providers.service');

const env = {} as ApiEnv;
const adminAuth = createAuth('ADMINISTRADOR');

function createAuth(rol: 'ADMINISTRADOR' | 'VENDEDOR'): AuthContext {
  return {
    user: {
      id_usuario: rol === 'ADMINISTRADOR' ? 'usr_admin' : 'usr_vendedor',
      nombre_completo: rol,
      nombre_usuario: rol.toLowerCase(),
      correo: `${rol.toLowerCase()}@norbe.test`,
      contrasena_hash: 'hash',
      rol,
      estado: 'ACTIVO',
      ultimo_acceso: null,
      creado_en: '2026-01-01 00:00:00',
      actualizado_en: '2026-01-01 00:00:00',
      debe_cambiar_contrasena: 0,
      contrasena_actualizada_en: null,
      creado_por: null,
    },
  };
}

function createProviderRecord(overrides: Partial<ProviderRecord> = {}): ProviderRecord {
  return {
    id_proveedor: 'prv_1',
    nombre_proveedor: 'Moda Cali',
    tipo_documento: null,
    numero_documento: null,
    nombre_contacto: null,
    telefono_principal: null,
    telefono_secundario: null,
    correo: null,
    ciudad: null,
    direccion: null,
    pais: null,
    modo_envio: null,
    empresa_transportadora: null,
    tiempo_entrega_estimado: null,
    forma_pago: null,
    cuenta_pago: null,
    notas: null,
    estado: 'ACTIVO',
    creado_en: '2026-01-01 00:00:00',
    actualizado_en: '2026-01-01 00:00:00',
    creado_por: null,
    actualizado_por: null,
    fecha_ultimo_lote: null,
    nombre_normalizado: 'moda cali',
    ...overrides,
  };
}

function addMockProvider(provider: ProviderRecord): void {
  mocks.providers.set(provider.id_proveedor, provider);
  if (provider.nombre_normalizado) {
    mocks.normalizedNameIndex.set(provider.nombre_normalizado, provider.id_proveedor);
  }
}

function createInput(overrides: Partial<CreateProviderInput> = {}): CreateProviderInput {
  return {
    nombreProveedor: 'Moda Cali',
    nombreNormalizado: 'moda cali',
    tipoDocumento: null,
    numeroDocumento: null,
    nombreContacto: null,
    telefonoPrincipal: null,
    telefonoSecundario: null,
    correo: null,
    ciudad: null,
    direccion: null,
    pais: null,
    modoEnvio: null,
    empresaTransportadora: null,
    tiempoEntregaEstimado: null,
    formaPago: null,
    cuentaPago: null,
    notas: null,
    ...overrides,
  };
}

describe('providers service', () => {
  beforeEach(() => {
    mocks.providers = new Map();
    mocks.normalizedNameIndex = new Map();
    mocks.lastUpdatedBy = '';
    mocks.lastFilters = null;
  });

  it('crear rechaza nombre normalizado duplicado', async () => {
    addMockProvider(
      createProviderRecord({ id_proveedor: 'prv_1', nombre_normalizado: 'moda cali' }),
    );

    await expect(createProvider(env, adminAuth, createInput())).rejects.toMatchObject({
      code: 'PROVIDER_NAME_ALREADY_EXISTS',
      status: 409,
    });
  });

  it('permite telefono, ciudad y numero de documento duplicados', async () => {
    addMockProvider(
      createProviderRecord({
        id_proveedor: 'prv_1',
        nombre_normalizado: 'proveedor uno',
        telefono_principal: '3001234567',
        ciudad: 'Cali',
        numero_documento: '123',
      }),
    );

    const provider = await createProvider(
      env,
      adminAuth,
      createInput({
        nombreProveedor: 'Proveedor Dos',
        nombreNormalizado: 'proveedor dos',
        telefonoPrincipal: '3001234567',
        ciudad: 'Cali',
        numeroDocumento: '123',
      }),
    );

    expect(provider.telefonoPrincipal).toBe('3001234567');
    expect(provider.ciudad).toBe('Cali');
    expect(provider.numeroDocumento).toBe('123');
  });

  it('editar rechaza nombre normalizado duplicado contra otro proveedor', async () => {
    addMockProvider(createProviderRecord({ id_proveedor: 'prv_1', nombre_normalizado: 'uno' }));
    addMockProvider(createProviderRecord({ id_proveedor: 'prv_2', nombre_normalizado: 'dos' }));

    await expect(
      updateProvider(env, adminAuth, 'prv_1', {
        nombreProveedor: 'Dos',
        nombreNormalizado: 'dos',
      }),
    ).rejects.toMatchObject({
      code: 'PROVIDER_NAME_ALREADY_EXISTS',
      status: 409,
    });
  });

  it('editar actualiza actualizado_por', async () => {
    addMockProvider(createProviderRecord({ id_proveedor: 'prv_1' }));

    const provider = await updateProvider(env, adminAuth, 'prv_1', {
      nombreProveedor: 'Moda Actualizada',
      nombreNormalizado: 'moda actualizada',
    });

    expect(provider.actualizadoPor).toBe('usr_admin');
    expect(mocks.lastUpdatedBy).toBe('usr_admin');
  });

  it('administrador puede cambiar estado', async () => {
    addMockProvider(createProviderRecord({ id_proveedor: 'prv_1' }));

    const provider = await updateProviderStatus(env, adminAuth, 'prv_1', { estado: 'INACTIVO' });

    expect(provider.estado).toBe('INACTIVO');
    expect(provider.actualizadoPor).toBe('usr_admin');
  });

  it('listado aplica filtros basicos', async () => {
    await listProviders(env, {
      buscar: 'moda',
      estado: 'ACTIVO',
      ciudad: 'Cali',
      telefono: '3001234567',
      modoEnvio: 'ENCOMIENDA',
      limit: 50,
      offset: 0,
    });

    expect(mocks.lastFilters).toEqual({
      buscar: 'moda',
      estado: 'ACTIVO',
      ciudad: 'Cali',
      telefono: '3001234567',
      modoEnvio: 'ENCOMIENDA',
      limit: 50,
      offset: 0,
    });
  });
});
