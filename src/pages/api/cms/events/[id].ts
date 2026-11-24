/**
 * API Endpoint: GET / PATCH / DELETE /api/cms/events/:id
 * Obtiene el detalle de un evento, actualiza sus campos editables (sin cambiar
 * el estado editorial) o elimina definitivamente el registro (solo `admin`).
 *
 * Medidas de seguridad:
 * - Validación UUID del parámetro `:id`
 * - Control estricto de `area_scope` y bloqueo de edición para delegados en publicados/archivados
 * - Auditoría automática en `public.cms_audit_logs`
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { resolveCmsActor } from '../../../../lib/cms/auth';
import { CmsError, cmsJson, handleCmsApiError, readCmsJsonBody } from '../../../../lib/cms/errors';
import {
  deleteCmsEvent,
  getCmsEventById,
  updateCmsEvent,
} from '../../../../lib/cms/events-service';

export const GET: APIRoute = async ({ request, params, locals }) => {
  try {
    const actor = await resolveCmsActor(request, locals as unknown as Record<string, unknown>);
    if (!params.id) throw new CmsError('invalid_id', 'Falta el identificador del evento.', 400);
    const event = await getCmsEventById(actor, params.id);
    return cmsJson({ data: event }, 200);
  } catch (error) {
    return handleCmsApiError(error);
  }
};

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  try {
    const actor = await resolveCmsActor(request, locals as unknown as Record<string, unknown>);
    if (!params.id) throw new CmsError('invalid_id', 'Falta el identificador del evento.', 400);
    const payload = await readCmsJsonBody(request);
    const updated = await updateCmsEvent(actor, params.id, payload);
    return cmsJson({ data: updated }, 200);
  } catch (error) {
    return handleCmsApiError(error);
  }
};

export const DELETE: APIRoute = async ({ request, params, locals }) => {
  try {
    const actor = await resolveCmsActor(request, locals as unknown as Record<string, unknown>);
    if (!params.id) throw new CmsError('invalid_id', 'Falta el identificador del evento.', 400);
    const result = await deleteCmsEvent(actor, params.id);
    return cmsJson(result, 200);
  } catch (error) {
    return handleCmsApiError(error);
  }
};
