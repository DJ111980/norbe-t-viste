import { FormEvent, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import {
  EmptyState,
  ErrorMessage,
  Field,
  inputClassName,
  PageHeader,
  primaryButtonClassName,
  secondaryButtonClassName,
  SuccessMessage,
} from '../components/ui';
import { ApiClientError, isForbiddenError, isUnauthorizedError } from '../lib/api';
import {
  getBatchVariantLabelPreview,
  getEntryLotLabelPreview,
  getVariantLabelPreview,
  openPrintableHtml,
} from '../services/labels';
import type { LabelBatchItemFormValues } from '../types';

const emptyBatchItem: LabelBatchItemFormValues = {
  id_variante: '',
  cantidad: 1,
};

export function isValidLabelQuantity(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function handleMessage(error: unknown, fallback: string): string {
  if (isForbiddenError(error)) return 'No tienes permisos para esta accion.';
  return error instanceof ApiClientError ? error.message : fallback;
}

export function LabelsPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, logout } = useAuth();
  const [variantId, setVariantId] = useState('');
  const [entryLotId, setEntryLotId] = useState('');
  const [batchItem, setBatchItem] = useState<LabelBatchItemFormValues>(emptyBatchItem);
  const [batchItems, setBatchItems] = useState<LabelBatchItemFormValues[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function expireIfNeeded(actionError: unknown): Promise<boolean> {
    if (!isUnauthorizedError(actionError)) return false;
    await logout();
    onSessionExpired();
    return true;
  }

  async function openHtml(action: () => Promise<string>, title: string) {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const html = await action();
      if (!openPrintableHtml(html, title)) {
        setError('El navegador bloqueo la nueva pestana de impresion.');
        return;
      }
      setSuccess('Preview generado en una nueva pestana.');
    } catch (labelError) {
      if (await expireIfNeeded(labelError)) return;
      setError(handleMessage(labelError, 'No se pudo generar el preview de etiquetas.'));
    } finally {
      setIsLoading(false);
    }
  }

  function addBatchItem() {
    if (!batchItem.id_variante.trim()) {
      setError('Debes indicar la variante.');
      return;
    }
    if (!isValidLabelQuantity(batchItem.cantidad)) {
      setError('La cantidad debe ser un entero mayor que 0.');
      return;
    }

    setError(null);
    setBatchItems((current) => [
      ...current,
      { ...batchItem, id_variante: batchItem.id_variante.trim() },
    ]);
    setBatchItem(emptyBatchItem);
  }

  function removeBatchItem(index: number) {
    setBatchItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function submitIndividual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = variantId.trim();
    if (!id || !token) return;
    void openHtml(() => getVariantLabelPreview(token, id), 'Etiqueta individual NORBE T VISTE');
  }

  function submitBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (batchItems.length === 0) {
      setError('Agrega al menos una variante a la lista.');
      return;
    }
    void openHtml(
      () => getBatchVariantLabelPreview(token, batchItems),
      'Etiquetas por lista NORBE T VISTE',
    );
  }

  function submitEntryLot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = entryLotId.trim();
    if (!id || !token) return;
    void openHtml(() => getEntryLotLabelPreview(token, id), 'Etiquetas de lote NORBE T VISTE');
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Etiquetas"
        description="Genera previews imprimibles desde el backend. El QR y el HTML no se crean en frontend."
      />

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      <div className="grid gap-4 xl:grid-cols-3">
        <form
          className="rounded-md border border-stone-200 bg-white p-4"
          onSubmit={submitIndividual}
        >
          <h2 className="text-sm font-semibold text-stone-950">Etiqueta individual</h2>
          <Field label="ID variante">
            <input
              required
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
              className={inputClassName}
            />
          </Field>
          <button type="submit" disabled={isLoading} className={`${primaryButtonClassName} mt-4`}>
            Ver etiqueta
          </button>
        </form>

        <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={submitBatch}>
          <h2 className="text-sm font-semibold text-stone-950">Etiquetas por lista</h2>
          <div className="grid gap-3">
            <Field label="ID variante">
              <input
                value={batchItem.id_variante}
                onChange={(event) =>
                  setBatchItem({ ...batchItem, id_variante: event.target.value })
                }
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
                className={inputClassName}
              />
            </Field>
            <button type="button" onClick={addBatchItem} className={secondaryButtonClassName}>
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
                  className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-2 text-sm"
                >
                  <span>
                    {item.id_variante} / cantidad {item.cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeBatchItem(index)}
                    className="h-8 rounded-md border border-stone-300 px-3 text-xs text-stone-700"
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
          <Field label="ID lote de entrada">
            <input
              required
              value={entryLotId}
              onChange={(event) => setEntryLotId(event.target.value)}
              className={inputClassName}
            />
          </Field>
          <button type="submit" disabled={isLoading} className={`${primaryButtonClassName} mt-4`}>
            Ver etiquetas del lote
          </button>
        </form>
      </div>
    </section>
  );
}
