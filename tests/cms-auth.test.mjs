import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
});

after(() => server.close());

const authModule = await server.ssrLoadModule('/src/lib/cms/auth.ts');
const clientModule = await server.ssrLoadModule('/src/lib/cms/client.ts');

test('mapDbRoleToAppRole maps database roles to application roles correctly', () => {
  // admin: role admin, canPublish true
  const admin = authModule.mapDbRoleToAppRole('admin');
  assert.equal(admin.role, 'admin');
  assert.equal(admin.canPublish, true);

  // dcc: role approver, canPublish true
  const dcc = authModule.mapDbRoleToAppRole('dcc');
  assert.equal(dcc.role, 'approver');
  assert.equal(dcc.canPublish, true);

  // director: role approver, canPublish true
  const director = authModule.mapDbRoleToAppRole('director');
  assert.equal(director.role, 'approver');
  assert.equal(director.canPublish, true);

  // delegate: role editor, canPublish false
  const delegate = authModule.mapDbRoleToAppRole('delegate');
  assert.equal(delegate.role, 'editor');
  assert.equal(delegate.canPublish, false);
});

test('getAuthCookieOptions enforces HTTP-Only, Lax and 7-day duration', () => {
  const options = authModule.getAuthCookieOptions();
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, 'lax');
  assert.equal(options.path, '/');
  assert.equal(options.maxAge, 7 * 24 * 60 * 60);
});

test('CMS_AUTH_COOKIES contains standard cookie keys', () => {
  assert.equal(authModule.CMS_AUTH_COOKIES.ACCESS_TOKEN, 'sb-access-token');
  assert.equal(authModule.CMS_AUTH_COOKIES.REFRESH_TOKEN, 'sb-refresh-token');
});

test('setAuthCookies sets access and refresh tokens with correct options', () => {
  const cookieJar = new Map();
  const mockCookies = {
    set(name, value, options) {
      cookieJar.set(name, { value, options });
    },
    delete(name, options) {
      cookieJar.delete(name);
    },
    get(name) {
      return cookieJar.get(name);
    },
  };

  authModule.setAuthCookies(mockCookies, 'test-access-token', 'test-refresh-token');

  assert.ok(cookieJar.has('sb-access-token'));
  assert.equal(cookieJar.get('sb-access-token').value, 'test-access-token');
  assert.equal(cookieJar.get('sb-access-token').options.httpOnly, true);

  assert.ok(cookieJar.has('sb-refresh-token'));
  assert.equal(cookieJar.get('sb-refresh-token').value, 'test-refresh-token');
  assert.equal(cookieJar.get('sb-refresh-token').options.httpOnly, true);

  // Clear cookies
  authModule.clearAuthCookies(mockCookies);
  assert.equal(cookieJar.has('sb-access-token'), false);
  assert.equal(cookieJar.has('sb-refresh-token'), false);
});

test('cmsResponse and cmsError produce standardized JSON envelopes', async () => {
  const resSuccess = clientModule.cmsResponse({ message: 'ok' }, 200);
  assert.equal(resSuccess.status, 200);
  const dataSuccess = await resSuccess.json();
  assert.equal(dataSuccess.success, true);
  assert.equal(dataSuccess.data.message, 'ok');
  assert.ok(dataSuccess.meta?.timestamp);

  const resError = clientModule.cmsError('UNAUTHORIZED', 'No autorizado', 401);
  assert.equal(resError.status, 401);
  const dataError = await resError.json();
  assert.equal(dataError.success, false);
  assert.equal(dataError.error.code, 'UNAUTHORIZED');
  assert.equal(dataError.error.message, 'No autorizado');
});
