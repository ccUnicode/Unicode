import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migrationDirectory = new URL('../supabase/migrations/', import.meta.url);
const migrationFiles = (await readdir(migrationDirectory)).filter(name => name.endsWith('.sql')).sort();
const migrations = await Promise.all(migrationFiles.map(name => readFile(new URL(name, migrationDirectory), 'utf8')));
const legacyId = '11111111-1111-4111-8111-111111111111';

async function database(t) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.waitReady;
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE public.applicants (id uuid primary key, first_name text not null, email text not null);
    INSERT INTO public.applicants VALUES ('${legacyId}', 'Histórico preservado', 'historico@example.test');
  `);
  for (const [index, migration] of migrations.entries()) {
    try { await db.exec(migration); }
    catch (error) { throw new Error(`Migration ${migrationFiles[index]} failed: ${error.message}`); }
  }
  return db;
}

async function rpc(db, name, ...values) {
  assert.match(name, /^recruitment_[a-z_]+$/);
  const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
  const result = await db.query(`SELECT public.${name}(${placeholders}) AS result`, values.map(value => value !== null && typeof value === 'object' ? JSON.stringify(value) : value));
  return result.rows[0]?.result;
}

async function currentConfig(db) {
  return (await rpc(db, 'recruitment_admin_config')).config;
}

async function openCall(db, changes = {}) {
  const config = await currentConfig(db);
  const now = Date.now();
  return (await rpc(db, 'recruitment_update_config', {
    ...config, enabled: true,
    opensAt: new Date(now - 3_600_000).toISOString(),
    closesAt: new Date(now + 86_400_000).toISOString(),
    minAvailabilityHours: 2,
    ...changes,
  }, 'sesión administrativa compartida')).config;
}

function applicant(id = randomUUID(), changes = {}) {
  return {
    firstName: 'Prueba', lastName: 'Local', email: `postulante-${id}@example.test`, phone: '999999999',
    university: 'UNI', faculty: 'FIIS', career: 'Ingeniería de Sistemas', admissionTerm: '2026-2', semester: '6',
    firstChoiceArea: 'ID', secondChoiceArea: 'GTH', availabilityHours: 4,
    motivation: 'Quiero participar en proyectos de la comunidad.', shortCase: 'Conversaría con el equipo y acordaría los siguientes pasos.',
    showcase: 'github.com/prueba/proyecto', organizations: 'Fui parte del círculo de robótica.', referralSource: 'Instagram',
    consent: true, ...changes,
  };
}

async function draft(db, changes = {}) {
  const id = randomUUID();
  const owner = `hashed-${randomUUID()}`;
  const response = await rpc(db, 'recruitment_create_draft', id, owner, applicant(id, changes), `test-rate-${randomUUID()}`, 'encrypted-local-test-secret');
  return { id, owner, application: response.application };
}

async function upload(db, application, mode = 'recording', bytes = 100) {
  const id = randomUUID();
  const response = await rpc(db, 'recruitment_begin_upload', application.id, application.owner, id, mode, 'video/mp4', bytes);
  await rpc(db, 'recruitment_attach_upload', application.id, application.owner, response.upload.id, response.upload.provider, `file-${id}`, { uploadUrl: 'https://example.test/one-file-capability' });
  return { ...response.upload, id: response.upload.id };
}

function videoMetadata(bytes = 100, changes = {}) {
  return { hasVideo: true, bytes, durationSeconds: 59.8, contentType: 'video/mp4', ...changes };
}

async function verifiedDraft(db, changes = {}) {
  const application = await draft(db, changes);
  await rpc(db, 'recruitment_recording_attempt', application.id, application.owner);
  const reservation = await upload(db, application);
  await rpc(db, 'recruitment_complete_upload', application.id, application.owner, reservation.id, videoMetadata());
  return application;
}

async function submitted(db) {
  const application = await verifiedDraft(db);
  await rpc(db, 'recruitment_submit', application.id, application.owner);
  return application;
}

test('production migration preserves historical applicants and locks anonymous access', async t => {
  const db = await database(t);
  const legacy = await db.query('SELECT * FROM public.applicants');
  assert.deepEqual(legacy.rows, [{ id: legacyId, first_name: 'Histórico preservado', email: 'historico@example.test' }]);
  for (const role of ['anon', 'authenticated']) {
    const permissions = await db.query(`SELECT
      has_table_privilege($1, 'public.recruitment_applications', 'SELECT') AS read,
      has_table_privilege($1, 'public.recruitment_applications', 'INSERT') AS write,
      has_function_privilege($1, 'public.recruitment_admin_applications(uuid)', 'EXECUTE') AS admin,
      has_function_privilege($1, 'public.recruitment_create_draft(uuid,text,jsonb,text,text)', 'EXECUTE') AS draft`, [role]);
    assert.deepEqual(permissions.rows[0], { read: false, write: false, admin: false, draft: false });
  }
  const rls = await db.query(`SELECT relname FROM pg_class WHERE relnamespace='public'::regnamespace AND relname LIKE 'recruitment_%' AND relkind='r' AND NOT relrowsecurity`);
  assert.deepEqual(rls.rows, []);
  await db.exec('SET ROLE anon');
  try {
    await assert.rejects(() => db.query('SELECT * FROM public.recruitment_applications'), /permission denied/);
    await assert.rejects(() => rpc(db, 'recruitment_admin_applications'), /permission denied/);
    await assert.rejects(() => rpc(db, 'recruitment_public_config'), /permission denied/);
  } finally {
    await db.exec('RESET ROLE');
  }
  const publicConfig = await rpc(db, 'recruitment_public_config');
  assert.equal(publicConfig.available, false);
  assert.equal('questions' in publicConfig.config, false);
  assert.equal('thresholds' in publicConfig.config, false);
  assert.equal('storageProvider' in publicConfig.config, false);
});

test('closed calls, future opening, deadline, extension and minimum availability are enforced by SQL', async t => {
  const db = await database(t);
  await assert.rejects(() => draft(db), /call_closed/);
  await openCall(db, { opensAt: new Date(Date.now() + 60_000).toISOString() });
  await assert.rejects(() => draft(db), /call_not_started/);
  await openCall(db, { closesAt: new Date(Date.now() - 60_000).toISOString() });
  await assert.rejects(() => draft(db), /call_expired/);
  await openCall(db, { closesAt: new Date(Date.now() - 60_000).toISOString(), extensionAt: new Date(Date.now() + 86_400_000).toISOString() });
  const extensionDraft = await draft(db);
  assert.equal(extensionDraft.application.status, 'draft');
  const lowAvailability = await verifiedDraft(db, { availabilityHours: 1 });
  await assert.rejects(() => rpc(db, 'recruitment_submit', lowAvailability.id, lowAvailability.owner), /availability/);
  const missingAvailability = await verifiedDraft(db, { availabilityHours: null });
  await assert.rejects(() => rpc(db, 'recruitment_submit', missingAvailability.id, missingAvailability.owner), /availability/);
  const missingField = await verifiedDraft(db, { career: '' });
  await assert.rejects(() => rpc(db, 'recruitment_submit', missingField.id, missingField.owner), /incomplete/);
});

test('applications submit without the removed short case answer', async t => {
  const db = await database(t);
  await openCall(db);
  const application = await verifiedDraft(db, { shortCase: '' });
  const result = await rpc(db, 'recruitment_submit', application.id, application.owner);
  assert.equal(result.application.status, 'submitted');
});

test('submitting requires the three closing answers given after the video', async t => {
  const db = await database(t);
  await openCall(db);
  for (const field of ['showcase', 'organizations', 'referralSource']) {
    const application = await verifiedDraft(db, { [field]: '' });
    await assert.rejects(() => rpc(db, 'recruitment_submit', application.id, application.owner), /incomplete/, field);
  }
});

test('applications submit without a faculty, as institutes have none', async t => {
  const db = await database(t);
  await openCall(db);
  const application = await verifiedDraft(db, { faculty: '' });
  const result = await rpc(db, 'recruitment_submit', application.id, application.owner);
  assert.equal(result.application.status, 'submitted');
});

test('questions stay hidden until the attempt starts, then keep a stable two-plus-two snapshot', async t => {
  const db = await database(t);
  await openCall(db);
  const application = await draft(db);
  assert.deepEqual(application.application.questions, [], 'hidden before the attempt');
  assert.equal((await rpc(db, 'recruitment_admin_applications', application.id)).application.questions.length, 4, 'the admin always sees them');
  const questions = (await rpc(db, 'recruitment_recording_attempt', application.id, application.owner)).application.questions;
  assert.equal(questions.length, 4);
  assert.equal(new Set(questions.map(question => question.id)).size, 4);
  assert.equal(questions.filter(question => question.category === 'motivation').length, 2);
  assert.equal(questions.filter(question => question.category === 'collaboration').length, 2);
  await assert.rejects(() => rpc(db, 'recruitment_get_draft', application.id, 'wrong-owner'), /unauthorized/);
  await assert.rejects(() => rpc(db, 'recruitment_patch_draft', application.id, 'wrong-owner', applicant(application.id)), /unauthorized/);
  const config = await currentConfig(db);
  await rpc(db, 'recruitment_update_config', { ...config, questions: config.questions.map(question => ({ ...question, text: `EDITADO: ${question.text}` })) }, 'sesión administrativa compartida');
  const patched = await rpc(db, 'recruitment_patch_draft', application.id, application.owner, { ...application.application.data, motivation: 'Una motivación actualizada.' });
  assert.deepEqual(patched.application.questions, questions);
  const resumed = await rpc(db, 'recruitment_get_draft', application.id, application.owner);
  assert.deepEqual(resumed.application.questions, questions);
  await assert.rejects(() => rpc(db, 'recruitment_patch_draft', application.id, application.owner, { ...application.application.data, email: 'otro@example.test' }), /immutable/);
});

test('a configured applicant limit is a hard limit, including concurrent submit promises', async t => {
  const db = await database(t);
  await openCall(db, { maxApplicants: 150 });
  const first = await verifiedDraft(db);
  const second = await verifiedDraft(db);
  await db.query(`INSERT INTO public.recruitment_applications(id,token_hash,data,questions,status,submitted_at)
    SELECT gen_random_uuid(),'fixture-owner',$1::jsonb || jsonb_build_object('email','historical-seed-'||g||'@example.test'),$2::jsonb,'submitted',now()
    FROM generate_series(1,149) AS g`, [JSON.stringify(applicant()), JSON.stringify((await db.query('SELECT questions FROM recruitment_applications WHERE id=$1', [first.id])).rows[0].questions)]);
  const results = await Promise.allSettled([
    rpc(db, 'recruitment_submit', first.id, first.owner),
    rpc(db, 'recruitment_submit', second.id, second.owner),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const rejected = results.find(result => result.status === 'rejected');
  assert.match(rejected.reason.message, /capacity/);
  const count = await db.query('SELECT count(*)::integer AS total FROM recruitment_applications WHERE submitted_at IS NOT NULL');
  assert.equal(count.rows[0].total, 150);
  assert.equal((await rpc(db, 'recruitment_public_config')).available, false);
  await assert.rejects(() => draft(db), /capacity/);
  const success = results[0].status === 'fulfilled' ? first : second;
  const repeated = await rpc(db, 'recruitment_submit', success.id, success.owner);
  assert.equal(repeated.application.status, 'submitted');
  assert.equal((await db.query("SELECT count(*)::integer AS count FROM recruitment_email_outbox WHERE application_id=$1 AND template_key='submitted'", [success.id])).rows[0].count, 1);
});

test('one technical retry with new hidden questions, no file uploads, and a fresh start once attempts run out', async t => {
  const db = await database(t);
  await openCall(db);
  const application = await draft(db);
  await assert.rejects(() => upload(db, application, 'upload'), /alternate_not_allowed/);
  await assert.rejects(() => upload(db, application), /recording_required/);
  const attempt = await rpc(db, 'recruitment_recording_attempt', application.id, application.owner);
  assert.equal(attempt.application.recordingAttempts, 1);
  assert.equal(attempt.application.questions.length, 4);
  await assert.rejects(() => rpc(db, 'recruitment_recording_attempt', application.id, application.owner), /attempts_exhausted/);
  const initialUpload = await upload(db, application);
  const failed = await rpc(db, 'recruitment_technical_failure', application.id, application.owner, 'recording_failed', 'Falla técnica durante la grabación.');
  assert.deepEqual(failed.application.questions, [], 'the retry questions are hidden until it starts');
  assert.equal(failed.application.alternateAllowed, false);
  assert.equal((await db.query('SELECT status FROM recruitment_uploads WHERE id=$1', [initialUpload.id])).rows[0].status, 'failed');
  await assert.rejects(() => rpc(db, 'recruitment_technical_failure', application.id, application.owner, 'repeat', 'Otro intento.'), /attempts_exhausted/);
  await assert.rejects(() => upload(db, application), /recording_required|attempts_exhausted|recording_attempt/);
  const retry = await rpc(db, 'recruitment_recording_attempt', application.id, application.owner);
  assert.equal(retry.application.questions.length, 4);
  await assert.rejects(() => rpc(db, 'recruitment_recording_attempt', application.id, application.owner), /attempts_exhausted/);
  await assert.rejects(() => upload(db, application, 'upload'), /alternate_not_allowed/);

  // Out of attempts: discarding frees the email so the form can be filled again.
  const email = application.application.data.email;
  const discarded = await rpc(db, 'recruitment_discard_draft', application.id, application.owner);
  assert.equal(discarded.discarded, true);
  assert.equal(discarded.files.length, 1);
  assert.equal((await db.query('SELECT count(*)::integer AS n FROM recruitment_applications WHERE id=$1', [application.id])).rows[0].n, 0);
  const again = randomUUID();
  const recreated = await rpc(db, 'recruitment_create_draft', again, `hashed-${again}`, applicant(again, { email }), `rate-${again}`, 'encrypted-local-test-secret');
  assert.equal(recreated.application.data.email, email);

  const finished = await verifiedDraft(db);
  await assert.rejects(() => rpc(db, 'recruitment_discard_draft', finished.id, finished.owner), /immutable/);
  await assert.rejects(() => rpc(db, 'recruitment_discard_draft', finished.id, 'wrong-owner'), /unauthorized/);
});

test('video identity reservation cap cannot be bypassed through the technical-failure route', async t => {
  const db = await database(t);
  await openCall(db, { maxApplicants: 2 });
  const first = await draft(db);
  const second = await draft(db);
  const third = await draft(db);
  await rpc(db, 'recruitment_recording_attempt', first.id, first.owner);
  await rpc(db, 'recruitment_technical_failure', second.id, second.owner, 'camera_denied', 'La cámara no está disponible.');
  await assert.rejects(() => rpc(db, 'recruitment_recording_attempt', third.id, third.owner), /capacity/);
  await assert.rejects(() => rpc(db, 'recruitment_technical_failure', third.id, third.owner, 'camera_denied', 'La cámara no está disponible.'), /capacity/);
  const blocked = await rpc(db, 'recruitment_get_draft', third.id, third.owner);
  assert.equal(blocked.application.recordingAttempts, 0);
  assert.equal(blocked.application.technicalFailureCount, 0);
  assert.equal((await db.query('SELECT count(*)::integer AS count FROM recruitment_applications WHERE recording_attempts>0')).rows[0].count, 2);
});

test('an expired upload of a recovered video is renewed for the same attempt instead of consuming the retry', async t => {
  const db = await database(t);
  await openCall(db);
  const application = await draft(db);
  await rpc(db, 'recruitment_recording_attempt', application.id, application.owner);
  const pending = await upload(db, application);
  await db.query(`UPDATE recruitment_uploads SET expires_at=now()-interval '1 minute' WHERE id=$1`, [pending.id]);
  const renewed = await rpc(db, 'recruitment_begin_upload', application.id, application.owner, randomUUID(), 'recording', 'video/mp4', 100);
  assert.equal(renewed.upload.id, pending.id);
  const stored = (await db.query('SELECT file_id FROM recruitment_uploads WHERE id=$1', [pending.id])).rows[0].file_id;
  assert.equal(renewed.upload.fileId, stored);
  assert.equal(renewed.upload.authorization, null);
  const state = await rpc(db, 'recruitment_get_draft', application.id, application.owner);
  assert.equal(state.application.recordingAttempts, 1);
  assert.equal(state.application.technicalFailureCount, 0);
  const verified = await rpc(db, 'recruitment_complete_upload', application.id, application.owner, pending.id, videoMetadata());
  assert.equal(verified.application.video.uploadId, pending.id);
});

test('applicants sharing a campus network can each create a draft', async t => {
  const db = await database(t);
  await openCall(db);
  for (let index = 0; index < 20; index++) {
    const id = randomUUID();
    await rpc(db, 'recruitment_create_draft', id, `hashed-${id}`, applicant(id), 'shared-campus-ip', 'encrypted-local-test-secret');
  }
  await openCall(db, { draftsPerIpPerHour: 2 });
  const id = randomUUID();
  await assert.rejects(() => rpc(db, 'recruitment_create_draft', id, `hashed-${id}`, applicant(id), 'shared-campus-ip', 'encrypted-local-test-secret'), /rate_limited/);
});

test('video metadata must prove content, byte size and at most 3 min 30 s', async t => {
  const db = await database(t);
  await openCall(db);
  const application = await draft(db);
  await rpc(db, 'recruitment_recording_attempt', application.id, application.owner);
  const pending = await upload(db, application);
  const malformed = [
    {}, videoMetadata(100, { hasVideo: false }), videoMetadata(101),
    videoMetadata(100, { durationSeconds: 210.5 }), videoMetadata(100, { durationSeconds: 0 }),
    videoMetadata(100, { durationSeconds: '120' }), videoMetadata(100, { contentType: 'text/plain' }),
  ];
  for (const metadata of malformed) await assert.rejects(() => rpc(db, 'recruitment_complete_upload', application.id, application.owner, pending.id, metadata), /invalid_video/);
  const verified = await rpc(db, 'recruitment_complete_upload', application.id, application.owner, pending.id, videoMetadata(100, { durationSeconds: 209.9 }));
  assert.equal(verified.application.video.uploadId, pending.id);
  const repeated = await rpc(db, 'recruitment_complete_upload', application.id, application.owner, pending.id, videoMetadata());
  assert.equal(repeated.application.video.uploadId, pending.id);
});

test('workflow blocks backwards moves and atomically records history plus one outbox entry', async t => {
  const db = await database(t);
  await openCall(db);
  const application = await submitted(db);
  const actor = 'sesión administrativa compartida';
  await assert.rejects(() => rpc(db, 'recruitment_transition', application.id, 'draft', 'Intento inválido de regresar a borrador.', actor), /invalid_transition/);
  await assert.rejects(() => rpc(db, 'recruitment_transition', application.id, 'profile_validated', 'x', actor), /reason_required/);
  // A database failure while enqueueing must roll back the state and audit event too.
  await db.exec(`CREATE FUNCTION test_reject_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test_outbox_failure'; END $$;
    CREATE TRIGGER test_outbox_failure BEFORE INSERT ON recruitment_email_outbox FOR EACH ROW WHEN (NEW.template_key='profile_validated') EXECUTE FUNCTION test_reject_outbox();`);
  await assert.rejects(() => rpc(db, 'recruitment_transition', application.id, 'profile_validated', 'Perfil revisado por GTH.', actor), /test_outbox_failure/);
  assert.equal((await db.query('SELECT status FROM recruitment_applications WHERE id=$1', [application.id])).rows[0].status, 'submitted');
  assert.equal((await db.query("SELECT count(*)::integer AS count FROM recruitment_events WHERE application_id=$1 AND to_status='profile_validated'", [application.id])).rows[0].count, 0);
  await db.exec('DROP TRIGGER test_outbox_failure ON recruitment_email_outbox; DROP FUNCTION test_reject_outbox();');
  await rpc(db, 'recruitment_transition', application.id, 'profile_validated', 'Perfil revisado por GTH.', actor);
  await rpc(db, 'recruitment_transition', application.id, 'profile_validated', 'Reintento de la misma solicitud.', actor);
  assert.equal((await db.query("SELECT count(*)::integer AS count FROM recruitment_events WHERE application_id=$1 AND to_status='profile_validated'", [application.id])).rows[0].count, 1);
  assert.equal((await db.query("SELECT count(*)::integer AS count FROM recruitment_email_outbox WHERE application_id=$1 AND template_key='profile_validated'", [application.id])).rows[0].count, 1);
  await assert.rejects(() => rpc(db, 'recruitment_transition', application.id, 'submitted', 'Intento de regresar.', actor), /invalid_transition/);
  await assert.rejects(() => rpc(db, 'recruitment_transition', application.id, 'test_sent', 'Etapa que ya no existe.', actor), /invalid_transition/);
  const result = await rpc(db, 'recruitment_transition', application.id, 'selected', 'Etapa confirmada por el equipo responsable.', actor);
  assert.equal(result.application.status, 'selected');
  await assert.rejects(() => rpc(db, 'recruitment_transition', application.id, 'not_selected', 'Intento después del estado final.', actor), /invalid_transition/);
  await assert.rejects(() => rpc(db, 'recruitment_patch_draft', application.id, application.owner, applicant(application.id)), /immutable/);
  const detail = await rpc(db, 'recruitment_admin_applications', application.id);
  assert.equal(detail.application.history.at(-1).actor, actor);
  assert.equal(detail.application.history.at(-1).reason, 'Etapa confirmada por el equipo responsable.');
});

test('submitted applications allow direct selection and rejection with an audit event and email', async (t) => {
  const db = await database(t);
  await openCall(db);
  for (const status of ['selected', 'not_selected']) {
    const application = await submitted(db);
    const result = await rpc(db, 'recruitment_transition', application.id, status, 'Decisión directa del equipo.', 'director@example.test');
    assert.equal(result.application.status, status);
    const event = await db.query('SELECT from_status, to_status FROM recruitment_events WHERE application_id=$1 AND to_status=$2', [application.id, status]);
    assert.deepEqual(event.rows, [{ from_status: 'submitted', to_status: status }]);
    const email = await db.query('SELECT template_key FROM recruitment_email_outbox WHERE application_id=$1 AND template_key=$2', [application.id, status]);
    assert.equal(email.rows.length, 1);
  }
});

test('two stages: each result sends its own email, and only the kept emails are enabled', async t => {
  const db = await database(t);
  await openCall(db);
  const enabled = (await db.query('SELECT key FROM recruitment_email_templates WHERE enabled ORDER BY key')).rows.map((row) => row.key);
  assert.deepEqual(enabled, ['incomplete', 'not_selected', 'profile_rejected', 'profile_validated', 'resume', 'selected', 'submitted']);
  const rejected = await submitted(db);
  await rpc(db, 'recruitment_transition', rejected.id, 'profile_rejected', 'Resultado enviado: No avanza.', 'gth@uni.pe');
  await assert.rejects(() => rpc(db, 'recruitment_transition', rejected.id, 'selected', 'No corresponde.', 'gth@uni.pe'), /invalid_transition/);
  const joined = await submitted(db);
  await rpc(db, 'recruitment_transition', joined.id, 'profile_validated', 'Resultado enviado: Avanza.', 'gth@uni.pe');
  await rpc(db, 'recruitment_transition', joined.id, 'not_selected', 'Resultado enviado: No ingresa.', 'gth@uni.pe');
  const mails = async (id) => (await db.query('SELECT template_key, subject FROM recruitment_email_outbox WHERE application_id=$1 ORDER BY created_at', [id])).rows.map((row) => row.template_key);
  assert.deepEqual(await mails(rejected.id), ['resume', 'submitted', 'profile_rejected']);
  assert.deepEqual(await mails(joined.id), ['resume', 'submitted', 'profile_validated', 'not_selected']);
  assert.equal((await rpc(db, 'recruitment_admin_applications', joined.id)).application.history.at(-1).actor, 'gth@uni.pe');
});

test('emails queued for a template that was later disabled are not sent', async t => {
  const db = await database(t);
  await openCall(db);
  const application = await draft(db);
  await db.query("UPDATE recruitment_email_outbox SET status='sent' WHERE application_id=$1", [application.id]);
  await db.query("INSERT INTO recruitment_email_outbox(application_id,template_key,recipient,subject,body,payload) VALUES($1,'test_sent','a@example.test','s','b','{}'),($1,'selected','a@example.test','s','b','{}')", [application.id]);
  const leased = await rpc(db, 'recruitment_lease_emails', 10, randomUUID());
  assert.deepEqual(leased.items.map((item) => item.templateKey), ['selected']);
  assert.equal((await db.query("SELECT status FROM recruitment_email_outbox WHERE template_key='test_sent'")).rows[0].status, 'pending');
});

test('directors are added, moved and removed one at a time, with a record of each change', async t => {
  const db = await database(t);
  await rpc(db, 'recruitment_directors', [{ email: 'uno@uni.pe', area: 'ID', name: 'Uno' }], 'prueba');
  let list = await rpc(db, 'recruitment_director_save', 'Dos@UNI.pe', 'GTH', 'Dos', 'gth@uni.pe');
  assert.deepEqual(list.directors.map((d) => d.email).sort(), ['dos@uni.pe', 'uno@uni.pe']);
  list = await rpc(db, 'recruitment_director_save', 'uno@uni.pe', 'FIN', 'Uno', 'gth@uni.pe');
  assert.equal(list.directors.find((d) => d.email === 'uno@uni.pe').area, 'FIN');
  await rpc(db, 'recruitment_login_request', 'uno@uni.pe', '1'.repeat(64));
  list = await rpc(db, 'recruitment_director_remove', 'uno@uni.pe', 'gth@uni.pe');
  assert.deepEqual(list.directors.map((d) => d.email), ['dos@uni.pe']);
  assert.equal((await rpc(db, 'recruitment_login_verify', 'uno@uni.pe', '1'.repeat(64))).ok, false, 'pending codes stop working');
  await assert.rejects(() => rpc(db, 'recruitment_director_remove', 'uno@uni.pe', 'gth@uni.pe'), /not_found/);
  assert.equal((await db.query("SELECT count(*)::integer AS n FROM recruitment_config_events WHERE kind='director'")).rows[0].n, 3);
});

test('there is no applicant cap by default, and GTH can delete one application with its files', async t => {
  const db = await database(t);
  await openCall(db);
  assert.equal((await currentConfig(db)).maxApplicants, 1000000);
  const keep = await submitted(db);
  const remove = await submitted(db);
  const result = await rpc(db, 'recruitment_admin_delete', remove.id, 'gth@uni.pe');
  assert.deepEqual([result.deleted, result.files.length], [true, 1]);
  assert.equal((await db.query('SELECT count(*)::integer AS n FROM recruitment_applications WHERE id=$1', [remove.id])).rows[0].n, 0);
  assert.equal((await db.query('SELECT count(*)::integer AS n FROM recruitment_email_outbox WHERE application_id=$1', [remove.id])).rows[0].n, 0);
  assert.equal((await db.query('SELECT count(*)::integer AS n FROM recruitment_applications WHERE id=$1', [keep.id])).rows[0].n, 1);
  assert.equal((await db.query("SELECT count(*)::integer AS n FROM recruitment_config_events WHERE kind='application_deleted'")).rows[0].n, 1);
  await assert.rejects(() => rpc(db, 'recruitment_admin_delete', remove.id, 'gth@uni.pe'), /not_found/);
});

test('outbox leases are exclusive, retry with backoff and recover expired fifth leases', async t => {
  const db = await database(t);
  await openCall(db);
  const application = await draft(db);
  const firstLease = randomUUID();
  const first = await rpc(db, 'recruitment_lease_emails', 20, firstLease);
  assert.equal(first.items.length, 1);
  assert.equal(first.items[0].applicationId, application.id);
  assert.equal((await rpc(db, 'recruitment_lease_emails', 20, randomUUID())).items.length, 0);
  await assert.rejects(() => rpc(db, 'recruitment_finish_email', first.items[0].id, randomUUID(), 'provider-message-id', null), /lease_lost/);
  await assert.rejects(() => rpc(db, 'recruitment_finish_email', first.items[0].id, firstLease, null, null), /invalid_delivery/);
  await rpc(db, 'recruitment_finish_email', first.items[0].id, firstLease, null, 'Falla temporal del proveedor.');
  let row = (await db.query('SELECT status,attempts,next_attempt_at>now() AS delayed FROM recruitment_email_outbox WHERE id=$1', [first.items[0].id])).rows[0];
  assert.deepEqual(row, { status: 'pending', attempts: 1, delayed: true });
  for (let attempt = 2; attempt <= 4; attempt++) {
    await db.query('UPDATE recruitment_email_outbox SET next_attempt_at=now()-interval \'1 second\' WHERE id=$1', [first.items[0].id]);
    const lease = randomUUID();
    const leased = await rpc(db, 'recruitment_lease_emails', 20, lease);
    assert.equal(leased.items[0].attempts, attempt);
    await rpc(db, 'recruitment_finish_email', first.items[0].id, lease, null, 'Falla temporal del proveedor.');
  }
  await db.query('UPDATE recruitment_email_outbox SET next_attempt_at=now()-interval \'1 second\' WHERE id=$1', [first.items[0].id]);
  const fifth = await rpc(db, 'recruitment_lease_emails', 20, randomUUID());
  assert.equal(fifth.items[0].attempts, 5);
  // Simulate a process dying before it can confirm or reject the fifth send.
  await db.query('UPDATE recruitment_email_outbox SET leased_until=now()-interval \'1 second\' WHERE id=$1', [first.items[0].id]);
  assert.equal((await rpc(db, 'recruitment_lease_emails', 20, randomUUID())).items.length, 0);
  row = (await db.query('SELECT status FROM recruitment_email_outbox WHERE id=$1', [first.items[0].id])).rows[0];
  assert.equal(row.status, 'failed');
  const queue = await rpc(db, 'recruitment_queue');
  assert.equal('payload' in queue.queue[0], false);
  assert.equal('body' in queue.queue[0], false);
  await draft(db);
  const successfulLease = randomUUID();
  const deliverable = await rpc(db, 'recruitment_lease_emails', 20, successfulLease);
  assert.equal(deliverable.items.length, 1);
  await rpc(db, 'recruitment_finish_email', deliverable.items[0].id, successfulLease, 'confirmed-provider-message', null);
  const delivered = await db.query('SELECT status,provider_message_id,sent_at IS NOT NULL AS confirmed FROM recruitment_email_outbox WHERE id=$1', [deliverable.items[0].id]);
  assert.deepEqual(delivered.rows[0], { status: 'sent', provider_message_id: 'confirmed-provider-message', confirmed: true });
  assert.equal((await rpc(db, 'recruitment_lease_emails', 20, randomUUID())).items.length, 0);
});

test('configuration uses optimistic revisions and logs administrative changes', async t => {
  const db = await database(t);
  const original = await currentConfig(db);
  const result = await rpc(db, 'recruitment_update_config', { ...original, title: 'Convocatoria de prueba' }, 'sesión administrativa compartida');
  assert.equal(result.config.revision, original.revision + 1);
  await assert.rejects(() => rpc(db, 'recruitment_update_config', { ...original, title: 'Cambio desde una sesión anterior' }, 'sesión administrativa compartida'), /revision_conflict/);
  assert.equal((await currentConfig(db)).title, 'Convocatoria de prueba');
  const events = await db.query("SELECT actor,kind,before_value->>'title' AS before,after_value->>'title' AS after FROM recruitment_config_events");
  assert.equal(events.rows.length, 1);
  assert.equal(events.rows[0].after, 'Convocatoria de prueba');
  await assert.rejects(() => rpc(db, 'recruitment_update_config', { ...result.config, maxApplicants: 1000001 }, 'sesión administrativa compartida'), /configuration/);
});

test('unfinished drafts are reminded every few hours until they finish, opt out or the call closes', async t => {
  const db = await database(t);
  await openCall(db, { inactivityHours: 8 });
  const application = await draft(db);
  const reminders = async () => (await db.query("SELECT count(*)::integer AS count FROM recruitment_email_outbox WHERE application_id=$1 AND template_key='incomplete'", [application.id])).rows[0].count;
  assert.equal(await rpc(db, 'recruitment_expire_drafts'), 0, 'nothing before 8 hours');
  await db.query("UPDATE recruitment_applications SET updated_at=now()-interval '9 hours' WHERE id=$1", [application.id]);
  assert.equal(await rpc(db, 'recruitment_expire_drafts'), 1);
  assert.equal((await rpc(db, 'recruitment_get_draft', application.id, application.owner)).application.status, 'incomplete');
  assert.equal(await rpc(db, 'recruitment_expire_drafts'), 0, 'not again right away');
  await db.query("UPDATE recruitment_applications SET last_reminder_at=now()-interval '9 hours' WHERE id=$1", [application.id]);
  assert.equal(await rpc(db, 'recruitment_expire_drafts'), 1, 'again after another 8 hours');
  assert.equal(await reminders(), 2);
  await rpc(db, 'recruitment_unsubscribe', application.id);
  await db.query("UPDATE recruitment_applications SET last_reminder_at=now()-interval '9 hours' WHERE id=$1", [application.id]);
  assert.equal(await rpc(db, 'recruitment_expire_drafts'), 0, 'opted out');
  assert.equal((await rpc(db, 'recruitment_get_draft', application.id, application.owner)).application.remindersOff, true);
  await openCall(db, { closesAt: new Date(Date.now() - 60_000).toISOString() });
  assert.equal(await rpc(db, 'recruitment_expire_drafts'), 1);
  assert.equal((await rpc(db, 'recruitment_get_draft', application.id, application.owner)).application.status, 'expired');
  await assert.rejects(() => rpc(db, 'recruitment_patch_draft', application.id, application.owner, applicant(application.id)), /call_expired/);
});

test('GTH reminds everyone at once, and a queued reminder is dropped once the applicant finishes', async t => {
  const db = await database(t);
  await openCall(db);
  const first = await draft(db);
  const second = await draft(db);
  const optedOut = await draft(db);
  await rpc(db, 'recruitment_unsubscribe', optedOut.id);
  const done = await submitted(db);
  assert.equal(await rpc(db, 'recruitment_remind_all', 'gth@uni.pe'), 2);
  assert.equal(await rpc(db, 'recruitment_remind_all', 'gth@uni.pe'), 2, 'can be forced again');
  await db.query("UPDATE recruitment_email_outbox SET status='sent' WHERE template_key<>'incomplete'");
  const finished = await verifiedDraft(db);
  await rpc(db, 'recruitment_queue_reminder', finished.id);
  await rpc(db, 'recruitment_submit', finished.id, finished.owner);
  await db.query("UPDATE recruitment_email_outbox SET status='sent' WHERE template_key='submitted'");
  const leased = await rpc(db, 'recruitment_lease_emails', 20, randomUUID());
  const ids = new Set(leased.items.filter((item) => item.templateKey === 'incomplete').map((item) => item.applicationId));
  assert.equal(ids.has(finished.id), false, 'no reminder after finishing');
  assert.equal(ids.has(optedOut.id), false);
  assert.equal(ids.has(done.id), false);
  assert.ok(ids.has(first.id) && ids.has(second.id));
});

async function previewRpc(db, key, name, ...values) {
  return db.transaction(async tx => {
    await tx.query(`SELECT set_config('request.headers', $1, true)`, [JSON.stringify({ 'x-recruitment-preview': key })]);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
    return (await tx.query(`SELECT public.${name}(${placeholders}) AS result`, values.map(value => value !== null && typeof value === 'object' ? JSON.stringify(value) : value))).rows[0]?.result;
  });
}

test('a secret test link applies while the call is closed, flags the drafts and purges only them', async t => {
  const db = await database(t);
  const key = 'test-link-key-abcdefghijklmnop';
  const keyHash = (await db.query(`SELECT encode(sha256(convert_to($1,'UTF8')),'hex') AS h`, [key])).rows[0].h;
  await rpc(db, 'recruitment_set_preview_key', keyHash, 'prueba');
  const id = randomUUID();
  await assert.rejects(() => rpc(db, 'recruitment_create_draft', id, `hashed-${id}`, applicant(id), 'rate', 'secret'), /call_closed/);
  await assert.rejects(() => previewRpc(db, 'wrong-key-abcdefghijklmnopqr', 'recruitment_create_draft', id, `hashed-${id}`, applicant(id), 'rate', 'secret'), /call_closed/);
  assert.equal((await rpc(db, 'recruitment_public_config')).available, false);
  const shown = await previewRpc(db, key, 'recruitment_public_config');
  assert.equal(shown.available, true); assert.equal(shown.preview, true); assert.equal(shown.config.previewKeyHash, undefined);
  const created = await previewRpc(db, key, 'recruitment_create_draft', id, `hashed-${id}`, applicant(id), 'rate', 'secret');
  assert.equal(created.application.isTest, true);
  await previewRpc(db, key, 'recruitment_recording_attempt', id, `hashed-${id}`);
  // Saving the configuration from the panel keeps the link working.
  const config = await currentConfig(db);
  assert.equal(config.previewKeyHash, undefined);
  await rpc(db, 'recruitment_update_config', config, 'panel');
  assert.equal((await previewRpc(db, key, 'recruitment_public_config')).preview, true);
  await openCall(db);
  const real = await draft(db);
  assert.equal(real.application.isTest, false);
  const purged = await rpc(db, 'recruitment_purge_tests');
  assert.equal(purged.removed, 1);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM recruitment_applications')).rows[0].n, 1);
  await rpc(db, 'recruitment_set_preview_key', null, 'prueba');
  assert.equal((await previewRpc(db, key, 'recruitment_public_config')).preview, false);
});

test('directors sign in with a single-use code limited in time, attempts and requests', async t => {
  const db = await database(t);
  const h = (n) => String(n).repeat(64).slice(0, 64);
  const saved = await rpc(db, 'recruitment_directors', [{ email: 'Lenin.Castro.A@uni.pe', area: 'ID', name: 'Lenin Castro' }, { email: 'gth@uni.pe', area: 'GTH', name: '' }], 'prueba');
  assert.deepEqual(saved.directors.map(d => [d.email, d.area]), [['gth@uni.pe', 'GTH'], ['lenin.castro.a@uni.pe', 'ID']]);
  assert.deepEqual(await rpc(db, 'recruitment_login_request', 'nadie@uni.pe', h(1)), { sent: false });
  assert.equal((await rpc(db, 'recruitment_login_request', 'LENIN.castro.a@uni.pe', h(1))).sent, true);
  const wrong = await rpc(db, 'recruitment_login_verify', 'lenin.castro.a@uni.pe', h(2));
  assert.deepEqual([wrong.ok, wrong.error], [false, 'Código incorrecto.']);
  const ok = await rpc(db, 'recruitment_login_verify', 'lenin.castro.a@uni.pe', h(1));
  assert.deepEqual([ok.ok, ok.email, ok.area], [true, 'lenin.castro.a@uni.pe', 'ID']);
  assert.equal((await rpc(db, 'recruitment_login_verify', 'lenin.castro.a@uni.pe', h(1))).ok, false, 'single use');
  await rpc(db, 'recruitment_login_request', 'gth@uni.pe', h(3));
  for (let i = 0; i < 4; i++) await rpc(db, 'recruitment_login_verify', 'gth@uni.pe', h(4));
  const locked = await rpc(db, 'recruitment_login_verify', 'gth@uni.pe', h(4));
  assert.equal(locked.error, 'Demasiados intentos. Pide un código nuevo.');
  assert.equal((await rpc(db, 'recruitment_login_verify', 'gth@uni.pe', h(3))).ok, false, 'locked after 5 wrong attempts');
  for (let i = 0; i < 19; i++) await rpc(db, 'recruitment_login_request', 'gth@uni.pe', h(5));
  assert.deepEqual(await rpc(db, 'recruitment_login_request', 'gth@uni.pe', h(5)), { sent: false, limited: true });
  await db.query("update recruitment_login_codes set expires_at = now() - interval '1 second'");
  assert.equal((await rpc(db, 'recruitment_login_verify', 'gth@uni.pe', h(5))).ok, false, 'expired');
  for (const role of ['anon', 'authenticated']) {
    const r = await db.query(`select has_table_privilege($1,'public.recruitment_login_codes','SELECT') t, has_function_privilege($1,'public.recruitment_login_verify(text,text)','EXECUTE') f`, [role]);
    assert.deepEqual(r.rows[0], { t: false, f: false });
  }
});

test('extending the call reactivates expired drafts and allows them to continue and receive reminders', async t => {
  const db = await database(t);
  await openCall(db, { inactivityHours: 8, closesAt: new Date(Date.now() + 3_600_000).toISOString() });
  const app = await draft(db);
  // Call closes: application expires
  await openCall(db, { closesAt: new Date(Date.now() - 60_000).toISOString() });
  assert.equal(await rpc(db, 'recruitment_expire_drafts'), 1);
  assert.equal((await rpc(db, 'recruitment_get_draft', app.id, app.owner)).application.status, 'expired');

  // Now admin extends the deadline into the future
  await openCall(db, { extensionAt: new Date(Date.now() + 86_400_000).toISOString() });

  // Draft is reactivated to incomplete
  const resumed = await rpc(db, 'recruitment_get_draft', app.id, app.owner);
  assert.equal(resumed.application.status, 'incomplete');

  // Applicant can continue modifying the draft
  await rpc(db, 'recruitment_patch_draft', app.id, app.owner, applicant(app.id));
  assert.equal((await rpc(db, 'recruitment_get_draft', app.id, app.owner)).application.status, 'draft');

  // Inactive draft receives reminders while call is extended
  await db.query("UPDATE recruitment_applications SET updated_at=now()-interval '9 hours' WHERE id=$1", [app.id]);
  assert.equal(await rpc(db, 'recruitment_expire_drafts'), 1);
  const reminders = (await db.query("SELECT count(*)::integer AS count FROM recruitment_email_outbox WHERE application_id=$1 AND template_key='incomplete'", [app.id])).rows[0].count;
  assert.equal(reminders, 1);

  // Once call closes finally, no reminder emails or expired emails remain or get sent
  await openCall(db, { extensionAt: new Date(Date.now() - 60_000).toISOString() });
  assert.equal(await rpc(db, 'recruitment_expire_drafts'), 1);
  const pendingOutbox = (await db.query("SELECT count(*)::integer AS count FROM recruitment_email_outbox WHERE status='pending'")).rows[0].count;
  assert.equal(pendingOutbox, 0, 'no pending reminder or expired emails after close');
});


test('expired drafts stay expired before opening and reactivation is restricted to the service role', async t => {
  const db = await database(t);
  await openCall(db);
  const app = await draft(db);
  await openCall(db, { closesAt: new Date(Date.now() - 60_000).toISOString() });
  await rpc(db, 'recruitment_expire_drafts');
  await openCall(db, { opensAt: new Date(Date.now() + 3_600_000).toISOString() });
  assert.equal(await rpc(db, 'recruitment_reactivate_expired_drafts'), 0);
  assert.equal((await rpc(db, 'recruitment_get_draft', app.id, app.owner)).application.status, 'expired');
  assert.equal((await rpc(db, 'recruitment_admin_applications', app.id)).application.status, 'expired');
  await assert.rejects(() => rpc(db, 'recruitment_patch_draft', app.id, app.owner, applicant(app.id)), /call_not_started/);
  for (const role of ['anon', 'authenticated', 'service_role']) {
    const result = await db.query("SELECT has_function_privilege($1, 'public.recruitment_reactivate_expired_drafts()', 'EXECUTE') AS allowed", [role]);
    assert.equal(result.rows[0].allowed, role === 'service_role');
  }
});
