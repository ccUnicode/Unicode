import assert from 'node:assert/strict';
import test from 'node:test';
import { chooseRecordingMime, isAllowedUploadUrl } from '../src/scripts/recruitment-form.ts';

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
