import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { Modal } from '../components/Modal';
import {
  EmptyState,
  ErrorMessage,
  Field,
  inputClassName,
  LoadingState,
  PageHeader,
  primaryButtonClassName,
  secondaryButtonClassName,
  StatusBadge,
  SuccessMessage,
  textareaClassName,
} from '../components/ui';
import { ApiClientError, isForbiddenError, isUnauthorizedError } from '../lib/api';
import { canChangeClientStatus } from '../permissions';
import { createClient, listClients, updateClient, updateClientStatus } from '../services/clients';
import type { Client, ClientFormValues } from '../types';

const emptyClientForm: ClientFormValues = {
  nombre_completo: '',
  documento: '',
  telefono: '',
  telefono_secundario: '',
  direccion: '',
  ciudad: '',
  correo: '',
  observaciones: '',
};

export function ClientsPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, user, logout } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [buscar, setBuscar] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<ClientFormValues>(emptyClientForm);
  const canChangeStatus = user ? canChangeClientStatus(user.rol) : false;

  async function handleError(actionError: unknown) {
    if (isUnauthorizedError(actionError)) {
      await logout();
      onSessionExpired();
      return;
    }

    if (isForbiddenError(actionError)) {
      setFormError('No tienes permisos para esta accion.');
      return;
    }

    const message =
      actionError instanceof ApiClientError
        ? actionError.message
        : 'No se pudo completar la operacion.';
    setFormError(message);
  }

  async function loadData(search = buscar) {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      setClients(await listClients(token, search));
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        await logout();
        onSessionExpired();
        return;
      }

      setError(
        loadError instanceof ApiClientError ? loadError.message : 'No se pudo cargar clientes.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData('');
  }, [token]);

  function startEdit(client: Client) {
    setEditing(client);
    setForm({
      nombre_completo: client.nombreCompleto,
      documento: client.documento ?? '',
      telefono: client.telefono ?? '',
      telefono_secundario: client.telefonoSecundario ?? '',
      direccion: client.direccion ?? '',
      ciudad: client.ciudad ?? '',
      correo: client.correo ?? '',
      observaciones: client.observaciones ?? '',
    });
    setFormError(null);
    setSuccess(null);
    setIsFormOpen(true);
  }

  function resetForm() {
    setEditing(null);
    setIsFormOpen(false);
    setForm(emptyClientForm);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    try {
      if (editing) {
        await updateClient(token, editing.idCliente, form);
        setSuccess('Cliente actualizado.');
      } else {
        await createClient(token, form);
        setSuccess('Cliente creado.');
      }

      resetForm();
      await loadData();
    } catch (saveError) {
      await handleError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(client: Client) {
    if (!token || !canChangeStatus) return;

    setFormError(null);
    setSuccess(null);

    try {
      await updateClientStatus(
        token,
        client.idCliente,
        client.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO',
      );
      setSuccess('Estado del cliente actualizado.');
      await loadData();
    } catch (statusError) {
      await handleError(statusError);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Consulta, crea y edita clientes sin manejar cartera desde este modulo."
        action={
          <button
            type="button"
            className={primaryButtonClassName}
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
          >
            Crear cliente
          </button>
        }
      />

      <div className="rounded-md border border-stone-200 bg-white p-4">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void loadData();
          }}
        >
          <input
            value={buscar}
            onChange={(event) => setBuscar(event.target.value)}
            placeholder="Buscar por nombre, documento o telefono"
            className={inputClassName}
          />
          <button type="submit" className={secondaryButtonClassName}>
            Buscar
          </button>
        </form>
      </div>

      {error && <ErrorMessage message={error} />}
      {formError && <ErrorMessage message={formError} />}
      {success && <SuccessMessage message={success} />}

      {isFormOpen && (
        <Modal title={editing ? 'Editar cliente' : 'Crear cliente'} onClose={resetForm}>
          <ClientForm
            form={form}
            isSaving={isSaving}
            editing={editing}
            onCancel={resetForm}
            onChange={setForm}
            onSubmit={(event) => void handleSubmit(event)}
          />
        </Modal>
      )}

      {isLoading ? (
        <LoadingState />
      ) : clients.length === 0 ? (
        <EmptyState message="No hay clientes para mostrar." />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {clients.map((client) => (
                <tr key={client.idCliente}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-950">{client.nombreCompleto}</p>
                    <p className="text-xs text-stone-500">{client.documento ?? 'Sin documento'}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <p>{client.telefono ?? 'Sin telefono'}</p>
                    <p className="text-xs">{client.correo ?? 'Sin correo'}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{client.ciudad ?? 'Sin ciudad'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={client.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(client)}
                        className={secondaryButtonClassName}
                      >
                        Editar
                      </button>
                      {canChangeStatus && (
                        <button
                          type="button"
                          onClick={() => void toggleStatus(client)}
                          className={secondaryButtonClassName}
                        >
                          {client.estado === 'ACTIVO' ? 'Inactivar' : 'Activar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ClientForm({
  form,
  editing,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
}: {
  form: ClientFormValues;
  editing: Client | null;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: ClientFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-950">
          {editing ? 'Editar cliente' : 'Crear cliente'}
        </h2>
        {editing && (
          <button type="button" onClick={onCancel} className={secondaryButtonClassName}>
            Cancelar
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre completo" required>
          <input
            required
            value={form.nombre_completo}
            onChange={(event) => onChange({ ...form, nombre_completo: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Documento">
          <input
            value={form.documento}
            onChange={(event) => onChange({ ...form, documento: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Telefono">
          <input
            value={form.telefono}
            onChange={(event) => onChange({ ...form, telefono: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Telefono secundario">
          <input
            value={form.telefono_secundario}
            onChange={(event) => onChange({ ...form, telefono_secundario: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Correo">
          <input
            type="email"
            value={form.correo}
            onChange={(event) => onChange({ ...form, correo: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Ciudad">
          <input
            value={form.ciudad}
            onChange={(event) => onChange({ ...form, ciudad: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Direccion">
          <input
            value={form.direccion}
            onChange={(event) => onChange({ ...form, direccion: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Observaciones">
          <textarea
            value={form.observaciones}
            onChange={(event) => onChange({ ...form, observaciones: event.target.value })}
            className={textareaClassName}
          />
        </Field>
      </div>

      <div className="mt-4">
        <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
          {isSaving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear cliente'}
        </button>
      </div>
    </form>
  );
}
