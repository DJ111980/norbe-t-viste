import { describe, expect, it } from 'vitest';
import { validateImageUploadRequest } from './images.validation';

function createRequest(file?: File): Request {
  const formData = new FormData();
  if (file) formData.set('file', file);
  return new Request('http://localhost/productos/prd_1/imagen', {
    method: 'POST',
    body: formData,
  });
}

describe('images validation', () => {
  it('acepta imagen valida', async () => {
    const input = await validateImageUploadRequest(
      createRequest(new File(['img'], 'foto.webp', { type: 'image/webp' })),
    );

    expect(input.extension).toBe('webp');
    expect(input.contentType).toBe('image/webp');
  });

  it('rechaza archivo faltante, MIME invalido, SVG y archivo mayor a 5 MB', async () => {
    await expect(validateImageUploadRequest(createRequest())).rejects.toMatchObject({
      code: 'IMAGE_FILE_REQUIRED',
    });
    await expect(
      validateImageUploadRequest(
        createRequest(new File(['x'], 'foto.pdf', { type: 'application/pdf' })),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_IMAGE_MIME' });
    await expect(
      validateImageUploadRequest(
        createRequest(new File(['x'], 'foto.svg', { type: 'image/svg+xml' })),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_IMAGE_MIME' });
    await expect(
      validateImageUploadRequest(createRequest(new File(['x'], 'foto.gif', { type: 'image/gif' }))),
    ).rejects.toMatchObject({ code: 'INVALID_IMAGE_MIME' });
    await expect(
      validateImageUploadRequest(
        createRequest(
          new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'foto.png', {
            type: 'image/png',
          }),
        ),
      ),
    ).rejects.toMatchObject({ code: 'IMAGE_TOO_LARGE' });
  });

  it('rechaza extension que no coincide con el MIME', async () => {
    await expect(
      validateImageUploadRequest(createRequest(new File(['x'], 'foto.jpg', { type: 'image/png' }))),
    ).rejects.toMatchObject({ code: 'INVALID_IMAGE_EXTENSION' });
  });
});
