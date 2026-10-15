import { recruitmentRpc, localDevelopmentDatabase } from './database';
import { sendRecruitmentEmail } from '../recruitment-email';
import { renderRecruitmentEmailHtml } from '../recruitment-email-layout';
import { AREA_NAMES, type AreaId } from './types';
import { RecruitmentError } from './validation';
import { directorDisplayName } from '../director-display-name';

export const DIRECTOR_MAIL_END = Date.parse('2026-10-19T05:00:00Z');
/** An unapplied campaign migration must not block existing applicant emails. */
export async function scheduleDirectorEmails(): Promise<boolean> {
  try {
    await recruitmentRpc('recruitment_director_schedule');
    return true;
  } catch (error) {
    if (!(error instanceof RecruitmentError) || error.code !== 'database_error') throw error;
    console.warn('Correos a directores pendientes: verifica la migración de la campaña y la conexión.');
    return false;
  }
}
type Notice = { id: string; area: AreaId; kind: 'pending' | 'transfer' | 'close'; recipients: { email: string; name: string }[]; counts: { first: number; second: number; total: number } };
export function directorNotice(item: Notice, siteUrl: string) {
  const area = AREA_NAMES[item.area];
  const subject = item.kind === 'pending' ? `${item.area}: ${item.counts.total} postulantes pendientes de evaluación`
    : item.kind === 'transfer' ? `${item.area}: nueva postulación de segunda opción` : `${item.area}: pueden cerrar la recepción de segundas opciones`;
  const greeting = `Hola ${item.recipients.map(r => directorDisplayName(r.name, r.email)).join(' y ')},`;
  const text = item.kind === 'pending'
    ? `${greeting}\n\nEn ${area} quedan ${item.counts.total} postulantes por evaluar: ${item.counts.first} de primera opción y ${item.counts.second} de segunda opción. Revisen el panel y registren las decisiones pendientes.`
    : item.kind === 'transfer'
      ? `${greeting}\n\nUna nueva postulación pasó a ${area} como segunda opción. Ya está disponible en el panel para que puedan evaluarla.\n\nActualmente tienen ${item.counts.total} pendientes: ${item.counts.first} de primera opción y ${item.counts.second} de segunda opción.`
      : `${greeting}\n\n${area} ya no tiene postulantes pendientes de evaluación y sigue recibiendo segundas opciones. Si ya no desean recibir más postulantes de segunda opción, pueden cerrar la recepción de su área desde el panel. Los postulantes que ya recibieron permanecen en el área.\n\nEl cierre es una decisión de ustedes y pueden reabrir la recepción desde el panel.`;
  const actionUrl = new URL('/admin', siteUrl).toString();
  return { subject, text: `${text}\n\nPanel de directores: ${actionUrl}`, actionUrl };
}
export async function processDirectorEmails(limit: number) {
  const leaseToken = crypto.randomUUID();
  const { items } = await recruitmentRpc<{ items: Notice[] }>('recruitment_director_lease', { p_limit: limit, p_lease_token: leaseToken });
  let sent = 0; let failed = 0;
  for (const item of items) {
    let messageId: string | null = null;
    try {
      // Check again at the transport boundary, even when a batch crosses midnight.
      if (Date.now() >= DIRECTOR_MAIL_END) continue;
      const env = (name: string) => import.meta.env[name] || process.env[name];
      const allowed = (env('RECRUITMENT_LOCAL_EMAIL_TO') || '').toLowerCase().split(',').map((s: string) => s.trim());
      if (localDevelopmentDatabase() && item.recipients.some(r => !allowed.includes(r.email.toLowerCase()))) { messageId = 'local-omitido'; continue; }
      const siteUrl = env('RECRUITMENT_BASE_URL') || 'https://www.ccunicode.org';
      const notice = directorNotice(item, siteUrl);
      const recipients = item.recipients.map(r => ({ ...r, name: directorDisplayName(r.name, r.email) }));
      const result = await sendRecruitmentEmail({ to: recipients, subject: notice.subject, text: notice.text,
        html: renderRecruitmentEmailHtml({ ...notice, siteUrl, actionLabel: 'Abrir panel de directores' }), idempotencyKey: `director-${item.id}`, expiresAt: DIRECTOR_MAIL_END });
      messageId = result.messageId; sent++;
    } catch { failed++; }
    finally {
      await recruitmentRpc('recruitment_director_finish', { p_id: item.id, p_lease_token: leaseToken, p_message_id: messageId });
    }
  }
  return { sent, failed, processed: items.length };
}
