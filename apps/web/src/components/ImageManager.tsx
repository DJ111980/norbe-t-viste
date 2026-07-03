import { ChangeEvent, useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { ApiClientError, isForbiddenError, isUnauthorizedError } from '../lib/api';
import {
  deleteImage,
  getImageMetadata,
  getImageObjectUrl,
  type ImageOwner,
  uploadImage,
} from '../services/images';
import { secondaryButtonClassName } from './ui';

export function ImageManager({
  owner,
  id,
  canManage,
  onSessionExpired,
}: {
  owner: ImageOwner;
  id: string;
  canManage: boolean;
  onSessionExpired: () => void;
}) {
  const { token, logout } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let mounted = true;

    async function loadImage() {
      if (!token || !id) return;
      setIsLoading(true);
      setError(null);

      try {
        const metadata = await getImageMetadata(token, owner, id);

        if (!metadata) {
          if (mounted) setImageUrl(null);
          return;
        }

        objectUrl = await getImageObjectUrl(token, owner, id);
        if (mounted) setImageUrl(objectUrl);
      } catch (loadError) {
        if (isUnauthorizedError(loadError)) {
          await logout();
          onSessionExpired();
          return;
        }

        if (mounted) {
          setError(
            loadError instanceof ApiClientError ? loadError.message : 'No se pudo cargar imagen.',
          );
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadImage();

    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, logout, onSessionExpired, owner, token]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!token || !file) return;

    setError(null);
    setIsLoading(true);

    try {
      await uploadImage(token, owner, id, file);
      const nextUrl = await getImageObjectUrl(token, owner, id);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(nextUrl);
    } catch (uploadError) {
      if (isUnauthorizedError(uploadError)) {
        await logout();
        onSessionExpired();
        return;
      }

      setError(
        isForbiddenError(uploadError)
          ? 'No tienes permisos para esta accion.'
          : uploadError instanceof ApiClientError
            ? uploadError.message
            : 'No se pudo subir la imagen.',
      );
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  }

  async function handleDelete() {
    if (!token) return;
    setError(null);
    setIsLoading(true);

    try {
      await deleteImage(token, owner, id);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    } catch (deleteError) {
      if (isUnauthorizedError(deleteError)) {
        await logout();
        onSessionExpired();
        return;
      }

      setError(
        isForbiddenError(deleteError)
          ? 'No tienes permisos para esta accion.'
          : deleteError instanceof ApiClientError
            ? deleteError.message
            : 'No se pudo eliminar la imagen.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-stone-200 bg-white text-xs text-stone-500">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            'Sin imagen'
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-stone-950">
            {owner === 'producto' ? 'Imagen de producto' : 'Imagen de variante'}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            JPG, PNG o WebP. El archivo se envia al backend.
          </p>
          {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
          {isLoading && <p className="mt-2 text-xs text-stone-500">Procesando imagen...</p>}
          {canManage && (
            <div className="mt-3 flex flex-wrap gap-2">
              <label className={secondaryButtonClassName}>
                Subir imagen
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => void handleUpload(event)}
                />
              </label>
              {imageUrl && (
                <button
                  type="button"
                  className={secondaryButtonClassName}
                  onClick={() => void handleDelete()}
                >
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
