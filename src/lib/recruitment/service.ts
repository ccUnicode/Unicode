import { createVideoUpload, deleteVideo, inspectVideo, getVideoPlayback, videoStorageConfigured } from '../recruitment-storage';
import { sendRecruitmentEmail, recruitmentEmailConfigured } from '../recruitment-email';
import { renderRecruitmentEmailHtml } from '../recruitment-email-layout';
import { createVideoTicket } from '../video-ticket';
import { databaseConfigured, localDevelopmentDatabase, recruitmentRpc } from './database';
import { record, RecruitmentError, validateApplicationData, validateConfig, validateTemplates, withAllAreas } from './validation';
import { AREA_IDS, AREA_NAMES, allowedApplicationTransitions, type ApplicationStatus, type EmailQueueItem, type RecruitmentApplication, type RecruitmentConfig, type RecruitmentUpload } from './types';

const env = (name: string): string | undefined => import.meta.env[name] || process.env[name];
type ApplicationResponse = { application: RecruitmentApplication };
type ConfigResponse = { config: RecruitmentConfig };
const fallbackConfig = {
  enabled: false, title: 'Convocatoria UNICode', opensAt: null, closesAt: null, extensionAt: null,
  maxApplicants: 150, minAvailabilityHours: null, maxVideoSeconds: 150, maxVideoBytes: 40 * 1024 * 1024,
  questionsPerCategory: 2, preparationSeconds: 45, inactivityHours: 24,
  shortCasePrompt: 'Describe cómo abordarías un problema habitual del área a la que postulas.',
  areas: AREA_IDS.map((id) => ({ id, name: AREA_NAMES[id], enabled: false, quota: null })),
};
export async function hash(value: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
function resumeEncryptionSecret(): string | undefined {
  return env('RECRUITMENT_RESUME_ENCRYPTION_KEY') || (localDevelopmentDatabase() ? env('ADMIN_PASSWORD') : undefined);
}
function resumeEncryptionConfigured(): boolean { return (resumeEncryptionSecret()?.length || 0) >= (localDevelopmentDatabase() ? 16 : 32); }
function canonicalBaseConfigured(): boolean {
  const base = env('RECRUITMENT_BASE_URL');
  if (!base) return false;
  try { const url = new URL(base); return url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash; } catch { return false; }
}
async function encryptionKey(): Promise<CryptoKey> {
  const secret = resumeEncryptionSecret();
  if (!secret || !resumeEncryptionConfigured()) throw new RecruitmentError('setup_required', 'Falta configurar la protección de los enlaces personales.', 503);
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}
async function encryptResume(url: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(), new TextEncoder().encode(url));
  return `${Buffer.from(iv).toString('base64url')}.${Buffer.from(encrypted).toString('base64url')}`;
}
async function decryptResume(secret: string): Promise<string> {
  const [iv, data] = secret.split('.');
  if (!iv || !data) throw new Error('El enlace personal no está disponible.');
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(iv, 'base64url') }, await encryptionKey(), Buffer.from(data, 'base64url'));
  return new TextDecoder().decode(decrypted);
}
export async function publicConfig() {
  if (!databaseConfigured()) return { config: fallbackConfig, available: false, reason: 'La convocatoria aún está pendiente de configuración.', deploymentReady: false };
  try {
    const response = await recruitmentRpc<{ config: RecruitmentConfig; available: boolean; reason: string | null }>('recruitment_public_config');
    response.config = withAllAreas(response.config);
    const full = await recruitmentRpc<ConfigResponse>('recruitment_admin_config');
    const ready = videoStorageConfigured(full.config.storageProvider) && recruitmentEmailConfigured() && resumeEncryptionConfigured() && canonicalBaseConfigured();
    if (!import.meta.env.DEV && !ready) return { ...response, available: false, reason: 'La convocatoria aún está pendiente de configuración.', deploymentReady: false };
    return { ...response, deploymentReady: ready, developmentMode: localDevelopmentDatabase() };
  } catch {
    // A bad credential, unavailable database or unapplied migration must not break /call.
    return { config: fallbackConfig, available: false, reason: 'La convocatoria aún está pendiente de conexión.', deploymentReady: false };
  }
}
export async function adminConfig() {
  const response = await recruitmentRpc<ConfigResponse>('recruitment_admin_config');
  response.config = withAllAreas(response.config);
  return { ...response, readiness: { database: databaseConfigured(), localDevelopment: localDevelopmentDatabase(), video: videoStorageConfigured(response.config.storageProvider), email: recruitmentEmailConfigured(), resumeEncryption: resumeEncryptionConfigured(), canonicalBase: canonicalBaseConfigured(), individualStaffIdentity: false } };
}
/** One secret test link at a time: generating a new one invalidates the previous link. */
export async function createPreviewLink(origin: string) {
  const key = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString('base64url');
  await recruitmentRpc('recruitment_set_preview_key', { p_hash: await hash(key), p_actor: 'administracion-compartida' });
  // A local database must never hand out a link to the deployed site.
  const url = new URL('/postular', localDevelopmentDatabase() ? origin : env('RECRUITMENT_BASE_URL') || origin); url.searchParams.set('prueba', key);
  return { url: url.toString() };
}
export function disablePreviewLink() { return recruitmentRpc('recruitment_set_preview_key', { p_hash: null, p_actor: 'administracion-compartida' }); }
/** Deletes test applications and, best effort, their videos from Drive or Supabase Storage. */
export async function purgeTestApplications() {
  const result = await recruitmentRpc<{ removed: number; files: { applicationId: string; uploadId: string; provider: 'drive' | 'supabase'; fileId: string }[] }>('recruitment_purge_tests');
  let videosDeleted = 0;
  for (const file of result.files) { try { await deleteVideo(file); videosDeleted++; } catch { /* Already gone or not uploaded. */ } }
  return { removed: result.removed, videosDeleted, videosPending: result.files.length - videosDeleted };
}
export async function saveConfig(input: unknown) { return recruitmentRpc<ConfigResponse>('recruitment_update_config', { p_config: validateConfig(input), p_actor: 'administracion-compartida' }); }

export async function createDraft(input: unknown, origin: string, ip: string) {
  const settings = await publicConfig();
  if (!settings.available) throw new RecruitmentError('call_closed', settings.reason || 'La convocatoria está cerrada.', 403);
  const data = validateApplicationData(input, undefined, true);
  const id = crypto.randomUUID(); const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
  const base = env('RECRUITMENT_BASE_URL') || (localDevelopmentDatabase() ? origin : undefined);
  if (!base) throw new RecruitmentError('setup_required', 'Falta configurar la dirección oficial de la convocatoria.', 503);
  const url = new URL('/postular', base); url.hash = `id=${id}&token=${token}`;
  const result = await recruitmentRpc<ApplicationResponse>('recruitment_create_draft', { p_id: id, p_token_hash: await hash(token), p_data: data, p_rate_key: await hash(`draft:${ip}`), p_resume_secret: await encryptResume(url.toString()) });
  // The queued message remains durable even when transport is unavailable or rejects the delivery.
  if (recruitmentEmailConfigured()) await processEmails(1).catch(() => undefined);
  return { ...result, resumeToken: token };
}
export async function getDraft(id: string, token: string) { return recruitmentRpc<ApplicationResponse>('recruitment_get_draft', { p_id: id, p_token_hash: await hash(token) }); }
export async function patchDraft(id: string, token: string, input: unknown) {
  const current = await getDraft(id, token);
  return recruitmentRpc<ApplicationResponse>('recruitment_patch_draft', { p_id: id, p_token_hash: await hash(token), p_data: validateApplicationData(input, current.application.data) });
}
export async function recordingAttempt(id: string, token: string) { return recruitmentRpc<ApplicationResponse>('recruitment_recording_attempt', { p_id: id, p_token_hash: await hash(token) }); }
export async function technicalFailure(id: string, token: string, input: unknown) {
  const body = record(input);
  if (typeof body.code !== 'string' || !/^[a-zA-Z0-9_.-]{1,80}$/.test(body.code) || typeof body.message !== 'string' || body.message.length > 500) throw new RecruitmentError('invalid_failure', 'Describe la falla técnica con un código y un mensaje breve.');
  return recruitmentRpc<ApplicationResponse>('recruitment_technical_failure', { p_id: id, p_token_hash: await hash(token), p_code: body.code, p_message: body.message });
}
export async function videoSession(id: string, token: string, input: unknown, origin?: string) {
  const body = record(input);
  if (!['recording', 'upload'].includes(String(body.mode)) || typeof body.contentType !== 'string' || !Number.isInteger(body.bytes) || Number(body.bytes) < 1) throw new RecruitmentError('invalid_video', 'La carga requiere formato, tamaño y modalidad válidos.');
  const config = await recruitmentRpc<ConfigResponse>('recruitment_admin_config');
  if (!videoStorageConfigured(config.config.storageProvider)) throw new RecruitmentError('setup_required', 'El almacenamiento privado de videos aún no está configurado.', 503);
  const contentType = body.contentType.split(';')[0].trim().toLowerCase();
  const tokenHash = await hash(token);
  const { upload } = await recruitmentRpc<{ upload: RecruitmentUpload }>('recruitment_begin_upload', { p_id: id, p_token_hash: tokenHash, p_upload_id: crypto.randomUUID(), p_mode: body.mode, p_content_type: contentType, p_bytes: body.bytes });
  if (upload.authorization && (!upload.authorization.expiresAt || Date.parse(upload.authorization.expiresAt) > Date.now() + 30_000)) return { uploadId: upload.id, ...upload.authorization };
  const authorization = await createVideoUpload({ applicationId: id, uploadId: upload.id, mode: upload.mode, provider: upload.provider, expectedBytes: upload.expectedBytes, maxBytes: upload.maxBytes, maxSeconds: upload.maxSeconds, contentType: upload.contentType, origin, ...(upload.fileId ? { existingFileId: upload.fileId } : {}) });
  await recruitmentRpc<null>('recruitment_attach_upload', { p_id: id, p_token_hash: tokenHash, p_upload_id: upload.id, p_provider: authorization.provider, p_file_id: authorization.fileId, p_authorization: authorization });
  return { uploadId: upload.id, ...authorization };
}
export async function videoComplete(id: string, token: string, input: unknown) {
  const body = record(input); const uploadId = requireUuid(body.uploadId);
  const tokenHash = await hash(token);
  const { upload } = await recruitmentRpc<{ upload: RecruitmentUpload }>('recruitment_upload_for_validation', { p_id: id, p_token_hash: tokenHash, p_upload_id: uploadId });
  if (!upload.fileId) throw new RecruitmentError('upload_not_found', 'No existe una carga pendiente para verificar.', 404);
  let metadata: Awaited<ReturnType<typeof inspectVideo>>;
  try { metadata = await inspectVideo({ applicationId: id, uploadId, provider: upload.provider, fileId: upload.fileId }); }
  catch { throw new RecruitmentError('invalid_video', 'No se pudo verificar el archivo real. Comprueba que la carga terminó y vuelve a verificar.'); }
  if (!Number.isFinite(metadata.durationSeconds) || !Number.isFinite(metadata.bytes)) throw new RecruitmentError('invalid_video', 'No se pudo verificar la duración y el tamaño del archivo.');
  return recruitmentRpc<ApplicationResponse>('recruitment_complete_upload', { p_id: id, p_token_hash: tokenHash, p_upload_id: uploadId, p_metadata: metadata });
}
/** Deletes an unfinished draft whose attempts ran out, so the applicant can fill the form again. */
export async function discardDraft(id: string, token: string) {
  const result = await recruitmentRpc<{ discarded: boolean; files: { applicationId: string; uploadId: string; provider: 'drive' | 'supabase'; fileId: string }[] }>('recruitment_discard_draft', { p_id: id, p_token_hash: await hash(token) });
  for (const file of result.files) { try { await deleteVideo(file); } catch { /* Already gone or never uploaded. */ } }
  return { discarded: true };
}
export async function submitDraft(id: string, token: string) {
  const result = await recruitmentRpc<ApplicationResponse>('recruitment_submit', { p_id: id, p_token_hash: await hash(token) });
  if (recruitmentEmailConfigured()) await processEmails(2).catch(() => undefined);
  return result;
}
export function requireUuid(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new RecruitmentError('invalid_id', 'Referencia inválida.');
  return value;
}
export async function adminApplications(id?: string) { return recruitmentRpc<{ applications?: RecruitmentApplication[]; application?: RecruitmentApplication }>('recruitment_admin_applications', { p_id: id || null }); }
export async function transition(id: string, input: unknown) {
  const body = record(input); const status = body.status;
  if (typeof status !== 'string' || !Object.hasOwn(allowedApplicationTransitions, status) || typeof body.reason !== 'string' || body.reason.trim().length < 3 || body.reason.length > 2000) throw new RecruitmentError('invalid_transition', 'Elige un estado válido y registra el motivo.');
  const result = await recruitmentRpc<ApplicationResponse>('recruitment_transition', { p_id: id, p_status: status as ApplicationStatus, p_reason: body.reason.trim(), p_actor: 'administracion-compartida' });
  if (recruitmentEmailConfigured()) await processEmails(2).catch(() => undefined);
  return result;
}
export async function adminVideo(id: string) {
  const response = await adminApplications(id); const video = response.application?.video;
  if (!video) throw new RecruitmentError('not_found', 'Esta postulación todavía no tiene un video validado.', 404);
  // Drive only lets the owner account watch: play it through this site with a signed link instead.
  if (video.provider === 'drive') return { url: `/api/recruitment/video/${id}?t=${await createVideoTicket(id)}`, embedded: false };
  return getVideoPlayback({ applicationId: id, uploadId: video.uploadId, provider: video.provider, fileId: video.fileId });
}
/** The stored video of an application, for the signed playback route. */
export async function videoForPlayback(id: string) {
  const video = (await adminApplications(id)).application?.video;
  if (!video || video.provider !== 'drive') throw new RecruitmentError('not_found', 'Video no encontrado.', 404);
  return video;
}
export function getTemplates() { return recruitmentRpc('recruitment_templates'); }
export function saveTemplates(input: unknown) { return recruitmentRpc('recruitment_templates', { p_templates: validateTemplates(input), p_actor: 'administracion-compartida' }); }
export function getQueue() { return recruitmentRpc('recruitment_queue'); }
function interpolate(template: string, payload: Record<string, string>): string { return template.replace(/{{\s*(firstName|lastName|title|status|resumeUrl)\s*}}/g, (_, name: string) => payload[name] || ''); }
export async function processEmails(limit = 10) {
  await recruitmentRpc<number>('recruitment_expire_drafts');
  if (!recruitmentEmailConfigured()) return { sent: 0, failed: 0, processed: 0, remaining: null, skipped: true, reason: 'El proveedor de correo aún no está configurado.' };
  const leaseToken = crypto.randomUUID();
  const { items } = await recruitmentRpc<{ items: EmailQueueItem[] }>('recruitment_lease_emails', { p_limit: limit, p_lease_token: leaseToken });
  let sent = 0; let failed = 0;
  for (const item of items) {
    try {
      const payload = { ...item.payload };
      if (payload.resumeSecret && ['resume', 'incomplete'].includes(item.templateKey)) payload.resumeUrl = await decryptResume(payload.resumeSecret);
      const text = interpolate(item.body, payload); const subject = interpolate(item.subject, payload).replace(/[\r\n]/g, ' ');
      const result = await sendRecruitmentEmail({ to: item.to, subject, text, html: renderRecruitmentEmailHtml({ subject, text, actionUrl: payload.resumeUrl, siteUrl: env('RECRUITMENT_BASE_URL') || 'https://www.ccunicode.org' }), idempotencyKey: `recruitment-${item.id}` });
      await recruitmentRpc<null>('recruitment_finish_email', { p_id: item.id, p_lease_token: leaseToken, p_message_id: result.messageId, p_error: null });
      sent++;
    } catch {
      await recruitmentRpc<null>('recruitment_finish_email', { p_id: item.id, p_lease_token: leaseToken, p_message_id: null, p_error: 'El proveedor no confirmó la entrega. Se reintentará según la política de la cola.' });
      failed++;
    }
  }
  const queue = await recruitmentRpc<{ queue: { status: string }[] }>('recruitment_queue');
  return { sent, failed, processed: items.length, remaining: queue.queue.filter((item) => ['pending', 'leased'].includes(item.status)).length };
}
