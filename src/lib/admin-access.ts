/** Director sign-in with a one-time code sent by email, and the list of directors GTH manages. */
import { recruitmentRpc, localDevelopmentDatabase } from './recruitment/database';
import { sendRecruitmentEmail, recruitmentEmailConfigured } from './recruitment-email';
import { renderRecruitmentEmailHtml } from './recruitment-email-layout';
import { RecruitmentError, record } from './recruitment/validation';
import { AREA_IDS, AREA_NAMES } from './recruitment/types';
import type { AdminSession } from './session-store';

const env = (name: string): string | undefined => import.meta.env[name] || process.env[name];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export type Director = { email: string; area: string; name: string };

/** Keyed with the server secret so a leaked table does not reveal the codes. */
async function codeHash(email: string, code: string): Promise<string> {
  const secret = env('ADMIN_PASSWORD');
  if (!secret) throw new RecruitmentError('setup_required', 'La autenticación administrativa no está configurada.', 503);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${email}:${code}:${secret}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function normalizeEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!EMAIL.test(email) || email.length > 254) throw new RecruitmentError('invalid_email', 'Escribe un correo válido.');
  return email;
}

/** Always answers the same way, so the form does not reveal who is a director. */
export async function requestLoginCode(input: unknown): Promise<{ message: string }> {
  const email = normalizeEmail(record(input).email);
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');
  const result = await recruitmentRpc<{ sent: boolean; limited?: boolean; name?: string }>('recruitment_login_request', { p_email: email, p_code_hash: await codeHash(email, code) });
  // Server log only (never the code): tells a missing director apart from the hourly limit.
  console.info(`[admin] código para ${email}: ${result.sent ? 'enviado' : result.limited ? 'límite de 20 por hora' : 'correo sin acceso'}`);
  if (result.sent) {
    if (localDevelopmentDatabase()) console.info(`[admin] Código de acceso local para ${email}: ${code}`);
    else if (recruitmentEmailConfigured()) {
      const greeting = result.name ? `Hola ${result.name.split(' ')[0]}, este` : 'Este';
      const text = `${greeting} es tu código para entrar al panel de UNICODE:\n\n${code}\n\nVence en 10 minutos y solo funciona una vez. Si pides otro, este deja de servir. Si no lo pediste, ignora este correo.`;
      // A subject that starts with digits looks like phishing to some filters.
      const subject = 'Tu código de acceso a UNICODE';
      await sendRecruitmentEmail({ to: email, subject, text, html: renderRecruitmentEmailHtml({ subject, text, code, siteUrl: env('RECRUITMENT_BASE_URL') || 'https://www.ccunicode.org' }), idempotencyKey: `admin-login-${crypto.randomUUID()}` });
    } else throw new RecruitmentError('setup_required', 'El envío de correos no está configurado.', 503);
  }
  return { message: 'Si tu correo tiene acceso, te llegará un código en menos de un minuto. Revisa también spam. Si pediste varios seguidos, usa el último o espera unos minutos.' };
}

export async function verifyLoginCode(input: unknown): Promise<AdminSession> {
  const body = record(input);
  const email = normalizeEmail(body.email);
  const code = typeof body.code === 'string' ? body.code.replace(/\s/g, '') : '';
  if (!/^\d{6}$/.test(code)) throw new RecruitmentError('invalid_code', 'El código tiene 6 dígitos.');
  const result = await recruitmentRpc<{ ok: boolean; error?: string } & Partial<Director>>('recruitment_login_verify', { p_email: email, p_code_hash: await codeHash(email, code) });
  if (!result.ok || !result.email || !result.area) throw new RecruitmentError('invalid_code', result.error || 'Código incorrecto.', 401);
  return { role: 'director', email: result.email, area: result.area, name: result.name || undefined };
}

export async function directors(input?: unknown, actor = 'administracion'): Promise<{ directors: Director[] }> {
  if (input === undefined) return recruitmentRpc('recruitment_directors', { p_directors: null, p_actor: null });
  const list = record(input).directors;
  if (!Array.isArray(list) || list.length > 60) throw new RecruitmentError('configuration', 'Lista de directores inválida.');
  const seen = new Set<string>();
  const clean = list.map((item) => {
    const row = record(item);
    const email = normalizeEmail(row.email);
    if (seen.has(email)) throw new RecruitmentError('configuration', `El correo ${email} está repetido.`);
    seen.add(email);
    if (!(AREA_IDS as readonly string[]).includes(String(row.area))) throw new RecruitmentError('configuration', `Elige un área para ${email}.`);
    const name = typeof row.name === 'string' ? row.name.trim().slice(0, 150) : '';
    return { email, area: String(row.area), name };
  });
  return recruitmentRpc('recruitment_directors', { p_directors: clean, p_actor: actor });
}

export const areaLabel = (area: string) => AREA_NAMES[area as keyof typeof AREA_NAMES] ?? area;

/** Adds a director or changes their area or name, one at a time. */
export async function saveDirector(input: unknown, actor = 'administracion'): Promise<{ directors: Director[] }> {
  const row = record(input);
  const email = normalizeEmail(row.email);
  if (!(AREA_IDS as readonly string[]).includes(String(row.area))) throw new RecruitmentError('configuration', 'Elige un área.');
  const name = typeof row.name === 'string' ? row.name.trim().slice(0, 150) : '';
  return recruitmentRpc('recruitment_director_save', { p_email: email, p_area: String(row.area), p_name: name, p_actor: actor });
}

/** Removes one director; any code they had pending stops working. */
export async function removeDirector(input: unknown, actor = 'administracion'): Promise<{ directors: Director[] }> {
  return recruitmentRpc('recruitment_director_remove', { p_email: normalizeEmail(record(input).email), p_actor: actor });
}
