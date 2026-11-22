/**
 * ==============================================================================
 * UNICODE CMS - Contratos de Tipos e Interfaces TypeScript (CMS-2)
 * ==============================================================================
 * Define los modelos de datos, DTOs, permisos RBAC y respuestas de API
 * para la arquitectura híbrida (SSR en Astro + Supabase BaaS).
 */

// ------------------------------------------------------------------------------
// 1. Estados Editoriales y Ciclo de Vida de Contenido
// ------------------------------------------------------------------------------

/**
 * Estados del flujo editorial obligatorio de 3 pasos:
 * - draft: Borrador en edición, visible solo por el creador y editores del área.
 * - pending_review: Enviado a revisión, visible para aprobadores y directores.
 * - published: Aprobado y visible en la web pública (ccunicode.org).
 * - archived: Retirado de la web pública pero conservado en el historial.
 */
export type CmsEditorialStatus = 'draft' | 'pending_review' | 'published' | 'archived';

/** Transiciones permitidas entre estados editoriales */
export const CMS_ALLOWED_STATUS_TRANSITIONS: Record<CmsEditorialStatus, readonly CmsEditorialStatus[]> = {
  draft: ['pending_review', 'archived'],
  pending_review: ['draft', 'published', 'archived'],
  published: ['archived', 'draft'],
  archived: ['draft', 'published'],
};

// ------------------------------------------------------------------------------
// 2. Roles, Permisos y Alcance por Área (RBAC Desacoplado)
// ------------------------------------------------------------------------------

/** Áreas oficiales de UNICODE */
export const CMS_AREA_IDS = ['ID', 'RRPP', 'GTH', 'ACD', 'DCC', 'LGE', 'FIN'] as const;
export type CmsAreaId = typeof CMS_AREA_IDS[number];

/** Alcance de permisos: áreas específicas o acceso global (ALL) */
export type CmsAreaScope = CmsAreaId | 'ALL';

/** Roles del sistema CMS */
export type CmsRole = 'admin' | 'approver' | 'editor';

/** Permisos del usuario CMS inyectados en la sesión */
export interface CmsUserPermissions {
  id: string;
  email: string;
  name?: string | null;
  role: CmsRole;
  areaScope: CmsAreaScope;
  canPublish: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Usuario autenticado disponible en Astro.locals */
export interface CmsSessionUser {
  id: string;
  email: string;
  role: CmsRole;
  areaScope: CmsAreaScope;
  canPublish: boolean;
}

// ------------------------------------------------------------------------------
// 3. Módulo de Eventos (cms_events)
// ------------------------------------------------------------------------------

export type CmsEventType = 'upcoming' | 'completed';

export interface CmsEventSpeaker {
  name: string;
  role?: string | null;
  company?: string | null;
  image?: string | null; // Storage path o URL externa
}

/** Entidad completa de evento en Supabase (`cms_events`) */
export interface CmsEvent {
  id: string; // UUID v4
  title: string;
  slug: string;
  topic?: string | null;
  description: string;
  shortDescription?: string | null;
  eventType: CmsEventType;
  status: CmsEditorialStatus;
  date: string; // ISO-8601 o fecha descriptiva
  time?: string | null; // Ej. "09:30 AM – 01:00 PM"
  location: string;
  category?: string | null;
  attendees?: number | null;
  speakers: CmsEventSpeaker[];
  image: string; // Banner principal (path en bucket `cms-media` o URL externa)
  backgroundImage?: string | null;
  registrationUrl?: string | null;
  externalLink?: string | null;
  highlights?: string[] | null;
  areaScope: CmsAreaScope;
  featuredInHome: boolean;
  homeOrder?: number | null;
  createdBy: string;
  approvedBy?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** DTO para la creación de un nuevo evento */
export interface CreateCmsEventInput {
  title: string;
  slug?: string;
  topic?: string;
  description: string;
  shortDescription?: string;
  eventType: CmsEventType;
  date: string;
  time?: string;
  location: string;
  category?: string;
  speakers?: CmsEventSpeaker[];
  image: string;
  backgroundImage?: string;
  registrationUrl?: string;
  externalLink?: string;
  highlights?: string[];
  areaScope: CmsAreaScope;
  featuredInHome?: boolean;
}

/** DTO para la actualización de un evento existente */
export interface UpdateCmsEventInput extends Partial<CreateCmsEventInput> {
  id: string;
}

/** DTO para cambio de estado editorial */
export interface TransitionCmsEventStatusInput {
  id: string;
  targetStatus: CmsEditorialStatus;
  reason?: string;
}

/** Parámetros de filtrado para consultas de eventos */
export interface CmsEventFilterParams {
  status?: CmsEditorialStatus;
  eventType?: CmsEventType;
  areaScope?: CmsAreaScope;
  featuredInHome?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'date' | 'createdAt' | 'homeOrder';
  orderDirection?: 'asc' | 'desc';
}

// ------------------------------------------------------------------------------
// 4. Módulo de Convocatoria Pública (Parámetros para /call en recruitment_config)
// ------------------------------------------------------------------------------

export interface CmsCallScheduleStage {
  id: string;
  title: string;
  description?: string;
  startDate: string; // ISO-8601 con zona horaria
  endDate: string; // ISO-8601 con zona horaria
  status: 'upcoming' | 'active' | 'completed';
  order: number;
}

export interface CmsCallAreaRequirement {
  areaId: CmsAreaId;
  name: string;
  description: string;
  requirements: string[];
  profiles: string[];
  quota?: number | null;
  enabled: boolean;
}

/** Configuración pública de Convocatoria visible en /call */
export interface CmsCallPublicSettings {
  enabled: boolean;
  title: string;
  subtitle?: string;
  heroDescription?: string;
  opensAt: string | null;
  closesAt: string | null;
  extensionAt: string | null;
  scheduleStages: CmsCallScheduleStage[];
  areaRequirements: CmsCallAreaRequirement[];
  registrationUrl?: string | null;
  bannerImageUrl?: string | null;
}

/** DTO para actualizar los parámetros públicos de convocatoria */
export interface UpdateCmsCallPublicSettingsInput {
  settings: Partial<CmsCallPublicSettings>;
  reason: string;
}

// ------------------------------------------------------------------------------
// 5. Auditoría y Trazabilidad (cms_audit_log / recruitment_config_events)
// ------------------------------------------------------------------------------

export type CmsAuditAction =
  | 'create'
  | 'update'
  | 'transition_status'
  | 'publish'
  | 'archive'
  | 'delete';

export interface CmsAuditLogEntry {
  id: string;
  entityType: 'event' | 'call_config' | 'user_permission';
  entityId: string;
  action: CmsAuditAction;
  actorId: string;
  actorEmail: string;
  beforeValue?: Record<string, unknown> | null;
  afterValue?: Record<string, unknown> | null;
  reason?: string | null;
  createdAt: string;
}

// ------------------------------------------------------------------------------
// 6. Respuestas de API y Cabeceras de Rendimiento SWR
// ------------------------------------------------------------------------------

export interface CmsApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    total?: number;
    limit?: number;
    offset?: number;
  };
}

/** Cabeceras de caché estandarizadas según la estrategia SWR acordada */
export const CMS_CACHE_HEADERS = {
  /**
   * Rutas públicas dinámicas alimentadas por el CMS (/events, /call):
   * Caché en CDN por 60 segundos con stale-while-revalidate por 10 minutos.
   * Garantiza LCP < 2.5s y sincronización inmediata tras publicaciones.
   */
  PUBLIC_DYNAMIC: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
  },
  /**
   * Rutas del panel administrativo (/admin/*) y endpoints de mutación:
   * Bloqueo estricto de caché para garantizar datos frescos y seguridad.
   */
  ADMIN_PRIVATE: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
  },
} as const;
