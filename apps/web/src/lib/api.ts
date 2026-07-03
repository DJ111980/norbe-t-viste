import type { ApiErrorInfo } from '../types';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface ApiSuccessResponse<TData> {
  ok: true;
  data: TData;
}

interface ApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

interface RequestOptions<TBody> {
  method?: HttpMethod;
  body?: TBody;
  token?: string | null;
}

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';

export class ApiClientError extends Error implements ApiErrorInfo {
  readonly status: number;
  readonly code: string;

  constructor(error: ApiErrorInfo) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = error.status;
    this.code = error.code;
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 403;
}

export async function apiRequest<TData, TBody = unknown>(
  path: string,
  options: RequestOptions<TBody> = {},
): Promise<TData> {
  if (!apiUrl) {
    throw new ApiClientError({
      status: 0,
      code: 'API_URL_MISSING',
      message: 'Falta configurar VITE_API_URL para conectar con la API.',
    });
  }

  const headers = new Headers({
    Accept: 'application/json',
  });

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiClientError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con la API. Revisa que el backend este levantado.',
    });
  }

  const payload = (await response.json().catch(() => null)) as
    ApiSuccessResponse<TData> | ApiErrorResponse | null;

  if (!response.ok || !payload || payload.ok === false) {
    const error = payload && 'error' in payload ? payload.error : null;

    throw new ApiClientError({
      status: response.status,
      code: error?.code ?? 'HTTP_ERROR',
      message: error?.message ?? 'La API devolvio una respuesta inesperada.',
    });
  }

  return payload.data;
}

export async function apiFormRequest<TData>(
  path: string,
  formData: FormData,
  token?: string | null,
): Promise<TData> {
  if (!apiUrl) {
    throw new ApiClientError({
      status: 0,
      code: 'API_URL_MISSING',
      message: 'Falta configurar VITE_API_URL para conectar con la API.',
    });
  }

  const headers = new Headers({ Accept: 'application/json' });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch {
    throw new ApiClientError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con la API. Revisa que el backend este levantado.',
    });
  }

  const payload = (await response.json().catch(() => null)) as
    ApiSuccessResponse<TData> | ApiErrorResponse | null;

  if (!response.ok || !payload || payload.ok === false) {
    const error = payload && 'error' in payload ? payload.error : null;

    throw new ApiClientError({
      status: response.status,
      code: error?.code ?? 'HTTP_ERROR',
      message: error?.message ?? 'La API devolvio una respuesta inesperada.',
    });
  }

  return payload.data;
}

export async function apiTextRequest(path: string, token?: string | null): Promise<string> {
  if (!apiUrl) {
    throw new ApiClientError({
      status: 0,
      code: 'API_URL_MISSING',
      message: 'Falta configurar VITE_API_URL para conectar con la API.',
    });
  }

  const headers = new Headers();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, { headers });
  } catch {
    throw new ApiClientError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con la API. Revisa que el backend este levantado.',
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    const error = payload?.ok === false ? payload.error : null;

    throw new ApiClientError({
      status: response.status,
      code: error?.code ?? 'HTTP_ERROR',
      message: error?.message ?? 'La API devolvio una respuesta inesperada.',
    });
  }

  return response.text();
}

export async function apiBlobRequest(path: string, token?: string | null): Promise<Blob> {
  if (!apiUrl) {
    throw new ApiClientError({
      status: 0,
      code: 'API_URL_MISSING',
      message: 'Falta configurar VITE_API_URL para conectar con la API.',
    });
  }

  const headers = new Headers();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, { headers });
  } catch {
    throw new ApiClientError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con la API. Revisa que el backend este levantado.',
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    const error = payload?.ok === false ? payload.error : null;

    throw new ApiClientError({
      status: response.status,
      code: error?.code ?? 'HTTP_ERROR',
      message: error?.message ?? 'La API devolvio una respuesta inesperada.',
    });
  }

  return response.blob();
}
