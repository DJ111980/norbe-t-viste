import type { ApiEnv } from '../../config/env';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { ensureMethod, readJsonBody } from '../../shared/validation';
import { getBatchVariantLabelPreviewHtml, getVariantLabelPreviewHtml } from './labels.service';
import { validateBatchLabelPreviewInput, validateVariantLabelPreviewId } from './labels.validation';

function matchVariantLabelPreviewPath(pathname: string): { idVariante: string } | null {
  const match = pathname.match(/^\/etiquetas\/variantes\/([^/]+)\/preview$/);

  if (!match) {
    return null;
  }

  return {
    idVariante: validateVariantLabelPreviewId(decodeURIComponent(match[1])),
  };
}

export async function handleLabelRoutes(request: Request, env: ApiEnv): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === '/etiquetas/variantes/preview-lote') {
    const auth = await requireAuth(request, env);
    requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);
    ensureMethod(request, 'POST');

    return new Response(
      await getBatchVariantLabelPreviewHtml(
        env,
        validateBatchLabelPreviewInput(await readJsonBody(request)),
      ),
      {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      },
    );
  }

  const previewPath = matchVariantLabelPreviewPath(url.pathname);

  if (!previewPath) {
    return null;
  }

  const auth = await requireAuth(request, env);
  requireRole(auth, ['ADMINISTRADOR', 'VENDEDOR']);

  if (request.method !== 'GET') {
    ensureMethod(request, 'GET');
  }

  return new Response(await getVariantLabelPreviewHtml(env, previewPath.idVariante), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  });
}
