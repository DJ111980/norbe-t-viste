import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { EntityImageThumb } from '../components/EntityImageThumb';
import { FileImagePreview } from '../components/FileImagePreview';
import { ImageManager } from '../components/ImageManager';
import { Modal } from '../components/Modal';
import { PrintableHtmlModal } from '../components/PrintableHtmlModal';
import {
  EmptyState,
  ErrorMessage,
  Field,
  inputClassName,
  LoadingState,
  numberInputFocusProps,
  PageHeader,
  primaryButtonClassName,
  secondaryButtonClassName,
  StatusBadge,
  SuccessMessage,
} from '../components/ui';
import { ApiClientError, isForbiddenError, isUnauthorizedError } from '../lib/api';
import { formatMoney } from '../lib/formatters';
import { canManageVariants } from '../permissions';
import { getBatchVariantLabelPreview } from '../services/labels';
import { listProducts } from '../services/products';
import { uploadImage } from '../services/images';
import {
  createVariant,
  getVariantByQr,
  listVariants,
  updateVariant,
  updateVariantStatus,
  type VariantFilters,
} from '../services/variants';
import type { Product, Variant, VariantFormValues, VariantStatus } from '../types';

const emptyVariantForm: VariantFormValues = {
  id_producto: '',
  talla: '',
  color: '',
  precio_venta: 0,
  stock_minimo: 0,
};

const compactActionButtonClassName =
  'h-8 rounded-md border border-stone-300 bg-white px-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50';

const currency = formatMoney;

function handleImageSaveMessage(error: unknown): string {
  if (isForbiddenError(error)) return 'No tienes permisos para subir la imagen.';
  return error instanceof ApiClientError ? error.message : 'No se pudo guardar la imagen.';
}

function getQrCandidates(value: string): string[] {
  const query = value.trim();
  if (!query) return [];
  const candidates = [query];
  if (/^\d+$/.test(query)) {
    candidates.push(`NTV-VAR-${query.padStart(6, '0')}`);
  }
  return Array.from(new Set(candidates));
}

export function VariantsPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, user, logout } = useAuth();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<VariantFilters>({
    buscar: '',
    producto: '',
    estado: '',
    codigoQr: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<Variant | null>(null);
  const [labelTarget, setLabelTarget] = useState<Variant | null>(null);
  const [labelQuantity, setLabelQuantity] = useState(1);
  const [labelPreview, setLabelPreview] = useState<{
    title: string;
    html: string;
    summary: { total: number; items: Array<{ label: string; cantidad: number }> };
  } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [form, setForm] = useState<VariantFormValues>(emptyVariantForm);
  const canManage = user ? canManageVariants(user.rol) : false;

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
      const [variantsData, productsData] = await Promise.all([
        listVariants(token, nextFilters),
        listProducts(token, { estado: 'ACTIVO' }),
      ]);
      let resolvedVariants = variantsData;
      const search = nextFilters.buscar?.trim() ?? '';
      if (search && variantsData.length === 0) {
        for (const qrCandidate of getQrCandidates(search)) {
          try {
            const variant = await getVariantByQr(token, qrCandidate);
            resolvedVariants = [variant];
            break;
          } catch {
            // La busqueda general ya cubre coincidencias comunes; este intento resuelve QR abreviados.
          }
        }
      }
      setVariants(resolvedVariants);
      setProducts(productsData);
      if (!form.id_producto && productsData[0]) {
        setForm((current) => ({ ...current, id_producto: productsData[0].idProducto }));
      }
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        await logout();
        onSessionExpired();
        return;
      }

      setError(
        loadError instanceof ApiClientError ? loadError.message : 'No se pudo cargar variantes.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData({ buscar: '', producto: '', estado: '', codigoQr: '' });
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData(filters);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [filters.buscar, filters.producto, filters.estado, token]);

  function startEdit(variant: Variant) {
    setEditing(variant);
    setForm({
      id_producto: variant.producto.idProducto,
      talla: variant.talla ?? '',
      color: variant.color ?? '',
      precio_venta: variant.precioVenta,
      stock_minimo: variant.stockMinimo,
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
    setForm({ ...emptyVariantForm, id_producto: products[0]?.idProducto ?? '' });
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
        ? await updateVariant(token, editing.idVariante, form)
        : await createVariant(token, form);
      let imageErrorMessage: string | null = null;
      if (pendingImageFile) {
        try {
          await uploadImage(token, 'variante', saved.idVariante, pendingImageFile);
        } catch (uploadError) {
          imageErrorMessage = handleImageSaveMessage(uploadError);
        }
      }
      setSuccess(
        `${editing ? 'Variante actualizada.' : 'Variante creada.'}${
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

  async function toggleStatus(variant: Variant) {
    if (!token || !canManage) return;
    const nextStatus: VariantStatus = variant.estado === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA';
    setFormError(null);
    setSuccess(null);

    try {
      await updateVariantStatus(token, variant.idVariante, nextStatus);
      setSuccess('Estado de la variante actualizado.');
      await loadData();
    } catch (statusError) {
      await handleError(statusError);
    }
  }

  function configureLabel(variant: Variant) {
    setLabelTarget(variant);
    setLabelQuantity(Math.max(variant.stockActual, 1));
    setFormError(null);
  }

  async function openLabel() {
    if (!token) return;
    if (!labelTarget) return;
    if (!Number.isInteger(labelQuantity) || labelQuantity < 1) {
      setFormError('La cantidad de etiquetas debe ser un entero mayor que 0.');
      return;
    }
    setFormError(null);

    try {
      const html = await getBatchVariantLabelPreview(token, [
        { id_variante: labelTarget.idVariante, cantidad: labelQuantity },
      ]);
      setLabelPreview({
        title: `Etiqueta ${labelTarget.codigoQr}`,
        html,
        summary: {
          total: labelQuantity,
          items: [
            {
              label: `${labelTarget.producto.nombreProducto ?? 'Producto'} / Talla ${labelTarget.talla ?? 'Unica'}`,
              cantidad: labelQuantity,
            },
          ],
        },
      });
      setLabelTarget(null);
    } catch (labelError) {
      await handleError(labelError);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Variantes"
        description="Gestiona tallas, colores y precio de venta. El stock actual es solo consultivo."
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
              Crear variante
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
            placeholder="Buscar por producto, talla, color o QR"
            className={inputClassName}
          />
          <select
            value={filters.producto ?? ''}
            onChange={(event) => setFilters({ ...filters, producto: event.target.value })}
            className={inputClassName}
          >
            <option value="">Todos los productos</option>
            {products.map((product) => (
              <option key={product.idProducto} value={product.idProducto}>
                {product.nombreProducto}
              </option>
            ))}
          </select>
          <select
            value={filters.estado ?? ''}
            onChange={(event) =>
              setFilters({ ...filters, estado: event.target.value as VariantStatus | '' })
            }
            className={inputClassName}
          >
            <option value="">Todas</option>
            <option value="ACTIVA">Activa</option>
            <option value="INACTIVA">Inactiva</option>
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
        <Modal title={editing ? 'Editar variante' : 'Crear variante'} onClose={resetForm}>
          <VariantForm
            form={form}
            products={products}
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
          Tu rol permite consultar variantes. Crear, editar e inactivar es administrativo.
        </div>
      )}

      {labelTarget && (
        <Modal
          title={`Etiqueta ${labelTarget.codigoQr}`}
          onClose={() => setLabelTarget(null)}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-md border border-stone-200 bg-stone-50 p-3">
              <EntityImageThumb
                owner="variante"
                id={labelTarget.idVariante}
                alt={labelTarget.producto.nombreProducto ?? labelTarget.codigoQr}
              />
              <div className="text-sm">
                <p className="font-semibold text-stone-950">
                  {labelTarget.producto.nombreProducto ?? 'Producto sin nombre'}
                </p>
                <p className="text-xs text-stone-500">
                  Stock {labelTarget.stockActual} / QR {labelTarget.codigoQr}
                </p>
              </div>
            </div>
            {labelTarget.stockActual === 0 && (
              <ErrorMessage message="La variante no tiene stock. Se sugiere 1 etiqueta para revisión manual." />
            )}
            <Field label="Cantidad de etiquetas">
              <input
                type="number"
                min={1}
                step={1}
                value={labelQuantity}
                onChange={(event) => setLabelQuantity(Number(event.target.value))}
                className={inputClassName}
              />
            </Field>
            <button
              type="button"
              onClick={() => void openLabel()}
              className={primaryButtonClassName}
            >
              Ver etiqueta
            </button>
          </div>
        </Modal>
      )}

      {labelPreview && (
        <PrintableHtmlModal
          title={labelPreview.title}
          html={labelPreview.html}
          summary={labelPreview.summary}
          onClose={() => setLabelPreview(null)}
        />
      )}

      {isLoading ? (
        <LoadingState />
      ) : variants.length === 0 ? (
        <EmptyState message="No hay variantes para mostrar." />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Variante</th>
                <th className="px-4 py-3">QR</th>
                <th className="px-4 py-3">Precio venta</th>
                <th className="px-4 py-3">Stock actual</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {variants.map((variant) => (
                <tr key={variant.idVariante}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <EntityImageThumb
                        owner="variante"
                        id={variant.idVariante}
                        alt={variant.producto.nombreProducto ?? variant.codigoQr}
                      />
                      <div>
                        <p className="font-medium text-stone-950">
                          {variant.producto.nombreProducto ?? 'Producto sin nombre'}
                        </p>
                        <p className="text-xs text-stone-500">
                          Talla {variant.talla ?? 'Unica'} / Color {variant.color ?? 'Sin color'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-700">{variant.codigoQr}</td>
                  <td className="px-4 py-3 text-stone-600">{currency(variant.precioVenta)}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {variant.stockActual} actual / {variant.stockMinimo} minimo
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={variant.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => configureLabel(variant)}
                        className={compactActionButtonClassName}
                      >
                        Etiqueta
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(variant)}
                            className={compactActionButtonClassName}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleStatus(variant)}
                            className={compactActionButtonClassName}
                          >
                            {variant.estado === 'ACTIVA' ? 'Inactivar' : 'Activar'}
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

function VariantForm({
  form,
  products,
  editing,
  isSaving,
  pendingImageFile,
  onSessionExpired,
  onCancel,
  onChange,
  onImageChange,
  onSubmit,
}: {
  form: VariantFormValues;
  products: Product[];
  editing: Variant | null;
  isSaving: boolean;
  pendingImageFile: File | null;
  onSessionExpired: () => void;
  onCancel: () => void;
  onChange: (form: VariantFormValues) => void;
  onImageChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-950">
          {editing ? 'Editar variante' : 'Crear variante'}
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
            owner="variante"
            id={editing.idVariante}
            canManage
            onSessionExpired={onSessionExpired}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Producto" required>
          <select
            required
            disabled={!!editing}
            value={form.id_producto}
            onChange={(event) => onChange({ ...form, id_producto: event.target.value })}
            className={inputClassName}
          >
            <option value="">Selecciona producto</option>
            {products.map((product) => (
              <option key={product.idProducto} value={product.idProducto}>
                {product.nombreProducto}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Talla">
          <input
            value={form.talla}
            onChange={(event) => onChange({ ...form, talla: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Color">
          <input
            value={form.color}
            onChange={(event) => onChange({ ...form, color: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Precio venta" required>
          <input
            type="number"
            min={0}
            step={1}
            value={form.precio_venta}
            onChange={(event) => onChange({ ...form, precio_venta: Number(event.target.value) })}
            {...numberInputFocusProps}
            className={inputClassName}
          />
        </Field>
        <Field label="Stock minimo">
          <input
            type="number"
            min={0}
            step={1}
            value={form.stock_minimo}
            onChange={(event) => onChange({ ...form, stock_minimo: Number(event.target.value) })}
            {...numberInputFocusProps}
            className={inputClassName}
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
      </div>

      <p className="mt-3 text-xs text-stone-500">
        El stock actual no se edita aqui; se actualiza por inventario, lotes, ventas y devoluciones.
      </p>

      <div className="mt-4">
        <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
          {isSaving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear variante'}
        </button>
      </div>
    </form>
  );
}
