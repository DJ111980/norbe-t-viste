import { apiBlobRequest, apiFormRequest, apiRequest } from '../lib/api';
import type { BusinessBranding, BusinessLogo } from '../types';

interface BrandingResponse {
  branding: BusinessBranding;
}

interface LogoResponse {
  logo: BusinessLogo | null;
}

export async function getLogo(token: string): Promise<BusinessLogo | null> {
  const data = await apiRequest<LogoResponse>('/branding/logo', { token });

  return data.logo;
}

export async function getBranding(token?: string | null): Promise<BusinessBranding> {
  const data = await apiRequest<BrandingResponse>('/branding', token ? { token } : undefined);

  return data.branding;
}

export async function updateBranding(
  token: string,
  values: Pick<
    BusinessBranding,
    'nombre_negocio' | 'eslogan' | 'descripcion_login' | 'color_principal'
  >,
): Promise<BusinessBranding> {
  const data = await apiRequest<BrandingResponse, typeof values>('/branding', {
    method: 'PATCH',
    token,
    body: values,
  });

  return data.branding;
}

export async function uploadLogo(token: string, file: File): Promise<BusinessLogo | null> {
  const formData = new FormData();
  formData.set('file', file);
  const data = await apiFormRequest<LogoResponse>('/branding/logo', formData, token);

  return data.logo;
}

export async function deleteLogo(token: string): Promise<BusinessLogo | null> {
  const data = await apiRequest<LogoResponse>('/branding/logo', {
    method: 'DELETE',
    token,
  });

  return data.logo;
}

export async function getLogoFile(token?: string | null): Promise<Blob> {
  return apiBlobRequest('/branding/logo/file', token ?? undefined);
}
