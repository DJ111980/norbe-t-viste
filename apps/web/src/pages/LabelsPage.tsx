import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { EntityImageThumb } from '../components/EntityImageThumb';
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
  SuccessMessage,
} from '../components/ui';
import { ApiClientError, isForbiddenError, isUnauthorizedError } from '../lib/api';
import { getBatchVariantLabelPreview, getEntryLotLabelPreview } from '../services/labels';
import { getEntryLot, listEntryLots } from '../services/lots';
import { getVariantByQr, listVariants } from '../services/variants';
import type { EntryLotSummary, LabelBatchItemFormValues, Variant } from '../types';

const emptyBatchItem: LabelBatchItemFormValues = {
  id_variante: '',
  cantidad: 1,
};

interface LabelBatchRow extends LabelBatchItemFormValues {
  variant: Variant;
}

interface LabelPreviewSummary {
  total: number;
  items: Array<{ label: string; cantidad: number }>;
}

export function isValidLabelQuantity(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function handleMessage(error: unknown, fallback: string): string {
  if (isForbiddenError(error)) return 'No tienes permisos para esta accion.';
  return error instanceof ApiClientError ? error.message : fallback;
}

function variantLabel(variant: Variant): string {
  return `${variant.producto.nombreProducto ?? 'Producto'} / ${variant.sku} / ${variant.codigoQr}`;
}

function lotLabel(lot: EntryLotSummary): string {
  return `${lot.numeroLote} / ${lot.nombreProveedor ?? 'Sin proveedor'} / ${lot.estadoLote}`;
}

function variantSummaryLabel(variant: Variant): string {
  return `${variant.producto.nombreProducto ?? 'Producto'} / Talla ${variant.talla ?? 'Unica'}`;
}

export function LabelsPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, logout } = useAuth();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [lots, setLots] = useState<EntryLotSummary[]>([]);
  const [variantInput, setVariantInput] = useState('');
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [individualQuantity, setIndividualQuantity] = useState(1);
  const [batchInput, setBatchInput] = useState('');
  const [batchItem, setBatchItem] = useState<LabelBatchItemFormValues>(emptyBatchItem);
  const [batchItems, setBatchItems] = useState<LabelBatchRow[]>([]);
  const [entryLotInput, setEntryLotInput] = useState('');
  const [selectedLot, setSelectedLot] = useState<EntryLotSummary | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    html: string;
    summary: LabelPreviewSummary;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const confirmedLots = useMemo(
    () => lots.filter((lot) => lot.estadoLote === 'CONFIRMADO'),
    [lots],
  );

  async function expireIfNeeded(actionError: unknown): Promise<boolean> {
    if (!isUnauthorizedError(actionError)) return false;
    await logout();
    onSessionExpired();
    return true;
  }

  async function loadCatalogs() {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const [variantsData, lotsData] = await Promise.all([
        listVariants(token, { estado: 'ACTIVA' }),
        listEntryLots(token, {}),
      ]);
      setVariants(variantsData);
      setLots(lotsData);
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setError(handleMessage(loadError, 'No se pudieron cargar variantes y lotes.'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCatalogs();
  }, [token]);

  async function resolveVariant(value: string): Promise<Variant | null> {
    const query = value.trim();
    if (!token || !query) return null;

    const local = variants.find(
      (variant) =>
        variant.idVariante === query ||
        variant.codigoQr.toLowerCase() === query.toLowerCase() ||
        variant.sku.toLowerCase() === query.toLowerCase(),
    );
    if (local) return local;

    try {
      return await getVariantByQr(token, query);
    } catch {
      const found = await listVariants(token, { buscar: query });
      return found[0] ?? null;
    }
  }

  async function resolveLot(value: string): Promise<EntryLotSummary | null> {
    const query = value.trim();
    if (!token || !query) return null;

    const local = lots.find(
      (lot) =>
        lot.idLote === query ||
        lot.numeroLote.toLowerCase() === query.toLowerCase() ||
        (lot.numeroFactura?.toLowerCase() ?? '') === query.toLowerCase(),
    );
    if (local) return local;

    try {
      const lot = await getEntryLot(token, query);
      return {
        idLote: lot.idLote,
        idProveedor: lot.idProveedor,
        nombreProveedor: lot.proveedor?.nombreProveedor ?? null,
        numeroLote: lot.numeroLote,
        numeroFactura: lot.numeroFactura,
        fechaLote: lot.fechaLote,
        estadoLote: lot.estadoLote,
        observaciones: lot.observaciones,
        cantidadDetalles: lot.detalles.length,
        totalEstimado: null,
        creadoPor: lot.creadoPor,
        actualizadoPor: lot.actualizadoPor,
        creadoEn: lot.creadoEn,
        actualizadoEn: lot.actualizadoEn,
      };
    } catch {
      return null;
    }
  }

  async function selectVariantFromInput(value = variantInput) {
    setError(null);
    const variant = await resolveVariant(value);
    if (!variant) {
      setSelectedVariant(null);
      setError('La variante no existe. Puedes usar selector, codigo QR o id interno.');
      return;
    }
    setSelectedVariant(variant);
    setVariantInput(variant.codigoQr);
    setIndividualQuantity(Math.max(variant.stockActual, 1));
  }

  async function selectLotFromInput(value = entryLotInput) {
    setError(null);
    const lot = await resolveLot(value);
    if (!lot) {
      setSelectedLot(null);
      setError('El lote no existe. Puedes usar el selector, codigo de lote o id interno.');
      return;
    }
    setSelectedLot(lot);
    setEntryLotInput(lot.numeroLote);
  }

  async function openPreview(
    action: () => Promise<string>,
    title: string,
    summary: LabelPreviewSummary,
  ) {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const html = await action();
      setPreview({ title, html, summary });
      setSuccess('Preview generado.');
    } catch (labelError) {
      if (await expireIfNeeded(labelError)) return;
      setError(handleMessage(labelError, 'No se pudo generar el preview de etiquetas.'));
    } finally {
      setIsLoading(false);
    }
  }

  function submitIndividual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedVariant) {
      setError('Selecciona una variante antes de generar etiqueta.');
      return;
    }
    if (!isValidLabelQuantity(individualQuantity)) {
      setError('La cantidad debe ser un entero mayor que 0.');
      return;
    }
    void openPreview(
      () =>
        getBatchVariantLabelPreview(token, [
          { id_variante: selectedVariant.idVariante, cantidad: individualQuantity },
        ]),
      `Etiqueta ${selectedVariant.codigoQr}`,
      {
        total: individualQuantity,
        items: [{ label: variantSummaryLabel(selectedVariant), cantidad: individualQuantity }],
      },
    );
  }

  async function addBatchItem() {
    const lookup = batchInput.trim() || batchItem.id_variante.trim();
    if (!lookup) {
      setError('Debes indicar la variante.');
      return;
    }
    if (!isValidLabelQuantity(batchItem.cantidad)) {
      setError('La cantidad debe ser un entero mayor que 0.');
      return;
    }

    const variant = await resolveVariant(lookup);
    if (!variant) {
      setError('La variante no existe. Puedes escribir el codigo QR visible o escogerla.');
      return;
    }

    setError(null);
    setBatchItems((current) => [
      ...current,
      { id_variante: variant.idVariante, cantidad: batchItem.cantidad, variant },
    ]);
    setBatchItem(emptyBatchItem);
    setBatchInput('');
  }

  function removeBatchItem(index: number) {
    setBatchItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateBatchQuantity(index: number, cantidad: number) {
    setBatchItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, cantidad } : item)),
    );
  }

  function submitBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (batchItems.length === 0) {
      setError('Agrega al menos una variante a la lista.');
      return;
    }
    const invalid = batchItems.some((item) => !isValidLabelQuantity(item.cantidad));
    if (invalid) {
      setError('Todas las cantidades deben ser enteros mayores que 0.');
      return;
    }

    void openPreview(
      () =>
        getBatchVariantLabelPreview(
          token,
          batchItems.map(({ id_variante, cantidad }) => ({ id_variante, cantidad })),
        ),
      'Etiquetas por lista NORBE T VISTE',
      {
        total: batchItems.reduce((total, item) => total + item.cantidad, 0),
        items: batchItems.map((item) => ({
          label: variantSummaryLabel(item.variant),
          cantidad: item.cantidad,
        })),
      },
    );
  }

  async function submitEntryLot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedLot) {
      setError('Selecciona un lote antes de generar etiquetas.');
      return;
    }
    if (selectedLot.estadoLote === 'ANULADO') {
      setError('El lote esta anulado y no puede generar etiquetas.');
      return;
    }
    if (selectedLot.estadoLote !== 'CONFIRMADO') {
      setError('Solo los lotes confirmados pueden generar etiquetas.');
      return;
    }
    if (selectedLot.cantidadDetalles === 0) {
      setError('El lote no tiene detalles para generar etiquetas.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const lot = await getEntryLot(token, selectedLot.idLote);
      const summary = {
        total: lot.detalles.reduce((total, detail) => total + detail.cantidad, 0),
        items: lot.detalles.map((detail) => ({
          label: `${detail.producto.nombreProducto} / Talla ${detail.variante.talla ?? 'Unica'}`,
          cantidad: detail.cantidad,
        })),
      };
      await openPreview(
        () => getEntryLotLabelPreview(token, selectedLot.idLote),
        `Etiquetas ${selectedLot.numeroLote}`,
        summary,
      );
    } catch (lotError) {
      if (await expireIfNeeded(lotError)) return;
      setError(handleMessage(lotError, 'No se pudo preparar el resumen del lote.'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Etiquetas"
        description="Genera previews imprimibles desde el backend. El QR y el HTML no se crean en frontend."
      />

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}
      {isLoading && <LoadingState />}

      <div className="grid gap-4 xl:grid-cols-3">
        <form
          className="rounded-md border border-stone-200 bg-white p-4"
          onSubmit={submitIndividual}
        >
          <h2 className="text-sm font-semibold text-stone-950">Etiqueta individual</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Selector de variante">
              <select
                value={selectedVariant?.idVariante ?? ''}
                onChange={(event) => {
                  const variant = variants.find((item) => item.idVariante === event.target.value);
                  setSelectedVariant(variant ?? null);
                  setVariantInput(variant?.codigoQr ?? '');
                  setIndividualQuantity(Math.max(variant?.stockActual ?? 1, 1));
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
            <Field label="Codigo QR o id interno">
              <div className="flex gap-2">
                <input
                  value={variantInput}
                  onChange={(event) => setVariantInput(event.target.value)}
                  placeholder="NTV-VAR-000013"
                  className={inputClassName}
                />
                <button
                  type="button"
                  onClick={() => void selectVariantFromInput()}
                  className={secondaryButtonClassName}
                >
                  Buscar
                </button>
              </div>
            </Field>
            {selectedVariant && (
              <VariantPreview variant={selectedVariant} quantity={individualQuantity} />
            )}
            {selectedVariant?.stockActual === 0 && (
              <ErrorMessage message="La variante no tiene stock. Se sugiere 1 etiqueta para revisión manual." />
            )}
            <Field label="Cantidad">
              <input
                type="number"
                min={1}
                step={1}
                value={individualQuantity}
                onChange={(event) => setIndividualQuantity(Number(event.target.value))}
                {...numberInputFocusProps}
                className={inputClassName}
              />
            </Field>
          </div>
          <button type="submit" disabled={isLoading} className={`${primaryButtonClassName} mt-4`}>
            Ver etiqueta
          </button>
        </form>

        <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={submitBatch}>
          <h2 className="text-sm font-semibold text-stone-950">Etiquetas por lista</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Selector de variante">
              <select
                value={batchItem.id_variante}
                onChange={(event) => {
                  setBatchItem({ ...batchItem, id_variante: event.target.value });
                  setBatchInput('');
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
            <Field label="Codigo QR o id interno">
              <input
                value={batchInput}
                onChange={(event) => setBatchInput(event.target.value)}
                placeholder="NTV-VAR-000013"
                className={inputClassName}
              />
            </Field>
            <Field label="Cantidad">
              <input
                type="number"
                min={1}
                step={1}
                value={batchItem.cantidad}
                onChange={(event) =>
                  setBatchItem({ ...batchItem, cantidad: Number(event.target.value) })
                }
                {...numberInputFocusProps}
                className={inputClassName}
              />
            </Field>
            <button
              type="button"
              onClick={() => void addBatchItem()}
              className={secondaryButtonClassName}
            >
              Agregar fila
            </button>
          </div>
          {batchItems.length === 0 ? (
            <EmptyState message="Agrega variantes para generar etiquetas." />
          ) : (
            <div className="mt-4 space-y-2">
              {batchItems.map((item, index) => (
                <div
                  key={`${item.id_variante}-${index}`}
                  className="grid items-center gap-2 rounded-md border border-stone-200 p-2 text-sm md:grid-cols-[minmax(0,1fr)_80px_auto]"
                >
                  <VariantPreview variant={item.variant} quantity={item.cantidad} compact />
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={item.cantidad}
                    onChange={(event) => updateBatchQuantity(index, Number(event.target.value))}
                    {...numberInputFocusProps}
                    className={inputClassName}
                  />
                  <button
                    type="button"
                    onClick={() => removeBatchItem(index)}
                    className="h-8 rounded-md border border-stone-300 px-2 text-xs text-stone-700 hover:bg-stone-50"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
          <button type="submit" disabled={isLoading} className={`${primaryButtonClassName} mt-4`}>
            Generar etiquetas
          </button>
        </form>

        <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={submitEntryLot}>
          <h2 className="text-sm font-semibold text-stone-950">Etiquetas desde lote</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Selector de lote confirmado">
              <select
                value={selectedLot?.idLote ?? ''}
                onChange={(event) => {
                  const lot = lots.find((item) => item.idLote === event.target.value);
                  setSelectedLot(lot ?? null);
                  setEntryLotInput(lot?.numeroLote ?? '');
                }}
                className={inputClassName}
              >
                <option value="">Selecciona lote</option>
                {confirmedLots.map((lot) => (
                  <option key={lot.idLote} value={lot.idLote}>
                    {lotLabel(lot)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Codigo o id de lote">
              <div className="flex gap-2">
                <input
                  value={entryLotInput}
                  onChange={(event) => setEntryLotInput(event.target.value)}
                  placeholder="LOTE-..."
                  className={inputClassName}
                />
                <button
                  type="button"
                  onClick={() => void selectLotFromInput()}
                  className={secondaryButtonClassName}
                >
                  Buscar
                </button>
              </div>
            </Field>
            {selectedLot && (
              <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm">
                <p className="font-semibold text-stone-950">{selectedLot.numeroLote}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {selectedLot.nombreProveedor ?? 'Sin proveedor'} / {selectedLot.estadoLote} /{' '}
                  {selectedLot.fechaLote.slice(0, 10)}
                </p>
              </div>
            )}
          </div>
          <button type="submit" disabled={isLoading} className={`${primaryButtonClassName} mt-4`}>
            Ver etiquetas del lote
          </button>
        </form>
      </div>

      {preview && (
        <PrintableHtmlModal
          title={preview.title}
          html={preview.html}
          summary={preview.summary}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  );
}

function VariantPreview({
  variant,
  quantity,
  compact = false,
}: {
  variant: Variant;
  quantity: number;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 ${
        compact ? 'gap-2 border-0 bg-transparent p-0' : ''
      }`}
    >
      <EntityImageThumb
        owner="variante"
        id={variant.idVariante}
        alt={variant.producto.nombreProducto ?? variant.sku}
      />
      <div className="min-w-0 text-sm">
        <p className="truncate font-semibold text-stone-950">
          {variant.producto.nombreProducto ?? 'Producto sin nombre'}
        </p>
        {compact ? (
          <>
            <p className="truncate font-mono text-xs text-stone-600">QR {variant.codigoQr}</p>
            <p className="truncate text-xs text-stone-500">
              SKU {variant.sku} / Talla {variant.talla ?? 'Unica'} / Stock {variant.stockActual}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-stone-500">
              Talla {variant.talla ?? 'Unica'} / Color {variant.color ?? 'Sin color'} / SKU{' '}
              {variant.sku}
            </p>
            <p className="text-xs text-stone-500">
              QR {variant.codigoQr} / Stock {variant.stockActual} / Cantidad {quantity}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
