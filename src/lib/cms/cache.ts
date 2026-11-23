import { CMS_CACHE_HEADERS } from '../../types/cms';

/**
 * Etiquetas de caché para invalidación bajo demanda en CDN (Vercel / Cloudflare).
 */
export const CMS_CACHE_TAGS = {
  EVENTS: 'cms:events',
  CALL_CONFIG: 'cms:call-config',
  HOME_NEWS: 'cms:home-news',
  ALL: 'cms:all',
} as const;

export type CmsCacheTag = typeof CMS_CACHE_TAGS[keyof typeof CMS_CACHE_TAGS];

/**
 * Aplica las cabeceras de caché dinámica SWR a un objeto Headers o Response.
 * Utilizado en vistas públicas de Astro (`/events`, `/call`).
 */
export function applyPublicDynamicCache(
  target: Headers | Response,
  tags: CmsCacheTag[] = []
): void {
  const headers = target instanceof Response ? target.headers : target;

  headers.set('Cache-Control', CMS_CACHE_HEADERS.PUBLIC_DYNAMIC['Cache-Control']);

  if (tags.length > 0) {
    // Compatible con Vercel Edge Cache y Cloudflare Cache-Tag
    headers.set('Cache-Tag', tags.join(', '));
  }
}

/**
 * Aplica cabeceras de no-caché estricto a un objeto Headers o Response.
 * Utilizado en el panel administrativo (`/admin/*`) y endpoints de mutación (`/api/cms/*`).
 */
export function applyAdminPrivateCache(target: Headers | Response): void {
  const headers = target instanceof Response ? target.headers : target;

  headers.set('Cache-Control', CMS_CACHE_HEADERS.ADMIN_PRIVATE['Cache-Control']);
  headers.set('Pragma', CMS_CACHE_HEADERS.ADMIN_PRIVATE.Pragma);
  headers.set('Expires', CMS_CACHE_HEADERS.ADMIN_PRIVATE.Expires);
}
