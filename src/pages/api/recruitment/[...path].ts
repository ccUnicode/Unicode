import type { APIRoute } from 'astro';
import { sessionStore } from '../../../lib/session-store';
import * as recruitment from '../../../lib/recruitment/service';
import { RecruitmentError } from '../../../lib/recruitment/validation';

export const prerender = false;
const env = (key: string): string | undefined => import.meta.env[key] || process.env[key];
const json = (value: unknown, status = 200): Response => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' } });
async function body(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new RecruitmentError('invalid_body', 'La solicitud debe usar JSON.');
  if (Number(request.headers.get('content-length') || 0) > 128 * 1024) throw new RecruitmentError('invalid_body', 'La solicitud es demasiado grande.', 413);
  if (!request.body) throw new RecruitmentError('invalid_body', 'La solicitud está vacía.');
  const reader = request.body.getReader(); const decoder = new TextDecoder(); let size = 0; let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 128 * 1024) {
        await reader.cancel().catch(() => undefined);
        throw new RecruitmentError('invalid_body', 'La solicitud es demasiado grande.', 413);
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  try { return JSON.parse(text); } catch { throw new RecruitmentError('invalid_body', 'Solicitud JSON inválida.'); }
}
function bearer(request: Request): string {
  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer [A-Za-z0-9_.=+/\-]{20,2048}$/.test(authorization)) throw new RecruitmentError('unauthorized', 'No autorizado. Usa tu enlace personal o inicia sesión.', 401);
  return authorization.slice(7);
}
async function admin(request: Request): Promise<void> {
  if (!env('ADMIN_PASSWORD') || !(await sessionStore.isValid(bearer(request)))) throw new RecruitmentError('unauthorized', 'No autorizado. Inicia sesión nuevamente.', 401);
}
function sameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new RecruitmentError('origin_not_allowed', 'Origen de solicitud no autorizado.', 403);
}
export const ALL: APIRoute = async ({ request, params }) => {
  try {
    const path = (params.path || '').split('/'); const method = request.method;
    if (!['GET', 'POST', 'PUT', 'PATCH'].includes(method)) return json({ error: 'Método no permitido.', code: 'method_not_allowed' }, 405);
    if (method !== 'GET') sameOrigin(request);
    if (path.join('/') === 'config' && method === 'GET') return json(await recruitment.publicConfig());
    if (path.join('/') === 'drafts' && method === 'POST') {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
      return json(await recruitment.createDraft(await body(request), new URL(request.url).origin, ip), 201);
    }
    if (path[0] === 'drafts' && path[1]) {
      const id = recruitment.requireUuid(path[1]); const token = bearer(request); const action = path.slice(2).join('/');
      if (!action && method === 'GET') return json(await recruitment.getDraft(id, token));
      if (!action && method === 'PATCH') return json(await recruitment.patchDraft(id, token, await body(request)));
      if (method === 'POST') {
        if (action === 'recording-attempt') return json(await recruitment.recordingAttempt(id, token));
        if (action === 'technical-failure') return json(await recruitment.technicalFailure(id, token, await body(request)));
        if (action === 'video-session') return json(await recruitment.videoSession(id, token, await body(request)));
        if (action === 'video-complete') return json(await recruitment.videoComplete(id, token, await body(request)));
        if (action === 'submit') return json(await recruitment.submitDraft(id, token));
      }
    }
    if (path[0] === 'admin') {
      const action = path.slice(1).join('/');
      if (action === 'process-emails' && ['GET', 'POST'].includes(method) && env('CRON_SECRET') && request.headers.get('authorization') === `Bearer ${env('CRON_SECRET')}`) return json(await recruitment.processEmails());
      await admin(request);
      if (action === 'config' && method === 'GET') return json(await recruitment.adminConfig());
      if (action === 'config' && ['PUT', 'PATCH'].includes(method)) return json(await recruitment.saveConfig(await body(request)));
      if (action === 'applications' && method === 'GET') return json(await recruitment.adminApplications());
      if (path[1] === 'applications' && path[2]) {
        const id = recruitment.requireUuid(path[2]);
        if (path.length === 3 && method === 'GET') return json(await recruitment.adminApplications(id));
        if (path[3] === 'transition' && path.length === 4 && method === 'POST') return json(await recruitment.transition(id, await body(request)));
        if (path[3] === 'video' && path.length === 4 && method === 'GET') return json(await recruitment.adminVideo(id));
      }
      if (action === 'templates' && method === 'GET') return json(await recruitment.getTemplates());
      if (action === 'templates' && method === 'PUT') return json(await recruitment.saveTemplates(await body(request)));
      if (action === 'queue' && method === 'GET') return json(await recruitment.getQueue());
      if (action === 'process-emails' && method === 'POST') return json(await recruitment.processEmails());
    }
    return json({ error: 'Ruta no encontrada.', code: 'not_found' }, 404);
  } catch (error) {
    if (error instanceof RecruitmentError) return json({ error: error.message, code: error.code }, error.status);
    return json({ error: 'No se pudo completar la solicitud. Intenta nuevamente.', code: 'server_error' }, 503);
  }
};
