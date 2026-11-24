/**
 * API Endpoint: GET / POST /api/cms/events
 * Lista eventos del CMS con filtros por estado, categoría, área y búsqueda,
 * o crea un nuevo evento aplicando validaciones estrictas y flujo editorial dual.
 *
 * Medidas de seguridad:
 * - Autenticación obligatoria vía Supabase Auth + `cms_user_permissions`
 * - Control de acceso por `area_scope` y rol (`admin`, `dcc`, `director`, `delegate`)
 * - Auditoría automática en `public.cms_audit_logs`
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { resolveCmsActor } from '../../../../lib/cms/auth';
import { cmsJson, handleCmsApiError, readCmsJsonBody } from '../../../../lib/cms/errors';
import { createCmsEvent, listCmsEvents } from '../../../../lib/cms/events-service';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const actor = await resolveCmsActor(request, locals as unknown as Record<string, unknown>);
    const url = new URL(request.url);
    const result = await listCmsEvents(actor, url.searchParams);
    return cmsJson(result, 200);
  } catch (error) {
    return handleCmsApiError(error);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const actor = await resolveCmsActor(request, locals as unknown as Record<string, unknown>);
    const payload = await readCmsJsonBody(request);
    const created = await createCmsEvent(actor, payload);
    return cmsJson({ data: created }, 201);
  } catch (error) {
    return handleCmsApiError(error);
  }
};
