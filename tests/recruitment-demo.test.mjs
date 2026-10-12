import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, define: {
  'import.meta.env.ADMIN_PASSWORD': JSON.stringify('test-admin-secret'),
} });
const saved = { ...process.env };
process.env.ADMIN_DEMO_PASSWORD = 'test-demo-secret';
process.env.PUBLIC_SUPABASE_URL = 'https://demo-test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-secret';
delete process.env.RECRUITMENT_LOCAL_DB_PATH;
const originalFetch = globalThis.fetch;
after(() => { globalThis.fetch = originalFetch; for (const key of ['ADMIN_DEMO_PASSWORD', 'PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RECRUITMENT_LOCAL_DB_PATH']) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } return server.close(); });
const { sessionStore } = await server.ssrLoadModule('/src/lib/session-store.ts');
const route = await server.ssrLoadModule('/src/pages/api/recruitment/[...path].ts');
const applicantsRoute = await server.ssrLoadModule('/src/pages/api/admin-applicants.ts');
const metricsRoute = await server.ssrLoadModule('/src/pages/api/admin-metrics.ts');
const config = { areas: [], questions: [], title: 'Configuración real', opensAt: null, closesAt: null };

test('demo never reads production applications, queue or directors and blocks all mutations', async () => {
  const calls = [];
  globalThis.fetch = async url => {
    const rpc = new URL(String(url)).pathname.split('/').at(-1);
    calls.push(rpc);
    assert.equal(rpc, 'recruitment_admin_config', 'No sensitive RPC is allowed');
    return Response.json({ config });
  };
  const token = await sessionStore.createToken({ role: 'demo' });
  async function request(path, method = 'GET') {
    return route.ALL({ params: { path: `admin/${path}` }, request: new Request(`https://www.ccunicode.org/api/recruitment/admin/${path}`, { method, headers: { Authorization: `Bearer ${token}`, Origin: 'https://www.ccunicode.org', 'Content-Type': 'application/json' }, ...(method === 'GET' ? {} : { body: '{}' }) }) });
  }
  const list = await (await request('applications')).json();
  assert.equal(list.applications.length, 56);
  assert.ok(list.applications.every(a => a.data.email.endsWith('@example.invalid')));
  assert.equal((await (await request('config')).json()).config.title, config.title);
  const realId = '11111111-1111-4111-8111-111111111111';
  for (const suffix of [realId, `${realId}/video`]) assert.equal((await request(`applications/${suffix}`)).status, 404);
  for (const path of ['config', 'directors', 'process-emails', 'remind-all', 'purge-tests', 'preview-link', `applications/${realId}/transition`, `applications/${realId}/delete`]) assert.equal((await request(path, 'POST')).status, 403);
  await request('queue'); await request('directors');
  const req = new Request('https://www.ccunicode.org/api/admin-applicants', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal((await (await applicantsRoute.GET({ request: req })).json()).total, 35);
  assert.equal((await metricsRoute.GET({ request: req })).status, 200);
  assert.ok(calls.length > 0);
});

test('rotating or disabling demo password revokes existing demo sessions', async () => {
  const token = await sessionStore.createToken({ role: 'demo' });
  assert.deepEqual(await sessionStore.verify(token), { role: 'demo' });
  process.env.ADMIN_DEMO_PASSWORD = 'rotated-demo-secret';
  assert.equal(await sessionStore.verify(token), null);
  delete process.env.ADMIN_DEMO_PASSWORD;
  assert.equal(await sessionStore.verify(token), null);
  process.env.ADMIN_DEMO_PASSWORD = 'test-demo-secret';
});
