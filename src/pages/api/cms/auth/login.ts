import type { APIRoute } from 'astro';
import { signInCmsUser, setAuthCookies } from '../../../../lib/cms/auth';
import { cmsError, cmsResponse } from '../../../../lib/cms/client';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return cmsError('INVALID_CONTENT_TYPE', 'El cuerpo de la petición debe ser JSON.', 400);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return cmsError('INVALID_BODY', 'El cuerpo de la petición no es un objeto válido.', 400);
    }

    const { email, password } = body as { email?: string; password?: string };

    if (!email || typeof email !== 'string' || !email.trim()) {
      return cmsError('VALIDATION_ERROR', 'El correo electrónico es obligatorio.', 422, {
        field: 'email',
      });
    }

    if (!password || typeof password !== 'string') {
      return cmsError('VALIDATION_ERROR', 'La contraseña es obligatoria.', 422, {
        field: 'password',
      });
    }

    // Autenticar con Supabase Auth y validar permisos
    const { session, permissions } = await signInCmsUser(email, password);

    // Guardar tokens en cookies HTTP-Only
    setAuthCookies(cookies, session.access_token, session.refresh_token);

    return cmsResponse(
      {
        user: {
          id: permissions.id,
          email: permissions.email,
          role: permissions.role,
          dbRole: permissions.dbRole,
          areaScope: permissions.areaScope,
          canPublish: permissions.canPublish,
        },
      },
      200
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error durante el inicio de sesión.';
    return cmsError('UNAUTHORIZED', message, 401);
  }
};
