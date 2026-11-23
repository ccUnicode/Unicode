import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import {
  inspectImageMagicBytes,
  validateMediaFile,
  generateMediaStoragePath,
  CMS_BUCKET_CONFIGS,
  uploadMedia,
  getMediaPublicUrl,
  deleteMedia,
} from '../src/lib/cms/media-service.ts';

const migrationDirectory = new URL('../supabase/migrations/', import.meta.url);
const migrationFiles = (await readdir(migrationDirectory)).filter(name => name.endsWith('.sql')).sort();
const migrations = await Promise.all(migrationFiles.map(name => readFile(new URL(name, migrationDirectory), 'utf8')));

// Helper para crear un entorno de pruebas con PGlite
async function createTestDatabase(t) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.waitReady;

  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE public.applicants (id uuid primary key, first_name text not null, email text not null);
  `);

  for (const [index, migration] of migrations.entries()) {
    try {
      await db.exec(migration);
    } catch (error) {
      throw new Error(`Migration ${migrationFiles[index]} failed: ${error.message}`);
    }
  }

  return db;
}

// -----------------------------------------------------------------------------
// 1. Tests de Base de Datos y Políticas RLS (PostgreSQL / Supabase)
// -----------------------------------------------------------------------------

test('CMS RLS: Funciones helper has_area_access y can_publish_content respetan roles y alcances', async t => {
  const db = await createTestDatabase(t);

  const adminId = randomUUID();
  const directorId = randomUUID();
  const delegadoId = randomUUID();
  const randomUserId = randomUUID();

  // Insertar usuarios en auth.users
  await db.query(`INSERT INTO auth.users (id, email) VALUES 
    ($1, 'admin@unicode.pe'),
    ($2, 'gabriel@unicode.pe'),
    ($3, 'delegado@unicode.pe'),
    ($4, 'ajeno@unicode.pe')`,
    [adminId, directorId, delegadoId, randomUserId]
  );

  // Insertar permisos en cms_user_permissions
  await db.query(`
    INSERT INTO public.cms_user_permissions (user_id, email, role, area_scope, can_publish) VALUES
    ($1, 'admin@unicode.pe', 'admin', 'ALL', true),
    ($2, 'gabriel@unicode.pe', 'director', 'ID', true),
    ($3, 'delegado@unicode.pe', 'delegado', 'ID', false)
  `, [adminId, directorId, delegadoId]);

  // Función helper para evaluar funciones simulando el JWT auth.uid()
  const evaluateHelper = async (userId, funcName, area) => {
    await db.exec(`SET request.jwt.claim.sub = '${userId}'`);
    const res = await db.query(`SELECT public.${funcName}('${area}'::unicode_area_type) AS result`);
    return res.rows[0].result;
  };

  // 1. Admin General: acceso y publicación en todas las áreas
  assert.equal(await evaluateHelper(adminId, 'has_area_access', 'ID'), true);
  assert.equal(await evaluateHelper(adminId, 'has_area_access', 'DCC'), true);
  assert.equal(await evaluateHelper(adminId, 'can_publish_content', 'ID'), true);
  assert.equal(await evaluateHelper(adminId, 'can_publish_content', 'DCC'), true);

  // 2. Director de Área (ID): acceso y publicación sólo en su área
  assert.equal(await evaluateHelper(directorId, 'has_area_access', 'ID'), true);
  assert.equal(await evaluateHelper(directorId, 'has_area_access', 'ACD'), false);
  assert.equal(await evaluateHelper(directorId, 'can_publish_content', 'ID'), true);
  assert.equal(await evaluateHelper(directorId, 'can_publish_content', 'ACD'), false);

  // 3. Delegado de Área (ID): acceso a su área pero sin facultad de publicación
  assert.equal(await evaluateHelper(delegadoId, 'has_area_access', 'ID'), true);
  assert.equal(await evaluateHelper(delegadoId, 'has_area_access', 'ACD'), false);
  assert.equal(await evaluateHelper(delegadoId, 'can_publish_content', 'ID'), false);

  // 4. Usuario ajeno: sin acceso
  assert.equal(await evaluateHelper(randomUserId, 'has_area_access', 'ID'), false);
  assert.equal(await evaluateHelper(randomUserId, 'can_publish_content', 'ID'), false);
});

test('CMS RLS: Sincronización automática de directores desde recruitment_directors', async t => {
  const db = await createTestDatabase(t);

  const directorId = randomUUID();
  const directorEmail = 'gabriel.chupa@uni.pe';

  // Registrar director en recruitment_directors
  await db.query(`
    INSERT INTO public.recruitment_directors (email, area, name)
    VALUES ($1, 'ID', 'Gabriel Chupa')
  `, [directorEmail]);

  // Ejecutar función de sincronización
  const syncResult = await db.query(`
    SELECT public.sync_director_to_cms($1, $2) as res
  `, [directorId, directorEmail]);

  const output = syncResult.rows[0].res;
  assert.equal(output.synced, true);
  assert.equal(output.area, 'ID');

  // Verificar que se creó el registro en cms_user_permissions con can_publish = true
  const perm = await db.query(`
    SELECT role, area_scope, can_publish FROM public.cms_user_permissions WHERE user_id = $1
  `, [directorId]);

  assert.equal(perm.rows.length, 1);
  assert.equal(perm.rows[0].role, 'director');
  assert.equal(perm.rows[0].area_scope, 'ID');
  assert.equal(perm.rows[0].can_publish, true);
});

test('CMS RLS: Flujo de 1 paso (Director) vs Flujo de 2 pasos (Delegado) y protección de publicado', async t => {
  const db = await createTestDatabase(t);

  const directorId = randomUUID();
  const delegadoId = randomUUID();

  await db.query(`INSERT INTO auth.users (id, email) VALUES 
    ($1, 'director.id@unicode.pe'),
    ($2, 'delegado.id@unicode.pe')`,
    [directorId, delegadoId]
  );

  await db.query(`
    INSERT INTO public.cms_user_permissions (user_id, email, role, area_scope, can_publish) VALUES
    ($1, 'director.id@unicode.pe', 'director', 'ID', true),
    ($2, 'delegado.id@unicode.pe', 'delegado', 'ID', false)
  `, [directorId, delegadoId]);

  // Simular sesión de Delegado
  await db.exec(`SET request.jwt.claim.sub = '${delegadoId}'; SET ROLE authenticated;`);

  // Delegado inserta en draft: PERMITIDO
  const draftEventId = randomUUID();
  await db.query(`
    INSERT INTO public.cms_events (id, title, area, status, created_by)
    VALUES ($1, 'Taller de Rust', 'ID', 'draft', $2)
  `, [draftEventId, delegadoId]);

  // Delegado inserta en pending_review: PERMITIDO
  const reviewEventId = randomUUID();
  await db.query(`
    INSERT INTO public.cms_events (id, title, area, status, created_by)
    VALUES ($1, 'Hackathon UNICODE', 'ID', 'pending_review', $2)
  `, [reviewEventId, delegadoId]);

  // Delegado intenta insertar directamente en published: DENEGADO por RLS
  const publishedEventId = randomUUID();
  await assert.rejects(
    async () => {
      await db.query(`
        INSERT INTO public.cms_events (id, title, area, status, created_by)
        VALUES ($1, 'Evento Directo', 'ID', 'published', $2)
      `, [publishedEventId, delegadoId]);
    },
    /row-level security/i,
    'El delegado no debe poder insertar directamente un evento en status published'
  );

  // Simular sesión de Director
  await db.exec(`SET request.jwt.claim.sub = '${directorId}'; SET ROLE authenticated;`);

  // Director publica en 1 solo paso: PERMITIDO
  await db.query(`
    INSERT INTO public.cms_events (id, title, area, status, created_by)
    VALUES ($1, 'Evento Directo Director', 'ID', 'published', $2)
  `, [publishedEventId, directorId]);

  // Director aprueba el borrador del delegado pasando a published: PERMITIDO
  await db.query(`
    UPDATE public.cms_events SET status = 'published' WHERE id = $1
  `, [reviewEventId]);

  // Simular nuevamente sesión de Delegado
  await db.exec(`SET request.jwt.claim.sub = '${delegadoId}'; SET ROLE authenticated;`);

  // Regla de Protección: Delegado intenta modificar un evento 'published' manteniéndolo 'published' -> DENEGADO
  await assert.rejects(
    async () => {
      await db.query(`
        UPDATE public.cms_events SET title = 'Titulo Modificado Ilegal' WHERE id = $1
      `, [publishedEventId]);
    },
    /(row-level security|Operación denegada)/i,
    'Un delegado no puede modificar un registro publicado sin regresarlo a revisión'
  );

  // Delegado modifica el evento publicado regresándolo a revisión ('pending_review') -> PERMITIDO
  await db.query(`
    UPDATE public.cms_events 
    SET title = 'Propuesta de Cambio', status = 'pending_review'
    WHERE id = $1
  `, [publishedEventId]);

  const updated = await db.query(`SELECT title, status FROM public.cms_events WHERE id = $1`, [publishedEventId]);
  assert.equal(updated.rows[0].title, 'Propuesta de Cambio');
  assert.equal(updated.rows[0].status, 'pending_review');

  // Delegado intenta borrar el evento -> DENEGADO por RLS (no borra ninguna fila)
  await db.query(`DELETE FROM public.cms_events WHERE id = $1`, [publishedEventId]);
  const stillExists = await db.query(`SELECT id FROM public.cms_events WHERE id = $1`, [publishedEventId]);
  assert.equal(stillExists.rows.length, 1, 'El delegado no tiene privilegios de DELETE');

  // Director elimina el evento -> PERMITIDO
  await db.exec(`SET request.jwt.claim.sub = '${directorId}'; SET ROLE authenticated;`);
  await db.query(`DELETE FROM public.cms_events WHERE id = $1`, [publishedEventId]);
  const deleted = await db.query(`SELECT id FROM public.cms_events WHERE id = $1`, [publishedEventId]);
  assert.equal(deleted.rows.length, 0);
});

test('CMS Storage: Verificación de configuración de los 4 buckets en la base de datos', async t => {
  const db = await createTestDatabase(t);

  const buckets = await db.query(`
    SELECT id, public, file_size_limit, allowed_mime_types 
    FROM storage.buckets 
    ORDER BY id
  `);

  assert.equal(buckets.rows.length, 4);

  const bucketMap = Object.fromEntries(buckets.rows.map(b => [b.id, b]));

  assert.ok(bucketMap['events-media']);
  assert.equal(bucketMap['events-media'].public, true);
  assert.equal(Number(bucketMap['events-media'].file_size_limit), 5 * 1024 * 1024);
  assert.deepEqual(bucketMap['events-media'].allowed_mime_types, ['image/webp', 'image/png']);

  assert.ok(bucketMap['alliances-logos']);
  assert.equal(bucketMap['alliances-logos'].public, true);
  assert.equal(Number(bucketMap['alliances-logos'].file_size_limit), 2 * 1024 * 1024);
  assert.deepEqual(bucketMap['alliances-logos'].allowed_mime_types, ['image/webp', 'image/png']);
});

// -----------------------------------------------------------------------------
// 2. Tests del Servicio TypeScript de Subida Multimedia (src/lib/cms/)
// -----------------------------------------------------------------------------

test('Media Service: Validación de Magic Bytes (.webp y .png)', () => {
  // 1. Cabecera PNG auténtica
  const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const pngResult = inspectImageMagicBytes(pngHeader);
  assert.equal(pngResult.mimeType, 'image/png');
  assert.equal(pngResult.ext, 'png');

  // 2. Cabecera WebP auténtica (RIFF....WEBP)
  const webpHeader = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x24, 0x00, 0x00, 0x00, // Size
    0x57, 0x45, 0x42, 0x50, // WEBP
    0x56, 0x50, 0x38, 0x20  // VP8
  ]);
  const webpResult = inspectImageMagicBytes(webpHeader);
  assert.equal(webpResult.mimeType, 'image/webp');
  assert.equal(webpResult.ext, 'webp');

  // 3. Intento de evasión con JPEG renombrado o script HTML
  const fakeBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  assert.throws(
    () => inspectImageMagicBytes(fakeBytes),
    /Formato de imagen no permitido/
  );

  // 4. Archivo corrupto o demasiado corto
  assert.throws(
    () => inspectImageMagicBytes(new Uint8Array([1, 2, 3])),
    /demasiado pequeño o está corrupto/
  );
});

test('Media Service: Control estricto de límites de tamaño por bucket', () => {
  const pngHeader = new Uint8Array(100);
  pngHeader.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // Válido para events-media (límite 5MB)
  const validValidation = validateMediaFile(pngHeader, 'events-media');
  assert.equal(validValidation.mimeType, 'image/png');

  // Archivo de 3 MB (excede alliances-logos que admite máx 2 MB)
  const bigFile = new Uint8Array(3 * 1024 * 1024);
  bigFile.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  assert.throws(
    () => validateMediaFile(bigFile, 'alliances-logos'),
    /excede el límite máximo de 2 MB/
  );

  // El mismo archivo de 3 MB sí cabe en projects-media (límite 5 MB)
  const allowedInProjects = validateMediaFile(bigFile, 'projects-media');
  assert.equal(allowedInProjects.size, 3 * 1024 * 1024);
});

test('Media Service: Generación canónica y sanitización de rutas de almacenamiento', () => {
  const pathWithArea = generateMediaStoragePath({
    area: 'ID',
    fileName: 'Foto Portada Concurso 2026.png',
    ext: 'webp',
  });

  assert.match(pathWithArea, /^ID\/foto-portada-concurso-2026-\d+-[a-z0-9]+\.webp$/);

  const pathWithoutArea = generateMediaStoragePath({
    ext: 'png',
  });

  assert.match(pathWithoutArea, /^media-\d+-[a-z0-9]+\.png$/);
});

test('Media Service: Subida, obtención de URL pública y eliminación con cliente mock', async () => {
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

  let uploadedPayload = null;
  let deletedPaths = null;

  // Mock de Supabase Client para probar el contrato de la capa de storage
  const mockClient = {
    storage: {
      from: (bucket) => ({
        upload: async (path, bytes, options) => {
          uploadedPayload = { bucket, path, bytes, options };
          return { data: { path }, error: null };
        },
        getPublicUrl: (path) => ({
          data: { publicUrl: `https://test-project.supabase.co/storage/v1/object/public/${bucket}/${path}` },
        }),
        remove: async (paths) => {
          deletedPaths = paths;
          return { data: paths, error: null };
        },
      }),
    },
  };

  // 1. Prueba de subida
  const result = await uploadMedia({
    bucket: 'events-media',
    file: pngBytes,
    fileName: 'banner-hackathon.png',
    area: 'ID',
    client: mockClient,
  });

  assert.equal(result.bucket, 'events-media');
  assert.equal(result.mimeType, 'image/png');
  assert.match(result.path, /^ID\/banner-hackathon-\d+-[a-z0-9]+\.png$/);
  assert.match(result.publicUrl, /^https:\/\/test-project\.supabase\.co\/storage\/v1\/object\/public\/events-media\/ID\//);
  assert.equal(uploadedPayload.options.contentType, 'image/png');

  // 2. Prueba de obtención de URL pública
  const publicUrl = getMediaPublicUrl('alliances-logos', 'bcp-logo.webp', mockClient);
  assert.equal(publicUrl, 'https://test-project.supabase.co/storage/v1/object/public/alliances-logos/bcp-logo.webp');

  // 3. Prueba de eliminación
  await deleteMedia('events-media', [result.path], mockClient);
  assert.deepEqual(deletedPaths, [result.path]);
});
