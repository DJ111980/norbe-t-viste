import { useEffect, useState } from 'react';

export function FileImagePreview({ file }: { file: File | null }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!file || !url) return null;

  return (
    <div className="mt-2 flex items-center gap-3 rounded-md border border-stone-200 bg-stone-50 p-2">
      <img src={url} alt="Vista previa" className="h-16 w-16 rounded-md object-cover" />
      <p className="text-xs text-stone-600">
        {file.name} / {Math.max(1, Math.round(file.size / 1024))} KB
      </p>
    </div>
  );
}
