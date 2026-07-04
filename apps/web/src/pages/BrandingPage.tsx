import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import {
  ErrorMessage,
  Field,
  inputClassName,
  LoadingState,
  PageHeader,
  primaryButtonClassName,
  secondaryButtonClassName,
  SuccessMessage,
} from '../components/ui';
import { ApiClientError, isForbiddenError, isUnauthorizedError } from '../lib/api';
import { canManageBranding } from '../permissions';
import { deleteLogo, getLogo, getLogoFile, uploadLogo } from '../services/branding';
import type { BusinessLogo } from '../types';

function handleMessage(error: unknown, fallback: string): string {
  if (isForbiddenError(error)) return 'No tienes permisos para esta accion.';
  return error instanceof ApiClientError ? error.message : fallback;
}

export function BrandingPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, user, logout } = useAuth();
  const [logo, setLogo] = useState<BusinessLogo | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canManage = user ? canManageBranding(user.rol) : false;

  async function expireIfNeeded(actionError: unknown): Promise<boolean> {
    if (!isUnauthorizedError(actionError)) return false;
    await logout();
    onSessionExpired();
    return true;
  }

  async function loadLogo() {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const currentLogo = await getLogo(token);
      setLogo(currentLogo);

      if (logoUrl) URL.revokeObjectURL(logoUrl);
      if (currentLogo) {
        const blob = await getLogoFile(token);
        setLogoUrl(URL.createObjectURL(blob));
      } else {
        setLogoUrl(null);
      }
    } catch (loadError) {
      if (await expireIfNeeded(loadError)) return;
      setError(handleMessage(loadError, 'No se pudo cargar el logo.'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadLogo();

    return () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    };
  }, [token]);

  async function saveLogo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !file || !canManage) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await uploadLogo(token, file);
      setFile(null);
      setSuccess('Logo actualizado.');
      await loadLogo();
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setError(handleMessage(saveError, 'No se pudo subir el logo.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeLogo() {
    if (!token || !canManage) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteLogo(token);
      setSuccess('Logo eliminado.');
      await loadLogo();
    } catch (deleteError) {
      if (await expireIfNeeded(deleteError)) return;
      setError(handleMessage(deleteError, 'No se pudo eliminar el logo.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Branding"
        description="Administra el logo del negocio usando el backend y R2."
      />

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-md border border-stone-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-stone-950">Logo actual</h2>
            <div className="mt-4 flex min-h-60 items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 p-6">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo NORBE T VISTE"
                  className="max-h-52 max-w-full object-contain"
                />
              ) : (
                <p className="text-sm text-stone-500">No hay logo configurado.</p>
              )}
            </div>
            {logo && <p className="mt-3 text-xs text-stone-500">Key: {logo.key}</p>}
          </div>

          <div className="space-y-4">
            {canManage ? (
              <>
                <form
                  className="rounded-md border border-stone-200 bg-white p-4"
                  onSubmit={saveLogo}
                >
                  <h2 className="text-sm font-semibold text-stone-950">Subir logo</h2>
                  <Field label="Archivo">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                      className={inputClassName}
                    />
                  </Field>
                  <button
                    type="submit"
                    disabled={!file || isSaving}
                    className={`${primaryButtonClassName} mt-4`}
                  >
                    Subir logo
                  </button>
                </form>

                <div className="rounded-md border border-stone-200 bg-white p-4">
                  <h2 className="text-sm font-semibold text-stone-950">Eliminar logo</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    Esta accion elimina la referencia mediante el backend.
                  </p>
                  <button
                    type="button"
                    disabled={!logo || isSaving}
                    onClick={() => void removeLogo()}
                    className={`${secondaryButtonClassName} mt-4`}
                  >
                    Eliminar logo
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">
                Tu usuario puede ver el logo, pero no administrarlo.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
