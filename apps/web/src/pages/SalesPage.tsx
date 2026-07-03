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
import { canCancelSales } from '../permissions';
import { listClients } from '../services/clients';
import {
  cancelSale,
  createSale,
  getSale,
  listSalePayments,
  listSales,
  paymentMethods,
  type SaleFilters,
} from '../services/sales';
import { listVariants } from '../services/variants';
import type {
  Client,
  PaymentMethod,
  SaleDetail,
  SaleFormValues,
  SaleItemFormValues,
  SalePayment,
  SaleStatus,
  SaleSummary,
  SaleType,
  Variant,
} from '../types';

const emptySaleForm: SaleFormValues = {
  tipo_venta: 'CONTADO',
  id_cliente: '',
  metodo_pago: 'EFECTIVO',
  valor_pagado_inicial: 0,
  observaciones: '',
  detalles: [],
};

const emptyLine: SaleItemFormValues = {
  id_variante: '',
  cantidad: 1,
  precio_unitario: 0,
};

export function salePreviewTotal(items: SaleItemFormValues[]): number {
  return items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);
}

export function canShowCancelButton(
  role: 'ADMINISTRADOR' | 'VENDEDOR',
  sale: SaleSummary,
): boolean {
  return canCancelSales(role) && sale.estadoVenta !== 'ANULADA';
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

function variantLabel(variant: Variant): string {
  return `${variant.producto.nombreProducto ?? 'Producto'} / ${variant.talla ?? 'Unica'} / ${
    variant.color ?? 'Sin color'
  } / ${variant.sku}`;
}

export function SalesPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, user, logout } = useAuth();
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [selected, setSelected] = useState<SaleDetail | null>(null);
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [filters, setFilters] = useState<SaleFilters>({ buscar: '', estado: '', tipoVenta: '' });
  const [form, setForm] = useState<SaleFormValues>(emptySaleForm);
  const [line, setLine] = useState<SaleItemFormValues>(emptyLine);
  const [cancelReason, setCancelReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canCancel = user ? canCancelSales(user.rol) : false;
  const total = salePreviewTotal(form.detalles);
  const activeClients = useMemo(
    () => clients.filter((client) => client.estado === 'ACTIVO'),
    [clients],
  );
  const activeVariants = useMemo(
    () => variants.filter((variant) => variant.estado === 'ACTIVA'),
    [variants],
  );

  async function expireIfNeeded(actionError: unknown): Promise<boolean> {
    if (!isUnauthorizedError(actionError)) return false;
    await logout();
    onSessionExpired();
    return true;
  }

  async function loadData(nextFilters = filters) {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const [salesData, clientsData, variantsData] = await Promise.all([
        listSales(token, nextFilters),
        listClients(token, ''),
        listVariants(token, { estado: 'ACTIVA' }),
      ]);
      setSales(salesData);
      setClients(clientsData);
      setVariants(variantsData);
      const firstVariant = variantsData[0];
      if (!line.id_variante && firstVariant) {
        setLine({
          id_variante: firstVariant.idVariante,
          cantidad: 1,
          precio_unitario: firstVariant.precioVenta,
        });
      }
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setError(handleMessage(loadError, 'No se pudo cargar ventas.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSale(idVenta: string) {
    if (!token) return;
    setFormError(null);

    try {
      const [detail, salePayments] = await Promise.all([
        getSale(token, idVenta),
        listSalePayments(token, idVenta),
      ]);
      setSelected(detail);
      setPayments(salePayments);
      setCancelReason('');
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setFormError(handleMessage(loadError, 'No se pudo cargar el detalle de venta.'));
    }
  }

  useEffect(() => {
    void loadData({ buscar: '', estado: '', tipoVenta: '' });
  }, [token]);

  function addLine() {
    const selectedVariant = variants.find((variant) => variant.idVariante === line.id_variante);
    if (!selectedVariant) {
      setFormError('Selecciona una variante valida.');
      return;
    }
    if (line.cantidad <= 0 || line.precio_unitario <= 0) {
      setFormError('Cantidad y precio deben ser mayores que 0.');
      return;
    }
    if (form.detalles.some((item) => item.id_variante === line.id_variante)) {
      setFormError('No puedes repetir la misma variante en una venta.');
      return;
    }

    setFormError(null);
    setForm((current) => ({ ...current, detalles: [...current.detalles, line] }));
    setLine({
      ...emptyLine,
      id_variante: selectedVariant.idVariante,
      precio_unitario: selectedVariant.precioVenta,
    });
  }

  function removeLine(idVariante: string) {
    setForm((current) => ({
      ...current,
      detalles: current.detalles.filter((item) => item.id_variante !== idVariante),
    }));
  }

  async function saveSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    if (form.detalles.length === 0) {
      setFormError('Agrega al menos un detalle antes de guardar.');
      setIsSaving(false);
      return;
    }
    if ((form.tipo_venta === 'CREDITO' || form.tipo_venta === 'MIXTA') && !form.id_cliente) {
      setFormError('Selecciona un cliente activo para esta venta.');
      setIsSaving(false);
      return;
    }
    if (
      form.tipo_venta === 'MIXTA' &&
      (form.valor_pagado_inicial <= 0 || form.valor_pagado_inicial >= total)
    ) {
      setFormError('El pago inicial debe ser mayor que 0 y menor que el total.');
      setIsSaving(false);
      return;
    }

    try {
      const result = await createSale(token, form);
      setSuccess(`Venta ${result.numero_venta} registrada.`);
      setForm(emptySaleForm);
      setSelected(null);
      setPayments([]);
      await loadData();
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setFormError(handleMessage(saveError, 'No se pudo guardar la venta.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelSelectedSale() {
    if (!token || !selected || !canCancel || !cancelReason.trim()) return;
    setFormError(null);
    setSuccess(null);

    try {
      const result = await cancelSale(token, selected.idVenta, cancelReason);
      setSuccess(`Venta anulada. Unidades devueltas: ${result.total_unidades_devuelto}.`);
      await loadData();
      await loadSale(selected.idVenta);
    } catch (cancelError) {
      if (await expireIfNeeded(cancelError)) return;
      setFormError(handleMessage(cancelError, 'No se pudo anular la venta.'));
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Ventas"
        description="Registra ventas de contado, credito y mixtas. El stock y la cartera los actualiza el backend."
      />

      <div className="rounded-md border border-stone-200 bg-white p-4">
        <form
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void loadData();
          }}
        >
          <input
            value={filters.buscar ?? ''}
            onChange={(event) => setFilters({ ...filters, buscar: event.target.value })}
            placeholder="Buscar venta, cliente o vendedor"
            className={inputClassName}
          />
          <select
            value={filters.tipoVenta ?? ''}
            onChange={(event) =>
              setFilters({ ...filters, tipoVenta: event.target.value as SaleType | '' })
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
              setFilters({ ...filters, estado: event.target.value as SaleStatus | '' })
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

      {error && <ErrorMessage message={error} />}
      {formError && <ErrorMessage message={formError} />}
      {success && <SuccessMessage message={success} />}

      <SaleForm
        form={form}
        line={line}
        clients={activeClients}
        variants={activeVariants}
        total={total}
        isSaving={isSaving}
        onFormChange={setForm}
        onLineChange={setLine}
        onAddLine={addLine}
        onRemoveLine={removeLine}
        onSubmit={(event) => void saveSale(event)}
      />

      {isLoading ? (
        <LoadingState />
      ) : sales.length === 0 ? (
        <EmptyState message="No hay ventas para mostrar." />
      ) : (
        <SalesTable
          sales={sales}
          selected={selected}
          userRole={user?.rol ?? 'VENDEDOR'}
          onSelect={(sale) => void loadSale(sale.idVenta)}
        />
      )}

      {selected && (
        <SaleDetailPanel
          sale={selected}
          payments={payments}
          canCancel={canCancel && selected.estadoVenta !== 'ANULADA'}
          cancelReason={cancelReason}
          onCancelReason={setCancelReason}
          onCancelSale={() => void cancelSelectedSale()}
        />
      )}
    </section>
  );
}

function SaleForm({
  form,
  line,
  clients,
  variants,
  total,
  isSaving,
  onFormChange,
  onLineChange,
  onAddLine,
  onRemoveLine,
  onSubmit,
}: {
  form: SaleFormValues;
  line: SaleItemFormValues;
  clients: Client[];
  variants: Variant[];
  total: number;
  isSaving: boolean;
  onFormChange: (form: SaleFormValues) => void;
  onLineChange: (line: SaleItemFormValues) => void;
  onAddLine: () => void;
  onRemoveLine: (idVariante: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const selectedVariant = variants.find((variant) => variant.idVariante === line.id_variante);
  const creditBalance = form.tipo_venta === 'MIXTA' ? total - form.valor_pagado_inicial : total;

  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <h2 className="text-sm font-semibold text-stone-950">Nueva venta</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Field label="Tipo de venta">
          <select
            value={form.tipo_venta}
            onChange={(event) =>
              onFormChange({
                ...form,
                tipo_venta: event.target.value as SaleType,
                valor_pagado_inicial: 0,
              })
            }
            className={inputClassName}
          >
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Credito</option>
            <option value="MIXTA">Mixta</option>
          </select>
        </Field>
        {(form.tipo_venta === 'CREDITO' || form.tipo_venta === 'MIXTA') && (
          <Field label="Cliente">
            <select
              required
              value={form.id_cliente}
              onChange={(event) => onFormChange({ ...form, id_cliente: event.target.value })}
              className={inputClassName}
            >
              <option value="">Selecciona cliente activo</option>
              {clients.map((client) => (
                <option key={client.idCliente} value={client.idCliente}>
                  {client.nombreCompleto}
                </option>
              ))}
            </select>
          </Field>
        )}
        {form.tipo_venta !== 'CREDITO' && (
          <Field label="Metodo de pago">
            <select
              value={form.metodo_pago}
              onChange={(event) =>
                onFormChange({ ...form, metodo_pago: event.target.value as PaymentMethod })
              }
              className={inputClassName}
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </Field>
        )}
        {form.tipo_venta === 'MIXTA' && (
          <Field label="Pago inicial">
            <input
              required
              type="number"
              min={1}
              step={1}
              value={form.valor_pagado_inicial}
              onChange={(event) =>
                onFormChange({ ...form, valor_pagado_inicial: Number(event.target.value) })
              }
              className={inputClassName}
            />
          </Field>
        )}
      </div>

      {form.tipo_venta === 'CREDITO' && (
        <p className="mt-3 rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-700">
          Esta venta creara un credito por el total de la venta.
        </p>
      )}

      <div className="mt-4 rounded-md border border-stone-200 p-4">
        <h3 className="text-sm font-semibold text-stone-950">Detalles</h3>
        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_120px_160px_auto]">
          <Field label="Variante">
            <select
              value={line.id_variante}
              onChange={(event) => {
                const next = variants.find((variant) => variant.idVariante === event.target.value);
                onLineChange({
                  ...line,
                  id_variante: event.target.value,
                  precio_unitario: next?.precioVenta ?? line.precio_unitario,
                });
              }}
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
          <Field label="Cantidad">
            <input
              type="number"
              min={1}
              step={1}
              value={line.cantidad}
              onChange={(event) => onLineChange({ ...line, cantidad: Number(event.target.value) })}
              className={inputClassName}
            />
          </Field>
          <Field label="Precio unitario">
            <input
              type="number"
              min={1}
              step={1}
              value={line.precio_unitario}
              onChange={(event) =>
                onLineChange({ ...line, precio_unitario: Number(event.target.value) })
              }
              className={inputClassName}
            />
          </Field>
          <button type="button" onClick={onAddLine} className={secondaryButtonClassName}>
            Agregar
          </button>
        </div>
        {selectedVariant && (
          <p className="mt-2 text-xs text-stone-500">
            Stock actual informativo: {selectedVariant.stockActual}. El backend descuenta stock al
            guardar.
          </p>
        )}
        {form.detalles.length === 0 ? (
          <EmptyState message="Agrega al menos un detalle para guardar la venta." />
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-stone-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">Variante</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Subtotal</th>
                  <th className="px-4 py-3">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {form.detalles.map((item) => {
                  const variant = variants.find((entry) => entry.idVariante === item.id_variante);
                  return (
                    <tr key={item.id_variante}>
                      <td className="px-4 py-3 text-stone-700">
                        {variant ? variantLabel(variant) : item.id_variante}
                      </td>
                      <td className="px-4 py-3">{item.cantidad}</td>
                      <td className="px-4 py-3">{currency(item.precio_unitario)}</td>
                      <td className="px-4 py-3">
                        {currency(item.cantidad * item.precio_unitario)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => onRemoveLine(item.id_variante)}
                          className={secondaryButtonClassName}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Field label="Observaciones">
          <textarea
            value={form.observaciones}
            onChange={(event) => onFormChange({ ...form, observaciones: event.target.value })}
            className={textareaClassName}
          />
        </Field>
        <div className="rounded-md border border-stone-200 bg-stone-50 p-4 text-sm">
          <p className="flex justify-between">
            <span>Total vista previa</span>
            <strong>{currency(total)}</strong>
          </p>
          {form.tipo_venta === 'MIXTA' && (
            <>
              <p className="mt-2 flex justify-between">
                <span>Pago inicial</span>
                <strong>{currency(form.valor_pagado_inicial)}</strong>
              </p>
              <p className="mt-2 flex justify-between">
                <span>Saldo a credito</span>
                <strong>{currency(Math.max(creditBalance, 0))}</strong>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-4">
        <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
          {isSaving ? 'Guardando...' : 'Registrar venta'}
        </button>
      </div>
    </form>
  );
}

function SalesTable({
  sales,
  selected,
  userRole,
  onSelect,
}: {
  sales: SaleSummary[];
  selected: SaleDetail | null;
  userRole: 'ADMINISTRADOR' | 'VENDEDOR';
  onSelect: (sale: SaleSummary) => void;
}) {
  return (
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
            <tr key={sale.idVenta} className={sale.estadoVenta === 'ANULADA' ? 'bg-red-50/40' : ''}>
              <td className="px-4 py-3">
                <p className="font-medium text-stone-950">{sale.numeroVenta}</p>
                <p className="text-xs text-stone-500">{sale.vendedor.nombreCompleto}</p>
              </td>
              <td className="px-4 py-3 text-stone-600">
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
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect(sale)}
                    className={
                      selected?.idVenta === sale.idVenta
                        ? primaryButtonClassName
                        : secondaryButtonClassName
                    }
                  >
                    Ver detalle
                  </button>
                  {canShowCancelButton(userRole, sale) && (
                    <span className="rounded-md bg-stone-100 px-3 py-2 text-xs text-stone-600">
                      Anulable
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SaleDetailPanel({
  sale,
  payments,
  canCancel,
  cancelReason,
  onCancelReason,
  onCancelSale,
}: {
  sale: SaleDetail;
  payments: SalePayment[];
  canCancel: boolean;
  cancelReason: string;
  onCancelReason: (value: string) => void;
  onCancelSale: () => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
        <div className="border-b border-stone-100 p-4">
          <h2 className="text-sm font-semibold text-stone-950">{sale.numeroVenta}</h2>
          <p className="mt-1 text-xs text-stone-500">
            {sale.tipoVenta} / {sale.estadoVenta} / {currency(sale.total)}
          </p>
        </div>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Cantidad</th>
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
                    {line.sku} / {line.codigoQr} / Talla {line.talla ?? 'Unica'} / Color{' '}
                    {line.color ?? 'Sin color'}
                  </p>
                </td>
                <td className="px-4 py-3 text-stone-700">{line.cantidad}</td>
                <td className="px-4 py-3 text-stone-700">{currency(line.precioUnitario)}</td>
                <td className="px-4 py-3 text-stone-700">{currency(line.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4">
        <div className="rounded-md border border-stone-200 bg-white p-4 text-sm">
          <h2 className="font-semibold text-stone-950">Resumen</h2>
          <p className="mt-3 flex justify-between">
            <span>Cliente</span>
            <strong>{sale.cliente?.nombreCompleto ?? 'Sin cliente'}</strong>
          </p>
          <p className="mt-2 flex justify-between">
            <span>Total</span>
            <strong>{currency(sale.total)}</strong>
          </p>
          <p className="mt-2 flex justify-between">
            <span>Saldo pendiente</span>
            <strong>{currency(sale.saldoPendiente)}</strong>
          </p>
          {sale.motivoAnulacion && (
            <p className="mt-3 rounded-md bg-red-50 p-3 text-red-800">{sale.motivoAnulacion}</p>
          )}
        </div>

        <div className="rounded-md border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-stone-950">Pagos</h2>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">No hay pagos registrados.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {payments.map((payment) => (
                <div
                  key={payment.idPago}
                  className="rounded-md border border-stone-200 p-3 text-sm text-stone-700"
                >
                  <p className="flex justify-between">
                    <span>{payment.metodoPago}</span>
                    <strong>{currency(payment.monto)}</strong>
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {payment.estadoPago} / {new Date(payment.creadoEn).toLocaleString('es-CO')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {canCancel && (
          <div className="rounded-md border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-stone-950">Anular venta</h2>
            <Field label="Motivo obligatorio">
              <textarea
                value={cancelReason}
                onChange={(event) => onCancelReason(event.target.value)}
                className={textareaClassName}
              />
            </Field>
            <button
              type="button"
              disabled={!cancelReason.trim()}
              onClick={onCancelSale}
              className={secondaryButtonClassName}
            >
              Anular venta
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
