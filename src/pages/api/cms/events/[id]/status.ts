/**
 * API Endpoint: PATCH /api/cms/events/:id/status
 * Ejecuta transiciones del ciclo de vida editorial (`draft`, `pending_review`,
 * `published`, `archived`) aplicando el flujo dual por rol/área y registrando
 * comentario de revisión opcional en `cms_audit_logs`.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { resolveCmsActor } from '../../../../../lib/cms/auth';
import { CmsError, cmsJson, handleCmsApiError, readCmsJsonBody } from '../../../../../lib/cms/errors';
import { transitionCmsEventStatus } from '../../../../../lib/cms/events-service';
import { validateStatusTransitionInput } from '../../../../../lib/cms/events-validation';

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  try {
    const actor = await resolveCmsActor(request, locals as unknown as Record<string, unknown>);
    if (!params.id) throw new CmsError('invalid_id', 'Falta el identificador del evento.', 400);
    const body = await readCmsJsonBody(request);
    const { status, review_comment } = validateStatusTransitionInput(body);
    const updated = await transitionCmsEventStatus(actor, params.id, status, review_comment);
    return cmsJson({ data: updated }, 200);
  } catch (error) {
    return handleCmsApiError(error);
  }
};
