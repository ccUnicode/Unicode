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
};

function normalizePgRow(row) {
  const out = { ...row };
  for (const key of ['event_date', 'end_date', 'published_at', 'created_at', 'updated_at']) {
    if (out[key] instanceof Date) out[key] = out[key].toISOString();
  }
  return out;
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

  for (const actor of Object.values(ACTORS)) {
    await db.query('INSERT INTO auth.users (id, email) VALUES ($1, $2)', [
      actor.userId,
      actor.email,
    ]);
    await db.query(
      'INSERT INTO public.cms_user_permissions (user_id, email, role, area_scope, is_active) VALUES ($1, $2, $3, $4, $5)',
      [actor.userId, actor.email, actor.role, actor.area_scope, actor.is_active],
    );
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

    async create(payload) {
      const columns = Object.keys(payload);
      const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
      const values = columns.map((col) => payload[col]);
      try {
        const res = await db.query(
          `INSERT INTO public.cms_events (${columns.join(', ')})
           VALUES (${placeholders})
           RETURNING *`,
          values,
        );
        return normalizePgRow(res.rows[0]);
      } catch (err) {
        if (err && err.code === '23505') {
          throw new server.ssrLoadModule('/src/lib/cms/errors.ts').then(() => null).catch(() => null);
        }
        throw err;
      }
    },

    async update(id, payload) {
      const columns = Object.keys(payload);
      const sets = columns.map((col, idx) => `${col} = $${idx + 1}`).join(', ');
      const values = [...columns.map((col) => payload[col]), id];
      const res = await db.query(
        `UPDATE public.cms_events SET ${sets} WHERE id = $${columns.length + 1} RETURNING *`,
        values,
      );
      return res.rows[0] ? normalizePgRow(res.rows[0]) : null;
    },

    async delete(id) {
      const res = await db.query('DELETE FROM public.cms_events WHERE id = $1 RETURNING id', [id]);
      return res.rows.length > 0;
    },

    async insertAuditLog(entry) {
      await db.query(
        `INSERT INTO public.cms_audit_logs
          (entity_type, entity_id, action, from_status, to_status, actor_id, actor_email, area_scope, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [
          entry.entity_type,
          entry.entity_id,
          entry.action,
          entry.from_status,
          entry.to_status,
          entry.actor_id,
          entry.actor_email,
          entry.area_scope,
          JSON.stringify(entry.metadata),
        ],
      );
    },
  };

  // Sobrescribe create/update para traducir código 23505 con CmsError real
  const { CmsError } = await server.ssrLoadModule('/src/lib/cms/errors.ts');
  repository.create = async (payload) => {
    const columns = Object.keys(payload);
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
    const values = columns.map((col) => payload[col]);
    try {
      const res = await db.query(
        `INSERT INTO public.cms_events (${columns.join(', ')})
         VALUES (${placeholders})
         RETURNING *`,
        values,
      );
      return normalizePgRow(res.rows[0]);
    } catch (err) {
      if (err && err.code === '23505') {
        throw new CmsError('duplicate_slug', 'Ya existe un evento registrado con ese slug.', 409, {
          slug: 'El slug ya está en uso.',
        });
      }
      throw err;
    }
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

  // Campos obligatorios faltantes
  assert.throws(
    () => validation.validateCreateEventInput({ title: 'Sin campos' }),
    (err) => err.status === 400 && err.code === 'validation_error',
  );

  // Categoría inválida
  assert.throws(
    () => validation.validateCreateEventInput(validEventPayload({ category: 'WebinarInventado' })),
    (err) => err.status === 400 && err.code === 'validation_error',
  );

  // area_scope inválido
  assert.throws(
    () => validation.validateCreateEventInput(validEventPayload({ area_scope: 'MKT' })),
    (err) => err.status === 400 && err.code === 'validation_error',
  );

  // end_date anterior a event_date
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

  // attendees_count negativo
  assert.throws(
    () => validation.validateCreateEventInput(validEventPayload({ attendees_count: -5 })),
    (err) => err.status === 400 && err.code === 'validation_error',
  );

  // URLs inseguras rechazadas
  for (const badUrl of ['javascript:alert(1)', 'data:text/html,<script>', '//evil.example/x']) {
    assert.throws(
      () => validation.validateCreateEventInput(validEventPayload({ external_url: badUrl })),
      (err) => err.status === 400 && err.code === 'validation_error',
      badUrl,
    );
  }
});

test('dual editorial workflow enforces permissions by role/area and logs every mutation in cms_audit_logs', async (t) => {
  const { db, repository } = await createPgliteCmsHarness(t);

  // 1. Delegado de ID intenta publicar directamente o crear en otra área -> 403
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

  // 2. Delegado de ID crea borrador y lo envía a revisión (flujo 2 pasos)
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

  // Delegado NO puede auto-aprobar ni archivar
  await assert.rejects(
    () =>
      service.transitionCmsEventStatus(ACTORS.delegateId, draft.id, 'published', undefined, repository),
    (err) => err.status === 403 && err.code === 'forbidden',
  );

  // 3. Director de ID aprueba y publica
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

  // Delegado ya no puede editar ni cambiar estado de un evento publicado
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

  // 4. DCC (scope ALL) puede crear y publicar directamente en cualquier área (ej. ACD)
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
  assert.equal(acdEvent.area_scope, 'ACD');

  // Director de ID no puede ver ni archivar el evento de ACD
  await assert.rejects(
    () => service.getCmsEventById(ACTORS.directorId, acdEvent.id, repository),
    (err) => err.status === 403 && err.code === 'forbidden',
  );

  // 5. Slug duplicado devuelve 409 Conflict
  await assert.rejects(
    () =>
      service.createCmsEvent(
        ACTORS.dcc,
        validEventPayload({ slug: acdEvent.slug }),
        repository,
      ),
    (err) => err.status === 409 && err.code === 'duplicate_slug',
  );

  // 6. Solo admin puede eliminar definitivamente; DCC recibe 403
  await assert.rejects(
    () => service.deleteCmsEvent(ACTORS.dcc, acdEvent.id, repository),
    (err) => err.status === 403 && err.code === 'forbidden',
  );
  const deleted = await service.deleteCmsEvent(ACTORS.admin, acdEvent.id, repository);
  assert.deepEqual(deleted, { deleted: true, id: acdEvent.id });

  // 7. Verificar trazabilidad en cms_audit_logs
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

test('listCmsEvents supports filtering by status, category, area_scope, is_featured, search and pagination', async (t) => {
  const { repository } = await createPgliteCmsHarness(t);

  await service.createCmsEvent(
    ACTORS.dcc,
    validEventPayload({
      title: 'Summit IA UNI',
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

  // DCC lista todo con filtros
  const publishedId = await service.listCmsEvents(
    ACTORS.dcc,
    { status: 'published', area_scope: 'ID', is_featured: true, page: 1, pageSize: 10 },
    repository,
  );
  assert.equal(publishedId.data.length, 1);
  assert.equal(publishedId.data[0].title, 'Summit IA UNI');

  // Búsqueda por texto y paginación
  const searched = await service.listCmsEvents(
    ACTORS.admin,
    { search: 'git', page: 1, pageSize: 5 },
    repository,
  );
  assert.equal(searched.data.length, 1);
  assert.equal(searched.pagination.total, 1);

  // Director de ID restringido automáticamente a su área y bloqueado si pide GTH
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

  // Validación 400 con actor inyectado en locals antes de tocar Supabase
  const resBadPost = await indexRoute.POST({
    request: new Request('http://localhost:4321/api/cms/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    }),
    locals: { cmsActor: ACTORS.dcc },
  });
  assert.equal(resBadPost.status, 400);

  // 403 para DCC intentando DELETE
  const resForbiddenDelete = await detailRoute.DELETE({
    request: new Request('http://localhost:4321/api/cms/events/11111111-1111-4111-8111-111111111111', {
      method: 'DELETE',
    }),
    params: { id: '11111111-1111-4111-8111-111111111111' },
    locals: { cmsActor: ACTORS.dcc },
  });
  assert.equal(resForbiddenDelete.status, 403);

  // 400 en /status con estado inválido
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
