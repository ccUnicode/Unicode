/** Durable outbox transport. Missing credentials never count as a delivered message. */
import { googleConfigured, googleRequest } from './recruitment-google';
type Email = { to: string; subject: string; html: string; text: string; idempotencyKey: string };
const env = (key: string) => import.meta.env[key] || process.env[key];
const resendConfigured = () => Boolean(env('RESEND_API_KEY') && env('RECRUITMENT_EMAIL_FROM'));
/** Where applicants' replies go; the sending address on our domain has no mailbox. */
const replyTo = () => env('RECRUITMENT_EMAIL_REPLY_TO');

export function recruitmentEmailConfigured(): boolean {
  return env('RECRUITMENT_EMAIL_PROVIDER') === 'gmail' ? googleConfigured() : resendConfigured();
}

/**
 * Resend sends from our own domain. When it hits its daily or per-second limit (free plan: 100 a
 * day), the same message goes out through the project's Gmail instead, if it is configured.
 */
export async function sendRecruitmentEmail(email: Email): Promise<{ messageId: string }> {
  if (!/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(email.to) || /[\r\n]/.test(email.subject)) throw new Error('Destinatario o asunto inválido.');
  if (env('RECRUITMENT_EMAIL_PROVIDER') === 'gmail') return sendWithGmail(email);
  const sent = await sendWithResend(email);
  if (sent !== 'limit') return sent;
  if (googleConfigured()) return sendWithGmail(email);
  throw new Error('El proveedor de correo alcanzó su límite de envíos.');
}

async function sendWithResend(email: Email): Promise<{ messageId: string } | 'limit'> {
  const key = env('RESEND_API_KEY'); const from = env('RECRUITMENT_EMAIL_FROM');
  if (!key || !from) throw new Error('El servicio de correo está pendiente de configuración.');
  const reply = replyTo();
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': email.idempotencyKey },
    body: JSON.stringify({ from, to: [email.to], subject: email.subject, html: email.html, text: email.text, ...(reply ? { reply_to: reply } : {}) }),
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 429) return 'limit';
  if (!response.ok) throw new Error('El proveedor de correo rechazó el envío.');
  const data = await response.json() as { id?: string };
  if (!data.id) throw new Error('El proveedor no confirmó el envío.');
  return { messageId: data.id };
}

async function sendWithGmail(email: Email): Promise<{ messageId: string }> {
  // Gmail has no exactly-once idempotency API. The stable Message-ID identifies ambiguous retries.
  const encodedSubject = `=?UTF-8?B?${Buffer.from(email.subject).toString('base64')}?=`;
  const messageId = `${email.idempotencyKey.replace(/[^a-zA-Z0-9.-]/g, '-')}@ccunicode.org`;
  // Plain text for clients without HTML, the branded HTML for the rest.
  const boundary = `unicode-${crypto.randomUUID()}`;
  const part = (type: string, content: string) => [`--${boundary}`, `Content-Type: ${type}; charset=UTF-8`, 'Content-Transfer-Encoding: base64', '',
    Buffer.from(content).toString('base64').match(/.{1,76}/g)?.join('\r\n') || '', ''];
  const reply = replyTo();
  const mime = [
    `To: ${email.to}`, `Subject: ${encodedSubject}`, `Message-ID: <${messageId}>`, ...(reply && !/[\r\n]/.test(reply) ? [`Reply-To: ${reply}`] : []),
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
