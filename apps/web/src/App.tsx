import { useCallback, useEffect } from 'react';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/auth-context';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { useRoute } from './routing/useRoute';

const routeTitles: Record<string, string> = {
  '/clientes': 'Clientes',
  '/proveedores': 'Proveedores',
  '/categorias': 'Categorias',
  '/productos': 'Productos',
  '/variantes': 'Variantes',
  '/inventario': 'Inventario',
  '/lotes-entrada': 'Lotes de entrada',
  '/ventas': 'Ventas',
  '/creditos': 'Creditos / cartera',
  '/cartera': 'Cartera',
  '/devoluciones': 'Devoluciones',
  '/etiquetas': 'Etiquetas',
  '/reportes': 'Reportes',
  '/usuarios': 'Usuarios',
};

export function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function AppShell() {
  const { path, navigate } = useRoute();
  const { user, token, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !token && path !== '/login') {
      navigate('/login');
    }
  }, [isLoading, navigate, path, token]);

  useEffect(() => {
    if (!isLoading && token && user && path === '/login') {
      navigate('/dashboard');
    }
  }, [isLoading, navigate, path, token, user]);

  const handleSessionExpired = useCallback(() => {
    navigate('/login');
  }, [navigate]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-100 text-sm text-stone-600">
        Cargando sesion...
      </main>
    );
  }

  if (!token || !user || path === '/login') {
    return <LoginPage onSuccess={() => navigate('/dashboard')} />;
  }

  return (
    <AppLayout currentPath={path} onNavigate={navigate}>
      {renderProtectedPage(path, user.rol, handleSessionExpired)}
    </AppLayout>
  );
}

function renderProtectedPage(
  path: string,
  role: 'ADMINISTRADOR' | 'VENDEDOR',
  onSessionExpired: () => void,
) {
  if (path === '/dashboard') {
    return <DashboardPage onSessionExpired={onSessionExpired} />;
  }

  if (path === '/usuarios' && role !== 'ADMINISTRADOR') {
    return <AccessDenied />;
  }

  return <PlaceholderPage title={routeTitles[path] ?? 'Modulo no encontrado'} />;
}

function AccessDenied() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">Acceso denegado</h1>
        <p className="mt-1 text-sm text-stone-600">
          Tu usuario no tiene permisos para entrar a esta seccion.
        </p>
      </div>

      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Esta ruta requiere rol ADMINISTRADOR.
      </div>
    </section>
  );
}
