import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/auth-context';
import {
  ErrorMessage,
  Field,
  inputClassName,
  LoadingState,
  PageHeader,
  primaryButtonClassName,
  secondaryButtonClassName,
} from '../components/ui';
import { ApiClientError, isUnauthorizedError } from '../lib/api';
import { getDashboardSummary } from '../services/dashboard';
import type { DashboardFilters, DashboardSummary } from '../types';

function money(value: number | undefined): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function number(value: number | undefined): string {
  return new Intl.NumberFormat('es-CO').format(value ?? 0);
}

export function totalAlerts(summary: DashboardSummary): number {
  return (
    (summary.alertas.variantes_sin_qr ?? 0) +
    (summary.alertas.variantes_sin_imagen ?? 0) +
    (summary.alertas.productos_sin_imagen ?? 0) +
    (summary.alertas.creditos_con_saldo ?? 0)
  );
}

export function DashboardPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, logout } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({ fecha_desde: '', fecha_hasta: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboard(nextFilters = filters) {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      setSummary(await getDashboardSummary(token, nextFilters));
    } catch (dashboardError) {
      if (isUnauthorizedError(dashboardError)) {
        await logout();
        onSessionExpired();
        return;
      }

      setError(
        dashboardError instanceof ApiClientError
          ? dashboardError.message
          : 'No se pudo cargar el dashboard.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard({ fecha_desde: '', fecha_hasta: '' });
  }, [token]);

  const cards = useMemo(() => {
    if (!summary) return [];

    return [
      { label: 'Ventas del periodo', value: number(summary.ventas.cantidad_total) },
      { label: 'Total vendido', value: money(summary.ventas.total_vendido) },
      { label: 'Pagos recibidos', value: money(summary.pagos.total_recibido) },
      { label: 'Cartera pendiente', value: money(summary.cartera.saldo_pendiente_total) },
      { label: 'Stock total', value: number(summary.inventario.stock_total) },
      { label: 'Devoluciones', value: money(summary.devoluciones.total_devuelto) },
      { label: 'Lotes confirmados', value: number(summary.lotes.lotes_confirmados) },
      { label: 'Alertas', value: number(totalAlerts(summary)) },
    ];
  }, [summary]);

  return (
    <section className="space-y-6">
      <div className="rounded-md border border-red-100 bg-white p-4 shadow-sm">
        <PageHeader
          title="Dashboard"
          description="Resumen operativo del periodo con accesos rapidos a los modulos principales."
          action={
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={isLoading}
              className={secondaryButtonClassName}
            >
              Refrescar
            </button>
          }
        />
      </div>

      <form
        className="rounded-md border border-stone-200 bg-white p-4"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void loadDashboard();
        }}
      >
        <div className="grid gap-3 md:grid-cols-[180px_180px_auto]">
          <Field label="Fecha desde">
            <input
              type="date"
              value={filters.fecha_desde}
              onChange={(event) => setFilters({ ...filters, fecha_desde: event.target.value })}
              className={inputClassName}
            />
          </Field>
          <Field label="Fecha hasta">
            <input
              type="date"
              value={filters.fecha_hasta}
              onChange={(event) => setFilters({ ...filters, fecha_hasta: event.target.value })}
              className={inputClassName}
            />
          </Field>
          <div className="flex items-end">
            <button type="submit" disabled={isLoading} className={primaryButtonClassName}>
              Aplicar filtros
            </button>
          </div>
        </div>
        {summary?.periodo && (
          <p className="mt-3 text-xs text-stone-500">
            Periodo consultado: {new Date(summary.periodo.fechaDesde).toLocaleDateString('es-CO')} a{' '}
            {new Date(summary.periodo.fechaHasta).toLocaleDateString('es-CO')}.
          </p>
        )}
      </form>

      {isLoading && <LoadingState />}
      {!isLoading && error && <ErrorMessage message={error} />}

      {!isLoading && !error && summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <MetricCard key={card.label} label={card.label} value={card.value} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DashboardPanel title="Ventas">
              <Metric label="Contado" value={money(summary.ventas.total_contado)} />
              <Metric label="Credito" value={money(summary.ventas.total_credito)} />
              <Metric label="Mixta" value={money(summary.ventas.total_mixto)} />
              <Metric label="Anuladas" value={number(summary.ventas.ventas_anuladas)} />
            </DashboardPanel>

            <DashboardPanel title="Inventario">
              <Metric
                label="Variantes totales"
                value={number(summary.inventario.variantes_total)}
              />
              <Metric
                label="Variantes activas"
                value={number(summary.inventario.variantes_activas)}
              />
              <Metric label="Sin stock" value={number(summary.inventario.variantes_sin_stock)} />
              <Metric label="Bajo stock" value={number(summary.inventario.variantes_bajo_stock)} />
            </DashboardPanel>

            <DashboardPanel title="Cartera">
              <Metric label="Pendientes" value={number(summary.cartera.creditos_pendientes)} />
              <Metric label="Pagados" value={number(summary.cartera.creditos_pagados)} />
              <Metric label="Anulados" value={number(summary.cartera.creditos_anulados)} />
              <Metric label="Saldo" value={money(summary.cartera.saldo_pendiente_total)} />
            </DashboardPanel>

            <DashboardPanel title="Devoluciones y lotes">
              <Metric label="Devoluciones" value={number(summary.devoluciones.cantidad_total)} />
              <Metric label="Total devuelto" value={money(summary.devoluciones.total_devuelto)} />
              <Metric label="Lotes borrador" value={number(summary.lotes.lotes_borrador)} />
              <Metric label="Lotes anulados" value={number(summary.lotes.lotes_anulados)} />
            </DashboardPanel>

            <DashboardPanel title="Alertas">
              <Metric label="Variantes sin QR" value={number(summary.alertas.variantes_sin_qr)} />
              <Metric
                label="Variantes sin imagen"
                value={number(summary.alertas.variantes_sin_imagen)}
              />
              <Metric
                label="Productos sin imagen"
                value={number(summary.alertas.productos_sin_imagen)}
              />
              <Metric
                label="Creditos con saldo"
                value={number(summary.alertas.creditos_con_saldo)}
              />
            </DashboardPanel>

            <DashboardPanel title="Accesos rapidos">
              <QuickLink href="/ventas" label="Ventas" />
              <QuickLink href="/inventario" label="Inventario" />
              <QuickLink href="/lotes-entrada" label="Lotes de entrada" />
              <QuickLink href="/cartera" label="Cartera" />
              <QuickLink href="/devoluciones" label="Devoluciones" />
              <QuickLink href="/reportes" label="Reportes" />
            </DashboardPanel>
          </div>
        </>
      )}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-red-700">{label}</p>
      <p className="mt-3 text-xl font-semibold text-stone-950">{value}</p>
    </article>
  );
}

function DashboardPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-md border border-stone-200 bg-white p-4">
      <h2 className="border-b border-stone-100 pb-2 text-sm font-semibold text-stone-950">
        {title}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-[13px] text-stone-600">{label}</span>
      <span className="text-[13px] font-semibold text-stone-950">{value}</span>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="block rounded-md border border-stone-200 bg-white px-3 py-2 text-[13px] font-medium text-stone-700 hover:border-red-200 hover:bg-stone-50"
    >
      {label}
    </a>
  );
}
