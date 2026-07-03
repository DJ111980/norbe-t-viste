import { describe, expect, it } from 'vitest';
import { validatePortfolioFilters } from './portfolio.validation';

describe('portfolio validation', () => {
  it('usa paginacion por defecto y valida filtros', () => {
    const filters = validatePortfolioFilters(
      new URLSearchParams('estado=PENDIENTE&origen_credito=VENTA&saldo_pendiente=true'),
    );

    expect(filters).toMatchObject({
      estado: 'PENDIENTE',
      origenCredito: 'VENTA',
      saldoPendiente: true,
      limit: 50,
      offset: 0,
    });
  });

  it('rechaza limit mayor a 100 y filtros invalidos', () => {
    expect(() => validatePortfolioFilters(new URLSearchParams('limit=101'))).toThrowError(
      expect.objectContaining({ code: 'INVALID_PAGINATION' }),
    );
    expect(() => validatePortfolioFilters(new URLSearchParams('estado=INVALIDO'))).toThrowError(
      expect.objectContaining({ code: 'INVALID_CREDIT_STATUS' }),
    );
    expect(() => validatePortfolioFilters(new URLSearchParams('saldo_pendiente=si'))).toThrowError(
      expect.objectContaining({ code: 'INVALID_BOOLEAN_FILTER' }),
    );
  });

  it('permite offset mayor a 100 para paginar', () => {
    expect(validatePortfolioFilters(new URLSearchParams('offset=150'))).toMatchObject({
      offset: 150,
    });
  });
});
