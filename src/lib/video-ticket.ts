/**
 * Short-lived signed links to play an application's video through this site.
 * A <video> element cannot send the admin's Authorization header, so the panel exchanges
 * its session for a ticket bound to one application and valid for two hours.
 */
const env = (name: string): string | undefined => import.meta.env[name] || process.env[name];
const TTL_MS = 2 * 60 * 60 * 1000;

async function sign(text: string): Promise<string> {
  const secret = env('ADMIN_PASSWORD');
  if (!secret) throw new Error('La autenticación administrativa no está configurada.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`video-ticket:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createVideoTicket(applicationId: string, now = Date.now()): Promise<string> {
  const expires = now + TTL_MS;
  return `${expires}.${await sign(`${applicationId}.${expires}`)}`;
}

export async function verifyVideoTicket(applicationId: string, ticket: string | null, now = Date.now()): Promise<boolean> {
  const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(ticket || '');
  if (!match || Number(match[1]) <= now) return false;
  const expected = await sign(`${applicationId}.${match[1]}`);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ match[2].charCodeAt(i);
  return difference === 0;
}
