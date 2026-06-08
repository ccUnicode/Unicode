export { renderers } from '../../renderers.mjs';

const prerender = false;
const loginAttempts = /* @__PURE__ */ new Map();
const WINDOW_MS = 15 * 60 * 1e3;
function getClientIP(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
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
  {
    console.error("CRITICAL: ADMIN_PASSWORD environment variable is not configured.");
    return new Response(
      JSON.stringify({ error: "Error de configuración del servidor." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
