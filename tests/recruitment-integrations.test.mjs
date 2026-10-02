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
const { sessionStore } = await server.ssrLoadModule('/src/lib/session-store.ts');
const layout = await server.ssrLoadModule('/src/lib/recruitment-email-layout.ts');
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
  const originalDateNow = Date.now; try { Date.now = () => originalDateNow() + 5 * 60 * 60 * 1000; assert.equal(await sessionStore.isValid(token), false); } finally { Date.now = originalDateNow; }
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
