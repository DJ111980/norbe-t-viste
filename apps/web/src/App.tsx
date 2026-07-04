import { useCallback, useEffect } from 'react';
import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/auth-context';
import { BrandingProvider } from './branding/BrandingProvider';
import { AppLayout } from './components/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { BrandingPage } from './pages/BrandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { EntryLotsPage } from './pages/EntryLotsPage';
import { InventoryPage } from './pages/InventoryPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ClientsPage } from './pages/ClientsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProvidersPage } from './pages/ProvidersPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { LabelsPage } from './pages/LabelsPage';
import { SalesPage } from './pages/SalesPage';
import { UsersPage } from './pages/UsersPage';
import { VariantsPage } from './pages/VariantsPage';
import { useRoute } from './routing/useRoute';

const routeTitles: Record<string, string> = {
  '/clientes': 'Clientes',
  '/proveedores': 'Proveedores',
  '/categorias': 'Categorías',
  '/productos': 'Productos',
  '/variantes': 'Variantes',
  '/inventario': 'Inventario',
  '/lotes-entrada': 'Lotes de entrada',
  '/ventas': 'Ventas',
  '/creditos': 'Créditos',
  '/cartera': 'Cartera',
  '/devoluciones': 'Devoluciones',
  '/etiquetas': 'Etiquetas',
  '/reportes': 'Reportes',
  '/branding': 'Marca del negocio',
  '/usuarios': 'Usuarios',
};

export function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrandingProvider>
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
        Cargando sesión...
      </main>
    );
  }

  if (!token || !user || path === '/login') {
    return <LoginPage onSuccess={() => navigate('/dashboard')} />;
  }

  return (
    <AppLayout currentPath={path} onNavigate={navigate}>
      <ErrorBoundary>{renderProtectedPage(path, user.rol, handleSessionExpired)}</ErrorBoundary>
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

  if (path === '/clientes') {
    return <ClientsPage onSessionExpired={onSessionExpired} />;
  }

  if (path === '/proveedores') {
    return <ProvidersPage onSessionExpired={onSessionExpired} />;
  }

  if (path === '/categorias') {
    return <CategoriesPage onSessionExpired={onSessionExpired} />;
  }

  if (path === '/productos') {
    return <ProductsPage onSessionExpired={onSessionExpired} />;
  }

  if (path === '/variantes') {
    return <VariantsPage onSessionExpired={onSessionExpired} />;
  }

  if (path === '/inventario') {
    return <InventoryPage onSessionExpired={onSessionExpired} />;
  }

  if (path === '/lotes-entrada') {
    return <EntryLotsPage onSessionExpired={onSessionExpired} />;
  }

  if (path === '/ventas') {
    return <SalesPage onSessionExpired={onSessionExpired} />;
  }

  if (path === '/cartera') {
    return <PortfolioPage initialView="portfolio" onSessionExpired={onSessionExpired} />;
  }

  if (path === '/creditos') {
    return <PortfolioPage initialView="credits" onSessionExpired={onSessionExpired} />;
  }

  if (path === '/devoluciones') {
    return <ReturnsPage onSessionExpired={onSessionExpired} />;
  }

  if (path === '/reportes') {
    return <ReportsPage onSessionExpired={onSessionExpired} />;
  }

  if (path === '/etiquetas') {
    return <LabelsPage onSessionExpired={onSessionExpired} />;
  }

  if (path === '/branding' && role !== 'ADMINISTRADOR') {
    return <AccessDenied />;
  }

  if (path === '/branding') {
    return <BrandingPage onSessionExpired={onSessionExpired} />;
  }

  if (path === '/usuarios' && role !== 'ADMINISTRADOR') {
    return <AccessDenied />;
  }

  if (path === '/usuarios') {
    return <UsersPage onSessionExpired={onSessionExpired} />;
  }

  return <PlaceholderPage title={routeTitles[path] ?? 'Módulo no encontrado'} />;
}

function AccessDenied() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">Acceso denegado</h1>
        <p className="mt-1 text-sm text-stone-600">
          Tu usuario no tiene permisos para entrar a esta sección.
        </p>
      </div>

      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Esta ruta requiere rol ADMINISTRADOR.
      </div>
    </section>
  );
}
