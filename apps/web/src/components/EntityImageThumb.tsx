import { useEffect, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { getImageMetadata, getImageObjectUrl, type ImageOwner } from '../services/images';

export function EntityImageThumb({
  owner,
  id,
  alt = 'Imagen',
}: {
  owner: ImageOwner;
  id: string;
  alt?: string;
}) {
  const { token } = useAuth();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let mounted = true;

    async function loadImage() {
      if (mounted) setUrl(null);
      if (!token || !id) return;

      try {
        const metadata = await getImageMetadata(token, owner, id);
        if (!metadata) return;

        objectUrl = await getImageObjectUrl(token, owner, id);
        if (mounted) setUrl(objectUrl);
      } catch {
        if (mounted) setUrl(null);
      }
    }

    void loadImage();

    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, owner, token]);

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-stone-200 bg-stone-100 text-[10px] text-stone-500">
      {url ? <img src={url} alt={alt} className="h-full w-full object-cover" /> : 'Sin img'}
    </div>
  );
}
