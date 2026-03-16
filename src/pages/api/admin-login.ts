/**
 * API Endpoint: POST /api/admin-login
 * Validates admin password server-side.
 * 
 * Security measures:
 * - Rate limiting: max 5 attempts per IP in 15 minutes
 * - Lockout: 15-min lockout after 5 failed attempts
 * - Constant-time comparison to prevent timing attacks
 * - No password info leaked in error messages
 */

export const prerender = false;

// In-memory rate limiter (resets on server restart)
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil: number }>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Constant-time string comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to keep timing constant
    let result = a.length ^ b.length;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      result |= (a.charCodeAt(i % a.length) || 0) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function POST({ request }: { request: Request }) {
  const ip = getClientIP(request);
  const now = Date.now();

  // Check rate limit
  let record = loginAttempts.get(ip);

  if (record) {
    // Check if locked out
    if (record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return new Response(
        JSON.stringify({
          error: `Demasiados intentos. Intenta de nuevo en ${Math.ceil(remainingSeconds / 60)} minuto(s).`,
          locked: true,
          remainingSeconds
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reset window if expired
    if (now - record.firstAttempt > WINDOW_MS) {
      record = { count: 0, firstAttempt: now, lockedUntil: 0 };
      loginAttempts.set(ip, record);
    }
  } else {
    record = { count: 0, firstAttempt: now, lockedUntil: 0 };
    loginAttempts.set(ip, record);
  }

  // Parse body
  let password: string;
  try {
    const body = await request.json();
    password = body.password || '';
  } catch {
    return new Response(
      JSON.stringify({ error: 'Solicitud inválida.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Get admin password from environment variable ONLY (never hardcoded)
  const adminPassword = import.meta.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('CRITICAL: ADMIN_PASSWORD environment variable is not configured.');
    return new Response(
      JSON.stringify({ error: 'Error de configuración del servidor.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate password (constant-time)
  const isValid = safeCompare(password, adminPassword);

  if (!isValid) {
    record.count += 1;

    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
      return new Response(
        JSON.stringify({
          error: `Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.`,
          locked: true,
          remainingSeconds: LOCKOUT_MS / 1000
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Contraseña incorrecta.',
        attemptsRemaining: MAX_ATTEMPTS - record.count
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Success — reset attempts
  loginAttempts.delete(ip);

  // Generate a simple session token (random hex)
  const tokenArray = new Uint8Array(32);
  crypto.getRandomValues(tokenArray);
  const sessionToken = Array.from(tokenArray).map(b => b.toString(16).padStart(2, '0')).join('');

  // Store the token server-side with expiry (4 hours)
  const { sessionStore } = await import('../../lib/sessionStore');
  sessionStore.set(sessionToken, { createdAt: now, expiresAt: now + 4 * 60 * 60 * 1000 });

  return new Response(
    JSON.stringify({ success: true, token: sessionToken }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
