import { useRef } from 'react';
import { Modal } from './Modal';
import { primaryButtonClassName, secondaryButtonClassName } from './ui';

export function PrintableHtmlModal({
  title,
  html,
  onClose,
}: {
  title: string;
  html: string;
  onClose: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  function printFrame() {
    frameRef.current?.contentWindow?.focus();
    frameRef.current?.contentWindow?.print();
  }

  return (
    <Modal title={title} onClose={onClose} size="fullscreen">
      <div className="space-y-3">
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={printFrame} className={primaryButtonClassName}>
            Imprimir
          </button>
          <button type="button" onClick={onClose} className={secondaryButtonClassName}>
            Cerrar
          </button>
        </div>
        <iframe
          ref={frameRef}
          title={title}
          srcDoc={html}
          className="h-[70vh] w-full rounded-md border border-stone-200 bg-white"
        />
      </div>
    </Modal>
  );
}
