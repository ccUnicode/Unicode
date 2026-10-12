/**
 * sessionStore.ts
 * Stateless session store for Vercel/Edge environments.
 * Uses Web Crypto API to sign and verify a token so it survives serverless restarts.
 * The signed payload says who is signed in: the shared password (full administrator)
 * or a director. Directors view all areas but manage only their own; GTH manages all areas.
 */

const SECRET_KEY = import.meta.env.ADMIN_PASSWORD;

export type AdminSession = { role: 'admin' } | { role: 'demo' } | { role: 'director'; email: string; area: string; name?: string };

async function getHmacKey(demo = false): Promise<CryptoKey> {
  if (!SECRET_KEY) throw new Error('La autenticación administrativa no está configurada.');
  const demoSecret = import.meta.env.ADMIN_DEMO_PASSWORD || process.env.ADMIN_DEMO_PASSWORD;
  if (demo && !demoSecret) throw new Error("El acceso de demostración está desactivado.");
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(demo ? `${SECRET_KEY}:demo:${demoSecret}` : SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// UTF-8 safe base64: director names can carry accents.
const encodePayload = (value: unknown) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))));
const decodePayload = (value: string) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value), c => c.charCodeAt(0))));

/** GTH directors and the shared password manage the call; other directors view all applications and decide only for their area. */
export const managesRecruitment = (session: AdminSession | null) => session?.role === 'admin' || session?.role === 'demo' || (session?.role === 'director' && session.area === 'GTH');

export const sessionStore = {
  async createToken(session: AdminSession = { role: 'admin' }): Promise<string> {
    // Two days, so directors are not asked for a new code several times a day.
    const expiresAt = Date.now() + 2 * 24 * 60 * 60 * 1000;
    const payloadB64 = encodePayload({ ...session, expiresAt });

    const key = await getHmacKey(session.role === 'demo');
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payloadB64)
    );
    const signatureHex = bufferToHex(signatureBuffer);

    return `${payloadB64}.${signatureHex}`;
  },

  /** The session behind a valid token, or null. Tokens issued before roles existed are full administrators. */
  async verify(token: string): Promise<AdminSession | null> {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, signatureHex] = parts;

    try {
      const payload = decodePayload(payloadB64);
      const key = await getHmacKey(payload.role === 'demo');
      if (!/^[a-f0-9]{64}$/.test(signatureHex)) return null;
      const signature = new Uint8Array(signatureHex.match(/.{2}/g)!.map(value => parseInt(value, 16)));
      if (!(await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(payloadB64)))) return null;

      if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null;
      if (payload.role === 'demo') {
        if (!(import.meta.env.ADMIN_DEMO_PASSWORD || process.env.ADMIN_DEMO_PASSWORD)) return null;
        return { role: 'demo' };
      }
      if (payload.role === 'director') {
        if (typeof payload.email !== 'string' || typeof payload.area !== 'string') return null;
        return { role: 'director', email: payload.email, area: payload.area, name: typeof payload.name === 'string' ? payload.name : undefined };
      }
      return payload.role === undefined || payload.role === 'admin' ? { role: 'admin' } : null;
    } catch {
      return null;
    }
  },

  async isValid(token: string): Promise<boolean> {
    return (await this.verify(token)) !== null;
  }
};
