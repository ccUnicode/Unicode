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
  const missingField = await verifiedDraft(db, { faculty: '' });
  await assert.rejects(() => rpc(db, 'recruitment_submit', missingField.id, missingField.owner), /incomplete/);
});

test('ownership and stable two-plus-two question snapshots survive bank edits and form resume', async t => {
  const db = await database(t);
  await openCall(db);
  const application = await draft(db);
  const questions = application.application.questions;
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

test('150 completed applicants is a hard limit, including concurrent submit promises', async t => {
  const db = await database(t);
  await openCall(db);
  const first = await verifiedDraft(db);
  const second = await verifiedDraft(db);
  await db.query(`INSERT INTO public.recruitment_applications(id,token_hash,data,questions,status,submitted_at)
    SELECT gen_random_uuid(),'fixture-owner',$1::jsonb || jsonb_build_object('email','historical-seed-'||g||'@example.test'),$2::jsonb,'submitted',now()
    FROM generate_series(1,149) AS g`, [JSON.stringify(applicant()), JSON.stringify(first.application.questions)]);
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

test('recording permits one technical retry and fallback requires a recorded failure', async t => {
  const db = await database(t);
  await openCall(db);
  const application = await draft(db);
  await assert.rejects(() => upload(db, application, 'upload'), /alternate_not_allowed/);
  await assert.rejects(() => upload(db, application), /recording_required/);
  const attempt = await rpc(db, 'recruitment_recording_attempt', application.id, application.owner);
  assert.equal(attempt.application.recordingAttempts, 1);
  await assert.rejects(() => rpc(db, 'recruitment_recording_attempt', application.id, application.owner), /attempts_exhausted/);
  const initialUpload = await upload(db, application);
  await rpc(db, 'recruitment_technical_failure', application.id, application.owner, 'recording_failed', 'Falla técnica durante la grabación.');
  assert.equal((await db.query('SELECT status FROM recruitment_uploads WHERE id=$1', [initialUpload.id])).rows[0].status, 'failed');
  await assert.rejects(() => rpc(db, 'recruitment_technical_failure', application.id, application.owner, 'repeat', 'Otro intento.'), /attempts_exhausted/);
  // A replacement recording requires consuming the single retry first.
  await assert.rejects(() => upload(db, application), /recording_required|attempts_exhausted|recording_attempt/);
  await rpc(db, 'recruitment_recording_attempt', application.id, application.owner);
  await assert.rejects(() => rpc(db, 'recruitment_recording_attempt', application.id, application.owner), /attempts_exhausted/);
  const retry = await upload(db, application);
  await rpc(db, 'recruitment_complete_upload', application.id, application.owner, retry.id, videoMetadata());
  await assert.rejects(() => upload(db, application), /immutable/);

  const fallback = await draft(db);
  await rpc(db, 'recruitment_technical_failure', fallback.id, fallback.owner, 'camera_denied', 'No se pudo usar la cámara.');
  const alternateUpload = await upload(db, fallback, 'upload');
  const state = await rpc(db, 'recruitment_get_draft', fallback.id, fallback.owner);
  assert.equal(state.application.recordingAttempts, 2);
  assert.equal(state.application.alternateAllowed, false);
  const sameUpload = await rpc(db, 'recruitment_begin_upload', fallback.id, fallback.owner, randomUUID(), 'upload', 'video/mp4', 100);
  assert.equal(sameUpload.upload.id, alternateUpload.id);
  await rpc(db, 'recruitment_complete_upload', fallback.id, fallback.owner, alternateUpload.id, videoMetadata());
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

test('video metadata must prove content, byte size and at most 60 seconds', async t => {
  const db = await database(t);
  await openCall(db);
  const application = await draft(db);
  await rpc(db, 'recruitment_recording_attempt', application.id, application.owner);
  const pending = await upload(db, application);
  const malformed = [
    {}, videoMetadata(100, { hasVideo: false }), videoMetadata(101),
    videoMetadata(100, { durationSeconds: 61 }), videoMetadata(100, { durationSeconds: 0 }),
    videoMetadata(100, { durationSeconds: '60' }), videoMetadata(100, { contentType: 'text/plain' }),
  ];
  for (const metadata of malformed) await assert.rejects(() => rpc(db, 'recruitment_complete_upload', application.id, application.owner, pending.id, metadata), /invalid_video/);
  const verified = await rpc(db, 'recruitment_complete_upload', application.id, application.owner, pending.id, videoMetadata());
  assert.equal(verified.application.video.uploadId, pending.id);
  const repeated = await rpc(db, 'recruitment_complete_upload', application.id, application.owner, pending.id, videoMetadata());
  assert.equal(repeated.application.video.uploadId, pending.id);
});

test('workflow blocks stage skipping and backwards moves and atomically records history plus one outbox entry', async t => {
  const db = await database(t);
  await openCall(db);
  const application = await submitted(db);
  const actor = 'sesión administrativa compartida';
  await assert.rejects(() => rpc(db, 'recruitment_transition', application.id, 'selected', 'Resultado acordado por el equipo.', actor), /invalid_transition/);
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
  for (const status of ['test_sent', 'test_completed', 'awaiting_second_review', 'interview_eligible', 'interview_scheduled', 'interviewed', 'group_eligible', 'group_scheduled', 'group_completed', 'waitlisted', 'conditional_selected', 'selected', 'onboarding_sent', 'buddy_assigned', 'integrated']) {
    const result = await rpc(db, 'recruitment_transition', application.id, status, 'Etapa confirmada por el equipo responsable.', actor);
    assert.equal(result.application.status, status);
  }
  await assert.rejects(() => rpc(db, 'recruitment_transition', application.id, 'selected', 'Intento después del estado final.', actor), /invalid_transition/);
  await assert.rejects(() => rpc(db, 'recruitment_patch_draft', application.id, application.owner, applicant(application.id)), /immutable/);
  const detail = await rpc(db, 'recruitment_admin_applications', application.id);
  assert.equal(detail.application.history.at(-1).actor, actor);
  assert.equal(detail.application.history.at(-1).reason, 'Etapa confirmada por el equipo responsable.');
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
  await assert.rejects(() => rpc(db, 'recruitment_update_config', { ...result.config, maxApplicants: 151 }, 'sesión administrativa compartida'), /configuration/);
});

test('inactive drafts receive one reminder and incomplete drafts expire at the final deadline', async t => {
  const db = await database(t);
  await openCall(db, { inactivityHours: 1 });
  const application = await draft(db);
  await db.query('UPDATE recruitment_applications SET updated_at=now()-interval \'2 hours\' WHERE id=$1', [application.id]);
  assert.equal(await rpc(db, 'recruitment_expire_drafts'), 1);
  assert.equal((await rpc(db, 'recruitment_get_draft', application.id, application.owner)).application.status, 'incomplete');
  assert.equal(await rpc(db, 'recruitment_expire_drafts'), 0);
  assert.equal((await db.query("SELECT count(*)::integer AS count FROM recruitment_email_outbox WHERE application_id=$1 AND template_key='incomplete'", [application.id])).rows[0].count, 1);
  await openCall(db, { closesAt: new Date(Date.now() - 60_000).toISOString() });
  assert.equal(await rpc(db, 'recruitment_expire_drafts'), 1);
  assert.equal((await rpc(db, 'recruitment_get_draft', application.id, application.owner)).application.status, 'expired');
  assert.equal((await db.query("SELECT count(*)::integer AS count FROM recruitment_email_outbox WHERE application_id=$1 AND template_key='expired'", [application.id])).rows[0].count, 1);
  await assert.rejects(() => rpc(db, 'recruitment_patch_draft', application.id, application.owner, applicant(application.id)), /call_expired/);
});
