import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { ImageManager } from '../components/ImageManager';
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
} from '../components/ui';
import { ApiClientError, isForbiddenError, isUnauthorizedError } from '../lib/api';
import { canManageVariants } from '../permissions';
import { getVariantLabelPreview, openPrintableHtml } from '../services/labels';
import { listProducts } from '../services/products';
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
  sku: '',
  precio_venta: 0,
  precio_compra_referencia: 0,
  stock_minimo: 0,
};

function currency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
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
    sku: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<Variant | null>(null);
  const [selected, setSelected] = useState<Variant | null>(null);
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
      setVariants(variantsData);
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
    void loadData({ buscar: '', producto: '', estado: '', codigoQr: '', sku: '' });
  }, [token]);

  function startEdit(variant: Variant) {
    setEditing(variant);
    setSelected(variant);
    setForm({
      id_producto: variant.producto.idProducto,
      talla: variant.talla ?? '',
      color: variant.color ?? '',
      sku: variant.sku,
      precio_venta: variant.precioVenta,
      precio_compra_referencia: variant.precioCompraReferencia,
      stock_minimo: variant.stockMinimo,
    });
    setFormError(null);
    setSuccess(null);
  }

  function resetForm() {
    setEditing(null);
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
      setSuccess(editing ? 'Variante actualizada.' : 'Variante creada.');
      setSelected(saved);
      resetForm();
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
      const updated = await updateVariantStatus(token, variant.idVariante, nextStatus);
      setSuccess('Estado de la variante actualizado.');
      setSelected(updated);
      await loadData();
    } catch (statusError) {
      await handleError(statusError);
    }
  }

  async function findByQr() {
    if (!token || !filters.codigoQr?.trim()) return;
    setFormError(null);
    setSuccess(null);

    try {
      const variant = await getVariantByQr(token, filters.codigoQr);
      setVariants([variant]);
      setSelected(variant);
      setSuccess('Variante encontrada por codigo QR.');
    } catch (qrError) {
      await handleError(qrError);
    }
  }

  async function openLabel(variant: Variant) {
    if (!token) return;
    setFormError(null);

    try {
      const html = await getVariantLabelPreview(token, variant.idVariante);
      if (!openPrintableHtml(html, `Etiqueta ${variant.codigoQr}`)) {
        setFormError('El navegador bloqueo la nueva pestana de etiqueta.');
      }
    } catch (labelError) {
      await handleError(labelError);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Variantes"
        description="Gestiona tallas, colores, precios de referencia y etiquetas. El stock actual es solo consultivo."
      />

      <div className="rounded-md border border-stone-200 bg-white p-4">
        <form
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_160px_160px_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void loadData();
          }}
        >
          <input
            value={filters.buscar ?? ''}
            onChange={(event) => setFilters({ ...filters, buscar: event.target.value })}
            placeholder="Buscar variante"
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
          <input
            value={filters.codigoQr ?? ''}
            onChange={(event) => setFilters({ ...filters, codigoQr: event.target.value })}
            placeholder="Codigo QR"
            className={inputClassName}
          />
          <button type="submit" className={secondaryButtonClassName}>
            Buscar
          </button>
          <button
            type="button"
            onClick={() => void findByQr()}
            className={secondaryButtonClassName}
          >
            Buscar QR
          </button>
        </form>
      </div>

      {error && <ErrorMessage message={error} />}
      {formError && <ErrorMessage message={formError} />}
      {success && <SuccessMessage message={success} />}

      {canManage && (
        <VariantForm
          form={form}
          products={products}
          editing={editing}
          isSaving={isSaving}
          onCancel={resetForm}
          onChange={setForm}
          onSubmit={(event) => void handleSubmit(event)}
        />
      )}

      {!canManage && (
        <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">
          Tu rol permite consultar variantes. Crear, editar e inactivar es administrativo.
        </div>
      )}

      {selected && (
        <ImageManager
          owner="variante"
          id={selected.idVariante}
          canManage={canManage}
          onSessionExpired={onSessionExpired}
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
                    <p className="font-medium text-stone-950">
                      {variant.producto.nombreProducto ?? 'Producto sin nombre'}
                    </p>
                    <p className="text-xs text-stone-500">
                      Talla {variant.talla ?? 'Unica'} / Color {variant.color ?? 'Sin color'} / SKU{' '}
                      {variant.sku}
                    </p>
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
                        onClick={() => setSelected(variant)}
                        className={secondaryButtonClassName}
                      >
                        Imagen
                      </button>
                      <button
                        type="button"
                        onClick={() => void openLabel(variant)}
                        className={secondaryButtonClassName}
                      >
                        Ver etiqueta
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(variant)}
                            className={secondaryButtonClassName}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleStatus(variant)}
                            className={secondaryButtonClassName}
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
  onCancel,
  onChange,
  onSubmit,
}: {
  form: VariantFormValues;
  products: Product[];
  editing: Variant | null;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: VariantFormValues) => void;
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Producto">
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
        <Field label="SKU">
          <input
            value={form.sku}
            onChange={(event) => onChange({ ...form, sku: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Precio venta">
          <input
            type="number"
            min={0}
            step={1}
            value={form.precio_venta}
            onChange={(event) => onChange({ ...form, precio_venta: Number(event.target.value) })}
            className={inputClassName}
          />
        </Field>
        <Field label="Precio compra referencia">
          <input
            type="number"
            min={0}
            step={1}
            value={form.precio_compra_referencia}
            onChange={(event) =>
              onChange({ ...form, precio_compra_referencia: Number(event.target.value) })
            }
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
            className={inputClassName}
          />
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
