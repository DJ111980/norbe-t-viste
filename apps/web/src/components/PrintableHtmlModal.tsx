import { useRef } from 'react';
import { Modal } from './Modal';
import { primaryButtonClassName, secondaryButtonClassName } from './ui';

export function PrintableHtmlModal({
  title,
  html,
  summary,
  onClose,
}: {
  title: string;
  html: string;
  summary?: {
    total: number;
    items: Array<{ label: string; cantidad: number }>;
  } | null;
  onClose: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  function printFrame() {
    frameRef.current?.contentWindow?.focus();
    frameRef.current?.contentWindow?.print();
  }

  return (
    <Modal title={title} onClose={onClose} size="md">
      <div className="space-y-3">
        {summary && (
          <div className="rounded-md border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700">
            <p className="font-semibold text-stone-950">Total etiquetas: {summary.total}</p>
            <div className="mt-2 max-h-24 space-y-1 overflow-y-auto pr-1">
              {summary.items.map((item, index) => (
                <p
                  key={`${item.label}-${index}`}
                  className="flex justify-between gap-3 text-stone-600"
                >
                  <span className="truncate">{item.label}</span>
                  <strong className="shrink-0 text-stone-900">{item.cantidad}</strong>
                </p>
              ))}
            </div>
          </div>
        )}
        <iframe
          ref={frameRef}
          title={title}
          srcDoc={html}
          className="mx-auto h-[70vh] max-h-[70vh] min-h-[440px] w-full max-w-[380px] rounded-md border border-stone-200 bg-white"
        />
        <div className="sticky bottom-0 flex flex-wrap justify-center gap-2 border-t border-stone-100 bg-white pt-3">
          <button type="button" onClick={printFrame} className={primaryButtonClassName}>
            Imprimir
          </button>
          <button type="button" onClick={onClose} className={secondaryButtonClassName}>
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}
