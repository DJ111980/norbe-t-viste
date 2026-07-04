import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { EntityImageThumb } from '../components/EntityImageThumb';
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
import { canManageInventory } from '../permissions';
import {
  getInventoryVariant,
  listInventoryMovements,
  listInventoryVariants,
  listVariantInventoryMovements,
  registerInitialInventory,
  registerInventoryAdjustment,
  type InventoryFilters,
  type MovementFilters,
} from '../services/inventory';
import type {
  InitialInventoryFormValues,
  InventoryAdjustmentFormValues,
  InventoryMovement,
  InventoryMovementType,
  InventoryVariant,
  VariantStatus,
} from '../types';

const movementTypes: InventoryMovementType[] = [
  'LOTE_ENTRADA',
  'INVENTARIO_INICIAL',
  'AJUSTE_POSITIVO',
  'AJUSTE_NEGATIVO',
  'VENTA',
  'ANULACION_VENTA',
  'DEVOLUCION',
];

const emptyInitialForm: InitialInventoryFormValues = {
  id_variante: '',
  cantidad_inicial: 1,
  motivo: '',
};

const emptyAdjustmentForm: InventoryAdjustmentFormValues = {
  id_variante: '',
  tipo_ajuste: 'AJUSTE_POSITIVO',
  cantidad: 1,
  motivo: '',
};

function variantLabel(variant: InventoryVariant): string {
  return `${variant.producto.nombreProducto} / ${variant.talla ?? 'Unica'} / ${
    variant.color ?? 'Sin color'
  } / ${variant.sku}`;
}

function handleMessage(error: unknown, fallback: string): string {
  if (isForbiddenError(error)) return 'No tienes permisos para esta accion.';
  return error instanceof ApiClientError ? error.message : fallback;
}

export function InventoryPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, user, logout } = useAuth();
  const [variants, setVariants] = useState<InventoryVariant[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [variantMovements, setVariantMovements] = useState<InventoryMovement[]>([]);
  const [selected, setSelected] = useState<InventoryVariant | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({ buscar: '', estado: '' });
  const [movementFilters, setMovementFilters] = useState<MovementFilters>({ tipoMovimiento: '' });
  const [initialForm, setInitialForm] = useState<InitialInventoryFormValues>(emptyInitialForm);
  const [adjustmentForm, setAdjustmentForm] =
    useState<InventoryAdjustmentFormValues>(emptyAdjustmentForm);
  const [activeInventoryForm, setActiveInventoryForm] = useState<'initial' | 'adjustment' | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isMovementsLoading, setIsMovementsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canManage = user ? canManageInventory(user.rol) : false;

  const selectableVariants = useMemo(
    () => variants.filter((variant) => variant.estado === 'ACTIVA'),
    [variants],
  );

  async function expireIfNeeded(actionError: unknown): Promise<boolean> {
    if (!isUnauthorizedError(actionError)) return false;
    await logout();
    onSessionExpired();
    return true;
  }

  async function loadInventory(nextFilters = filters) {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await listInventoryVariants(token, nextFilters);
      setVariants(data);
      const first = data[0];
      if (!initialForm.id_variante && first) {
        setInitialForm((current) => ({ ...current, id_variante: first.idVariante }));
        setAdjustmentForm((current) => ({ ...current, id_variante: first.idVariante }));
      }
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setError(handleMessage(loadError, 'No se pudo cargar inventario.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMovements(nextFilters = movementFilters) {
    if (!token || !canManage) return;
    setIsMovementsLoading(true);

    try {
      setMovements(await listInventoryMovements(token, nextFilters));
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setFormError(handleMessage(loadError, 'No se pudo cargar movimientos.'));
    } finally {
      setIsMovementsLoading(false);
    }
  }

  async function selectVariant(variant: InventoryVariant) {
    if (!token) return;
    setSelected(variant);
    setVariantMovements([]);
    setFormError(null);

    try {
      const detail = await getInventoryVariant(token, variant.idVariante);
      setSelected(detail);
      if (canManage) {
        setVariantMovements(await listVariantInventoryMovements(token, variant.idVariante));
      }
    } catch (detailError) {
      if (await expireIfNeeded(detailError)) return;
      setFormError(handleMessage(detailError, 'No se pudo cargar el detalle de inventario.'));
    }
  }

  useEffect(() => {
    void loadInventory({ buscar: '', estado: '' });
  }, [token]);

  useEffect(() => {
    if (canManage) void loadMovements({ tipoMovimiento: '' });
  }, [canManage, token]);

  async function submitInitialInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !canManage || initialForm.cantidad_inicial <= 0) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    try {
      const result = await registerInitialInventory(token, initialForm);
      setSuccess(`Inventario inicial registrado: ${result.total_unidades_ingresadas} unidades.`);
      setInitialForm({ ...emptyInitialForm, id_variante: initialForm.id_variante });
      await loadInventory();
      await loadMovements();
      setActiveInventoryForm(null);
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setFormError(handleMessage(saveError, 'No se pudo registrar inventario inicial.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !canManage || adjustmentForm.cantidad <= 0) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    try {
      const result = await registerInventoryAdjustment(token, adjustmentForm);
      setSuccess(`Ajuste registrado. Stock: ${result.stock_antes} -> ${result.stock_despues}.`);
      setAdjustmentForm({ ...emptyAdjustmentForm, id_variante: adjustmentForm.id_variante });
      await loadInventory();
      await loadMovements();
      setActiveInventoryForm(null);
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setFormError(handleMessage(saveError, 'No se pudo registrar ajuste.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Consulta stock por variante y movimientos. El stock no se edita directamente."
      />

      <div className="rounded-md border border-stone-200 bg-white p-4">
        <form
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void loadInventory();
          }}
        >
          <input
            value={filters.buscar ?? ''}
            onChange={(event) => setFilters({ ...filters, buscar: event.target.value })}
            placeholder="Buscar por producto, SKU o QR"
            className={inputClassName}
          />
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

      {canManage && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveInventoryForm('initial')}
            className={secondaryButtonClassName}
          >
            Inventario inicial
          </button>
          <button
            type="button"
            onClick={() => setActiveInventoryForm('adjustment')}
            className={secondaryButtonClassName}
          >
            Ajuste de inventario
          </button>
        </div>
      )}

      {activeInventoryForm === 'initial' && (
        <Modal title="Inventario inicial" onClose={() => setActiveInventoryForm(null)} size="md">
          <InventoryInitialForm
            form={initialForm}
            variants={selectableVariants}
            isSaving={isSaving}
            onChange={setInitialForm}
            onSubmit={(event) => void submitInitialInventory(event)}
          />
        </Modal>
      )}

      {activeInventoryForm === 'adjustment' && (
        <Modal title="Ajuste de inventario" onClose={() => setActiveInventoryForm(null)} size="md">
          <InventoryAdjustmentForm
            form={adjustmentForm}
            variants={selectableVariants}
            isSaving={isSaving}
            onChange={setAdjustmentForm}
            onSubmit={(event) => void submitAdjustment(event)}
          />
        </Modal>
      )}

      {!canManage && (
        <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">
          Tu rol permite consultar inventario. Inventario inicial y ajustes son administrativos.
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : variants.length === 0 ? (
        <EmptyState message="No hay variantes en inventario para mostrar." />
      ) : (
        <InventoryTable variants={variants} selected={selected} onSelect={selectVariant} />
      )}

      {selected && (
        <Modal title={`Inventario ${selected.sku}`} onClose={() => setSelected(null)} size="xl">
          <InventoryDetail
            variant={selected}
            movements={variantMovements}
            showMovements={canManage}
          />
        </Modal>
      )}

      {canManage && (
        <section className="space-y-3">
          <div className="flex flex-col gap-3 rounded-md border border-stone-200 bg-white p-4 md:flex-row md:items-center">
            <p className="text-sm font-semibold text-stone-950">Movimientos generales</p>
            <select
              value={movementFilters.tipoMovimiento ?? ''}
              onChange={(event) =>
                setMovementFilters({
                  tipoMovimiento: event.target.value as InventoryMovementType | '',
                })
              }
              className={inputClassName}
            >
              <option value="">Todos los tipos</option>
              {movementTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void loadMovements()}
              className={secondaryButtonClassName}
            >
              Filtrar
            </button>
          </div>
          {isMovementsLoading ? (
            <LoadingState />
          ) : (
            <MovementList movements={movements} emptyMessage="No hay movimientos generales." />
          )}
        </section>
      )}
    </section>
  );
}

function InventoryTable({
  variants,
  selected,
  onSelect,
}: {
  variants: InventoryVariant[];
  selected: InventoryVariant | null;
  onSelect: (variant: InventoryVariant) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-stone-200 bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Variante</th>
            <th className="px-4 py-3">QR</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Accion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {variants.map((variant) => (
            <tr key={variant.idVariante}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <EntityImageThumb owner="variante" id={variant.idVariante} />
                  <div className="min-w-0">
                    <p className="font-medium text-stone-950">{variant.producto.nombreProducto}</p>
                    <p className="text-xs text-stone-500">
                      Talla {variant.talla ?? 'Unica'} / Color {variant.color ?? 'Sin color'} / SKU{' '}
                      {variant.sku}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-stone-700">{variant.codigoQr}</td>
              <td className="px-4 py-3 text-stone-700">
                <span className="font-semibold">{variant.stockActual}</span>
                <span className="text-xs text-stone-500"> / minimo {variant.stockMinimo}</span>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={variant.estado} />
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => void onSelect(variant)}
                  className={
                    selected?.idVariante === variant.idVariante
                      ? primaryButtonClassName
                      : secondaryButtonClassName
                  }
                >
                  Ver detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryDetail({
  variant,
  movements,
  showMovements,
}: {
  variant: InventoryVariant;
  movements: InventoryMovement[];
  showMovements: boolean;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-md border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-950">Detalle de variante</h2>
        <div className="mt-4">
          <EntityImageThumb owner="variante" id={variant.idVariante} />
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          <Info label="Producto" value={variant.producto.nombreProducto} />
          <Info label="SKU" value={variant.sku} />
          <Info label="Codigo QR" value={variant.codigoQr} />
          <Info label="Talla" value={variant.talla ?? 'Unica'} />
          <Info label="Color" value={variant.color ?? 'Sin color'} />
          <Info label="Stock actual" value={String(variant.stockActual)} />
          <Info label="Stock minimo" value={String(variant.stockMinimo)} />
          <Info label="Estado" value={variant.estado} />
        </dl>
      </div>
      {showMovements && (
        <MovementList
          movements={movements}
          emptyMessage="Esta variante no tiene movimientos para mostrar."
        />
      )}
    </section>
  );
}

function MovementList({
  movements,
  emptyMessage,
}: {
  movements: InventoryMovement[];
  emptyMessage: string;
}) {
  if (movements.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <div className="overflow-x-auto rounded-md border border-stone-200 bg-white">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Movimiento</th>
            <th className="px-4 py-3">Variante</th>
            <th className="px-4 py-3">Cantidad</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {movements.map((movement) => (
            <tr key={movement.idMovimiento}>
              <td className="px-4 py-3">
                <p className="font-medium text-stone-950">{movement.tipoMovimiento}</p>
                <p className="text-xs text-stone-500">{movement.motivo ?? 'Sin motivo'}</p>
              </td>
              <td className="px-4 py-3 text-stone-600">
                {movement.producto.nombreProducto} / {movement.variante.sku}
              </td>
              <td className="px-4 py-3 text-stone-700">{movement.cantidad}</td>
              <td className="px-4 py-3 text-stone-700">
                {movement.stockAntes} {'->'} {movement.stockDespues}
              </td>
              <td className="px-4 py-3 text-stone-600">
                {new Date(movement.creadoEn).toLocaleString('es-CO')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryInitialForm({
  form,
  variants,
  isSaving,
  onChange,
  onSubmit,
}: {
  form: InitialInventoryFormValues;
  variants: InventoryVariant[];
  isSaving: boolean;
  onChange: (form: InitialInventoryFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <h2 className="text-sm font-semibold text-stone-950">Inventario inicial</h2>
      <div className="mt-4 grid gap-3">
        <VariantSelect
          value={form.id_variante}
          variants={variants}
          onChange={(idVariante) => onChange({ ...form, id_variante: idVariante })}
        />
        <Field label="Cantidad inicial">
          <input
            required
            type="number"
            min={1}
            step={1}
            value={form.cantidad_inicial}
            onChange={(event) =>
              onChange({ ...form, cantidad_inicial: Number(event.target.value) })
            }
            className={inputClassName}
          />
        </Field>
        <Field label="Motivo">
          <textarea
            required
            value={form.motivo}
            onChange={(event) => onChange({ ...form, motivo: event.target.value })}
            className={textareaClassName}
          />
        </Field>
        <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
          Registrar inicial
        </button>
      </div>
    </form>
  );
}

function InventoryAdjustmentForm({
  form,
  variants,
  isSaving,
  onChange,
  onSubmit,
}: {
  form: InventoryAdjustmentFormValues;
  variants: InventoryVariant[];
  isSaving: boolean;
  onChange: (form: InventoryAdjustmentFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <h2 className="text-sm font-semibold text-stone-950">Ajuste de inventario</h2>
      <div className="mt-4 grid gap-3">
        <VariantSelect
          value={form.id_variante}
          variants={variants}
          onChange={(idVariante) => onChange({ ...form, id_variante: idVariante })}
        />
        <Field label="Tipo de ajuste">
          <select
            value={form.tipo_ajuste}
            onChange={(event) =>
              onChange({
                ...form,
                tipo_ajuste: event.target.value as InventoryAdjustmentFormValues['tipo_ajuste'],
              })
            }
            className={inputClassName}
          >
            <option value="AJUSTE_POSITIVO">Ajuste positivo</option>
            <option value="AJUSTE_NEGATIVO">Ajuste negativo</option>
          </select>
        </Field>
        <Field label="Cantidad">
          <input
            required
            type="number"
            min={1}
            step={1}
            value={form.cantidad}
            onChange={(event) => onChange({ ...form, cantidad: Number(event.target.value) })}
            className={inputClassName}
          />
        </Field>
        <Field label="Motivo">
          <textarea
            required
            value={form.motivo}
            onChange={(event) => onChange({ ...form, motivo: event.target.value })}
            className={textareaClassName}
          />
        </Field>
        <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
          Registrar ajuste
        </button>
      </div>
    </form>
  );
}

function VariantSelect({
  value,
  variants,
  onChange,
}: {
  value: string;
  variants: InventoryVariant[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Variante">
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      >
        <option value="">Selecciona variante</option>
        {variants.map((variant) => (
          <option key={variant.idVariante} value={variant.idVariante}>
            {variantLabel(variant)}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-stone-500">{label}</dt>
      <dd className="mt-1 font-medium text-stone-900">{value}</dd>
    </div>
  );
}
