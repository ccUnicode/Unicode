/**
 * Contratos de tipos estrictos para el módulo CMS Unicode (`cms_*`).
 * Alineado con `supabase/migrations/20261122_cms_core.sql`.
 */

export const CMS_CONTENT_STATUSES = [
  'draft',
  'pending_review',
  'published',
  'archived',
] as const;

export type CmsContentStatus = (typeof CMS_CONTENT_STATUSES)[number];

export const CMS_ROLES = ['admin', 'dcc', 'director', 'delegate'] as const;

export type CmsRole = (typeof CMS_ROLES)[number];

export const CMS_AREA_SCOPES = [
  'ALL',
  'ID',
  'ACD',
  'GTH',
  'RRPP',
  'DCC',
  'LGE',
  'FIN',
] as const;

export type CmsAreaScope = (typeof CMS_AREA_SCOPES)[number];

export const CMS_EVENT_CATEGORIES = [
  'Hackathon',
  'Workshop',
  'Charla',
  'Competencia',
  'Panel',
  'Integración',
  'Social',
  'Clase',
  'Summit',
] as const;

export type CmsEventCategory = (typeof CMS_EVENT_CATEGORIES)[number];

export const CMS_AUDIT_ACTIONS = [
  'create',
  'update',
  'submit_review',
  'approve_publish',
  'reject_to_draft',
  'archive',
  'restore',
] as const;

export type CmsAuditAction = (typeof CMS_AUDIT_ACTIONS)[number];

export interface CmsActor {
  userId: string;
  email: string;
  role: CmsRole;
  area_scope: CmsAreaScope;
  is_active: boolean;
}

export interface CmsEventRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string;
  event_date: string;
  end_date: string | null;
  display_date: string | null;
  time_range: string | null;
  location: string;
  category: CmsEventCategory;
  area_scope: CmsAreaScope;
  speaker: string | null;
  speaker_image_url: string | null;
  thumbnail_url: string;
  background_image_url: string | null;
  external_url: string | null;
  attendees_count: number;
  highlights: string[];
  is_featured: boolean;
  status: CmsContentStatus;
  created_by: string | null;
  reviewed_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmsEventCreateInput {
  slug: string;
  title: string;
  summary: string | null;
  description: string;
  event_date: string;
  end_date: string | null;
  display_date: string | null;
  time_range: string | null;
  location: string;
  category: CmsEventCategory;
  area_scope: CmsAreaScope;
  speaker: string | null;
  speaker_image_url: string | null;
  thumbnail_url: string;
  background_image_url: string | null;
  external_url: string | null;
  attendees_count: number;
  highlights: string[];
  is_featured: boolean;
  status: CmsContentStatus;
}

export interface CmsEventUpdateInput {
  slug?: string;
  title?: string;
  summary?: string | null;
  description?: string;
  event_date?: string;
  end_date?: string | null;
  display_date?: string | null;
  time_range?: string | null;
  location?: string;
  category?: CmsEventCategory;
  area_scope?: CmsAreaScope;
  speaker?: string | null;
  speaker_image_url?: string | null;
  thumbnail_url?: string;
  background_image_url?: string | null;
  external_url?: string | null;
  attendees_count?: number;
  highlights?: string[];
  is_featured?: boolean;
}

export interface CmsEventFilters {
  status?: CmsContentStatus;
  category?: CmsEventCategory;
  area_scope?: CmsAreaScope;
  is_featured?: boolean;
  search?: string;
  page: number;
  pageSize: number;
}

export interface CmsEventStatusTransitionInput {
  status: CmsContentStatus;
  review_comment?: string;
}

export interface CmsPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CmsPaginatedResult<T> {
  data: T[];
  pagination: CmsPaginationMeta;
}

export interface CmsAuditLogInsert {
  entity_type: string;
  entity_id: string;
  action: CmsAuditAction;
  from_status: CmsContentStatus | null;
  to_status: CmsContentStatus | null;
  actor_id: string | null;
  actor_email: string;
  area_scope: CmsAreaScope | null;
  metadata: Record<string, unknown>;
}

export interface CmsAuditLogRow extends CmsAuditLogInsert {
  id: string;
  created_at: string;
}
