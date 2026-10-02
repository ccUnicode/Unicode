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
    const format = general?.Format || '';
    const contentType = /WebM|Matroska/i.test(format) ? 'video/webm' : /MPEG-4|QuickTime/i.test(format) ? 'video/mp4' : '';
    // Browser recordings carry no Duration element, and a header can understate the length:
    // for WebM also measure the last frame timestamp and keep the longest value.
    if (contentType === 'video/webm') durations.push(webmFrameDuration(bytes));
    const duration = Math.max(...durations.filter((value) => Number.isFinite(value) && value > 0));
    if (!video || !contentType || !Number.isFinite(duration) || duration <= 0) {
      throw new Error('No se pudo verificar un video válido con duración finita.');
    }
    return { bytes: bytes.byteLength, durationSeconds: duration, contentType, hasVideo: true };
  } finally { info.close(); }
}

const EBML_SEGMENT = 0x18538067, EBML_INFO = 0x1549a966, EBML_CLUSTER = 0x1f43b675, EBML_BLOCK_GROUP = 0xa0;
const EBML_TIMECODE_SCALE = 0x2ad7b1, EBML_CLUSTER_TIMECODE = 0xe7, EBML_SIMPLE_BLOCK = 0xa3, EBML_BLOCK = 0xa1;

/**
 * Seconds up to the last frame of a WebM, read from cluster and block timestamps.
 * Scans linearly, so the unknown-size Segment and Clusters written by MediaRecorder work.
 */
export function webmFrameDuration(bytes: Uint8Array): number {
  const vint = (at: number, keepMarker: boolean): { value: number; length: number; unknown: boolean } | null => {
    const first = bytes[at];
    if (first === undefined || first === 0) return null;
    const length = Math.clz32(first) - 23;
    if (length > 8 || at + length > bytes.length) return null;
    let value = keepMarker ? first : first & (0xff >> length);
    let allOnes = value === (0xff >> length);
    for (let index = 1; index < length; index++) { value = value * 256 + bytes[at + index]; allOnes &&= bytes[at + index] === 0xff; }
    return { value, length, unknown: !keepMarker && allOnes };
  };
  const unsigned = (from: number, size: number) => { let value = 0; for (let index = 0; index < size; index++) value = value * 256 + bytes[from + index]; return value; };
  let scale = 1_000_000; let cluster = 0; let last = -Infinity; let position = 0;
  while (position < bytes.length) {
    const id = vint(position, true); if (!id) break;
    const size = vint(position + id.length, false); if (!size) break;
    const start = position + id.length + size.length;
    // Descend into containers; their children are read by the same loop.
    if ([EBML_SEGMENT, EBML_INFO, EBML_CLUSTER, EBML_BLOCK_GROUP].includes(id.value)) { position = start; continue; }
    if (size.unknown || start + size.value > bytes.length) break;
    if (id.value === EBML_TIMECODE_SCALE) scale = unsigned(start, size.value);
    else if (id.value === EBML_CLUSTER_TIMECODE) cluster = unsigned(start, size.value);
    else if (id.value === EBML_SIMPLE_BLOCK || id.value === EBML_BLOCK) {
      const track = vint(start, false);
      if (track && size.value >= track.length + 2) {
        const relative = new DataView(bytes.buffer, bytes.byteOffset + start + track.length, 2).getInt16(0);
        last = Math.max(last, cluster + relative);
      }
    }
    position = start + size.value;
  }
  return Number.isFinite(last) && last > 0 ? last * scale / 1e9 : NaN;
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
