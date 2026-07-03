import type { ApiEnv } from '../config/env';

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const ALLOWED_METHODS = 'GET,POST,PATCH,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Authorization,Content-Type';
const MAX_AGE_SECONDS = '86400';

function parseAllowedOrigins(env: ApiEnv): Set<string> {
  const configuredOrigins = env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set(
    configuredOrigins && configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS,
  );
}

function isOriginAllowed(env: ApiEnv, origin: string | null): origin is string {
  return !!origin && parseAllowedOrigins(env).has(origin);
}

function appendVaryOrigin(headers: Headers): void {
  const currentVary = headers.get('Vary');

  if (!currentVary) {
    headers.set('Vary', 'Origin');
    return;
  }

  if (!currentVary.split(',').some((value) => value.trim().toLowerCase() === 'origin')) {
    headers.set('Vary', `${currentVary}, Origin`);
  }
}

export function applyCorsHeaders(response: Response, request: Request, env: ApiEnv): Response {
  const origin = request.headers.get('Origin');

  appendVaryOrigin(response.headers);

  if (!isOriginAllowed(env, origin)) {
    return response;
  }

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
  response.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  response.headers.set('Access-Control-Max-Age', MAX_AGE_SECONDS);

  return response;
}

export function handleCorsPreflight(request: Request, env: ApiEnv): Response | null {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  return applyCorsHeaders(new Response(null, { status: 204 }), request, env);
}

export const corsConfig = {
  allowedMethods: ALLOWED_METHODS,
  allowedHeaders: ALLOWED_HEADERS,
};
