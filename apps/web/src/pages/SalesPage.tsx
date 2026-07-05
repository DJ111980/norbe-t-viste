import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { EntityImageThumb } from '../components/EntityImageThumb';
import { Modal } from '../components/Modal';
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
  descuento_general: 0,
  observaciones: '',
  detalles: [],
};

const emptyLine: SaleItemFormValues = {
  id_variante: '',
  cantidad: 1,
  precio_unitario: 0,
  descuento: 0,
};

export function salePreviewTotals(items: SaleItemFormValues[], descuentoGeneral = 0) {
  const subtotalBruto = items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);
  const descuentoLineas = items.reduce((sum, item) => sum + item.descuento, 0);
  const subtotalDespuesLineas = subtotalBruto - descuentoLineas;

  return {
    subtotalBruto,
    descuentoLineas,
    descuentoGeneral,
    descuentoTotal: descuentoLineas + descuentoGeneral,
    totalFinal: Math.max(subtotalDespuesLineas - descuentoGeneral, 0),
  };
}

export function salePreviewTotal(items: SaleItemFormValues[]): number {
  return salePreviewTotals(items).totalFinal;
}

export function formatBusinessDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(value));
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
  if (isForbiddenError(error)) return 'No tienes permisos para esta acción.';
  return error instanceof ApiClientError ? error.message : fallback;
}

function variantLabel(variant: Variant): string {
  return `${variant.producto.nombreProducto ?? 'Producto'} / ${variant.talla ?? 'Unica'} / ${
    variant.color ?? 'Sin color'
  } / QR ${variant.codigoQr}`;
}

function clientLabel(client: Client): string {
  return `${client.nombreCompleto}${client.documento ? ` / ${client.documento}` : ''}${
    client.telefono ? ` / ${client.telefono}` : ''
  }`;
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canCancel = user ? canCancelSales(user.rol) : false;
  const totals = salePreviewTotals(form.detalles, form.descuento_general);
  const total = totals.totalFinal;
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
          descuento: 0,
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
    const subtotalBruto = line.cantidad * selectedVariant.precioVenta;
    if (line.cantidad <= 0) {
      setFormError('La cantidad debe ser mayor que 0.');
      return;
    }
    if (line.cantidad > selectedVariant.stockActual) {
      setFormError('La cantidad supera el stock disponible mostrado.');
      return;
    }
    if (line.descuento < 0 || line.descuento > subtotalBruto) {
      setFormError('El descuento de línea no puede superar el subtotal bruto.');
      return;
    }
    if (form.detalles.some((item) => item.id_variante === line.id_variante)) {
      setFormError('No puedes repetir la misma variante en una venta.');
      return;
    }

    setFormError(null);
    setForm((current) => ({
      ...current,
      detalles: [...current.detalles, { ...line, precio_unitario: selectedVariant.precioVenta }],
    }));
    setLine({
      ...emptyLine,
      id_variante: selectedVariant.idVariante,
      precio_unitario: selectedVariant.precioVenta,
      descuento: 0,
    });
  }

  function removeLine(idVariante: string) {
    setForm((current) => ({
      ...current,
      detalles: current.detalles.filter((item) => item.id_variante !== idVariante),
    }));
  }

  function findVariantByScannedCode(code: string): Variant | null {
    const query = code.trim().toLowerCase();
    if (!query) return null;

    return (
      variants.find((variant) => {
        const qr = variant.codigoQr.toLowerCase();
        return variant.idVariante.toLowerCase() === query || qr === query || qr.endsWith(query);
      }) ?? null
    );
  }

  function addScannedVariant(code: string) {
    const scannedVariant = findVariantByScannedCode(code);

    if (!scannedVariant) {
      setFormError('No existe una variante con ese codigo QR.');
      return;
    }
    if (scannedVariant.estado !== 'ACTIVA') {
      setFormError('La variante escaneada esta inactiva.');
      return;
    }
    if (scannedVariant.stockActual <= 0) {
      setFormError('La variante escaneada no tiene stock disponible.');
      return;
    }

    let blocked = false;
    setForm((current) => {
      const existing = current.detalles.find(
        (item) => item.id_variante === scannedVariant.idVariante,
      );

      if (existing) {
        if (existing.cantidad + 1 > scannedVariant.stockActual) {
          blocked = true;
          return current;
        }

        return {
          ...current,
          detalles: current.detalles.map((item) =>
            item.id_variante === scannedVariant.idVariante
              ? { ...item, cantidad: item.cantidad + 1 }
              : item,
          ),
        };
      }

      return {
        ...current,
        detalles: [
          ...current.detalles,
          {
            id_variante: scannedVariant.idVariante,
            cantidad: 1,
            precio_unitario: scannedVariant.precioVenta,
            descuento: 0,
          },
        ],
      };
    });

    setLine({
      ...emptyLine,
      id_variante: scannedVariant.idVariante,
      precio_unitario: scannedVariant.precioVenta,
      descuento: 0,
    });
    setFormError(
      blocked ? 'No se puede sumar otra unidad porque supera el stock disponible.' : null,
    );
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
    if (
      form.descuento_general < 0 ||
      form.descuento_general > totals.subtotalBruto - totals.descuentoLineas
    ) {
      setFormError(
        'El descuento general no puede superar el total después de descuentos de línea.',
      );
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
      setIsFormOpen(false);
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
        action={
          <button
            type="button"
            className={primaryButtonClassName}
            onClick={() => setIsFormOpen(true)}
          >
            Crear venta
          </button>
        }
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

      {isFormOpen && (
        <Modal title="Crear venta" onClose={() => setIsFormOpen(false)} size="xl">
          <SaleForm
            form={form}
            line={line}
            clients={activeClients}
            variants={activeVariants}
            total={total}
            totals={totals}
            isSaving={isSaving}
            onFormChange={setForm}
            onLineChange={setLine}
            onAddLine={addLine}
            onScanVariant={addScannedVariant}
            onRemoveLine={removeLine}
            onSubmit={(event) => void saveSale(event)}
          />
        </Modal>
      )}

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
        <Modal title={`Venta ${selected.numeroVenta}`} onClose={() => setSelected(null)} size="xl">
          <SaleDetailPanel
            sale={selected}
            payments={payments}
            canCancel={canCancel && selected.estadoVenta !== 'ANULADA'}
            cancelReason={cancelReason}
            onCancelReason={setCancelReason}
            onCancelSale={() => void cancelSelectedSale()}
          />
        </Modal>
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
  totals,
  isSaving,
  onFormChange,
  onLineChange,
  onAddLine,
  onScanVariant,
  onRemoveLine,
  onSubmit,
}: {
  form: SaleFormValues;
  line: SaleItemFormValues;
  clients: Client[];
  variants: Variant[];
  total: number;
  totals: ReturnType<typeof salePreviewTotals>;
  isSaving: boolean;
  onFormChange: (form: SaleFormValues) => void;
  onLineChange: (line: SaleItemFormValues) => void;
  onAddLine: () => void;
  onScanVariant: (code: string) => void;
  onRemoveLine: (idVariante: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const [scanCode, setScanCode] = useState('');
  const [variantSearch, setVariantSearch] = useState('');
  const selectedVariant = variants.find((variant) => variant.idVariante === line.id_variante);
  const creditBalance = form.tipo_venta === 'MIXTA' ? total - form.valor_pagado_inicial : total;
  const matchingVariants = variants
    .filter((variant) => {
      const query = variantSearch.trim().toLowerCase();
      if (!query) return true;

      return [variant.producto.nombreProducto, variant.talla, variant.color, variant.codigoQr]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    })
    .slice(0, 12);

  function submitScan() {
    if (!scanCode.trim()) return;
    onScanVariant(scanCode);
    setScanCode('');
    window.setTimeout(() => scanInputRef.current?.focus(), 0);
  }

  function handleScanKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submitScan();
  }

  function selectVariant(variant: Variant) {
    onLineChange({
      ...line,
      id_variante: variant.idVariante,
      precio_unitario: variant.precioVenta,
      descuento: 0,
    });
    setVariantSearch(variantLabel(variant));
  }

  function submitVariantSearch() {
    const query = variantSearch.trim();
    if (!query) return;

    if (/^\d+$/.test(query) || query.toUpperCase().startsWith('NTV-VAR-')) {
      onScanVariant(query);
      setVariantSearch('');
      return;
    }

    const exact = variants.find(
      (variant) => variant.codigoQr.toLowerCase() === query.toLowerCase(),
    );

    if (exact) {
      onScanVariant(exact.codigoQr);
      setVariantSearch('');
      return;
    }

    if (matchingVariants.length === 1) {
      selectVariant(matchingVariants[0]);
    }
  }

  function handleVariantSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    submitVariantSearch();
  }

  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <h2 className="text-sm font-semibold text-stone-950">Nueva venta</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Field label="Tipo de venta" required>
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
            <option value="CREDITO">Crédito</option>
            <option value="MIXTA">Mixta</option>
          </select>
        </Field>
        <Field
          label={form.tipo_venta === 'CONTADO' ? 'Cliente opcional' : 'Cliente obligatorio'}
          required={form.tipo_venta !== 'CONTADO'}
        >
          <select
            required={form.tipo_venta !== 'CONTADO'}
            value={form.id_cliente}
            onChange={(event) => onFormChange({ ...form, id_cliente: event.target.value })}
            className={inputClassName}
          >
            <option value="">Sin cliente asociado</option>
            {clients.map((client) => (
              <option key={client.idCliente} value={client.idCliente}>
                {clientLabel(client)}
              </option>
            ))}
          </select>
        </Field>
        {form.tipo_venta !== 'CREDITO' && (
          <Field label="Metodo de pago" required>
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
          <Field label="Pago inicial" required>
            <input
              required
              type="number"
              min={1}
              step={1}
              value={form.valor_pagado_inicial}
              onChange={(event) =>
                onFormChange({ ...form, valor_pagado_inicial: Number(event.target.value) })
              }
              {...numberInputFocusProps}
              className={inputClassName}
            />
          </Field>
        )}
      </div>

      {form.tipo_venta === 'CREDITO' && (
        <p className="mt-3 rounded-md bg-stone-100 px-3 py-2 text-sm text-stone-700">
          Esta venta creará un crédito por el total final de la venta.
        </p>
      )}

      <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
        <Field label="Escanear QR o codigo de variante">
          <div className="flex gap-2">
            <input
              ref={scanInputRef}
              value={scanCode}
              onChange={(event) => setScanCode(event.target.value)}
              onKeyDown={handleScanKeyDown}
              placeholder="NTV-VAR-000015 o 000015"
              className={inputClassName}
            />
            <button type="button" onClick={submitScan} className={secondaryButtonClassName}>
              Agregar
            </button>
          </div>
        </Field>
      </div>

      <div className="mt-4 rounded-md border border-stone-200 p-4">
        <h3 className="text-sm font-semibold text-stone-950">Detalles</h3>
        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_120px_160px_160px_auto]">
          <Field label="Buscar variante" required>
            <div className="space-y-2">
              <input
                value={variantSearch}
                onChange={(event) => setVariantSearch(event.target.value)}
                onKeyDown={handleVariantSearchKeyDown}
                placeholder="Producto, talla, color o QR"
                className={inputClassName}
              />
              <div className="max-h-48 overflow-y-auto rounded-md border border-stone-200 bg-white">
                {matchingVariants.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-stone-500">Sin variantes coincidentes.</p>
                ) : (
                  matchingVariants.map((variant) => (
                    <button
                      key={variant.idVariante}
                      type="button"
                      onClick={() => selectVariant(variant)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-stone-50 ${
                        line.id_variante === variant.idVariante ? 'bg-stone-100' : ''
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-stone-900">
                          {variant.producto.nombreProducto ?? 'Producto'}
                        </span>
                        <span className="block truncate text-stone-500">
                          Talla {variant.talla ?? 'Unica'} / Color {variant.color ?? 'Sin color'} /
                          QR {variant.codigoQr}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-stone-600">
                        Stock {variant.stockActual}
                        <br />
                        {currency(variant.precioVenta)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </Field>
          <Field label="Cantidad" required>
            <input
              type="number"
              min={1}
              step={1}
              value={line.cantidad}
              onChange={(event) => onLineChange({ ...line, cantidad: Number(event.target.value) })}
              {...numberInputFocusProps}
              className={inputClassName}
            />
          </Field>
          <Field label="Precio unitario">
            <input type="number" value={line.precio_unitario} readOnly className={inputClassName} />
          </Field>
          <Field label="Descuento línea">
            <input
              type="number"
              min={0}
              max={selectedVariant ? selectedVariant.precioVenta * line.cantidad : undefined}
              step={1}
              value={line.descuento}
              onChange={(event) => onLineChange({ ...line, descuento: Number(event.target.value) })}
              {...numberInputFocusProps}
              className={inputClassName}
            />
          </Field>
          <button type="button" onClick={onAddLine} className={secondaryButtonClassName}>
            Agregar
          </button>
        </div>
        {selectedVariant && (
          <div className="mt-3 flex items-center gap-3 rounded-md bg-stone-100 p-3 text-sm text-stone-700">
            <EntityImageThumb owner="variante" id={selectedVariant.idVariante} />
            <div className="min-w-0">
              <p className="font-medium text-stone-950">
                {selectedVariant.producto.nombreProducto}
              </p>
              <p className="mt-1 text-xs">
                QR {selectedVariant.codigoQr} / Talla {selectedVariant.talla ?? 'Unica'} / Color{' '}
                {selectedVariant.color ?? 'Sin color'}
              </p>
              <p className="mt-2 text-xs font-semibold">
                Stock disponible: {selectedVariant.stockActual}
              </p>
            </div>
          </div>
        )}
        {form.detalles.length === 0 ? (
          <EmptyState message="Agrega al menos un detalle para guardar la venta." />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-stone-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">Variante</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Bruto</th>
                  <th className="px-4 py-3">Descuento</th>
                  <th className="px-4 py-3">Neto</th>
                  <th className="px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {form.detalles.map((item) => {
                  const variant = variants.find((entry) => entry.idVariante === item.id_variante);
                  return (
                    <tr key={item.id_variante}>
                      <td className="px-4 py-3 text-stone-700">
                        {variant ? (
                          <div className="flex items-center gap-3">
                            <EntityImageThumb owner="variante" id={variant.idVariante} />
                            <span>{variantLabel(variant)}</span>
                          </div>
                        ) : (
                          item.id_variante
                        )}
                      </td>
                      <td className="px-4 py-3">{item.cantidad}</td>
                      <td className="px-4 py-3">{currency(item.precio_unitario)}</td>
                      <td className="px-4 py-3">
                        {currency(item.cantidad * item.precio_unitario)}
                      </td>
                      <td className="px-4 py-3">{currency(item.descuento)}</td>
                      <td className="px-4 py-3">
                        {currency(item.cantidad * item.precio_unitario - item.descuento)}
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
        <div className="space-y-4">
          <Field label="Descuento general">
            <input
              type="number"
              min={0}
              max={Math.max(totals.subtotalBruto - totals.descuentoLineas, 0)}
              step={1}
              value={form.descuento_general}
              onChange={(event) =>
                onFormChange({ ...form, descuento_general: Number(event.target.value) })
              }
              {...numberInputFocusProps}
              className={inputClassName}
            />
          </Field>
          <Field label="Observaciones">
            <textarea
              value={form.observaciones}
              onChange={(event) => onFormChange({ ...form, observaciones: event.target.value })}
              className={textareaClassName}
            />
          </Field>
        </div>
        <div className="rounded-md border border-stone-200 bg-stone-50 p-4 text-sm">
          <p className="flex justify-between">
            <span>Total bruto</span>
            <strong>{currency(totals.subtotalBruto)}</strong>
          </p>
          <p className="mt-2 flex justify-between">
            <span>Descuentos por líneas</span>
            <strong>{currency(totals.descuentoLineas)}</strong>
          </p>
          <p className="mt-2 flex justify-between">
            <span>Descuento general</span>
            <strong>{currency(totals.descuentoGeneral)}</strong>
          </p>
          <p className="mt-2 flex justify-between border-t border-stone-200 pt-2">
            <span>Total final</span>
            <strong>{currency(total)}</strong>
          </p>
          {form.tipo_venta === 'MIXTA' && (
            <>
              <p className="mt-2 flex justify-between">
                <span>Pago inicial</span>
                <strong>{currency(form.valor_pagado_inicial)}</strong>
              </p>
              <p className="mt-2 flex justify-between">
                <span>Saldo a crédito</span>
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
            <th className="px-4 py-3">Bruto</th>
            <th className="px-4 py-3">Descuento</th>
            <th className="px-4 py-3">Total final</th>
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
              <td className="px-4 py-3 text-stone-700">{currency(sale.subtotal)}</td>
              <td className="px-4 py-3 text-stone-700">{currency(sale.descuento)}</td>
              <td className="px-4 py-3 text-stone-700">{currency(sale.total)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={sale.estadoVenta} />
              </td>
              <td className="px-4 py-3 text-stone-600">{formatBusinessDate(sale.fechaVenta)}</td>
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
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overflow-x-auto rounded-md border border-stone-200 bg-white">
        <div className="border-b border-stone-100 p-4">
          <h2 className="text-sm font-semibold text-stone-950">{sale.numeroVenta}</h2>
          <p className="mt-1 text-xs text-stone-500">
            {sale.tipoVenta} / {sale.estadoVenta} / {formatBusinessDate(sale.fechaVenta)} /{' '}
            {currency(sale.total)}
          </p>
        </div>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Cantidad</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Bruto</th>
              <th className="px-4 py-3">Descuento</th>
              <th className="px-4 py-3">Neto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {sale.detalles.map((line) => (
              <tr key={line.idDetalle}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <EntityImageThumb owner="variante" id={line.idVariante} />
                    <div className="min-w-0">
                      <p className="font-medium text-stone-950">{line.nombreProducto}</p>
                      <p className="text-xs text-stone-500">
                        QR {line.codigoQr} / Talla {line.talla ?? 'Unica'} / Color{' '}
                        {line.color ?? 'Sin color'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-700">{line.cantidad}</td>
                <td className="px-4 py-3 text-stone-700">{currency(line.precioUnitario)}</td>
                <td className="px-4 py-3 text-stone-700">{currency(line.subtotalBruto)}</td>
                <td className="px-4 py-3 text-stone-700">{currency(line.descuento)}</td>
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
            <span>Total bruto</span>
            <strong>{currency(sale.resumen.subtotal)}</strong>
          </p>
          <p className="mt-2 flex justify-between">
            <span>Descuentos por líneas</span>
            <strong>{currency(sale.resumen.descuentoLineas)}</strong>
          </p>
          <p className="mt-2 flex justify-between">
            <span>Descuento general</span>
            <strong>{currency(sale.resumen.descuentoGeneral)}</strong>
          </p>
          <p className="mt-2 flex justify-between border-t border-stone-200 pt-2">
            <span>Total final</span>
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
                    {payment.estadoPago} / {formatBusinessDate(payment.creadoEn)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {canCancel && (
          <div className="rounded-md border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-stone-950">Anular venta</h2>
            {!isCancelOpen ? (
              <button
                type="button"
                onClick={() => setIsCancelOpen(true)}
                className={secondaryButtonClassName}
              >
                Anular
              </button>
            ) : (
              <div className="mt-3 space-y-3">
                <Field label="Motivo obligatorio" required>
                  <textarea
                    value={cancelReason}
                    onChange={(event) => onCancelReason(event.target.value)}
                    className={textareaClassName}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!cancelReason.trim()}
                    onClick={onCancelSale}
                    className={secondaryButtonClassName}
                  >
                    Confirmar anulacion
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCancelReason('');
                      setIsCancelOpen(false);
                    }}
                    className={secondaryButtonClassName}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
