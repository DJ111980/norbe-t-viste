import type { ApiErrorPayload } from './errors';

export interface ApiSuccessResponse<TData> {
  ok: true;
  data: TData;
}

export interface ApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

const JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
};

export function successResponse<TData>(data: TData, status = 200): Response {
  // Toda respuesta exitosa pasa por aqui para conservar una forma estable
  // antes de que existan clientes, ventas, creditos y otros modulos.
  return Response.json(
    {
      ok: true,
      data,
    } satisfies ApiSuccessResponse<TData>,
    {
      status,
      headers: JSON_HEADERS,
    },
  );
}

export function errorResponse(error: ApiErrorPayload): Response {
  return Response.json(
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
      },
    } satisfies ApiErrorResponse,
    {
      status: error.status,
      headers: JSON_HEADERS,
    },
  );
}
