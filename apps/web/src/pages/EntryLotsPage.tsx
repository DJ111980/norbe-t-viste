import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { Modal } from '../components/Modal';
import { PrintableHtmlModal } from '../components/PrintableHtmlModal';
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
import { canManageEntryLots } from '../permissions';
import { getEntryLotLabelPreview } from '../services/labels';
import {
  cancelEntryLot,
  confirmEntryLot,
  createEntryLot,
  createEntryLotDetail,
  deleteEntryLotDetail,
  getEntryLot,
  listEntryLots,
  updateEntryLot,
  updateEntryLotDetail,
  type EntryLotFilters,
} from '../services/lots';
import { listProviders } from '../services/providers';
import { listVariants } from '../services/variants';
import type {
  EntryLot,
  EntryLotDetail,
  EntryLotDetailFormValues,
  EntryLotFormValues,
  EntryLotStatus,
  EntryLotSummary,
  Provider,
  Variant,
} from '../types';

const emptyLotForm: EntryLotFormValues = {
  id_proveedor: '',
  numero_factura: '',
  fecha_lote: new Date().toISOString().slice(0, 10),
  observaciones: '',
};

const emptyDetailForm: EntryLotDetailFormValues = {
  id_variante: '',
  cantidad: 1,
  costo_unitario: 0,
  precio_venta_sugerido: 0,
  observaciones: '',
};

function currency(value: number | null | undefined): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function handleMessage(error: unknown, fallback: string): string {
  if (isForbiddenError(error)) return 'No tienes permisos para esta accion.';
  return error instanceof ApiClientError ? error.message : fallback;
}

function lotLabelSummary(lot: EntryLot): {
  total: number;
  items: Array<{ label: string; cantidad: number }>;
} {
  const items = lot.detalles.map((detail) => ({
    label: `${detail.producto.nombreProducto} / Talla ${detail.variante.talla ?? 'Unica'}`,
    cantidad: detail.cantidad,
  }));

  return {
    total: items.reduce((total, item) => total + item.cantidad, 0),
    items,
  };
}

function fillLotForm(lot: EntryLot): EntryLotFormValues {
  return {
    id_proveedor: lot.idProveedor ?? '',
    numero_factura: lot.numeroFactura ?? '',
    fecha_lote: lot.fechaLote.slice(0, 10),
    observaciones: lot.observaciones ?? '',
  };
}

function fillDetailForm(detail: EntryLotDetail): EntryLotDetailFormValues {
  return {
    id_variante: detail.variante.idVariante,
    cantidad: detail.cantidad,
    costo_unitario: detail.costoUnitario ?? 0,
    precio_venta_sugerido: detail.precioVentaSugerido,
    observaciones: detail.observaciones ?? '',
  };
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-stone-500">{label}</dt>
      <dd className="mt-1 font-medium text-stone-900">{value}</dd>
    </div>
  );
}

export function EntryLotsPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, user, logout } = useAuth();
  const [lots, setLots] = useState<EntryLotSummary[]>([]);
  const [selected, setSelected] = useState<EntryLot | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [filters, setFilters] = useState<EntryLotFilters>({ estado: '', buscar: '' });
  const [lotForm, setLotForm] = useState<EntryLotFormValues>(emptyLotForm);
  const [detailForm, setDetailForm] = useState<EntryLotDetailFormValues>(emptyDetailForm);
  const [editingDetail, setEditingDetail] = useState<EntryLotDetail | null>(null);
  const [isLotFormOpen, setIsLotFormOpen] = useState(false);
  const [labelPreview, setLabelPreview] = useState<{
    title: string;
    html: string;
    summary: { total: number; items: Array<{ label: string; cantidad: number }> };
  } | null>(null);
  const [confirmationPrompt, setConfirmationPrompt] = useState<{
    numeroLote: string;
    idLote: string;
    totalEtiquetas: number;
    detalles: Array<{ label: string; cantidad: number }>;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canManage = user ? canManageEntryLots(user.rol) : false;
  const selectedEditable = canManage && selected?.estadoLote === 'BORRADOR';
  const canOpenLabels = selected?.estadoLote === 'CONFIRMADO';

  const activeProviders = useMemo(
    () => providers.filter((provider) => provider.estado === 'ACTIVO'),
    [providers],
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
      const [lotsData, providersData, variantsData] = await Promise.all([
        listEntryLots(token, nextFilters),
        listProviders(token, ''),
        listVariants(token, { estado: 'ACTIVA' }),
      ]);
      setLots(lotsData);
      setProviders(providersData);
      setVariants(variantsData);
      if (!lotForm.id_proveedor && providersData[0]) {
        setLotForm((current) => ({ ...current, id_proveedor: providersData[0].idProveedor }));
      }
      if (!detailForm.id_variante && variantsData[0]) {
        setDetailForm((current) => ({ ...current, id_variante: variantsData[0].idVariante }));
      }
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setError(handleMessage(loadError, 'No se pudo cargar lotes de entrada.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadLot(idLote: string) {
    if (!token) return;
    setFormError(null);

    try {
      const lot = await getEntryLot(token, idLote);
      setSelected(lot);
      setLotForm(fillLotForm(lot));
      setEditingDetail(null);
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setFormError(handleMessage(loadError, 'No se pudo cargar el lote.'));
    }
  }

  useEffect(() => {
    void loadData({ estado: '', buscar: '' });
  }, [token]);

  async function saveLot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !canManage) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    try {
      const lot = selectedEditable
        ? await updateEntryLot(token, selected.idLote, lotForm)
        : await createEntryLot(token, lotForm);
      setSelected(lot);
      setLotForm(fillLotForm(lot));
      setSuccess(selectedEditable ? 'Lote actualizado.' : 'Lote creado en borrador.');
      if (!selectedEditable) setIsLotFormOpen(false);
      await loadData();
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setFormError(handleMessage(saveError, 'No se pudo guardar el lote.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveDetail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedEditable) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    try {
      if (editingDetail) {
        await updateEntryLotDetail(token, selected.idLote, editingDetail.idDetalleLote, detailForm);
        setSuccess('Detalle actualizado.');
      } else {
        await createEntryLotDetail(token, selected.idLote, detailForm);
        setSuccess('Detalle agregado.');
      }
      setDetailForm({
        ...emptyDetailForm,
        id_variante: detailForm.id_variante,
      });
      setEditingDetail(null);
      await loadLot(selected.idLote);
      await loadData();
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setFormError(handleMessage(saveError, 'No se pudo guardar el detalle.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeDetail(detail: EntryLotDetail) {
    if (!token || !selectedEditable) return;
    setFormError(null);
    setSuccess(null);

    try {
      await deleteEntryLotDetail(token, selected.idLote, detail.idDetalleLote);
      setSuccess('Detalle eliminado.');
      await loadLot(selected.idLote);
      await loadData();
    } catch (deleteError) {
      if (await expireIfNeeded(deleteError)) return;
      setFormError(handleMessage(deleteError, 'No se pudo eliminar el detalle.'));
    }
  }

  async function confirmSelectedLot() {
    if (!token || !selected || !canManage) return;
    setFormError(null);
    setSuccess(null);
    const summary = lotLabelSummary(selected);

    try {
      const result = await confirmEntryLot(token, selected.idLote);
      setSuccess(`Lote confirmado: ${result.total_unidades_ingresadas} unidades ingresadas.`);
      await loadLot(selected.idLote);
      await loadData();
      setConfirmationPrompt({
        numeroLote: selected.numeroLote,
        idLote: selected.idLote,
        totalEtiquetas: summary.total,
        detalles: summary.items,
      });
    } catch (confirmError) {
      if (await expireIfNeeded(confirmError)) return;
      setFormError(handleMessage(confirmError, 'No se pudo confirmar el lote.'));
    }
  }

  async function cancelSelectedLot() {
    if (!token || !selected || !canManage || !cancelReason.trim()) return;
    setFormError(null);
    setSuccess(null);

    try {
      const result = await cancelEntryLot(token, selected.idLote, cancelReason);
      setSuccess(`Lote anulado: ${result.total_unidades_reversadas} unidades reversadas.`);
      setCancelReason('');
      await loadLot(selected.idLote);
      await loadData();
    } catch (cancelError) {
      if (await expireIfNeeded(cancelError)) return;
      setFormError(handleMessage(cancelError, 'No se pudo anular el lote.'));
    }
  }

  async function openLabels(idLote = selected?.idLote, numeroLote = selected?.numeroLote) {
    if (!token || !idLote || !numeroLote) return;
    setFormError(null);

    try {
      const [html, lot] = await Promise.all([
        getEntryLotLabelPreview(token, idLote),
        getEntryLot(token, idLote),
      ]);
      setLabelPreview({ title: `Etiquetas ${numeroLote}`, html, summary: lotLabelSummary(lot) });
      setConfirmationPrompt(null);
    } catch (labelError) {
      if (await expireIfNeeded(labelError)) return;
      setFormError(handleMessage(labelError, 'No se pudieron abrir etiquetas del lote.'));
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Lotes de entrada"
        description="Gestiona lotes, detalles y etiquetas QR desde lotes confirmados."
      />

      <div className="rounded-md border border-stone-200 bg-white p-4">
        <form
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void loadData();
          }}
        >
          <input
            value={filters.buscar ?? ''}
            onChange={(event) => setFilters({ ...filters, buscar: event.target.value })}
            placeholder="Buscar lote o factura"
            className={inputClassName}
          />
          <select
            value={filters.estado ?? ''}
            onChange={(event) =>
              setFilters({ ...filters, estado: event.target.value as EntryLotStatus | '' })
            }
            className={inputClassName}
          >
            <option value="">Todos</option>
            <option value="BORRADOR">Borrador</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="ANULADO">Anulado</option>
          </select>
          <button type="submit" className={secondaryButtonClassName}>
            Buscar
          </button>
        </form>
      </div>

      {error && <ErrorMessage message={error} />}
      {formError && <ErrorMessage message={formError} />}
      {success && <SuccessMessage message={success} />}

      {!canManage && (
        <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">
          Tu rol permite consultar lotes. Crear, editar, confirmar y anular es administrativo.
        </div>
      )}

      {canManage && (
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setLotForm(emptyLotForm);
            setEditingDetail(null);
            setIsLotFormOpen(true);
          }}
          className={primaryButtonClassName}
        >
          Crear lote
        </button>
      )}

      {isLotFormOpen && (
        <Modal title="Crear lote" onClose={() => setIsLotFormOpen(false)} size="lg">
          <LotForm
            form={lotForm}
            providers={activeProviders}
            selected={null}
            isSaving={isSaving}
            editable
            onCancel={() => setIsLotFormOpen(false)}
            onChange={setLotForm}
            onSubmit={(event) => void saveLot(event)}
            onNew={() => {
              setLotForm(emptyLotForm);
              setEditingDetail(null);
            }}
          />
        </Modal>
      )}

      {isLoading ? (
        <LoadingState />
      ) : lots.length === 0 ? (
        <EmptyState message="No hay lotes de entrada para mostrar." />
      ) : (
        <LotsTable lots={lots} selected={selected} onSelect={(lot) => void loadLot(lot.idLote)} />
      )}

      {selected && (
        <Modal
          title={`Lote ${selected.numeroLote}`}
          onClose={() => {
            setSelected(null);
            setLotForm(emptyLotForm);
            setEditingDetail(null);
            setCancelReason('');
          }}
          size="xl"
        >
          <section className="space-y-4">
            <LotHeader lot={selected} />

            {canManage && (
              <LotForm
                form={lotForm}
                providers={activeProviders}
                selected={selected}
                isSaving={isSaving}
                editable={selectedEditable}
                onCancel={() => {
                  setLotForm(fillLotForm(selected));
                  setEditingDetail(null);
                }}
                onChange={setLotForm}
                onSubmit={(event) => void saveLot(event)}
                onNew={() => {
                  setSelected(null);
                  setLotForm(emptyLotForm);
                  setEditingDetail(null);
                  setCancelReason('');
                  setIsLotFormOpen(true);
                }}
              />
            )}

            <LotDetail
              lot={selected}
              canManage={canManage}
              editable={selectedEditable}
              onEditDetail={(detail) => {
                setEditingDetail(detail);
                setDetailForm(fillDetailForm(detail));
              }}
              onDeleteDetail={(detail) => void removeDetail(detail)}
            />

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              {selectedEditable && (
                <DetailForm
                  form={detailForm}
                  variants={variants}
                  editing={editingDetail}
                  isSaving={isSaving}
                  onChange={setDetailForm}
                  onCancel={() => {
                    setEditingDetail(null);
                    setDetailForm(emptyDetailForm);
                  }}
                  onSubmit={(event) => void saveDetail(event)}
                />
              )}

              {canManage && selected.estadoLote !== 'ANULADO' && (
                <LotActions
                  lot={selected}
                  canOpenLabels={canOpenLabels}
                  cancelReason={cancelReason}
                  onCancelReason={setCancelReason}
                  onConfirm={() => void confirmSelectedLot()}
                  onCancelLot={() => void cancelSelectedLot()}
                  onOpenLabels={() => void openLabels()}
                />
              )}
            </div>
          </section>
        </Modal>
      )}

      {confirmationPrompt && (
        <Modal
          title="Lote confirmado correctamente"
          onClose={() => setConfirmationPrompt(null)}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-stone-700">
              Etiquetas disponibles para imprimir: {confirmationPrompt.totalEtiquetas}
            </p>
            <div className="space-y-2 rounded-md border border-stone-200 bg-stone-50 p-3">
              {confirmationPrompt.detalles.map((detail, index) => (
                <p
                  key={`${detail.label}-${index}`}
                  className="flex justify-between gap-3 text-sm text-stone-700"
                >
                  <span>{detail.label}</span>
                  <strong>{detail.cantidad}</strong>
                </p>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  void openLabels(confirmationPrompt.idLote, confirmationPrompt.numeroLote)
                }
                className={primaryButtonClassName}
              >
                Imprimir etiquetas
              </button>
              <button
                type="button"
                onClick={() => setConfirmationPrompt(null)}
                className={secondaryButtonClassName}
              >
                No imprimir ahora
              </button>
            </div>
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
    </section>
  );
}

function LotForm({
  form,
  providers,
  selected,
  isSaving,
  editable,
  onCancel,
  onChange,
  onSubmit,
  onNew,
}: {
  form: EntryLotFormValues;
  providers: Provider[];
  selected: EntryLot | null;
  isSaving: boolean;
  editable: boolean;
  onCancel: () => void;
  onChange: (form: EntryLotFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNew: () => void;
}) {
  const creating = !selected;
  const disabled = !!selected && !editable;

  if (disabled && selected) {
    return (
      <section className="rounded-md border border-stone-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-stone-950">Formulario lote</h2>
          <button type="button" onClick={onNew} className={secondaryButtonClassName}>
            Nuevo lote
          </button>
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <Info label="Codigo lote" value={selected.numeroLote} />
          <Info label="Proveedor" value={selected.proveedor?.nombreProveedor ?? 'Sin proveedor'} />
          <Info label="Estado" value={selected.estadoLote} />
          <Info label="Fecha" value={selected.fechaLote.slice(0, 10)} />
          <Info label="Factura" value={selected.numeroFactura ?? 'Sin factura'} />
          <Info label="Observaciones" value={selected.observaciones ?? 'Sin observaciones'} />
        </dl>
      </section>
    );
  }

  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-950">Formulario lote</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Proveedor">
          <select
            disabled={disabled}
            value={form.id_proveedor}
            onChange={(event) => onChange({ ...form, id_proveedor: event.target.value })}
            className={inputClassName}
          >
            <option value="">Sin proveedor</option>
            {providers.map((provider) => (
              <option key={provider.idProveedor} value={provider.idProveedor}>
                {provider.nombreProveedor}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Factura proveedor">
          <input
            disabled={disabled}
            value={form.numero_factura}
            onChange={(event) => onChange({ ...form, numero_factura: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Fecha lote">
          <input
            disabled={disabled}
            type="date"
            value={form.fecha_lote}
            onChange={(event) => onChange({ ...form, fecha_lote: event.target.value })}
            className={inputClassName}
          />
        </Field>
        <Field label="Observaciones">
          <input
            disabled={disabled}
            value={form.observaciones}
            onChange={(event) => onChange({ ...form, observaciones: event.target.value })}
            className={inputClassName}
          />
        </Field>
      </div>
      {!disabled && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
            {isSaving ? 'Guardando...' : creating ? 'Crear lote' : 'Guardar lote'}
          </button>
          <button type="button" onClick={onCancel} className={secondaryButtonClassName}>
            Cancelar
          </button>
          {!creating && (
            <button type="button" onClick={onNew} className={secondaryButtonClassName}>
              Nuevo lote
            </button>
          )}
        </div>
      )}
    </form>
  );
}

function LotsTable({
  lots,
  selected,
  onSelect,
}: {
  lots: EntryLotSummary[];
  selected: EntryLot | null;
  onSelect: (lot: EntryLotSummary) => void;
}) {
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Lote</th>
            <th className="px-4 py-3">Proveedor</th>
            <th className="px-4 py-3">Detalles</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Accion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {lots.map((lot) => (
            <tr key={lot.idLote}>
              <td className="px-4 py-3">
                <p className="font-medium text-stone-950">{lot.numeroLote}</p>
                <p className="text-xs text-stone-500">{lot.numeroFactura ?? 'Sin factura'}</p>
              </td>
              <td className="px-4 py-3 text-stone-600">{lot.nombreProveedor ?? 'Sin proveedor'}</td>
              <td className="px-4 py-3 text-stone-700">{lot.cantidadDetalles}</td>
              <td className="px-4 py-3 text-stone-700">{currency(lot.totalEstimado)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={lot.estadoLote} />
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onSelect(lot)}
                  className={
                    selected?.idLote === lot.idLote
                      ? primaryButtonClassName
                      : secondaryButtonClassName
                  }
                >
                  Ver lote
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LotHeader({ lot }: { lot: EntryLot }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Codigo lote" value={lot.numeroLote} />
        <div>
          <dt className="text-xs uppercase text-stone-500">Estado</dt>
          <dd className="mt-1">
            <StatusBadge status={lot.estadoLote} />
          </dd>
        </div>
        <Info label="Proveedor" value={lot.proveedor?.nombreProveedor ?? 'Sin proveedor'} />
        <Info label="Fecha lote" value={lot.fechaLote.slice(0, 10)} />
      </div>
    </div>
  );
}

function LotDetail({
  lot,
  canManage,
  editable,
  onEditDetail,
  onDeleteDetail,
}: {
  lot: EntryLot;
  canManage: boolean;
  editable: boolean;
  onEditDetail: (detail: EntryLotDetail) => void;
  onDeleteDetail: (detail: EntryLotDetail) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
      <div className="border-b border-stone-100 p-4">
        <h2 className="text-sm font-semibold text-stone-950">Detalles del lote</h2>
      </div>

      {lot.detalles.length === 0 ? (
        <div className="p-4">
          <EmptyState message="Este lote no tiene detalles." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Variante</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Costo de compra unitario</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {lot.detalles.map((detail) => (
                <tr key={detail.idDetalleLote}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-950">{detail.producto.nombreProducto}</p>
                    <p className="text-xs text-stone-500">
                      {detail.variante.sku} / Talla {detail.variante.talla ?? 'Unica'} / Color{' '}
                      {detail.variante.color ?? 'Sin color'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{detail.cantidad}</td>
                  <td className="px-4 py-3 text-stone-700">
                    {detail.costoUnitario !== undefined ? currency(detail.costoUnitario) : 'Oculto'}
                  </td>
                  <td className="px-4 py-3">
                    {canManage && editable ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onEditDetail(detail)}
                          className={secondaryButtonClassName}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteDetail(detail)}
                          className={secondaryButtonClassName}
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-500">Solo lectura</span>
                    )}
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

function DetailForm({
  form,
  variants,
  editing,
  isSaving,
  onChange,
  onCancel,
  onSubmit,
}: {
  form: EntryLotDetailFormValues;
  variants: Variant[];
  editing: EntryLotDetail | null;
  isSaving: boolean;
  onChange: (form: EntryLotDetailFormValues) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-950">
          {editing ? 'Editar detalle' : 'Agregar detalle'}
        </h2>
        {editing && (
          <button type="button" onClick={onCancel} className={secondaryButtonClassName}>
            Cancelar
          </button>
        )}
      </div>
      <div className="grid gap-3">
        <Field label="Variante">
          <select
            required
            disabled={!!editing}
            value={form.id_variante}
            onChange={(event) => onChange({ ...form, id_variante: event.target.value })}
            className={inputClassName}
          >
            <option value="">Selecciona variante</option>
            {variants.map((variant) => (
              <option key={variant.idVariante} value={variant.idVariante}>
                {variant.producto.nombreProducto ?? 'Producto'} / {variant.sku}
              </option>
            ))}
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
        <Field label="Costo de compra unitario">
          <input
            type="number"
            min={0}
            step={1}
            value={form.costo_unitario}
            onChange={(event) => onChange({ ...form, costo_unitario: Number(event.target.value) })}
            className={inputClassName}
          />
        </Field>
        <Field label="Observaciones">
          <textarea
            value={form.observaciones}
            onChange={(event) => onChange({ ...form, observaciones: event.target.value })}
            className={textareaClassName}
          />
        </Field>
        <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
          {editing ? 'Guardar detalle' : 'Agregar detalle'}
        </button>
      </div>
    </form>
  );
}

function LotActions({
  lot,
  canOpenLabels,
  cancelReason,
  onCancelReason,
  onConfirm,
  onCancelLot,
  onOpenLabels,
}: {
  lot: EntryLot;
  canOpenLabels: boolean;
  cancelReason: string;
  onCancelReason: (value: string) => void;
  onConfirm: () => void;
  onCancelLot: () => void;
  onOpenLabels: () => void;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-stone-950">Acciones del lote</h2>
      <div className="mt-4 space-y-3">
        {lot.estadoLote === 'BORRADOR' && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onConfirm} className={primaryButtonClassName}>
              Confirmar lote
            </button>
          </div>
        )}
        {canOpenLabels && (
          <button type="button" onClick={onOpenLabels} className={secondaryButtonClassName}>
            Ver etiquetas
          </button>
        )}
        {!isCancelOpen ? (
          <button
            type="button"
            onClick={() => setIsCancelOpen(true)}
            className={secondaryButtonClassName}
          >
            Anular
          </button>
        ) : (
          <div className="space-y-3">
            <Field label="Motivo de anulacion">
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
                onClick={onCancelLot}
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
    </div>
  );
}
