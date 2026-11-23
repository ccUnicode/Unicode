import { defineMiddleware } from 'astro:middleware';
import { verifyCmsSession } from './lib/cms/auth';
import { cmsError } from './lib/cms/client';

/**
 * Middleware central de Astro para el CMS de UNICODE.
 * Responsabilidades:
 * 1. Inspeccionar cookies de sesión HTTP-Only en cada petición entrante.
 * 2. Cargar la identidad del usuario y sus permisos editoriales desde `cms_user_permissions`.
 * 3. Inyectar `CmsSessionUser` en `context.locals.user`.
 * 4. Proteger endpoints de la API administrativa (`/api/cms/*`).
 * 5. Proteger vistas administrativas (`/admin/events`, `/admin/call`, etc.), permitiendo login público.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // 1. Resolver la sesión del usuario si existen cookies HTTP-Only de Supabase
  const sessionUser = await verifyCmsSession(context.cookies);
  context.locals.user = sessionUser;

  // 2. Control de acceso para la API del CMS (/api/cms/*)
  if (pathname.startsWith('/api/cms')) {
    // Rutas públicas de autenticación dentro de /api/cms/auth/
    const isPublicAuthRoute =
      pathname === '/api/cms/auth/login' ||
      pathname === '/api/cms/auth/logout';

    if (!isPublicAuthRoute && !sessionUser) {
      return cmsError(
        'UNAUTHORIZED',
        'No autorizado. Se requiere una sesión activa con permisos en el CMS.',
        401
      );
    }
  }

  // 3. Control de acceso para vistas administrativas del CMS (/admin/*)
  if (pathname.startsWith('/admin')) {
    const isLoginPage = pathname === '/admin/login';

    // Redirigir al panel si ya está autenticado e intenta acceder al formulario de login
    if (isLoginPage && sessionUser) {
      return context.redirect('/admin');
    }

    // Proteger subrutas administrativas del CMS (ej. /admin/events, /admin/call, /admin/dashboard)
    const isProtectedCmsView =
      pathname.startsWith('/admin/events') ||
      pathname.startsWith('/admin/call') ||
      pathname.startsWith('/admin/dashboard') ||
      pathname.startsWith('/admin/cms');

    if (isProtectedCmsView && !sessionUser) {
      const redirectUrl = `/admin/login?redirect=${encodeURIComponent(pathname)}`;
      return context.redirect(redirectUrl);
    }
  }

  const response = await next();

  // 4. Cabeceras estrictas de prevención de caché para endpoints y vistas administrativas
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/cms')) {
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    );
    response.headers.set('Pragma', 'no-cache');
  }

  return response;
});
