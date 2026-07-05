import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { EntityImageThumb } from '../components/EntityImageThumb';
import { FileImagePreview } from '../components/FileImagePreview';
import { ImageManager } from '../components/ImageManager';
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
import { canManageProducts } from '../permissions';
import { listCategories } from '../services/categories';
import {
  createProduct,
  listProducts,
  updateProduct,
  updateProductStatus,
  type ProductFilters,
} from '../services/products';
import { uploadImage } from '../services/images';
import type { Category, Product, ProductFormValues, ProductStatus } from '../types';

const emptyProductForm: ProductFormValues = {
  nombre_producto: '',
  id_categoria: '',
  descripcion: '',
  marca: '',
  visible_catalogo: false,
};

function handleImageSaveMessage(error: unknown): string {
  if (isForbiddenError(error)) return 'No tienes permisos para subir la imagen.';
  return error instanceof ApiClientError ? error.message : 'No se pudo guardar la imagen.';
}

export function ProductsPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, user, logout } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<ProductFilters>({ buscar: '', categoria: '', estado: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [form, setForm] = useState<ProductFormValues>(emptyProductForm);
  const canManage = user ? canManageProducts(user.rol) : false;

  async function handleError(actionError: unknown) {
    if (isUnauthorizedError(actionError)) {
      await logout();
      onSessionExpired();
      return;
    }

    setFormError(
      isForbiddenError(actionError)
        ? 'No tienes permisos para esta accion.'
        : actionError instanceof ApiClientError
          ? actionError.message
          : 'No se pudo completar la operacion.',
    );
  }

  async function loadData(nextFilters = filters) {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const [productsData, categoriesData] = await Promise.all([
        listProducts(token, nextFilters),
        listCategories(token, ''),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      if (!form.id_categoria && categoriesData[0]) {
        setForm((current) => ({ ...current, id_categoria: categoriesData[0].idCategoria }));
      }
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        await logout();
        onSessionExpired();
        return;
      }

      setError(
        loadError instanceof ApiClientError ? loadError.message : 'No se pudo cargar productos.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData({ buscar: '', categoria: '', estado: '' });
  }, [token]);

  function startEdit(product: Product) {
    setEditing(product);
    setForm({
      nombre_producto: product.nombreProducto,
      id_categoria: product.categoria.idCategoria,
      descripcion: product.descripcion ?? '',
      marca: product.marca ?? '',
      visible_catalogo: product.visibleCatalogo,
    });
    setFormError(null);
    setSuccess(null);
    setPendingImageFile(null);
    setIsFormOpen(true);
  }

  function resetForm() {
    setEditing(null);
    setIsFormOpen(false);
    setPendingImageFile(null);
    setForm({
      ...emptyProductForm,
      id_categoria: categories[0]?.idCategoria ?? '',
    });
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !canManage) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    try {
      const saved = editing
        ? await updateProduct(token, editing.idProducto, form)
        : await createProduct(token, form);
      let imageErrorMessage: string | null = null;
      if (pendingImageFile) {
        try {
          await uploadImage(token, 'producto', saved.idProducto, pendingImageFile);
        } catch (uploadError) {
          imageErrorMessage = handleImageSaveMessage(uploadError);
        }
      }
      setSuccess(
        `${editing ? 'Producto actualizado.' : 'Producto creado.'}${
          imageErrorMessage
            ? ' La imagen no se pudo guardar; intenta subirla de nuevo desde Editar.'
            : ''
        }`,
      );
      resetForm();
      if (imageErrorMessage) setFormError(imageErrorMessage);
      await loadData();
    } catch (saveError) {
      await handleError(saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(product: Product) {
    if (!token || !canManage) return;
    const nextStatus: ProductStatus = product.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    setFormError(null);
    setSuccess(null);

    try {
      await updateProductStatus(token, product.idProducto, nextStatus);
      setSuccess('Estado del producto actualizado.');
      await loadData();
    } catch (statusError) {
      await handleError(statusError);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Productos"
        description="Gestiona productos base. El stock se administra unicamente desde variantes e inventario."
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
              Crear producto
            </button>
          )
        }
      />

      <div className="rounded-md border border-stone-200 bg-white p-4">
        <form
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_160px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void loadData();
          }}
        >
          <input
            value={filters.buscar ?? ''}
            onChange={(event) => setFilters({ ...filters, buscar: event.target.value })}
            placeholder="Buscar por nombre o marca"
            className={inputClassName}
          />
          <select
            value={filters.categoria ?? ''}
            onChange={(event) => setFilters({ ...filters, categoria: event.target.value })}
            className={inputClassName}
          >
            <option value="">Todas las categorias</option>
            {categories.map((category) => (
              <option key={category.idCategoria} value={category.idCategoria}>
                {category.nombreCategoria}
              </option>
            ))}
          </select>
          <select
            value={filters.estado ?? ''}
            onChange={(event) =>
              setFilters({ ...filters, estado: event.target.value as ProductStatus | '' })
            }
            className={inputClassName}
          >
            <option value="">Todos</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
          <button type="submit" className={secondaryButtonClassName}>
            Buscar
          </button>
        </form>
      </div>

      {error && <ErrorMessage message={error} />}
      {formError && <ErrorMessage message={formError} />}
      {success && <SuccessMessage message={success} />}

      {canManage && isFormOpen && (
        <Modal title={editing ? 'Editar producto' : 'Crear producto'} onClose={resetForm}>
          <ProductForm
            form={form}
            categories={categories}
            editing={editing}
            isSaving={isSaving}
            pendingImageFile={pendingImageFile}
            onSessionExpired={onSessionExpired}
            onCancel={resetForm}
            onChange={setForm}
            onImageChange={setPendingImageFile}
            onSubmit={(event) => void handleSubmit(event)}
          />
        </Modal>
      )}

      {!canManage && (
        <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">
          Tu rol permite consultar productos. Crear, editar e inactivar es administrativo.
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : products.length === 0 ? (
        <EmptyState message="No hay productos para mostrar." />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Catalogo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {products.map((product) => (
                <tr key={product.idProducto}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <EntityImageThumb
                        owner="producto"
                        id={product.idProducto}
                        alt={product.nombreProducto}
                      />
                      <div>
                        <p className="font-medium text-stone-950">{product.nombreProducto}</p>
                        <p className="text-xs text-stone-500">{product.marca ?? 'Sin marca'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {product.categoria.nombreCategoria ?? 'Sin categoria'}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {product.visibleCatalogo ? 'Visible' : 'Oculto'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={product.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(product)}
                            className={secondaryButtonClassName}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleStatus(product)}
                            className={secondaryButtonClassName}
                          >
                            {product.estado === 'ACTIVO' ? 'Inactivar' : 'Activar'}
                          </button>
                        </>
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

function ProductForm({
  form,
  categories,
  editing,
  isSaving,
  pendingImageFile,
  onSessionExpired,
  onCancel,
  onChange,
  onImageChange,
  onSubmit,
}: {
  form: ProductFormValues;
  categories: Category[];
  editing: Product | null;
  isSaving: boolean;
  pendingImageFile: File | null;
  onSessionExpired: () => void;
  onCancel: () => void;
  onChange: (form: ProductFormValues) => void;
  onImageChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-950">
          {editing ? 'Editar producto' : 'Crear producto'}
        </h2>
        {editing && (
          <button type="button" onClick={onCancel} className={secondaryButtonClassName}>
            Cancelar
          </button>
        )}
      </div>

      {editing && (
        <div className="mb-4">
          <ImageManager
            owner="producto"
            id={editing.idProducto}
            canManage
            onSessionExpired={onSessionExpired}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre producto" required>
          <input
            required
            value={form.nombre_producto}
            onChange={(event) => onChange({ ...form, nombre_producto: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Categoria" required>
          <select
            required
            value={form.id_categoria}
            onChange={(event) => onChange({ ...form, id_categoria: event.target.value })}
            className={inputClassName}
          >
            <option value="">Selecciona categoria</option>
            {categories.map((category) => (
              <option key={category.idCategoria} value={category.idCategoria}>
                {category.nombreCategoria}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Marca">
          <input
            value={form.marca}
            onChange={(event) => onChange({ ...form, marca: event.target.value })}
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
        <Field label="Imagen">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onImageChange(event.target.files?.[0] ?? null)
            }
            className={inputClassName}
          />
          <p className="mt-1 text-xs text-stone-500">
            {pendingImageFile
              ? `Lista para subir: ${pendingImageFile.name}`
              : 'Opcional. Se sube al backend despues de guardar.'}
          </p>
          <FileImagePreview file={pendingImageFile} />
        </Field>
        <label className="flex items-center gap-3 self-end text-sm text-stone-700">
          <input
            type="checkbox"
            checked={form.visible_catalogo}
            onChange={(event) => onChange({ ...form, visible_catalogo: event.target.checked })}
            className="h-4 w-4"
          />
          Visible en catalogo
        </label>
      </div>

      <div className="mt-4">
        <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
          {isSaving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  );
}
