export { renderers } from '../../renderers.mjs';

const prerender = false;
const loginAttempts = /* @__PURE__ */ new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1e3;
const LOCKOUT_MS = 15 * 60 * 1e3;
function getClientIP(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
function safeCompare(a, b) {
  if (a.length !== b.length) {
    let result2 = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      result2 |= (a.charCodeAt(i % a.length) || 0) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
async function POST({ request }) {
  const ip = getClientIP(request);
  const now = Date.now();
  let record = loginAttempts.get(ip);
  if (record) {
    if (record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1e3);
      return new Response(
        JSON.stringify({
          error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(remainingSeconds / 60)} minuto(s).`,
          locked: true,
          remainingSeconds
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    if (now - record.firstAttempt > WINDOW_MS) {
      record = { count: 0, firstAttempt: now, lockedUntil: 0 };
      loginAttempts.set(ip, record);
    }
  } else {
    record = { count: 0, firstAttempt: now, lockedUntil: 0 };
    loginAttempts.set(ip, record);
  }
  let password;
  try {
    const body = await request.json();
    password = body.password || "";
  } catch {
    return new Response(
      JSON.stringify({ error: "Solicitud inválida." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const adminPassword = "unicode_admin_2026";
  const isValid = safeCompare(password, adminPassword);
  if (!isValid) {
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
      return new Response(
        JSON.stringify({
          error: `Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.`,
          locked: true,
          remainingSeconds: LOCKOUT_MS / 1e3
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({
        error: "Contraseña incorrecta.",
        attemptsRemaining: MAX_ATTEMPTS - record.count
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  loginAttempts.delete(ip);
  const { sessionStore } = await import('../../chunks/sessionStore_Bt5E9fqU.mjs');
  const sessionToken = await sessionStore.createToken();
  return new Response(
    JSON.stringify({ success: true, token: sessionToken }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
