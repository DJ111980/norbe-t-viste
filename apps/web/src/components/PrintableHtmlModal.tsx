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
    <Modal title={title} onClose={onClose} size="md">
      <div className="space-y-4">
        <iframe
          ref={frameRef}
          title={title}
          srcDoc={html}
          className="mx-auto aspect-[9/5] w-full max-w-[360px] rounded-md border border-stone-200 bg-white"
        />
        <div className="flex flex-wrap justify-center gap-2">
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
