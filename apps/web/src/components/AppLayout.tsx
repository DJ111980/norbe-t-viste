import { useMemo, type ReactNode } from 'react';
import { useAuth } from '../auth/auth-context';
import { useBranding } from '../branding/branding-context';
import { UserAvatar } from './ui';
import type { UserRole } from '../types';

interface NavItem {
  label: string;
  path: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Clientes', path: '/clientes' },
  { label: 'Proveedores', path: '/proveedores' },
  { label: 'Categorías', path: '/categorias' },
  { label: 'Productos', path: '/productos' },
  { label: 'Variantes', path: '/variantes' },
  { label: 'Inventario', path: '/inventario' },
  { label: 'Lotes de entrada', path: '/lotes-entrada' },
  { label: 'Ventas', path: '/ventas' },
  { label: 'Créditos', path: '/creditos' },
  { label: 'Cartera', path: '/cartera' },
  { label: 'Devoluciones', path: '/devoluciones' },
  { label: 'Etiquetas', path: '/etiquetas' },
  { label: 'Reportes', path: '/reportes' },
  { label: 'Marca del negocio', path: '/branding', adminOnly: true },
  { label: 'Usuarios', path: '/usuarios', adminOnly: true },
];

export function getVisibleNavItems(role: UserRole): NavItem[] {
  return navItems.filter((item) => !item.adminOnly || role === 'ADMINISTRADOR');
}

export function AppLayout({
  currentPath,
  onNavigate,
  children,
}: {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const { branding, logoUrl } = useBranding();
  const visibleItems = useMemo(() => getVisibleNavItems(user?.rol ?? 'VENDEDOR'), [user?.rol]);

  return (
    <div className="app-shell min-h-screen bg-[#f7f7f8] text-stone-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-200 bg-white lg:block">
        <div className="border-b border-stone-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white shadow-sm">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`Logo ${branding.nombre_negocio}`}
                  className="max-h-9 max-w-9 object-contain"
                />
              ) : (
                <span className="text-xs font-semibold text-red-700">
                  {branding.nombre_negocio.slice(0, 3)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase text-red-700">
                {branding.nombre_negocio}
              </p>
              <p className="mt-1 truncate text-xs text-stone-600">{branding.eslogan}</p>
            </div>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-3">
          {visibleItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={`w-full rounded-md px-3 py-1.5 text-left text-[13px] font-medium ${
                currentPath === item.path
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-stone-700 hover:bg-stone-100 hover:text-stone-950'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-6">
            <div className="flex items-center gap-3">
              <UserAvatar
                idUsuario={user?.idUsuario}
                name={user?.nombreCompleto ?? user?.nombreUsuario}
                hasImage={user?.avatar.disponible}
              />
              <div>
                <p className="text-xs font-semibold uppercase text-red-700 lg:hidden">
                  {branding.nombre_negocio}
                </p>
                <p className="text-sm font-medium text-stone-950">
                  {user?.nombreCompleto ?? 'Usuario'}
                </p>
                <p className="text-xs text-stone-500">{user?.rol ?? 'Sin rol'}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void logout().then(() => onNavigate('/login'))}
              className="h-9 rounded-md border border-stone-300 bg-white px-3 text-[13px] font-medium text-stone-700 hover:bg-stone-50"
            >
              Cerrar sesion
            </button>
          </div>

          <nav className="flex gap-2 overflow-x-auto border-t border-stone-100 px-4 py-2 lg:hidden">
            {visibleItems.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium ${
                  currentPath === item.path
                    ? 'bg-red-700 text-white'
                    : 'bg-stone-100 text-stone-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="px-4 py-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
