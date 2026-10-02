/** Private interchangeable video storage. Google OAuth never leaves the server. */
import { createClient } from '@supabase/supabase-js';
import { googleConfigured, googleRequest } from './recruitment-google';
import { boundedVideoDownload, inspectVideoBytes } from './recruitment-media';

type Provider = 'drive' | 'supabase';
interface Identity { provider: Provider; fileId: string; applicationId: string; uploadId: string }
interface UploadInput { provider: Provider; applicationId: string; uploadId: string; mode: string; contentType: string; expectedBytes: number; maxBytes: number; maxSeconds: number; existingFileId?: string | null; origin?: string }
const env = (name: string) => import.meta.env[name] || process.env[name];
const folder = () => env('DRIVE_VIDEO_FOLDER_ID');
const bucket = () => env('RECRUITMENT_VIDEO_BUCKET') || 'recruitment-videos';
const canonicalPath = (applicationId: string, uploadId: string, mime: string) => `${applicationId}/${uploadId}.${mime.startsWith('video/mp4') ? 'mp4' : 'webm'}`;

function storageClient() {
  const url = env('PUBLIC_SUPABASE_URL'); const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Almacenamiento Supabase pendiente de configuración.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function videoStorageConfigured(provider: Provider): boolean {
  return provider === 'drive' ? googleConfigured() && Boolean(folder()) : Boolean(env('PUBLIC_SUPABASE_URL') && env('SUPABASE_SERVICE_ROLE_KEY'));
}

export async function createVideoUpload(input: UploadInput) {
  if (!/^[0-9a-f-]{36}$/i.test(input.applicationId) || !/^[0-9a-f-]{36}$/i.test(input.uploadId)) throw new Error('Referencia de video inválida.');
  if (!/^video\/(webm|mp4)(;.*)?$/.test(input.contentType) || !Number.isInteger(input.expectedBytes) || input.expectedBytes <= 0 || input.expectedBytes > input.maxBytes) throw new Error('Archivo no permitido.');
  const contentType = input.contentType.split(';')[0];
  const path = canonicalPath(input.applicationId, input.uploadId, contentType);
  if (input.provider === 'supabase') {
    const { data, error } = await storageClient().storage.from(bucket()).createSignedUploadUrl(path, { upsert: false });
    if (error || !data) throw new Error('No se pudo autorizar la subida privada.');
    return { provider: 'supabase' as const, fileId: path, uploadUrl: data.signedUrl, method: 'PUT' as const, headers: { 'Content-Type': contentType }, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), resumable: false };
  }
  if (!folder()) throw new Error('Falta configurar la carpeta privada de Drive.');
  if (!/^[\w-]+$/.test(folder())) throw new Error('Referencia de carpeta de Drive inválida.');
  let id = input.existingFileId;
  if (!id) {
    // Recover an object created before a server interruption, without creating another file.
    const query = new URLSearchParams({
      fields: 'files(id)', pageSize: '2',
      q: `trashed = false and '${folder()}' in parents and appProperties has { key='applicationId' and value='${input.applicationId}' } and appProperties has { key='uploadId' and value='${input.uploadId}' }`,
    });
    const listed = await googleRequest(`https://www.googleapis.com/drive/v3/files?${query}`);
    if (!listed.ok) throw new Error('No se pudo comprobar la carga anterior de Drive.');
    const matches = await listed.json() as { files?: { id: string }[] };
    if ((matches.files?.length || 0) > 1) throw new Error('Se necesita revisar una carga duplicada antes de continuar.');
    id = matches.files?.[0]?.id;
  }
  if (id) {
    await driveFile({ provider: 'drive', fileId: id, applicationId: input.applicationId, uploadId: input.uploadId });
  } else {
    const created = await googleRequest('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: path.replace('/', '-'), parents: [folder()], mimeType: contentType, appProperties: { applicationId: input.applicationId, uploadId: input.uploadId, mode: input.mode } }),
  });
  if (!created.ok) throw new Error('No se pudo preparar el archivo privado de Drive.');
    const result = await created.json() as { id?: string };
    if (!result.id) throw new Error('Drive no devolvió la referencia del archivo.');
    id = result.id;
  }
  const session = await googleRequest(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(id)}?uploadType=resumable`, {
    // The browser uploads the bytes: Google only answers its CORS requests when the session
    // was opened with the page's Origin.
    method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Upload-Content-Type': contentType, 'X-Upload-Content-Length': String(input.expectedBytes), ...(input.origin ? { Origin: input.origin } : {}) }, body: '{}',
  });
  const uploadUrl = session.headers.get('location');
  if (!session.ok || !uploadUrl || new URL(uploadUrl).hostname !== 'www.googleapis.com') {
    if (!input.existingFileId) await googleRequest(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
    throw new Error('No se pudo iniciar la subida reanudable de Drive.');
  }
  // The one-file resumable URL is a temporary capability; no general Google token is exposed.
  return { provider: 'drive' as const, fileId: id, uploadUrl, method: 'PUT' as const, headers: { 'Content-Type': contentType }, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), resumable: true, chunkBytes: 1024 * 1024 };
}

async function driveFile(identity: Identity) {
  if (!/^[\w-]+$/.test(identity.fileId)) throw new Error('Referencia inválida.');
  const response = await googleRequest(`https://www.googleapis.com/drive/v3/files/${identity.fileId}?fields=id,size,mimeType,trashed,parents,appProperties,webViewLink`);
  if (!response.ok) throw new Error('El video todavía no está disponible.');
  const data = await response.json() as { size: string; mimeType: string; trashed: boolean; parents?: string[]; appProperties?: Record<string, string>; webViewLink?: string };
  if (data.trashed || !data.parents?.includes(folder()) || data.appProperties?.applicationId !== identity.applicationId || data.appProperties?.uploadId !== identity.uploadId) throw new Error('El archivo no pertenece a esta postulación.');
  return data;
}

export async function inspectVideo(identity: Identity) {
  if (identity.provider === 'drive') {
    const data = await driveFile(identity);
    if (Number(data.size) > 50 * 1024 * 1024) throw new Error('El archivo supera el límite permitido.');
    const response = await googleRequest(`https://www.googleapis.com/drive/v3/files/${identity.fileId}?alt=media`, { signal: AbortSignal.timeout(45_000) });
    return inspectVideoBytes(await boundedVideoDownload(response));
  }
  if (!identity.fileId.startsWith(`${identity.applicationId}/${identity.uploadId}.`)) throw new Error('El archivo no pertenece a esta postulación.');
  const { data, error } = await storageClient().storage.from(bucket()).download(identity.fileId);
  if (error || !data || data.size > 50 * 1024 * 1024) throw new Error('No se pudo verificar el video.');
  return inspectVideoBytes(new Uint8Array(await data.arrayBuffer()));
}

export async function getVideoPlayback(identity: Identity): Promise<{ url: string; embedded: boolean }> {
  if (identity.provider === 'drive') {
    await driveFile(identity);
    // Google enforces the viewer's account permissions; this does not make the video public.
    return { url: `https://drive.google.com/file/d/${encodeURIComponent(identity.fileId)}/preview`, embedded: true };
  }
  if (!identity.fileId.startsWith(`${identity.applicationId}/${identity.uploadId}.`)) throw new Error('Referencia de video inválida.');
  const { data, error } = await storageClient().storage.from(bucket()).createSignedUrl(identity.fileId, 120);
  if (error || !data) throw new Error('No se pudo autorizar la reproducción.');
  return { url: data.signedUrl, embedded: false };
}

export async function deleteVideo(identity: Identity): Promise<void> {
  if (identity.provider === 'drive') {
    await driveFile(identity);
    const response = await googleRequest(`https://www.googleapis.com/drive/v3/files/${identity.fileId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
    if (!response.ok) throw new Error('No se pudo mover el video a la papelera.');
  } else {
    if (!identity.fileId.startsWith(`${identity.applicationId}/${identity.uploadId}.`)) throw new Error('Referencia de video inválida.');
    const { error } = await storageClient().storage.from(bucket()).remove([identity.fileId]);
    if (error) throw new Error('No se pudo eliminar el video incompleto.');
  }
}
