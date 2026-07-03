import { describe, expect, it } from 'vitest';
import { reportTabLabel, reportTabsForRole } from './ReportsPage';

describe('ReportsPage rules', () => {
  it('ADMINISTRADOR ve todas las secciones de reportes', () => {
    expect(reportTabsForRole('ADMINISTRADOR')).toEqual([
      'ventas',
      'inventario',
      'movimientos',
      'cartera',
      'devoluciones',
      'lotes',
    ]);
  });

  it('VENDEDOR no ve reportes sensibles', () => {
    expect(reportTabsForRole('VENDEDOR')).toEqual(['ventas', 'inventario']);
  });

  it('mantiene etiquetas claras para las pestanas', () => {
    expect(reportTabLabel('ventas')).toBe('Ventas');
    expect(reportTabLabel('inventario')).toBe('Inventario');
    expect(reportTabLabel('movimientos')).toBe('Movimientos');
    expect(reportTabLabel('cartera')).toBe('Cartera');
    expect(reportTabLabel('devoluciones')).toBe('Devoluciones');
    expect(reportTabLabel('lotes')).toBe('Lotes de entrada');
  });
});
