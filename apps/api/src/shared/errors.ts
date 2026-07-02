export interface ApiErrorPayload {
  code: string;
  message: string;
  status: number;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function normalizeApiError(error: unknown): ApiErrorPayload {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
    };
  }

  // El detalle interno no se expone al cliente; cuando agreguemos observabilidad
  // podremos registrar aqui el error real sin romper el contrato publico.
  return {
    code: 'INTERNAL_ERROR',
    message: 'Ocurrio un error inesperado.',
    status: 500,
  };
}
