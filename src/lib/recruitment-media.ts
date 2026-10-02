/** Validate actual server-downloaded bytes, never applicant-supplied duration or MIME. */
import mediaInfoFactory from 'mediainfo.js';
import { createRequire } from 'node:module';

export interface VideoMetadata { bytes: number; durationSeconds: number; contentType: string; hasVideo: boolean }

export async function inspectVideoBytes(bytes: Uint8Array): Promise<VideoMetadata> {
  if (!bytes.byteLength || bytes.byteLength > 50 * 1024 * 1024) throw new Error('Tamaño de video no permitido.');
  const require = createRequire(import.meta.url);
  const wasmPath = require.resolve('mediainfo.js/MediaInfoModule.wasm');
  const info = await mediaInfoFactory({ format: 'object', locateFile: () => wasmPath });
  try {
    const result = await info.analyzeData(bytes.byteLength, (size, offset) => bytes.subarray(offset, offset + size));
    const tracks = result.media?.track || [];
    const video = tracks.find((track) => track['@type'] === 'Video');
    const general = tracks.find((track) => track['@type'] === 'General');
    // An audio track can outlast the picture. Enforce the entire file's playback length.
    const durations = tracks.filter((track) => ['General', 'Video', 'Audio'].includes(track['@type']))
      .map((track) => Number('Duration' in track ? track.Duration : undefined)).filter((value) => Number.isFinite(value) && value > 0);
    const duration = Math.max(...durations);
    const format = general?.Format || '';
    const contentType = /WebM|Matroska/i.test(format) ? 'video/webm' : /MPEG-4|QuickTime/i.test(format) ? 'video/mp4' : '';
    if (!video || !contentType || !Number.isFinite(duration) || duration <= 0) {
      throw new Error('No se pudo verificar un video válido con duración finita.');
    }
    return { bytes: bytes.byteLength, durationSeconds: duration, contentType, hasVideo: true };
  } finally { info.close(); }
}

export async function boundedVideoDownload(response: Response, maximum = 50 * 1024 * 1024): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new Error('No se pudo leer el archivo de video.');
  if (Number(response.headers.get('content-length')) > maximum) throw new Error('El archivo supera el límite permitido.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maximum) { await reader.cancel(); throw new Error('El archivo supera el límite permitido.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
