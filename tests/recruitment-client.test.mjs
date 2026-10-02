import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseRecordingMime, isAllowedUploadUrl } from '../src/scripts/recruitment-form.ts';
import { careerSuggestions, facultySuggestions, matchUniversities } from '../src/scripts/study-combobox.ts';

test('candidate upload capability only accepts the Google resumable upload endpoint', () => {
  assert.equal(isAllowedUploadUrl('https://www.googleapis.com/upload/drive/v3/files/file-id?upload_id=session-token', 'drive'), true);
  for (const url of [
    'https://www.googleapis.com.evil.example/upload/drive/v3/files?upload_id=x',
    'https://www.googleapis.com/drive/v3/files?upload_id=x',
    'https://www.googleapis.com/upload/drive/v3/files-evil?upload_id=x',
    'https://www.googleapis.com/upload/drive/v3/files/file-id',
    'http://www.googleapis.com/upload/drive/v3/files?upload_id=x',
    'https://user:password@www.googleapis.com/upload/drive/v3/files?upload_id=x',
  ]) assert.equal(isAllowedUploadUrl(url, 'drive'), false, url);
});

test('candidate Supabase uploads require a private signed upload URL', () => {
  assert.equal(isAllowedUploadUrl('https://project-ref.supabase.co/storage/v1/object/upload/sign/recruitment-videos/file.webm?token=signed-token', 'supabase'), true);
  for (const url of [
    'https://project-ref.supabase.co.evil.example/storage/v1/object/upload/sign/bucket/file?token=x',
    'https://project-ref.supabase.co/storage/v1/object/public/bucket/file?token=x',
    'https://project-ref.supabase.co/storage/v1/object/upload/sign/bucket/file',
    'https://example.com/storage/v1/object/upload/sign/bucket/file?token=x',
  ]) assert.equal(isAllowedUploadUrl(url, 'supabase'), false, url);
});

test('recording format detection supports browsers that only record MP4', () => {
  assert.equal(chooseRecordingMime({ isTypeSupported: type => type === 'video/mp4' }), 'video/mp4');
});

test('recording format detection selects supported WebM and reports unavailable recording', () => {
  assert.equal(chooseRecordingMime({ isTypeSupported: type => type === 'video/webm;codecs=vp8,opus' }), 'video/webm;codecs=vp8,opus');
  assert.equal(chooseRecordingMime({ isTypeSupported: () => false }), null);
});

test('university suggestions match acronyms, accents and partial words', () => {
  assert.equal(matchUniversities('UNI')[0].name, 'Universidad Nacional de Ingeniería');
  assert.equal(matchUniversities('san marcos')[0].hint, 'UNMSM');
  assert.equal(matchUniversities('catolica del peru')[0].hint, 'PUCP');
  assert.deepEqual(matchUniversities('zzz'), []);
});

test('faculty and career suggestions follow the chosen place of study and never block other values', () => {
  assert.ok(facultySuggestions('UNI').some(f => f.hint === 'FIIS'));
  assert.ok(facultySuggestions('Universidad Nacional de Ingeniería').length >= 11);
  assert.deepEqual(facultySuggestions('Instituto que no conocemos'), []);
  assert.ok(careerSuggestions('UNI', 'FIIS').some(c => c.name === 'Ingeniería de Software'));
  assert.ok(careerSuggestions('Universidad del Pacífico', '').some(c => c.name === 'Ingeniería de la Información'));
  assert.ok(careerSuggestions('Otro lugar', '').length > 100);
});
