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
import { canManageCategories } from '../permissions';
import {
  createCategory,
  listCategories,
  updateCategory,
  updateCategoryStatus,
} from '../services/categories';
import type { Category, CategoryFormValues } from '../types';

const emptyCategoryForm: CategoryFormValues = {
  nombre_categoria: '',
  descripcion: '',
};

export function CategoriesPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, user, logout } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [buscar, setBuscar] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<CategoryFormValues>(emptyCategoryForm);
  const canManage = user ? canManageCategories(user.rol) : false;

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
      setCategories(await listCategories(token, search));
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        await logout();
        onSessionExpired();
        return;
      }

      setError(
        loadError instanceof ApiClientError ? loadError.message : 'No se pudo cargar categorias.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData('');
  }, [token]);

  function startEdit(category: Category) {
    setEditing(category);
    setForm({
      nombre_categoria: category.nombreCategoria,
      descripcion: category.descripcion ?? '',
    });
    setFormError(null);
    setSuccess(null);
    setIsFormOpen(true);
  }

  function resetForm() {
    setEditing(null);
    setIsFormOpen(false);
    setForm(emptyCategoryForm);
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
        await updateCategory(token, editing.idCategoria, form);
        setSuccess('Categoria actualizada.');
      } else {
        await createCategory(token, form);
        setSuccess('Categoria creada.');
      }

      resetForm();
      await loadData();
    } catch (saveError) {
      await handleError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(category: Category) {
    if (!token || !canManage) return;

    setFormError(null);
    setSuccess(null);

    try {
      await updateCategoryStatus(
        token,
        category.idCategoria,
        category.estado === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA',
      );
      setSuccess('Estado de la categoria actualizado.');
      await loadData();
    } catch (statusError) {
      await handleError(statusError);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Categorias"
        description="Consulta y administra categorias de producto."
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
              Crear categoria
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
            placeholder="Buscar categoria"
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
        <Modal title={editing ? 'Editar categoria' : 'Crear categoria'} onClose={resetForm}>
          <CategoryForm
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
          Tu rol permite consultar categorias. Las acciones de crear, editar y cambiar estado son
          administrativas.
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : categories.length === 0 ? (
        <EmptyState message="No hay categorias para mostrar." />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Descripcion</th>
                <th className="px-4 py-3">Estado</th>
                {canManage && <th className="px-4 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {categories.map((category) => (
                <tr key={category.idCategoria}>
                  <td className="px-4 py-3 font-medium text-stone-950">
                    {category.nombreCategoria}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {category.descripcion ?? 'Sin descripcion'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={category.estado} />
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          className={secondaryButtonClassName}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleStatus(category)}
                          className={secondaryButtonClassName}
                        >
                          {category.estado === 'ACTIVA' ? 'Inactivar' : 'Activar'}
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

function CategoryForm({
  form,
  editing,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
}: {
  form: CategoryFormValues;
  editing: Category | null;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: CategoryFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-950">
          {editing ? 'Editar categoria' : 'Crear categoria'}
        </h2>
        {editing && (
          <button type="button" onClick={onCancel} className={secondaryButtonClassName}>
            Cancelar
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre categoria" required>
          <input
            required
            value={form.nombre_categoria}
            onChange={(event) => onChange({ ...form, nombre_categoria: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Descripcion">
          <textarea
            value={form.descripcion}
            onChange={(event) => onChange({ ...form, descripcion: event.target.value })}
            className={textareaClassName}
          />
        </Field>
      </div>

      <div className="mt-4">
        <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
          {isSaving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear categoria'}
        </button>
      </div>
    </form>
  );
}
