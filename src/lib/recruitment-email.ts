/** Durable outbox transport. Missing credentials never count as a delivered message. */
import { googleConfigured, googleRequest } from './recruitment-google';
type Email = { to: string; subject: string; html: string; text: string; idempotencyKey: string };
const env = (key: string) => import.meta.env[key] || process.env[key];

export function recruitmentEmailConfigured(): boolean {
  return env('RECRUITMENT_EMAIL_PROVIDER') === 'gmail' ? googleConfigured() : Boolean(env('RESEND_API_KEY') && env('RECRUITMENT_EMAIL_FROM'));
}

export async function sendRecruitmentEmail(email: Email): Promise<{ messageId: string }> {
  if (!/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(email.to) || /[\r\n]/.test(email.subject)) throw new Error('Destinatario o asunto inválido.');
  if (env('RECRUITMENT_EMAIL_PROVIDER') === 'gmail') {
    // Gmail has no exactly-once idempotency API. The stable Message-ID identifies ambiguous retries.
    const encodedSubject = `=?UTF-8?B?${Buffer.from(email.subject).toString('base64')}?=`;
    const messageId = `${email.idempotencyKey.replace(/[^a-zA-Z0-9.-]/g, '-')}@ccunicode.org`;
    // Plain text for clients without HTML, the branded HTML for the rest.
    const boundary = `unicode-${crypto.randomUUID()}`;
    const part = (type: string, content: string) => [`--${boundary}`, `Content-Type: ${type}; charset=UTF-8`, 'Content-Transfer-Encoding: base64', '',
      Buffer.from(content).toString('base64').match(/.{1,76}/g)?.join('\r\n') || '', ''];
    const mime = [
      `To: ${email.to}`, `Subject: ${encodedSubject}`, `Message-ID: <${messageId}>`,
      'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${boundary}"`, '',
      ...part('text/plain', email.text), ...part('text/html', email.html), `--${boundary}--`, '',
    ].join('\r\n');
    const response = await googleRequest('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: Buffer.from(mime).toString('base64url') }),
    });
    if (!response.ok) throw new Error('El proveedor de correo rechazó el envío.');
    const data = await response.json() as { id?: string };
    if (!data.id) throw new Error('El proveedor no confirmó el envío.');
    return { messageId: data.id };
  }
  const key = env('RESEND_API_KEY'); const from = env('RECRUITMENT_EMAIL_FROM');
  if (!key || !from) throw new Error('El servicio de correo está pendiente de configuración.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': email.idempotencyKey },
    body: JSON.stringify({ from, to: [email.to], subject: email.subject, html: email.html, text: email.text }), signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error('El proveedor de correo rechazó el envío.');
  const data = await response.json() as { id?: string };
  if (!data.id) throw new Error('El proveedor no confirmó el envío.');
  return { messageId: data.id };
}
