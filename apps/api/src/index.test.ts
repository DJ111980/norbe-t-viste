import { describe, expect, it } from 'vitest';
import type { ApiEnv } from './config/env';
import worker from './index';

const env = {
  CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
} as ApiEnv;

function workerRequest(input: string, init?: RequestInit) {
  return new Request(input, init) as Request<unknown, IncomingRequestCfProperties<unknown>>;
}

describe('worker cors', () => {
  it('responde preflight sin ejecutar la ruta real', async () => {
    const response = await worker.fetch(
      workerRequest('http://localhost/dashboard/resumen', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization',
        },
      }),
      env,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });

  it('GET /health sigue funcionando con Origin permitido', async () => {
    const response = await worker.fetch(
      workerRequest('http://localhost/health', {
        headers: { Origin: 'http://localhost:5173' },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(await response.json()).toMatchObject({ ok: true });
  });

  it('GET /health sin Origin sigue funcionando', async () => {
    const response = await worker.fetch(workerRequest('http://localhost/health'), env);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('origin no permitido no recibe Access-Control-Allow-Origin', async () => {
    const response = await worker.fetch(
      workerRequest('http://localhost/health', {
        headers: { Origin: 'https://dominio-no-permitido.example' },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('GET /auth/me sin token mantiene 401 con headers CORS', async () => {
    const response = await worker.fetch(
      workerRequest('http://localhost/auth/me', {
        headers: { Origin: 'http://localhost:5173' },
      }),
      env,
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'AUTH_REQUIRED' } });
  });

  it('CORS no cambia permisos de reportes admin-only', async () => {
    const response = await worker.fetch(
      workerRequest('http://localhost/reportes/cartera', {
        headers: { Origin: 'http://localhost:5173' },
      }),
      env,
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });
});
