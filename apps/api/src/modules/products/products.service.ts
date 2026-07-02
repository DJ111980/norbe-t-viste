import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { toPublicProduct } from './products.mapper';
import * as productsRepository from './products.repository';
import type {
  CreateProductInput,
  ListProductsFilters,
  ProductRecord,
  PublicProduct,
  UpdateProductInput,
  UpdateProductStatusInput,
} from './products.types';

function createProductId(): string {
  return `prd_${crypto.randomUUID()}`;
}

async function ensureProductExists(env: ApiEnv, idProducto: string): Promise<ProductRecord> {
  const product = await productsRepository.findProductById(env, idProducto);

  if (!product) {
    throw new ApiError('PRODUCT_NOT_FOUND', 'El producto no existe.', 404);
  }

  return product;
}

async function ensureNormalizedNameIsAvailable(
  env: ApiEnv,
  nombreNormalizado: string | undefined,
  currentProductId?: string,
): Promise<void> {
  if (!nombreNormalizado) {
    return;
  }

  const existingProduct = await productsRepository.findProductByNormalizedName(
    env,
    nombreNormalizado,
  );

  if (existingProduct && existingProduct.id_producto !== currentProductId) {
    // nombre_normalizado evita duplicar productos por mayusculas o espacios.
    // Las variantes se encargaran despues de talla, color, stock y QR.
    throw new ApiError('PRODUCT_NAME_ALREADY_EXISTS', 'Ya existe un producto con ese nombre.', 409);
  }
}

async function ensureActiveCategory(env: ApiEnv, idCategoria: string): Promise<void> {
  const category = await productsRepository.findCategoryForProduct(env, idCategoria);

  if (!category) {
    throw new ApiError('PRODUCT_CATEGORY_NOT_FOUND', 'La categoria del producto no existe.', 404);
  }

  if (category.estado !== 'ACTIVA') {
    throw new ApiError(
      'PRODUCT_CATEGORY_INACTIVE',
      'La categoria del producto debe estar activa.',
      409,
    );
  }
}

function canReadProduct(auth: AuthContext, product: ProductRecord): boolean {
  // VENDEDOR solo consulta productos activos para evitar vender catalogo pausado.
  return auth.user.rol === 'ADMINISTRADOR' || product.estado === 'ACTIVO';
}

export async function listProducts(
  env: ApiEnv,
  auth: AuthContext,
  filters: ListProductsFilters,
): Promise<PublicProduct[]> {
  const effectiveFilters =
    auth.user.rol === 'VENDEDOR'
      ? {
          ...filters,
          estado: 'ACTIVO' as const,
        }
      : filters;

  const products = await productsRepository.listProducts(env, effectiveFilters);

  return products.map(toPublicProduct);
}

export async function getProduct(
  env: ApiEnv,
  auth: AuthContext,
  idProducto: string,
): Promise<PublicProduct> {
  const product = await ensureProductExists(env, idProducto);

  if (!canReadProduct(auth, product)) {
    throw new ApiError('PRODUCT_NOT_FOUND', 'El producto no existe.', 404);
  }

  return toPublicProduct(product);
}

export async function createProduct(
  env: ApiEnv,
  auth: AuthContext,
  input: CreateProductInput,
): Promise<PublicProduct> {
  await ensureActiveCategory(env, input.idCategoria);
  await ensureNormalizedNameIsAvailable(env, input.nombreNormalizado);

  // El producto base no toca stock ni imagenes. Stock vivira en variantes y R2
  // se integrara en el modulo de imagenes.
  return toPublicProduct(
    await productsRepository.createProduct(env, createProductId(), input, auth.user.id_usuario),
  );
}

export async function updateProduct(
  env: ApiEnv,
  auth: AuthContext,
  idProducto: string,
  input: UpdateProductInput,
): Promise<PublicProduct> {
  await ensureProductExists(env, idProducto);

  if (input.idCategoria) {
    await ensureActiveCategory(env, input.idCategoria);
  }

  await ensureNormalizedNameIsAvailable(env, input.nombreNormalizado, idProducto);

  return toPublicProduct(
    await productsRepository.updateProduct(env, idProducto, input, auth.user.id_usuario),
  );
}

export async function updateProductStatus(
  env: ApiEnv,
  auth: AuthContext,
  idProducto: string,
  input: UpdateProductStatusInput,
): Promise<PublicProduct> {
  await ensureProductExists(env, idProducto);

  // No se eliminan productos fisicamente: variantes, lotes e historial futuro
  // dependeran del mismo id_producto.
  return toPublicProduct(
    await productsRepository.updateProductStatus(
      env,
      idProducto,
      input.estado,
      auth.user.id_usuario,
    ),
  );
}
