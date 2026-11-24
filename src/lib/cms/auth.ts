/**
 * Resolución del actor autenticado y su perfil de permisos en `cms_user_permissions`.
 * Reutiliza `locals.cmsActor` si un middleware previo ya resolvió la sesión.
 */
import {
  CMS_AREA_SCOPES,
  CMS_ROLES,
  type CmsActor,
  type CmsAreaScope,
  type CmsRole,
} from '../../types/cms';
import { getCmsAnonClient, getCmsServiceClient } from './client';
import { CmsError } from './errors';

interface PermissionRow {
  user_id: string;
  email: string;
  role: string;
  area_scope: string;
  is_active: boolean;
}

function isCmsRole(value: unknown): value is CmsRole {
  return typeof value === 'string' && (CMS_ROLES as readonly string[]).includes(value);
}

function isCmsAreaScope(value: unknown): value is CmsAreaScope {
  return typeof value === 'string' && (CMS_AREA_SCOPES as readonly string[]).includes(value);
}

function isCmsActor(value: unknown): value is CmsActor {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.email === 'string' &&
    isCmsRole(candidate.role) &&
    isCmsAreaScope(candidate.area_scope) &&
    typeof candidate.is_active === 'boolean'
  );
}

function readCookie(cookieHeader: string, cookieName: string): string | null {
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (key !== cookieName) continue;
    const rawValue = trimmed.slice(separator + 1).trim();
    if (!rawValue) return null;
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }
  return null;
}

export function extractBearerOrCookieToken(request: Request): string | null {
  const authorization = request.headers.get('authorization') || '';
  if (/^Bearer\s+\S+$/i.test(authorization)) {
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (token.length >= 20) return token;
  }

  const cookieHeader = request.headers.get('cookie') || '';
  if (!cookieHeader) return null;

  for (const cookieName of ['cms-access-token', 'sb-access-token']) {
    const value = readCookie(cookieHeader, cookieName);
    if (value && value.length >= 20) return value;
  }

  return null;
}

export async function resolveCmsActor(
  request: Request,
  locals?: Record<string, unknown>,
): Promise<CmsActor> {
  if (locals && 'cmsActor' in locals && locals.cmsActor !== undefined) {
    if (!isCmsActor(locals.cmsActor)) {
      throw new CmsError('unauthorized', 'Contexto de sesión CMS inválido.', 401);
    }
    if (!locals.cmsActor.is_active) {
      throw new CmsError(
        'forbidden',
        'Tu cuenta se encuentra desactivada en el CMS.',
        403,
      );
    }
    return locals.cmsActor;
  }

  const token = extractBearerOrCookieToken(request);
  if (!token) {
    throw new CmsError(
      'unauthorized',
      'No autorizado. Inicia sesión en el CMS para continuar.',
      401,
    );
  }

  const anonClient = getCmsAnonClient();
  const { data: userData, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !userData.user) {
    throw new CmsError(
      'unauthorized',
      'Sesión inválida o expirada. Inicia sesión nuevamente.',
      401,
    );
  }

  const serviceClient = getCmsServiceClient();
  const { data: perm, error: permError } = await serviceClient
    .from('cms_user_permissions')
    .select('user_id, email, role, area_scope, is_active')
    .eq('user_id', userData.user.id)
    .maybeSingle<PermissionRow>();

  if (permError) {
    throw new CmsError(
      'database_error',
      'No se pudieron verificar los permisos del usuario en el CMS.',
      500,
    );
  }

  if (!perm || !perm.is_active || !isCmsRole(perm.role) || !isCmsAreaScope(perm.area_scope)) {
    throw new CmsError(
      'forbidden',
      'Tu cuenta no tiene permisos activos asignados en el CMS.',
      403,
    );
  }

  return {
    userId: perm.user_id,
    email: perm.email,
    role: perm.role,
    area_scope: perm.area_scope,
    is_active: perm.is_active,
  };
}
