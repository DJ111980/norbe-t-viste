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
import {
  canCancelCreditPayments,
  canCancelIndependentCredits,
  canManageCreditAdjustments,
  canManageOldDebts,
  canRegisterCreditPayments,
  canViewGeneralPortfolio,
} from '../permissions';
import { listClients } from '../services/clients';
import {
  cancelCredit,
  cancelCreditPayment,
  createCreditAdjustment,
  createCreditPayment,
  createOldDebt,
  creditPaymentMethods,
  getCredit,
  listClientCredits,
  listCredits,
  type CreditFilters,
} from '../services/credits';
import { getClientPortfolio, getPortfolio, type PortfolioFilters } from '../services/portfolio';
import type {
  Client,
  ClientPortfolio,
  CreditAdjustmentFormValues,
  CreditDetail,
  CreditOrigin,
  CreditPayment,
  CreditPaymentFormValues,
  CreditStatus,
  CreditSummary,
  OldDebtFormValues,
  PaymentMethod,
  Portfolio,
  UserRole,
} from '../types';

const emptyOldDebtForm: OldDebtFormValues = {
  id_cliente: '',
  monto_inicial: 0,
  descripcion: '',
  tipo_deuda_antigua: 'SOLO_MONTO',
};

const emptyPaymentForm: CreditPaymentFormValues = {
  valor_abono: 0,
  metodo_pago: 'EFECTIVO',
  referencia_pago: '',
  observaciones: '',
};

const emptyAdjustmentForm: CreditAdjustmentFormValues = {
  tipo_ajuste: 'AUMENTO',
  valor_ajuste: 0,
  saldo_final: 0,
  motivo: '',
};

const creditStatuses: CreditStatus[] = ['PENDIENTE', 'PARCIAL', 'PAGADO', 'VENCIDO', 'ANULADO'];
const creditOrigins: CreditOrigin[] = ['VENTA', 'DEUDA_ANTIGUA', 'AJUSTE_MANUAL'];

export function canShowCreditPaymentForm(role: UserRole, credit: CreditDetail | null): boolean {
  return Boolean(
    credit &&
    canRegisterCreditPayments(role) &&
    credit.estadoCredito !== 'ANULADO' &&
    credit.estadoCredito !== 'PAGADO' &&
    credit.saldoPendiente > 0,
  );
}

export function canShowCreditAdjustmentForm(role: UserRole, credit: CreditDetail | null): boolean {
  return Boolean(credit && canManageCreditAdjustments(role) && credit.estadoCredito !== 'ANULADO');
}

export function canShowCreditPaymentCancel(role: UserRole, payment: CreditPayment): boolean {
  return canCancelCreditPayments(role) && payment.estado_abono === 'ACTIVO';
}

export function canShowCreditCancel(role: UserRole, credit: CreditDetail | null): boolean {
  return Boolean(
    credit &&
    canCancelIndependentCredits(role) &&
    credit.origenCredito === 'DEUDA_ANTIGUA' &&
    credit.estadoCredito !== 'ANULADO' &&
    credit.abonos.length === 0 &&
    credit.ajustes.length === 0,
  );
}

export function isPositiveAmount(value: number): boolean {
  return Number.isFinite(value) && value > 0;
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

function clientLabel(client: Client): string {
  return `${client.nombreCompleto}${client.documento ? ` / ${client.documento}` : ''}`;
}

function creditLabel(credit: CreditSummary): string {
  return `${credit.cliente.nombreCompleto} / ${credit.origenCredito} / ${currency(
    credit.saldoPendiente,
  )}`;
}

export function PortfolioPage({
  initialView,
  onSessionExpired,
}: {
  initialView: 'portfolio' | 'credits';
  onSessionExpired: () => void;
}) {
  const { token, user, logout } = useAuth();
  const role = user?.rol ?? 'VENDEDOR';
  const [clients, setClients] = useState<Client[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [clientPortfolio, setClientPortfolio] = useState<ClientPortfolio | null>(null);
  const [credits, setCredits] = useState<CreditSummary[]>([]);
  const [selected, setSelected] = useState<CreditDetail | null>(null);
  const [selectedClient, setSelectedClient] = useState('');
  const [filters, setFilters] = useState<CreditFilters>({
    cliente: '',
    estado: '',
    origenCredito: '',
    fechaDesde: '',
    fechaHasta: '',
    limit: 100,
    offset: 0,
  });
  const [oldDebtForm, setOldDebtForm] = useState<OldDebtFormValues>(emptyOldDebtForm);
  const [paymentForm, setPaymentForm] = useState<CreditPaymentFormValues>(emptyPaymentForm);
  const [adjustmentForm, setAdjustmentForm] =
    useState<CreditAdjustmentFormValues>(emptyAdjustmentForm);
  const [cancelPayment, setCancelPayment] = useState<{ idAbono: string; motivo: string } | null>(
    null,
  );
  const [cancelCreditReason, setCancelCreditReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const activeClients = useMemo(
    () => clients.filter((client) => client.estado === 'ACTIVO'),
    [clients],
  );
  const canViewGeneral = canViewGeneralPortfolio(role);

  async function expireIfNeeded(actionError: unknown): Promise<boolean> {
    if (!isUnauthorizedError(actionError)) return false;
    await logout();
    onSessionExpired();
    return true;
  }

  async function loadBaseData() {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const clientsData = await listClients(token, '');
      setClients(clientsData);
      const firstClient =
        clientsData.find((client) => client.estado === 'ACTIVO') ?? clientsData[0];

      if (canViewGeneral) {
        const [portfolioData, creditsData] = await Promise.all([
          getPortfolio(token, filters as PortfolioFilters),
          listCredits(token, filters),
        ]);
        setPortfolio(portfolioData);
        setCredits(creditsData);
      } else if (firstClient) {
        setSelectedClient((current) => current || firstClient.idCliente);
        await loadClientScope(firstClient.idCliente);
      }
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setError(handleMessage(loadError, 'No se pudo cargar cartera y creditos.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadGeneral(nextFilters = filters) {
    if (!token || !canViewGeneral) return;
    setIsLoading(true);
    setError(null);

    try {
      const [portfolioData, creditsData] = await Promise.all([
        getPortfolio(token, nextFilters as PortfolioFilters),
        listCredits(token, nextFilters),
      ]);
      setPortfolio(portfolioData);
      setCredits(creditsData);
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setError(handleMessage(loadError, 'No se pudo cargar la cartera general.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadClientScope(idCliente: string) {
    if (!token || !idCliente) return;
    setIsLoading(true);
    setError(null);

    try {
      const [portfolioData, creditsData] = await Promise.all([
        getClientPortfolio(token, idCliente),
        listClientCredits(token, idCliente),
      ]);
      setClientPortfolio(portfolioData);
      setCredits(creditsData);
      setSelectedClient(idCliente);
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setError(handleMessage(loadError, 'No se pudo cargar la cartera del cliente.'));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCredit(idCredito: string) {
    if (!token) return;
    setFormError(null);

    try {
      const detail = await getCredit(token, idCredito);
      setSelected(detail);
      setPaymentForm(emptyPaymentForm);
      setAdjustmentForm(emptyAdjustmentForm);
      setCancelPayment(null);
      setCancelCreditReason('');
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setFormError(handleMessage(loadError, 'No se pudo cargar el detalle del credito.'));
    }
  }

  async function refreshCurrentScope() {
    if (canViewGeneral) {
      await loadGeneral();
    } else if (selectedClient) {
      await loadClientScope(selectedClient);
    }
    if (selected) await loadCredit(selected.idCredito);
  }

  useEffect(() => {
    void loadBaseData();
  }, [token]);

  async function saveOldDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !canManageOldDebts(role)) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    if (!oldDebtForm.id_cliente || !isPositiveAmount(oldDebtForm.monto_inicial)) {
      setFormError('Selecciona cliente y monto mayor que 0.');
      setIsSaving(false);
      return;
    }

    try {
      const result = await createOldDebt(token, oldDebtForm);
      setSuccess(`Deuda antigua creada por ${currency(result.saldo_pendiente)}.`);
      setOldDebtForm(emptyOldDebtForm);
      await refreshCurrentScope();
      await loadCredit(result.id_credito);
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setFormError(handleMessage(saveError, 'No se pudo crear la deuda antigua.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selected || !canShowCreditPaymentForm(role, selected)) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    if (!isPositiveAmount(paymentForm.valor_abono)) {
      setFormError('El abono debe ser mayor que 0.');
      setIsSaving(false);
      return;
    }
    if (paymentForm.valor_abono > selected.saldoPendiente) {
      setFormError('El abono no puede superar el saldo pendiente.');
      setIsSaving(false);
      return;
    }

    try {
      const result = await createCreditPayment(token, selected.idCredito, paymentForm);
      setSuccess(`Abono registrado. Nuevo saldo: ${currency(result.saldo_nuevo)}.`);
      setPaymentForm(emptyPaymentForm);
      await refreshCurrentScope();
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setFormError(handleMessage(saveError, 'No se pudo registrar el abono.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selected || !canShowCreditAdjustmentForm(role, selected)) return;
    setIsSaving(true);
    setFormError(null);
    setSuccess(null);

    const amount =
      adjustmentForm.tipo_ajuste === 'CORRECCION'
        ? adjustmentForm.saldo_final
        : adjustmentForm.valor_ajuste;
    if (!isPositiveAmount(amount) || !adjustmentForm.motivo.trim()) {
      setFormError('El ajuste requiere valor mayor que 0 y motivo.');
      setIsSaving(false);
      return;
    }

    try {
      const result = await createCreditAdjustment(token, selected.idCredito, adjustmentForm);
      setSuccess(`Ajuste registrado. Nuevo saldo: ${currency(result.saldo_despues)}.`);
      setAdjustmentForm(emptyAdjustmentForm);
      await refreshCurrentScope();
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setFormError(handleMessage(saveError, 'No se pudo registrar el ajuste.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelPaymentAction() {
    if (!token || !selected || !cancelPayment?.motivo.trim()) return;
    setFormError(null);
    setSuccess(null);

    try {
      const result = await cancelCreditPayment(
        token,
        selected.idCredito,
        cancelPayment.idAbono,
        cancelPayment.motivo,
      );
      setSuccess(`Abono anulado. Nuevo saldo: ${currency(result.saldo_nuevo)}.`);
      setCancelPayment(null);
      await refreshCurrentScope();
    } catch (cancelError) {
      if (await expireIfNeeded(cancelError)) return;
      setFormError(handleMessage(cancelError, 'No se pudo anular el abono.'));
    }
  }

  async function cancelCreditAction() {
    if (!token || !selected || !cancelCreditReason.trim() || !canShowCreditCancel(role, selected)) {
      return;
    }
    setFormError(null);
    setSuccess(null);

    try {
      await cancelCredit(token, selected.idCredito, cancelCreditReason);
      setSuccess('Credito independiente anulado.');
      setCancelCreditReason('');
      await refreshCurrentScope();
    } catch (cancelError) {
      if (await expireIfNeeded(cancelError)) return;
      setFormError(handleMessage(cancelError, 'No se pudo anular el credito.'));
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={initialView === 'portfolio' ? 'Cartera' : 'Creditos'}
        description="Consulta cartera, revisa creditos y registra abonos sin editar saldos manualmente."
      />

      {!canViewGeneral && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Tu usuario consulta cartera por cliente. La cartera general esta reservada para
          administradores.
        </div>
      )}

      {error && <ErrorMessage message={error} />}
      {formError && <ErrorMessage message={formError} />}
      {success && <SuccessMessage message={success} />}

      <CreditFiltersPanel
        filters={filters}
        clients={clients}
        selectedClient={selectedClient}
        canViewGeneral={canViewGeneral}
        onFiltersChange={setFilters}
        onSearch={() => void loadGeneral()}
        onSelectClient={(idCliente) => void loadClientScope(idCliente)}
      />

      {canViewGeneral && portfolio && <PortfolioSummaryCards portfolio={portfolio} />}
      {!canViewGeneral && clientPortfolio && (
        <ClientPortfolioSummary clientPortfolio={clientPortfolio} />
      )}

      {canManageOldDebts(role) && (
        <OldDebtForm
          form={oldDebtForm}
          clients={activeClients}
          isSaving={isSaving}
          onChange={setOldDebtForm}
          onSubmit={(event) => void saveOldDebt(event)}
        />
      )}

      {isLoading ? (
        <LoadingState />
      ) : credits.length === 0 ? (
        <EmptyState message="No hay creditos para mostrar." />
      ) : (
        <CreditsTable
          credits={credits}
          selected={selected}
          onSelect={(credit) => void loadCredit(credit.idCredito)}
        />
      )}

      {selected && (
        <CreditDetailPanel
          role={role}
          credit={selected}
          paymentForm={paymentForm}
          adjustmentForm={adjustmentForm}
          cancelPayment={cancelPayment}
          cancelCreditReason={cancelCreditReason}
          isSaving={isSaving}
          onPaymentChange={setPaymentForm}
          onAdjustmentChange={setAdjustmentForm}
          onCancelPaymentChange={setCancelPayment}
          onCancelCreditReason={setCancelCreditReason}
          onSavePayment={(event) => void savePayment(event)}
          onSaveAdjustment={(event) => void saveAdjustment(event)}
          onCancelPayment={() => void cancelPaymentAction()}
          onCancelCredit={() => void cancelCreditAction()}
        />
      )}
    </section>
  );
}

function CreditFiltersPanel({
  filters,
  clients,
  selectedClient,
  canViewGeneral,
  onFiltersChange,
  onSearch,
  onSelectClient,
}: {
  filters: CreditFilters;
  clients: Client[];
  selectedClient: string;
  canViewGeneral: boolean;
  onFiltersChange: (filters: CreditFilters) => void;
  onSearch: () => void;
  onSelectClient: (idCliente: string) => void;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      {canViewGeneral ? (
        <form
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_150px_150px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onSearch();
          }}
        >
          <select
            value={filters.cliente ?? ''}
            onChange={(event) => onFiltersChange({ ...filters, cliente: event.target.value })}
            className={inputClassName}
          >
            <option value="">Todos los clientes</option>
            {clients.map((client) => (
              <option key={client.idCliente} value={client.idCliente}>
                {clientLabel(client)}
              </option>
            ))}
          </select>
          <select
            value={filters.estado ?? ''}
            onChange={(event) =>
              onFiltersChange({ ...filters, estado: event.target.value as CreditStatus | '' })
            }
            className={inputClassName}
          >
            <option value="">Todos los estados</option>
            {creditStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={filters.origenCredito ?? ''}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                origenCredito: event.target.value as CreditOrigin | '',
              })
            }
            className={inputClassName}
          >
            <option value="">Todos los origenes</option>
            {creditOrigins.map((origin) => (
              <option key={origin} value={origin}>
                {origin}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={filters.fechaDesde ?? ''}
            onChange={(event) => onFiltersChange({ ...filters, fechaDesde: event.target.value })}
            className={inputClassName}
          />
          <input
            type="date"
            value={filters.fechaHasta ?? ''}
            onChange={(event) => onFiltersChange({ ...filters, fechaHasta: event.target.value })}
            className={inputClassName}
          />
          <button type="submit" className={secondaryButtonClassName}>
            Buscar
          </button>
        </form>
      ) : (
        <Field label="Cliente">
          <select
            value={selectedClient}
            onChange={(event) => onSelectClient(event.target.value)}
            className={inputClassName}
          >
            <option value="">Selecciona cliente</option>
            {clients.map((client) => (
              <option key={client.idCliente} value={client.idCliente}>
                {clientLabel(client)}
              </option>
            ))}
          </select>
        </Field>
      )}
    </div>
  );
}

function PortfolioSummaryCards({ portfolio }: { portfolio: Portfolio }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <SummaryCard
        label="Saldo pendiente"
        value={currency(portfolio.resumen.totalSaldoPendiente)}
      />
      <SummaryCard label="Clientes con deuda" value={String(portfolio.resumen.clientesConDeuda)} />
      <SummaryCard label="Pendientes" value={String(portfolio.resumen.creditosPendientes)} />
      <SummaryCard label="Parciales" value={String(portfolio.resumen.creditosParciales)} />
    </div>
  );
}

function ClientPortfolioSummary({ clientPortfolio }: { clientPortfolio: ClientPortfolio }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <SummaryCard label="Cliente" value={clientPortfolio.cliente.nombreCompleto} />
      <SummaryCard
        label="Saldo pendiente"
        value={currency(clientPortfolio.resumen.totalSaldoPendiente)}
      />
      <SummaryCard
        label="Creditos activos"
        value={String(clientPortfolio.creditosActivos.length)}
      />
      <SummaryCard
        label="Ultimo abono"
        value={
          clientPortfolio.ultimoAbono
            ? currency(clientPortfolio.ultimoAbono.valorAbono)
            : 'Sin abonos'
        }
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-stone-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function OldDebtForm({
  form,
  clients,
  isSaving,
  onChange,
  onSubmit,
}: {
  form: OldDebtFormValues;
  clients: Client[];
  isSaving: boolean;
  onChange: (form: OldDebtFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <h2 className="text-sm font-semibold text-stone-950">Nueva deuda antigua</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
        <Field label="Cliente">
          <select
            required
            value={form.id_cliente}
            onChange={(event) => onChange({ ...form, id_cliente: event.target.value })}
            className={inputClassName}
          >
            <option value="">Selecciona cliente activo</option>
            {clients.map((client) => (
              <option key={client.idCliente} value={client.idCliente}>
                {clientLabel(client)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Monto inicial">
          <input
            required
            type="number"
            min={1}
            step={1}
            value={form.monto_inicial}
            onChange={(event) => onChange({ ...form, monto_inicial: Number(event.target.value) })}
            className={inputClassName}
          />
        </Field>
        <Field label="Tipo">
          <select
            value={form.tipo_deuda_antigua}
            onChange={(event) =>
              onChange({
                ...form,
                tipo_deuda_antigua: event.target.value as OldDebtFormValues['tipo_deuda_antigua'],
              })
            }
            className={inputClassName}
          >
            <option value="SOLO_MONTO">Solo monto</option>
            <option value="CON_PRODUCTOS">Con productos</option>
          </select>
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Descripcion">
          <textarea
            value={form.descripcion}
            onChange={(event) => onChange({ ...form, descripcion: event.target.value })}
            className={textareaClassName}
          />
        </Field>
      </div>
      <div className="mt-4">
        <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
          {isSaving ? 'Guardando...' : 'Crear deuda'}
        </button>
      </div>
    </form>
  );
}

function CreditsTable({
  credits,
  selected,
  onSelect,
}: {
  credits: CreditSummary[];
  selected: CreditDetail | null;
  onSelect: (credit: CreditSummary) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Origen</th>
            <th className="px-4 py-3">Inicial</th>
            <th className="px-4 py-3">Abonado</th>
            <th className="px-4 py-3">Saldo</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Accion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {credits.map((credit) => (
            <tr
              key={credit.idCredito}
              className={credit.estadoCredito === 'ANULADO' ? 'bg-red-50/40' : ''}
            >
              <td className="px-4 py-3">
                <p className="font-medium text-stone-950">{credit.cliente.nombreCompleto}</p>
                <p className="text-xs text-stone-500">{credit.cliente.documento ?? 'Sin doc.'}</p>
              </td>
              <td className="px-4 py-3 text-stone-700">{credit.origenCredito}</td>
              <td className="px-4 py-3 text-stone-700">{currency(credit.montoInicial)}</td>
              <td className="px-4 py-3 text-stone-700">{currency(credit.montoAbonado)}</td>
              <td className="px-4 py-3 font-semibold text-stone-950">
                {currency(credit.saldoPendiente)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={credit.estadoCredito} />
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onSelect(credit)}
                  className={
                    selected?.idCredito === credit.idCredito
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

function CreditDetailPanel({
  role,
  credit,
  paymentForm,
  adjustmentForm,
  cancelPayment,
  cancelCreditReason,
  isSaving,
  onPaymentChange,
  onAdjustmentChange,
  onCancelPaymentChange,
  onCancelCreditReason,
  onSavePayment,
  onSaveAdjustment,
  onCancelPayment,
  onCancelCredit,
}: {
  role: UserRole;
  credit: CreditDetail;
  paymentForm: CreditPaymentFormValues;
  adjustmentForm: CreditAdjustmentFormValues;
  cancelPayment: { idAbono: string; motivo: string } | null;
  cancelCreditReason: string;
  isSaving: boolean;
  onPaymentChange: (form: CreditPaymentFormValues) => void;
  onAdjustmentChange: (form: CreditAdjustmentFormValues) => void;
  onCancelPaymentChange: (state: { idAbono: string; motivo: string } | null) => void;
  onCancelCreditReason: (value: string) => void;
  onSavePayment: (event: FormEvent<HTMLFormElement>) => void;
  onSaveAdjustment: (event: FormEvent<HTMLFormElement>) => void;
  onCancelPayment: () => void;
  onCancelCredit: () => void;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-stone-950">{creditLabel(credit)}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <SummaryCard label="Inicial" value={currency(credit.montoInicial)} />
            <SummaryCard label="Abonado" value={currency(credit.montoAbonado)} />
            <SummaryCard label="Saldo" value={currency(credit.saldoPendiente)} />
            <SummaryCard label="Estado" value={credit.estadoCredito} />
          </div>
          {credit.descripcionCredito && (
            <p className="mt-3 rounded-md bg-stone-100 p-3 text-sm text-stone-700">
              {credit.descripcionCredito}
            </p>
          )}
          {credit.venta && (
            <p className="mt-3 rounded-md bg-stone-100 p-3 text-sm text-stone-700">
              Venta asociada: {credit.venta.numero_venta}. La anulación directa de creditos de venta
              la bloquea el backend.
            </p>
          )}
        </div>

        {credit.detalles.length > 0 && (
          <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
            <div className="border-b border-stone-100 p-4">
              <h2 className="text-sm font-semibold text-stone-950">Productos del credito</h2>
            </div>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {credit.detalles.map((line) => (
                  <tr key={line.id_detalle_credito}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-950">{line.nombre_producto}</p>
                      <p className="text-xs text-stone-500">
                        {line.sku ?? 'Sin SKU'} / Talla {line.talla ?? 'Unica'} / Color{' '}
                        {line.color ?? 'Sin color'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-stone-700">{line.cantidad}</td>
                    <td className="px-4 py-3 text-stone-700">{currency(line.precio_unitario)}</td>
                    <td className="px-4 py-3 text-stone-700">{currency(line.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <CreditPaymentsPanel
          role={role}
          payments={credit.abonos}
          cancelPayment={cancelPayment}
          onCancelPaymentChange={onCancelPaymentChange}
          onCancelPayment={onCancelPayment}
        />

        <CreditAdjustmentsPanel adjustments={credit.ajustes} />
      </div>

      <div className="space-y-4">
        {canShowCreditPaymentForm(role, credit) && (
          <CreditPaymentForm
            form={paymentForm}
            saldoPendiente={credit.saldoPendiente}
            isSaving={isSaving}
            onChange={onPaymentChange}
            onSubmit={onSavePayment}
          />
        )}

        {canShowCreditAdjustmentForm(role, credit) && (
          <CreditAdjustmentForm
            form={adjustmentForm}
            isSaving={isSaving}
            onChange={onAdjustmentChange}
            onSubmit={onSaveAdjustment}
          />
        )}

        {canShowCreditCancel(role, credit) && (
          <div className="rounded-md border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-stone-950">Anular deuda antigua</h2>
            <Field label="Motivo obligatorio">
              <textarea
                value={cancelCreditReason}
                onChange={(event) => onCancelCreditReason(event.target.value)}
                className={textareaClassName}
              />
            </Field>
            <button
              type="button"
              disabled={!cancelCreditReason.trim()}
              onClick={onCancelCredit}
              className={secondaryButtonClassName}
            >
              Anular credito
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function CreditPaymentForm({
  form,
  saldoPendiente,
  isSaving,
  onChange,
  onSubmit,
}: {
  form: CreditPaymentFormValues;
  saldoPendiente: number;
  isSaving: boolean;
  onChange: (form: CreditPaymentFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <h2 className="text-sm font-semibold text-stone-950">Registrar abono</h2>
      <p className="mt-1 text-xs text-stone-500">Saldo actual: {currency(saldoPendiente)}</p>
      <div className="mt-4 space-y-3">
        <Field label="Valor abono">
          <input
            required
            type="number"
            min={1}
            max={saldoPendiente}
            step={1}
            value={form.valor_abono}
            onChange={(event) => onChange({ ...form, valor_abono: Number(event.target.value) })}
            className={inputClassName}
          />
        </Field>
        <Field label="Metodo">
          <select
            value={form.metodo_pago}
            onChange={(event) =>
              onChange({ ...form, metodo_pago: event.target.value as PaymentMethod })
            }
            className={inputClassName}
          >
            {creditPaymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Referencia">
          <input
            value={form.referencia_pago}
            onChange={(event) => onChange({ ...form, referencia_pago: event.target.value })}
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
      </div>
      <button type="submit" disabled={isSaving} className={primaryButtonClassName}>
        {isSaving ? 'Guardando...' : 'Registrar abono'}
      </button>
    </form>
  );
}

function CreditAdjustmentForm({
  form,
  isSaving,
  onChange,
  onSubmit,
}: {
  form: CreditAdjustmentFormValues;
  isSaving: boolean;
  onChange: (form: CreditAdjustmentFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={onSubmit}>
      <h2 className="text-sm font-semibold text-stone-950">Ajuste administrativo</h2>
      <div className="mt-4 space-y-3">
        <Field label="Tipo">
          <select
            value={form.tipo_ajuste}
            onChange={(event) =>
              onChange({
                ...form,
                tipo_ajuste: event.target.value as CreditAdjustmentFormValues['tipo_ajuste'],
              })
            }
            className={inputClassName}
          >
            <option value="AUMENTO">Aumento</option>
            <option value="DESCUENTO">Descuento</option>
            <option value="CORRECCION">Correccion</option>
          </select>
        </Field>
        {form.tipo_ajuste === 'CORRECCION' ? (
          <Field label="Saldo final">
            <input
              required
              type="number"
              min={0}
              step={1}
              value={form.saldo_final}
              onChange={(event) => onChange({ ...form, saldo_final: Number(event.target.value) })}
              className={inputClassName}
            />
          </Field>
        ) : (
          <Field label="Valor ajuste">
            <input
              required
              type="number"
              min={1}
              step={1}
              value={form.valor_ajuste}
              onChange={(event) => onChange({ ...form, valor_ajuste: Number(event.target.value) })}
              className={inputClassName}
            />
          </Field>
        )}
        <Field label="Motivo">
          <textarea
            required
            value={form.motivo}
            onChange={(event) => onChange({ ...form, motivo: event.target.value })}
            className={textareaClassName}
          />
        </Field>
      </div>
      <button type="submit" disabled={isSaving} className={secondaryButtonClassName}>
        {isSaving ? 'Guardando...' : 'Registrar ajuste'}
      </button>
    </form>
  );
}

function CreditPaymentsPanel({
  role,
  payments,
  cancelPayment,
  onCancelPaymentChange,
  onCancelPayment,
}: {
  role: UserRole;
  payments: CreditPayment[];
  cancelPayment: { idAbono: string; motivo: string } | null;
  onCancelPaymentChange: (state: { idAbono: string; motivo: string } | null) => void;
  onCancelPayment: () => void;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-stone-950">Abonos</h2>
      {payments.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">No hay abonos registrados.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {payments.map((payment) => (
            <div key={payment.id_abono} className="rounded-md border border-stone-200 p-3 text-sm">
              <p className="flex justify-between gap-3">
                <span>{payment.metodo_pago}</span>
                <strong>{currency(payment.valor_abono)}</strong>
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {payment.estado_abono} / {new Date(payment.creado_en).toLocaleString('es-CO')}
              </p>
              {canShowCreditPaymentCancel(role, payment) &&
                (cancelPayment?.idAbono === payment.id_abono ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={cancelPayment.motivo}
                      onChange={(event) =>
                        onCancelPaymentChange({
                          idAbono: payment.id_abono,
                          motivo: event.target.value,
                        })
                      }
                      placeholder="Motivo de anulacion"
                      className={textareaClassName}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!cancelPayment.motivo.trim()}
                        onClick={onCancelPayment}
                        className={secondaryButtonClassName}
                      >
                        Confirmar anulacion
                      </button>
                      <button
                        type="button"
                        onClick={() => onCancelPaymentChange(null)}
                        className={secondaryButtonClassName}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onCancelPaymentChange({ idAbono: payment.id_abono, motivo: '' })}
                    className="mt-3 h-9 rounded-md border border-stone-300 px-3 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    Anular abono
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreditAdjustmentsPanel({ adjustments }: { adjustments: CreditDetail['ajustes'] }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-stone-950">Ajustes</h2>
      {adjustments.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">No hay ajustes registrados.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {adjustments.map((adjustment) => (
            <div
              key={adjustment.id_ajuste}
              className="rounded-md border border-stone-200 p-3 text-sm"
            >
              <p className="flex justify-between gap-3">
                <span>{adjustment.tipo_ajuste}</span>
                <strong>{currency(adjustment.valor_ajuste)}</strong>
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {currency(adjustment.saldo_antes)} a {currency(adjustment.saldo_despues)}
              </p>
              <p className="mt-2 text-stone-700">{adjustment.motivo}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
