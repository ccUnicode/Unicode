/**
 * Capa de servicios CRUD, filtrado por área/estado, control de flujo editorial dual
 * con precondición de estado (anti-TOCTOU) y mutaciones atómicas vía RPC con auditoría
 * en `cms_audit_logs` para `cms_events`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CmsActor,
  CmsAreaScope,
  CmsAuditAction,
  CmsContentStatus,
  CmsEventCreateInput,
  CmsEventFilters,
  CmsEventRow,
  CmsEventUpdateInput,
  CmsPaginatedResult,
} from '../../types/cms';
import { getCmsServiceClient } from './client';
import { CmsError } from './errors';
import {
  resolveEditorialTransition,
  validateCreateEventInput,
  validateEventFilters,
  validateStatusTransitionInput,
  validateUpdateEventInput,
  validateUuid,
} from './events-validation';

export interface CmsEventDbCreatePayload extends CmsEventCreateInput {
  created_by: string;
  reviewed_by: string | null;
  published_at: string | null;
}

export interface CmsEventAuditContext {
  actorId: string;
  actorEmail: string;
  actorRole: CmsActor['role'];
  reviewComment?: string;
}

export interface CmsEventsRepository {
  list(filters: CmsEventFilters): Promise<{ rows: CmsEventRow[]; total: number }>;
  getById(id: string): Promise<CmsEventRow | null>;
  create(payload: CmsEventDbCreatePayload, audit: CmsEventAuditContext): Promise<CmsEventRow>;
  update(
    id: string,
    expectedStatus: CmsContentStatus,
    patch: CmsEventUpdateInput,
    audit: CmsEventAuditContext,
  ): Promise<CmsEventRow>;
  transitionStatus(
    id: string,
    expectedStatus: CmsContentStatus,
    nextStatus: CmsContentStatus,
    action: CmsAuditAction,
    audit: CmsEventAuditContext,
  ): Promise<CmsEventRow>;
  delete(id: string, audit: CmsEventAuditContext): Promise<{ deleted: true; id: string }>;
}

const EVENT_COLUMNS = [
  'id',
  'slug',
  'title',
  'summary',
  'description',
  'event_date',
  'end_date',
  'display_date',
  'time_range',
  'location',
  'category',
  'area_scope',
  'speaker',
  'speaker_image_url',
  'thumbnail_url',
  'background_image_url',
  'external_url',
  'attendees_count',
  'highlights',
  'is_featured',
  'status',
  'created_by',
  'reviewed_by',
  'published_at',
  'created_at',
  'updated_at',
].join(', ');

function buildEventsSearchOrFilter(term: string): string {
  const search = term.trim();
  if (!search) return '';

  // PostgREST traduce todos los asteriscos en ILIKE, incluso si están escapados.
  // Para esos términos, IMATCH busca una subcadena literal con los metacaracteres escapados.
  const useRegex = search.includes('*');
  const sqlPattern = useRegex
    ? search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    : `%${search.replace(/[\\_%]/g, '\\$&')}%`;
  const pattern = `"${sqlPattern.replace(/[\\"]/g, '\\$&')}"`;
  const operator = useRegex ? 'imatch' : 'ilike';
  return `title.${operator}.${pattern},slug.${operator}.${pattern},speaker.${operator}.${pattern}`;
}

function mapDbWriteError(error: { code?: string; message?: string }, fallbackMessage: string): CmsError {
  const message = error.message || '';
  if (message.startsWith('not_found:')) {
    return new CmsError('not_found', message.slice('not_found:'.length).trim() || 'Evento no encontrado.', 404);
  }
  if (message.startsWith('status_conflict:')) {
    return new CmsError(
      'status_conflict',
      message.slice('status_conflict:'.length).trim() || 'El estado del evento cambió concurrentemente.',
      409,
    );
  }
  if (error.code === '23505' || /duplicate key/i.test(message)) {
    return new CmsError(
      'duplicate_slug',
      'Ya existe un evento registrado con ese slug. Elige un slug diferente.',
      409,
      { slug: 'El slug ya está en uso.' },
    );
  }
  if (error.code === '23514' || error.code === '22P02') {
    return new CmsError(
      'validation_error',
      'Los datos enviados incumplen una restricción de integridad de la base de datos.',
      400,
    );
  }
  return new CmsError('database_error', fallbackMessage, 500);
}

export function createSupabaseCmsEventsRepository(
  clientOverride?: SupabaseClient,
): CmsEventsRepository {
  const resolveClient = () => clientOverride ?? getCmsServiceClient();

  return {
    async list(filters) {
      const client = resolveClient();
      const from = (filters.page - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;

      let query = client
        .from('cms_events')
        .select(EVENT_COLUMNS, { count: 'exact' })
        .order('event_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.area_scope) query = query.eq('area_scope', filters.area_scope);
      if (filters.is_featured !== undefined) query = query.eq('is_featured', filters.is_featured);
      if (filters.search) {
        const orFilter = buildEventsSearchOrFilter(filters.search);
        if (orFilter) {
          query = query.or(orFilter);
        }
      }

      const { data, count, error } = await query;
      if (error) {
        throw new CmsError('database_error', 'No se pudo consultar el listado de eventos.', 500);
      }

      return {
        rows: (data ?? []) as unknown as CmsEventRow[],
        total: count ?? 0,
      };
    },

    async getById(id) {
      const client = resolveClient();
      const { data, error } = await client
        .from('cms_events')
        .select(EVENT_COLUMNS)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw new CmsError('database_error', 'No se pudo obtener el detalle del evento.', 500);
      }
      return (data as unknown as CmsEventRow | null) ?? null;
    },

    async create(payload, audit) {
      const client = resolveClient();
      const { data, error } = await client.rpc('cms_event_create', {
        p_payload: payload,
        p_actor_id: audit.actorId,
        p_actor_email: audit.actorEmail,
        p_actor_role: audit.actorRole,
      });

      if (error || !data) {
        throw mapDbWriteError(error ?? {}, 'No se pudo crear el evento en la base de datos.');
      }
      return data as CmsEventRow;
    },

    async update(id, expectedStatus, patch, audit) {
      const client = resolveClient();
      const { data, error } = await client.rpc('cms_event_update', {
        p_id: id,
        p_expected_status: expectedStatus,
        p_patch: patch,
        p_actor_id: audit.actorId,
        p_actor_email: audit.actorEmail,
        p_changed_fields: Object.keys(patch),
      });

      if (error || !data) {
        throw mapDbWriteError(error ?? {}, 'No se pudo actualizar el evento en la base de datos.');
      }
      return data as CmsEventRow;
    },

    async transitionStatus(id, expectedStatus, nextStatus, action, audit) {
      const client = resolveClient();
      const { data, error } = await client.rpc('cms_event_transition_status', {
        p_id: id,
        p_expected_status: expectedStatus,
        p_next_status: nextStatus,
        p_action: action,
        p_actor_id: audit.actorId,
        p_actor_email: audit.actorEmail,
        p_actor_role: audit.actorRole,
        p_review_comment: audit.reviewComment ?? null,
      });

      if (error || !data) {
        throw mapDbWriteError(error ?? {}, 'No se pudo cambiar el estado del evento.');
      }
      return data as CmsEventRow;
    },

    async delete(id, audit) {
      const client = resolveClient();
      const { data, error } = await client.rpc('cms_event_delete', {
        p_id: id,
        p_actor_id: audit.actorId,
        p_actor_email: audit.actorEmail,
      });

      if (error || !data) {
        throw mapDbWriteError(error ?? {}, 'No se pudo eliminar el evento.');
      }
      return data as { deleted: true; id: string };
    },
  };
}

function assertActorActive(actor: CmsActor): void {
  if (!actor.is_active) {
    throw new CmsError('forbidden', 'Tu cuenta no tiene acceso activo al CMS.', 403);
  }
}

function assertCanAccessArea(actor: CmsActor, targetArea: CmsAreaScope): void {
  assertActorActive(actor);
  if (actor.area_scope === 'ALL') return;
  if (targetArea !== actor.area_scope) {
    throw new CmsError(
      'forbidden',
      `Tu cuenta (${actor.area_scope}) no tiene permisos sobre eventos del área ${targetArea}.`,
      403,
    );
  }
}

function assertDelegateCanEditEvent(actor: CmsActor, event: Pick<CmsEventRow, 'status'>): void {
  if (
    actor.role === 'delegate' &&
    event.status !== 'draft' &&
    event.status !== 'pending_review'
  ) {
    throw new CmsError(
      'forbidden',
      'Un delegado no puede editar un evento que ya está publicado o archivado.',
      403,
    );
  }
}

export async function listCmsEvents(
  actor: CmsActor,
  rawFilters: CmsEventFilters | URLSearchParams | Record<string, unknown> = { page: 1, pageSize: 20 },
  repository: CmsEventsRepository = createSupabaseCmsEventsRepository(),
): Promise<CmsPaginatedResult<CmsEventRow>> {
  assertActorActive(actor);
  const filters =
    rawFilters instanceof URLSearchParams ||
    !('page' in rawFilters && 'pageSize' in rawFilters)
      ? validateEventFilters(rawFilters)
      : validateEventFilters({ ...rawFilters });

  if (actor.area_scope !== 'ALL') {
    if (filters.area_scope && filters.area_scope !== actor.area_scope) {
      throw new CmsError(
        'forbidden',
        `Solo puedes consultar eventos de tu área (${actor.area_scope}).`,
        403,
      );
    }
    filters.area_scope = actor.area_scope;
  }

  const { rows, total } = await repository.list(filters);
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);

  return {
    data: rows,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages,
    },
  };
}

export async function getCmsEventById(
  actor: CmsActor,
  id: string,
  repository: CmsEventsRepository = createSupabaseCmsEventsRepository(),
): Promise<CmsEventRow> {
  assertActorActive(actor);
  const eventId = validateUuid(id);
  const event = await repository.getById(eventId);
  if (!event) {
    throw new CmsError('not_found', 'No se encontró el evento solicitado.', 404);
  }
  assertCanAccessArea(actor, event.area_scope);
  return event;
}

export async function createCmsEvent(
  actor: CmsActor,
  input: unknown,
  repository: CmsEventsRepository = createSupabaseCmsEventsRepository(),
): Promise<CmsEventRow> {
  assertActorActive(actor);
  const validated = validateCreateEventInput(input);
  assertCanAccessArea(actor, validated.area_scope);

  if (
    actor.role === 'delegate' &&
    validated.status !== 'draft' &&
    validated.status !== 'pending_review'
  ) {
    throw new CmsError(
      'forbidden',
      'Un delegado solo puede crear eventos en estado draft o pending_review.',
      403,
    );
  }

  const isDirectPublish = validated.status === 'published';
  return await repository.create(
    {
      ...validated,
      created_by: actor.userId,
      reviewed_by: isDirectPublish ? actor.userId : null,
      published_at: isDirectPublish ? new Date().toISOString() : null,
    },
    {
      actorId: actor.userId,
      actorEmail: actor.email,
      actorRole: actor.role,
    },
  );
}

export async function updateCmsEvent(
  actor: CmsActor,
  id: string,
  input: unknown,
  repository: CmsEventsRepository = createSupabaseCmsEventsRepository(),
): Promise<CmsEventRow> {
  const existing = await getCmsEventById(actor, id, repository);
  assertDelegateCanEditEvent(actor, existing);

  const patch = validateUpdateEventInput(input, existing);
  if (patch.area_scope !== undefined) {
    assertCanAccessArea(actor, patch.area_scope);
  }

  try {
    return await repository.update(existing.id, existing.status, patch, {
      actorId: actor.userId,
      actorEmail: actor.email,
      actorRole: actor.role,
    });
  } catch (error) {
    if (error instanceof CmsError && error.code === 'status_conflict') {
      const latest = await repository.getById(existing.id);
      if (!latest) {
        throw new CmsError('not_found', 'No se encontró el evento a actualizar.', 404);
      }
      assertCanAccessArea(actor, latest.area_scope);
      assertDelegateCanEditEvent(actor, latest);
      throw new CmsError(
        'status_conflict',
        'El estado del evento cambió mientras intentabas actualizarlo. Recarga e intenta nuevamente.',
        409,
      );
    }
    throw error;
  }
}

export async function transitionCmsEventStatus(
  actor: CmsActor,
  id: string,
  nextStatus: CmsContentStatus | unknown,
  comment?: string,
  repository: CmsEventsRepository = createSupabaseCmsEventsRepository(),
): Promise<CmsEventRow> {
  const existing = await getCmsEventById(actor, id, repository);
  const { status, review_comment } = validateStatusTransitionInput({
    status: nextStatus,
    ...(comment !== undefined ? { review_comment: comment } : {}),
  });

  const action = resolveEditorialTransition(actor, existing.status, status);

  try {
    return await repository.transitionStatus(
      existing.id,
      existing.status,
      status,
      action,
      {
        actorId: actor.userId,
        actorEmail: actor.email,
        actorRole: actor.role,
        reviewComment: review_comment,
      },
    );
  } catch (error) {
    if (error instanceof CmsError && error.code === 'status_conflict') {
      const latest = await repository.getById(existing.id);
      if (!latest) {
        throw new CmsError('not_found', 'No se encontró el evento para cambiar de estado.', 404);
      }
      assertCanAccessArea(actor, latest.area_scope);
      resolveEditorialTransition(actor, latest.status, status);
      throw new CmsError(
        'status_conflict',
        'El estado del evento cambió mientras realizabas la transición. Recarga e intenta nuevamente.',
        409,
      );
    }
    throw error;
  }
}

export async function deleteCmsEvent(
  actor: CmsActor,
  id: string,
  repository: CmsEventsRepository = createSupabaseCmsEventsRepository(),
): Promise<{ deleted: true; id: string }> {
  assertActorActive(actor);
  if (actor.role !== 'admin' || actor.area_scope !== 'ALL') {
    throw new CmsError(
      'forbidden',
      'Solo un administrador global (admin) puede eliminar eventos definitivamente.',
      403,
    );
  }

  const existing = await getCmsEventById(actor, id, repository);
  return await repository.delete(existing.id, {
    actorId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.role,
  });
}
