import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiEnv } from '../../config/env';
import type { ImageUploadInput, ProductImageRecord, VariantImageRecord } from './images.types';

const mocks = vi.hoisted(() => ({
  products: new Map<string, ProductImageRecord>(),
  variants: new Map<string, VariantImageRecord>(),
  uploaded: null as { key: string; body: ArrayBuffer; contentType: string } | null,
  deletedKeys: [] as string[],
}));

vi.mock('../../services/r2', () => ({
  buildInternalKey: vi.fn((parts: string[]) => parts.join('/')),
  uploadObject: vi.fn(async (_env: ApiEnv, input) => {
    mocks.uploaded = input;
  }),
  getObject: vi.fn(async (_env: ApiEnv, key: string) => ({
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(key));
        controller.close();
      },
    }),
    contentType: 'image/png',
  })),
  deleteObject: vi.fn(async (_env: ApiEnv, key: string) => {
    mocks.deletedKeys.push(key);
  }),
}));

vi.mock('./images.repository', () => ({
  findProductImage: vi.fn(
    async (_env: ApiEnv, idProducto: string) => mocks.products.get(idProducto) ?? null,
  ),
  updateProductImageKey: vi.fn(
    async (_env: ApiEnv, idProducto: string, imageKey: string | null) => {
      const product = mocks.products.get(idProducto);
      if (!product) throw new Error('missing product');
      const updatedProduct = { ...product, imagen_principal: imageKey };
      mocks.products.set(idProducto, updatedProduct);
      return updatedProduct;
    },
  ),
  findVariantImage: vi.fn(
    async (_env: ApiEnv, idVariante: string) => mocks.variants.get(idVariante) ?? null,
  ),
  updateVariantImageKey: vi.fn(
    async (_env: ApiEnv, idVariante: string, imageKey: string | null) => {
      const variant = mocks.variants.get(idVariante);
      if (!variant) throw new Error('missing variant');
      const updatedVariant = { ...variant, imagen_variante: imageKey };
      mocks.variants.set(idVariante, updatedVariant);
      return updatedVariant;
    },
  ),
}));

const {
  deleteProductImage,
  deleteVariantImage,
  getProductImage,
  getProductImageFile,
  getVariantImage,
  getVariantImageFile,
  uploadProductImage,
  uploadVariantImage,
} = await import('./images.service');

const env = {} as ApiEnv;

function createImageInput(): ImageUploadInput {
  const file = new File(['img'], 'foto.png', { type: 'image/png' });
  return {
    file,
    extension: 'png',
    contentType: 'image/png',
    size: file.size,
  };
}

describe('images service', () => {
  beforeEach(() => {
    mocks.products = new Map([['prd_1', { id_producto: 'prd_1', imagen_principal: null }]]);
    mocks.variants = new Map([
      [
        'var_1',
        {
          id_variante: 'var_1',
          imagen_variante: null,
          id_producto: 'prd_1',
          imagen_principal: null,
        },
      ],
    ]);
    mocks.uploaded = null;
    mocks.deletedKeys = [];
  });

  it('ADMINISTRADOR puede subir imagen principal y D1 guarda solo key', async () => {
    const response = await uploadProductImage(env, 'prd_1', createImageInput());

    expect(response.imagen?.key).toMatch(/^productos\/prd_1\/principal\/.+\.png$/);
    expect(mocks.uploaded?.key).toBe(response.imagen?.key);
    expect(mocks.products.get('prd_1')?.imagen_principal).toBe(response.imagen?.key);
    expect(mocks.products.get('prd_1')?.imagen_principal).not.toBe('foto.png');
  });

  it('reemplazar imagen actualiza D1 e intenta borrar objeto anterior', async () => {
    mocks.products.set('prd_1', {
      id_producto: 'prd_1',
      imagen_principal: 'productos/prd_1/principal/anterior.png',
    });

    await uploadProductImage(env, 'prd_1', createImageInput());

    expect(mocks.deletedKeys).toContain('productos/prd_1/principal/anterior.png');
  });

  it('GET producto metadata, file y delete funcionan', async () => {
    mocks.products.set('prd_1', {
      id_producto: 'prd_1',
      imagen_principal: 'productos/prd_1/principal/a.png',
    });

    expect((await getProductImage(env, 'prd_1')).imagen?.origen).toBe('PRODUCTO');
    expect(await (await getProductImageFile(env, 'prd_1')).text()).toBe(
      'productos/prd_1/principal/a.png',
    );

    const deleted = await deleteProductImage(env, 'prd_1');

    expect(deleted.imagen).toBeNull();
    expect(mocks.deletedKeys).toContain('productos/prd_1/principal/a.png');
  });

  it('imagen de variante usa variante, fallback producto y null', async () => {
    mocks.variants.set('var_1', {
      id_variante: 'var_1',
      imagen_variante: 'variantes/var_1/a.png',
      id_producto: 'prd_1',
      imagen_principal: 'productos/prd_1/principal/a.png',
    });

    expect((await getVariantImage(env, 'var_1')).origen).toBe('VARIANTE');
    expect(await (await getVariantImageFile(env, 'var_1')).text()).toBe('variantes/var_1/a.png');

    mocks.variants.set('var_1', {
      id_variante: 'var_1',
      imagen_variante: null,
      id_producto: 'prd_1',
      imagen_principal: 'productos/prd_1/principal/a.png',
    });

    expect((await getVariantImage(env, 'var_1')).origen).toBe('PRODUCTO');

    mocks.variants.set('var_1', {
      id_variante: 'var_1',
      imagen_variante: null,
      id_producto: 'prd_1',
      imagen_principal: null,
    });

    expect((await getVariantImage(env, 'var_1')).imagen).toBeNull();
  });

  it('ADMINISTRADOR puede subir y eliminar imagen de variante', async () => {
    const uploaded = await uploadVariantImage(env, 'var_1', createImageInput());

    expect(uploaded.imagen?.key).toMatch(/^variantes\/var_1\/.+\.png$/);

    const deleted = await deleteVariantImage(env, 'var_1');

    expect(deleted.origen).toBe('NINGUNA');
    expect(mocks.deletedKeys).toContain(uploaded.imagen?.key);
  });
});
