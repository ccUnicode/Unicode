import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

// No real cloud account or email is contacted by this suite.
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false },
  define: { 'import.meta.env.ADMIN_PASSWORD': JSON.stringify('local-test-secret-without-production-access') } });
after(() => server.close());
const media = await server.ssrLoadModule('/src/lib/recruitment-media.ts');
const storage = await server.ssrLoadModule('/src/lib/recruitment-storage.ts');
const email = await server.ssrLoadModule('/src/lib/recruitment-email.ts');
const google = await server.ssrLoadModule('/src/lib/recruitment-google.ts');
const { sessionStore, managesRecruitment } = await server.ssrLoadModule('/src/lib/session-store.ts');
const layout = await server.ssrLoadModule('/src/lib/recruitment-email-layout.ts');
const tickets = await server.ssrLoadModule('/src/lib/video-ticket.ts');
const optOut = await server.ssrLoadModule('/src/lib/unsubscribe.ts');
const fixture = async (name) => new Uint8Array(await readFile(new URL(`./fixtures/${name}`, import.meta.url)));
const applicationId = '11111111-1111-4111-8111-111111111111';
const uploadId = '22222222-2222-4222-8222-222222222222';
const identity = { provider: 'drive', fileId: 'private-test-file', applicationId, uploadId };
const originalFetch = globalThis.fetch;
const saved = new Map();
function configure(values) {
  for (const [key, value] of Object.entries(values)) { if (!saved.has(key)) saved.set(key, process.env[key]); process.env[key] = value; }
}
after(() => { globalThis.fetch = originalFetch; for (const [key, value] of saved) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });

test('actual MP4 and WebM bytes yield trusted duration, size and container', async () => {
  for (const [name, type] of [['recruitment-short.mp4', 'video/mp4'], ['recruitment-short.webm', 'video/webm']]) {
    const bytes = await fixture(name); const result = await media.inspectVideoBytes(bytes);
    assert.equal(result.bytes, bytes.length); assert.equal(result.contentType, type);
    assert.equal(result.hasVideo, true); assert.ok(result.durationSeconds >= 0.9 && result.durationSeconds < 1.3);
  }
  const long = await media.inspectVideoBytes(await fixture('recruitment-long.mp4'));
  assert.ok(long.durationSeconds > 60, 'Server must see the overlong file even if the client claims one second.');
  const audioOverhang = await media.inspectVideoBytes(await fixture('recruitment-audio-overhang.mp4'));
  assert.ok(audioOverhang.durationSeconds > 60, 'An overlong audio track must not bypass the limit through a short video track.');
});
test('Chrome MediaRecorder WebM without any Duration element is measured from its frame timestamps', async () => {
  const result = await media.inspectVideoBytes(await fixture('recruitment-chrome-recorder.webm'));
  assert.equal(result.contentType, 'video/webm');
  assert.ok(result.durationSeconds > 2 && result.durationSeconds < 3.2, `duration ${result.durationSeconds}`);
});

test('invalid bytes and audio-only files cannot masquerade as video', async () => {
  await assert.rejects(media.inspectVideoBytes(new TextEncoder().encode('not a video')), /verificar/);
  await assert.rejects(media.inspectVideoBytes(await fixture('recruitment-audio.m4a')), /verificar/);
  await assert.rejects(media.inspectVideoBytes(new Uint8Array()), /Tamaño/);
});
test('downloads are bounded with and without a Content-Length header', async () => {
  await assert.rejects(media.boundedVideoDownload(new Response('123456', { headers: { 'Content-Length': '6' } }), 5), /límite/);
  await assert.rejects(media.boundedVideoDownload(new Response('123456'), 5), /límite/);
  assert.equal((await media.boundedVideoDownload(new Response('12345'), 5)).length, 5);
});
test('administrative sessions reject tampered payloads, signatures and expired tokens', async () => {
  const token = await sessionStore.createToken(); assert.equal(await sessionStore.isValid(token), true);
  const [payload, signature] = token.split('.');
  assert.equal(await sessionStore.isValid(`${btoa(JSON.stringify({ expiresAt: Date.now() + 99999999 }))}.${signature}`), false);
  assert.equal(await sessionStore.isValid(`${payload}.${signature.slice(0, 63)}0`), signature.endsWith('0'));
  assert.equal(await sessionStore.isValid(`${payload}.invalid`), false);
  const originalDateNow = Date.now; try { Date.now = () => originalDateNow() + 47 * 60 * 60 * 1000; assert.equal(await sessionStore.isValid(token), true, 'still valid after a day'); Date.now = () => originalDateNow() + 49 * 60 * 60 * 1000; assert.equal(await sessionStore.isValid(token), false); } finally { Date.now = originalDateNow; }
});
test('Drive upload capabilities contain no account token and retry the same private file', async () => {
  configure({ GOOGLE_CLIENT_ID: 'local-client', GOOGLE_CLIENT_SECRET: 'local-secret', GOOGLE_REFRESH_TOKEN: 'local-refresh', DRIVE_VIDEO_FOLDER_ID: 'private-folder' });
  let creates = 0;
  globalThis.fetch = async (url, init = {}) => {
    if (String(url) === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'account-token-must-stay-server-side', expires_in: 3600 });
    const headers = new Headers(init.headers); assert.equal(headers.get('authorization'), 'Bearer account-token-must-stay-server-side');
    if (String(url).includes('/upload/drive/')) return new Response(null, { headers: { location: 'https://www.googleapis.com/upload/drive/v3/files/private-test-file?upload_id=test-session' } });
    if (init.method === 'POST') { creates++; const body = JSON.parse(init.body); assert.deepEqual(body.parents, ['private-folder']); assert.equal(body.appProperties.applicationId, applicationId); return Response.json({ id: identity.fileId }); }
    return Response.json({ parents: ['private-folder'], appProperties: { applicationId, uploadId }, size: '0', trashed: false });
  };
  try {
    const input = { provider: 'drive', applicationId, uploadId, mode: 'recording', contentType: 'video/webm', expectedBytes: 100, maxBytes: 200, maxSeconds: 60 };
    const first = await storage.createVideoUpload(input); const second = await storage.createVideoUpload({ ...input, existingFileId: first.fileId });
    assert.equal(creates, 1); assert.equal(second.fileId, first.fileId); assert.equal(first.resumable, true);
    assert.ok(!JSON.stringify(first).includes('account-token'));
    await assert.rejects(google.googleRequest('https://attacker.invalid/drive'), /no permitido/);
  } finally { globalThis.fetch = originalFetch; }
});
test('Drive metadata ownership is checked before playback, download or deletion', async () => {
  globalThis.fetch = async () => Response.json({ parents: ['other-folder'], appProperties: { applicationId, uploadId }, size: '100', trashed: false });
  try { await assert.rejects(storage.inspectVideo(identity), /no pertenece/); await assert.rejects(storage.getVideoPlayback(identity), /no pertenece/); await assert.rejects(storage.deleteVideo(identity), /no pertenece/); }
  finally { globalThis.fetch = originalFetch; }
});
test('email retry uses a stable provider idempotency key and needs a delivery identifier', async () => {
  configure({ RECRUITMENT_EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'local-key', RECRUITMENT_EMAIL_FROM: 'Recruitment <recruitment@example.invalid>' });
  const request = { to: 'test@example.invalid', subject: 'Local test', text: 'test', html: '<p>test</p>', idempotencyKey: 'recruitment-test-job' };
  const seen = [];
  globalThis.fetch = async (url, init) => { assert.equal(url, 'https://api.resend.com/emails'); seen.push(new Headers(init.headers).get('Idempotency-Key')); return Response.json({ id: 'message-test' }); };
  try {
    assert.equal((await email.sendRecruitmentEmail(request)).messageId, 'message-test');
    await email.sendRecruitmentEmail(request); assert.deepEqual(seen, ['recruitment-test-job', 'recruitment-test-job']);
    globalThis.fetch = async () => Response.json({}); await assert.rejects(email.sendRecruitmentEmail(request), /no confirmó/);
    await assert.rejects(email.sendRecruitmentEmail({ ...request, subject: 'bad\r\nBcc: other@example.invalid' }), /inválido/);
  } finally { globalThis.fetch = originalFetch; }
});

test('emails turn the personal link into a button and escape template text', () => {
  const url = 'https://www.ccunicode.org/postular#id=1&token=a_b';
  const html = layout.renderRecruitmentEmailHtml({ subject: 'Continúa', text: `Hola <Ana>, guarda este enlace personal para continuar tu postulación: ${url}. No lo compartas.`, actionUrl: url, siteUrl: 'https://www.ccunicode.org/' });
  assert.match(html, /Hola &lt;Ana&gt;, guarda este enlace personal para continuar tu postulación\.<\/p>/);
  assert.match(html, /<a href="https:\/\/www\.ccunicode\.org\/postular#id=1&amp;token=a_b"[^>]*>Continuar mi postulación<\/a>/);
  assert.match(html, />No lo compartas\.<\/p>/);
  assert.match(html, /src="https:\/\/www\.ccunicode\.org\/email\/logo\.png"/);
  assert.doesNotMatch(layout.renderRecruitmentEmailHtml({ subject: 's', text: 'Sin enlace', siteUrl: 'https://x.test' }), /Continuar mi postulación/);
});

test('sessions carry the director area; only GTH and the shared password manage the call', async () => {
  const director = await sessionStore.verify(await sessionStore.createToken({ role: 'director', email: 'lenin.castro.a@uni.pe', area: 'ID', name: 'Lenín Castro' }));
  assert.deepEqual(director, { role: 'director', email: 'lenin.castro.a@uni.pe', area: 'ID', name: 'Lenín Castro' });
  assert.equal(managesRecruitment(director), false);
  assert.equal(managesRecruitment(await sessionStore.verify(await sessionStore.createToken({ role: 'director', email: 'g@uni.pe', area: 'GTH' }))), true);
  assert.deepEqual(await sessionStore.verify(await sessionStore.createToken()), { role: 'admin' });
  const [payload, signature] = (await sessionStore.createToken({ role: 'director', email: 'x@uni.pe', area: 'ID' })).split('.');
  const forged = btoa(JSON.stringify({ ...JSON.parse(atob(payload)), area: 'GTH' }));
  assert.equal(await sessionStore.verify(`${forged}.${signature}`), null);
});

test('video links are bound to one application and expire', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const ticket = await tickets.createVideoTicket(id);
  assert.equal(await tickets.verifyVideoTicket(id, ticket), true);
  assert.equal(await tickets.verifyVideoTicket('22222222-2222-4222-8222-222222222222', ticket), false);
  assert.equal(await tickets.verifyVideoTicket(id, ticket.replace(/.$/, (c) => (c === '0' ? '1' : '0'))), false);
  assert.equal(await tickets.verifyVideoTicket(id, ticket, Date.now() + 3 * 60 * 60 * 1000), false);
  assert.equal(await tickets.verifyVideoTicket(id, null), false);
});

test('sign-in codes get their own box in the email', () => {
  const html = layout.renderRecruitmentEmailHtml({ subject: 'Tu código de acceso a UNICODE', text: 'Hola Ana, este es tu código:\n\n042517\n\nVence en 10 minutos.', code: '042517', siteUrl: 'https://www.ccunicode.org' });
  assert.match(html, /letter-spacing:8px;[^"]*">042517<\/p>/);
  assert.match(html, />Vence en 10 minutos\.<\/p>/);
});

test('when Resend hits its limit the same email goes out through Gmail, with the reply address', async () => {
  configure({ RECRUITMENT_EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'local-key', RECRUITMENT_EMAIL_FROM: 'UNICODE <convocatoria@example.invalid>', RECRUITMENT_EMAIL_REPLY_TO: 'equipo@example.invalid',
    GOOGLE_CLIENT_ID: 'local-client', GOOGLE_CLIENT_SECRET: 'local-secret', GOOGLE_REFRESH_TOKEN: 'local-refresh' });
  const request = { to: 'test@example.invalid', subject: 'Prueba', text: 'hola', html: '<p>hola</p>', idempotencyKey: 'recruitment-fallback' };
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push(String(url));
    if (String(url) === 'https://api.resend.com/emails') { assert.equal(JSON.parse(init.body).reply_to, 'equipo@example.invalid'); return new Response('{}', { status: 429 }); }
    if (String(url).startsWith('https://oauth2.googleapis.com')) return Response.json({ access_token: 'local-access', expires_in: 3600 });
    const raw = Buffer.from(JSON.parse(init.body).raw, 'base64url').toString();
    assert.match(raw, /\r\nReply-To: equipo@example\.invalid\r\n/);
    return Response.json({ id: 'gmail-message' });
  };
  try {
    assert.equal((await email.sendRecruitmentEmail(request)).messageId, 'gmail-message');
    const hosts = calls.map((u) => new URL(u).hostname);
    assert.deepEqual([hosts[0], hosts.at(-1)], ['api.resend.com', 'gmail.googleapis.com']);
  } finally { globalThis.fetch = originalFetch; }
});

test('reminder opt-out links are signed per application and shown at the bottom of the email', async () => {
  const id = '33333333-3333-4333-8333-333333333333';
  const url = new URL(await optOut.unsubscribeUrl('https://www.ccunicode.org', id));
  assert.equal(url.pathname, `/api/recruitment/unsubscribe/${id}`);
  assert.equal(await optOut.verifyUnsubscribe(id, url.searchParams.get('t')), true);
  assert.equal(await optOut.verifyUnsubscribe('44444444-4444-4444-8444-444444444444', url.searchParams.get('t')), false);
  assert.equal(await optOut.verifyUnsubscribe(id, 'f'.repeat(40)), false);
  const html = layout.renderRecruitmentEmailHtml({ subject: 'Recordatorio', text: 'Hola', siteUrl: 'https://www.ccunicode.org', unsubscribeUrl: url.toString() });
  assert.match(html, />Dejar de recibir recordatorios o retirar postulación<\/a>/);
});


test('area priority always precedes arrival order, including newest-first views', async () => {
  const { compareApplicationOrder } = await server.ssrLoadModule('/src/lib/recruitment-application-order.ts');
  const rows = [
    { id: 'second-old', firstChoiceArea: 'GTH', arrivedAt: '2026-10-01T10:00:00Z' },
    { id: 'first-new', firstChoiceArea: 'ID', arrivedAt: '2026-10-03T10:00:00Z' },
    { id: 'first-old', firstChoiceArea: 'ID', arrivedAt: '2026-10-02T10:00:00Z' },
    { id: 'second-new', firstChoiceArea: 'GTH', arrivedAt: '2026-10-04T10:00:00Z' },
  ];
  assert.deepEqual([...rows].sort((a, b) => compareApplicationOrder(a, b, 'ID')).map(a => a.id), ['first-old', 'first-new', 'second-old', 'second-new']);
  assert.deepEqual([...rows].sort((a, b) => compareApplicationOrder(a, b, 'ID', true)).map(a => a.id), ['first-new', 'first-old', 'second-new', 'second-old']);
  assert.deepEqual([...rows].sort((a, b) => compareApplicationOrder(a, b, '')).map(a => a.id), ['second-old', 'first-old', 'first-new', 'second-new']);
});

test('extension messages request only missing steps and use the approved footer', async () => {
  const { extensionPendingSteps, extensionEmailText } = await server.ssrLoadModule('/src/lib/recruitment-extension-email.ts');
  const data = { firstName: 'Prueba', lastName: 'Local', email: 'test@example.test', phone: '999999999', university: 'UNI', career: 'Sistemas', admissionTerm: '2023-1', semester: '0', firstChoiceArea: 'ID', availabilityHours: 0, motivation: 'Aprender', consent: true, showcase: 'Proyecto', organizations: 'Ninguna', referralSource: 'Instagram' };
  const confirmOnly = ['Confirma el envío de tu postulación al finalizar.'];
  assert.deepEqual(extensionPendingSteps({ data, hasVideo: true }), confirmOnly);
  const missingVideo = extensionPendingSteps({ data, hasVideo: false });
  assert.equal(missingVideo.length, 2); assert.match(missingVideo[0], /video/);
  const missingData = extensionPendingSteps({ data: { ...data, phone: '' }, hasVideo: true });
  assert.match(missingData[0], /teléfono/); assert.ok(!missingData.some(step => step.includes('video')));
  const text = extensionEmailText({ firstName: 'Prueba', steps: missingVideo, resumeUrl: 'https://www.ccunicode.org/postular', deadlineLabel: 'sábado 10 de octubre, a las 23:59' });
  assert.match(text, /sábado 10 de octubre, a las 23:59/); assert.ok(!text.includes('Esperamos contar contigo'));
  const html = layout.renderRecruitmentEmailHtml({ subject: 'Ampliación', text, siteUrl: 'https://www.ccunicode.org' });
  assert.match(html, /Centro Cultural Unicode · FIIS UNI/); assert.ok(!html.includes('Estudiantil de Ingeniería'));
});


test('mail processing waits without leasing messages until the configured release time', async () => {
  configure({ PUBLIC_SUPABASE_URL: 'https://queue-test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-only-service-key', RESEND_API_KEY: 'local-key', RECRUITMENT_EMAIL_FROM: 'test@example.invalid' });
  const service = await server.ssrLoadModule('/src/lib/recruitment/service.ts');
  let pauseUntil = new Date(Date.now() + 60_000).toISOString();
  const calls = [];
  globalThis.fetch = async (url) => {
    const name = new URL(String(url)).pathname.split('/').at(-1);
    calls.push(name);
    if (name === 'recruitment_expire_drafts') return Response.json(0);
    if (name === 'recruitment_admin_config') return Response.json({ config: { areas: [], storageProvider: 'drive', emailPausedUntil: pauseUntil } });
    if (name === 'recruitment_lease_emails') return Response.json({ items: [] });
    if (name === 'recruitment_queue') return Response.json({ queue: [] });
    throw new Error('Unexpected request in pause test');
  };
  try {
    const paused = await service.processEmails();
    assert.equal(paused.skipped, true); assert.equal(paused.resumeAt, pauseUntil);
    assert.equal(paused.processed, 0); assert.ok(!calls.includes('recruitment_lease_emails'));
    assert.ok(!calls.includes('recruitment_expire_drafts'));
    pauseUntil = new Date(Date.now() - 60_000).toISOString();
    const resumed = await service.processEmails();
    assert.equal(resumed.processed, 0); assert.ok(calls.includes('recruitment_lease_emails'));
  } finally { globalThis.fetch = originalFetch; }
});

test('private playback returns the verified duration without scanning the stored video again', async () => {
  configure({ PUBLIC_SUPABASE_URL: 'https://queue-test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-only-service-key' });
  const service = await server.ssrLoadModule('/src/lib/recruitment/service.ts');
  let reads = 0;
  globalThis.fetch = async url => {
    assert.equal(new URL(String(url)).pathname.split('/').at(-1), 'recruitment_admin_applications');
    reads++;
    return Response.json({ application: { video: { provider: 'drive', durationSeconds: 147.25 } } });
  };
  try {
    const result = await service.adminVideo(applicationId);
    assert.equal(result.durationSeconds, 147.25);
    assert.equal(reads, 1);
    const link = new URL(result.url, 'https://www.ccunicode.org');
    assert.equal(await tickets.verifyVideoTicket(applicationId, link.searchParams.get('t')), true);
  } finally { globalThis.fetch = originalFetch; }
});
