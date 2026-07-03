import { describe, expect, it } from 'vitest';
import type { ApiEnv } from '../config/env';
import { applyCorsHeaders, corsConfig, handleCorsPreflight } from './cors';

const env = {
  CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
} as ApiEnv;

describe('cors', () => {
  it('OPTIONS responde para origin permitido sin ejecutar ruta real', async () => {
    const response = handleCorsPreflight(
      new Request('http://localhost/dashboard/resumen', {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization',
        },
      }),
      env,
    );

    expect(response?.status).toBe(204);
    expect(await response?.text()).toBe('');
    expect(response?.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(response?.headers.get('Access-Control-Allow-Methods')).toBe(corsConfig.allowedMethods);
    expect(response?.headers.get('Access-Control-Allow-Headers')).toBe(corsConfig.allowedHeaders);
    expect(response?.headers.get('Vary')).toBe('Origin');
  });

  it('agrega headers CORS a respuestas normales con origin permitido', () => {
    const request = new Request('http://localhost/health', {
      headers: { Origin: 'http://127.0.0.1:5173' },
    });
    const response = applyCorsHeaders(Response.json({ ok: true }), request, env);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://127.0.0.1:5173');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('PATCH');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('DELETE');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS');
  });

  it('sin Origin no agrega Access-Control-Allow-Origin pero conserva Vary', () => {
    const response = applyCorsHeaders(
      Response.json({ ok: true }),
      new Request('http://localhost/health'),
      env,
    );

    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('origin no permitido no recibe Access-Control-Allow-Origin', () => {
    const response = applyCorsHeaders(
      Response.json({ ok: true }),
      new Request('http://localhost/health', {
        headers: { Origin: 'https://dominio-no-permitido.example' },
      }),
      env,
    );

    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('preserva content-type de respuestas HTML', () => {
    const response = applyCorsHeaders(
      new Response('<!doctype html>', {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
      new Request('http://localhost/etiquetas/variantes/var_1/preview', {
        headers: { Origin: 'http://localhost:5173' },
      }),
      env,
    );

    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });
});
