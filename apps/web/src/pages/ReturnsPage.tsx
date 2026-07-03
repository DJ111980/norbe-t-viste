import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
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
import { canCreateSaleReturns } from '../permissions';
import { listSales, getSale, type SaleFilters } from '../services/sales';
import { createSaleReturn, listSaleReturns } from '../services/returns';
import type {
  SaleDetail,
  SaleLine,
  SaleReturn,
  SaleReturnFormValues,
  SaleReturnItemFormValues,
  SaleStatus,
  SaleSummary,
  SaleType,
  UserRole,
} from '../types';

const emptyReturnForm: SaleReturnFormValues = {
  motivo: '',
  detalles: [],
};

const emptyReturnItem: SaleReturnItemFormValues = {
  id_detalle_venta: '',
  cantidad_devuelta: 1,
};

export function canShowReturnForm(role: UserRole, sale: SaleDetail | null): boolean {
  return Boolean(canCreateSaleReturns(role) && sale && sale.estadoVenta !== 'ANULADA');
}

export function returnedQuantityForLine(returns: SaleReturn[], idDetalleVenta: string): number {
  return returns
    .filter((saleReturn) => saleReturn.estadoDevolucion === 'ACTIVA')
    .flatMap((saleReturn) => saleReturn.detalles)
    .filter((detail) => detail.id_detalle_venta === idDetalleVenta)
    .reduce((total, detail) => total + detail.cantidad_devuelta, 0);
}

export function availableQuantityForLine(line: SaleLine, returns: SaleReturn[]): number {
  return Math.max(line.cantidad - returnedQuantityForLine(returns, line.idDetalle), 0);
}

export function validateReturnDraft(
  form: SaleReturnFormValues,
  sale: SaleDetail | null,
  returns: SaleReturn[],
): string | null {
  if (!sale) return 'Selecciona una venta antes de registrar devolucion.';
  if (sale.estadoVenta === 'ANULADA') return 'No se puede devolver una venta anulada desde la UI.';
  if (!form.motivo.trim()) return 'El motivo de la devolucion es obligatorio.';
  if (form.detalles.length === 0) return 'Agrega al menos un detalle para devolver.';

  for (const item of form.detalles) {
    const line = sale.detalles.find((detail) => detail.idDetalle === item.id_detalle_venta);
    if (!line) return 'Selecciona una linea valida de la venta.';
    if (!Number.isInteger(item.cantidad_devuelta) || item.cantidad_devuelta <= 0) {
      return 'La cantidad devuelta debe ser un entero mayor que 0.';
    }
    if (item.cantidad_devuelta > line.cantidad) {
      return 'La cantidad devuelta no puede superar la cantidad vendida.';
    }
    if (item.cantidad_devuelta > availableQuantityForLine(line, returns)) {
      return 'La cantidad devuelta supera la cantidad disponible para devolver.';
    }
  }

  return null;
}

export function impactMessageForSaleType(type: SaleType): string {
  if (type === 'CONTADO') {
    return 'La devolucion devuelve stock. No modifica pagos automaticamente.';
  }
  if (type === 'CREDITO') {
    return 'La devolucion devuelve stock y puede reducir el saldo del credito si el backend lo permite.';
  }
  return 'La devolucion devuelve stock y puede reducir el saldo del credito. El pago inicial no se modifica automaticamente.';
}

function currency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function handleMessage(error: unknown, fallback: string): string {
  if (isForbiddenError(error)) return 'No tienes permisos para esta accion.';
  return error instanceof ApiClientError ? error.message : fallback;
}

export function ReturnsPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, user, logout } = useAuth();
  const role = user?.rol ?? 'VENDEDOR';
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [filters, setFilters] = useState<SaleFilters>({ buscar: '', estado: '', tipoVenta: '' });
  const [form, setForm] = useState<SaleReturnFormValues>(emptyReturnForm);
  const [item, setItem] = useState<SaleReturnItemFormValues>(emptyReturnItem);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectableLines = useMemo(() => {
    if (!selectedSale) return [];
    return selectedSale.detalles.filter((line) => availableQuantityForLine(line, returns) > 0);
  }, [returns, selectedSale]);

  async function expireIfNeeded(actionError: unknown): Promise<boolean> {
    if (!isUnauthorizedError(actionError)) return false;
    await logout();
    onSessionExpired();
    return true;
  }

  async function loadSales(nextFilters = filters) {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      setSales(await listSales(token, nextFilters));
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setError(handleMessage(loadError, 'No se pudieron cargar las ventas.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSaleScope(idVenta: string) {
    if (!token) return;
    setFormError(null);
    setSuccess(null);

    try {
      const [sale, saleReturns] = await Promise.all([
        getSale(token, idVenta),
        listSaleReturns(token, idVenta),
      ]);
      setSelectedSale(sale);
      setReturns(saleReturns);
      setForm(emptyReturnForm);
      setItem(emptyReturnItem);
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setFormError(handleMessage(loadError, 'No se pudo cargar la venta y sus devoluciones.'));
    }
  }

  useEffect(() => {
    void loadSales({ buscar: '', estado: '', tipoVenta: '' });
  }, [token]);

  function addReturnItem() {
    if (!selectedSale) return;
    const line = selectedSale.detalles.find((detail) => detail.idDetalle === item.id_detalle_venta);
    if (!line) {
      setFormError('Selecciona una linea valida para devolver.');
      return;
    }
    if (!Number.isInteger(item.cantidad_devuelta) || item.cantidad_devuelta <= 0) {
      setFormError('La cantidad debe ser un entero mayor que 0.');
      return;
    }
    if (form.detalles.some((detail) => detail.id_detalle_venta === item.id_detalle_venta)) {
      setFormError('No puedes repetir la misma linea en la devolucion.');
      return;
    }
    if (item.cantidad_devuelta > availableQuantityForLine(line, returns)) {
      setFormError('La cantidad supera lo disponible para devolver.');
      return;
    }

    setFormError(null);
    setForm((current) => ({ ...current, detalles: [...current.detalles, item] }));
    setItem(emptyReturnItem);
  }

  function removeReturnItem(idDetalleVenta: string) {
    setForm((current) => ({
      ...current,
      detalles: current.detalles.filter((detail) => detail.id_detalle_venta !== idDetalleVenta),
    }));
  }

  async function saveReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedSale || !canShowReturnForm(role, selectedSale)) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    const validation = validateReturnDraft(form, selectedSale, returns);
    if (validation) {
      setFormError(validation);
      setIsSaving(false);
      return;
    }

    try {
      const result = await createSaleReturn(token, selectedSale.idVenta, form);
      setSuccess(
        `Devolucion registrada por ${currency(result.total_devuelto)}. Movimientos creados: ${
          result.movimientos_creados
        }.`,
      );
      await loadSales();
      await loadSaleScope(selectedSale.idVenta);
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setFormError(handleMessage(saveError, 'No se pudo registrar la devolucion.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Devoluciones"
        description="Consulta ventas y registra devoluciones parciales. El backend devuelve stock y aplica impactos."
      />

      {error && <ErrorMessage message={error} />}
      {formError && <ErrorMessage message={formError} />}
      {success && <SuccessMessage message={success} />}

      <SaleSelector
        sales={sales}
        selectedSale={selectedSale}
        filters={filters}
        isLoading={isLoading}
        onFiltersChange={setFilters}
        onSearch={() => void loadSales()}
        onSelect={(sale) => void loadSaleScope(sale.idVenta)}
      />

      {selectedSale && (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <ReturnSaleDetail sale={selectedSale} returns={returns} />
            <ReturnHistoryList sale={selectedSale} returns={returns} />
          </div>

          <div className="space-y-4">
            <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-700">
              {impactMessageForSaleType(selectedSale.tipoVenta)}
            </div>

            {selectedSale.estadoVenta === 'ANULADA' && (
              <ErrorMessage message="Esta venta esta anulada. No se permite registrar devoluciones desde la UI." />
            )}

            {canShowReturnForm(role, selectedSale) ? (
              <ReturnForm
                sale={selectedSale}
                returns={returns}
                form={form}
                item={item}
                selectableLines={selectableLines}
                isSaving={isSaving}
                onFormChange={setForm}
                onItemChange={setItem}
                onAddItem={addReturnItem}
                onRemoveItem={removeReturnItem}
                onSubmit={(event) => void saveReturn(event)}
              />
            ) : (
              <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">
                {role === 'VENDEDOR'
                  ? 'Tu usuario puede consultar devoluciones, pero no registrar nuevas.'
                  : 'No hay acciones disponibles para esta venta.'}
              </div>
            )}
          </div>
        </section>
      )}
    </section>
  );
}

function SaleSelector({
  sales,
  selectedSale,
  filters,
  isLoading,
  onFiltersChange,
  onSearch,
  onSelect,
}: {
  sales: SaleSummary[];
  selectedSale: SaleDetail | null;
  filters: SaleFilters;
  isLoading: boolean;
  onFiltersChange: (filters: SaleFilters) => void;
  onSearch: () => void;
  onSelect: (sale: SaleSummary) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-stone-200 bg-white p-4">
        <form
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <input
            value={filters.buscar ?? ''}
            onChange={(event) => onFiltersChange({ ...filters, buscar: event.target.value })}
            placeholder="Buscar venta, cliente o vendedor"
            className={inputClassName}
          />
          <select
            value={filters.tipoVenta ?? ''}
            onChange={(event) =>
              onFiltersChange({ ...filters, tipoVenta: event.target.value as SaleType | '' })
            }
            className={inputClassName}
          >
            <option value="">Todos los tipos</option>
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Credito</option>
            <option value="MIXTA">Mixta</option>
          </select>
          <select
            value={filters.estado ?? ''}
            onChange={(event) =>
              onFiltersChange({ ...filters, estado: event.target.value as SaleStatus | '' })
            }
            className={inputClassName}
          >
            <option value="">Todos los estados</option>
            <option value="COMPLETADA">Completada</option>
            <option value="ANULADA">Anulada</option>
          </select>
          <button type="submit" className={secondaryButtonClassName}>
            Buscar
          </button>
        </form>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : sales.length === 0 ? (
        <EmptyState message="No hay ventas para mostrar." />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Venta</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sales.map((sale) => (
                <tr
                  key={sale.idVenta}
                  className={sale.estadoVenta === 'ANULADA' ? 'bg-red-50/40' : ''}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-950">{sale.numeroVenta}</p>
                    <p className="text-xs text-stone-500">{sale.idVenta}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {sale.cliente?.nombreCompleto ?? 'Sin cliente'}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{sale.tipoVenta}</td>
                  <td className="px-4 py-3 text-stone-700">{currency(sale.total)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sale.estadoVenta} />
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {new Date(sale.creadoEn).toLocaleString('es-CO')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onSelect(sale)}
                      className={
                        selectedSale?.idVenta === sale.idVenta
                          ? primaryButtonClassName
                          : secondaryButtonClassName
                      }
                    >
                      Seleccionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReturnSaleDetail({ sale, returns }: { sale: SaleDetail; returns: SaleReturn[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
      <div className="border-b border-stone-100 p-4">
        <h2 className="text-sm font-semibold text-stone-950">{sale.numeroVenta}</h2>
        <p className="mt-1 text-xs text-stone-500">
          {sale.tipoVenta} / {sale.estadoVenta} / {sale.cliente?.nombreCompleto ?? 'Sin cliente'} /{' '}
          {currency(sale.total)}
        </p>
      </div>
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Producto</th>
            <th className="px-4 py-3">Vendida</th>
            <th className="px-4 py-3">Devuelta</th>
            <th className="px-4 py-3">Disponible</th>
            <th className="px-4 py-3">Precio</th>
            <th className="px-4 py-3">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {sale.detalles.map((line) => (
            <tr key={line.idDetalle}>
              <td className="px-4 py-3">
                <p className="font-medium text-stone-950">{line.nombreProducto}</p>
                <p className="text-xs text-stone-500">
                  {line.codigoQr} / {line.sku} / Talla {line.talla ?? 'Unica'} / Color{' '}
                  {line.color ?? 'Sin color'}
                </p>
              </td>
              <td className="px-4 py-3 text-stone-700">{line.cantidad}</td>
              <td className="px-4 py-3 text-stone-700">
                {returnedQuantityForLine(returns, line.idDetalle)}
              </td>
              <td className="px-4 py-3 font-semibold text-stone-950">
                {availableQuantityForLine(line, returns)}
              </td>
              <td className="px-4 py-3 text-stone-700">{currency(line.precioUnitario)}</td>
              <td className="px-4 py-3 text-stone-700">{currency(line.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReturnForm({
  sale,
  returns,
  form,
  item,
  selectableLines,
  isSaving,
  onFormChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
}: {
  sale: SaleDetail;
  returns: SaleReturn[];
  form: SaleReturnFormValues;
  item: SaleReturnItemFormValues;
  selectableLines: SaleLine[];
  isSaving: boolean;
  onFormChange: (form: SaleReturnFormValues) => void;
  onItemChange: (item: SaleReturnItemFormValues) => void;
  onAddItem: () => void;
  onRemoveItem: (idDetalleVenta: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <h2 className="text-sm font-semibold text-stone-950">Registrar devolucion parcial</h2>
      <div className="mt-4 space-y-3">
        <Field label="Motivo">
          <textarea
            required
            value={form.motivo}
            onChange={(event) => onFormChange({ ...form, motivo: event.target.value })}
            className={textareaClassName}
          />
        </Field>

        <div className="rounded-md border border-stone-200 p-3">
          <div className="grid gap-3">
            <Field label="Linea de venta">
              <select
                value={item.id_detalle_venta}
                onChange={(event) =>
                  onItemChange({ ...item, id_detalle_venta: event.target.value })
                }
                className={inputClassName}
              >
                <option value="">Selecciona linea</option>
                {selectableLines.map((line) => (
                  <option key={line.idDetalle} value={line.idDetalle}>
                    {line.nombreProducto} / {line.codigoQr} / disponible{' '}
                    {availableQuantityForLine(line, returns)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cantidad devuelta">
              <input
                type="number"
                min={1}
                step={1}
                value={item.cantidad_devuelta}
                onChange={(event) =>
                  onItemChange({ ...item, cantidad_devuelta: Number(event.target.value) })
                }
                className={inputClassName}
              />
            </Field>
            <button type="button" onClick={onAddItem} className={secondaryButtonClassName}>
              Agregar linea
            </button>
          </div>
        </div>

        {form.detalles.length === 0 ? (
          <EmptyState message="Agrega al menos una linea a devolver." />
        ) : (
          <div className="space-y-2">
            {form.detalles.map((detail) => {
              const line = sale.detalles.find(
                (entry) => entry.idDetalle === detail.id_detalle_venta,
              );
              return (
                <div
                  key={detail.id_detalle_venta}
                  className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3 text-sm"
                >
                  <span>
                    {line?.nombreProducto ?? detail.id_detalle_venta} / cantidad{' '}
                    {detail.cantidad_devuelta}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(detail.id_detalle_venta)}
                    className="h-9 rounded-md border border-stone-300 px-3 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Quitar
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
        {isSaving ? 'Guardando...' : 'Registrar devolucion'}
      </button>
    </form>
  );
}

function ReturnHistoryList({ sale, returns }: { sale: SaleDetail; returns: SaleReturn[] }) {
  if (returns.length === 0) {
    return <EmptyState message="Esta venta no tiene devoluciones registradas." />;
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-stone-950">Historial de devoluciones</h2>
      <div className="mt-3 space-y-3">
        {returns.map((saleReturn) => (
          <div
            key={saleReturn.idDevolucion}
            className={`rounded-md border p-3 text-sm ${
              saleReturn.estadoDevolucion === 'ANULADA'
                ? 'border-red-200 bg-red-50'
                : 'border-stone-200'
            }`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium text-stone-950">{saleReturn.motivo}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {new Date(saleReturn.creadoEn).toLocaleString('es-CO')} /{' '}
                  {saleReturn.creadoPor.nombreCompleto ?? 'Usuario'}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <StatusBadge status={saleReturn.estadoDevolucion} />
                <p className="mt-2 font-semibold text-stone-950">
                  {currency(saleReturn.totalDevuelto)}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-stone-600 sm:grid-cols-2">
              <p>Impacto credito: {currency(saleReturn.impactoCredito)}</p>
              <p>Impacto pago: {currency(saleReturn.impactoPago)}</p>
            </div>
            <div className="mt-3 space-y-2">
              {saleReturn.detalles.map((detail) => {
                const line = sale.detalles.find(
                  (entry) => entry.idDetalle === detail.id_detalle_venta,
                );
                return (
                  <div
                    key={detail.id_detalle_devolucion}
                    className="rounded-md bg-stone-50 p-2 text-xs text-stone-700"
                  >
                    <p className="font-medium">
                      {line?.nombreProducto ?? 'Detalle de venta'} /{' '}
                      {line?.codigoQr ?? detail.id_variante}
                    </p>
                    <p>
                      Cantidad {detail.cantidad_devuelta} / precio{' '}
                      {currency(detail.precio_unitario)} / subtotal{' '}
                      {currency(detail.subtotal_devuelto)}
                    </p>
                    {line && (
                      <p>
                        Talla {line.talla ?? 'Unica'} / Color {line.color ?? 'Sin color'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
