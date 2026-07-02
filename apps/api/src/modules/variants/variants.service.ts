import type { ApiEnv } from '../../config/env';
import type { AuthContext } from '../../middleware/auth.middleware';
import { ApiError } from '../../shared/errors';
import { toPublicVariant } from './variants.mapper';
import * as variantsRepository from './variants.repository';
import type {
  CreateVariantInput,
  ListVariantsFilters,
  PublicVariant,
  UpdateVariantInput,
  UpdateVariantStatusInput,
  VariantRecord,
} from './variants.types';

const SKU_PREFIX = 'NTV-SKU-';
const QR_PREFIX = 'NTV-VAR-';

function createVariantId(): string {
  return `var_${crypto.randomUUID()}`;
}

function formatSequentialCode(prefix: string, sequence: number): string {
  return `${prefix}${String(sequence).padStart(6, '0')}`;
}

async function ensureProductIsActive(env: ApiEnv, idProducto: string): Promise<void> {
  const product = await variantsRepository.findProductForVariant(env, idProducto);

  if (!product) {
    throw new ApiError('VARIANT_PRODUCT_NOT_FOUND', 'El producto de la variante no existe.', 404);
  }

  if (product.estado !== 'ACTIVO') {
    throw new ApiError(
      'VARIANT_PRODUCT_INACTIVE',
      'El producto debe estar activo para crear variantes.',
      409,
    );
  }
}

async function ensureVariantExists(env: ApiEnv, idVariante: string): Promise<VariantRecord> {
  const variant = await variantsRepository.findVariantById(env, idVariante);

  if (!variant) {
    throw new ApiError('VARIANT_NOT_FOUND', 'La variante no existe.', 404);
  }

  return variant;
}

async function ensureCombinationIsAvailable(
  env: ApiEnv,
  idProducto: string,
  tallaNormalizada: string,
  colorNormalizado: string,
  currentVariantId?: string,
): Promise<void> {
  const existingVariant = await variantsRepository.findVariantByCombination(
    env,
    idProducto,
    tallaNormalizada,
    colorNormalizado,
  );

  if (existingVariant && existingVariant.id_variante !== currentVariantId) {
    // La variante real se define por producto + talla/color normalizados. Nulls
    // se transforman en unica/sin-color para que no haya duplicados invisibles.
    throw new ApiError(
      'VARIANT_ALREADY_EXISTS',
      'Ya existe una variante con esa talla y color.',
      409,
    );
  }
}

async function ensureSkuIsAvailable(
  env: ApiEnv,
  sku: string,
  currentVariantId?: string,
): Promise<void> {
  const existingVariant = await variantsRepository.findVariantBySku(env, sku);

  if (existingVariant && existingVariant.id_variante !== currentVariantId) {
    throw new ApiError('VARIANT_SKU_ALREADY_EXISTS', 'Ya existe una variante con ese SKU.', 409);
  }
}

async function generateUniqueCode(
  env: ApiEnv,
  prefix: string,
  finder: (env: ApiEnv, code: string) => Promise<VariantRecord | null>,
): Promise<string> {
  const sequence = (await variantsRepository.countVariants(env)) + 1;

  for (let attempts = 0; attempts < 100; attempts += 1) {
    const code = formatSequentialCode(prefix, sequence + attempts);

    if (!(await finder(env, code))) {
      return code;
    }
  }

  throw new ApiError('VARIANT_CODE_GENERATION_FAILED', 'No se pudo generar un codigo unico.', 500);
}

async function resolveSku(env: ApiEnv, requestedSku?: string): Promise<string> {
  if (requestedSku) {
    await ensureSkuIsAvailable(env, requestedSku);
    return requestedSku;
  }

  return generateUniqueCode(env, SKU_PREFIX, variantsRepository.findVariantBySku);
}

function canReadVariant(auth: AuthContext, variant: VariantRecord): boolean {
  // VENDEDOR solo consulta variantes activas de productos activos. No crea ni
  // edita variantes porque eso afectaria catalogo, QR y futuro stock.
  return (
    auth.user.rol === 'ADMINISTRADOR' ||
    (variant.estado === 'ACTIVA' && variant.estado_producto === 'ACTIVO')
  );
}

export async function listVariants(
  env: ApiEnv,
  auth: AuthContext,
  filters: ListVariantsFilters,
): Promise<PublicVariant[]> {
  const effectiveFilters =
    auth.user.rol === 'VENDEDOR'
      ? {
          ...filters,
          estado: 'ACTIVA' as const,
        }
      : filters;

  const variants = await variantsRepository.listVariants(env, effectiveFilters);

  return variants.filter((variant) => canReadVariant(auth, variant)).map(toPublicVariant);
}

export async function getVariant(
  env: ApiEnv,
  auth: AuthContext,
  idVariante: string,
): Promise<PublicVariant> {
  const variant = await ensureVariantExists(env, idVariante);

  if (!canReadVariant(auth, variant)) {
    throw new ApiError('VARIANT_NOT_FOUND', 'La variante no existe.', 404);
  }

  return toPublicVariant(variant);
}

export async function getVariantByQr(
  env: ApiEnv,
  auth: AuthContext,
  codigoQr: string,
): Promise<PublicVariant> {
  const variant = await variantsRepository.findVariantByQr(env, codigoQr);

  if (!variant) {
    throw new ApiError('VARIANT_NOT_FOUND', 'La variante no existe.', 404);
  }

  if (variant.estado === 'INACTIVA') {
    throw new ApiError('VARIANT_INACTIVE', 'La variante esta inactiva.', 409);
  }

  if (variant.estado_producto === 'INACTIVO') {
    throw new ApiError(
      'VARIANT_PRODUCT_INACTIVE',
      'El producto de la variante esta inactivo.',
      409,
    );
  }

  if (!canReadVariant(auth, variant)) {
    throw new ApiError('VARIANT_NOT_FOUND', 'La variante no existe.', 404);
  }

  return toPublicVariant(variant);
}

export async function createVariant(
  env: ApiEnv,
  auth: AuthContext,
  idProducto: string,
  input: CreateVariantInput,
): Promise<PublicVariant> {
  await ensureProductIsActive(env, idProducto);
  await ensureCombinationIsAvailable(
    env,
    idProducto,
    input.tallaNormalizada,
    input.colorNormalizado,
  );

  const sku = await resolveSku(env, input.sku);
  const codigoQr = await generateUniqueCode(env, QR_PREFIX, variantsRepository.findVariantByQr);

  // El QR guarda solo codigo interno y se crea una vez por variante. No se
  // genera imagen QR ni R2 aqui. stock_actual inicia en 0 y solo inventario/lotes
  // lo moveran mas adelante.
  return toPublicVariant(
    await variantsRepository.createVariant(
      env,
      createVariantId(),
      idProducto,
      input,
      sku,
      codigoQr,
      auth.user.id_usuario,
    ),
  );
}

export async function updateVariant(
  env: ApiEnv,
  auth: AuthContext,
  idVariante: string,
  input: UpdateVariantInput,
): Promise<PublicVariant> {
  const variant = await ensureVariantExists(env, idVariante);

  const tallaNormalizada = input.tallaNormalizada ?? variant.talla_normalizada;
  const colorNormalizado = input.colorNormalizado ?? variant.color_normalizado;

  if (input.tallaNormalizada !== undefined || input.colorNormalizado !== undefined) {
    await ensureCombinationIsAvailable(
      env,
      variant.id_producto,
      tallaNormalizada,
      colorNormalizado,
      idVariante,
    );
  }

  if (input.sku) {
    await ensureSkuIsAvailable(env, input.sku, idVariante);
  }

  return toPublicVariant(
    await variantsRepository.updateVariant(env, idVariante, input, auth.user.id_usuario),
  );
}

export async function updateVariantStatus(
  env: ApiEnv,
  auth: AuthContext,
  idVariante: string,
  input: UpdateVariantStatusInput,
): Promise<PublicVariant> {
  await ensureVariantExists(env, idVariante);

  // Las variantes no se eliminan fisicamente: ventas, lotes y movimientos futuros
  // deberan conservar la referencia historica.
  return toPublicVariant(
    await variantsRepository.updateVariantStatus(
      env,
      idVariante,
      input.estado,
      auth.user.id_usuario,
    ),
  );
}
