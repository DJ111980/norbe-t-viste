import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getBranding, getLogoFile } from '../services/branding';
import type { BusinessBranding } from '../types';
import { BrandingContext, fallbackBranding } from './branding-context';

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BusinessBranding>(fallbackBranding);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBranding = useCallback(async () => {
    setIsLoading(true);

    try {
      const nextBranding = await getBranding();
      setBranding(nextBranding);

      setLogoUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return null;
      });

      if (nextBranding.logo) {
        const blob = await getLogoFile();
        setLogoUrl(URL.createObjectURL(blob));
      }
    } catch {
      setBranding(fallbackBranding);
      setLogoUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return null;
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBranding();

    return () => {
      setLogoUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return null;
      });
    };
  }, [refreshBranding]);

  const value = useMemo(
    () => ({
      branding,
      logoUrl,
      isLoading,
      refreshBranding,
    }),
    [branding, isLoading, logoUrl, refreshBranding],
  );

  return <BrandingContext value={value}>{children}</BrandingContext>;
}
