import { useEffect, useRef, type FocusEvent, type MouseEvent, type ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">{title}</h1>
        <p className="mt-1 text-sm text-stone-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600">
      Cargando informacion...
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600">
      {message}
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    ref.current?.focus({ preventScroll: true });
  }, [message]);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none"
    >
      {message}
    </div>
  );
}

export function SuccessMessage({ message }: { message: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    ref.current?.focus({ preventScroll: true });
  }, [message]);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 outline-none"
    >
      {message}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toUpperCase();
  const tone =
    normalizedStatus === 'ACTIVO' ||
    normalizedStatus === 'ACTIVA' ||
    normalizedStatus === 'CONFIRMADO' ||
    normalizedStatus === 'COMPLETADA' ||
    normalizedStatus === 'PAGADO'
      ? 'bg-emerald-100 text-emerald-800'
      : normalizedStatus === 'ANULADO' || normalizedStatus === 'ANULADA'
        ? 'bg-red-100 text-red-800'
        : normalizedStatus === 'PENDIENTE'
          ? 'bg-orange-100 text-orange-800'
          : normalizedStatus === 'PARCIAL'
            ? 'bg-blue-100 text-blue-800'
            : normalizedStatus === 'BORRADOR'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-stone-200 text-stone-700';

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

export function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">
        {label}
        {required && <span className="ml-1 text-red-700">*</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const numberInputFocusProps = {
  onFocus: (event: FocusEvent<HTMLInputElement>) => event.currentTarget.select(),
  onClick: (event: MouseEvent<HTMLInputElement>) => {
    if (event.currentTarget.value === '0') event.currentTarget.select();
  },
};

export const inputClassName =
  'h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100';

export const textareaClassName =
  'min-h-20 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100';

export const primaryButtonClassName =
  'h-10 rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-stone-400';

export const secondaryButtonClassName =
  'h-10 rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400';
