export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-stone-950">{title}</h1>
        <p className="mt-1 text-sm text-stone-600">Modulo pendiente de implementar.</p>
      </div>

      <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600">
        Esta ruta queda preparada para una fase posterior del frontend.
      </div>
    </section>
  );
}
