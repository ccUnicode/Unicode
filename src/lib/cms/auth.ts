import type { AstroCookies } from 'astro';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, supabaseAdmin } from '../supabase';
import type {
  CmsAreaScope,
  CmsDbRole,
  CmsRole,
  CmsSessionUser,
  CmsUserPermissions,
} from '../../types/cms';

/** Nombres estandarizados de las cookies HTTP-Only de Supabase Auth */
export const CMS_AUTH_COOKIES = {
  ACCESS_TOKEN: 'sb-access-token',
  REFRESH_TOKEN: 'sb-refresh-token',
} as const;

/** Configuración de seguridad para cookies HTTP-Only de sesión */
export function getAuthCookieOptions() {
  const isProd = import.meta.env.PROD || process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días de persistencia
  };
}

/**
 * Traduce el rol físico de la base de datos (`cms_user_permissions.role`)
 * a la capa lógica de la aplicación (`CmsRole` y `canPublish`).
 */
export function mapDbRoleToAppRole(dbRole: CmsDbRole): { role: CmsRole; canPublish: boolean } {
  switch (dbRole) {
    case 'admin':
      return { role: 'admin', canPublish: true };
    case 'dcc':
      return { role: 'approver', canPublish: true };
    case 'director':
      return { role: 'approver', canPublish: true };
    case 'delegate':
      return { role: 'editor', canPublish: false };
    default:
      return { role: 'editor', canPublish: false };
  }
}

/**
 * Setea las cookies HTTP-Only de acceso y refresco de forma segura.
 */
export function setAuthCookies(
  cookies: AstroCookies,
  accessToken: string,
  refreshToken?: string
): void {
  const options = getAuthCookieOptions();
  cookies.set(CMS_AUTH_COOKIES.ACCESS_TOKEN, accessToken, options);
  if (refreshToken) {
    cookies.set(CMS_AUTH_COOKIES.REFRESH_TOKEN, refreshToken, options);
  }
}

/**
 * Elimina las cookies de autenticación de la sesión del usuario.
 */
export function clearAuthCookies(cookies: AstroCookies): void {
  const options = { path: '/' };
  cookies.delete(CMS_AUTH_COOKIES.ACCESS_TOKEN, options);
  cookies.delete(CMS_AUTH_COOKIES.REFRESH_TOKEN, options);
}

/**
 * Obtiene los permisos editoriales del usuario desde la tabla `cms_user_permissions`.
 * Utiliza `supabaseAdmin` para asegurar la consulta independientemente del contexto.
 */
export async function getCmsUserPermissions(userId: string): Promise<CmsUserPermissions | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('cms_user_permissions')
      .select('user_id, email, role, area_scope, is_active, created_at, updated_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    const { role, canPublish } = mapDbRoleToAppRole(data.role as CmsDbRole);

    return {
      id: data.user_id,
      email: data.email,
      role,
      dbRole: data.role as CmsDbRole,
      areaScope: data.area_scope as CmsAreaScope,
      canPublish,
      isActive: Boolean(data.is_active),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.error('[CMS Auth] Error al obtener permisos de usuario:', err);
    return null;
  }
}

/**
 * Autentica un usuario con email y contraseña mediante Supabase Auth.
 * Valida que exista y esté activo en `cms_user_permissions`.
 */
export async function signInCmsUser(
  email: string,
  password: string
): Promise<{
  session: Session;
  user: User;
  permissions: CmsUserPermissions;
}> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Autenticación con Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (authError || !authData.user || !authData.session) {
    throw new Error(authError?.message || 'Credenciales inválidas');
  }

  // 2. Consulta y validación de permisos en cms_user_permissions
  const permissions = await getCmsUserPermissions(authData.user.id);

  if (!permissions) {
    // Si no está registrado en cms_user_permissions, revocar sesión de inmediato
    await supabase.auth.signOut();
    throw new Error('No tienes permisos de acceso asignados al CMS.');
  }

  if (!permissions.isActive) {
    await supabase.auth.signOut();
    throw new Error('Tu cuenta se encuentra inactiva. Contacta con Presidencia o Administración.');
  }

  return {
    session: authData.session,
    user: authData.user,
    permissions,
  };
}

/**
 * Cierra la sesión en Supabase y limpia las cookies HTTP-Only.
 */
export async function signOutCmsUser(cookies: AstroCookies): Promise<void> {
  try {
    const accessToken = cookies.get(CMS_AUTH_COOKIES.ACCESS_TOKEN)?.value;
    if (accessToken) {
      await supabase.auth.signOut();
    }
  } catch (err) {
    console.warn('[CMS Auth] Advertencia al cerrar sesión en Supabase:', err);
  } finally {
    clearAuthCookies(cookies);
  }
}

/**
 * Verifica la sesión activa del usuario a partir de las cookies HTTP-Only de Astro.
 * Gestiona automáticamente la revalidación con el refresh token si el access token expiró.
 */
export async function verifyCmsSession(cookies: AstroCookies): Promise<CmsSessionUser | null> {
  const accessToken = cookies.get(CMS_AUTH_COOKIES.ACCESS_TOKEN)?.value;
  const refreshToken = cookies.get(CMS_AUTH_COOKIES.REFRESH_TOKEN)?.value;

  if (!accessToken && !refreshToken) {
    return null;
  }

  let user: User | null = null;

  // 1. Validar el token de acceso actual
  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data?.user) {
      user = data.user;
    }
  }

  // 2. Si el token expiró o falló pero hay refresh token, intentar refrescar
  if (!user && refreshToken) {
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (!refreshError && refreshData?.session && refreshData.user) {
        user = refreshData.user;
        setAuthCookies(
          cookies,
          refreshData.session.access_token,
          refreshData.session.refresh_token
        );
      }
    } catch {
      // Ignorar fallo de refresco, se procesará como sesión nula abajo
    }
  }

  if (!user) {
    clearAuthCookies(cookies);
    return null;
  }

  // 3. Cargar permisos asociados al usuario desde cms_user_permissions
  const permissions = await getCmsUserPermissions(user.id);
  if (!permissions || !permissions.isActive) {
    return null;
  }

  return {
    id: permissions.id,
    email: permissions.email,
    role: permissions.role,
    dbRole: permissions.dbRole,
    areaScope: permissions.areaScope,
    canPublish: permissions.canPublish,
  };
}
