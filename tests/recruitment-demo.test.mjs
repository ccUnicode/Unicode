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
    if (rpc === 'recruitment_area_evaluation') return Response.json({ areas: [{ area: 'RRPP', closed: false }] });
    assert.equal(rpc, 'recruitment_admin_config', 'No sensitive RPC is allowed');
    return Response.json({ config });
  };
  const token = await sessionStore.createToken({ role: 'demo' });
  async function request(path, method = 'GET') {
    return route.ALL({ params: { path: `admin/${path}` }, request: new Request(`https://www.ccunicode.org/api/recruitment/admin/${path}`, { method, headers: { Authorization: `Bearer ${token}`, Origin: 'https://www.ccunicode.org', 'Content-Type': 'application/json' }, ...(method === 'GET' ? {} : { body: '{}' }) }) });
  }
  const list = await (await request('applications')).json();
  assert.equal(list.applications.length, 56);
  const outcome = await (await request(`applications/${list.applications[0].id}/decision`)).json();
  assert.equal(outcome.rejectionLabel, 'Pasar a RRPP · 2.ª opción');
  assert.ok(list.applications.every(a => a.data.email.endsWith('@example.invalid')));
  assert.equal((await (await request('config')).json()).config.title, config.title);
  const realId = '11111111-1111-4111-8111-111111111111';
  for (const suffix of [realId, `${realId}/video`, `${realId}/decision`]) assert.equal((await request(`applications/${suffix}`)).status, 404);
  for (const path of ['config', 'directors', 'process-emails', 'remind-all', 'purge-tests', 'preview-link', `applications/${realId}/transition`, `applications/${realId}/delete`]) assert.equal((await request(path, 'POST')).status, 403);
  await request('queue'); await request('directors');
  const req = new Request('https://www.ccunicode.org/api/admin-applicants', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal((await (await applicantsRoute.GET({ request: req })).json()).total, 35);
  const metrics = await (await metricsRoute.GET({ request: req })).json();
  assert.equal(metrics.areas.reduce((sum, area) => sum + area.first, 0), 35);
  assert.equal(metrics.areas.reduce((sum, area) => sum + area.second, 0), 35);
  const secondReq = new Request('https://www.ccunicode.org/api/admin-applicants?area=ID&option=second', { headers: { Authorization: `Bearer ${token}` } });
  const second = await (await applicantsRoute.GET({ request: secondReq })).json();
  assert.equal(second.total, 1);
  assert.equal(second.data[0].evaluation_choice, 2);
  assert.equal(second.data[0].evaluation_area, 'ID');
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

test('director area closures cannot target another area; decision scope and snapshot reach SQL', async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const rpc = new URL(String(url)).pathname.split('/').at(-1);
    const args = JSON.parse(init.body);
    calls.push({ rpc, args });
    if (rpc === 'recruitment_transition') return Response.json({ application: {}, transferred: true });
    assert.equal(rpc, 'recruitment_area_evaluation');
    return Response.json({ areas: [{ area: 'ID', closed: true }] });
  };
  const token = await sessionStore.createToken({ role: 'director', area: 'ID', email: 'id@example.invalid' });
  async function request(path, method, data) {
    return route.ALL({ params: { path: `admin/${path}` }, request: new Request(`https://www.ccunicode.org/api/recruitment/admin/${path}`, { method, headers: { Authorization: `Bearer ${token}`, Origin: 'https://www.ccunicode.org', 'Content-Type': 'application/json' }, body: JSON.stringify(data) }) });
  }
  assert.equal((await request('area-evaluation', 'PUT', { area: 'GTH', closed: true })).status, 403);
  assert.equal(calls.length, 0);
  assert.equal((await request('area-evaluation', 'PUT', { area: 'ID', closed: true })).status, 200);
  assert.equal(calls[0].args.p_actor, 'id@example.invalid');
  assert.equal((await request('applications/11111111-1111-4111-8111-111111111111/transition', 'POST', { status: 'not_selected', reason: 'No encaja con el área.', expectedStatus: 'submitted', expectedChoice: 1 })).status, 200);
  assert.equal(calls[1].args.p_scope_area, 'ID');
  assert.equal(calls[1].args.p_expected_choice, 1);
  assert.equal(calls[1].args.p_expected_status, 'submitted');
  assert.equal((await request('applications/11111111-1111-4111-8111-111111111111/transition', 'POST', { status: 'not_selected', reason: 'Ficha sin versión.' })).status, 400);
  assert.equal(calls.length, 2);
});


test('directors view every area while lists include only first-choice or already-transferred applicants', async () => {
  const { demoApplications } = await server.ssrLoadModule('/src/lib/recruitment/demo.ts');
  const applications = demoApplications(config).applications.map(a => ({ ...a, video: a.video ? { ...a.video, provider: 'drive' } : null }));
  globalThis.fetch = async (url, init) => {
    const rpc = new URL(String(url)).pathname.split('/').at(-1);
    if (rpc === 'recruitment_admin_config') return Response.json({ config });
    if (rpc === 'recruitment_admin_applications') {
      const { p_id } = JSON.parse(init.body);
      return Response.json(p_id ? { application: applications.find(a => a.id === p_id) } : { applications });
    }
    if (rpc === 'recruitment_area_evaluation') return Response.json({ areas: [{ area: 'ID', closed: false }, { area: 'GTH', closed: false }] });
    throw new Error(`Unexpected RPC ${rpc}`);
  };
  const token = await sessionStore.createToken({ role: 'director', area: 'ID', email: 'id@example.invalid' });
  const request = path => new Request(`https://www.ccunicode.org${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const list = await (await applicantsRoute.GET({ request: request('/api/admin-applicants') })).json();
  assert.equal(list.total, 35);
  const idList = await (await applicantsRoute.GET({ request: request('/api/admin-applicants?area=ID') })).json();
  assert.equal(idList.total, 5); assert.ok(idList.data.every(a => a.evaluation_area === 'ID'));
  assert.equal(idList.data.filter(a => a.evaluation_choice === 1).length, 4);
  assert.equal(idList.data.filter(a => a.evaluation_choice === 2).length, 1);
  assert.ok(idList.data.every(a => a.first_choice_area === 'ID' || a.evaluation_choice === 2));
  const preferenceOnly = applications.find(a => a.submittedAt && a.data.secondChoiceArea === 'ID' && a.evaluationChoice === 1);
  assert.ok(preferenceOnly); assert.ok(!idList.data.some(a => a.id === preferenceOnly.id));
  assert.equal((await applicantsRoute.GET({ request: request('/api/admin-applicants?area=GTH') })).status, 200);
  const metrics = await (await metricsRoute.GET({ request: request('/api/admin-metrics') })).json();
  assert.equal(metrics.totals.submitted, 35); assert.equal(metrics.areas.length, 7);
  const other = applications.find(a => a.evaluationArea === 'GTH' && a.video);
  const response = await route.ALL({ params: { path: `admin/applications/${other.id}/video` }, request: request(`/api/recruitment/admin/applications/${other.id}/video`) });
  assert.equal(response.status, 200);
  const areas = await (await route.ALL({ params: { path: 'admin/area-evaluation' }, request: request('/api/recruitment/admin/area-evaluation') })).json();
  assert.deepEqual(areas.areas.map(a => a.area), ['ID', 'GTH']);
  const gthToken = await sessionStore.createToken({ role: 'director', area: 'GTH', email: 'gth@example.invalid' });
  const gthReq = new Request('https://www.ccunicode.org/api/admin-applicants', { headers: { Authorization: `Bearer ${gthToken}` } });
  assert.equal((await (await applicantsRoute.GET({ request: gthReq })).json()).total, 35);
});


test('decision button outcome follows second-choice availability and never offers a third handoff', async () => {
  const { demoApplications } = await server.ssrLoadModule('/src/lib/recruitment/demo.ts');
  const application = demoApplications(config).applications[0];
  let closed = false; let enabled = true; let choice = 1;
  globalThis.fetch = async (url) => {
    const rpc = new URL(String(url)).pathname.split('/').at(-1);
    if (rpc === 'recruitment_admin_config') return Response.json({ config: { ...config, areas: [{ id: 'RRPP', name: 'Relaciones Públicas', enabled, quota: null }] } });
    if (rpc === 'recruitment_admin_applications') return Response.json({ application: { ...application, evaluationChoice: choice } });
    if (rpc === 'recruitment_area_evaluation') return Response.json({ areas: [{ area: 'RRPP', closed }] });
    throw new Error(`Unexpected read ${rpc}`);
  };
  const service = await server.ssrLoadModule('/src/lib/recruitment/service.ts');
  assert.deepEqual(await service.decisionPreview(application.id), { transferAvailable: true, rejectionLabel: 'Pasar a RRPP · 2.ª opción' });
  closed = true;
  assert.deepEqual(await service.decisionPreview(application.id), { transferAvailable: false, rejectionLabel: 'No ingresa a UNICODE' });
  closed = false; enabled = false;
  assert.equal((await service.decisionPreview(application.id)).transferAvailable, false);
  enabled = true; choice = 2;
  assert.equal((await service.decisionPreview(application.id)).transferAvailable, false);
});

test('area preferences remain unchanged after rejection, selection or a second-choice transfer', async () => {
  const { demoApplications } = await server.ssrLoadModule('/src/lib/recruitment/demo.ts');
  let applications = demoApplications(config).applications;
  globalThis.fetch = async url => {
    const rpc = new URL(String(url)).pathname.split('/').at(-1);
    if (rpc === 'recruitment_admin_config') return Response.json({ config });
    assert.equal(rpc, 'recruitment_admin_applications');
    return Response.json({ applications });
  };
  const token = await sessionStore.createToken({ role: 'admin' });
  const request = new Request('https://www.ccunicode.org/api/admin-metrics', { headers: { Authorization: `Bearer ${token}` } });
  const before = await (await metricsRoute.GET({ request })).json();
  const original = applications.map(a => a.submittedAt ? { ...a, evaluationChoice: 1, evaluationArea: a.data.firstChoiceArea } : a);
  applications = original;
  const initial = await (await metricsRoute.GET({ request })).json();
  const transferred = applications.find(a => a.submittedAt && a.data.firstChoiceArea !== a.data.secondChoiceArea);
  applications = applications.map(a => a.id === transferred.id ? { ...a, evaluationChoice: 2, evaluationArea: a.data.secondChoiceArea } : a);
  const moved = await (await metricsRoute.GET({ request })).json();
  for (const area of initial.evaluationCounts) {
    const delta = area.id === transferred.data.firstChoiceArea ? -1 : area.id === transferred.data.secondChoiceArea ? 1 : 0;
    assert.equal(moved.evaluationCounts.find(row => row.id === area.id).count, area.count + delta);
  }
  assert.deepEqual(moved.areas, initial.areas);
  const filtered = await (await applicantsRoute.GET({ request: new Request('https://www.ccunicode.org/api/admin-applicants?area=GTH&option=first', { headers: { Authorization: `Bearer ${token}` } }) })).json();
  assert.deepEqual(filtered.evaluationCounts, moved.evaluationCounts);
  assert.equal(before.areas.reduce((sum, area) => sum + area.first, 0), before.totals.submitted);
  for (const status of ['profile_rejected', 'not_selected', 'selected', 'submitted']) {
    applications = applications.map(a => a.submittedAt ? { ...a, status, evaluationChoice: 2, evaluationArea: a.data.secondChoiceArea } : a);
    const after = await (await metricsRoute.GET({ request })).json();
    assert.deepEqual(after.areas, before.areas);
    assert.deepEqual(after.referral, before.referral);
    assert.deepEqual(after.universities, before.universities);
    assert.deepEqual(after.daily, before.daily);
    assert.equal(after.totals.submitted, before.totals.submitted);
  }
});

test('metrics API applies the configured deadline and extension without changing submission totals', async () => {
  const { demoApplications } = await server.ssrLoadModule('/src/lib/recruitment/demo.ts');
  const applications = demoApplications(config).applications;
  let extensionAt = null;
  globalThis.fetch = async url => {
    const rpc = new URL(String(url)).pathname.split('/').at(-1);
    if (rpc === 'recruitment_admin_config') return Response.json({ config: { ...config, enabled: true, opensAt: '2026-10-01T05:00:00Z', closesAt: '2026-10-11T05:00:00Z', extensionAt } });
    assert.equal(rpc, 'recruitment_admin_applications');
    return Response.json({ applications });
  };
  const token = await sessionStore.createToken({ role: 'admin' });
  const request = new Request('https://www.ccunicode.org/api/admin-metrics', { headers: { Authorization: `Bearer ${token}` } });
  const response = await metricsRoute.GET({ request });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const metrics = await response.json();
  assert.equal(metrics.enabled, true);
  assert.equal(metrics.daily.at(-1).day, '2026-10-10');
  assert.equal(metrics.totals.submitted, 35);
  assert.equal(metrics.daily.reduce((sum, day) => sum + day.count, 0), 35);
  extensionAt = '2026-10-12T05:00:00Z';
  const extended = await (await metricsRoute.GET({ request })).json();
  assert.equal(extended.closesAt, extensionAt);
  assert.equal(extended.daily.at(-1).day, '2026-10-11');
});
