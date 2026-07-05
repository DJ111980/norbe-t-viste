import { FormEvent, useEffect, useState, type ReactNode } from 'react';
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
} from '../components/ui';
import { ApiClientError, isForbiddenError, isUnauthorizedError } from '../lib/api';
import { formatMoney, formatNumber } from '../lib/formatters';
import { canViewSensitiveReports } from '../permissions';
import {
  getEntryLotsReport,
  getInventoryMovementReport,
  getInventoryReport,
  getPortfolioReport,
  getReturnsReport,
  getSalesReport,
} from '../services/reports';
import type {
  EntryLotStatus,
  EntryLotsReportFilters,
  EntryLotsReportRow,
  EntryLotsReportTotals,
  InventoryMovementReportFilters,
  InventoryMovementReportRow,
  InventoryMovementReportTotals,
  InventoryMovementType,
  InventoryReferenceType,
  InventoryReportFilters,
  InventoryReportRow,
  InventoryReportTotals,
  PaginatedReport,
  PortfolioReportFilters,
  PortfolioReportRow,
  PortfolioReportTotals,
  ReturnsReportFilters,
  ReturnsReportRow,
  ReturnsReportTotals,
  SaleReturnStatus,
  SaleStatus,
  SaleType,
  SalesReportFilters,
  SalesReportRow,
  SalesReportTotals,
  UserRole,
  VariantStatus,
} from '../types';

type ReportTab = 'ventas' | 'inventario' | 'movimientos' | 'cartera' | 'devoluciones' | 'lotes';

const pageSizes = [10, 25, 50, 100];

const defaultSalesFilters: SalesReportFilters = {
  page: 1,
  page_size: 25,
  fecha_desde: '',
  fecha_hasta: '',
  tipo_venta: '',
  estado_venta: '',
  id_cliente: '',
  id_usuario: '',
};

const defaultInventoryFilters: InventoryReportFilters = {
  page: 1,
  page_size: 25,
  q: '',
  id_producto: '',
  id_categoria: '',
  estado_variante: '',
  bajo_stock: '',
  sin_stock: '',
};

const defaultMovementFilters: InventoryMovementReportFilters = {
  page: 1,
  page_size: 25,
  fecha_desde: '',
  fecha_hasta: '',
  id_variante: '',
  tipo_movimiento: '',
  referencia_tipo: '',
  referencia_id: '',
};

const defaultPortfolioFilters: PortfolioReportFilters = {
  page: 1,
  page_size: 25,
  id_cliente: '',
  estado_credito: '',
  origen_credito: '',
};

const defaultReturnsFilters: ReturnsReportFilters = {
  page: 1,
  page_size: 25,
  fecha_desde: '',
  fecha_hasta: '',
  tipo_venta: '',
  estado_devolucion: '',
  id_venta: '',
};

const defaultEntryLotsFilters: EntryLotsReportFilters = {
  page: 1,
  page_size: 25,
  fecha_desde: '',
  fecha_hasta: '',
  estado_lote: '',
  id_proveedor: '',
};

export function reportTabsForRole(role: UserRole): ReportTab[] {
  const basic: ReportTab[] = ['ventas', 'inventario'];
  return canViewSensitiveReports(role)
    ? [...basic, 'movimientos', 'cartera', 'devoluciones', 'lotes']
    : basic;
}

export function reportTabLabel(tab: ReportTab): string {
  const labels: Record<ReportTab, string> = {
    ventas: 'Ventas',
    inventario: 'Inventario',
    movimientos: 'Movimientos',
    cartera: 'Cartera',
    devoluciones: 'Devoluciones',
    lotes: 'Lotes de entrada',
  };

  return labels[tab];
}

const money = formatMoney;
const number = formatNumber;

function handleMessage(error: unknown, fallback: string): string {
  if (isForbiddenError(error)) return 'No tienes permisos para esta accion.';
  return error instanceof ApiClientError ? error.message : fallback;
}

export function ReportsPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, user, logout } = useAuth();
  const role = user?.rol ?? 'VENDEDOR';
  const allowedTabs = reportTabsForRole(role);
  const [activeTab, setActiveTab] = useState<ReportTab>(allowedTabs[0]);
  const [salesFilters, setSalesFilters] = useState<SalesReportFilters>(defaultSalesFilters);
  const [inventoryFilters, setInventoryFilters] =
    useState<InventoryReportFilters>(defaultInventoryFilters);
  const [movementFilters, setMovementFilters] =
    useState<InventoryMovementReportFilters>(defaultMovementFilters);
  const [portfolioFilters, setPortfolioFilters] =
    useState<PortfolioReportFilters>(defaultPortfolioFilters);
  const [returnsFilters, setReturnsFilters] = useState<ReturnsReportFilters>(defaultReturnsFilters);
  const [entryLotsFilters, setEntryLotsFilters] =
    useState<EntryLotsReportFilters>(defaultEntryLotsFilters);
  const [salesReport, setSalesReport] = useState<PaginatedReport<
    SalesReportRow,
    SalesReportTotals
  > | null>(null);
  const [inventoryReport, setInventoryReport] = useState<PaginatedReport<
    InventoryReportRow,
    InventoryReportTotals
  > | null>(null);
  const [movementReport, setMovementReport] = useState<PaginatedReport<
    InventoryMovementReportRow,
    InventoryMovementReportTotals
  > | null>(null);
  const [portfolioReport, setPortfolioReport] = useState<PaginatedReport<
    PortfolioReportRow,
    PortfolioReportTotals
  > | null>(null);
  const [returnsReport, setReturnsReport] = useState<PaginatedReport<
    ReturnsReportRow,
    ReturnsReportTotals
  > | null>(null);
  const [entryLotsReport, setEntryLotsReport] = useState<PaginatedReport<
    EntryLotsReportRow,
    EntryLotsReportTotals
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function expireIfNeeded(actionError: unknown): Promise<boolean> {
    if (!isUnauthorizedError(actionError)) return false;
    await logout();
    onSessionExpired();
    return true;
  }

  async function loadActiveReport(tab = activeTab) {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      if (tab === 'ventas') setSalesReport(await getSalesReport(token, salesFilters));
      if (tab === 'inventario')
        setInventoryReport(await getInventoryReport(token, inventoryFilters));
      if (tab === 'movimientos') {
        setMovementReport(await getInventoryMovementReport(token, movementFilters));
      }
      if (tab === 'cartera') setPortfolioReport(await getPortfolioReport(token, portfolioFilters));
      if (tab === 'devoluciones') setReturnsReport(await getReturnsReport(token, returnsFilters));
      if (tab === 'lotes') setEntryLotsReport(await getEntryLotsReport(token, entryLotsFilters));
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setError(handleMessage(loadError, 'No se pudo cargar el reporte.'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
      return;
    }
    void loadActiveReport(activeTab);
  }, [activeTab, token, role]);

  return (
    <section className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Consulta reportes JSON del backend. Esta pantalla no modifica datos ni exporta archivos."
      />

      <ReportTabs tabs={allowedTabs} activeTab={activeTab} onSelect={(tab) => setActiveTab(tab)} />

      {role === 'VENDEDOR' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Tu usuario consulta reportes operativos permitidos. Los reportes sensibles estan
          reservados para administradores.
        </div>
      )}

      {error && <ErrorMessage message={error} />}
      {isLoading && <LoadingState />}

      {activeTab === 'ventas' && (
        <SalesReportSection
          report={salesReport}
          filters={salesFilters}
          onFilters={setSalesFilters}
          onLoad={() => void loadActiveReport('ventas')}
        />
      )}
      {activeTab === 'inventario' && (
        <InventoryReportSection
          report={inventoryReport}
          filters={inventoryFilters}
          onFilters={setInventoryFilters}
          onLoad={() => void loadActiveReport('inventario')}
        />
      )}
      {activeTab === 'movimientos' && (
        <MovementReportSection
          report={movementReport}
          filters={movementFilters}
          onFilters={setMovementFilters}
          onLoad={() => void loadActiveReport('movimientos')}
        />
      )}
      {activeTab === 'cartera' && (
        <PortfolioReportSection
          report={portfolioReport}
          filters={portfolioFilters}
          onFilters={setPortfolioFilters}
          onLoad={() => void loadActiveReport('cartera')}
        />
      )}
      {activeTab === 'devoluciones' && (
        <ReturnsReportSection
          report={returnsReport}
          filters={returnsFilters}
          onFilters={setReturnsFilters}
          onLoad={() => void loadActiveReport('devoluciones')}
        />
      )}
      {activeTab === 'lotes' && (
        <EntryLotsReportSection
          report={entryLotsReport}
          filters={entryLotsFilters}
          onFilters={setEntryLotsFilters}
          onLoad={() => void loadActiveReport('lotes')}
        />
      )}
    </section>
  );
}

function ReportTabs({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: ReportTab[];
  activeTab: ReportTab;
  onSelect: (tab: ReportTab) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onSelect(tab)}
          className={activeTab === tab ? primaryButtonClassName : secondaryButtonClassName}
        >
          {reportTabLabel(tab)}
        </button>
      ))}
    </div>
  );
}

function FilterForm({ children, onSubmit }: { children: ReactNode; onSubmit: () => void }) {
  return (
    <form
      className="rounded-md border border-stone-200 bg-white p-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-3 lg:grid-cols-4">{children}</div>
      <button type="submit" className={`${primaryButtonClassName} mt-4`}>
        Consultar
      </button>
    </form>
  );
}

function PageSizeField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <Field label="Tamano pagina">
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={inputClassName}
      >
        {pageSizes.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </Field>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    </Field>
  );
}

function PaginationControls({
  paginacion,
  onPage,
}: {
  paginacion: PaginatedReport<unknown, unknown>['paginacion'] | undefined;
  onPage: (page: number) => void;
}) {
  if (!paginacion) return null;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Pagina {paginacion.page} de {Math.max(paginacion.total_pages, 1)} /{' '}
        {number(paginacion.total_items)} registros
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={paginacion.page <= 1}
          onClick={() => onPage(paginacion.page - 1)}
          className={secondaryButtonClassName}
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={paginacion.page >= paginacion.total_pages}
          onClick={() => onPage(paginacion.page + 1)}
          className={secondaryButtonClassName}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

function TotalsPanel({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <article key={item.label} className="rounded-md border border-stone-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-stone-500">{item.label}</p>
          <p className="mt-2 text-lg font-semibold text-stone-950">{item.value}</p>
        </article>
      ))}
    </div>
  );
}

function ReportTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white">{children}</div>
  );
}

function SalesReportSection({
  report,
  filters,
  onFilters,
  onLoad,
}: {
  report: PaginatedReport<SalesReportRow, SalesReportTotals> | null;
  filters: SalesReportFilters;
  onFilters: (filters: SalesReportFilters) => void;
  onLoad: () => void;
}) {
  return (
    <ReportShell
      filters={
        <FilterForm onSubmit={onLoad}>
          <DateField
            label="Fecha desde"
            value={filters.fecha_desde}
            onChange={(fecha_desde) => onFilters({ ...filters, fecha_desde, page: 1 })}
          />
          <DateField
            label="Fecha hasta"
            value={filters.fecha_hasta}
            onChange={(fecha_hasta) => onFilters({ ...filters, fecha_hasta, page: 1 })}
          />
          <Field label="Tipo venta">
            <select
              value={filters.tipo_venta}
              onChange={(event) =>
                onFilters({ ...filters, tipo_venta: event.target.value as SaleType | '', page: 1 })
              }
              className={inputClassName}
            >
              <option value="">Todos</option>
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Credito</option>
              <option value="MIXTA">Mixta</option>
            </select>
          </Field>
          <Field label="Estado">
            <select
              value={filters.estado_venta}
              onChange={(event) =>
                onFilters({
                  ...filters,
                  estado_venta: event.target.value as SaleStatus | '',
                  page: 1,
                })
              }
              className={inputClassName}
            >
              <option value="">Todos</option>
              <option value="COMPLETADA">Completada</option>
              <option value="ANULADA">Anulada</option>
            </select>
          </Field>
          <PageSizeField
            value={filters.page_size}
            onChange={(page_size) => onFilters({ ...filters, page_size, page: 1 })}
          />
        </FilterForm>
      }
      totals={
        report && (
          <TotalsPanel
            items={[
              { label: 'Ventas', value: number(report.totales.cantidad_total) },
              { label: 'Bruto', value: money(report.totales.total_bruto) },
              { label: 'Descuentos', value: money(report.totales.total_descuento) },
              { label: 'Vendido final', value: money(report.totales.total_vendido) },
              { label: 'Anuladas', value: number(report.totales.ventas_anuladas) },
            ]}
          />
        )
      }
      table={<SalesTable report={report} />}
      pagination={
        <PaginationControls
          paginacion={report?.paginacion}
          onPage={(page) => {
            onFilters({ ...filters, page });
            setTimeout(onLoad, 0);
          }}
        />
      }
    />
  );
}

function SalesTable({
  report,
}: {
  report: PaginatedReport<SalesReportRow, SalesReportTotals> | null;
}) {
  if (!report) return <EmptyState message="Consulta el reporte de ventas." />;
  if (report.items.length === 0) return <EmptyState message="No hay ventas para mostrar." />;

  return (
    <ReportTable>
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Venta</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Vendedor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {report.items.map((item) => (
            <tr key={item.id_venta}>
              <td className="px-4 py-3 text-stone-600">
                {new Date(item.creado_en).toLocaleString('es-CO')}
              </td>
              <td className="px-4 py-3 font-medium text-stone-950">{item.numero_venta}</td>
              <td className="px-4 py-3 text-stone-700">{item.cliente_nombre ?? 'Sin cliente'}</td>
              <td className="px-4 py-3 text-stone-700">{item.tipo_venta}</td>
              <td className="px-4 py-3">
                <StatusBadge status={item.estado_venta} />
              </td>
              <td className="px-4 py-3 text-stone-700">{money(item.total)}</td>
              <td className="px-4 py-3 text-stone-700">{item.usuario_nombre ?? item.id_usuario}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportTable>
  );
}

function InventoryReportSection({
  report,
  filters,
  onFilters,
  onLoad,
}: {
  report: PaginatedReport<InventoryReportRow, InventoryReportTotals> | null;
  filters: InventoryReportFilters;
  onFilters: (filters: InventoryReportFilters) => void;
  onLoad: () => void;
}) {
  return (
    <ReportShell
      filters={
        <FilterForm onSubmit={onLoad}>
          <Field label="Busqueda">
            <input
              value={filters.q}
              onChange={(event) => onFilters({ ...filters, q: event.target.value, page: 1 })}
              className={inputClassName}
            />
          </Field>
          <Field label="Estado variante">
            <select
              value={filters.estado_variante}
              onChange={(event) =>
                onFilters({
                  ...filters,
                  estado_variante: event.target.value as VariantStatus | '',
                  page: 1,
                })
              }
              className={inputClassName}
            >
              <option value="">Todos</option>
              <option value="ACTIVA">Activa</option>
              <option value="INACTIVA">Inactiva</option>
            </select>
          </Field>
          <Field label="Bajo stock">
            <select
              value={filters.bajo_stock}
              onChange={(event) =>
                onFilters({
                  ...filters,
                  bajo_stock: event.target.value as '' | 'true' | 'false',
                  page: 1,
                })
              }
              className={inputClassName}
            >
              <option value="">Todos</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </Field>
          <Field label="Sin stock">
            <select
              value={filters.sin_stock}
              onChange={(event) =>
                onFilters({
                  ...filters,
                  sin_stock: event.target.value as '' | 'true' | 'false',
                  page: 1,
                })
              }
              className={inputClassName}
            >
              <option value="">Todos</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
          </Field>
          <PageSizeField
            value={filters.page_size}
            onChange={(page_size) => onFilters({ ...filters, page_size, page: 1 })}
          />
        </FilterForm>
      }
      totals={
        report && (
          <TotalsPanel
            items={[
              { label: 'Variantes', value: number(report.totales.variantes_total) },
              { label: 'Stock total', value: number(report.totales.stock_total) },
            ]}
          />
        )
      }
      table={<InventoryTable report={report} />}
      pagination={
        <PaginationControls
          paginacion={report?.paginacion}
          onPage={(page) => {
            onFilters({ ...filters, page });
            setTimeout(onLoad, 0);
          }}
        />
      }
    />
  );
}

function InventoryTable({
  report,
}: {
  report: PaginatedReport<InventoryReportRow, InventoryReportTotals> | null;
}) {
  if (!report) return <EmptyState message="Consulta el reporte de inventario." />;
  if (report.items.length === 0) return <EmptyState message="No hay inventario para mostrar." />;

  return (
    <ReportTable>
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Producto</th>
            <th className="px-4 py-3">Variante</th>
            <th className="px-4 py-3">QR</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {report.items.map((item) => (
            <tr key={item.id_variante}>
              <td className="px-4 py-3 font-medium text-stone-950">{item.nombre_producto}</td>
              <td className="px-4 py-3 text-stone-700">
                Talla {item.talla ?? 'Unica'} / Color {item.color ?? 'Sin color'}
              </td>
              <td className="px-4 py-3 text-stone-700">{item.codigo_qr}</td>
              <td className="px-4 py-3 text-stone-700">{number(item.stock_actual)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={item.estado} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportTable>
  );
}

function MovementReportSection(props: {
  report: PaginatedReport<InventoryMovementReportRow, InventoryMovementReportTotals> | null;
  filters: InventoryMovementReportFilters;
  onFilters: (filters: InventoryMovementReportFilters) => void;
  onLoad: () => void;
}) {
  return (
    <ReportShell
      filters={<MovementFilters {...props} />}
      totals={
        props.report && (
          <TotalsPanel
            items={[
              { label: 'Movimientos', value: number(props.report.totales.cantidad_movimientos) },
            ]}
          />
        )
      }
      table={<MovementTable report={props.report} />}
      pagination={
        <PaginationControls
          paginacion={props.report?.paginacion}
          onPage={(page) => {
            props.onFilters({ ...props.filters, page });
            setTimeout(props.onLoad, 0);
          }}
        />
      }
    />
  );
}

function MovementFilters({
  filters,
  onFilters,
  onLoad,
}: {
  filters: InventoryMovementReportFilters;
  onFilters: (filters: InventoryMovementReportFilters) => void;
  onLoad: () => void;
}) {
  return (
    <FilterForm onSubmit={onLoad}>
      <DateField
        label="Fecha desde"
        value={filters.fecha_desde}
        onChange={(fecha_desde) => onFilters({ ...filters, fecha_desde, page: 1 })}
      />
      <DateField
        label="Fecha hasta"
        value={filters.fecha_hasta}
        onChange={(fecha_hasta) => onFilters({ ...filters, fecha_hasta, page: 1 })}
      />
      <Field label="Tipo movimiento">
        <select
          value={filters.tipo_movimiento}
          onChange={(event) =>
            onFilters({
              ...filters,
              tipo_movimiento: event.target.value as InventoryMovementType | '',
              page: 1,
            })
          }
          className={inputClassName}
        >
          <option value="">Todos</option>
          {[
            'LOTE_ENTRADA',
            'INVENTARIO_INICIAL',
            'AJUSTE_POSITIVO',
            'AJUSTE_NEGATIVO',
            'VENTA',
            'ANULACION_VENTA',
            'DEVOLUCION',
          ].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Origen">
        <select
          value={filters.referencia_tipo}
          onChange={(event) =>
            onFilters({
              ...filters,
              referencia_tipo: event.target.value as InventoryReferenceType | '',
              page: 1,
            })
          }
          className={inputClassName}
        >
          <option value="">Todas</option>
          {[
            'LOTE_ENTRADA',
            'INVENTARIO_INICIAL',
            'AJUSTE_INVENTARIO',
            'VENTA',
            'ANULACION_VENTA',
            'DEVOLUCION',
          ].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </Field>
      <PageSizeField
        value={filters.page_size}
        onChange={(page_size) => onFilters({ ...filters, page_size, page: 1 })}
      />
    </FilterForm>
  );
}

function MovementTable({
  report,
}: {
  report: PaginatedReport<InventoryMovementReportRow, InventoryMovementReportTotals> | null;
}) {
  if (!report) return <EmptyState message="Consulta el reporte de movimientos." />;
  if (report.items.length === 0) return <EmptyState message="No hay movimientos para mostrar." />;
  return (
    <ReportTable>
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Variante</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Cantidad</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">Origen</th>
            <th className="px-4 py-3">Usuario</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {report.items.map((item) => (
            <tr key={item.id_movimiento}>
              <td className="px-4 py-3 text-stone-600">
                {new Date(item.creado_en).toLocaleString('es-CO')}
              </td>
              <td className="px-4 py-3 text-stone-700">{item.codigo_qr}</td>
              <td className="px-4 py-3 text-stone-700">{item.tipo_movimiento}</td>
              <td className="px-4 py-3 text-stone-700">{number(item.cantidad)}</td>
              <td className="px-4 py-3 text-stone-700">
                {number(item.stock_antes)} a {number(item.stock_despues)}
              </td>
              <td className="px-4 py-3 text-stone-700">
                {item.referencia_tipo ?? 'Sin origen'} / {item.referencia_id ?? '-'}
              </td>
              <td className="px-4 py-3 text-stone-700">{item.usuario_nombre ?? 'Sin usuario'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportTable>
  );
}

function PortfolioReportSection(props: {
  report: PaginatedReport<PortfolioReportRow, PortfolioReportTotals> | null;
  filters: PortfolioReportFilters;
  onFilters: (filters: PortfolioReportFilters) => void;
  onLoad: () => void;
}) {
  const { report, filters, onFilters, onLoad } = props;
  return (
    <ReportShell
      filters={
        <FilterForm onSubmit={onLoad}>
          <Field label="Cliente ID">
            <input
              value={filters.id_cliente}
              onChange={(event) =>
                onFilters({ ...filters, id_cliente: event.target.value, page: 1 })
              }
              className={inputClassName}
            />
          </Field>
          <Field label="Estado credito">
            <select
              value={filters.estado_credito}
              onChange={(event) =>
                onFilters({
                  ...filters,
                  estado_credito: event.target.value as PortfolioReportFilters['estado_credito'],
                  page: 1,
                })
              }
              className={inputClassName}
            >
              <option value="">Todos</option>
              {['PENDIENTE', 'PARCIAL', 'PAGADO', 'VENCIDO', 'ANULADO'].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Origen">
            <select
              value={filters.origen_credito}
              onChange={(event) =>
                onFilters({
                  ...filters,
                  origen_credito: event.target.value as PortfolioReportFilters['origen_credito'],
                  page: 1,
                })
              }
              className={inputClassName}
            >
              <option value="">Todos</option>
              {['VENTA', 'DEUDA_ANTIGUA', 'AJUSTE_MANUAL'].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <PageSizeField
            value={filters.page_size}
            onChange={(page_size) => onFilters({ ...filters, page_size, page: 1 })}
          />
        </FilterForm>
      }
      totals={
        report && (
          <TotalsPanel
            items={[
              { label: 'Creditos', value: number(report.totales.cantidad_creditos) },
              { label: 'Saldo activo', value: money(report.totales.saldo_activo) },
              { label: 'Monto original', value: money(report.totales.monto_original) },
            ]}
          />
        )
      }
      table={<PortfolioTable report={report} />}
      pagination={
        <PaginationControls
          paginacion={report?.paginacion}
          onPage={(page) => {
            onFilters({ ...filters, page });
            setTimeout(onLoad, 0);
          }}
        />
      }
    />
  );
}

function PortfolioTable({
  report,
}: {
  report: PaginatedReport<PortfolioReportRow, PortfolioReportTotals> | null;
}) {
  if (!report) return <EmptyState message="Consulta el reporte de cartera." />;
  if (report.items.length === 0) return <EmptyState message="No hay creditos para mostrar." />;
  return (
    <ReportTable>
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Origen</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Original</th>
            <th className="px-4 py-3">Abonado</th>
            <th className="px-4 py-3">Saldo</th>
            <th className="px-4 py-3">Venta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {report.items.map((item) => (
            <tr key={item.id_credito}>
              <td className="px-4 py-3 text-stone-700">{item.cliente_nombre ?? item.id_cliente}</td>
              <td className="px-4 py-3 text-stone-700">{item.origen_credito}</td>
              <td className="px-4 py-3">
                <StatusBadge status={item.estado_credito} />
              </td>
              <td className="px-4 py-3 text-stone-700">{money(item.monto_original)}</td>
              <td className="px-4 py-3 text-stone-700">{money(item.monto_abonado)}</td>
              <td className="px-4 py-3 font-semibold text-stone-950">
                {money(item.saldo_pendiente)}
              </td>
              <td className="px-4 py-3 text-stone-700">{item.id_venta ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportTable>
  );
}

function ReturnsReportSection(props: {
  report: PaginatedReport<ReturnsReportRow, ReturnsReportTotals> | null;
  filters: ReturnsReportFilters;
  onFilters: (filters: ReturnsReportFilters) => void;
  onLoad: () => void;
}) {
  const { report, filters, onFilters, onLoad } = props;
  return (
    <ReportShell
      filters={
        <FilterForm onSubmit={onLoad}>
          <DateField
            label="Fecha desde"
            value={filters.fecha_desde}
            onChange={(fecha_desde) => onFilters({ ...filters, fecha_desde, page: 1 })}
          />
          <DateField
            label="Fecha hasta"
            value={filters.fecha_hasta}
            onChange={(fecha_hasta) => onFilters({ ...filters, fecha_hasta, page: 1 })}
          />
          <Field label="Tipo venta">
            <select
              value={filters.tipo_venta}
              onChange={(event) =>
                onFilters({ ...filters, tipo_venta: event.target.value as SaleType | '', page: 1 })
              }
              className={inputClassName}
            >
              <option value="">Todos</option>
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Credito</option>
              <option value="MIXTA">Mixta</option>
            </select>
          </Field>
          <Field label="Estado">
            <select
              value={filters.estado_devolucion}
              onChange={(event) =>
                onFilters({
                  ...filters,
                  estado_devolucion: event.target.value as SaleReturnStatus | '',
                  page: 1,
                })
              }
              className={inputClassName}
            >
              <option value="">Todos</option>
              <option value="ACTIVA">Activa</option>
              <option value="ANULADA">Anulada</option>
            </select>
          </Field>
          <PageSizeField
            value={filters.page_size}
            onChange={(page_size) => onFilters({ ...filters, page_size, page: 1 })}
          />
        </FilterForm>
      }
      totals={
        report && (
          <TotalsPanel
            items={[
              { label: 'Devoluciones', value: number(report.totales.cantidad_total) },
              { label: 'Total devuelto', value: money(report.totales.total_devuelto) },
              { label: 'Impacto credito', value: money(report.totales.impacto_credito) },
              { label: 'Impacto pago', value: money(report.totales.impacto_pago) },
            ]}
          />
        )
      }
      table={<ReturnsTable report={report} />}
      pagination={
        <PaginationControls
          paginacion={report?.paginacion}
          onPage={(page) => {
            onFilters({ ...filters, page });
            setTimeout(onLoad, 0);
          }}
        />
      }
    />
  );
}

function ReturnsTable({
  report,
}: {
  report: PaginatedReport<ReturnsReportRow, ReturnsReportTotals> | null;
}) {
  if (!report) return <EmptyState message="Consulta el reporte de devoluciones." />;
  if (report.items.length === 0) return <EmptyState message="No hay devoluciones para mostrar." />;
  return (
    <ReportTable>
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Venta</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Impactos</th>
            <th className="px-4 py-3">Detalles</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {report.items.map((item) => (
            <tr key={item.id_devolucion}>
              <td className="px-4 py-3 text-stone-600">
                {new Date(item.creado_en).toLocaleString('es-CO')}
              </td>
              <td className="px-4 py-3 text-stone-700">{item.numero_venta ?? item.id_venta}</td>
              <td className="px-4 py-3 text-stone-700">{item.tipo_venta}</td>
              <td className="px-4 py-3">
                <StatusBadge status={item.estado_devolucion} />
              </td>
              <td className="px-4 py-3 font-semibold text-stone-950">
                {money(item.total_devuelto)}
              </td>
              <td className="px-4 py-3 text-stone-700">
                Credito {money(item.impacto_credito)} / Pago {money(item.impacto_pago)}
              </td>
              <td className="px-4 py-3 text-stone-700">{number(item.cantidad_detalles)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportTable>
  );
}

function EntryLotsReportSection(props: {
  report: PaginatedReport<EntryLotsReportRow, EntryLotsReportTotals> | null;
  filters: EntryLotsReportFilters;
  onFilters: (filters: EntryLotsReportFilters) => void;
  onLoad: () => void;
}) {
  const { report, filters, onFilters, onLoad } = props;
  return (
    <ReportShell
      filters={
        <FilterForm onSubmit={onLoad}>
          <DateField
            label="Fecha desde"
            value={filters.fecha_desde}
            onChange={(fecha_desde) => onFilters({ ...filters, fecha_desde, page: 1 })}
          />
          <DateField
            label="Fecha hasta"
            value={filters.fecha_hasta}
            onChange={(fecha_hasta) => onFilters({ ...filters, fecha_hasta, page: 1 })}
          />
          <Field label="Estado lote">
            <select
              value={filters.estado_lote}
              onChange={(event) =>
                onFilters({
                  ...filters,
                  estado_lote: event.target.value as EntryLotStatus | '',
                  page: 1,
                })
              }
              className={inputClassName}
            >
              <option value="">Todos</option>
              <option value="BORRADOR">Borrador</option>
              <option value="CONFIRMADO">Confirmado</option>
              <option value="ANULADO">Anulado</option>
            </select>
          </Field>
          <Field label="Proveedor ID">
            <input
              value={filters.id_proveedor}
              onChange={(event) =>
                onFilters({ ...filters, id_proveedor: event.target.value, page: 1 })
              }
              className={inputClassName}
            />
          </Field>
          <PageSizeField
            value={filters.page_size}
            onChange={(page_size) => onFilters({ ...filters, page_size, page: 1 })}
          />
        </FilterForm>
      }
      totals={
        report && (
          <TotalsPanel
            items={[
              { label: 'Lotes', value: number(report.totales.cantidad_lotes) },
              { label: 'Total compra', value: money(report.totales.total_compra) },
              { label: 'Detalles', value: number(report.totales.cantidad_detalles) },
            ]}
          />
        )
      }
      table={<EntryLotsTable report={report} />}
      pagination={
        <PaginationControls
          paginacion={report?.paginacion}
          onPage={(page) => {
            onFilters({ ...filters, page });
            setTimeout(onLoad, 0);
          }}
        />
      }
    />
  );
}

function EntryLotsTable({
  report,
}: {
  report: PaginatedReport<EntryLotsReportRow, EntryLotsReportTotals> | null;
}) {
  if (!report) return <EmptyState message="Consulta el reporte de lotes." />;
  if (report.items.length === 0) return <EmptyState message="No hay lotes para mostrar." />;
  return (
    <ReportTable>
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Lote</th>
            <th className="px-4 py-3">Proveedor</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Detalles</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {report.items.map((item) => (
            <tr key={item.id_lote}>
              <td className="px-4 py-3 text-stone-600">
                {new Date(item.fecha_lote).toLocaleDateString('es-CO')}
              </td>
              <td className="px-4 py-3 font-medium text-stone-950">{item.numero_lote}</td>
              <td className="px-4 py-3 text-stone-700">
                {item.nombre_proveedor ?? 'Sin proveedor'}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.estado_lote} />
              </td>
              <td className="px-4 py-3 text-stone-700">{money(item.total_compra)}</td>
              <td className="px-4 py-3 text-stone-700">{number(item.cantidad_detalles)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportTable>
  );
}

function ReportShell({
  filters,
  totals,
  table,
  pagination,
}: {
  filters: ReactNode;
  totals: ReactNode;
  table: ReactNode;
  pagination: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {filters}
      {totals}
      {table}
      {pagination}
    </div>
  );
}
