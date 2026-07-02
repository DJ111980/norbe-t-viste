import { describe, expect, it } from 'vitest';
import { ApiError } from '../../shared/errors';
import { validateLogoUploadRequest } from './branding.validation';

function createRequest(file?: File): Request {
  const formData = new FormData();
  if (file) formData.set('file', file);

  return new Request('http://localhost/branding/logo', {
    method: 'POST',
    body: formData,
  });
}

describe('branding validation', () => {
  it('acepta logo valido', async () => {
    const input = await validateLogoUploadRequest(
      createRequest(new File(['logo'], 'logo.png', { type: 'image/png' })),
    );

    expect(input.extension).toBe('png');
    expect(input.contentType).toBe('image/png');
    expect(input.size).toBe(4);
  });

  it('rechaza archivo faltante', async () => {
    await expect(validateLogoUploadRequest(createRequest())).rejects.toBeInstanceOf(ApiError);
  });

  it('rechaza MIME invalido y SVG', async () => {
    await expect(
      validateLogoUploadRequest(
        createRequest(new File(['x'], 'logo.pdf', { type: 'application/pdf' })),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_LOGO_MIME' });

    await expect(
      validateLogoUploadRequest(
        createRequest(new File(['x'], 'logo.svg', { type: 'image/svg+xml' })),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_LOGO_MIME' });
  });

  it('rechaza archivo mayor a 5 MB', async () => {
    const largeFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'logo.png', {
      type: 'image/png',
    });

    await expect(validateLogoUploadRequest(createRequest(largeFile))).rejects.toMatchObject({
      code: 'LOGO_TOO_LARGE',
    });
  });
});
