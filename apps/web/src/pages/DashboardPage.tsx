import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/auth-context';
import { apiRequest, ApiClientError, isUnauthorizedError } from '../lib/api';
import type { DashboardSummary } from '../types';

interface DashboardResponse {
  resumen: DashboardSummary;
}

function money(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value: number): string {
  return new Intl.NumberFormat('es-CO').format(value);
}

export function DashboardPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, logout } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (!token) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await apiRequest<DashboardResponse>('/dashboard/resumen', { token });

        if (isMounted) {
          setSummary(data.resumen);
        }
      } catch (dashboardError) {
        if (isUnauthorizedError(dashboardError)) {
          await logout();
          onSessionExpired();
          return;
        }

        if (isMounted) {
          setError(
            dashboardError instanceof ApiClientError
              ? dashboardError.message
              : 'No se pudo cargar el dashboard.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [logout, onSessionExpired, token]);

  const cards = useMemo(() => {
    if (!summary) return [];

    return [
      { label: 'Ventas del periodo', value: number(summary.ventas.cantidad_total) },
      { label: 'Total vendido', value: money(summary.ventas.total_vendido) },
      { label: 'Pagos recibidos', value: money(summary.pagos.total_recibido) },
      { label: 'Cartera pendiente', value: money(summary.cartera.saldo_pendiente_total) },
      { label: 'Stock total', value: number(summary.inventario.stock_total) },
      { label: 'Variantes sin stock', value: number(summary.inventario.variantes_sin_stock) },
      { label: 'Variantes bajo stock', value: number(summary.inventario.variantes_bajo_stock) },
      { label: 'Devoluciones', value: number(summary.devoluciones.cantidad_total) },
      { label: 'Lotes confirmados', value: number(summary.lotes.lotes_confirmados) },
      { label: 'Alertas', value: number(totalAlerts(summary)) },
    ];
  }, [summary]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">Dashboard</h1>
        <p className="mt-1 text-sm text-stone-600">Resumen operativo inicial del sistema.</p>
      </div>

      {isLoading && (
        <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600">
          Cargando dashboard...
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!isLoading && !error && summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((card) => (
              <article key={card.label} className="rounded-md border border-stone-200 bg-white p-4">
                <p className="text-xs font-medium uppercase text-stone-500">{card.label}</p>
                <p className="mt-3 text-2xl font-semibold text-stone-950">{card.value}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <DashboardPanel title="Ventas">
              <Metric label="Contado" value={money(summary.ventas.total_contado)} />
              <Metric label="Credito" value={money(summary.ventas.total_credito)} />
              <Metric label="Mixto" value={money(summary.ventas.total_mixto)} />
              <Metric label="Anuladas" value={number(summary.ventas.ventas_anuladas)} />
            </DashboardPanel>

            <DashboardPanel title="Cartera">
              <Metric label="Pendientes" value={number(summary.cartera.creditos_pendientes)} />
              <Metric label="Pagados" value={number(summary.cartera.creditos_pagados)} />
              <Metric label="Anulados" value={number(summary.cartera.creditos_anulados)} />
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
          </div>
        </>
      )}
    </section>
  );
}

function totalAlerts(summary: DashboardSummary): number {
  return (
    summary.alertas.variantes_sin_qr +
    summary.alertas.variantes_sin_imagen +
    summary.alertas.productos_sin_imagen +
    summary.alertas.creditos_con_saldo
  );
}

function DashboardPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-md border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-stone-950">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-sm text-stone-600">{label}</span>
      <span className="text-sm font-semibold text-stone-950">{value}</span>
    </div>
  );
}
