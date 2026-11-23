import type { APIRoute } from 'astro';
import {
  getCallPublicConfig,
  updateCallPublicConfig,
  CmsCallServiceError,
} from '../../../../lib/cms/call-service';
import { cmsError, cmsResponse } from '../../../../lib/cms/client';
import type { UpdateCmsCallPublicSettingsInput } from '../../../../types/cms';

export const prerender = false;

/**
 * GET /api/cms/call-config
 * Obtiene los parámetros públicos de la vista /call desde recruitment_config.settings.
 */
export const GET: APIRoute = async () => {
  try {
    const data = await getCallPublicConfig();
    return cmsResponse(data, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener la configuración de convocatoria.';
    return cmsError('DATABASE_ERROR', message, 500);
  }
};

/**
 * PUT /api/cms/call-config
 * Actualiza atómicamente los parámetros públicos de Convocatoria con control de concurrencia optimista y auditoría.
 */
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Verificar sesión del middleware
    const user = locals.user;
    if (!user) {
      return cmsError(
        'UNAUTHORIZED',
        'Se requiere inicio de sesión para modificar la configuración de convocatoria.',
        401
      );
    }

    // 2. Validar Content-Type
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return cmsError('INVALID_CONTENT_TYPE', 'El cuerpo de la petición debe ser JSON.', 400);
    }

    // 3. Parsear y validar body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return cmsError('INVALID_BODY', 'El cuerpo de la petición no es un objeto válido.', 400);
    }

    const { expectedRevision, settings, reason } = body as {
      expectedRevision?: number;
      settings?: Record<string, unknown>;
      reason?: string;
    };

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return cmsError(
        'VALIDATION_ERROR',
        'El campo `reason` (motivo del cambio) es obligatorio para la auditoría.',
        422,
        { field: 'reason' }
      );
    }

    if (!settings || typeof settings !== 'object') {
      return cmsError(
        'VALIDATION_ERROR',
        'El campo `settings` debe ser un objeto con los parámetros a actualizar.',
        422,
        { field: 'settings' }
      );
    }

    const input: UpdateCmsCallPublicSettingsInput = {
      expectedRevision: typeof expectedRevision === 'number' ? expectedRevision : undefined,
      settings,
      reason: reason.trim(),
    };

    // 4. Invocar servicio
    const result = await updateCallPublicConfig(input, user);

    return cmsResponse(result, 200);
  } catch (err: unknown) {
    if (err instanceof CmsCallServiceError) {
      return cmsError(err.code, err.message, err.status, err.details);
    }
    const message = err instanceof Error ? err.message : 'Error al actualizar la configuración de convocatoria.';
    return cmsError('DATABASE_ERROR', message, 500);
  }
};
