import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false } });
after(() => server.close());
const validation = await server.ssrLoadModule('/src/lib/recruitment/validation.ts');
const media = await server.ssrLoadModule('/src/lib/recruitment-media.ts');

test('server derives duration from WebM bytes without the optional Duration header', async () => {
  const bytes = Buffer.from(await readFile(new URL('./fixtures/recruitment-short.webm', import.meta.url)));
  const position = bytes.indexOf(Buffer.from([0x44, 0x89, 0x88]));
  assert.ok(position >= 0, 'The test fixture must contain a Duration element to remove.');
  // Void the complete 11-byte Duration element without changing any offsets.
  // Browser MediaRecorder produces WebM streams without this optional header.
  bytes.set([0xec, 0x89, 0, 0, 0, 0, 0, 0, 0, 0, 0], position);
  const metadata = await media.inspectVideoBytes(new Uint8Array(bytes));
  assert.equal(metadata.contentType, 'video/webm');
  assert.equal(metadata.hasVideo, true);
  assert.ok(Number.isFinite(metadata.durationSeconds) && metadata.durationSeconds >= 0.9 && metadata.durationSeconds < 1.3);
});

test('draft fields are normalized and cannot override questions, attempts or a verified video', () => {
  const input = {
    firstName: ' Ana ', lastName: ' Pérez ', email: ' ANA@EXAMPLE.INVALID ', consent: true,
    phone: '999 999 999', semester: '0', admissionTerm: '2024-2', availabilityHours: 0,
    questions: [{ text: 'Choose my own question' }], video: { durationSeconds: 1 }, recordingAttempts: 0,
  };
  const data = validation.validateApplicationData(input, undefined, true);
  assert.equal(data.firstName, 'Ana'); assert.equal(data.email, 'ana@example.invalid');
  assert.equal(data.phone, '999999999'); assert.equal(data.semester, '0');
  for (const property of ['questions', 'video', 'recordingAttempts']) assert.equal(Object.hasOwn(data, property), false);
  assert.throws(() => validation.validateApplicationData({ ...input, availabilityHours: Infinity }, undefined, true));
  assert.throws(() => validation.validateApplicationData({ ...input, email: 'ana@example.invalid\r\nBcc: other@example.invalid' }, undefined, true));
  assert.throws(() => validation.validateApplicationData({ ...input, admissionTerm: '2024-3' }, undefined, true));
  assert.throws(() => validation.validateApplicationData({ ...input, consent: 'true' }, undefined, true));
});

const configuration = () => ({
  enabled: false, title: 'Local validation', opensAt: null, closesAt: null, extensionAt: null,
  maxApplicants: 150, minAvailabilityHours: null, maxVideoSeconds: 210, maxVideoBytes: 50 * 1024 * 1024,
  questionsPerCategory: 2, preparationSeconds: 45, inactivityHours: 24, shortCasePrompt: 'Describe cómo abordarías el caso.',
  storageProvider: 'drive', revision: 1, thresholds: { affinity: null, written: null, video: null },
  areas: ['ID', 'RRPP', 'GTH', 'ACD', 'DCC', 'LGE', 'FIN'].map(id => ({ id, name: id, enabled: false, quota: null })),
  questions: ['motivation', 'collaboration'].flatMap(category => [1, 2].map(number => ({ id: `${category}-${number}`, category, text: `Pregunta ${number}`, enabled: true }))),
  videoRubric: ['clarity', 'motivation', 'collaboration'].map(id => ({ id, label: id, low: 'Bajo', medium: 'Medio', high: 'Alto', maxScore: 5 })),
});

test('administration cannot weaken the agreed 3 min 30 s, two questions or 150 applicants', () => {
  validation.validateConfig(configuration());
  for (const change of [{ maxVideoSeconds: 211 }, { maxVideoSeconds: 150 }, { maxVideoBytes: 51 * 1024 * 1024 }, { questionsPerCategory: 1 }, { maxApplicants: 1_000_001 }]) {
    assert.throws(() => validation.validateConfig({ ...configuration(), ...change }));
  }
  const duplicate = configuration(); duplicate.questions[1].id = duplicate.questions[0].id;
  assert.throws(() => validation.validateConfig(duplicate));
  const missingCategory = configuration(); missingCategory.questions[0].enabled = false;
  assert.throws(() => validation.validateConfig(missingCategory));
});

test('opening requires explicit dates and an enabled area, not a minimum availability; dates need timezone', () => {
  assert.throws(() => validation.validateConfig({ ...configuration(), enabled: true }));
  const opening = { ...configuration(), enabled: true, opensAt: '2026-10-01T00:00:00-05:00', closesAt: '2026-10-31T23:59:59-05:00', minAvailabilityHours: null };
  opening.areas[0].enabled = true;
  assert.equal(validation.validateConfig(opening).opensAt, '2026-10-01T05:00:00.000Z');
  assert.equal(validation.validateConfig(opening).minAvailabilityHours, 0);
  for (const change of [{ opensAt: '2026-10-01T00:00:00' }, { closesAt: '2026-09-01T00:00:00-05:00' }, { extensionAt: '2026-10-02T00:00:00-05:00' }]) {
    assert.throws(() => validation.validateConfig({ ...opening, ...change }));
  }
});

test('email templates reject header injection and personal links outside draft messages', () => {
  const template = { key: 'submitted', enabled: true, subject: 'Tu postulación', body: 'Hola {{firstName}}.' };
  validation.validateTemplates({ templates: [template] });
  assert.throws(() => validation.validateTemplates({ templates: [{ ...template, subject: 'Mensaje\r\nBcc: other@example.invalid' }] }));
  assert.throws(() => validation.validateTemplates({ templates: [{ ...template, body: '{{resumeUrl}}' }] }));
  assert.throws(() => validation.validateTemplates({ templates: [{ ...template, body: '{{secret}}' }] }));
});

test('Finanzas is a valid application area and is added to configs saved before it existed', () => {
  const saved = configuration(); saved.areas = saved.areas.filter(area => area.id !== 'FIN');
  const completed = validation.withAllAreas(saved);
  assert.deepEqual(completed.areas.at(-1), { id: 'FIN', name: 'Finanzas', enabled: true, quota: null });
  validation.validateConfig(completed);
  assert.equal(validation.validateApplicationData({ firstName: 'A', lastName: 'B', email: 'a@b.pe', consent: true, firstChoiceArea: 'FIN' }, undefined, true).firstChoiceArea, 'FIN');
});
