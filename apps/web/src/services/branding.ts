import { apiBlobRequest, apiFormRequest, apiRequest } from '../lib/api';
import type { BusinessLogo } from '../types';

interface LogoResponse {
  logo: BusinessLogo | null;
}

export async function getLogo(token: string): Promise<BusinessLogo | null> {
  const data = await apiRequest<LogoResponse>('/branding/logo', { token });

  return data.logo;
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

export async function getLogoFile(token: string): Promise<Blob> {
  return apiBlobRequest('/branding/logo/file', token);
}
