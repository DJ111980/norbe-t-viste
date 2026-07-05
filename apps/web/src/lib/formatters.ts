export function formatMoney(value: number | null | undefined): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('es-CO').format(value ?? 0);
}
