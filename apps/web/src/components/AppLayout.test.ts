import { describe, expect, it } from 'vitest';
import { getVisibleNavItems } from './AppLayout';

describe('AppLayout navigation', () => {
  it('oculta usuarios para vendedor', () => {
    expect(getVisibleNavItems('VENDEDOR').some((item) => item.path === '/usuarios')).toBe(false);
  });

  it('muestra usuarios para administrador', () => {
    expect(getVisibleNavItems('ADMINISTRADOR').some((item) => item.path === '/usuarios')).toBe(
      true,
    );
  });

  it('incluye inventario y lotes de entrada en la navegacion', () => {
    const paths = getVisibleNavItems('ADMINISTRADOR').map((item) => item.path);

    expect(paths).toContain('/inventario');
    expect(paths).toContain('/lotes-entrada');
    expect(paths).toContain('/ventas');
    expect(paths).toContain('/creditos');
    expect(paths).toContain('/cartera');
  });
});
