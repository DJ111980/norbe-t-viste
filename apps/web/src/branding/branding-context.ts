import { createContext, useContext } from 'react';
import type { BusinessBranding } from '../types';

export const fallbackBranding: BusinessBranding = {
  nombre_negocio: 'NORBE T VISTE',
  eslogan: 'Gestión comercial',
  descripcion_login: 'Gestión comercial lista para operar desde el navegador.',
  color_principal: '#b0181b',
  logo: null,
};

export interface BrandingContextValue {
  branding: BusinessBranding;
  logoUrl: string | null;
  isLoading: boolean;
  refreshBranding: () => Promise<void>;
}

export const BrandingContext = createContext<BrandingContextValue | null>(null);

export function useBranding(): BrandingContextValue {
  const context = useContext(BrandingContext);

  if (!context) {
    throw new Error('useBranding debe usarse dentro de BrandingProvider');
  }

  return context;
}
