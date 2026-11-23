import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
});

after(() => server.close());

const callService = await server.ssrLoadModule('/src/lib/cms/call-service.ts');

test('normalizeCallPublicSettings returns full fallback when rawSettings is empty or null', () => {
  const fromNull = callService.normalizeCallPublicSettings(null);
  assert.ok(fromNull.title);
  assert.ok(Array.isArray(fromNull.scheduleStages));
  assert.ok(Array.isArray(fromNull.areaRequirements));
  assert.equal(fromNull.enabled, true);

  const fromUndefined = callService.normalizeCallPublicSettings(undefined);
  assert.equal(fromUndefined.title, fromNull.title);
});

test('normalizeCallPublicSettings extracts root and nested publicCall parameters', () => {
  const raw = {
    enabled: false,
    title: 'Convocatoria 2026-I Test',
    opensAt: '2026-03-01T00:00:00-05:00',
    closesAt: '2026-03-15T23:59:59-05:00',
    extensionAt: '2026-03-18T23:59:59-05:00',
    publicCall: {
      subtitle: 'Subtítulo personalizado',
      heroDescription: 'Descripción de prueba',
      registrationUrl: '/postular-test',
      scheduleStages: [
        {
          id: 'test-stage-1',
          title: 'Etapa 1',
          startDate: '2026-03-01T00:00:00-05:00',
          endDate: '2026-03-05T23:59:59-05:00',
          status: 'completed',
          order: 1,
        },
      ],
      areaRequirements: [
        {
          areaId: 'ID',
          name: 'Investigación y Desarrollo',
          description: 'Área tech',
          requirements: ['Req 1'],
          profiles: ['Perfil 1'],
          enabled: true,
        },
      ],
    },
  };

  const normalized = callService.normalizeCallPublicSettings(raw);
  assert.equal(normalized.enabled, false);
  assert.equal(normalized.title, 'Convocatoria 2026-I Test');
  assert.equal(normalized.opensAt, '2026-03-01T00:00:00-05:00');
  assert.equal(normalized.closesAt, '2026-03-15T23:59:59-05:00');
  assert.equal(normalized.extensionAt, '2026-03-18T23:59:59-05:00');
  assert.equal(normalized.subtitle, 'Subtítulo personalizado');
  assert.equal(normalized.heroDescription, 'Descripción de prueba');
  assert.equal(normalized.registrationUrl, '/postular-test');
  assert.equal(normalized.scheduleStages.length, 1);
  assert.equal(normalized.scheduleStages[0].id, 'test-stage-1');
  assert.equal(normalized.areaRequirements.length, 1);
  assert.equal(normalized.areaRequirements[0].areaId, 'ID');
});

test('updateCallPublicConfig validates RBAC permissions correctly', async () => {
  const unauthorizedEditor = {
    id: 'user-delegate',
    email: 'delegado@ccunicode.org',
    role: 'editor',
    areaScope: 'GTH',
    canPublish: false,
  };

  await assert.rejects(
    async () => {
      await callService.updateCallPublicConfig(
        { settings: { enabled: true }, reason: 'Apertura' },
        unauthorizedEditor
      );
    },
    (err) => {
      assert.equal(err.code, 'FORBIDDEN_AREA');
      assert.equal(err.status, 403);
      return true;
    }
  );

  const wrongAreaDirector = {
    id: 'user-director-id',
    email: 'director.id@ccunicode.org',
    role: 'approver',
    areaScope: 'ID',
    canPublish: true,
  };

  await assert.rejects(
    async () => {
      await callService.updateCallPublicConfig(
        { settings: { enabled: true }, reason: 'Apertura' },
        wrongAreaDirector
      );
    },
    (err) => {
      assert.equal(err.code, 'FORBIDDEN_AREA');
      assert.equal(err.status, 403);
      return true;
    }
  );
});

test('updateCallPublicConfig requires a non-empty audit reason', async () => {
  const gthDirector = {
    id: 'user-director-gth',
    email: 'director.gth@ccunicode.org',
    role: 'approver',
    areaScope: 'GTH',
    canPublish: true,
  };

  await assert.rejects(
    async () => {
      await callService.updateCallPublicConfig(
        { settings: { enabled: true }, reason: '   ' },
        gthDirector
      );
    },
    (err) => {
      assert.equal(err.code, 'VALIDATION_ERROR');
      assert.equal(err.status, 422);
      return true;
    }
  );
});

test('CmsCallServiceError correctly formats codes and statuses', () => {
  const error = new callService.CmsCallServiceError(
    'CONCURRENCY_CONFLICT',
    'Versión desactualizada',
    409,
    { revision: 2 }
  );

  assert.equal(error.name, 'CmsCallServiceError');
  assert.equal(error.code, 'CONCURRENCY_CONFLICT');
  assert.equal(error.status, 409);
  assert.equal(error.details.revision, 2);
});
