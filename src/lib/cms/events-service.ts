/**
 * Capa de servicios CRUD, filtrado por área/estado, control de flujo editorial dual
 * y auditoría automática en `cms_audit_logs` para `cms_events`.
 */
import type {
  CmsActor,
  CmsAreaScope,
  CmsAuditLogInsert,
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

export interface CmsEventDbUpdatePayload extends CmsEventUpdateInput {
  status?: CmsContentStatus;
  reviewed_by?: string | null;
  published_at?: string | null;
}

export interface CmsEventsRepository {
  list(filters: CmsEventFilters): Promise<{ rows: CmsEventRow[]; total: number }>;
  getById(id: string): Promise<CmsEventRow | null>;
  create(payload: CmsEventDbCreatePayload): Promise<CmsEventRow>;
  update(id: string, payload: CmsEventDbUpdatePayload): Promise<CmsEventRow | null>;
  delete(id: string): Promise<boolean>;
  insertAuditLog(entry: CmsAuditLogInsert): Promise<void>;
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

function escapePostgrestIlikeTerm(term: string): string {
  return term.replace(/[,%()*\\]/g, (char) => (char === '\\' ? '\\\\' : '')).trim();
}

function mapDbWriteError(error: { code?: string; message?: string }, fallbackMessage: string): CmsError {
  if (error.code === '23505') {
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

export function createSupabaseCmsEventsRepository(): CmsEventsRepository {
  return {
    async list(filters) {
      const client = getCmsServiceClient();
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
        const cleanSearch = escapePostgrestIlikeTerm(filters.search);
        if (cleanSearch) {
          query = query.or(
            `title.ilike.%${cleanSearch}%,slug.ilike.%${cleanSearch}%,speaker.ilike.%${cleanSearch}%`,
          );
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
      const client = getCmsServiceClient();
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

    async create(payload) {
      const client = getCmsServiceClient();
      const { data, error } = await client
        .from('cms_events')
        .insert(payload)
        .select(EVENT_COLUMNS)
        .single();

      if (error || !data) {
        throw mapDbWriteError(error ?? {}, 'No se pudo crear el evento en la base de datos.');
      }
      return data as unknown as CmsEventRow;
    },

    async update(id, payload) {
      const client = getCmsServiceClient();
      const { data, error } = await client
        .from('cms_events')
        .update(payload)
        .eq('id', id)
        .select(EVENT_COLUMNS)
        .maybeSingle();

      if (error) {
        throw mapDbWriteError(error, 'No se pudo actualizar el evento en la base de datos.');
      }
      return (data as unknown as CmsEventRow | null) ?? null;
    },

    async delete(id) {
      const client = getCmsServiceClient();
      const { data, error } = await client
        .from('cms_events')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle();

      if (error) {
        throw new CmsError('database_error', 'No se pudo eliminar el evento.', 500);
      }
      return Boolean(data);
    },

    async insertAuditLog(entry) {
      const client = getCmsServiceClient();
      const { error } = await client.from('cms_audit_logs').insert(entry);
      if (error) {
        throw new CmsError(
          'audit_error',
          'No se pudo registrar la auditoría de la operación en cms_audit_logs.',
          500,
        );
      }
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
  const created = await repository.create({
    ...validated,
    created_by: actor.userId,
    reviewed_by: isDirectPublish ? actor.userId : null,
    published_at: isDirectPublish ? new Date().toISOString() : null,
  });

  await repository.insertAuditLog({
    entity_type: 'cms_events',
    entity_id: created.id,
    action: 'create',
    from_status: null,
    to_status: created.status,
    actor_id: actor.userId,
    actor_email: actor.email,
    area_scope: created.area_scope,
    metadata: {
      slug: created.slug,
      title: created.title,
      role: actor.role,
    },
  });

  return created;
}

export async function updateCmsEvent(
  actor: CmsActor,
  id: string,
  input: unknown,
  repository: CmsEventsRepository = createSupabaseCmsEventsRepository(),
): Promise<CmsEventRow> {
  const existing = await getCmsEventById(actor, id, repository);

  if (
    actor.role === 'delegate' &&
    existing.status !== 'draft' &&
    existing.status !== 'pending_review'
  ) {
    throw new CmsError(
      'forbidden',
      'Un delegado no puede editar un evento que ya está publicado o archivado.',
      403,
    );
  }

  const patch = validateUpdateEventInput(input, existing);
  if (patch.area_scope !== undefined) {
    assertCanAccessArea(actor, patch.area_scope);
  }

  const updated = await repository.update(existing.id, patch);
  if (!updated) {
    throw new CmsError('not_found', 'No se encontró el evento a actualizar.', 404);
  }

  await repository.insertAuditLog({
    entity_type: 'cms_events',
    entity_id: updated.id,
    action: 'update',
    from_status: existing.status,
    to_status: updated.status,
    actor_id: actor.userId,
    actor_email: actor.email,
    area_scope: updated.area_scope,
    metadata: {
      slug: updated.slug,
      title: updated.title,
      changed_fields: Object.keys(patch),
    },
  });

  return updated;
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

  const patch: CmsEventDbUpdatePayload = { status };
  if (status === 'published') {
    patch.reviewed_by = actor.userId;
    if (!existing.published_at) {
      patch.published_at = new Date().toISOString();
    }
  } else if (existing.status === 'pending_review' && status === 'draft') {
    patch.reviewed_by = actor.userId;
  }

  const updated = await repository.update(existing.id, patch);
  if (!updated) {
    throw new CmsError('not_found', 'No se encontró el evento para cambiar de estado.', 404);
  }

  await repository.insertAuditLog({
    entity_type: 'cms_events',
    entity_id: updated.id,
    action,
    from_status: existing.status,
    to_status: updated.status,
    actor_id: actor.userId,
    actor_email: actor.email,
    area_scope: updated.area_scope,
    metadata: {
      slug: updated.slug,
      title: updated.title,
      role: actor.role,
      ...(review_comment ? { review_comment } : {}),
    },
  });

  return updated;
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
  const deleted = await repository.delete(existing.id);
  if (!deleted) {
    throw new CmsError('not_found', 'El evento ya fue eliminado o no existe.', 404);
  }

  await repository.insertAuditLog({
    entity_type: 'cms_events',
    entity_id: existing.id,
    action: 'archive',
    from_status: existing.status,
    to_status: null,
    actor_id: actor.userId,
    actor_email: actor.email,
    area_scope: existing.area_scope,
    metadata: {
      slug: existing.slug,
      title: existing.title,
      operation: 'hard_delete',
    },
  });

  return { deleted: true, id: existing.id };
}
