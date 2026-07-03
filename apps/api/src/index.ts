import type { ApiEnv } from './config/env';
import { handleAuthRoutes } from './modules/auth/auth.routes';
import { handleBrandingRoutes } from './modules/branding/branding.routes';
import { handleCategoryRoutes } from './modules/categories/categories.routes';
import { handleClientRoutes } from './modules/clients/clients.routes';
import { handleCreditRoutes } from './modules/credits/credits.routes';
import { handleEntryLotRoutes } from './modules/entry-lots/entry-lots.routes';
import { handleImageRoutes } from './modules/images/images.routes';
import { handleInventoryRoutes } from './modules/inventory/inventory.routes';
import { handlePortfolioRoutes } from './modules/portfolio/portfolio.routes';
import { handleProductRoutes } from './modules/products/products.routes';
import { handleProviderRoutes } from './modules/providers/providers.routes';
import { handleReturnRoutes } from './modules/returns/returns.routes';
import { handleSaleRoutes } from './modules/sales/sales.routes';
import { handleUserRoutes } from './modules/users/users.routes';
import { handleVariantRoutes } from './modules/variants/variants.routes';
import { ApiError, normalizeApiError } from './shared/errors';
import { errorResponse } from './shared/responses';
import { handleHealthRoutes } from './routes/health.routes';

async function handleRequest(request: Request, env: ApiEnv): Promise<Response> {
  const brandingResponse = await handleBrandingRoutes(request, env);

  if (brandingResponse) {
    return brandingResponse;
  }

  const imageResponse = await handleImageRoutes(request, env);

  if (imageResponse) {
    return imageResponse;
  }

  const entryLotResponse = await handleEntryLotRoutes(request, env);

  if (entryLotResponse) {
    return entryLotResponse;
  }

  const inventoryResponse = await handleInventoryRoutes(request, env);

  if (inventoryResponse) {
    return inventoryResponse;
  }

  const returnResponse = await handleReturnRoutes(request, env);

  if (returnResponse) {
    return returnResponse;
  }

  const saleResponse = await handleSaleRoutes(request, env);

  if (saleResponse) {
    return saleResponse;
  }

  const variantResponse = await handleVariantRoutes(request, env);

  if (variantResponse) {
    return variantResponse;
  }

  const productResponse = await handleProductRoutes(request, env);

  if (productResponse) {
    return productResponse;
  }

  const categoryResponse = await handleCategoryRoutes(request, env);

  if (categoryResponse) {
    return categoryResponse;
  }

  const providerResponse = await handleProviderRoutes(request, env);

  if (providerResponse) {
    return providerResponse;
  }

  const creditResponse = await handleCreditRoutes(request, env);

  if (creditResponse) {
    return creditResponse;
  }

  const portfolioResponse = await handlePortfolioRoutes(request, env);

  if (portfolioResponse) {
    return portfolioResponse;
  }

  const clientResponse = await handleClientRoutes(request, env);

  if (clientResponse) {
    return clientResponse;
  }

  const userResponse = await handleUserRoutes(request, env);

  if (userResponse) {
    return userResponse;
  }

  const authResponse = await handleAuthRoutes(request, env);

  if (authResponse) {
    return authResponse;
  }

  const healthResponse = await handleHealthRoutes(request, env);

  if (healthResponse) {
    return healthResponse;
  }

  throw new ApiError('NOT_FOUND', 'La ruta solicitada no existe.', 404);
}

export default {
  async fetch(request, env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      // Centralizar errores desde el inicio evita que cada modulo de negocio invente
      // su propio formato de fallo cuando agreguemos autenticacion, ventas o creditos.
      return errorResponse(normalizeApiError(error));
    }
  },
} satisfies ExportedHandler<ApiEnv>;
