const SECRET_KEY = "unicode_admin_2026";
async function getHmacKey() {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const sessionStore = {
  async createToken() {
    const expiresAt = Date.now() + 4 * 60 * 60 * 1e3;
    const payloadStr = JSON.stringify({ expiresAt });
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
  async isValid(token) {
    if (!token) return false;
    const parts = token.split(".");
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

export { sessionStore };
