import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
});
after(() => server.close());

const validation = await server.ssrLoadModule('/src/lib/cms/events-validation.ts');
const service = await server.ssrLoadModule('/src/lib/cms/events-service.ts');
const { CmsError } = await server.ssrLoadModule('/src/lib/cms/errors.ts');
const indexRoute = await server.ssrLoadModule('/src/pages/api/cms/events/index.ts');
const detailRoute = await server.ssrLoadModule('/src/pages/api/cms/events/[id].ts');
const statusRoute = await server.ssrLoadModule('/src/pages/api/cms/events/[id]/status.ts');

const cmsMigrationSql = await readFile(
  new URL('../supabase/migrations/20261122_cms_core.sql', import.meta.url),
  'utf8',
);

const ACTORS = {
  admin: {
    userId: '10000000-0000-4000-8000-000000000001',
    email: 'admin@ccunicode.org',
    role: 'admin',
    area_scope: 'ALL',
    is_active: true,
  },
  dcc: {
    userId: '10000000-0000-4000-8000-000000000002',
    email: 'dcc@ccunicode.org',
    role: 'dcc',
    area_scope: 'ALL',
    is_active: true,
  },
  directorId: {
    userId: '10000000-0000-4000-8000-000000000003',
    email: 'director.id@ccunicode.org',
    role: 'director',
    area_scope: 'ID',
    is_active: true,
  },
  delegateId: {
    userId: '10000000-0000-4000-8000-000000000004',
    email: 'delegado.id@ccunicode.org',
    role: 'delegate',
    area_scope: 'ID',
    is_active: true,
  },
  plainUser: {
    userId: '10000000-0000-4000-8000-000000000099',
    email: 'sin.permisos@ccunicode.org',
  },
};

function normalizePgRow(row) {
  const out = { ...row };
  for (const key of ['event_date', 'end_date', 'published_at', 'created_at', 'updated_at']) {
    if (out[key] instanceof Date) out[key] = out[key].toISOString();
  }
  return out;
}

function translatePgError(err, fallbackMessage) {
  const message = err?.message || '';
  if (message.startsWith('not_found:')) {
    return new CmsError('not_found', message.slice('not_found:'.length).trim(), 404);
  }
  if (message.startsWith('status_conflict:')) {
    return new CmsError('status_conflict', message.slice('status_conflict:'.length).trim(), 409);
  }
  if (err?.code === '23505') {
    return new CmsError('duplicate_slug', 'Ya existe un evento registrado con ese slug.', 409, {
      slug: 'El slug ya está en uso.',
    });
  }
  return new CmsError('database_error', fallbackMessage || message, 500);
}

async function createPgliteCmsHarness(t) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.waitReady;
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
  `);
  await db.exec(cmsMigrationSql);

  for (const [key, actor] of Object.entries(ACTORS)) {
    await db.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [
      actor.userId,
      actor.email,
    ]);
    if (key !== 'plainUser') {
      await db.query(
        'INSERT INTO public.cms_user_permissions (user_id, email, role, area_scope, is_active) VALUES ($1, $2, $3, $4, $5)',
        [actor.userId, actor.email, actor.role, actor.area_scope, actor.is_active],
      );
    }
  }

  const repository = {
    async list(filters) {
      const conditions = [];
      const values = [];

      if (filters.status) {
        values.push(filters.status);
        conditions.push(`status = $${values.length}`);
      }
      if (filters.category) {
        values.push(filters.category);
        conditions.push(`category = $${values.length}`);
      }
      if (filters.area_scope) {
        values.push(filters.area_scope);
        conditions.push(`area_scope = $${values.length}`);
      }
      if (filters.is_featured !== undefined) {
        values.push(filters.is_featured);
        conditions.push(`is_featured = $${values.length}`);
      }
      if (filters.search) {
        values.push(`%${filters.search}%`);
        conditions.push(
          `(title ILIKE $${values.length} OR slug ILIKE $${values.length} OR coalesce(speaker, '') ILIKE $${values.length})`,
        );
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const countRes = await db.query(
        `SELECT count(*)::int AS total FROM public.cms_events ${whereClause}`,
        values,
      );
      const total = countRes.rows[0].total;

      const offset = (filters.page - 1) * filters.pageSize;
      const limitParam = values.length + 1;
      const offsetParam = values.length + 2;
      const rowsRes = await db.query(
        `SELECT * FROM public.cms_events ${whereClause}
         ORDER BY event_date DESC, created_at DESC
         LIMIT $${limitParam} OFFSET $${offsetParam}`,
        [...values, filters.pageSize, offset],
      );

      return {
        rows: rowsRes.rows.map(normalizePgRow),
        total,
      };
    },

    async getById(id) {
      const res = await db.query('SELECT * FROM public.cms_events WHERE id = $1', [id]);
      return res.rows[0] ? normalizePgRow(res.rows[0]) : null;
    },

    async create(payload, audit) {
      try {
        const res = await db.query(
          'SELECT public.cms_event_create($1::jsonb, $2::uuid, $3::text, $4::text) AS data',
          [JSON.stringify(payload), audit.actorId, audit.actorEmail, audit.actorRole],
        );
        return res.rows[0].data;
      } catch (err) {
        throw translatePgError(err, 'No se pudo crear el evento.');
      }
    },

    async update(id, expectedStatus, patch, audit) {
      try {
        const res = await db.query(
          'SELECT public.cms_event_update($1::uuid, $2::public.cms_content_status, $3::jsonb, $4::uuid, $5::text, $6::text[]) AS data',
          [
            id,
            expectedStatus,
            JSON.stringify(patch),
            audit.actorId,
            audit.actorEmail,
            Object.keys(patch),
          ],
        );
        return res.rows[0].data;
      } catch (err) {
        throw translatePgError(err, 'No se pudo actualizar el evento.');
      }
    },

    async transitionStatus(id, expectedStatus, nextStatus, action, audit) {
      try {
        const res = await db.query(
          'SELECT public.cms_event_transition_status($1::uuid, $2::public.cms_content_status, $3::public.cms_content_status, $4::text, $5::uuid, $6::text, $7::text, $8::text) AS data',
          [
            id,
            expectedStatus,
            nextStatus,
            action,
            audit.actorId,
            audit.actorEmail,
            audit.actorRole,
            audit.reviewComment ?? null,
          ],
        );
        return res.rows[0].data;
      } catch (err) {
        throw translatePgError(err, 'No se pudo cambiar el estado del evento.');
      }
    },

    async delete(id, audit) {
      try {
        const res = await db.query(
          'SELECT public.cms_event_delete($1::uuid, $2::uuid, $3::text) AS data',
          [id, audit.actorId, audit.actorEmail],
        );
        return res.rows[0].data;
      } catch (err) {
        throw translatePgError(err, 'No se pudo eliminar el evento.');
      }
    },
  };

  return { db, repository };
}

function validEventPayload(overrides = {}) {
  return {
    title: 'Taller de Arquitectura Astro & Supabase',
    summary: 'Sesión práctica de desarrollo full-stack',
    description: 'Aprenderemos a conectar Astro SSR con Supabase usando políticas RLS.',
    event_date: '2026-12-10T18:00:00-05:00',
    end_date: '2026-12-10T20:00:00-05:00',
    location: 'Auditorio FIIS - UNI',
    category: 'Workshop',
    area_scope: 'ID',
    speaker: 'Equipo ID UNICODE',
    thumbnail_url: '/events/workshop-astro.webp',
    external_url: 'https://lu.ma/unicode-astro',
    attendees_count: 45,
    highlights: [' Astro ', 'Supabase', 'astro', '  ', 'PostgreSQL'],
    is_featured: true,
    ...overrides,
  };
}

test('validates required fields, slug generation, categories, date range, highlights and safe URLs', () => {
  assert.equal(
    validation.generateEventSlug('Introducción a la Programación Competitiva! 2026'),
    'introduccion-a-la-programacion-competitiva-2026',
  );

  const parsed = validation.validateCreateEventInput(validEventPayload());
  assert.equal(parsed.slug, 'taller-de-arquitectura-astro-supabase');
  assert.deepEqual(parsed.highlights, ['Astro', 'Supabase', 'PostgreSQL']);
  assert.equal(parsed.status, 'draft');

  assert.throws(
    () => validation.validateCreateEventInput({ title: 'Sin campos' }),
    (err) => err.status === 400 && err.code === 'validation_error',
  );
  assert.throws(
    () => validation.validateCreateEventInput(validEventPayload({ category: 'WebinarInventado' })),
    (err) => err.status === 400 && err.code === 'validation_error',
  );
  assert.throws(
    () => validation.validateCreateEventInput(validEventPayload({ area_scope: 'MKT' })),
    (err) => err.status === 400 && err.code === 'validation_error',
  );
  assert.throws(
    () =>
      validation.validateCreateEventInput(
        validEventPayload({
          event_date: '2026-12-10T18:00:00-05:00',
          end_date: '2026-12-10T17:00:00-05:00',
        }),
      ),
    (err) => err.status === 400 && err.code === 'validation_error',
  );
  assert.throws(
    () => validation.validateCreateEventInput(validEventPayload({ attendees_count: -5 })),
    (err) => err.status === 400 && err.code === 'validation_error',
  );

  for (const badUrl of ['javascript:alert(1)', 'data:text/html,<script>', '//evil.example/x']) {
    assert.throws(
      () => validation.validateCreateEventInput(validEventPayload({ external_url: badUrl })),
      (err) => err.status === 400 && err.code === 'validation_error',
      badUrl,
    );
  }
});

test('production repository preserves search punctuation and quotes PostgREST ILIKE filters safely', async () => {
  assert.equal(service.escapePostgrestIlikeTerm('Workshop (ID)'), 'Workshop (ID)');
  assert.equal(service.escapePostgrestIlikeTerm('()'), '()');
  assert.equal(service.escapePostgrestIlikeTerm('100%_a,b"c'), '100\\%\\_a,b\\"c');

  const capturedOrCalls = [];
  const mockSupabaseClient = {
    from(table) {
      assert.equal(table, 'cms_events');
      const chain = {
        select() { return chain; },
        order() { return chain; },
        range() { return chain; },
        eq() { return chain; },
        or(expr) {
          capturedOrCalls.push(expr);
          return chain;
        },
        then(resolve) {
          return Promise.resolve({ data: [], count: 0, error: null }).then(resolve);
        },
      };
      return chain;
    },
  };

  const prodRepo = service.createSupabaseCmsEventsRepository(mockSupabaseClient);
  await service.listCmsEvents(ACTORS.dcc, { search: 'Workshop (ID)', page: 1, pageSize: 20 }, prodRepo);
  assert.equal(
    capturedOrCalls[0],
    'title.ilike."*Workshop (ID)*",slug.ilike."*Workshop (ID)*",speaker.ilike."*Workshop (ID)*"',
  );

  await service.listCmsEvents(ACTORS.dcc, { search: '()', page: 1, pageSize: 20 }, prodRepo);
  assert.equal(
    capturedOrCalls[1],
    'title.ilike."*()*",slug.ilike."*()*",speaker.ilike."*()*"',
  );
});

test('editorial transition matrix rejects published/archived -> pending_review even for directors and DCC', () => {
  for (const actor of [ACTORS.directorId, ACTORS.dcc, ACTORS.admin]) {
    assert.throws(
      () => validation.resolveEditorialTransition(actor, 'published', 'pending_review'),
      (err) => err.status === 400 && err.code === 'invalid_transition',
    );
    assert.throws(
      () => validation.resolveEditorialTransition(actor, 'archived', 'pending_review'),
      (err) => err.status === 400 && err.code === 'invalid_transition',
    );
  }
  assert.equal(validation.resolveEditorialTransition(ACTORS.delegateId, 'draft', 'pending_review'), 'submit_review');
  assert.equal(validation.resolveEditorialTransition(ACTORS.directorId, 'archived', 'draft'), 'restore');
  assert.equal(validation.resolveEditorialTransition(ACTORS.directorId, 'archived', 'published'), 'approve_publish');
});

test('dual editorial workflow enforces permissions by role/area, handles TOCTOU status conflicts and logs atomically', async (t) => {
  const { db, repository } = await createPgliteCmsHarness(t);

  await assert.rejects(
    () =>
      service.createCmsEvent(
        ACTORS.delegateId,
        validEventPayload({ status: 'published' }),
        repository,
      ),
    (err) => err.status === 403 && err.code === 'forbidden',
  );
  await assert.rejects(
    () =>
      service.createCmsEvent(
        ACTORS.delegateId,
        validEventPayload({ area_scope: 'ACD' }),
        repository,
      ),
    (err) => err.status === 403 && err.code === 'forbidden',
  );

  const draft = await service.createCmsEvent(ACTORS.delegateId, validEventPayload(), repository);
  assert.equal(draft.status, 'draft');
  assert.equal(draft.created_by, ACTORS.delegateId.userId);
  assert.equal(draft.published_at, null);

  const pending = await service.transitionCmsEventStatus(
    ACTORS.delegateId,
    draft.id,
    'pending_review',
    'Listo para revisión del director',
    repository,
  );
  assert.equal(pending.status, 'pending_review');

  await assert.rejects(
    () =>
      service.transitionCmsEventStatus(ACTORS.delegateId, draft.id, 'published', undefined, repository),
    (err) => err.status === 403 && err.code === 'forbidden',
  );

  const published = await service.transitionCmsEventStatus(
    ACTORS.directorId,
    draft.id,
    'published',
    'Aprobado por Dirección de ID',
    repository,
  );
  assert.equal(published.status, 'published');
  assert.equal(published.reviewed_by, ACTORS.directorId.userId);
  assert.ok(published.published_at);

  await assert.rejects(
    () =>
      service.updateCmsEvent(
        ACTORS.delegateId,
        draft.id,
        { title: 'Intento de edición post-publicación' },
        repository,
      ),
    (err) => err.status === 403 && err.code === 'forbidden',
  );

  // TOCTOU race condition: evento se publica justo antes de que el delegado lo edite -> 403 sin sobrescribir
  const raceDraft = await service.createCmsEvent(
    ACTORS.delegateId,
    validEventPayload({ title: 'Evento en carrera TOCTOU' }),
    repository,
  );
  const racingRepo = {
    ...repository,
    async getById(id) {
      return await repository.getById(id);
    },
    async update(id, expectedStatus, patch, audit) {
      await service.transitionCmsEventStatus(
        ACTORS.directorId,
        id,
        'published',
        'Publicado concurrentemente',
        repository,
      );
      return await repository.update(id, expectedStatus, patch, audit);
    },
  };
  await assert.rejects(
    () =>
      service.updateCmsEvent(
        ACTORS.delegateId,
        raceDraft.id,
        { title: 'Edición tardía del delegado' },
        racingRepo,
      ),
    (err) => err.status === 403 && err.code === 'forbidden',
  );
  const raceAfter = await repository.getById(raceDraft.id);
  assert.equal(raceAfter.title, 'Evento en carrera TOCTOU');
  assert.equal(raceAfter.status, 'published');

  // DCC (ALL) crea y publica en ACD; Director de ID recibe 403; solo Admin puede eliminar
  const acdEvent = await service.createCmsEvent(
    ACTORS.dcc,
    validEventPayload({
      title: 'Maratón de Algoritmos ACD',
      area_scope: 'ACD',
      category: 'Competencia',
      status: 'published',
    }),
    repository,
  );
  assert.equal(acdEvent.status, 'published');

  await assert.rejects(
    () => service.getCmsEventById(ACTORS.directorId, acdEvent.id, repository),
    (err) => err.status === 403 && err.code === 'forbidden',
  );
  await assert.rejects(
    () =>
      service.createCmsEvent(
        ACTORS.dcc,
        validEventPayload({ slug: acdEvent.slug }),
        repository,
      ),
    (err) => err.status === 409 && err.code === 'duplicate_slug',
  );
  await assert.rejects(
    () => service.deleteCmsEvent(ACTORS.dcc, acdEvent.id, repository),
    (err) => err.status === 403 && err.code === 'forbidden',
  );

  const deleted = await service.deleteCmsEvent(ACTORS.admin, acdEvent.id, repository);
  assert.deepEqual(deleted, { deleted: true, id: acdEvent.id });

  const logsRes = await db.query(
    'SELECT entity_id, action, from_status, to_status, actor_email, metadata FROM public.cms_audit_logs ORDER BY created_at ASC',
  );
  const draftLogs = logsRes.rows.filter((r) => r.entity_id === draft.id);
  assert.deepEqual(
    draftLogs.map((l) => [l.action, l.from_status, l.to_status]),
    [
      ['create', null, 'draft'],
      ['submit_review', 'draft', 'pending_review'],
      ['approve_publish', 'pending_review', 'published'],
    ],
  );
  assert.equal(draftLogs[2].metadata.review_comment, 'Aprobado por Dirección de ID');
  assert.equal(draftLogs[2].actor_email, ACTORS.directorId.email);
});

test('mutations and audit logs commit atomically (rollback if audit insert fails)', async (t) => {
  const { db, repository } = await createPgliteCmsHarness(t);

  const existing = await service.createCmsEvent(
    ACTORS.dcc,
    validEventPayload({ title: 'Evento Atómico', status: 'draft' }),
    repository,
  );

  await db.exec(`
    CREATE FUNCTION test_abort_audit() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION 'test_audit_failure';
    END $$;
    CREATE TRIGGER test_abort_audit
      BEFORE INSERT ON public.cms_audit_logs
      FOR EACH ROW EXECUTE FUNCTION test_abort_audit();
  `);

  await assert.rejects(
    () =>
      service.createCmsEvent(
        ACTORS.dcc,
        validEventPayload({ title: 'Evento Fallido', slug: 'evento-fallido-atomico' }),
        repository,
      ),
    { code: 'database_error', status: 500 },
  );
  const afterFailedCreate = await db.query(
    "SELECT count(*)::int AS n FROM public.cms_events WHERE slug = 'evento-fallido-atomico'",
  );
  assert.equal(afterFailedCreate.rows[0].n, 0, 'CREATE rolled back when audit failed');

  await assert.rejects(
    () =>
      service.updateCmsEvent(
        ACTORS.dcc,
        existing.id,
        { title: 'Título Revertido' },
        repository,
      ),
    { code: 'database_error', status: 500 },
  );
  assert.equal((await repository.getById(existing.id)).title, 'Evento Atómico');

  await assert.rejects(
    () => service.deleteCmsEvent(ACTORS.admin, existing.id, repository),
    { code: 'database_error', status: 500 },
  );
  assert.ok(await repository.getById(existing.id), 'DELETE rolled back when audit failed');
});

test('SQL security & integrity: linked cms_news cascades on event delete, direct writes audit, board email is protected and audit impersonation is blocked', async (t) => {
  const { db, repository } = await createPgliteCmsHarness(t);

  // 1. ON DELETE CASCADE en cms_news al eliminar un evento enlazado
  const linkedEvent = await service.createCmsEvent(
    ACTORS.admin,
    validEventPayload({ title: 'Evento Enlazado', status: 'published' }),
    repository,
  );
  await db.query(
    "INSERT INTO public.cms_news (source_type, event_id, status, is_active) VALUES ('event', $1, 'published', true)",
    [linkedEvent.id],
  );
  await service.deleteCmsEvent(ACTORS.admin, linkedEvent.id, repository);
  const newsAfterDelete = await db.query(
    'SELECT count(*)::int AS n FROM public.cms_news WHERE event_id = $1',
    [linkedEvent.id],
  );
  assert.equal(newsAfterDelete.rows[0].n, 0);

  // 2. Privacidad de email en cms_board_members para usuarios authenticated sin permisos CMS
  await db.query(
    `INSERT INTO public.cms_board_members
      (full_name, role_title, member_type, area_scope, photo_url, email, status, is_active)
     VALUES ('Director Privado', 'Director ID', 'director', 'ID', '/photo.webp', 'secreto@uni.pe', 'published', true)`,
  );
  await db.exec(
    `SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${ACTORS.plainUser.userId}', false);`,
  );
  await assert.rejects(
    () => db.query('SELECT email FROM public.cms_board_members'),
    /permission denied/,
  );
  const publicViewRows = await db.query('SELECT full_name FROM public.cms_public_board_members');
  assert.equal(publicViewRows.rows.length, 1);
  await db.exec('RESET ROLE');

  // 3. Escritura directa en cms_events como authenticated genera fila en cms_audit_logs con actor real
  await db.exec(
    `SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${ACTORS.delegateId.userId}', false);`,
  );
  const directInsert = await db.query(
    `INSERT INTO public.cms_events
      (slug, title, description, event_date, location, category, area_scope, thumbnail_url, status)
     VALUES ('directo-delegado', 'Evento Directo', 'Desc', now(), 'UNI', 'Workshop', 'ID', '/img.webp', 'draft')
     RETURNING id`,
  );
  const directId = directInsert.rows[0].id;
  await db.query("UPDATE public.cms_events SET status = 'pending_review' WHERE id = $1", [directId]);

  // 4. Delegado NO puede suplantar a otro actor ni insertar acción approve_publish en cms_audit_logs
  await assert.rejects(
    () =>
      db.query(
        `INSERT INTO public.cms_audit_logs
          (entity_type, entity_id, action, from_status, to_status, actor_id, actor_email, area_scope, metadata)
         VALUES ('cms_events', $1, 'approve_publish', 'pending_review', 'published', $2, $3, 'ID', '{}'::jsonb)`,
        [directId, ACTORS.admin.userId, ACTORS.admin.email],
      ),
    /row-level security/,
  );
  await db.exec('RESET ROLE');

  const directLogs = await db.query(
    'SELECT action, from_status, to_status, actor_id, actor_email FROM public.cms_audit_logs WHERE entity_id = $1 ORDER BY created_at ASC',
    [directId],
  );
  assert.deepEqual(
    directLogs.rows.map((r) => [r.action, r.from_status, r.to_status, r.actor_email]),
    [
      ['create', null, 'draft', ACTORS.delegateId.email],
      ['submit_review', 'draft', 'pending_review', ACTORS.delegateId.email],
    ],
  );
});

test('listCmsEvents supports filtering by status, category, area_scope, is_featured, search and pagination', async (t) => {
  const { repository } = await createPgliteCmsHarness(t);

  await service.createCmsEvent(
    ACTORS.dcc,
    validEventPayload({
      title: 'Summit IA (UNI)',
      area_scope: 'ID',
      category: 'Summit',
      is_featured: true,
      status: 'published',
    }),
    repository,
  );
  await service.createCmsEvent(
    ACTORS.dcc,
    validEventPayload({
      title: 'Charla Git y GitHub',
      area_scope: 'ID',
      category: 'Charla',
      is_featured: false,
      status: 'draft',
    }),
    repository,
  );
  await service.createCmsEvent(
    ACTORS.dcc,
    validEventPayload({
      title: 'Integración General',
      area_scope: 'GTH',
      category: 'Integración',
      is_featured: false,
      status: 'published',
    }),
    repository,
  );

  const publishedId = await service.listCmsEvents(
    ACTORS.dcc,
    { status: 'published', area_scope: 'ID', is_featured: true, page: 1, pageSize: 10 },
    repository,
  );
  assert.equal(publishedId.data.length, 1);
  assert.equal(publishedId.data[0].title, 'Summit IA (UNI)');

  const searched = await service.listCmsEvents(
    ACTORS.admin,
    { search: '(UNI)', page: 1, pageSize: 5 },
    repository,
  );
  assert.equal(searched.data.length, 1);
  assert.equal(searched.pagination.total, 1);

  const directorList = await service.listCmsEvents(ACTORS.directorId, {}, repository);
  assert.equal(directorList.data.length, 2);
  assert.ok(directorList.data.every((ev) => ev.area_scope === 'ID'));

  await assert.rejects(
    () => service.listCmsEvents(ACTORS.directorId, { area_scope: 'GTH' }, repository),
    (err) => err.status === 403 && err.code === 'forbidden',
  );
});

test('API routes enforce 401 without token, 400 on invalid input and 403 on unauthorized DELETE', async () => {
  const unauthReq = new Request('http://localhost:4321/api/cms/events');
  const resGet = await indexRoute.GET({ request: unauthReq, locals: {} });
  assert.equal(resGet.status, 401);

  const resPostUnauth = await indexRoute.POST({
    request: new Request('http://localhost:4321/api/cms/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }),
    locals: {},
  });
  assert.equal(resPostUnauth.status, 401);

  const resBadPost = await indexRoute.POST({
    request: new Request('http://localhost:4321/api/cms/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    }),
    locals: { cmsActor: ACTORS.dcc },
  });
  assert.equal(resBadPost.status, 400);

  const resForbiddenDelete = await detailRoute.DELETE({
    request: new Request('http://localhost:4321/api/cms/events/11111111-1111-4111-8111-111111111111', {
      method: 'DELETE',
    }),
    params: { id: '11111111-1111-4111-8111-111111111111' },
    locals: { cmsActor: ACTORS.dcc },
  });
  assert.equal(resForbiddenDelete.status, 403);

  const resBadStatus = await statusRoute.PATCH({
    request: new Request(
      'http://localhost:4321/api/cms/events/11111111-1111-4111-8111-111111111111/status',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inventado' }),
      },
    ),
    params: { id: '11111111-1111-4111-8111-111111111111' },
    locals: { cmsActor: ACTORS.dcc },
  });
  assert.equal(resBadStatus.status, 400);
});
