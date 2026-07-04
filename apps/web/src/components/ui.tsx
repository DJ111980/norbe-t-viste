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
        <h1 className="text-xl font-semibold text-stone-950">{title}</h1>
        <p className="mt-1 text-[13px] text-stone-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">
      Cargando informacion...
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">
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
      ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
      : normalizedStatus === 'ANULADO' || normalizedStatus === 'ANULADA'
        ? 'bg-red-100 text-red-800 ring-1 ring-red-200'
        : normalizedStatus === 'PENDIENTE'
          ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-200'
          : normalizedStatus === 'PARCIAL'
            ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200'
            : normalizedStatus === 'BORRADOR'
              ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
              : 'bg-stone-200 text-stone-700 ring-1 ring-stone-300';

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
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
      <span className="text-[13px] font-medium text-stone-700">
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
  'h-9 w-full rounded-md border border-stone-300 bg-white px-3 text-[13px] outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100';

export const textareaClassName =
  'min-h-20 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100';

export const primaryButtonClassName =
  'h-9 rounded-md bg-red-700 px-3 text-[13px] font-semibold text-white shadow-sm hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-stone-400';

export const secondaryButtonClassName =
  'h-9 rounded-md border border-stone-300 bg-white px-3 text-[13px] font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400';

export function getInitials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'US';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function UserAvatar({
  name,
  imageUrl,
  size = 'sm',
}: {
  name: string | null | undefined;
  imageUrl?: string | null;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'md' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs';

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-100 font-semibold text-stone-700 ring-1 ring-stone-200`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name ?? 'Usuario'} className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}
