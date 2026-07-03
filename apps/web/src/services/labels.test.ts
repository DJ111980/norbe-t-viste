import { describe, expect, it, vi } from 'vitest';
import { getEntryLotLabelPreview, getVariantLabelPreview, openPrintableHtml } from './labels';
import { apiTextRequest } from '../lib/api';

vi.mock('../lib/api', () => ({
  apiTextRequest: vi.fn(),
}));

describe('labels service', () => {
  it('usa endpoint de preview individual de variante', async () => {
    vi.mocked(apiTextRequest).mockResolvedValueOnce('<html></html>');

    await getVariantLabelPreview('token', 'var_1');

    expect(apiTextRequest).toHaveBeenCalledWith('/etiquetas/variantes/var_1/preview', 'token');
  });

  it('usa endpoint de etiquetas desde lote de entrada', async () => {
    vi.mocked(apiTextRequest).mockResolvedValueOnce('<html></html>');

    await getEntryLotLabelPreview('token', 'lot_1');

    expect(apiTextRequest).toHaveBeenCalledWith('/etiquetas/lotes-entrada/lot_1/preview', 'token');
  });

  it('abre HTML imprimible en una nueva pestana', () => {
    const write = vi.fn();
    const close = vi.fn();
    const open = vi.fn();
    const target = {
      document: {
        open,
        write,
        close,
        title: '',
      },
    };
    vi.stubGlobal('window', {
      open: vi.fn(() => target),
    });

    expect(openPrintableHtml('<html>Etiqueta</html>', 'Etiqueta demo')).toBe(true);
    expect(open).toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith('<html>Etiqueta</html>');
    expect(target.document.title).toBe('Etiqueta demo');

    vi.unstubAllGlobals();
  });
});
