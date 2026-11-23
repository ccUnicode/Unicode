import type { APIRoute } from 'astro';
import { verifyCmsSession } from '../../../../lib/cms/auth';
import { cmsError, cmsResponse } from '../../../../lib/cms/client';

export const prerender = false;

export const GET: APIRoute = async ({ locals, cookies }) => {
  // 1. Usar el usuario inyectado por middleware si está disponible
  let user = locals.user;

  // 2. Si no fue evaluado previamente, verificar directamente las cookies
  if (!user) {
    user = await verifyCmsSession(cookies);
  }

  if (!user) {
    return cmsError('UNAUTHORIZED', 'No hay ninguna sesión activa en el CMS.', 401);
  }

  return cmsResponse({ user }, 200);
};
