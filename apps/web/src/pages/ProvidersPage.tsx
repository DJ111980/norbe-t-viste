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
import { canManageProviders } from '../permissions';
import {
  createProvider,
  listProviders,
  updateProvider,
  updateProviderStatus,
} from '../services/providers';
import type { Provider, ProviderFormValues } from '../types';

const shippingModes = [
  '',
  'ENVIO_TRANSPORTADORA',
  'RECOGIDA_EN_LOCAL',
  'DOMICILIO',
  'ENCOMIENDA',
  'OTRO',
];

const emptyProviderForm: ProviderFormValues = {
  nombre_proveedor: '',
  tipo_documento: '',
  numero_documento: '',
  nombre_contacto: '',
  telefono_principal: '',
  telefono_secundario: '',
  correo: '',
  ciudad: '',
  direccion: '',
  pais: '',
  modo_envio: '',
  empresa_transportadora: '',
  tiempo_entrega_estimado: '',
  forma_pago: '',
  cuenta_pago: '',
  notas: '',
};

export function ProvidersPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, user, logout } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [buscar, setBuscar] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<ProviderFormValues>(emptyProviderForm);
  const canManage = user ? canManageProviders(user.rol) : false;

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

    setFormError(
      actionError instanceof ApiClientError
        ? actionError.message
        : 'No se pudo completar la operacion.',
    );
  }

  async function loadData(search = buscar) {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      setProviders(await listProviders(token, search));
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        await logout();
        onSessionExpired();
        return;
      }

      setError(
        loadError instanceof ApiClientError ? loadError.message : 'No se pudo cargar proveedores.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData('');
  }, [token]);

  function startEdit(provider: Provider) {
    setEditing(provider);
    setForm({
      nombre_proveedor: provider.nombreProveedor,
      tipo_documento: provider.tipoDocumento ?? '',
      numero_documento: provider.numeroDocumento ?? '',
      nombre_contacto: provider.nombreContacto ?? '',
      telefono_principal: provider.telefonoPrincipal ?? '',
      telefono_secundario: provider.telefonoSecundario ?? '',
      correo: provider.correo ?? '',
      ciudad: provider.ciudad ?? '',
      direccion: provider.direccion ?? '',
      pais: provider.pais ?? '',
      modo_envio: provider.modoEnvio ?? '',
      empresa_transportadora: provider.empresaTransportadora ?? '',
      tiempo_entrega_estimado: provider.tiempoEntregaEstimado ?? '',
      forma_pago: provider.formaPago ?? '',
      cuenta_pago: provider.cuentaPago ?? '',
      notas: provider.notas ?? '',
    });
    setFormError(null);
    setSuccess(null);
    setIsFormOpen(true);
  }

  function resetForm() {
    setEditing(null);
    setIsFormOpen(false);
    setForm(emptyProviderForm);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !canManage) return;

    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    try {
      if (editing) {
        await updateProvider(token, editing.idProveedor, form);
        setSuccess('Proveedor actualizado.');
      } else {
        await createProvider(token, form);
        setSuccess('Proveedor creado.');
      }

      resetForm();
      await loadData();
    } catch (saveError) {
      await handleError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(provider: Provider) {
    if (!token || !canManage) return;

    setFormError(null);
    setSuccess(null);

    try {
      await updateProviderStatus(
        token,
        provider.idProveedor,
        provider.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO',
      );
      setSuccess('Estado del proveedor actualizado.');
      await loadData();
    } catch (statusError) {
      await handleError(statusError);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Proveedores"
        description="Consulta y administra proveedores de compra."
        action={
          canManage && (
            <button
              type="button"
              className={primaryButtonClassName}
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
            >
              Crear proveedor
            </button>
          )
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
            placeholder="Buscar proveedor"
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

      {canManage && isFormOpen && (
        <Modal title={editing ? 'Editar proveedor' : 'Crear proveedor'} onClose={resetForm}>
          <ProviderForm
            form={form}
            isSaving={isSaving}
            editing={editing}
            onCancel={resetForm}
            onChange={setForm}
            onSubmit={(event) => void handleSubmit(event)}
          />
        </Modal>
      )}

      {!canManage && (
        <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">
          Tu rol permite consultar proveedores. Las acciones de crear, editar y cambiar estado son
          administrativas.
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : providers.length === 0 ? (
        <EmptyState message="No hay proveedores para mostrar." />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Ubicacion</th>
                <th className="px-4 py-3">Envio</th>
                <th className="px-4 py-3">Estado</th>
                {canManage && <th className="px-4 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {providers.map((provider) => (
                <tr key={provider.idProveedor}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-950">{provider.nombreProveedor}</p>
                    <p className="text-xs text-stone-500">
                      {provider.numeroDocumento ?? 'Sin documento'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <p>{provider.nombreContacto ?? 'Sin contacto'}</p>
                    <p className="text-xs">{provider.telefonoPrincipal ?? 'Sin telefono'}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {[provider.ciudad, provider.pais].filter(Boolean).join(', ') || 'Sin ubicacion'}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{provider.modoEnvio ?? 'Sin modo'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={provider.estado} />
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(provider)}
                          className={secondaryButtonClassName}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleStatus(provider)}
                          className={secondaryButtonClassName}
                        >
                          {provider.estado === 'ACTIVO' ? 'Inactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ProviderForm({
  form,
  editing,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
}: {
  form: ProviderFormValues;
  editing: Provider | null;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: ProviderFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-950">
          {editing ? 'Editar proveedor' : 'Crear proveedor'}
        </h2>
        {editing && (
          <button type="button" onClick={onCancel} className={secondaryButtonClassName}>
            Cancelar
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Nombre proveedor" required>
          <input
            required
            value={form.nombre_proveedor}
            onChange={(event) => onChange({ ...form, nombre_proveedor: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Tipo documento">
          <input
            value={form.tipo_documento}
            onChange={(event) => onChange({ ...form, tipo_documento: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Numero documento">
          <input
            value={form.numero_documento}
            onChange={(event) => onChange({ ...form, numero_documento: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Nombre contacto">
          <input
            value={form.nombre_contacto}
            onChange={(event) => onChange({ ...form, nombre_contacto: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Telefono principal" required>
          <input
            value={form.telefono_principal}
            onChange={(event) => onChange({ ...form, telefono_principal: event.target.value })}
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
        <Field label="Pais">
          <input
            value={form.pais}
            onChange={(event) => onChange({ ...form, pais: event.target.value })}
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
        <Field label="Modo envio">
          <select
            value={form.modo_envio}
            onChange={(event) => onChange({ ...form, modo_envio: event.target.value })}
            className={inputClassName}
          >
            {shippingModes.map((mode) => (
              <option key={mode || 'empty'} value={mode}>
                {mode || 'Sin modo'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Empresa transportadora">
          <input
            value={form.empresa_transportadora}
            onChange={(event) => onChange({ ...form, empresa_transportadora: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Tiempo entrega estimado">
          <input
            value={form.tiempo_entrega_estimado}
            onChange={(event) => onChange({ ...form, tiempo_entrega_estimado: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Forma pago">
          <input
            value={form.forma_pago}
            onChange={(event) => onChange({ ...form, forma_pago: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Cuenta pago">
          <input
            value={form.cuenta_pago}
            onChange={(event) => onChange({ ...form, cuenta_pago: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Notas">
          <textarea
            value={form.notas}
            onChange={(event) => onChange({ ...form, notas: event.target.value })}
            className={textareaClassName}
          />
        </Field>
      </div>

      <div className="mt-4">
        <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
          {isSaving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear proveedor'}
        </button>
      </div>
    </form>
  );
}
