import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { useBranding } from '../branding/branding-context';
import {
  ErrorMessage,
  Field,
  inputClassName,
  LoadingState,
  PageHeader,
  primaryButtonClassName,
  secondaryButtonClassName,
  SuccessMessage,
  textareaClassName,
} from '../components/ui';
import { ApiClientError, isForbiddenError, isUnauthorizedError } from '../lib/api';
import { canManageBranding } from '../permissions';
import { deleteLogo, updateBranding, uploadLogo } from '../services/branding';
import type { BusinessBranding } from '../types';

function handleMessage(error: unknown, fallback: string): string {
  if (isForbiddenError(error)) return 'No tienes permisos para esta acción.';
  if (error instanceof ApiClientError && error.code === 'R2_NOT_CONFIGURED') {
    return 'R2 no está configurado para administrar el logo en este entorno.';
  }
  return error instanceof ApiClientError ? error.message : fallback;
}

type BrandingForm = Pick<
  BusinessBranding,
  'nombre_negocio' | 'eslogan' | 'descripcion_login' | 'color_principal'
>;

export function BrandingPage({ onSessionExpired }: { onSessionExpired: () => void }) {
  const { token, user, logout } = useAuth();
  const { branding, logoUrl, refreshBranding, isLoading } = useBranding();
  const [form, setForm] = useState<BrandingForm>({
    nombre_negocio: branding.nombre_negocio,
    eslogan: branding.eslogan,
    descripcion_login: branding.descripcion_login,
    color_principal: branding.color_principal,
  });
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canManage = user ? canManageBranding(user.rol) : false;

  useEffect(() => {
    setForm({
      nombre_negocio: branding.nombre_negocio,
      eslogan: branding.eslogan,
      descripcion_login: branding.descripcion_login,
      color_principal: branding.color_principal,
    });
  }, [branding]);

  async function expireIfNeeded(actionError: unknown): Promise<boolean> {
    if (!isUnauthorizedError(actionError)) return false;
    await logout();
    onSessionExpired();
    return true;
  }

  async function saveBranding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !canManage) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateBranding(token, form);
      await refreshBranding();
      setSuccess('Marca del negocio actualizada.');
    } catch (saveError) {
      if (await expireIfNeeded(saveError)) return;
      setError(handleMessage(saveError, 'No se pudo guardar la marca.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveLogo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !file || !canManage) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await uploadLogo(token, file);
      setFile(null);
      await refreshBranding();
      setSuccess('Logo actualizado.');
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
      await refreshBranding();
      setSuccess('Logo eliminado.');
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
        title="Marca del negocio"
        description="Administra nombre, eslogan, color principal y logo global de la aplicación."
      />

      {error && <ErrorMessage message={error} />}
      {success && <SuccessMessage message={success} />}

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <form className="rounded-md border border-stone-200 bg-white p-4" onSubmit={saveBranding}>
            <h2 className="text-sm font-semibold text-stone-950">Datos visibles</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Nombre del negocio">
                <input
                  required
                  value={form.nombre_negocio}
                  onChange={(event) => setForm({ ...form, nombre_negocio: event.target.value })}
                  className={inputClassName}
                />
              </Field>
              <Field label="Eslogan">
                <input
                  required
                  value={form.eslogan}
                  onChange={(event) => setForm({ ...form, eslogan: event.target.value })}
                  className={inputClassName}
                />
              </Field>
              <Field label="Color principal">
                <input
                  required
                  type="color"
                  value={form.color_principal}
                  onChange={(event) => setForm({ ...form, color_principal: event.target.value })}
                  className="mt-1 h-11 w-full rounded-md border border-stone-300 bg-white px-2"
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Descripción del login">
                <textarea
                  required
                  value={form.descripcion_login}
                  onChange={(event) => setForm({ ...form, descripcion_login: event.target.value })}
                  className={textareaClassName}
                />
              </Field>
            </div>
            <button
              type="submit"
              disabled={!canManage || isSaving}
              className={`${primaryButtonClassName} mt-4`}
            >
              Guardar marca
            </button>
          </form>

          <div className="space-y-4">
            <div className="rounded-md border border-stone-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-stone-950">Vista previa</h2>
              <div
                className="mt-4 rounded-md p-5 text-white"
                style={{ backgroundColor: form.color_principal }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-md bg-white p-3">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={`Logo ${form.nombre_negocio}`}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-red-800">
                        {form.nombre_negocio.slice(0, 3)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase">{form.nombre_negocio}</p>
                    <p className="mt-1 text-sm text-red-50">{form.eslogan}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-red-50">{form.descripcion_login}</p>
              </div>
            </div>

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
                    className={`${secondaryButtonClassName} mt-4`}
                  >
                    Subir logo
                  </button>
                </form>

                <div className="rounded-md border border-stone-200 bg-white p-4">
                  <h2 className="text-sm font-semibold text-stone-950">Eliminar logo</h2>
                  <button
                    type="button"
                    disabled={!branding.logo || isSaving}
                    onClick={() => void removeLogo()}
                    className={`${secondaryButtonClassName} mt-4`}
                  >
                    Eliminar logo
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">
                Tu usuario puede ver la marca, pero no administrarla.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
