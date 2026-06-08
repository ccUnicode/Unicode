/**
 * sessionStore.ts
 * Stateless session store for Vercel/Edge environments.
 * Uses Web Crypto API to sign and verify a token so it survives serverless restarts.
 */

const SECRET_KEY = import.meta.env.ADMIN_PASSWORD || 'default_fallback_secret_123!';

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET_KEY),
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

export const sessionStore = {
  async createToken(): Promise<string> {
    const expiresAt = Date.now() + 4 * 60 * 60 * 1000; // 4 hours from now
    const payloadStr = JSON.stringify({ expiresAt });
    // btoa is safe here because the payload only contains ASCII (numbers)
    const payloadB64 = btoa(payloadStr);

    const key = await getHmacKey();
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payloadB64)
    );
    const signatureHex = bufferToHex(signatureBuffer);

    return `${payloadB64}.${signatureHex}`;
  },

  async isValid(token: string): Promise<boolean> {
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payloadB64, signatureHex] = parts;

    try {
      const key = await getHmacKey();
      const expectedSignatureBuffer = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(payloadB64)
      );
      const expectedSignatureHex = bufferToHex(expectedSignatureBuffer);

      if (signatureHex !== expectedSignatureHex) return false;

      const payloadStr = atob(payloadB64);
      const payload = JSON.parse(payloadStr);
      
      if (payload.expiresAt < Date.now()) return false;
      return true;
    } catch {
      return false;
    }
  }
};
