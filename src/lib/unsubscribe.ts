/**
 * Signed links to stop receiving reminders. They never expire but only work for one application,
 * so nobody can switch off someone else's reminders by guessing an id.
 */
const env = (name: string): string | undefined => import.meta.env[name] || process.env[name];

async function sign(applicationId: string): Promise<string> {
  const secret = env('RECRUITMENT_RESUME_ENCRYPTION_KEY') || env('ADMIN_PASSWORD');
  if (!secret) throw new Error('La firma de enlaces no está configurada.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`unsubscribe:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(applicationId));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 40);
}

export async function unsubscribeUrl(base: string, applicationId: string): Promise<string> {
  return new URL(`/api/recruitment/unsubscribe/${applicationId}?t=${await sign(applicationId)}`, base).toString();
}

export async function verifyUnsubscribe(applicationId: string, token: string | null): Promise<boolean> {
  if (!token || !/^[a-f0-9]{40}$/.test(token)) return false;
  const expected = await sign(applicationId);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return difference === 0;
}
