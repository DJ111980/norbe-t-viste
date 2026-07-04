import { useEffect, type ReactNode } from 'react';

type ModalSize = 'md' | 'lg' | 'xl' | 'fullscreen';

const sizeClassNames: Record<ModalSize, string> = {
  md: 'max-w-2xl',
  lg: 'max-w-5xl',
  xl: 'max-w-[95vw]',
  fullscreen: 'max-w-[98vw]',
};

export function Modal({
  title,
  children,
  onClose,
  size = 'lg',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: ModalSize;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[92vh] w-full ${sizeClassNames[size]} flex-col rounded-md bg-white shadow-xl`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-2.5">
          <h2 className="text-sm font-semibold text-stone-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 bg-white text-lg leading-none text-stone-700 hover:bg-stone-50"
            aria-label="Cerrar"
          >
            x
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </section>
    </div>
  );
}
