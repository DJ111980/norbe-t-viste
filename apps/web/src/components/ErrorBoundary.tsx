import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de interfaz:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <section className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <h1 className="font-semibold">No se pudo mostrar esta pantalla.</h1>
          <p className="mt-1">
            Cierra esta vista o cambia de modulo. El resto de la aplicacion sigue disponible.
          </p>
        </section>
      );
    }

    return this.props.children;
  }
}
