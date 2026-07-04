import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import type {
  ClientRecord,
  ClientStatus,
  CreateClientInput,
  ListClientsFilters,
  UpdateClientInput,
} from './clients.types';

const mocks = vi.hoisted(() => ({
  clients: new Map<string, ClientRecord>(),
  documentIndex: new Map<string, string>(),
  lastUpdatedBy: '',
  lastFilters: null as ListClientsFilters | null,
}));

vi.mock('./clients.repository', () => ({
  listClients: vi.fn(async (_env: ApiEnv, filters: ListClientsFilters) => {
    mocks.lastFilters = filters;
    return [...mocks.clients.values()];
  }),
  findClientById: vi.fn(
    async (_env: ApiEnv, idCliente: string) => mocks.clients.get(idCliente) ?? null,
  ),
  findClientByDocument: vi.fn(async (_env: ApiEnv, documento: string) => {
    const idCliente = mocks.documentIndex.get(documento);
    return idCliente ? (mocks.clients.get(idCliente) ?? null) : null;
  }),
  createClient: vi.fn(
    async (_env: ApiEnv, idCliente: string, input: CreateClientInput, userId: string) => {
      const client = createClientRecord({
        id_cliente: idCliente,
        nombre_completo: input.nombreCompleto,
        documento: input.documento,
        telefono: input.telefono,
        telefono_secundario: input.telefonoSecundario,
        direccion: input.direccion,
        ciudad: input.ciudad,
        correo: input.correo,
        observaciones: input.observaciones,
        creado_por: userId,
        actualizado_por: userId,
      });
      mocks.clients.set(idCliente, client);
      if (input.documento) mocks.documentIndex.set(input.documento, idCliente);
      return client;
    },
  ),
  updateClient: vi.fn(
    async (_env: ApiEnv, idCliente: string, input: UpdateClientInput, userId: string) => {
      const client = mocks.clients.get(idCliente);
      if (!client) throw new Error('missing mock client');
      if (input.nombreCompleto !== undefined) client.nombre_completo = input.nombreCompleto;
      if (input.documento !== undefined) {
        if (client.documento) mocks.documentIndex.delete(client.documento);
        client.documento = input.documento;
        if (input.documento) mocks.documentIndex.set(input.documento, idCliente);
      }
      if (input.telefono !== undefined) client.telefono = input.telefono;
      client.actualizado_por = userId;
      mocks.lastUpdatedBy = userId;
      return client;
    },
  ),
  updateClientStatus: vi.fn(
    async (_env: ApiEnv, idCliente: string, estado: ClientStatus, userId: string) => {
      const client = mocks.clients.get(idCliente);
      if (!client) throw new Error('missing mock client');
      client.estado = estado;
      client.actualizado_por = userId;
      mocks.lastUpdatedBy = userId;
      return client;
    },
  ),
}));

const { createClient, listClients, updateClient, updateClientStatus } =
  await import('./clients.service');

const env = {} as ApiEnv;
const vendedorAuth = createAuth('VENDEDOR');
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

function createClientRecord(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id_cliente: 'cli_1',
    nombre_completo: 'Maria Perez',
    documento: null,
    telefono: null,
    telefono_secundario: null,
    direccion: null,
    ciudad: null,
    correo: null,
    observaciones: null,
    estado: 'ACTIVO',
    creado_en: '2026-01-01 00:00:00',
    actualizado_en: '2026-01-01 00:00:00',
    creado_por: null,
    actualizado_por: null,
    fecha_ultima_compra: null,
    ...overrides,
  };
}

function addMockClient(client: ClientRecord): void {
  mocks.clients.set(client.id_cliente, client);
  if (client.documento) mocks.documentIndex.set(client.documento, client.id_cliente);
}

describe('clients service', () => {
  beforeEach(() => {
    mocks.clients = new Map();
    mocks.documentIndex = new Map();
    mocks.lastUpdatedBy = '';
    mocks.lastFilters = null;
  });

  it('crear cliente rechaza documento duplicado', async () => {
    addMockClient(createClientRecord({ id_cliente: 'cli_1', documento: '123' }));

    await expect(
      createClient(env, adminAuth, {
        nombreCompleto: 'Otro Cliente',
        documento: '123',
        telefono: null,
        telefonoSecundario: null,
        direccion: null,
        ciudad: null,
        correo: null,
        observaciones: null,
      }),
    ).rejects.toMatchObject({
      code: 'CLIENT_DOCUMENT_ALREADY_EXISTS',
      status: 409,
    });
  });

  it('crear cliente permite telefono duplicado', async () => {
    addMockClient(createClientRecord({ id_cliente: 'cli_1', telefono: '3001234567' }));

    const client = await createClient(env, vendedorAuth, {
      nombreCompleto: 'Cliente Familiar',
      documento: null,
      telefono: '3001234567',
      telefonoSecundario: null,
      direccion: null,
      ciudad: null,
      correo: null,
      observaciones: null,
    });

    expect(client.telefono).toBe('3001234567');
    expect(client.creadoPor).toBe('usr_vendedor');
  });

  it('editar cliente valida documento duplicado contra otro cliente', async () => {
    addMockClient(createClientRecord({ id_cliente: 'cli_1', documento: '111' }));
    addMockClient(createClientRecord({ id_cliente: 'cli_2', documento: '222' }));

    await expect(updateClient(env, adminAuth, 'cli_1', { documento: '222' })).rejects.toMatchObject(
      {
        code: 'CLIENT_DOCUMENT_ALREADY_EXISTS',
        status: 409,
      },
    );
  });

  it('editar cliente actualiza actualizado_por', async () => {
    addMockClient(createClientRecord({ id_cliente: 'cli_1' }));

    const client = await updateClient(env, vendedorAuth, 'cli_1', {
      nombreCompleto: 'Maria Actualizada',
    });

    expect(client.actualizadoPor).toBe('usr_vendedor');
    expect(mocks.lastUpdatedBy).toBe('usr_vendedor');
  });

  it('administrador puede cambiar estado', async () => {
    addMockClient(createClientRecord({ id_cliente: 'cli_1' }));

    const client = await updateClientStatus(env, adminAuth, 'cli_1', { estado: 'INACTIVO' });

    expect(client.estado).toBe('INACTIVO');
    expect(client.actualizadoPor).toBe('usr_admin');
  });

  it('listado aplica filtros basicos', async () => {
    await listClients(env, {
      buscar: 'maria',
      estado: 'ACTIVO',
      telefono: '3001234567',
      documento: '123',
      limit: 50,
      offset: 0,
    });

    expect(mocks.lastFilters).toEqual({
      buscar: 'maria',
      estado: 'ACTIVO',
      telefono: '3001234567',
      documento: '123',
      limit: 50,
      offset: 0,
    });
  });
});
