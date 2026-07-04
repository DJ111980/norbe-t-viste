import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiBlobRequest, apiFormRequest, apiRequest } from '../lib/api';
import { deleteLogo, getLogo, getLogoFile, uploadLogo } from './branding';

vi.mock('../lib/api', () => ({
  apiRequest: vi.fn(),
  apiFormRequest: vi.fn(),
  apiBlobRequest: vi.fn(),
}));

describe('branding service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta logo y archivo usando backend', async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ logo: { key: 'branding/logo.png' } });
    vi.mocked(apiBlobRequest).mockResolvedValueOnce(new Blob(['logo']));

    await getLogo('token');
    await getLogoFile('token');

    expect(apiRequest).toHaveBeenCalledWith('/branding/logo', { token: 'token' });
    expect(apiBlobRequest).toHaveBeenCalledWith('/branding/logo/file', 'token');
  });

  it('sube logo con FormData y elimina con DELETE', async () => {
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    vi.mocked(apiFormRequest).mockResolvedValueOnce({ logo: { key: 'branding/logo.png' } });
    vi.mocked(apiRequest).mockResolvedValueOnce({ logo: null });

    await uploadLogo('token', file);
    await deleteLogo('token');

    expect(apiFormRequest).toHaveBeenCalledWith('/branding/logo', expect.any(FormData), 'token');
    expect(apiRequest).toHaveBeenCalledWith('/branding/logo', {
      method: 'DELETE',
      token: 'token',
    });
  });
});
