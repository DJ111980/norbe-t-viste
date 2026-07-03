import { useMemo, type ReactNode } from 'react';
import { useAuth } from '../auth/auth-context';
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
  { label: 'Categorias', path: '/categorias' },
  { label: 'Productos', path: '/productos' },
  { label: 'Variantes', path: '/variantes' },
  { label: 'Inventario', path: '/inventario' },
  { label: 'Lotes de entrada', path: '/lotes-entrada' },
  { label: 'Ventas', path: '/ventas' },
  { label: 'Creditos', path: '/creditos' },
  { label: 'Cartera', path: '/cartera' },
  { label: 'Devoluciones', path: '/devoluciones' },
  { label: 'Etiquetas', path: '/etiquetas' },
  { label: 'Reportes', path: '/reportes' },
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
  const visibleItems = useMemo(() => getVisibleNavItems(user?.rol ?? 'VENDEDOR'), [user?.rol]);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-stone-200 bg-white lg:block">
        <div className="border-b border-stone-200 px-6 py-5">
          <p className="text-xs font-semibold uppercase text-red-700">NORBE T VISTE</p>
          <p className="mt-1 text-sm text-stone-600">Gestion comercial</p>
        </div>

        <nav className="space-y-1 px-3 py-4">
          {visibleItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium ${
                currentPath === item.path
                  ? 'bg-red-700 text-white'
                  : 'text-stone-700 hover:bg-stone-100 hover:text-stone-950'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-white">
          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase text-red-700 lg:hidden">
                NORBE T VISTE
              </p>
              <p className="text-sm font-medium text-stone-950">
                {user?.nombreCompleto ?? 'Usuario'}
              </p>
              <p className="text-xs text-stone-500">{user?.rol ?? 'Sin rol'}</p>
            </div>

            <button
              type="button"
              onClick={() => void logout().then(() => onNavigate('/login'))}
              className="h-10 rounded-md border border-stone-300 px-4 text-sm font-medium text-stone-700 hover:bg-stone-50"
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
                className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium ${
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

        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
