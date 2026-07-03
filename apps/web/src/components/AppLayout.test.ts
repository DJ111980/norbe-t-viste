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
});
