import type { CategoryRecord, PublicCategory } from './categories.types';

export function toPublicCategory(category: CategoryRecord): PublicCategory {
  // nombre_normalizado es una clave tecnica para unicidad; no debe exponerse como
  // campo editable ni depender de decisiones del frontend.
  return {
    idCategoria: category.id_categoria,
    nombreCategoria: category.nombre_categoria,
    descripcion: category.descripcion,
    estado: category.estado,
    creadoEn: category.creado_en,
    actualizadoEn: category.actualizado_en,
    creadoPor: category.creado_por,
    actualizadoPor: category.actualizado_por,
  };
}
