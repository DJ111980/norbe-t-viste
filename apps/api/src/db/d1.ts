import type { ApiEnv } from '../config/env';

export interface D1HealthResult {
  connected: boolean;
  result: number;
}

export async function checkD1Connection(env: ApiEnv): Promise<D1HealthResult> {
  // Esta consulta minima valida que el binding DB exista y que D1 responda.
  // La dejamos aislada para reutilizar el patron cuando lleguen repositorios reales.
  const row = await env.DB.prepare('SELECT 1 AS ok;').first<{ ok: number }>();

  return {
    connected: row?.ok === 1,
    result: row?.ok ?? 0,
  };
}
