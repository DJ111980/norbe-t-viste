import { FormEvent, useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { ApiClientError } from '../lib/api';

export function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(correo, contrasena);
      onSuccess();
    } catch (loginError) {
      if (loginError instanceof ApiClientError) {
        setError(loginError.message);
      } else {
        setError('No se pudo iniciar sesion. Intenta nuevamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-stone-100 text-stone-950 lg:grid-cols-[minmax(0,1fr)_440px]">
      <section className="hidden border-r border-stone-200 bg-red-800 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase">NORBE T VISTE</p>
          <h1 className="mt-8 max-w-xl text-4xl font-semibold leading-tight">
            Gestion comercial lista para operar desde el navegador.
          </h1>
        </div>
        <p className="max-w-md text-sm leading-6 text-red-100">
          Acceso privado para administrar ventas, inventario, cartera, etiquetas y reportes.
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="text-sm font-semibold uppercase text-red-700">NORBE T VISTE</p>
            <h1 className="mt-2 text-2xl font-semibold">Iniciar sesion</h1>
          </div>

          <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-6 hidden lg:block">
              <p className="text-sm font-semibold uppercase text-red-700">NORBE T VISTE</p>
              <h2 className="mt-2 text-2xl font-semibold">Iniciar sesion</h2>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">Correo</span>
                <input
                  value={correo}
                  onChange={(event) => setCorreo(event.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-stone-700">Contrasena</span>
                <input
                  value={contrasena}
                  onChange={(event) => setContrasena(event.target.value)}
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-1 h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-red-700 focus:ring-2 focus:ring-red-100"
                />
              </label>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {isSubmitting ? 'Ingresando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
